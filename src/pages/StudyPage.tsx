import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useCards } from '../hooks/useCards'
import { useStudy } from '../hooks/useStudy'
import { playArabicTTS } from '../lib/tts'
import type { DisplayMode, CardFilter } from '../types/study'

// ── Icons ──────────────────────────────────────────────────────────────────

function StarIcon({ filled, size = 24 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

function XIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  )
}

// ── Confetti ───────────────────────────────────────────────────────────────

function fireConfetti() {
  const sakuraColors = ['#E8567F', '#FFF0F3', '#D4A853', '#C4395F', '#FFB7CB']
  confetti({
    particleCount: 140,
    spread: 90,
    origin: { y: 0.55 },
    colors: sakuraColors,
  })
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.4, x: 0.2 },
      colors: sakuraColors,
      angle: 70,
    })
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.4, x: 0.8 },
      colors: sakuraColors,
      angle: 110,
    })
  }, 200)
}

// ── FlipCard ────────────────────────────────────────────────────────────────
// 360-degree rotation: card does one full spin per tap.
// Content swaps at the midpoint (card invisible at 90°–270°), so the new
// face is already in place when the card swings back into view.

interface FlipCardProps {
  arabic: string
  english: string
  romanization: string | null
  isFlipped: boolean
  isStarred: boolean
  onFlip: () => void
  onSpeaker: () => void
  onToggleStar: () => void
}

const FLIP_DURATION = 0.3 // seconds

function FlipCard({
  arabic, english, romanization,
  isFlipped, isStarred,
  onFlip, onSpeaker, onToggleStar,
}: FlipCardProps) {
  const controls = useAnimation()
  const [faceContent, setFaceContent] = useState<'front' | 'back'>('front')
  const [isAnimating, setIsAnimating] = useState(false)
  // Track previous isFlipped to avoid animating on initial mount.
  // (useRef value persists through React StrictMode double-invocation,
  //  so comparing prev vs current is more reliable than an isMounted flag.)
  const prevIsFlipped = useRef<boolean | null>(null)

  useEffect(() => {
    if (prevIsFlipped.current === null) {
      // First render: initialize without animation
      prevIsFlipped.current = isFlipped
      return
    }
    if (prevIsFlipped.current === isFlipped) return
    prevIsFlipped.current = isFlipped

    setIsAnimating(true)
    // Card tilts to edge (0→90°), swaps content while edge-on, comes back from the other side (−90→0°).
    // The card stays visible throughout — no backface-hidden disappearing.
    const timer = setTimeout(
      () => setFaceContent(isFlipped ? 'back' : 'front'),
      (FLIP_DURATION * 1000) / 2,
    )
    controls.start({
      rotateX: [0, 90, -90, 0],
      transition: { duration: FLIP_DURATION, ease: 'easeInOut', times: [0, 0.5, 0.5, 1] },
    }).then(() => {
      controls.set({ rotateX: 0 })
      setIsAnimating(false)
    })
    return () => clearTimeout(timer)
  }, [isFlipped]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="w-full cursor-pointer select-none"
      style={{ perspective: '2000px', minHeight: 300 }}
      onClick={onFlip}
      role="button"
      tabIndex={0}
      aria-label="タップして裏返す"
      onKeyDown={e => e.key === ' ' && onFlip()}
    >
      <motion.div
        animate={controls}
        style={{
          position: 'relative',
          minHeight: 300,
          willChange: isAnimating ? 'transform' : 'auto',
        }}
      >
        {faceContent === 'front' ? (
          /* Front — Arabic */
          <div
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-4 p-8"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              boxShadow: 'var(--shadow-card-hover)',
            }}
          >
            <button
              type="button"
              aria-label={isStarred ? '星を外す' : '星をつける'}
              onClick={e => { e.stopPropagation(); onToggleStar() }}
              className="absolute top-3 right-3 flex items-center justify-center rounded-xl transition-colors"
              style={{ minWidth: 44, minHeight: 44, color: isStarred ? 'var(--color-accent)' : 'var(--color-border)' }}
            >
              <StarIcon filled={isStarred} />
            </button>

            <p
              dir="rtl"
              className="text-center leading-relaxed"
              style={{
                fontFamily: 'var(--font-arabic)',
                fontSize: 36,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                textRendering: 'optimizeLegibility',
              }}
            >
              {arabic}
            </p>

            <button
              type="button"
              aria-label="発音を聞く"
              onClick={e => { e.stopPropagation(); onSpeaker() }}
              className="flex items-center justify-center rounded-full transition-colors"
              style={{ minWidth: 44, minHeight: 44, color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)' }}
            >
              <SpeakerIcon />
            </button>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              タップして裏返す
            </p>
          </div>
        ) : (
          /* Back — English */
          <div
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 p-8"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              boxShadow: 'var(--shadow-card-hover)',
            }}
          >
            <button
              type="button"
              aria-label={isStarred ? '星を外す' : '星をつける'}
              onClick={e => { e.stopPropagation(); onToggleStar() }}
              className="absolute top-3 right-3 flex items-center justify-center rounded-xl transition-colors"
              style={{ minWidth: 44, minHeight: 44, color: isStarred ? 'var(--color-accent)' : 'var(--color-border)' }}
            >
              <StarIcon filled={isStarred} />
            </button>

            <p
              className="text-center"
              style={{
                fontSize: 28,
                color: 'var(--color-text-primary)',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                textRendering: 'optimizeLegibility',
              }}
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
        )}
      </motion.div>
    </div>
  )
}

