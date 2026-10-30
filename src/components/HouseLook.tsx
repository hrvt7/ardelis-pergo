// „A házad” panel: homlokzat anyaga és színe, nyílászárók színe — hogy a 3D ház a vásárlóéra hasonlítson,
// és lássa, milyen pergolaszín illik hozzá. Csak látvány, az árat nem befolyásolja.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Palette, Pipette, Wand2 } from 'lucide-react'
import { PhotoColorDialog } from '@/components/ColorPicker'
import { describeColor, normalizeColorCode, pickCatalogColor } from '@/lib/colors'
import { findWindowColor, finishPreview, WALL_COLORS, WALL_FINISH_INFO, WINDOW_COLORS, defaultWallColor, wallColorHex, wallColorName, type WindowSwatch } from '@/lib/house'
import { useTenant } from '@/tenants/TenantContext'
import type { PergolaConfig, SceneSettings, WallFinish } from '@/types/pergola'

type Props = {
  config: PergolaConfig
  scene: SceneSettings
  photoUrl: string | null
  onSceneChange: (patch: Partial<SceneSettings>) => void
  onChange: (patch: Partial<PergolaConfig>) => void
  /** Kompakt változat (Szín lépés): csak a nyílászárókhoz igazítás. */
  compact?: boolean
}

const FINISHES: WallFinish[] = ['plaster', 'brick', 'cedar']

