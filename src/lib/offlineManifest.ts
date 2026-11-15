// Az offline előtöltési lista összeállítása (tiszta függvény; a vite.config.ts build-pluginja hívja, a teszt közvetlenül).
// Bemenet: a Vite-build kimeneti fájljai és a public/ alatti fájlok, méret és tartalom-hash szerint.
import { isOfflineAsset, type OfflineFile, type OfflineManifest } from './swRoutes'

export interface ManifestInputFile {
  /** A kiszolgálási útvonal, perjellel kezdve (pl. /assets/index-AbC123xy.js vagy /assets/hdr/x.hdr). */
  url: string
  size: number
  /** Tartalom-hash (a build-fájloknál a fájlnév hash-e is elég). */
  hash: string
}

/** A betűcsaládok nyelvi alkészletei: offline csak a latin és a latin-ext (magyar ékezetek) kell, a cirill, görög, vietnami nem. */
const FONT_SUBSETS = /-(cyrillic|cyrillic-ext|greek|greek-ext|vietnamese|hebrew|devanagari|math|symbols|arabic)-/i

/** A build-fájlok közül előtöltendő: minden JS/CSS és kép, a betűkből csak a latin alkészletek. Forrástérkép nem. */
export function wantedBuildFile(url: string) {
  if (/\.map$/i.test(url)) return false
  if (/\.(woff2?|ttf|otf)$/i.test(url)) return !FONT_SUBSETS.test(url)
  return true
}

const sortByUrl = (files: OfflineFile[]) => files.sort((a, b) => a.url.localeCompare(b.url))

/** A buildazonosító: az összes bejegyzés rev-jéből képzett rövid, determinisztikus hash (FNV-1a). */
export function manifestVersion(files: OfflineFile[]) {
  let h = 0x811c9dc5
  for (const file of files) {
    const text = `${file.url}:${file.rev};`
    for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  }
  return h.toString(36)
}

/**
 * A manifest: `build` = a Vite-kimenet (index.html + hash-elt fájlok), `assets` = a public/assets és public/vendor
 * jelenet- és felületi fájljai (GLB, GLTF, BIN, HDR, KTX2, képek, betűk, adatok). Dokumentáció (.md, .txt) nem kerül bele.
 */
export function buildOfflineManifest(input: { buildFiles: ManifestInputFile[]; publicFiles: ManifestInputFile[]; indexHash: string; indexSize: number }): OfflineManifest {
  const build = sortByUrl([
    { url: '/index.html', rev: input.indexHash, size: input.indexSize },
    ...input.buildFiles.filter((file) => file.url.startsWith('/assets/') && wantedBuildFile(file.url)).map(({ url, hash, size }) => ({ url, rev: hash, size })),
  ])
  const assets = sortByUrl(input.publicFiles.filter((file) => isOfflineAsset(file.url)).map(({ url, hash, size }) => ({ url, rev: hash, size })))
  return { version: manifestVersion([...build, ...assets]), build, assets }
}
