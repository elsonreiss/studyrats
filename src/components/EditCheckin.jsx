import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import DurationPicker from './DurationPicker'

function fmtDuration(h, m) {
  if (!h && !m) return 'Não informar'
  if (!h) return `${m} min`
  if (!m) return `${h} h`
  return `${h} h ${m} min`
}

export default function EditCheckin({ item, onClose, onSaved }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [notes, setNotes] = useState('')
  const [hours, setHours] = useState(0)
  const [mins, setMins] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [pickTime, setPickTime] = useState(false)

  useEffect(() => {
    if (!item) return
    setTitle(item.title || item.subject || '')
    setSubject(item.subject || '')
    setNotes(item.notes || '')
    setHours(Math.floor((item.minutes || 0) / 60))
    setMins((item.minutes || 0) % 60)
    setError(null)

    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [item, onClose])

  if (!item) return null

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const minutes = Number(hours) * 60 + Number(mins)
    const patch = {
      title,
      subject: subject.trim() || title,
      notes,
      minutes: minutes > 0 ? Math.min(minutes, 1440) : null,
    }
    const { data, error: err } = await supabase
      .from('study_sessions')
      .update(patch)
      .eq('id', item.id)
      .select('id')
    setSaving(false)

    if (err) return setError(err.message)
    if (!data || data.length === 0) return setError('Você só pode editar os seus próprios check-ins.')

    onSaved?.(item.id, patch)
    onClose?.()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-5 backdrop-blur-md animate-[fade_.18s_ease-out] overflow-y-auto"
      style={{ background: 'var(--s-scrim)' }}
      onClick={onClose}
    >
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-md p-7 shadow-2xl animate-[pop_.2s_cubic-bezier(.2,.9,.3,1.15)] my-auto space-y-3.5"
      >
        <h2 className="h2 mb-1">Editar check-in</h2>
        <p className="label !mt-0">A foto e a data não mudam.</p>

        <div>
          <label className="label block mb-1.5 px-1">Título</label>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label block mb-1.5 px-1">Matéria (opcional)</label>
          <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="label block mb-1.5 px-1">Descrição (opcional)</label>
          <textarea className="field resize-none" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div>
          <label className="label block mb-1.5 px-1">Duração</label>
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

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancelar</button>
          <button disabled={saving} className="btn btn-primary flex-1">
            {saving ? 'Salvando' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}
