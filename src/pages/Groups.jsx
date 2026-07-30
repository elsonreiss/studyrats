import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase, fmtDate, todayISO, uploadImage } from '../lib/supabase'
import { useAuth } from '../App'
import PhotoPicker from '../components/PhotoPicker'

function daysLeft(endsOn) {
  if (!endsOn) return null
  return Math.max(0, Math.ceil((new Date(endsOn).getTime() - Date.now()) / 86400000))
}

function pctDone(startsOn, endsOn) {
  if (!endsOn) return 0
  const s = new Date(startsOn).getTime()
  const e = new Date(endsOn).getTime()
  return Math.min(100, Math.max(0, ((Date.now() - s) / (e - s)) * 100))
}

export default function Groups() {
  const { user } = useAuth()
  const [myGroups, setMyGroups] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cover, setCover] = useState(null)
  const [startsOn, setStartsOn] = useState(todayISO())
  const [endsOn, setEndsOn] = useState('')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('group_members')
      .select('group_id, groups ( id, name, description, photo_url, invite_code, owner_id, starts_on, ends_on )')
      .eq('user_id', user.id)
    setMyGroups((data || []).map((r) => r.groups).filter(Boolean))
  }, [user.id])

  useEffect(() => { load() }, [load])

  async function createGroup(e) {
    e.preventDefault()
    setMsg(null)
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert({ name, description, owner_id: user.id, starts_on: startsOn, ends_on: endsOn || null })
        .select()
        .single()
      if (error) throw error

      await supabase.from('group_members').insert({ group_id: data.id, user_id: user.id })

      if (cover) {
        const url = await uploadImage('groups', user.id, cover, { path: `${user.id}/${data.id}.jpg` })
        await supabase.from('groups').update({ photo_url: url }).eq('id', data.id)
      }

      setName(''); setDescription(''); setEndsOn(''); setCover(null)
      setMsg({ ok: true, text: `Desafio criado. Código de convite: ${data.invite_code}` })
      load()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function joinGroup(e) {
    e.preventDefault()
    setMsg(null)
    const { data, error } = await supabase.rpc('join_group', { p_code: code.trim().toUpperCase() })
    const g = data?.[0]
    if (error || !g) return setMsg({ ok: false, text: 'Código de convite inválido.' })
    setCode('')
    setMsg({ ok: true, text: `Você entrou no desafio ${g.name}.` })
    load()
  }

  return (
    <div className="space-y-20">
      <section className="text-center stagger">
        <p className="eyebrow" data-reveal>Privado</p>
        <h1 className="display mt-3" data-reveal>Desafios.</h1>
        <p className="lead mt-5 max-w-2xl mx-auto" data-reveal>
          Um desafio é um grupo com prazo, capa e bate-papo próprio. Não aparece em nenhuma
          listagem pública: só entra quem receber o link ou o código.
        </p>
      </section>

      <section className="grid md:grid-cols-2 gap-6 items-start">
        <form onSubmit={createGroup} className="card p-8 space-y-4" data-reveal="left">
          <div className="mb-2">
            <p className="eyebrow">Novo</p>
            <h2 className="h2 mt-1.5">Criar desafio</h2>
          </div>

          <PhotoPicker
            file={cover}
            onChange={setCover}
            label="Capa do desafio"
            hint="Opcional. Aparece no topo do desafio e no convite."
          />

          <input className="field" placeholder="Nome do desafio" value={name}
            onChange={(e) => setName(e.target.value)} required />
          <input className="field" placeholder="Descrição (opcional)" value={description}
            onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label block mb-1.5 px-1">Início</label>
              <input type="date" className="field num" value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)} required />
            </div>
            <div>
              <label className="label block mb-1.5 px-1">Fim (opcional)</label>
              <input type="date" className="field num" min={startsOn} value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)} />
            </div>
          </div>
          <button disabled={saving} className="btn btn-primary w-full">
            {saving ? 'Criando' : 'Criar desafio'}
          </button>
        </form>

        <form onSubmit={joinGroup} className="card p-8 space-y-4" data-reveal="right">
          <div className="mb-2">
            <p className="label">Convite</p>
            <h2 className="h2 mt-1.5">Entrar em um desafio</h2>
          </div>
          <input
            className="field num uppercase tracking-[0.3em] text-center"
            placeholder="A1B2C3"
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <p className="text-muted text-sm">
            Peça o código ou o link para quem já participa. Também dá para entrar abrindo o link direto.
          </p>
          <button className="btn btn-ghost w-full">Entrar</button>
        </form>
      </section>

      {msg && (
        <p className={`text-center rise ${msg.ok ? 'text-brand' : 'text-red-500'}`}>{msg.text}</p>
      )}

      <section>
        <h2 className="h1 text-center mb-14" data-reveal>Meus desafios.</h2>

        {myGroups === null && <p className="text-muted text-center">Carregando</p>}

        {myGroups?.length === 0 && (
          <div className="card-soft py-20 text-center" data-reveal>
            <p className="h2">Você ainda não participa de nenhum desafio.</p>
            <p className="lead mt-2">Crie um acima ou entre com um código de convite.</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-6 stagger">
          {myGroups?.map((g) => {
            const left = daysLeft(g.ends_on)
            return (
              <div key={g.id} data-reveal="scale">
                <Link to={`/grupos/${g.id}`} className="card lift group block h-full overflow-hidden">
                  {g.photo_url && (
                    <div className="relative overflow-hidden">
                      <img
                        src={g.photo_url}
                        alt={g.name}
                        loading="lazy"
                        className="w-full aspect-[16/9] object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                      />
                      {g.owner_id === user.id && (
                        <span className="absolute top-3 right-3 chip !bg-black/55 !text-white backdrop-blur-md text-xs">
                          dono
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-8">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="h2 group-hover:text-brand transition-colors duration-300">{g.name}</h3>
                      {!g.photo_url && g.owner_id === user.id && <span className="chip shrink-0">dono</span>}
                    </div>
                    {g.description && <p className="text-muted mt-2">{g.description}</p>}

                    {g.ends_on && (
                      <>
                        <div className="h-1.5 rounded-full bg-card-2 overflow-hidden mt-6">
                          <div
                            className="h-full bg-brand rounded-full bar-fill"
                            style={{ width: `${pctDone(g.starts_on, g.ends_on)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-2.5 label num">
                          <span>{fmtDate(g.starts_on)}</span>
                          <span className={left === 0 ? '' : 'text-brand font-semibold'}>
                            {left === 0 ? 'encerrado' : `${left} dias restantes`}
                          </span>
                        </div>
                      </>
                    )}

                    <p className="label mt-6">
                      código <span className="text-brand font-semibold num ml-1">{g.invite_code}</span>
                    </p>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
