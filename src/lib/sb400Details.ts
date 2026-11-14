// A 3D „Műszaki jelölések” kártyáinak tartalma a forgólamellás tetőnél: az SB 400 referenciarendszer nyilvános
// gyári dokumentációjából („Pergola – Technische Informationen”, SB 400 fejezet, és az SB 400 szerelési útmutató,
// 7. kiadás, 2023. február). Minden érték onnan származik vagy a terv méreteiből számolt (darabszám, hossz).
// Tiszta függvény (nincs three.js / React), hogy tesztelhető legyen. Ha egy gyártó más rendszert forgalmaz,
// ezeket az adatokat a saját adatlapjából kell megadni – a kártya ezért mindig kiírja a forrást.
import type { PergolaConfig } from '../types/pergola'
import { LOUVRE, louvreLayout } from './louvreSystem'
import { bayWidth, moduleCount } from './modules'
import { SB400, sb400LouvreLength } from './sb400'

export type Sb400DetailId = 'louvre' | 'drive' | 'frame' | 'post' | 'water' | 'load' | 'led'

export interface Sb400Detail {
  id: Sb400DetailId
  title: string
  /** [megnevezés, érték] sorok */
  rows: [string, string][]
  note?: string
}

export const SB400_SOURCE = 'Forrás: SB 400 gyári műszaki adatlap (referenciarendszer). A végleges adatokat a gyártó ajánlata rögzíti.'

const mm = (meters: number) => `${Math.round(meters * 1000)} mm`

/** A terv lamellaszáma és lamellahossza (mezőnként), ugyanazzal a számítással, mint a 3D jelenet. */
export function sb400LouvreCount(config: Pick<PergolaConfig, 'width' | 'depth' | 'height' | 'modules'>) {
  const bay = bayWidth(config as PergolaConfig)
  const layout = louvreLayout(bay, config.depth, SB400.strutW, config.height + SB400.strutH / 2, SB400.endGap)
  const bays = moduleCount(config as PergolaConfig)
  return { perBay: layout.z.length, bays, total: layout.z.length * bays, length: sb400LouvreLength(bay) }
}

export function sb400Details(config: Pick<PergolaConfig, 'width' | 'depth' | 'height' | 'modules' | 'led'>): Sb400Detail[] {
  const count = sb400LouvreCount(config)
  const details: Sb400Detail[] = [
    {
      id: 'louvre',
      title: 'Forgólamella 216 × 40 mm',
      rows: [
        ['Profil', '215,8 × 39,8 mm, EN AW-6063 T66'],
        ['Tömeg', '3,66 kg/m'],
        ['Osztás', `${Math.round(LOUVRE.pitch * 1000)} mm tengelytáv`],
        ['Ebben a tervben', count.bays > 1 ? `${count.bays} × ${count.perBay} db, ${mm(count.length)} hosszú` : `${count.perBay} db, ${mm(count.length)} hosszú`],
        ['Vízcsatorna', 'a lamellában, ø36 mm'],
      ],
      note: 'A lamella hossza a mező befoglaló szélessége mínusz 210 mm.',
    },
    {
      id: 'drive',
      title: 'Lamellahajtás lineáris motorral',
      rows: [
        ['230 V motor', 'ELERO Picolo XL · 1200 N · 126 W · IP65'],
        ['24 V motor', '600 N · 24 W · IP67'],
        ['Forgástartomány', '0–90° (230 V), kb. 0–120° (24 V)'],
        ['Hajtórúd', '20 × 20 × 2 mm, minden lamellát együtt mozgat'],
        ['Löket', 'legfeljebb 200 mm (230 V) / 300 mm (24 V)'],
      ],
    },
    {
      id: 'frame',
      title: 'Gerenda 85 × 212 mm',
      rows: [
        ['Anyag', 'extrudált alumínium, EN AW-6060 T66'],
        ['Tömeg', '6,48 kg/m'],
        ['Modul legfeljebb', '4000 mm széles, 7000 mm kinyúlás'],
        ['Szerkezeti magasság', 'legfeljebb 3012 mm (2800 mm átjáró)'],
        ['Mérettűrés', '±10 mm a befoglaló méreteken'],
      ],
    },
    {
      id: 'post',
      title: 'Oszlop 85 × 150 mm és talp',
      rows: [
        ['Oszlop', 'EN AW-6060 T66, 4,83 kg/m'],
        ['Talplemez', '8 mm alumínium (EN AW-5754), ø14,2 furatok'],
        ['Rögzítés', 'M12 horgony (8.8 vagy A4), nem a csomag része'],
        ['Alap', 'legalább 450 × 450 mm, 700 mm mély, C20/25 beton'],
        ['Állíthatóság', 'magasságban legfeljebb 40 mm (állítható oszloppal)'],
      ],
      note: 'A talplemez típustól függően túlnyúlhat a szerkezet körvonalán.',
    },
    {
      id: 'water',
      title: 'Vízelvezetés ereszen és oszlopon át',
      rows: [
        ['Lamella esése', '20 mm a motortól a csapágyoldal felé'],
        ['Eresz', '91,6 × 75 mm, a gerenda belső oldalán'],
        ['Kiosztás', '2 hosszanti vagy 4 körbefutó eresz'],
        ['Levezetés', 'az oszlop belsejében, legalább 2 oszlopon'],
        ['Teljesítmény', '0,04 l/s/m² esőig, legfeljebb 5,3 percig'],
      ],
    },
    {
      id: 'load',
      title: 'Hó- és szélterhelés',
      rows: [
        ['Hóteher', 'legfeljebb 50 kg/m² (kb. 50 cm friss hó)'],
        ['Szélállóság', '6. osztály (EN 13659), 400 Pa'],
        ['Nyitott lamellák', '45 km/h szélig maradhatnak nyitva'],
        ['Tartószerkezet', 'EN 1090-1, EXC2 kivitelezési osztály'],
      ],
    },
  ]
  if (config.led) details.push({
    id: 'led',
    title: 'LED-világítás 24 V',
    rows: [
      ['Ereszben', 'LED-szalag, 4000–4500 K'],
      ['Lamellában', 'LED-pontok, 3300 K, 4–12 db'],
      ['Tápegység', '24 V DC · 150 W · IP66, az oszlopban'],
    ],
  })
  return details
}
