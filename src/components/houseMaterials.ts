// A ház homlokzatának és nyílászáróinak 3D anyagai. Minden textúra a böngészőben készül
// (nincs letöltés), színenként egyszer, és a főépület meg az L/U-szárny ugyanazt használja.
import * as THREE from 'three'
import type { WallFinish } from '@/types/pergola'
import { findWindowColor, wallColorHex } from '@/lib/house'

const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

const rgbOf = (hex: string) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)) as [number, number, number]
const css = ([r, g, b]: number[], alpha = 1) => `rgba(${Math.round(Math.max(0, Math.min(255, r)))},${Math.round(Math.max(0, Math.min(255, g)))},${Math.round(Math.max(0, Math.min(255, b)))},${alpha})`
const scaleRgb = (rgb: number[], factor: number) => rgb.map((channel) => channel * factor)
const mixRgb = (a: number[], b: number[], amount: number) => a.map((channel, index) => channel + (b[index] - channel) * amount)

function canvasTexture(canvas: HTMLCanvasElement, srgb: boolean) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

type TexturePair = { map: THREE.Texture; bump: THREE.Texture }

const brickCache = new Map<string, TexturePair>()
/** Varrat nélkül ismétlődő futókötéses téglafal (1,0 × 0,6 m), a megadott átlagszínnel. */
export function getBrickTextures(hex: string): TexturePair {
  const cached = brickCache.get(hex)
  if (cached) return cached
  const base = rgbOf(hex)
  const width = 1024
  const height = 614
  const color = document.createElement('canvas')
  const bump = document.createElement('canvas')
  color.width = bump.width = width
  color.height = bump.height = height
  const c = color.getContext('2d')!
  const b = bump.getContext('2d')!
  const light = (base[0] + base[1] + base[2]) / 3 > 170
  // A fuga világos cementszürke; világos (festett) téglánál a téglával közel azonos.
  c.fillStyle = css(light ? scaleRgb(base, 0.93) : mixRgb(base, [196, 190, 180], 0.72))
  c.fillRect(0, 0, width, height)
  b.fillStyle = '#202020'
  b.fillRect(0, 0, width, height)
  const courses = 8
  const courseHeight = height / courses
  const brickLength = width / 4
  const mortar = 10
  for (let row = 0; row < courses; row += 1) {
    const offset = row % 2 ? brickLength / 2 : 0
    for (let col = -1; col < 5; col += 1) {
      const x = col * brickLength + offset
      const tone = seeded(row * 7 + col + 3, 41)
      c.fillStyle = css(scaleRgb(base, (light ? 0.95 : 0.84) + tone * (light ? 0.1 : 0.3)))
      c.fillRect(x + mortar / 2, row * courseHeight + mortar / 2, brickLength - mortar, courseHeight - mortar)
      for (let speck = 0; speck < 40; speck += 1) {
        const sx = x + mortar / 2 + seeded(row * 97 + col * 13 + speck, 7) * (brickLength - mortar)
        const sy = row * courseHeight + mortar / 2 + seeded(row * 31 + col * 5 + speck, 9) * (courseHeight - mortar)
        c.fillStyle = seeded(speck, row) > 0.5 ? css(scaleRgb(base, 0.45), 0.2) : css(mixRgb(base, [255, 240, 225], 0.5), 0.18)
        c.fillRect(sx, sy, 3, 2)
      }
      const shade = 200 + Math.round(tone * 30)
      b.fillStyle = `rgb(${shade},${shade},${shade})`
      b.fillRect(x + mortar / 2, row * courseHeight + mortar / 2, brickLength - mortar, courseHeight - mortar)
    }
  }
  const pair = { map: canvasTexture(color, true), bump: canvasTexture(bump, false) }
  brickCache.set(hex, pair)
  return pair
}

const cedarCache = new Map<string, TexturePair>()
/**
 * Vízszintes deszkaburkolat (1,0 × 1,4 m, ≈14 cm-es deszkák), a megadott átlagszínnel —
 * a szárny sima falsíkjain; a főépület deszkái valódi geometria, oda csak erezet kell.
 */
