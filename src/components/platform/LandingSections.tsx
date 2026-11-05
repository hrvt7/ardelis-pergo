// Lamelix B2B oldal – a „Funkciók”, „Működés”, megtérülés-kalkulátor és GYIK blokkok.
// A mini-illusztrációk CSS-ből animálódnak, és csak akkor futnak, amikor látszanak (is-live).
import { useId, useMemo, useState, type ReactNode } from 'react'
import { ArrowUpRight, Box, Calculator, Code2, FileText, Lightbulb, Mail, MoonStar, Palette, Plus, ScanLine, Sparkles, Sun, Upload, Wallet, Zap } from 'lucide-react'
import { Link } from 'react-router'
import { useLive } from './useLive'
import { compactMoney, estimateRoi, formatMoney, PLANS, SETUP_FEE, type PlanId } from '@/lib/platformPricing'
import { useCopy } from '@/i18n/useCopy'
import { Em } from '@/i18n/Em'
import type { PlatformCopy } from '@/i18n/platformCopy'

function Live({ as: Tag = 'article', className, children }: { as?: 'article' | 'div' | 'li'; className: string; children: ReactNode }) {
  const [ref, live] = useLive<HTMLElement>(0.2)
  return <Tag ref={ref as never} className={`${className}${live ? ' is-live' : ''}`} data-pf-item>{children}</Tag>
}

/* ------------------------------------------------------------------ */
/* Funkciók: amit a vevő a konfigurátorban kap                          */
/* ------------------------------------------------------------------ */

const buildFeatures = (c: PlatformCopy): { id: string; icon: ReactNode; title: string; text: string; visual: ReactNode }[] => {
  const t = c.features.items
  const v = c.features.visual
  return [
  {
    id: 'ar', icon: <ScanLine size={15} />, title: t.ar.title,
    text: t.ar.text,
    visual: <div className="fv-ar"><div className="fv-ar-phone"><span className="fv-ar-floor" /><span className="fv-ar-model"><i /><i /><i /></span><span className="fv-ar-scan" /></div></div>,
  },
  {
    id: 'photo', icon: <Sparkles size={15} />, title: t.photo.title,
    text: t.photo.text,
    visual: <div className="fv-photo"><span className="fv-photo-house"><i /><i /></span><span className="fv-photo-model"><i /><b /><b /><b /><b /></span></div>,
  },
  {
    id: 'sun', icon: <Sun size={15} />, title: t.sun.title,
    text: t.sun.text,
    visual: <div className="fv-sun"><svg viewBox="0 0 120 60" aria-hidden="true"><path d="M8 56 A52 52 0 0 1 112 56" pathLength={1} /></svg><span className="fv-sun-dot" /><span className="fv-sun-roof" /><span className="fv-sun-shade" /><b className="fv-sun-pct"><i>62%</i><i>84%</i><i>71%</i></b></div>,
  },
  {
    id: 'budget', icon: <Wallet size={15} />, title: t.budget.title,
    text: t.budget.text,
    visual: <div className="fv-budget"><span className="fv-budget-label"><small>{v.budgetLabel}</small><b>{v.budgetValue}</b></span><span className="fv-budget-bar"><i /><em /></span><span className="fv-budget-tags">{v.budgetTags.map((tag) => <i key={tag}>{tag}</i>)}</span></div>,
  },
  {
    id: 'advisor', icon: <Lightbulb size={15} />, title: t.advisor.title,
    text: t.advisor.text,
    visual: <div className="fv-adv">{v.advisorChips.map((label, index) => <i key={label} style={{ ['--i' as string]: index }}>{label}</i>)}<b>{v.advisorResult}</b></div>,
  },
  {
    id: 'night', icon: <MoonStar size={15} />, title: t.night.title,
    text: t.night.text,
    visual: <div className="fv-night"><span className="fv-night-roof" /><span className="fv-night-glow" /><span className="fv-night-stars"><i /><i /><i /><i /></span></div>,
  },
  {
    id: 'energy', icon: <Zap size={15} />, title: t.energy.title,
    text: t.energy.text,
    visual: <div className="fv-energy">{[38, 62, 46, 80, 58, 70].map((height, index) => <i key={index} style={{ ['--h' as string]: `${height}%`, ['--i' as string]: index }} />)}<b>{v.energy}</b></div>,
  },
  {
    id: 'pdf', icon: <FileText size={15} />, title: t.pdf.title,
    text: t.pdf.text,
    visual: <div className="fv-pdf"><span className="fv-pdf-page"><i className="fv-pdf-img" /><i /><i /><i /><b /></span><span className="fv-pdf-page is-back" /></div>,
  },
  ]
}

export function CustomerFeatures() {
  const { c } = useCopy()
  return <div className="fx-grid">
    {buildFeatures(c).map((feature) => <Live key={feature.id} className={`fx fx-${feature.id}`}>
      <div className="fx-visual" aria-hidden="true">{feature.visual}</div>
      <div className="fx-copy"><h3>{feature.icon}{feature.title}</h3><p>{feature.text}</p></div>
    </Live>)}
  </div>
}

/* ------------------------------------------------------------------ */
/* Működés: négy lépés idővonalon                                       */
/* ------------------------------------------------------------------ */

