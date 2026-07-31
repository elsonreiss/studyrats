import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase, fmtTime } from '../lib/supabase'
import { useAuth } from '../App'
import Avatar from './Avatar'

function dayLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  const same = (a, b) => a.toDateString() === b.toDateString()
  if (same(d, today)) return 'Hoje'
  if (same(d, yest)) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}

export default function GroupChat({ groupId }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [people, setPeople] = useState({})
  const bottomRef = useRef(null)
  const boxRef = useRef(null)

  const scrollDown = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' })
  }, [])

  // carrega membros e histórico
  useEffect(() => {
    let alive = true

    async function boot() {
      const [{ data: members }, { data: msgs }] = await Promise.all([
        supabase.from('group_members').select('user_id, profiles ( id, name, avatar_url )').eq('group_id', groupId),
        supabase
          .from('group_messages')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false })
          .limit(80),
      ])
      if (!alive) return

      const map = {}
      for (const m of members || []) if (m.profiles) map[m.profiles.id] = m.profiles
      setPeople(map)
      setMessages((msgs || []).reverse())
    }

    boot()
    return () => { alive = false }
  }, [groupId])

  // tempo real
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        async ({ new: row }) => {
          setMessages((prev) => (prev?.some((m) => m.id === row.id) ? prev : [...(prev || []), row]))
          setPeople((prev) => {
            if (prev[row.user_id]) return prev
            supabase
              .from('profiles')
              .select('id, name, avatar_url')
              .eq('id', row.user_id)
              .maybeSingle()
              .then(({ data }) => data && setPeople((p) => ({ ...p, [data.id]: data })))
            return prev
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        ({ old: row }) => setMessages((prev) => prev?.filter((m) => m.id !== row.id) || [])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId])

  useEffect(() => {
    if (messages) scrollDown(messages.length > 0)
  }, [messages, scrollDown])

  async function send(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    setText('')

    // devolve a linha criada: assim a mensagem aparece na hora,
    // mesmo que o tempo real demore ou falhe
    const { data, error: err } = await supabase
      .from('group_messages')
      .insert({ group_id: groupId, user_id: user.id, body })
      .select()
      .single()

    if (err) {
      setText(body)
      setError(err.message.includes('Muitas mensagens')
        ? 'Devagar — muitas mensagens seguidas. Espere alguns segundos.'
        : 'Não foi possível enviar. Tente de novo.')
      setTimeout(() => setError(null), 4000)
    } else if (data) {
      setMessages((prev) => (prev?.some((m) => m.id === data.id) ? prev : [...(prev || []), data]))
    }

    setSending(false)
  }

  async function remove(id) {
    const before = messages
    setMessages((prev) => prev?.filter((m) => m.id !== id) || [])
    const { error: err } = await supabase.from('group_messages').delete().eq('id', id)
    if (err) setMessages(before)
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(e)
    }
  }

  return (
    <div className="card overflow-hidden max-w-2xl mx-auto flex flex-col" style={{ height: 'min(70vh, 620px)' }}>
      <div className="px-6 py-4 border-b border-edge flex items-center justify-between">
        <h3 className="font-semibold">Bate-papo</h3>
        <span className="chip text-xs shrink-0">{Object.keys(people).length} membros</span>
      </div>

      <div ref={boxRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-1">
        {messages === null && <p className="text-muted text-center text-sm">Carregando</p>}

        {messages?.length === 0 && (
          <div className="h-full grid place-items-center text-center px-6">
            <div>
              <p className="h2">Nenhuma mensagem ainda.</p>
              <p className="text-muted mt-2">Comece a conversa com o pessoal do desafio.</p>
            </div>
          </div>
        )}

        {messages?.map((m, i) => {
          const author = people[m.user_id]
          const mine = m.user_id === user.id
          const prev = messages[i - 1]
          const newDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at)
          const grouped = prev && !newDay && prev.user_id === m.user_id

          return (
            <div key={m.id}>
              {newDay && (
                <div className="flex justify-center my-5">
                  <span className="chip text-xs">{dayLabel(m.created_at)}</span>
                </div>
              )}

              <div className={`flex items-end gap-2.5 ${mine ? 'flex-row-reverse' : ''} ${grouped ? 'mt-1' : 'mt-3'}`}>
                <div className="w-7 shrink-0">
                  {!grouped && <Avatar url={author?.avatar_url} name={author?.name || '?'} size={28} />}
                </div>

                <div className={`max-w-[76%] group ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!grouped && (
                    <span className={`label mb-1 px-1 ${mine ? 'text-right' : ''}`}>
                      {mine ? 'Você' : author?.name || 'Membro'}
                    </span>
                  )}
                  <div
                    className="px-4 py-2.5 rounded-2xl text-[15px] leading-snug whitespace-pre-wrap wrap-anywhere rise"
                    style={
                      mine
                        ? { background: 'var(--s-brand)', color: 'var(--s-on-brand)', borderBottomRightRadius: 6 }
                        : { background: 'var(--s-card-2)', borderBottomLeftRadius: 6 }
                    }
                  >
                    {m.body}
                  </div>
                  <div className={`flex items-center gap-2 mt-1 px-1 ${mine ? 'flex-row-reverse' : ''}`}>
                    <span className="label num text-[11px]">{fmtTime(m.created_at)}</span>
                    {mine && (
                      <button
                        onClick={() => remove(m.id)}
                        className="label text-[11px] opacity-0 group-hover:opacity-100 hover:text-red-500 transition"
                      >
                        apagar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="text-red-500 text-sm px-5 pb-2 text-center rise">{error}</p>
      )}

      <form onSubmit={send} className="border-t border-edge p-4 flex items-end gap-3">
        <textarea
          rows="1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="Escreva uma mensagem"
          className="field resize-none max-h-32"
          style={{ minHeight: '2.75rem' }}
        />
        <button disabled={!text.trim() || sending} className="btn btn-primary btn-sm shrink-0">
          Enviar
        </button>
      </form>
    </div>
  )
}
