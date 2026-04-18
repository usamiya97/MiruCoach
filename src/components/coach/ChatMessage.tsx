import { Leaf } from 'lucide-react'
import type { CoachMessage } from '@/types'

interface ChatMessageProps {
  message: CoachMessage
  coachName: string
}

export default function ChatMessage({ message, coachName }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-300 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Leaf size={14} className="text-white" strokeWidth={2} />
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-gradient-to-br from-rose-500 to-pink-400 text-white rounded-tr-sm shadow-sm shadow-rose-200'
            : 'bg-white text-gray-800 shadow-sm rounded-tl-sm'
        }`}
      >
        {!isUser && (
          <p className="text-xs text-rose-400 font-semibold mb-1">{coachName}</p>
        )}
        {message.content}
      </div>
    </div>
  )
}
