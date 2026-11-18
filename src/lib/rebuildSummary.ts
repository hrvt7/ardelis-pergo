import type { ConfigStep, PergolaConfig, SideKey } from '@/types/pergola'
import type { Tenant } from '@/tenants/types'
import { BUILDING_INFO } from './buildings'
import { MOUNT_LABELS, isWallSide } from './mount'
import { SIDE_LABELS } from './sides'
import { describeColor, roofPartName } from './colors'
import { effectiveGlazing, GLAZING_INFO, glazingOptions } from './roofs'
import { formatNumber } from './pricing'
import { tr } from '../i18n/locale'

/** Az összegzés „mit választottál” sorai: lépésenként a lényeg, és egy kattintással vissza a lépésre (BMW/Porsche-minta). */
export function summaryRows(config: PergolaConfig, tenant: Pick<Tenant, 'colors' | 'roofs'>): { step: ConfigStep; title: string; value: string }[] {
  const names: Record<SideKey, string> = { front: tr('elöl', 'vorne'), back: tr('hátul', 'hinten'), left: tr('bal', 'links'), right: tr('jobb', 'rechts') }
  const closed = (['front', 'left', 'right', 'back'] as SideKey[]).filter((side) => !isWallSide(config.mount, side) && (config.sides[side] !== 'none' || config.split?.[side]))
  const frame = describeColor(tenant, config.frameColor, config.customRal)
  const roofColor = config.roofColor ? describeColor(tenant, config.roofColor, config.roofRal) : null
  const extras = [
    config.led && (config.ledRgb ? tr('RGB+W LED', 'RGB+W-LED') : 'LED'),
    config.speakers && tr('hangrendszer', 'Soundsystem'),
    config.heaters > 0 && `${config.heaters} ${tr('fűtőpanel', 'Heizstrahler')}`,
    (config.fans ?? 0) > 0 && `${config.fans} ${tr('ventilátor', 'Ventilator')}`,
    config.sensors && tr('eső- és szélszenzor', 'Regen-/Windsensor'),
    config.smartHome && tr('okosotthon', 'Smart Home'),
  ].filter(Boolean) as string[]
  const glazingId = effectiveGlazing(config)
  const glazing = glazingOptions(config.roof).length && glazingId ? ` · ${GLAZING_INFO[glazingId].label.toLowerCase()}` : ''
  return [
    { step: 'size', title: tr('Termék', 'Produkt'), value: BUILDING_INFO[config.building ?? 'pergola'].label },
    { step: 'mount', title: tr('Méret', 'Größe'), value: `${MOUNT_LABELS[config.mount]} · ${formatNumber(config.width, 2)} × ${formatNumber(config.depth, 2)} m, ${formatNumber(config.height, 2)} m ${tr('magas', 'hoch')}` },
    { step: 'roof', title: tr('Tető', 'Dach'), value: `${tenant.roofs[config.roof]?.name ?? config.roof}${glazing}${(config.pitch ?? 0) > 0 ? ` · ${config.pitch}° ${tr('dőlés', 'Neigung')}` : ''}` },
    { step: 'sides', title: tr('Oldalak', 'Seiten'), value: closed.length ? closed.map((side) => `${names[side]}: ${SIDE_LABELS[config.sides[side]].toLowerCase()}${config.split?.[side] ? ` + ${SIDE_LABELS[config.split[side]!].toLowerCase()}` : ''}`).join(' · ') : tr('Minden oldal nyitott', 'Alle Seiten offen') },
    { step: 'color', title: tr('Szín', 'Farbe'), value: roofColor ? `${frame.name} ${tr('váz', 'Rahmen')} + ${roofColor.name.toLowerCase()} ${roofPartName(config.roof).toLowerCase()}` : frame.name },
    { step: 'extras', title: tr('Komfort', 'Komfort'), value: extras.length ? extras.join(' · ') : tr('Nincs kiegészítő', 'Keine Extras') },
  ]
}

