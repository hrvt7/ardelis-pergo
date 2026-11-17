// „Digitális termékkönyv” a nyitóoldalon: a telepítés utáni szakasz (QR → garancia → hibabejelentés → bővítés).
// Kódból rajzolt telefon a tulajdonosi oldal egyszerűsített képernyőivel és egy QR-matrica; demóadatok, jelölve.
// A lépések kattinthatók; amíg a szakasz látszik és a látogató nem választott, maguktól lépnek (csökkentett mozgásnál nem).
import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Lock, Plus, QrCode, ShieldCheck, ShieldOff, Wrench } from 'lucide-react'
import { useCopy } from '@/i18n/useCopy'
import { Em } from '@/i18n/Em'

const ICONS = [QrCode, ShieldCheck, Wrench, Plus]

/** Valódi, beolvasható QR-kód SVG-ben (a qrcode csomag már függőség; lusta betöltés). Betöltés előtt üres hely. */
function QrArt({ text }: { text: string }) {
  const [modules, setModules] = useState<{ size: number; dark: boolean[] } | null>(null)
  useEffect(() => {
    let alive = true
    void import('qrcode').then(({ create }) => {
      const code = create(text, { errorCorrectionLevel: 'M' })
      if (alive) setModules({ size: code.modules.size, dark: Array.from(code.modules.data, Boolean) })
    }).catch(() => undefined)
    return () => { alive = false }
  }, [text])
  if (!modules) return <svg viewBox="0 0 1 1" aria-hidden="true" focusable="false" />
  const { size, dark } = modules
  let path = ''
  dark.forEach((on, index) => { if (on) path += `M${index % size} ${Math.floor(index / size)}h1v1h-1z` })
  return <svg viewBox={`-2 -2 ${size + 4} ${size + 4}`} shapeRendering="crispEdges" aria-hidden="true" focusable="false"><rect x="-2" y="-2" width={size + 4} height={size + 4} fill="#fff" /><path d={path} fill="currentColor" /></svg>
}

export default function ProductPassport() {
  const { c } = useCopy()
  const p = c.v2.passport
  const ph = p.phone
  const root = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    const element = root.current
    if (!element || pinned || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer = 0
    const io = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer)
      if (entry.isIntersecting) timer = window.setInterval(() => setActive((current) => (current + 1) % 4), 3400)
    }, { threshold: 0.4 })
    io.observe(element)
    return () => { io.disconnect(); window.clearInterval(timer) }
  }, [pinned])

  const choose = (index: number) => { setPinned(true); setActive(index) }
  // A minta-QR erre a szakaszra mutat (a valódi matrica a tulajdonos saját, titkos linkjére).
  const qrText = typeof window === 'undefined' ? 'https://lamelix.vercel.app/#termekkonyv' : `${window.location.origin}${window.location.pathname}#termekkonyv`

  return <section className="lx-passport" id="termekkonyv" aria-labelledby="passport-title" ref={root}>
    <div className="lx-passport-head">
      <p className="lx-eyebrow">{p.eyebrow}</p>
      <h2 id="passport-title"><Em parts={p.title} /></h2>
      <p className="lx-sub">{p.sub}</p>
    </div>
    <div className="lx-passport-copy">
      <ol className="lx-passport-steps">
        {p.steps.map((step, index) => {
          const Icon = ICONS[index]
          return <li key={step.title}>
            <button type="button" className={index === active ? 'is-on' : ''} aria-pressed={index === active} onClick={() => choose(index)}>
              <span className="lx-passport-icon"><Icon size={18} /></span>
              <span><strong>{step.title}</strong><small>{step.text}</small></span>
            </button>
          </li>
        })}
      </ol>
      <p className="lx-passport-honest">{p.honest}</p>
      <small className="lx-passport-note">{p.demoNote}</small>
    </div>

    <div className="lx-passport-stage" data-step={active} aria-hidden="true">
      <div className="lx-sticker">
        <b>{ph.brand}</b>
        <span>{ph.label}</span>
        <QrArt text={qrText} />
        <small>{ph.scan}</small>
      </div>
      <div className="lx-phone">
        <div className="lx-phone-bar"><b>{ph.brand}</b><span>{ph.label}</span></div>
        <div className="lx-phone-hero"><span>{ph.installed}</span><strong>{ph.product}</strong></div>
        <div className="lx-phone-screens">
          <div className="lx-screen" data-screen="0">
            <div className="lx-scan"><QrArt text={qrText} /><i /></div>
            <small>{ph.scan}</small>
          </div>
          <div className="lx-screen" data-screen="1">
            {ph.warranty.map(([label, date, ok]) => <div key={label} className={`lx-w${ok ? '' : ' is-off'}`}>
              {ok ? <ShieldCheck size={15} /> : <ShieldOff size={15} />}<b>{label}</b><span>{ok ? ph.valid : ph.expired} · {date}</span>
            </div>)}
          </div>
          <div className="lx-screen" data-screen="2">
            <b className="lx-screen-title">{ph.reportTitle}</b>
            <span className="lx-field">{ph.reportPart}</span>
            <span className="lx-field lx-field-text">{ph.reportText}</span>
            <div className="lx-photos"><i /><i /><span><Camera size={14} />2 {ph.photos}</span></div>
            <span className="lx-send">{ph.send}</span>
          </div>
          <div className="lx-screen" data-screen="3">
            <b className="lx-screen-title">{ph.expandTitle}</b>
            <span className="lx-locked"><Lock size={13} />{ph.expandLocked}</span>
            {ph.expandAdd.map((item) => <span key={item} className="lx-added"><Check size={14} />{item}</span>)}
            <div className="lx-delta"><small>{ph.expandPrice}</small><strong>{ph.expandValue}</strong></div>
          </div>
        </div>
      </div>
    </div>
  </section>
}
