import { NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'
import { createClient } from '@/lib/supabase/server'
import { DAILY_LIMIT, RATE_WINDOW_MS } from '@/lib/analyze-meal-limits'
import type { AnalyzeMealRequest, AnalyzeMealResponse, Plan } from '@/types'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

// base64 で 5MB 程度のバイナリに相当（5MB ≒ 6.7M chars）
const MAX_IMAGE_BASE64_LENGTH = 7_000_000
// JSON ボディ全体の上限（base64 上限 + フィールド分の余裕）
const MAX_BODY_BYTES = 8_000_000

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentLength = request.headers.get('content-length')
    if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()
    if (profileError) throw profileError

    const plan: Plan = profile?.plan === 'premium' ? 'premium' : 'free'
    const limit = DAILY_LIMIT[plan]

    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
    const { count: usedCount, error: countError } = await supabase
      .from('analyze_meal_calls')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('called_at', since)
    if (countError) throw countError

    if ((usedCount ?? 0) >= limit) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', limit, plan },
        { status: 429 }
      )
    }

    let body: AnalyzeMealRequest
    try {
      body = (await request.json()) as AnalyzeMealRequest
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { imageBase64, mimeType } = body

    if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
      return NextResponse.json({ error: 'Invalid imageBase64' }, { status: 400 })
    }
    if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 })
    }
    if (!BASE64_PATTERN.test(imageBase64)) {
      return NextResponse.json({ error: 'Invalid base64 format' }, { status: 400 })
    }
    if (
      typeof mimeType !== 'string' ||
      !ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)
    ) {
      return NextResponse.json({ error: 'Unsupported mime type' }, { status: 400 })
    }

    // 呼び出しを先に記録する（OpenAI 呼び出しが失敗しても枠は消費する仕様）
    const { error: insertError } = await supabase
      .from('analyze_meal_calls')
      .insert({ user_id: user.id })
    if (insertError) throw insertError

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: 'low',
              },
            },
            {
              type: 'text',
              text: `この食事の写真を見て、カロリーを推定してください。
以下のJSON形式のみで返答してください。説明文は不要です。
{"calories": 数値, "note": "料理名と簡単な内訳（例: ご飯200kcal、鶏の唐揚げ3個350kcal）"}
カロリーは整数で返してください。`,
            },
          ],
        },
      ],
      max_tokens: 200,
    })

    const text = response.choices[0].message.content ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse GPT response')
    }

    const result: AnalyzeMealResponse = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (error) {
    console.error('analyze-meal error:', error)
    return NextResponse.json({ error: 'Failed to analyze meal' }, { status: 500 })
  }
}
