// Téli nézet: mit tud a pergola télen — a tervhez szabott, őszinte tájékoztatás,
// és egy-egy kattintással kipróbálható téli kiegészítők (árral).
import { Check, Flame, Info, Plus, Snowflake, X } from 'lucide-react'
import { isWallSide } from '@/lib/mount'
import { formatHuf } from '@/lib/pricing'
import { tenantPrice } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import type { PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'

const ROOF_WINTER: Record<PergolaConfig['roof'], string> = {
  louvered: 'Zárt állásban a lamellák vízzárók, a terasz alatta száraz marad. Ráfagyott lamellákat ne mozgass — olvadásig maradjon zárva.',
  retractable: 'Zárva vízzáró, a terasz alatta száraz marad. Fagyban, ráfagyott lamellákkal ne mozgasd a tetőt.',
  fabric: 'A textiltető nem hóteherre készül: havazás előtt be kell húzni (a képen behúzva). Ilyenkor a terasz nyitott, a ponyva védve marad.',
  glass: 'A hó az üvegen marad, alatta világos és száraz a terasz.',
  polycarbonate: 'A hó a tetőn marad, alatta száraz a terasz. Az opál lemez szórt fényt ad borús napokon is.',
  fixed: 'Zárt alumínium tető: a hó a tetőn marad, a terasz alatta száraz és használható.',
}

export default function WinterPanel({ config, scene, prices, onChange, onSceneChange, onClose }: { config: PergolaConfig; scene: SceneSettings; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void; onSceneChange: (patch: Partial<SceneSettings>) => void; onClose: () => void }) {
  const { tenant } = useTenant()
  const current = tenantPrice(tenant, config, prices).totalGross
  const frontOpen = !isWallSide(config.mount, 'front') && config.sides.front === 'none'
  const canGlass = tenant.sides.includes('glass') && frontOpen
  const glassPrice = canGlass ? tenantPrice(tenant, { ...config, sides: { ...config.sides, front: 'glass' } }, prices).totalGross - current : 0
  const heaterPrice = tenantPrice(tenant, { ...config, heaters: Math.max(1, config.heaters) }, prices).totalGross - current
  const canHeat = tenant.limits.maxHeaters > 0
  const sides = Object.entries(config.sides).filter(([side, type]) => type !== 'none' && !isWallSide(config.mount, side as never)).map(([, type]) => type)

  return <section className="winter-panel" aria-label="Téli nézet">
    <header>
      <div><Snowflake size={16} /><span><strong>Télen is</strong><small>Így néz ki a teraszod havazáskor</small></span></div>
      <button type="button" className="sun-close" aria-label="Téli nézet bezárása" onClick={onClose}><X size={16} /></button>
    </header>
    <ul className="winter-facts">
      <li><Check size={13} /><span><strong>Tető</strong>{ROOF_WINTER[config.roof]}</span></li>
      {sides.includes('glass') && <li><Check size={13} /><span><strong>Tolóüveg</strong>Szél és hó ellen zárható, fűtéssel átmeneti időben is kellemes. Nem hőszigetelt télikert.</span></li>}
      {sides.includes('zip') && <li><Check size={13} /><span><strong>ZIP screen</strong>A behordott hó és a szél ellen véd; hőt nem szigetel.</span></li>}
    </ul>
    {canGlass && <button type="button" className="winter-add" onClick={() => onChange({ sides: { ...config.sides, front: 'glass' } })}><Plus size={14} /><span><strong>Zárd körbe elöl tolóüveggel</strong><small>Szélvédett terasz télen is · +{formatHuf(glassPrice)}</small></span></button>}
    {canHeat && (config.heaters > 0
      ? <button type="button" className={`mood-heat${scene.heatersOn ? ' is-on' : ''}`} aria-pressed={scene.heatersOn} onClick={() => onSceneChange({ heatersOn: !scene.heatersOn })}><Flame size={15} /><span><strong>Teraszfűtés {scene.heatersOn ? 'bekapcsolva' : 'kikapcsolva'}</strong><small>{config.heaters} db infrapanel</small></span></button>
      : <button type="button" className="winter-add" onClick={() => onChange({ heaters: 1 })}><Plus size={14} /><span><strong>Infrapanel a hideg estékre</strong><small>1 db teraszfűtés · +{formatHuf(heaterPrice)}</small></span></button>)}
    <p className="winter-note"><Info size={13} />A hó- és szélterhelést a gyártó típusstatikája határozza meg; a helyszíni felmérésen a te címedre ellenőrizzük.</p>
  </section>
}
