import { createPortal } from 'react-dom'

export default function Toast({ message, ok = true }) {
  if (!message) return null

  return createPortal(
    <div className="fixed bottom-24 sm:bottom-8 inset-x-0 z-[100] flex justify-center px-5 pointer-events-none">
      <div
        className={`chip rise shadow-xl max-w-full ${ok ? '!text-brand' : '!text-red-500'}`}
        style={{ background: 'var(--s-card)', border: '1px solid var(--s-edge)' }}
      >
        {message}
      </div>
    </div>,
    document.body
  )
}
