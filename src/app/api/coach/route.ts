import { NextResponse } from 'next/server'
import { getAnthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import type { CoachRequest } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // プラン確認
    const { data: profile } = await supabase
      .from('users')
      .select('plan, coach_name, coach_tone, target_calories, goal_weight, age')
      .eq('id', user.id)
      .single()

    if (profile?.plan !== 'premium') {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const body: CoachRequest = await request.json()
    const { message } = body

    // コンテキスト取得（直近7日）
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [mealLogsRes, bodyLogsRes, historyRes] = await Promise.all([
      supabase
        .from('meal_logs')
        .select('calories, meal_type, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', sevenDaysAgo)
        .order('logged_at', { ascending: false }),
      supabase
        .from('body_logs')
        .select('weight, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', sevenDaysAgo)
        .order('logged_at', { ascending: false }),
      supabase
        .from('coach_messages')
        .select('role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const mealLogs = mealLogsRes.data ?? []
    const bodyLogs = bodyLogsRes.data ?? []
    const history = (historyRes.data ?? []).reverse()

    // 日別カロリー集計
    const dailyCalories: Record<string, number> = {}
    for (const log of mealLogs) {
      const date = log.logged_at.slice(0, 10)
      dailyCalories[date] = (dailyCalories[date] ?? 0) + log.calories
    }
    const calorySummary = Object.entries(dailyCalories)
      .map(([date, cal]) => `${date}: ${cal}kcal`)
      .join('\n')

    const weightSummary = bodyLogs
      .map((b) => `${b.logged_at.slice(0, 10)}: ${b.weight}kg`)
      .join('\n')

    const coachName = profile.coach_name ?? 'ミル'
    const isLogical = profile.coach_tone === 'logical'
    const targetCal = profile.target_calories ?? 1800
    const goalWeight = profile.goal_weight ? `${profile.goal_weight}kg` : '未設定'

    const systemPrompt = `あなたは「${coachName}」という名前の、専属パーソナルダイエットコーチです。

## あなたの役割
30〜40代のフルタイム勤務女性が「我慢せず、仕組みで痩せる」を実現できるよう、毎日のデータをもとに具体的・継続的にサポートする。

## コーチとしての性格・口調
${isLogical
  ? `【論理型】データと根拠を軸に話す。感情論より事実。「昨日より○kcal減った」「この3日間の平均は○kcal」など数字を使って話す。でも冷たくはなく、淡々と的確に。`
  : `【共感型】まず気持ちに寄り添い、それから行動を提案する。「忙しかったんですね」「それは仕方ない」と受け止めてから、やさしく次の一手を示す。`}

## 絶対に守るルール
- **責めない**: 食べ過ぎた日・サボった日を叱責・否定しない。失敗は当然の過程として扱う
- **具体的に**: 「頑張ろう」「気をつけよう」は禁止。「今夜は○○を○g減らすと目標内に収まります」レベルの具体性
- **短く**: 返答は原則3文以内。長文は読まれない
- **医療行為をしない**: 診断・薬・疾患への言及は絶対にしない
- **現実的に**: 極端な食事制限・断食は勧めない。ユーザーの生活リズムに合わせた提案をする

## データの読み方と使い方
- 目標カロリー: ${targetCal}kcal/日
- 目標体重: ${goalWeight}
- カロリーが目標を超えた日は「次の食事での調整」を提案（翌日まで引っ張らない）
- 体重が増えていても食事記録が良ければ「行動を褒める」（体重だけで評価しない）
- 3日以上記録がない場合は「記録再開を優しく促す」

## 状況別の対応方針
- **食べ過ぎた日**: 責めず「今夜/明日の朝食でリカバリーできる量」を具体的に示す
- **記録が途切れた**: 「また始めればOK、昨日のことは気にしない」と伝える
- **体重が停滞**: 体重は3〜4週単位で見るものと説明し、食事の質や行動を評価する
- **体重が減った**: 素直に一緒に喜ぶ。データから理由を分析して伝える
- **ユーザーが落ち込んでいる**: アドバイスより先に共感。一言受け止めてから提案する

## 直近7日のユーザーデータ
【食事記録（日別カロリー合計）】
${calorySummary || 'まだ記録なし'}

【体重記録】
${weightSummary || 'まだ記録なし'}`

    // ユーザーメッセージをDBに保存
    await supabase.from('coach_messages').insert({
      user_id: user.id,
      role: 'user',
      content: message,
    })

    // Claude API 呼び出し
    const claudeResponse = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        ...history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message },
      ],
    })

    const assistantContent = claudeResponse.content[0].type === 'text'
      ? claudeResponse.content[0].text
      : ''

    // アシスタントの返答をDBに保存
    await supabase.from('coach_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: assistantContent,
    })

    return NextResponse.json({ message: assistantContent })
  } catch (error) {
    console.error('coach error:', error)
    return NextResponse.json({ error: 'Failed to get coach response' }, { status: 500 })
  }
}
