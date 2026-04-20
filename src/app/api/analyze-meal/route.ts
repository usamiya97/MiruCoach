import { NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'
import { createClient } from '@/lib/supabase/server'
import type { AnalyzeMealRequest, AnalyzeMealResponse } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AnalyzeMealRequest = await request.json()
    const { imageBase64, mimeType } = body

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
