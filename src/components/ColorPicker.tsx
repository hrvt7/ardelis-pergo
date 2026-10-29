// Szín lépés: gyártói alapszínek, kereshető RAL/DB/fa katalógus, kéttónusú kivitel (váz és
// tető/lamellák külön), és szín a saját fotóról (pipetta → legközelebbi RAL).
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ImagePlus, Pipette, Search, X } from 'lucide-react'
import { Modal } from '@/components/Dialogs'
import { COLOR_CATALOG, COLOR_GROUPS, colorLabel, describeColor, findColor, matchLabel, nearestColors, normalizeColorCode, pickCatalogColor, rgbToHex, roofPartName, searchColors, supportsTwoTone, type CatalogColor, type ColorGroup, type ColorInfo } from '@/lib/colors'
import { formatHuf } from '@/lib/pricing'
import { tenantPrice } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import type { FrameColor, PergolaConfig, PriceSettings } from '@/types/pergola'

type Target = 'frame' | 'roof'

export default function ColorPicker({ config, prices, photoUrl, onChange }: { config: PergolaConfig; prices: PriceSettings; photoUrl: string | null; onChange: (patch: Partial<PergolaConfig>) => void }) {
  const { tenant } = useTenant()
  const twoToneAvailable = Boolean(tenant.twoTone && supportsTwoTone(config.roof))
  const twoTone = twoToneAvailable && Boolean(config.roofColor)
  const [target, setTarget] = useState<Target>('frame')
  const active: Target = twoTone ? target : 'frame'
  const [group, setGroup] = useState<ColorGroup | 'all'>('all')
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const customRate = Math.round(prices.customColorRate * 100)
  const woodRate = Math.round(prices.woodColorRate * 100)
  const part = roofPartName(config.roof)

  const frameInfo = describeColor(tenant, config.frameColor, config.customRal)
  const roofInfo = config.roofColor ? describeColor(tenant, config.roofColor, config.roofRal) : frameInfo
  const current = active === 'frame' ? { color: config.frameColor, custom: config.customRal, info: frameInfo } : { color: config.roofColor ?? config.frameColor, custom: config.roofColor ? config.roofRal : config.customRal, info: roofInfo }

  const apply = (color: FrameColor, custom?: string) => onChange(active === 'frame' ? { frameColor: color, customRal: custom } : { roofColor: color, roofRal: custom })
  const applyCode = (code: string) => { const pick = pickCatalogColor(tenant, code); if (pick) apply(pick.color, pick.custom) }
  const setTwoTone = (on: boolean) => {
    if (!on) { onChange({ roofColor: undefined, roofRal: undefined }); setTarget('frame'); return }
    // Kiinduló kontraszt: sötét váz mellé fehér tető, világos mellé antracit.
    const light = frameInfo.kind !== 'wood' && luminance(frameInfo.hex) > 0.5
    const fallback = tenant.colors.find((item) => item.id === (light ? 'anthracite' : 'white'))?.id ?? tenant.colors.find((item) => item.id !== config.frameColor)?.id
    if (fallback) { onChange({ roofColor: fallback, roofRal: undefined }); setTarget('roof') }
  }

  const results = useMemo(() => searchColors(query, group), [query, group])
  const limited = !query && group === 'all' && !showAll
  const visible = limited ? results.filter((color) => color.popular) : results
  const selectedCode = current.color === 'custom' ? normalizeColorCode(current.custom) : tenant.colors.find((item) => item.id === current.color)?.ral ? `RAL ${tenant.colors.find((item) => item.id === current.color)!.ral}` : undefined
  const base = tenantPrice(tenant, config, prices).totalGross
  const surcharge = (() => {
    if (current.info.standard) return 0
    const plain = active === 'frame' ? { frameColor: tenant.colors[0]?.id ?? 'anthracite', customRal: undefined } : { roofColor: tenant.colors[0]?.id ?? 'anthracite', roofRal: undefined }
    return base - tenantPrice(tenant, { ...config, ...plain } as PergolaConfig, prices).totalGross
  })()
  const [codeText, setCodeText] = useState(current.color === 'custom' ? current.custom ?? '' : '')
  const [typing, setTyping] = useState(false)
  const [syncedCode, setSyncedCode] = useState(`${active}:${current.custom ?? ''}:${current.color}`)
  const syncKey = `${active}:${current.custom ?? ''}:${current.color}`
  // Kívülről jövő változásnál (katalógus, pipetta, visszavonás) a mező követi a kiválasztást; gépelés közben nem írjuk felül.
  if (syncKey !== syncedCode) { setSyncedCode(syncKey); if (!typing) setCodeText(current.color === 'custom' ? current.custom ?? '' : '') }
  const typed = findColor(codeText)

  return <div className="color-picker">
    {twoToneAvailable && <div className="color-mode">
      <div className="split-mode" role="radiogroup" aria-label="Színkialakítás">
        <button type="button" role="radio" aria-checked={!twoTone} className={!twoTone ? 'selected' : ''} onClick={() => setTwoTone(false)}><span className="mode-dot" style={{ background: frameInfo.hex }} />Egyszínű</button>
        <button type="button" role="radio" aria-checked={twoTone} className={twoTone ? 'selected' : ''} onClick={() => setTwoTone(true)}><span className="mode-dot two" style={{ '--a': frameInfo.hex, '--b': roofInfo.hex } as React.CSSProperties} />Kéttónusú</button>
      </div>
      {twoTone && <div className="half-tabs color-targets" role="tablist" aria-label="Melyik részt színezed?">
        {(['frame', 'roof'] as const).map((item) => { const info = item === 'frame' ? frameInfo : roofInfo; return <button key={item} type="button" role="tab" aria-selected={active === item} className={active === item ? 'selected' : ''} onClick={() => setTarget(item)}>
          <span className="target-swatch" style={{ background: info.hex }} />
          <span><small>{item === 'frame' ? 'Váz, oszlopok' : part}</small><strong>{info.name}</strong></span>
        </button> })}
      </div>}
    </div>}

    <div className="color-section-head"><strong>Alapszínek</strong><span>felár nélkül</span></div>
    <div className="material-swatches">{tenant.colors.map((color) => { const selected = current.color === color.id; return <button type="button" key={color.id} className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => apply(color.id)}>
      <span className="material-sphere" style={{ '--swatch': color.hex } as React.CSSProperties}>{selected && <Check size={16} />}</span><strong>{color.name}</strong><small>{color.detail}</small>
    </button> })}</div>

    {tenant.customRal && <>
      <div className="color-section-head"><strong>További színek</strong><span>egyedi szín · {customRate > 0 ? `+${customRate}%` : 'felár nélkül'}{woodRate > 0 ? `, fa hatású +${woodRate}%` : ''}</span></div>
      <label className="color-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Keresés: antracit, 7021, homok, dió…" aria-label="Szín keresése névvel vagy kóddal" />{query && <button type="button" aria-label="Keresés törlése" onClick={() => setQuery('')}><X size={14} /></button>}</label>
      <div className="color-groups" role="tablist" aria-label="Színcsoportok">
        {[{ id: 'all' as const, label: 'Népszerű' }, ...COLOR_GROUPS].map((item) => <button key={item.id} type="button" role="tab" aria-selected={group === item.id} className={group === item.id ? 'selected' : ''} onClick={() => { setGroup(item.id); setShowAll(false) }}>{item.label}</button>)}
      </div>
      {visible.length ? <div className="color-grid">{visible.map((color) => <ColorChip key={color.code} color={color} selected={selectedCode === color.code} standard={Boolean(tenant.colors.find((item) => item.ral && `RAL ${item.ral}` === color.code))} onPick={() => applyCode(color.code)} />)}</div>
        : <p className="color-empty">Nincs ilyen szín a listában. Ha ismered a kódját, add meg lent — a gyártó bármely RAL színre porszór.</p>}
      {limited && <button type="button" className="color-more" onClick={() => setShowAll(true)}>Összes szín ({COLOR_CATALOG.length})</button>}

      <div className="color-tools">
        <button type="button" className="color-photo-button" onClick={() => setPhotoOpen(true)}><Pipette size={16} /><span><strong>Szín a házadról</strong><small>Fotón rábökve megkeressük a legközelebbi RAL színt</small></span></button>
        <label className="color-code-field"><span>Ismered a kódot?</span><input value={codeText} maxLength={24} placeholder="pl. RAL 7035, DB 703" onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} onChange={(event) => { setCodeText(event.target.value); const code = normalizeColorCode(event.target.value); if (code) { const pick = pickCatalogColor(tenant, code); if (pick) apply(pick.color, pick.custom) } }} />
          <small>{typed ? `${typed.name} · ${typed.code}` : codeText.trim() ? 'Nincs a listánkban — a gyártó egyezteti a pontos árnyalatot.' : 'Bármely RAL szín rendelhető.'}</small></label>
      </div>
    </>}

    <SelectedCard info={current.info} label={active === 'frame' ? (twoTone ? 'Váz, oszlopok' : 'Szerkezet') : part} surcharge={surcharge} />
    {/* A beállítópanel (mobilon alsó lap) saját rétegében a fix pozíció a panelhez igazodna: a párbeszéd a body-ba kerül. */}
    {photoOpen && createPortal(<PhotoColorDialog photoUrl={photoUrl} targetLabel={active === 'frame' ? (twoTone ? 'a vázra' : 'a szerkezetre') : `a ${part.toLowerCase()}ra`} onApply={(code) => { applyCode(code); setPhotoOpen(false) }} onClose={() => setPhotoOpen(false)} />, document.body)}
  </div>
}

