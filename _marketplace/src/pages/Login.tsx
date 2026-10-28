import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import SiteHeader, { SiteFooter } from '@/components/SiteChrome'
import { usePageSeo } from '@/lib/usePageSeo'

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL
  const appID = import.meta.env.VITE_APP_ID
  const redirectUri = `${window.location.origin}/api/oauth/callback`
  const state = btoa(redirectUri)
  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`)
  url.searchParams.set('client_id', appID)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'profile')
  url.searchParams.set('state', state)
  return url.toString()
}

export default function Login() {
  usePageSeo('/login')
  return <div className="marketing-page login-page">
    <SiteHeader />
    <main className="login-main">
      <section>
        <span>ARDELIS / BIZTONSÁGOS PARTNERI FELÜLET</span>
        <h1>A projektjeid.<br /><em>Egy helyen.</em></h1>
        <p>Jelentkezz be Kimi-fiókkal a partnerregisztrációhoz, a projektajánlatokhoz és a saját munkáidhoz. Az adminisztrációs felület külön jogosultságot igényel.</p>
        <button className="button-primary" type="button" onClick={() => { window.location.href = getOAuthUrl() }}>Belépés Kimi-fiókkal <ArrowUpRight size={17} /></button>
        <small><ShieldCheck size={15} />A jelszavadat az ARDELIS nem kezeli; a belépés a Kimi hitelesítésén keresztül történik.</small>
      </section>
    </main>
    <SiteFooter />
  </div>
}
