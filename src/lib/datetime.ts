const JST_OFFSET = '+09:00'

const jstFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
})

export function getJstNow(): { dateStr: string; hour: number } {
  const parts = Object.fromEntries(
    jstFormatter.formatToParts(new Date()).map((p) => [p.type, p.value]),
  )
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
  }
}

export function jstDayRange(dateStr: string): { start: string; end: string } {
  return {
    start: `${dateStr}T00:00:00${JST_OFFSET}`,
    end: `${dateStr}T23:59:59${JST_OFFSET}`,
  }
}

const jstDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// UTC の ISO 文字列 (Postgres timestamptz の戻り) を JST 日付 'YYYY-MM-DD' に変換。
// 例: '2026-05-10T15:30:00Z' → '2026-05-11'
export function toJstDateStr(iso: string): string {
  return jstDateFormatter.format(new Date(iso))
}

// JST 日付文字列 'YYYY-MM-DD' に日数を加減算して JST 日付文字列を返す。
// 例: jstDateAddDays('2026-05-23', -6) → '2026-05-17'
export function jstDateAddDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
