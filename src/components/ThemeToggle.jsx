import { useTheme } from '../lib/theme'

const ORDER = ['auto', 'light', 'dark']
const LABEL = { auto: 'Auto', light: 'Claro', dark: 'Escuro' }

export default function ThemeToggle({ className = '' }) {
  const [theme, set] = useTheme()

  return (
    <button
      onClick={() => set(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length])}
      title={`Aparência: ${LABEL[theme]}. Clique para alternar.`}
      className={`text-sm text-muted hover:text-ink transition px-2 py-1 rounded-full ${className}`}
    >
      {LABEL[theme]}
    </button>
  )
}
