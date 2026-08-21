import { Loader2 } from 'lucide-react'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-primary text-white hover:bg-[#2a3929] active:bg-[#1e2a1d]',
    secondary: 'bg-[#f4f4f5] text-[#1a1a1a] hover:bg-[#e4e4e7] active:bg-[#d4d4d8]',
    danger: 'bg-[#ef4444] text-white hover:bg-[#dc2626]',
    ghost: 'bg-transparent text-action hover:bg-[#eff6ff]',
    outline: 'border border-[#e4e4e7] bg-white text-[#1a1a1a] hover:bg-[#f4f4f5]',
  }

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}
