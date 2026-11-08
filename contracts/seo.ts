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
    question: 'Mi a különbség a pergola, a veranda és a télikert között?',
    answer: 'A pergola jellemzően nyitott vagy részben zárható teraszfedés, mozgatható lamellákkal vagy fix tetővel. A veranda fix tetős, oldalain üvegezett vagy tömör fallal zárt tér, amely az év nagy részében használható. A télikert hőszigetelt üvegszerkezetű, fűthető és hűthető helyiség, amely egész évben lakótérként is szolgálhat. A konfigurátor mindhárom típust kezeli, az elérhető tető- és oldalzárási lehetőségek a kiválasztott típushoz igazodnak.',
  },
  {
    question: 'Lehet-e a verandát vagy a télikertet fűteni és hűteni?',
    answer: 'Igen, a télikert tervezésekor kiválasztható a klimatizálás (például split klíma) és a padlófűtés, az üvegezés hőszigetelése pedig két- vagy háromrétegű üveggel növelhető. A tényleges fűtési és hűtési teljesítményt, valamint a hőszigetelési követelményeket a végleges műszaki tervben kell meghatározni.',
  },
  {
    question: 'Kell-e engedély verandához vagy télikerthez?',
    answer: 'A zárt, tartósan használt épületrész – így a veranda és különösen a fűtött télikert – gyakran szigorúbb bejelentési vagy építési engedélyezési szabályok alá esik, mint egy nyitott pergola. Az alapterület, az épülethez csatlakozás, a telekhatár-távolság és a helyi építési szabályzat is számít, ezért kivitelezés előtt mindenképp érdemes az önkormányzatnál és építész tervezőnél egyeztetni. A konfigurátor tájékoztató jellegű, ezt nem helyettesíti.',
  },
  {
    question: 'Mit vizsgálnak a helyszíni felméréskor?',
    answer: 'A felmérés során ellenőrizhetők a pontos méretek, a rögzítési felületek, a terep- és burkolati adottságok, a vízelvezetés, az elektromos csatlakozások, valamint a kért oldalzárás és kiegészítők beépítési feltételei. Ennek alapján pontosítható a műszaki tartalom és az ár.',
  },
  {
    question: 'Telefonon is használható a 3D tervező?',
    answer: 'Igen. A konfigurátor mobilon külön kezelőfelületet és érintésre optimalizált 3D nézetet használ. A méret, a tetőrendszer, a szín, az oldalzárás és a kiegészítők mobilon is módosíthatók; a részletes ellenőrzéshez nagyobb képernyő is használható.',
  },
] as const

export type SeoPage = {
  key: 'platform' | 'home' | 'privacy' | 'studio' | 'studio-carport' | 'studio-fence' | 'track' | 'partners' | 'admin' | 'login' | 'notFound'
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
    title: 'Lamelix – 3D pergola-, veranda- és télikert-konfigurátor gyártóknak',
    description: 'Saját márkás 3D pergola-, veranda- és télikert-konfigurátor gyártóknak és forgalmazóknak: azonnali irányár, AR-nézet, fotóba helyezés, ármátrix, QR-kódos terv és gyártói admin. Kérjen demót!',
    robots: INDEX_ROBOTS,
    indexable: true,
  },
  '/en': {
    key: 'platform',
    path: '/en',
    title: 'Lamelix – 3D pergola, veranda and conservatory configurator for manufacturers',
    description: 'White-label 3D pergola, veranda and conservatory configurator for manufacturers and dealers: instant guide price, AR view, photo placement, price matrix, QR-coded designs and a manufacturer admin. Request a demo!',
    robots: INDEX_ROBOTS,
    indexable: true,
  },
  '/minta': {
    key: 'home',
    path: '/minta',
    title: 'Élő termékbemutató – minta pergola-konfigurátor | Lamelix',
    description: 'Így néz ki a Lamelix konfigurátor a vásárló szemével: valós idejű 3D pergola-, veranda- és télikerttervezés, azonnali irányár, felmérési kérelem. Minta gyártói oldal, kivitelezést a Lamelix nem vállal.',
    robots: INDEX_ROBOTS,
    indexable: true,
  },
  '/konfigurator': {
    key: 'studio',
    path: '/konfigurator',
    title: 'Élő demó: 3D pergola-, veranda- és télikerttervező | Lamelix',
    description: 'Próbáld ki élőben a Lamelix 3D konfigurátort: valós méretek, motoros lamellák, üvegfal, ajtó, klíma és kiegészítők, azonnali irányár és PDF. Demó mintaárakkal gyártóknak.',
    robots: INDEX_ROBOTS,
    indexable: true,
  },
  '/konfigurator/carport': {
    key: 'studio-carport',
    path: '/konfigurator/carport',
    title: 'Carport és előtető tervező 3D-ben, azonnali irányárral | Lamelix',
    description: 'Tervezd meg a carportot vagy előtetőt 3D-ben: egy- vagy kétállásos, szabadon álló vagy a házhoz rögzített, lemez-, polikarbonát- vagy üvegtetővel, szín és LED. Azonnali irányár, PDF, felmérés.',
    robots: INDEX_ROBOTS,
    indexable: true,
  },
  '/konfigurator/kerites': {
    key: 'studio-fence',
    path: '/konfigurator/kerites',
    title: 'Kerítés és kapu tervező 3D-ben, folyóméter-árral | Lamelix',
    description: 'Tervezd meg a kerítést 3D-ben: alumínium, acél, kovácsoltvas, fa vagy WPC, mintázat és szín, toló- vagy nyílókapu motorral, kiskapu. Azonnali irányár folyóméterre, PDF és felmérés.',
    robots: INDEX_ROBOTS,
    indexable: true,
  },
  '/adatkezeles': {
    key: 'privacy',
    path: '/adatkezeles',
    title: 'Adatkezelési tájékoztató | Lamelix',
    description: 'A Lamelix platform adatkezelési tájékoztatója: demókérés, felmérési kérelmek, névtelen használati mérés, az érintettek jogai.',
    robots: INDEX_ROBOTS,
    indexable: true,
  },
  '/keresett': {
    key: 'track',
    path: '/keresett',
    title: 'Felmérési kérelem követése | Lamelix',
    description: 'Felmérési kérelem állapotának biztonságos lekérdezése projektazonosítóval és e-mail-címmel.',
    robots: PRIVATE_ROBOTS,
    indexable: false,
  },
  '/partnerek': {
    key: 'partners',
    path: '/partnerek',
    title: 'Partneri munkatér | Lamelix',
    description: 'Jogosultsághoz kötött Lamelix partneri munkatér.',
    robots: PRIVATE_ROBOTS,
    indexable: false,
  },
  '/admin': {
    key: 'admin',
    path: '/admin',
    title: 'Adminisztráció | Lamelix',
    description: 'Jogosultsághoz kötött Lamelix adminisztrációs felület.',
    robots: PRIVATE_ROBOTS,
    indexable: false,
  },
  '/login': {
    key: 'login',
    path: '/login',
    title: 'Partneri belépés | Lamelix',
    description: 'Biztonságos belépés az Lamelix partneri felületre.',
    robots: PRIVATE_ROBOTS,
    indexable: false,
  },
}

