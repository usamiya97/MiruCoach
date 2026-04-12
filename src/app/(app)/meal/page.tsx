'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import MealCard from '@/components/meal/MealCard'
import PhotoUpload from '@/components/meal/PhotoUpload'
import type { MealLog, MealType } from '@/types'

type Tab = 'photo' | 'manual' | 'weight'

const mealTypeOptions: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '朝食' },
  { value: 'lunch', label: '昼食' },
  { value: 'dinner', label: '夕食' },
  { value: 'snack', label: '間食' },
]

export default function MealPage() {
  const [tab, setTab] = useState<Tab>('photo')
  const [meals, setMeals] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)

  // 手入力フォーム
  const [manualCalories, setManualCalories] = useState('')
  const [manualNote, setManualNote] = useState('')
  const [manualMealType, setManualMealType] = useState<MealType>('lunch')
  const [manualSaving, setManualSaving] = useState(false)

  // 体重フォーム
  const [weight, setWeight] = useState('')
  const [weightSaving, setWeightSaving] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const supabase = createClient()

  const fetchTodayMeals = useCallback(async () => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('meal_logs')
      .select('*')
      .gte('logged_at', todayStart.toISOString())
      .order('logged_at', { ascending: false })

    setMeals(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchTodayMeals()
  }, [fetchTodayMeals])

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 2500)
  }

  async function handlePhotoSave(data: {
    calories: number
    note: string
    meal_type: MealType
    photo_url: string | null
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('meal_logs').insert({
      user_id: user.id,
      calories: data.calories,
      note: data.note,
      meal_type: data.meal_type,
      photo_url: data.photo_url,
      logged_at: new Date().toISOString(),
    })

    if (error) throw new Error(error.message)
    await fetchTodayMeals()
    showSuccess('食事を記録しました')
  }

  async function handleManualSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setManualSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('meal_logs').insert({
        user_id: user.id,
        calories: parseInt(manualCalories),
        note: manualNote || null,
        meal_type: manualMealType,
        photo_url: null,
        logged_at: new Date().toISOString(),
      })

      if (error) throw new Error(error.message)
      setManualCalories('')
      setManualNote('')
      await fetchTodayMeals()
      showSuccess('食事を記録しました')
    } catch {
      setError('保存に失敗しました')
    } finally {
      setManualSaving(false)
    }
  }

  async function handleWeightSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setWeightSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('body_logs').insert({
        user_id: user.id,
        weight: parseFloat(weight),
        logged_at: new Date().toISOString(),
      })

      if (error) throw new Error(error.message)
      setWeight('')
      showSuccess('体重を記録しました')
    } catch {
      setError('保存に失敗しました')
    } finally {
      setWeightSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('meal_logs').delete().eq('id', id)
    if (error) {
      setError('削除に失敗しました')
      return
    }
    await fetchTodayMeals()
    showSuccess('削除しました')
  }

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0)

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <h1 className="text-lg font-bold text-gray-900">食事・体重を記録</h1>

      {/* タブ */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {([
          { key: 'photo', label: '📷 写真' },
          { key: 'manual', label: '✏️ 手入力' },
          { key: 'weight', label: '⚖️ 体重' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setError(null) }}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {successMsg && (
        <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 text-center">
          {successMsg}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* 写真タブ */}
      {tab === 'photo' && (
        <Card>
          <PhotoUpload onSave={handlePhotoSave} />
        </Card>
      )}

      {/* 手入力タブ */}
      {tab === 'manual' && (
        <Card>
          <form onSubmit={handleManualSave} className="space-y-4">
            <div className="flex gap-2">
              {mealTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setManualMealType(opt.value)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    manualMealType === opt.value
                      ? 'bg-rose-400 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                カロリー（kcal）
              </label>
              <input
                type="number"
                required
                min="1"
                max="5000"
                value={manualCalories}
                onChange={(e) => setManualCalories(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                placeholder="500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メモ（任意）
              </label>
              <input
                type="text"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                placeholder="カレーライス"
              />
            </div>

            <Button type="submit" className="w-full" loading={manualSaving}>
              記録する
            </Button>
          </form>
        </Card>
      )}

      {/* 体重タブ */}
      {tab === 'weight' && (
        <Card>
          <form onSubmit={handleWeightSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                体重（kg）
              </label>
              <input
                type="number"
                required
                step="0.1"
                min="30"
                max="200"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                placeholder="55.0"
              />
            </div>
            <Button type="submit" className="w-full" loading={weightSaving}>
              記録する
            </Button>
          </form>
        </Card>
      )}

      {/* 今日の食事一覧 */}
      {!loading && meals.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">今日の記録</p>
            <p className="text-sm font-semibold text-rose-400">{totalCalories} kcal</p>
          </div>
          {meals.map((meal) => <MealCard key={meal.id} meal={meal} onDelete={handleDelete} />)}
        </Card>
      )}
    </div>
  )
}
