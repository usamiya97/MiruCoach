'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcTargetCalories } from '@/lib/calories'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [height, setHeight]         = useState('')
  const [age, setAge]               = useState('')
  const [weight, setWeight]         = useState('')
  const [goalWeight, setGoalWeight] = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // すでにオンボーディング済みならダッシュボードへ
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('users')
        .select('height')
        .eq('id', user.id)
        .single()

      if (data?.height) router.push('/dashboard')
    }
    check()
  }, [supabase, router])

  // 入力値が揃っていれば計算してプレビュー表示
  const allFilled =
    height !== '' && age !== '' && weight !== '' && goalWeight !== ''

  const preview = allFilled
    ? calcTargetCalories({
        height: parseFloat(height),
        weight: parseFloat(weight),
        goalWeight: parseFloat(goalWeight),
        age: parseInt(age),
      })
    : null

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!preview) return
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // users テーブルに upsert（レコードがなければ作成）
      const { error: upsertError } = await supabase.from('users').upsert({
        id: user.id,
        height: parseFloat(height),
        goal_weight: parseFloat(goalWeight),
        age: parseInt(age),
        target_calories: preview,
      })
      if (upsertError) throw upsertError

      // 現在体重を body_logs にも記録しておく
      await supabase.from('body_logs').insert({
        user_id: user.id,
        weight: parseFloat(weight),
        logged_at: new Date().toISOString(),
      })

      router.push('/dashboard')
    } catch {
      setError('保存に失敗しました。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  async function handleSkip() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // スキップ時はデフォルト値のみ upsert
    await supabase.from('users').upsert({
      id: user.id,
      target_calories: 1800,
    })
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 space-y-6">

        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <img src="/logo.svg" alt="mirucoach" className="w-14 h-14 rounded-2xl mx-auto shadow-md shadow-rose-200" />
          <h1 className="text-xl font-bold text-gray-900">はじめに教えてください</h1>
          <p className="text-xs text-gray-400">
            あなたに合った目標カロリーを自動で計算します
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          {/* 身長 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              身長
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="130"
                max="200"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                placeholder="158.0"
              />
              <span className="absolute right-3 top-2 text-sm text-gray-400">cm</span>
            </div>
          </div>

          {/* 年齢 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              年齢
            </label>
            <div className="relative">
              <input
                type="number"
                min="18"
                max="80"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                placeholder="35"
              />
              <span className="absolute right-3 top-2 text-sm text-gray-400">歳</span>
            </div>
          </div>

          {/* 現在体重 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              現在の体重
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="30"
                max="200"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                placeholder="58.0"
              />
              <span className="absolute right-3 top-2 text-sm text-gray-400">kg</span>
            </div>
          </div>

          {/* 目標体重 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              目標体重
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="30"
                max="200"
                value={goalWeight}
                onChange={(e) => setGoalWeight(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                placeholder="53.0"
              />
              <span className="absolute right-3 top-2 text-sm text-gray-400">kg</span>
            </div>
          </div>

          {/* 計算結果プレビュー */}
          {preview && (
            <div className="bg-rose-50 rounded-xl p-4 text-center space-y-1">
              <p className="text-xs text-gray-400">あなたの目標摂取カロリー</p>
              <p className="text-3xl font-bold text-rose-500">{preview} <span className="text-base font-normal">kcal</span></p>
              <p className="text-xs text-gray-400">設定後も変更できます</p>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={!allFilled || saving}
            className="w-full py-2.5 bg-rose-400 text-white rounded-lg text-sm font-medium hover:bg-rose-500 disabled:opacity-50 transition-colors"
          >
            {saving ? '設定中...' : 'この目標で始める'}
          </button>
        </form>

        {/* スキップ */}
        <button
          onClick={handleSkip}
          className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          スキップして後で設定する（1800kcalで開始）
        </button>
      </div>
    </div>
  )
}
