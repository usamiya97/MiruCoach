import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export interface RateLimitConfig {
  // どのエンドポイントの呼び出しか（例: 'coach', 'stripe-checkout'）
  endpoint: string
  // ウィンドウ内に許される最大呼び出し回数
  limit: number
  // ウィンドウ幅（ミリ秒）
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  used: number
  limit: number
  // 429 を返す場合に Retry-After に入れる秒数
  retryAfterSec: number
}

// 各エンドポイントの既定値。短時間の濫用を遮断するためのもので、
// 長期クォータ（analyze-meal の日次上限など）とは別レイヤー
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  coach: {
    endpoint: 'coach',
    limit: 60,
    windowMs: 60 * 60 * 1000,
  },
  'stripe-checkout': {
    endpoint: 'stripe-checkout',
    limit: 5,
    windowMs: 10 * 60 * 1000,
  },
  'stripe-portal': {
    endpoint: 'stripe-portal',
    limit: 10,
    windowMs: 10 * 60 * 1000,
  },
}

// userId × endpoint のスライディングウィンドウで呼び出し回数をカウントし、
// 上限未満なら api_rate_limits に1件 insert して allowed:true を返す。
//
// 注意: count → insert の間に TOCTOU の隙間がある（厳密な原子性は保証されない）。
// MVP の用途では「秒間数百回の濫用を遮断する」ことが目的なので、
// 多少の越境は許容して KV などへの将来移行余地を残す。
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - config.windowMs).toISOString()

  const { count, error: countError } = await supabase
    .from('api_rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', config.endpoint)
    .gte('called_at', since)

  if (countError) throw countError

  const used = count ?? 0

  if (used >= config.limit) {
    return {
      allowed: false,
      used,
      limit: config.limit,
      retryAfterSec: Math.ceil(config.windowMs / 1000),
    }
  }

  const { error: insertError } = await supabase
    .from('api_rate_limits')
    .insert({ user_id: userId, endpoint: config.endpoint })
  if (insertError) throw insertError

  return {
    allowed: true,
    used: used + 1,
    limit: config.limit,
    retryAfterSec: 0,
  }
}

// レート制限超過時に返す共通レスポンス
export function rateLimitedResponse(result: RateLimitResult) {
  return NextResponse.json(
    { error: 'Too many requests', limit: result.limit },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfterSec) },
    }
  )
}
