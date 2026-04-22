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
  const [weight, setWeight]         = useState('')
  const [goalWeight, setGoalWeight] = useState('')
  const [targetCalories, setTargetCalories] = useState('')
  const [useManual, setUseManual]   = useState(false)
  const [coachName, setCoachName]   = useState('ミル')
  const [coachTone, setCoachTone]   = useState<'gentle' | 'logical'>('gentle')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, latestWeightRes] = await Promise.all([
      supabase.from('users')
        .select('height, goal_weight, age, target_calories, coach_name, coach_tone')
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
      setCoachName(p.coach_name ?? 'ミル')
      setCoachTone((p.coach_tone as 'gentle' | 'logical') ?? 'gentle')
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
        coach_name: coachName.trim() || 'ミル',
        coach_tone: coachTone,
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
    <div className="min-h-screen max-w-xl lg:max-w-3xl mx-auto">

      {/* グラデーションヘッダー */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-rose-400 to-pink-300 px-5 pt-14 pb-10">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-6 -translate-x-6" />
        <div className="relative">
          <p className="text-white/70 text-sm font-medium tracking-wide">MY PROFILE</p>
          <h1 className="text-white text-2xl font-bold mt-1">マイ設定</h1>
          <p className="text-white/60 text-xs mt-1">目標や体型情報を管理します</p>
        </div>
      </div>

      <div className="px-4 -mt-4 relative z-10 pb-4 space-y-3">
      <form onSubmit={handleSave} className="space-y-3">
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

        {/* コーチ設定 */}
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-gray-800">コーチの設定</p>

          <Field label="コーチの名前" unit="">
            <input
              type="text"
              maxLength={10}
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              className={inputClass}
              placeholder="ミル"
            />
          </Field>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">コーチの性格</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'gentle', label: 'やさしい', desc: '褒めながら寄り添う' },
                { value: 'logical', label: '論理的', desc: 'データで明確に導く' },
              ] as const).map((tone) => (
                <button
                  key={tone.value}
                  type="button"
                  onClick={() => setCoachTone(tone.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    coachTone === tone.value
                      ? 'border-rose-400 bg-rose-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <p className={`text-sm font-semibold ${coachTone === tone.value ? 'text-rose-500' : 'text-gray-700'}`}>
                    {tone.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{tone.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {successMsg && (
          <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 text-center">
            {successMsg}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-400 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm shadow-rose-200"
        >
          {saving ? '保存中...' : '保存する'}
        </button>
      </form>
      </div>
    </div>
  )
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400'

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
