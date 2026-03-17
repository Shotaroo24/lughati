import { useState, useEffect } from 'react'
import type { Card } from '../../types/database'
import type { CardInput } from '../../hooks/useCards'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'

interface CardFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CardInput) => Promise<{ error: string | null }>
  initialValues?: Pick<Card, 'arabic' | 'english' | 'romanization'>
}

export function CardForm({ open, onClose, onSubmit, initialValues }: CardFormProps) {
  const [arabic, setArabic] = useState('')
  const [english, setEnglish] = useState('')
  const [romanization, setRomanization] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setArabic(initialValues?.arabic ?? '')
      setEnglish(initialValues?.english ?? '')
      setRomanization(initialValues?.romanization ?? '')
      setError(null)
    }
  }, [open, initialValues])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!arabic.trim() || !english.trim()) return
    setError(null)
    setLoading(true)
    const result = await onSubmit({
      arabic: arabic.trim(),
      english: english.trim(),
      romanization: romanization.trim() || undefined,
    })
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      onClose()
    }
  }

  const handleClose = () => {
    if (loading) return
    onClose()
  }

  const isEdit = !!initialValues

  return (
    <Modal open={open} onClose={handleClose} title={isEdit ? 'カードを編集' : '新しいカードを追加'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Arabic input — RTL */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="card-arabic"
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            アラビア語
          </label>
          <input
            id="card-arabic"
            dir="rtl"
            placeholder="مثال: مرحبا"
            required
            autoFocus
            value={arabic}
            onChange={e => setArabic(e.target.value)}
            className="rounded-xl px-4 py-3 text-xl w-full border outline-none transition-colors border-[#F0E8EB] focus:border-[#E8567F] placeholder:text-[#8C8C96]"
            style={{
              fontFamily: 'var(--font-arabic)',
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <Input
          id="card-english"
          label="英語"
          placeholder="e.g. Hello"
          required
          value={english}
          onChange={e => setEnglish(e.target.value)}
        />

        <Input
          id="card-romanization"
          label="ローマ字（任意）"
          placeholder="e.g. marhaba"
          value={romanization}
          onChange={e => setRomanization(e.target.value)}
          error={error ?? undefined}
        />

        <div className="flex gap-3 mt-1">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={handleClose}
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={!arabic.trim() || !english.trim()}
          >
            {isEdit ? '保存する' : '追加する'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
