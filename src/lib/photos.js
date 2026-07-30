import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const BUCKET = 'checkins'

/**
 * Validade longa de propósito: com a URL estável por 24h, o navegador
 * consegue cachear a imagem. Com validade curta a assinatura mudava a cada
 * carregamento e o cache era descartado — o que multiplicava a banda usada.
 */
const TTL = 24 * 60 * 60
const STORE = 'sr-photo-urls'
const MAX_ENTRIES = 1200

let cache = new Map() // path -> { url, exp }
const pending = new Map()

// ---------- persistência entre sessões ----------
function loadCache() {
  try {
    const raw = localStorage.getItem(STORE)
    if (!raw) return
    const now = Date.now()
    for (const [path, entry] of Object.entries(JSON.parse(raw))) {
      if (entry?.exp > now) cache.set(path, entry)
    }
  } catch {
    /* storage indisponível ou corrompido */
  }
}

let saveTimer = null
function saveCache() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      // mantém só as entradas mais recentes, para não estourar o localStorage
      const entries = [...cache.entries()]
        .filter(([, e]) => e.exp > Date.now())
        .sort((a, b) => b[1].exp - a[1].exp)
        .slice(0, MAX_ENTRIES)
      cache = new Map(entries)
      localStorage.setItem(STORE, JSON.stringify(Object.fromEntries(entries)))
    } catch {
      /* cota cheia — segue só com o cache em memória */
    }
  }, 400)
}

loadCache()

function fresh(entry) {
  // renova com folga de 1h para a URL não expirar durante o uso
  return entry && entry.exp > Date.now() + 60 * 60 * 1000
}

/** Assina vários caminhos de uma vez e guarda em cache. */
export async function signPaths(paths) {
  const wanted = [...new Set(paths.filter(Boolean))]
  const missing = wanted.filter((p) => !fresh(cache.get(p)) && !pending.has(p))

  if (missing.length > 0) {
    const promise = supabase.storage
      .from(BUCKET)
      .createSignedUrls(missing, TTL)
      .then(({ data, error }) => {
        if (!error && data) {
          const exp = Date.now() + TTL * 1000
          for (const row of data) {
            if (row.signedUrl && row.path) cache.set(row.path, { url: row.signedUrl, exp })
          }
          saveCache()
        }
        missing.forEach((p) => pending.delete(p))
      })
      .catch(() => missing.forEach((p) => pending.delete(p)))

    missing.forEach((p) => pending.set(p, promise))
  }

  await Promise.all(wanted.map((p) => pending.get(p)).filter(Boolean))

  const out = {}
  for (const p of wanted) out[p] = cache.get(p)?.url || null
  return out
}

/** Esquece uma foto apagada, para não devolver URL morta do cache. */
export function forgetPaths(paths) {
  for (const p of paths) if (p) cache.delete(p)
  saveCache()
}

/**
 * Resolve a imagem de um check-in.
 * Prefere a miniatura na listagem e a original quando ampliada.
 */
export function pickPath(item, { full = false } = {}) {
  if (!item) return null
  if (full) return item.photo_path || item.thumb_path || null
  return item.thumb_path || item.photo_path || null
}

/** Hook: recebe uma lista de itens e devolve um mapa caminho -> URL assinada. */
export function useSignedPhotos(items, { full = false } = {}) {
  const [urls, setUrls] = useState({})

  const key = (items || [])
    .map((i) => pickPath(i, { full }))
    .filter(Boolean)
    .join('|')

  useEffect(() => {
    if (!key) { setUrls({}); return }
    let alive = true
    signPaths(key.split('|')).then((map) => { if (alive) setUrls(map) })
    return () => { alive = false }
  }, [key])

  return urls
}

/** Hook para um único item (o modal, que precisa da resolução cheia). */
export function useSignedPhoto(item, { full = true } = {}) {
  const [url, setUrl] = useState(null)
  const path = pickPath(item, { full })

  useEffect(() => {
    if (!path) { setUrl(null); return }
    let alive = true
    signPaths([path]).then((map) => { if (alive) setUrl(map[path] || null) })
    return () => { alive = false }
  }, [path])

  return url || item?.photo_url || null
}

/** Resolve a URL exibível de um item, considerando o mapa assinado. */
export function photoOf(item, urls, { full = false } = {}) {
  const path = pickPath(item, { full })
  if (path && urls?.[path]) return urls[path]
  return item?.photo_url || null
}
