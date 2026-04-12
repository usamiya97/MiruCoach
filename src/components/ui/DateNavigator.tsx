'use client'

import { useRouter } from 'next/navigation'

interface DateNavigatorProps {
  date: string  // 'YYYY-MM-DD'
}

function toDateStr(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return toDateStr(new Date(y, m - 1, d + days))
}

function formatLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

export default function DateNavigator({ date }: DateNavigatorProps) {
  const router = useRouter()
  const todayStr = toDateStr(new Date())
  const isToday = date === todayStr

  function go(days: number) {
    const next = addDays(date, days)
    if (next > todayStr) return  // 未来には進めない
    router.push(`/dashboard?date=${next}`)
  }

  return (
    <div className="flex items-center justify-between px-1">
      <button
        onClick={() => go(-1)}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl transition-colors"
      >
        ‹
      </button>

      <div className="text-center">
        <p className="text-sm font-medium text-gray-800">{formatLabel(date)}</p>
        {isToday && <p className="text-xs text-rose-400">今日</p>}
      </div>

      <button
        onClick={() => go(1)}
        disabled={isToday}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl transition-colors disabled:opacity-20"
      >
        ›
      </button>
    </div>
  )
}
