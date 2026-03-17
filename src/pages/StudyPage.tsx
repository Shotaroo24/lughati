import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCards } from '../hooks/useCards'
import { useStudy } from '../hooks/useStudy'
import type { DisplayMode, CardFilter } from '../types/study'

// ── Icon helpers ───────────────────────────────────────────────────────────

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function ChevronLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function SpeakerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  )
}

// ── FlipCard ───────────────────────────────────────────────────────────────

interface FlipCardProps {
  arabic: string
  english: string
  romanization: string | null
  isFlipped: boolean
  onFlip: () => void
  onSpeaker: () => void
}

function FlipCard({ arabic, english, romanization, isFlipped, onFlip, onSpeaker }: FlipCardProps) {
  return (
    <div
      className="w-full cursor-pointer select-none"
      style={{ perspective: '1200px', minHeight: 280 }}
      onClick={onFlip}
      role="button"
      tabIndex={0}
      aria-label="タップして裏返す"
      onKeyDown={e => e.key === ' ' && onFlip()}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d', position: 'relative', minHeight: 280 }}
      >
        {/* Front — Arabic */}
        <div
          className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-4 p-8"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            backgroundColor: 'var(--color-bg-card)',
            boxShadow: 'var(--shadow-card-hover)',
          }}
        >
          <p
            dir="rtl"
            className="text-center leading-relaxed"
            style={{
              fontFamily: 'var(--font-arabic)',
              fontSize: 36,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            {arabic}
          </p>
          <button
            type="button"
            aria-label="発音を聞く"
            onClick={e => { e.stopPropagation(); onSpeaker() }}
            className="flex items-center justify-center rounded-full transition-colors"
            style={{
              minWidth: 44,
              minHeight: 44,
              color: 'var(--color-primary)',
              backgroundColor: 'var(--color-primary-light)',
            }}
          >
            <SpeakerIcon />
          </button>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            タップして裏返す
          </p>
        </div>

        {/* Back — English */}
        <div
          className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 p-8"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            backgroundColor: 'var(--color-bg-card)',
            boxShadow: 'var(--shadow-card-hover)',
          }}
        >
          <p
            className="text-center"
            style={{ fontSize: 28, fontWeight: 400, color: 'var(--color-text-primary)' }}
          >
            {english}
          </p>
          {romanization && (
            <p
              className="text-center italic"
              style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}
            >
              {romanization}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── BothSidesCard ──────────────────────────────────────────────────────────

interface BothSidesCardProps {
  arabic: string
  english: string
  romanization: string | null
  onSpeaker: () => void
}

function BothSidesCard({ arabic, english, romanization, onSpeaker }: BothSidesCardProps) {
  return (
    <div
      className="w-full rounded-2xl p-8 flex flex-col items-center gap-5"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        boxShadow: 'var(--shadow-card-hover)',
        minHeight: 280,
      }}
    >
      {/* Arabic */}
      <div className="flex flex-col items-center gap-3 flex-1 justify-center">
        <p
          dir="rtl"
          className="text-center leading-relaxed"
          style={{
            fontFamily: 'var(--font-arabic)',
            fontSize: 36,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          {arabic}
        </p>
        <button
          type="button"
          aria-label="発音を聞く"
          onClick={onSpeaker}
          className="flex items-center justify-center rounded-full transition-colors"
          style={{
            minWidth: 44,
            minHeight: 44,
            color: 'var(--color-primary)',
            backgroundColor: 'var(--color-primary-light)',
          }}
        >
          <SpeakerIcon />
        </button>
      </div>

      {/* Divider */}
      <div className="w-full h-px" style={{ backgroundColor: 'var(--color-border)' }} />

      {/* English */}
      <div className="flex flex-col items-center gap-1 flex-1 justify-center">
        <p
          className="text-center"
          style={{ fontSize: 26, color: 'var(--color-text-primary)' }}
        >
          {english}
        </p>
        {romanization && (
          <p
            className="text-center italic"
            style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}
          >
            {romanization}
          </p>
        )}
      </div>
    </div>
  )
}

