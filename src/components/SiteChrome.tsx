import { ArrowUpRight, Menu, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={`site-brand ${compact ? 'compact' : ''}`} to="/" aria-label="ARDELIS Atelier kezdőlap">
    <svg viewBox="0 0 34 34" aria-hidden="true"><path d="M4 27V9l13-5 13 5v18M4 15h26M10 27V15m14 12V15M4 27h26" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
    <span><strong>ARDELIS</strong><small>/ PERGO</small></span>
  </Link>
}

export default function SiteHeader({ action }: { action?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const defaultAction = <Link className="header-studio-link" to="/studio/pergola">Tervezés indítása <ArrowUpRight size={15} /></Link>
  return <header className="site-header">
    <Brand />
    <button className="site-menu-toggle" type="button" aria-label={open ? 'Menü bezárása' : 'Menü megnyitása'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    <nav className={open ? 'is-open' : ''} aria-label="Fő navigáció" onClick={() => setOpen(false)}>
      <NavLink to="/studio/pergola">Pergo stúdió</NavLink>
      {location.pathname === '/' ? <a href="#folyamat">Folyamat</a> : <Link to="/#folyamat">Folyamat</Link>}
      <NavLink to="/keresett">Kérelmem</NavLink>
      <div className="site-mobile-action">{action ?? defaultAction}</div>
    </nav>
    <div className="site-header-action">{action ?? defaultAction}</div>
  </header>
}

export function SiteFooter() {
  return <footer className="site-footer"><Brand compact /><p>Paraméteres pergolatervezés, valós idejű vizualizáció és műszaki összefoglaló.</p><div><Link to="/studio/pergola">3D stúdió</Link><Link to="/keresett">Kérelem követése</Link><Link to="/partnerek">Partneri belépés</Link></div><small>© {new Date().getFullYear()} ARDELIS Atelier · Az irányárak nem minősülnek ajánlattételnek.</small></footer>
}
