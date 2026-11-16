import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const FILES = ['index.html', 'vite.config.ts', 'server/demoRequest.ts', 'src/pages/Privacy.tsx', 'src/pages/Platform.tsx', 'src/pages/AdminPage.tsx']

describe('kapcsolati e-mail', () => {
  it('mindenhol a helyes cím szerepel (hrvthadam.7@icloud.com), az elírt régi nem', () => {
    for (const file of FILES) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(/hrvtadam\.7@icloud\.com/)
      expect(text, file).toMatch(/hrvthadam\.7@icloud\.com/)
    }
  })
})
