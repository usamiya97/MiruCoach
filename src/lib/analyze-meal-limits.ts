import type { Plan } from '@/types'

export const DAILY_LIMIT: Record<Plan, number> = {
  free: 3,
  premium: 30,
}

export const RATE_WINDOW_MS = 24 * 60 * 60 * 1000

export interface AnalyzeMealUsage {
  plan: Plan
  limit: number
  used: number
  remaining: number
}
