import { useState, useMemo, useCallback } from 'react'
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

interface SessionState {
  currentIndex: number
  isFlipped: boolean
  displayMode: DisplayMode
  filter: CardFilter
  isShuffled: boolean
  shuffledOrder: number[]
}

export function useStudy(allCards: Card[]) {
  const [state, setState] = useState<SessionState>({
    currentIndex: 0,
    isFlipped: false,
    displayMode: 'flip',
    filter: 'all',
    isShuffled: false,
    shuffledOrder: [],
  })

  // Cards after filter applied
  const filteredCards = useMemo(
    () => (state.filter === 'starred' ? allCards.filter(c => c.is_starred) : allCards),
    [allCards, state.filter]
  )

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
    setState(s => ({ ...s, filter, currentIndex: 0, isFlipped: false, isShuffled: false, shuffledOrder: [] }))
  }, [])

  const setDisplayMode = useCallback((displayMode: DisplayMode) => {
    setState(s => ({ ...s, displayMode, isFlipped: false }))
  }, [])

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
  }
}
