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

// 食事ログ保存直後に呼ばれる fire-and-forget なプロアクティブ呼び出し。
// 戻り値は無視してよい。サーバ側で発火条件・スロットルを判定するため、
// クライアントは「投げて忘れる」だけで OK。
export async function fireProactiveAfterMeal(): Promise<void> {
  try {
    const res = await fetch('/api/coach/proactive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'after_meal' }),
    })
    if (!res.ok) return
    const data = (await res.json()) as { message: string | null }
    if (data.message) {
      markCoachUnread()
    }
  } catch {
    // 失敗時はサイレント
  }
}