// ── BothSidesCard (項目1: star inside) ────────────────────────────────────

interface BothSidesCardProps {
  arabic: string
  english: string
  romanization: string | null
  isStarred: boolean
  onSpeaker: () => void
  onToggleStar: () => void
}

function BothSidesCard({
  arabic, english, romanization,
  isStarred, onSpeaker, onToggleStar,
}: BothSidesCardProps) {
  return (
    <div
      className="w-full rounded-2xl p-8 flex flex-col items-center gap-5 relative"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        boxShadow: 'var(--shadow-card-hover)',
        minHeight: 300,
      }}
    >
      {/* 項目1: star top-right */}
      <button
        type="button"
        aria-label={isStarred ? '星を外す' : '星をつける'}
        onClick={onToggleStar}
        className="absolute top-3 right-3 flex items-center justify-center rounded-xl transition-colors"
        style={{
          minWidth: 44, minHeight: 44,
          color: isStarred ? 'var(--color-accent)' : 'var(--color-border)',
        }}
      >
        <StarIcon filled={isStarred} />
      </button>

      <div className="flex flex-col items-center gap-3 flex-1 justify-center">
        <p
          dir="rtl"
          className="text-center leading-relaxed"
          style={{
            fontFamily: 'var(--font-arabic)',
            fontSize: 36,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
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
            minWidth: 44, minHeight: 44,
            color: 'var(--color-primary)',
            backgroundColor: 'var(--color-primary-light)',
          }}
        >
          <SpeakerIcon />
        </button>
      </div>

      <div className="w-full h-px" style={{ backgroundColor: 'var(--color-border)' }} />

      <div className="flex flex-col items-center gap-1 flex-1 justify-center">
        <p
          className="text-center"
          style={{
            fontSize: 26,
            color: 'var(--color-text-primary)',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          }}
        >
          {english}
        </p>
        {romanization && (
          <p className="text-center italic" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {romanization}
          </p>
        )}
      </div>
    </div>
  )
}

// ── ToggleButton ───────────────────────────────────────────────────────────

