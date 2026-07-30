import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

const ITEM = 46          // altura de cada linha
const VISIBLE = 5        // linhas visíveis
const PAD = ((VISIBLE - 1) / 2) * ITEM

function Wheel({ values, value, onChange, suffix }) {
  const ref = useRef(null)
  const timer = useRef(null)
  const [active, setActive] = useState(values.indexOf(value))

  // posiciona no valor atual ao abrir
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const i = Math.max(0, values.indexOf(value))
    el.scrollTop = i * ITEM
    setActive(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onScroll() {
    const el = ref.current
    if (!el) return
    const i = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ITEM)))
    setActive(i)

    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      onChange(values[i])
      // encaixa exatamente na linha
      el.scrollTo({ top: i * ITEM, behavior: 'smooth' })
    }, 110)
  }

  function jump(i) {
    ref.current?.scrollTo({ top: i * ITEM, behavior: 'smooth' })
    setActive(i)
    onChange(values[i])
  }

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto no-scrollbar"
      style={{
        height: VISIBLE * ITEM,
        scrollSnapType: 'y mandatory',
        paddingTop: PAD,
        paddingBottom: PAD,
        maskImage: 'linear-gradient(transparent, #000 22%, #000 78%, transparent)',
        WebkitMaskImage: 'linear-gradient(transparent, #000 22%, #000 78%, transparent)',
      }}
    >
      {values.map((v, i) => {
        const dist = Math.abs(i - active)
        return (
          <button
            key={v}
            type="button"
            onClick={() => jump(i)}
            className="w-full block num transition-all duration-200"
            style={{
              height: ITEM,
              scrollSnapAlign: 'center',
              fontSize: dist === 0 ? '1.6rem' : dist === 1 ? '1.25rem' : '1.05rem',
              fontWeight: dist === 0 ? 600 : 400,
              opacity: dist === 0 ? 1 : dist === 1 ? 0.5 : 0.26,
              color: dist === 0 ? 'var(--s-ink)' : 'var(--s-muted)',
            }}
          >
            {v} <span style={{ fontSize: '0.7em', opacity: 0.7 }}>{suffix}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function DurationPicker({ open, hours, minutes, onConfirm, onClose }) {
  const [h, setH] = useState(hours)
  const [m, setM] = useState(minutes)

  useEffect(() => {
    if (!open) return
    setH(hours)
    setM(minutes)
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, hours, minutes, onClose])

  if (!open) return null

  const HOURS = Array.from({ length: 25 }, (_, i) => i)
  const MINUTES = Array.from({ length: 60 }, (_, i) => i)

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center backdrop-blur-md animate-[fade_.2s_ease-out]"
      style={{ background: 'var(--s-scrim)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm shadow-2xl animate-[sheet_.28s_cubic-bezier(.2,.9,.3,1.05)] sm:animate-[pop_.22s_cubic-bezier(.2,.9,.3,1.12)]"
        style={{
          background: 'var(--s-card)',
          borderTopLeftRadius: '1.5rem',
          borderTopRightRadius: '1.5rem',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-edge">
          <button type="button" onClick={onClose} className="text-muted hover:text-ink transition text-[15px]">
            Cancelar
          </button>
          <span className="label">Duração</span>
          <button
            type="button"
            onClick={() => { onConfirm(h, m); onClose() }}
            className="text-brand font-semibold text-[15px]"
          >
            OK
          </button>
        </div>

        <div className="relative px-6 py-4">
          {/* faixa de seleção */}
          <div
            className="absolute left-5 right-5 rounded-xl pointer-events-none"
            style={{
              height: ITEM,
              top: `calc(1rem + ${PAD}px)`,
              background: 'var(--s-card-2)',
            }}
          />

          <div className="relative flex gap-2">
            <Wheel values={HOURS} value={h} onChange={setH} suffix="h" />
            <Wheel values={MINUTES} value={m} onChange={setM} suffix="min" />
          </div>
        </div>

        <div className="pb-5 sm:pb-4" />
      </div>
    </div>,
    document.body
  )
}
