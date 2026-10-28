// A build:preview utolsó lépése: a nem kiszolgált bináris fájlokat base64 szöveggé alakítja.
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const root = process.argv[2] ?? 'dist-preview'
const pattern = /\.(bin|hdr|glb|gltf|gz)$/i
let count = 0
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (pattern.test(name)) { writeFileSync(`${path}.b64.txt`, readFileSync(path).toString('base64')); unlinkSync(path); count += 1 }
  }
}
walk(root)
console.log(`encode-binaries: ${count} fájl átalakítva`)
// Az előnézet neve a galériában.
const index = join(root, 'index.html')
writeFileSync(index, readFileSync(index, 'utf8').replace(/<title>[^<]*<\/title>/, '<title>ARDELIS Pergo Studio</title>'))
