'use client'

import { useCallback, useEffect, useState } from 'react'
import { Sparkles, Sunrise, Sun, Moon, Cookie } from 'lucide-react'
import Button from '@/components/ui/Button'
import type { MealType, AnalyzeMealResponse } from '@/types'
import type { LucideIcon } from 'lucide-react'
import type { AnalyzeMealUsage } from '@/lib/analyze-meal-limits'

interface TextMealInputProps {
  onSave: (data: {
    calories: number
    protein: number | null
    fat: number | null
    carbs: number | null
    note: string
    meal_type: MealType
    photo_url: null
  }) => Promise<void>
}

const MAX_TEXT_LENGTH = 500

const mealTypeOptions: { value: MealType; label: string; icon: LucideIcon }[] = [
  { value: 'breakfast', label: '朝食', icon: Sunrise },
  { value: 'lunch',     label: '昼食', icon: Sun     },
  { value: 'dinner',    label: '夕食', icon: Moon    },
  { value: 'snack',     label: '間食', icon: Cookie  },
]

export default function TextMealInput({ onSave }: TextMealInputProps) {
  const [mealType, setMealType]     = useState<MealType>('lunch')
  const [text, setText]             = useState('')
  const [analyzing, setAnalyzing]   = useState(false)
  const [analyzed, setAnalyzed]     = useState<AnalyzeMealResponse | null>(null)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [usage, setUsage]           = useState<AnalyzeMealUsage | null>(null)
  // AI推定は外れることがあるのでユーザ側で微調整できるようにする
  const [editCalories, setEditCalories] = useState<string>('')

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/analyze-meal/usage')
      if (!res.ok) return
      const data: AnalyzeMealUsage = await res.json()
      setUsage(data)
    } catch {
      // 使用状況の取得失敗は致命的ではないので握りつぶす
    }
  }, [])

  useEffect(() => { fetchUsage() }, [fetchUsage])

  async function handleAnalyze() {
    const trimmed = text.trim()
    if (trimmed.length === 0) {
      setError('食べたものを入力してください')
      return
    }
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('/api/analyze-meal-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
      if (!res.ok) {
        if (res.status === 429) {
          const data = await res.json().catch(() => ({})) as { limit?: number; plan?: 'free' | 'premium' }
          const planLabel = data.plan === 'premium' ? 'Premium' : '無料'
          setError(`24時間あたりの解析回数（${planLabel}プラン: ${data.limit ?? ''}回）の上限に達しました。時間をおいて再度お試しください。`)
          fetchUsage()
        } else if (res.status === 413) {
          setError(`文字数が多すぎます（${MAX_TEXT_LENGTH}文字まで）`)
        } else if (res.status === 401) {
          setError('ログインし直してから試してください。')
        } else {
          setError('解析に失敗しました。もう一度試してください。')
        }
        return
      }
      const data: AnalyzeMealResponse = await res.json()
      if (data.calories <= 0) {
        setError('食事として読み取れませんでした。もう少し具体的に書いてみてください。')
        fetchUsage()
        return
      }
      setAnalyzed(data)
      setEditCalories(String(data.calories))
      fetchUsage()
    } catch {
      setError('解析に失敗しました。もう一度試してください。')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSave() {
    if (!analyzed) return
    const finalCal = parseInt(editCalories)
    if (!Number.isFinite(finalCal) || finalCal <= 0) {
      setError('カロリーを正しく入力してください')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        calories: finalCal,
        protein: analyzed.protein,
        fat: analyzed.fat,
        carbs: analyzed.carbs,
        note: analyzed.note || text.trim().slice(0, 200),
        meal_type: mealType,
        photo_url: null,
      })
      setText('')
      setAnalyzed(null)
      setEditCalories('')
    } catch {
      setError('保存に失敗しました。')
    } finally {
      setSaving(false)
    }
  }

  const reachedLimit = usage !== null && usage.remaining <= 0

  return (
    <div className="space-y-4">
      {/* 食事タイプ選択 */}
      <div className="grid grid-cols-4 gap-2">
        {mealTypeOptions.map((opt) => {
          const Icon = opt.icon
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMealType(opt.value)}
              className={`flex flex-col items-center py-2.5 rounded-xl text-xs font-medium transition-all ${
                mealType === opt.value
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Icon size={18} strokeWidth={1.8} className="mb-0.5" />
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* 使用状況 */}
      {usage && (
        <div
          className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${
            reachedLimit
              ? 'bg-red-50 text-red-600'
              : 'bg-gray-50 text-gray-600'
          }`}
        >
          <span className="font-medium">
            {usage.plan === 'premium' ? 'Premiumプラン' : '無料プラン'}
            <span className="text-gray-400 ml-1">（写真解析と共通枠 / 24時間に{usage.limit}回）</span>
          </span>
          <span className="font-semibold tabular-nums">
            残り {usage.remaining} / {usage.limit}回
          </span>
        </div>
      )}

      {/* テキスト入力 */}
      {!analyzed && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide uppercase">
            食べたもの
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_TEXT_LENGTH}
            rows={3}
            placeholder="例: コンビニのおにぎり2個とサラダチキン"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all resize-none"
          />
          <p className="text-[11px] text-gray-400 text-right mt-1">
            {text.length} / {MAX_TEXT_LENGTH}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* 解析結果 */}
      {analyzed && (
        <div className="space-y-3">
          <div className="bg-rose-50 rounded-2xl p-4 space-y-1">
            <p className="text-[11px] text-gray-500 text-center">AI推定（必要なら編集できます）</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <input
                type="number"
                value={editCalories}
                onChange={(e) => setEditCalories(e.target.value)}
                min="1"
                max="5000"
                className="w-28 text-2xl font-bold text-rose-500 text-center bg-transparent border-b-2 border-rose-200 focus:border-rose-400 focus:outline-none"
                aria-label="カロリー"
              />
              <span className="text-sm text-gray-500">kcal</span>
            </div>
            {(analyzed.protein !== null || analyzed.fat !== null || analyzed.carbs !== null) && (
              <div className="grid grid-cols-3 gap-1 pt-2 mt-2 border-t border-rose-100 text-center">
                <div>
                  <p className="text-[10px] text-gray-500">P（推定）</p>
                  <p className="text-xs font-semibold text-gray-700">
                    {analyzed.protein ?? '—'}<span className="text-[10px] text-gray-400 ml-0.5">g</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">F（推定）</p>
                  <p className="text-xs font-semibold text-gray-700">
                    {analyzed.fat ?? '—'}<span className="text-[10px] text-gray-400 ml-0.5">g</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">C（推定）</p>
                  <p className="text-xs font-semibold text-gray-700">
                    {analyzed.carbs ?? '—'}<span className="text-[10px] text-gray-400 ml-0.5">g</span>
                  </p>
                </div>
              </div>
            )}
            {analyzed.note && (
              <p className="text-sm text-gray-600 text-center pt-2">{analyzed.note}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setAnalyzed(null); setEditCalories(''); setError(null) }}
            className="text-xs text-gray-500 hover:text-rose-500 underline mx-auto block"
          >
            別の文章で解析し直す
          </button>
        </div>
      )}

      {/* ボタン */}
      {!analyzed ? (
        <Button
          className="w-full"
          onClick={handleAnalyze}
          loading={analyzing}
          disabled={reachedLimit || text.trim().length === 0}
        >
          <Sparkles size={14} className="inline-block mr-1.5 -mt-0.5" strokeWidth={2} />
          {analyzing
            ? '解析中...'
            : reachedLimit
              ? '本日の上限に達しました'
              : 'AIで解析する'}
        </Button>
      ) : (
        <Button className="w-full" onClick={handleSave} loading={saving}>
          {saving ? '記録中...' : '記録する'}
        </Button>
      )}
    </div>
  )
}
