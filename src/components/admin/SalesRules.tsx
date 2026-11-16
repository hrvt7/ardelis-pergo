// Gyártói admin: árazási szabályok (regionális felár, viszonteladói árrés) és CRM-webhook.
// Az állapot az AdminEditorban él (a mentés a teljes beállítást írja), ezek csak a vezérelt mezők.
import { useState } from 'react'
import { WEBHOOK_EVENTS } from '@/tenants/crm'
import type { Tenant } from '@/tenants/types'
import { num, type CrmDraft, type DealerDraft, type PricingDraft } from '@/lib/salesRulesDraft'

// ---------- Árazási szabályok ----------

const slug = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

export function PricingRulesEditor({ tenant, value, onChange, symbol }: { tenant: Tenant; value: PricingDraft; onChange: (next: PricingDraft) => void; symbol: string }) {
  const [copied, setCopied] = useState('')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const setRegion = (region: string, key: 'percent' | 'net', text: string) => onChange({ ...value, regions: { ...value.regions, [region]: { ...value.regions[region], [key]: text } } })
  const setDealer = (index: number, patch: Partial<DealerDraft>) => onChange({ ...value, dealers: value.dealers.map((dealer, at) => (at === index ? { ...dealer, ...patch } : dealer)) })
  const copy = (text: string) => { void navigator.clipboard?.writeText(text).then(() => { setCopied(text); window.setTimeout(() => setCopied(''), 1600) }) }
  const active = Object.values(value.regions).filter((rule) => num(rule.percent) || num(rule.net)).length

  return <>
    <section className="admin-section" id="arazasi-szabalyok">
      <h2>Regionális felár <small className="admin-h2-note">{active ? `${active} régióban` : 'nincs beállítva'}</small></h2>
      <p className="admin-hint">Kiszállás, daru, távolsági díj régiónként: százalék a tételek nettó összegére (telepítés nélkül) és/vagy fix nettó összeg. A vevő az ajánlatkérő űrlapon, a régió kiválasztása után látja külön tételként; a lead, az e-mail, a CRM és az ajánlat is ezzel számol. A konfigurátor ára régió nélkül marad.</p>
      <div className="admin-rules-table" role="table" aria-label="Regionális felárak">
        <div className="admin-rules-head" role="row"><span role="columnheader">Régió</span><span role="columnheader">Felár %</span><span role="columnheader">Fix felár ({symbol}, nettó)</span></div>
        {tenant.regions.map((region) => <div className="admin-rules-row" role="row" key={region}>
          <span role="cell">{region}</span>
          <input role="cell" type="number" min="0" max="50" step="0.5" inputMode="decimal" aria-label={`${region} felár százalék`} placeholder="0" value={value.regions[region]?.percent ?? ''} onChange={(event) => setRegion(region, 'percent', event.target.value)} />
          <input role="cell" type="number" min="0" step="1" inputMode="numeric" aria-label={`${region} fix felár`} placeholder="0" value={value.regions[region]?.net ?? ''} onChange={(event) => setRegion(region, 'net', event.target.value)} />
        </div>)}
      </div>
    </section>

    <section className="admin-section" id="viszonteladok">
      <h2>Viszonteladók <small className="admin-h2-note">{value.dealers.length ? `${value.dealers.length} viszonteladó` : 'nincs még'}</small></h2>
      <p className="admin-hint">Minden viszonteladó saját linket kap. Az árrés a te egységáraidra kerül (m²-ár, darabár, ármátrix), így a vevő tételes kalkulációja konzisztens, az árrést külön nem látja. A leadek a viszonteladó nevével érkeznek hozzád, és ha megadsz e-mail-címet, a viszonteladó másolatot kap. A viszonteladó linkje csak a saját árrését tölti le, a többiekét nem.</p>
      {value.dealers.map((dealer, index) => {
        const link = dealer.id ? `${origin}/k/${tenant.id}?h=${dealer.id}` : ''
        return <div className="admin-dealer" key={index}>
          <label><span>Név</span><input value={dealer.name} maxLength={80} placeholder="pl. Muster Terrassen Graz" onChange={(event) => setDealer(index, { name: event.target.value, ...(dealer.id ? {} : { id: slug(event.target.value) }) })} /></label>
          <label><span>Link-azonosító</span><input value={dealer.id} maxLength={40} pattern="[a-z0-9][a-z0-9-]*" placeholder="graz" onChange={(event) => setDealer(index, { id: slug(event.target.value) })} /></label>
          <label><span>Árrés %</span><input type="number" min="0" max="100" step="0.5" value={dealer.margin} onChange={(event) => setDealer(index, { margin: event.target.value })} /></label>
          <label><span>E-mail (másolat a leadekről)</span><input type="email" value={dealer.email} maxLength={320} placeholder="nem kötelező" onChange={(event) => setDealer(index, { email: event.target.value })} /></label>
          <div className="admin-dealer-actions">
            {link && <button type="button" className="admin-ghost" onClick={() => copy(link)}>{copied === link ? 'Másolva ✓' : 'Link másolása'}</button>}
            {link && <button type="button" className="admin-ghost" onClick={() => copy(`<iframe src="${origin}/embed/${tenant.id}?h=${dealer.id}" style="width:100%;height:860px;border:0" allow="xr-spatial-tracking; fullscreen" loading="lazy"></iframe>`)}>Beágyazókód</button>}
            <button type="button" className="admin-ghost is-danger" onClick={() => onChange({ ...value, dealers: value.dealers.filter((_, at) => at !== index) })}>Törlés</button>
          </div>
          {link && <code className="admin-dealer-link">{link}</code>}
        </div>
      })}
      <button type="button" className="admin-ghost" onClick={() => onChange({ ...value, dealers: [...value.dealers, { id: '', name: '', margin: '15', email: '' }] })}>+ Viszonteladó hozzáadása</button>
    </section>
  </>
}

