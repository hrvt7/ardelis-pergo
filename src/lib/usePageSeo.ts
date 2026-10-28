import { useEffect } from 'react'
import { buildStructuredData, getSeoPage } from '@contracts/seo'

const SOCIAL_IMAGE = '/assets/ardelis-og.jpg'

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

export function usePageSeo(pathname: string) {
  useEffect(() => {
    const page = getSeoPage(pathname)
    const origin = window.location.origin
    const canonical = `${origin}${page.path === '/' ? '/' : page.path}`
    const socialImage = `${origin}${SOCIAL_IMAGE}`

    document.documentElement.lang = 'hu'
    document.title = page.title
    setMeta('name', 'description', page.description)
    setMeta('name', 'robots', page.robots)
    setMeta('name', 'googlebot', page.robots)
    setMeta('property', 'og:locale', 'hu_HU')
    setMeta('property', 'og:site_name', 'ARDELIS Atelier / PERGO')
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:title', page.title)
    setMeta('property', 'og:description', page.description)
    setMeta('property', 'og:url', canonical)
    setMeta('property', 'og:image', socialImage)
    setMeta('property', 'og:image:width', '1200')
    setMeta('property', 'og:image:height', '630')
    setMeta('property', 'og:image:alt', 'ARDELIS PERGO bioklimatikus pergola egy modern otthon teraszán')
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', page.title)
    setMeta('name', 'twitter:description', page.description)
    setMeta('name', 'twitter:image', socialImage)
    setLink('canonical', undefined, page.key === 'notFound' ? '' : canonical)
    setLink('alternate', 'hu-HU', page.key === 'notFound' ? '' : canonical)
    setLink('alternate', 'x-default', page.key === 'notFound' ? '' : canonical)

    document.head.querySelectorAll('script[data-ardelis-jsonld]').forEach((node) => node.remove())
    const graph = buildStructuredData(page.path, origin)
    if (graph.length) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.ardelisJsonld = 'true'
      script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
      document.head.appendChild(script)
    }
  }, [pathname])
}
