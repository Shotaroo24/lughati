import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDecks } from '../hooks/useDecks'
import { useFolder } from '../hooks/useFolder'
import { Header } from '../components/layout/Header'
import { PageContainer } from '../components/layout/PageContainer'
import { FolderCard } from '../components/folder/FolderCard'
import { FolderForm } from '../components/folder/FolderForm'
import { FolderView } from '../components/folder/FolderView'
import { DeckForm } from '../components/deck/DeckForm'
import { Button } from '../components/ui/Button'
import type { Folder } from '../types/folder'

// ── Loading skeleton ────────────────────────────────────────────────────────

function FolderSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="rounded-2xl h-20 animate-pulse"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
      ))}
    </div>
  )
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyFolderList({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5 text-4xl"
        style={{ backgroundColor: 'var(--color-primary-light)' }}
        aria-hidden
      >
        📁
      </div>
      <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
        フォルダがありません
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
        フォルダを作成して単語帳を整理しましょう
      </p>
      <Button onClick={onCreateClick}>フォルダを作成する</Button>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export function DeckListPage() {
  const { isGuest, signOut } = useAuth()
  const navigate = useNavigate()

  const {
    decks,
    loading: decksLoading,
    error: decksError,
    createDeck,
    deleteDeck,
    renameDeck,
    refetch: refetchDecks,
  } = useDecks()

  const {
    folders,
    loading: foldersLoading,
    error: foldersError,
    createFolder,
    renameFolder,
    deleteFolder,
    moveDeckToFolder,
  } = useFolder()

  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [createDeckOpen, setCreateDeckOpen] = useState(false)

  const loading = decksLoading || foldersLoading

  // Compute deck count per folder from the full deck list
  const deckCountByFolder = useMemo(() => {
    const counts: Record<string, number> = {}
    decks.forEach(d => {
      if (d.folder_id) counts[d.folder_id] = (counts[d.folder_id] ?? 0) + 1
    })
    return counts
  }, [decks])

  // Decks belonging to the selected folder
  const folderDecks = useMemo(
    () => (selectedFolder ? decks.filter(d => d.folder_id === selectedFolder.id) : []),
    [decks, selectedFolder]
  )

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  // ── Header right action ────────────────────────────────────────────────

  const headerRight = (
    <button
      type="button"
      onClick={() => selectedFolder ? setCreateDeckOpen(true) : setCreateFolderOpen(true)}
      aria-label={selectedFolder ? 'デッキを作成' : 'フォルダを作成'}
      className="inline-flex items-center gap-1 rounded-xl px-3 text-sm font-medium text-white"
      style={{ minWidth: 44, minHeight: 44, backgroundColor: 'var(--color-primary)' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span className="hidden sm:inline">新規</span>
    </button>
  )

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div style={{ backgroundColor: 'var(--color-bg-page)', minHeight: '100svh' }}>
      <Header
        title={selectedFolder ? selectedFolder.name : 'マイデッキ'}
        showBack={selectedFolder !== null}
        onBack={() => setSelectedFolder(null)}
        rightAction={headerRight}
      />

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
        {/* Error banner */}
        {(decksError ?? foldersError) && (
          <div
            className="rounded-xl px-4 py-3 mb-4 text-sm"
            style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
          >
            {decksError ?? foldersError}
          </div>
        )}

        {loading && <FolderSkeleton />}

        {/* ── Folder list view ── */}
        {!loading && !selectedFolder && (
          folders.length === 0 ? (
            <EmptyFolderList onCreateClick={() => setCreateFolderOpen(true)} />
          ) : (
            <div className="flex flex-col gap-3">
              {folders.map(folder => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  deckCount={deckCountByFolder[folder.id] ?? 0}
                  onSelect={() => setSelectedFolder(folder)}
                  onRename={name => renameFolder(folder.id, name)}
                  onDelete={count => deleteFolder(folder.id, count)}
                />
              ))}
            </div>
          )
        )}

        {/* ── Folder detail view ── */}
        {!loading && selectedFolder && (
          <FolderView
            folder={selectedFolder}
            decks={folderDecks}
            allFolders={folders}
            onCreateDeck={() => setCreateDeckOpen(true)}
            onDeleteDeck={deleteDeck}
            onRenameDeck={renameDeck}
            onMoveDeck={moveDeckToFolder}
            onDeckMoved={refetchDecks}
          />
        )}

        {/* Settings / sign-out (folder list only) */}
        {!loading && !selectedFolder && (
          <div className="mt-10 flex justify-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/settings')}>設定</Button>
            <Button variant="ghost" onClick={handleSignOut}>
              {isGuest ? 'ゲストを終了' : 'ログアウト'}
            </Button>
          </div>
        )}
      </PageContainer>

      {/* Create folder modal */}
      <FolderForm
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onSubmit={name => createFolder({ name }).then(r => ({ error: r.error }))}
      />

      {/* Create deck modal — passes current folder id */}
      <DeckForm
        open={createDeckOpen}
        onClose={() => setCreateDeckOpen(false)}
        onSubmit={(title, description) =>
          createDeck(title, description, selectedFolder?.id)
        }
      />
    </div>
  )
}
