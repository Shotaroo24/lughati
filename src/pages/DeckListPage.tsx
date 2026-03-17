import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDecks } from '../hooks/useDecks'
import { Header } from '../components/layout/Header'
import { PageContainer } from '../components/layout/PageContainer'
import { DeckCard } from '../components/deck/DeckCard'
import { DeckForm } from '../components/deck/DeckForm'
import { Button } from '../components/ui/Button'

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5 text-4xl"
        style={{ backgroundColor: 'var(--color-primary-light)' }}
        aria-hidden
      >
        📚
      </div>
      <h2
        className="text-lg font-semibold mb-2"
        style={{ color: 'var(--color-text-primary)' }}
      >
        デッキがまだありません
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
        最初のデッキを作成して、学習を始めましょう
      </p>
      <Button onClick={onCreateClick}>デッキを作成する</Button>
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────────────────────────

function DeckSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="rounded-2xl h-32 animate-pulse"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export function DeckListPage() {
  const { isGuest, signOut } = useAuth()
  const { decks, loading, error, createDeck, deleteDeck } = useDecks()
  const navigate = useNavigate()
  const [formOpen, setFormOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const headerRight = (
    <button
      type="button"
      onClick={() => setFormOpen(true)}
      aria-label="デッキを作成"
      className="inline-flex items-center gap-1 rounded-xl px-3 text-sm font-medium text-white"
      style={{
        minWidth: 44,
        minHeight: 44,
        backgroundColor: 'var(--color-primary)',
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span className="hidden sm:inline">新規</span>
    </button>
  )

  return (
    <div style={{ backgroundColor: 'var(--color-bg-page)', minHeight: '100svh' }}>
      <Header title="マイデッキ" rightAction={headerRight} />

      {/* Guest mode banner */}
      {isGuest && (
        <div
          className="px-4 py-2 text-center text-sm"
          style={{
            backgroundColor: 'var(--color-accent-light)',
            color: 'var(--color-accent-dark)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          ゲストモード — サインアップするとデバイス間で同期できます
          <button
            onClick={() => navigate('/login')}
            className="ml-2 underline underline-offset-2 font-medium"
          >
            登録する
          </button>
        </div>
      )}

      <PageContainer>
        {/* Error */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 mb-4 text-sm"
            style={{
              backgroundColor: 'var(--color-danger-light)',
              color: 'var(--color-danger)',
            }}
          >
            {error}
          </div>
        )}

        {loading && <DeckSkeleton />}

        {!loading && decks.length === 0 && (
          <EmptyState onCreateClick={() => setFormOpen(true)} />
        )}

        {!loading && decks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {decks.map(deck => (
              <DeckCard key={deck.id} deck={deck} onDelete={deleteDeck} />
            ))}
          </div>
        )}

        {/* Settings / sign-out link */}
        <div className="mt-10 flex justify-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/settings')}>
            設定
          </Button>
          <Button variant="ghost" onClick={handleSignOut}>
            {isGuest ? 'ゲストを終了' : 'ログアウト'}
          </Button>
        </div>
      </PageContainer>

      <DeckForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={createDeck}
      />
    </div>
  )
}
