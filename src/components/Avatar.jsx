export default function Avatar({ url, name, size = 40 }) {
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0"
      />
    )
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size / 2.8) }}
      className="rounded-full bg-card-2 text-muted grid place-items-center font-semibold shrink-0 select-none"
    >
      {initials}
    </div>
  )
}
