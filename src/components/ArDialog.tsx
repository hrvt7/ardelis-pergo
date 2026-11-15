// „Nézd meg a kertedben” — kiterjesztett valóság (AR).
//
// - iPhone/iPad: AR Quick Look egy ELŐRE elkészített USDZ-vel, közvetlen <a rel="ar"> hivatkozással.
//   (A gombnyomás utáni konverzió iOS-en elveszítheti a felhasználói gesztust — ilyenkor „semmi sem történt”.)
// - Android: WebXR (ARCore-képes Chrome) a model-viewerrel, GLB-ből.
// - Asztali gép: QR-kód; telefonon ugyanez a konfiguráció nyílik meg, és egyből az AR-t kínálja (?ar=1).
// - Nem támogatott telefon / alkalmazáson belüli böngésző: nem ígérünk AR-t; érthető ok + alternatívák
//   (fotóba helyezés, link másolása, 3D nézet).
//
// A pergola valós méretben jelenik meg (Quick Look: allowsContentScaling=0, WebXR: ar-scale="fixed").
import { useEffect, useRef, useState } from 'react'
import { assetUrl } from '@/lib/assetUrl'
import { Check, Copy, ExternalLink, ImagePlus, LoaderCircle, Rotate3d, Smartphone, X } from 'lucide-react'
import QRCode from 'qrcode'
import { Modal } from '@/components/Dialogs'
import { cachedExport } from '@/lib/arExport'
import { detectArPath, unsupportedHint, type ArPath } from '@/lib/arSupport'
import { getActiveScene } from '@/lib/sceneRegistry'
import { captureScene } from '@/lib/showcase'
import { tr } from '../i18n/locale'

const MODEL_VIEWER_SRC = assetUrl('/vendor/model-viewer-4.4.0.min.js')
const TIPS_KEY = 'pergola-ar-tips-seen'

type Phase = 'checking' | 'preparing' | 'ready' | 'launching' | 'unsupported' | 'qr' | 'error'
type ModelViewerElement = HTMLElement & { canActivateAR?: boolean; activateAR?: () => Promise<void> }

let modelViewerPromise: Promise<void> | null = null
function loadModelViewer() {
  if (customElements.get('model-viewer')) return Promise.resolve()
  if (!modelViewerPromise) {
    modelViewerPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.type = 'module'
      script.src = MODEL_VIEWER_SRC
      script.onerror = () => { modelViewerPromise = null; reject(new Error(tr('Az AR-modul nem töltődött be.', 'Das AR-Modul wurde nicht geladen.'))) }
      document.head.appendChild(script)
      customElements.whenDefined('model-viewer').then(() => resolve(), reject)
    })
  }
  return modelViewerPromise
}

async function waitForModel(timeoutMs = 25000) {
  const started = Date.now()
  while (!getActiveScene()?.getObjectByName('pergola-model')) {
    if (Date.now() - started > timeoutMs) throw new Error(tr('A 3D modell még nem töltődött be. Várj pár másodpercet, majd próbáld újra.', 'Das 3D-Modell ist noch nicht geladen. Bitte ein paar Sekunden warten und erneut versuchen.'))
    await new Promise((resolve) => window.setTimeout(resolve, 250))
  }
  // Az első képkockák (lamella-animáció) után exportálunk, hogy a végleges állapot kerüljön az AR-be.
  await new Promise((resolve) => window.setTimeout(resolve, 600))
}

function readTipsSeen() { try { return localStorage.getItem(TIPS_KEY) === '1' } catch { return false } }
function markTipsSeen() { try { localStorage.setItem(TIPS_KEY, '1') } catch { /* privát mód */ } }

