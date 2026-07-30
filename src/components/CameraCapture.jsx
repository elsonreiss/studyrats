import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * Câmera em tela cheia, dentro do app.
 * O visor mostra o quadro inteiro (sem corte) e a foto sai exatamente igual ao visor.
 */
export default function CameraCapture({ open, onCapture, onClose, onFallback }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [facing, setFacing] = useState('environment')
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const [flash, setFlash] = useState(false)
  const [multi, setMulti] = useState(false)
  const [torch, setTorch] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setReady(false)
    setHasTorch(false)
    setTorch(false)
  }, [])

  const start = useCallback(async (mode) => {
    setError(null)
    setReady(false)
    stop()

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador não expõe a câmera. Escolha uma foto da galeria.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1920 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setReady(true)

      const track = stream.getVideoTracks()[0]
      setHasTorch(!!track?.getCapabilities?.().torch)

      const devices = await navigator.mediaDevices.enumerateDevices()
      setMulti(devices.filter((d) => d.kind === 'videoinput').length > 1)
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Permissão de câmera negada. Libere nas configurações do navegador ou escolha da galeria.')
      } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
        setError('Nenhuma câmera encontrada. Escolha uma foto da galeria.')
      } else {
        setError('Não foi possível abrir a câmera. Escolha uma foto da galeria.')
      }
    }
  }, [stop])

  useEffect(() => {
    if (!open) { stop(); return }
    start(facing)
    return stop
  }, [open, facing, start, stop])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch }] })
      setTorch(!torch)
    } catch {
      setHasTorch(false)
    }
  }

  function shoot() {
    const video = videoRef.current
    if (!video || !ready) return

    setFlash(true)
    setTimeout(() => setFlash(false), 200)

    // captura o quadro completo do sensor, igual ao que aparece no visor
    const w = video.videoWidth
    const h = video.videoHeight
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    if (facing === 'user') {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, w, h)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        stop()
        onCapture?.(new File([blob], `checkin-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92
    )
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-black flex flex-col animate-[fade_.2s_ease-out]">
      {/* fechar */}
      <div className="shrink-0 px-4 pt-4 pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="w-10 h-10 grid place-items-center text-white/90 hover:text-white transition"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[1.8]">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
        <span className="text-white/50 text-[13px]">Foto do estudo</span>
        <span className="w-10" />
      </div>

      {/* visor — mostra o quadro inteiro, sem cortar */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="max-w-full max-h-full w-auto h-auto"
          style={{ transform: facing === 'user' ? 'scaleX(-1)' : 'none' }}
        />

        {!ready && !error && (
          <p className="absolute text-white/50 text-sm">Abrindo a câmera</p>
        )}

        {error && (
          <div className="absolute inset-0 grid place-items-center px-8 text-center bg-black">
            <div>
              <p className="text-white/90 leading-relaxed max-w-xs mx-auto">{error}</p>
              <button
                type="button"
                onClick={() => { stop(); onFallback?.() }}
                className="btn btn-primary mt-7"
              >
                Escolher da galeria
              </button>
            </div>
          </div>
        )}

        {flash && <div className="absolute inset-0 bg-white pointer-events-none" />}
      </div>

      {/* controles */}
      <div className="shrink-0 pb-8 pt-6">
        <div className="grid grid-cols-3 items-center px-10 max-w-md mx-auto">
          {/* lanterna */}
          <div className="flex justify-start">
            {hasTorch ? (
              <button
                type="button"
                onClick={toggleTorch}
                aria-label="Lanterna"
                className={`w-11 h-11 grid place-items-center rounded-full transition ${
                  torch ? 'bg-white text-black' : 'text-white/85 hover:text-white'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[1.6]">
                  <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z" />
                  {!torch && <path d="M3 3l18 18" />}
                </svg>
              </button>
            ) : (
              <span className="w-11" />
            )}
          </div>

          {/* disparo */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={shoot}
              disabled={!ready}
              aria-label="Tirar foto"
              className="w-[78px] h-[78px] rounded-full grid place-items-center transition-transform duration-200 active:scale-90 disabled:opacity-40"
              style={{ border: '4px solid #fff' }}
            >
              <span className="w-[60px] h-[60px] rounded-full bg-white" />
            </button>
          </div>

          {/* virar câmera */}
          <div className="flex justify-end">
            {multi ? (
              <button
                type="button"
                onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
                aria-label="Virar câmera"
                className="w-11 h-11 grid place-items-center text-white/85 hover:text-white transition"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[1.6]">
                  <path d="M20.5 12a8.5 8.5 0 0 1-14.3 6.2M3.5 12a8.5 8.5 0 0 1 14.3-6.2" />
                  <path d="M3.2 8.4v-4h4M20.8 15.6v4h-4" />
                </svg>
              </button>
            ) : (
              <span className="w-11" />
            )}
          </div>
        </div>

        {/* galeria */}
        <button
          type="button"
          onClick={() => { stop(); onFallback?.() }}
          className="flex items-center gap-2.5 text-white/70 hover:text-white transition mt-7 ml-10"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[1.5]">
            <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
            <circle cx="8.5" cy="10" r="1.6" />
            <path d="m4 17 5-4.5 4.5 4 3-2.5L20 18" />
          </svg>
          <span className="text-[15px]">Da galeria</span>
        </button>
      </div>
    </div>,
    document.body
  )
}
