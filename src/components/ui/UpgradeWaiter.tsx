'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface UpgradeWaiterProps {
  isPremium: boolean
}

const POLL_INTERVAL_MS = 2000
const MAX_WAIT_MS = 30_000

// Stripe webhook がプラン反映を完了するまで polling し、画面上に「反映中…」を表示する。
// premium になったら ?upgraded=1 を URL から消す。
export default function UpgradeWaiter({ isPremium }: UpgradeWaiterProps) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isPremium) {
      router.replace(pathname)
      return
    }

    const interval = setInterval(() => router.refresh(), POLL_INTERVAL_MS)
    const timeout = setTimeout(() => clearInterval(interval), MAX_WAIT_MS)
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [isPremium, pathname, router])

  if (isPremium) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl px-6 py-5 flex items-center gap-3 shadow-lg max-w-xs w-full">
        <Loader2 size={20} className="animate-spin text-rose-500 shrink-0" />
        <p className="text-sm text-gray-700">Premiumプランを反映しています…</p>
      </div>
    </div>
  )
}
