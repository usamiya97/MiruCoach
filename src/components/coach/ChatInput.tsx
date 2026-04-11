'use client'

import { useState } from 'react'

interface ChatInputProps {
  onSend: (message: string) => Promise<void>
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
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
        className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!input.trim() || sending || disabled}
        className="w-10 h-10 bg-rose-400 text-white rounded-full flex items-center justify-center hover:bg-rose-500 disabled:opacity-40 transition-colors flex-shrink-0"
      >
        ↑
      </button>
    </form>
  )
}
