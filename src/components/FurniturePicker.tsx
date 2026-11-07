// „Mi fér el alatta?” — bútorcsomag választása a méret lépésben, a helyigény
// ellenőrzésével és méretjavaslattal (a javasolt méret árkülönbségével együtt).
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Maximize, XCircle } from 'lucide-react'
import { FURNITURE_ORDER, FURNITURE_SETS, PACK_ORDER, furnitureFit, furnitureLayout } from '@/lib/furniture'
import { formatHuf } from '@/lib/pricing'
import { tenantPrice } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import type { FurnitureSet, PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'

const m = (value: number) => value.toFixed(2).replace('.', ',')
const m1 = (value: number) => value.toFixed(1).replace('.', ',')

function FurnitureOption({ id, scene, select }: { id: FurnitureSet; scene: SceneSettings; select: (furniture: FurnitureSet) => void }) {
  return <button type="button" role="radio" aria-checked={scene.furniture === id} className={scene.furniture === id ? 'selected' : ''} onClick={() => select(id)}>
    <strong>{id === 'none' ? 'Üresen' : FURNITURE_SETS[id].label}</strong>
    <small>{id === 'none' ? 'bútor nélkül' : FURNITURE_SETS[id].people}</small>
  </button>
}

export default function FurniturePicker({ config, scene, prices, onChange, onSceneChange }: { config: PergolaConfig; scene: SceneSettings; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void; onSceneChange: (patch: Partial<SceneSettings>) => void }) {
  const { tenant } = useTenant()
  const fit = furnitureFit(scene.furniture, config, tenant.limits)
  const select = (furniture: FurnitureSet) => onSceneChange({ furniture, showFurnitureZone: furniture !== 'none' })
  const suggestion = fit?.suggestion
  const delta = suggestion ? tenantPrice(tenant, { ...config, ...suggestion }, prices).totalGross - tenantPrice(tenant, config, prices).totalGross : 0
  const spec = scene.furniture === 'none' ? null : FURNITURE_SETS[scene.furniture]
  const layout = furnitureLayout(scene.furniture, config)

  return <div className="furniture-picker">
    <div className="furniture-head"><strong>Mit szeretnél alatta?</strong><span>A 3D-ben is megjelenik, a szükséges szabad hellyel együtt.</span></div>
    <div className="furniture-options" role="radiogroup" aria-label="Bútorcsomag">
      {FURNITURE_ORDER.filter((id) => id !== 'none').map((id) => <FurnitureOption key={id} id={id} scene={scene} select={select} />)}
    </div>
    <div className="furniture-group-title"><strong>Használati csomagok</strong><span>A pergola méretéhez igazodnak: étterem, nyári konyha, rendezvény</span></div>
    <div className="furniture-options" role="radiogroup" aria-label="Használati csomag">
      {PACK_ORDER.map((id) => <FurnitureOption key={id} id={id} scene={scene} select={select} />)}
      <FurnitureOption id="none" scene={scene} select={select} />
    </div>
    {fit && spec && <div className={`furniture-fit is-${fit.level}`} role="status">
      {fit.level === 'comfortable' ? <CheckCircle2 size={17} /> : fit.level === 'tight' ? <AlertTriangle size={17} /> : <XCircle size={17} />}
      <div>
        <strong>{fit.level === 'comfortable' ? 'Kényelmesen elfér' : fit.level === 'tight' ? 'Elfér, de szűkös' : 'Nem fér el kényelmesen'}</strong>
        <span>{spec.description} · helyigény mozgástérrel {m(spec.zone[0])} × {m(spec.zone[1])} m{fit.level === 'tight' ? ' — a székek mögött kevesebb a hely' : ''}</span>
        {layout?.pack && <div className="furniture-pack">
          <span><b>{layout.pack.seats > 0 ? `${layout.pack.seats} ülőhely` : 'Főzőzóna'}</b>{layout.pack.areaPerSeat !== null && ` · ${m1(layout.pack.areaPerSeat)} m²/fő`}{layout.pack.benchmark && ` (vendéglátós irányérték: ${m1(layout.pack.benchmark[0])}–${m1(layout.pack.benchmark[1])} m²/fő)`}</span>
          {spec.pack && <span>Jellemző felhasználók: {spec.pack.audience}.</span>}
          {layout.pack.notes.map((note) => <span key={note}>{note}</span>)}
          {layout.pack.seats > 0 && <small>A létszám tervezési irányszám. A megengedett vendéglétszámot a helyi előírások (tűzvédelem, menekülési útvonal, vendéglátó-engedély) határozzák meg.</small>}
        </div>}
        {layout && !layout.pack && layout.count > 1 && <span className="furniture-capacity">Ezen a méreten {layout.count} csomag fér el egymás mellett, összesen kb. {layout.seats} fő (becsült létszám).</span>}
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