// ── ToggleButton ───────────────────────────────────────────────────────────

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
      style={{
        minHeight: 44,
        backgroundColor: active ? 'var(--color-primary)' : 'var(--color-primary-light)',
        color: active ? '#fff' : 'var(--color-primary)',
      }}
    >
      {children}
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export function StudyPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { cards, loading, toggleStar } = useCards(id ?? '')
  const study = useStudy(cards)

  const dragStartX = useRef<number | null>(null)

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') study.goNext()
      else if (e.key === 'ArrowLeft') study.goPrev()
      else if (e.key === ' ') { e.preventDefault(); study.flip() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [study])

  const handleSpeaker = () => {
    // TTS will be wired in Phase 3
  }

  const handleStarToggle = () => {
    if (study.currentCard) toggleStar(study.currentCard.id)
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-page)' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (study.total === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-4"
        style={{ backgroundColor: 'var(--color-bg-page)' }}
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>
          {study.filter === 'starred' ? '星付きカードがありません' : 'カードがありません'}
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ color: 'var(--color-primary)' }}
          className="underline text-sm"
        >
          デッキに戻る
        </button>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-bg-page)' }}
    >
      {/* ── Top bar ── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 h-14"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="デッキに戻る"
          className="flex items-center justify-center rounded-xl"
          style={{ minWidth: 44, minHeight: 44, color: 'var(--color-primary)' }}
        >
          <ChevronLeft />
        </button>

        {/* Progress */}
        <span
          className="text-sm font-medium tabular-nums"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {study.currentNumber} / {study.total}
        </span>

        {/* Star */}
        <button
          type="button"
          onClick={handleStarToggle}
          aria-label={study.currentCard?.is_starred ? '星を外す' : '星をつける'}
          className="flex items-center justify-center rounded-xl transition-colors"
          style={{
            minWidth: 44,
            minHeight: 44,
            color: study.currentCard?.is_starred
              ? 'var(--color-accent)'
              : 'var(--color-border)',
          }}
        >
          <StarIcon filled={study.currentCard?.is_starred ?? false} />
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div className="h-1 w-full" style={{ backgroundColor: 'var(--color-border)' }}>
        <div
          className="h-1 transition-all duration-300"
          style={{
            width: `${(study.currentNumber / study.total) * 100}%`,
            backgroundColor: 'var(--color-primary)',
          }}
        />
      </div>

      {/* ── Card area ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-4 py-6"
        // Touch swipe
        onTouchStart={e => { dragStartX.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          if (dragStartX.current === null) return
          const delta = e.changedTouches[0].clientX - dragStartX.current
          if (delta < -50) study.goNext()
          else if (delta > 50) study.goPrev()
          dragStartX.current = null
        }}
      >
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${study.currentIndex}-${study.displayMode}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              {study.currentCard && study.displayMode === 'flip' && (
                <FlipCard
                  arabic={study.currentCard.arabic}
                  english={study.currentCard.english}
                  romanization={study.currentCard.romanization}
                  isFlipped={study.isFlipped}
                  onFlip={study.flip}
                  onSpeaker={handleSpeaker}
                />
              )}
              {study.currentCard && study.displayMode === 'both' && (
                <BothSidesCard
                  arabic={study.currentCard.arabic}
                  english={study.currentCard.english}
                  romanization={study.currentCard.romanization}
                  onSpeaker={handleSpeaker}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Arrow navigation ── */}
        <div className="flex items-center gap-8 mt-8">
          <button
            type="button"
            onClick={study.goPrev}
            disabled={study.currentIndex === 0}
            aria-label="前のカード"
            className="flex items-center justify-center rounded-full transition-colors disabled:opacity-30"
            style={{
              minWidth: 52,
              minHeight: 52,
              backgroundColor: 'var(--color-bg-card)',
              boxShadow: 'var(--shadow-card)',
              color: 'var(--color-text-primary)',
            }}
          >
            <ChevronLeft />
          </button>

          <span
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {study.displayMode === 'flip' ? 'タップで裏返し' : '← → でナビ'}
          </span>

          <button
            type="button"
            onClick={study.goNext}
            disabled={study.currentIndex === study.total - 1}
            aria-label="次のカード"
            className="flex items-center justify-center rounded-full transition-colors disabled:opacity-30"
            style={{
              minWidth: 52,
              minHeight: 52,
              backgroundColor: 'var(--color-bg-card)',
              boxShadow: 'var(--shadow-card)',
              color: 'var(--color-text-primary)',
            }}
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* ── Bottom bar — controls ── */}
      <div
        className="flex items-center justify-center gap-3 px-4 py-4 flex-wrap"
        style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      >
        {/* Shuffle */}
        <ToggleButton active={study.isShuffled} onClick={study.toggleShuffle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
          </svg>
          シャッフル
        </ToggleButton>

        {/* Display mode */}
        <ToggleButton
          active={study.displayMode === 'flip'}
          onClick={() => study.setDisplayMode(study.displayMode === 'flip' ? 'both' : 'flip' as DisplayMode)}
        >
          {study.displayMode === 'flip' ? '裏返しモード' : '両面表示'}
        </ToggleButton>

        {/* Filter */}
        <ToggleButton
          active={study.filter === 'starred'}
          onClick={() => study.setFilter(study.filter === 'all' ? 'starred' : 'all' as CardFilter)}
        >
          <StarIcon filled={study.filter === 'starred'} />
          {study.filter === 'starred' ? '星付きのみ' : '全カード'}
        </ToggleButton>
      </div>
    </div>
  )
}
