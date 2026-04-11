'use client'

import { useRef, useState } from 'react'
import type { MealType, AnalyzeMealResponse } from '@/types'
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
  { value: 'lunch', label: '昼食' },
  { value: 'dinner', label: '夕食' },
  { value: 'snack', label: '間食' },
]

export default function PhotoUpload({ onSave }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string>('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState<AnalyzeMealResponse | null>(null)
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      // base64部分だけ取り出す
      const base64 = dataUrl.split(',')[1]
      setImageBase64(base64)
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
      if (!res.ok) throw new Error('解析に失敗しました')
      const data: AnalyzeMealResponse = await res.json()
      setAnalyzed(data)
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
      // リセット
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

      {/* 写真選択エリア */}
      {!preview ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-40 border-2 border-dashed border-rose-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-rose-400 hover:text-rose-400 transition-colors"
        >
          <span className="text-4xl">📷</span>
          <span className="text-sm">タップして写真を選択</span>
        </button>
      ) : (
        <div className="relative">
          <img src={preview} alt="プレビュー" className="w-full h-48 object-cover rounded-xl" />
          <button
            onClick={() => {
              setPreview(null)
              setImageBase64(null)
              setAnalyzed(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
          >
            ✕
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
        <div className="bg-rose-50 rounded-xl p-3 space-y-1">
          <p className="text-2xl font-bold text-rose-500 text-center">
            {analyzed.calories} kcal
          </p>
          <p className="text-sm text-gray-600 text-center">{analyzed.note}</p>
        </div>
      )}

      {/* ボタン */}
      {preview && !analyzed && (
        <Button className="w-full" onClick={handleAnalyze} loading={analyzing}>
          カロリーを解析する
        </Button>
      )}
      {analyzed && (
        <Button className="w-full" onClick={handleSave} loading={saving}>
          記録する
        </Button>
      )}
    </div>
  )
}
