'use client'

interface SuggestedPromptsProps {
  prompts: readonly string[]
  variant: 'block' | 'chips'
  onSelect: (text: string) => void
  disabled?: boolean
}

export default function SuggestedPrompts({
  prompts,
  variant,
  onSelect,
  disabled,
}: SuggestedPromptsProps) {
  if (variant === 'block') {
    return (
      <div className="space-y-2 max-w-xs mx-auto w-full">
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onSelect(p)}
            disabled={disabled}
            className="w-full px-4 py-3 bg-white border border-rose-100 hover:border-rose-300 hover:bg-rose-50/60 rounded-2xl text-sm text-gray-700 transition-all disabled:opacity-50 disabled:hover:bg-white text-left flex items-center justify-between gap-2 shadow-sm"
          >
            <span>{p}</span>
            <span className="text-rose-300 text-base leading-none">›</span>
          </button>
        ))}
      </div>
    )
  }

  // chips: メッセージあり画面の入力欄上に出す水平スクロールチップ
  return (
    <div className="flex gap-2 overflow-x-auto px-3 pt-2 pb-1 bg-gray-50">
      {prompts.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onSelect(p)}
          disabled={disabled}
          className="shrink-0 px-3 py-1.5 bg-white border border-gray-200 hover:border-rose-300 hover:bg-rose-50/60 rounded-full text-xs text-gray-600 transition-all disabled:opacity-50 disabled:hover:bg-white"
        >
          {p}
        </button>
      ))}
    </div>
  )
}
