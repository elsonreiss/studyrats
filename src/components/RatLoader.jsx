import RunningRat from './RunningRat'

/**
 * Carregamento com o ratinho correndo em uma pista curta,
 * no lugar do retângulo cinza piscando.
 */
export default function RatLoader({ label = 'Carregando', size = 44, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-14 ${className}`}>
      <div className="relative" style={{ width: 200, height: size * 0.9 }}>
        {/* rastro */}
        <span
          className="rat-dust absolute top-1/2 -translate-y-1/2 w-6 space-y-1 text-brand rat-loop-dust"
          aria-hidden="true"
        >
          <span /><span /><span />
        </span>

        <span className="rat-loop absolute top-0">
          <RunningRat size={size} />
        </span>
      </div>

      {/* chão */}
      <span
        className="block rounded-full mt-1"
        style={{ width: 200, height: 2, background: 'var(--s-edge)' }}
      />

      {label && <p className="label mt-4">{label}</p>}
    </div>
  )
}
