import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import AdminLeads from '@/pages/AdminLeads'
import AdminOverview from '@/pages/AdminOverview'
import { useLeads } from '@/lib/adminLeads'
import NotFound from '@/pages/NotFound'
import { MOUNT_LABELS, MOUNT_TYPES } from '@/lib/mount'
import { ROOF_INFO, ROOF_TYPES } from '@/lib/roofs'
import { SIDE_LABELS, SIDE_TYPES } from '@/lib/sides'
import { getTenant } from '@/tenants'
import { applyOverrides, parseOverrides, type TenantOverrides } from '@/tenants/overrides'
import { MONEY_FIELDS } from '@/tenants/priceFields'
import type { Tenant } from '@/tenants/types'
import type { PriceMatrixPoint, RoofType } from '@/types/pergola'

const RATE_FIELDS = [['customColorRate', 'Egyedi RAL felár'], ['woodColorRate', 'Fa hatású bevonat felára'], ['installationRate', 'Telepítési arány'], ['vatRate', 'ÁFA kulcs']] as const
const EXTRA_FIELDS = [['led', 'LED-világítás'], ['speakers', 'Hangrendszer'], ['sensors', 'Szenzorcsomag'], ['solar', 'Napelemes tető'], ['rgb', 'RGB LED'], ['fans', 'Mennyezeti ventilátor'], ['smartHome', 'Okosotthon'], ['roofShade', 'Tetőárnyékoló']] as const
const BRAND_FIELDS = [['name', 'Megjelenített név', 'text'], ['legalName', 'Cégnév (jogi)', 'text'], ['logoUrl', 'Logó URL', 'url'], ['website', 'Weboldal', 'url'], ['email', 'Kapcsolattartó e-mail', 'email'], ['phone', 'Telefon', 'tel'], ['address', 'Cím', 'text'], ['privacyUrl', 'Adatkezelési tájékoztató URL', 'url']] as const
type Brand = Record<(typeof BRAND_FIELDS)[number][0], string>

const matrixToText = (points: PriceMatrixPoint[] | undefined) => (points ?? []).map((point) => `${point.width}; ${point.depth}; ${point.netPrice}`).join('\n')
function textToMatrix(value: string): PriceMatrixPoint[] | string {
  const points: PriceMatrixPoint[] = []
  for (const [index, line] of value.split('\n').map((item) => item.trim()).entries()) {
    if (!line) continue
    const parts = line.split(/[;\t]/).map((item) => Number(item.trim().replace(/\s/g, '').replace(',', '.')))
    if (parts.length !== 3 || parts.some((item) => !Number.isFinite(item) || item <= 0)) return `${index + 1}. sor hibás — formátum: szélesség; mélység; nettó ár (pl. 4; 3; 1830000)`
    points.push({ width: parts[0], depth: parts[1], netPrice: parts[2] })
  }
  return points
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="admin-section"><h2>{title}</h2><div className="admin-grid">{children}</div></section>
}

export default function AdminPage() {
  const { tenantId } = useParams()
  const base = getTenant(tenantId)
  if (!base) return <NotFound />
  return <AdminForTenant key={base.id} base={base} />
}

