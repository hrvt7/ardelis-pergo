import { CloudRain, Fan, Gauge, House, LampCeiling, Minus, Palette, Plus, Power, Speaker } from 'lucide-react'
import type { PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'
import { formatPrice } from '@/lib/pricing'
import { signedPrice } from '@/lib/money'
import { sensorsApplicable } from '@/lib/roofs'
import { isClosedBuilding } from '@/lib/buildings'
import { issuesForStep } from '@/lib/configSteps'
import { tenantPrice } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import { BuildingIssues, ClimateSection } from '@/components/BuildingControls'
import { RGB_SWATCHES, smartHomeTargets } from '@/lib/comfort'
import { FAN_MIN_HEIGHT } from '@/lib/fans'
import { tr } from '@/i18n/locale'
import MetalSwitch from './MetalSwitch'

/** 6. lépés – Komfort (STEP_ARCHITECTURE.md): világítás, hő és légmozgás, vezérlés; télikertnél klíma és alap. */
export default function ComfortStep({ config, scene, prices, energyCost, onChange, onSceneChange }: { config: PergolaConfig; scene: SceneSettings; prices: PriceSettings; /** becsült éves áramköltség (ha számolható) */ energyCost: number | null; onChange: (patch: Partial<PergolaConfig>) => void; onSceneChange: (patch: Partial<SceneSettings>) => void }) {
  const { tenant } = useTenant()
  const { limits } = tenant
  const carport = config.building === 'carport'
  const base = tenantPrice(tenant, config, prices).totalGross
  const fans = config.fans ?? 0
  const targets = smartHomeTargets(config)
  const showColor = (hex: string) => onSceneChange({ ledColor: hex, ...(scene.time !== 'night' ? { dayTime: 21.5, time: 'night' as const } : {}) })
  const heaterPrice = tenantPrice(tenant, { ...config, heaters: config.heaters + 1 }, prices).totalGross - base
  // Minden opció ára ugyanúgy: a teljes becsült bruttó ár változása (mint a tető- és oldalkártyákon), „+X Ft” alakban.
  const gross = (patch: Partial<PergolaConfig>) => tenantPrice(tenant, { ...config, ...patch }, prices).totalGross
  const cost = (on: Partial<PergolaConfig>, off: Partial<PergolaConfig>) => signedPrice(gross(on) - gross(off))
  const fanPrice = gross({ fans: fans + 1 }) - gross({ fans: fans || undefined })

  return <div className="rb-step rb-step-comfort">
    {isClosedBuilding(config.building) && <section className="rb-section rb-legacy">
      <h3>{config.building === 'conservatory' ? tr('Egész éves használat', 'Ganzjährige Nutzung') : tr('Zárt tér', 'Geschlossener Raum')}</h3>
      <ClimateSection config={config} prices={prices} onChange={onChange} scene={scene} onSceneChange={onSceneChange} />
      <BuildingIssues config={config} onFix={onChange} only={issuesForStep('extras')} />
    </section>}

    <section className="rb-section">
      <h3>{tr('Világítás és hangulat', 'Licht und Stimmung')}</h3>
      {tenant.extras.led && <MetalSwitch label={tr('Periméter LED', 'Umlaufende LED')} description={carport ? tr('Rejtett világítás a beállóban', 'Indirekte Beleuchtung im Stellplatz') : tr('Rejtett, beépített világítás', 'Indirekte, integrierte Beleuchtung')} icon={LampCeiling} price={cost({ led: true }, { led: false, ledRgb: undefined })} checked={config.led} onChange={(led) => onChange({ led, ...(led ? {} : { ledRgb: undefined }) })} />}
      {!carport && tenant.extras.rgb && config.led && <MetalSwitch label={tr('Színváltós RGB+W LED', 'Farbwechsel-LED RGB+W')} description={tr('Fehér és bármilyen szín, jelenetek appból', 'Weiß und jede Farbe, Szenen per App')} icon={Palette} price={cost({ led: true, ledRgb: true }, { ledRgb: undefined })} checked={Boolean(config.ledRgb)} onChange={(on) => onChange({ ledRgb: on ? true : undefined })} />}
      {!carport && config.ledRgb && config.led && <div className="rb-rgb">
        <small>{tr('Nézd meg este — koppints egy színre', 'Abends ansehen — Farbe antippen')}</small>
        <div role="radiogroup" aria-label={tr('LED színe', 'LED-Farbe')}>
          <button type="button" role="radio" aria-checked={!scene.ledColor} className={`is-white${!scene.ledColor ? ' is-selected' : ''}`} title={tr('Meleg fehér', 'Warmweiß')} aria-label={tr('Meleg fehér', 'Warmweiß')} onClick={() => onSceneChange({ ledColor: null })} />
          {RGB_SWATCHES.map((swatch) => <button type="button" role="radio" aria-checked={scene.ledColor === swatch.hex} key={swatch.hex} className={scene.ledColor === swatch.hex ? 'is-selected' : ''} style={{ background: swatch.hex }} title={swatch.name} aria-label={swatch.name} onClick={() => showColor(swatch.hex)} />)}
        </div>
      </div>}
      {!carport && tenant.extras.speakers && <MetalSwitch label={tr('Bluetooth hangrendszer', 'Bluetooth-Soundsystem')} description={tr('Egy pár beépített hangszóró', 'Ein Paar eingebaute Lautsprecher')} icon={Speaker} price={cost({ speakers: true }, { speakers: false })} checked={config.speakers} onChange={(speakers) => onChange({ speakers })} />}
    </section>

    {!carport && <section className="rb-section">
      <h3>{tr('Hő és légmozgás', 'Wärme und Luftbewegung')}</h3>
      {limits.maxHeaters > 0 && <div className="rb-option rb-stepper-row">
        <span className="rb-switch-text"><strong>{tr('Infravörös teraszfűtés', 'Infrarot-Terrassenheizung')}</strong><small>{tr('Hűvös estékre', 'Für kühle Abende')}</small><em>{signedPrice(heaterPrice)} / {tr('db', 'Stk.')}</em></span>
        <span className="rb-stepper">
          <button type="button" aria-label={tr('Fűtőpanel csökkentése', 'Heizstrahler verringern')} disabled={config.heaters === 0} onClick={() => onChange({ heaters: Math.max(0, config.heaters - 1) })}><Minus size={15} /></button>
          <b aria-live="polite">{config.heaters} {tr('db', 'Stk.')}</b>
          <button type="button" aria-label={tr('Fűtőpanel növelése', 'Heizstrahler erhöhen')} disabled={config.heaters >= limits.maxHeaters} onClick={() => onChange({ heaters: Math.min(limits.maxHeaters, config.heaters + 1) })}><Plus size={15} /></button>
        </span>
      </div>}
      {tenant.extras.fans && <div className="rb-option rb-stepper-row">
        <span className="rb-switch-text"><strong>{tr('Mennyezeti ventilátor', 'Deckenventilator')}</strong><small>{tr('Kültéri DC motor, Ø132 cm', 'Outdoor-DC-Motor, Ø 132 cm')}</small><em>{signedPrice(fanPrice)} / {tr('db', 'Stk.')}</em></span>
        <span className="rb-stepper">
          <button type="button" aria-label={tr('Ventilátor csökkentése', 'Ventilator verringern')} disabled={fans === 0} onClick={() => onChange({ fans: fans > 1 ? fans - 1 : undefined })}><Minus size={15} /></button>
          <b aria-live="polite">{fans} {tr('db', 'Stk.')}</b>
          <button type="button" aria-label={tr('Ventilátor növelése', 'Ventilator erhöhen')} disabled={fans >= 2} onClick={() => onChange({ fans: fans + 1 })}><Plus size={15} /></button>
        </span>
      </div>}
      {fans > 0 && config.height < FAN_MIN_HEIGHT && <div className="rb-callout is-warning"><Fan size={18} /><p><strong>{tr('Alacsony belmagasság', 'Geringe Raumhöhe')}</strong>{tr(`${String(FAN_MIN_HEIGHT).replace('.', ',')} m oszlopmagasság alatt a lapátok 2,1 m alá kerülhetnek. Felméréskor ellenőrizzük, vagy válassz magasabb oszlopot.`, `Unter ${String(FAN_MIN_HEIGHT).replace('.', ',')} m Steherhöhe können die Flügel unter 2,1 m liegen. Wir prüfen das beim Aufmaß, oder wählen Sie höhere Steher.`)}</p></div>}
      {fans > 0 && <button type="button" className="rb-ghost-action" aria-pressed={!!scene.fanOn} onClick={() => onSceneChange({ fanOn: !scene.fanOn })}><Power size={15} />{scene.fanOn ? tr('Ventilátor kikapcsolása', 'Ventilator ausschalten') : tr('Ventilátor bekapcsolása a 3D‑ben', 'Ventilator in 3D einschalten')}</button>}
    </section>}

    {!carport && <section className="rb-section">
      <h3>{tr('Vezérlés', 'Steuerung')}</h3>
      {tenant.extras.sensors && sensorsApplicable(config) && <MetalSwitch label={tr('Eső- és szélszenzor', 'Regen- und Windsensor')} description={tr('Automata tetőzárás esőben', 'Automatisches Schließen bei Regen')} icon={CloudRain} price={cost({ sensors: true }, { sensors: false })} checked={config.sensors} onChange={(sensors) => onChange({ sensors })} />}
      {!sensorsApplicable(config) && <p className="rb-note">{tr('Eső- és szélszenzor mozgó tetőhöz vagy ZIP screenhez választható.', 'Regen- und Windsensor für bewegliche Dächer oder ZIP-Screens wählbar.')}</p>}
      {tenant.extras.smartHome && <MetalSwitch label={tr('Okosotthon-vezérlés', 'Smart-Home-Steuerung')} description={`${targets.length ? `${tr('Egy appból', 'Per App')}: ${targets.join(' · ')}` : tr('A később hozzáadott elektromos opciókat is kezeli', 'Steuert auch später hinzugefügte elektrische Optionen')}${tr(' — időzítés, jelenetek, Google / Alexa / Siri', ' — Zeitpläne, Szenen, Google / Alexa / Siri')}`} icon={House} price={cost({ smartHome: true }, { smartHome: undefined })} checked={Boolean(config.smartHome)} onChange={(on) => onChange({ smartHome: on ? true : undefined })} />}
    </section>}

    {energyCost !== null && <div className="rb-callout"><Gauge size={18} /><p><strong>{tr('Becsült üzemeltetés', 'Geschätzter Betrieb')} ≈ {formatPrice(energyCost)} / {tr('év', 'Jahr')}</strong>{tr('Áramköltség a lakossági tarifával, átlagos használatot feltételezve.', 'Stromkosten mit Haushaltstarif bei durchschnittlicher Nutzung.')}</p></div>}
  </div>
}
