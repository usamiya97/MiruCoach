import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host
  } catch {
    return ''
  }
})()

const supabaseHttp = supabaseHost ? `https://${supabaseHost}` : ''
const supabaseWs   = supabaseHost ? `wss://${supabaseHost}`   : ''

const cspDirectives: Record<string, string[]> = {
  'default-src': ["'self'"],
  // Next.js は inline script を使うため 'unsafe-inline' が必要。dev は HMR のため 'unsafe-eval' も許可
  'script-src':  ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), 'https://js.stripe.com'],
  // Tailwind / Next の inline style に対応
  'style-src':   ["'self'", "'unsafe-inline'"],
  'img-src':     ["'self'", 'data:', 'blob:', 'https://*.supabase.co', 'https://*.googleusercontent.com'],
  'font-src':    ["'self'", 'data:'],
  'connect-src': ["'self'", supabaseHttp, supabaseWs].filter(Boolean),
  'frame-src':   ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com', 'https://checkout.stripe.com'],
  'form-action': ["'self'", 'https://checkout.stripe.com'],
  'frame-ancestors': ["'none'"],
  'base-uri':    ["'self'"],
  'object-src':  ["'none'"],
}

const cspValue = Object.entries(cspDirectives)
  .map(([key, values]) => `${key} ${values.join(' ')}`)
  .join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy',   value: cspValue },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(self), geolocation=(), microphone=()' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
