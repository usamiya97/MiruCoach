import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAnthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'
import { buildCoachContext, COACH_PROFILE_SELECT, type CoachProfile } from '@/lib/coach-context'
import { getJstNow, jstDayRange, jstDateAddDays, toJstDateStr } from '@/lib/datetime'

// プロアクティブメッセージ生成 API。
// クライアントから「画面を開いた」「食事を記録した」をトリガーとして呼ばれ、
// サーバ側で発火条件を満たすときだけ AI コーチからのメッセージを1通生成する。
//
// 設計方針:
// - 発火条件はサーバ側で必ず再検証する（クライアント信用しない）
// - 条件未該当・スロットル切れの場合は 200 で { message: null } を返す（クライアントは何もしない）
// - 擬似的な「ユーザ発話」は DB には保存しない（プロンプトインジェクション足場を残さない）
// - 生成された assistant メッセージのみ coach_messages に保存

type ProactiveTrigger = 'session_open' | 'after_meal'

// 短時間の濫用ガード（クライアント側の連打防御。1時間に30回まで）
const PROACTIVE_ABUSE_LIMIT = {
  endpoint: 'coach-proactive',
  limit: 30,
  windowMs: 60 * 60 * 1000,
}

// trigger 毎の発火スロットル（実際に Claude を呼ぶ直前にスロットを消費する）
const SESSION_OPEN_THROTTLE = {
  endpoint: 'coach-proactive-session-open',
  limit: 1,
  windowMs: 20 * 60 * 60 * 1000, // 20時間
}

const AFTER_MEAL_THROTTLE = {
  endpoint: 'coach-proactive-after-meal',
  limit: 1,
  windowMs: 4 * 60 * 60 * 1000, // 4時間
}

// after_meal の発火判定で「特異な食事」と見なす閾値
const EXTREME_CARBS_G = 100
const EXTREME_PROTEIN_G = 60
const EXTREME_FAT_G = 50

// meal_skipped: この時刻を過ぎても今日の記録が0件なら発火
const MEAL_SKIPPED_HOUR_JST = 14

// streak_celebrate: 連続記録の節目（90日以上はクエリ範囲外なので扱わない）
const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 90] as const
// 連続記録カウントに使う meal_logs の参照範囲
const STREAK_LOOKBACK_DAYS = 95

function isStreakMilestone(n: number): boolean {
  return (STREAK_MILESTONES as readonly number[]).includes(n)
}

// JST の月曜判定（getJstNow の dateStr から曜日を求める）
function isJstMonday(jstDateStr: string): boolean {
  const [y, m, d] = jstDateStr.split('-').map(Number)
  if (!y || !m || !d) return false
  // Date.UTC で組み立てて getUTCDay すると JST 日付ベースの曜日が得られる
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return day === 1 // 0=日, 1=月
}

interface SessionOpenDecision {
  fire: boolean
  mode: 'weekly_review' | 'greeting' | 'meal_skipped' | 'streak_celebrate'
  // streak_celebrate モードで Seed メッセージに連続日数を埋め込むため
  streak?: number
}

interface AfterMealDecision {
  fire: boolean
  reason: 'over_target' | 'pfc_extreme' | null
}

