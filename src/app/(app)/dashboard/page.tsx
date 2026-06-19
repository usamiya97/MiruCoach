import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Leaf, Sparkles, UtensilsCrossed, Plus, Sunrise, Sun, Moon } from 'lucide-react'
import CalorieRing from '@/components/ui/CalorieRing'
import DateNavigator from '@/components/ui/DateNavigator'
import WeightChart from '@/components/ui/WeightChart'
import WeeklySummary from '@/components/ui/WeeklySummary'
import GoalProgressCard from '@/components/ui/GoalProgressCard'
import UpgradeWaiter from '@/components/ui/UpgradeWaiter'
import MealCard from '@/components/meal/MealCard'
import { getJstNow, jstDayRange, jstDateAddDays, toJstDateStr } from '@/lib/datetime'
import type { MealLog } from '@/types'

function getGreeting(hour: number): string {
  if (hour < 10) return 'おはようございます'
  if (hour < 17) return 'こんにちは'
  return 'おつかれさまです'
}

function GreetingIcon({ hour }: { hour: number }) {
  if (hour < 10) return <Sunrise size={20} className="text-white/80 inline-block ml-1.5 -translate-y-0.5" strokeWidth={1.8} />
  if (hour < 17) return <Sun     size={20} className="text-white/80 inline-block ml-1.5 -translate-y-0.5" strokeWidth={1.8} />
  return               <Moon    size={20} className="text-white/80 inline-block ml-1.5 -translate-y-0.5" strokeWidth={1.8} />
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; upgraded?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { date: dateParam, upgraded: upgradedParam } = await searchParams
  const { dateStr: todayStr, hour: jstHour } = getJstNow()
  const targetDate = dateParam ?? todayStr
  const isToday = targetDate === todayStr

  const { start: dayStart, end: dayEnd } = jstDayRange(targetDate)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // 今週のまとめ: 今日を含む直近7日 (JST)
  const weekStartDate = jstDateAddDays(todayStr, -6)
  const { start: weekStart } = jstDayRange(weekStartDate)
  const { end: weekEnd } = jstDayRange(todayStr)

  const [profileRes, mealLogsRes, weightLogsRes, weeklyMealsRes] = await Promise.all([
    supabase.from('users')
      .select('plan, coach_name, target_calories, goal_weight, goal_target_date')
      .eq('id', user.id)
      .single(),
    supabase.from('meal_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', dayStart)
      .lte('logged_at', dayEnd)
      .order('logged_at', { ascending: false }),
    supabase.from('body_logs')
      .select('weight, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', thirtyDaysAgo.toISOString())
      .order('logged_at', { ascending: true }),
    supabase.from('meal_logs')
      .select('calories, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', weekStart)
      .lte('logged_at', weekEnd),
  ])

  const profile      = profileRes.data
  const meals: MealLog[] = mealLogsRes.data ?? []
  const weightLogs   = weightLogsRes.data ?? []
  const weeklyMeals  = weeklyMealsRes.data ?? []

  const totalCalories  = meals.reduce((sum, m) => sum + m.calories, 0)
  const targetCalories = profile?.target_calories ?? 1800

  // 直近7日の日別カロリー集計 (JST日付ごと)
  const caloriesByDate: Record<string, number> = {}
  for (const log of weeklyMeals) {
    const d = toJstDateStr(log.logged_at)
    caloriesByDate[d] = (caloriesByDate[d] ?? 0) + (Number(log.calories) || 0)
  }
  const dailyTotals = Object.values(caloriesByDate)
  const recordedDays = dailyTotals.length
  const avgCalories = recordedDays > 0
    ? Math.round(dailyTotals.reduce((s, v) => s + v, 0) / recordedDays)
    : null
  const achievedDays = dailyTotals.filter((v) => v <= targetCalories).length

  // 表示用ラベル: 'M/D - M/D'
  const formatMd = (s: string) => {
    const [, mm, dd] = s.split('-')
    return `${Number(mm)}/${Number(dd)}`
  }
  const weekRangeLabel = `${formatMd(weekStartDate)} - ${formatMd(todayStr)}`

  // 目標進捗カード用: 直近の体重ペースを weightLogs (30日分) から算出
  // - 2件以上ある時のみ pacePerDay を計算 (両端から線形ペース)
  // - 同じ日に複数記録があっても気にせず一番古い・新しい logged_at を使う
  let pacePerDay: number | null = null
  if (weightLogs.length >= 2) {
    const oldest = weightLogs[0]
    const newest = weightLogs[weightLogs.length - 1]
    const spanMs = new Date(newest.logged_at).getTime() - new Date(oldest.logged_at).getTime()
    const spanDays = spanMs / (24 * 60 * 60 * 1000)
    if (spanDays >= 1) {
      pacePerDay = (newest.weight - oldest.weight) / spanDays
    }
  }
  const goalWeight = profile?.goal_weight ?? null
  const goalTargetDate = profile?.goal_target_date ?? null
  const showGoalCard = isToday && goalWeight !== null && goalTargetDate !== null

  const weightByDate: Record<string, number> = {}
  for (const log of weightLogs) {
    weightByDate[log.logged_at.slice(0, 10)] = log.weight
  }
  const weightChartData = Object.entries(weightByDate).map(([date, weight]) => ({ date, weight }))
  const latestWeight = weightChartData.length > 0
    ? weightChartData[weightChartData.length - 1].weight
    : null

  const [y, m, d] = targetDate.split('-').map(Number)
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString('ja-JP', {
    month: 'long', day: 'numeric', weekday: 'short',
  })

  const isPremium = profile?.plan === 'premium'

  return (
    <div className="min-h-screen max-w-xl lg:max-w-3xl mx-auto">
      {upgradedParam === '1' && <UpgradeWaiter isPremium={isPremium} />}

      {/* ── ヒーローセクション ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-rose-400 to-pink-300 px-5 pt-14 pb-28">

        {/* 装飾サークル */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-8 -translate-x-8" />

        {/* ヘッダー */}
        <div className="relative flex items-start justify-between mb-10">
          <div>
            {isToday ? (
              <>
                <p className="text-white/70 text-sm">{dateLabel}</p>
                <h1 className="text-white text-xl font-bold mt-0.5">
                  {getGreeting(jstHour)}<GreetingIcon hour={jstHour} />
                </h1>
              </>
            ) : (
              <>
                <p className="text-white/70 text-sm">過去の記録</p>
                <h1 className="text-white text-xl font-bold mt-0.5">{dateLabel}</h1>
              </>
            )}
          </div>
          {profile?.plan === 'premium' && (
            <div className="flex flex-col items-end gap-1.5">
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium border border-white/30 flex items-center gap-1">
                <Sparkles size={11} strokeWidth={2} />
                Premium
              </span>
              <a
                href="/api/stripe/portal"
                className="text-white/60 text-xs hover:text-white/90 transition-colors"
              >
                プランを管理
              </a>
            </div>
          )}
        </div>

        {/* カロリーリング */}
        <div className="relative flex justify-center">
          <CalorieRing consumed={totalCalories} target={targetCalories} />
        </div>
      </div>

      {/* ── カードセクション（ヒーローに重なる） ── */}
      <div className="-mt-16 px-4 space-y-3 relative z-10">

        {/* 日付ナビゲーター */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
          <DateNavigator date={targetDate} />
        </div>

        {/* 今日の食事 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800">
              {isToday ? '今日の食事' : 'この日の食事'}
            </h2>
            {isToday && (
              <Link
                href="/meal"
                className="flex items-center gap-1 text-xs text-white bg-rose-400 hover:bg-rose-500 px-3 py-1.5 rounded-full transition-colors font-medium"
              >
                <Plus size={12} strokeWidth={2.5} />
                追加
              </Link>
            )}
          </div>

          <div className="px-4 pb-2">
            {meals.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto">
                  <UtensilsCrossed size={20} className="text-gray-300" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-gray-400">まだ記録がありません</p>
                {isToday && (
                  <Link
                    href="/meal"
                    className="inline-block mt-1 text-xs text-rose-400 hover:underline"
                  >
                    食事を記録する →
                  </Link>
                )}
              </div>
            ) : (
              meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
            )}
          </div>
        </div>

        {/* 目標進捗（ゴール設定済み & 今日表示時のみ） */}
        {showGoalCard && (
          <GoalProgressCard
            goalWeight={goalWeight!}
            goalTargetDate={goalTargetDate!}
            todayJst={todayStr}
            currentWeight={latestWeight}
            pacePerDay={pacePerDay}
          />
        )}

        {/* 今週のまとめ（今日表示時のみ） */}
        {isToday && (
          <WeeklySummary
            avgCalories={avgCalories}
            recordedDays={recordedDays}
            achievedDays={achievedDays}
            rangeLabel={weekRangeLabel}
          />
        )}

        {/* 体重グラフ */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-800">体重の推移</h2>
            {latestWeight && (
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-rose-500">{latestWeight}</span>
                <span className="text-xs text-gray-400">kg</span>
              </div>
            )}
          </div>
          <WeightChart data={weightChartData} />
        </div>

        {/* コーチ CTA */}
        {isToday && (
          <Link href="/coach">
            <div className="bg-gradient-to-r from-rose-500 to-pink-400 rounded-2xl p-4 flex items-center gap-4 shadow-sm shadow-rose-200">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                {profile?.plan === 'premium'
                  ? <Leaf size={22} className="text-white" strokeWidth={1.8} />
                  : <Sparkles size={22} className="text-white" strokeWidth={1.8} />
                }
              </div>
              <div className="flex-1">
                {profile?.plan !== 'premium' ? (
                  <>
                    <p className="text-white font-semibold text-sm">AIコーチを始める</p>
                    <p className="text-white/70 text-xs mt-0.5">月額980円でコーチと毎日会話</p>
                  </>
                ) : (
                  <>
                    <p className="text-white font-semibold text-sm">
                      {profile?.coach_name ?? 'ミル'}に話しかける
                    </p>
                    <p className="text-white/70 text-xs mt-0.5">今日の調子はどうですか？</p>
                  </>
                )}
              </div>
              <span className="text-white/40 text-xl">›</span>
            </div>
          </Link>
        )}

        <div className="h-2" /> {/* 下余白 */}
      </div>
    </div>
  )
}
