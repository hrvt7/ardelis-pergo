import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Color } from 'three'
import { refreshShadowInMotion, SHADOW_MOTION_INTERVAL } from '../src/lib/mechanics'
import { clearDepthOfField, skipIdleDepthOfField, type ClearingRenderer, type IdleDepthOfField } from '../src/lib/dofIdle'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('árnyék animáció közben (audit H4)', () => {
  it('mozgás alatt legfeljebb ~30-szor másodpercenként, a végén mindig', () => {
    const gl = { shadowMap: { needsUpdate: false } }
    let updates = 0
    for (let frame = 0; frame <= 60; frame++) {
      gl.shadowMap.needsUpdate = false
      refreshShadowInMotion(gl, frame / 60, false)
      if (gl.shadowMap.needsUpdate) updates++
    }
    expect(updates).toBeLessThanOrEqual(Math.ceil(1 / SHADOW_MOTION_INTERVAL) + 1)
    expect(updates).toBeGreaterThanOrEqual(25)
    gl.shadowMap.needsUpdate = false
    refreshShadowInMotion(gl, 1 + 1 / 120, true)
    expect(gl.shadowMap.needsUpdate).toBe(true)
  })
})

describe('mélységélesség nyugalomban (audit H2)', () => {
  const makeRenderer = () => {
    const log: string[] = []
    let target: object | null = null
    const renderer: ClearingRenderer = {
      getRenderTarget: () => target,
      setRenderTarget: (next) => { target = next; log.push(`target:${next ? (next as { id: string }).id : 'screen'}`) },
      getClearColor: (out) => out.set(0.2, 0.3, 0.4),
      getClearAlpha: () => 1,
      setClearColor: (color: Color, alpha: number) => { log.push(`clear-color:${color.getHexString()}/${alpha}`) },
      clear: () => { log.push('clear') },
    }
    return { renderer, log }
  }
  const makeEffect = () => {
    const calls = { update: 0 }
    const t = (id: string) => ({ id })
    const effect: IdleDepthOfField = { bokehScale: 0, update: () => { calls.update++ }, renderTarget: t('rt'), renderTargetNear: t('near'), renderTargetFar: t('far'), renderTargetMasked: t('mask'), renderTargetCoC: t('coc'), renderTargetCoCBlurred: t('cocb') }
    return { effect, calls }
  }
  it('nyugalomban a 7 lépés nem fut; a köztes képek egyszer kinullázódnak, a tisztítószín visszaáll', () => {
    const { effect, calls } = makeEffect()
    const { renderer, log } = makeRenderer()
    skipIdleDepthOfField(effect)
    effect.update(renderer, null, 0.016)
    effect.update(renderer, null, 0.016)
    expect(calls.update).toBe(0)
    expect(log.filter((entry) => entry === 'clear')).toHaveLength(6)
    expect(log[0]).toBe('clear-color:000000/0')
    expect(log.at(-1)).toMatch(/^clear-color:(?!000000)[0-9a-f]{6}\/1$/)
    expect(log.at(-2)).toBe('target:screen')
  })
  it('kameraváltáskor (bokeh > 0) teljesen fut, utána újra kinulláz és pihen', () => {
    const { effect, calls } = makeEffect()
    const { renderer, log } = makeRenderer()
    const restore = skipIdleDepthOfField(effect)
    effect.bokehScale = 1.2
    effect.update(renderer, null, 0.016)
    effect.update(renderer, null, 0.016)
    expect(calls.update).toBe(2)
    effect.bokehScale = 0
    effect.update(renderer, null, 0.016)
    expect(log.filter((entry) => entry === 'clear')).toHaveLength(6)
    restore()
    effect.update(renderer, null, 0.016)
    expect(calls.update).toBe(3)
  })
  it('a tisztítás minden köztes célt érint', () => {
    const { effect } = makeEffect()
    const { renderer, log } = makeRenderer()
    clearDepthOfField(effect, renderer)
    for (const id of ['rt', 'near', 'far', 'mask', 'coc', 'cocb']) expect(log).toContain(`target:${id}`)
  })
})

describe('bekötés a jelenetbe', () => {
  const scene = read('src/components/PergolaScene.tsx')
  const effects = read('src/components/SceneEffects.tsx')
  it('DOF kihagyás és 2× MSAA az utófeldolgozásban (H2, H6)', () => {
    expect(effects).toContain('skipIdleDepthOfField(effect as unknown as IdleDepthOfField)')
    expect(effects).toContain('<EffectComposer multisampling={2}')
  })
  it('fénytörő üveg fél felbontáson, kétoldalas üvegen nincs transzmisszió (H3)', () => {
    expect(scene).toContain('gl.transmissionResolutionScale = 0.5')
    expect(scene).toContain("if (materialDetail === 'ultra' && !doubleSided) return <meshPhysicalMaterial")
  })
  it('kézi szinten finom felbontás-szabályozó (H5)', () => {
    expect(scene).toContain('<DprGovernor enabled={loaded && !governorEnabled(scene.quality, demoDevice, loaded)} onAverage={onFrameAverage} />')
    expect(scene).toContain('const dpr = useMemo(() => applyDprCap(baseDpr, dprCap), [baseDpr, dprCap])')
  })
  it('a napfény csak minőségváltáskor épül újra, méretváltáskor az árnyékkamera helyben frissül (H12)', () => {
    expect(scene).toContain('<directionalLight key={quality.shadowMapSize} ref={sun} castShadow')
    expect(scene).toContain('camera.updateProjectionMatrix()')
  })
})
