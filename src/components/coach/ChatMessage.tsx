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
        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-sm">
          🌿
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-rose-400 text-white rounded-tr-sm'
            : 'bg-white text-gray-800 shadow-sm rounded-tl-sm'
        }`}
      >
        {!isUser && (
          <p className="text-xs text-rose-400 font-medium mb-1">{coachName}</p>
        )}
        {message.content}
      </div>
    </div>
  )
}
