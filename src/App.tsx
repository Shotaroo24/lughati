import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const DeckListPage = lazy(() => import('./pages/DeckListPage').then(m => ({ default: m.DeckListPage })))
const DeckDetailPage = lazy(() => import('./pages/DeckDetailPage').then(m => ({ default: m.DeckDetailPage })))
const StudyPage = lazy(() => import('./pages/StudyPage').then(m => ({ default: m.StudyPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

function LoadingSpinner() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg-page)' }}
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
      />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Navigate to="/decks" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/decks" element={<DeckListPage />} />
          <Route path="/decks/:id" element={<DeckDetailPage />} />
          <Route path="/decks/:id/study" element={<StudyPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/decks" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
