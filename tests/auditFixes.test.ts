// Hibakeresés 2026-11-17 (docs/AUDIT-2026-11-17.md) – a javítások ellenőrzése.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { centerCropBox } from '../src/lib/showcase'

describe('hibakeresés 2026-11-17 – konfigurátor', () => {
  it('#4 a pillanatkép a nézet-eltolás szerint középre vág (a PDF-ben és a megosztott képen a pergola középen van)', () => {
    expect(centerCropBox(1400, 0)).toEqual({ sx: 0, sw: 1400 })
    // negatív eltolás: a pergola jobbra van → a vágás jobbra tolódik, a vágás közepe a pergola közepe
    const box = centerCropBox(1400, -0.12)
    expect(box.sw).toBe(Math.round(1400 * 0.76))
    expect(box.sx + box.sw / 2).toBeCloseTo(700 + 0.12 * 1400, 0)
    expect(box.sx + box.sw).toBeLessThanOrEqual(1400)
    const left = centerCropBox(1400, 0.1)
    expect(left.sx + left.sw / 2).toBeCloseTo(700 - 140, 0)
    expect(left.sx).toBeGreaterThanOrEqual(0)
    const scene = readFileSync('src/components/PergolaScene.tsx', 'utf8')
    expect(scene).toMatch(/gl\.domElement\.dataset\.viewShiftX = walk \? '0' : String\(viewShiftX\)/)
  })

  it('#3 az Esti hangulat panel bezárul, ha a fülben másik eszközt választanak; a Napszak újra megnyitja', () => {
    const studio = readFileSync('src/pages/PergoStudio.tsx', 'utf8')
    const chrome = readFileSync('src/components/studio/StudioChrome.tsx', 'utf8')
    expect(studio).toMatch(/onToolUse=\{\(id\) => setMoodHidden\(id !== 'time'\)\}/)
    expect(chrome).toMatch(/onToolUse\?\.\('time'\)/)
    expect(chrome).toMatch(/onToolUse\?\.\(id\); run\(\)/)
  })

  it('#5 az infrapanel ára mindkét helyen bruttó különbözet, jelölve', () => {
    const controls = readFileSync('src/components/ConfiguratorControls.tsx', 'utf8')
    const mood = readFileSync('src/components/MoodPanel.tsx', 'utf8')
    expect(controls).not.toMatch(/formatPrice\(prices\.heaterUnitNet\)/)
    expect(controls).toMatch(/heaters: config\.heaters \+ 1 \}, prices\)\.totalGross - tenantPrice\(tenant, config, prices\)\.totalGross\)\} \/ \{tr\('db, bruttó'/)
    expect(mood).toMatch(/\+\{formatPrice\(heaterPrice\)\} \{tr\('bruttó'/)
  })
})

describe('hibakeresés 2026-11-17 – teendők kora', () => {
  it('#6 a státusz írása időbélyeggel megy, régi adatbázisnál nélküle; a felszerelt lead nem lép vissza Megnyert-re', async () => {
    const { patchLeadStatus } = await import('../server/tenantAdmin')
    const calls: string[] = []
    const original = globalThis.fetch
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      calls.push(String(init.body))
      return calls.length === 1 ? new Response('column "status_changed_at" does not exist', { status: 400 }) : new Response(null, { status: 204 })
    }) as typeof fetch
    try {
      const response = await patchLeadStatus({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' } as never, 'ref=eq.A', 'offered')
      expect(response.status).toBe(204)
      expect(JSON.parse(calls[0])).toMatchObject({ status: 'offered' })
      expect(JSON.parse(calls[0]).status_changed_at).toBeTruthy()
      expect(JSON.parse(calls[1])).toEqual({ status: 'offered' })
    } finally { globalThis.fetch = original }
    expect(readFileSync('server/quotes.ts', 'utf8')).toMatch(/status=neq\.installed`, 'won'\)/)
    expect(readFileSync('supabase/leads.sql', 'utf8')).toMatch(/add column if not exists status_changed_at timestamptz/)
  })
})

describe('hibakeresés 2026-11-17 – CRM-webhook', () => {
  it('#9 bővítésnél a különbözet és a „expansion” forrás megy ki; waitUntil mellett a kézbesítés nem tartja vissza a választ', async () => {
    const { leadEventData, queueWebhook } = await import('../server/webhook')
    const { demoTenant } = await import('../src/tenants/demo')
    const price = { totalNet: 1000, vatNet: 270, totalGross: 1270, installationNet: 0, lines: [] } as never
    const data = leadEventData({ ref: 'R', tenant: demoTenant, createdAt: new Date(0), product: 'pergola', source: 'expansion', customer: { name: 'A', email: 'a@b.hu', phone: '1', city: 'X', region: 'Y' }, expansion: { installationId: 7, originalRef: 'O', added: ['LED'], deltaNet: 100, deltaGross: 127 }, headline: 'h', configUrl: 'u', spec: [], price })
    expect(data.source).toBe('expansion')
    expect(data.price).toMatchObject({ net: 100, gross: 127, estimate: true })
    expect((data.expansion as { fullConfigurationPrice: { gross: number } }).fullConfigurationPrice.gross).toBe(1270)
    const scheduled: Promise<unknown>[] = []
    const tenant = { ...demoTenant, crm: { webhookUrl: 'https://hook.example.com/in', secret: 'k'.repeat(32) } }
    let delivered = false
    const slow = (() => new Promise<Response>((resolve) => setTimeout(() => { delivered = true; resolve(new Response('ok')) }, 60))) as unknown as typeof fetch
    await queueWebhook({ waitUntil: (promise) => scheduled.push(promise) }, tenant as never, 'lead.created', data, slow)
    // a hívó (a válasz) már továbbment, a kézbesítés még fut
    expect(delivered).toBe(false)
    expect(scheduled).toHaveLength(1)
    await scheduled[0]
    expect(delivered).toBe(true)
  })
})
