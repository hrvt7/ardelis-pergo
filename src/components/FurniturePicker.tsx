// „Mi fér el alatta?” — bútorcsomag választása a méret lépésben, a helyigény
// ellenőrzésével és méretjavaslattal (a javasolt méret árkülönbségével együtt).
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Maximize, XCircle } from 'lucide-react'
import { FURNITURE_ORDER, FURNITURE_SETS, furnitureFit } from '@/lib/furniture'
import { formatHuf } from '@/lib/pricing'
import { tenantPrice } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import type { FurnitureSet, PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'

const m = (value: number) => value.toFixed(2).replace('.', ',')

export default function FurniturePicker({ config, scene, prices, onChange, onSceneChange }: { config: PergolaConfig; scene: SceneSettings; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void; onSceneChange: (patch: Partial<SceneSettings>) => void }) {
  const { tenant } = useTenant()
  const fit = furnitureFit(scene.furniture, config, tenant.limits)
  const select = (furniture: FurnitureSet) => onSceneChange({ furniture, showFurnitureZone: furniture !== 'none' })
  const suggestion = fit?.suggestion
  const delta = suggestion ? tenantPrice(tenant, { ...config, ...suggestion }, prices).totalGross - tenantPrice(tenant, config, prices).totalGross : 0
  const spec = scene.furniture === 'none' ? null : FURNITURE_SETS[scene.furniture]

  return <div className="furniture-picker">
    <div className="furniture-head"><strong>Mit szeretnél alatta?</strong><span>A 3D-ben is megjelenik, a szükséges szabad hellyel együtt.</span></div>
    <div className="furniture-options" role="radiogroup" aria-label="Bútorcsomag">
      {FURNITURE_ORDER.map((id) => <button type="button" role="radio" aria-checked={scene.furniture === id} key={id} className={scene.furniture === id ? 'selected' : ''} onClick={() => select(id)}>
        <strong>{id === 'none' ? 'Üresen' : FURNITURE_SETS[id].label}</strong>
        <small>{id === 'none' ? 'bútor nélkül' : FURNITURE_SETS[id].people}</small>
      </button>)}
    </div>
    {fit && spec && <div className={`furniture-fit is-${fit.level}`} role="status">
      {fit.level === 'comfortable' ? <CheckCircle2 size={17} /> : fit.level === 'tight' ? <AlertTriangle size={17} /> : <XCircle size={17} />}
      <div>
        <strong>{fit.level === 'comfortable' ? 'Kényelmesen elfér' : fit.level === 'tight' ? 'Elfér, de szűkös' : 'Nem fér el kényelmesen'}</strong>
        <span>{spec.description} · helyigény mozgástérrel {m(spec.zone[0])} × {m(spec.zone[1])} m{fit.level === 'tight' ? ' — a székek mögött kevesebb a hely' : ''}</span>
        {suggestion && <button type="button" className="furniture-suggest" onClick={() => onChange(suggestion)}>
          <Maximize size={14} />Méret igazítása: {m(suggestion.width)} × {m(suggestion.depth)} m <em>{delta >= 0 ? '+' : '−'}{formatHuf(Math.abs(delta))}</em>
        </button>}
        {fit.level !== 'comfortable' && !suggestion && <span>A gyártó legnagyobb méretében sem fér el; válassz kisebb csomagot.</span>}
      </div>
    </div>}
    {spec && <button type="button" className="furniture-zone-toggle" aria-pressed={scene.showFurnitureZone} onClick={() => onSceneChange({ showFurnitureZone: !scene.showFurnitureZone })}>
      {scene.showFurnitureZone ? <EyeOff size={14} /> : <Eye size={14} />}{scene.showFurnitureZone ? 'Helyigény elrejtése' : 'Helyigény mutatása a 3D-ben'}
    </button>}
  </div>
}
