import { useEffect, useState } from 'react'
import { applySwUpdate, onSwUpdate } from '@/lib/swClient'

/** „Új verzió elérhető – frissítés”: a már futó munkamenetet nem szakítja meg, csak koppintásra tölt újra. */
export default function SwUpdateBanner() {
  const [waiting, setWaiting] = useState(false)
  const [later, setLater] = useState(false)
  useEffect(() => onSwUpdate((worker) => setWaiting(worker !== null)), [])
  if (!waiting || later) return null
  return <div className="sw-update" role="status">
    <span>Új verzió elérhető</span>
    <button type="button" onClick={applySwUpdate}>Frissítés</button>
    <button type="button" className="sw-update-later" onClick={() => setLater(true)}>Később</button>
  </div>
}