// 今日 (JST) の meal_logs 件数。記録忘れ催促の判定に使う
async function countTodayMeals(
  supabase: SupabaseClient,
  userId: string,
  todayJst: string
): Promise<number> {
  const { start, end } = jstDayRange(todayJst)
  const { count } = await supabase
    .from('meal_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('logged_at', start)
    .lte('logged_at', end)
  return count ?? 0
}

// 今日 (JST) を含めて何日連続で食事を記録しているかを返す。
// 今日の記録が0件なら 0 を返す（"今日達成済み" でないと streak とは見なさない）。
async function calculateMealStreak(
  supabase: SupabaseClient,
  userId: string,
  todayJst: string
): Promise<number> {
  const fromDate = jstDateAddDays(todayJst, -(STREAK_LOOKBACK_DAYS - 1))
  const { start } = jstDayRange(fromDate)
  const { end } = jstDayRange(todayJst)

  const { data } = await supabase
    .from('meal_logs')
    .select('logged_at')
    .eq('user_id', userId)
    .gte('logged_at', start)
    .lte('logged_at', end)

  if (!data || data.length === 0) return 0

  const dates = new Set<string>()
  for (const row of data) {
    dates.add(toJstDateStr(row.logged_at as string))
  }

  let streak = 0
  let cursor = todayJst
  // 今日から遡って連続している JST 日数を数える
  while (dates.has(cursor)) {
    streak++
    cursor = jstDateAddDays(cursor, -1)
  }
  return streak
}

// session_open 用の発火条件判定
async function decideSessionOpen(
  supabase: SupabaseClient,
  userId: string,
  todayJst: string,
  jstHour: number
): Promise<SessionOpenDecision> {
  // 直近の assistant メッセージを取得
  const { data } = await supabase
    .from('coach_messages')
    .select('created_at')
    .eq('user_id', userId)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastAssistantAt = data?.created_at ? new Date(data.created_at as string).getTime() : 0
  const hoursSince = lastAssistantAt > 0 ? (Date.now() - lastAssistantAt) / (60 * 60 * 1000) : Infinity

  // 24時間以上空いている（初回もここに該当）なら発火
  if (hoursSince < 24) return { fire: false, mode: 'greeting' }

  // 発火優先順位: 月曜の週次 > 連続記録の節目 > 記録忘れ催促 > 通常挨拶
  if (isJstMonday(todayJst)) return { fire: true, mode: 'weekly_review' }

  const streak = await calculateMealStreak(supabase, userId, todayJst)
  if (isStreakMilestone(streak)) {
    return { fire: true, mode: 'streak_celebrate', streak }
  }

  if (jstHour >= MEAL_SKIPPED_HOUR_JST) {
    const todayMealCount = await countTodayMeals(supabase, userId, todayJst)
    if (todayMealCount === 0) {
      return { fire: true, mode: 'meal_skipped' }
    }
  }

  return { fire: true, mode: 'greeting' }
}

// after_meal 用の発火条件判定
async function decideAfterMeal(
  supabase: SupabaseClient,
  userId: string,
  todayJst: string,
  targetCalories: number
): Promise<AfterMealDecision> {
  const { start, end } = jstDayRange(todayJst)

  // 今日 (JST) の食事ログを取得（最新が先頭）
  const { data: todayMeals } = await supabase
    .from('meal_logs')
    .select('calories, protein, fat, carbs, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', start)
    .lte('logged_at', end)
    .order('logged_at', { ascending: false })

  const meals = todayMeals ?? []
  if (meals.length === 0) return { fire: false, reason: null }

  // 今日の累計カロリーが目標を超えたか
  const totalKcal = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0)
  if (totalKcal > targetCalories) {
    return { fire: true, reason: 'over_target' }
  }

  // 最新の食事に PFC の極端な偏りがあるか
  const latest = meals[0]
  const carbs = latest.carbs !== null ? Number(latest.carbs) : 0
  const protein = latest.protein !== null ? Number(latest.protein) : 0
  const fat = latest.fat !== null ? Number(latest.fat) : 0
  if (carbs > EXTREME_CARBS_G || protein > EXTREME_PROTEIN_G || fat > EXTREME_FAT_G) {
    return { fire: true, reason: 'pfc_extreme' }
  }

  return { fire: false, reason: null }
}

