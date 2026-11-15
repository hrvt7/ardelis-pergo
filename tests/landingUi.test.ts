import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'

const read = (path: string) => readFileSync(path, 'utf8')

describe('landing (audit H4, H5, H15, H16, H21)', () => {
  it('a ragadós „Élő demó” sáv elrejtőzik a saját gombos szakaszok (összehasonlítás, élő bemutató, árak) felett', () => {
    expect(read('src/components/Showpieces.tsx')).toMatch(/const covering = avoid/)
    expect(read('src/pages/Platform.tsx')).toMatch(/avoid="[^"]*#arak[^"]*"/)
  })
  it('a számlálók nem 0-ról indulnak', () => {
    expect(read('src/components/Showpieces.tsx')).toMatch(/from=\{Math\.floor\(item\.value \* 0\.5\)\}/)
  })
  it('mobilon a hero szövege van elöl, nem a kép', () => {
    expect(read('src/platform.css')).not.toMatch(/\.pf-scene \{ order: -1; \}/)
  })
  it('a bemutató szakasz rövidebb (2,2 képernyőnyi görgetés), a kiemelt mondat végig olvasható', () => {
    const page = read('src/pages/Platform.tsx')
    expect(page).toMatch(/window\.innerHeight \* 2\.2/)
    expect(page).toMatch(/\.pf-word', \{ opacity: 0\.34 \}/)
  })
  it('a termékképek (konfigurátor, admin, mobil) mindkét méretben megvannak', () => {
    for (const name of ['studio', 'admin-leads', 'admin-overview']) {
      for (const file of [`public/assets/platform/${name}.webp`, `public/assets/platform/${name}-900.webp`]) expect(existsSync(file), file).toBe(true)
    }
    expect(statSync('public/assets/platform/admin-mobile.webp').size).toBeGreaterThan(5000)
  })
})
