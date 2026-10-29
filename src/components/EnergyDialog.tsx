// Energia és üzemeltetés: éves áramköltség a valós lakossági tarifával, állítható
// használattal; napelemes tetőnél a termelés és annak őszinte, sávos értéke.
import { useId, useState } from 'react'
import { AlertTriangle, Fan, Flame, Info, Lightbulb, Plus, Radio, SolarPanel, Speaker, Zap, type LucideIcon } from 'lucide-react'
import { Modal } from '@/components/Dialogs'
import { estimateEnergy, roundCost, TARIFF, type EnergyLine, type EnergyUsage } from '@/lib/energy'
import { formatHuf, formatNumber } from '@/lib/pricing'
import { estimateSolar, PANEL, SELF_USE_DEFAULT, YIELD_KWH_PER_KWP } from '@/lib/solar'
import { tenantPrice } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import type { PergolaConfig, PriceSettings } from '@/types/pergola'

const LINE_ICONS: Record<EnergyLine['id'], LucideIcon> = { heaters: Flame, led: Lightbulb, motors: Zap, speakers: Speaker, fans: Fan, standby: Radio }
const kwhText = (value: number) => `${formatNumber(value, value < 10 ? 1 : 0)} kWh`
const ftPerKwh = (value: number) => `${value.toLocaleString('hu-HU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ft/kWh`

