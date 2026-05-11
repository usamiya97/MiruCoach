'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getJstNow } from '@/lib/datetime'

interface Props {
  /** 'YYYY-MM-DD' (JST) */
  date: string
  onChange: (date: string) => void
}

// 'YYYY-MM-DD' に N 日を足す。Date のローカルTZに依存させないため文字列計算で行う
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return [
    t.getUTCFullYear(),
    String(t.getUTCMonth() + 1).padStart(2, '0'),
    String(t.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function formatLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

export default function MealDateNavigator({ date, onChange }: Props) {
  const todayStr = getJstNow().dateStr
  const isToday = date === todayStr

  function go(days: number) {
    const next = addDays(date, days)
    if (next > todayStr) return // 未来には進めない
    onChange(next)
  }

  return (
    <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-2 py-1.5">
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="前の日"
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="text-center">
        <p className="text-sm font-medium text-gray-800">{formatLabel(date)}</p>
        {isToday && <p className="text-[10px] text-rose-400 font-semibold">今日</p>}
      </div>

      <button
        type="button"
        onClick={() => go(1)}
        disabled={isToday}
        aria-label="次の日"
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
