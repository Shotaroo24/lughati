import { useState } from 'react'
import type { Card } from '../../types/database'
import { playArabicTTS } from '../../lib/tts'

// ── Icons ──────────────────────────────────────────────────────────────────

function SpeakerIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      fill={filled ? 'var(--color-accent)' : 'none'}
      stroke={filled ? 'var(--color-accent)' : 'currentColor'}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────

interface HeroCardProps {
  card: Card
  showRomanization: boolean
  onStudy: () => void
  onEdit: () => void
  onToggleStar: (id: string) => Promise<void>
}

export function HeroCard({ card, showRomanization, onStudy, onEdit, onToggleStar }: HeroCardProps) {
  const [speaking, setSpeaking] = useState(false)

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (speaking) return
    setSpeaking(true)
    await playArabicTTS(card.audio_url, card.arabic).finally(() => setSpeaking(false))
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit()
  }

  const handleStar = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleStar(card.id)
  }

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-150 mb-5"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        boxShadow: 'var(--shadow-card)',
        background: 'linear-gradient(135deg, var(--color-bg-card) 0%, var(--color-bg-page) 100%)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
      onClick={onStudy}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onStudy()}
      aria-label="タップして学習を開始"
    >
      {/* Top action bar */}
      <div className="flex items-center justify-end gap-1 px-4 pt-4">
        <button
          type="button"
          aria-label="音声を再生"
          className="flex items-center justify-center rounded-xl transition-colors hover:bg-[var(--color-primary-light)]"
          style={{
            minWidth: 44, minHeight: 44,
            color: speaking ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          }}
          onClick={handleSpeak}
        >
          <SpeakerIcon playing={speaking} />
        </button>
        <button
          type="button"
          aria-label="カードを編集"
          className="flex items-center justify-center rounded-xl transition-colors hover:bg-[var(--color-primary-light)]"
          style={{ minWidth: 44, minHeight: 44, color: 'var(--color-text-secondary)' }}
          onClick={handleEdit}
        >
          <EditIcon />
        </button>
        <button
          type="button"
          aria-label={card.is_starred ? 'スターを外す' : 'スターを付ける'}
          className="flex items-center justify-center rounded-xl transition-colors hover:bg-[var(--color-primary-light)]"
          style={{ minWidth: 44, minHeight: 44, color: 'var(--color-text-secondary)' }}
          onClick={handleStar}
        >
          <StarIcon filled={card.is_starred} />
        </button>
      </div>

      {/* Card content */}
      <div className="px-6 pt-3 pb-6 flex flex-col items-center gap-3">
        {/* Arabic */}
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
          {card.arabic}
        </p>

        <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />

        {/* English */}
        <p
          className="text-center text-lg"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {card.english}
        </p>

        {/* Romanization */}
        {showRomanization && card.romanization && (
          <p
            className="text-sm italic text-center"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {card.romanization}
          </p>
        )}
      </div>

      {/* Study CTA strip */}
      <div
        className="px-6 py-3 flex items-center justify-center gap-2 text-sm font-medium"
        style={{
          backgroundColor: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        タップして学習スタート
      </div>
    </div>
  )
}
