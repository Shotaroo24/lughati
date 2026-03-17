import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'

interface DeckFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (title: string, description?: string) => Promise<{ error: string | null }>
}

export function DeckForm({ open, onClose, onSubmit }: DeckFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)
    setLoading(true)
    const result = await onSubmit(title.trim(), description.trim() || undefined)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      reset()
      onClose()
    }
  }

  const reset = () => {
    setTitle('')
    setDescription('')
    setError(null)
  }

  const handleClose = () => {
    if (loading) return
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="新しいデッキを作成">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="deck-title"
          label="タイトル"
          placeholder="例: 日常会話"
          required
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          error={error ?? undefined}
        />

        <div className="flex flex-col gap-1">
          <label
            htmlFor="deck-description"
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            説明（任意）
          </label>
          <textarea
            id="deck-description"
            placeholder="このデッキの説明"
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="rounded-xl px-4 py-3 text-base w-full border outline-none transition-colors resize-none border-[#F0E8EB] focus:border-[#E8567F] placeholder:text-[#8C8C96]"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

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
            disabled={!title.trim()}
          >
            作成する
          </Button>
        </div>
      </form>
    </Modal>
  )
}
