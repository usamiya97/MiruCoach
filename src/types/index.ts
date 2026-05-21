export type Plan = 'free' | 'premium'
export type CoachTone = 'gentle' | 'logical'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type MessageRole = 'user' | 'assistant'
export type Gender = 'female' | 'male'

export interface User {
  id: string
  plan: Plan
  stripe_customer_id: string | null
  coach_name: string
  coach_tone: CoachTone
  gender: Gender | null
  height: number | null
  goal_weight: number | null
  goal_target_date: string | null
  age: number | null
  target_calories: number
  created_at: string
}

export interface MealLog {
  id: string
  user_id: string
  photo_url: string | null
  calories: number
  protein: number | null
  fat: number | null
  carbs: number | null
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
  protein: number | null
  fat: number | null
  carbs: number | null
  note: string
}

// 食品マスタ（文科省 食品成分表）
export interface Food {
  id: string
  name: string
  name_kana: string | null
  category: string
  calories_per_100g: number
  protein_per_100g: number | null
  fat_per_100g: number | null
  carbs_per_100g: number | null
  is_common: boolean
  display_name: string | null
}

export interface FoodSearchResponse {
  foods: Food[]
}
