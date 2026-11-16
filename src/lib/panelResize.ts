// A beállítópanel szélessége húzással állítható (asztali és fekvő telefonos nézetben).
// A választott szélesség böngészőnként megmarad; dupla kattintás / dupla koppintás visszaállítja az alapot.

export const PANEL_WIDTH_KEY = 'lamelix-panel-width'
export type PanelLayout = 'desktop' | 'landscape-phone'

/** Az alap szélesség: asztalon a CSS töréspontjai (420/380/344), fekvő telefonon a szélesség 42%-a, 300–380 px között. */
export function defaultPanelWidth(layout: PanelLayout, viewportWidth: number): number {
  if (layout === 'landscape-phone') return Math.round(Math.min(380, Math.max(300, viewportWidth * 0.42)))
  if (viewportWidth <= 1020) return 344
  if (viewportWidth <= 1280) return 380
  return 420
}

/** A megengedett tartomány: a 3D nézetnek mindig maradjon legalább 40% (fekvő telefonon) / 50% (asztalon). */
export function panelWidthRange(layout: PanelLayout, viewportWidth: number): { min: number; max: number } {
  if (layout === 'landscape-phone') return { min: 260, max: Math.max(260, Math.min(520, Math.round(viewportWidth * 0.6))) }
  return { min: 320, max: Math.max(320, Math.min(640, Math.round(viewportWidth * 0.5))) }
}

export function clampPanelWidth(width: number, layout: PanelLayout, viewportWidth: number): number {
  const { min, max } = panelWidthRange(layout, viewportWidth)
  return Math.round(Math.min(max, Math.max(min, Number.isFinite(width) ? width : min)))
}

/** A tárolt érték elrendezésenként külön: „desktop:420;landscape-phone:330”. */
export function readStoredWidths(raw: string | null): Partial<Record<PanelLayout, number>> {
  const result: Partial<Record<PanelLayout, number>> = {}
  for (const part of (raw ?? '').split(';')) {
    const [key, value] = part.split(':')
    const width = Number(value)
    if ((key === 'desktop' || key === 'landscape-phone') && Number.isFinite(width) && width > 0) result[key] = width
  }
  return result
}

export function writeStoredWidths(widths: Partial<Record<PanelLayout, number>>): string {
  return (Object.entries(widths) as [PanelLayout, number][]).map(([key, value]) => `${key}:${Math.round(value)}`).join(';')
}
