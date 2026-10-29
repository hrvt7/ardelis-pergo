// Tanácsadó: négy kérdés → javasolt pergola indoklással, egy kattintással a 3D-be.
import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Blinds, Check, CloudRain, House, LayoutPanelLeft, PartyPopper, RotateCcw, Sofa, Sparkles, SunMedium, ThermometerSun, Trees, Umbrella, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import { Modal } from '@/components/Dialogs'
import { ADVISOR_ORDER, ADVISOR_QUESTIONS, adviseConfig, type AdvisorAnswers } from '@/lib/advisor'
import { MOUNT_SHORT } from '@/lib/mount'
import { formatHuf } from '@/lib/pricing'
import { useTenant } from '@/tenants/TenantContext'
import type { FurnitureSet, PergolaConfig, PriceSettings, SideType } from '@/types/pergola'

const ICONS: Record<string, LucideIcon> = {
  lounge: Sofa, dining: UtensilsCrossed, party: PartyPopper,
  sun: SunMedium, rain: CloudRain, season: ThermometerSun,
  adjustable: Blinds, bright: SunMedium, shade: Umbrella, sky: Sparkles,
  wall: House, corner: LayoutPanelLeft, garden: Trees,
}

type Key = (typeof ADVISOR_ORDER)[number]

function sidesSummary(config: PergolaConfig) {
  const types = Object.values(config.sides) as SideType[]
  if (types.includes('glass')) return 'Tolóüveg + ZIP'
  if (types.includes('zip')) return 'ZIP screen oldalt'
  return 'Nyitott oldalak'
}

export default function AdvisorDialog({ prices, onApply, onClose }: { prices: PriceSettings; onApply: (config: PergolaConfig, furniture: FurnitureSet) => void; onClose: () => void }) {
  const { tenant } = useTenant()
  const [answers, setAnswers] = useState<Partial<AdvisorAnswers>>({})
  const [index, setIndex] = useState(0)
  const done = index >= ADVISOR_ORDER.length
  const key: Key | undefined = ADVISOR_ORDER[index]
  const result = useMemo(() => (done ? adviseConfig(tenant, answers as AdvisorAnswers, prices) : null), [done, tenant, answers, prices])

  const choose = (value: string) => {
    if (!key) return
    setAnswers((current) => ({ ...current, [key]: value }))
    setIndex((current) => current + 1)
  }
  const roofName = (config: PergolaConfig) => tenant.roofs[config.roof]?.name ?? ''
  const roofShort = (config: PergolaConfig) => tenant.roofs[config.roof]?.short ?? ''

  return <Modal title={done ? 'Ezt javasoljuk' : ADVISOR_QUESTIONS[key!].title} eyebrow={done ? 'TANÁCSADÓ · JAVASLAT' : `TANÁCSADÓ · ${index + 1} / ${ADVISOR_ORDER.length}`} onClose={onClose} className="advisor-dialog">
    <div className="advisor-progress" aria-hidden="true">{ADVISOR_ORDER.map((item, position) => <i key={item} className={position < index ? 'done' : position === index ? 'current' : ''} />)}</div>

    {!done && key && <>
      <div className={`advisor-options count-${ADVISOR_QUESTIONS[key].options.length}`} role="radiogroup" aria-label={ADVISOR_QUESTIONS[key].title} key={key}>
        {ADVISOR_QUESTIONS[key].options.map((option) => {
          const Icon = ICONS[option.id] ?? Sparkles
          const selected = answers[key] === option.id
          return <button type="button" role="radio" aria-checked={selected} key={option.id} className={selected ? 'selected' : ''} onClick={() => choose(option.id)}>
            <span className="advisor-icon"><Icon size={20} /></span>
            <strong>{option.title}</strong>
            <small>{option.text}</small>
          </button>
        })}
      </div>
      <div className="advisor-footer">
        <button type="button" className="advisor-back" disabled={index === 0} onClick={() => setIndex((current) => Math.max(0, current - 1))}><ArrowLeft size={15} />Vissza</button>
        <span>Kb. 20 másodperc · utána minden szabadon módosítható</span>
      </div>
    </>}

    {done && result && <div className="advisor-result">
      <section className="advisor-hero">
        <div>
          <span className="advisor-eyebrow">{MOUNT_SHORT[result.config.mount]} · {result.config.width.toFixed(1).replace('.', ',')} × {result.config.depth.toFixed(1).replace('.', ',')} m</span>
          <h3>{roofName(result.config)} <small>{roofShort(result.config)}</small></h3>
          <div className="advisor-chips">
            <span>{sidesSummary(result.config)}</span>
            {result.config.heaters > 0 && <span>{result.config.heaters} db fűtés</span>}
            {result.config.led && <span>LED-világítás</span>}
            {result.config.sensors && <span>Eső-/szélérzékelő</span>}
          </div>
        </div>
        <div className="advisor-price"><small>Bruttó irányár, telepítéssel</small><strong>{formatHuf(result.totalGross)}</strong></div>
      </section>
      <ul className="advisor-reasons">{result.reasons.map((reason) => <li key={reason}><Check size={14} /><span>{reason}</span></li>)}</ul>
      {result.alternative && <button type="button" className="advisor-alt" onClick={() => onApply(result.alternative!.config, result.furniture)}>
        <span><small>Kedvezőbb alternatíva</small><strong>{result.alternative.title}</strong><em>{result.alternative.text}</em></span>
        <span className="advisor-alt-price"><strong>{formatHuf(result.alternative.totalGross)}</strong><small>−{formatHuf(result.totalGross - result.alternative.totalGross)}</small></span>
        <ArrowRight size={16} />
      </button>}
      <div className="advisor-actions">
        <button type="button" className="secondary-action" onClick={() => { setAnswers({}); setIndex(0) }}><RotateCcw size={15} />Újrakezdem</button>
        <button type="button" className="primary-action" onClick={() => onApply(result.config, result.furniture)}>Megnézem a 3D-ben<ArrowRight size={16} /></button>
      </div>
      <p className="advisor-note">A javaslat kiindulópont a gyártó kínálatából. A 3D-ben minden szabadon módosítható, a visszavonás gombbal pedig visszaléphetsz.</p>
    </div>}
  </Modal>
}
