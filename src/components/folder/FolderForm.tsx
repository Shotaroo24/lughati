import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'

interface FolderFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (name: string) => Promise<{ error: string | null }>
  title?: string
  submitLabel?: string
  initialName?: string
}

export function FolderForm({
  open,
  onClose,
  onSubmit,
  title = '新しいフォルダ',
  submitLabel = '作成する',
  initialName = '',
}: FolderFormProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const reset = () => { setName(initialName); setError(null) }

  const handleClose = () => {
    if (loading) return
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setLoading(true)
    const result = await onSubmit(name.trim())
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      reset()
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="folder-form-name"
          label="フォルダ名"
          placeholder="例: 日常会話"
          required
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          error={error ?? undefined}
        />
        <div className="flex gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button type="submit" fullWidth loading={loading} disabled={!name.trim()}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
