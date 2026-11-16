// JPEG-ellenőrzés és metaadat-eltávolítás (Edge-kompatibilis, függőség nélkül).
// A böngésző már újrakódolja a képet (vászon → JPEG, ami nem visz át EXIF-et); ez a szerveroldali második védvonal:
// minden APPn szegmenst (EXIF/GPS: APP1, XMP, IPTC: APP13, FlashPix …) és megjegyzést (COM) eldob, kivéve a JFIF-et (APP0),
// az ICC színprofilt (APP2 „ICC_PROFILE”) és az Adobe színtér-jelzőt (APP14). A képadat (SOS után) bájtra változatlan.

export type JpegResult = { ok: true; bytes: Uint8Array<ArrayBuffer>; width: number; height: number } | { ok: false; error: 'not-jpeg' | 'truncated' | 'too-large' }

const ICC = [0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45, 0x00] // "ICC_PROFILE\0"
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])

const startsWith = (bytes: Uint8Array, offset: number, prefix: number[]) => prefix.every((value, index) => bytes[offset + index] === value)

export function sanitizeJpeg(input: Uint8Array, maxPixels = 4096 * 4096): JpegResult {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8 || input[2] !== 0xff) return { ok: false, error: 'not-jpeg' }
  const parts: Uint8Array[] = [input.subarray(0, 2)]
  let offset = 2
  let width = 0
  let height = 0
  while (offset < input.length) {
    if (input[offset] !== 0xff) return { ok: false, error: 'not-jpeg' }
    let marker = input[offset + 1]
    // Kitöltő 0xFF bájtok a markerek között megengedettek.
    while (marker === 0xff && offset + 2 < input.length) { offset += 1; marker = input[offset + 1] }
    if (marker === undefined) return { ok: false, error: 'truncated' }
    if (marker === 0xd9) { parts.push(input.subarray(offset, offset + 2)); break }
    if (marker >= 0xd0 && marker <= 0xd7) return { ok: false, error: 'not-jpeg' }
    if (offset + 4 > input.length) return { ok: false, error: 'truncated' }
    const length = (input[offset + 2] << 8) | input[offset + 3]
    const end = offset + 2 + length
    if (length < 2 || end > input.length) return { ok: false, error: 'truncated' }
    if (SOF.has(marker)) {
      if (length < 7) return { ok: false, error: 'truncated' }
      height = (input[offset + 5] << 8) | input[offset + 6]
      width = (input[offset + 7] << 8) | input[offset + 8]
      if (width * height > maxPixels) return { ok: false, error: 'too-large' }
    }
    const isApp = marker >= 0xe0 && marker <= 0xef
    const keep = !isApp && marker !== 0xfe
      || marker === 0xe0
      || marker === 0xee
      || (marker === 0xe2 && startsWith(input, offset + 4, ICC))
    if (keep) parts.push(input.subarray(offset, end))
    offset = end
    if (marker === 0xda) {
      // Start of Scan: innen a tömörített képadat a fájl végéig (a záró FFD9-cel együtt) változatlanul marad.
      if (input[input.length - 2] !== 0xff || input[input.length - 1] !== 0xd9) return { ok: false, error: 'truncated' }
      parts.push(input.subarray(offset))
      offset = input.length
      break
    }
  }
  if (!width || !height) return { ok: false, error: 'not-jpeg' }
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const bytes = new Uint8Array(total)
  let at = 0
  for (const part of parts) { bytes.set(part, at); at += part.length }
  return { ok: true, bytes, width, height }
}

/** Van-e a fájlban metaadat-szegmens (APP1: EXIF/GPS/XMP, APP13: IPTC, COM) — markerenként bejárva, a képadat előtt. */
export function hasMetadata(bytes: Uint8Array) {
  let offset = 2
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1]
    if (marker === 0xda || marker === 0xd9) return false
    if (marker === 0xe1 || marker === 0xed || marker === 0xfe) return true
    offset += 2 + ((bytes[offset + 2] << 8) | bytes[offset + 3])
  }
  return false
}
