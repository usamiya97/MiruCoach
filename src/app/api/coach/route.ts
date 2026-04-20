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
      .select('plan, coach_name, coach_tone')
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

    const systemPrompt = `あなたは「${profile.coach_name ?? 'ミル'}」という名前のパーソナルダイエットコーチです。

【ターゲット】30〜40代のフルタイム勤務女性
【コーチの性格】${profile.coach_tone === 'logical' ? '論理的でデータを根拠に話す' : '温かみがあり共感を大切にする'}
【絶対に守るルール】
- サボった日・食べ過ぎた日を責めない
- 「また明日から頑張ろう」ではなく具体的なアドバイスをする
- 3文以内を基本とする
- 医療的なアドバイスはしない

【直近7日の食事記録（日別カロリー）】
${calorySummary || 'データなし'}

【直近7日の体重記録】
${weightSummary || 'データなし'}`

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
