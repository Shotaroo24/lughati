import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  title?: string
  showBack?: boolean
  rightAction?: React.ReactNode
}

export function Header({ title, showBack = false, rightAction }: HeaderProps) {
  const navigate = useNavigate()

  return (
    <header
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderBottom: '1px solid var(--color-border)',
      }}
      className="sticky top-0 z-10 flex items-center justify-between px-4 h-14"
    >
      <div className="flex items-center gap-2 min-w-[44px]">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            aria-label="戻る"
            style={{ color: 'var(--color-primary)', minWidth: 44, minHeight: 44 }}
            className="flex items-center justify-center rounded-xl"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
      </div>

      {title && (
        <h1
          className="text-base font-semibold absolute left-1/2 -translate-x-1/2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h1>
      )}

      <div className="min-w-[44px] flex justify-end">
        {rightAction}
      </div>
    </header>
  )
}
