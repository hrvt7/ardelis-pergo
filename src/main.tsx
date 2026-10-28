import "@/lib/logger";
import "@/lib/previewShim";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {import.meta.env.VITE_ROUTER === 'memory'
      // Előnézeti (artifact) build: az oldal nem a domain gyökerén fut, ezért belső útválasztás.
      // A kezdő nézet a ?route= paraméterrel választható (alapból a konfigurátor).
      ? <MemoryRouter initialEntries={[`${new URLSearchParams(window.location.search).get('route') ?? '/studio/pergola'}${window.location.search}`]}><App /></MemoryRouter>
      : <BrowserRouter><App /></BrowserRouter>}
  </StrictMode>,
)
