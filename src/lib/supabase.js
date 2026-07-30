import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
}

export const supabase = createClient(url, key)

export function fmtHours(minutes) {
  const m = Number(minutes) || 0
  if (m === 0) return '—'
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r}m`
  if (r === 0) return `${h}h`
  return `${h}h ${r}m`
}

export function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

const MONTHS_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const WEEKDAYS_FULL = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado',
]

/** "segunda-feira, jul. 27" — com Hoje/Ontem quando aplicável. */
export function fmtDayHeader(iso) {
  const key = iso.slice(0, 10)
  if (key === todayISO()) return 'Hoje'
  if (key === daysAgoISO(1)) return 'Ontem'
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${WEEKDAYS_FULL[date.getDay()]}, ${MONTHS_ABBR[m - 1]}. ${d}`
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Fuso oficial do app: o dia vira à meia-noite de Brasília. */
export const TIMEZONE = 'America/Sao_Paulo'

const isoFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Data de hoje (YYYY-MM-DD) no horário de Brasília. */
export function todayISO() {
  return isoFormatter.format(new Date())
}

/** Data de N dias atrás (YYYY-MM-DD) no horário de Brasília. */
export function daysAgoISO(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return isoFormatter.format(d)
}

/** Comprime e envia uma imagem, devolvendo a URL pública. */
export async function uploadImage(bucket, userId, file, opts = {}) {
  const blob = await compressImage(file, opts.max ?? 1400, opts.quality ?? 0.82)
  const path = opts.path ?? `${userId}/${Date.now()}.jpg`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: !!opts.path })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return opts.path ? `${data.publicUrl}?t=${Date.now()}` : data.publicUrl
}

/**
 * Tamanhos das fotos de check-in.
 * Calibrados para caber no plano gratuito do Supabase: ~130 KB por check-in
 * (contra ~345 KB antes), sem perda perceptível numa tela de celular.
 */
export const PHOTO_FULL_PX = 900
export const PHOTO_FULL_Q = 0.72
export const PHOTO_THUMB_PX = 300
export const PHOTO_THUMB_Q = 0.7

/**
 * Envia a foto de um check-in em duas resoluções (original e miniatura)
 * para o bucket privado. Devolve os caminhos — a URL é assinada na hora de exibir.
 */
export async function uploadCheckinPhoto(userId, file) {
  const stamp = Date.now()
  const base = `${userId}/${stamp}`

  const [full, thumb] = await Promise.all([
    compressImage(file, PHOTO_FULL_PX, PHOTO_FULL_Q),
    compressImage(file, PHOTO_THUMB_PX, PHOTO_THUMB_Q),
  ])

  const up = (path, blob) =>
    supabase.storage.from('checkins').upload(path, blob, { contentType: 'image/jpeg' })

  const [a, b] = await Promise.all([up(`${base}.jpg`, full), up(`${base}_t.jpg`, thumb)])
  if (a.error) throw a.error
  if (b.error) throw b.error

  return { photoPath: `${base}.jpg`, thumbPath: `${base}_t.jpg` }
}

/** Reduz a foto antes do upload (economiza banda e o limite do plano free). */
export function compressImage(file, max = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = () => { img.src = reader.result }
    reader.onerror = reject
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('falha ao processar imagem'))), 'image/jpeg', quality)
    }
    img.onerror = reject
    reader.readAsDataURL(file)
  })
}
