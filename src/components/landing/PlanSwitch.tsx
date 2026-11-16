// Árak „ár-dokk” módra: a csomagváltó pill-sáv egyetlen nagy lapot vezérel, a havidíj a konfigurátor ár-dokkjához
// hasonlóan odométerként gördül. Három egyforma kártya helyett egy döntési felület (a sablonrács elkerülése).
import { useState, type PointerEvent } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { formatMoney, monthlyPrice, PLANS, type PlanId } from '@/lib/platformPricing'
import { useCopy } from '@/i18n/useCopy'
import Odometer from './Odometer'

export default function PlanSwitch({ annual, onChoose }: { annual: boolean; onChoose: (id: PlanId) => void }) {
  const { lang, c } = useCopy()
  const pr = c.pricing
  const [active, setActive] = useState<PlanId>(PLANS[0].id)
  const plan = PLANS.find((item) => item.id === active) ?? PLANS[0]
  const text = pr.plans[plan.id]
  const price = monthlyPrice(plan, annual)
  const tilt = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return
    const box = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--mx', `${((event.clientX - box.left) / box.width) * 100}%`)
    event.currentTarget.style.setProperty('--my', `${((event.clientY - box.top) / box.height) * 100}%`)
  }
  return <div className="lx-plans" data-pf-item>
    <div className="lx-plan-tabs" role="tablist" aria-label={c.v2.planPick}>
      {PLANS.map((item) => <button key={item.id} type="button" role="tab" id={`plan-tab-${item.id}`} aria-selected={item.id === active} aria-controls="plan-panel" className={item.id === active ? 'is-on' : ''} onClick={() => setActive(item.id)}>
        {pr.plans[item.id].name}{item.featured && <i aria-hidden="true" />}
      </button>)}
    </div>
    <article className={`lx-plan-card${plan.featured ? ' is-featured' : ''}`} id="plan-panel" role="tabpanel" aria-labelledby={`plan-tab-${plan.id}`} onPointerMove={tilt}>
      <div className="lx-plan-main">
        <h3>{text.name}</h3>
        <p className="lx-plan-tag">{text.tagline}</p>
        <div className="lx-plan-price">{price === null ? <strong>{pr.custom}</strong> : <><strong><Odometer text={formatMoney(price, lang)} /></strong><span>{pr.perMonth}</span></>}</div>
        <p className="lx-plan-note">{price === null ? pr.customNote : annual ? pr.annualNote(formatMoney(price * 12, lang)) : pr.monthlyNote}</p>
        <button type="button" className="lx-btn lx-btn-ink" onClick={() => onChoose(plan.id)} data-track="ajanlatkeres">{plan.monthly === null ? pr.ctaQuote : pr.ctaDemo} <ArrowRight size={17} /></button>
      </div>
      <ul className="lx-plan-features">{text.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
    </article>
  </div>
}
