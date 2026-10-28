// Böngészős naplózó. A korábbi változat minden sort a Kimi fejlesztői
// környezet /api/log végpontjára küldött és a globális fetch-et is átírta;
// éles oldalon ez minden hibánál egy 404-es kérést jelentett volna.
//
// Most alapból csak a konzolra ír. Ha később hibakövetés kell (pl. Sentry vagy
// saját végpont), a VITE_CLIENT_LOG_ENDPOINT környezeti változóval kapcsolható be.
type Level = 'info' | 'warn' | 'error'

const ENDPOINT: string | undefined = import.meta.env.VITE_CLIENT_LOG_ENDPOINT || undefined

function send(level: Level, msg: string, ctx?: Record<string, unknown>) {
  if (!ENDPOINT || level === 'info') return
  try {
    const body = JSON.stringify([{ level, msg, ctx, url: window.location.pathname, at: new Date().toISOString() }])
    if (navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
    else void fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
  } catch {
    // A naplózás hibája soha nem állíthatja meg az alkalmazást.
  }
}

function emit(level: Level, msg: string, ctx?: Record<string, unknown>) {
  if (level === 'error') console.error(msg, ctx ?? '')
  else if (level === 'warn') console.warn(msg, ctx ?? '')
  else console.log(msg, ctx ?? '')
  send(level, msg, ctx)
}

export const log = {
  info: (msg: string, ctx?: Record<string, unknown>) => emit('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit('error', msg, ctx),
}

if (typeof window !== 'undefined' && ENDPOINT) {
  window.addEventListener('error', (event) => send('error', event.message || 'window.onerror', { filename: event.filename, lineno: event.lineno, stack: event.error?.stack }))
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    send('error', 'unhandledrejection', { reason: reason instanceof Error ? reason.message : String(reason) })
  })
}

export default log
