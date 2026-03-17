import { useState } from 'react'
import type { Deck } from '../../types/database'
import type { Folder } from '../../types/folder'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface MoveDeckModalProps {
  open: boolean
  onClose: () => void
  deck: Deck | null
  currentFolderId: string
  folders: Folder[]
  onMove: (deckId: string, targetFolderId: string) => Promise<{ error: string | null }>
}

export function MoveDeckModal({
  open,
  onClose,
  deck,
  currentFolderId,
  folders,
  onMove,
}: MoveDeckModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targets = folders.filter(f => f.id !== currentFolderId)

  const handleMove = async (targetId: string) => {
    if (!deck) return
    setLoading(true)
    setError(null)
    const result = await onMove(deck.id, targetId)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="デッキを移動">
      <div className="flex flex-col gap-3">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          「{deck?.title}」の移動先フォルダを選んでください。
        </p>

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {targets.map(folder => (
            <button
              key={folder.id}
              type="button"
              className="w-full text-left rounded-xl px-4 py-3 flex items-center gap-3 transition-colors"
              style={{
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
              }}
              disabled={loading}
              onClick={() => handleMove(folder.id)}
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
              <span className="text-sm font-medium">{folder.name}</span>
            </button>
          ))}
          {targets.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-secondary)' }}>
              他のフォルダがありません
            </p>
          )}
        </div>

        <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={loading}>
          キャンセル
        </Button>
      </div>
    </Modal>
  )
}
