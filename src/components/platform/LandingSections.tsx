// Lamelix B2B oldal – a „Funkciók”, „Működés”, megtérülés-kalkulátor és GYIK blokkok.
// A mini-illusztrációk CSS-ből animálódnak, és csak akkor futnak, amikor látszanak (is-live).
import { useId, useMemo, useState, type ReactNode } from 'react'
import { ArrowUpRight, Box, Calculator, Code2, FileText, Lightbulb, Mail, MoonStar, Palette, Plus, ScanLine, Sparkles, Sun, Upload, Wallet, Zap } from 'lucide-react'
import { Link } from 'react-router'
import { useLive } from './useLive'
import { estimateRoi, formatFt, PLANS, SETUP_FEE, type PlanId } from '@/lib/platformPricing'

function Live({ as: Tag = 'article', className, children }: { as?: 'article' | 'div' | 'li'; className: string; children: ReactNode }) {
  const [ref, live] = useLive<HTMLElement>(0.2)
  return <Tag ref={ref as never} className={`${className}${live ? ' is-live' : ''}`} data-pf-item>{children}</Tag>
}

/* ------------------------------------------------------------------ */
/* Funkciók: amit a vevő a konfigurátorban kap                          */
/* ------------------------------------------------------------------ */

const FEATURES: { id: string; icon: ReactNode; title: string; text: string; visual: ReactNode }[] = [
  {
    id: 'ar', icon: <ScanLine size={15} />, title: 'AR-nézet',
    text: 'A vevő telefonon a saját kertjébe vetíti a pergolát, valós méretben – iPhone-on és Androidon is, alkalmazás nélkül.',
    visual: <div className="fv-ar"><div className="fv-ar-phone"><span className="fv-ar-floor" /><span className="fv-ar-model"><i /><i /><i /></span><span className="fv-ar-scan" /></div></div>,
  },
  {
    id: 'photo', icon: <Sparkles size={15} />, title: 'Fotóba helyezés',
    text: 'Feltölt egy fotót a házáról, és a 3D pergolát ráilleszti: elforgatja, átméretezi, a fényviszonyokhoz igazítja.',
    visual: <div className="fv-photo"><span className="fv-photo-house"><i /><i /></span><span className="fv-photo-model"><i /><b /><b /><b /><b /></span></div>,
  },
  {
    id: 'sun', icon: <Sun size={15} />, title: 'Árnyékelemzés',
    text: 'Valós napállás a település és a tájolás alapján: kiderül, mekkora árnyék lesz a pergola alatt egy júliusi délutánon.',
    visual: <div className="fv-sun"><svg viewBox="0 0 120 60" aria-hidden="true"><path d="M8 56 A52 52 0 0 1 112 56" pathLength={1} /></svg><span className="fv-sun-dot" /><span className="fv-sun-roof" /><span className="fv-sun-shade" /><b className="fv-sun-pct"><i>62%</i><i>84%</i><i>71%</i></b></div>,
  },
  {
    id: 'budget', icon: <Wallet size={15} />, title: 'Költségkeret-tervező',
    text: 'A vevő megadja, mennyit szán rá, és a rendszer megmutatja, mi fér bele – a terve lényegének megtartásával.',
    visual: <div className="fv-budget"><span className="fv-budget-label"><small>Keret</small><b>5 000 000 Ft</b></span><span className="fv-budget-bar"><i /><em /></span><span className="fv-budget-tags"><i>Méret −0,5 m</i><i>ZIP 1 oldalon</i></span></div>,
  },
  {
    id: 'advisor', icon: <Lightbulb size={15} />, title: 'Tanácsadó',
    text: 'Négy egyszerű kérdés után javasolt pergolát kap, indoklással – egy kattintással megnyitva a 3D-tervezőben.',
    visual: <div className="fv-adv">{['Napvédelem', 'Esővédelem', 'Egész évben', 'Falhoz'].map((label, index) => <i key={label} style={{ ['--i' as string]: index }}>{label}</i>)}<b>Javaslat: Aero lamellás</b></div>,
  },
  {
    id: 'night', icon: <MoonStar size={15} />, title: 'Esti hangulat',
    text: 'Éjszakai nézet LED-világítással és fűtéssel: a vevő látja, milyen lesz a terasz este, és mennyibe kerül.',
    visual: <div className="fv-night"><span className="fv-night-roof" /><span className="fv-night-glow" /><span className="fv-night-stars"><i /><i /><i /><i /></span></div>,
  },
  {
    id: 'energy', icon: <Zap size={15} />, title: 'Energia és üzemeltetés',
    text: 'Éves áramköltség a valós lakossági tarifával; napelemes tetőnél a várható termelés is látszik.',
    visual: <div className="fv-energy">{[38, 62, 46, 80, 58, 70].map((height, index) => <i key={index} style={{ ['--h' as string]: `${height}%`, ['--i' as string]: index }} />)}<b>~18 600 Ft / év</b></div>,
  },
  {
    id: 'pdf', icon: <FileText size={15} />, title: 'PDF és megosztás',
    text: 'Letölthető PDF-összefoglaló képekkel, méretekkel, árral és QR-kóddal – a döntés a családdal együtt születik meg.',
    visual: <div className="fv-pdf"><span className="fv-pdf-page"><i className="fv-pdf-img" /><i /><i /><i /><b /></span><span className="fv-pdf-page is-back" /></div>,
  },
]

