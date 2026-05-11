'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, X, Star } from 'lucide-react'
import type { Food, FoodSearchResponse } from '@/types'

// display_name があればそれを、なければ学術名を使う
function labelOf(food: Food): string {
  return food.display_name ?? food.name
}

interface Props {
  onSelect: (food: Food) => void
}

const SEARCH_DEBOUNCE_MS = 250
const DISPLAY_LIMIT      = 10

// 食品名から「状態」を推定。ラベル＋並び替え時の優先度（小さいほど上位）と色を返す。
// MEXT 名（例: "こめ 水稲めし 玄米", "あじ 生", "さば 水煮缶詰"）の頻出パターンに対応。
type State = {
  label: string
  /** 並び替え用の重み（小さいほど上に表示） */
  rank: number
  /** バッジ色（Tailwind クラス） */
  klass: string
}

const STATE_UNKNOWN: State = { label: '', rank: 5, klass: '' }

function detectState(name: string): State {
  // ご飯/めし/かゆ/雑炊 → 炊いた状態（最優先）
  if (/(ごはん|めし|水稲めし|陸稲めし|かゆ|雑炊|炊飯|炊いた)/.test(name)) {
    return { label: '炊', rank: 0, klass: 'bg-rose-100 text-rose-600' }
  }
  // ゆで・蒸し・焼き → 調理済
  if (/ゆで/.test(name))  return { label: 'ゆで', rank: 1, klass: 'bg-orange-100 text-orange-600' }
  if (/蒸し/.test(name))  return { label: '蒸',   rank: 1, klass: 'bg-orange-100 text-orange-600' }
  if (/焼き/.test(name))  return { label: '焼',   rank: 1, klass: 'bg-orange-100 text-orange-600' }
  if (/油いため|油揚げ|から揚げ|フライ|天ぷら|素揚げ/.test(name)) {
    return { label: '揚', rank: 2, klass: 'bg-amber-100 text-amber-700' }
  }
  // 缶詰・漬物・干物
  if (/缶詰/.test(name))  return { label: '缶', rank: 3, klass: 'bg-sky-100 text-sky-600' }
  if (/(干し|干物|乾)/.test(name)) {
    return { label: '乾', rank: 4, klass: 'bg-yellow-100 text-yellow-700' }
  }
  // 生（明示） → 後回し
  if (/(\s生$|　生$|・生$|（生）|\(生\))/.test(name)) {
    return { label: '生', rank: 4, klass: 'bg-gray-100 text-gray-500' }
  }
  // 穀粒（生米）など
  if (/穀粒/.test(name))  return { label: '生', rank: 4, klass: 'bg-gray-100 text-gray-500' }
  return STATE_UNKNOWN
}

// 検索クエリとの一致度（小さいほど上位）。display_name と name の良い方を採用
function matchScore(food: Food, query: string): number {
  const candidates = [food.display_name, food.name].filter((s): s is string => !!s)
  let best = 3
  for (const c of candidates) {
    if (c === query)              best = Math.min(best, 0)
    else if (c.startsWith(query)) best = Math.min(best, 1)
    else if (c.includes(query))   best = Math.min(best, 2)
  }
  return best
}

function rankFoods(foods: Food[], query: string): Food[] {
  const trimmed = query.trim()
  return [...foods].sort((a, b) => {
    // 1. is_common（おすすめ）を最優先
    if (a.is_common !== b.is_common) return a.is_common ? -1 : 1
    // 2. クエリとの一致度
    const sa = matchScore(a, trimmed)
    const sb = matchScore(b, trimmed)
    if (sa !== sb) return sa - sb
    // 3. 状態（炊いた・ゆで > 生）
    const ra = detectState(a.name).rank
    const rb = detectState(b.name).rank
    if (ra !== rb) return ra - rb
    // 4. 名前が短い順（display_name を優先）
    const la = labelOf(a).length
    const lb = labelOf(b).length
    if (la !== lb) return la - lb
    return labelOf(a).localeCompare(labelOf(b), 'ja')
  })
}

export default function FoodSearch({ onSelect }: Props) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<Food[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const [showAll, setShowAll] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // クエリ確定後に debounce で検索。空文字なら結果クリア
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed === '') {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    setShowAll(false)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(trimmed)}`)
        if (!res.ok) throw new Error('search failed')
        const data: FoodSearchResponse = await res.json()
        setResults(data.foods)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  // 外側クリックで候補を閉じる
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // 並び替え＋上位 N 件
  const ranked = useMemo(() => rankFoods(results, query), [results, query])
  const visible = showAll ? ranked : ranked.slice(0, DISPLAY_LIMIT)
  const hiddenCount = ranked.length - visible.length

  function handleSelect(food: Food) {
    onSelect(food)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-9 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
          placeholder="食品名で検索（例: 鶏むね、ごはん）"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]) }}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            aria-label="クリア"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && (loading || ranked.length > 0 || query.trim() !== '') && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
          {loading && (
            <p className="px-4 py-3 text-xs text-gray-400">検索中...</p>
          )}
          {!loading && ranked.length === 0 && query.trim() !== '' && (
            <p className="px-4 py-3 text-xs text-gray-400">該当する食品が見つかりません</p>
          )}
          {!loading && visible.map((food) => {
            const state = detectState(food.name)
            const primary = labelOf(food)
            const showOriginal = food.display_name && food.display_name !== food.name
            return (
              <button
                key={food.id}
                type="button"
                onClick={() => handleSelect(food)}
                className={`w-full px-4 py-2.5 text-left hover:bg-rose-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                  food.is_common ? 'bg-rose-50/30' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {food.is_common && (
                        <Star size={12} className="text-rose-400 shrink-0" fill="currentColor" />
                      )}
                      {state.label && (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${state.klass}`}>
                          {state.label}
                        </span>
                      )}
                      <p className="text-sm text-gray-800 truncate">{primary}</p>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {food.category}{showOriginal && ` ・ ${food.name}`}
                    </p>
                  </div>
                  <p className="text-xs text-rose-500 font-semibold whitespace-nowrap">
                    {food.calories_per_100g} kcal<span className="text-gray-400 font-normal">/100g</span>
                  </p>
                </div>
              </button>
            )
          })}

          {!loading && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full px-4 py-2.5 text-xs text-rose-500 hover:bg-rose-50 transition-colors border-t border-gray-100"
            >
              さらに {hiddenCount} 件を表示
            </button>
          )}

          {!loading && ranked.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-[10px] text-gray-500 leading-relaxed">
                バッジ：<span className="text-rose-600 font-bold">炊</span>=ごはん／<span className="text-orange-600 font-bold">ゆで蒸焼</span>=調理済／<span className="text-amber-700 font-bold">揚</span>=揚げ物／<span className="text-sky-600 font-bold">缶</span>=缶詰／<span className="text-yellow-700 font-bold">乾</span>=乾物／<span className="text-gray-500 font-bold">生</span>=未調理
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
