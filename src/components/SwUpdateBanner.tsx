import { useEffect, useState } from 'react'
import { RefreshCw, Sparkles, X } from 'lucide-react'
import { applySwUpdate, onSwUpdate } from '@/lib/swClient'
import { useIntroDone } from '@/lib/introGate'

/** A nyitó animáció után ennyivel jelenik meg (hogy ne a betöltés pillanatában ugorjon be). */
const SHOW_DELAY_MS = 700
const LEAVE_MS = 320

/**
 * „Új verzió elérhető”: felülről beugró, animált kártya a fejléc alatt (a lenti kalkulációs sávot nem takarja).
 * A futó munkamenetet nem szakítja meg: csak a Frissítés gombra tölt újra (a konfiguráció a böngészőben megmarad).
 */
export default function SwUpdateBanner() {
  const [waiting, setWaiting] = useState(false)
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [updating, setUpdating] = useState(false)
  const introDone = useIntroDone()
  useEffect(() => onSwUpdate((worker) => setWaiting(worker !== null)), [])
  useEffect(() => {
    if (!waiting || !introDone || dismissed) return
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [waiting, introDone, dismissed])
  if (!visible || dismissed) return null
  const later = () => { setLeaving(true); window.setTimeout(() => setDismissed(true), LEAVE_MS) }
  const update = () => { setUpdating(true); applySwUpdate() }
  return <div className={`update-pop${leaving ? ' is-leaving' : ''}${updating ? ' is-updating' : ''}`} role="status" aria-live="polite">
    <span className="update-pop-icon" aria-hidden="true"><Sparkles size={18} strokeWidth={1.8} /></span>
    <span className="update-pop-text">
      <strong>Új verzió elérhető</strong>
      <small>Pár másodperc, a konfiguráció megmarad.</small>
    </span>
    <button type="button" className="update-pop-go" onClick={update} disabled={updating}>
      <RefreshCw size={15} strokeWidth={2.2} aria-hidden="true" />{updating ? 'Frissítés…' : 'Frissítés'}
    </button>
    <button type="button" className="update-pop-close" onClick={later} aria-label="Később" disabled={updating}><X size={16} /></button>
  </div>
}
