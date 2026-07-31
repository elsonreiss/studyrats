import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import RunningRat from './RunningRat'
import { FlameIcon } from './Streak'

/**
 * Comemoração ao publicar um check-in: o ratinho atravessa a tela correndo
 * e a sequência aparece atualizada. Fecha o ciclo de recompensa.
 */
export default function CheckinCelebration({ open, streak = 0, onDone, duration = 2100 }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!open) return
    setShow(true)
    document.body.style.overflow = 'hidden'

    // guard: sem ele, tocar na tela e o tempo acabar disparavam onDone
    // duas vezes, empilhando duas navegações
    let done = false
    const finish = () => {
      if (done) return
      done = true
      setShow(false)
      document.body.style.overflow = ''
      onDone?.()
    }

    const t = setTimeout(finish, duration)
    return () => {
      clearTimeout(t)
      done = true
      document.body.style.overflow = ''
    }
  }, [open, duration, onDone])

  if (!open || !show) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex flex-col items-center justify-center overflow-hidden animate-[fade_.2s_ease-out]"
      style={{ background: 'var(--s-surface)' }}
      onClick={onDone}
    >
      {/* o rato atravessando */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none">
        <div className="rat-dash flex items-center gap-1 w-fit">
          <span className="rat-dust w-10 space-y-1.5 text-brand" aria-hidden="true">
            <span /><span /><span />
          </span>
          <RunningRat size={88} />
        </div>
        <span
          className="block mx-auto rounded-full mt-2"
          style={{ width: '78%', height: 2, background: 'var(--s-edge)' }}
        />
      </div>

      {/* mensagem */}
      <div className="relative text-center px-6 mt-56 rise">
        <p className="h1">Check-in registrado.</p>
        {streak > 0 && (
          <p className="flame text-2xl font-semibold justify-center mt-5">
            <FlameIcon size={28} />
            <span className="num">{streak}</span>
            <span className="text-muted text-base font-normal">
              {streak === 1 ? 'dia seguido' : 'dias seguidos'}
            </span>
          </p>
        )}
      </div>
    </div>,
    document.body
  )
}
