export type Plan = 'free' | 'premium'
export type CoachTone = 'gentle' | 'logical'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type MessageRole = 'user' | 'assistant'

export interface User {
  id: string
  plan: Plan
  stripe_customer_id: string | null
  coach_name: string
  coach_tone: CoachTone
  height: number | null
  goal_weight: number | null
  age: number | null
  target_calories: number
  created_at: string
}

export interface MealLog {
  id: string
  user_id: string
  photo_url: string | null
  calories: number
  meal_type: MealType
  note: string | null
  logged_at: string
}

export interface BodyLog {
  id: string
  user_id: string
  weight: number
  logged_at: string
}

export interface CoachMessage {
  id: string
  user_id: string
  role: MessageRole
  content: string
  created_at: string
}

// AIコーチAPIへのリクエスト型
export interface CoachRequest {
  message: string
}

// 食事解析APIへのリクエスト型
export interface AnalyzeMealRequest {
  imageBase64: string
  mimeType: string
}

export interface AnalyzeMealResponse {
  calories: number
  note: string
}
