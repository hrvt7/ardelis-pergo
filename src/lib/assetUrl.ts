// Statikus fájlok (public/) címe. Normál buildben gyökér-relatív ("/assets/…");
// az előnézeti (artifact) buildben a dokumentumhoz viszonyított abszolút cím,
// mert ott az oldal nem a domain gyökerén fut.
export function assetUrl(path: string) {
  const clean = path.replace(/^\//, '')
  if (import.meta.env.BASE_URL === '/' || typeof document === 'undefined') return `/${clean}`
  return new URL(clean, document.baseURI).href
}