// 各シチュエーションで Claude に渡す擬似 user メッセージを組み立てる
function buildSeedMessage(
  trigger: ProactiveTrigger,
  mode: SessionOpenDecision['mode'] | AfterMealDecision['reason'],
  meta?: { streak?: number }
): string {
  if (trigger === 'session_open') {
    if (mode === 'weekly_review') {
      return '[内部メッセージ: 今日は月曜日です。ユーザーが久しぶりにチャットを開きました。先週(月〜日)のユーザーのデータを振り返るメッセージを1通生成してください。良かった点1つ・気になる点1つ・今週の小さな一手1つ。4文以内可。挨拶も短く。]'
    }
    if (mode === 'streak_celebrate') {
      const days = meta?.streak ?? 0
      return `[内部メッセージ: ユーザーが今日で${days}日連続で食事を記録しました。これは継続の大事な節目です。素直に褒めて、明日以降も続けたくなる短いメッセージを1通お願いします。3文以内。挨拶は短く。「すごい」を連発せず、具体的に何が良いか1点だけ触れる。]`
    }
    if (mode === 'meal_skipped') {
      return '[内部メッセージ: 既に午後ですが、ユーザーは今日まだ食事を1件も記録していません。責めずに優しく確認し、食べているなら記録を、食べていないなら無理のない範囲で食事を促すメッセージを1通お願いします。3文以内。]'
    }
    return '[内部メッセージ: ユーザーがチャット画面を開きました。最近の食事や体重のデータを軽く踏まえて、自然に話しかける挨拶メッセージを1通生成してください。3文以内。データが乏しい場合は記録再開を優しく促してください。]'
  }
  // after_meal
  if (mode === 'over_target') {
    return '[内部メッセージ: ユーザーが今日の食事を記録し、本日の累計カロリーが目標を超えました。責めずに、今夜または明日の朝食でリカバリーできる具体的な提案を1通お願いします。3文以内。]'
  }
  if (mode === 'pfc_extreme') {
    return '[内部メッセージ: ユーザーが今食べた食事の PFC バランスに偏りがあります(脂質/糖質/タンパク質のいずれかが極端)。責めずに、軽い気づきを1通お願いします。3文以内。]'
  }
  return '[内部メッセージ: ユーザーが食事を記録しました。短く軽い反応を1通お願いします。3文以内。]'
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // プラン確認（premium 限定）
    const { data: profile } = await supabase
      .from('users')
      .select(COACH_PROFILE_SELECT)
      .eq('id', user.id)
      .single<CoachProfile>()

    if (profile?.plan !== 'premium') {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    // 入力検証
    let body: { trigger?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const trigger = body.trigger
    if (trigger !== 'session_open' && trigger !== 'after_meal') {
      return NextResponse.json({ error: 'invalid trigger' }, { status: 400 })
    }

    // 短時間の濫用ガード
    const abuseRate = await checkRateLimit(supabase, user.id, PROACTIVE_ABUSE_LIMIT)
    if (!abuseRate.allowed) {
      return rateLimitedResponse(abuseRate)
    }

    const { dateStr: todayJst, hour: jstHour } = getJstNow()
    const targetCalories = profile.target_calories ?? 1800

    // trigger 別の発火条件判定
    let seedMode: SessionOpenDecision['mode'] | AfterMealDecision['reason'] = null
    let streakMeta: number | undefined
    if (trigger === 'session_open') {
      const decision = await decideSessionOpen(supabase, user.id, todayJst, jstHour)
      if (!decision.fire) return NextResponse.json({ message: null })
      seedMode = decision.mode
      streakMeta = decision.streak
    } else {
      const decision = await decideAfterMeal(supabase, user.id, todayJst, targetCalories)
      if (!decision.fire) return NextResponse.json({ message: null })
      seedMode = decision.reason
    }

    // 発火スロットル（実際に Claude を呼ぶ直前にスロットを消費する）
    const throttleConfig = trigger === 'session_open' ? SESSION_OPEN_THROTTLE : AFTER_MEAL_THROTTLE
    const throttle = await checkRateLimit(supabase, user.id, throttleConfig)
    if (!throttle.allowed) return NextResponse.json({ message: null })

    // コンテキスト構築 + Claude 呼び出し
    const { systemPrompt, history } = await buildCoachContext(supabase, user.id, profile)
    const seedMessage = buildSeedMessage(trigger as ProactiveTrigger, seedMode, { streak: streakMeta })

    // 末尾が 'user' で終わる壊れた履歴を避けるため、trailing 'user' を1つだけ落とす
    // （Anthropic は連続 user を許容するが、念のため）
    const safeHistory = history.length > 0 && history[history.length - 1].role === 'user'
      ? history.slice(0, -1)
      : history

    const claudeResponse = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 350,
      system: systemPrompt,
      messages: [
        ...safeHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user' as const, content: seedMessage },
      ],
    })

    const assistantContent = claudeResponse.content[0].type === 'text'
      ? claudeResponse.content[0].text
      : ''
    if (!assistantContent) {
      return NextResponse.json({ message: null })
    }

    // assistant メッセージだけ DB に保存（seed は保存しない）
    const { error: insertError } = await supabase.from('coach_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: assistantContent,
    })
    if (insertError) throw insertError

    return NextResponse.json({ message: assistantContent })
  } catch (error) {
    console.error('coach proactive error:', error)
    return NextResponse.json({ error: 'Failed to generate proactive message' }, { status: 500 })
  }
}
