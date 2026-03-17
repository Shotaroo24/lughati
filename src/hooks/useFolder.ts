import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import type { Folder, FolderInput } from '../types/folder'
import type { Deck } from '../types/database'
import { DEFAULT_FOLDER_NAME, GUEST_FOLDERS_KEY, GUEST_DECKS_KEY } from '../types/folder'

// ── Guest localStorage helpers ─────────────────────────────────────────────

function readLS<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as T[] }
  catch { return [] }
}

function writeLS<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useFolder() {
  const { user, isGuest } = useAuth()
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFolders = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (isGuest) {
      let guestFolders = readLS<Folder>(GUEST_FOLDERS_KEY)
      // Auto-create default folder and migrate existing decks on first use
      if (guestFolders.length === 0) {
        const defaultFolder: Folder = {
          id: crypto.randomUUID(),
          user_id: 'guest',
          name: DEFAULT_FOLDER_NAME,
          position: 0,
          created_at: new Date().toISOString(),
        }
        guestFolders = [defaultFolder]
        writeLS(GUEST_FOLDERS_KEY, guestFolders)
        const decks = readLS<Deck>(GUEST_DECKS_KEY)
        if (decks.some(d => !d.folder_id)) {
          writeLS(GUEST_DECKS_KEY, decks.map(d => ({ ...d, folder_id: defaultFolder.id })))
        }
      }
      setFolders(guestFolders)
      setLoading(false)
      return
    }

    if (!supabase || !user) { setLoading(false); return }

    const { data, error: err } = await supabase
      .from('folders')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (err) setError(err.message)
    else setFolders((data ?? []) as Folder[])
    setLoading(false)
  }, [user, isGuest])

  useEffect(() => { fetchFolders() }, [fetchFolders])

  // ── createFolder ────────────────────────────────────────────────────────

  const createFolder = async (
    input: FolderInput
  ): Promise<{ error: string | null; folder?: Folder }> => {
    const name = input.name.trim()
    if (!name) return { error: 'フォルダ名を入力してください' }

    if (isGuest) {
      const newFolder: Folder = {
        id: crypto.randomUUID(),
        user_id: 'guest',
        name,
        position: folders.length,
        created_at: new Date().toISOString(),
      }
      const updated = [...folders, newFolder]
      writeLS(GUEST_FOLDERS_KEY, updated)
      setFolders(updated)
      return { error: null, folder: newFolder }
    }

    if (!supabase || !user) return { error: 'Supabase が設定されていません' }

    const { data, error: err } = await supabase
      .from('folders')
      .insert({ name, user_id: user.id, position: folders.length })
      .select()
      .single()

    if (err) return { error: err.message }
    const newFolder = data as Folder
    setFolders(prev => [...prev, newFolder])
    return { error: null, folder: newFolder }
  }

  // ── renameFolder ─────────────────────────────────────────────────────────

  const renameFolder = async (id: string, name: string): Promise<{ error: string | null }> => {
    const trimmed = name.trim()
    if (!trimmed) return { error: 'フォルダ名を入力してください' }

    if (isGuest) {
      const updated = folders.map(f => f.id === id ? { ...f, name: trimmed } : f)
      writeLS(GUEST_FOLDERS_KEY, updated)
      setFolders(updated)
      return { error: null }
    }

    if (!supabase) return { error: 'Supabase が設定されていません' }
    const { error: err } = await supabase.from('folders').update({ name: trimmed }).eq('id', id)
    if (err) return { error: err.message }
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name: trimmed } : f))
    return { error: null }
  }

  // ── deleteFolder ─────────────────────────────────────────────────────────
  // Rejects if the folder still has decks (deckCount must be passed by caller)

  const deleteFolder = async (id: string, deckCount: number): Promise<{ error: string | null }> => {
    if (deckCount > 0) {
      return {
        error: `このフォルダには ${deckCount} 件のデッキがあります。先にデッキを移動してください。`,
      }
    }

    if (isGuest) {
      writeLS(GUEST_FOLDERS_KEY, folders.filter(f => f.id !== id))
      setFolders(prev => prev.filter(f => f.id !== id))
      return { error: null }
    }

    if (!supabase) return { error: 'Supabase が設定されていません' }
    const { error: err } = await supabase.from('folders').delete().eq('id', id)
    if (err) return { error: err.message }
    setFolders(prev => prev.filter(f => f.id !== id))
    return { error: null }
  }

  // ── moveDeckToFolder ─────────────────────────────────────────────────────

  const moveDeckToFolder = async (
    deckId: string,
    targetFolderId: string
  ): Promise<{ error: string | null }> => {
    if (isGuest) {
      const decks = readLS<Deck>(GUEST_DECKS_KEY)
      writeLS(GUEST_DECKS_KEY, decks.map(d => d.id === deckId ? { ...d, folder_id: targetFolderId } : d))
      return { error: null }
    }

    if (!supabase) return { error: 'Supabase が設定されていません' }
    const { error: err } = await supabase
      .from('decks')
      .update({ folder_id: targetFolderId })
      .eq('id', deckId)
    return { error: err?.message ?? null }
  }

  return {
    folders,
    loading,
    error,
    createFolder,
    renameFolder,
    deleteFolder,
    moveDeckToFolder,
    refetch: fetchFolders,
  }
}
