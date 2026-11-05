// Lamelix B2B oldal – „Előnyök” kártyák élő mini-termékrészletekkel. Az animációk CSS-ből futnak,
// és csak akkor, amikor a kártya látszik (is-live osztály); mozgáscsökkentésnél állóképek.
import { useEffect, useState, type PointerEvent, type ReactNode } from 'react'
import { useLive } from './useLive'
import { useCopy } from '@/i18n/useCopy'
import type { PlatformCopy } from '@/i18n/platformCopy'
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
function PriceVisual({ c }: { c: PlatformCopy['cards']['price'] }) {
  const prices = c.prices
  return <div className="vp">
    <div className="vp-row"><span>{c.width}</span><b className="vp-size">{c.sizes.map((size) => <i key={size}>{size}</i>)}</b></div>
    <div className="vp-track"><span className="vp-fill" /><span className="vp-thumb" /></div>
    <div className="vp-chips">{c.chips.map((chip, index) => <span key={chip} className={index === 2 ? 'is-on' : undefined}>{chip}</span>)}</div>
    <div className="vp-price">
      <small>{c.label}</small>
      <strong><span className="vp-roll">{prices.map((price) => <i key={price}>{price}</i>)}</span><em>{c.currency}</em></strong>
      <span className="vp-live"><i />{c.live}</span>
    </div>
  </div>
}

/** Valódi, beolvasható QR-kód (a demókonfigurációra), pásztázó fénycsíkkal. */
function QrVisual({ hint, demoPath }: { hint: string; demoPath: string }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let alive = true
    const url = `${window.location.origin}${demoPath}`
    void import('qrcode').then(({ toString }) => toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0B1210', light: '#00000000' } })).then((markup) => { if (alive) setSvg(markup) }).catch(() => undefined)
    return () => { alive = false }
  }, [demoPath])
  return <div className="vq">
    <div className="vq-phone">
      <div className="vq-code" dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="vq-scan" />
      <span className="vq-corner a" /><span className="vq-corner b" /><span className="vq-corner c" /><span className="vq-corner d" />
    </div>
    <span className="vq-hint">{hint} <ArrowUpRight size={13} /></span>
  </div>
}

/** Beérkező kérelmek: értesítések érkeznek egymás után. */
function LeadVisual({ c }: { c: PlatformCopy['cards']['lead'] }) {
  const leads = c.items
  return <div className="vl">{leads.map(([initials, name, detail, price], index) => <div className="vl-item" key={name} style={{ ['--i' as string]: index }}>
    <span className="vl-avatar">{initials}</span>
    <span className="vl-text"><b>{name}</b><small>{detail}</small></span>
    <span className="vl-price">{price}<small>{c.isNew}</small></span>
  </div>)}</div>
}

/** Gyártói admin: oszlopok nőnek, a görbe kirajzolódik. */
function AdminVisual({ kpis }: { kpis: string[][] }) {
  const bars = [32, 46, 38, 58, 50, 72, 66, 88]
  return <div className="va">
    <div className="va-kpis">{kpis.map(([label, value]) => <span key={label}><small>{label}</small><b>{value}</b></span>)}</div>
    <div className="va-chart">
      {bars.map((height, index) => <i key={index} style={{ ['--h' as string]: `${height}%`, ['--i' as string]: index }} />)}
      <svg viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M0 34 C12 30 18 24 28 26 S44 16 54 18 S70 8 80 10 S94 4 100 3" pathLength={1} /></svg>
    </div>
  </div>
}

/** Ármátrix: méretpár-táblázat, a kiemelés a cellák között vándorol (köztes méret = interpoláció). */
function MatrixVisual({ c }: { c: PlatformCopy['cards']['matrix'] }) {
  const { widths, rows } = c
  return <div className="vm">
    <div className="vm-grid">
      <span className="vm-corner">{c.corner}</span>
      {widths.map((width) => <span className="vm-head" key={width}>{width}</span>)}
      {rows.map(([depth, values]) => [<span className="vm-head" key={depth}>{depth}</span>, ...values.map((value, index) => <span className="vm-cell" key={`${depth}-${index}`}>{value}</span>)])}
      <span className="vm-focus" />
    </div>
  </div>
}

export default function BenefitCards({ demoPath = '/konfigurator' }: { demoPath?: string }) {
  const { c: copy } = useCopy()
  const c = copy.cards
  return <div className="bx-grid">
    <Card className="bx-price is-wide" index="01" icon={<Calculator size={14} />} title={c.price.title} text={c.price.text}><PriceVisual c={c.price} /></Card>
    <Card className="bx-qr" index="02" icon={<QrCode size={14} />} title={c.qr.title} text={c.qr.text}><QrVisual hint={c.qr.hint} demoPath={demoPath} /></Card>
    <Card className="bx-lead" index="03" icon={<Users size={14} />} title={c.lead.title} text={c.lead.text}><LeadVisual c={c.lead} /></Card>
    <Card className="bx-admin" index="04" icon={<LayoutDashboard size={14} />} title={c.admin.title} text={c.admin.text}><AdminVisual kpis={c.admin.kpis} /></Card>
    <Card className="bx-matrix" index="05" icon={<Table2 size={14} />} title={c.matrix.title} text={c.matrix.text}><MatrixVisual c={c.matrix} /></Card>
  </div>
}
