interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={[
          'rounded-xl px-4 py-3 text-base w-full',
          'border outline-none transition-colors',
          'placeholder:text-[var(--color-text-secondary)]',
          error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]',
          className,
        ].join(' ')}
        style={{
          backgroundColor: 'var(--color-bg-card)',
          color: 'var(--color-text-primary)',
        }}
        {...props}
      />
      {error && (
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
