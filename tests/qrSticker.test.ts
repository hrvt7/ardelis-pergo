import { describe, expect, it } from 'vitest'
import { STICKER_MM, stickerDefinition, stickerFileName, stickerHost } from '../src/lib/qrSticker'

const url = `https://lamelix.vercel.app/t/${'A'.repeat(43)}`
const input = { url, brandName: 'Példa Kft.', headline: 'Aero · 5,00 × 4,00 m' }

describe('QR-matrica', () => {
  it('80 × 100 mm-es oldal, a QR-kóddal; a token szövegként nem kerül rá', () => {
    const definition = stickerDefinition(input, { qrDataUrl: 'data:image/png;base64,QR', logoDataUrl: null })
    const page = definition.pageSize as { width: number; height: number }
    expect(page.width).toBeCloseTo(STICKER_MM.width * 72 / 25.4, 3)
    expect(page.height).toBeCloseTo(STICKER_MM.height * 72 / 25.4, 3)
    const text = JSON.stringify(definition.content)
    expect(text).toContain('data:image/png;base64,QR')
    expect(text).not.toContain('A'.repeat(43))
    expect(text).toContain('lamelix.vercel.app')
    expect(text).toContain('Példa Kft.')
  })
  it('logó esetén a kép kerül a tetejére, a gyártó neve helyett', () => {
    const definition = stickerDefinition(input, { qrDataUrl: 'data:image/png;base64,QR', logoDataUrl: 'data:image/png;base64,LOGO' })
    const first = (definition.content as unknown[])[0] as { image?: string }
    expect(first.image).toBe('data:image/png;base64,LOGO')
  })
  it('fájlnév ékezet nélkül, a domain kiolvasása', () => {
    expect(stickerFileName('Aero · 5,00 × 4,00 m', 'pdf')).toBe('qr-matrica-aero-5-00-4-00-m.pdf')
    expect(stickerHost(url)).toBe('lamelix.vercel.app')
    expect(stickerHost('nem url')).toBe('')
  })
})