export const SEO_SITEMAP_PATHS = ['/', '/en', '/minta', '/konfigurator', '/konfigurator/carport', '/konfigurator/kerites', '/adatkezeles'] as const

export function normalizeSeoPath(pathname: string) {
  if (!pathname || pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

export function getSeoPage(pathname: string): SeoPage {
  const normalized = normalizeSeoPath(pathname)
  return SEO_PAGES[normalized] ?? {
    key: 'notFound',
    path: normalized,
    title: 'A keresett oldal nem található | Lamelix',
    description: 'A keresett oldal nem érhető el. Térj vissza az Lamelix nyitóoldalára vagy indítsd el a 3D tervezőt.',
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
    name: 'Lamelix',
    url: `${origin}/`,
    brand: { '@type': 'Brand', name: 'Lamelix' },
    areaServed: { '@type': 'Country', name: 'Magyarország' },
  }
  const website = {
    '@type': 'WebSite',
    '@id': websiteId,
    name: 'Lamelix',
    url: `${origin}/`,
    inLanguage: 'hu-HU',
    publisher: { '@id': organizationId },
  }

  if (page.key === 'platform') {
    const english = page.path === '/en'
    return [
      { ...website, inLanguage: english ? 'en' : 'hu-HU', url: `${origin}${english ? '/en' : '/'}` },
      {
        '@type': 'SoftwareApplication',
        '@id': `${origin}/#software`,
        name: english ? 'Lamelix – 3D pergola configurator for manufacturers' : 'Lamelix – 3D pergola-konfigurátor gyártóknak',
        brand: { '@type': 'Brand', name: 'Lamelix' },
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web browser',
        inLanguage: english ? 'en' : 'hu-HU',
        url: `${origin}${english ? '/en' : '/'}`,
        description: page.description,
        offers: { '@type': 'Offer', priceCurrency: 'HUF', price: '59000', description: english ? 'Monthly subscription, net price' : 'Havi előfizetés, nettó ár' },
      },
    ]
  }

  if (page.key === 'home') {
    return [
      organization,
      website,
      {
        '@type': 'WebPage',
        '@id': `${origin}/minta#page`,
        name: 'Lamelix élő termékbemutató – minta pergola-konfigurátor',
        description: 'Minta gyártói oldal: így használja a vásárló a gyártó Lamelix-konfigurátorát. A Lamelix szoftvert fejleszt, kivitelezést nem vállal.',
        url: `${origin}/minta`,
        inLanguage: 'hu-HU',
        isPartOf: { '@id': websiteId },
        about: { '@id': organizationId },
      },
      {
        '@type': 'FAQPage',
        '@id': `${origin}/minta#gyik`,
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
        '@id': `${origin}/konfigurator#application`,
        name: 'Lamelix élő demó – 3D pergola-, veranda- és télikerttervező',
        url: `${origin}/konfigurator`,
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Web browser',
        browserRequirements: 'JavaScript és WebGL támogatás szükséges.',
        inLanguage: 'hu-HU',
        isAccessibleForFree: true,
        publisher: { '@id': organizationId },
        featureList: [
          'Valós idejű, méretarányos 3D előnézet pergolához, verandához és télikerthez',
          'Falhoz csatlakozó és önálló kivitel',
          'Motoros lamellás, eltolható és fix tetőrendszer',
          'Oldalzárás, üvegfal, ajtó, világítás, klíma és kiegészítők konfigurálása',
          'Tájékoztató árkalkuláció és PDF-összefoglaló',
        ],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Lamelix', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: '3D tervező', item: `${origin}/konfigurator` },
        ],
      },
    ]
  }

  return []
}
