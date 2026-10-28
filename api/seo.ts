import type { Hono } from 'hono'
import type { HttpBindings } from '@hono/node-server'
import fs from 'node:fs'
import path from 'node:path'
import { buildStructuredData, getSeoPage, SEO_SITEMAP_PATHS } from '@contracts/seo'

type App = Hono<{ Bindings: HttpBindings }>

const LEGACY_REDIRECTS: Record<string, string> = {
  '/studio/canopy': '/',
  '/studio/carport': '/',
  '/studio/fence': '/',
  '/studio/gate': '/',
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}

function escapeXml(value: string) {
  return escapeHtml(value)
}

function renderSeoHtml(template: string, pathname: string, origin: string) {
  const page = getSeoPage(pathname)
  const canonical = `${origin}${page.path === '/' ? '/' : page.path}`
  const socialImage = `${origin}/assets/ardelis-og.jpg`
  const graph = buildStructuredData(page.path, origin)
  const tags = [
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    `<meta name="robots" content="${page.robots}" />`,
    `<meta name="googlebot" content="${page.robots}" />`,
    page.key === 'notFound' ? '' : `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    page.key === 'notFound' ? '' : `<link rel="alternate" hreflang="hu-HU" href="${escapeHtml(canonical)}" />`,
    page.key === 'notFound' ? '' : `<link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical)}" />`,
    '<meta property="og:locale" content="hu_HU" />',
    '<meta property="og:site_name" content="ARDELIS Atelier / PERGO" />',
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${socialImage}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="ARDELIS PERGO bioklimatikus pergola egy modern otthon teraszán" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
    `<meta name="twitter:image" content="${socialImage}" />`,
    graph.length ? `<script type="application/ld+json" data-ardelis-jsonld="true">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>` : '',
  ].filter(Boolean).join('\n    ')

  return template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/i, '')
    .replace(/<meta\s+name="robots"[^>]*>/i, '')
    .replace('</head>', `    ${tags}\n  </head>`)
}

export function registerSeoRoutes(app: App) {
  const originOf = (url: string) => new URL(url).origin

  app.get('/robots.txt', (c) => {
    const origin = originOf(c.req.url)
    return c.text(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`, 200, {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
    })
  })

  app.get('/sitemap.xml', (c) => {
    const origin = originOf(c.req.url)
    const urls = SEO_SITEMAP_PATHS.map((pathname, index) => `  <url>\n    <loc>${escapeXml(`${origin}${pathname === '/' ? '/' : pathname}`)}</loc>\n    <changefreq>${index === 0 ? 'weekly' : 'monthly'}</changefreq>\n    <priority>${index === 0 ? '1.0' : '0.9'}</priority>\n  </url>`).join('\n')
    return c.text(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, 200, {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
    })
  })

  app.get('/llms.txt', (c) => {
    const origin = originOf(c.req.url)
    const content = `# ARDELIS Atelier / PERGO\n\n> Magyar nyelvű, valós idejű 3D pergolatervező bioklimatikus és egyéb alumínium pergolák konfigurálásához.\n\n## Elsődleges tartalom\n\n- [Bioklimatikus pergola tervezése](${origin}/): működési ismertető, műszaki részletek, tervezési útmutató és gyakori kérdések.\n- [3D pergolatervező és árkalkulátor](${origin}/studio/pergola): méret, rögzítés, tetőrendszer, szín, oldalzárás és kiegészítők beállítása.\n\n## Ellenőrizhető működési tények\n\n- A konfigurátor falhoz csatlakozó és önálló pergolát is kezel.\n- A tetőrendszer lehet motoros lamellás, eltolható lamellás vagy fix alumínium.\n- A feltüntetett összegek tájékoztató irányárak, nem kötelező érvényű árajánlatok.\n- A végleges műszaki tartalom és ár helyszíni felmérés után készül.\n- A piszkozat és a helyi fotó a felhasználó böngészőjében marad; a felmérési kérelem csak tudatos elküldéskor rögzül.\n- A szolgáltatás magyarországi projektekhez készült; az engedélyezési kötelezettség helyszínfüggő.\n`
    return c.text(content, 200, { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'public, max-age=3600' })
  })

  app.get('*', async (c, next) => {
    const accept = c.req.header('accept') ?? ''
    if (!accept.includes('text/html') || path.extname(c.req.path)) return next()

    const pathname = c.req.path === '/' ? '/' : c.req.path.replace(/\/+$/, '')
    const legacyTarget = LEGACY_REDIRECTS[pathname]
    if (legacyTarget) return c.redirect(legacyTarget, 301)

    const page = getSeoPage(pathname)
    const templatePath = path.resolve(import.meta.dirname, 'public/index.html')
    const template = fs.readFileSync(templatePath, 'utf-8')
    const html = renderSeoHtml(template, pathname, originOf(c.req.url))
    return c.html(html, page.key === 'notFound' ? 404 : 200)
  })
}
