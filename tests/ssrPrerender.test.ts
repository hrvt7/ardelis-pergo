import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')
// Futásidőben importálva (a tesztek típusellenőrzése nem fordít JSX-et).
const ENTRY = '../src/entry-prerender'
const render = async (url: string) => ((await import(/* @vite-ignore */ ENTRY)) as { render: (url: string) => string }).render(url)

describe('előrenderelt nyitóoldal (5.01)', () => {
  it('a magyar nyitóoldal első képernyője kész HTML: fejléc, héró, „Hét lépés”, a lenti szakaszok nélkül', async () => {
    const html = await render('/')
    expect(html).toContain('class="pf-header')
    expect(html).toContain('class="lx-sky"')
    expect(html).toContain('id="pf-title"')
    expect(html).toContain('lx-build')
    expect(html).not.toContain('id="arak"')
    expect(html).toContain('lx-stage-spacer')
  })

  it('az angol változat angol szöveggel készül', async () => {
    const html = await render('/en')
    expect(html).toContain('for manufacturers')
    expect(html).not.toContain('gyártóknak</small>')
  })

  it('a böngésző csak az adott útvonalhoz készült HTML-t hidratálja, horgonnyal tisztán renderel', () => {
    const main = read('src/main.tsx')
    expect(main).toContain('hydrateRoot(root, tree)')
    expect(main).toMatch(/root\.dataset\.ssr === path && \(!hash \|\| hash === '#' \|\| hash === '#top'\)/)
  })

  it('a build előbb az előrenderelőt építi; a többi útvonal tartalék-oldala előrenderelt tartalom nélküli', () => {
    expect(JSON.parse(read('package.json')).scripts.build).toBe('vite build --ssr src/entry-prerender.ts --outDir dist-ssr && vite build')
    const vercel = JSON.parse(read('vercel.json')) as { rewrites: { destination: string }[] }
    expect(vercel.rewrites.map((rule) => rule.destination)).toContain('/app.html')
    expect(read('src/sw/sw.ts')).toContain("cache.match('/app.html')")
    expect(read('vite.config.ts')).toContain('fs.writeFileSync(path.join(dist, "app.html"), html)')
  })
})