function AdminForTenant({ base }: { base: Tenant }) {
  const tokenKey = `admin-token:${base.id}`
  const [token, setToken] = useState(() => { try { return sessionStorage.getItem(tokenKey) ?? '' } catch { return '' } })
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [overrides, setOverrides] = useState<TenantOverrides | null | undefined>(undefined)
  const [storage, setStorage] = useState(true)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const logout = useCallback(() => { try { sessionStorage.removeItem(tokenKey) } catch { /* privát mód */ } setToken(''); setOverrides(undefined) }, [tokenKey])

  useEffect(() => {
    if (!token) return
    let alive = true
    fetch('/api/admin-settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (response.status === 401) { if (alive) logout(); return }
        const data = await response.json() as { overrides?: TenantOverrides | null; storage?: boolean }
        if (alive) { setOverrides(data.overrides ?? null); setStorage(data.storage !== false) }
      })
      .catch(() => alive && setMessage({ kind: 'error', text: 'A beállítások betöltése nem sikerült. Frissítsd az oldalt.' }))
    return () => { alive = false }
  }, [token, logout])

  const login = async (event: FormEvent) => {
    event.preventDefault()
    setLoginError('')
    try {
      const response = await fetch('/api/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId: base.id, password }) })
      const data = await response.json() as { ok: boolean; token?: string; error?: string }
      if (!response.ok || !data.token) { setLoginError(data.error ?? 'A belépés nem sikerült.'); return }
      try { sessionStorage.setItem(tokenKey, data.token) } catch { /* privát mód */ }
      setPassword('')
      setToken(data.token)
    } catch { setLoginError('A szerver nem érhető el. Próbáld újra.') }
  }

  if (!token) {
    return <main className="admin-page"><form className="admin-card admin-login" onSubmit={login}>
      <span className="admin-eyebrow">{base.brand.name} · gyártói admin</span>
      <h1>Belépés</h1>
      <label><span>Jelszó</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus /></label>
      {loginError && <p className="admin-message is-error" role="alert">{loginError}</p>}
      <button className="admin-save" type="submit">Belépés</button>
    </form></main>
  }

  if (overrides === undefined) return <main className="admin-page"><p className="admin-card" role="status">Betöltés…</p></main>

  return <AdminShell base={base} token={token} onExpired={logout} onLogout={logout}>
    <AdminEditor base={base} initial={overrides} storage={storage} saving={saving} message={message}
      onSave={async (next) => {
      setSaving(true); setMessage(null)
      try {
        const response = await fetch('/api/admin-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(next) })
        const data = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null
        if (response.status === 401) { logout(); return }
        setMessage(response.ok && data?.ok ? { kind: 'ok', text: 'Mentve. Az új beállítások azonnal élnek a konfigurátorban.' } : { kind: 'error', text: data?.error ?? 'A mentés nem sikerült.' })
        if (response.ok && data?.ok) setOverrides(next)
      } catch { setMessage({ kind: 'error', text: 'A szerver nem érhető el. A módosításaid még nincsenek mentve.' }) }
      finally { setSaving(false) }
    }} />
  </AdminShell>
}

type AdminTab = 'overview' | 'leads' | 'settings'
const TABS: [AdminTab, string, string][] = [['overview', 'Áttekintés', '#attekintes'], ['leads', 'Érdeklődők', '#erdeklodok'], ['settings', 'Beállítások', '#beallitasok']]

/** Közös keret: oldalsáv (mobilon felső sáv) + Áttekintés / Érdeklődők / Beállítások. Az űrlap fül nem veszti el a szerkesztést váltáskor. */
function AdminShell({ base, token, onExpired, onLogout, children }: { base: Tenant; token: string; onExpired: () => void; onLogout: () => void; children: ReactNode }) {
  const [tab, setTab] = useState<AdminTab>(() => TABS.find(([, , hash]) => hash === window.location.hash)?.[0] ?? 'overview')
  const { leads, error, reload, setStatus } = useLeads(token, onExpired)
  const choose = (next: AdminTab) => { setTab(next); window.history.replaceState(null, '', TABS.find(([key]) => key === next)![2]) }
  const fresh = leads?.filter((lead) => lead.status === 'new').length ?? 0
  const title = TABS.find(([key]) => key === tab)![1]
  return <main className="admin-page">
    <div className="admin-layout">
      <aside className="admin-side">
        <div className="admin-brand"><span className="admin-eyebrow">Gyártói admin</span><strong>{base.brand.name}{base.brand.suffix && <small> {base.brand.suffix}</small>}</strong></div>
        <nav className="admin-nav" aria-label="Admin részek">
          {TABS.map(([key, label]) => <button type="button" key={key} className={tab === key ? 'is-on' : ''} onClick={() => choose(key)} aria-current={tab === key ? 'page' : undefined}>{label}{key === 'leads' && fresh > 0 && <em>{fresh}</em>}</button>)}
        </nav>
        <div className="admin-side-foot"><Link to={`/k/${base.id}`} target="_blank" rel="noopener">Konfigurátor megnyitása</Link><button type="button" className="admin-link" onClick={onLogout}>Kilépés</button></div>
      </aside>
      <section className="admin-main">
        <h1>{title}</h1>
        {tab !== 'settings' && leads === null && <p className="admin-hint" role="status">Betöltés…</p>}
        {tab === 'overview' && leads && <>{error && <p className="admin-message is-error" role="alert">{error}</p>}<AdminOverview leads={leads} onOpenLeads={() => choose('leads')} /></>}
        {tab === 'leads' && leads && <AdminLeads leads={leads} error={error} onReload={() => void reload()} onStatus={(ref, status) => void setStatus(ref, status)} />}
        <div hidden={tab !== 'settings'}>{children}</div>
      </section>
    </div>
  </main>
}

function AdminEditor({ base, initial, storage, saving, message, onSave }: { base: Tenant; initial: TenantOverrides | null; storage: boolean; saving: boolean; message: { kind: 'ok' | 'error'; text: string } | null; onSave: (next: TenantOverrides) => void }) {
  // Az űrlap a kód + eddigi felülírások együttes (érvényes) állapotából indul.
  const effective = useMemo(() => (initial ? applyOverrides(base, initial) : base), [base, initial])
  const [brand, setBrand] = useState<Brand>(() => Object.fromEntries(BRAND_FIELDS.map(([key]) => [key, effective.brand[key] ?? ''])) as Brand)
  const [prices, setPrices] = useState<Record<string, number>>(() => ({ ...Object.fromEntries(ROOF_TYPES.map((roof) => [ROOF_INFO[roof].priceKey, effective.prices[ROOF_INFO[roof].priceKey]])), ...Object.fromEntries([...MONEY_FIELDS.map((field) => field.key), ...RATE_FIELDS.map(([key]) => key)].map((key) => [key, effective.prices[key]])) }))
  const [roofs, setRoofs] = useState<RoofType[]>(() => ROOF_TYPES.filter((roof) => effective.roofs[roof]))
  const [sides, setSides] = useState(effective.sides)
  const [mounts, setMounts] = useState(effective.mounts)
  const [extras, setExtras] = useState<Record<string, boolean>>(() => Object.fromEntries(EXTRA_FIELDS.map(([key]) => [key, Boolean(effective.extras[key])])))
  const [recipients, setRecipients] = useState(effective.lead.recipients.join('\n'))
  const [subjectPrefix, setSubjectPrefix] = useState(effective.lead.subjectPrefix)
  const [matrix, setMatrix] = useState<Partial<Record<RoofType, string>>>(() => Object.fromEntries(ROOF_TYPES.map((roof) => [roof, matrixToText(effective.prices.priceMatrix?.[roof])])))
  const [formError, setFormError] = useState('')

  const toggle = <T,>(list: T[], item: T, on: boolean) => (on ? [...list.filter((entry) => entry !== item), item] : list.filter((entry) => entry !== item))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    const priceMatrix: NonNullable<TenantOverrides['priceMatrix']> = {}
    for (const roof of ROOF_TYPES) {
      const parsed = textToMatrix(matrix[roof] ?? '')
      if (typeof parsed === 'string') { setFormError(`${ROOF_INFO[roof].name} ármátrix: ${parsed}`); return }
      if (parsed.length) priceMatrix[roof] = parsed
    }
    const next: TenantOverrides = {
      brand,
      prices,
      ...(Object.keys(priceMatrix).length ? { priceMatrix } : {}),
      roofs,
      sides,
      mounts,
      extras,
      lead: { recipients: recipients.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean), subjectPrefix },
    }
    const checked = parseOverrides(next)
    if (!checked.ok) { setFormError(checked.error); return }
    onSave(checked.data)
  }

  return <form className="admin-form" onSubmit={submit}>
      {!storage && <p className="admin-message is-error" role="alert">Az adattár (Supabase) nincs beállítva a szerveren, ezért a mentés nem működik.</p>}

      <Section title="Cég és kapcsolat">
        {BRAND_FIELDS.map(([key, label, type]) => <label key={key}><span>{label}</span><input type={type} value={brand[key]} onChange={(event) => setBrand({ ...brand, [key]: event.target.value })} required={key === 'name' || key === 'legalName'} maxLength={300} /></label>)}
      </Section>

      <Section title="Érdeklődők fogadása">
        <label className="admin-wide"><span>Lead e-mail címek (soronként egy)</span><textarea rows={3} value={recipients} onChange={(event) => setRecipients(event.target.value)} placeholder="ajanlat@ceg.hu" /></label>
        <label><span>E-mail tárgy előtag</span><input value={subjectPrefix} onChange={(event) => setSubjectPrefix(event.target.value)} maxLength={80} /></label>
      </Section>

      <Section title="Tetőrendszerek (nettó Ft/m² alapár)">
        {ROOF_TYPES.map((roof) => <div className="admin-row" key={roof}>
          <label className="admin-check"><input type="checkbox" checked={roofs.includes(roof)} onChange={(event) => setRoofs(toggle(roofs, roof, event.target.checked))} />{ROOF_INFO[roof].name} <small>{ROOF_INFO[roof].short}</small></label>
          <input type="number" min="0" step="1000" aria-label={`${ROOF_INFO[roof].name} m² ár`} value={prices[ROOF_INFO[roof].priceKey]} onChange={(event) => setPrices({ ...prices, [ROOF_INFO[roof].priceKey]: Math.max(0, Number(event.target.value) || 0) })} />
        </div>)}
      </Section>

      <Section title="Egyéb nettó árak">
        {MONEY_FIELDS.map((field) => <label key={field.key}><span>{field.label} <small>{field.unit}</small></span><input type="number" min="0" step="1000" value={prices[field.key]} onChange={(event) => setPrices({ ...prices, [field.key]: Math.max(0, Number(event.target.value) || 0) })} /></label>)}
        {RATE_FIELDS.map(([key, label]) => <label key={key}><span>{label} <small>%</small></span><input type="number" min="0" max="100" step="1" value={Math.round(prices[key] * 100)} onChange={(event) => setPrices({ ...prices, [key]: Math.min(100, Math.max(0, Number(event.target.value) || 0)) / 100 })} /></label>)}
      </Section>

      <Section title="Ármátrix (opcionális, tetőtípusonként)">
        <p className="admin-hint admin-wide">Soronként: <code>szélesség; mélység; nettó ár</code> (méter, Ft). Ahol van mátrix, az váltja ki a m²-árat; a köztes méreteket a rendszer interpolálja. Üresen hagyva a m²-ár érvényes.</p>
        {ROOF_TYPES.filter((roof) => roofs.includes(roof)).map((roof) => <label className="admin-wide" key={roof}><span>{ROOF_INFO[roof].name}</span><textarea rows={4} value={matrix[roof] ?? ''} onChange={(event) => setMatrix({ ...matrix, [roof]: event.target.value })} placeholder="4; 3; 1830000" spellCheck={false} /></label>)}
      </Section>

      <Section title="Oldalfalak">
        {SIDE_TYPES.filter((type) => type !== 'none').map((type) => <label className="admin-check" key={type}><input type="checkbox" checked={sides.includes(type as never)} onChange={(event) => setSides(toggle(sides, type as never, event.target.checked))} />{SIDE_LABELS[type]}</label>)}
      </Section>
      <Section title="Rögzítési módok">
        {MOUNT_TYPES.map((mount) => <label className="admin-check" key={mount}><input type="checkbox" checked={mounts.includes(mount)} onChange={(event) => setMounts(toggle(mounts, mount, event.target.checked))} />{MOUNT_LABELS[mount]}</label>)}
      </Section>
      <Section title="Extrák">
        {EXTRA_FIELDS.map(([key, label]) => <label className="admin-check" key={key}><input type="checkbox" checked={extras[key]} onChange={(event) => setExtras({ ...extras, [key]: event.target.checked })} />{label}</label>)}
      </Section>

      {formError && <p className="admin-message is-error" role="alert">{formError}</p>}
      {message && <p className={`admin-message is-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
      <div className="admin-savebar"><button className="admin-save" type="submit" disabled={saving || !storage}>{saving ? 'Mentés…' : 'Mentés'}</button></div>
  </form>
}
