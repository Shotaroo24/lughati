interface PageContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'full'
}

const maxWidthMap = {
  sm: '480px',
  md: '768px',
  lg: '1024px',
  full: '100%',
}

export function PageContainer({
  children,
  className = '',
  maxWidth = 'md',
}: PageContainerProps) {
  return (
    <main
      className={`flex-1 w-full mx-auto px-4 py-6 ${className}`}
      style={{ maxWidth: maxWidthMap[maxWidth] }}
    >
      {children}
    </main>
  )
}
