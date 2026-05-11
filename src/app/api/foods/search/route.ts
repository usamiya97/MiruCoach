import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_QUERY_LENGTH = 50
// クライアント側で再ソート → 上位10件表示する想定で、多めに取得しておく
const MAX_RESULTS = 50

// 食品マスタの部分一致検索。
// クライアント側で debounce する想定。認証必須・サーバー認可のみで API key は不要。
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawQuery = searchParams.get('q') ?? ''
    // PostgREST の or() フィルタは ',' '(' ')' をメタ文字として使うので除去
    // LIKE のワイルドカード '%' '_' '\' はエスケープして文字として扱う
    const query = rawQuery
      .replace(/[,()]/g, '')
      .trim()
      .slice(0, MAX_QUERY_LENGTH)

    if (query.length === 0) {
      return NextResponse.json({ foods: [] })
    }

    const escaped = query.replace(/[\\%_]/g, (m) => '\\' + m)
    const pattern = `%${escaped}%`

    // is_common=true のレコードを最優先で並べ、次に display_name、最後に学術名で並べる
    const { data, error } = await supabase
      .from('foods')
      .select('id, name, name_kana, category, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, is_common, display_name')
      .or(`name.ilike.${pattern},name_kana.ilike.${pattern},display_name.ilike.${pattern}`)
      .order('is_common', { ascending: false })
      .order('display_name', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })
      .limit(MAX_RESULTS)

    if (error) throw error

    // Supabase は numeric 型を文字列で返すため、ここで数値に正規化する
    // （クライアント側で算術演算するときに NaN になる事故を防ぐ）
    const toNumOrNull = (v: unknown): number | null => {
      if (v === null || v === undefined) return null
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }
    const foods = (data ?? []).map((f) => ({
      ...f,
      calories_per_100g: Number(f.calories_per_100g),
      protein_per_100g: toNumOrNull(f.protein_per_100g),
      fat_per_100g:     toNumOrNull(f.fat_per_100g),
      carbs_per_100g:   toNumOrNull(f.carbs_per_100g),
    }))

    return NextResponse.json({ foods })
  } catch (error) {
    console.error('foods/search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
