import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function ReactionButton({ item, onChange, className = '' }) {
  const { user } = useAuth()
  const [reacted, setReacted] = useState(!!item.reacted)
  const [count, setCount] = useState(Number(item.reaction_count || 0))
  const [busy, setBusy] = useState(false)
  const [pop, setPop] = useState(false)
  const [error, setError] = useState(false)

  // acompanha o item quando a lista é atualizada de fora
  useEffect(() => {
    setReacted(!!item.reacted)
    setCount(Number(item.reaction_count || 0))
  }, [item.id, item.reacted, item.reaction_count])

  async function toggle(e) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    setError(false)

    const next = !reacted
    const nextCount = Math.max(0, count + (next ? 1 : -1))

    setReacted(next)
    setCount(nextCount)
    if (next) { setPop(true); setTimeout(() => setPop(false), 320) }

    const { error: err } = next
      ? await supabase
          .from('checkin_reactions')
          .upsert({ session_id: item.id, user_id: user.id }, { onConflict: 'session_id,user_id' })
      : await supabase
          .from('checkin_reactions')
          .delete()
          .eq('session_id', item.id)
          .eq('user_id', user.id)

    if (err) {
      // desfaz e sinaliza que não deu
      setReacted(!next)
      setCount(count)
      setError(true)
      setTimeout(() => setError(false), 2500)
    } else {
      onChange?.(item.id, { reacted: next, reaction_count: nextCount })
    }

    setBusy(false)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={error ? 'Não foi possível curtir agora' : reacted ? 'Remover curtida' : 'Curtir'}
      className={`label flex items-center gap-1.5 transition ${
        error ? '!text-red-500' : reacted ? '!text-brand' : 'hover:text-ink'
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
      {error ? 'erro' : count > 0 ? count : 'Curtir'}
    </button>
  )
}
