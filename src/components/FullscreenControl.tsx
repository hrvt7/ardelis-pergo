import { useEffect, useState } from 'react'
import { Maximize2, Minimize2, Share, X } from 'lucide-react'
import { tr } from '../i18n/locale'

const HINT_KEY = 'lamelix-fs-hint'
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const isIPhone = () => /iPhone|iPod/.test(navigator.userAgent)

/** Teljes képernyő: ahol a böngésző engedi (Android, iPad, asztal), gomb; iPhone-on a kezdőképernyőre tétel súgója. */
export default function FullscreenControl() {
  const [full, setFull] = useState(false)
  const [hint, setHint] = useState(false)
  const canFull = typeof document.documentElement.requestFullscreen === 'function' && document.fullscreenEnabled
  useEffect(() => {
    const sync = () => setFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  if (typeof window === 'undefined' || isStandalone()) return null
  const toggle = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined) }
  if (canFull) return <button type="button" className="fs-button" aria-label={full ? tr('Kilépés a teljes képernyőből', 'Vollbild beenden') : tr('Teljes képernyő', 'Vollbild')} title={full ? tr('Kilépés a teljes képernyőből', 'Vollbild beenden') : tr('Teljes képernyő', 'Vollbild')} onClick={toggle}>{full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
  if (!isIPhone()) return null
  let dismissed = false
  try { dismissed = localStorage.getItem(HINT_KEY) === '1' } catch { /* nincs tárhely */ }
  return <>
    <button type="button" className="fs-button" aria-label={tr('Teljes képernyő: hogyan?', 'Vollbild: wie?')} title={tr('Teljes képernyő', 'Vollbild')} onClick={() => setHint(true)}><Maximize2 size={17} /></button>
    {(hint || !dismissed) && hint && <div className="fs-hint" role="dialog" aria-label={tr('Teljes képernyős használat', 'Vollbild-Nutzung')}>
      <button type="button" className="fs-hint-close" aria-label={tr('Bezárás', 'Schließen')} onClick={() => { setHint(false); try { localStorage.setItem(HINT_KEY, '1') } catch { /* nincs tárhely */ } }}><X size={16} /></button>
      <strong>{tr('Teljes képernyőn, böngészősáv nélkül', 'Im Vollbild, ohne Browserleiste')}</strong>
      <p>{tr('Safariban koppints a', 'Tippen Sie in Safari auf die')} <Share size={14} /> {tr('Megosztás gombra, majd', 'Teilen-Schaltfläche, dann')} <b>{tr('Hozzáadás a kezdőképernyőhöz', 'Zum Home-Bildschirm')}</b>{tr('. Az így létrejött Lamelix ikon teljes képernyőn nyílik meg, fekvő tájolásban is.', '. Das so erstellte Lamelix-Symbol öffnet im Vollbild, auch im Querformat.')}</p>
    </div>}
  </>
}