export function CustomerFeatures() {
  return <div className="fx-grid">
    {FEATURES.map((feature) => <Live key={feature.id} className={`fx fx-${feature.id}`}>
      <div className="fx-visual" aria-hidden="true">{feature.visual}</div>
      <div className="fx-copy"><h3>{feature.icon}{feature.title}</h3><p>{feature.text}</p></div>
    </Live>)}
  </div>
}

/* ------------------------------------------------------------------ */
/* Működés: négy lépés idővonalon                                       */
/* ------------------------------------------------------------------ */

const STEPS: { icon: ReactNode; when: string; title: string; text: string; visual: ReactNode }[] = [
  {
    icon: <Upload size={16} />, when: '1. nap', title: 'Átküldi a termékadatokat',
    text: 'Méretkorlátok, tetőtípusok, színek, extrák és az árlista vagy ármátrix – a meglévő Excel-táblázat is megfelel.',
    visual: <div className="sv-sheet"><span className="sv-sheet-head"><i />arlista_2027.xlsx</span>{[0, 1, 2, 3].map((row) => <span className="sv-sheet-row" key={row} style={{ ['--i' as string]: row }}><i /><i /><i /><i /></span>)}</div>,
  },
  {
    icon: <Palette size={16} />, when: '2–5. munkanap', title: 'Beállítjuk az arculatát',
    text: 'Logó, színek, cégadatok és értesítési címek. Ön csak átnézi és jóváhagyja.',
    visual: <div className="sv-brand"><span className="sv-brand-ui"><i className="sv-brand-bar" /><i /><i /><b className="sv-brand-btn" /></span><span className="sv-brand-swatches"><i /><i /><i /></span></div>,
  },
  {
    icon: <Code2 size={16} />, when: '6–10. munkanap', title: 'Beépítjük a weboldalába',
    text: 'Saját link a „Tervezze meg” gombhoz, vagy beágyazási kód – WordPress, Wix, Shopify és egyedi oldal is.',
    visual: <div className="sv-code"><span><i className="t">&lt;iframe</i> <i className="a">src</i>=<i className="s">"…/k/ceged"</i><i className="t">&gt;</i></span><span className="sv-code-caret" /></div>,
  },
  {
    icon: <Mail size={16} />, when: 'Indulás után', title: 'Érkeznek a beárazott kérelmek',
    text: 'E-mailben és az adminfelületen, a teljes tervvel együtt. Az árakat bármikor maga módosíthatja.',
    visual: <div className="sv-mail"><span className="sv-mail-card"><i className="sv-mail-dot" /><span><b>Új felmérési kérelem</b><small>Aero 5,0 × 4,0 m · 5,6 M Ft</small></span></span><span className="sv-mail-card is-2"><i className="sv-mail-dot" /><span><b>Új felmérési kérelem</b><small>Glide 6,0 × 4,5 m · 7,2 M Ft</small></span></span></div>,
  },
]

