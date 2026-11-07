import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Code2, ExternalLink, LayoutDashboard, LogOut, Search, SlidersHorizontal, Users } from 'lucide-react'
import { Link, useParams } from 'react-router'
import AdminLeads from '@/pages/AdminLeads'
import LamelixLogo from '@/components/LamelixLogo'
import AdminOverview from '@/pages/AdminOverview'
import { LEAD_STATUSES, useLeads, type LeadRow } from '@/lib/adminLeads'
import { demoEvents, demoLeads, demoIncoming } from '@/lib/adminDemo'
import { CommandPalette, EmbedPanel, PALETTE_ICONS, Toasts, useToasts, type ChecklistItem, type PaletteCommand } from '@/components/admin/adminKit'
import '@/admin-premium.css'
import { hasPrivacyUrl } from '@/tenants/privacy'
import { useQuotes } from '@/lib/quotes'
import { useStats } from '@/lib/adminStats'
import NotFound from '@/pages/NotFound'
import { MOUNT_LABELS, MOUNT_TYPES } from '@/lib/mount'
import { ROOF_INFO, ROOF_TYPES } from '@/lib/roofs'
import { SIDE_LABELS, SIDE_TYPES } from '@/lib/sides'
import { getTenant } from '@/tenants'
import { applyOverrides, parseOverrides, type TenantOverrides } from '@/tenants/overrides'
import { MONEY_FIELDS } from '@/tenants/priceFields'
import type { Tenant } from '@/tenants/types'
import type { RoofType } from '@/types/pergola'
import PriceMatrixEditor, { type MatrixDraft, type MatrixErrors } from '@/components/admin/PriceMatrixEditor'
import { pointsToRows, validateMatrixRows } from '@/lib/priceMatrixEdit'

const RATE_FIELDS = [['customColorRate', 'Egyedi RAL felár'], ['woodColorRate', 'Fa hatású bevonat felára'], ['installationRate', 'Telepítési arány'], ['vatRate', 'ÁFA kulcs']] as const
const EXTRA_FIELDS = [['led', 'LED-világítás'], ['speakers', 'Hangrendszer'], ['sensors', 'Szenzorcsomag'], ['solar', 'Napelemes tető'], ['rgb', 'RGB LED'], ['fans', 'Mennyezeti ventilátor'], ['smartHome', 'Okosotthon'], ['roofShade', 'Tetőárnyékoló']] as const
const BRAND_FIELDS = [['name', 'Megjelenített név', 'text'], ['legalName', 'Cégnév (jogi)', 'text'], ['logoUrl', 'Logó URL', 'url'], ['website', 'Weboldal', 'url'], ['email', 'Kapcsolattartó e-mail', 'email'], ['phone', 'Telefon', 'tel'], ['address', 'Cím', 'text'], ['privacyUrl', 'Adatkezelési tájékoztató URL', 'url']] as const
type Brand = Record<(typeof BRAND_FIELDS)[number][0], string>

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

  useEffect(() => { document.title = `Gyártói admin · ${base.brand.name} | Lamelix` }, [base.brand.name])
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
      <span className="brand-mark">{base.brand.name.slice(0, 1)}</span>
      <div><span className="admin-eyebrow">{base.brand.name} · gyártói admin</span>
      <h1>Üdv újra!</h1><p className="admin-hint">Add meg a jelszót a belépéshez.</p></div>
      <label><span>Jelszó</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus /></label>
      {loginError && <p className="admin-message is-error" role="alert">{loginError}</p>}
      <button className="admin-save" type="submit">Belépés</button>
      <a className="admin-powered" href="/" target="_blank" rel="noopener" aria-label="Lamelix — a platform oldala"><span>Működteti:</span><LamelixLogo height={18} title={null} /></a>
    </form></main>
  }

  if (overrides === undefined) return <main className="admin-page"><p className="admin-card" role="status">Betöltés…</p></main>

  return <AdminShell base={base} token={token} overrides={overrides} onExpired={logout} onLogout={logout}>
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

