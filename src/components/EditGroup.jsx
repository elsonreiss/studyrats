import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase, uploadImage } from '../lib/supabase'
import { useAuth } from '../App'
import PhotoPicker from './PhotoPicker'

export default function EditGroup({ group, onClose, onSaved }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [cover, setCover] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!group) return
    setName(group.name || '')
    setDescription(group.description || '')
    setStartsOn(group.starts_on || '')
    setEndsOn(group.ends_on || '')
    setCover(null)
    setError(null)

    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [group, onClose])

  if (!group) return null

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const patch = {
        name: name.trim(),
        description: description.trim(),
        starts_on: startsOn,
        ends_on: endsOn || null,
      }

      if (cover) {
        patch.photo_url = await uploadImage('groups', user.id, cover, {
          path: `${user.id}/${group.id}.jpg`,
        })
      }

      const { data, error: err } = await supabase
        .from('groups')
        .update(patch)
        .eq('id', group.id)
        .select('id')

      if (err) throw err
      if (!data?.length) throw new Error('Só o dono pode editar este desafio.')

      onSaved?.(patch)
      onClose?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-4 sm:p-6 backdrop-blur-md animate-[fade_.18s_ease-out] overflow-y-auto"
      style={{ background: 'var(--s-scrim)' }}
      onClick={onClose}
    >
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-md p-7 shadow-2xl animate-[pop_.2s_cubic-bezier(.2,.9,.3,1.15)] my-auto space-y-4"
      >
        <h2 className="h2">Editar desafio</h2>

        <PhotoPicker
          file={cover}
          onChange={setCover}
          currentUrl={group.photo_url}
          label="Capa do desafio"
          hint="Aparece no topo do desafio e no convite."
        />

        <div>
          <label className="label block mb-1.5 px-1">Nome</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className="label block mb-1.5 px-1">Descrição (opcional)</label>
          <input className="field" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label block mb-1.5 px-1">Início</label>
            <input type="date" className="field num" value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)} required />
          </div>
          <div>
            <label className="label block mb-1.5 px-1">Fim (opcional)</label>
            <input type="date" className="field num" min={startsOn} value={endsOn || ''}
              onChange={(e) => setEndsOn(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-1">
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
