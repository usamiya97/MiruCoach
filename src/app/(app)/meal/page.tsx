'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { Camera, PenLine, Scale, Sunrise, Sun, Moon, Cookie } from 'lucide-react'
import MealCard from '@/components/meal/MealCard'
import PhotoUpload from '@/components/meal/PhotoUpload'
import FoodSearch from '@/components/meal/FoodSearch'
import MealDateNavigator from '@/components/meal/MealDateNavigator'
import { getJstNow, jstDayRange } from '@/lib/datetime'
import { fireProactiveAfterMeal } from '@/lib/proactive'
import type { LucideIcon } from 'lucide-react'
import type { MealLog, MealType, Food } from '@/types'

type Tab = 'photo' | 'manual' | 'weight'

const mealTypeOptions: { value: MealType; label: string; icon: LucideIcon }[] = [
  { value: 'breakfast', label: '朝食', icon: Sunrise },
  { value: 'lunch',     label: '昼食', icon: Sun     },
  { value: 'dinner',    label: '夕食', icon: Moon    },
  { value: 'snack',     label: '間食', icon: Cookie  },
]

export default function MealPage() {
  const [tab, setTab]     = useState<Tab>('photo')
  const [meals, setMeals] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)
  // 「いつの食事を記録するか」「どの日の記録一覧を見るか」を制御。デフォルトは今日(JST)
  const [selectedDate, setSelectedDate] = useState<string>(() => getJstNow().dateStr)

  const [manualMode, setManualMode]         = useState<'search' | 'direct'>('search')
  const [selectedFood, setSelectedFood]     = useState<Food | null>(null)
  const [grams, setGrams]                   = useState('')
  const [manualCalories, setManualCalories] = useState('')
  const [manualProtein, setManualProtein]   = useState('')
  const [manualFat, setManualFat]           = useState('')
  const [manualCarbs, setManualCarbs]       = useState('')
  const [manualNote, setManualNote]         = useState('')
  const [manualMealType, setManualMealType] = useState<MealType>('lunch')
  const [manualSaving, setManualSaving]     = useState(false)

  const [weight, setWeight]           = useState('')
  const [weightSaving, setWeightSaving] = useState(false)

  const [error, setError]       = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const supabase = createClient()
  const user = useUser()

  // 選択日付の食事一覧を取得。jstDayRange で JST 0:00〜23:59 を ISO で出すので
  // タイムゾーン境界の事故が起きない（過去：旧 setHours(0,0,0,0) ローカルTZ依存）
  const fetchMealsForDate = useCallback(async (date: string) => {
    setLoading(true)
    const { start, end } = jstDayRange(date)
    const { data } = await supabase
      .from('meal_logs')
      .select('*')
      .gte('logged_at', start)
      .lte('logged_at', end)
      .order('logged_at', { ascending: false })
    setMeals(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchMealsForDate(selectedDate)
  }, [fetchMealsForDate, selectedDate])

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 2500)
  }

  // 保存に使う logged_at を計算する。
  // - 今日が選ばれている: 実時刻（朝/昼/夜の文脈をコーチが拾えるように）
  // - 過去日が選ばれている: その日の JST 12:00 を代表時刻に。
  //   00:00 にすると UTC で前日となり「前日扱い」事故が起きるので避ける
  const isTodaySelected = selectedDate === getJstNow().dateStr
  function loggedAtForSave(): string {
    if (isTodaySelected) return new Date().toISOString()
    return new Date(`${selectedDate}T12:00:00+09:00`).toISOString()
  }
  function successMessage(): string {
    if (isTodaySelected) return '記録しました'
    const [, m, d] = selectedDate.split('-').map(Number)
    return `${m}月${d}日に記録しました`
  }

  async function handlePhotoSave(data: {
    calories: number; note: string; meal_type: MealType; photo_url: string | null
    protein?: number | null; fat?: number | null; carbs?: number | null
    imageBase64?: string; mimeType?: string
  }) {
    const { error } = await supabase.from('meal_logs').insert({
      user_id: user.id,
      calories: data.calories,
      protein: data.protein ?? null,
      fat:     data.fat     ?? null,
      carbs:   data.carbs   ?? null,
      note: data.note,
      meal_type: data.meal_type,
      photo_url: data.photo_url,
      logged_at: loggedAtForSave(),
    })
    if (error) throw new Error(error.message)
    await fetchMealsForDate(selectedDate)
    showSuccess(`食事を${successMessage()}`)
    // AI コーチからのプロアクティブメッセージを取りにいく（fire-and-forget）
    // 発火条件はサーバ側で判定するためクライアントは結果を気にしない
    if (isTodaySelected) void fireProactiveAfterMeal()
  }

  // 食品検索モードのとき、選択食品 × 入力グラム数からカロリー & PFC を計算
  // food.X_per_100g が null/undefined（カラムなし or 値なし）の項目は計算結果も null にする
  const computed = (() => {
    if (manualMode !== 'search') return null
    if (!selectedFood || grams === '') return null
    const g = parseFloat(grams)
    if (!Number.isFinite(g) || g <= 0) return null
    const scale = g / 100
    // numeric は API 側で number 化済みのはずだが、保険として Number() で再正規化
    const round1 = (raw: unknown): number | null => {
      if (raw === null || raw === undefined) return null
      const n = Number(raw)
      if (!Number.isFinite(n)) return null
      return Math.round(n * scale * 10) / 10
    }
    return {
      calories: Math.round(Number(selectedFood.calories_per_100g) * scale),
      protein:  round1(selectedFood.protein_per_100g),
      fat:      round1(selectedFood.fat_per_100g),
      carbs:    round1(selectedFood.carbs_per_100g),
    }
  })()
  const computedCalories = computed?.calories ?? null

  async function handleManualSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    let caloriesToSave: number
    let noteToSave: string | null
    if (manualMode === 'search') {
      if (computedCalories === null) {
        setError('食品と量(g)を入力してください')
        return
      }
      caloriesToSave = computedCalories
      // メモ入力がなければ「<食品名> <量>g」を自動でメモにする
      noteToSave = manualNote.trim()
        ? manualNote.trim()
        : `${selectedFood!.display_name ?? selectedFood!.name} ${grams}g`
    } else {
      const cal = parseInt(manualCalories)
      if (!Number.isFinite(cal) || cal <= 0) {
        setError('カロリーを入力してください')
        return
      }
      caloriesToSave = cal
      noteToSave = manualNote.trim() || null
    }

    // 検索モード: 算出値を保存。直接入力モード: 任意入力された欄だけ保存（空欄は null）。
    // DB は numeric(5,1) なので小数1桁に丸める。負値・非数値は null 扱いで黙って捨てる
    // （カロリーと違って PFC は任意項目なのでフォーム全体をブロックしない）
    const parseOptionalGrams = (s: string): number | null => {
      const t = s.trim()
      if (t === '') return null
      const n = parseFloat(t)
      if (!Number.isFinite(n) || n < 0) return null
      return Math.round(n * 10) / 10
    }
    const protein = manualMode === 'search'
      ? computed?.protein ?? null
      : parseOptionalGrams(manualProtein)
    const fat = manualMode === 'search'
      ? computed?.fat ?? null
      : parseOptionalGrams(manualFat)
    const carbs = manualMode === 'search'
      ? computed?.carbs ?? null
      : parseOptionalGrams(manualCarbs)

    setManualSaving(true)
    try {
      const { error } = await supabase.from('meal_logs').insert({
        user_id: user.id,
        calories: caloriesToSave,
        protein,
        fat,
        carbs,
        note: noteToSave,
        meal_type: manualMealType,
        photo_url: null,
        logged_at: loggedAtForSave(),
      })
      if (error) throw new Error(error.message)
      setManualCalories('')
      setManualProtein('')
      setManualFat('')
      setManualCarbs('')
      setManualNote('')
      setSelectedFood(null)
      setGrams('')
      await fetchMealsForDate(selectedDate)
      showSuccess(`食事を${successMessage()}`)
      // AI コーチからのプロアクティブメッセージを取りにいく（fire-and-forget）
      if (isTodaySelected) void fireProactiveAfterMeal()
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
      const { error } = await supabase.from('body_logs').insert({
        user_id: user.id, weight: parseFloat(weight), logged_at: loggedAtForSave(),
      })
      if (error) throw new Error(error.message)
      setWeight('')
      showSuccess(`体重を${successMessage()}`)
    } catch {
      setError('保存に失敗しました')
    } finally {
      setWeightSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('meal_logs').delete().eq('id', id)
    if (error) { setError('削除に失敗しました'); return }
    await fetchMealsForDate(selectedDate)
    showSuccess('削除しました')
  }

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0)

  return (
    <div className="min-h-screen max-w-xl lg:max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="relative overflow-hidden bg-linear-to-br from-rose-500 via-rose-400 to-pink-300 px-5 pt-14 pb-8">
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
        <h1 className="relative text-white text-xl font-bold">食事・体重を記録</h1>
        <p className="relative text-white/70 text-sm mt-0.5">今日も記録しよう</p>
      </div>

      <div className="px-4 -mt-4 relative z-10 space-y-3">
        {/* 日付ナビゲーター（記録対象日 & 一覧表示日） */}
        <MealDateNavigator date={selectedDate} onChange={setSelectedDate} />

        {/* タブ */}
        <div className="bg-white rounded-2xl shadow-sm p-1.5 flex gap-1">
          {([
            { key: 'photo',  label: '写真',  icon: Camera  },
            { key: 'manual', label: '手入力', icon: PenLine },
            { key: 'weight', label: '体重',  icon: Scale   },
          ] as { key: Tab; label: string; icon: LucideIcon }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setError(null) }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                tab === key
                  ? 'bg-linear-to-r from-rose-500 to-pink-400 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={14} strokeWidth={2} />
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
                {mealTypeOptions.map((opt) => {
                  const Icon = opt.icon
                  return (
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
                    <Icon size={18} strokeWidth={1.8} className="mb-0.5" />
                    {opt.label}
                  </button>
                )})}
              </div>

              {/* 入力モード切替 */}
              <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
                {([
                  { value: 'search', label: '食品から検索' },
                  { value: 'direct', label: 'カロリー直接入力' },
                ] as const).map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setManualMode(m.value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      manualMode === m.value
                        ? 'bg-white text-rose-500 shadow-sm'
                        : 'text-gray-500'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {manualMode === 'search' ? (
                <>
                  {/* 食品検索 */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide uppercase">
                      食品
                    </label>
                    {selectedFood ? (
                      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 truncate">
                            {selectedFood.display_name ?? selectedFood.name}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">
                            {selectedFood.category} ・ {selectedFood.calories_per_100g} kcal/100g
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedFood(null); setGrams('') }}
                          className="text-xs text-rose-500 hover:underline whitespace-nowrap"
                        >
                          変更
                        </button>
                      </div>
                    ) : (
                      <FoodSearch onSelect={setSelectedFood} />
                    )}
                  </div>

                  {/* 量(g) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide uppercase">
                      量
                    </label>
                    <div className="relative">
                      <input
                        type="number" required min="1" max="3000" step="1"
                        value={grams}
                        onChange={(e) => setGrams(e.target.value)}
                        disabled={!selectedFood}
                        className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all disabled:opacity-50"
                        placeholder="150"
                      />
                      <span className="absolute right-4 top-3 text-sm text-gray-400">g</span>
                    </div>
                  </div>

                  {/* 計算結果 */}
                  {computed !== null && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                      <p className="text-[11px] text-gray-500 mb-0.5 text-center">カロリー（自動計算）</p>
                      <p className="text-2xl font-bold text-rose-500 text-center">
                        {computed.calories}
                        <span className="text-sm font-normal ml-1">kcal</span>
                      </p>
                      {(computed.protein !== null || computed.fat !== null || computed.carbs !== null) && (
                        <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-rose-100 text-center">
                          <div>
                            <p className="text-[10px] text-gray-500">P</p>
                            <p className="text-xs font-semibold text-gray-700">
                              {computed.protein ?? '—'}<span className="text-[10px] text-gray-400 ml-0.5">g</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500">F</p>
                            <p className="text-xs font-semibold text-gray-700">
                              {computed.fat ?? '—'}<span className="text-[10px] text-gray-400 ml-0.5">g</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500">C</p>
                            <p className="text-xs font-semibold text-gray-700">
                              {computed.carbs ?? '—'}<span className="text-[10px] text-gray-400 ml-0.5">g</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* カロリー直接入力モード */
                <>
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
                      栄養素（任意）
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative">
                        <input
                          type="number" min="0" max="999" step="0.1"
                          value={manualProtein}
                          onChange={(e) => setManualProtein(e.target.value)}
                          className="w-full px-3 py-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                          placeholder="P"
                          aria-label="タンパク質 (g)"
                        />
                        <span className="absolute right-3 top-3 text-xs text-gray-400">g</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number" min="0" max="999" step="0.1"
                          value={manualFat}
                          onChange={(e) => setManualFat(e.target.value)}
                          className="w-full px-3 py-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                          placeholder="F"
                          aria-label="脂質 (g)"
                        />
                        <span className="absolute right-3 top-3 text-xs text-gray-400">g</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number" min="0" max="999" step="0.1"
                          value={manualCarbs}
                          onChange={(e) => setManualCarbs(e.target.value)}
                          className="w-full px-3 py-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                          placeholder="C"
                          aria-label="炭水化物 (g)"
                        />
                        <span className="absolute right-3 top-3 text-xs text-gray-400">g</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

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
                className="w-full py-3 bg-linear-to-r from-rose-500 to-pink-400 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm shadow-rose-200"
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
                className="w-full py-3 bg-linear-to-r from-rose-500 to-pink-400 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm shadow-rose-200"
              >
                {weightSaving ? '記録中...' : '記録する'}
              </button>
            </form>
          </div>
        )}

        {/* 選択日付の記録一覧 */}
        {!loading && meals.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <p className="text-sm font-bold text-gray-800">
                {isTodaySelected ? '今日の記録' : `${Number(selectedDate.split('-')[1])}月${Number(selectedDate.split('-')[2])}日の記録`}
              </p>
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
