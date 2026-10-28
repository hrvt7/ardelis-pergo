// Csak az előnézeti (artifact) buildben fut. Az előnézeti tárhely bizonyos
// bináris fájltípusokat (.bin, .hdr, .glb, .gltf, .gz) nem szolgál ki, ezért a
// build után ezek base64 szövegként (<fájl>.b64.txt) kerülnek fel. Ez a réteg a
// fetch-kéréseket átirányítja és visszaalakítja, a betöltők így változatlanok.
const BINARY = /\.(bin|hdr|glb|gltf|gz)$/i

function decode(text: string) {
  const raw = atob(text.trim())
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes
}

const originalFetch = window.fetch.bind(window)
// Egy fájlt csak egyszer tölt le és alakít vissza (az előtöltés és a tényleges betöltés ugyanazt kéri).
const decoded = new Map<string, Promise<Uint8Array<ArrayBuffer> | Response>>()
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  let url: URL | null = null
  try { url = new URL(href, document.baseURI) } catch { url = null }
  if (!url || url.origin !== window.location.origin || !BINARY.test(url.pathname)) return originalFetch(input, init)
  const encoded = new URL(url.href)
  encoded.pathname += '.b64.txt'
  let pending = decoded.get(encoded.href)
  if (!pending) {
    pending = originalFetch(encoded.href).then(async (response) => (response.ok ? decode(await response.text()) : response))
    decoded.set(encoded.href, pending)
    pending.then((result) => { if (result instanceof Response) decoded.delete(encoded.href) }, () => decoded.delete(encoded.href))
  }
  const result = await pending
  if (result instanceof Response) return result.clone()
  const bytes = result
  return new Response(bytes, { status: 200, headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(bytes.byteLength) } })
}
