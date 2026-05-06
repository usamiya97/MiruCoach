import type { Gender } from '@/types'

/**
 * Mifflin-St Jeor 式で基礎代謝を計算し、
 * 活動量・減量幅を加味して1日の目標摂取カロリーを返す
 *
 * 式の最後の定数は性別で変わる：女性 -161 / 男性 +5
 * gender 未指定時は女性向けの値を使う（既存ユーザー互換）
 */
export function calcTargetCalories({
  height,
  weight,
  goalWeight,
  age,
  gender = 'female',
}: {
  height: number     // cm
  weight: number     // kg（現在体重）
  goalWeight: number // kg（目標体重）
  age: number
  gender?: Gender
}): number {
  // 基礎代謝（BMR）
  const genderConstant = gender === 'male' ? 5 : -161
  const bmr = 10 * weight + 6.25 * height - 5 * age + genderConstant

  // TDEE：デスクワーク中心＋軽い運動（活動係数 1.375）
  const tdee = bmr * 1.375

  // 減量幅に応じた摂取カロリーの削減量
  const diff = weight - goalWeight
  let deficit: number
  if (diff <= 0)       deficit = 0    // 維持 or 増量
  else if (diff < 5)   deficit = 300  // 〜5kg減
  else if (diff < 10)  deficit = 400  // 5〜10kg減
  else                 deficit = 500  // 10kg以上減

  // 最低カロリーを保証（男性は1500、女性は1200）
  const floor = gender === 'male' ? 1500 : 1200
  return Math.max(Math.round(tdee - deficit), floor)
}
