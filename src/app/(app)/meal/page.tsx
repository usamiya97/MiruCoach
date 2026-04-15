'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import MealCard from '@/components/meal/MealCard'
import PhotoUpload from '@/components/meal/PhotoUpload'
import type { MealLog, MealType } from '@/types'

type Tab = 'photo' | 'manual' | 'weight'

const mealTypeOptions: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: '朝食', emoji: '🌅' },
  { value: 'lunch',     label: '昼食', emoji: '☀️' },
  { value: 'dinner',    label: '夕食', emoji: '🌙' },
  { value: 'snack',     label: '間食', emoji: '🍪' },
]

export default function MealPage() {
  const [tab, setTab]     = useState<Tab>('photo')
  const [meals, setMeals] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)

  const [manualCalories, setManualCalories] = useState('')
  const [manualNote, setManualNote]         = useState('')
  const [manualMealType, setManualMealType] = useState<MealType>('lunch')
  const [manualSaving, setManualSaving]     = useState(false)

  const [weight, setWeight]           = useState('')
  const [weightSaving, setWeightSaving] = useState(false)

  const [error, setError]       = useState<string | null>(null)
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

  useEffect(() => { fetchTodayMeals() }, [fetchTodayMeals])

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 2500)
  }

  async function handlePhotoSave(data: {
    calories: number; note: string; meal_type: MealType; photo_url: string | null
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('meal_logs').insert({
      user_id: user.id, ...data, logged_at: new Date().toISOString(),
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
        user_id: user.id, weight: parseFloat(weight), logged_at: new Date().toISOString(),
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
    if (error) { setError('削除に失敗しました'); return }
    await fetchTodayMeals()
    showSuccess('削除しました')
  }

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0)

  return (
    <div className="min-h-screen max-w-xl lg:max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-rose-400 to-pink-300 px-5 pt-14 pb-8">
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
        <h1 className="relative text-white text-xl font-bold">食事・体重を記録</h1>
        <p className="relative text-white/70 text-sm mt-0.5">今日も記録しよう 💪</p>
      </div>

      <div className="px-4 -mt-4 relative z-10 space-y-3">
        {/* タブ */}
        <div className="bg-white rounded-2xl shadow-sm p-1.5 flex gap-1">
          {([
            { key: 'photo',  label: '📷 写真' },
            { key: 'manual', label: '✏️ 手入力' },
            { key: 'weight', label: '⚖️ 体重' },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setError(null) }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === key
                  ? 'bg-gradient-to-r from-rose-500 to-pink-400 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* フィードバック */}
        {successMsg && (
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-center">
            <p className="text-sm text-green-600 font-medium">{successMsg}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* 写真タブ */}
        {tab === 'photo' && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <PhotoUpload onSave={handlePhotoSave} />
          </div>
        )}

        {/* 手入力タブ */}
        {tab === 'manual' && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <form onSubmit={handleManualSave} className="space-y-4">
              {/* 食事タイプ */}
              <div className="grid grid-cols-4 gap-2">
                {mealTypeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setManualMealType(opt.value)}
                    className={`flex flex-col items-center py-2.5 rounded-xl text-xs font-medium transition-all ${
                      manualMealType === opt.value
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg mb-0.5">{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide uppercase">
                  カロリー
                </label>
                <div className="relative">
                  <input
                    type="number" required min="1" max="5000"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value)}
                    className="w-full px-4 py-3 pr-14 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                    placeholder="500"
                  />
                  <span className="absolute right-4 top-3 text-sm text-gray-400">kcal</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide uppercase">
                  メモ（任意）
                </label>
                <input
                  type="text"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                  placeholder="カレーライス"
                />
              </div>

              <button
                type="submit"
                disabled={manualSaving}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-400 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm shadow-rose-200"
              >
                {manualSaving ? '記録中...' : '記録する'}
              </button>
            </form>
          </div>
        )}

        {/* 体重タブ */}
        {tab === 'weight' && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <form onSubmit={handleWeightSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide uppercase">
                  体重
                </label>
                <div className="relative">
                  <input
                    type="number" required step="0.1" min="30" max="200"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                    placeholder="55.0"
                  />
                  <span className="absolute right-4 top-3 text-sm text-gray-400">kg</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={weightSaving}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-400 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm shadow-rose-200"
              >
                {weightSaving ? '記録中...' : '記録する'}
              </button>
            </form>
          </div>
        )}

        {/* 今日の記録一覧 */}
        {!loading && meals.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <p className="text-sm font-bold text-gray-800">今日の記録</p>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-rose-500">{totalCalories.toLocaleString()}</span>
                <span className="text-xs text-gray-400">kcal</span>
              </div>
            </div>
            <div className="px-4 pb-2">
              {meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}

        <div className="h-2" />
      </div>
    </div>
  )
}
