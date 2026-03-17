export interface Folder {
  id: string
  user_id: string
  name: string
  position: number
  created_at: string
  /** computed client-side from decks list */
  deck_count?: number
}

export interface FolderInput {
  name: string
}

export const DEFAULT_FOLDER_NAME = 'マイフォルダ' as const

/** localStorage keys used by useFolder (must stay in sync with useDecks) */
export const GUEST_FOLDERS_KEY = 'lughati_guest_folders' as const
export const GUEST_DECKS_KEY = 'lughati_guest_decks' as const
