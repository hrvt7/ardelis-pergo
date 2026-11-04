// Gyártói ármátrix: tetőtípusonként egy egyszerű táblázat (Szélesség | Mélység | Nettó ár).
// A szerkesztés szöveges mezőkkel megy (a „4,” gépelése nem akad), az ellenőrzés mentéskor fut.
import { useMemo, useState, type ClipboardEvent } from 'react'
import { ClipboardPaste, Plus, Trash2 } from 'lucide-react'
import { ROOF_INFO } from '@/lib/roofs'
import { emptyRow, parsePastedRows, pricePerSquareMeter, type MatrixField, type MatrixRow, type MatrixRowError } from '@/lib/priceMatrixEdit'
import type { RoofType } from '@/types/pergola'

export type MatrixDraft = Partial<Record<RoofType, MatrixRow[]>>
export type MatrixErrors = Partial<Record<RoofType, MatrixRowError[]>>

const COLUMNS: { field: MatrixField; label: string; unit: string; mode: 'decimal' | 'numeric'; placeholder: string }[] = [
  { field: 'width', label: 'Szélesség', unit: 'm', mode: 'decimal', placeholder: '4' },
  { field: 'depth', label: 'Mélység', unit: 'm', mode: 'decimal', placeholder: '3' },
  { field: 'price', label: 'Nettó ár', unit: 'Ft', mode: 'numeric', placeholder: '1 830 000' },
]

const huf = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 0 })

export default function PriceMatrixEditor({ roofs, value, errors, active, onActiveChange, onChange }: {
  roofs: RoofType[]
  value: MatrixDraft
  errors: MatrixErrors
  active: RoofType | null
  onActiveChange: (roof: RoofType) => void
  onChange: (roof: RoofType, rows: MatrixRow[]) => void
}) {
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const roof = active && roofs.includes(active) ? active : roofs[0]
  const rows = useMemo(() => (roof ? value[roof] ?? [] : []), [roof, value])
  const roofErrors = roof ? errors[roof] ?? [] : []
  if (!roof) return <p className="admin-hint">Előbb kapcsolj be legalább egy tetőrendszert.</p>

  const setRows = (next: MatrixRow[]) => onChange(roof, next)
  const edit = (id: string, field: MatrixField, text: string) => setRows(rows.map((row) => (row.id === id ? { ...row, [field]: text } : row)))
  const add = () => setRows([...rows, emptyRow()])
  const remove = (id: string) => setRows(rows.filter((row) => row.id !== id))
  const hasError = (index: number, field: MatrixField) => roofErrors.some((error) => error.row === index + 1 && (error.field === field || error.field === null))
  const importText = (text: string, replace: boolean) => {
    const parsed = parsePastedRows(text)
    if (!parsed.length) return false
    const kept = replace ? [] : rows.filter((row) => row.width.trim() || row.depth.trim() || row.price.trim())
    setRows([...kept, ...parsed])
    return true
  }
  // Több soros beillesztés egy cellába (Excelből): a sorok a táblázat végére kerülnek.
  const onCellPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text')
    if (!/[\n\t;]/.test(text.trim())) return
    if (importText(text, false)) event.preventDefault()
  }

  return <div className="matrix-editor">
    <div className="matrix-tabs" role="tablist" aria-label="Tetőtípus">
      {roofs.map((item) => {
        const count = (value[item] ?? []).filter((row) => row.width.trim() || row.depth.trim() || row.price.trim()).length
        const broken = (errors[item] ?? []).length > 0
        return <button type="button" role="tab" key={item} aria-selected={item === roof} className={`${item === roof ? 'is-on' : ''}${broken ? ' is-error' : ''}`} onClick={() => onActiveChange(item)}>
          {ROOF_INFO[item].name}<em>{count || '–'}</em>
        </button>
      })}
    </div>

    <div className="matrix-scroll" role="tabpanel" aria-label={`${ROOF_INFO[roof].name} ármátrix`}>
      <table className="matrix-table">
        <thead><tr><th className="matrix-num">#</th>{COLUMNS.map((column) => <th key={column.field}>{column.label} <small>{column.unit}</small></th>)}<th className="matrix-psm">Ft/m²</th><th><span className="sr-only">Törlés</span></th></tr></thead>
        <tbody>
          {rows.map((row, index) => {
            const perSquare = pricePerSquareMeter(row)
            return <tr key={row.id}>
              <td className="matrix-num">{index + 1}</td>
              {COLUMNS.map((column) => <td key={column.field}>
                <input
                  inputMode={column.mode}
                  autoComplete="off"
                  value={row[column.field]}
                  placeholder={column.placeholder}
                  aria-label={`${index + 1}. sor ${column.label.toLowerCase()} (${column.unit})`}
                  aria-invalid={hasError(index, column.field) || undefined}
                  onChange={(event) => edit(row.id, column.field, event.target.value)}
                  onPaste={onCellPaste}
                />
              </td>)}
              <td className="matrix-psm">{perSquare ? huf.format(perSquare) : '—'}</td>
              <td className="matrix-del"><button type="button" onClick={() => remove(row.id)} aria-label={`${index + 1}. sor törlése`} title="Sor törlése"><Trash2 size={16} /></button></td>
            </tr>
          })}
          {rows.length === 0 && <tr><td colSpan={6} className="matrix-empty">Nincs még sor — ennél a tetőnél a m²-ár számít. Adj hozzá sort, vagy illessz be táblázatot.</td></tr>}
        </tbody>
      </table>
    </div>

    {roofErrors.length > 0 && <ul className="matrix-errors" role="alert">{roofErrors.slice(0, 6).map((error) => <li key={`${error.row}-${error.field}-${error.message}`}>{error.message}</li>)}{roofErrors.length > 6 && <li>…és még {roofErrors.length - 6} hiba.</li>}</ul>}

    <div className="matrix-actions">
      <button type="button" className="btn" onClick={add}><Plus size={15} />Sor hozzáadása</button>
      <button type="button" className="btn ghost" onClick={() => setPasteOpen((open) => !open)} aria-expanded={pasteOpen}><ClipboardPaste size={15} />Beillesztés táblázatból</button>
    </div>
    {pasteOpen && <div className="matrix-paste">
      <label><span>Másold be Excelből vagy Google Táblázatokból (oszlopok: szélesség, mélység, nettó ár)</span>
        <textarea rows={5} value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder={'4\t3\t1830000\n5\t4\t2650000'} /></label>
      <div className="matrix-actions">
        <button type="button" className="btn" disabled={!pasteText.trim()} onClick={() => { if (importText(pasteText, false)) { setPasteText(''); setPasteOpen(false) } }}>Hozzáfűzés</button>
        <button type="button" className="btn ghost" disabled={!pasteText.trim()} onClick={() => { if (importText(pasteText, true)) { setPasteText(''); setPasteOpen(false) } }}>Csere</button>
      </div>
    </div>}
  </div>
}
