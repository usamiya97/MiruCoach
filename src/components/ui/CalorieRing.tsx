interface CalorieRingProps {
  consumed: number
  target: number
}

export default function CalorieRing({ consumed, target }: CalorieRingProps) {
  const radius = 76
  const stroke = 14
  const r = radius - stroke / 2
  const circumference = 2 * Math.PI * r
  const progress = Math.min(consumed / target, 1)
  const offset = circumference * (1 - progress)
  const isOver = consumed > target
  const remaining = Math.max(target - consumed, 0)

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        <svg
          width={radius * 2}
          height={radius * 2}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* トラック（背景の輪） */}
          <circle
            cx={radius}
            cy={radius}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={stroke}
          />
          {/* プログレス */}
          <circle
            cx={radius}
            cy={radius}
            r={r}
            fill="none"
            stroke={isOver ? '#fbbf24' : 'white'}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>

        {/* 中央テキスト */}
        <div className="absolute text-center">
          <p className="text-4xl font-bold text-white leading-none">
            {consumed.toLocaleString()}
          </p>
          <p className="text-white/60 text-xs mt-1">kcal</p>
        </div>
      </div>

      {/* 目標と残り */}
      <div className="flex gap-8 text-center">
        <div>
          <p className="text-white/60 text-xs">目標</p>
          <p className="text-white font-semibold text-sm">{target.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-white/60 text-xs">残り</p>
          <p className={`font-semibold text-sm ${isOver ? 'text-amber-300' : 'text-white'}`}>
            {isOver ? `+${(consumed - target).toLocaleString()}` : remaining.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
