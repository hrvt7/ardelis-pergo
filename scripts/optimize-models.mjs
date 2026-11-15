// A public/ alatti GLB-modellek veszteségmentes tömörítése (EXT_meshopt_compression, kvantálás és szűrők nélkül).
// A geometria, a node-nevek és az anyagok bitre azonosak maradnak; a böngészőben a drei useGLTF bontja ki.
// Idempotens: a már tömörített fájlokat kihagyja. Futtatás új Blender-export után: npm run models:optimize
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import { dedup, prune, reorder, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'

await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? walk(path) : path.endsWith('.glb') ? [path] : []
})

let before = 0
let after = 0
for (const file of walk(process.argv[2] ?? 'public')) {
  const doc = await io.read(file)
  if (doc.getRoot().listExtensionsUsed().some((ext) => ext.extensionName === 'EXT_meshopt_compression')) continue
  const size = statSync(file).size
  await doc.transform(dedup(), prune(), weld(), reorder({ encoder: MeshoptEncoder }))
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE })
  const out = await io.writeBinary(doc)
  writeFileSync(file, out)
  before += size
  after += out.byteLength
  console.log(`${file}: ${size} -> ${out.byteLength}`)
}
console.log(`Összesen: ${before} -> ${after} bájt`)
