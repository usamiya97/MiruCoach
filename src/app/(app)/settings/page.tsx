'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcTargetCalories } from '@/lib/calories'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function SettingsPage() {
  const supabase = createClient()

  const [height, setHeight]         = useState('')
  const [age, setAge]               = useState('')
  const [weight, setWeight]         = useState('')  // 最新体重（body_logs から）
  const [goalWeight, setGoalWeight] = useState('')
  const [targetCalories, setTargetCalories] = useState('')
  const [useManual, setUseManual]   = useState(false)  // 手動上書きモード
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, latestWeightRes] = await Promise.all([
      supabase.from('users')
        .select('height, goal_weight, age, target_calories')
        .eq('id', user.id)
        .single(),
      supabase.from('body_logs')
        .select('weight')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    const p = profileRes.data
    if (p) {
      setHeight(p.height?.toString() ?? '')
      setGoalWeight(p.goal_weight?.toString() ?? '')
      setAge(p.age?.toString() ?? '')
      setTargetCalories(p.target_calories?.toString() ?? '1800')
    }
    if (latestWeightRes.data) {
      setWeight(latestWeightRes.data.weight.toString())
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  // 自動計算値（4項目が揃っているとき）
  const allFilled = height !== '' && age !== '' && weight !== '' && goalWeight !== ''
  const calculated = allFilled
    ? calcTargetCalories({
        height: parseFloat(height),
        weight: parseFloat(weight),
        goalWeight: parseFloat(goalWeight),
        age: parseInt(age),
      })
    : null

  // 手動モードでなければ計算値をフォームに反映
  useEffect(() => {
    if (!useManual && calculated !== null) {
      setTargetCalories(calculated.toString())
    }
  }, [calculated, useManual])

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: upsertError } = await supabase.from('users').upsert({
        id: user.id,
        height: height ? parseFloat(height) : null,
        goal_weight: goalWeight ? parseFloat(goalWeight) : null,
        age: age ? parseInt(age) : null,
        target_calories: parseInt(targetCalories),
      })
      if (upsertError) throw upsertError

      setSuccessMsg('設定を保存しました')
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <h1 className="text-lg font-bold text-gray-900">設定</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-gray-800">あなたの情報</p>

          {/* 身長 */}
          <Field label="身長" unit="cm">
            <input
              type="number" step="0.1" min="130" max="200"
              value={height} onChange={(e) => setHeight(e.target.value)}
              className={inputClass} placeholder="158.0"
            />
          </Field>

          {/* 年齢 */}
          <Field label="年齢" unit="歳">
            <input
              type="number" min="18" max="80"
              value={age} onChange={(e) => setAge(e.target.value)}
              className={inputClass} placeholder="35"
            />
          </Field>

          {/* 最新体重（表示のみ・body_logsから取得） */}
          <Field label="現在の体重（最新記録）" unit="kg">
            <input
              type="number" step="0.1"
              value={weight} onChange={(e) => setWeight(e.target.value)}
              className={inputClass} placeholder="58.0"
            />
          </Field>

          {/* 目標体重 */}
          <Field label="目標体重" unit="kg">
            <input
              type="number" step="0.1" min="30" max="200"
              value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)}
              className={inputClass} placeholder="53.0"
            />
          </Field>
        </Card>

        {/* 目標カロリー */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">1日の目標カロリー</p>
            <button
              type="button"
              onClick={() => setUseManual((v) => !v)}
              className="text-xs text-rose-400 hover:underline"
            >
              {useManual ? '自動計算に戻す' : '手動で設定する'}
            </button>
          </div>

          {useManual ? (
            /* 手動入力 */
            <Field label="" unit="kcal">
              <input
                type="number" min="1200" max="3000"
                value={targetCalories}
                onChange={(e) => setTargetCalories(e.target.value)}
                className={inputClass} placeholder="1800"
              />
            </Field>
          ) : (
            /* 自動計算プレビュー */
            <div className="bg-rose-50 rounded-xl p-4 text-center">
              {calculated ? (
                <>
                  <p className="text-3xl font-bold text-rose-500">
                    {calculated}
                    <span className="text-base font-normal ml-1">kcal</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    上の情報をもとに自動計算
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400">
                  身長・年齢・体重・目標体重を入力すると自動計算されます
                </p>
              )}
            </div>
          )}
        </Card>

        {successMsg && (
          <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 text-center">
            {successMsg}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <Button type="submit" className="w-full" loading={saving}>
          保存する
        </Button>
      </form>
    </div>
  )
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400'

function Field({
  label,
  unit,
  children,
}: {
  label: string
  unit: string
  children: React.ReactNode
}) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <div className="relative">
        {children}
        {unit && (
          <span className="absolute right-3 top-2 text-sm text-gray-400">{unit}</span>
        )}
      </div>
    </div>
  )
}
