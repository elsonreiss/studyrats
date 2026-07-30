import { useRef, useEffect, useState } from 'react'
import CameraCapture from './CameraCapture'

/**
 * Seletor de imagem com prévia.
 * "Tirar foto" abre a câmera de verdade dentro do app (getUserMedia);
 * "Escolher da galeria" abre o seletor de arquivos.
 */
export default function PhotoPicker({
  file,
  onChange,
  label = 'Foto',
  hint,
  aspect = 'aspect-[16/9]',
  currentUrl = null,
}) {
  const galleryRef = useRef()
  const [preview, setPreview] = useState(null)
  const [camera, setCamera] = useState(false)

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const shown = preview || currentUrl

  function pick(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f && f.type.startsWith('image/')) onChange(f)
  }

  function openGallery() {
    setCamera(false)
    galleryRef.current.click()
  }

  return (
    <>
      <div className="card-soft overflow-hidden">
        {shown ? (
          <div className="relative">
            <img src={shown} alt="Prévia" className={`w-full ${aspect} object-cover`} />
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                type="button"
                onClick={() => setCamera(true)}
                className="btn btn-sm bg-black/60 text-white backdrop-blur-md"
              >
                Refazer
              </button>
              <button
                type="button"
                onClick={openGallery}
                className="btn btn-sm bg-black/60 text-white backdrop-blur-md"
              >
                Galeria
              </button>
              {file && (
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="btn btn-sm bg-black/60 text-white backdrop-blur-md"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <h3 className="h2">{label}</h3>
            {hint && <p className="text-muted mt-2.5 max-w-sm mx-auto leading-relaxed">{hint}</p>}
            <div className="flex gap-3 justify-center mt-6 flex-wrap">
              <button type="button" onClick={() => setCamera(true)} className="btn btn-primary btn-sm">
                Tirar foto
              </button>
              <button type="button" onClick={openGallery} className="btn btn-ghost btn-sm">
                Escolher da galeria
              </button>
            </div>
          </div>
        )}
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      </div>

      <CameraCapture
        open={camera}
        onClose={() => setCamera(false)}
        onFallback={openGallery}
        onCapture={(f) => { setCamera(false); onChange(f) }}
      />
    </>
  )
}
