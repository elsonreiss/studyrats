export function SkeletonBox({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} />
}

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <SkeletonBox className="w-full aspect-[4/3]" />
      <div className="p-6 space-y-3">
        <SkeletonBox className="h-3 w-20 rounded-full" />
        <SkeletonBox className="h-5 w-2/3 rounded-md" />
        <SkeletonBox className="h-3 w-full rounded-full" />
        <div className="flex items-center gap-2.5 pt-4">
          <SkeletonBox className="w-7 h-7 rounded-full" />
          <SkeletonBox className="h-3 w-24 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonCards({ count = 6, className = 'grid sm:grid-cols-2 lg:grid-cols-3 gap-6' }) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}

export function SkeletonRows({ count = 5 }) {
  return (
    <div className="card divide-y divide-edge overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="px-6 py-4 flex items-center gap-4">
          <SkeletonBox className="w-6 h-3 rounded-full" />
          <SkeletonBox className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBox className="h-4 w-40 rounded-md" />
            <SkeletonBox className="h-3 w-24 rounded-full" />
          </div>
          <SkeletonBox className="h-6 w-10 rounded-md" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonStats({ count = 3 }) {
  return (
    <div className={`grid grid-cols-${count} gap-4`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card-soft px-5 py-7 flex flex-col items-center gap-3">
          <SkeletonBox className="h-8 w-16 rounded-md" />
          <SkeletonBox className="h-3 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}
