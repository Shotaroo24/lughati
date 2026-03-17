import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Prevent background scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl p-6"
        style={{ backgroundColor: 'var(--color-bg-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <h2
            className="text-lg font-semibold mb-5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  )
}
