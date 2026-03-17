import { useState, useMemo } from 'react'
import type { CardInput } from '../../hooks/useCards'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

// ── Delimiter config ───────────────────────────────────────────────────────

type DelimOption = 'tab' | 'comma' | 'newline' | 'semicolon' | 'custom'

const WORD_DELIMS: { value: DelimOption; label: string; char: string }[] = [
  { value: 'tab', label: 'Tab', char: '\t' },
  { value: 'comma', label: 'Comma (,)', char: ',' },
  { value: 'custom', label: 'Custom', char: '' },
]

const CARD_DELIMS: { value: DelimOption; label: string; char: string }[] = [
  { value: 'newline', label: 'New line', char: '\n' },
  { value: 'semicolon', label: 'Semicolon (;)', char: ';' },
  { value: 'custom', label: 'Custom', char: '' },
]

// ── Parser ────────────────────────────────────────────────────────────────

function parseText(
  text: string,
  wordDelimChar: string,
  cardDelimChar: string
): CardInput[] {
  if (!wordDelimChar || !cardDelimChar) return []
  const lines = text.split(cardDelimChar).map(l => l.trim()).filter(Boolean)
  return lines
    .map(line => {
      const parts = line.split(wordDelimChar)
      return {
        arabic: parts[0]?.trim() ?? '',
        english: parts[1]?.trim() ?? '',
        romanization: parts[2]?.trim() || undefined,
      }
    })
    .filter(c => c.arabic && c.english)
}

// ── Component ─────────────────────────────────────────────────────────────

interface BulkImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (cards: CardInput[]) => Promise<{ error: string | null; count: number }>
}

export function BulkImportModal({ open, onClose, onImport }: BulkImportModalProps) {
  const [text, setText] = useState('')
  const [wordDelim, setWordDelim] = useState<DelimOption>('tab')
  const [cardDelim, setCardDelim] = useState<DelimOption>('newline')
  const [wordCustom, setWordCustom] = useState('')
  const [cardCustom, setCardCustom] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ count: number; error: string | null } | null>(null)

  const wordDelimChar = wordDelim === 'custom' ? wordCustom : (WORD_DELIMS.find(d => d.value === wordDelim)?.char ?? '\t')
  const cardDelimChar = cardDelim === 'custom' ? cardCustom : (CARD_DELIMS.find(d => d.value === cardDelim)?.char ?? '\n')

  const preview = useMemo(
    () => parseText(text, wordDelimChar, cardDelimChar),
    [text, wordDelimChar, cardDelimChar]
  )

  const handleImport = async () => {
    if (preview.length === 0) return
    setLoading(true)
    const res = await onImport(preview)
    setLoading(false)
    setResult(res)
    if (!res.error) {
      // Auto-close after success
      setTimeout(() => {
        setText('')
        setResult(null)
        onClose()
      }, 1200)
    }
  }

  const handleClose = () => {
    if (loading) return
    setText('')
    setResult(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="カードを一括インポート">
      <div className="flex flex-col gap-4">

        {/* Textarea */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            テキストを貼り付け
          </label>
          <textarea
            rows={6}
            placeholder={'مرحبا\tHello\tmarhaba\nشكرا\tThank you\tshukran'}
            value={text}
            onChange={e => { setText(e.target.value); setResult(null) }}
            className="rounded-xl px-4 py-3 text-sm w-full border outline-none transition-colors resize-none border-[#F0E8EB] focus:border-[#E8567F] placeholder:text-[#8C8C96] font-mono"
            style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
          />
        </div>

        {/* Delimiter selectors */}
        <div className="grid grid-cols-2 gap-3">
          {/* Word delimiter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              単語と定義の区切り
            </label>
            <div className="flex flex-col gap-1">
              {WORD_DELIMS.map(d => (
                <label key={d.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="word-delim"
                    value={d.value}
                    checked={wordDelim === d.value}
                    onChange={() => setWordDelim(d.value)}
                    className="accent-[#E8567F]"
                  />
                  {d.label}
                </label>
              ))}
              {wordDelim === 'custom' && (
                <input
                  type="text"
                  placeholder="区切り文字"
                  value={wordCustom}
                  onChange={e => setWordCustom(e.target.value)}
                  className="rounded-lg px-2 py-1 text-sm border outline-none border-[#F0E8EB] focus:border-[#E8567F] mt-1"
                  style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
                />
              )}
            </div>
          </div>

          {/* Card delimiter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              カードの区切り
            </label>
            <div className="flex flex-col gap-1">
              {CARD_DELIMS.map(d => (
                <label key={d.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="card-delim"
                    value={d.value}
                    checked={cardDelim === d.value}
                    onChange={() => setCardDelim(d.value)}
                    className="accent-[#E8567F]"
                  />
                  {d.label}
                </label>
              ))}
              {cardDelim === 'custom' && (
                <input
                  type="text"
                  placeholder="区切り文字"
                  value={cardCustom}
                  onChange={e => setCardCustom(e.target.value)}
                  className="rounded-lg px-2 py-1 text-sm border outline-none border-[#F0E8EB] focus:border-[#E8567F] mt-1"
                  style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        {text.trim() && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              backgroundColor: preview.length > 0 ? 'var(--color-primary-light)' : 'var(--color-danger-light)',
              color: preview.length > 0 ? 'var(--color-primary)' : 'var(--color-danger)',
            }}
          >
            {preview.length > 0 ? (
              <>
                <span className="font-medium">Preview: {preview.length} cards</span>
                <ul className="mt-1 space-y-0.5 opacity-80">
                  {preview.slice(0, 3).map((c, i) => (
                    <li key={i} className="truncate">
                      {c.arabic} → {c.english}
                      {c.romanization ? ` (${c.romanization})` : ''}
                    </li>
                  ))}
                  {preview.length > 3 && <li>…他 {preview.length - 3} 件</li>}
                </ul>
              </>
            ) : (
              'パースできるカードがありません。区切り文字を確認してください。'
            )}
          </div>
        )}

        {/* Result */}
        {result && !result.error && (
          <div
            className="rounded-xl px-4 py-3 text-sm font-medium"
            style={{ backgroundColor: '#E6F7F0', color: 'var(--color-success)' }}
          >
            {result.count}枚のカードをインポートしました ✓
          </div>
        )}
        {result?.error && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
          >
            {result.error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button
            type="button"
            fullWidth
            loading={loading}
            disabled={preview.length === 0}
            onClick={handleImport}
          >
            インポート（{preview.length}枚）
          </Button>
        </div>
      </div>
    </Modal>
  )
}
