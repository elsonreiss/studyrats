/**
 * Ratinho correndo, em SVG.
 * Patas, rabo e corpo animados por CSS — sem imagem, sem sprite,
 * acompanha a cor do tema e pesa quase nada.
 */
export default function RunningRat({ size = 44, className = '', running = true }) {
  return (
    <span
      className={`rat ${running ? 'rat-running' : ''} ${className}`}
      style={{ width: size, height: size * 0.72, display: 'inline-block' }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 72" width="100%" height="100%">
        {/* rabo */}
        <path
          className="rat-tail"
          d="M18 44 C6 44 4 32 12 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* patas de trás */}
        <g stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" fill="none">
          <path className="rat-leg rat-leg-1" d="M32 48 L28 62" />
          <path className="rat-leg rat-leg-2" d="M40 48 L46 62" />
          {/* patas da frente */}
          <path className="rat-leg rat-leg-3" d="M62 48 L58 62" />
          <path className="rat-leg rat-leg-4" d="M70 47 L76 61" />
        </g>

        {/* corpo */}
        <g className="rat-body">
          <path
            d="M22 44 C20 30 32 22 48 22 C62 22 72 26 78 32 L88 34 C92 35 93 39 89 41 L84 43 C82 48 74 50 62 50 L34 50 C27 50 23 48 22 44 Z"
            fill="currentColor"
          />
          {/* orelha */}
          <circle cx="60" cy="24" r="7.5" fill="currentColor" />
          <circle cx="60" cy="24" r="3.8" className="rat-ear-inner" />
          {/* focinho */}
          <circle cx="90" cy="38" r="2.4" className="rat-nose" />
          {/* olho */}
          <circle cx="76" cy="33" r="2.2" className="rat-eye" />
        </g>
      </svg>
    </span>
  )
}
