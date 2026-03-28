import { useState, useMemo, useCallback, useEffect } from 'react'
import type { Card } from '../types/database'
import type { DisplayMode, CardFilter } from '../types/study'

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function storageKey(deckId: string) {
  return `lughati_study_position_${deckId}`
}

function loadSavedIndex(deckId: string): number {
  try {
    const raw = localStorage.getItem(storageKey(deckId))
    if (raw === null) return 0
    const n = parseInt(raw, 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

function saveIndex(deckId: string, index: number) {
  try {
    localStorage.setItem(storageKey(deckId), String(index))
  } catch {
    // ignore storage errors
  }
}

function clearSavedIndex(deckId: string) {
  try {
    localStorage.removeItem(storageKey(deckId))
  } catch {
    // ignore
  }
}

interface SessionState {
  currentIndex: number
  isFlipped: boolean
  displayMode: DisplayMode
  filter: CardFilter
  isShuffled: boolean
  shuffledOrder: number[]
  // IDs of cards fixed at session start when filter === 'starred'
  sessionCardIds: string[] | null
}

export function useStudy(allCards: Card[], deckId: string) {
  const [state, setState] = useState<SessionState>(() => ({
    currentIndex: loadSavedIndex(deckId),
    isFlipped: false,
    displayMode: 'flip',
    filter: 'all',
    isShuffled: false,
    shuffledOrder: [],
    sessionCardIds: null,
  }))

  // Cards after filter applied.
  // When filter === 'starred', we use a snapshot of IDs taken when the filter
  // was first applied so that un-starring a card mid-session doesn't remove it.
  const filteredCards = useMemo(() => {
    if (state.filter !== 'starred') return allCards
    if (state.sessionCardIds !== null) {
      // Preserve session order; fall back to current card data so star state updates are reflected
      const idSet = new Set(state.sessionCardIds)
      const byId = new Map(allCards.map(c => [c.id, c]))
      return state.sessionCardIds
        .filter(id => idSet.has(id) && byId.has(id))
        .map(id => byId.get(id)!)
    }
    return allCards.filter(c => c.is_starred)
  }, [allCards, state.filter, state.sessionCardIds])

  // Cards in study order (shuffled or original)
  const studyCards = useMemo(() => {
    if (!state.isShuffled || state.shuffledOrder.length === 0) return filteredCards
    return state.shuffledOrder
      .filter(i => i < filteredCards.length)
      .map(i => filteredCards[i])
  }, [filteredCards, state.isShuffled, state.shuffledOrder])

  const total = studyCards.length
  // Guard against out-of-bounds when filter/shuffle changes
  const safeIndex = Math.min(state.currentIndex, Math.max(0, total - 1))
  const currentCard: Card | null = studyCards[safeIndex] ?? null
  const currentNumber = total > 0 ? safeIndex + 1 : 0

  // Persist position to localStorage whenever it changes (only for unshuffled, all-cards mode)
  useEffect(() => {
    if (!state.isShuffled && state.filter === 'all') {
      saveIndex(deckId, safeIndex)
    }
  }, [deckId, safeIndex, state.isShuffled, state.filter])

  // ── Navigation ─────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    setState(s => ({
      ...s,
      currentIndex: Math.min(safeIndex + 1, total - 1),
      isFlipped: false,
    }))
  }, [safeIndex, total])

  const goPrev = useCallback(() => {
    setState(s => ({
      ...s,
      currentIndex: Math.max(safeIndex - 1, 0),
      isFlipped: false,
    }))
  }, [safeIndex])

  const flip = useCallback(() => {
    setState(s => ({ ...s, isFlipped: !s.isFlipped }))
  }, [])

  // ── Controls ───────────────────────────────────────────────────────────

  const toggleShuffle = useCallback(() => {
    setState(s => {
      if (s.isShuffled) {
        return { ...s, isShuffled: false, shuffledOrder: [], currentIndex: 0, isFlipped: false }
      }
      const indices = Array.from({ length: filteredCards.length }, (_, i) => i)
      return {
        ...s,
        isShuffled: true,
        shuffledOrder: shuffleArray(indices),
        currentIndex: 0,
        isFlipped: false,
      }
    })
  }, [filteredCards.length])

  const setFilter = useCallback((filter: CardFilter) => {
    setState(s => ({
      ...s,
      filter,
      currentIndex: 0,
      isFlipped: false,
      isShuffled: false,
      shuffledOrder: [],
      // Snapshot current starred card IDs so they stay fixed for this session
      sessionCardIds: filter === 'starred' ? allCards.filter(c => c.is_starred).map(c => c.id) : null,
    }))
  }, [allCards])

  const setDisplayMode = useCallback((displayMode: DisplayMode) => {
    setState(s => ({ ...s, displayMode, isFlipped: false }))
  }, [])

  const resetSavedPosition = useCallback(() => {
    clearSavedIndex(deckId)
    setState(s => ({ ...s, currentIndex: 0, isFlipped: false }))
  }, [deckId])

  return {
    currentCard,
    studyCards,
    currentIndex: safeIndex,
    currentNumber,
    total,
    isFlipped: state.isFlipped,
    displayMode: state.displayMode,
    filter: state.filter,
    isShuffled: state.isShuffled,
    goNext,
    goPrev,
    flip,
    toggleShuffle,
    setFilter,
    setDisplayMode,
    resetSavedPosition,
  }
}
