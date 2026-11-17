import App from './App.tsx'
import SwUpdateBanner from '@/components/SwUpdateBanner'
// Vercel Web Analytics: csak ha a projektben be van kapcsolva és VITE_VERCEL_ANALYTICS=1 (különben a szkript 404-et adna).
import { Analytics } from '@vercel/analytics/react'
import { redactPrivatePath } from '@/lib/privatePath'

/** Az alkalmazás teljes fája a router alatt. A böngésző (src/main.tsx) és a build-idejű előrenderelés
 * (src/entry-prerender.tsx) ugyanezt rendereli, így a HTML-be írt nyitóoldal hidratálható. */
export default function AppShell() {
  return <>
    <App />
    <SwUpdateBanner />
    {import.meta.env.VITE_VERCEL_ANALYTICS === '1' && <Analytics beforeSend={(event) => ({ ...event, url: redactPrivatePath(event.url) })} />}
  </>
}
