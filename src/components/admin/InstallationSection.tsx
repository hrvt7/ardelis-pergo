// Érdeklődő panel: „Telepítés rögzítése” (csak Megnyert / Felszerelve állapotban), illetve a meglévő telepítés összefoglalója.
import { useState, type FormEvent } from 'react'
import { BadgeCheck, ExternalLink, Wrench } from 'lucide-react'
import { ownerLink, type AdminInstallation, type InstallationDraft } from '@/lib/adminInstallations'
import { WARRANTY_GROUPS, warrantyGroupLabel, type WarrantyMonths } from '@/lib/installations'

export interface InstallationApi {
  all: AdminInstallation[]
  create: (draft: InstallationDraft) => Promise<{ ok: true; installation: AdminInstallation } | { ok: false; error: string }>
  defaults: WarrantyMonths
  /** Ugrás a Telepítések nézetre (a kiválasztott telepítéssel). */
  open: (id: number) => void
  /** Demó módban nincs mentés. */
  disabled?: string
}

const today = () => new Date().toISOString().slice(0, 10)
const longDate = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'long' })

export default function InstallationSection({ leadRef, status, api, onRecorded }: { leadRef: string; status: string; api: InstallationApi; onRecorded?: () => void }) {
  const existing = api.all.find((item) => item.leadRef === leadRef)
  const [open, setOpen] = useState(false)
  const [installedAt, setInstalledAt] = useState(today)
  const [warranty, setWarranty] = useState<WarrantyMonths>(api.defaults)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (existing) {
    return <section className="install-box is-done">
      <div className="field-label">Telepítés</div>
      <p><BadgeCheck size={15} /> Rögzítve: {longDate.format(new Date(`${existing.installedAt}T12:00:00`))} · {existing.headline}</p>
      <div className="install-actions">
        <button type="button" className="btn" onClick={() => api.open(existing.id)}><Wrench size={15} />Telepítés megnyitása</button>
        <a className="btn ghost" href={ownerLink(window.location.origin, existing.token)} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Tulajdonosi oldal</a>
      </div>
    </section>
  }
  if (status !== 'won' && status !== 'installed') return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (api.disabled) { setError(api.disabled); return }
    setBusy(true)
    const result = await api.create({ leadRef, installedAt, warranty, note })
    setBusy(false)
    if (!result.ok) { setError(result.error); return }
    setOpen(false)
    onRecorded?.()
  }

  return <section className="install-box">
    <div className="field-label">Telepítés</div>
    {!open ? <>
      <p className="admin-hint">A felszerelés után rögzítsd a telepítést: a terv és az akkori ár befagy, a tulajdonos saját linket és QR-kódot kap a garanciához és a hibabejelentéshez.</p>
      <button type="button" className="btn primary" onClick={() => setOpen(true)}><Wrench size={15} />Telepítés rögzítése</button>
    </> : <form className="install-form" onSubmit={submit}>
      <label><span>A telepítés napja</span><input type="date" required max={today()} value={installedAt} onChange={(event) => setInstalledAt(event.target.value)} /></label>
      <fieldset><legend>Garancia <small>(hónap)</small></legend>
        {WARRANTY_GROUPS.map((group) => <label key={group}><span>{warrantyGroupLabel(group)}</span><input type="number" min={0} max={240} step={1} required value={warranty[group]} onChange={(event) => setWarranty({ ...warranty, [group]: Math.min(240, Math.max(0, Math.round(Number(event.target.value) || 0))) })} /></label>)}
      </fieldset>
      <label><span>Belső megjegyzés <small>(a tulajdonos nem látja)</small></span><textarea rows={2} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="pl. sorozatszámok, szerelőcsapat" /></label>
      <p className="admin-hint">A rögzítéskor a konfiguráció, a komponenslista és az ár (elfogadott ajánlat, ha van; különben a mai árlista) befagy, utólag nem változik.</p>
      {error && <p className="admin-message is-error" role="alert">{error}</p>}
      <div className="install-actions"><button type="submit" className="btn primary" disabled={busy}>{busy ? 'Rögzítés…' : 'Rögzítés'}</button><button type="button" className="btn ghost" onClick={() => setOpen(false)} disabled={busy}>Mégse</button></div>
    </form>}
  </section>
}
