'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, UtensilsCrossed, Sparkles, Settings } from 'lucide-react'
import { COACH_MESSAGE_ARRIVED_EVENT, getCoachUnread } from '@/lib/proactive'

const navItems = [
  { href: '/dashboard', icon: Home,            label: 'ホーム' },
  { href: '/meal',      icon: UtensilsCrossed, label: '食事' },
  { href: '/coach',     icon: Sparkles,        label: 'コーチ', unreadKey: 'coach' as const },
  { href: '/settings',  icon: Settings,        label: '設定' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [coachUnread, setCoachUnread] = useState(false)

  // localStorage の未読フラグを読む。BottomNav は常時マウントされているので
  // pathname 変化・イベント・他タブ書き込みで再計算する。
  useEffect(() => {
    function recompute() {
      setCoachUnread(getCoachUnread())
    }
    recompute()

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'coach-unread') recompute()
    }
    window.addEventListener(COACH_MESSAGE_ARRIVED_EVENT, recompute)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(COACH_MESSAGE_ARRIVED_EVENT, recompute)
      window.removeEventListener('storage', onStorage)
    }
  }, [pathname])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-rose-100/50 flex pb-safe">
      {navItems.map(({ href, icon: Icon, label, unreadKey }) => {
        const isActive = pathname.startsWith(href)
        const showBadge = unreadKey === 'coach' && coachUnread && !isActive
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all"
          >
            <div className="relative">
              <Icon
                size={20}
                className={`transition-all ${isActive ? 'text-rose-500 scale-110' : 'text-gray-400'}`}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              {showBadge && (
                <span
                  aria-label="未読あり"
                  className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"
                />
              )}
            </div>
            <span className={`text-[10px] font-medium transition-colors ${
              isActive ? 'text-rose-500' : 'text-gray-400'
            }`}>
              {label}
            </span>
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-rose-400" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
