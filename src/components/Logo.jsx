import { useTheme } from '../lib/theme'

export default function Logo({ className = 'h-11 w-auto' }) {
  const [, , dark] = useTheme()
  return (
    <img
      src={dark ? '/logo.png' : '/logo-light.png'}
      alt="StudyRats"
      className={className}
    />
  )
}