export function getCedarTextures(hex: string): TexturePair {
  const cached = cedarCache.get(hex)
  if (cached) return cached
  const base = rgbOf(hex)
  const width = 1024
  const height = 1434
  const color = document.createElement('canvas')
  const bump = document.createElement('canvas')
  color.width = bump.width = width
  color.height = bump.height = height
  const c = color.getContext('2d')!
  const b = bump.getContext('2d')!
  const boards = 10
  const boardHeight = height / boards
  for (let row = 0; row < boards; row += 1) {
    const y = row * boardHeight
    const tone = seeded(row, 77)
    c.fillStyle = css(scaleRgb(base, 0.86 + tone * 0.26))
    c.fillRect(0, y, width, boardHeight)
    for (let streak = 0; streak < 26; streak += 1) {
      const sy = y + 6 + seeded(row * 31 + streak, 5) * (boardHeight - 16)
      c.strokeStyle = seeded(row * 17 + streak, 9) > 0.5 ? css(mixRgb(base, [255, 225, 190], 0.35), 0.22) : css(scaleRgb(base, 0.5), 0.2)
      c.lineWidth = 1 + seeded(streak, row) * 2.2
      c.beginPath()
      c.moveTo(0, sy)
      for (let x = 0; x <= width; x += 64) c.lineTo(x, sy + Math.sin((x / width) * Math.PI * 2 * (1 + (streak % 3)) + row) * 2.4)
      c.stroke()
    }
    if (seeded(row, 3) > 0.45) {
      c.fillStyle = css(scaleRgb(base, 0.3), 0.55)
      c.fillRect(Math.round(seeded(row, 4) * width), y + 2, 3, boardHeight - 4)
    }
    const gradient = c.createLinearGradient(0, y, 0, y + boardHeight)
    gradient.addColorStop(0, 'rgba(255,220,190,0.10)')
    gradient.addColorStop(0.85, 'rgba(0,0,0,0)')
    gradient.addColorStop(1, 'rgba(0,0,0,0.28)')
    c.fillStyle = gradient
    c.fillRect(0, y, width, boardHeight)
    c.fillStyle = css(scaleRgb(base, 0.22), 0.9)
    c.fillRect(0, y + boardHeight - 5, width, 5)
    const bumpGradient = b.createLinearGradient(0, y, 0, y + boardHeight)
    bumpGradient.addColorStop(0, '#f2f2f2')
    bumpGradient.addColorStop(1, '#9a9a9a')
    b.fillStyle = bumpGradient
    b.fillRect(0, y, width, boardHeight)
    b.fillStyle = '#202020'
    b.fillRect(0, y + boardHeight - 5, width, 5)
  }
  const pair = { map: canvasTexture(color, true), bump: canvasTexture(bump, false) }
  cedarCache.set(hex, pair)
  return pair
}

const grainCache = new Map<string, THREE.Texture>()
/** Csak erezet (deszkaosztás nélkül), 1,0 × 0,25 m — a modell valódi deszkáira és a fa hatású keretekre. */
export function getGrainTexture(hex: string) {
  const cached = grainCache.get(hex)
  if (cached) return cached
  const base = rgbOf(hex)
  const width = 512
  const height = 128
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const c = canvas.getContext('2d')!
  c.fillStyle = css(base)
  c.fillRect(0, 0, width, height)
  for (let streak = 0; streak < 70; streak += 1) {
    const sy = seeded(streak, 5) * height
    c.strokeStyle = seeded(streak, 9) > 0.5 ? css(mixRgb(base, [255, 228, 196], 0.3), 0.28) : css(scaleRgb(base, 0.55), 0.3)
    c.lineWidth = 0.6 + seeded(streak, 2) * 2.4
    c.beginPath()
    c.moveTo(0, sy)
    // Az erezet a textúra széleinél azonos magasságban fut, így vízszintesen varrat nélkül ismétlődik.
    for (let x = 0; x <= width; x += 32) c.lineTo(x, sy + Math.sin((x / width) * Math.PI * 2 * (1 + (streak % 3)) + streak) * 1.8)
    c.stroke()
  }
  const texture = canvasTexture(canvas, true)
  grainCache.set(hex, texture)
  return texture
}

export type FacadeFinish = { material: THREE.MeshStandardMaterial; uPerM: number; vPerM: number }
export type PlasterMaps = { diff: THREE.Texture; normal: THREE.Texture; rough: THREE.Texture }

const finishCache = new Map<string, FacadeFinish>()
const plasterClones = new Map<string, PlasterMaps>()

function plasterMaps(source: PlasterMaps): PlasterMaps {
  const key = `${source.diff.uuid}|${source.normal.uuid}|${source.rough.uuid}`
  const cached = plasterClones.get(key)
  if (cached) return cached
  const prepare = (texture: THREE.Texture, srgb: boolean) => {
    const clone = texture.clone()
    clone.wrapS = clone.wrapT = THREE.RepeatWrapping
    clone.repeat.set(1, 1)
    clone.anisotropy = 8
    if (srgb) clone.colorSpace = THREE.SRGBColorSpace
    clone.needsUpdate = true
    return clone
  }
  const maps = { diff: prepare(source.diff, true), normal: prepare(source.normal, false), rough: prepare(source.rough, false) }
  plasterClones.set(key, maps)
  return maps
}

