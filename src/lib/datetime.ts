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
