import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import type { Plan } from '@/types'

// Supabase Admin クライアント（RLSをバイパスするため service role key を使用）
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Stripe の subscription status から MiruCoach 内部の plan を決める
// active / trialing のみ premium、それ以外（past_due / unpaid / canceled / incomplete_expired …）は free
function planFromSubscriptionStatus(status: Stripe.Subscription.Status): Plan {
  return status === 'active' || status === 'trialing' ? 'premium' : 'free'
}

type SupabaseUpdateError = { message: string } | null

// DB 更新のエラーを共通でハンドリング。エラー時は throw して上位の catch に 500 を返させ、
// Stripe 側に webhook をリトライさせる
function ensureNoUpdateError(label: string, error: SupabaseUpdateError) {
  if (error) {
    throw new Error(`[stripe-webhook] ${label} failed: ${error.message}`)
  }
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const userId = session.metadata?.user_id

        if (userId) {
          const { error } = await supabase
            .from('users')
            .update({ plan: 'premium', stripe_customer_id: customerId })
            .eq('id', userId)
          ensureNoUpdateError('checkout.session.completed', error)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        // 解約予約 / 支払い遅延 / 復活など全てここに来る
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const plan = planFromSubscriptionStatus(subscription.status)

        const { error } = await supabase
          .from('users')
          .update({ plan })
          .eq('stripe_customer_id', customerId)
        ensureNoUpdateError(`customer.subscription.${event.type.split('.').pop()}`, error)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { error } = await supabase
          .from('users')
          .update({ plan: 'free' })
          .eq('stripe_customer_id', customerId)
        ensureNoUpdateError('customer.subscription.deleted', error)
        break
      }

      case 'invoice.payment_failed': {
        // 支払いに失敗した時点で premium 機能を即時停止する
        // 後続の subscription.updated でも free に揃うが、こちらで先回りして閉じておく
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string | null
        if (customerId) {
          const { error } = await supabase
            .from('users')
            .update({ plan: 'free' })
            .eq('stripe_customer_id', customerId)
          ensureNoUpdateError('invoice.payment_failed', error)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    // 500 を返して Stripe にリトライさせる
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
