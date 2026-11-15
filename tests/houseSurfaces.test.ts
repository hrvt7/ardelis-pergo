import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { assignFacadeUv, HOUSE_SURFACES } from '../src/lib/houseSurfaces'

const uvOf = (geometry: THREE.BufferGeometry) => {
  const uv = geometry.getAttribute('uv')
  return Array.from({ length: uv.count }, (_, index) => [uv.getX(index), uv.getY(index)])
}

describe('modulház felületei: homlokzathoz igazított UV', () => {
  it('függőleges falon u a fal mentén, v függőlegesen, méterben / ismétlési méret', () => {
    const wall = new THREE.PlaneGeometry(4, 2.5) // a z = 0 síkban, normál +z
    assignFacadeUv(wall, new THREE.Matrix4(), 2)
    const width = Math.max(...uvOf(wall).map(([u]) => u)) - Math.min(...uvOf(wall).map(([u]) => u))
    const height = Math.max(...uvOf(wall).map(([, v]) => v)) - Math.min(...uvOf(wall).map(([, v]) => v))
    expect(width).toBeCloseTo(2, 5)
    expect(height).toBeCloseTo(1.25, 5)
  })

  it('30°-os tetőn a cserépsorok a gerinccel párhuzamosak, és a lejtés mentén sincs nyújtás', () => {
    const roof = new THREE.PlaneGeometry(9, 3) // 9 m eresz-hossz, 3 m a lejtés mentén
    const matrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2 + THREE.MathUtils.degToRad(30))
    assignFacadeUv(roof, matrix, 8)
    const uv = uvOf(roof)
    const spanU = Math.max(...uv.map(([u]) => u)) - Math.min(...uv.map(([u]) => u))
    const spanV = Math.max(...uv.map(([, v]) => v)) - Math.min(...uv.map(([, v]) => v))
    expect(spanU).toBeCloseTo(9 / 8, 5)
    expect(spanV).toBeCloseTo(3 / 8, 5) // a valós lejtéshossz, nem a felülnézeti vetület (az 2,6 m lenne)
  })

  it('vízszintes lapon (lábazat teteje, lépcső) u = x, v = z', () => {
    const top = new THREE.PlaneGeometry(2, 1)
    assignFacadeUv(top, new THREE.Matrix4().makeRotationX(-Math.PI / 2), 1)
    const uv = uvOf(top)
    expect(Math.max(...uv.map(([u]) => u)) - Math.min(...uv.map(([u]) => u))).toBeCloseTo(2, 5)
    expect(Math.max(...uv.map(([, v]) => v)) - Math.min(...uv.map(([, v]) => v))).toBeCloseTo(1, 5)
  })

  it('a csatlakozó lapok mintázata folytonos: a közös él két oldalán azonos az u', () => {
    const left = new THREE.PlaneGeometry(2, 2)
    const right = new THREE.PlaneGeometry(2, 2)
    assignFacadeUv(left, new THREE.Matrix4().makeTranslation(-1, 0, 0), 1)
    assignFacadeUv(right, new THREE.Matrix4().makeTranslation(1, 0, 0), 1)
    expect(Math.max(...uvOf(left).map(([u]) => u))).toBeCloseTo(Math.min(...uvOf(right).map(([u]) => u)), 5)
  })

  it('minden hivatkozott textúrafájl létezik', () => {
    for (const surface of Object.values(HOUSE_SURFACES)) for (const file of Object.values(surface.files)) expect(existsSync(`public${file}`), file).toBe(true)
  })
})
