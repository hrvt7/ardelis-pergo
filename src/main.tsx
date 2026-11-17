// Elsőként: a felület nyelve (a gyártó URL-jéből), mielőtt bármely szövegtár létrejön.
import "@/i18n/bootLocale";
import "@/lib/logger";
import "@/lib/previewShim";
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
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
import AppShell from './AppShell'
import { registerServiceWorker } from '@/lib/swClient'
import { captureInstallPrompt } from '@/lib/installPrompt'
import { introPlaying } from '@/lib/introGate'
import { INTRO_DONE_EVENT } from '@/lib/introSplash'

// Telepíthető webapp: a SW csak éles buildben, https-en (helyi próbához localhoston) és nem az előnézeti buildben.
captureInstallPrompt()
registerServiceWorker({ prod: import.meta.env.PROD, mode: import.meta.env.MODE, router: import.meta.env.VITE_ROUTER })

// Nyitó animáció (telepített webapp, mobil/tablet): amíg fut, a felület sem épül fel, hogy az animáció ne szaggasson;
// a végén (a logós zárókép mögött) indul. Nyitó animáció nélkül azonnal.
const tree = <StrictMode>
  {import.meta.env.VITE_ROUTER === 'memory'
    // Előnézeti (artifact) build: az oldal nem a domain gyökerén fut, ezért belső útválasztás.
    // A kezdő nézet a ?route= paraméterrel választható (alapból a konfigurátor).
    ? <MemoryRouter initialEntries={[`${new URLSearchParams(window.location.search).get('route') ?? '/konfigurator'}${window.location.search}`]}><App /></MemoryRouter>
    : <BrowserRouter><AppShell /></BrowserRouter>}
</StrictMode>

// A nyitóoldal első képernyője a HTML-ben előrenderelve érkezik (src/entry-prerender.ts): azt hidratáljuk, nem rajzoljuk újra.
// Horgonnyal (#arak) érkezve minden szakasz azonnal kell, ez eltér az előrenderelt első képernyőtől: ott tiszta renderelés.
const mount = () => {
  const root = document.getElementById('root')!
  const hash = window.location.hash
  // Csak akkor hidratál, ha a HTML pontosan ehhez az útvonalhoz készült (a data-ssr az előrenderelt útvonal).
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const hydrate = root.dataset.ssr === path && (!hash || hash === '#' || hash === '#top') && import.meta.env.VITE_ROUTER !== 'memory'
  if (hydrate) hydrateRoot(root, tree)
  else {
    root.removeAttribute('data-ssr'); root.textContent = ''; createRoot(root).render(tree)
    // Horgonnyal érkezve a böngésző a cél megjelenése előtt próbált görgetni: ha a cél felépült, odaállunk.
    if (hash.length > 1 && hash !== '#top') {
      let tries = 0
      const find = () => {
        let target: Element | null = null
        try { target = document.querySelector(decodeURIComponent(hash)) } catch { return }
        if (target) target.scrollIntoView()
        else if (tries++ < 120) requestAnimationFrame(find)
      }
      requestAnimationFrame(find)
    }
  }
  // A keresőknek szánt rejtett szövegváltozat (JavaScript nélkül olvasható) a felépült oldal mellett már fölösleges.
  document.querySelector('.prerender-copy')?.remove()
}
if (introPlaying()) window.addEventListener(INTRO_DONE_EVENT, mount, { once: true })
else mount()
