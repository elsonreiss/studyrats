import { useState, useMemo } from 'react'
import { todayISO } from '../lib/supabase'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export default function CheckinCalendar({ sessions = [], photoUrls = {}, onSelectDay }) {
  const now = new Date()
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() })

  const byDay = useMemo(() => {
    const map = new Map()
    for (const s of sessions) {
      const arr = map.get(s.studied_at) || []
      arr.push(s)
      map.set(s.studied_at, arr)
    }
    return map
  }, [sessions])

  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const offset = new Date(cursor.y, cursor.m, 1).getDay()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const todayStr = todayISO()

  const monthKey = (day) =>
    `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const monthCount = cells.filter((d) => d && byDay.has(monthKey(d))).length

  function shift(delta) {
    const d = new Date(cursor.y, cursor.m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  return (
    <div className="card-soft p-6 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => shift(-1)}
          className="w-9 h-9 rounded-full text-muted hover:text-ink hover:bg-card transition grid place-items-center text-lg"
          aria-label="Mês anterior"
        >
          ‹
        </button>

        <div className="text-center">
          <p className="h2 capitalize">
            {MONTHS[cursor.m]} <span className="num text-muted font-normal">{cursor.y}</span>
          </p>
          <p className="label mt-1">
            <span className="text-brand font-semibold num">{monthCount}</span> dias com check-in
          </p>
        </div>

        <button
          onClick={() => shift(1)}
          className="w-9 h-9 rounded-full text-muted hover:text-ink hover:bg-card transition grid place-items-center text-lg"
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>

      <div key={`${cursor.y}-${cursor.m}`} className="grid grid-cols-7 gap-1.5 sm:gap-2 rise">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="label text-center pb-2 font-semibold">{w}</div>
        ))}

        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const key = monthKey(day)
          const items = byDay.get(key)
          const isToday = key === todayStr
          const first = items?.find((s) => s.thumb_path || s.photo_path || s.photo_url)
          const photo = first
            ? photoUrls[first.thumb_path] || photoUrls[first.photo_path] || first.photo_url
            : null

          return (
            <button
              key={key}
              onClick={() => items && onSelectDay?.(key, items)}
              disabled={!items}
              className={`relative aspect-square rounded-2xl overflow-hidden text-sm group transition-transform duration-300 ease-out ${
                items ? 'cursor-pointer hover:scale-[1.07] hover:z-10 active:scale-95' : 'cursor-default'
              }`}
              style={{
                background: items ? 'var(--s-brand)' : 'var(--s-card)',
                color: items ? 'var(--s-on-brand)' : 'var(--s-faint)',
              }}
            >
              {photo && (
                <>
                  <img
                    src={photo}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <span className="absolute inset-0 bg-black/45 group-hover:bg-black/30 transition" />
                </>
              )}

              <span className={`num relative font-medium ${photo ? 'text-white' : ''}`}>{day}</span>

              {isToday && (
                <span
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: items || photo ? '#fff' : 'var(--s-brand)' }}
                />
              )}
              {items?.length > 1 && (
                <span className={`num absolute top-1.5 right-2 text-[10px] font-semibold ${photo ? 'text-white' : ''}`}>
                  {items.length}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
