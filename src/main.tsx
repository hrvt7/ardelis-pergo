// Elsőként: a felület nyelve (a gyártó URL-jéből), mielőtt bármely szövegtár létrejön.
import "@/i18n/bootLocale";
import "@/lib/logger";
import "@/lib/previewShim";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router'
// Saját tárhelyű betűk. Itt csak a nyitóoldalon is használt betűk vannak (Plus Jakarta Sans, Urbanist, Geist 700);
// a konfigurátor, az admin és a mintaoldal többi betűje a src/appFonts.ts-ben, a saját útvonalukon töltődik.
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import '@fontsource/geist/700.css'
import '@fontsource-variable/urbanist/index.css'
import './base.css'
import App from './App.tsx'
import SwUpdateBanner from '@/components/SwUpdateBanner'
import { registerServiceWorker } from '@/lib/swClient'
import { captureInstallPrompt } from '@/lib/installPrompt'
import { introPlaying } from '@/lib/introGate'
import { INTRO_DONE_EVENT } from '@/lib/introSplash'
// Vercel Web Analytics: csak ha a projektben be van kapcsolva és VITE_VERCEL_ANALYTICS=1 (különben a szkript 404-et adna).
import { Analytics } from '@vercel/analytics/react'
import { redactPrivatePath } from '@/lib/privatePath'

// Telepíthető webapp: a SW csak éles buildben, https-en (helyi próbához localhoston) és nem az előnézeti buildben.
captureInstallPrompt()
registerServiceWorker({ prod: import.meta.env.PROD, mode: import.meta.env.MODE, router: import.meta.env.VITE_ROUTER })

// Nyitó animáció (telepített webapp, mobil/tablet): amíg fut, a felület sem épül fel, hogy az animáció ne szaggasson;
// a végén (a logós zárókép mögött) indul. Nyitó animáció nélkül azonnal.
const mount = () => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {import.meta.env.VITE_ROUTER === 'memory'
      // Előnézeti (artifact) build: az oldal nem a domain gyökerén fut, ezért belső útválasztás.
      // A kezdő nézet a ?route= paraméterrel választható (alapból a konfigurátor).
      ? <MemoryRouter initialEntries={[`${new URLSearchParams(window.location.search).get('route') ?? '/konfigurator'}${window.location.search}`]}><App /></MemoryRouter>
      : <BrowserRouter><App /><SwUpdateBanner />{import.meta.env.VITE_VERCEL_ANALYTICS === '1' && <Analytics beforeSend={(event) => ({ ...event, url: redactPrivatePath(event.url) })} />}</BrowserRouter>}
  </StrictMode>,
)
if (introPlaying()) window.addEventListener(INTRO_DONE_EVENT, mount, { once: true })
else mount()
