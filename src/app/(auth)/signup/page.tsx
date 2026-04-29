'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleGoogleSignIn() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      setError('Googleログインに失敗しました。もう一度お試しください。')
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 space-y-6">
      <Link href="/" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors w-fit">
        <ChevronLeft size={14} />
        トップに戻る
      </Link>

      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900">新規登録</h2>
        <p className="text-xs text-gray-400 mt-1">無料ではじめましょう</p>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
        >
          <GoogleIcon />
          {loading ? '処理中...' : 'Googleで登録'}
        </button>

        <p className="text-xs text-gray-400 leading-relaxed text-center">
          登録することで
          <a href="#" className="text-rose-400 hover:underline">利用規約</a>
          および
          <a href="#" className="text-rose-400 hover:underline">プライバシーポリシー</a>
          に同意したものとみなします。
        </p>

        <p className="text-center text-xs text-gray-400">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-rose-500 font-medium hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
