import { useCountUp } from '../lib/motion'

export default function Stat({ label, value, format, hint }) {
  const numeric = typeof value === 'number'
  const [ref, animated] = useCountUp(numeric ? value : 0)

  const shown = numeric
    ? format
      ? format(Math.round(animated))
      : Math.round(animated).toLocaleString('pt-BR')
    : value

  return (
    <div ref={ref} className="card-soft px-5 py-7 text-center lift">
      <p className="num text-3xl sm:text-4xl font-semibold text-ink leading-none">{shown}</p>
      <p className="label mt-2.5">{label}</p>
      {hint && <p className="text-xs text-faint mt-1">{hint}</p>}
    </div>
  )
}
