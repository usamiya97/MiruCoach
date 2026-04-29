import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/login',process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: { name: 'ミルコーチ Premium' },
            unit_amount: 980,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      metadata: { user_id: user.id },
      success_url: `${origin}/api/stripe/verify-session?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/coach`,
    })

    return NextResponse.redirect(session.url!)
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
