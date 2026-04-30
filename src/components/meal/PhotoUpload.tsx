'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import type { MealType, AnalyzeMealResponse } from '@/types'
import type { AnalyzeMealUsage } from '@/lib/analyze-meal-limits'
import Button from '@/components/ui/Button'

interface PhotoUploadProps {
  onSave: (data: {
    calories: number
    note: string
    meal_type: MealType
    photo_url: string | null
    imageBase64?: string
    mimeType?: string
  }) => Promise<void>
}

const mealTypeOptions: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '朝食' },
  { value: 'lunch',     label: '昼食' },
  { value: 'dinner',    label: '夕食' },
  { value: 'snack',     label: '間食' },
]

export default function PhotoUpload({ onSave }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview]           = useState<string | null>(null)
  const [imageBase64, setImageBase64]   = useState<string | null>(null)
  const [mimeType, setMimeType]         = useState<string>('')
  const [analyzing, setAnalyzing]       = useState(false)
  const [analyzed, setAnalyzed]         = useState<AnalyzeMealResponse | null>(null)
  const [mealType, setMealType]         = useState<MealType>('lunch')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [usage, setUsage]               = useState<AnalyzeMealUsage | null>(null)

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMimeType(file.type)
    setAnalyzed(null)
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setPreview(dataUrl)
      setImageBase64(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  async function handleAnalyze() {
    if (!imageBase64) return
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType }),
      })
      if (!res.ok) {
        if (res.status === 429) {
          const data = await res.json().catch(() => ({})) as { limit?: number; plan?: 'free' | 'premium' }
          const planLabel = data.plan === 'premium' ? 'Premium' : '無料'
          setError(`24時間あたりの解析回数（${planLabel}プラン: ${data.limit ?? ''}回）の上限に達しました。時間をおいて再度お試しください。`)
          fetchUsage()
        } else if (res.status === 413) {
          setError('画像サイズが大きすぎます。別の写真を選択してください。')
        } else if (res.status === 400) {
          setError('画像の形式が対応していません（JPEG / PNG / WebP のみ）。')
        } else if (res.status === 401) {
          setError('ログインし直してから試してください。')
        } else {
          setError('カロリー解析に失敗しました。もう一度試してください。')
        }
        return
      }
      const data: AnalyzeMealResponse = await res.json()
      setAnalyzed(data)
      fetchUsage()
    } catch {
      setError('カロリー解析に失敗しました。もう一度試してください。')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSave() {
    if (!analyzed) return
    setSaving(true)
    try {
      await onSave({
        calories: analyzed.calories,
        note: analyzed.note,
        meal_type: mealType,
        photo_url: null,
        imageBase64: imageBase64 ?? undefined,
        mimeType,
      })
      setPreview(null)
      setImageBase64(null)
      setAnalyzed(null)
      if (inputRef.current) inputRef.current.value = ''
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
      <div className="flex gap-2">
        {mealTypeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMealType(opt.value)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mealType === opt.value
                ? 'bg-rose-400 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 解析回数の使用状況 */}
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
            <span className="text-gray-400 ml-1">（24時間に{usage.limit}回まで）</span>
          </span>
          <span className="font-semibold tabular-nums">
            残り {usage.remaining} / {usage.limit}回
          </span>
        </div>
      )}

      {/* 写真選択エリア */}
      {!preview ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-44 border-2 border-dashed border-rose-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-rose-400 hover:text-rose-400 hover:bg-rose-50/50 transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center">
            <Camera size={26} className="text-rose-300" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-medium">タップして写真を選択</span>
        </button>
      ) : (
        <div className="relative">
          <img src={preview} alt="プレビュー" className="w-full h-52 object-cover rounded-2xl" />
          <button
            onClick={() => {
              setPreview(null)
              setImageBase64(null)
              setAnalyzed(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* 解析結果 */}
      {analyzed && (
        <div className="bg-rose-50 rounded-2xl p-4 space-y-1">
          <p className="text-2xl font-bold text-rose-500 text-center">
            {analyzed.calories.toLocaleString()} <span className="text-base font-normal">kcal</span>
          </p>
          <p className="text-sm text-gray-500 text-center">{analyzed.note}</p>
        </div>
      )}

      {/* ボタン */}
      {preview && !analyzed && (
        <Button
          className="w-full"
          onClick={handleAnalyze}
          loading={analyzing}
          disabled={reachedLimit}
        >
          {analyzing
            ? '解析中...'
            : reachedLimit
              ? '本日の上限に達しました'
              : 'カロリーを解析する'}
        </Button>
      )}
      {analyzed && (
        <Button className="w-full" onClick={handleSave} loading={saving}>
          {saving ? '記録中...' : '記録する'}
        </Button>
      )}
    </div>
  )
}
