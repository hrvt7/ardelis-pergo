import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { firstInvalid, validateLead } from '../src/lib/leadValidation'

const ok = { customerName: 'Kovács Péter', phone: '+36 30 123 4567', email: 'peter@example.hu', city: 'Sárvár', consent: true }

describe('ajánlatkérő űrlap ellenőrzése', () => {
  it('helyes adatokra nincs hiba', () => {
    expect(validateLead(ok)).toEqual({})
    expect(firstInvalid(validateLead(ok))).toBeUndefined()
  })
  it('üres űrlapnál minden kötelező mezőhöz érthető üzenet jár, a fókusz a névre megy', () => {
    const errors = validateLead({ customerName: '', phone: '', email: '', city: '', consent: false })
    expect(Object.keys(errors).sort()).toEqual(['city', 'consent', 'customerName', 'email', 'phone'])
    expect(firstInvalid(errors)).toBe('customerName')
  })
  it('hiányzó hozzájárulásnál kiírja, miért nem megy el a kérelem', () => {
    const errors = validateLead({ ...ok, consent: false })
    expect(errors.consent).toMatch(/adatkezel/)
    expect(firstInvalid(errors)).toBe('consent')
  })
  it('hibás telefonszám és e-mail formátum', () => {
    expect(validateLead({ ...ok, phone: '06-30-abc' }).phone).toMatch(/csak számjegy/)
    expect(validateLead({ ...ok, phone: '++ ()' }).phone).toBeDefined()
    expect(validateLead({ ...ok, email: 'peter@' }).email).toMatch(/formátuma/)
  })
  it('a beküldés gomb nem tiltott a hozzájárulás hiánya miatt, és a hozzájárulás-szöveg nem flex (nem esik oszlopokra)', () => {
    const form = readFileSync('src/components/LeadForm.tsx', 'utf8')
    expect(form).not.toMatch(/disabled=\{!consent/)
    const css = readFileSync('src/index.css', 'utf8')
    expect(css).toMatch(/\.consent-row > span, \.layout-a \.consent-row > span \{ display: block; \}/)
  })
})

describe('összegzés és űrlap szerkezete', () => {
  it('a vevő nem a belső termékcsalád-nevet látja', async () => {
    const { buyerProductName } = await import('../src/lib/leadValidation')
    expect(buyerProductName('Pergo · pergola')).toBe('Pergola')
    expect(buyerProductName('Drive · autóbeálló')).toBe('Autóbeálló')
  })
  it('az összegzésben a felmérés-kérés a megosztás és a költségrészletek előtt van, azok összecsukva', () => {
    const src = readFileSync('src/components/SummaryPanel.tsx', 'utf8')
    const lead = src.indexOf('lead-section')
    expect(lead).toBeGreaterThan(src.indexOf('showroom-facts'))
    expect(lead).toBeLessThan(src.indexOf('Megosztás és mentés'))
    expect(lead).toBeLessThan(src.indexOf('Költségek és specifikáció'))
    expect(src).not.toMatch(/Mentés A<|Mentés B</)
  })
})
