export default function PageHeader({ eyebrow, title, subtitle, action, center = false }) {
  return (
    <div
      className={`flex gap-6 flex-wrap ${
        center ? 'flex-col items-center text-center' : 'items-end justify-between'
      }`}
    >
      <div className={center ? 'max-w-xl' : ''}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="h1 mt-2">{title}</h1>
        {subtitle && <p className="lead mt-3 max-w-xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
