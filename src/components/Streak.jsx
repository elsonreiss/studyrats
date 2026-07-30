export function FlameIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12.8 2.2c.3 2.6-.7 4.1-2 5.4-1.4 1.4-3.1 2.7-3.1 5.6a6.3 6.3 0 0 0 12.6 0c0-3.5-2.4-5.6-4.1-8-.8-1.1-1.6-2.2-1.6-3.6 0-.5-.6-.8-.9-.4-.3.4-.7.7-.9 1Z" opacity=".55" />
      <path d="M12 21.8a4.1 4.1 0 0 0 4.1-4.1c0-2.1-1.7-3.4-2.6-5-.4-.7-.7-1.5-.7-2.4 0-.5-.6-.7-.9-.3-1.3 1.7-4 3.4-4 7.7A4.1 4.1 0 0 0 12 21.8Z" />
    </svg>
  )
}

/** Sequência de dias seguidos. `atRisk` = ainda não fez check-in hoje. */
export default function Streak({ days, atRisk = false, size = 'md', showLabel = true }) {
  const n = Number(days || 0)
  if (n <= 0) return null

  const big = size === 'lg'

  return (
    <span
      className={`flame ${big ? 'text-2xl font-semibold' : 'text-sm font-medium'}`}
      style={atRisk ? { opacity: 0.55 } : undefined}
      title={atRisk ? 'Faça check-in hoje para não perder a sequência' : 'Dias seguidos'}
    >
      <FlameIcon size={big ? 26 : 16} />
      <span className="num">{n}</span>
      {showLabel && (
        <span className={big ? 'text-muted text-base font-normal' : 'label !text-inherit opacity-80'}>
          {n === 1 ? 'dia seguido' : 'dias seguidos'}
        </span>
      )}
    </span>
  )
}