function ColorChip({ color, selected, standard, onPick }: { color: CatalogColor; selected: boolean; standard: boolean; onPick: () => void }) {
  return <button type="button" className={`color-chip${selected ? ' selected' : ''}${color.kind === 'wood' ? ' is-wood' : ''}${color.kind === 'db' || color.code.startsWith('RAL 900') && color.group === 'metallic' ? ' is-metal' : ''}`} aria-pressed={selected} title={`${color.name} · ${color.code}`} onClick={onPick}>
    <span className="chip-swatch" style={{ '--swatch': color.hex } as React.CSSProperties}>{selected && <Check size={13} />}</span>
    <strong>{color.kind === 'wood' ? color.name : color.code.replace('RAL ', '')}</strong>
    <small>{color.kind === 'wood' ? 'fa hatású' : color.name}{standard ? ' · alap' : ''}</small>
  </button>
}

function SelectedCard({ info, label, surcharge }: { info: ColorInfo; label: string; surcharge: number }) {
  return <div className={`finish-sample${info.kind === 'wood' ? ' is-wood' : ''}`} style={{ '--finish': info.hex } as React.CSSProperties}>
    <div />
    <span>
      <small className="finish-part">{label}</small>
      <strong>{colorLabel(info)}</strong>
      <small>{info.standard ? 'Gyártói alapszín · felár nélkül' : `${info.kind === 'wood' ? 'Fa hatású bevonat' : 'Egyedi szín'} · ${surcharge > 0 ? `+${formatHuf(surcharge)}` : 'felár nélkül'} · +1–3 hét gyártás`}</small>
      <small>{info.kind === 'wood' ? 'Fa erezetű szublimációs bevonat porszórt alumíniumon' : info.kind === 'db' ? 'Vascsillámos, finoman csillogó strukturált felület' : 'Matt, UV-álló porszórt felület'} · a képernyő színe tájékoztató</small>
    </span>
  </div>
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Fotó → pipetta: a megbökött pont 9×9-es átlaga, és a három legközelebbi katalógusszín. */
function PhotoColorDialog({ photoUrl, targetLabel, onApply, onClose }: { photoUrl: string | null; targetLabel: string; onApply: (code: string) => void; onClose: () => void }) {
  const [url, setUrl] = useState(photoUrl)
  const [ownUrl, setOwnUrl] = useState<string | null>(null)
  const [sample, setSample] = useState<{ hex: string; x: number; y: number } | null>(null)
  const matches = sample ? nearestColors(sample.hex, 3) : []
  const close = () => { if (ownUrl) URL.revokeObjectURL(ownUrl); onClose() }
  const pick = (event: React.PointerEvent<HTMLImageElement>) => {
    const image = event.currentTarget
    const rect = image.getBoundingClientRect()
    const fx = (event.clientX - rect.left) / rect.width
    const fy = (event.clientY - rect.top) / rect.height
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight))
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const cx = Math.round(fx * canvas.width)
    const cy = Math.round(fy * canvas.height)
    const size = 9
    const data = context.getImageData(Math.max(0, cx - 4), Math.max(0, cy - 4), size, size).data
    let r = 0; let g = 0; let b = 0; let n = 0
    for (let index = 0; index < data.length; index += 4) { r += data[index]; g += data[index + 1]; b += data[index + 2]; n += 1 }
    setSample({ hex: rgbToHex([r / n, g / n, b / n]), x: fx * 100, y: fy * 100 })
  }
  return <Modal title="Szín a házadról" eyebrow="PIPETTA" onClose={close} className="photo-color-dialog">
    {!url ? <label className="photo-color-drop">
      <ImagePlus size={26} />
      <strong>Tölts fel egy fotót a házadról</strong>
      <small>Például az ablakkeretről, a kerítésről vagy a homlokzatról. A kép csak ebben a böngészőben marad.</small>
      <input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) { const next = URL.createObjectURL(file); setOwnUrl(next); setUrl(next) } }} />
    </label> : <>
      <p className="photo-color-hint">Bökj rá arra a részre, amelyhez a pergola színét igazítanád. Árnyékos vagy fénylő részen a szín torzulhat — próbálj több pontot.</p>
      <div className="photo-color-stage">
        <img src={url} alt="Feltöltött fotó a házról" onPointerDown={pick} draggable={false} />
        {sample && <span className="photo-color-marker" style={{ left: `${sample.x}%`, top: `${sample.y}%`, background: sample.hex }} />}
      </div>
      {sample ? <div className="photo-color-results">
        <div className="photo-color-sample"><i style={{ background: sample.hex }} /><span><small>A fotón mért szín</small><strong>{sample.hex.toUpperCase()}</strong></span></div>
        {matches.map(({ color, distance }) => <button type="button" key={color.code} className="photo-color-match" onClick={() => onApply(color.code)}>
          <i style={{ background: color.hex }} /><span><strong>{color.name}</strong><small>{color.code} · {matchLabel(distance)}</small></span><em>Alkalmazom {targetLabel}</em>
        </button>)}
        <p className="photo-color-note">A fotó színe a fénytől és a kamerától függ; a pontos árnyalatot a gyártói színminta mutatja meg.</p>
      </div> : <div className="photo-color-results is-empty"><Pipette size={18} /><p className="photo-color-note">Még nem választottál pontot — bökj a képre.</p></div>}
      <label className="text-action photo-color-change"><ImagePlus size={14} />Másik fotó<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) { if (ownUrl) URL.revokeObjectURL(ownUrl); const next = URL.createObjectURL(file); setOwnUrl(next); setUrl(next); setSample(null) } }} /></label>
    </>}
  </Modal>
}
