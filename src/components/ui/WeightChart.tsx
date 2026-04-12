'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface WeightChartProps {
  data: { date: string; weight: number }[]
}

interface TooltipPayloadItem {
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white shadow-md rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="font-bold text-rose-500">{payload[0].value} kg</p>
    </div>
  )
}

export default function WeightChart({ data }: WeightChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-28 gap-1">
        <p className="text-sm text-gray-400">体重データがありません</p>
        <p className="text-xs text-gray-300">食事ページから記録できます</p>
      </div>
    )
  }

  const weights = data.map((d) => d.weight)
  const latest = weights[weights.length - 1]
  const first = weights[0]
  const diff = latest - first
  const min = Math.min(...weights)
  const max = Math.max(...weights)

  const chartData = data.map((d) => ({
    label: d.date.slice(5).replace('-', '/'),  // "2026-04-11" → "04/11"
    weight: d.weight,
  }))

  return (
    <div className="space-y-4">
      {/* サマリー数値 */}
      <div className="flex justify-around text-center">
        <div>
          <p className="text-xs text-gray-400">30日前</p>
          <p className="text-sm font-semibold text-gray-600">{first} kg</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">最新</p>
          <p className="text-xl font-bold text-rose-500">{latest} kg</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">増減</p>
          <p className={`text-sm font-semibold ${diff <= 0 ? 'text-green-500' : 'text-amber-500'}`}>
            {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
          </p>
        </div>
      </div>

      {/* グラフ */}
      {data.length === 1 ? (
        // データが1件のときはグラフではなく大きく表示
        <div className="flex items-center justify-center h-20">
          <p className="text-3xl font-bold text-rose-400">{latest} kg</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={chartData} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[min - 1, max + 1]}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#fb7185"
              strokeWidth={2}
              dot={{ fill: '#fb7185', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#fb7185' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
