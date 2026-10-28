// Tolóüveg-fal paneljei. Mindig páros számú panel: minden mozgó üveg egy mellette álló
// fix panel mögé tolódik, így nyitva sem lóg ki a keretből (páratlan számnál kilógott).
export function glassPanels(length: number) {
  const count = Math.max(2, 2 * Math.round(length / 2.24))
  const width = (length - 0.12) / count
  const base = (index: number) => -length / 2 + 0.06 + width * (index + 0.5)
  /** A panel közepének x helyzete; nyitva a páros indexűek a jobb oldali szomszéd mögé csúsznak. */
  const position = (index: number, opened: boolean) => base(index) + (opened && index % 2 === 0 ? width * 0.88 : 0)
  return { count, width, position }
}
