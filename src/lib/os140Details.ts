// A 3D „Műszaki jelölések” kártyái a forgólamellás tetőnél: Aluprof MB-OpenSky 140 gyári CAD-rajzai (profilok,
// cikkszámok, metszetből mért osztás) és a gyári mintaprojekt (2023-03-14) mérethatárai. Ami ezekben nincs
// (terhelés: a források ellentmondanak; motoradatok), azt a kártya nem állítja. Tiszta függvény, tesztelhető.
import type { PergolaConfig } from '../types/pergola'
import { bayWidth, moduleCount } from './modules'
import { OS140, os140Count } from './os140'

export type Os140DetailId = 'louvre' | 'drive' | 'frame' | 'post' | 'water' | 'limits' | 'led'

export interface Os140Detail {
  id: Os140DetailId
  title: string
  rows: [string, string][]
  note?: string
}

export const OS140_SOURCE = 'Forrás: Aluprof MB-OpenSky 140 gyári CAD-rajzai és mintaprojektje (referenciarendszer). A végleges adatokat a gyártó ajánlata rögzíti.'

const mm = (meters: number) => `${Math.round(meters * 1000)} mm`

export function os140Details(config: Pick<PergolaConfig, 'width' | 'depth' | 'height' | 'modules' | 'led'>): Os140Detail[] {
  const count = os140Count(bayWidth(config as PergolaConfig), config.depth, moduleCount(config as PergolaConfig))
  const details: Os140Detail[] = [
    {
      id: 'louvre',
      title: 'Forgólamella 223 × 43,6 mm',
      rows: [
        ['Profil', 'K440565X, 223 × 43,6 mm'],
        ['Osztás', `${Math.round(OS140.pitch * 1000)} mm tengelytáv`],
        ['Ebben a tervben', count.spans > 1 ? `${count.spans} × ${count.perSpan} db, ${mm(count.length)} hosszú` : `${count.perSpan} db, ${mm(count.length)} hosszú`],
        ['Forgás', `0–${OS140.maxAngle}°, fokozatmentes`],
      ],
      note: 'A lamellahossz a gerendák belső síkja közti távolság mínusz 2 × 8 mm (becsült hézag).',
    },
    {
      id: 'drive',
      title: 'Rejtett hajtás',
      rows: [
        ['Motor', 'a gerendában, kívülről nem látszik'],
        ['Vezérlés', 'a gyártó ajánlata szerint'],
      ],
    },
    {
      id: 'frame',
      title: 'Gerenda 140 × 255 mm',
      rows: [
        ['Szélső gerenda', 'K440141X + K440142X takaróprofil'],
        ['Közbenső gerenda', 'K440139X, kétkamrás'],
        ['Tengely', `${Math.round(OS140.axleDown * 1000)} mm-rel a gerenda teteje alatt`],
      ],
    },
    {
      id: 'post',
      title: 'Oszlop 140 × 140 mm',
      rows: [
        ['Profil', 'K440137X'],
        ['Talp', 'rejtett'],
        ['Alapozás', 'statikai számítás szerint'],
      ],
    },
    {
      id: 'water',
      title: 'Vízelvezetés ereszen és oszlopon át',
      rows: [
        ['Eresz', 'K440138X, 90 × 96 mm, a lamellavégek alatt'],
        ['Levezetés', 'az oszlop belsejében'],
      ],
    },
    {
      id: 'limits',
      title: 'Mérethatárok (egyhajós)',
      rows: [
        ['Lamellafesztáv', `legfeljebb ${String(OS140.maxSpan).replace('.', ',')} m`],
        ['Hosszúság', `legfeljebb ${String(OS140.maxLength).replace('.', ',')} m`],
        ['Magasság', `legfeljebb ${String(OS140.maxHeight).replace('.', ',')} m`],
      ],
      note: 'Hó- és szélterhelést a gyártó statikai számítása adja meg.',
    },
  ]
  if (config.led) details.push({ id: 'led', title: 'LED-világítás', rows: [['Kivitel', 'a lamellákban és körben (gyártói opció)']] })
  return details
}
