import { useEffect, useState } from 'react'

const KEY = 'studyrats-theme'
const listeners = new Set()

export function getTheme() {
  return localStorage.getItem(KEY) || 'auto'
}

export function setTheme(value) {
  const root = document.documentElement
  if (value === 'auto') {
    root.removeAttribute('data-theme')
    localStorage.removeItem(KEY)
  } else {
    root.setAttribute('data-theme', value)
    localStorage.setItem(KEY, value)
  }
  listeners.forEach((fn) => fn(value))
}

export function resolveDark(value = getTheme()) {
  if (value === 'dark') return true
  if (value === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Retorna [tema, definirTema, estaEscuro] e re-renderiza quando qualquer um muda. */
export function useTheme() {
  const [theme, setLocal] = useState(getTheme)
  const [dark, setDark] = useState(() => resolveDark())

  useEffect(() => {
    const onChange = (value) => {
      setLocal(value)
      setDark(resolveDark(value))
    }
    listeners.add(onChange)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystem = () => setDark(resolveDark())
    mq.addEventListener('change', onSystem)

    return () => {
      listeners.delete(onChange)
      mq.removeEventListener('change', onSystem)
    }
  }, [])

  return [theme, setTheme, dark]
}
