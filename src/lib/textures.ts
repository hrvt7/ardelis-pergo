// PBR textúrák elérési útja. A legtöbb WebP (vizuálisan veszteségmentes, ~60%-kal kisebb);
// ahol a WebP nem lett érdemben kisebb, az eredeti JPG maradt.
const JPG = new Set(['concrete_floor_02/nor_gl'])

export function pbrPath(asset: string, map: 'diff' | 'nor_gl' | 'rough') {
  return `/assets/textures/${asset}/${map}.${JPG.has(`${asset}/${map}`) ? 'jpg' : 'webp'}`
}
