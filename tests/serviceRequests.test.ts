import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleAdminInstallations, resetInstallationRateLimit } from '../server/installations'
import { hasMetadata, sanitizeJpeg } from '../server/jpeg'
import { handleAdminService, handleServicePhoto, handleServiceRequest, MAX_PHOTOS_PER_INSTALLATION } from '../server/serviceRequests'
import { signToken } from '../server/tenantAdmin'
import { PRIVACY_VERSION } from '../src/lib/privacyVersion'
import { fitWithin } from '../src/lib/photoPrep'
import { demoTenant } from '../src/tenants/demo'
import { createFakeStore, type FakeStore } from './fixtures/fakeStore'

const env = { ADMIN_TOKEN_SECRET: 'titok', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', RESEND_API_KEY: 'r', LEAD_FALLBACK_EMAIL: 'gyarto@example.com' }
const NOW = new Date('2026-11-16T10:00:00Z')
const photo = new Uint8Array(readFileSync('tests/fixtures/gps-photo.jpg')) as Uint8Array<ArrayBuffer>
const latin = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1')

async function admin(method: string, path: string, body?: unknown, tenantId = 'demo') {
  return new Request(`https://t.test${path}`, { method, headers: { Authorization: `Bearer ${await signToken('titok', tenantId)}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
}

async function setup(): Promise<{ store: FakeStore; token: string }> {
  const store = createFakeStore({ leads: [{ id: 1, ref: 'DEMO-5', tenant_id: 'demo', status: 'won', product: 'pergola', config: demoTenant.defaultConfig, customer_name: 'Teszt Elek', email: 'teszt@example.com', phone: '+36301112222' }] })
  vi.stubGlobal('fetch', store.fetch)
  expect((await handleAdminInstallations(await admin('POST', '/api/admin-installations', { leadRef: 'DEMO-5', installedAt: '2026-10-01', warranty: { structure: 60, electronics: 24, led: 24, other: 24 } }), env, NOW)).status).toBe(201)
  return { store, token: String(store.tables.installations[0].public_token) }
}
const upload = (token: string, body: Uint8Array<ArrayBuffer>, ip = '1.1.1.1') => handleServicePhoto(new Request(`https://t.test/api/service-photo?t=${token}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'x-forwarded-for': ip }, body }), env, NOW)
const report = (body: Record<string, unknown>, ip = '1.1.1.1') => handleServiceRequest(new Request('https://t.test/api/service-request', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(body) }), env, NOW)

beforeEach(() => resetInstallationRateLimit())
afterEach(() => vi.unstubAllGlobals())

describe('JPEG metaadat-eltávolítás', () => {
  it('4.94: az első kép után fűzött második kép (MPF, saját EXIF/GPS-szel) is lekerül', () => {
    const appended = new Uint8Array([...photo, ...photo]) as Uint8Array<ArrayBuffer>
    expect(hasMetadata(appended)).toBe(true)
    const clean = sanitizeJpeg(appended)
    expect(clean.ok).toBe(true)
    if (!clean.ok) return
    expect(hasMetadata(clean.bytes)).toBe(false)
    for (const secret of ['Exif', 'TestCam', '2026:11:16']) expect(latin(clean.bytes)).not.toContain(secret)
    expect(clean.bytes.length).toBe((sanitizeJpeg(photo) as { bytes: Uint8Array }).bytes.length)
  })

  it('valódi fotóból eltávolítja az EXIF-et (GPS, eszköz) és a megjegyzést; a képadat változatlan', () => {
    expect(hasMetadata(photo)).toBe(true)
    expect(latin(photo)).toContain('TestCam')
    const clean = sanitizeJpeg(photo)
    expect(clean.ok).toBe(true)
    if (!clean.ok) return
    expect(hasMetadata(clean.bytes)).toBe(false)
    for (const secret of ['Exif', 'TestCam', 'secret comment', '2026:11:16']) expect(latin(clean.bytes)).not.toContain(secret)
    expect([clean.width, clean.height]).toEqual([64, 48])
    // A tömörített képadat (SOS-tól a végéig) bájtra azonos.
    const sos = (bytes: Uint8Array) => latin(bytes).slice(latin(bytes).indexOf('\xff\xda'))
    expect(sos(clean.bytes)).toBe(sos(photo))
    expect(clean.bytes[0]).toBe(0xff)
    expect(clean.bytes.at(-1)).toBe(0xd9)
  })
  it('nem JPEG, csonka fájl és túl nagy felbontás elutasítva', () => {
    expect(sanitizeJpeg(new TextEncoder().encode('\x89PNG\r\n\x1a\n....')).ok).toBe(false)
    expect(sanitizeJpeg(photo.subarray(0, photo.length - 40))).toMatchObject({ ok: false })
    expect(sanitizeJpeg(photo, 100)).toEqual({ ok: false, error: 'too-large' })
  })
  it('a böngészős előkészítés a hosszabbik oldalt 2560 px-re korlátozza, nagyítás nélkül', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2560, height: 1920 })
    expect(fitWithin(3024, 4032)).toEqual({ width: 1920, height: 2560 })
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })
})

describe('hibabejelentés — tulajdonosi oldal', () => {
  it('a feltöltött fotó metaadat nélkül, a telepítés mappájába kerül; a bejelentés hozzájárulással, e-maillel, naplóval', async () => {
    const { store, token } = await setup()
    const uploaded = await upload(token, photo)
    expect(uploaded.status).toBe(201)
    const { photo: id } = await uploaded.json() as { photo: string }
    const installationId = store.tables.installations[0].id
    const key = `service-photos/demo/${installationId}/${id}.jpg`
    expect(hasMetadata(store.storage.get(key)!)).toBe(false)

    const response = await report({ t: token, component: 'roof-drive', description: 'A lamellák nem záródnak teljesen.', photos: [id], consent: true })
    expect(response.status).toBe(201)
    expect(store.tables.service_requests[0]).toMatchObject({ tenant_id: 'demo', installation_id: installationId, component_key: 'roof-drive', status: 'new', consent_version: PRIVACY_VERSION, photo_paths: [`demo/${installationId}/${id}.jpg`] })
    expect(store.tables.service_requests[0].consent_at).toBe(NOW.toISOString())
    expect(store.tables.installation_events.map((event) => event.kind)).toEqual(['created', 'service_request'])
    expect(store.emails).toHaveLength(1)
    expect(store.emails[0].to).toEqual(['gyarto@example.com'])
    expect(store.emails[0].html).toContain('#szerviz')
    expect(store.emails[0].html).not.toContain(key)
  })
  it('zárt komponenslista: ismeretlen komponens elutasítva', async () => {
    const { token } = await setup()
    const response = await report({ t: token, component: 'solar', description: 'Nincs is napelemem, de bejelentem.', photos: [], consent: true })
    expect(response.status).toBe(422)
  })
  it('hozzájárulás nélkül, rövid leírással, 4-nél több fotóval vagy idegen fotóval nem fogad el', async () => {
    const { token } = await setup()
    const base = { t: token, component: 'frame', description: 'Rozsdafolt az oszlopon.' }
    expect((await report({ ...base, consent: false })).status).toBe(422)
    expect((await report({ ...base, description: 'rossz', consent: true })).status).toBe(422)
    const ids = Array.from({ length: 5 }, () => crypto.randomUUID())
    expect((await report({ ...base, photos: ids, consent: true })).status).toBe(422)
    // Létező formátumú, de nem feltöltött (vagy más telepítéshez tartozó) azonosító.
    expect((await report({ ...base, photos: [crypto.randomUUID()], consent: true })).status).toBe(422)
    expect((await report({ ...base, photos: ['../../masik/titok'], consent: true })).status).toBe(422)
  })
  it('csak JPEG tölthető fel, érvénytelen tokennel semmi', async () => {
    const { store, token } = await setup()
    expect((await upload(token, new TextEncoder().encode('<svg></svg>'))).status).toBe(415)
    expect((await upload('rossz', photo)).status).toBe(404)
    expect(store.storage.size).toBe(0)
  })
  it('visszaélés-fék: IP-nként óránként 5 bejelentés, 10 percenként 16 fotó', async () => {
    const { token } = await setup()
    const body = { t: token, component: 'frame', description: 'Rozsdafolt az oszlopon.', photos: [], consent: true }
    for (let index = 0; index < 5; index++) expect((await report(body, '2.2.2.2')).status).toBe(201)
    expect((await report(body, '2.2.2.2')).status).toBe(429)
    for (let index = 0; index < 16; index++) expect((await upload(token, photo, '3.3.3.3')).status).toBe(201)
    expect((await upload(token, photo, '3.3.3.3')).status).toBe(429)
  })
  it('telepítésenként naponta legfeljebb 10 bejelentés (más IP-kről sem)', async () => {
    const { token } = await setup()
    const body = { t: token, component: 'frame', description: 'Rozsdafolt az oszlopon.', photos: [], consent: true }
    for (let index = 0; index < 10; index++) expect((await report(body, `4.4.4.${index}`)).status).toBe(201)
    expect((await report(body, '4.4.4.99')).status).toBe(429)
  })
})

describe('Szerviz nézet — admin', () => {
  it('csak a saját bejelentéseit látja, a fotók rövid lejáratú aláírt linkkel jönnek; az állapotváltás naplózódik', async () => {
    const { store, token } = await setup()
    const { photo: id } = await (await upload(token, photo)).json() as { photo: string }
    await report({ t: token, component: 'frame', description: 'Rozsdafolt az oszlopon.', photos: [id], consent: true })
    store.tables.service_requests.push({ id: 77, installation_id: 999, tenant_id: 'demo-at', component_key: 'frame', description: 'idegen', photo_paths: ['demo-at/999/x.jpg'], status: 'new', created_at: NOW.toISOString() })

    const list = await (await handleAdminService(await admin('GET', '/api/admin-service'), env)).json() as { requests: { id: number; photos: string[] }[]; expiresIn: number }
    expect(list.requests).toHaveLength(1)
    expect(list.expiresIn).toBe(600)
    expect(list.requests[0].photos[0]).toMatch(/^https:\/\/x\.supabase\.co\/storage\/v1\/object\/sign\/service-photos\/demo\/.+\?token=/)

    expect((await handleAdminService(await admin('PATCH', '/api/admin-service', { id: 77, status: 'closed' }), env)).status).toBe(404)
    expect(store.tables.service_requests.find((row) => row.id === 77)?.status).toBe('new')
    const own = list.requests[0].id
    expect((await handleAdminService(await admin('PATCH', '/api/admin-service', { id: own, status: 'in_progress' }), env)).status).toBe(200)
    expect(store.tables.installation_events.at(-1)).toMatchObject({ kind: 'status_change', actor: 'manufacturer', detail: { from: 'new', to: 'in_progress' } })
    expect((await handleAdminService(await admin('PATCH', '/api/admin-service', { id: own, status: 'kesz' }), env)).status).toBe(422)
  })
  it('4.97: munkalap – felelős, határidő, javítás, költség mentése; csak a változó mezők; napló a mezők nevével', async () => {
    const { store, token } = await setup()
    await report({ t: token, component: 'roof-drive', description: 'A lamellák nem záródnak teljesen.', photos: [], consent: true })
    const id = Number(store.tables.service_requests[0].id)
    const patch = (body: Record<string, unknown>, tenant = 'demo') => admin('PATCH', '/api/admin-service', { id, ...body }, tenant).then((request) => handleAdminService(request, env, NOW))

    const saved = await patch({ assignee: '  Kiss Gábor ', dueDate: '2026-11-20', diagnosis: 'Végálláskapcsoló', laborMinutes: 90, costNet: 45000, warrantyCase: true, outcome: 'fixed' })
    expect(saved.status).toBe(200)
    expect((await saved.json() as { request: Record<string, unknown> }).request).toMatchObject({ assignee: 'Kiss Gábor', dueDate: '2026-11-20', laborMinutes: 90, costNet: 45000, warrantyCase: true, outcome: 'fixed', status: 'new' })
    expect(store.tables.service_requests[0]).toMatchObject({ assignee: 'Kiss Gábor', due_date: '2026-11-20', diagnosis: 'Végálláskapcsoló', labor_minutes: 90, cost_net: 45000, warranty_case: true, outcome: 'fixed', status: 'new' })
    const update = store.tables.installation_events.at(-1)!
    expect(update).toMatchObject({ kind: 'service_update', actor: 'manufacturer' })
    expect((update.detail as { fields: string[] }).fields.sort()).toEqual(['assignee', 'costNet', 'diagnosis', 'dueDate', 'laborMinutes', 'outcome', 'warrantyCase'])
    // A napló a tartalmat nem tárolja (csak a mezők nevét).
    expect(JSON.stringify(update.detail)).not.toContain('Kiss')

    // Ugyanaz újra: nincs írás, nincs új napló.
    const events = store.tables.installation_events.length
    expect((await patch({ assignee: 'Kiss Gábor' })).status).toBe(200)
    expect(store.tables.installation_events).toHaveLength(events)
    // Üres szöveg = törlés.
    expect((await patch({ diagnosis: '' })).status).toBe(200)
    expect(store.tables.service_requests[0].diagnosis).toBeNull()

    // Lezárás: a lezárás ideje automatikus; újranyitáskor törlődik.
    expect((await patch({ status: 'closed' })).status).toBe(200)
    expect(store.tables.service_requests[0]).toMatchObject({ status: 'closed', closed_at: NOW.toISOString() })
    expect(store.tables.installation_events.at(-1)).toMatchObject({ kind: 'status_change', detail: { from: 'new', to: 'closed' } })
    expect((await patch({ status: 'in_progress' })).status).toBe(200)
    expect(store.tables.service_requests[0].closed_at).toBeNull()
  })
  it('4.97: munkalap – érvénytelen értékek és idegen gyártó elutasítva', async () => {
    const { store, token } = await setup()
    await report({ t: token, component: 'frame', description: 'Rozsdafolt az oszlopon.', photos: [], consent: true })
    const id = Number(store.tables.service_requests[0].id)
    const patch = async (body: Record<string, unknown>, tenant = 'demo') => handleAdminService(await admin('PATCH', '/api/admin-service', { id, ...body }, tenant), env, NOW)
    for (const body of [{ dueDate: '2026-13-45' }, { dueDate: 'holnap' }, { costNet: -1 }, { laborMinutes: 1.5 }, { outcome: 'kesz' }, { assignee: 'x'.repeat(81) }, { tenant_id: 'demo-at' }, { closedAt: '2020-01-01' }]) {
      expect((await patch(body)).status, JSON.stringify(body)).toBe(422)
    }
    expect((await patch({ assignee: 'Idegen' }, 'demo-at')).status).toBe(404)
    expect(store.tables.service_requests[0].assignee ?? null).toBeNull()
  })
  it('a telepítés törlése a félbehagyott (be nem küldött) feltöltéseket is törli', async () => {
    const { store, token } = await setup()
    await upload(token, photo)
    expect(store.storage.size).toBe(1)
    const id = store.tables.installations[0].id
    expect((await handleAdminInstallations(await admin('DELETE', `/api/admin-installations?id=${id}`), { ...env, ADMIN_PASSWORD_DEMO: 'x' }, NOW)).status).toBe(200)
    expect(store.storage.size).toBe(0)
  })
})

describe('4.94: telepítésenkénti fotókorlát', () => {
  it('a korlát elérése után nem fogad több fotót ugyanahhoz a telepítéshez', async () => {
    const { store, token } = await setup()
    const id = store.tables.installations[0].id
    for (let index = 0; index < MAX_PHOTOS_PER_INSTALLATION; index += 1) store.storage.set(`service-photos/demo/${id}/x${index}.jpg`, new Uint8Array([1]))
    const response = await upload(token, photo, '9.9.9.9')
    expect(response.status).toBe(429)
    expect([...store.storage.keys()].filter((key) => key.startsWith(`service-photos/demo/${id}/`))).toHaveLength(MAX_PHOTOS_PER_INSTALLATION)
  })
})
