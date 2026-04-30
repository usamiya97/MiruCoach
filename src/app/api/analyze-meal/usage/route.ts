import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DAILY_LIMIT, RATE_WINDOW_MS } from '@/lib/analyze-meal-limits'
import type { AnalyzeMealUsage } from '@/lib/analyze-meal-limits'
import type { Plan } from '@/types'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()
    if (profileError) throw profileError

    const plan: Plan = profile?.plan === 'premium' ? 'premium' : 'free'
    const limit = DAILY_LIMIT[plan]

    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
    const { count, error: countError } = await supabase
      .from('analyze_meal_calls')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('called_at', since)
    if (countError) throw countError

    const used = count ?? 0
    const usage: AnalyzeMealUsage = {
      plan,
      limit,
      used,
      remaining: Math.max(0, limit - used),
    }
    return NextResponse.json(usage)
  } catch (error) {
    console.error('analyze-meal usage error:', error)
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }
}
