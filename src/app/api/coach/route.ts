import { NextResponse } from 'next/server'
import { getAnthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { buildCoachContext, COACH_PROFILE_SELECT, type CoachProfile } from '@/lib/coach-context'
import type { CoachRequest } from '@/types'

const MAX_MESSAGE_LENGTH = 2000

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
      .select(COACH_PROFILE_SELECT)
      .eq('id', user.id)
      .single<CoachProfile>()

    if (profile?.plan !== 'premium') {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    // レート制限（短時間の濫用ガード。Claude API のコスト爆発を抑える）
    const rate = await checkRateLimit(supabase, user.id, RATE_LIMITS.coach)
    if (!rate.allowed) {
      return rateLimitedResponse(rate)
    }

    // 入力検証
    let body: CoachRequest
    try {
      body = (await request.json()) as CoachRequest
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const rawMessage = body.message
    if (typeof rawMessage !== 'string') {
      return NextResponse.json({ error: 'message must be a string' }, { status: 400 })
    }
    if (rawMessage.trim().length === 0) {
      return NextResponse.json({ error: 'message is empty' }, { status: 400 })
    }
    if (rawMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: 'message too long', limit: MAX_MESSAGE_LENGTH },
        { status: 400 }
      )
    }
    const message = rawMessage

    // コンテキスト構築（meal/body/history取得・目標期限計算・systemPrompt生成）
    const { systemPrompt, history } = await buildCoachContext(supabase, user.id, profile)

    // Claude API 呼び出し（成功時のみ DB に保存することで、失敗時に prompt injection 文が
    // 履歴へ永続化されることを防ぐ）
    const claudeResponse = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        ...history.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user' as const, content: message },
      ],
    })

    const assistantContent = claudeResponse.content[0].type === 'text'
      ? claudeResponse.content[0].text
      : ''

    if (!assistantContent) {
      return NextResponse.json({ error: 'Empty response from coach' }, { status: 500 })
    }

    // 成功時のみユーザー発話と返答をまとめて保存
    const { error: insertError } = await supabase.from('coach_messages').insert([
      { user_id: user.id, role: 'user', content: message },
      { user_id: user.id, role: 'assistant', content: assistantContent },
    ])
    if (insertError) throw insertError

    return NextResponse.json({ message: assistantContent })
  } catch (error) {
    console.error('coach error:', error)
    return NextResponse.json({ error: 'Failed to get coach response' }, { status: 500 })
  }
}
