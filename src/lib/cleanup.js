import { supabase, daysAgoISO } from './supabase'
import { forgetPaths } from './photos'

/**
 * Depois desse prazo a imagem é apagada, mas o check-in continua existindo:
 * dias ativos, sequência, ranking e a corrida dos 100 dias não mudam.
 * É o que trava o crescimento do storage num teto em vez de crescer para sempre.
 */
export const PHOTO_RETENTION_DAYS = 60

const LAST_RUN = 'sr-purge-last'
const BATCH = 200

/** Apaga as fotos antigas do próprio usuário. Devolve quantos check-ins foram limpos. */
export async function purgeOldPhotos(userId) {
  const cut = daysAgoISO(PHOTO_RETENTION_DAYS)

  const { data, error } = await supabase
    .from('study_sessions')
    .select('id, photo_path, thumb_path')
    .eq('user_id', userId)
    .lt('studied_at', cut)
    .or('photo_path.not.is.null,thumb_path.not.is.null')
    .limit(BATCH)

  if (error || !data?.length) return 0

  const paths = data.flatMap((r) => [r.photo_path, r.thumb_path]).filter(Boolean)
  if (paths.length) {
    await supabase.storage.from('checkins').remove(paths)
    forgetPaths(paths)
  }

  await supabase
    .from('study_sessions')
    .update({ photo_path: null, thumb_path: null, photo_url: null })
    .in('id', data.map((r) => r.id))

  return data.length
}

/** Roda a limpeza no máximo uma vez por dia, sem travar a interface. */
export function purgeOncePerDay(userId) {
  const today = new Date().toDateString()
  if (localStorage.getItem(LAST_RUN) === today) return
  localStorage.setItem(LAST_RUN, today)
  purgeOldPhotos(userId).catch(() => {})
}

/** Quanto as fotos do usuário ocupam, em bytes. */
export async function myPhotoUsage(userId) {
  let total = 0
  let count = 0
  let offset = 0

  for (let page = 0; page < 10; page++) {
    const { data, error } = await supabase.storage
      .from('checkins')
      .list(userId, { limit: 100, offset })
    if (error || !data?.length) break

    for (const f of data) total += f.metadata?.size || 0
    count += data.length
    if (data.length < 100) break
    offset += 100
  }

  return { bytes: total, files: count }
}

export function fmtBytes(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
