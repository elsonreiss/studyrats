import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const KEY = 'sr-install-dismissed'

export default function InstallPrompt() {
  const [evt, setEvt] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(KEY)) return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const onPrompt = (e) => {
      e.preventDefault()
      setEvt(e)
      setTimeout(() => setShow(true), 4000)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    localStorage.setItem(KEY, '1')
    setShow(false)
  }

  async function install() {
    setShow(false)
    evt.prompt()
    await evt.userChoice
    localStorage.setItem(KEY, '1')
  }

  if (!show || !evt) return null

  return createPortal(
    <div className="fixed bottom-24 sm:bottom-8 inset-x-0 z-[90] flex justify-center px-5">
      <div className="card p-5 shadow-2xl max-w-sm w-full rise flex items-center gap-4">
        <img src="/icon-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">Instalar o StudyRats</p>
          <p className="label mt-0.5">Abre como app, sem barra do navegador.</p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button onClick={install} className="btn btn-primary btn-sm">Instalar</button>
          <button onClick={dismiss} className="label hover:text-ink transition">agora não</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
