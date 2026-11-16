import type { ReactNode } from 'react'
import { useIntroDone } from '@/lib/introGate'

/** A 3D jelenet csak a nyitó animáció után épül fel; addig üres keret (a nyitókép takarja). */
export default function IntroSceneGate({ children }: { children: ReactNode }) {
  const done = useIntroDone()
  return done ? <>{children}</> : <div className="scene-canvas-wrap" data-scene-ready="false" aria-busy="true" />
}
