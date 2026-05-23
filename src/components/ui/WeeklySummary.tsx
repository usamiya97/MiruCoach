interface WeeklySummaryProps {
  avgCalories: number | null
  recordedDays: number
  achievedDays: number
  rangeLabel: string
}

export default function WeeklySummary({
  avgCalories,
  recordedDays,
  achievedDays,
  rangeLabel,
}: WeeklySummaryProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-800">今週のまとめ</h2>
        <span className="text-xs text-gray-400">{rangeLabel}</span>
      </div>

      {recordedDays === 0 ? (
        <p className="py-3 text-center text-sm text-gray-400">
          直近7日間の記録がまだありません
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-xs text-gray-400">平均カロリー</p>
            <p className="mt-1">
              <span className="text-lg font-bold text-rose-500">
                {avgCalories ?? '—'}
              </span>
              <span className="text-xs text-gray-400 ml-0.5">kcal</span>
            </p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-xs text-gray-400">記録日数</p>
            <p className="mt-1">
              <span className="text-lg font-bold text-gray-800">
                {recordedDays}
              </span>
              <span className="text-xs text-gray-400 ml-0.5">/ 7日</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">目標達成</p>
            <p className="mt-1">
              <span className="text-lg font-bold text-emerald-500">
                {achievedDays}
              </span>
              <span className="text-xs text-gray-400 ml-0.5">日</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
