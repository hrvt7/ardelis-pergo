import type { MountType, SideKey } from '@/types/pergola'

/** Felülnézeti rajz a rögzítési módhoz: a ház falai vastag vonallal, a pergola kerete és az oszlopai. */
export default function MountPlan({ mount }: { mount: MountType }) {
  const walls = new Set<SideKey>(mount === 'freestanding' ? [] : mount === 'wall' ? ['back'] : mount === 'corner-left' ? ['back', 'left'] : mount === 'corner-right' ? ['back', 'right'] : ['back', 'left', 'right'])
  const posts: [number, number][] = []
  if (!walls.has('back')) posts.push([16, 14], [56, 14])
  if (!walls.has('left')) posts.push([16, 44])
  if (!walls.has('right')) posts.push([56, 44])
  return <svg viewBox="0 0 72 56" width="58" height="45" aria-hidden="true" className="lx-mount-plan">
    {walls.has('back') && <rect x="4" y="5" width="64" height="5" rx="1.5" className="wall" />}
    {walls.has('left') && <rect x="4" y="5" width="5" height="47" rx="1.5" className="wall" />}
    {walls.has('right') && <rect x="63" y="5" width="5" height="47" rx="1.5" className="wall" />}
    <rect x="16" y="14" width="40" height="30" rx="2" className="frame" />
    <path d="M22 14v30 M28 14v30 M34 14v30 M40 14v30 M46 14v30 M52 14v30" className="louvre" />
    {posts.map(([x, y]) => <rect key={`${x}-${y}`} x={x - 2.6} y={y - 2.6} width="5.2" height="5.2" rx="1.2" className="post" />)}
  </svg>
}
