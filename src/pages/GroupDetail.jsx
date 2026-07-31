import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase, fmtHours, fmtDate, fmtDayHeader, uploadImage } from '../lib/supabase'
import { useAuth } from '../App'
import Leaderboard from '../components/Leaderboard'
import CheckinRow from '../components/CheckinRow'
import CheckinModal from '../components/CheckinModal'
import ConfirmDialog from '../components/ConfirmDialog'
import EditGroup from '../components/EditGroup'
import GroupChat from '../components/GroupChat'
import GroupMembers from '../components/GroupMembers'
import Avatar from '../components/Avatar'
import { useSignedPhotos, photoOf } from '../lib/photos'
import RatLoader from '../components/RatLoader'

function progress(startsOn, endsOn) {
  if (!endsOn) return null
  const start = new Date(startsOn).getTime()
  const end = new Date(endsOn).getTime()
  const now = Date.now()
  const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
  const left = Math.max(0, Math.ceil((end - now) / 86400000))
  return { pct, left, ended: now > end }
}

const TABS = [
  { key: 'detalhes', label: 'Detalhes' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'membros', label: 'Membros' },
  { key: 'chat', label: 'Bate-papo' },
]

export default function GroupDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [state, setState] = useState('loading')
  const [group, setGroup] = useState(null)
  const [preview, setPreview] = useState(null)
  const [stats, setStats] = useState(null)
  const [board, setBoard] = useState([])
  const [feed, setFeed] = useState([])
  const [tab, setTab] = useState('detalhes')
  const [open, setOpen] = useState(null)
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(null)
  const [ask, setAsk] = useState(null)
  const [busy, setBusy] = useState(false)
  const [unread, setUnread] = useState(0)
  const [showStats, setShowStats] = useState(false)
  const [editing, setEditing] = useState(false)
  const coverRef = useRef()

  const isOwner = group?.owner_id === user.id
  const seenKey = `sr-chat-seen-${id}`
  const photoUrls = useSignedPhotos(feed)

  const load = useCallback(async () => {
    const { data: g } = await supabase.from('groups').select('*').eq('id', id).maybeSingle()
    if (!g) {
      const { data: p } = await supabase.rpc('get_group_preview', { p_group_id: id })
      if (p?.[0]) { setPreview(p[0]); setState('preview') } else setState('notfound')
      return
    }

    setGroup(g)
    setState('member')

    const [{ data: st }, { data: f }, { data: lb }, { data: total }] = await Promise.all([
      supabase.rpc('get_group_stats', { p_group_id: id }),
      supabase.rpc('get_feed', { p_group_id: id, p_limit: 60 }),
      supabase.rpc('get_leaderboard', { p_since: null, p_group_id: id }),
      supabase.rpc('get_message_count', { p_group_id: id }),
    ])

    setStats(st?.[0] || null)
    setFeed(f || [])
    setBoard(lb || [])
    const seen = Number(localStorage.getItem(seenKey) || 0)
    setUnread(Math.max(0, Number(total || 0) - seen))
  }, [id, seenKey])

  useEffect(() => { load() }, [load])

  // ao abrir o bate-papo, zera o contador
  useEffect(() => {
    if (tab !== 'chat' || state !== 'member') return
    supabase.rpc('get_message_count', { p_group_id: id }).then(({ data }) => {
      localStorage.setItem(seenKey, String(Number(data || 0)))
      setUnread(0)
    })
  }, [tab, state, id, seenKey])

  const byDay = useMemo(() => {
    const map = new Map()
    for (const it of feed) {
      const arr = map.get(it.studied_at) || []
      arr.push(it)
      map.set(it.studied_at, arr)
    }
    return [...map.entries()]
  }, [feed])

  const leader = board[0]
  const me = board.find((r) => r.user_id === user.id)

  async function join() {
    setJoining(true)
    const { error } = await supabase.rpc('join_group', { p_group_id: id })
    setJoining(false)
    if (!error) load()
  }

  async function runAction() {
    setBusy(true)
    if (ask === 'leave') {
      await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', user.id)
    } else {
      await supabase.from('groups').delete().eq('id', id)
    }
    setBusy(false)
    navigate('/grupos')
  }

  function copy(kind) {
    const text = kind === 'link' ? `${window.location.origin}/grupos/${id}` : group.invite_code
    navigator.clipboard.writeText(text)
    setCopied(kind)
    setTimeout(() => setCopied(null), 1800)
  }

  if (state === 'loading') return <RatLoader size={52} />

  if (state === 'notfound') {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="eyebrow">Desafio privado</p>
        <h1 className="h1 mt-3">Convite inválido ou expirado.</h1>
        <p className="lead mt-4">
          Este desafio não existe ou o link está incorreto. Peça um convite novo para quem já participa.
        </p>
        <Link to="/grupos" className="btn btn-ghost mt-8">Voltar</Link>
      </div>
    )
  }

  if (state === 'preview') {
    const pg = progress(preview.starts_on, preview.ends_on)
    return (
      <div className="max-w-lg mx-auto text-center py-10">
        {preview.photo_url && (
          <img
            src={preview.photo_url}
            alt={preview.name}
            className="w-full aspect-[16/9] object-cover rounded-3xl mb-10"
          />
        )}
        <p className="eyebrow">Convite para desafio privado</p>
        <h1 className="display mt-4 wrap-anywhere">{preview.name}</h1>
        {preview.description && <p className="lead mt-5 wrap-anywhere">{preview.description}</p>}
        <p className="label mt-6 num">
          {preview.member_count} {Number(preview.member_count) === 1 ? 'membro' : 'membros'}
          {pg && ` · ${pg.left} dias restantes`}
        </p>
        <button onClick={join} disabled={joining} className="btn btn-primary mt-9">
          {joining ? 'Entrando' : 'Entrar no desafio'}
        </button>
        <p className="text-sm text-faint mt-5">
          O ranking e o bate-papo só ficam visíveis depois que você entra.
        </p>
      </div>
    )
  }

  const pg = progress(group.starts_on, group.ends_on)

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/grupos" className="label hover:text-ink transition">← Desafios</Link>

      <h1 className="h1 mt-4 wrap-anywhere">{group.name}</h1>
      {group.description && <p className="text-muted mt-2 wrap-anywhere">{group.description}</p>}

      {/* Cartão da capa com o resumo */}
      <div className="card-soft overflow-hidden mt-6" data-reveal="scale">
        {group.photo_url ? (
          <div className="relative group/cover">
            <img src={group.photo_url} alt={group.name} className="w-full aspect-[16/9] object-cover" />
            {isOwner && (
              <button
                onClick={() => setEditing(true)}
                className="absolute top-3 right-3 btn btn-sm bg-black/60 text-white backdrop-blur-md"
              >
                Editar
              </button>
            )}
          </div>
        ) : (
          isOwner && (
            <button
              onClick={() => setEditing(true)}
              className="w-full py-10 text-center hover:opacity-90 transition border-b border-edge"
            >
              <p className="font-medium">Adicionar capa ao desafio</p>
              <p className="label mt-1">Aparece aqui no topo e no convite</p>
            </button>
          )
        )}

        <div className="grid grid-cols-3 divide-x divide-edge">
          <Summary
            avatar={<Avatar url={leader?.avatar_url} name={leader?.name || '?'} size={26} />}
            value={Number(leader?.active_days || 0)}
            label="Líder"
          />
          <Summary
            avatar={<Avatar url={me?.avatar_url} name={me?.name || '?'} size={26} />}
            value={Number(me?.active_days || 0)}
            label="Você"
          />
          <Summary
            value={pg ? pg.left : '∞'}
            label={pg ? 'dias restantes' : 'sem prazo'}
          />
        </div>
      </div>

      {/* Abas */}
      <div className="segmented w-full mt-8 grid grid-cols-4" data-reveal>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            data-active={tab === t.key}
            onClick={() => setTab(t.key)}
            className="relative"
          >
            {t.label}
            {t.key === 'chat' && unread > 0 && (
              <span
                className="absolute -top-0.5 right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold grid place-items-center num"
                style={{ background: '#d0342c', color: '#fff' }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Detalhes: timeline dos check-ins */}
      {tab === 'detalhes' && (
        <div className="mt-8 space-y-8">
          <Link to={`/checkin?grupo=${id}`} className="btn btn-primary w-full">
            Fazer check-in neste desafio
          </Link>

          {pg && (
            <div>
              <div className="h-1.5 rounded-full bg-card-2 overflow-hidden">
                <div className="h-full bg-brand rounded-full bar-fill" style={{ width: `${pg.pct}%` }} />
              </div>
              <div className="flex justify-between mt-2 label num">
                <span>{fmtDate(group.starts_on)}</span>
                <span>{fmtDate(group.ends_on)}</span>
              </div>
            </div>
          )}

          {byDay.length === 0 ? (
            <div className="card-soft py-16 text-center">
              <p className="h2">Nenhum check-in ainda.</p>
              <Link to={`/checkin?grupo=${id}`} className="btn btn-primary mt-6">Ser o primeiro</Link>
            </div>
          ) : (
            byDay.map(([dayKey, items]) => (
              <section key={dayKey}>
                <p className="label text-center mb-3">{fmtDayHeader(dayKey)}</p>
                <div className="space-y-2.5 stagger">
                  {items.map((it) => (
                    <div key={it.id} data-reveal>
                      <CheckinRow item={it} photoUrl={photoOf(it, photoUrls)} onOpen={setOpen} />
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}

          {/* Estatísticas */}
          {stats && (
            <section>
              <button
                type="button"
                onClick={() => setShowStats((v) => !v)}
                className="w-full flex items-center justify-between gap-4 py-2 group/stats"
              >
                <h2 className="h2">Estatísticas do grupo</h2>
                <span className="label flex items-center gap-1.5 group-hover/stats:text-ink transition">
                  {showStats ? 'Ver menos' : 'Ver mais'}
                  <span
                    className="inline-block transition-transform duration-300"
                    style={{ transform: showStats ? 'rotate(180deg)' : 'none' }}
                  >
                    ⌄
                  </span>
                </span>
              </button>

              {showStats && (
                <div className="card divide-y divide-edge overflow-hidden mt-4 rise">
                  <Row label="Check-ins totais" value={stats.total_checkins} />
                  <Row label="Total de dias ativos" value={stats.active_days} />
                  <Row label="Média de check-ins por dia" value={Math.round(Number(stats.avg_per_day))} />
                  <Row label="Tempo acumulado" value={fmtHours(stats.total_minutes)} />
                  <Row label="Membros" value={stats.member_count} />
                </div>
              )}
            </section>
          )}

          {/* Convite e ações */}
          <section className="pt-2">
            <p className="label mb-3">Convidar</p>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => copy('link')} className="btn btn-ghost btn-sm">
                {copied === 'link' ? 'Link copiado' : 'Copiar link'}
              </button>
              <button onClick={() => copy('code')} className="btn btn-ghost btn-sm num tracking-[0.15em]">
                {copied === 'code' ? 'Copiado' : group.invite_code}
              </button>
              {isOwner ? (
                <>
                  <button onClick={() => setEditing(true)} className="btn btn-ghost btn-sm">
                    Editar desafio
                  </button>
                  <button onClick={() => setAsk('delete')} className="text-sm text-faint hover:text-red-500 transition px-2 ml-auto">
                    Apagar
                  </button>
                </>
              ) : (
                <button onClick={() => setAsk('leave')} className="text-sm text-faint hover:text-red-500 transition px-2 ml-auto">
                  Sair do desafio
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === 'ranking' && (
        <div className="mt-8">
          <Leaderboard groupId={id} showPeriods={false} />
        </div>
      )}

      {tab === 'membros' && (
        <div className="mt-8">
          <GroupMembers groupId={id} />
        </div>
      )}

      {tab === 'chat' && (
        <div className="mt-8">
          <GroupChat groupId={id} />
        </div>
      )}

      <CheckinModal
        item={open}
        onClose={() => setOpen(null)}
        onReact={(sid, fields) => {
          setFeed((prev) => prev.map((it) => (it.id === sid ? { ...it, ...fields } : it)))
          setOpen((o) => (o && o.id === sid ? { ...o, ...fields } : o))
        }}
        onCountChange={(sid, n) => {
          setFeed((prev) => prev.map((it) => (it.id === sid ? { ...it, comment_count: n } : it)))
          setOpen((o) => (o && o.id === sid ? { ...o, comment_count: n } : o))
        }}
      />

      <EditGroup
        group={editing ? group : null}
        onClose={() => setEditing(false)}
        onSaved={(patch) => setGroup((g) => ({ ...g, ...patch }))}
      />

      <ConfirmDialog
        open={!!ask}
        danger
        loading={busy}
        title={ask === 'delete' ? 'Apagar desafio?' : 'Sair do desafio?'}
        confirmLabel={ask === 'delete' ? 'Sim, apagar' : 'Sim, sair'}
        cancelLabel="Não, voltar"
        onConfirm={runAction}
        onCancel={() => setAsk(null)}
      />
    </div>
  )
}

function Summary({ avatar, value, label }) {
  return (
    <div className="px-3 py-4 flex items-center justify-center gap-2.5">
      {avatar || (
        <div
          className="w-[26px] h-[26px] rounded-md grid place-items-center shrink-0"
          style={{ background: 'var(--s-card)' }}
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current stroke-[1.4] text-muted">
            <rect x="1.5" y="2.5" width="13" height="12" rx="2" />
            <path d="M1.5 6h13M5 1.5v2M11 1.5v2" />
          </svg>
        </div>
      )}
      <div className="min-w-0">
        <p className="num font-semibold leading-none">{value}</p>
        <p className="label mt-1 truncate">{label}</p>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between gap-4">
      <span className="text-muted text-sm">{label}</span>
      <span className="num text-xl font-semibold">{value}</span>
    </div>
  )
}
