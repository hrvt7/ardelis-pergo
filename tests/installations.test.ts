import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildSnapshot, clampExpansion, expansionAdditions, installationComponents, INSTALLATION_TOKEN_RE, newInstallationToken, snapshotHash, warrantyExpiry, warrantyState } from '../src/lib/installations'
import { demoTenant } from '../src/tenants/demo'
import { roofLabels, tenantPrice } from '../src/tenants/rules'
import type { PergolaConfig } from '../src/types/pergola'

const config: PergolaConfig = { ...demoTenant.defaultConfig, roof: 'louvered', led: false, heaters: 0, sensors: false, speakers: false, sides: { front: 'none', back: 'none', left: 'zip', right: 'none' }, mount: 'wall' }

function snapshot(prices = demoTenant.prices) {
  const price = tenantPrice({ ...demoTenant, prices }, config)
  return buildSnapshot({ config, price, currency: demoTenant.currency, roofName: roofLabels(demoTenant)[config.roof], headline: 'Teszt', spec: [['Méret', '5 × 4 m']] })!
}

describe('telepítés — adatmodell', () => {
  it('a token 256 bites, base64url, és minden hívás más', () => {
    const tokens = new Set(Array.from({ length: 200 }, newInstallationToken))
    expect(tokens.size).toBe(200)
    for (const token of tokens) expect(token).toMatch(INSTALLATION_TOKEN_RE)
  })
  it('a pillanatkép befagy: későbbi árlista-változás nem módosítja a tárolt példányt', async () => {
    const frozen = snapshot()
    const stored = JSON.parse(JSON.stringify(frozen))
    const hash = await snapshotHash(stored)
    // Az árlista változik: egy új számítás más árat adna, de a tárolt pillanatkép és ujjlenyomata ugyanaz.
    const changed = snapshot({ ...demoTenant.prices, louveredPerM2Net: demoTenant.prices.louveredPerM2Net * 2 })
    expect(changed.price.totalGross).not.toBe(stored.price.totalGross)
    expect(await snapshotHash(stored)).toBe(hash)
    expect(stored.price.totalGross).toBe(frozen.price.totalGross)
    expect(stored.shareCode).toBe(frozen.shareCode)
    expect(stored.version).toBe(1)
  })
  it('az ujjlenyomat a kulcsok sorrendjétől független, de minden tartalmi változást jelez', async () => {
    const frozen = snapshot()
    const reordered = Object.fromEntries(Object.entries(frozen).reverse()) as typeof frozen
    expect(await snapshotHash(reordered)).toBe(await snapshotHash(frozen))
    expect(await snapshotHash({ ...frozen, price: { ...frozen.price, totalGross: frozen.price.totalGross + 1 } })).not.toBe(await snapshotHash(frozen))
  })
  it('zárt komponenslista: csak a termékben lévő elemek, stabil kulcsokkal', () => {
    const keys = installationComponents(config).map((item) => item.key)
    expect(keys).toEqual(['frame', 'roof', 'roof-drive', 'side-left', 'other'])
    const zip = installationComponents(config).find((item) => item.key === 'side-left')!
    expect(zip.group).toBe('electronics')
    expect(installationComponents({ ...config, led: true, heaters: 2 }).map((item) => item.key)).toEqual(['frame', 'roof', 'roof-drive', 'side-left', 'led', 'heaters', 'other'])
  })
  it('a carport nem rögzíthető telepítésként (nincs a termékkörben)', () => {
    const price = tenantPrice(demoTenant, config)
    expect(buildSnapshot({ config: { ...config, building: 'carport' }, price, currency: 'HUF', roofName: '', headline: '', spec: [] })).toBeNull()
  })
  it('garancia: hónapok hozzáadása, hónap végi igazítással; lejárt és élő állapot', () => {
    expect(warrantyExpiry('2026-03-15', 24)).toBe('2028-03-15')
    expect(warrantyExpiry('2026-01-31', 1)).toBe('2026-02-28')
    expect(warrantyState('2020-01-01', 24, new Date('2026-11-16')).active).toBe(false)
    expect(warrantyState('2026-11-01', 24, new Date('2026-11-16')).active).toBe(true)
    expect(warrantyState('2026-11-01', 0, new Date('2026-11-16')).active).toBe(false)
  })
})

describe('telepítés — bővítés', () => {
  it('a szerkezet zárolt: méret, tető, rögzítés, szín nem változhat', () => {
    const attempt: PergolaConfig = { ...config, width: config.width + 2, roof: 'glass', frameColor: 'white', mount: 'freestanding' }
    const clamped = clampExpansion(config, attempt)
    expect([clamped.width, clamped.roof, clamped.frameColor, clamped.mount]).toEqual([config.width, config.roof, config.frameColor, config.mount])
  })
  it('csak nyitott oldal zárható le, a meglévő oldalelem nem cserélhető, falas oldal nem bővíthető', () => {
    const clamped = clampExpansion(config, { ...config, sides: { front: 'glass', back: 'glass', left: 'none', right: 'louver' } })
    expect(clamped.sides).toEqual({ front: 'glass', back: 'none', left: 'zip', right: 'louver' })
  })
  it('ami megvan, nem vehető el; kiegészítő hozzáadható', () => {
    const owned = { ...config, led: true, heaters: 2 }
    const clamped = clampExpansion(owned, { ...owned, led: false, heaters: 0, sensors: true, fans: 1 })
    expect([clamped.led, clamped.heaters, clamped.sensors, clamped.fans]).toEqual([true, 2, true, 1])
    expect(expansionAdditions(owned, clamped).sort()).toEqual(['fans', 'sensors'])
    expect(expansionAdditions(owned, clampExpansion(owned, owned))).toEqual([])
  })
})

describe('telepítés — séma (supabase/installations.sql)', () => {
  const sql = readFileSync('supabase/installations.sql', 'utf8')
  it('minden új táblán RLS, a böngésző szerepkörei nem férnek hozzá', () => {
    for (const table of ['installations', 'service_requests', 'installation_events', 'component_part_numbers']) {
      expect(sql).toContain(`alter table public.${table} enable row level security`)
    }
    expect(sql).toMatch(/revoke all on public\.installations, public\.service_requests, public\.installation_events, public\.component_part_numbers from anon, authenticated/)
  })
  it('a napló csak hozzáfűzhető, a fotótár privát, a token egyedi', () => {
    expect(sql).toContain('installation_events is append-only')
    expect(sql).toMatch(/'service-photos', 'service-photos', false/)
    expect(sql).toMatch(/public_token text not null unique/)
    expect(sql).toMatch(/ai_suggestion jsonb,/)
  })
})
