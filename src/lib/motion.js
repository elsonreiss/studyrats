import { useEffect, useRef, useState } from 'react'

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Observa todos os [data-reveal] dentro de `rootRef` e adiciona a classe `in`
 * quando entram na viewport. Reage a conteúdo carregado depois (fetch, abas).
 */
export function useRevealObserver(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    if (reduced()) {
      root.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('in'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    )

    const scan = () => {
      root.querySelectorAll('[data-reveal]:not(.in)').forEach((el) => io.observe(el))
    }

    scan()
    const mo = new MutationObserver(scan)
    mo.observe(root, { childList: true, subtree: true })

    return () => { io.disconnect(); mo.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Anima um número de 0 até `target` quando o elemento entra na tela. */
export function useCountUp(target, duration = 1100) {
  const ref = useRef(null)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const el = ref.current
    const end = Number(target) || 0

    if (!el || reduced()) { setValue(end); return }

    let raf
    let started = false

    const run = (t0) => {
      const step = (t) => {
        const p = Math.min(1, (t - t0) / duration)
        const eased = 1 - Math.pow(1 - p, 4)
        setValue(end * eased)
        if (p < 1) raf = requestAnimationFrame(step)
        else setValue(end)
      }
      raf = requestAnimationFrame(step)
    }

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started) {
          started = true
          run(performance.now())
          io.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    io.observe(el)

    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [target, duration])

  return [ref, value]
}