/** Kis ablak ikon a keret színével (fa hatásúnál erezettel). */
function WindowIcon({ swatch }: { swatch: WindowSwatch }) {
  const frame = swatch.kind === 'wood' ? `url(#grain-${swatch.id})` : swatch.kind === 'metal' ? `url(#metal-${swatch.id})` : swatch.hex
  return <svg viewBox="0 0 40 44" width="40" height="44" aria-hidden="true">
    <defs>
      {swatch.kind === 'wood' && <pattern id={`grain-${swatch.id}`} width="40" height="6" patternUnits="userSpaceOnUse"><rect width="40" height="6" fill={swatch.hex} /><path d="M0 2.2 Q10 1.2 20 2.4 T40 2" stroke="rgba(0,0,0,.28)" strokeWidth=".8" fill="none" /><path d="M0 4.6 Q12 5.4 22 4.3 T40 4.8" stroke="rgba(255,235,200,.22)" strokeWidth=".7" fill="none" /></pattern>}
      {swatch.kind === 'metal' && <linearGradient id={`metal-${swatch.id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#cfd3d4" /><stop offset=".5" stopColor={swatch.hex} /><stop offset="1" stopColor="#7b8082" /></linearGradient>}
      <linearGradient id="window-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b9d3dc" /><stop offset=".55" stopColor="#7d9eaa" /><stop offset="1" stopColor="#5b7883" /></linearGradient>
    </defs>
    <rect x="2" y="2" width="36" height="40" rx="2" fill={frame} />
    <rect x="6" y="6" width="12.5" height="32" fill="url(#window-glass)" />
    <rect x="21.5" y="6" width="12.5" height="32" fill="url(#window-glass)" />
    <path d="M8 9 L15 9 L8 18 Z" fill="rgba(255,255,255,.22)" />
    <rect x="17.5" y="20" width="1.6" height="5" rx=".8" fill="rgba(0,0,0,.35)" />
    <rect x="2" y="2" width="36" height="40" rx="2" fill="none" stroke="rgba(255,255,255,.18)" />
  </svg>
}

/** A pergola színe megegyezik-e a nyílászárókhoz ajánlottal. */
function usePergolaMatch(config: PergolaConfig) {
  const { tenant } = useTenant()
  return (swatch: WindowSwatch) => {
    const current = describeColor(tenant, config.frameColor, config.customRal)
    const target = normalizeColorCode(swatch.match) ?? swatch.match
    const same = normalizeColorCode(current.code) === target && !config.roofColor
    const pick = pickCatalogColor(tenant, swatch.match)
    const info = pick ? describeColor(tenant, pick.color, pick.custom) : null
    return { same, pick, info }
  }
}

/** Ajánlás: a pergola színe a nyílászárókéhoz igazítva (a leggyakoribb, összeillő választás). */
export function WindowMatch({ config, scene, onChange }: Pick<Props, 'config' | 'scene' | 'onChange'>) {
  const swatch = findWindowColor(scene.windowColor)
  const match = usePergolaMatch(config)(swatch)
  if (!match.pick || !match.info) return null
  if (match.same) return <div className="house-match is-matched"><Check size={16} /><p><strong>A pergola illik a nyílászárókhoz</strong>Mindkettő {match.info.name.toLowerCase()} — ez a legbiztosabb, időtálló párosítás.</p></div>
  const pick = match.pick
  return <div className="house-match">
    <span className="house-match-pair" aria-hidden="true"><WindowIcon swatch={swatch} /><i style={match.info.kind === 'wood' ? { background: `repeating-linear-gradient(90deg, ${match.info.hex} 0 5px, rgba(0,0,0,.18) 5px 6px)` } : { background: match.info.hex }} /></span>
    <p><strong>Igazítsd a nyílászárókhoz?</strong>A pergola leggyakrabban az ablakkeretek színét kapja. A ház nyílászárói: {swatch.name.toLowerCase()}.</p>
    <button type="button" onClick={() => onChange({ frameColor: pick.color, customRal: pick.custom, roofColor: undefined, roofRal: undefined })}><Wand2 size={14} />Pergola: {match.info.name} · {match.info.code}</button>
  </div>
}

export default function HouseLook({ config, scene, photoUrl, onSceneChange, onChange }: Props) {
  const [photoOpen, setPhotoOpen] = useState(false)
  const finish = scene.wallFinish
  const hex = wallColorHex(finish, scene.wallColor)
  const swatches = WALL_COLORS[finish]
  const custom = !swatches.some((item) => item.hex.toLowerCase() === hex)
  const windowSwatch = findWindowColor(scene.windowColor)
  return <section className="house-look" aria-label="A házad">
    <div className="house-look-head"><span><strong>Homlokzat</strong><small>Milyen a házad fala?</small></span></div>
    <div className="house-finish-grid" role="radiogroup" aria-label="Homlokzat anyaga">
      {FINISHES.map((item) => {
        const selected = finish === item
        const previewHex = selected ? hex : defaultWallColor(item)
        return <button type="button" role="radio" aria-checked={selected} key={item} className={selected ? 'selected' : ''} onClick={() => !selected && onSceneChange({ wallFinish: item, wallColor: defaultWallColor(item) })}>
          <span className="house-finish-preview" style={finishPreview(item, previewHex)} />
          <span className="house-finish-text"><strong>{WALL_FINISH_INFO[item].label}</strong><small>{WALL_FINISH_INFO[item].description}</small></span>
        </button>
      })}
    </div>

    <div className="house-look-head"><span><strong>Homlokzat színe</strong><small>{wallColorName(finish, hex)}</small></span></div>
    <div className="house-swatches" role="radiogroup" aria-label="Homlokzat színe">
      {swatches.map((item) => {
        const selected = item.hex.toLowerCase() === hex
        return <button type="button" role="radio" aria-checked={selected} key={item.id} className={selected ? 'selected' : ''} title={item.note ? `${item.name} — ${item.note}` : item.name} onClick={() => onSceneChange({ wallColor: item.hex })}>
          <span className="house-swatch" style={finishPreview(finish, item.hex)}>{selected && <Check size={14} />}</span>
          <small>{item.name}</small>
        </button>
      })}
      <label className={`house-swatch-custom ${custom ? 'selected' : ''}`} title="Bármilyen szín kiválasztása">
        <span className="house-swatch" style={custom ? finishPreview(finish, hex) : undefined}>{custom ? <Check size={14} /> : <Palette size={15} />}</span>
        <small>Egyedi</small>
        <input type="color" value={hex} aria-label="Egyedi homlokzatszín" onChange={(event) => onSceneChange({ wallColor: event.target.value })} />
      </label>
      <button type="button" className="house-swatch-photo" title="Szín a házadról készült fotóról" onClick={() => setPhotoOpen(true)}>
        <span className="house-swatch"><Pipette size={15} /></span>
        <small>Fotóról</small>
      </button>
    </div>

    <div className="house-look-head"><span><strong>Nyílászárók</strong><small>Ablakok, teraszajtó, bejárati ajtó · {windowSwatch.name.toLowerCase()}</small></span></div>
    <div className="house-windows" role="radiogroup" aria-label="Nyílászárók színe">
      {WINDOW_COLORS.map((item) => {
        const selected = item.id === windowSwatch.id
        return <button type="button" role="radio" aria-checked={selected} key={item.id} className={selected ? 'selected' : ''} title={item.note ? `${item.name} — ${item.note}` : item.name} onClick={() => onSceneChange({ windowColor: item.id })}>
          <WindowIcon swatch={item} />
          <small>{item.name}</small>
        </button>
      })}
    </div>
    <WindowMatch config={config} scene={scene} onChange={onChange} />
    <p className="house-look-note">Csak a 3D látványt módosítja, az árat nem. A beállítást a böngésző megjegyzi.</p>
    {photoOpen && createPortal(<PhotoColorDialog photoUrl={photoUrl} title="Homlokzat színe fotóról" targetLabel="a homlokzatra" prompt="Bökj a házad falára, lehetőleg napos, egyenletes részre." onApplyHex={(value) => { onSceneChange({ wallColor: value }); setPhotoOpen(false) }} onClose={() => setPhotoOpen(false)} />, document.body)}
  </section>
}
