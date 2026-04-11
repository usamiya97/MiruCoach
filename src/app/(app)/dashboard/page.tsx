import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import MealCard from '@/components/meal/MealCard'
import type { MealLog, BodyLog } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const todayStart = `${todayStr}T00:00:00.000Z`

  const [profileRes, mealLogsRes, bodyLogRes] = await Promise.all([
    supabase.from('users').select('plan, coach_name').eq('id', user.id).single(),
    supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', todayStart)
      .order('logged_at', { ascending: false }),
    supabase
      .from('body_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  const profile = profileRes.data
  const meals: MealLog[] = mealLogsRes.data ?? []
  const latestWeight: BodyLog | null = bodyLogRes.data ?? null

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0)
  const targetCalories = 1800

  const dateLabel = today.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">{dateLabel}</p>
          <h1 className="text-lg font-bold text-gray-900">おはようございます 🌿</h1>
        </div>
        {profile?.plan === 'premium' && (
          <span className="text-xs bg-rose-100 text-rose-500 px-2 py-0.5 rounded-full font-medium">
            Premium
          </span>
        )}
      </div>

      {/* カロリーサマリー */}
      <Card>
        <p className="text-xs text-gray-400 mb-2">今日のカロリー</p>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-4xl font-bold text-gray-900">{totalCalories}</span>
          <span className="text-gray-400 mb-1">/ {targetCalories} kcal</span>
        </div>
        {/* プログレスバー */}
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

      {/* 体重 */}
      {latestWeight && (
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">最新の体重</p>
            <p className="text-2xl font-bold text-gray-900">
              {latestWeight.weight}
              <span className="text-sm font-normal text-gray-400 ml-1">kg</span>
            </p>
          </div>
          <Link
            href="/meal#weight"
            className="text-xs text-rose-400 hover:underline"
          >
            記録する →
          </Link>
        </Card>
      )}

      {/* 今日の食事 */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">今日の食事</p>
          <Link href="/meal" className="text-xs text-rose-400 hover:underline">
            追加 →
          </Link>
        </div>
        {meals.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            まだ記録がありません
          </p>
        ) : (
          meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
        )}
      </Card>

      {/* コーチへのショートカット */}
      {profile?.plan !== 'premium' ? (
        <Link href="/coach">
          <Card className="bg-rose-50 border border-rose-100 cursor-pointer hover:bg-rose-100 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌿</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">AIコーチ機能を使う</p>
                <p className="text-xs text-gray-500">月額980円でコーチと毎日会話できます</p>
              </div>
              <span className="ml-auto text-gray-300">›</span>
            </div>
          </Card>
        </Link>
      ) : (
        <Link href="/coach">
          <Card className="bg-rose-50 border border-rose-100 cursor-pointer hover:bg-rose-100 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌿</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {profile?.coach_name ?? 'ミル'}に話しかける
                </p>
                <p className="text-xs text-gray-500">今日の調子はどうですか？</p>
              </div>
              <span className="ml-auto text-gray-300">›</span>
            </div>
          </Card>
        </Link>
      )}
    </div>
  )
}
