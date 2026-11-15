// „Mi fér el alatta?” — bútorcsomag választása a méret lépésben, a helyigény
// ellenőrzésével és méretjavaslattal (a javasolt méret árkülönbségével együtt).
import { AlertTriangle, Armchair, Bath, CheckCircle2, ChefHat, Coffee, Eye, EyeOff, LayoutGrid, Maximize, Martini, PartyPopper, Sofa, SquareDashed, Sparkles, Sun, UtensilsCrossed, Waves, Wine, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { FURNITURE_GROUPS, FURNITURE_SETS, furnitureFit, furnitureLayout } from '@/lib/furniture'
import { formatPrice } from '@/lib/pricing'
import { tenantPrice } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import type { FurnitureSet, PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'
import { tr } from '../i18n/locale'

const m = (value: number) => value.toFixed(2).replace('.', ',')
const m1 = (value: number) => value.toFixed(1).replace('.', ',')

const ICONS: Record<FurnitureSet, ReactNode> = {
  none: <SquareDashed size={18} />, lounge: <Sofa size={18} />, dining6: <UtensilsCrossed size={18} />, dining8: <UtensilsCrossed size={18} />, combo: <Armchair size={18} />,
  spa: <Bath size={18} />, loungeSpa: <Waves size={18} />, diningSpa: <Waves size={18} />, bistro: <Coffee size={18} />, bar: <Wine size={18} />, sunbed: <Sun size={18} />,
  restaurant: <LayoutGrid size={18} />, summerKitchen: <ChefHat size={18} />, kitchenDining: <ChefHat size={18} />, banquet: <PartyPopper size={18} />, barLounge: <Martini size={18} />, mixed: <Sparkles size={18} />,
}

function FurnitureOption({ id, scene, select }: { id: FurnitureSet; scene: SceneSettings; select: (furniture: FurnitureSet) => void }) {
  const spec = id === 'none' ? null : FURNITURE_SETS[id]
  const selected = scene.furniture === id
  return <button type="button" role="radio" aria-checked={selected} className={`furniture-card${selected ? ' selected' : ''}`} onClick={() => select(id)}>
    <span className="furniture-card-icon" aria-hidden="true">{ICONS[id]}</span>
    <span className="furniture-card-text">
      <strong>{spec ? spec.label : tr('Üresen', 'Leer')}</strong>
      <small>{spec ? spec.people : tr('bútor nélkül', 'ohne Möbel')}</small>
    </span>
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
    <div className="furniture-head"><strong>{tr('Mit szeretnél alatta?', 'Was möchten Sie darunter?')}</strong><span>{tr('A 3D-ben is megjelenik, a szükséges szabad hellyel együtt.', 'Erscheint auch in 3D, samt nötiger Bewegungsfläche.')}</span></div>
    <div className="furniture-groups" role="radiogroup" aria-label={tr('Bútorcsomag', 'Möbelpaket')}>
      {FURNITURE_GROUPS.map((group) => <section key={group.id} className="furniture-group" aria-label={group.label}>
        <h4>{group.label}</h4>
        <div className="furniture-options">{group.sets.map((id) => <FurnitureOption key={id} id={id} scene={scene} select={select} />)}</div>
      </section>)}
      <section className="furniture-group is-empty" aria-label={tr('Bútor nélkül', 'Ohne Möbel')}><div className="furniture-options"><FurnitureOption id="none" scene={scene} select={select} /></div></section>
    </div>
    {fit && spec && <div className={`furniture-fit is-${fit.level}`} role="status">
      {fit.level === 'comfortable' ? <CheckCircle2 size={17} /> : fit.level === 'tight' ? <AlertTriangle size={17} /> : <XCircle size={17} />}
      <div>
        <strong>{fit.level === 'comfortable' ? tr('Kényelmesen elfér', 'Passt bequem') : fit.level === 'tight' ? tr('Elfér, de szűkös', 'Passt, aber knapp') : tr('Nem fér el kényelmesen', 'Passt nicht bequem')}</strong>
        <span>{spec.description} · {tr('helyigény mozgástérrel', 'Platzbedarf mit Bewegungsfläche')} {m(spec.zone[0])} × {m(spec.zone[1])} m{fit.level === 'tight' ? tr(' — a székek mögött kevesebb a hely', ' — hinter den Stühlen ist weniger Platz') : ''}</span>
        {layout?.pack && <div className="furniture-pack">
          <span><b>{layout.pack.seats > 0 ? `${layout.pack.seats} ${tr('ülőhely', 'Sitzplätze')}` : tr('Főzőzóna', 'Kochzone')}</b>{layout.pack.areaPerSeat !== null && ` · ${m1(layout.pack.areaPerSeat)} m²/${tr('fő', 'Person')}`}{layout.pack.benchmark && ` (${tr('vendéglátós irányérték', 'Richtwert Gastronomie')}: ${m1(layout.pack.benchmark[0])}–${m1(layout.pack.benchmark[1])} m²/${tr('fő', 'Person')})`}</span>
          {spec.pack && <span>Jellemző felhasználók: {spec.pack.audience}.</span>}
          {layout.pack.notes.map((note) => <span key={note}>{note}</span>)}
          {layout.pack.seats > 0 && <small>{tr('A létszám tervezési irányszám. A megengedett vendéglétszámot a helyi előírások (tűzvédelem, menekülési útvonal, vendéglátó-engedély) határozzák meg.', 'Die Personenzahl ist ein Planungsrichtwert. Die zulässige Gästezahl bestimmen örtliche Vorschriften (Brandschutz, Fluchtwege, Gastgewerbe-Genehmigung).')}</small>}
        </div>}
        {layout && !layout.pack && layout.count > 1 && <span className="furniture-capacity">Ezen a méreten {layout.count} csomag fér el egymás mellett, összesen kb. {layout.seats} fő (becsült létszám).</span>}
        {suggestion && <button type="button" className="furniture-suggest" onClick={() => onChange(suggestion)}>
          <Maximize size={14} />Méret igazítása: {m(suggestion.width)} × {m(suggestion.depth)} m <em>{delta >= 0 ? '+' : '−'}{formatPrice(Math.abs(delta))}</em>
        </button>}
        {fit.level !== 'comfortable' && !suggestion && <span>{tr('A gyártó legnagyobb méretében sem fér el; válassz kisebb csomagot.', 'Passt auch in der größten Herstellergröße nicht; wählen Sie ein kleineres Paket.')}</span>}
      </div>
    </div>}
    {spec && <button type="button" className="furniture-zone-toggle" aria-pressed={scene.showFurnitureZone} onClick={() => onSceneChange({ showFurnitureZone: !scene.showFurnitureZone })}>
      {scene.showFurnitureZone ? <EyeOff size={14} /> : <Eye size={14} />}{scene.showFurnitureZone ? tr('Helyigény elrejtése', 'Platzbedarf ausblenden') : tr('Helyigény mutatása a 3D-ben', 'Platzbedarf in 3D zeigen')}
    </button>}
  </div>
}
