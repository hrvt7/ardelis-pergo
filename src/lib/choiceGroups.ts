import type { RoofType, SideType } from '../types/pergola'
import { tr } from '../i18n/locale'

/** A saját 3D-nkből renderelt bélyegkép (public/assets/thumbs, antracit váz, stúdió háttér). */
export const thumbFor = (kind: 'side' | 'roof', id: string) => `/assets/thumbs/${kind}_${id}.webp`

/** Oldalzárások csoportjai: nyitott / árnyékoló, üveg, lamella / léc. */
export const sideGroup = (type: SideType) => type === 'none' || type === 'zip' ? tr('Nyitott / árnyékoló', 'Offen / Beschattung') : type === 'louver' || type === 'slatAlu' || type === 'slatWood' ? tr('Lamella / léc', 'Lamellen / Latten') : tr('Üveg', 'Glas')
export const SIDE_GROUPS = () => [tr('Nyitott / árnyékoló', 'Offen / Beschattung'), tr('Üveg', 'Glas'), tr('Lamella / léc', 'Lamellen / Latten')]

/** Tetők csoportjai: mozgatható (lamella, eltolható, ponyva) és fix fedés. */
export const roofGroup = (roof: RoofType) => roof === 'louvered' || roof === 'retractable' || roof === 'fabric' ? tr('Mozgatható tető', 'Bewegliches Dach') : tr('Fix fedés', 'Feste Eindeckung')
export const ROOF_GROUPS = () => [tr('Mozgatható tető', 'Bewegliches Dach'), tr('Fix fedés', 'Feste Eindeckung')]