function Tips({ compact }: { compact: boolean }) {
  if (compact) return <p className="ar-tip-line"><Smartphone size={15} />{tr('Irányítsd a telefont a talajra vagy a teraszra, és mozgasd lassan, amíg a pergola megjelenik.', 'Richten Sie das Handy auf den Boden oder die Terrasse und bewegen Sie es langsam, bis die Pergola erscheint.')}</p>
  return <ol className="ar-tips">
    <li><strong>{tr('Irányítsd a telefont a talajra / a teraszra', 'Handy auf den Boden / die Terrasse richten')}</strong>{tr(', és mozgasd lassan körbe pár másodpercig, amíg a felületet felismeri.', ', und einige Sekunden langsam schwenken, bis die Fläche erkannt wird.')}</li>
    <li><strong>{tr('A pergola valós méretben jelenik meg.', 'Die Pergola erscheint in Originalgröße.')}</strong> {tr('Egy ujjal a helyére húzhatod, két ujjal elforgathatod.', 'Mit einem Finger verschieben, mit zwei Fingern drehen.')}</li>
    <li>{tr('Jó fényben, mintás felületen (térkő, fű, burkolat) működik a legjobban.', 'Funktioniert am besten bei gutem Licht auf gemusterten Flächen (Pflaster, Rasen, Belag).')}</li>
  </ol>
}

