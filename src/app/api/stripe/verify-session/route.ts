import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const sessionId = request.nextUrl.searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)

    if (session.payment_status === 'paid') {
      const userId = session.metadata?.user_id
      const customerId = session.customer as string

      if (userId) {
        const supabase = createAdminClient()
        await supabase
          .from('users')
          .update({ plan: 'premium', stripe_customer_id: customerId })
          .eq('id', userId)
      }
    }
  } catch (error) {
    console.error('verify-session error:', error)
  }

  return NextResponse.redirect(`${origin}/dashboard?upgraded=1`)
}
