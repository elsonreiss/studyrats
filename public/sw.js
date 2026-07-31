/* StudyRats — service worker
   Cacheia apenas a casca do app. Dados e fotos sempre vêm da rede,
   para o feed nunca aparecer desatualizado.

   IMPORTANTE: suba o VERSION sempre que trocar a logo, os ícones ou
   qualquer arquivo de /public. É isso que faz o cache antigo ser descartado. */

const VERSION = 'studyrats-v3'
const SHELL = ['/', '/index.html', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return       // Supabase, fontes, storage
  if (url.pathname.startsWith('/rest/')) return

  // navegação: rede primeiro, cai no cache offline
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  // imagens da marca: mostra o cache na hora, mas atualiza por trás.
  // assim uma logo nova aparece na visita seguinte, sem precisar limpar nada.
  if (/\.(png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(request)
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone())
            return res
          })
          .catch(() => hit)
        return hit || network
      })
    )
    return
  }

  // demais assets (js/css com hash no nome): cache primeiro
  e.respondWith(
    caches.match(request).then((hit) =>
      hit ||
      fetch(request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone()
          caches.open(VERSION).then((c) => c.put(request, copy))
        }
        return res
      })
    )
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus()
      return self.clients.openWindow('/checkin')
    })
  )
})
