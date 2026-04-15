'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep]       = useState<Step>('email')
  const [email, setEmail]     = useState('')
  const [otp, setOtp]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSendOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    setLoading(false)
    if (error) {
      setError('メールアドレスが登録されていません。新規登録をお試しください。')
      return
    }
    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setLoading(false)
    if (error) {
      setError('コードが正しくないか期限切れです。もう一度お試しください。')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900">ログイン</h2>
        <p className="text-xs text-gray-400 mt-1">
          {step === 'email' ? 'メールアドレスを入力してください' : `${email} に送信しました`}
        </p>
      </div>

      {step === 'email' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide uppercase">
              メールアドレス
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-400 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm shadow-rose-200"
          >
            {loading ? '送信中...' : '確認コードを送る'}
          </button>

          <p className="text-center text-xs text-gray-400">
            アカウントをお持ちでない方は{' '}
            <Link href="/signup" className="text-rose-500 font-medium hover:underline">
              新規登録
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide uppercase">
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
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-center tracking-[0.6em] text-lg font-bold transition-all"
              placeholder="00000000"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otp.length !== 8}
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-400 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm shadow-rose-200"
          >
            {loading ? '確認中...' : 'ログイン'}
          </button>

          <button
            type="button"
            onClick={() => { setStep('email'); setOtp(''); setError(null) }}
            className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← メールアドレスを変更する
          </button>
        </form>
      )}
    </div>
  )
}
