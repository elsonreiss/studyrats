/**
 * A marca é só a ilustração. O nome vem como texto ao lado,
 * o que fica mais legível em tamanhos pequenos do que um logo com letras.
 */
export default function Logo({ className = 'h-10 w-auto', wordmark = false, textClass = 'text-lg' }) {
  const mark = <img src="/logo.png" alt="StudyRats" className={className} />

  if (!wordmark) return mark

  return (
    <span className="flex items-center gap-2.5">
      {mark}
      <span className={`font-bold tracking-tight ${textClass}`}>
        Study<span className="text-brand">Rats</span>
      </span>
    </span>
  )
}
