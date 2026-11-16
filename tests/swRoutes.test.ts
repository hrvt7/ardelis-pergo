import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { build } from 'esbuild'
import { ASSET_CACHE, buildCacheName, isOfflineAsset, isPrivatePage, navigationCacheKey, swStrategy } from '../src/lib/swRoutes'
import { buildOfflineManifest, manifestVersion, wantedBuildFile } from '../src/lib/offlineManifest'
import { isAppPath, shouldRegisterSw } from '../src/lib/swClient'

const ORIGIN = 'https://lamelix.vercel.app'
const get = (url: string, extra: { method?: string; mode?: string; destination?: string } = {}) => swStrategy({ url, origin: ORIGIN, ...extra })
const nav = (url: string) => get(url, { mode: 'navigate', destination: 'document' })

describe('service worker útvonal-stratégia', () => {
  it('a hash-elt build-fájlok cache-first', () => {
    expect(get('/assets/index-B3kd9xQa.js')).toBe('cache-first')
    expect(get('/assets/PergolaScene-Ab_9-xYz.js')).toBe('cache-first')
    expect(get('/assets/index-DxqK12aa.css')).toBe('cache-first')
    expect(get('/assets/inter-latin-ext-wght-normal-Bk3xA9qZ.woff2')).toBe('cache-first')
  })
  it('a public/assets jelenet-eszközei cache-first (GLB, GLTF, BIN, HDR, KTX2, képek, betűk)', () => {
    for (const url of ['/assets/models/houses/house_a45.glb', '/assets/models/shrub_04/model.gltf', '/assets/models/shrub_04/model.bin', '/assets/hdr/sky.hdr', '/assets/textures/x/tex.ktx2', '/assets/textures/concrete_floor_02/nor_gl.jpg', '/assets/home/a.webp', '/assets/brand/logo.png', '/assets/fonts/x.woff2', '/assets/models/cedar_zinc_house/pack-1.bin.gz', '/vendor/model-viewer-4.4.0.min.js']) expect(get(url), url).toBe('cache-first')
    expect(isOfflineAsset('/assets/CREDITS.md')).toBe(false)
  })
  it('oldalbetöltés network-first: /, /konfigurator, /k/*, /embed/*', () => {
    for (const url of ['/', '/konfigurator', '/konfigurator/carport?quality=ultra', '/k/acme', '/k/acme/carport', '/embed/acme', '/minta']) expect(nav(url), url).toBe('network-first')
    expect(get('/embed/acme', { destination: 'iframe' })).toBe('network-first')
  })
  it('az /api/* soha nem kerül gyorsítótárba – semmilyen módszerrel', () => {
    for (const url of ['/api/lead', '/api/demo-request', '/api/admin-quotes', '/api/track', '/api/quote?token=x', '/api']) {
      expect(get(url), url).toBe('network-only')
      expect(nav(url), url).toBe('network-only')
      expect(get(url, { method: 'POST' }), url).toBe('network-only')
    }
  })
  it('admin, ajánlat és belépés network-only (személyes adat, offline sem tárból)', () => {
    for (const url of ['/k/acme/admin', '/k/acme/admin/leads', '/ajanlat/abc123', '/belepes', '/login', '/admin']) {
      expect(nav(url), url).toBe('network-only')
      expect(isPrivatePage(new URL(url, ORIGIN).pathname), url).toBe(true)
    }
    expect(isPrivatePage('/k/admin-tervezo')).toBe(false)
  })
  it('nem-GET, idegen origó, a SW maga és a manifestek mindig hálózat', () => {
    expect(get('/assets/models/houses/house_a45.glb', { method: 'POST' })).toBe('network-only')
    expect(get('https://example.com/assets/x.glb')).toBe('network-only')
    for (const url of ['/sw.js', '/offline-manifest.json', '/site.webmanifest']) expect(get(url), url).toBe('network-only')
    expect(nav('/demo/sb400-live.html')).toBe('network-only')
    expect(get('/favicon.ico')).toBe('network-only')
  })
  it('verziózott tárnevek, a navigáció kulcsa paraméter nélküli útvonal', () => {
    expect(buildCacheName('abc')).toBe('lamelix-build-abc')
    expect(buildCacheName('abc')).not.toBe(buildCacheName('abd'))
    expect(ASSET_CACHE.startsWith('lamelix-')).toBe(true)
    expect(navigationCacheKey('/konfigurator?bemutato=1', ORIGIN)).toBe('/konfigurator')
  })
})

describe('SW-regisztráció feltételei', () => {
  const base = { prod: true, mode: 'production', protocol: 'https:', hostname: 'lamelix.vercel.app', supported: true }
  it('csak éles buildben, https-en, támogató böngészőben', () => {
    expect(shouldRegisterSw(base)).toBe(true)
    expect(shouldRegisterSw({ ...base, prod: false })).toBe(false)
    expect(shouldRegisterSw({ ...base, protocol: 'http:', hostname: 'lamelix.example' })).toBe(false)
    expect(shouldRegisterSw({ ...base, supported: false })).toBe(false)
  })
  it('az előnézeti (artifact) buildben nem; helyi próbához localhoston igen', () => {
    expect(shouldRegisterSw({ ...base, mode: 'artifact' })).toBe(false)
    expect(shouldRegisterSw({ ...base, router: 'memory' })).toBe(false)
    expect(shouldRegisterSw({ ...base, protocol: 'http:', hostname: '127.0.0.1' })).toBe(true)
  })
  it('csak a konfigurátor oldalairól (a nyitóoldal és az admin nem tölti le az alkalmazáshéjat)', () => {
    for (const p of ['/konfigurator', '/konfigurator/carport', '/k/acme', '/k/acme/carport', '/embed/acme']) expect(shouldRegisterSw({ ...base, pathname: p }), p).toBe(true)
    for (const p of ['/', '/en', '/minta', '/k/acme/admin', '/ajanlat/x', '/belepes']) expect(isAppPath(p), p).toBe(false)
  })
})

