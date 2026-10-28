// „Nézd meg a kertedben” — kiterjesztett valóság (AR).
//
// - iPhone/iPad: Apple AR Quick Look (a model-viewer a GLB-ből USDZ-t készít)
// - Android: WebXR (ARCore-képes Chrome)
// - Asztali gép vagy nem támogatott telefon: QR-kód, amellyel ugyanez a
//   konfiguráció telefonon nyílik meg, és onnan indítható az AR.
//
// A pergola valós méretben jelenik meg (ar-scale="fixed"), a talajra helyezve.
import { useEffect, useRef, useState } from 'react'
import { ExternalLink, LoaderCircle, Rotate3d, Smartphone } from 'lucide-react'
import QRCode from 'qrcode'
import { Modal } from '@/components/Dialogs'
import { exportPergolaGlb } from '@/lib/arExport'
import { getActiveScene } from '@/lib/sceneRegistry'

const MODEL_VIEWER_SRC = '/vendor/model-viewer-4.4.0.min.js'

type Phase = 'checking' | 'preparing' | 'ready' | 'launching' | 'qr' | 'error'
type ModelViewerElement = HTMLElement & { canActivateAR?: boolean; activateAR?: () => Promise<void> }

let modelViewerPromise: Promise<void> | null = null
function loadModelViewer() {
  if (customElements.get('model-viewer')) return Promise.resolve()
  if (!modelViewerPromise) {
    modelViewerPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.type = 'module'
      script.src = MODEL_VIEWER_SRC
      script.onerror = () => { modelViewerPromise = null; reject(new Error('Az AR-modul nem töltődött be.')) }
      document.head.appendChild(script)
      customElements.whenDefined('model-viewer').then(() => resolve(), reject)
    })
  }
  return modelViewerPromise
}

async function detectArSupport(): Promise<'quick-look' | 'webxr' | null> {
  try {
    const anchor = document.createElement('a')
    if (anchor.relList?.supports?.('ar')) return 'quick-look'
  } catch { /* régi böngésző */ }
  try {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported: (mode: string) => Promise<boolean> } }).xr
    if (xr && await xr.isSessionSupported('immersive-ar')) return 'webxr'
  } catch { /* nincs WebXR */ }
  return null
}

async function waitForModel(timeoutMs = 20000) {
  const started = Date.now()
  while (!getActiveScene()?.getObjectByName('pergola-model')) {
    if (Date.now() - started > timeoutMs) throw new Error('A 3D modell még nem töltődött be.')
    await new Promise((resolve) => window.setTimeout(resolve, 250))
  }
}

