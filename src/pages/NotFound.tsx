import '@/index.css'
import '@/appFonts'
import { ArrowUpRight } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import LamelixLogo from '@/components/LamelixLogo'
import { usePageSeo } from '@/lib/usePageSeo'
import '@/legal.css'

export default function NotFound() {
  const location = useLocation()
  usePageSeo(location.pathname)

  return <main className="legal-page notfound-page">
    <header><Link to="/" aria-label="Lamelix kezdőlap"><LamelixLogo height={26} title={null} tone="onLight" /></Link></header>
    <article>
      <p className="legal-eyebrow">404 · Az oldal nem található</p>
      <h1>Ez az oldal <em>nem érhető el.</em></h1>
      <p>A hivatkozás elavult lehet, vagy a cím pontatlan. A nyitóoldalról elérheted a pergolatervezési útmutatót és a valós idejű 3D konfigurátort is.</p>
      <Link className="notfound-cta" to="/">Vissza a kezdőlapra <ArrowUpRight size={17} /></Link>
    </article>
  </main>
}
