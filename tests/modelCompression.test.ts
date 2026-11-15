import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? walk(path) : path.endsWith('.glb') ? [path] : []
})

function extensionsUsed(path: string): string[] {
  const data = readFileSync(path)
  const json = JSON.parse(data.toString('utf8', 20, 20 + data.readUInt32LE(12))) as { extensionsUsed?: string[] }
  return json.extensionsUsed ?? []
}

// Minden GLB meshopt-tal tömörített (npm run models:optimize), kvantálás nélkül: a geometria veszteségmentes marad.
describe('3D-modellek tömörítése', () => {
  it.each(walk('public/assets/models'))('%s', (file) => {
    const used = extensionsUsed(file)
    expect(used).toContain('EXT_meshopt_compression')
    if (!file.includes('scale_person')) expect(used).not.toContain('KHR_mesh_quantization')
  })
})
