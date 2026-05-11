/**
 * foods テーブル一括投入スクリプト（文科省 食品成分表 Excel から直接）
 *
 * 入力: 文科省「日本食品標準成分表(八訂)増補2023年」の本表 Excel
 *   ダウンロード元: https://www.mext.go.jp/a_menu/syokuhinseibun/mext_01110.html
 *
 * 想定シート: 「表全体」
 *   - 12行目までヘッダー、13行目からデータ
 *   - A列: 食品群コード（'01'〜'18'）
 *   - B列: 食品番号 → food_code
 *   - D列: 食品名     → name
 *   - G列: エネルギー(kcal/100g) → calories_per_100g
 *
 * 実行:
 *   npm install -D xlsx tsx
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npm run seed:foods /path/to/mext_food_table.xlsx
 *
 * 注意:
 *   - SUPABASE_SERVICE_ROLE_KEY は RLS をバイパスするので扱い注意
 *   - food_code が一致するレコードは upsert（差し替え）される
 */

import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const BATCH_SIZE = 500
const SHEET_NAME = '表全体'
const HEADER_ROWS = 12 // 13行目（0-indexed=12）からデータ

// 食品群コード → カテゴリ名（シート名と同じ表記）
const CATEGORY_MAP: Record<string, string> = {
  '01': '穀類',
  '02': 'いも及びでん粉類',
  '03': '砂糖及び甘味類',
  '04': '豆類',
  '05': '種実類',
  '06': '野菜類',
  '07': '果実類',
  '08': 'きのこ類',
  '09': '藻類',
  '10': '魚介類',
  '11': '肉類',
  '12': '卵類',
  '13': '乳類',
  '14': '油脂類',
  '15': '菓子類',
  '16': 'し好飲料類',
  '17': '調味料及び香辛料類',
  '18': '調理済み流通食品類',
}

interface FoodRow {
  food_code: string
  name: string
  name_kana: string | null
  category: string
  calories_per_100g: number
  protein_per_100g: number | null
  fat_per_100g: number | null
  carbs_per_100g: number | null
}

// セル値を文字列にトリム
function asString(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

// MEXT 数値セル値を数値に変換（kcal/g 共通）
//  - 数値ならそのまま
//  - 文字列なら "(343)" → 343 (推定値)、"Tr" → 0 (微量)、"-" / "" → null (欠測)
function parseNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const s = asString(v)
  if (s === '' || s === '-') return null
  if (s === 'Tr' || s === '(Tr)') return 0
  const m = s.match(/-?\d+(?:\.\d+)?/)
  if (!m) return null
  const n = parseFloat(m[0])
  return Number.isFinite(n) ? n : null
}

// 食品名から余計な全角スペースを削る（先頭/末尾と連続）
function cleanName(s: string): string {
  return s.replace(/　+/g, '　').trim()
}

async function main() {
  const xlsxPath = process.argv[2]
  if (!xlsxPath) {
    console.error('Usage: npm run seed:foods <xlsx-path>')
    process.exit(1)
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      '環境変数が読めていません。\n' +
      '  必要: NEXT_PUBLIC_SUPABASE_URL（または SUPABASE_URL）と SUPABASE_SERVICE_ROLE_KEY\n' +
      '  ヒント: .env.local は Next.js の規約なので tsx 直実行では自動読み込みされません。\n' +
      '         必ず `npm run seed:foods <xlsx>` で実行してください（--env-file=.env.local 付き）。'
    )
    process.exit(1)
  }

  console.log(`読み込み中: ${xlsxPath}`)
  const wb = XLSX.readFile(xlsxPath)
  const ws = wb.Sheets[SHEET_NAME]
  if (!ws) {
    console.error(`シート "${SHEET_NAME}" が見つかりません。シート一覧: ${wb.SheetNames.join(', ')}`)
    process.exit(1)
  }

  // 2次元配列に変換（ヘッダーなし、空セルは null）
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: true,
  })

  const records: FoodRow[] = []
  let skipped = 0

  for (let i = HEADER_ROWS; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    const groupCode = asString(row[0])
    const foodCode  = asString(row[1])
    const name      = cleanName(asString(row[3]))
    const kcal      = parseNum(row[6])
    // PROT- (col 9), FAT- (col 12), CHOCDF- (col 20)
    const protein   = parseNum(row[9])
    const fat       = parseNum(row[12])
    const carbs     = parseNum(row[20])

    if (!foodCode || !name || kcal === null) { skipped++; continue }

    const category = CATEGORY_MAP[groupCode] ?? CATEGORY_MAP[foodCode.slice(0, 2)] ?? 'その他'

    records.push({
      food_code: foodCode,
      name,
      name_kana: null, // 本表に該当列なし
      category,
      calories_per_100g: kcal,
      protein_per_100g: protein,
      fat_per_100g: fat,
      carbs_per_100g: carbs,
    })
  }

  console.log(`抽出: ${records.length} 件 / スキップ: ${skipped} 件`)
  if (records.length === 0) {
    console.error('投入対象がありません')
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('foods')
      .upsert(chunk, { onConflict: 'food_code' })
    if (error) {
      console.error(`upsert error at offset ${i}:`, error.message)
      process.exit(1)
    }
    console.log(`  ${i + chunk.length} / ${records.length}`)
  }

  console.log('完了')
}

main()