/** A public/ mappa bejárása (ugyanúgy, mint a build-plugin). */
function walk(dir: string, root: string): { url: string; size: number; hash: string }[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(file, root)
    return [{ url: `/${path.relative(root, file).split(path.sep).join('/')}`, size: fs.statSync(file).size, hash: 'h' }]
  })
}

describe('offline előtöltési lista (build közben generálva)', () => {
  const publicDir = path.resolve(import.meta.dirname, '../public')
  const publicFiles = [...walk(path.join(publicDir, 'assets'), publicDir), ...walk(path.join(publicDir, 'vendor'), publicDir)]
  const buildFiles = [
    { url: '/assets/index-B3kd9xQa.js', size: 1000, hash: 'a' },
    { url: '/assets/three-Zk81lmQp.js', size: 900000, hash: 'b' },
    { url: '/assets/index-DxqK12aa.css', size: 2000, hash: 'c' },
    { url: '/assets/inter-latin-ext-wght-normal-Bk3xA9qZ.woff2', size: 30000, hash: 'd' },
    { url: '/assets/inter-cyrillic-wght-normal-Q1w2E3r4.woff2', size: 30000, hash: 'e' },
    { url: '/assets/index-B3kd9xQa.js.map', size: 5, hash: 'f' },
    { url: '/robots.txt', size: 5, hash: 'g' },
  ]
  const manifest = buildOfflineManifest({ buildFiles, publicFiles, indexHash: 'idx', indexSize: 3000 })

  it('minden public/assets alatti 3D-fájl (GLB, GLTF, BIN, HDR, KTX2) és textúra benne van', () => {
    const urls = new Set(manifest.assets.map((file) => file.url))
    const scene = publicFiles.filter((file) => /^\/assets\/.*\.(glb|gltf|bin|hdr|ktx2|jpg|jpeg|png|webp)$/i.test(file.url))
    expect(scene.length).toBeGreaterThan(50)
    for (const file of scene) expect(urls.has(file.url), file.url).toBe(true)
    expect(urls.has('/assets/models/cedar_zinc_house/pack-1.bin.gz')).toBe(true)
    expect(urls.has('/assets/CREDITS.md')).toBe(false)
  })
  it('a dist hash-elt JS/CSS fájljai és az index.html benne vannak; forrástérkép, idegen alkészlet nem', () => {
    const urls = manifest.build.map((file) => file.url)
    expect(urls).toEqual(expect.arrayContaining(['/index.html', '/assets/index-B3kd9xQa.js', '/assets/three-Zk81lmQp.js', '/assets/index-DxqK12aa.css', '/assets/inter-latin-ext-wght-normal-Bk3xA9qZ.woff2']))
    expect(urls).not.toContain('/assets/index-B3kd9xQa.js.map')
    expect(urls).not.toContain('/assets/inter-cyrillic-wght-normal-Q1w2E3r4.woff2')
    expect(urls).not.toContain('/robots.txt')
    expect(wantedBuildFile('/assets/x-12345678.png')).toBe(true)
  })
  it('a verzió a tartalomtól függ: egy fájl változása új verziót (új sw.js-t) ad', () => {
    const changed = buildOfflineManifest({ buildFiles: buildFiles.map((file, i) => (i === 0 ? { ...file, hash: 'z' } : file)), publicFiles, indexHash: 'idx', indexSize: 3000 })
    expect(changed.version).not.toBe(manifest.version)
    expect(manifestVersion(manifest.build)).toBe(manifestVersion([...manifest.build]))
  })
  it('a service worker a manifesttel együtt lefordul (esbuild, a build-pluginnal azonos beállítás)', async () => {
    const result = await build({ entryPoints: [path.resolve(import.meta.dirname, '../src/sw/sw.ts')], bundle: true, format: 'iife', write: false, minify: true, define: { __OFFLINE_MANIFEST__: JSON.stringify(manifest) }, logLevel: 'silent' })
    const code = result.outputFiles[0].text
    expect(code).toContain(manifest.version)
    expect(code).toContain('/api/')
    expect(code).toContain('SKIP_WAITING')
  })
})

describe('tartomány-kérés tárból (videó offline)', () => {
  it('bytes=a-b, bytes=a-, bytes=-n', async () => {
    const { parseByteRange } = await import('../src/lib/swRoutes')
    expect(parseByteRange('bytes=0-1', 100)).toEqual({ start: 0, end: 1 })
    expect(parseByteRange('bytes=10-', 100)).toEqual({ start: 10, end: 99 })
    expect(parseByteRange('bytes=-20', 100)).toEqual({ start: 80, end: 99 })
    expect(parseByteRange('bytes=50-500', 100)).toEqual({ start: 50, end: 99 })
  })
  it('érvénytelen vagy fájlon túli tartomány: null (416)', async () => {
    const { parseByteRange } = await import('../src/lib/swRoutes')
    expect(parseByteRange('bytes=200-', 100)).toBeNull()
    expect(parseByteRange('bytes=5-2', 100)).toBeNull()
    expect(parseByteRange('bytes=-', 100)).toBeNull()
    expect(parseByteRange('items=0-1', 100)).toBeNull()
    expect(parseByteRange('bytes=0-1,5-6', 100)).toBeNull()
  })
  it('a videó cache-first', () => {
    expect(get('/assets/intro/lamelix-intro.mp4')).toBe('cache-first')
  })
})