const LEAD_STATUS_LABEL = Object.fromEntries(LEAD_STATUSES) as Record<string, string>

type AdminTab = 'overview' | 'leads' | 'embed' | 'settings'
const TABS: [AdminTab, string, string][] = [['overview', 'Áttekintés', '#attekintes'], ['leads', 'Érdeklődők', '#erdeklodok'], ['embed', 'Beágyazás', '#beagyazas'], ['settings', 'Beállítások', '#beallitasok']]

const TAB_INFO: Record<AdminTab, { icon: ReactNode; subtitle: string }> = {
  overview: { icon: <LayoutDashboard size={18} />, subtitle: 'Érdeklődők, látogatottság és értékesítési csatorna egy helyen.' },
  leads: { icon: <Users size={18} />, subtitle: 'Kezeld a beérkező felmérési kérelmeket: státusz, megjegyzés, hívás.' },
  embed: { icon: <Code2 size={18} />, subtitle: 'Másolható beágyazókód, link és QR-kód: a konfigurátor a saját weboldaladon.' },
  settings: { icon: <SlidersHorizontal size={18} />, subtitle: 'Árak, ármátrix, elérhető opciók és az értesítések címzettjei.' },
}

/** Közös keret: oldalsáv (mobilon alsó fülsáv) + sticky fejléc + Áttekintés / Érdeklődők / Beállítások. Az űrlap fül nem veszti el a szerkesztést váltáskor. */
function AdminShell({ base, token, overrides, onExpired, onLogout, children }: { base: Tenant; token: string; overrides: TenantOverrides | null; onExpired: () => void; onLogout: () => void; children: ReactNode }) {
  const [tab, setTab] = useState<AdminTab>(() => TABS.find(([, , hash]) => hash === window.location.hash)?.[0] ?? 'overview')
  const real = useLeads(token, onExpired)
  const quoteApi = useQuotes(token, onExpired)
  const realEvents = useStats(token)
  const { toasts, push, dismiss } = useToasts()
  const [openRef, setOpenRef] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Demó mód: a demó gyártónál (vagy kérésre bárkinél) kitalált, de valósághű adatokkal tölti fel a felületet, amíg nincs valódi érdeklődő.
  const [demoPref, setDemoPref] = useState<boolean | null>(null)
  const realEmpty = real.leads !== null && (real.leads.length === 0 || Boolean(real.error))
  const demo = demoPref ?? (base.demo === true && realEmpty)
  const [demoRows, setDemoRows] = useState<LeadRow[]>(() => demoLeads(Date.now()))
  const [demoClock] = useState(() => Date.now())
  const demoStats = useMemo(() => demoEvents(demoClock), [demoClock])
  const leads = demo ? demoRows : real.leads
  const error = demo ? '' : real.error
  const events = demo ? demoStats : realEvents
  const update = useCallback((ref: string, patch: { status?: string; ownerNote?: string }) => {
    if (demo) setDemoRows((rows) => rows.map((row) => (row.ref === ref ? { ...row, ...(patch.status ? { status: patch.status } : {}), ...(patch.ownerNote !== undefined ? { owner_note: patch.ownerNote || null } : {}) } : row)))
    else void real.update(ref, patch)
    if (patch.status) push(`Státusz módosítva: ${LEAD_STATUS_LABEL[patch.status] ?? patch.status}`)
    else if (patch.ownerNote !== undefined) push('Megjegyzés mentve')
  }, [demo, real, push])

  const choose = useCallback((next: AdminTab) => { setTab(next); window.history.replaceState(null, '', TABS.find(([key]) => key === next)![2]) }, [])
  const openLead = useCallback((ref: string) => { choose('leads'); setOpenRef(ref) }, [choose])

  // Élő értesítés: demóban időnként „beérkezik” egy kitalált érdeklődő, éles módban a szerver frissítése hozza az újat.
  const known = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (demo) {
      let step = 0
      const id = window.setInterval(() => {
        const lead = demoIncoming(Date.now(), step++)
        setDemoRows((rows) => [lead, ...rows.filter((row) => row.ref !== lead.ref)])
        push(`Új érdeklődő: ${lead.customer_name}, ${lead.city}`, 'lead', { label: 'Megnyitás', run: () => openLead(lead.ref) })
      }, 45_000)
      return () => window.clearInterval(id)
    }
    const id = window.setInterval(() => { void real.reload() }, 60_000)
    return () => window.clearInterval(id)
  }, [demo, push, openLead, real])
  useEffect(() => {
    if (demo || !real.leads) return
    const refs = new Set(real.leads.map((lead) => lead.ref))
    if (known.current) {
      const fresh = real.leads.filter((lead) => !known.current!.has(lead.ref))
      if (fresh.length) push(`Új érdeklődő: ${fresh[0].customer_name}, ${fresh[0].city}`, 'lead', { label: 'Megnyitás', run: () => openLead(fresh[0].ref) })
    }
    known.current = refs
  }, [demo, real.leads, push, openLead])

  // Cmd/Ctrl+K: gyorskereső.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen((open) => !open) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const effective = useMemo(() => (overrides ? applyOverrides(base, overrides) : base), [base, overrides])
  const embedKey = `admin-embed-copied:${base.id}`
  const [embedCopied, setEmbedCopied] = useState(() => { try { return localStorage.getItem(embedKey) === '1' } catch { return false } })
  const markEmbed = () => { setEmbedCopied(true); try { localStorage.setItem(embedKey, '1') } catch { /* privát mód */ } push('Beágyazókód másolva') }
  const checklist: ChecklistItem[] = [
    { key: 'logo', label: 'Logó feltöltése', hint: 'Add meg a logó URL-jét a Beállításokban.', done: Boolean(effective.brand.logoUrl), go: () => choose('settings') },
    { key: 'email', label: 'Kapcsolattartó e-mail', hint: 'Ez jelenik meg a vevőknek küldött anyagokon.', done: Boolean(effective.brand.email), go: () => choose('settings') },
    { key: 'privacy', label: 'Adatkezelési tájékoztató', hint: 'Éles működéshez kötelező: nélküle a konfigurátor nem fogad kérelmet.', done: hasPrivacyUrl(effective), go: () => choose('settings') },
    { key: 'recipients', label: 'Értesítési címzettek', hint: 'Ide érkeznek az új érdeklődők e-mailben.', done: effective.lead.recipients.length > 0, go: () => choose('settings') },
    { key: 'lead', label: 'Első érdeklődő', hint: 'Küldj egy próbakérést a konfigurátorból.', done: (real.leads?.length ?? 0) > 0, go: () => window.open(`/k/${base.id}`, '_blank', 'noopener') },
    { key: 'embed', label: 'Beágyazás a weboldalba', hint: 'Másold ki a kódot a Beágyazás fülön.', done: embedCopied, go: () => choose('embed') },
  ]

  const commands: PaletteCommand[] = [
    { id: 'go-overview', label: 'Ugrás: Áttekintés', icon: PALETTE_ICONS.overview, run: () => choose('overview') },
    { id: 'go-leads', label: 'Ugrás: Érdeklődők', icon: PALETTE_ICONS.leads, run: () => choose('leads') },
    { id: 'go-embed', label: 'Ugrás: Beágyazás', icon: PALETTE_ICONS.embed, run: () => choose('embed') },
    { id: 'go-settings', label: 'Ugrás: Beállítások', icon: PALETTE_ICONS.settings, run: () => choose('settings') },
    { id: 'report', label: 'Jelentés nyomtatása / PDF', icon: PALETTE_ICONS.report, run: () => { choose('overview'); window.setTimeout(() => window.print(), 250) } },
    { id: 'configurator', label: 'Konfigurátor megnyitása', icon: PALETTE_ICONS.open, run: () => window.open(`/k/${base.id}`, '_blank', 'noopener') },
    { id: 'demo', label: demo ? 'Demó adatok kikapcsolása' : 'Demó adatok bekapcsolása', icon: PALETTE_ICONS.csv, run: () => setDemoPref(!demo) },
  ]

  const fresh = leads?.filter((lead) => lead.status === 'new').length ?? 0
  const title = TABS.find(([key]) => key === tab)![1]
  const quotes = demo
    ? { all: [], create: async () => ({ ok: false as const, error: 'Demó módban az ajánlat nem küldhető ki.' }), withdraw: async () => false }
    : { all: quoteApi.quotes ?? [], create: quoteApi.create, withdraw: quoteApi.withdraw }
  return <main className="admin-page">
    <div className="admin-layout">
      <aside className="admin-side">
        <div className="admin-brand"><span className="brand-mark">{base.brand.name.slice(0, 1)}</span><div><strong>{base.brand.name}{base.brand.suffix && <small> {base.brand.suffix}</small>}</strong><span>Gyártói admin</span></div></div>
        <nav className="admin-nav" aria-label="Admin részek">
          {TABS.map(([key, label]) => <button type="button" key={key} className={tab === key ? 'is-on' : ''} onClick={() => choose(key)} aria-current={tab === key ? 'page' : undefined}>{TAB_INFO[key].icon}<span>{label}</span>{key === 'leads' && fresh > 0 && <em>{fresh}</em>}</button>)}
        </nav>
        <div className="admin-side-foot"><Link to={`/k/${base.id}`} target="_blank" rel="noopener"><ExternalLink size={15} />Konfigurátor megnyitása</Link><button type="button" onClick={onLogout}><LogOut size={15} />Kilépés</button><a className="admin-powered" href="/" target="_blank" rel="noopener" aria-label="Lamelix — a platform oldala"><LamelixLogo height={16} title={null} /></a></div>
      </aside>
      <section className="admin-main">
        {demo && <div className="demo-ribbon" role="status"><span><b>Demó adatok</b> · kitalált érdeklődők, a módosítások nem mentődnek.</span><button type="button" onClick={() => setDemoPref(false)}>Kikapcsolás</button></div>}
        {!demo && base.demo === true && realEmpty && <div className="demo-ribbon is-soft"><span>Még nincs valódi érdeklődő.</span><button type="button" onClick={() => setDemoPref(true)}>Demó adatok megtekintése</button></div>}
        <header className="admin-top"><div><h1>{title}</h1><p>{TAB_INFO[tab].subtitle}</p></div><div className="admin-top-actions"><button type="button" className="palette-btn" onClick={() => setPaletteOpen(true)} aria-label="Gyorskereső megnyitása"><Search size={14} /><span>Keresés</span><kbd>Ctrl K</kbd></button><Link className="btn" to={`/k/${base.id}`} target="_blank" rel="noopener"><ExternalLink size={15} />Konfigurátor</Link></div></header>
        {(tab === 'overview' || tab === 'leads') && leads === null && <p className="admin-hint" role="status">Betöltés…</p>}
        {tab === 'overview' && leads && <div key="overview" className="tab-fade">{error && <p className="admin-message is-error" role="alert">{error}</p>}<AdminOverview leads={leads} events={events} onOpenLeads={() => choose('leads')} onOpenLead={openLead} checklist={demo ? undefined : checklist} /></div>}
        {tab === 'leads' && leads && <div key="leads" className="tab-fade"><AdminLeads leads={leads} error={error} onReload={() => void real.reload()} onUpdate={update} quotes={quotes} openRef={openRef} onOpenRef={setOpenRef} /></div>}
        {tab === 'embed' && <div key="embed" className="tab-fade"><EmbedPanel tenantId={base.id} onCopied={markEmbed} /></div>}
        <div hidden={tab !== 'settings'}>{children}</div>
      </section>
    </div>
    <Toasts toasts={toasts} onDismiss={dismiss} />
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} leads={leads ?? []} onOpenLead={openLead} />
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
  const [matrix, setMatrix] = useState<MatrixDraft>(() => Object.fromEntries(ROOF_TYPES.map((roof) => [roof, pointsToRows(effective.prices.priceMatrix?.[roof])])))
  const [matrixErrors, setMatrixErrors] = useState<MatrixErrors>({})
  const [roofNames, setRoofNames] = useState<Record<string, { name: string; short: string }>>(() => Object.fromEntries(ROOF_TYPES.map((roof) => [roof, { name: effective.roofs[roof]?.name ?? ROOF_INFO[roof].name, short: effective.roofs[roof]?.short ?? ROOF_INFO[roof].short }])))
  const [limits, setLimits] = useState(() => ({ widthMin: effective.limits.width[0], widthMax: effective.limits.width[1], depthMin: effective.limits.depth[0], depthMax: effective.limits.depth[1], heightMin: effective.limits.height[0], heightMax: effective.limits.height[1], maxHeaters: effective.limits.maxHeaters }))
  const setLimit = (key: keyof typeof limits, value: string) => setLimits((current) => ({ ...current, [key]: Number(value) }))
  const [matrixRoof, setMatrixRoof] = useState<RoofType | null>(null)
  const [formError, setFormError] = useState('')

  const toggle = <T,>(list: T[], item: T, on: boolean) => (on ? [...list.filter((entry) => entry !== item), item] : list.filter((entry) => entry !== item))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    const priceMatrix: NonNullable<TenantOverrides['priceMatrix']> = {}
    const nextErrors: MatrixErrors = {}
    for (const roof of ROOF_TYPES) {
      const { points, errors } = validateMatrixRows(matrix[roof] ?? [])
      if (errors.length && roofs.includes(roof)) { nextErrors[roof] = errors; continue }
      // A kikapcsolt tetők mátrixa is megmarad (visszakapcsoláskor ne vesszen el); hibás szerkesztésnél az utolsó mentett.
      const kept = errors.length ? effective.prices.priceMatrix?.[roof] ?? [] : points
      if (kept.length) priceMatrix[roof] = kept
    }
    setMatrixErrors(nextErrors)
    const broken = ROOF_TYPES.find((roof) => nextErrors[roof])
    if (broken) {
      setMatrixRoof(broken)
      setFormError(`${ROOF_INFO[broken].name} ármátrix: ${nextErrors[broken]![0].message} Javítsd a pirossal jelölt mezőket.`)
      document.getElementById('armatrix')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
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
      roofNames: Object.fromEntries(ROOF_TYPES.map((roof) => [roof, { name: roofNames[roof].name.trim(), short: roofNames[roof].short.trim() }])) as TenantOverrides['roofNames'],
      limits: { width: [limits.widthMin, limits.widthMax], depth: [limits.depthMin, limits.depthMax], height: [limits.heightMin, limits.heightMax], maxHeaters: limits.maxHeaters },
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
        <p className="admin-hint admin-wide">A terméknév és a rövid leírás a gyártó sajátja lehet (fehér címke): ez jelenik meg a konfigurátorban, a PDF-en és az ajánlatban.</p>
        {ROOF_TYPES.map((roof) => <div className="admin-row admin-wide" key={roof}>
          <label className="admin-check"><input type="checkbox" checked={roofs.includes(roof)} onChange={(event) => setRoofs(toggle(roofs, roof, event.target.checked))} /><small>{ROOF_INFO[roof].name}</small></label>
          <input type="text" aria-label={`${ROOF_INFO[roof].name} terméknév`} placeholder={ROOF_INFO[roof].name} maxLength={40} value={roofNames[roof].name} onChange={(event) => setRoofNames({ ...roofNames, [roof]: { ...roofNames[roof], name: event.target.value } })} />
          <input type="text" aria-label={`${ROOF_INFO[roof].name} rövid leírás`} placeholder={ROOF_INFO[roof].short} maxLength={60} value={roofNames[roof].short} onChange={(event) => setRoofNames({ ...roofNames, [roof]: { ...roofNames[roof], short: event.target.value } })} />
          <input type="number" min="0" step="1000" aria-label={`${ROOF_INFO[roof].name} m² ár`} value={prices[ROOF_INFO[roof].priceKey]} onChange={(event) => setPrices({ ...prices, [ROOF_INFO[roof].priceKey]: Math.max(0, Number(event.target.value) || 0) })} />
        </div>)}
      </Section>

      <Section title="Egyéb nettó árak">
        {MONEY_FIELDS.map((field) => <label key={field.key}><span>{field.label} <small>{field.unit}</small></span><input type="number" min="0" step="1000" value={prices[field.key]} onChange={(event) => setPrices({ ...prices, [field.key]: Math.max(0, Number(event.target.value) || 0) })} /></label>)}
        {RATE_FIELDS.map(([key, label]) => <label key={key}><span>{label} <small>%</small></span><input type="number" min="0" max="100" step="1" value={Math.round(prices[key] * 100)} onChange={(event) => setPrices({ ...prices, [key]: Math.min(100, Math.max(0, Number(event.target.value) || 0)) / 100 })} /></label>)}
      </Section>

      <section className="admin-section" id="armatrix">
        <h2>Ármátrix <small className="admin-h2-note">opcionális, tetőtípusonként</small></h2>
        <p className="admin-hint matrix-intro">Méretpáronként a nettó szerkezeti ár (m, Ft). Ahol van mátrix, az váltja ki a m²-árat; a köztes méreteket a rendszer interpolálja. Üres táblázatnál a m²-ár érvényes.</p>
        <PriceMatrixEditor roofs={ROOF_TYPES.filter((roof) => roofs.includes(roof))} value={matrix} errors={matrixErrors} active={matrixRoof} onActiveChange={setMatrixRoof}
          onChange={(roof, rows) => { setMatrix((current) => ({ ...current, [roof]: rows })); if (matrixErrors[roof]) setMatrixErrors((current) => ({ ...current, [roof]: undefined })) }} />
      </section>

      <Section title="Gyártható méretek">
        <label><span>Szélesség min. <small>m</small></span><input type="number" min="1" max="30" step="0.1" value={limits.widthMin} onChange={(event) => setLimit('widthMin', event.target.value)} /></label>
        <label><span>Szélesség max. <small>m</small></span><input type="number" min="1" max="30" step="0.1" value={limits.widthMax} onChange={(event) => setLimit('widthMax', event.target.value)} /></label>
        <label><span>Mélység (kinyúlás) min. <small>m</small></span><input type="number" min="1" max="30" step="0.1" value={limits.depthMin} onChange={(event) => setLimit('depthMin', event.target.value)} /></label>
        <label><span>Mélység max. <small>m</small></span><input type="number" min="1" max="30" step="0.1" value={limits.depthMax} onChange={(event) => setLimit('depthMax', event.target.value)} /></label>
        <label><span>Magasság min. <small>m</small></span><input type="number" min="1.8" max="6" step="0.05" value={limits.heightMin} onChange={(event) => setLimit('heightMin', event.target.value)} /></label>
        <label><span>Magasság max. <small>m</small></span><input type="number" min="1.8" max="6" step="0.05" value={limits.heightMax} onChange={(event) => setLimit('heightMax', event.target.value)} /></label>
        <label><span>Fűtőpanel max. <small>db</small></span><input type="number" min="0" max="20" step="1" value={limits.maxHeaters} onChange={(event) => setLimit('maxHeaters', event.target.value)} /></label>
        <p className="admin-hint admin-wide">A konfigurátor csúszkái és a megosztott linkek is ezen a tartományon belül maradnak; a meglévő tervek a tartományra kerekednek.</p>
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
