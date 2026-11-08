import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Az Edge-függvények (api/*, server/*) a src/ fájljait is behúzzák, az Edge-csomagoló viszont a „@/” aliast nem ismeri.
// Ezért minden fájlban, amely az api/ vagy server/ felől elérhető, értéket (nem típust) csak relatív úton szabad importálni.
// A hiba a böngészős buildben nem látszik, csak a Vercelen (így bukott el a 3.68 deploy). A teszt a teljes importgráfot bejárja,
// tehát új fájlra vagy új importra is magától kiterjed.
const ROOT = resolve(__dirname, '..')
const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx']
// import … from '…' / export … from '…' (többsoros is), valamint a mellékhatásos import '…'
const STATEMENT = /(?:^|[\n;])\s*(import|export)\s+(type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"\n]+)['"]/g

function resolveSpecifier(from: string, specifier: string): string | null {
  const base = specifier.startsWith('@/') ? join(ROOT, 'src', specifier.slice(2)) : specifier.startsWith('.') ? resolve(dirname(from), specifier) : null
  if (!base) return null // csomag (node_modules) – nem a mi gondunk
  if (existsSync(base) && !existsSync(join(base, 'index.ts')) && /\.(ts|tsx|js|json)$/.test(base)) return base
  for (const extension of EXTENSIONS) if (existsSync(base + extension)) return base + extension
  return null
}

function entryFiles(): string[] {
  return ['api', 'server'].flatMap((dir) => readdirSync(join(ROOT, dir)).filter((name) => /\.tsx?$/.test(name)).map((name) => join(ROOT, dir, name)))
}

/** Az api/ és server/ felől elérhető fájlok, és bennük a „@/” érték-importok (fájl → hibás sorok). */
function scan() {
  const seen = new Set<string>()
  const offenders: Record<string, string[]> = {}
  const queue = entryFiles()
  while (queue.length) {
    const file = queue.pop()!
    if (seen.has(file)) continue
    seen.add(file)
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(STATEMENT)) {
      const [statement, , typeOnly, specifier] = match
      if (typeOnly) continue // a típusimport lefordításkor eltűnik, nem kerül a csomagba
      if (specifier.startsWith('@/')) (offenders[relative(ROOT, file)] ??= []).push(statement.trim().replace(/\s+/g, ' ').slice(0, 140))
      const target = resolveSpecifier(file, specifier)
      if (target && !seen.has(target)) queue.push(target)
    }
  }
  return { seen, offenders }
}

describe('Edge-kompatibilis importok', () => {
  const { seen, offenders } = scan()

  it('a bejárás tényleg eléri a megosztott src/ modulokat (önellenőrzés)', () => {
    const reached = [...seen].map((file) => relative(ROOT, file))
    for (const file of ['src/lib/pricing.ts', 'src/lib/furniture.ts', 'src/lib/usePacks.ts', 'src/tenants/rules.ts']) expect(reached).toContain(file)
  })

  it('az api/ és server/ felől elérhető fájlokban a „@/” alias csak típusimportban szerepel', () => {
    expect(offenders).toEqual({})
  })
})
