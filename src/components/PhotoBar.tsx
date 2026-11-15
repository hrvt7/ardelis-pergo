// Fotó mód vezérlősáv a 3D nézet alján: egyértelmű „FOTÓ MÓD” jelzés, gesztus-súgó, forgatás,
// méret, nézőszög, visszaállítás, csere, törlés és kilépés. Minden művelet gombbal is elérhető
// (billentyűzet, akadálymentesség), a húzás / csippentés a 3D vásznon működik.
import { Check, ImagePlus, Minus, Plus, RefreshCcw, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import { clampPlacement, PLACEMENT_LIMITS, type PhotoPlacement } from '@/lib/photoPlacement'
import { tr } from '../i18n/locale'

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
  return <div className="photo-bar" role="region" aria-label={tr('Fotóba helyezés', 'Ins Foto setzen')}>
    <div className="photo-bar-head">
      <span className="photo-badge"><i />{tr('FOTÓ MÓD', 'FOTOMODUS')}</span>
      <span className="photo-hint">{coarse ? tr('Húzd a pergolát · két ujjal méretezd és forgasd', 'Pergola ziehen · mit zwei Fingern skalieren und drehen') : tr('Húzd a pergolát · görgő: méret · Shift vagy jobb gomb + húzás: forgatás', 'Pergola ziehen · Mausrad: Größe · Umschalt oder rechte Taste + Ziehen: Drehen')}</span>
    </div>
    <div className="photo-bar-tools">
      <div className="photo-group" role="group" aria-label={tr('Forgatás', 'Drehen')}>
        <button type="button" onClick={() => nudge({ photoRotation: placement.photoRotation - 5 })} aria-label={tr('Forgatás balra 5°', '5° nach links drehen')} title={tr('Forgatás balra 5°', '5° nach links drehen')}><RotateCcw size={17} /></button>
        <output aria-label={tr('Elforgatás', 'Drehung')}>{Math.round(placement.photoRotation)}°</output>
        <button type="button" onClick={() => nudge({ photoRotation: placement.photoRotation + 5 })} aria-label={tr('Forgatás jobbra 5°', '5° nach rechts drehen')} title={tr('Forgatás jobbra 5°', '5° nach rechts drehen')}><RotateCw size={17} /></button>
      </div>
      <label className="photo-tilt"><span>{tr('Elforgatás', 'Drehung')}</span>
        <input type="range" min={-180} max={180} step={1} value={Math.round(placement.photoRotation)} onChange={(event) => nudge({ photoRotation: Number(event.target.value) })} aria-valuetext={`${Math.round(placement.photoRotation)} fok`} />
      </label>
      <div className="photo-group" role="group" aria-label={tr('Méret', 'Größe')}>
        <button type="button" onClick={() => nudge({ photoScale: placement.photoScale / 1.1 })} aria-label={tr('Kisebb', 'Kleiner')} title={tr('Kisebb', 'Kleiner')}><Minus size={17} /></button>
        <output aria-label={tr('Méretarány', 'Maßstab')}>{Math.round(placement.photoScale * 100)}%</output>
        <button type="button" onClick={() => nudge({ photoScale: placement.photoScale * 1.1 })} aria-label={tr('Nagyobb', 'Größer')} title={tr('Nagyobb', 'Größer')}><Plus size={17} /></button>
      </div>
      <label className="photo-tilt"><span>{tr('Nézőszög', 'Blickwinkel')}</span>
        <input type="range" min={PLACEMENT_LIMITS.tiltMin} max={PLACEMENT_LIMITS.tiltMax} step={1} value={placement.photoTilt} onChange={(event) => nudge({ photoTilt: Number(event.target.value) })} aria-valuetext={`${placement.photoTilt} fok`} />
      </label>
      <label className="photo-tilt" title={tr('A fotó objektívjéhez igazítás: közelről, széles látószöggel fotózott képhez erősebb; messziről, zoomolt képhez laposabb perspektíva', 'Anpassung an das Objektiv: stärker für nah und weitwinklig aufgenommene Fotos, flacher für gezoomte Aufnahmen aus der Ferne')}><span>{tr('Perspektíva', 'Perspektive')}</span>
        <input type="range" min={PLACEMENT_LIMITS.lensMin} max={PLACEMENT_LIMITS.lensMax} step={0.05} value={placement.photoLens} onChange={(event) => nudge({ photoLens: Number(event.target.value) })} aria-valuetext={placement.photoLens < 0.85 ? tr('erős (széles látószög)', 'stark (Weitwinkel)') : placement.photoLens > 1.3 ? 'lapos (tele)' : tr('közepes', 'mittel')} />
      </label>
      <div className="photo-actions">
        <button type="button" onClick={onReset} title={tr('Alap pozíció', 'Grundposition')}><RefreshCcw size={16} /><span>{tr('Visszaállítás', 'Zurücksetzen')}</span></button>
        <button type="button" onClick={onReplace} title={tr('Másik fotó', 'Anderes Foto')}><ImagePlus size={16} /><span>Csere</span></button>
        <button type="button" className="is-danger" onClick={onDelete} title={tr('Fotó törlése', 'Foto löschen')}><Trash2 size={16} /><span>{tr('Törlés', 'Löschen')}</span></button>
        <button type="button" className="is-primary" onClick={onDone} title={tr('Vissza a 3D jelenetbe (a fotó megmarad)', 'Zurück zur 3D-Szene (Foto bleibt)')}><Check size={16} /><span>{tr('Kész', 'Fertig')}</span></button>
      </div>
    </div>
  </div>
}
