import { useState } from 'react'
import type { Deck } from '../../types/database'
import type { Folder } from '../../types/folder'
import { DeckCard } from '../deck/DeckCard'
import { MoveDeckModal } from './MoveDeckModal'
import { Button } from '../ui/Button'

interface FolderViewProps {
  folder: Folder
  decks: Deck[]
  allFolders: Folder[]
  onCreateDeck: () => void
  onDeleteDeck: (id: string) => Promise<{ error: string | null }>
  onRenameDeck: (id: string, newTitle: string) => Promise<{ error: string | null }>
  onMoveDeck: (deckId: string, targetFolderId: string) => Promise<{ error: string | null }>
  onDeckMoved: () => void
}

export function FolderView({
  folder,
  decks,
  allFolders,
  onCreateDeck,
  onDeleteDeck,
  onRenameDeck,
  onMoveDeck,
  onDeckMoved,
}: FolderViewProps) {
  const [movingDeck, setMovingDeck] = useState<Deck | null>(null)

  const handleMove = async (deckId: string, targetFolderId: string) => {
    const result = await onMoveDeck(deckId, targetFolderId)
    if (!result.error) {
      setMovingDeck(null)
      onDeckMoved()
    }
    return result
  }

  const showMoveButton = allFolders.length > 1

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-2xl"
          style={{ backgroundColor: 'var(--color-primary-light)' }}
          aria-hidden
        >
          📚
        </div>
        <p className="text-base font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          デッキがありません
        </p>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          右上の「+」ボタンで最初のデッキを作成しましょう
        </p>
        <Button onClick={onCreateDeck}>デッキを作成する</Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {decks.map(deck => (
          <DeckCard
            key={deck.id}
            deck={deck}
            onDelete={onDeleteDeck}
            onRename={onRenameDeck}
            onMove={showMoveButton ? () => setMovingDeck(deck) : undefined}
          />
        ))}
      </div>

      <MoveDeckModal
        open={movingDeck !== null}
        onClose={() => setMovingDeck(null)}
        deck={movingDeck}
        currentFolderId={folder.id}
        folders={allFolders}
        onMove={handleMove}
      />
    </>
  )
}
