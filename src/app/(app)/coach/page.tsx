'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, Loader2 } from 'lucide-react'
import Image from 'next/image'
import ChatMessage from '@/components/coach/ChatMessage'
import ChatInput from '@/components/coach/ChatInput'
import type { CoachMessage } from '@/types'
import Link from 'next/link'

export default function CoachPage() {
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [isPremium, setIsPremium] = useState(false)
  const [coachName, setCoachName] = useState('ミル')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isInitialLoad = useRef(true)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, historyRes] = await Promise.all([
      supabase.from('users').select('plan, coach_name').eq('id', user.id).single(),
      supabase
        .from('coach_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50),
    ])

    if (profileRes.data) {
      setIsPremium(profileRes.data.plan === 'premium')
      setCoachName(profileRes.data.coach_name ?? 'ミル')
    }
    setMessages(historyRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (isInitialLoad.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      isInitialLoad.current = false
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  async function handleSend(text: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 楽観的UI更新（ユーザーメッセージを即表示）
    const optimisticUserMsg: CoachMessage = {
      id: `tmp-${Date.now()}`,
      user_id: user.id,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticUserMsg])
    setSending(true)

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()

      const assistantMsg: CoachMessage = {
        id: `tmp-assistant-${Date.now()}`,
        user_id: user.id,
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      // エラー時は楽観的に追加したメッセージを戻す
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsg.id))
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    )
  }

  // 未課金ユーザー向けペイウォール
  if (!isPremium) {
    return (
      <div className="max-w-xl lg:max-w-3xl mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6">
        <div className="w-20 h-20">
          <Image src="/logo.svg" alt={coachName} width={80} height={80} className="w-full h-full object-contain" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900">AIコーチ「{coachName}」</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            毎日の食事・体重データをもとに、
            <br />
            あなた専属のコーチが継続をサポートします。
          </p>
        </div>
        <ul className="text-sm text-gray-600 space-y-3 text-left w-full max-w-xs">
          {[
            '毎日の食事記録をコーチが分析',
            'サボった日も責めない会話設計',
            '体重の推移に基づく具体的なアドバイス',
          ].map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Check size={11} className="text-rose-500" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="w-full max-w-xs space-y-3">
          <Link
            href="/api/stripe/checkout"
            className="block w-full py-3 bg-linear-to-r from-rose-500 to-pink-400 text-white rounded-xl text-sm font-semibold text-center hover:opacity-90 transition-all shadow-sm shadow-rose-200"
          >
            月額980円で始める
          </Link>
          <p className="text-xs text-gray-400">いつでもキャンセル可能</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl lg:max-w-3xl mx-auto flex flex-col h-[calc(100dvh-96px)]">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-12 h-12">
          <Image src="/logo.svg" alt={coachName} width={96} height={96} className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{coachName}</p>
          <p className="text-xs text-gray-400">AIパーソナルコーチ</p>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <div className="w-28 h-28 mx-auto">
              <Image src="/coach-talk.svg" alt={coachName} width={112} height={112} className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-700">こんにちは！{coachName}です。</p>
              <p className="text-sm text-gray-400">今日の調子はどうですか？</p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} coachName={coachName} />
        ))}
        {sending && (
          <div className="flex gap-2">
            <div className="w-8 h-8 shrink-0">
              <Image src="/logo.svg" alt={coachName} width={32} height={32} className="w-full h-full object-contain" />
            </div>
            <div className="bg-white shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="text-rose-300 animate-spin" />
              <p className="text-xs text-gray-400">入力中...</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  )
}
