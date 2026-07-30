import { useState } from 'react'
import { useReminder } from '../lib/reminder'

const HOURS = [18, 19, 20, 21, 22, 23]

export default function ReminderToggle() {
  const { on, hour, toggle, changeHour, supported } = useReminder()
  const [msg, setMsg] = useState(null)

  if (!supported) return null

  async function click() {
    const ok = await toggle()
    if (ok === false && !on) setMsg('Permissão negada. Libere as notificações nas configurações do navegador.')
    else setMsg(null)
  }

  return (
    <div className="card-soft p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold">Lembrete diário</h3>
          <p className="text-sm text-muted mt-1 max-w-sm leading-relaxed">
            Um aviso no fim do dia se você ainda não tiver feito check-in.
          </p>
        </div>

        <button
          type="button"
          onClick={click}
          role="switch"
          aria-checked={on}
          className="relative w-12 h-7 rounded-full transition-colors shrink-0"
          style={{ background: on ? 'var(--s-brand)' : 'var(--s-edge-strong)' }}
        >
          <span
            className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300"
            style={{ left: on ? '26px' : '4px' }}
          />
        </button>
      </div>

      {on && (
        <div className="flex items-center gap-3 mt-5">
          <label className="label">Avisar às</label>
          <select
            className="field num !w-auto !py-1.5 !px-3 text-sm"
            value={hour}
            onChange={(e) => changeHour(Number(e.target.value))}
          >
            {HOURS.map((h) => <option key={h} value={h}>{h}:00</option>)}
          </select>
        </div>
      )}

      {msg && <p className="text-red-500 text-sm mt-4">{msg}</p>}

      {on && (
        <p className="text-xs text-faint mt-4 leading-relaxed">
          O aviso é disparado pelo próprio dispositivo. Instale o app na tela inicial
          para que ele funcione mesmo com o navegador fechado.
        </p>
      )}
    </div>
  )
}
