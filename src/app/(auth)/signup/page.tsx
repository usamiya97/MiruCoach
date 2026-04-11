'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'otp'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })

    setLoading(false)
    if (error) {
      setError('登録に失敗しました。しばらくしてからもう一度お試しください。')
      return
    }
    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })

    setLoading(false)
    if (error) {
      setError('コードが正しくないか期限切れです。もう一度お試しください。')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
      <div className="text-center mb-8">
        <p className="text-3xl mb-1">🌿</p>
        <h1 className="text-xl font-bold text-gray-900">ミルコーチ</h1>
        <p className="text-sm text-gray-500 mt-1">新規登録</p>
      </div>

      {step === 'email' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <p className="text-xs text-gray-400">
            登録することで
            <a href="#" className="text-rose-400 hover:underline">利用規約</a>
            および
            <a href="#" className="text-rose-400 hover:underline">プライバシーポリシー</a>
            に同意したものとみなします。
          </p>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-rose-400 text-white rounded-lg text-sm font-medium hover:bg-rose-500 disabled:opacity-50 transition-colors"
          >
            {loading ? '送信中...' : '確認コードを送る'}
          </button>

          <p className="text-center text-sm text-gray-500">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-rose-500 hover:underline">
              ログイン
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            <span className="font-medium">{email}</span> に
            <br />
            確認コードを送りました
          </p>

          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
              確認コード（8桁）
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{8}"
              maxLength={8}
              required
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent text-center tracking-[0.5em] text-lg"
              placeholder="00000000"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || otp.length !== 8}
            className="w-full py-2.5 bg-rose-400 text-white rounded-lg text-sm font-medium hover:bg-rose-500 disabled:opacity-50 transition-colors"
          >
            {loading ? '確認中...' : '登録して始める'}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('email')
              setOtp('')
              setError(null)
            }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← メールアドレスを変更する
          </button>
        </form>
      )}
    </div>
  )
}
