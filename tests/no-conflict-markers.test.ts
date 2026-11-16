import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Hiba volt (4.81): egy feloldatlan git-ütközés `=======` sora élesbe került az admin CSS-ében,
// és az utána következő szabály (.ws-interest) érvénytelenné vált. Ez a teszt minden forrásfájlt átnéz.
const ROOTS = ['src', 'server', 'api', 'contracts', 'docs', 'public', 'supabase', 'tests']
const EXTENSIONS = /\.(ts|tsx|css|html|md|sql|json|mjs|cjs|js)$/
const MARKER = /^(<{7} |={7}$|>{7} )/m

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) files(path, out)
    else if (EXTENSIONS.test(name) && statSync(path).size < 2_000_000) out.push(path)
  }
  return out
}

describe('forrásfájlok', () => {
  it('nincs bennük feloldatlan git-ütközésjelző', () => {
    const root = join(__dirname, '..')
    const hits = ROOTS.flatMap((dir) => { try { return files(join(root, dir)) } catch { return [] } })
      .filter((path) => MARKER.test(readFileSync(path, 'utf8')))
      .map((path) => path.slice(root.length + 1))
    expect(hits).toEqual([])
  })
})
