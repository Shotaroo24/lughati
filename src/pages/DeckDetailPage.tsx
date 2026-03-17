import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDecks } from '../hooks/useDecks'
import { useCards } from '../hooks/useCards'
import type { CardInput } from '../hooks/useCards'
import { Header } from '../components/layout/Header'
import { PageContainer } from '../components/layout/PageContainer'
import { CardListItem } from '../components/card/CardListItem'
import { CardForm } from '../components/card/CardForm'
import { Button } from '../components/ui/Button'
import type { Card } from '../types/database'

export function DeckDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { decks } = useDecks()
  const { cards, loading, error, createCard, updateCard, deleteCard, toggleStar } = useCards(id ?? '')

  const [formOpen, setFormOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)

  const deck = decks.find(d => d.id === id)

  const openEdit = (card: Card) => {
    setEditingCard(card)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingCard(null)
  }

  const handleSubmit = async (data: CardInput) => {
    if (editingCard) return updateCard(editingCard.id, data)
    return createCard(data)
  }

  const headerRight = (
    <button
      type="button"
      onClick={() => setFormOpen(true)}
      aria-label="カードを追加"
      className="inline-flex items-center gap-1 rounded-xl px-3 text-sm font-medium text-white"
      style={{ minWidth: 44, minHeight: 44, backgroundColor: 'var(--color-primary)' }}
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
      <span className="hidden sm:inline">追加</span>
    </button>
  )

  return (
    <div style={{ backgroundColor: 'var(--color-bg-page)', minHeight: '100svh' }}>
      <Header title={deck?.title ?? 'デッキ'} showBack rightAction={headerRight} />

      <PageContainer>
        {/* Error */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 mb-4 text-sm"
            style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
          >
            {error}
          </div>
        )}

        {/* Study button */}
        {!loading && cards.length > 0 && (
          <Button
            fullWidth
            className="mb-5"
            onClick={() => navigate(`/decks/${id}/study`)}
          >
            学習を始める（{cards.length}枚）
          </Button>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="rounded-xl h-16 animate-pulse"
                style={{ backgroundColor: 'var(--color-border)' }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4"
              style={{ backgroundColor: 'var(--color-primary-light)' }}
              aria-hidden
            >
              ✏️
            </div>
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              カードがまだありません
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              「+追加」ボタンで最初のカードを作成しましょう
            </p>
            <Button onClick={() => setFormOpen(true)}>カードを追加する</Button>
          </div>
        )}

        {/* Card list */}
        {!loading && cards.length > 0 && (
          <div className="flex flex-col gap-2">
            {cards.map(card => (
              <CardListItem
                key={card.id}
                card={card}
                onEdit={openEdit}
                onDelete={deleteCard}
                onToggleStar={toggleStar}
              />
            ))}
          </div>
        )}
      </PageContainer>

      <CardForm
        open={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        initialValues={editingCard ?? undefined}
      />
    </div>
  )
}
