import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/ui/BottomNav'
import { UserProvider } from '@/lib/user-context'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <UserProvider user={user}>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 pb-24">{children}</main>
        <BottomNav />
      </div>
    </UserProvider>
  )
}
