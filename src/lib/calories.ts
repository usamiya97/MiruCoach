/**
 * Mifflin-St Jeor 式（女性）で基礎代謝を計算し、
 * 活動量・減量幅を加味して1日の目標摂取カロリーを返す
 */
export function calcTargetCalories({
  height,
  weight,
  goalWeight,
  age,
}: {
  height: number     // cm
  weight: number     // kg（現在体重）
  goalWeight: number // kg（目標体重）
  age: number
}): number {
  // 基礎代謝（BMR）
  const bmr = 10 * weight + 6.25 * height - 5 * age - 161

  // TDEE：デスクワーク中心＋軽い運動（活動係数 1.375）
  const tdee = bmr * 1.375

  // 減量幅に応じた摂取カロリーの削減量
  const diff = weight - goalWeight
  let deficit: number
  if (diff <= 0)       deficit = 0    // 維持 or 増量
  else if (diff < 5)   deficit = 300  // 〜5kg減
  else if (diff < 10)  deficit = 400  // 5〜10kg減
  else                 deficit = 500  // 10kg以上減

  // 最低1200kcalを保証（極端な制限を防ぐ）
  return Math.max(Math.round(tdee - deficit), 1200)
}
