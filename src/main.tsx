import "@/lib/logger";
import "@/lib/previewShim";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router'
// Saját tárhelyű betűk (ugyanazok, mint korábban a Google Fontsról), a latin és latin-ext alkészlettel.
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import '@fontsource/geist/400.css'
import '@fontsource/geist/500.css'
import '@fontsource/geist/600.css'
import '@fontsource/geist/700.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource/cormorant-garamond/500-italic.css'
// A konfigurátor felülete: Inter (szöveg, igazított számok) + Manrope (címek), változtatható súlyú, latin-ext alkészlettel (ő, ű).
import '@fontsource-variable/inter/index.css'
import '@fontsource-variable/manrope/index.css'
// Üveges felületi változat (?style=glass): Outfit.
import '@fontsource-variable/outfit/index.css'
// Gyártói admin (világos felület): Poppins.
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import './index.css'
import App from './App.tsx'
// Vercel Web Analytics: csak ha a projektben be van kapcsolva és VITE_VERCEL_ANALYTICS=1 (különben a szkript 404-et adna).
import { Analytics } from '@vercel/analytics/react'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {import.meta.env.VITE_ROUTER === 'memory'
      // Előnézeti (artifact) build: az oldal nem a domain gyökerén fut, ezért belső útválasztás.
      // A kezdő nézet a ?route= paraméterrel választható (alapból a konfigurátor).
      ? <MemoryRouter initialEntries={[`${new URLSearchParams(window.location.search).get('route') ?? '/konfigurator'}${window.location.search}`]}><App /></MemoryRouter>
      : <BrowserRouter><App />{import.meta.env.VITE_VERCEL_ANALYTICS === '1' && <Analytics />}</BrowserRouter>}
  </StrictMode>,
)
