import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useAnimation, type TargetAndTransition } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useCards } from '../hooks/useCards'
import { useStudy } from '../hooks/useStudy'
import { useProfile } from '../hooks/useProfile'
import { playArabicTTS, stopArabicTTS, prefetchArabicTTS } from '../lib/tts'
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

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
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

function SpinnerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2a10 10 0 1010 10" />
    </svg>
  )
}

// ── SpeakerButton ──────────────────────────────────────────────────────────

type SpeakerState = 'idle' | 'loading' | 'playing'

function SpeakerButton({ speakerState, onPress }: {
  speakerState: SpeakerState
  onPress: () => void
}) {
  const isPlaying = speakerState === 'playing'
  const isLoading = speakerState === 'loading'

  return (
    <motion.button
      type="button"
      aria-label="発音を聞く"
      onClick={e => { e.stopPropagation(); onPress() }}
      whileTap={{ scale: 0.85 }}
      className="flex items-center justify-center rounded-full relative overflow-hidden"
      style={{
        minWidth: 44,
        minHeight: 44,
        color: 'var(--color-primary)',
        backgroundColor: isPlaying ? 'var(--color-primary-alpha-12)' : 'var(--color-primary-light)',
        transition: 'background-color 0.15s, color 0.15s',
      }}
    >
      {isPlaying && (
        <motion.span
          className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.8], opacity: [0.25, 0] }}
          transition={{ repeat: Infinity, duration: 1.0, ease: 'easeOut' }}
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
      )}
      {isLoading ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          style={{ display: 'flex' }}
        >
          <SpinnerIcon />
        </motion.span>
      ) : (
        <SpeakerIcon />
      )}
    </motion.button>
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

interface FlipCardProps {
  arabic: string
  english: string
  romanization: string | null
  isFlipped: boolean
  isStarred: boolean
  showRomanization: boolean
  speakerState: SpeakerState
  onFlip: () => void
  onSpeaker: () => void
  onToggleStar: () => void
}

const FLIP_DURATION = 0.3