// ---------- CRM-webhook ----------

const EVENT_LABELS: Record<(typeof WEBHOOK_EVENTS)[number], string> = {
  'lead.created': 'Új érdeklődő (felmérési kérelem)',
  'quote.sent': 'Ajánlat kiküldve',
  'quote.accepted': 'Ajánlat elfogadva',
  'quote.declined': 'Ajánlat elutasítva',
}

const newSecret = () => [...crypto.getRandomValues(new Uint8Array(24))].map((byte) => byte.toString(16).padStart(2, '0')).join('')

const SAMPLE = `{
  "event": "lead.created",
  "id": "evt_8f1c…",
  "createdAt": "2026-11-16T09:12:00.000Z",
  "tenant": { "id": "…", "name": "…" },
  "data": {
    "ref": "AB12-CD34",
    "product": "pergola",
    "source": "standalone",
    "dealer": { "id": "graz", "name": "…" },
    "customer": { "name": "…", "email": "…", "phone": "…", "postalCode": "…", "city": "…", "region": "…", "address": null, "notes": null },
    "configuration": { "headline": "Aero · 5,0 × 4,0 m", "url": "https://…", "spec": [{ "label": "Tetőrendszer", "value": "…" }] },
    "price": { "currency": "EUR", "net": 11315, "vat": 2263, "gross": 13578, "lines": [{ "id": "structure", "label": "…", "net": 8400 }] }
  }
}`

const VERIFY = `// Node.js — a kérés ellenőrzése (Express: express.raw({ type: 'application/json' }))
const crypto = require('crypto')
const ts = req.get('X-Lamelix-Timestamp')
const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(ts + '.' + req.body).digest('hex')
const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.get('X-Lamelix-Signature')))
  && Math.abs(Date.now() / 1000 - Number(ts)) < 300`

