import { Target, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'

type Status = 'on_track' | 'behind' | 'ahead' | 'unknown'

interface GoalProgressCardProps {
  goalWeight: number
  goalTargetDate: string // 'YYYY-MM-DD' (JST)
  todayJst: string
  currentWeight: number | null
  pacePerDay: number | null // kg/day, 負の値 = 減量中
}

// JST 日付の差分（日数）を返す。endDate > today ならプラス。
function jstDaysBetween(today: string, endDate: string): number {
  const [ty, tm, td] = today.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const t = Date.UTC(ty, tm - 1, td)
  const e = Date.UTC(ey, em - 1, ed)
  return Math.round((e - t) / (24 * 60 * 60 * 1000))
}

function computeStatus(
  predictedWeight: number | null,
  goalWeight: number,
  currentWeight: number
): Status {
  if (predictedWeight === null) return 'unknown'
  const gap = predictedWeight - goalWeight
  if (Math.abs(gap) <= 0.5) return 'on_track'
  const direction = goalWeight - currentWeight // 負 = 減量目標
  if (direction < 0) {
    // 減量目標: gap > 0 (予測 > 目標) → 達成できそうにない
    return gap > 0 ? 'behind' : 'ahead'
  }
  // 増量目標: gap < 0 (予測 < 目標) → 達成できそうにない
  return gap < 0 ? 'behind' : 'ahead'
}

export default function GoalProgressCard({
  goalWeight,
  goalTargetDate,
  todayJst,
  currentWeight,
  pacePerDay,
}: GoalProgressCardProps) {
  const daysRemaining = jstDaysBetween(todayJst, goalTargetDate)
  const isExpired = daysRemaining < 0

  const diffToGoal = currentWeight !== null ? currentWeight - goalWeight : null
  const predictedWeight =
    currentWeight !== null && pacePerDay !== null && daysRemaining > 0
      ? currentWeight + pacePerDay * daysRemaining
      : null
  const status: Status =
    currentWeight !== null && predictedWeight !== null
      ? computeStatus(predictedWeight, goalWeight, currentWeight)
      : 'unknown'

  const weeklyPace = pacePerDay !== null ? pacePerDay * 7 : null

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          <Target size={14} className="text-rose-400" strokeWidth={2} />
          目標まで
        </h2>
        <span
          className={`text-xs font-bold tabular-nums ${
            isExpired ? 'text-gray-400' : 'text-rose-500'
          }`}
        >
          {isExpired ? '期限超過' : `残り ${daysRemaining}日`}
        </span>
      </div>

      {/* 現在 → 目標 → 差 */}
      {currentWeight !== null && diffToGoal !== null ? (
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-[10px] text-gray-400">現在</p>
            <p className="text-base font-bold text-gray-800 tabular-nums">
              {currentWeight.toFixed(1)}
              <span className="text-xs font-normal text-gray-400 ml-0.5">kg</span>
            </p>
          </div>
          <span className="text-gray-300 text-sm">→</span>
          <div className="text-center">
            <p className="text-[10px] text-gray-400">目標</p>
            <p className="text-base font-bold text-rose-500 tabular-nums">
              {goalWeight.toFixed(1)}
              <span className="text-xs font-normal text-gray-400 ml-0.5">kg</span>
            </p>
          </div>
          <span className="text-gray-300 text-sm">→</span>
          <div className="text-right">
            <p className="text-[10px] text-gray-400">差</p>
            <p
              className={`text-base font-bold tabular-nums ${
                Math.abs(diffToGoal) < 0.1
                  ? 'text-emerald-500'
                  : diffToGoal > 0
                    ? 'text-rose-500'
                    : 'text-emerald-500'
              }`}
            >
              {diffToGoal > 0 ? '-' : '+'}
              {Math.abs(diffToGoal).toFixed(1)}
              <span className="text-xs font-normal text-gray-400 ml-0.5">kg</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
          <p className="text-sm text-gray-400">体重を記録するとペースが見えます</p>
        </div>
      )}

      {/* ペース・ステータス */}
      {weeklyPace !== null && status !== 'unknown' && !isExpired && (
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="text-xs text-gray-500">
            <span>ペース </span>
            <span className="font-semibold text-gray-700 tabular-nums">
              {weeklyPace > 0 ? '+' : ''}
              {weeklyPace.toFixed(2)}
            </span>
            <span className="text-gray-400"> kg/週</span>
          </div>
          <StatusBadge status={status} />
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  if (status === 'on_track') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
        <CheckCircle2 size={11} strokeWidth={2.5} />
        順調
      </span>
    )
  }
  if (status === 'ahead') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
        <Sparkles size={11} strokeWidth={2.5} />
        余裕で達成見込み
      </span>
    )
  }
  if (status === 'behind') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
        <AlertCircle size={11} strokeWidth={2.5} />
        もう一息
      </span>
    )
  }
  return null
}