function FlipCard({
  arabic, english, romanization,
  isFlipped, isStarred, showRomanization,
  speakerState, onFlip, onSpeaker, onToggleStar,
}: FlipCardProps) {
  const controls = useAnimation()
  const [faceContent, setFaceContent] = useState<'front' | 'back'>('front')
  const [isAnimating, setIsAnimating] = useState(false)
  const prevIsFlipped = useRef<boolean | null>(null)

  useEffect(() => {
    if (prevIsFlipped.current === null) {
      prevIsFlipped.current = isFlipped
      return
    }
    if (prevIsFlipped.current === isFlipped) return
    prevIsFlipped.current = isFlipped

    setIsAnimating(true)
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
      style={{ perspective: '2000px', minHeight: 400 }}
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
          minHeight: 400,
          willChange: isAnimating ? 'transform' : 'auto',
        }}
      >
        {faceContent === 'front' ? (
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
                fontSize: 44,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                textRendering: 'optimizeLegibility',
              }}
            >
              {arabic}
            </p>

            <SpeakerButton speakerState={speakerState} onPress={onSpeaker} />

            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              タップして裏返す
            </p>
          </div>
        ) : (
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
                fontSize: 32,
                color: 'var(--color-text-primary)',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                textRendering: 'optimizeLegibility',
              }}
            >
              {english}
            </p>
            {showRomanization && romanization && (
              <p
                className="text-center italic"
                style={{ fontSize: 16, color: 'var(--color-text-secondary)' }}
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

// ── BothSidesCard ──────────────────────────────────────────────────────────

interface BothSidesCardProps {
  arabic: string
  english: string
  romanization: string | null
  isStarred: boolean
  showRomanization: boolean
  speakerState: SpeakerState
  onSpeaker: () => void
  onToggleStar: () => void
}

function BothSidesCard({
  arabic, english, romanization,
  isStarred, showRomanization,
  speakerState, onSpeaker, onToggleStar,
}: BothSidesCardProps) {
  return (
    <div
      className="w-full rounded-2xl p-8 flex flex-col items-center gap-5 relative"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        boxShadow: 'var(--shadow-card-hover)',
        minHeight: 400,
      }}
    >
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
            fontSize: 44,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          }}
        >
          {arabic}
        </p>
        <SpeakerButton speakerState={speakerState} onPress={onSpeaker} />
      </div>

      <div className="w-full h-px" style={{ backgroundColor: 'var(--color-border)' }} />

      <div className="flex flex-col items-center gap-1 flex-1 justify-center">
        <p
          className="text-center"
          style={{
            fontSize: 30,
            color: 'var(--color-text-primary)',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          }}
        >
          {english}
        </p>
        {showRomanization && romanization && (
          <p className="text-center italic" style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>
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

// ── StudySettingsModal ─────────────────────────────────────────────────────

function StudySettingsModal({
  open,
  onClose,
  auto_play,
  show_romanization,
  onUpdate,
}: {
  open: boolean
  onClose: () => void
  auto_play: boolean
  show_romanization: boolean
  onUpdate: (changes: Partial<{ auto_play: boolean; show_romanization: boolean }>) => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl animate-fade-in"
        style={{ backgroundColor: 'var(--color-bg-card)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pb-6 pt-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>設定</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center rounded-xl"
              style={{ minWidth: 44, minHeight: 44, color: 'var(--color-text-secondary)' }}
            >
              <XIcon />
            </button>
          </div>

          {/* Auto-play */}
          <div
            className="flex items-center justify-between py-3 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="text-base" style={{ color: 'var(--color-text-primary)' }}>自動再生</span>
            <button
              type="button"
              role="switch"
              aria-checked={auto_play}
              onClick={() => onUpdate({ auto_play: !auto_play })}
              className="relative flex-shrink-0 rounded-full transition-colors"
              style={{ width: 48, height: 28, backgroundColor: auto_play ? 'var(--color-primary)' : 'var(--color-border)' }}
            >
              <span
                className="absolute top-0.5 bg-white rounded-full transition-transform"
                style={{ left: 2, width: 24, height: 24, transform: auto_play ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>

          {/* Romanization */}
          <div
            className="flex items-center justify-between py-3 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="text-base" style={{ color: 'var(--color-text-primary)' }}>ローマ字表示</span>
            <button
              type="button"
              role="switch"
              aria-checked={show_romanization}
              onClick={() => onUpdate({ show_romanization: !show_romanization })}
              className="relative flex-shrink-0 rounded-full transition-colors"
              style={{ width: 48, height: 28, backgroundColor: show_romanization ? 'var(--color-primary)' : 'var(--color-border)' }}
            >
              <span
                className="absolute top-0.5 bg-white rounded-full transition-transform"
                style={{ left: 2, width: 24, height: 24, transform: show_romanization ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>

          {/* Keyboard shortcuts */}
          <div className="pt-4 mt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              キーボードショートカット
            </p>
            <div className="flex flex-col gap-2">
              {([
                ['← →', 'カード移動'],
                ['↑ ↓ / スペース', '裏返し'],
                ['S', '星マーク'],
                ['A', '発音再生'],
              ] as [string, string][]).map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{desc}</span>
                  <kbd
                    className="text-xs px-2 py-0.5 rounded-md font-mono"
                    style={{
                      backgroundColor: 'var(--color-primary-light)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── CompletionScreen ───────────────────────────────────────────────────────

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
  const { auto_play, show_romanization, update } = useProfile()

  const [isCompleted, setIsCompleted] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [speakerState, setSpeakerState] = useState<SpeakerState>('idle')
  // useRef for direction so exit animation always reads the latest value synchronously
  const navDirectionRef = useRef<'forward' | 'backward'>('forward')
  const dragStartX = useRef<number | null>(null)
  // Refs for keyboard handler — always point to the latest function to avoid stale closures
  const handleStarToggleRef = useRef<() => void>(() => {})
  const handleSpeakerRef = useRef<() => void>(() => {})

  // Reset completion when filter/shuffle changes
  useEffect(() => {
    setIsCompleted(false)
  }, [study.filter, study.isShuffled])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (settingsOpen || isCompleted) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight') handleNext()
      else if (e.key === 'ArrowLeft') handlePrev()
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); study.flip() }
      else if (e.key === ' ') { e.preventDefault(); study.flip() }
      else if (e.key === 's' || e.key === 'S') handleStarToggleRef.current()
      else if (e.key === 'a' || e.key === 'A') handleSpeakerRef.current()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [settingsOpen, isCompleted, study.flip, study.currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    navDirectionRef.current = 'forward'
    stopArabicTTS()
    setSpeakerState('idle')
    if (study.currentIndex === study.total - 1) {
      study.resetSavedPosition()
      setIsCompleted(true)
    } else {
      study.goNext()
    }
  }

  const handlePrev = () => {
    navDirectionRef.current = 'backward'
    stopArabicTTS()
    setSpeakerState('idle')
    study.goPrev()
  }

  // Auto-play: trigger TTS when card changes if setting is on
  const currentCardId = study.currentCard?.id
  const currentArabic = study.currentCard?.arabic
  useEffect(() => {
    if (auto_play && study.currentCard) {
      setSpeakerState('loading')
      playArabicTTS(study.currentCard.audio_url, study.currentCard.arabic, () => setSpeakerState('playing'))
        .finally(() => setSpeakerState('idle'))
    }
  }, [currentCardId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch audio for the next 2 cards in study order so auto-play has no loading delay
  useEffect(() => {
    const nextCards = study.studyCards.slice(study.currentIndex + 1, study.currentIndex + 3)
    nextCards.forEach(card => {
      void prefetchArabicTTS(card.audio_url, card.arabic)
    })
  }, [study.currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSpeaker = () => {
    if (!study.currentCard) return
    setSpeakerState('loading')
    playArabicTTS(study.currentCard.audio_url, study.currentCard.arabic, () => setSpeakerState('playing'))
      .finally(() => setSpeakerState('idle'))
  }

  const handleStarToggle = () => {
    if (study.currentCard) toggleStar(study.currentCard.id)
  }

  // Keep refs up-to-date every render so the keyboard handler never has a stale closure
  handleStarToggleRef.current = handleStarToggle
  handleSpeakerRef.current = handleSpeaker

  // ── Loading ──

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-page)' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  // ── Completion screen ──

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

      {/* ── Top bar ── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 h-14"
        style={{ backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}
      >
        {/* Settings gear (left) */}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="設定"
          className="flex items-center justify-center rounded-xl transition-colors"
          style={{ minWidth: 44, minHeight: 44, color: 'var(--color-text-secondary)' }}
        >
          <GearIcon />
        </button>

        {/* Progress */}
        <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
          {study.currentNumber} / {study.total}
        </span>

        {/* Close button (right) */}
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
        <div className="w-full max-w-[800px]">
          {/* Pass navDirectionRef as custom so exit animation always reads the latest direction synchronously */}
          <AnimatePresence mode="wait" custom={navDirectionRef} initial={false}>
            <motion.div
              key={`${study.currentIndex}-${study.displayMode}`}
              custom={navDirectionRef}
              initial={((ref: React.MutableRefObject<'forward' | 'backward'>) => ({
                opacity: 0,
                x: ref.current === 'forward' ? 60 : -60,
              })) as unknown as TargetAndTransition}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.18 } }}
              exit={((ref: React.MutableRefObject<'forward' | 'backward'>) => ({
                opacity: 0,
                x: ref.current === 'forward' ? -60 : 60,
                transition: { duration: 0.12 },
              })) as unknown as TargetAndTransition}
            >
              {study.currentCard && study.displayMode === 'flip' && (
                <FlipCard
                  arabic={study.currentCard.arabic}
                  english={study.currentCard.english}
                  romanization={study.currentCard.romanization}
                  isFlipped={study.isFlipped}
                  isStarred={study.currentCard.is_starred}
                  showRomanization={show_romanization}
                  speakerState={speakerState}
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
                  showRomanization={show_romanization}
                  speakerState={speakerState}
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

      {/* ── Settings modal ── */}
      <StudySettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        auto_play={auto_play}
        show_romanization={show_romanization}
        onUpdate={update}
      />
    </div>
  )
}