const buildSteps = (c: PlatformCopy): { icon: ReactNode; when: string; title: string; text: string; visual: ReactNode }[] => {
  const t = c.how.steps
  const v = c.how.visual
  return [
  {
    icon: <Upload size={16} />, ...t[0],
    visual: <div className="sv-sheet"><span className="sv-sheet-head"><i />{v.file}</span>{[0, 1, 2, 3].map((row) => <span className="sv-sheet-row" key={row} style={{ ['--i' as string]: row }}><i /><i /><i /><i /></span>)}</div>,
  },
  {
    icon: <Palette size={16} />, ...t[1],
    visual: <div className="sv-brand"><span className="sv-brand-ui"><i className="sv-brand-bar" /><i /><i /><b className="sv-brand-btn" /></span><span className="sv-brand-swatches"><i /><i /><i /></span></div>,
  },
  {
    icon: <Code2 size={16} />, ...t[2],
    visual: <div className="sv-code"><span><i className="t">&lt;iframe</i> <i className="a">src</i>=<i className="s">"…/k/ceged"</i><i className="t">&gt;</i></span><span className="sv-code-caret" /></div>,
  },
  {
    icon: <Mail size={16} />, ...t[3],
    visual: <div className="sv-mail"><span className="sv-mail-card"><i className="sv-mail-dot" /><span><b>{v.mail}</b><small>{v.mailSub[0]}</small></span></span><span className="sv-mail-card is-2"><i className="sv-mail-dot" /><span><b>{v.mail}</b><small>{v.mailSub[1]}</small></span></span></div>,
  },
  ]
}

export function ProcessTimeline() {
  const { c } = useCopy()
  return <div className="sx">
    <div className="sx-line" aria-hidden="true"><i /></div>
    <ol className="sx-list">
      {buildSteps(c).map((step, index) => <Live as="li" key={step.title} className="sx-step">
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

function Range({ label, value, min, max, step, format, onChange }: { label: string; value: number; min: number; max: number; step: number; format: (value: number) => string; onChange: (value: number) => void }) {
  const id = useId()
  return <div className="roi-field">
    <label htmlFor={id}><span>{label}</span><b>{format(value)}</b></label>
    <input id={id} type="range" min={min} max={max} step={step} value={value} style={{ ['--p' as string]: `${((value - min) / (max - min)) * 100}%` }} onChange={(event) => onChange(Number(event.target.value))} />
  </div>
}

export function RoiCalculator({ annual }: { annual: boolean }) {
  const { lang, c: copy } = useCopy()
  const c = copy.roi
  const compactFt = (value: number) => compactMoney(value, lang)
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
      <p className="roi-kicker"><Calculator size={15} />{c.kicker}</p>
      <h3><Em parts={c.title} /></h3>
      <div className="roi-plan" role="group" aria-label={c.planAria}>
        {PLANS.filter((item) => item.monthly !== null).map((item) => <button key={item.id} type="button" className={planId === item.id ? 'is-on' : ''} aria-pressed={planId === item.id} onClick={() => setPlanId(item.id as Exclude<PlanId, 'partner'>)}>{copy.pricing.plans[item.id].name}</button>)}
      </div>
      <Range label={c.value} value={projectValue} min={1_500_000} max={12_000_000} step={100_000} format={compactFt} onChange={setProjectValue} />
      <Range label={c.margin} value={marginPct} min={10} max={50} step={1} format={(value) => `${value}%`} onChange={setMarginPct} />
      <Range label={c.orders} value={extraOrders} min={1} max={30} step={1} format={c.unit} onChange={setExtraOrders} />
    </div>
    <div className="roi-result" aria-live="polite">
      <div className="roi-break">
        <span>{c.breakLabel}</span>
        <strong>{Number.isFinite(breakEven) ? breakEven : '–'}<small>{c.breakUnit}</small></strong>
        <p>{c.breakNote(compactFt(roi.marginPerOrder), compactFt(roi.firstYearCost))}</p>
      </div>
      <div className="roi-bars">
        <div className="roi-bar"><span>{c.barCost}</span><i style={{ ['--w' as string]: `${(roi.firstYearCost / scale) * 100}%` }} /><b>{compactFt(roi.firstYearCost)}</b></div>
        <div className="roi-bar is-gain"><span>{c.barGain(extraOrders)}</span><i style={{ ['--w' as string]: `${(roi.gain / scale) * 100}%` }} /><b>{compactFt(roi.gain)}</b></div>
      </div>
      <p className={`roi-net${roi.net >= 0 ? ' is-pos' : ''}`}>{roi.net >= 0 ? <>{c.netPos} <b>+{compactFt(roi.net)}</b></> : <>{c.netNeg(compactFt(-roi.net))}</>}</p>
      <small className="roi-note">{c.note(formatMoney(SETUP_FEE, lang), annual)}</small>
    </div>
  </div>
}

/* ------------------------------------------------------------------ */
/* GYIK                                                                 */
/* ------------------------------------------------------------------ */

export function Faq({ email, demoPath }: { email: string; demoPath: string }) {
  const { c: copy } = useCopy()
  const c = copy.faq
  const [open, setOpen] = useState(0)
  return <div className="qa">
    <aside className="qa-side" data-pf-item>
      <p className="pf-eyebrow">{c.eyebrow}</p>
      <h2 id="gyik-title"><Em parts={c.title} /></h2>
      <p className="pf-sub">{c.sub}</p>
      <div className="qa-contact">
        <span className="qa-contact-icon"><Box size={20} /></span>
        <div><strong>{c.contactTitle}</strong><a href={`mailto:${email}`}>{email}</a></div>
      </div>
      <Link className="pf-btn pf-btn-ghost" to={demoPath}>{c.openDemo} <ArrowUpRight size={17} /></Link>
    </aside>
    <div className="qa-list">
      {c.items.map((item, index) => {
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
