import { useState } from 'react'
import type { Folder } from '../../types/folder'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

// ── Icons ──────────────────────────────────────────────────────────────────

function FolderIcon() {
  return (
    <svg
      width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  )
}

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────

interface FolderCardProps {
  folder: Folder
  deckCount: number
  onSelect: () => void
  onRename: (name: string) => Promise<{ error: string | null }>
  onDelete: (deckCount: number) => Promise<{ error: string | null }>
}

export function FolderCard({ folder, deckCount, onSelect, onRename, onDelete }: FolderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newName, setNewName] = useState(folder.name)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const openRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    setNewName(folder.name)
    setActionError(null)
    setRenameOpen(true)
  }

  const openDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    setActionError(null)
    setDeleteOpen(true)
  }

  const handleRename = async () => {
    if (!newName.trim()) return
    setActionLoading(true)
    const result = await onRename(newName.trim())
    setActionLoading(false)
    if (result.error) {
      setActionError(result.error)
    } else {
      setRenameOpen(false)
      setActionError(null)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    const result = await onDelete(deckCount)
    setActionLoading(false)
    if (result.error) {
      setActionError(result.error)
    } else {
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <div
        className="rounded-2xl px-5 py-4 cursor-pointer transition-shadow duration-150 flex items-center gap-4"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          boxShadow: 'var(--shadow-card)',
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onSelect()}
      >
        {/* Folder icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
        >
          <FolderIcon />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold leading-tight truncate" style={{ color: 'var(--color-text-primary)' }}>
            {folder.name}
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {deckCount} デッキ
          </p>
        </div>

        {/* More menu */}
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="フォルダオプション"
            className="flex items-center justify-center rounded-xl transition-colors hover:bg-[var(--color-primary-light)]"
            style={{ minWidth: 36, minHeight: 36, color: 'var(--color-text-secondary)' }}
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
          >
            <DotsIcon />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setMenuOpen(false) }} />
              <div
                className="absolute right-0 top-full mt-1 z-20 rounded-xl py-1 min-w-[128px]"
                style={{ backgroundColor: 'var(--color-bg-card)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
              >
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--color-primary-light)]"
                  style={{ color: 'var(--color-text-primary)' }}
                  onClick={openRename}
                >
                  名前を変更
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--color-danger-light)]"
                  style={{ color: 'var(--color-danger)' }}
                  onClick={openDelete}
                >
                  削除
                </button>
              </div>
            </>
          )}
        </div>

        {/* Chevron */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ color: 'var(--color-text-secondary)', marginRight: -4, flexShrink: 0 }}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>

      {/* Rename modal */}
      <Modal
        open={renameOpen}
        onClose={() => !actionLoading && setRenameOpen(false)}
        title="名前を変更"
      >
        <div className="flex flex-col gap-4">
          <Input
            id={`folder-rename-${folder.id}`}
            label="フォルダ名"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            error={actionError ?? undefined}
            autoFocus
          />
          <div className="flex gap-3">
            <Button
              variant="secondary" fullWidth
              onClick={() => { setRenameOpen(false); setActionError(null) }}
              disabled={actionLoading}
            >
              キャンセル
            </Button>
            <Button
              fullWidth
              loading={actionLoading}
              disabled={!newName.trim()}
              onClick={handleRename}
            >
              変更する
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={deleteOpen}
        onClose={() => !actionLoading && setDeleteOpen(false)}
        title="フォルダを削除しますか？"
      >
        <div className="flex flex-col gap-4">
          {deckCount > 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              このフォルダには <strong>{deckCount} 件</strong>のデッキがあります。
              先にデッキを別のフォルダに移動してください。
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              「{folder.name}」を削除します。この操作は元に戻せません。
            </p>
          )}
          {actionError && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
            >
              {actionError}
            </div>
          )}
          <div className="flex gap-3">
            <Button
              variant="secondary" fullWidth
              onClick={() => { setDeleteOpen(false); setActionError(null) }}
            >
              {deckCount > 0 ? '閉じる' : 'キャンセル'}
            </Button>
            {deckCount === 0 && (
              <Button variant="danger" fullWidth loading={actionLoading} onClick={handleDelete}>
                削除する
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
