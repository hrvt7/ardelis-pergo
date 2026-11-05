import { useEffect } from 'react'
import { assetUrl } from '@/lib/assetUrl'
import { buildStructuredData, getSeoPage } from '@contracts/seo'

const SOCIAL_IMAGE = assetUrl('/assets/ardelis-og.jpg')
/** A platform (Lamelix) saját megosztási képe; a gyártói/demó oldalak a sajátjukat használják. */
const PLATFORM_IMAGE = assetUrl('/assets/lamelix-og.png')

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.content = content
}

function setLink(rel: string, key: string | undefined, href: string) {
  const selector = key ? `link[rel="${rel}"][hreflang="${key}"]` : `link[rel="${rel}"]`
  let element = document.head.querySelector<HTMLLinkElement>(selector)
  if (!href) {
    element?.remove()
    return
  }
  if (!element) {
    element = document.createElement('link')
    element.rel = rel
    if (key) element.hreflang = key
    document.head.appendChild(element)
  }
  element.href = href
}

export function usePageSeo(pathname: string, options: { noindex?: boolean; title?: string } = {}) {
  const { noindex = false, title } = options
  useEffect(() => {
    const base = getSeoPage(pathname)
    const page = { ...base, title: title ?? base.title, robots: noindex ? 'noindex,nofollow' : base.robots }
    const origin = window.location.origin
    const canonical = noindex ? '' : `${origin}${page.path === '/' ? '/' : page.path}`
    const platform = page.key === 'platform'
    const image = platform ? PLATFORM_IMAGE : SOCIAL_IMAGE
    const socialImage = image.startsWith('http') ? image : `${origin}${image}`

    const english = page.path === '/en'
    document.documentElement.lang = english ? 'en' : 'hu'
    document.title = page.title
    setMeta('name', 'description', page.description)
    setMeta('name', 'robots', page.robots)
    setMeta('name', 'googlebot', page.robots)
    setMeta('property', 'og:locale', english ? 'en_US' : 'hu_HU')
    setMeta('property', 'og:site_name', platform ? 'Lamelix' : 'Lamelix')
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:title', page.title)
    setMeta('property', 'og:description', page.description)
    setMeta('property', 'og:url', canonical || window.location.href)
    setMeta('property', 'og:image', socialImage)
    setMeta('property', 'og:image:width', '1200')
    setMeta('property', 'og:image:height', '630')
    setMeta('property', 'og:image:alt', platform ? (english ? 'Lamelix – 3D configurator and quote-request system for pergola manufacturers' : 'Lamelix – 3D konfigurátor és ajánlatkérő rendszer pergolagyártóknak') : 'Lamelix bioklimatikus pergola egy modern otthon teraszán')
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', page.title)
    setMeta('name', 'twitter:description', page.description)
    setMeta('name', 'twitter:image', socialImage)
    setLink('canonical', undefined, page.key === 'notFound' || noindex ? '' : canonical)
    const hidden = page.key === 'notFound' || noindex
    // A főoldal két nyelven létezik: mindkét változat a másikra is hivatkozik (hreflang), az x-default a magyar.
    setLink('alternate', 'hu-HU', hidden ? '' : platform ? `${origin}/` : canonical)
    setLink('alternate', 'en', hidden || !platform ? '' : `${origin}/en`)
    setLink('alternate', 'x-default', hidden ? '' : platform ? `${origin}/` : canonical)

    document.head.querySelectorAll('script[data-ardelis-jsonld]').forEach((node) => node.remove())
    const graph = buildStructuredData(page.path, origin)
    if (graph.length) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.ardelisJsonld = 'true'
      script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
      document.head.appendChild(script)
    }
  }, [pathname, noindex, title])
}
