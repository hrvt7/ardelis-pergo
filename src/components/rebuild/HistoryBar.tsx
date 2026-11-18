import { Redo2, RotateCcw, Undo2 } from 'lucide-react'
import { tr } from '@/i18n/locale'
import LiquidGlass from './LiquidGlass'

/**
 * Visszavonás, újra, alaphelyzet (M04) az új felületen: kis folyékony üveg sáv a jelenet sarkában
 * (asztalon bal felül, telefonon és tableten jobb felül, ahol a bal oldali sín nem foglalja a helyet).
 * Ugyanazt a történetet használja, mint a Ctrl+Z / Ctrl+Y; az alaphelyzet megerősítést kér.
 */
export default function HistoryBar({ canUndo, canRedo, onUndo, onRedo, onReset, compact }: { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void; onReset: () => void; compact: boolean }) {
  return (
    <LiquidGlass as="nav" className={`rb-history${compact ? ' is-compact' : ''}`} radius={22} bezel={10} blur={12} aria-label={tr('Előzmények', 'Verlauf')}>
      <button type="button" onClick={onUndo} disabled={!canUndo} aria-label={tr('Visszavonás', 'Rückgängig')} title={tr('Visszavonás (Ctrl+Z)', 'Rückgängig (Strg+Z)')}><Undo2 size={18} strokeWidth={1.8} /></button>
      <button type="button" onClick={onRedo} disabled={!canRedo} aria-label={tr('Újra', 'Wiederholen')} title={tr('Újra (Ctrl+Y)', 'Wiederholen (Strg+Y)')}><Redo2 size={18} strokeWidth={1.8} /></button>
      <span className="rb-history-sep" aria-hidden="true" />
      <button type="button" onClick={onReset} aria-label={tr('Alaphelyzet', 'Zurücksetzen')} title={tr('Alaphelyzet: a gyártó kiinduló terve', 'Zurücksetzen auf den Ausgangsentwurf')}><RotateCcw size={17} strokeWidth={1.8} />{!compact && <span>{tr('Alaphelyzet', 'Zurücksetzen')}</span>}</button>
    </LiquidGlass>
  )
}
