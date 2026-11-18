import type { ConfigStep } from '@/types/pergola'
import { localized, tr } from '../i18n/locale'

/**
 * Az újraépített konfigurátor lépései (docs/rebuild/STEP_ARCHITECTURE.md). Az azonosítók a meglévő
 * `ConfigStep` értékek, így minden meglévő logika (kamera, szabályok) változatlanul használható.
 */
export const REBUILD_STEPS: { id: ConfigStep; label: string; short: string; question: string }[] = localized(() => ([
  { id: 'size', label: tr('Termék', 'Produkt'), short: tr('Termék', 'Produkt'), question: tr('Mit építesz?', 'Was bauen Sie?') },
  { id: 'mount', label: tr('Hely és méret', 'Ort und Größe'), short: tr('Méret', 'Größe'), question: tr('Hová kerül és mekkora?', 'Wohin und wie groß?') },
  { id: 'roof', label: tr('Tető', 'Dach'), short: tr('Tető', 'Dach'), question: tr('Milyen tető legyen?', 'Welches Dach?') },
  { id: 'sides', label: tr('Oldalak', 'Seiten'), short: tr('Oldalak', 'Seiten'), question: tr('Mi zárja az oldalakat?', 'Was schließt die Seiten?') },
  { id: 'color', label: tr('Szín', 'Farbe'), short: tr('Szín', 'Farbe'), question: tr('Milyen színű legyen?', 'Welche Farbe?') },
  { id: 'extras', label: tr('Komfort', 'Komfort'), short: tr('Komfort', 'Komfort'), question: tr('Mivel használod kényelmesebben?', 'Was macht es komfortabler?') },
  { id: 'summary', label: tr('Összegzés', 'Übersicht'), short: tr('Összegzés', 'Übersicht'), question: tr('Ez lesz a terved', 'Das ist Ihr Entwurf') },
]))

export function rebuildStepIndex(step: ConfigStep): number {
  return Math.max(0, REBUILD_STEPS.findIndex((item) => item.id === step))
}

/** A szomszédos lépés (a lépéssáv végein nem lép túl). */
export function neighbourStep(step: ConfigStep, direction: 1 | -1): ConfigStep | null {
  return REBUILD_STEPS[rebuildStepIndex(step) + direction]?.id ?? null
}

export interface NotchGeometry {
  /** a sáv magassága */
  height: number
  /** a sarkok lekerekítése */
  corner: number
  /** a bemélyedés sugara (az aktív kör sugara + hézag) */
  notch: number
  /** a bemélyedés vállának szélessége (a lágy átmenet) */
  shoulder: number
  /** a bemélyedés ívének középpontja a sáv tetejétől */
  dip: number
}

export const NOTCH_DESKTOP: NotchGeometry = { height: 64, corner: 18, notch: 31, shoulder: 12, dip: 10 }
export const NOTCH_COMPACT: NotchGeometry = { height: 58, corner: 16, notch: 27, shoulder: 9, dip: 9 }

/** A bemélyedés középpontja a sávon belül maradjon (a vállak ne lógjanak a sarkokba). */
export function clampNotch(x: number, width: number, g: NotchGeometry): number {
  const edge = g.corner + g.notch + g.shoulder
  return Math.min(width - edge, Math.max(edge, x))
}

const r = (value: number) => Math.round(value * 100) / 100

/**
 * A lépéssáv körvonala: lekerekített téglalap, a tetején az `x` helyen lágy vállú, félkör alakú bemélyedéssel,
 * amelyben az aktív lépés köre ül (Ádám 01-es mintája). `vertical`: ugyanez függőlegesen, a bemélyedés a bal
 * oldalon (a kártya jobb szélére tapadó lépéssínhez); ilyenkor az `x` a függőleges hely.
 */
export function notchPath(width: number, x: number, g: NotchGeometry, vertical = false): string {
  const { height: h, corner: c, notch: n, shoulder: s, dip: d } = g
  const cx = clampNotch(x, width, g)
  // Függőlegesen a két koordináta helyet cserél (tükrözés az átlóra), ezért az ív iránya is megfordul.
  const p = (a: number, b: number) => (vertical ? `${r(b)} ${r(a)}` : `${r(a)} ${r(b)}`)
  const sweep = vertical ? 1 : 0
  return [
    `M ${p(c, 0)}`,
    `L ${p(cx - n - s, 0)}`,
    `C ${p(cx - n - s / 3, 0)} ${p(cx - n, d * 0.4)} ${p(cx - n, d)}`,
    `A ${n} ${n} 0 0 ${sweep} ${p(cx + n, d)}`,
    `C ${p(cx + n, d * 0.4)} ${p(cx + n + s / 3, 0)} ${p(cx + n + s, 0)}`,
    `L ${p(width - c, 0)}`,
    `Q ${p(width, 0)} ${p(width, c)}`,
    `L ${p(width, h - c)}`,
    `Q ${p(width, h)} ${p(width - c, h)}`,
    `L ${p(c, h)}`,
    `Q ${p(0, h)} ${p(0, h - c)}`,
    `L ${p(0, c)}`,
    `Q ${p(0, 0)} ${p(c, 0)}`,
    'Z',
  ].join(' ')
}

/** Az i-edik lépés középpontja a sávon (egyenlő rések, a két szélen `pad` belső margóval). */
export function slotCenter(index: number, count: number, width: number, pad: number): number {
  const slot = (width - pad * 2) / count
  return pad + slot * (index + 0.5)
}

/** A legkisebb belső margó, amellyel a szélső lépések is pontosan a bemélyedésbe kerülnek. */
export function notchPad(width: number, count: number, g: NotchGeometry, min = 16): number {
  const edge = g.corner + g.notch + g.shoulder
  return Math.max(min, Math.ceil(((edge - width / (2 * count)) * count) / (count - 1)))
}

/** A felső dokk alakja: a kártya felső széléhez lágy, homorú ívvel „olvadó” sáv, alul lekerekítve. */
export function dockPath(width: number, height: number, fillet: number, radius: number): string {
  const f = fillet
  const w = width
  const h = height
  return [
    `M ${-f} 0`,
    `L ${w + f} 0`,
    `A ${f} ${f} 0 0 0 ${w} ${f}`,
    `L ${w} ${h - radius}`,
    `Q ${w} ${h} ${w - radius} ${h}`,
    `L ${radius} ${h}`,
    `Q 0 ${h} 0 ${h - radius}`,
    `L 0 ${f}`,
    `A ${f} ${f} 0 0 0 ${-f} 0`,
    'Z',
  ].join(' ')
}
