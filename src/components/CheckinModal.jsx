import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { fmtHours, fmtDate, fmtTime } from '../lib/supabase'
import { useSignedPhoto } from '../lib/photos'
import Avatar from './Avatar'
import CheckinComments from './CheckinComments'
import ReactionButton from './ReactionButton'

export default function CheckinModal({ item, onClose, onCountChange, onReact }) {
  const [zoom, setZoom] = useState(false)
  const src = useSignedPhoto(item, { full: true })

  useEffect(() => {
    if (!item) return
    setZoom(false)
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [item, onClose])

  if (!item) return null
  const title = item.title || item.subject

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 backdrop-blur-md animate-[fade_.18s_ease-out] overflow-y-auto"
      style={{ background: 'var(--s-scrim)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-md overflow-hidden shadow-2xl animate-[pop_.22s_cubic-bezier(.2,.9,.3,1.12)] my-auto"
      >
        {src ? (
          <button type="button" onClick={() => setZoom(!zoom)} className="block w-full" title={zoom ? 'Reduzir' : 'Ampliar'}>
            <img
              src={src}
              alt={title}
              className={`w-full object-cover transition-all duration-500 ${zoom ? 'max-h-[75vh]' : 'max-h-[42vh]'}`}
            />
          </button>
        ) : (
          <div className="skeleton w-full aspect-[4/3]" />
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow">{item.subject}</p>
              <h2 className="h2 mt-1.5">{title}</h2>
              {(item.group_names || []).length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-2.5">
                  {item.group_names.map((gname, i) => (
                    <Link
                      key={item.group_ids?.[i] || gname}
                      to={`/grupos/${item.group_ids?.[i]}`}
                      className="chip !text-brand text-xs hover:opacity-80 transition"
                    >
                      {gname}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {item.minutes ? (
              <span className="chip num shrink-0 !text-brand">{fmtHours(item.minutes)}</span>
            ) : null}
          </div>

          {item.notes && <p className="text-muted mt-4 leading-relaxed">{item.notes}</p>}

          <div className="flex items-center gap-3 mt-6 pt-5 border-t border-edge">
            <Avatar url={item.avatar_url} name={item.name} size={32} />
            <div className="min-w-0 flex-1">
              {item.user_id ? (
                <Link to={`/perfil/${item.user_id}`} className="text-sm font-medium hover:text-brand transition truncate block">
                  {item.name}
                </Link>
              ) : (
                <span className="text-sm font-medium truncate">{item.name}</span>
              )}
              <p className="label num mt-0.5">
                {fmtDate(item.studied_at)} · {fmtTime(item.created_at)}
              </p>
            </div>
            <ReactionButton item={item} onChange={onReact} className="shrink-0" />
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm shrink-0">
              Fechar
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-edge">
            <CheckinComments
              sessionId={item.id}
              onCountChange={(n) => onCountChange?.(item.id, n)}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
