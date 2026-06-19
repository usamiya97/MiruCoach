'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { X } from 'lucide-react'

interface CoachPreviewToastProps {
  coachName: string
  message: string
  onClose: () => void
}

const AUTO_DISMISS_MS = 10_000

export default function CoachPreviewToast({
  coachName,
  message,
  onClose,
}: CoachPreviewToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [onClose])

  // 全文は coach_messages に保存済みなので、ここは「冒頭プレビュー」だけ
  const preview = message.length > 80 ? message.slice(0, 80) + '…' : message

  return (
    <Link
      href="/coach"
      className="block bg-white border border-rose-200 rounded-2xl shadow-md hover:shadow-lg transition-all p-3 relative animate-in fade-in slide-in-from-top-2"
    >
      <div className="flex gap-3 items-start">
        <div className="w-10 h-10 shrink-0">
          <Image
            src="/logo.svg"
            alt={coachName}
            width={40}
            height={40}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0 pr-5">
          <p className="text-[11px] font-semibold text-rose-500">{coachName}からメッセージ</p>
          <p className="text-sm text-gray-700 mt-0.5 leading-snug">{preview}</p>
          <p className="text-[10px] text-rose-400 mt-1.5">タップして続きを読む →</p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
          aria-label="閉じる"
        >
          <X size={14} />
        </button>
      </div>
    </Link>
  )
}