/** Homlokzati anyag méterarányos UV-léptékkel (uPerM/vPerM: hány textúra-ismétlés esik egy méterre). */
export function getFacadeFinish(finish: WallFinish, color: string, plaster: PlasterMaps): FacadeFinish {
  const hex = wallColorHex(finish, color)
  const key = `${finish}|${hex}`
  const cached = finishCache.get(key)
  if (cached) return cached
  let result: FacadeFinish
  if (finish === 'plaster') {
    const maps = plasterMaps(plaster)
    // Színezett vakolat: a szín pontosan a választott (nincs színtextúra, ami sötétítené);
    // a szemcsés felületet a normál- és érdességtérkép adja.
    result = { material: new THREE.MeshStandardMaterial({ name: `facade-plaster-${hex}`, color: hex, normalMap: maps.normal, normalScale: new THREE.Vector2(0.7, 0.7), roughnessMap: maps.rough, roughness: 0.96, envMapIntensity: 0.55 }), uPerM: 1 / 2.2, vPerM: 1 / 2.2 }
  } else if (finish === 'brick') {
    const textures = getBrickTextures(hex)
    result = { material: new THREE.MeshStandardMaterial({ name: `facade-brick-${hex}`, map: textures.map, bumpMap: textures.bump, bumpScale: 1.4, roughness: 0.9, envMapIntensity: 0.6 }), uPerM: 1 / 1.0, vPerM: 1 / 0.6 }
  } else {
    const textures = getCedarTextures(hex)
    result = { material: new THREE.MeshStandardMaterial({ name: `facade-cedar-${hex}`, map: textures.map, bumpMap: textures.bump, bumpScale: 2.2, roughness: 0.62, envMapIntensity: 0.72 }), uPerM: 1 / 1.0, vPerM: 1 / 1.4 }
  }
  finishCache.set(key, result)
  return result
}

const boardCache = new Map<string, THREE.MeshStandardMaterial>()
/** A főépület valódi deszkáinak anyaga a választott fa színben (erezet, deszkaosztás nélkül). */
export function getBoardMaterial(hex: string) {
  const cached = boardCache.get(hex)
  if (cached) return cached
  const material = new THREE.MeshStandardMaterial({ name: `siding-${hex}`, map: getGrainTexture(hex), roughness: 0.66, envMapIntensity: 0.7 })
  boardCache.set(hex, material)
  return material
}

const frameCache = new Map<string, THREE.MeshStandardMaterial>()
/** Ablak-, ajtókeret és bejárati ajtó anyaga a választott nyílászáró-színben. */
export function getFrameMaterial(id: string) {
  const swatch = findWindowColor(id)
  const cached = frameCache.get(swatch.id)
  if (cached) return cached
  const material = swatch.kind === 'wood'
    ? new THREE.MeshStandardMaterial({ name: `frame-${swatch.id}`, map: getGrainTexture(swatch.hex), roughness: 0.52, envMapIntensity: 0.7 })
    : swatch.kind === 'metal'
      ? new THREE.MeshStandardMaterial({ name: `frame-${swatch.id}`, color: swatch.hex, metalness: 0.72, roughness: 0.34, envMapIntensity: 0.9 })
      : new THREE.MeshStandardMaterial({ name: `frame-${swatch.id}`, color: swatch.hex, metalness: 0.1, roughness: swatch.id === 'white' ? 0.3 : 0.38, envMapIntensity: 0.75 })
  frameCache.set(swatch.id, material)
  return material
}

/**
 * Doboz-vetítéses UV a modell egy hálójára, méterben (a ház léptékével): a felület normálisa szerint
 * az x–y, z–y vagy x–z síkra vetítünk, így a vakolat és a tégla minden falon azonos sűrűségű és vízszintes.
 */
export function boxProjectedGeometry(source: THREE.BufferGeometry, matrix: THREE.Matrix4, scale: number, uPerM: number, vPerM: number) {
  const geometry = source.clone()
  const position = geometry.getAttribute('position')
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
  const normal = geometry.getAttribute('normal')
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix)
  const point = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const uv = new Float32Array(position.count * 2)
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index).applyMatrix4(matrix).multiplyScalar(scale)
    direction.fromBufferAttribute(normal, index).applyMatrix3(normalMatrix)
    const ax = Math.abs(direction.x)
    const ay = Math.abs(direction.y)
    const az = Math.abs(direction.z)
    let u: number
    let v: number
    if (ay >= ax && ay >= az) { u = point.x; v = point.z } else if (ax >= az) { u = point.z; v = point.y } else { u = point.x; v = point.y }
    uv[index * 2] = u * uPerM
    uv[index * 2 + 1] = v * vPerM
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geometry
}
