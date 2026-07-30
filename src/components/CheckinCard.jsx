import { Link } from 'react-router-dom'
import { fmtHours, fmtDate } from '../lib/supabase'
import Avatar from './Avatar'
import ReactionButton from './ReactionButton'

export default function CheckinCard({ item, photoUrl, onDelete, onEdit, onOpen, onReact }) {
  const title = item.title || item.subject
  const comments = Number(item.comment_count || 0)
  const src = photoUrl || item.photo_url

  return (
    <article className="card lift overflow-hidden flex flex-col group h-full">
      {src ? (
        <button
          type="button"
          onClick={() => onOpen?.(item)}
          className="relative overflow-hidden block w-full cursor-zoom-in"
        >
          <img
            src={src}
            alt={title}
            loading="lazy"
            decoding="async"
            className="w-full aspect-[4/3] object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
          />
          {item.minutes ? (
            <span className="absolute top-3 right-3 chip num !bg-black/55 !text-white backdrop-blur-md text-xs transition-transform duration-500 group-hover:-translate-y-0.5">
              {fmtHours(item.minutes)}
            </span>
          ) : null}
        </button>
      ) : null}

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="eyebrow">{item.subject}</p>
          {(item.group_names || []).map((gname, i) => (
            <span key={item.group_ids?.[i] || gname} className="flex items-center gap-2">
              <span className="text-faint text-xs">·</span>
              <Link
                to={`/grupos/${item.group_ids?.[i]}`}
                className="label hover:text-brand transition-colors duration-300"
              >
                {gname}
              </Link>
            </span>
          ))}
        </div>

        <h3 className="h2 mt-1.5 leading-tight">{title}</h3>

        {item.notes && (
          <p className="text-muted mt-3 leading-relaxed line-clamp-3">{item.notes}</p>
        )}

        <div className="flex items-center gap-2.5 mt-6 pt-5 border-t border-edge">
          <Avatar url={item.avatar_url} name={item.name} size={28} />
          {item.user_id ? (
            <Link to={`/perfil/${item.user_id}`} className="text-sm hover:text-brand transition truncate">
              {item.name}
            </Link>
          ) : (
            <span className="text-sm truncate">{item.name}</span>
          )}
          <span className="label ml-auto shrink-0 num">{fmtDate(item.studied_at)}</span>
        </div>

        <div className="flex items-center gap-5 mt-4">
          <ReactionButton item={item} onChange={onReact} />
          <button
            type="button"
            onClick={() => onOpen?.(item)}
            className="label flex items-center gap-1.5 hover:text-ink transition"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-none stroke-current stroke-[1.5]">
              <path d="M14 9.5a2 2 0 0 1-2 2H5l-3 2.5v-10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5.5Z" />
            </svg>
            {comments > 0 ? comments : 'Comentar'}
          </button>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2 mt-5">
            {onEdit && (
              <button type="button" onClick={() => onEdit(item)} className="btn btn-ghost btn-sm">
                Editar
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="btn btn-ghost btn-sm !text-red-500 !border-red-500/40 hover:!bg-red-500/10"
              >
                Remover
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
