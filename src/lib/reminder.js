/**
 * Lembrete diário de check-in.
 *
 * Sem servidor de push, a notificação é agendada pelo próprio navegador
 * enquanto o app está aberto (ou instalado e rodando em segundo plano).
 * Se o horário passar com o app fechado, o aviso aparece na próxima abertura.
 */
import { useEffect, useState } from 'react'

const KEY_ON = 'sr-reminder-on'
const KEY_HOUR = 'sr-reminder-hour'
const KEY_LAST = 'sr-reminder-last'

export const DEFAULT_HOUR = 20

export function reminderEnabled() {
  return localStorage.getItem(KEY_ON) === '1'
}

export function reminderHour() {
  return Number(localStorage.getItem(KEY_HOUR) || DEFAULT_HOUR)
}

export function setReminderHour(h) {
  localStorage.setItem(KEY_HOUR, String(h))
}

export function supported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function enableReminder() {
  if (!supported()) return false
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return false
  localStorage.setItem(KEY_ON, '1')
  return true
}

export function disableReminder() {
  localStorage.removeItem(KEY_ON)
}

async function fire() {
  const body = 'Você ainda não fez check-in hoje. Mantenha a sequência.'
  const opts = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'studyrats-checkin',
    renotify: false,
  }
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg) reg.showNotification('StudyRats', opts)
    else new Notification('StudyRats', opts)
  } catch {
    /* notificação bloqueada — segue a vida */
  }
}

/**
 * Verifica de minuto em minuto se já passou do horário escolhido
 * e se o usuário ainda não fez check-in hoje.
 */
export function useDailyReminder(checkedToday, todayKey) {
  useEffect(() => {
    if (!supported() || !reminderEnabled() || Notification.permission !== 'granted') return
    if (checkedToday === undefined || checkedToday === null) return

    const tick = () => {
      if (checkedToday) return
      const now = new Date()
      if (now.getHours() < reminderHour()) return
      if (localStorage.getItem(KEY_LAST) === todayKey) return
      localStorage.setItem(KEY_LAST, todayKey)
      fire()
    }

    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [checkedToday, todayKey])
}

/** Estado reativo do lembrete, para a tela de ajustes. */
export function useReminder() {
  const [on, setOn] = useState(() => supported() && reminderEnabled())
  const [hour, setHour] = useState(reminderHour)

  async function toggle() {
    if (on) { disableReminder(); setOn(false); return }
    const ok = await enableReminder()
    setOn(ok)
    return ok
  }

  function changeHour(h) {
    setReminderHour(h)
    setHour(h)
  }

  return { on, hour, toggle, changeHour, supported: supported() }
}