export function ProcessTimeline() {
  return <div className="sx">
    <div className="sx-line" aria-hidden="true"><i /></div>
    <ol className="sx-list">
      {STEPS.map((step, index) => <Live as="li" key={step.title} className="sx-step">
        <span className="sx-node" aria-hidden="true">{index + 1}</span>
        <div className="sx-card">
          <div className="sx-visual" aria-hidden="true">{step.visual}</div>
          <span className="sx-when">{step.icon}{step.when}</span>
          <h3>{step.title}</h3>
          <p>{step.text}</p>
        </div>
      </Live>)}
    </ol>
  </div>
}

/* ------------------------------------------------------------------ */
/* Megtérülés-kalkulátor                                                */
/* ------------------------------------------------------------------ */

const compactFt = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString('hu-HU', { maximumFractionDigits: 1 })} M Ft`
  return formatFt(Math.round(value / 1000) * 1000)
}

function Range({ label, value, min, max, step, format, onChange }: { label: string; value: number; min: number; max: number; step: number; format: (value: number) => string; onChange: (value: number) => void }) {
  const id = useId()
  return <div className="roi-field">
    <label htmlFor={id}><span>{label}</span><b>{format(value)}</b></label>
    <input id={id} type="range" min={min} max={max} step={step} value={value} style={{ ['--p' as string]: `${((value - min) / (max - min)) * 100}%` }} onChange={(event) => onChange(Number(event.target.value))} />
  </div>
}

export function RoiCalculator({ annual }: { annual: boolean }) {
  const [planId, setPlanId] = useState<Exclude<PlanId, 'partner'>>('pro')
  const [projectValue, setProjectValue] = useState(4_500_000)
  const [marginPct, setMarginPct] = useState(25)
  const [extraOrders, setExtraOrders] = useState(6)
  const plan = PLANS.find((item) => item.id === planId)!
  const roi = useMemo(() => estimateRoi({ projectValue, marginPct, extraOrders }, plan, annual), [projectValue, marginPct, extraOrders, plan, annual])
  const scale = Math.max(roi.firstYearCost, roi.gain, 1)
  const breakEven = Math.ceil(roi.breakEvenOrders)

  return <div className="roi" data-pf-item>
    <div className="roi-controls">
      <p className="roi-kicker"><Calculator size={15} />Megtérülés-kalkulátor</p>
      <h3>Számolja ki a <em>saját</em> számaival.</h3>
      <div className="roi-plan" role="group" aria-label="Csomag">
        {PLANS.filter((item) => item.monthly !== null).map((item) => <button key={item.id} type="button" className={planId === item.id ? 'is-on' : ''} aria-pressed={planId === item.id} onClick={() => setPlanId(item.id as Exclude<PlanId, 'partner'>)}>{item.name}</button>)}
      </div>
      <Range label="Átlagos projektérték (bruttó)" value={projectValue} min={1_500_000} max={12_000_000} step={100_000} format={compactFt} onChange={setProjectValue} />
      <Range label="Fedezet a nettó árbevételen" value={marginPct} min={10} max={50} step={1} format={(value) => `${value}%`} onChange={setMarginPct} />
      <Range label="Plusz megrendelés évente a konfigurátorból" value={extraOrders} min={1} max={30} step={1} format={(value) => `${value} db`} onChange={setExtraOrders} />
    </div>
    <div className="roi-result" aria-live="polite">
      <div className="roi-break">
        <span>Ennyi plusz megrendelés fedezi az első évet:</span>
        <strong>{Number.isFinite(breakEven) ? breakEven : '–'}<small>db</small></strong>
        <p>Egy megrendelés fedezete kb. {compactFt(roi.marginPerOrder)}, az első év költsége bevezetéssel együtt {compactFt(roi.firstYearCost)} (nettó).</p>
      </div>
      <div className="roi-bars">
        <div className="roi-bar"><span>Első évi költség</span><i style={{ ['--w' as string]: `${(roi.firstYearCost / scale) * 100}%` }} /><b>{compactFt(roi.firstYearCost)}</b></div>
        <div className="roi-bar is-gain"><span>Plusz fedezet ({extraOrders} megrendelés)</span><i style={{ ['--w' as string]: `${(roi.gain / scale) * 100}%` }} /><b>{compactFt(roi.gain)}</b></div>
      </div>
      <p className={`roi-net${roi.net >= 0 ? ' is-pos' : ''}`}>{roi.net >= 0 ? <>Az első év eredménye: <b>+{compactFt(roi.net)}</b></> : <>Ennyi megrendelésnél még <b>{compactFt(-roi.net)}</b> hiányzik a megtérüléshez.</>}</p>
      <small className="roi-note">Becslés nettó árakkal: a bevezetési díj ({formatFt(SETUP_FEE)}) és 12 hónap előfizetési díja, {annual ? 'éves' : 'havi'} fizetéssel. A második évtől csak az előfizetési díj marad.</small>
    </div>
  </div>
}

/* ------------------------------------------------------------------ */
/* GYIK                                                                 */
/* ------------------------------------------------------------------ */

export const FAQS = [
  { q: 'Mennyi idő a bevezetés?', a: 'Jellemzően 5–10 munkanap attól számítva, hogy megkaptuk a termékadatokat és az árakat. A demót már az első egyeztetésen az Ön logójával mutatjuk meg.' },
  { q: 'Beépíthető a meglévő weboldalunkba?', a: 'Igen. Kap egy saját linket (például a „Tervezze meg” gombhoz) és egy beágyazási kódot, amely bármilyen weboldalon működik. A konfigurátor az Ön arculatát viseli.' },
  { q: 'Kell a vevőnek bármit telepítenie?', a: 'Nem. A konfigurátor böngészőben fut számítógépen, tableten és telefonon is. Az AR-nézethez sem kell alkalmazás: iPhone-on és a legtöbb Android telefonon közvetlenül indul.' },
  { q: 'Mi van, ha a termékünk eltér a demótól?', a: 'A méretkorlátok, tetőtípusok, oldalfalak, rögzítési módok, színek, extrák és árak az adminfelületen állíthatók. Egyedi profil vagy új termék 3D modellezése külön ajánlat alapján készül.' },
  { q: 'Az irányár kötelező érvényű ajánlat?', a: 'Nem. A vevő tájékoztató jellegű irányárat lát, amelyet az Ön árazása alapján számolunk. A végleges ajánlatot a helyszíni felmérés után Ön adja.' },
  { q: 'Hogyan módosíthatom az árakat?', a: 'Az adminfelületen bármikor: m²-árakat, felárakat és ármátrixot is szerkeszthet, akár Excelből bemásolva. A változás azonnal megjelenik a konfigurátorban.' },
  { q: 'Hová kerülnek a vevők adatai?', a: 'A felmérési kérelem azonnal megérkezik az Ön e-mail-címére, és megjelenik a gyártói adminban. A vevővel Ön tartja a kapcsolatot, mi nem keressük meg.' },
  { q: 'Van hűségidő?', a: 'Nincs. A havi előfizetés a hónap végére felmondható; éves fizetésnél két hónap díját elengedjük.' },
] as const

export function Faq({ email, demoPath }: { email: string; demoPath: string }) {
  const [open, setOpen] = useState(0)
  return <div className="qa">
    <aside className="qa-side" data-pf-item>
      <p className="pf-eyebrow">07 – Kérdések</p>
      <h2 id="gyik-title">Rövid <em>válaszok</em>.</h2>
      <p className="pf-sub">Nem találja, amit keres? Írjon nekünk, egy munkanapon belül válaszolunk.</p>
      <div className="qa-contact">
        <span className="qa-contact-icon"><Box size={20} /></span>
        <div><strong>Kérdése van?</strong><a href={`mailto:${email}`}>{email}</a></div>
      </div>
      <Link className="pf-btn pf-btn-ghost" to={demoPath}>Nyissa meg az élő demót <ArrowUpRight size={17} /></Link>
    </aside>
    <div className="qa-list">
      {FAQS.map((item, index) => {
        const isOpen = open === index
        return <div key={item.q} className={`qa-item${isOpen ? ' is-open' : ''}`} data-pf-item>
          <h3><button type="button" aria-expanded={isOpen} aria-controls={`qa-${index}`} onClick={() => setOpen(isOpen ? -1 : index)}>
            <span className="qa-num">{String(index + 1).padStart(2, '0')}</span><span className="qa-q">{item.q}</span><span className="qa-toggle" aria-hidden="true"><Plus size={18} /></span>
          </button></h3>
          <div className="qa-body" id={`qa-${index}`} role="region" aria-hidden={!isOpen}><div><p>{item.a}</p></div></div>
        </div>
      })}
    </div>
  </div>
}
