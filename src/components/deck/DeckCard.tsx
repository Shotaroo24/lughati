import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Deck } from '../../types/database'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

function formatLastStudied(dateStr: string | null): string {
  if (!dateStr) return '未学習'
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days === 0) return '今日'
  if (days === 1) return '昨日'
  if (days < 30) return `${days}日前`
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

interface DeckCardProps {
  deck: Deck
  onDelete: (id: string) => Promise<{ error: string | null }>
  /** When provided, shows a move-to-folder button */
  onMove?: () => void
}

export function DeckCard({ deck, onDelete, onMove }: DeckCardProps) {
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(deck.id)
    setDeleting(false)
    setConfirmOpen(false)
  }

  return (
    <>
      <div
        className="rounded-2xl p-5 cursor-pointer transition-shadow duration-150 flex flex-col gap-3"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          boxShadow: 'var(--shadow-card)',
        }}
        onMouseEnter={e =>
          (e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)')
        }
        onMouseLeave={e =>
          (e.currentTarget.style.boxShadow = 'var(--shadow-card)')
        }
        onClick={() => navigate(`/decks/${deck.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && navigate(`/decks/${deck.id}`)}
      >
        {/* Title + actions */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-base font-semibold leading-snug"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {deck.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            {onMove && (
              <button
                type="button"
                aria-label="フォルダに移動"
                style={{ minWidth: 32, minHeight: 32, color: 'var(--color-text-secondary)' }}
                className="flex items-center justify-center rounded-lg transition-colors hover:text-[var(--color-primary)]"
                onClick={e => { e.stopPropagation(); onMove() }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                </svg>
              </button>
            )}
          <button
            type="button"
            aria-label="デッキを削除"
            style={{ minWidth: 36, minHeight: 36, color: 'var(--color-text-secondary)' }}
            className="flex items-center justify-center rounded-lg shrink-0 transition-colors hover:text-[var(--color-danger)]"
            onClick={e => {
              e.stopPropagation()
              setConfirmOpen(true)
            }}
          >
            <svg
              width="16" height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
            </svg>
          </button>
          </div>
        </div>

        {/* Description */}
        {deck.description && (
          <p
            className="text-sm line-clamp-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {deck.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-auto pt-1">
          <span
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
            }}
          >
            {deck.card_count ?? 0} 枚
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {formatLastStudied(deck.last_studied_at)}
          </span>
        </div>
      </div>

      {/* Delete confirmation */}
      <Modal
        open={confirmOpen}
        onClose={() => !deleting && setConfirmOpen(false)}
        title="デッキを削除しますか？"
      >
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          「{deck.title}」とすべてのカードが削除されます。この操作は元に戻せません。
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
