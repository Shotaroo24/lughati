import { useState, useRef } from 'react'
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
  onRename?: (id: string, newTitle: string) => Promise<{ error: string | null }>
  /** When provided, shows a move-to-folder button */
  onMove?: () => void
}

export function DeckCard({ deck, onDelete, onRename, onMove }: DeckCardProps) {
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(deck.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(deck.id)
    setDeleting(false)
    setConfirmOpen(false)
  }

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(deck.title)
    setEditing(true)
    // Focus happens via autoFocus on input
  }

  const confirmEdit = async () => {
    const trimmed = editValue.trim()
    setEditing(false)
    if (trimmed && trimmed !== deck.title && onRename) {
      await onRename(deck.id, trimmed)
    }
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditValue(deck.title)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); void confirmEdit() }
    else if (e.key === 'Escape') cancelEdit()
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
          {editing ? (
            <input
              ref={inputRef}
              autoFocus
              value={editValue}
              dir="ltr"
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={() => void confirmEdit()}
              onClick={e => e.stopPropagation()}
              className="text-base font-semibold leading-snug flex-1 min-w-0 bg-transparent outline-none border-b-2"
              style={{
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-primary)',
                paddingBottom: 2,
              }}
            />
          ) : (
            <h3
              className="text-base font-semibold leading-snug"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {deck.title}
            </h3>
          )}
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
            {onRename && (
              <button
                type="button"
                aria-label="デッキ名を編集"
                style={{ minWidth: 44, minHeight: 44, color: 'var(--color-text-secondary)' }}
                className="flex items-center justify-center rounded-lg shrink-0 transition-colors hover:text-[var(--color-primary)]"
                onClick={startEditing}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            <button
              type="button"
              aria-label="デッキを削除"
              style={{ minWidth: 44, minHeight: 44, color: 'var(--color-text-secondary)' }}
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
