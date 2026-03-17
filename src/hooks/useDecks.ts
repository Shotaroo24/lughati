import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import type { Deck } from '../types/database'

// ── Guest localStorage storage ─────────────────────────────────────────────

const GUEST_DECKS_KEY = 'lughati_guest_decks'

function readGuestDecks(): Deck[] {
  try {
    return JSON.parse(localStorage.getItem(GUEST_DECKS_KEY) ?? '[]') as Deck[]
  } catch {
    return []
  }
}

function writeGuestDecks(decks: Deck[]): void {
  localStorage.setItem(GUEST_DECKS_KEY, JSON.stringify(decks))
}

// ── Supabase response type ─────────────────────────────────────────────────

interface DeckRow {
  id: string
  user_id: string
  title: string
  description: string | null
  last_studied_at: string | null
  created_at: string
  updated_at: string
  cards: [{ count: number }] | null
}

function toDecks(rows: DeckRow[]): Deck[] {
  return rows.map(row => ({
    ...row,
    card_count: row.cards?.[0]?.count ?? 0,
  }))
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useDecks() {
  const { user, isGuest } = useAuth()
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDecks = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (isGuest) {
      setDecks(readGuestDecks())
      setLoading(false)
      return
    }

    if (!supabase || !user) {
      setLoading(false)
      return
    }

    const { data, error: err } = await supabase
      .from('decks')
      .select('*, cards(count)')
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
    } else {
      setDecks(toDecks((data ?? []) as DeckRow[]))
    }
    setLoading(false)
  }, [user, isGuest])

  useEffect(() => {
    fetchDecks()
  }, [fetchDecks])

  // ── createDeck ────────────────────────────────────────────────────────────

  const createDeck = async (
    title: string,
    description?: string,
    folderId?: string
  ): Promise<{ error: string | null }> => {
    if (isGuest) {
      const now = new Date().toISOString()
      const newDeck: Deck = {
        id: crypto.randomUUID(),
        user_id: 'guest',
        title,
        description: description ?? null,
        folder_id: folderId ?? null,
        last_studied_at: null,
        created_at: now,
        updated_at: now,
        card_count: 0,
      }
      const updated = [newDeck, ...readGuestDecks()]
      writeGuestDecks(updated)
      setDecks(updated)
      return { error: null }
    }

    if (!supabase || !user) return { error: 'Supabase が設定されていません' }

    const { data, error: err } = await supabase
      .from('decks')
      .insert({ title, description: description ?? null, user_id: user.id, folder_id: folderId ?? null })
      .select('*, cards(count)')
      .single()

    if (err) return { error: err.message }

    const newDeck = toDecks([data as DeckRow])[0]
    setDecks(prev => [newDeck, ...prev])
    return { error: null }
  }

  // ── deleteDeck ────────────────────────────────────────────────────────────

  const deleteDeck = async (id: string): Promise<{ error: string | null }> => {
    if (isGuest) {
      const updated = readGuestDecks().filter(d => d.id !== id)
      writeGuestDecks(updated)
      setDecks(updated)
      return { error: null }
    }

    if (!supabase) return { error: 'Supabase が設定されていません' }

    const { error: err } = await supabase.from('decks').delete().eq('id', id)
    if (err) return { error: err.message }

    setDecks(prev => prev.filter(d => d.id !== id))
    return { error: null }
  }

  return { decks, loading, error, createDeck, deleteDeck, refetch: fetchDecks }
}
