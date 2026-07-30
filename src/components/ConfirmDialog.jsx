import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onCancel])

  if (!open) return null

  // Portal direto no body: garante que o overlay use a viewport como referência,
  // independente de transforms em elementos pai.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5 backdrop-blur-md animate-[fade_.18s_ease-out]"
      style={{ background: 'var(--s-scrim)' }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-sm p-8 text-center shadow-2xl animate-[pop_.2s_cubic-bezier(.2,.9,.3,1.15)]"
      >
        <h2 className="h2">{title}</h2>
        {message && <p className="text-muted mt-3 leading-relaxed">{message}</p>}

        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn btn-ghost flex-1"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`btn flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
          >
            {loading ? 'Aguarde' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
