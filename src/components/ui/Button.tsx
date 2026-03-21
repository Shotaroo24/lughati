interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  fullWidth?: boolean
  loading?: boolean
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] active:bg-[var(--color-primary-dark)]',
  secondary: 'bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:bg-[var(--color-primary-mid)] active:bg-[var(--color-primary-mid)]',
  danger: 'bg-[var(--color-danger-light)] text-[var(--color-danger)] hover:bg-[var(--color-danger-mid)] active:bg-[var(--color-danger-mid)]',
  ghost: 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)] active:bg-[var(--color-primary-light)]',
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
