'use client'

import { useState } from 'react'
import { ArrowUp } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => Promise<void>
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending || disabled) return
    setSending(true)
    setInput('')
    try {
      await onSend(text)
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-3 bg-white border-t border-gray-100">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="メッセージを入力..."
        disabled={disabled || sending}
        className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!input.trim() || sending || disabled}
        className="w-10 h-10 bg-linear-to-br from-rose-500 to-pink-400 text-white rounded-full flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all shadow-sm shadow-rose-200 shrink-0"
      >
        <ArrowUp size={18} strokeWidth={2.5} />
      </button>
    </form>
  )
}
