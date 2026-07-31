import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, todayISO, uploadCheckinPhoto } from '../lib/supabase'
import { purgeOncePerDay } from '../lib/cleanup'
import { useAuth } from '../App'
import PhotoPicker from '../components/PhotoPicker'
import DurationPicker from '../components/DurationPicker'
import CheckinCelebration from '../components/CheckinCelebration'

function fmtDuration(h, m) {
  if (!h && !m) return 'Não informar'
  if (!h) return `${m} min`
  if (!m) return `${h} h`
  return `${h} h ${m} min`
}

export default function NewCheckin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [notes, setNotes] = useState('')
  const [hours, setHours] = useState(0)
  const [mins, setMins] = useState(0)
  const [picked, setPicked] = useState(() => {
    const g = params.get('grupo')
    return g ? [g] : []
  })
  const [groups, setGroups] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [pickTime, setPickTime] = useState(false)
  const [celebrate, setCelebrate] = useState(null)

  useEffect(() => {
    supabase
      .from('group_members')
      .select('groups ( id, name, photo_url )')
      .eq('user_id', user.id)
      .then(({ data }) => setGroups((data || []).map((r) => r.groups).filter(Boolean)))
  }, [user.id])

  function toggle(id) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function publish(e) {
    e.preventDefault()
    if (!file) return setError('A foto é obrigatória para registrar o check-in.')
    setSaving(true)
    setError(null)
    try {
      const { photoPath, thumbPath } = await uploadCheckinPhoto(user.id, file)
      const minutes = Number(hours) * 60 + Number(mins)

      const { data: created, error: insErr } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          title,
          subject: subject.trim() || title,
          notes,
          minutes: minutes > 0 ? Math.min(minutes, 1440) : null,
          photo_path: photoPath,
          thumb_path: thumbPath,
          studied_at: todayISO(),
          group_id: picked[0] || null,
        })
        .select('id')
        .single()
      if (insErr) throw insErr

      if (picked.length > 0) {
        const { error: linkErr } = await supabase
          .from('checkin_groups')
          .insert(picked.map((gid) => ({ session_id: created.id, group_id: gid })))
        if (linkErr) throw linkErr
      }

      // aproveita a visita para limpar as fotos antigas do próprio usuário
      purgeOncePerDay(user.id)

      // busca a sequência já atualizada para mostrar na comemoração
      const { data: st } = await supabase.rpc('get_my_streak')
      setCelebrate({
        streak: Number(st?.[0]?.current_streak || 0),
        to: picked.length === 1 ? `/grupos/${picked[0]}` : '/',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const targets = groups.filter((g) => picked.includes(g.id))

  return (
    <form onSubmit={publish} className="max-w-xl mx-auto space-y-8">
      <div className="text-center stagger">
        <h1 className="display" data-reveal>Novo check-in.</h1>
        <p className="lead mt-4" data-reveal>
          {targets.length === 0 && 'Sem foto, o check-in não conta.'}
          {targets.length === 1 && (
            <>Vai contar no desafio <span className="text-ink font-medium">{targets[0].name}</span> e no seu feed.</>
          )}
          {targets.length > 1 && (
            <>Vai contar em <span className="text-ink font-medium">{targets.length} desafios</span> e no seu feed.</>
          )}
        </p>
      </div>

      <div data-reveal="scale">
        <PhotoPicker
          file={file}
          onChange={(f) => { setFile(f); setError(null) }}
          label="Foto do estudo"
          hint="Anotações, tela do editor, livro aberto — o que comprove a sessão."
          aspect="aspect-[4/3]"
        />
      </div>

      <div className="space-y-3.5" data-reveal>
        <div>
          <label className="label block mb-1.5 px-1">Título</label>
          <input className="field" placeholder="Revisão de arrays" value={title}
            onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label block mb-1.5 px-1">Matéria (opcional)</label>
          <input className="field" placeholder="JavaScript, lógica, banco de dados..." value={subject}
            onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="label block mb-1.5 px-1">Descrição (opcional)</label>
          <textarea className="field resize-none" rows="3" placeholder="O que você avançou nessa sessão"
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Desafios — seleção múltipla */}
      {groups.length > 0 && (
        <div data-reveal>
          <div className="flex items-baseline justify-between mb-3 px-1">
            <label className="label">Publicar nos desafios</label>
            {picked.length > 0 ? (
              <button
                type="button"
                onClick={() => setPicked([])}
                className="label hover:text-ink transition"
              >
                limpar ({picked.length})
              </button>
            ) : (
              <span className="label">nenhum selecionado</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {groups.map((g) => {
              const active = picked.includes(g.id)
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggle(g.id)}
                  data-active={active}
                  className="pick flex items-center gap-3"
                >
                  {g.photo_url ? (
                    <img src={g.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <span
                      className="w-10 h-10 rounded-xl shrink-0 grid place-items-center font-semibold text-sm"
                      style={{ background: 'var(--s-card)' }}
                    >
                      {g.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{g.name}</span>
                    <span className="label block truncate">{active ? 'selecionado' : 'desafio'}</span>
                  </span>
                  <span
                    className="w-5 h-5 rounded-full shrink-0 grid place-items-center transition"
                    style={{
                      border: active ? 'none' : '1.5px solid var(--s-edge-strong)',
                      background: active ? 'var(--s-brand)' : 'transparent',
                    }}
                  >
                    {active && (
                      <svg viewBox="0 0 16 16" className="w-3 h-3 fill-none stroke-[2.5]" style={{ stroke: 'var(--s-on-brand)' }}>
                        <path d="m3.5 8.5 3 3 6-7" />
                      </svg>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="text-sm text-faint mt-3 px-1">
            Pode marcar mais de um. O check-in sempre entra no seu perfil e no feed da comunidade;
            marcar desafios mostra de onde ele veio e libera os comentários de cada grupo.
          </p>
        </div>
      )}

      {/* Duração */}
      <div data-reveal>
        <label className="label block mb-1.5 px-1">Quanto tempo você estudou (opcional)</label>
        <button type="button" onClick={() => setPickTime(true)} className="row-field">
          <span className={hours || mins ? 'num' : 'text-faint'}>{fmtDuration(hours, mins)}</span>
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[1.8] text-faint shrink-0">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </button>
      </div>

      <DurationPicker
        open={pickTime}
        hours={hours}
        minutes={mins}
        onConfirm={(h, m) => { setHours(h); setMins(m) }}
        onClose={() => setPickTime(false)}
      />

      <CheckinCelebration
        open={!!celebrate}
        streak={celebrate?.streak}
        onDone={() => navigate(celebrate?.to || '/')}
      />

      {error && <p className="text-red-500 text-center rise">{error}</p>}

      <div className="flex gap-3" data-reveal>
        <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost flex-1">
          Cancelar
        </button>
        <button disabled={saving || !file} className="btn btn-primary flex-1">
          {saving ? 'Publicando' : 'Publicar'}
        </button>
      </div>
    </form>
  )
}
