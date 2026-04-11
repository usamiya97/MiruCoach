import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-rose-400 text-white hover:bg-rose-500 disabled:opacity-50',
  secondary: 'bg-white text-rose-500 border border-rose-300 hover:bg-rose-50 disabled:opacity-50',
  ghost: 'text-gray-500 hover:text-gray-700 disabled:opacity-50',
}

export default function Button({
  variant = 'primary',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? '処理中...' : children}
    </button>
  )
}