function ToggleButton({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
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

// ── CompletionScreen (項目5) ───────────────────────────────────────────────

function CompletionScreen({ total, onBack }: { total: number; onBack: () => void }) {
  useEffect(() => {
    fireConfetti()
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center"
      style={{ backgroundColor: 'var(--color-bg-page)' }}
    >
      <div className="text-6xl">🎉</div>
      <h1 className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
        Congrats!
      </h1>
      <p className="text-base" style={{ color: 'var(--color-text-secondary)' }}>
        You studied {total} card{total !== 1 ? 's' : ''}
      </p>
      <button
        type="button"
        onClick={onBack}
        className="rounded-xl px-8 py-3 font-medium text-base text-white transition-colors"
        style={{ backgroundColor: 'var(--color-primary)', minHeight: 44 }}
      >
        Back
      </button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export function StudyPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { cards, loading, toggleStar } = useCards(id ?? '')
  const study = useStudy(cards, id ?? '')

  const [isCompleted, setIsCompleted] = useState(false)
  const [navDirection, setNavDirection] = useState<'forward' | 'backward'>('forward')
  const dragStartX = useRef<number | null>(null)

  // Reset completion when filter/shuffle changes
  useEffect(() => {
    setIsCompleted(false)
  }, [study.filter, study.isShuffled])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext()
      else if (e.key === 'ArrowLeft') handlePrev()
      else if (e.key === ' ') { e.preventDefault(); study.flip() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const handleNext = () => {
    setNavDirection('forward')
    if (study.currentIndex === study.total - 1) {
      study.resetSavedPosition()
      setIsCompleted(true)
    } else {
      study.goNext()
    }
  }

  const handlePrev = () => {
    setNavDirection('backward')
    study.goPrev()
  }

  const handleSpeaker = () => {
    if (study.currentCard) {
      playArabicTTS(study.currentCard.arabic)
    }
  }

  const handleStarToggle = () => {
    if (study.currentCard) toggleStar(study.currentCard.id)
  }

  // ── Loading ──

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-page)' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  // ── Completion screen (項目5) ──

  if (isCompleted) {
    return <CompletionScreen total={study.total} onBack={() => navigate(-1)} />
  }

  // ── Empty ──

  if (study.total === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: 'var(--color-bg-page)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          {study.filter === 'starred' ? '星付きカードがありません' : 'カードがありません'}
        </p>
        <button type="button" onClick={() => navigate(-1)} className="underline text-sm" style={{ color: 'var(--color-primary)' }}>
          デッキに戻る
        </button>
      </div>
    )
  }

  // ── Main ──

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-page)' }}>

      {/* ── Top bar (項目1: × on right, no star) ── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 h-14"
        style={{ backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}
      >
        {/* Left spacer (same width as right button for centering) */}
        <div style={{ minWidth: 44 }} />

        {/* Progress */}
        <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
          {study.currentNumber} / {study.total}
        </span>

        {/* 項目1: × close button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="閉じる"
          className="flex items-center justify-center rounded-xl transition-colors"
          style={{ minWidth: 44, minHeight: 44, color: 'var(--color-text-secondary)' }}
        >
          <XIcon />
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div className="h-1 w-full" style={{ backgroundColor: 'var(--color-border)' }}>
        <div
          className="h-1 transition-all duration-300"
          style={{ width: `${(study.currentNumber / study.total) * 100}%`, backgroundColor: 'var(--color-primary)' }}
        />
      </div>

      {/* ── Card area ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-4 py-6"
        onTouchStart={e => { dragStartX.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          if (dragStartX.current === null) return
          const delta = e.changedTouches[0].clientX - dragStartX.current
          if (delta < -50) handleNext()
          else if (delta > 50) handlePrev()
          dragStartX.current = null
        }}
      >
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait" custom={navDirection} initial={false}>
            <motion.div
              key={`${study.currentIndex}-${study.displayMode}`}
              custom={navDirection}
              initial={(dir: string) => ({ opacity: 0, x: dir === 'forward' ? 60 : -60 })}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.18 } }}
              exit={(dir: string) => ({ opacity: 0, x: dir === 'forward' ? -60 : 60, transition: { duration: 0.12 } })}
            >
              {study.currentCard && study.displayMode === 'flip' && (
                <FlipCard
                  arabic={study.currentCard.arabic}
                  english={study.currentCard.english}
                  romanization={study.currentCard.romanization}
                  isFlipped={study.isFlipped}
                  isStarred={study.currentCard.is_starred}
                  onFlip={study.flip}
                  onSpeaker={handleSpeaker}
                  onToggleStar={handleStarToggle}
                />
              )}
              {study.currentCard && study.displayMode === 'both' && (
                <BothSidesCard
                  arabic={study.currentCard.arabic}
                  english={study.currentCard.english}
                  romanization={study.currentCard.romanization}
                  isStarred={study.currentCard.is_starred}
                  onSpeaker={handleSpeaker}
                  onToggleStar={handleStarToggle}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Arrow navigation ── */}
        <div className="flex items-center gap-8 mt-8">
          <button
            type="button"
            onClick={handlePrev}
            disabled={study.currentIndex === 0}
            aria-label="前のカード"
            className="flex items-center justify-center rounded-full transition-colors disabled:opacity-30"
            style={{ minWidth: 52, minHeight: 52, backgroundColor: 'var(--color-bg-card)', boxShadow: 'var(--shadow-card)', color: 'var(--color-text-primary)' }}
          >
            <ChevronLeft />
          </button>

          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {study.displayMode === 'flip' ? 'タップで裏返し' : 'スワイプでナビ'}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={false}
            aria-label="次のカード"
            className="flex items-center justify-center rounded-full transition-colors"
            style={{ minWidth: 52, minHeight: 52, backgroundColor: 'var(--color-bg-card)', boxShadow: 'var(--shadow-card)', color: 'var(--color-text-primary)' }}
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div
        className="flex items-center justify-center gap-3 px-4 py-4 flex-wrap"
        style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
      >
        <ToggleButton active={study.isShuffled} onClick={study.toggleShuffle}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
          </svg>
          シャッフル
        </ToggleButton>

        <ToggleButton
          active={study.displayMode === 'both'}
          onClick={() => study.setDisplayMode(study.displayMode === 'flip' ? 'both' : 'flip' as DisplayMode)}
        >
          {study.displayMode === 'flip' ? '裏返しモード' : '両面表示'}
        </ToggleButton>

        <ToggleButton
          active={study.filter === 'starred'}
          onClick={() => study.setFilter(study.filter === 'all' ? 'starred' : 'all' as CardFilter)}
        >
          <StarIcon filled={study.filter === 'starred'} size={15} />
          {study.filter === 'starred' ? '星付きのみ' : '全カード'}
        </ToggleButton>
      </div>
    </div>
  )
}
