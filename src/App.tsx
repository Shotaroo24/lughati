import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/layout/ProtectedRoute'

// Lazy-loaded pages
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then(m => ({ default: m.LoginPage }))
)
const DeckListPage = lazy(() =>
  import('./pages/DeckListPage').then(m => ({ default: m.DeckListPage }))
)
const DeckDetailPage = lazy(() =>
  import('./pages/DeckDetailPage').then(m => ({ default: m.DeckDetailPage }))
)
const StudyPage = lazy(() =>
  import('./pages/StudyPage').then(m => ({ default: m.StudyPage }))
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage }))
)

function PageSpinner() {
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            <Route path="/" element={<Navigate to="/decks" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/decks"
              element={<ProtectedRoute><DeckListPage /></ProtectedRoute>}
            />
            <Route
              path="/decks/:id"
              element={<ProtectedRoute><DeckDetailPage /></ProtectedRoute>}
            />
            <Route
              path="/decks/:id/study"
              element={<ProtectedRoute><StudyPage /></ProtectedRoute>}
            />
            <Route
              path="/settings"
              element={<ProtectedRoute><SettingsPage /></ProtectedRoute>}
            />
            <Route path="*" element={<Navigate to="/decks" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