export function CrmEditor({ value, onChange, token }: { value: CrmDraft; onChange: (next: CrmDraft) => void; token: string }) {
  const [showSecret, setShowSecret] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const enabled = Boolean(value.webhookUrl.trim())

  const test = async () => {
    setTesting(true); setResult(null)
    try {
      const response = await fetch('/api/admin-webhook-test', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ webhookUrl: value.webhookUrl.trim(), secret: value.secret.trim() }) })
      const data = await response.json().catch(() => null) as { ok?: boolean; error?: string; result?: { ok: boolean; status?: number; error?: string; ms: number } } | null
      if (!response.ok || !data?.ok || !data.result) setResult({ ok: false, text: data?.error ?? 'A teszt nem sikerült.' })
      else if (data.result.ok) setResult({ ok: true, text: `Megérkezett: a fogadó ${data.result.status} választ adott (${data.result.ms} ms).` })
      else setResult({ ok: false, text: data.result.error ?? 'A fogadó nem fogadta el a kérést.' })
    } catch {
      setResult({ ok: false, text: 'A szerver nem érhető el.' })
    } finally {
      setTesting(false)
    }
  }

  return <section className="admin-section" id="crm">
    <h2>CRM-kapcsolat <small className="admin-h2-note">{enabled ? 'webhook bekapcsolva' : 'kikapcsolva'}</small></h2>
    <p className="admin-hint">Minden új érdeklődő és ajánlat-esemény azonnal a saját rendszeredbe kerül: a Lamelix aláírt JSON-t küld a megadott címre. Make, n8n és Zapier közvetlenül fogadja, HubSpotba, Pipedrive-ba, Google Sheetsbe vagy bármilyen CRM-be ezeken keresztül kötheted be.</p>
    <div className="admin-grid">
      <label className="admin-wide"><span>Webhook cím <small>(https://…)</small></span><input type="url" value={value.webhookUrl} maxLength={500} placeholder="https://hook.eu1.make.com/…" onChange={(event) => onChange({ ...value, webhookUrl: event.target.value })} /></label>
      <label className="admin-wide"><span>Aláíró titok <small>(legalább 16 karakter; a fogadó ezzel ellenőrzi, hogy a kérés tőlünk jön)</small></span>
        <span className="admin-secret">
          <input type={showSecret ? 'text' : 'password'} value={value.secret} maxLength={200} autoComplete="off" onChange={(event) => onChange({ ...value, secret: event.target.value })} />
          <button type="button" className="admin-ghost" onClick={() => setShowSecret(!showSecret)}>{showSecret ? 'Elrejtés' : 'Mutatás'}</button>
          <button type="button" className="admin-ghost" onClick={() => { onChange({ ...value, secret: newSecret() }); setShowSecret(true) }}>Generálás</button>
        </span>
      </label>
      <fieldset className="admin-wide admin-events"><legend>Események</legend>
        {WEBHOOK_EVENTS.map((event) => <label className="admin-check" key={event}><input type="checkbox" checked={value.events.includes(event)} onChange={(change) => onChange({ ...value, events: change.target.checked ? [...value.events.filter((item) => item !== event), event] : value.events.filter((item) => item !== event) })} />{EVENT_LABELS[event]} <code>{event}</code></label>)}
      </fieldset>
      <div className="admin-wide admin-crm-test">
        <button type="button" className="admin-ghost" disabled={testing || !enabled} onClick={() => void test()}>{testing ? 'Küldés…' : 'Tesztesemény küldése'}</button>
        {result && <span className={result.ok ? 'is-ok' : 'is-error'} role="status">{result.text}</span>}
      </div>
      <p className="admin-hint admin-wide">A teszt a most beírt címre megy, mentés nélkül is (kitalált minta-vevővel). A beállítás a Mentés gombbal lép életbe. Ha a fogadó nem válaszol 5 másodpercen belül, egyszer újrapróbáljuk; a lead ettől függetlenül nálad marad (e-mail, admin).</p>
      <details className="admin-wide admin-crm-help">
        <summary>Beállítás lépésenként (Make, n8n, Zapier, HubSpot)</summary>
        <ol>
          <li><strong>Make:</strong> új scenario → Webhooks → <em>Custom webhook</em> → a kapott címet ide másold → „Tesztesemény küldése” → a Make felismeri a mezőket → következő modul (pl. HubSpot „Create a Contact”, Google Sheets „Add a Row”).</li>
          <li><strong>n8n:</strong> <em>Webhook</em> node, POST, a Production URL ide → utána bármelyik CRM-node. Az aláírás ellenőrzése egy Code node-dal (lent).</li>
          <li><strong>Zapier:</strong> Webhooks by Zapier → <em>Catch Hook</em> → a cím ide → teszt → Action: HubSpot, Pipedrive, Salesforce…</li>
          <li><strong>HubSpot:</strong> a HubSpot közvetlenül nem fogad tetszőleges webhookot; Make-en vagy Zapieren át egy lépésben bekötheted (kontakt + deal az irányárral).</li>
        </ol>
        <p>Fejlécek: <code>X-Lamelix-Event</code>, <code>X-Lamelix-Delivery</code> (ismétlés-szűréshez), <code>X-Lamelix-Timestamp</code>, <code>X-Lamelix-Signature</code> (sha256=HMAC).</p>
        <pre>{SAMPLE}</pre>
        <pre>{VERIFY}</pre>
        <p>Adatvédelem: a vevő adatait te, mint adatkezelő továbbítod a saját rendszeredbe; ezt érdemes a saját adatkezelési tájékoztatódban feltüntetni.</p>
      </details>
    </div>
  </section>
}
