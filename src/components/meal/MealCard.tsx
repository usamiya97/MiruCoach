import type { MealLog } from '@/types'

const mealTypeLabel: Record<string, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
}

interface MealCardProps {
  meal: MealLog
}

export default function MealCard({ meal }: MealCardProps) {
  const time = new Date(meal.logged_at).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
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
      <span className="text-sm font-semibold text-gray-800 flex-shrink-0">
        {meal.calories} kcal
      </span>
    </div>
  )
}
