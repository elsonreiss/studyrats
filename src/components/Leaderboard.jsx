import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, fmtHours, daysAgoISO } from '../lib/supabase'
import { useAuth } from '../App'
import Avatar from './Avatar'
import Segmented from './Segmented'
import RatLoader from './RatLoader'

const periods = [
  { key: 'all', label: 'Geral' },
  { key: 'month', label: '30 dias' },
  { key: 'week', label: '7 dias' },
]

/**
 * A janela inclui hoje. Antes eu usava daysAgoISO(7), que somava
 * hoje + 7 dias anteriores = 8 dias — por isso o contador parecia
 * travar em 8 e nunca passar disso.
 */
function sinceFor(period) {
  if (period === 'week') return daysAgoISO(6)
  if (period === 'month') return daysAgoISO(29)
  return null
}

const HINTS = {
  week: 'Contando os últimos 7 dias — o máximo possível aqui é 7.',
  month: 'Contando os últimos 30 dias — o máximo possível aqui é 30.',
  all: null,
}

const MEDAL = ['#c8a021', '#8e8e93', '#a86b3c']

export default function Leaderboard({ groupId = null, limit = null, showPeriods = true }) {
  const { user } = useAuth()
  // "Geral" como padrão: é o único que cresce para sempre.
  // Antes abria em "7 dias" e o número parecia empacado no teto da janela.
  const [period, setPeriod] = useState('all')
  const [rows, setRows] = useState(null)

  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    setRows(null)
    setError(false)
    supabase
      .rpc('get_leaderboard', { p_since: sinceFor(period), p_group_id: groupId })
      .then(({ data, error: err }) => {
        // a troca rápida de período pode fazer uma resposta antiga
        // chegar depois da nova; o guard impede que ela sobrescreva
        if (!alive) return
        if (err) { setError(true); setRows([]) } else setRows(data || [])
      })
    return () => { alive = false }
  }, [period, groupId])

  const list = limit ? rows?.slice(0, limit) : rows
  const podium = list?.slice(0, 3) || []
  const rest = list?.slice(3) || []
  const top = Number(rows?.[0]?.active_days || 0)

  return (
    <div className="space-y-10">
      {showPeriods && (
        <div className="flex flex-col items-center gap-3" data-reveal>
          <Segmented options={periods} value={period} onChange={setPeriod} />
          {HINTS[period] && <p className="label">{HINTS[period]}</p>}
        </div>
      )}

      {rows === null && <RatLoader />}

      {error && (
        <div className="card-soft py-16 text-center">
          <p className="h2">Não foi possível carregar o ranking.</p>
          <p className="lead mt-2">Verifique sua conexão e tente de novo.</p>
        </div>
      )}

      {!error && rows?.length === 0 && (
        <div className="card-soft py-20 text-center" data-reveal>
          <p className="h2">Ninguém pontuou ainda.</p>
          <p className="lead mt-2">Registre um check-in para abrir o ranking.</p>
        </div>
      )}

      {/* Pódio */}
      {podium.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 sm:gap-6 items-end stagger" key={`p-${period}-${groupId}`}>
          {[podium[1], podium[0], podium[2]].map((r, idx) => {
            const place = [1, 0, 2][idx]
            const days = Number(r.active_days)
            return (
              <div key={r.user_id} data-reveal="scale">
                <Link
                  to={`/perfil/${r.user_id}`}
                  className="card-soft lift flex flex-col items-center text-center px-3 pb-6 h-full"
                  style={{ paddingTop: place === 0 ? '3rem' : '2rem' }}
                >
                  <div className="transition-transform duration-500 hover:scale-105">
                    <Avatar url={r.avatar_url} name={r.name} size={place === 0 ? 76 : 60} />
                  </div>
                  <p className="num font-bold mt-3 text-lg" style={{ color: MEDAL[place] }}>
                    {place + 1}º
                  </p>
                  <p className="font-medium truncate max-w-full mt-1">{r.name}</p>
                  <p className="num text-2xl font-semibold mt-3">{days}</p>
                  <p className="label">{days === 1 ? 'dia ativo' : 'dias ativos'}</p>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Lista */}
      {(podium.length >= 3 ? rest : list)?.length > 0 && (
        <div
          className="card divide-y divide-edge overflow-hidden stagger"
          key={`l-${period}-${groupId}`}
        >
          {(podium.length >= 3 ? rest : list).map((r, i) => {
            const rank = podium.length >= 3 ? i + 4 : i + 1
            const isMe = r.user_id === user.id
            const days = Number(r.active_days)
            const pct = top ? (days / top) * 100 : 0
            return (
              <div
                key={r.user_id}
                data-reveal="left"
                className={`relative px-6 py-4 flex items-center gap-4 transition-colors duration-300 ${
                  isMe ? 'bg-brand-soft' : 'hover:bg-card-2'
                }`}
              >
                <span
                  className="absolute left-0 top-0 bottom-0 bar-fill pointer-events-none"
                  style={{
                    width: `${pct}%`,
                    background: 'color-mix(in srgb, var(--s-brand) 7%, transparent)',
                    animationDelay: `${i * 70}ms`,
                  }}
                />
                <span className="num text-sm text-faint w-6 shrink-0 relative">{rank}</span>
                <Avatar url={r.avatar_url} name={r.name} size={40} />
                <div className="min-w-0 flex-1 relative">
                  <Link to={`/perfil/${r.user_id}`} className="font-medium hover:text-brand transition-colors duration-300 truncate block">
                    {r.name}
                    {isMe && <span className="label ml-2 text-brand">você</span>}
                  </Link>
                  <p className="label mt-0.5">
                    {r.checkin_count} check-ins
                    {Number(r.total_minutes) > 0 && ` · ${fmtHours(r.total_minutes)}`}
                  </p>
                </div>
                <div className="text-right shrink-0 relative">
                  <p className="num text-lg font-semibold leading-none">{days}</p>
                  <p className="label mt-1">dias</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
