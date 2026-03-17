interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  fullWidth?: boolean
  loading?: boolean
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-[#E8567F] text-white hover:bg-[#C4395F] active:bg-[#C4395F]',
  secondary: 'bg-[#FFF0F3] text-[#E8567F] hover:bg-[#FFE0E8] active:bg-[#FFE0E8]',
  danger: 'bg-[#FEF2F2] text-[#D94452] hover:bg-[#FEE2E2] active:bg-[#FEE2E2]',
  ghost: 'bg-transparent text-[#8C8C96] hover:bg-[#FFF0F3] active:bg-[#FFF0F3]',
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2',
        'rounded-xl px-6 py-3 text-base font-medium',
        'min-h-[44px] transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading && (
        <span
          className="w-4 h-4 rounded-full border-2 animate-spin shrink-0"
          style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}
        />
      )}
      {children}
    </button>
  )
}
