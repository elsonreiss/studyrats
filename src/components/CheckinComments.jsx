import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import Avatar from './Avatar'

function ago(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'agora'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function CheckinComments({ sessionId, onCountChange }) {
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [allowed, setAllowed] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const endRef = useRef(null)

  const load = useCallback(async () => {
    const [{ data }, { data: can }] = await Promise.all([
      supabase.rpc('get_comments', { p_session_id: sessionId }),
      supabase.rpc('can_comment', { p_session_id: sessionId }),
    ])
    setItems(data || [])
    setAllowed(!!can)
    onCountChange?.((data || []).length)
  }, [sessionId, onCountChange])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase
      .channel(`comments:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkin_comments', filter: `session_id=eq.${sessionId}` },
        () => load()
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sessionId, load])

  async function send(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    setText('')
    const { error: err } = await supabase
      .from('checkin_comments')
      .insert({ session_id: sessionId, user_id: user.id, body })
    if (err) {
      setText(body)
      setError(err.message.includes('Muitos comentários')
        ? 'Devagar — muitos comentários seguidos. Espere um instante.'
        : 'Não foi possível comentar. Tente de novo.')
      setTimeout(() => setError(null), 4000)
    } else {
      load()
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60)
    }
    setSending(false)
  }

  async function remove(id) {
    const { error: err } = await supabase.from('checkin_comments').delete().eq('id', id)
    if (err) {
      setError('Não foi possível apagar o comentário.')
      setTimeout(() => setError(null), 3000)
      return
    }
    load()
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(e)
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <p className="label">Comentários</p>
        {items && <span className="label num">{items.length}</span>}
      </div>

      <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
        {items === null && <p className="text-muted text-sm">Carregando</p>}

        {items?.length === 0 && (
          <p className="text-faint text-sm">
            {allowed ? 'Nenhum comentário ainda. Seja o primeiro.' : 'Sem comentários.'}
          </p>
        )}

        {items?.map((c) => (
          <div key={c.id} className="flex gap-3 group">
            <Avatar url={c.avatar_url} name={c.name} size={30} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <Link
                  to={`/perfil/${c.user_id}`}
                  className="text-sm font-medium hover:text-brand transition truncate"
                >
                  {c.user_id === user.id ? 'Você' : c.name}
                </Link>
                <span className="label num text-[11px]">{ago(c.created_at)}</span>
                {c.can_delete && (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="label text-[11px] ml-auto opacity-0 group-hover:opacity-100 hover:text-red-500 transition"
                  >
                    apagar
                  </button>
                )}
              </div>
              <p className="text-sm mt-0.5 leading-snug whitespace-pre-wrap wrap-anywhere">{c.body}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {allowed ? (
        <form onSubmit={send} className="flex items-end gap-2.5 mt-4">
          <textarea
            rows="1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder="Escreva um comentário"
            className="field resize-none max-h-24 !py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="btn btn-primary btn-sm shrink-0"
          >
            Enviar
          </button>
        </form>
      ) : (
        <p className="text-faint text-sm mt-4">
          Só quem divide um desafio com essa pessoa pode comentar.
        </p>
      )}

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  )
}
