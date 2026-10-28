import { ArrowUpRight } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import SiteHeader, { SiteFooter } from '@/components/SiteChrome'
import { usePageSeo } from '@/lib/usePageSeo'

export default function NotFound() {
  const location = useLocation()
  usePageSeo(location.pathname)

  return <div className="marketing-page login-page">
    <SiteHeader />
    <main className="login-main">
      <section>
        <span>404 / AZ OLDAL NEM TALÁLHATÓ</span>
        <h1>Ez az oldal<br /><em>nem érhető el.</em></h1>
        <p>A hivatkozás elavult lehet, vagy a cím pontatlan. A nyitóoldalról elérheted a pergolatervezési útmutatót és a valós idejű 3D konfigurátort is.</p>
        <Link className="button-primary" to="/">Vissza a kezdőlapra <ArrowUpRight size={17} /></Link>
      </section>
    </main>
    <SiteFooter />
  </div>
}
