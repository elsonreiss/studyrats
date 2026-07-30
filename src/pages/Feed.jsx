import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase, fmtHours } from '../lib/supabase'
import { useSignedPhotos, photoOf } from '../lib/photos'
import Stat from '../components/Stat'
import CheckinCard from '../components/CheckinCard'
import CheckinModal from '../components/CheckinModal'
import Streak, { FlameIcon } from '../components/Streak'
import { SkeletonCards, SkeletonStats } from '../components/Skeleton'

// páginas menores: menos imagens baixadas por visita
const PAGE = 12

export default function Feed() {
  const [items, setItems] = useState(null)
  const [more, setMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [streak, setStreak] = useState(null)
  const [mine, setMine] = useState([])
  const [open, setOpen] = useState(null)

  const urls = useSignedPhotos(items || [])

  const load = useCallback(async () => {
    const [{ data: feed }, { data: st }, { data: my }] = await Promise.all([
      supabase.rpc('get_feed', { p_limit: PAGE, p_offset: 0 }),
      supabase.rpc('get_my_streak'),
      supabase.from('study_sessions').select('minutes, studied_at'),
    ])
    setItems(feed || [])
    setMore((feed || []).length === PAGE)
    setStreak(st?.[0] || null)
    setMine(my || [])
  }, [])

  useEffect(() => { load() }, [load])

  async function loadMore() {
    setLoadingMore(true)
    const { data } = await supabase.rpc('get_feed', { p_limit: PAGE, p_offset: items.length })
    setItems((prev) => [...prev, ...(data || [])])
    setMore((data || []).length === PAGE)
    setLoadingMore(false)
  }

  function patch(id, fields) {
    setItems((prev) => prev?.map((it) => (it.id === id ? { ...it, ...fields } : it)) || prev)
    setOpen((o) => (o && o.id === id ? { ...o, ...fields } : o))
  }

  const activeDays = new Set(mine.map((s) => s.studied_at)).size
  const totalMin = mine.reduce((a, s) => a + (s.minutes || 0), 0)

  return (
    <div className="space-y-20">
      <section className="text-center stagger">
        <h1 className="display" data-reveal>Feed.</h1>
        <p className="lead mt-5 max-w-lg mx-auto" data-reveal>
          Todo check-in vem com foto. Sem foto, não conta.
        </p>
        <div data-reveal className="mt-8">
          <Link to="/checkin" className="btn btn-primary">Novo check-in</Link>
        </div>
      </section>

      {/* Sequência */}
      {streak && Number(streak.current_streak) > 0 && (
        <section
          className={`card-soft px-8 py-7 flex items-center justify-between gap-6 flex-wrap ${
            streak.checked_today ? '' : 'border border-edge'
          }`}
          data-reveal
        >
          <div className="flex items-center gap-4">
            <span className="flame" style={{ fontSize: 34 }}>
              <FlameIcon size={38} />
            </span>
            <div>
              <p className="num text-3xl font-semibold leading-none">
                {streak.current_streak}
                <span className="text-muted text-lg font-normal ml-2">
                  {Number(streak.current_streak) === 1 ? 'dia seguido' : 'dias seguidos'}
                </span>
              </p>
              <p className="label mt-2">
                {streak.checked_today
                  ? `Recorde: ${streak.longest_streak} dias`
                  : 'Faça check-in hoje para não perder a sequência'}
              </p>
            </div>
          </div>
          {!streak.checked_today && (
            <Link to="/checkin" className="btn btn-primary">Manter a sequência</Link>
          )}
        </section>
      )}

      {streak && Number(streak.current_streak) === 0 && (
        <section className="card-soft px-8 py-12 text-center" data-reveal>
          <h2 className="h1">Comece uma sequência hoje.</h2>
          <p className="lead mt-3">Dias seguidos com check-in valem mais que maratonas isoladas.</p>
          <Link to="/checkin" className="btn btn-primary mt-7">Fazer check-in</Link>
        </section>
      )}

      {/* Métricas */}
      {items === null ? (
        <SkeletonStats count={3} />
      ) : (
        <section className="grid grid-cols-3 gap-4 stagger">
          <div data-reveal="scale"><Stat label="Meus check-ins" value={mine.length} /></div>
          <div data-reveal="scale"><Stat label="Dias ativos" value={activeDays} /></div>
          <div data-reveal="scale"><Stat label="Duração total" value={totalMin} format={fmtHours} /></div>
        </section>
      )}

      <section>
        <h2 className="h1 text-center mb-14" data-reveal>Últimos check-ins.</h2>

        {items === null && <SkeletonCards count={6} />}

        {items?.length === 0 && (
          <div className="card-soft py-20 text-center" data-reveal>
            <p className="h2">Nenhum check-in ainda.</p>
            <Link to="/checkin" className="btn btn-primary mt-6">Ser o primeiro</Link>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
          {items?.map((it) => (
            <div key={it.id} data-reveal="scale">
              <CheckinCard
                item={it}
                photoUrl={photoOf(it, urls)}
                onOpen={setOpen}
                onReact={patch}
              />
            </div>
          ))}
        </div>

        {more && (
          <div className="flex justify-center mt-12">
            <button onClick={loadMore} disabled={loadingMore} className="btn btn-ghost">
              {loadingMore ? 'Carregando' : 'Carregar mais'}
            </button>
          </div>
        )}
      </section>

      <CheckinModal
        item={open}
        onClose={() => setOpen(null)}
        onReact={patch}
        onCountChange={(id, n) => patch(id, { comment_count: n })}
      />
    </div>
  )
}
