import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Leva a tela para o topo a cada troca de página.
 * Também desliga a restauração automática do navegador, que era o motivo
 * de o app abrir no meio do feed quando a pessoa recarregava ou voltava.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
