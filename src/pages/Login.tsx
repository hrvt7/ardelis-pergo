// Gyártói belépés a nyitóoldalról: a gyártói azonosító megadása után a saját adminfelület belépője nyílik meg
// (/k/<azonosító>/admin). A jelszót ott kéri a meglévő admin; itt semmilyen adat nem kerül tárolásra.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight } from 'lucide-react'
import LamelixLogo from '@/components/LamelixLogo'
import { getTenant } from '@/tenants'
import { usePageSeo } from '@/lib/usePageSeo'
import '@/platform.css'

export default function Login() {
  usePageSeo('/belepes')
  const navigate = useNavigate()
  const [id, setId] = useState(() => { try { return localStorage.getItem('lamelix-tenant') ?? '' } catch { return '' } })
  const [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const slug = id.trim().toLowerCase()
    if (!slug || !getTenant(slug)) { setError('Ezzel az azonosítóval nincs gyártói fiók. Az azonosítót a bevezetéskor küldjük el; ha elveszett, írjon nekünk.'); return }
    try { localStorage.setItem('lamelix-tenant', slug) } catch { /* privát mód */ }
    navigate(`/k/${encodeURIComponent(slug)}/admin`)
  }
  return <div className="pf-page pf-login">
    <form className="pf-login-card" onSubmit={submit} noValidate>
      <Link to="/" aria-label="Lamelix kezdőlap"><LamelixLogo height={26} title={null} /></Link>
      <h1>Gyártói belépés</h1>
      <p>Adja meg a gyártói azonosítóját (például a konfigurátor címében szereplő nevet), utána a jelszavával lép be az adminfelületre.</p>
      <label>Gyártói azonosító
        <input name="tenant" autoComplete="organization" autoCapitalize="none" spellCheck={false} required value={id} onChange={(event) => { setId(event.target.value); setError('') }} aria-invalid={!!error} aria-describedby={error ? 'login-error' : undefined} />
      </label>
      {error && <p id="login-error" className="pf-login-error" role="alert">{error}</p>}
      <button className="pf-btn pf-btn-primary" type="submit">Tovább a belépéshez <ArrowRight size={18} /></button>
      <Link className="pf-login-back" to="/">← Vissza a Lamelix oldalára</Link>
    </form>
  </div>
}
