import { fmtTime, fmtHours } from '../lib/supabase'
import Avatar from './Avatar'

export default function CheckinRow({ item, photoUrl, onOpen }) {
  const title = item.title || item.subject
  const src = photoUrl || item.photo_url

  return (
    <button
      type="button"
      onClick={() => onOpen?.(item)}
      className="card-soft w-full flex items-center gap-4 p-3.5 text-left transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99]"
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          className="w-14 h-14 rounded-full object-cover shrink-0"
        />
      ) : (
        <div
          className="w-14 h-14 rounded-full shrink-0 grid place-items-center label"
          style={{ background: 'var(--s-card)' }}
        >
          sem foto
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{title}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <Avatar url={item.avatar_url} name={item.name} size={20} />
          <span className="text-sm text-muted truncate">{item.name}</span>
          {Number(item.reaction_count) > 0 && (
            <span className="label num flex items-center gap-1 shrink-0" style={{ color: item.reacted ? 'var(--s-brand)' : undefined }}>
              <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill={item.reacted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
                <path d="M10 17s-6.5-4.2-6.5-8.3A3.7 3.7 0 0 1 10 6.2a3.7 3.7 0 0 1 6.5 2.5C16.5 12.8 10 17 10 17Z" />
              </svg>
              {item.reaction_count}
            </span>
          )}
          {Number(item.comment_count) > 0 && (
            <span className="label num flex items-center gap-1 shrink-0">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current stroke-[1.5]">
                <path d="M14 9.5a2 2 0 0 1-2 2H5l-3 2.5v-10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5.5Z" />
              </svg>
              {item.comment_count}
            </span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="label num">{fmtTime(item.created_at)}</p>
        {item.minutes ? <p className="label num text-brand mt-1">{fmtHours(item.minutes)}</p> : null}
      </div>
    </button>
  )
}