export default function ArDialog({ shareUrl, onClose }: { shareUrl: string; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [mode, setMode] = useState<'quick-look' | 'webxr' | null>(null)
  const [message, setMessage] = useState('')
  const [qr, setQr] = useState('')
  const host = useRef<HTMLDivElement>(null)
  const viewer = useRef<ModelViewerElement | null>(null)

  useEffect(() => {
    let cancelled = false
    let blobUrl = ''
    const showQr = async (note = '') => {
      try {
        const image = await QRCode.toDataURL(shareUrl, { margin: 1, width: 440, errorCorrectionLevel: 'M', color: { dark: '#111517', light: '#ffffff' } })
        if (!cancelled) { setQr(image); setMessage(note); setPhase('qr') }
      } catch {
        if (!cancelled) { setMessage(note); setPhase('qr') }
      }
    }
    ;(async () => {
      const support = await detectArSupport()
      if (cancelled) return
      setMode(support)
      if (!support) { await showQr(); return }
      setPhase('preparing')
      try {
        await waitForModel()
        const [blob] = await Promise.all([exportPergolaGlb(), loadModelViewer()])
        if (cancelled) return
        blobUrl = URL.createObjectURL(blob)
        const element = document.createElement('model-viewer') as ModelViewerElement
        element.setAttribute('src', blobUrl)
        element.setAttribute('alt', 'A konfigurált pergola valós méretben')
        element.setAttribute('ar', '')
        element.setAttribute('ar-modes', 'webxr quick-look')
        element.setAttribute('ar-scale', 'fixed')
        element.setAttribute('ar-placement', 'floor')
        element.setAttribute('camera-controls', '')
        element.setAttribute('touch-action', 'pan-y')
        element.setAttribute('shadow-intensity', '1')
        element.setAttribute('environment-image', 'neutral')
        element.setAttribute('loading', 'eager')
        element.style.cssText = 'width:100%;height:260px;border-radius:8px;background:rgba(255,255,255,.04);--poster-color:transparent'
        // A model-viewer saját AR-gombját elrejtjük; a mienket használjuk.
        const hiddenButton = document.createElement('span')
        hiddenButton.setAttribute('slot', 'ar-button')
        hiddenButton.style.display = 'none'
        element.appendChild(hiddenButton)
        element.addEventListener('load', () => {
          if (cancelled) return
          if (element.canActivateAR) setPhase('ready')
          else void showQr('Ezen az eszközön a böngésző nem engedi az AR-t. Nyisd meg a linket Safariban (iPhone) vagy Chrome-ban (Android).')
        })
        element.addEventListener('error', () => { if (!cancelled) { setMessage('A modell nem töltődött be.'); setPhase('error') } })
        element.addEventListener('ar-status', (event) => {
          const status = (event as CustomEvent<{ status: string }>).detail?.status
          if (status === 'failed' && !cancelled) { setMessage('Az AR nem indult el. Próbáld újra, vagy nyisd meg a linket egy másik böngészőben.'); setPhase('ready') }
          if ((status === 'session-started' || status === 'object-placed') && !cancelled) setPhase('ready')
        })
        viewer.current = element
        host.current?.replaceChildren(element)
      } catch (error) {
        if (!cancelled) { setMessage(error instanceof Error ? error.message : 'Az AR előkészítése nem sikerült.'); setPhase('error') }
      }
    })()
    return () => {
      cancelled = true
      viewer.current?.remove()
      viewer.current = null
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [shareUrl])

  const launch = async () => {
    const element = viewer.current
    if (!element?.activateAR) return
    setMessage('')
    setPhase('launching')
    try {
      await element.activateAR()
    } catch {
      setMessage('Az AR nem indult el. Próbáld újra.')
    } finally {
      window.setTimeout(() => setPhase((current) => current === 'launching' ? 'ready' : current), 2500)
    }
  }

  return (
    <Modal title="Nézd meg a kertedben" eyebrow="KITERJESZTETT VALÓSÁG · AR" onClose={onClose} className="ar-modal">
      {(phase === 'checking' || phase === 'preparing' || phase === 'ready' || phase === 'launching') && <>
        <p className="modal-intro">A pergola valós méretben jelenik meg a telefonod kameraképén. Irányítsd a kamerát a teraszra, várd meg, amíg felismeri a talajt, majd helyezd el a szerkezetet.{mode === 'quick-look' && ' iPhone-on a jobb felső sarokban lévő gombbal fotót is készíthetsz.'}</p>
        <div ref={host} aria-live="polite" style={{ minHeight: 260, display: 'grid', placeItems: 'center' }}>
          {phase !== 'ready' && phase !== 'launching' && <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', color: 'var(--text-secondary)', fontSize: 11 }}><LoaderCircle size={16} className="spin" />AR-modell előkészítése…</span>}
        </div>
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="modal-footer">
          <button type="button" className="secondary-action" onClick={onClose}>Mégse</button>
          <button type="button" className="primary-action" disabled={phase !== 'ready'} onClick={launch}>{phase === 'launching' ? <LoaderCircle size={16} className="spin" /> : <Rotate3d size={16} />}{phase === 'launching' ? 'AR indítása…' : 'Megnyitás a kertemben'}</button>
        </div>
      </>}
      {phase === 'qr' && <>
        <p className="modal-intro">{message || 'Az AR-nézet telefonon működik. Olvasd be a kódot a telefonod kamerájával: ugyanez a konfiguráció nyílik meg, és egy gombnyomással a kertedbe helyezheted.'}</p>
        <div style={{ display: 'grid', placeItems: 'center', gap: 12 }}>
          {qr ? <img src={qr} alt="QR-kód a konfiguráció telefonos megnyitásához" width={220} height={220} style={{ borderRadius: 8, background: '#fff', padding: 6 }} /> : <Smartphone size={42} />}
          <small style={{ color: 'var(--text-secondary)', fontSize: 10, textAlign: 'center' }}>iPhone (iOS 15+) Safari · Android Chrome ARCore-támogatással</small>
        </div>
        <div className="modal-footer">
          <a className="text-action" href={shareUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />Link megnyitása</a>
          <button type="button" className="primary-action" onClick={onClose}>Kész</button>
        </div>
      </>}
      {phase === 'error' && <>
        <p className="modal-intro">{message}</p>
        <div className="modal-footer"><span /><button type="button" className="primary-action" onClick={onClose}>Bezárás</button></div>
      </>}
    </Modal>
  )
}
