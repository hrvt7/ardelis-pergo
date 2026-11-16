// Hibabejelentés a tulajdonosi oldalon: komponens a zárt listából, leírás, legfeljebb 4 fotó, kötelező hozzájárulás.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera, CheckCircle2, Trash2, Wrench } from 'lucide-react'
import { tr } from '@/i18n/locale'
import { MAX_ORIGINAL_BYTES, preparePhoto } from '@/lib/photoPrep'

export interface ReportComponent { key: string; label: string; active: boolean }
interface Shot { id: string; preview: string; blob: Blob }

const MAX_PHOTOS = 4

export default function ServiceReport({ token, components, brandName, privacyUrl }: { token: string; components: ReportComponent[]; brandName: string; privacyUrl: string | null }) {
  const [open, setOpen] = useState(false)
  const [component, setComponent] = useState('')
  const [description, setDescription] = useState('')
  const [shots, setShots] = useState<Shot[]>([])
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState<string>('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const shotsRef = useRef<Shot[]>([])
  useEffect(() => { shotsRef.current = shots }, [shots])
  // Kilépéskor az előnézeti objektum-URL-ek felszabadítása.
  useEffect(() => () => { for (const shot of shotsRef.current) URL.revokeObjectURL(shot.preview) }, [])

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    const room = MAX_PHOTOS - shots.length
    const chosen = Array.from(files).slice(0, room)
    if (files.length > room) setError(tr(`Legfeljebb ${MAX_PHOTOS} fotó csatolható.`, `Höchstens ${MAX_PHOTOS} Fotos möglich.`))
    setBusy(tr('Fotó előkészítése…', 'Foto wird vorbereitet…'))
    const added: Shot[] = []
    for (const file of chosen) {
      if (file.size > MAX_ORIGINAL_BYTES) { setError(tr('Egy kép nagyobb 8 MB-nál, ezt kihagytuk.', 'Ein Bild ist größer als 8 MB und wurde übersprungen.')); continue }
      const result = await preparePhoto(file)
      if (!result.ok) { setError(result.error === 'unsupported' ? tr('Ezt a képformátumot a böngésző nem tudja megnyitni. Készíts JPEG fotót, vagy állítsd a kamerát „Legkompatibilisebb” formátumra.', 'Dieses Bildformat kann der Browser nicht öffnen. Bitte ein JPEG-Foto verwenden.') : tr('Egy képet nem sikerült előkészíteni.', 'Ein Bild konnte nicht vorbereitet werden.')); continue }
      added.push({ id: crypto.randomUUID(), preview: URL.createObjectURL(result.blob), blob: result.blob })
    }
    setShots((current) => [...current, ...added].slice(0, MAX_PHOTOS))
    setBusy('')
    if (fileInput.current) fileInput.current.value = ''
  }

  const remove = (id: string) => setShots((current) => {
    const shot = current.find((item) => item.id === id)
    if (shot) URL.revokeObjectURL(shot.preview)
    return current.filter((item) => item.id !== id)
  })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!component) { setError(tr('Válaszd ki, melyik részével van gond.', 'Bitte wählen Sie das betroffene Teil.')); return }
    if (description.trim().length < 10) { setError(tr('Írd le pár mondatban a hibát (legalább 10 karakter).', 'Bitte beschreiben Sie den Fehler (mindestens 10 Zeichen).')); return }
    if (!consent) { setError(tr('A bejelentéshez a hozzájárulás szükséges.', 'Für die Meldung ist die Einwilligung erforderlich.')); return }
    try {
      const photos: string[] = []
      for (const [index, shot] of shots.entries()) {
        setBusy(tr(`Fotó feltöltése (${index + 1}/${shots.length})…`, `Foto wird hochgeladen (${index + 1}/${shots.length})…`))
        const response = await fetch(`/api/service-photo?t=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: shot.blob, referrerPolicy: 'no-referrer' })
        const data = await response.json().catch(() => null) as { ok?: boolean; photo?: string; error?: string } | null
        if (!response.ok || !data?.photo) { setError(data?.error ?? tr('A fotó feltöltése nem sikerült.', 'Das Foto konnte nicht hochgeladen werden.')); setBusy(''); return }
        photos.push(data.photo)
      }
      setBusy(tr('Bejelentés küldése…', 'Meldung wird gesendet…'))
      const response = await fetch('/api/service-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, referrerPolicy: 'no-referrer', body: JSON.stringify({ t: token, component, description: description.trim(), photos, consent: true, website }) })
      const data = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null
      if (!response.ok || !data?.ok) { setError(data?.error ?? tr('A bejelentés nem sikerült. Próbáld újra.', 'Die Meldung ist fehlgeschlagen. Bitte erneut versuchen.')); setBusy(''); return }
      setBusy('')
      setDone(true)
    } catch {
      setBusy('')
      setError(tr('A szerver nem érhető el. Próbáld újra.', 'Der Server ist nicht erreichbar. Bitte erneut versuchen.'))
    }
  }

  if (done) return <section className="owner-report is-done" role="status"><CheckCircle2 size={22} /><div><h2>{tr('Köszönjük, megkaptuk a bejelentést.', 'Danke, Ihre Meldung ist eingegangen.')}</h2><p>{tr(`A(z) ${brandName} munkatársa hamarosan felveszi veled a kapcsolatot.`, `Ein Mitarbeiter von ${brandName} meldet sich in Kürze bei Ihnen.`)}</p></div></section>

  if (!open) return <section className="owner-actions"><button type="button" className="owner-btn primary" onClick={() => setOpen(true)}><Wrench size={16} />{tr('Hibát jelentek', 'Fehler melden')}</button></section>

  return <form className="owner-report" onSubmit={submit} noValidate>
    <h2>{tr('Hibabejelentés', 'Fehlermeldung')}</h2>
    <label><span>{tr('Melyik részével van gond?', 'Welches Teil ist betroffen?')}</span>
      <select value={component} onChange={(event) => setComponent(event.target.value)} required>
        <option value="">{tr('Válassz…', 'Bitte wählen…')}</option>
        {components.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
      </select>
    </label>
    <label><span>{tr('Mi a hiba?', 'Was ist das Problem?')}</span>
      <textarea rows={4} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={tr('pl. A lamellák nem záródnak teljesen, a motor zúg.', 'z. B. Die Lamellen schließen nicht ganz, der Motor brummt.')} required />
    </label>
    <div className="owner-photos">
      <span>{tr('Fotók', 'Fotos')} <small>({tr(`legfeljebb ${MAX_PHOTOS}, egyenként max. 8 MB`, `höchstens ${MAX_PHOTOS}, je max. 8 MB`)})</small></span>
      <div className="owner-shots">
        {shots.map((shot) => <figure key={shot.id}><img src={shot.preview} alt="" /><button type="button" aria-label={tr('Fotó törlése', 'Foto entfernen')} onClick={() => remove(shot.id)}><Trash2 size={14} /></button></figure>)}
        {shots.length < MAX_PHOTOS && <button type="button" className="owner-add-photo" onClick={() => fileInput.current?.click()} disabled={Boolean(busy)}><Camera size={20} />{tr('Fotó hozzáadása', 'Foto hinzufügen')}</button>}
      </div>
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(event) => void addFiles(event.target.files)} />
      <small>{tr('A helyadatokat (GPS) és a többi rejtett adatot a feltöltés előtt eltávolítjuk a képekből.', 'Standortdaten (GPS) und andere versteckte Bilddaten werden vor dem Hochladen entfernt.')}</small>
    </div>
    <input className="owner-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(event) => setWebsite(event.target.value)} name="website" />
    <label className="owner-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
      <span>{tr(`Hozzájárulok, hogy a(z) ${brandName} a bejelentésemet és a fotókat a hiba kivizsgálására és a javítás egyeztetésére kezelje.`, `Ich willige ein, dass ${brandName} meine Meldung und die Fotos zur Prüfung des Fehlers und zur Abstimmung der Reparatur verarbeitet.`)} {privacyUrl && <a href={privacyUrl} target="_blank" rel="noopener noreferrer">{tr('Adatkezelési tájékoztató', 'Datenschutzerklärung')}</a>}</span>
    </label>
    {error && <p className="owner-error" role="alert">{error}</p>}
    {busy && <p className="owner-hint" role="status">{busy}</p>}
    <div className="owner-actions"><button type="submit" className="owner-btn primary" disabled={Boolean(busy)}>{tr('Bejelentés küldése', 'Meldung senden')}</button><button type="button" className="owner-btn" onClick={() => setOpen(false)} disabled={Boolean(busy)}>{tr('Mégse', 'Abbrechen')}</button></div>
  </form>
}
