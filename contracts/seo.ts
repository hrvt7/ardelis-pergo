export const PERGOLA_FAQS = [
  {
    question: 'Mi az a bioklimatikus pergola?',
    answer: 'A bioklimatikus pergola egy alumínium szerkezetű teraszfedés, amelynek mozgatható tetőlamelláival szabályozható a napfény, az árnyék és a szellőzés. Zárt lamelláknál a terasz fedetté válik; a pontos vízelvezetési és oldalzárási megoldás a kivitelezéstől függ.',
  },
  {
    question: 'Mennyibe kerül egy bioklimatikus pergola?',
    answer: 'Az árat a méret, a tetőrendszer, a rögzítés, a szerkezetszín, az oldalzárás és a kiegészítők együtt határozzák meg. A PERGO konfigurátor a beállításaid és szerkeszthető mintaárak alapján ad tájékoztató irányárat. A végleges ár helyszíni felmérés és műszaki egyeztetés után készül.',
  },
  {
    question: 'Falhoz csatlakozó vagy önálló pergolát érdemes választani?',
    answer: 'Falhoz csatlakozó kivitel akkor lehet célszerű, ha a terasz az épület mellett helyezkedik el, és a rögzítési felület műszakilag alkalmas. Önálló pergola az épülettől függetlenül, kerti vagy szabadabb elhelyezés esetén is készülhet. A megfelelő kivitelt a helyszíni adottságok és a statikai követelmények határozzák meg.',
  },
  {
    question: 'Szükséges-e engedély a pergola felépítéséhez?',
    answer: 'A bejelentési vagy engedélyezési kötelezettség a pergola kialakításától, méretétől, helyétől és az önkormányzati szabályozástól függ. Kivitelezés előtt ezért helyi jogi, építészeti és statikai ellenőrzés szükséges lehet; az online konfigurátor ezt nem helyettesíti.',
  },
  {
    question: 'Mit vizsgálnak a helyszíni felméréskor?',
    answer: 'A felmérés során ellenőrizhetők a pontos méretek, a rögzítési felületek, a terep- és burkolati adottságok, a vízelvezetés, az elektromos csatlakozások, valamint a kért oldalzárás és kiegészítők beépítési feltételei. Ennek alapján pontosítható a műszaki tartalom és az ár.',
  },
  {
    question: 'Telefonon is használható a 3D pergolatervező?',
    answer: 'Igen. A konfigurátor mobilon külön kezelőfelületet és érintésre optimalizált 3D nézetet használ. A méret, a tetőrendszer, a szín, az oldalzárás és a kiegészítők mobilon is módosíthatók; a részletes ellenőrzéshez nagyobb képernyő is használható.',
  },
] as const

export type SeoPage = {
  key: 'platform' | 'home' | 'studio' | 'track' | 'partners' | 'admin' | 'login' | 'notFound'
  path: string
  title: string
  description: string
  robots: string
  indexable: boolean
}

const INDEX_ROBOTS = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
const PRIVATE_ROBOTS = 'noindex,follow,noarchive'

const SEO_PAGES: Record<string, SeoPage> = {
  '/': {
    key: 'platform',
    path: '/',
    title: 'Lamelix — 3D pergola-konfigurátor és lead rendszer gyártóknak',
    description: 'White-label 3D pergola-konfigurátor gyártóknak és forgalmazóknak: azonnali irányár, ármátrix, QR-kódos terv, érdeklődők kezelése és gyártói admin. Kérjen demót.',
    robots: INDEX_ROBOTS,
    indexable: true,
  },
  '/ardelis': {
    key: 'home',
    path: '/ardelis',
    title: 'Bioklimatikus pergola 3D tervezése | ARDELIS PERGO',
    description: 'Tervezd meg bioklimatikus pergoládat valós idejű 3D-ben: méret, tetőrendszer, oldalzárás és világítás, azonnali irányárral és felmérési kérelemmel.',
    robots: INDEX_ROBOTS,
    indexable: true,
  },
  '/studio/pergola': {
    key: 'studio',
    path: '/studio/pergola',
    title: '3D pergolatervező és árkalkulátor | ARDELIS PERGO',
    description: 'Online 3D pergolatervező valós méretekkel, motoros lamellákkal, oldalzárással és kiegészítőkkel. Azonnali irányár, PDF és felmérési kérelem.',
    robots: INDEX_ROBOTS,
    indexable: true,
  },
  '/keresett': {
    key: 'track',
    path: '/keresett',
    title: 'Felmérési kérelem követése | ARDELIS',
    description: 'Felmérési kérelem állapotának biztonságos lekérdezése projektazonosítóval és e-mail-címmel.',
    robots: PRIVATE_ROBOTS,
    indexable: false,
  },
  '/partnerek': {
    key: 'partners',
    path: '/partnerek',
    title: 'Partneri munkatér | ARDELIS Atelier',
    description: 'Jogosultsághoz kötött ARDELIS partneri munkatér.',
    robots: PRIVATE_ROBOTS,
    indexable: false,
  },
  '/admin': {
    key: 'admin',
    path: '/admin',
    title: 'Adminisztráció | ARDELIS Atelier',
    description: 'Jogosultsághoz kötött ARDELIS adminisztrációs felület.',
    robots: PRIVATE_ROBOTS,
    indexable: false,
  },
  '/login': {
    key: 'login',
    path: '/login',
    title: 'Partneri belépés | ARDELIS Atelier',
    description: 'Biztonságos belépés az ARDELIS partneri felületre.',
    robots: PRIVATE_ROBOTS,
    indexable: false,
  },
}

