// Utófeldolgozás asztali gépen: ambient occlusion (árnyék a sarkokban, a
// lamellák között, a bútor alatt), bloom (a LED és a fűtés tényleg világít) és
// színhű (Khronos Neutral) tónusleképezés. Mobilon és fotós előnézetben nem töltődik be.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer, HueSaturation, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing'
import { DepthOfFieldEffect, ShaderPass, ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { cameraMotion } from '@/lib/cameraMotion'


/**
 * Védőlépcső a bloom előtt. Egy tükröző felületen (pl. üveg, szenzorlencse) a
 * napfény csúcsfénye túlcsordulhat a félpontos képpufferben (Infinity/NaN);
 * a bloom ezt az egész képre szétkenné, ami fekete képet adna. Itt minden
 * képpont véges, 0–48 közötti értékre kerül — a látványt ez nem változtatja.
 */
function createClampPass() {
  const material = new THREE.ShaderMaterial({
    name: 'HdrClampMaterial',
    uniforms: { inputBuffer: { value: null } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 1.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D inputBuffer;
      varying vec2 vUv;
      float safe(float value) { return (isnan(value) || isinf(value)) ? (value > 0.0 ? 48.0 : 0.0) : clamp(value, 0.0, 48.0); }
      void main() {
        vec4 color = texture2D(inputBuffer, vUv);
        gl_FragColor = vec4(safe(color.r), safe(color.g), safe(color.b), isnan(color.a) ? 1.0 : color.a);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  return new ShaderPass(material, 'inputBuffer')
}

export default function SceneEffects({ ultra, night, vignette, bloomScale }: { ultra: boolean; night: boolean; vignette: boolean; bloomScale: number }) {
  const clampPass = useMemo(() => createClampPass(), [])
  useEffect(() => () => clampPass.dispose(), [clampPass])
  // Filmszerű vágás: kameraváltás közben a célpont marad éles, a környezet enyhén elmosódik („fókuszálás”); nyugalomban a hatás nulla, nem kerül képre.
  const dof = useRef<DepthOfFieldEffect>(null)
  useFrame(() => {
    const effect = dof.current
    if (!effect) return
    const strength = Math.sin(Math.PI * cameraMotion.p)
    const bokeh = strength * 2.6
    if (effect.bokehScale === bokeh && bokeh === 0) return
    effect.bokehScale = bokeh
    effect.cocMaterial.worldFocusDistance = cameraMotion.focus
    effect.cocMaterial.worldFocusRange = 1.5 + cameraMotion.focus * 0.25
  })
  // Natív MSAA a HDR pufferen: éles élek 100%-os Windows-skálázású (dpr 1) képernyőn is; az SMAA önmagában „pixeles” képet adott.
  return (
    <EffectComposer multisampling={ultra ? 4 : 2} enableNormalPass={false}>
      <primitive object={clampPass} dispose={null} />
      <N8AO
        aoRadius={0.75}
        distanceFalloff={0.55}
        intensity={night ? 1.7 : 2.6}
        aoSamples={ultra ? 16 : 10}
        denoiseSamples={ultra ? 8 : 4}
        denoiseRadius={ultra ? 10 : 12}
        quality={ultra ? 'high' : 'medium'}
        // Fél felbontású AO mélységtudatos felskálázással ultrán is: a képminőség gyakorlatilag azonos, a költség a negyede.
        halfRes
        depthAwareUpsampling
      />
      <DepthOfField ref={dof} worldFocusDistance={10} worldFocusRange={4} bokehScale={0} resolutionScale={0.5} />
      <Bloom mipmapBlur luminanceThreshold={night ? 1 : 1.25} luminanceSmoothing={0.2} intensity={(night ? 0.85 : 0.1) * Math.max(bloomScale, 1)} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      {/* Finom vignetta és enyhe telítettség a tónusleképezés után: a kép „fotósabb”, a figyelem a pergolára esik. */}
      {vignette ? <Vignette eskil={false} offset={0.32} darkness={night ? 0.5 : 0.42} /> : <></>}
      {vignette ? <HueSaturation saturation={0.05} /> : <></>}
    </EffectComposer>
  )
}
