import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, fmtHours, fmtDate, compressImage } from '../lib/supabase'
import { useSignedPhotos, photoOf } from '../lib/photos'
import { useAuth } from '../App'
import Avatar from '../components/Avatar'
import Stat from '../components/Stat'
import CheckinCalendar from '../components/CheckinCalendar'
import CheckinCard from '../components/CheckinCard'
import CheckinModal from '../components/CheckinModal'
import EditCheckin from '../components/EditCheckin'
import ConfirmDialog from '../components/ConfirmDialog'
import Toast from '../components/Toast'
import Streak from '../components/Streak'
import ReminderToggle from '../components/ReminderToggle'
import StorageUsage from '../components/StorageUsage'
import { SkeletonCards, SkeletonStats } from '../components/Skeleton'

export default function Profile() {
  const { id } = useParams()
  const { user } = useAuth()
  const profileId = id || user.id
  const isMe = profileId === user.id

  const [profile, setProfile] = useState(null)
  const [sessions, setSessions] = useState(null)
  const [streak, setStreak] = useState(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [uploading, setUploading] = useState(false)
  const [day, setDay] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [toEdit, setToEdit] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [open, setOpen] = useState(null)
  const fileRef = useRef()

  const list = sessions || []
  const urls = useSignedPhotos(list)

  const load = useCallback(async () => {
    const [{ data: p }, { data: s }, { data: st }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', profileId).maybeSingle(),
      supabase.rpc('get_user_checkins', { p_user_id: profileId, p_limit: 120 }),
      supabase.rpc('get_user_streak', { p_user_id: profileId }),
    ])
    setProfile(p)
    if (p) { setName(p.name); setBio(p.bio || '') }
    setSessions(s || [])
    setStreak(st?.[0] || null)
  }, [profileId])

  useEffect(() => { load(); setDay(null) }, [load])

  function patch(id, fields) {
    setSessions((prev) => prev?.map((s) => (s.id === id ? { ...s, ...fields } : s)) || prev)
    setOpen((o) => (o && o.id === id ? { ...o, ...fields } : o))
    setDay((d) => (d ? { ...d, items: d.items.map((s) => (s.id === id ? { ...s, ...fields } : s)) } : d))
  }

  async function save(e) {
    e.preventDefault()
    await supabase.from('profiles').update({ name, bio }).eq('id', user.id)
    setEditing(false)
    load()
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const blob = await compressImage(file, 600, 0.85)
      const path = `${user.id}/avatar.jpg`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        await supabase.from('profiles').update({ avatar_url: `${data.publicUrl}?t=${Date.now()}` }).eq('id', user.id)
        load()
      }
    } finally {
      setUploading(false)
    }
  }

  async function confirmRemove() {
    const target = toDelete
    setDeleting(true)
    setFeedback(null)
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', target.id)
        .eq('user_id', user.id)
        .select('id')

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('O banco não permitiu apagar este check-in.')
      }

      const paths = [target.photo_path, target.thumb_path].filter(Boolean)
      if (paths.length) await supabase.storage.from('checkins').remove(paths)

      setSessions((prev) => prev.filter((s) => s.id !== target.id))
      setDay((d) => {
        if (!d) return null
        const items = d.items.filter((s) => s.id !== target.id)
        return items.length ? { ...d, items } : null
      })
      setToDelete(null)
      setFeedback({ ok: true, text: 'Check-in removido.' })
      setTimeout(() => setFeedback(null), 3000)
      load()
    } catch (err) {
      setToDelete(null)
      setFeedback({ ok: false, text: err.message })
    } finally {
      setDeleting(false)
    }
  }

  if (!profile) {
    return (
      <div className="space-y-14 max-w-3xl mx-auto">
        <div className="flex flex-col items-center gap-4">
          <div className="skeleton w-[120px] h-[120px] rounded-full" />
          <div className="skeleton h-9 w-52 rounded-lg" />
        </div>
        <SkeletonStats count={3} />
        <SkeletonCards count={4} className="grid sm:grid-cols-2 gap-6" />
      </div>
    )
  }

  const activeDays = new Set(list.map((s) => s.studied_at)).size
  const totalMin = list.reduce((a, s) => a + (s.minutes || 0), 0)

  const cardProps = (it) => ({
    item: it,
    photoUrl: photoOf(it, urls),
    onOpen: setOpen,
    onReact: patch,
    onEdit: isMe ? setToEdit : undefined,
    onDelete: isMe ? setToDelete : undefined,
  })

  return (
    <div className="space-y-16 max-w-3xl mx-auto">
      {/* Cabeçalho */}
      <section className="text-center stagger">
        <div className="relative inline-block transition-transform duration-500 hover:scale-105" data-reveal="scale">
          <Avatar url={profile.avatar_url} name={profile.name} size={120} />
          {isMe && (
            <>
              <button
                onClick={() => fileRef.current.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/60 opacity-0 hover:opacity-100 transition grid place-items-center text-sm text-white font-medium"
              >
                {uploading ? '...' : 'Trocar'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
            </>
          )}
        </div>

        {!editing ? (
          <>
            <h1 className="display mt-6" data-reveal>{profile.name}</h1>

            {streak && Number(streak.current_streak) > 0 && (
              <div className="flex justify-center mt-4" data-reveal>
                <Streak days={streak.current_streak} atRisk={!streak.checked_today} size="lg" />
              </div>
            )}

            {profile.bio && <p className="lead mt-4 max-w-lg mx-auto" data-reveal>{profile.bio}</p>}
            {isMe && (
              <div data-reveal>
                <button onClick={() => setEditing(true)} className="link text-sm mt-5">
                  Editar perfil
                </button>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={save} className="max-w-sm mx-auto mt-8 space-y-3.5 text-left">
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" required />
            <textarea
              className="field resize-none"
              rows="3"
              placeholder="Em que você está focado agora"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <div className="flex gap-3">
              <button className="btn btn-primary flex-1">Salvar</button>
              <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost flex-1">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Métricas */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger">
        <div data-reveal="scale"><Stat label="Check-ins" value={list.length} /></div>
        <div data-reveal="scale"><Stat label="Dias ativos" value={activeDays} /></div>
        <div data-reveal="scale"><Stat label="Recorde seguido" value={Number(streak?.longest_streak || 0)} /></div>
        <div data-reveal="scale"><Stat label="Duração" value={totalMin} format={fmtHours} /></div>
      </section>

      {/* Calendário */}
      <div data-reveal>
        <CheckinCalendar
          sessions={list}
          photoUrls={urls}
          onSelectDay={(k, items) => setDay({ k, items })}
        />
      </div>

      {/* Check-ins do dia */}
      {day ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="h2 num">
              {fmtDate(day.k)} · {day.items.length} check-in{day.items.length > 1 ? 's' : ''}
            </h2>
            <button onClick={() => setDay(null)} className="link text-sm">Fechar</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 stagger">
            {day.items.map((it) => (
              <div key={it.id} data-reveal="scale">
                <CheckinCard {...cardProps(it)} />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section>
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="h1">Recentes.</h2>
            {isMe && <Link to="/checkin" className="link text-sm">Novo check-in</Link>}
          </div>

          {sessions === null ? (
            <SkeletonCards count={4} className="grid sm:grid-cols-2 gap-6" />
          ) : list.length === 0 ? (
            <div className="card-soft py-20 text-center">
              <p className="h2">Nenhum check-in ainda.</p>
              {isMe && <Link to="/checkin" className="btn btn-primary mt-6">Fazer o primeiro</Link>}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6 stagger">
              {list.slice(0, 6).map((it) => (
                <div key={it.id} data-reveal="scale">
                  <CheckinCard {...cardProps(it)} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {isMe && (
        <section data-reveal className="space-y-4">
          <h2 className="h2">Ajustes</h2>
          <ReminderToggle />
          <StorageUsage onCleaned={load} />
        </section>
      )}

      <Toast message={feedback?.text} ok={feedback?.ok} />

      <CheckinModal
        item={open}
        onClose={() => setOpen(null)}
        onReact={patch}
        onCountChange={(sid, n) => patch(sid, { comment_count: n })}
      />

      <EditCheckin
        item={toEdit}
        onClose={() => setToEdit(null)}
        onSaved={(sid, fields) => {
          patch(sid, fields)
          setFeedback({ ok: true, text: 'Check-in atualizado.' })
          setTimeout(() => setFeedback(null), 3000)
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        danger
        loading={deleting}
        title="Deseja mesmo remover?"
        confirmLabel="Sim, remover"
        cancelLabel="Não, manter"
        onConfirm={confirmRemove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
