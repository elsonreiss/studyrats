import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, fmtDate } from '../lib/supabase'
import { useAuth } from '../App'
import Avatar from './Avatar'
import Streak from './Streak'
import { SkeletonRows } from './Skeleton'

export default function GroupMembers({ groupId }) {
  const { user } = useAuth()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    supabase
      .rpc('get_group_members', { p_group_id: groupId })
      .then(({ data }) => setRows(data || []))
  }, [groupId])

  if (rows === null) return <SkeletonRows count={4} />

  return (
    <div className="card divide-y divide-edge overflow-hidden stagger">
      {rows.map((m) => (
        <div
          key={m.user_id}
          data-reveal="left"
          className={`px-5 sm:px-6 py-4 flex items-center gap-4 transition-colors duration-300 ${
            m.user_id === user.id ? 'bg-brand-soft' : 'hover:bg-card-2'
          }`}
        >
          <Avatar url={m.avatar_url} name={m.name} size={40} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/perfil/${m.user_id}`} className="font-medium hover:text-brand transition truncate">
                {m.name}
              </Link>
              {m.is_owner && <span className="chip text-[11px] py-0.5">dono</span>}
              {m.user_id === user.id && <span className="label text-brand">você</span>}
            </div>
            <p className="label mt-0.5">entrou em {fmtDate(m.joined_at)}</p>
          </div>

          {Number(m.current_streak) > 0 && (
            <Streak days={m.current_streak} showLabel={false} />
          )}

          <div className="text-right shrink-0">
            <p className="num font-semibold leading-none">{m.active_days}</p>
            <p className="label mt-1">dias</p>
          </div>
        </div>
      ))}
    </div>
  )
}
