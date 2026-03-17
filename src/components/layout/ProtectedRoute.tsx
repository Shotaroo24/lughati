import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function Spinner() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg-page)' }}
    >
      <div
        className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
      />
    </div>
  )
}

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isGuest, loading } = useAuth()

  if (loading) return <Spinner />
  if (!user && !isGuest) return <Navigate to="/login" replace />
  return <>{children}</>
}
