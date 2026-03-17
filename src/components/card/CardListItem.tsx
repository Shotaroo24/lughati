import { useState } from 'react'
import type { Card } from '../../types/database'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface CardListItemProps {
  card: Card
  onEdit: (card: Card) => void
  onDelete: (id: string) => Promise<{ error: string | null }>
  onToggleStar: (id: string) => Promise<void>
}

export function CardListItem({ card, onEdit, onDelete, onToggleStar }: CardListItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(card.id)
    setDeleting(false)
    setConfirmOpen(false)
  }

  return (
    <>
      <div
        className="flex items-center gap-2 px-3 py-3 rounded-xl"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Star button */}
        <button
          type="button"
          aria-label={card.is_starred ? '星を外す' : '星をつける'}
          onClick={() => onToggleStar(card.id)}
          className="flex items-center justify-center rounded-lg shrink-0 transition-colors"
          style={{
            minWidth: 40,
            minHeight: 40,
            color: card.is_starred ? 'var(--color-accent)' : 'var(--color-border)',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={card.is_starred ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>

        {/* Card text */}
        <div className="flex-1 min-w-0">
          <p
            dir="rtl"
            className="text-base font-bold truncate"
            style={{
              fontFamily: 'var(--font-arabic)',
              color: 'var(--color-text-primary)',
            }}
          >
            {card.arabic}
          </p>
          <p className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {card.english}
            {card.romanization && (
              <span className="ml-2 italic text-xs">{card.romanization}</span>
            )}
          </p>
        </div>

        {/* Edit button */}
        <button
          type="button"
          aria-label="編集"
          onClick={() => onEdit(card)}
          className="flex items-center justify-center rounded-lg shrink-0 transition-colors hover:text-[var(--color-primary)]"
          style={{ minWidth: 40, minHeight: 40, color: 'var(--color-text-secondary)' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

        {/* Delete button */}
        <button
          type="button"
          aria-label="削除"
          onClick={() => setConfirmOpen(true)}
          className="flex items-center justify-center rounded-lg shrink-0 transition-colors hover:text-[var(--color-danger)]"
          style={{ minWidth: 40, minHeight: 40, color: 'var(--color-text-secondary)' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
        </button>
      </div>

      {/* Delete confirmation */}
      <Modal
        open={confirmOpen}
        onClose={() => !deleting && setConfirmOpen(false)}
        title="カードを削除しますか？"
      >
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          「{card.arabic}」を削除します。この操作は元に戻せません。
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setConfirmOpen(false)}
            disabled={deleting}
          >
            キャンセル
          </Button>
          <Button variant="danger" fullWidth loading={deleting} onClick={handleDelete}>
            削除する
          </Button>
        </div>
      </Modal>
    </>
  )
}
