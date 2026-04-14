import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 pb-20">{children}</main>

      {/* ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex">
        <NavItem href="/dashboard" icon="🏠" label="ホーム" />
        <NavItem href="/meal" icon="🍽️" label="食事" />
        <NavItem href="/coach" icon="🌿" label="コーチ" />
        <NavItem href="/settings" icon="⚙️" label="設定" />
      </nav>
    </div>
  )
}

function NavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-400 hover:text-rose-400 transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs">{label}</span>
    </Link>
  )
}
