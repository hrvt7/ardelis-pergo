// Fotó mód vezérlősáv a 3D nézet alján: egyértelmű „FOTÓ MÓD” jelzés, gesztus-súgó, forgatás,
// méret, nézőszög, visszaállítás, csere, törlés és kilépés. Minden művelet gombbal is elérhető
// (billentyűzet, akadálymentesség), a húzás / csippentés a 3D vásznon működik.
import { Check, ImagePlus, Minus, Plus, RefreshCcw, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import { clampPlacement, PLACEMENT_LIMITS, type PhotoPlacement } from '@/lib/photoPlacement'

export default function PhotoBar({ placement, coarse, onChange, onReset, onReplace, onDelete, onDone }: {
  placement: PhotoPlacement
  coarse: boolean
  onChange: (next: PhotoPlacement) => void
  onReset: () => void
  onReplace: () => void
  onDelete: () => void
  onDone: () => void
}) {
  const nudge = (patch: Partial<PhotoPlacement>) => onChange(clampPlacement({ ...placement, ...patch }))
  return <div className="photo-bar" role="region" aria-label="Fotóba helyezés">
    <div className="photo-bar-head">
      <span className="photo-badge"><i />FOTÓ MÓD</span>
      <span className="photo-hint">{coarse ? 'Húzd a pergolát · két ujjal méretezd és forgasd' : 'Húzd a pergolát · görgő: méret · Shift + húzás: forgatás'}</span>
    </div>
    <div className="photo-bar-tools">
      <div className="photo-group" role="group" aria-label="Forgatás">
        <button type="button" onClick={() => nudge({ photoRotation: placement.photoRotation - 15 })} aria-label="Forgatás balra 15°" title="Forgatás balra"><RotateCcw size={17} /></button>
        <output aria-label="Elforgatás">{Math.round(placement.photoRotation)}°</output>
        <button type="button" onClick={() => nudge({ photoRotation: placement.photoRotation + 15 })} aria-label="Forgatás jobbra 15°" title="Forgatás jobbra"><RotateCw size={17} /></button>
      </div>
      <div className="photo-group" role="group" aria-label="Méret">
        <button type="button" onClick={() => nudge({ photoScale: placement.photoScale / 1.1 })} aria-label="Kisebb" title="Kisebb"><Minus size={17} /></button>
        <output aria-label="Méretarány">{Math.round(placement.photoScale * 100)}%</output>
        <button type="button" onClick={() => nudge({ photoScale: placement.photoScale * 1.1 })} aria-label="Nagyobb" title="Nagyobb"><Plus size={17} /></button>
      </div>
      <label className="photo-tilt"><span>Nézőszög</span>
        <input type="range" min={PLACEMENT_LIMITS.tiltMin} max={PLACEMENT_LIMITS.tiltMax} step={1} value={placement.photoTilt} onChange={(event) => nudge({ photoTilt: Number(event.target.value) })} aria-valuetext={`${placement.photoTilt} fok`} />
      </label>
      <div className="photo-actions">
        <button type="button" onClick={onReset} title="Alap pozíció"><RefreshCcw size={16} /><span>Visszaállítás</span></button>
        <button type="button" onClick={onReplace} title="Másik fotó"><ImagePlus size={16} /><span>Csere</span></button>
        <button type="button" className="is-danger" onClick={onDelete} title="Fotó törlése"><Trash2 size={16} /><span>Törlés</span></button>
        <button type="button" className="is-primary" onClick={onDone} title="Vissza a 3D jelenetbe (a fotó megmarad)"><Check size={16} /><span>Kész</span></button>
      </div>
    </div>
  </div>
}
