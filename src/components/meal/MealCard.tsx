'use client'

import { useState } from 'react'
import type { MealLog } from '@/types'

const mealTypeLabel: Record<string, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
}

interface MealCardProps {
  meal: MealLog
  onDelete?: (id: string) => Promise<void>  // 渡さなければ削除ボタン非表示
}

export default function MealCard({ meal, onDelete }: MealCardProps) {
  const [confirming, setConfirming] = useState(false)  // 確認ステップ中か
  const [deleting, setDeleting] = useState(false)       // 削除処理中か

  const time = new Date(meal.logged_at).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    await onDelete(meal.id)
    setDeleting(false)
    setConfirming(false)
  }

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        {/* 写真 or 絵文字 */}
        {meal.photo_url ? (
          <img
            src={meal.photo_url}
            alt="食事写真"
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0 text-xl">
            🍽️
          </div>
        )}

        {/* 食事情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-rose-400 font-medium">
              {mealTypeLabel[meal.meal_type]}
            </span>
            <span className="text-xs text-gray-400">{time}</span>
          </div>
          {meal.note && (
            <p className="text-sm text-gray-700 truncate">{meal.note}</p>
          )}
        </div>

        {/* カロリー */}
        <span className="text-sm font-semibold text-gray-800 flex-shrink-0">
          {meal.calories} kcal
        </span>

        {/* 削除ボタン（onDelete が渡されたときだけ表示） */}
        {onDelete && !confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 text-lg leading-none"
            aria-label="削除"
          >
            ✕
          </button>
        )}
      </div>

      {/* 確認ステップ（confirming=true のときだけ表示） */}
      {confirming && (
        <div className="mt-2 flex items-center justify-end gap-2">
          <p className="text-xs text-gray-500 mr-1">削除しますか？</p>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-3 py-1 rounded-full bg-red-400 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
          >
            {deleting ? '削除中...' : '削除する'}
          </button>
        </div>
      )}
    </div>
  )
}
