import Stripe from 'stripe'

let _client: Stripe | null = null

export function getStripe(): Stripe {
  if (!_client) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) throw new Error('STRIPE_SECRET_KEY is not set')
    _client = new Stripe(apiKey, { apiVersion: '2026-03-25.dahlia' })
  }
  return _client
}