export const SEO_SITEMAP_PATHS = ['/', '/ardelis', '/studio/pergola'] as const

export function normalizeSeoPath(pathname: string) {
  if (!pathname || pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

export function getSeoPage(pathname: string): SeoPage {
  const normalized = normalizeSeoPath(pathname)
  return SEO_PAGES[normalized] ?? {
    key: 'notFound',
    path: normalized,
    title: 'A keresett oldal nem található | ARDELIS',
    description: 'A keresett oldal nem érhető el. Térj vissza az ARDELIS PERGO nyitóoldalára vagy indítsd el a 3D pergolatervezőt.',
    robots: 'noindex,follow',
    indexable: false,
  }
}

export function buildStructuredData(pathname: string, origin: string) {
  const page = getSeoPage(pathname)
  const organizationId = `${origin}/#organization`
  const websiteId = `${origin}/#website`
  const organization = {
    '@type': 'Organization',
    '@id': organizationId,
    name: 'ARDELIS Atelier',
    url: `${origin}/`,
    brand: { '@type': 'Brand', name: 'PERGO' },
    areaServed: { '@type': 'Country', name: 'Magyarország' },
  }
  const website = {
    '@type': 'WebSite',
    '@id': websiteId,
    name: 'ARDELIS Atelier / PERGO',
    url: `${origin}/`,
    inLanguage: 'hu-HU',
    publisher: { '@id': organizationId },
  }

  if (page.key === 'platform') {
    return [
      website,
      {
        '@type': 'SoftwareApplication',
        '@id': `${origin}/#software`,
        name: 'Lamelix — 3D pergola-konfigurátor gyártóknak',
        brand: { '@type': 'Brand', name: 'Lamelix' },
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web browser',
        inLanguage: 'hu-HU',
        url: `${origin}/`,
        description: page.description,
        offers: { '@type': 'Offer', priceCurrency: 'HUF', price: '59000', description: 'Havi előfizetés, nettó ár' },
      },
    ]
  }

  if (page.key === 'home') {
    return [
      organization,
      website,
      {
        '@type': 'Service',
        '@id': `${origin}/ardelis#pergola-service`,
        name: 'Bioklimatikus pergola tervezése és helyszíni felmérése',
        serviceType: 'Bioklimatikus pergola tervezése',
        description: 'Paraméteres pergolatervezés valós idejű 3D előnézettel, tájékoztató árkalkulációval és helyszíni felmérési kérelemmel.',
        provider: { '@id': organizationId },
        areaServed: { '@type': 'Country', name: 'Magyarország' },
        url: `${origin}/ardelis`,
      },
      {
        '@type': 'FAQPage',
        '@id': `${origin}/ardelis#gyik`,
        inLanguage: 'hu-HU',
        mainEntity: PERGOLA_FAQS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ]
  }

  if (page.key === 'studio') {
    return [
      organization,
      {
        '@type': 'WebApplication',
        '@id': `${origin}/studio/pergola#application`,
        name: 'PERGO 3D pergolatervező',
        url: `${origin}/studio/pergola`,
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Web browser',
        browserRequirements: 'JavaScript és WebGL támogatás szükséges.',
        inLanguage: 'hu-HU',
        isAccessibleForFree: true,
        publisher: { '@id': organizationId },
        featureList: [
          'Valós idejű, méretarányos 3D pergola-előnézet',
          'Falhoz csatlakozó és önálló kivitel',
          'Motoros lamellás, eltolható és fix tetőrendszer',
          'Oldalzárás, világítás és kiegészítők konfigurálása',
          'Tájékoztató árkalkuláció és PDF-összefoglaló',
        ],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ARDELIS PERGO', item: `${origin}/ardelis` },
          { '@type': 'ListItem', position: 2, name: '3D pergolatervező', item: `${origin}/studio/pergola` },
        ],
      },
    ]
  }

  return []
}
