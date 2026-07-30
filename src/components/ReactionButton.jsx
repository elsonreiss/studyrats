import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function ReactionButton({ item, onChange, className = '' }) {
  const { user } = useAuth()
  const [reacted, setReacted] = useState(!!item.reacted)
  const [count, setCount] = useState(Number(item.reaction_count || 0))
  const [busy, setBusy] = useState(false)
  const [pop, setPop] = useState(false)

  async function toggle(e) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)

    const next = !reacted
    setReacted(next)
    setCount((c) => c + (next ? 1 : -1))
    if (next) { setPop(true); setTimeout(() => setPop(false), 320) }

    const { error } = next
      ? await supabase.from('checkin_reactions').insert({ session_id: item.id, user_id: user.id })
      : await supabase.from('checkin_reactions').delete().eq('session_id', item.id).eq('user_id', user.id)

    if (error) {
      setReacted(!next)
      setCount((c) => c + (next ? -1 : 1))
    } else {
      onChange?.(item.id, { reacted: next, reaction_count: count + (next ? 1 : -1) })
    }
    setBusy(false)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={reacted ? 'Remover curtida' : 'Curtir'}
      className={`label flex items-center gap-1.5 transition ${
        reacted ? '!text-brand' : 'hover:text-ink'
      } ${className}`}
    >
      <svg
        viewBox="0 0 20 20"
        className="w-[18px] h-[18px] transition-transform duration-300"
        style={{ transform: pop ? 'scale(1.35)' : 'none' }}
        fill={reacted ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M10 17s-6.5-4.2-6.5-8.3A3.7 3.7 0 0 1 10 6.2a3.7 3.7 0 0 1 6.5 2.5C16.5 12.8 10 17 10 17Z" />
      </svg>
      {count > 0 ? count : 'Curtir'}
    </button>
  )
}
