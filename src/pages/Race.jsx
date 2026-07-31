import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase, fmtDate } from '../lib/supabase'
import { useAuth } from '../App'
import Avatar from '../components/Avatar'
import Stat from '../components/Stat'
import Streak from '../components/Streak'
import RunningRat from '../components/RunningRat'
import RatLoader from '../components/RatLoader'

const GOAL = 100
const MARKS = [0, 25, 50, 75, 100]

export default function Race() {
  const { user } = useAuth()
  const [rows, setRows] = useState(null)
  const [summary, setSummary] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.rpc('get_race', { p_goal: GOAL }),
      supabase.rpc('get_race_summary', { p_goal: GOAL }),
    ]).then(([r, s]) => {
      setRows(r.data || [])
      setSummary(s.data?.[0] || null)
      // pequeno atraso para as barras animarem do zero
      setTimeout(() => setReady(true), 80)
    })
  }, [])

  const me = rows?.find((r) => r.user_id === user.id)

  // distribui verticalmente quem está em posições próximas, para os avatares não colidirem
  const track = useMemo(() => {
    if (!rows) return []
    const sorted = [...rows].sort((a, b) => Number(a.pct) - Number(b.pct))
    const lanes = []
    return sorted.map((r) => {
      const pct = Number(r.pct)
      let lane = 0
      while (lanes[lane] !== undefined && pct - lanes[lane] < 9) lane++
      lanes[lane] = pct
      return { ...r, lane: lane % 4 }
    })
  }, [rows])

  const laneCount = track.length ? Math.max(...track.map((t) => t.lane)) + 1 : 1

  // ritmo médio da comunidade: é onde o ratinho corre
  const pace = summary ? Number(summary.avg_pct) : 0
  const aheadOfPace = me ? Number(me.pct) >= pace : false

  return (
    <div className="space-y-16">
      <section className="text-center stagger">
        <p className="eyebrow" data-reveal>Acelera Devs</p>
        <h1 className="display mt-3" data-reveal>100 dias.</h1>
      </section>

      {rows === null && <RatLoader size={52} />}

      {rows?.length === 0 && (
        <div className="card-soft py-24 text-center" data-reveal>
          <p className="h2">A corrida ainda não começou.</p>
          <p className="lead mt-2">Faça o primeiro check-in e largue na frente.</p>
          <Link to="/checkin" className="btn btn-primary mt-7">Fazer check-in</Link>
        </div>
      )}

      {rows?.length > 0 && (
        <>
          {/* Seu progresso */}
          {me && (
            <section className="card-soft p-8" data-reveal>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <Avatar url={me.avatar_url} name={me.name} size={52} />
                  <div>
                    <p className="label">Seu progresso</p>
                    <p className="num text-2xl font-semibold mt-0.5">
                      {me.days} <span className="text-faint text-lg">/ {GOAL} dias</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="num text-3xl font-bold text-brand">{Number(me.pct).toFixed(0)}%</p>
                  <div className="flex items-center justify-end gap-3 mt-1.5">
                    {Number(me.current_streak) > 0 && (
                      <Streak days={me.current_streak} atRisk={!me.checked_today} showLabel={false} />
                    )}
                    <p className="label">
                      {me.checked_today ? 'check-in feito hoje' : 'sem check-in hoje'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-3 rounded-full bg-card overflow-hidden mt-6">
                <div
                  className="h-full rounded-full transition-[width] duration-[1400ms] ease-out"
                  style={{
                    width: ready ? `${me.pct}%` : '0%',
                    background: 'linear-gradient(90deg, var(--s-brand-hover), var(--s-brand))',
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-4 mt-3 flex-wrap">
                <p className="label">
                  {me.finished
                    ? 'Meta concluída.'
                    : `Faltam ${GOAL - Number(me.days)} dias para os 100.`}
                </p>
                {!me.finished && summary && (
                  <p className="label flex items-center gap-1.5">
                    <RunningRat size={22} running={aheadOfPace} />
                    {aheadOfPace ? 'acima do ritmo da comunidade' : 'abaixo do ritmo da comunidade'}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Pista geral */}
          <section data-reveal>
            <h2 className="h1 text-center mb-10">A pista.</h2>

            <div className="card-soft p-6 sm:p-10 overflow-hidden">
              <div
                className="relative"
                style={{ height: `${Math.max(150, laneCount * 46 + 76)}px` }}
              >
                {/* ratinho do ritmo médio */}
                <div
                  className="absolute z-30"
                  style={{
                    bottom: '1.5rem',
                    left: ready ? `${pace}%` : '0%',
                    transform: 'translateX(-50%)',
                    transition: 'left 2000ms cubic-bezier(.25,.8,.3,1)',
                    transitionDelay: '250ms',
                  }}
                  title={`Ritmo médio da comunidade: ${pace.toFixed(0)}%`}
                >
                  <div className="relative flex flex-col items-center">
                    {/* rastro */}
                    <span
                      className="rat-dust absolute right-full top-1/2 -translate-y-1/2 mr-1 w-6 space-y-1 text-brand"
                      aria-hidden="true"
                    >
                      <span /><span /><span />
                    </span>
                    <RunningRat size={46} />
                    <span className="label num mt-0.5 whitespace-nowrap text-brand">
                      ritmo {pace.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* marcos */}
                {MARKS.map((m) => (
                  <div
                    key={m}
                    className="absolute top-0 bottom-16 w-px"
                    style={{
                      left: `${m}%`,
                      background: m === 100 ? 'var(--s-brand)' : 'var(--s-edge)',
                    }}
                  >
                    <span
                      className="label num absolute -bottom-5 -translate-x-1/2 whitespace-nowrap"
                      style={{ color: m === 100 ? 'var(--s-brand)' : undefined }}
                    >
                      {m === 100 ? 'meta' : m}
                    </span>
                  </div>
                ))}

                {/* corredores */}
                {track.map((r) => {
                  const mine = r.user_id === user.id
                  return (
                    <Link
                      key={r.user_id}
                      to={`/perfil/${r.user_id}`}
                      title={`${r.name} · ${r.days} dias`}
                      className="absolute group"
                      style={{
                        top: `${r.lane * 46}px`,
                        left: ready ? `${r.pct}%` : '0%',
                        transform: 'translateX(-50%)',
                        transition: 'left 1600ms cubic-bezier(.2,.8,.25,1)',
                        transitionDelay: `${r.lane * 90}ms`,
                        zIndex: mine ? 20 : 10,
                      }}
                    >
                      {/* rastro */}
                      <span
                        className="absolute right-1/2 top-1/2 -translate-y-1/2 h-[3px] rounded-full pointer-events-none"
                        style={{
                          width: '54px',
                          background: mine
                            ? 'linear-gradient(90deg, transparent, var(--s-brand))'
                            : 'linear-gradient(90deg, transparent, var(--s-edge-strong))',
                          opacity: 0.9,
                        }}
                      />
                      <span
                        className="relative block rounded-full transition-transform duration-300 group-hover:scale-110"
                        style={{
                          padding: 2,
                          background: mine ? 'var(--s-brand)' : 'var(--s-edge-strong)',
                        }}
                      >
                        <Avatar url={r.avatar_url} name={r.name} size={34} />
                        {r.checked_today && (
                          <span
                            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                            style={{ background: 'var(--s-brand)', borderColor: 'var(--s-alt)' }}
                          />
                        )}
                      </span>
                      <span className="absolute left-1/2 -translate-x-1/2 mt-1 label num whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
                        {r.name.split(' ')[0]} · {r.days}
                      </span>
                    </Link>
                  )
                })}

                {/* linha de chegada */}
                <div
                  className="absolute right-0 top-0 bottom-16 w-1.5 rounded-full"
                  style={{ background: 'var(--s-brand)' }}
                />
              </div>
            </div>

          </section>

          {/* Resumo da comunidade */}
          {summary && (
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger">
              <div data-reveal="scale"><Stat label="Participantes" value={Number(summary.participants)} /></div>
              <div data-reveal="scale"><Stat label="Dias somados" value={Number(summary.total_days)} /></div>
              <div data-reveal="scale"><Stat label="Ativos hoje" value={Number(summary.active_today)} /></div>
              <div data-reveal="scale"><Stat label="Concluíram" value={Number(summary.finished)} /></div>
            </section>
          )}

          {/* Raias individuais */}
          <section>
            <h2 className="h1 text-center mb-10" data-reveal>Classificação.</h2>

            <div className="card divide-y divide-edge overflow-hidden stagger">
              {rows.map((r, i) => {
                const mine = r.user_id === user.id
                return (
                  <div
                    key={r.user_id}
                    data-reveal="left"
                    className={`px-5 sm:px-6 py-5 transition-colors duration-300 ${
                      mine ? 'bg-brand-soft' : 'hover:bg-card-2'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="num text-sm text-faint w-6 shrink-0">{i + 1}</span>
                      <Avatar url={r.avatar_url} name={r.name} size={36} />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/perfil/${r.user_id}`}
                          className="font-medium hover:text-brand transition truncate block"
                        >
                          {r.name}
                          {mine && <span className="label text-brand ml-2">você</span>}
                        </Link>
                        <div className="flex items-center gap-3 mt-0.5">
                          <p className="label">
                            {r.checked_today ? 'check-in hoje' : `último em ${fmtDate(r.last_day)}`}
                          </p>
                          {Number(r.current_streak) > 1 && (
                            <Streak days={r.current_streak} atRisk={!r.checked_today} showLabel={false} />
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="num font-semibold leading-none">
                          {r.days}<span className="text-faint">/{GOAL}</span>
                        </p>
                        <p className="label mt-1 num">{Number(r.pct).toFixed(0)}%</p>
                      </div>
                    </div>

                    <div className="h-2 rounded-full bg-card-2 overflow-hidden mt-3.5 ml-10">
                      <div
                        className="h-full rounded-full transition-[width] duration-[1400ms] ease-out"
                        style={{
                          width: ready ? `${r.pct}%` : '0%',
                          transitionDelay: `${Math.min(i, 12) * 60}ms`,
                          background: mine
                            ? 'linear-gradient(90deg, var(--s-brand-hover), var(--s-brand))'
                            : 'var(--s-edge-strong)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
