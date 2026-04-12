import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import MealCard from '@/components/meal/MealCard'
import DateNavigator from '@/components/ui/DateNavigator'
import WeightChart from '@/components/ui/WeightChart'
import type { MealLog } from '@/types'

function toDateStr(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { date: dateParam } = await searchParams
  const todayStr = toDateStr(new Date())
  const targetDate = dateParam ?? todayStr
  const isToday = targetDate === todayStr

  const dayStart = `${targetDate}T00:00:00`
  const dayEnd = `${targetDate}T23:59:59`

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [profileRes, mealLogsRes, weightLogsRes] = await Promise.all([
    supabase
      .from('users')
      .select('plan, coach_name')
      .eq('id', user.id)
      .single(),
    supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', dayStart)
      .lte('logged_at', dayEnd)
      .order('logged_at', { ascending: false }),
    supabase
      .from('body_logs')
      .select('weight, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', thirtyDaysAgo.toISOString())
      .order('logged_at', { ascending: true }),
  ])

  const profile = profileRes.data
  const meals: MealLog[] = mealLogsRes.data ?? []
  const weightLogs = weightLogsRes.data ?? []

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0)
  const targetCalories = 1800

  // 同じ日に複数記録がある場合は最後の値を使う
  const weightByDate: Record<string, number> = {}
  for (const log of weightLogs) {
    weightByDate[log.logged_at.slice(0, 10)] = log.weight
  }
  const weightChartData = Object.entries(weightByDate).map(([date, weight]) => ({ date, weight }))
  const latestWeight = weightChartData.length > 0
    ? weightChartData[weightChartData.length - 1].weight
    : null

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">
          {isToday ? 'おはようございます 🌿' : '過去の記録'}
        </h1>
        {profile?.plan === 'premium' && (
          <span className="text-xs bg-rose-100 text-rose-500 px-2 py-0.5 rounded-full font-medium">
            Premium
          </span>
        )}
      </div>

      {/* 日付ナビゲーター */}
      <Card className="py-2">
        <DateNavigator date={targetDate} />
      </Card>

      {/* カロリーサマリー */}
      <Card>
        <p className="text-xs text-gray-400 mb-2">
          {isToday ? '今日のカロリー' : 'この日のカロリー'}
        </p>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-4xl font-bold text-gray-900">{totalCalories}</span>
          <span className="text-gray-400 mb-1">/ {targetCalories} kcal</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              totalCalories > targetCalories ? 'bg-amber-400' : 'bg-rose-400'
            }`}
            style={{ width: `${Math.min((totalCalories / targetCalories) * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">
          残り {Math.max(targetCalories - totalCalories, 0)} kcal
        </p>
      </Card>

      {/* 体重グラフ */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">体重の推移（30日）</p>
          {latestWeight && (
            <span className="text-sm font-bold text-rose-400">{latestWeight} kg</span>
          )}
        </div>
        <WeightChart data={weightChartData} />
      </Card>

      {/* 食事一覧 */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">
            {isToday ? '今日の食事' : 'この日の食事'}
          </p>
          {isToday && (
            <Link href="/meal" className="text-xs text-rose-400 hover:underline">
              追加 →
            </Link>
          )}
        </div>
        {meals.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">記録がありません</p>
        ) : (
          meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
        )}
      </Card>

      {/* コーチCTA（今日のみ表示） */}
      {isToday && (
        <Link href="/coach">
          <Card className="bg-rose-50 border border-rose-100 cursor-pointer hover:bg-rose-100 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌿</span>
              <div>
                {profile?.plan !== 'premium' ? (
                  <>
                    <p className="text-sm font-semibold text-gray-800">AIコーチ機能を使う</p>
                    <p className="text-xs text-gray-500">月額980円でコーチと毎日会話できます</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-800">
                      {profile?.coach_name ?? 'ミル'}に話しかける
                    </p>
                    <p className="text-xs text-gray-500">今日の調子はどうですか？</p>
                  </>
                )}
              </div>
              <span className="ml-auto text-gray-300">›</span>
            </div>
          </Card>
        </Link>
      )}
    </div>
  )
}
