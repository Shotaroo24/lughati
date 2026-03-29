import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import type { Card } from '../types/database'

// ── Guest localStorage helpers ─────────────────────────────────────────────

const guestKey = (deckId: string) => `lughati_guest_cards_${deckId}`

function readGuestCards(deckId: string): Card[] {
  try {
    return JSON.parse(localStorage.getItem(guestKey(deckId)) ?? '[]') as Card[]
  } catch {
    return []
  }
}

function writeGuestCards(deckId: string, cards: Card[]): void {
  localStorage.setItem(guestKey(deckId), JSON.stringify(cards))
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface CardInput {
  arabic: string
  english: string
  romanization?: string
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useCards(deckId: string) {
  const { user, isGuest } = useAuth()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCards = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (isGuest) {
      setCards(readGuestCards(deckId))
      setLoading(false)
      return
    }

    if (!supabase || !user) {
      setLoading(false)
      return
    }

    const { data, error: err } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('position', { ascending: true })

    if (err) {
      setError(err.message)
    } else {
      setCards((data as Card[]) ?? [])
    }
    setLoading(false)
  }, [deckId, user, isGuest])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  // ── createCard ────────────────────────────────────────────────────────────

  const createCard = async (input: CardInput): Promise<{ error: string | null }> => {
    if (isGuest) {
      const existing = readGuestCards(deckId)
      const now = new Date().toISOString()
      const newCard: Card = {
        id: crypto.randomUUID(),
        deck_id: deckId,
        arabic: input.arabic,
        english: input.english,
        romanization: input.romanization ?? null,
        is_starred: false,
        audio_url: null,
        position: existing.length,
        created_at: now,
        updated_at: now,
      }
      const updated = [...existing, newCard]
      writeGuestCards(deckId, updated)
      setCards(updated)
      return { error: null }
    }

    if (!supabase) return { error: 'Supabase が設定されていません' }

    const { data, error: err } = await supabase
      .from('cards')
      .insert({
        deck_id: deckId,
        arabic: input.arabic,
        english: input.english,
        romanization: input.romanization ?? null,
        position: cards.length,
      })
      .select()
      .single()

    if (err) return { error: err.message }
    setCards(prev => [...prev, data as Card])
    return { error: null }
  }

  // ── updateCard ────────────────────────────────────────────────────────────

  const updateCard = async (id: string, input: CardInput): Promise<{ error: string | null }> => {
    if (isGuest) {
      const existing = readGuestCards(deckId)
      const updated = existing.map(c =>
        c.id === id
          ? { ...c, ...input, romanization: input.romanization ?? null, updated_at: new Date().toISOString() }
          : c
      )
      writeGuestCards(deckId, updated)
      setCards(updated)
      return { error: null }
    }

    if (!supabase) return { error: 'Supabase が設定されていません' }

    const { data, error: err } = await supabase
      .from('cards')
      .update({
        arabic: input.arabic,
        english: input.english,
        romanization: input.romanization ?? null,
      })
      .eq('id', id)
      .select()
      .single()

    if (err) return { error: err.message }
    setCards(prev => prev.map(c => (c.id === id ? (data as Card) : c)))
    return { error: null }
  }

  // ── deleteCard ────────────────────────────────────────────────────────────

  const deleteCard = async (id: string): Promise<{ error: string | null }> => {
    if (isGuest) {
      const updated = readGuestCards(deckId).filter(c => c.id !== id)
      writeGuestCards(deckId, updated)
      setCards(updated)
      return { error: null }
    }

    if (!supabase) return { error: 'Supabase が設定されていません' }

    const { error: err } = await supabase.from('cards').delete().eq('id', id)
    if (err) return { error: err.message }
    setCards(prev => prev.filter(c => c.id !== id))
    return { error: null }
  }

  // ── toggleStar ────────────────────────────────────────────────────────────

  const toggleStar = async (id: string): Promise<void> => {
    const card = cards.find(c => c.id === id)
    if (!card) return

    const newValue = !card.is_starred

    // Optimistic update
    const apply = (prev: Card[]) =>
      prev.map(c => (c.id === id ? { ...c, is_starred: newValue } : c))
    setCards(apply)

    if (isGuest) {
      writeGuestCards(deckId, apply(readGuestCards(deckId)))
      return
    }

    if (!supabase) return
    await supabase.from('cards').update({ is_starred: newValue }).eq('id', id)
  }

  // ── bulkCreateCards ───────────────────────────────────────────────────────

  const bulkCreateCards = async (
    inputs: CardInput[]
  ): Promise<{ error: string | null; count: number }> => {
    if (inputs.length === 0) return { error: null, count: 0 }

    if (isGuest) {
      const existing = readGuestCards(deckId)
      const now = new Date().toISOString()
      const newCards: Card[] = inputs.map((input, i) => ({
        id: crypto.randomUUID(),
        deck_id: deckId,
        arabic: input.arabic,
        english: input.english,
        romanization: input.romanization ?? null,
        is_starred: false,
        audio_url: null,
        position: existing.length + i,
        created_at: now,
        updated_at: now,
      }))
      const updated = [...existing, ...newCards]
      writeGuestCards(deckId, updated)
      setCards(updated)
      return { error: null, count: newCards.length }
    }

    if (!supabase) return { error: 'Supabase が設定されていません', count: 0 }

    const rows = inputs.map((input, i) => ({
      deck_id: deckId,
      arabic: input.arabic,
      english: input.english,
      romanization: input.romanization ?? null,
      position: cards.length + i,
    }))

    const { data, error: err } = await supabase.from('cards').insert(rows).select()
    if (err) return { error: err.message, count: 0 }

    const newCards = (data as Card[]) ?? []
    setCards(prev => [...prev, ...newCards])
    return { error: null, count: newCards.length }
  }

  return { cards, loading, error, createCard, updateCard, deleteCard, toggleStar, bulkCreateCards, refetch: fetchCards }
}
