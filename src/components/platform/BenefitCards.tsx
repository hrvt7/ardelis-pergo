// Lamelix B2B oldal – „Előnyök” kártyák élő mini-termékrészletekkel. Az animációk CSS-ből futnak,
// és csak akkor, amikor a kártya látszik (is-live osztály); mozgáscsökkentésnél állóképek.
import { useEffect, useState, type PointerEvent, type ReactNode } from 'react'
import { useLive } from './useLive'
import { ArrowUpRight, Calculator, LayoutDashboard, QrCode, Table2, Users } from 'lucide-react'

function tilt(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return
  const card = event.currentTarget
  const box = card.getBoundingClientRect()
  card.style.setProperty('--rx', `${((event.clientY - box.top) / box.height - 0.5) * -6}deg`)
  card.style.setProperty('--ry', `${((event.clientX - box.left) / box.width - 0.5) * 8}deg`)
  card.style.setProperty('--mx', `${((event.clientX - box.left) / box.width) * 100}%`)
  card.style.setProperty('--my', `${((event.clientY - box.top) / box.height) * 100}%`)
}
function untilt(event: PointerEvent<HTMLElement>) { event.currentTarget.style.setProperty('--rx', '0deg'); event.currentTarget.style.setProperty('--ry', '0deg') }

function Card({ className, index, icon, title, text, children }: { className: string; index: string; icon: ReactNode; title: string; text: string; children: ReactNode }) {
  const [ref, live] = useLive<HTMLElement>()
  return <article ref={ref} className={`bx ${className}${live ? ' is-live' : ''}`} data-pf-item onPointerMove={tilt} onPointerLeave={untilt}>
    <div className="bx-visual" aria-hidden="true">{children}</div>
    <div className="bx-copy">
      <span className="bx-kicker">{icon}{index}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  </article>
}

/** Irányár: a csúszka mozog, az ár vele együtt vált (három állapot, CSS-ből). */
function PriceVisual() {
  const prices = ['4 380 000', '5 648 000', '7 215 000']
  return <div className="vp">
    <div className="vp-row"><span>Szélesség</span><b className="vp-size"><i>4,0 m</i><i>5,0 m</i><i>6,5 m</i></b></div>
    <div className="vp-track"><span className="vp-fill" /><span className="vp-thumb" /></div>
    <div className="vp-chips"><span>Aero lamellás</span><span>ZIP screen</span><span className="is-on">LED</span><span>Telepítéssel</span></div>
    <div className="vp-price">
      <small>Bruttó irányár</small>
      <strong><span className="vp-roll">{prices.map((price) => <i key={price}>{price}</i>)}</span><em>Ft</em></strong>
      <span className="vp-live"><i />élő számítás</span>
    </div>
  </div>
}

/** Valódi, beolvasható QR-kód (a demókonfigurációra), pásztázó fénycsíkkal. */
function QrVisual() {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let alive = true
    const url = `${window.location.origin}/konfigurator`
    void import('qrcode').then(({ toString }) => toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0B1210', light: '#00000000' } })).then((markup) => { if (alive) setSvg(markup) }).catch(() => undefined)
    return () => { alive = false }
  }, [])
  return <div className="vq">
    <div className="vq-phone">
      <div className="vq-code" dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="vq-scan" />
      <span className="vq-corner a" /><span className="vq-corner b" /><span className="vq-corner c" /><span className="vq-corner d" />
    </div>
    <span className="vq-hint">Olvassa be – ez az élő demó <ArrowUpRight size={13} /></span>
  </div>
}

/** Beérkező kérelmek: értesítések érkeznek egymás után. */
function LeadVisual() {
  const leads = [['KP', 'Kovács Péter', 'Sárvár · Aero 5,0 × 4,0 m', '5,6 M Ft'], ['NA', 'Nagy Anna', 'Győr · Glide 6,0 × 4,5 m', '7,2 M Ft'], ['SG', 'Szabó Gábor', 'Kőszeg · Velum 4,0 × 3,0 m', '3,9 M Ft']]
  return <div className="vl">{leads.map(([initials, name, detail, price], index) => <div className="vl-item" key={name} style={{ ['--i' as string]: index }}>
    <span className="vl-avatar">{initials}</span>
    <span className="vl-text"><b>{name}</b><small>{detail}</small></span>
    <span className="vl-price">{price}<small>új</small></span>
  </div>)}</div>
}

/** Gyártói admin: oszlopok nőnek, a görbe kirajzolódik. */
function AdminVisual() {
  const bars = [32, 46, 38, 58, 50, 72, 66, 88]
  return <div className="va">
    <div className="va-kpis"><span><small>Érdeklődők</small><b>54</b></span><span><small>Nyitott érték</small><b>134 M</b></span><span><small>Nyerési arány</small><b>65%</b></span></div>
    <div className="va-chart">
      {bars.map((height, index) => <i key={index} style={{ ['--h' as string]: `${height}%`, ['--i' as string]: index }} />)}
      <svg viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M0 34 C12 30 18 24 28 26 S44 16 54 18 S70 8 80 10 S94 4 100 3" pathLength={1} /></svg>
    </div>
  </div>
}

/** Ármátrix: méretpár-táblázat, a kiemelés a cellák között vándorol (köztes méret = interpoláció). */
function MatrixVisual() {
  const widths = ['3 m', '4 m', '5 m', '6 m']
  const rows: [string, string[]][] = [['3 m', ['1,52', '1,83', '2,21', '2,64']], ['4 m', ['1,96', '2,35', '2,88', '3,40']], ['5 m', ['2,41', '2,90', '3,52', '4,18']]]
  return <div className="vm">
    <div className="vm-grid">
      <span className="vm-corner">M Ft</span>
      {widths.map((width) => <span className="vm-head" key={width}>{width}</span>)}
      {rows.map(([depth, values]) => [<span className="vm-head" key={depth}>{depth}</span>, ...values.map((value, index) => <span className="vm-cell" key={`${depth}-${index}`}>{value}</span>)])}
      <span className="vm-focus" />
    </div>
  </div>
}

export default function BenefitCards() {
  return <div className="bx-grid">
    <Card className="bx-price is-wide" index="01" icon={<Calculator size={14} />} title="Azonnali irányár" text="A vevő méretet, tetőt, oldalzárást és extrákat választ, az ár pedig azonnal frissül – az Ön árazásával, nettóban és bruttóban, telepítéssel együtt."><PriceVisual /></Card>
    <Card className="bx-qr" index="02" icon={<QrCode size={14} />} title="QR-kódos terv" text="Minden terv saját linket és QR-kódot kap: a vevő megosztja a családdal, Ön pedig egy kattintással megnyitja."><QrVisual /></Card>
    <Card className="bx-lead" index="03" icon={<Users size={14} />} title="Beérkező kérelmek" text="A felmérési kérelem a teljes konfigurációval, a PDF-összefoglalóval és az elérhetőségekkel azonnal megérkezik – e-mailben és az adminfelületen is."><LeadVisual /></Card>
    <Card className="bx-admin" index="04" icon={<LayoutDashboard size={14} />} title="Gyártói admin" text="Érdeklődők státusszal és belső megjegyzéssel, látogatói tölcsér, CSV-export – számítógépen és telefonon is."><AdminVisual /></Card>
    <Card className="bx-matrix" index="05" icon={<Table2 size={14} />} title="Ármátrix" text="Tetőtípusonként szélesség és mélység szerinti nettó árak, akár Excelből bemásolva. A köztes méretek árát a rendszer arányosan számolja."><MatrixVisual /></Card>
  </div>
}
