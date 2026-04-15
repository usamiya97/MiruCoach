'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'ホーム' },
  { href: '/meal',      icon: '🍽️', label: '食事' },
  { href: '/coach',     icon: '🌿', label: 'コーチ' },
  { href: '/settings',  icon: '⚙️', label: '設定' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-rose-100/50 flex pb-safe">
      {navItems.map(({ href, icon, label }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all"
          >
            <span className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`}>
              {icon}
            </span>
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