export default function EnergyDialog({ config, prices, usage, onUsageChange, onConfigChange, onClose }: { config: PergolaConfig; prices: PriceSettings; usage: EnergyUsage; onUsageChange: (usage: EnergyUsage) => void; onConfigChange: (patch: Partial<PergolaConfig>) => void; onClose: () => void }) {
  const { tenant } = useTenant()
  const heaterWatts = tenant.energy?.heaterWatts ?? 2000
  const estimate = estimateEnergy(config, usage, heaterWatts)
  const [selfUse, setSelfUse] = useState(SELF_USE_DEFAULT)
  const [knowsHousehold, setKnowsHousehold] = useState(usage.householdKwh !== null)
  const [householdText, setHouseholdText] = useState(usage.householdKwh !== null ? String(usage.householdKwh) : '')
  const householdId = useId()
  const set = (patch: Partial<EnergyUsage>) => onUsageChange({ ...usage, ...patch })
  const solarAvailable = Boolean(tenant.extras.solar && tenant.roofs.fixed)
  const solar = config.solar ? estimateSolar(config, usage.householdKwh, selfUse) : null
  const solarGross = config.solar ? tenantPrice(tenant, config, prices).totalGross - tenantPrice(tenant, { ...config, solar: undefined }, prices).totalGross : 0
  const solarAddGross = !config.solar && config.roof === 'fixed' && solarAvailable ? tenantPrice(tenant, { ...config, solar: true }, prices).totalGross - tenantPrice(tenant, config, prices).totalGross : 0
  const payback = solar && solar.value > 0 ? Math.round(solarGross / solar.value) : null
  const maxKwh = Math.max(...estimate.lines.map((line) => line.kwh), 1)
  const bandText = estimate.band === 'above' ? (usage.householdKwh === null ? 'Felső sávval számolva (óvatos becslés)' : 'A háztartás a kedvezményes mennyiség felett van') : estimate.band === 'below' ? 'A kedvezményes mennyiségen belül marad' : 'Részben a kedvezményes mennyiség fölé visz'

  return <Modal title="Energia és üzemeltetés" eyebrow="ÉVES ÁRAMKÖLTSÉG" onClose={onClose} className="energy-dialog">
    {estimate.hasElectrics ? <section className="energy-hero">
      <div>
        <small>Becsült éves áramköltség</small>
        <strong>≈ {formatHuf(roundCost(estimate.cost))}</strong>
        <span>{kwhText(estimate.kwh)} évente · átlag {ftPerKwh(estimate.rate)}</span>
      </div>
      <p className={`energy-band is-${estimate.band}`}><Info size={13} />{bandText}</p>
    </section> : <p className="energy-empty"><Zap size={16} />Ebben a tervben nincs áramfogyasztó (fűtés, LED, motor). Az üzemeltetésnek nincs áramköltsége.</p>}

    {estimate.hasElectrics && <>
      <div className="energy-grid">
        <section className="energy-card">
          <h3>Használat</h3>
          {config.heaters > 0 && <>
            <div className="energy-row"><label htmlFor="energy-heat">Fűtés évente</label><strong>{usage.heaterHours} óra</strong></div>
            <input id="energy-heat" className="range-input" type="range" min={0} max={400} step={10} value={usage.heaterHours} onChange={(event) => set({ heaterHours: Number(event.target.value) })} />
            <p className="energy-hint">≈ {Math.round(usage.heaterHours / 2)} este × 2 óra, főleg tavasszal és ősszel</p>
            <label className="energy-check"><input type="checkbox" checked={usage.heaterHalf} onChange={(event) => set({ heaterHalf: event.target.checked })} /><span>Fél teljesítményen (enyhébb estéken elég)</span></label>
          </>}
          {config.led && <>
            <div className="energy-row"><label htmlFor="energy-led">LED-világítás</label><strong>{usage.ledHoursPerEvening.toLocaleString('hu-HU')} óra / este</strong></div>
            <input id="energy-led" className="range-input" type="range" min={0} max={6} step={0.5} value={usage.ledHoursPerEvening} onChange={(event) => set({ ledHoursPerEvening: Number(event.target.value) })} />
            <p className="energy-hint">április–október, minden este</p>
          </>}
          <div className="energy-household">
            <span>A háztartás éves fogyasztása</span>
            <div className="energy-segment" role="radiogroup" aria-label="A háztartás éves fogyasztása">
              <button type="button" role="radio" aria-checked={!knowsHousehold} className={!knowsHousehold ? 'selected' : ''} onClick={() => { setKnowsHousehold(false); set({ householdKwh: null }) }}>Nem tudom</button>
              <button type="button" role="radio" aria-checked={knowsHousehold} className={knowsHousehold ? 'selected' : ''} onClick={() => { setKnowsHousehold(true); const value = Number(householdText); set({ householdKwh: householdText && Number.isFinite(value) ? value : 2000 }); if (!householdText) setHouseholdText('2000') }}>Megadom</button>
            </div>
            {knowsHousehold && <label className="energy-input" htmlFor={householdId}><input id={householdId} inputMode="numeric" value={householdText} onChange={(event) => { const text = event.target.value.replace(/\D/g, '').slice(0, 6); setHouseholdText(text); set({ householdKwh: text ? Number(text) : 0 }) }} /><span>kWh / év</span></label>}
            <p className="energy-hint">Az éves elszámoló számlán találod. {TARIFF.limit.toLocaleString('hu-HU')} kWh-ig {ftPerKwh(TARIFF.below)}, felette {ftPerKwh(TARIFF.above)}.</p>
          </div>
        </section>

        <section className="energy-card">
          <h3>Miből áll össze?</h3>
          <ul className="energy-lines">{estimate.lines.map((line) => {
            const Icon = LINE_ICONS[line.id]
            return <li key={line.id}>
              <div className="energy-line-head"><span><Icon size={14} />{line.label}</span><strong>{formatHuf(roundCost(line.kwh * estimate.rate))}</strong></div>
              <div className="energy-bar"><i style={{ width: `${Math.max(2, (line.kwh / maxKwh) * 100)}%` }} /></div>
              <small>{line.detail} · {kwhText(line.kwh)}</small>
            </li>
          })}</ul>
        </section>
      </div>
    </>}

    {config.solar && solar && <section className="energy-solar">
      <header><SolarPanel size={18} /><div><h3>Napelemes tető</h3><small>{solar.layout.count} × {PANEL.wp} Wp = {formatNumber(solar.layout.kwp, 2)} kWp · {solar.layout.cols} × {solar.layout.rows} panel</small></div></header>
      <div className="energy-solar-stats">
        <div><small>Éves termelés</small><strong>≈ {formatNumber(Math.round(solar.production / 10) * 10, 0)} kWh</strong><span>{YIELD_KWH_PER_KWP} kWh/kWp, közel vízszintes tetőn</span></div>
        <div><small>Éves érték</small><strong>≈ {formatHuf(roundCost(solar.value))}</strong><span>{Math.round(selfUse * 100)}% saját felhasználás, a többi betáplálva</span></div>
        <div><small>Megtérülés</small><strong>{payback === null ? '—' : payback > 25 ? '25 év felett' : `≈ ${payback} év`}</strong><span>a napelem felárából ({formatHuf(solarGross)}), áramár-változás nélkül</span></div>
      </div>
      <div className="energy-row"><label htmlFor="energy-self">Saját felhasználás</label><strong>{Math.round(selfUse * 100)}%</strong></div>
      <input id="energy-self" className="range-input" type="range" min={0.1} max={0.8} step={0.05} value={selfUse} onChange={(event) => setSelfUse(Number(event.target.value))} />
      <p className="energy-hint">Akkumulátor nélkül jellemzően 25–35%; nappali fogyasztással (klíma, hőszivattyú) vagy akkumulátorral több. A betáplált áramért bruttó elszámolásban kb. {TARIFF.feedIn} Ft/kWh jár, ezért a megtérülést leginkább a saját felhasználás gyorsítja. {usage.householdKwh === null ? 'Ismeretlen háztartási fogyasztásnál a kedvezményes árral számolunk (óvatos becslés).' : ''}</p>
      <ul className="energy-warnings">
        <li><AlertTriangle size={14} /><span><strong>Már van szaldós napelemed?</strong> A meglévő rendszer bővítése a szaldó elszámolás elvesztésével járhat — egyeztess az áramszolgáltatóval, mielőtt megrendeled.</span></li>
        <li><Info size={14} /><span>Hálózatra csak az elosztó hozzájárulásával és mérőcserével köthető (jellemzően 2–4 hónap). A termelés a pergola esti fűtését nem fedezi közvetlenül: nappal termel.</span></li>
      </ul>
    </section>}

    {!config.solar && solarAvailable && config.roof === 'fixed' && <button type="button" className="energy-solar-add" onClick={() => onConfigChange({ solar: true })}><SolarPanel size={18} /><span><strong>Napelemmel kérném a tetőt</strong><small>{estimateSolar(config, usage.householdKwh).layout.count} panel · ≈ {formatNumber(Math.round(estimateSolar(config, usage.householdKwh).production / 10) * 10, 0)} kWh/év · +{formatHuf(solarAddGross)}</small></span><Plus size={16} /></button>}

    <p className="energy-footnote">Tájékoztató becslés. Áramár: {TARIFF.source}, {TARIFF.asOf} — {ftPerKwh(TARIFF.below)} {TARIFF.limit.toLocaleString('hu-HU')} kWh/év-ig, felette {ftPerKwh(TARIFF.above)} (bruttó, rendszerhasználati díjjal). A fűtőpanel teljesítménye {formatNumber(heaterWatts / 1000, 1)} kW (gyártói adat). Az alapdíjakat nem tartalmazza. A tényleges költség a használattól, a tarifától és a jogszabályi árváltozásoktól függ.</p>
  </Modal>
}
