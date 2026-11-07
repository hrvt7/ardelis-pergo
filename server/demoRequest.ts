// B2B demókérés a nyitóoldalról (gyártók): POST /api/demo-request.
// Kézbesítés: e-mail (Resend) a platform tulajdonosának, és — ha be van állítva — mentés Supabase-be
// (supabase/demo_requests.sql). Ha egyik sem érhető el, 503 + a kliens a közvetlen e-mail-címet mutatja.
import { z } from 'zod'
import { PRIVACY_VERSION } from '../src/lib/privacyVersion'

export type DemoEnv = Record<string, string | undefined>

/** Alapértelmezett címzett; élesben a DEMO_REQUEST_EMAIL környezeti változó felülírja. */
export const DEMO_REQUEST_EMAIL = 'hrvtadam.7@icloud.com'
const MAX_BODY_BYTES = 12_000
const MIN_FILL_MS = 2_000

export { PRIVACY_VERSION } from '../src/lib/privacyVersion'

export const DEMO_PRODUCTS = ['pergola', 'veranda', 'pergola+outdoor', 'carport', 'other'] as const
export const DEMO_PLANS = ['start', 'pro', 'partner', 'unsure'] as const

const demoSchema = z.object({
  name: z.string().trim().min(2, 'Adja meg a nevét.').max(120),
  company: z.string().trim().min(2, 'Adja meg a cég nevét.').max(160),
  email: z.string().trim().email('Érvénytelen e-mail-cím.').max(320),
  phone: z.string().trim().max(40).regex(/^[+0-9 ()/-]*$/, 'Érvénytelen telefonszám.').optional().default(''),
  website: z.string().trim().max(300).optional().default(''),
  product: z.enum(DEMO_PRODUCTS).default('pergola'),
  plan: z.enum(DEMO_PLANS).default('unsure'),
  lang: z.enum(['hu', 'en']).default('hu'),
  message: z.string().trim().max(2000).optional().default(''),
  consent: z.literal(true, { message: 'Az adatkezelés elfogadása szükséges.' }),
  /** Rejtett mező: ember nem tölti ki. */
  fax: z.string().max(200).optional().default(''),
  elapsedMs: z.number().int().nonnegative().max(1_000_000_000).optional(),
})
export type DemoRequest = z.infer<typeof demoSchema>

const PRODUCT_LABEL: Record<DemoRequest['product'], string> = { pergola: 'Pergola', veranda: 'Veranda / télikert', 'pergola+outdoor': 'Pergola + egyéb outdoor termék', carport: 'Carport / előtető', other: 'Egyéb' }
const PLAN_LABEL: Record<DemoRequest['plan'], string> = { start: 'Start', pro: 'Pro', partner: 'Partnerhálózat', unsure: 'Még nem tudja' }

/** Az űrlap magyar hibaüzenetei angolul (az oldal nyelve szerint). */
const EN_ERRORS: Record<string, string> = {
  'Adja meg a nevét.': 'Please enter your name.', 'Adja meg a cég nevét.': 'Please enter your company name.', 'Érvénytelen e-mail-cím.': 'Invalid e-mail address.',
  'Érvénytelen telefonszám.': 'Invalid phone number.', 'Az adatkezelés elfogadása szükséges.': 'Please accept the data processing consent.',
  'Csak POST kérés engedélyezett.': 'Only POST requests are allowed.', 'Túl nagy kérés.': 'Request too large.', 'Hibás kérés.': 'Invalid request.', 'Hibás adatok.': 'Invalid data.',
  'Túl sok kérés rövid idő alatt. Próbálja újra később, vagy írjon e-mailt.': 'Too many requests in a short time. Please try again later or send us an e-mail.',
  'Az űrlap most nem elérhető.': 'The form is not available right now.', 'A kérést most nem sikerült továbbítani.': 'We could not forward your request right now.',
}
const localize = (message: string, lang: string | undefined) => (lang === 'en' ? EN_ERRORS[message] ?? message : message)
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
const oneLine = (value: string) => Array.from(value, (character) => (character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? ' ' : character)).join('').replace(/\s+/g, ' ').trim()

const recent = new Map<string, number[]>()
const WINDOW_MS = 30 * 60_000
export function resetDemoRateLimit() { recent.clear() }
function limited(key: string, now: number) {
  const hits = (recent.get(key) ?? []).filter((time) => now - time < WINDOW_MS)
  if (hits.length >= 4) return true
  recent.set(key, [...hits, now])
  if (recent.size > 3000) for (const [entry, times] of recent) if (!times.some((time) => now - time < WINDOW_MS)) recent.delete(entry)
  return false
}

