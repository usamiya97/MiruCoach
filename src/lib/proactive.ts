// プロアクティブメッセージ取得のクライアント用ユーティリティ。
// fire-and-forget で /api/coach/proactive を叩き、メッセージが返ってきた場合は
// 「コーチに未読がある」状態をマークしてナビにバッジを出す。

const UNREAD_KEY = 'coach-unread'
const MESSAGE_ARRIVED_EVENT = 'coach-message-arrived'

export function markCoachRead(): void {
  try {
    localStorage.setItem(UNREAD_KEY, 'false')
    // 同タブ内で BottomNav にも知らせる
    window.dispatchEvent(new Event(MESSAGE_ARRIVED_EVENT))
  } catch {
    // localStorage 不可な環境では何もしない
  }
}

export function markCoachUnread(): void {
  try {
    localStorage.setItem(UNREAD_KEY, 'true')
    window.dispatchEvent(new Event(MESSAGE_ARRIVED_EVENT))
  } catch {
    // ignore
  }
}

export function getCoachUnread(): boolean {
  try {
    return localStorage.getItem(UNREAD_KEY) === 'true'
  } catch {
    return false
  }
}

export const COACH_MESSAGE_ARRIVED_EVENT = MESSAGE_ARRIVED_EVENT

// 食事ログ保存直後に呼ばれるプロアクティブ呼び出し。
// 発火条件はサーバ側で判定するためクライアントは投げるだけ。
// メッセージが返ってきた場合は string を返し、未読バッジを立てる。
// 呼び出し側はその文字列を使ってプレビュートーストを表示することができる。
export async function fireProactiveAfterMeal(): Promise<string | null> {
  try {
    const res = await fetch('/api/coach/proactive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'after_meal' }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { message: string | null }
    if (data.message) {
      markCoachUnread()
      return data.message
    }
    return null
  } catch {
    // 失敗時はサイレント
    return null
  }
}
