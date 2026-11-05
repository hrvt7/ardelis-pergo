import { ArrowUpRight, Menu, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import LamelixLogo from '@/components/LamelixLogo'

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={`site-brand ${compact ? 'compact' : ''}`} to="/minta" aria-label="Lamelix – mintaoldal kezdőlap">
    <LamelixLogo height={compact ? 24 : 28} title={null} />
  </Link>
}

export default function SiteHeader({ action }: { action?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const defaultAction = <Link className="header-studio-link" to="/konfigurator">Tervezés indítása <ArrowUpRight size={15} /></Link>
  return <header className="site-header">
    <Brand />
    <button className="site-menu-toggle" type="button" aria-label={open ? 'Menü bezárása' : 'Menü megnyitása'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    <nav className={open ? 'is-open' : ''} aria-label="Fő navigáció" onClick={() => setOpen(false)}>
      <NavLink to="/konfigurator">3D stúdió</NavLink>
      {location.pathname === '/minta' ? <a href="#folyamat">Folyamat</a> : <Link to="/minta#folyamat">Folyamat</Link>}
      <div className="site-mobile-action">{action ?? defaultAction}</div>
    </nav>
    <div className="site-header-action">{action ?? defaultAction}</div>
  </header>
}

export function SiteFooter() {
  return <footer className="site-footer"><Brand compact /><p>Paraméteres pergolatervezés, valós idejű vizualizáció és műszaki összefoglaló.</p><div><Link to="/konfigurator">3D stúdió</Link></div><small>© {new Date().getFullYear()} Lamelix · Az irányárak nem minősülnek ajánlattételnek.</small></footer>
}