function emailHtml(input: DemoRequest, ref: string, origin = '') {
  const rows: [string, string][] = [
    ['Név', input.name], ['Cég', input.company], ['E-mail', input.email], ['Telefon', input.phone || '—'],
    ['Weboldal', input.website || '—'], ['Termék', PRODUCT_LABEL[input.product]], ['Választott csomag', PLAN_LABEL[input.plan]], ['Az oldal nyelve', input.lang === 'en' ? 'Angol (EN) – angolul válaszolj' : 'Magyar'],
  ]
  return `<!doctype html><html lang="hu"><body style="margin:0;background:#f3f4f1;font-family:Arial,sans-serif;color:#141816">
<div style="max-width:620px;margin:0 auto;padding:24px">${origin ? `<p style="margin:0 0 14px"><img src="${escapeHtml(origin)}/brand/lamelix-email-light.png" width="110" height="32" alt="Lamelix" style="border:0"></p>` : ''}<div style="background:#fff;border-radius:14px;padding:26px">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;color:#6b766f">ÚJ DEMÓKÉRÉS · ${escapeHtml(ref)}</p>
<h1 style="margin:0 0 18px;font-size:22px">${escapeHtml(input.company)}</h1>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows.map(([key, value]) => `<tr><td style="padding:8px 0;color:#6b766f;width:140px;border-top:1px solid #eceee9">${key}</td><td style="padding:8px 0;border-top:1px solid #eceee9">${escapeHtml(value)}</td></tr>`).join('')}</table>
${input.message ? `<p style="margin:18px 0 6px;color:#6b766f;font-size:13px">Üzenet</p><p style="margin:0;white-space:pre-wrap;font-size:14px">${escapeHtml(input.message)}</p>` : ''}
<p style="margin:22px 0 0;font-size:12px;color:#6b766f">Válaszolj közvetlenül erre a levélre — a válasz az érdeklődőhöz megy.</p>
</div></div></body></html>`
}

export async function handleDemoRequest(request: Request, env: DemoEnv): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Csak POST kérés engedélyezett.' })
  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'Túl nagy kérés.' })
  let body: unknown
  try { body = JSON.parse(raw) } catch { return json(400, { ok: false, error: 'Hibás kérés.' }) }
  const requestLang = typeof body === 'object' && body !== null && (body as { lang?: unknown }).lang === 'en' ? 'en' : 'hu'
  const parsed = demoSchema.safeParse(body)
  if (!parsed.success) return json(400, { ok: false, error: localize(parsed.error.issues[0]?.message ?? 'Hibás adatok.', requestLang) })
  const input = parsed.data
  const now = Date.now()
  const ref = `DEMO-${new Date(now).toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.getRandomValues(new Uint8Array(2)).reduce((text, byte) => text + byte.toString(16).padStart(2, '0'), '').toUpperCase()}`
  // Robot: sikert lát, de semmi nem megy ki.
  if (input.fax || (input.elapsedMs !== undefined && input.elapsedMs < MIN_FILL_MS)) return json(200, { ok: true, ref })
  const client = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (limited(client, now) || limited(`email:${input.email.toLowerCase()}`, now)) return json(429, { ok: false, error: localize('Túl sok kérés rövid idő alatt. Próbálja újra később, vagy írjon e-mailt.', input.lang) })

  const to = (env.DEMO_REQUEST_EMAIL || DEMO_REQUEST_EMAIL).split(',').map((item) => item.trim()).filter(Boolean)
  const canEmail = Boolean(env.RESEND_API_KEY)
  const canStore = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
  if (!canEmail && !canStore) {
    if (env.NODE_ENV !== 'production') { console.info('[demo] Fejlesztői mód — csak naplózva:', JSON.stringify({ ref, ...input })); return json(200, { ok: true, ref, delivered: 'dev-log' }) }
    console.error('[demo] Nincs beállítva sem RESEND_API_KEY, sem Supabase — a demókérés nem kézbesíthető.')
    return json(503, { ok: false, error: localize('Az űrlap most nem elérhető.', input.lang), fallbackEmail: to[0] })
  }

  const [stored, emailed] = await Promise.allSettled([
    canStore ? fetch(`${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/demo_requests`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ ref, name: input.name, company: input.company, email: input.email.toLowerCase(), phone: input.phone || null, website: input.website || null, product: input.product, plan: input.plan, message: input.lang === 'en' ? `[EN] ${input.message}`.trim() : input.message || null, consent_at: new Date(now).toISOString(), consent_version: PRIVACY_VERSION }),
    }).then((response) => { if (!response.ok) throw new Error(`Supabase ${response.status}`) }) : Promise.resolve(),
    canEmail ? fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.LEAD_FROM_EMAIL || 'Lamelix <onboarding@resend.dev>',
        to,
        subject: oneLine(`Demókérés${input.lang === 'en' ? ' [EN]' : ''}: ${input.company} – ${input.name} (${PLAN_LABEL[input.plan]})`),
        html: emailHtml(input, ref, (() => { try { return new URL(request.url).origin } catch { return '' } })()),
        reply_to: input.email,
      }),
    }).then(async (response) => { if (!response.ok) throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 200)}`) }) : Promise.resolve(),
  ])
  if (stored.status === 'rejected') console.error('[demo] Supabase mentés sikertelen', ref, stored.reason)
  if (emailed.status === 'rejected') console.error('[demo] E-mail sikertelen', ref, emailed.reason)
  const delivered = (canStore && stored.status === 'fulfilled') || (canEmail && emailed.status === 'fulfilled')
  if (!delivered) return json(502, { ok: false, error: localize('A kérést most nem sikerült továbbítani.', input.lang), fallbackEmail: to[0] })
  return json(200, { ok: true, ref })
}
