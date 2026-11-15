import { useEffect, useState } from 'react'
import { CheckCircle2, CloudDownload, MonitorSmartphone, Share, X } from 'lucide-react'
import { setDemoDevice, useDemoDevice } from '@/lib/demoDevice'
import { downloadOffline, offlineSupported, readOfflineStatus, type OfflineProgress } from '@/lib/swClient'
import { canPromptInstall, isAppleMobile, isStandaloneDisplay, onInstallPromptChange, promptInstall } from '@/lib/installPrompt'

const TIP_KEY = 'lamelix-install-tip'
const mb = (bytes: number) => (bytes / 1_048_576).toLocaleString('hu-HU', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

type OfflineState =
  | { kind: 'checking' }
  | { kind: 'unavailable' }
  | { kind: 'idle'; cached: number; total: number }
  | { kind: 'downloading'; progress: OfflineProgress }
  | { kind: 'ready'; total: number; bytes: number }
  | { kind: 'partial'; failed: number; total: number }

/** Offline letöltés: a SW az összes jelenet-eszközt és build-fájlt tárba teszi, x / y fájl és MB kijelzéssel. */
function OfflineDownload() {
  const [state, setState] = useState<OfflineState>({ kind: 'checking' })
  useEffect(() => {
    let alive = true
    void (async () => {
      if (!(await offlineSupported())) { if (alive) setState({ kind: 'unavailable' }); return }
      const status = await readOfflineStatus()
      if (!alive) return
      if (!status) setState({ kind: 'unavailable' })
      else if (status.cached >= status.total) setState({ kind: 'ready', total: status.total, bytes: status.bytesTotal })
      else setState({ kind: 'idle', cached: status.cached, total: status.total })
    })()
    return () => { alive = false }
  }, [])
  const start = async () => {
    setState({ kind: 'downloading', progress: { done: 0, total: 0, bytesDone: 0, bytesTotal: 0, failed: 0 } })
    try {
      const result = await downloadOffline((progress) => setState({ kind: 'downloading', progress }))
      setState(result.failed ? { kind: 'partial', failed: result.failed, total: result.total } : { kind: 'ready', total: result.total, bytes: result.bytesTotal })
    } catch { setState({ kind: 'unavailable' }) }
  }
  if (state.kind === 'checking') return null
  if (state.kind === 'unavailable') return <p className="field-hint" role="note">Az offline letöltés az éles oldalon érhető el (https, a kezdőképernyőről indítva is). Ebben a nézetben nincs aktív offline tár.</p>
  if (state.kind === 'ready') return <p className="offline-state is-ready" role="status"><CheckCircle2 size={16} /><span><strong>Offline is működik</strong><small>{state.total} fájl ({mb(state.bytes)} MB) ezen az eszközön. Az ajánlatkérés elküldéséhez továbbra is internet kell.</small></span></p>
  if (state.kind === 'downloading') {
    const { done, total, bytesDone, bytesTotal } = state.progress
    const ratio = total ? done / total : 0
    return <div className="offline-state" role="status" aria-live="polite">
      <span><strong>Letöltés…</strong><small>{done} / {total || '…'} fájl · {mb(bytesDone)} / {mb(bytesTotal)} MB</small></span>
      <progress max={1} value={ratio} aria-label="Offline letöltés állapota" />
    </div>
  }
  return <>
    {state.kind === 'partial' && <p className="field-hint quality-hint" role="alert">{state.failed} fájl nem töltődött le (gyenge kapcsolat?). Próbáld újra jobb hálózaton.</p>}
    <button type="button" className="upload-button offline-download" onClick={() => void start()}><CloudDownload size={15} />Offline letöltés{state.kind === 'idle' && state.cached > 0 ? ` (${state.cached} / ${state.total} már megvan)` : ''}</button>
  </>
}

/** Egyszeri, bezárható tipp: iPaden Megosztás → Főképernyőhöz adás, Androidon a böngésző telepítési ajánlata. */
function InstallTip() {
  const [, rerender] = useState(0)
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(TIP_KEY) === '1' } catch { return false } })
  useEffect(() => onInstallPromptChange(() => rerender((value) => value + 1)), [])
  if (dismissed || isStandaloneDisplay()) return null
  const close = () => { setDismissed(true); try { localStorage.setItem(TIP_KEY, '1') } catch { /* privát mód */ } }
  const apple = isAppleMobile()
  return <div className="install-tip" role="note">
    <button type="button" className="fs-hint-close" aria-label="Tipp bezárása" onClick={close}><X size={15} /></button>
    <strong>Telepítsd a kezdőképernyőre</strong>
    {apple
      ? <p>Safariban koppints a <Share size={13} /> <b>Megosztás</b> gombra, majd <b>Főképernyőhöz adás</b>. Az ikonról teljes képernyőn, böngészősáv nélkül indul.</p>
      : canPromptInstall()
        ? <p>A böngésző felajánlja a telepítést: <button type="button" className="install-tip-action" onClick={() => void promptInstall().then((ok) => { if (ok) close() })}>Telepítés</button></p>
        : <p>A böngésző menüjében válaszd az <b>Alkalmazás telepítése</b> vagy <b>Hozzáadás a kezdőképernyőhöz</b> pontot.</p>}
  </div>
}

/** „Bemutató eszköz” blokk a Nézet panelen: kapcsoló, offline letöltés, telepítési tipp. */
export default function DemoDevicePanel() {
  const demo = useDemoDevice()
  // Beágyazott (iframe) konfigurátorban a gyártó vevőinek nem kell: ott nem jelenik meg.
  const embedded = typeof window !== 'undefined' && window.self !== window.top
  if (embedded && !demo) return null
  return <div className="photo-mode demo-device">
    <button type="button" className={`extra-card ${demo ? 'is-on' : ''}`} role="switch" aria-checked={demo} onClick={() => setDemoDevice(!demo)}>
      <MonitorSmartphone size={20} strokeWidth={1.5} />
      <span><strong>Bemutató eszköz: mindig ultra, offline</strong><small>Üzletkötői tablethez: fix ultra 3D minőség, offline letöltés. Ezen az eszközön megmarad.</small></span>
      <span className={`switch-track ${demo ? 'is-on' : ''}`} aria-hidden="true"><span /></span>
    </button>
    {demo && <><OfflineDownload /><InstallTip /></>}
  </div>
}
