import { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { myPhotoUsage, purgeOldPhotos, fmtBytes, PHOTO_RETENTION_DAYS } from '../lib/cleanup'

export default function StorageUsage({ onCleaned }) {
  const { user } = useAuth()
  const [usage, setUsage] = useState(null)
  const [cleaning, setCleaning] = useState(false)
  const [msg, setMsg] = useState(null)

  async function refresh() {
    setUsage(await myPhotoUsage(user.id))
  }

  useEffect(() => { refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function clean() {
    setCleaning(true)
    setMsg(null)
    const n = await purgeOldPhotos(user.id)
    await refresh()
    setCleaning(false)
    setMsg(
      n === 0
        ? 'Nenhuma foto passou do prazo ainda.'
        : `${n} ${n === 1 ? 'foto antiga removida' : 'fotos antigas removidas'}.`
    )
    if (n > 0) onCleaned?.()
    setTimeout(() => setMsg(null), 4000)
  }

  return (
    <div className="card-soft p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold">Espaço das suas fotos</h3>
          <p className="text-sm text-muted mt-1 max-w-sm leading-relaxed">
            Fotos com mais de {PHOTO_RETENTION_DAYS} dias são apagadas sozinhas. O check-in
            continua contando nos dias ativos, na sequência e na corrida.
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="num text-2xl font-semibold leading-none">
            {usage ? fmtBytes(usage.bytes) : '—'}
          </p>
          <p className="label mt-1.5">{usage ? `${usage.files} arquivos` : 'calculando'}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={clean}
        disabled={cleaning}
        className="btn btn-ghost btn-sm mt-5"
      >
        {cleaning ? 'Limpando' : 'Limpar agora'}
      </button>

      {msg && <p className="text-sm text-brand mt-3">{msg}</p>}
    </div>
  )
}