export default function ArDialog({ shareUrl, onClose, onPhoto }: { shareUrl: string; onClose: () => void; onPhoto?: () => void }) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [path, setPath] = useState<ArPath | null>(null)
  const [message, setMessage] = useState('')
  const [qr, setQr] = useState('')
  const [usdz, setUsdz] = useState<{ url: string; preview: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [tipsSeen] = useState(readTipsSeen)
  const host = useRef<HTMLDivElement>(null)
  const viewer = useRef<ModelViewerElement | null>(null)

  useEffect(() => {
    let cancelled = false
    let blobUrl = ''
    const showQr = async () => {
      try {
        const image = await QRCode.toDataURL(shareUrl, { margin: 1, width: 440, errorCorrectionLevel: 'M', color: { dark: '#111517', light: '#ffffff' } })
        if (!cancelled) { setQr(image); setPhase('qr') }
      } catch { if (!cancelled) setPhase('qr') }
    }
    const unsupported = (detected: ArPath) => { setMessage(unsupportedHint(detected, navigator.userAgent)); setPhase('unsupported') }
    ;(async () => {
      const detected = await detectArPath()
      if (cancelled) return
      setPath(detected)
      if (detected === 'desktop') { await showQr(); return }
      if (detected === 'ios-unsupported' || detected === 'android-unsupported') { unsupported(detected); return }
      setPhase('preparing')
      try {
        await waitForModel()
        if (cancelled) return
        if (detected === 'quick-look') {
          const blob = await cachedExport('usdz', shareUrl)
          if (cancelled) return
          blobUrl = URL.createObjectURL(blob)
          setUsdz({ url: blobUrl, preview: captureScene(720, 0.8) ?? '' })
          setPhase('ready')
          return
        }
        const [blob] = await Promise.all([cachedExport('glb', shareUrl), loadModelViewer()])
        if (cancelled) return
        blobUrl = URL.createObjectURL(blob)
        const element = document.createElement('model-viewer') as ModelViewerElement
        element.setAttribute('src', blobUrl)
        element.setAttribute('alt', tr('A konfigurált pergola valós méretben', 'Die konfigurierte Pergola in Originalgröße'))
        element.setAttribute('ar', '')
        element.setAttribute('ar-modes', 'webxr')
        element.setAttribute('ar-scale', 'fixed')
        element.setAttribute('ar-placement', 'floor')
        element.setAttribute('camera-controls', '')
        element.setAttribute('touch-action', 'pan-y')
        element.setAttribute('shadow-intensity', '1')
        element.setAttribute('environment-image', 'neutral')
        element.setAttribute('loading', 'eager')
        element.style.cssText = 'width:100%;height:240px;border-radius:10px;background:rgba(255,255,255,.04);--poster-color:transparent'
        // A model-viewer saját AR-gombját elrejtjük; a mienket használjuk.
        const hiddenButton = document.createElement('span')
        hiddenButton.setAttribute('slot', 'ar-button')
        hiddenButton.style.display = 'none'
        element.appendChild(hiddenButton)
        element.addEventListener('load', () => {
          if (cancelled) return
          if (element.canActivateAR) setPhase('ready')
          else unsupported('android-unsupported')
        })
        element.addEventListener('error', () => { if (!cancelled) { setMessage(tr('A 3D modell nem töltődött be az AR-nézetbe.', 'Das 3D-Modell wurde nicht in die AR-Ansicht geladen.')); setPhase('error') } })
        element.addEventListener('ar-status', (event) => {
          const status = (event as CustomEvent<{ status: string }>).detail?.status
          if (cancelled) return
          if (status === 'failed') { setMessage(tr('Az AR nem indult el. Ellenőrizd, hogy a Chrome hozzáférhet-e a kamerához, és hogy az ARCore telepítve van-e.', 'AR ist nicht gestartet. Bitte prüfen, ob Chrome auf die Kamera zugreifen darf und ob ARCore installiert ist.')); setPhase('ready') }
          if (status === 'session-started' || status === 'object-placed') { markTipsSeen(); setPhase('ready') }
        })
        viewer.current = element
        host.current?.replaceChildren(element)
      } catch (error) {
        if (!cancelled) { setMessage(error instanceof Error ? error.message : tr('Az AR előkészítése nem sikerült.', 'Die AR-Vorbereitung ist fehlgeschlagen.')); setPhase('error') }
      }
    })()
    return () => {
      cancelled = true
      viewer.current?.remove()
      viewer.current = null
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [shareUrl])

  const launchWebXr = async () => {
    const element = viewer.current
    if (!element?.activateAR) return
    setMessage('')
    setPhase('launching')
    try { await element.activateAR() } catch { setMessage(tr('Az AR nem indult el. Próbáld újra.', 'AR ist nicht gestartet. Bitte erneut versuchen.')) }
    finally { window.setTimeout(() => setPhase((current) => current === 'launching' ? 'ready' : current), 2500) }
  }
  const copyLink = () => {
    void navigator.clipboard?.writeText(shareUrl).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1600) }).catch(() => undefined)
  }
  const alternatives = <div className="ar-alternatives">
    {onPhoto && <button type="button" className="secondary-action" onClick={() => { onClose(); onPhoto() }}><ImagePlus size={16} />{tr('Fotóba helyezés', 'Ins Foto setzen')}</button>}
    <button type="button" className="secondary-action" onClick={copyLink}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? tr('Link másolva', 'Link kopiert') : tr('Link másolása', 'Link kopieren')}</button>
  </div>

  const preparing = phase === 'checking' || phase === 'preparing'
  return (
    <Modal title={tr('Nézd meg a kertedben', 'Im eigenen Garten ansehen')} eyebrow={tr('KITERJESZTETT VALÓSÁG · AR', 'ERWEITERTE REALITÄT · AR')} onClose={onClose} className="ar-modal">
      {(preparing || phase === 'ready' || phase === 'launching') && path !== 'desktop' && <>
        <p className="modal-intro">{tr('A pergola valós méretben jelenik meg a telefonod kameraképén, a saját teraszodon.', 'Die Pergola erscheint in Originalgröße im Kamerabild Ihres Handys, auf Ihrer eigenen Terrasse.')}</p>
        <Tips compact={tipsSeen} />
        {path === 'quick-look'
          ? <div className="ar-stage" aria-live="polite">
              {usdz && phase !== 'checking' && phase !== 'preparing'
                ? <a className="ar-quicklook" rel="ar" href={`${usdz.url}#allowsContentScaling=0`} onClick={() => { markTipsSeen(); setPhase('launching'); window.setTimeout(() => setPhase('ready'), 2500) }}>
                    {usdz.preview ? <img src={usdz.preview} alt={tr('A konfigurált pergola', 'Die konfigurierte Pergola')} /> : <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="" />}
                    <span className="ar-quicklook-cta"><Rotate3d size={18} />{phase === 'launching' ? tr('AR indítása…', 'AR wird gestartet…') : tr('Megnyitás a kertemben', 'In meinem Garten öffnen')}</span>
                  </a>
                : <span className="ar-wait"><LoaderCircle size={16} className="spin" />{tr('AR-modell előkészítése…', 'AR-Modell wird vorbereitet…')}</span>}
            </div>
          : <div ref={host} className="ar-stage" aria-live="polite">{preparing && <span className="ar-wait"><LoaderCircle size={16} className="spin" />{phase === 'checking' ? tr('Eszköz ellenőrzése…', 'Gerät wird geprüft…') : tr('AR-modell előkészítése…', 'AR-Modell wird vorbereitet…')}</span>}</div>}
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="modal-footer">
          <button type="button" className="secondary-action" onClick={onClose}>{tr('Mégse', 'Abbrechen')}</button>
          {path === 'webxr' && <button type="button" className="primary-action" disabled={phase !== 'ready'} onClick={launchWebXr}>{phase === 'launching' ? <LoaderCircle size={16} className="spin" /> : <Rotate3d size={16} />}{phase === 'launching' ? tr('AR indítása…', 'AR wird gestartet…') : tr('Megnyitás a kertemben', 'In meinem Garten öffnen')}</button>}
        </div>
      </>}
      {phase === 'checking' && path === 'desktop' && <div className="ar-stage"><span className="ar-wait"><LoaderCircle size={16} className="spin" />{tr('Betöltés…', 'Wird geladen…')}</span></div>}
      {phase === 'qr' && <>
        <p className="modal-intro">{tr('Az AR telefonon működik. Olvasd be a kódot a telefon kamerájával:', 'AR funktioniert am Handy. Scannen Sie den Code mit der Handykamera:')} <strong>{tr('pontosan ez a konfiguráció', 'genau diese Konfiguration')}</strong> {tr('nyílik meg, és egyből felajánlja a kertedbe helyezést.', 'öffnet sich und bietet sofort das Platzieren im Garten an.')}</p>
        <div className="ar-qr">
          {qr ? <img src={qr} alt={tr('QR-kód a konfiguráció telefonos AR-megnyitásához', 'QR-Code zum Öffnen der Konfiguration in AR am Handy')} width={220} height={220} /> : <Smartphone size={42} />}
          <small>{tr('iPhone / iPad: Safari (iOS 13+) · Android: Chrome, ARCore-képes telefonon', 'iPhone / iPad: Safari (iOS 13+) · Android: Chrome, auf ARCore-fähigem Handy')}</small>
        </div>
        <p className="ar-alt-label">{tr('Nincs kéznél telefon? Próbáld ki a saját fotódon:', 'Kein Handy zur Hand? Probieren Sie es mit einem eigenen Foto:')}</p>
        {alternatives}
        <div className="modal-footer">
          <a className="text-action" href={shareUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />{tr('Link megnyitása', 'Link öffnen')}</a>
          <button type="button" className="primary-action" onClick={onClose}>{tr('Kész', 'Fertig')}</button>
        </div>
      </>}
      {(phase === 'unsupported' || phase === 'error') && <>
        <div className="ar-unsupported"><X size={18} /><p>{message || tr('Ezen az eszközön az AR nem indítható.', 'Auf diesem Gerät kann AR nicht gestartet werden.')}</p></div>
        <p className="ar-alt-label">{tr('Helyette így is megnézheted a saját teraszodon:', 'Stattdessen können Sie es so auf Ihrer Terrasse ansehen:')}</p>
        {alternatives}
        <div className="modal-footer"><span /><button type="button" className="primary-action" onClick={onClose}>{tr('Vissza a 3D nézethez', 'Zurück zur 3D-Ansicht')}</button></div>
      </>}
    </Modal>
  )
}
