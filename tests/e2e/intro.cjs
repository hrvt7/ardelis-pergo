// Nyitó animáció próba a `vite preview` buildjén (Chrome, H.264 miatt a rendszer Chrome-ja kell: CHROME=/usr/bin/google-chrome).
// Előtte: npm run build && npx vite preview --port 4173 --host 127.0.0.1   majd: node tests/e2e/intro.cjs [http://127.0.0.1:4173]
// A telepített (standalone) mód nem emulálható, ezért ?intro=1-gyel kényszerítjük; a döntési logikát a tests/introSplash.test.ts fedi.
// Ellenőrzi: a videó azonnal fut a konfigurátor fölött; a 3D közben betölt a háttérben; a vége után eltűnik;
// kihagyás gomb; munkamenetenként egyszer; offline (SW-tárból, tartomány-kérésekkel) is lejátszik.
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const issues = []; const log = (...a) => console.log(...a);
const ok = (cond, what) => { if (cond) log('  ✓', what); else { issues.push(what); log('  ✗', what) } };
const state = (p) => p.evaluate(() => {
  const v = document.querySelector('#lamelix-intro video');
  return { overlay: !!document.getElementById('lamelix-intro'), t: v ? v.currentTime : -1, paused: v ? v.paused : null, ready: !!document.querySelector('.scene-canvas-wrap[data-scene-ready="true"]') };
});

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.setDefaultTimeout(120000);
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  try {
    log('1) indulás: a videó a konfigurátor fölött, a 3D a háttérben tölt');
    await p.goto(`${BASE}/konfigurator?intro=1`, { waitUntil: 'commit' });
    await p.waitForSelector('#lamelix-intro video', { timeout: 15000 });
    await p.waitForFunction(() => { const v = document.querySelector('#lamelix-intro video'); return v && v.currentTime > 0.3 }, null, { timeout: 15000 });
    const s1 = await state(p);
    ok(s1.overlay && !s1.paused, `a videó némítva elindult (autoplay-korlátozás mellett is), t=${s1.t.toFixed(2)} mp`);
    await p.waitForTimeout(1500); await p.screenshot({ path: '/tmp/intro-1.png' });
    await p.waitForSelector('.scene-canvas-wrap[data-scene-ready="true"]', { state: 'attached', timeout: 120000 });
    const s2 = await state(p);
    ok(s2.overlay ? s2.t < 9 : true, `a 3D a háttérben betöltött${s2.overlay ? ` a videó alatt (t=${s2.t.toFixed(1)} mp)` : ''}`);
    await p.waitForSelector('#lamelix-intro', { state: 'detached', timeout: 20000 });
    ok(true, 'a videó vége után a nyitókép eltűnt, a konfigurátor látszik');
    await p.screenshot({ path: '/tmp/intro-2.png' });
    ok(await p.evaluate(() => document.documentElement.style.overflow === ''), 'a görgetés-zár feloldva');

    log('2) munkamenetenként egyszer (újratöltés, pl. „Frissítés” után nem fut újra)');
    await p.goto(`${BASE}/konfigurator`); await p.waitForTimeout(1500);
    ok(!(await state(p)).overlay, 'paraméter nélkül, ugyanabban a munkamenetben nem jelenik meg (és böngészőfülön sem)');

    log('3) kihagyás');
    await p.goto(`${BASE}/konfigurator?intro=1`, { waitUntil: 'commit' });
    await p.waitForSelector('#lamelix-intro button');
    await p.waitForTimeout(600);
    await p.locator('#lamelix-intro button').click();
    const fading = await p.evaluate(() => { const r = document.getElementById('lamelix-intro'); return !r || r.style.opacity === '0' });
    await p.waitForSelector('#lamelix-intro', { state: 'detached', timeout: 15000 });
    ok(fading, 'a „Kihagyás” gomb azonnal bezárja (elhalványul, majd eltűnik)');

    log('4) nyitóoldalon nem');
    await p.goto(`${BASE}/?intro=1`); await p.waitForTimeout(1200);
    ok(!(await state(p)).overlay, 'a nyitóoldalon nincs nyitó animáció');

    log('5) offline: a videó a SW tárából (tartomány-kérésekkel) is lejátszik');
    await p.goto(`${BASE}/konfigurator`);
    await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 60000 });
    // A videó a háttérben teljes fájlként kerül tárba (az első lejátszás tartomány-kéréseiből); megvárjuk.
    await p.waitForFunction(async () => { for (const n of await caches.keys()) { const c = await caches.open(n); if (await c.match('/assets/intro/lamelix-intro.mp4')) return true } return false }, null, { timeout: 60000, polling: 1000 })
      .catch(async () => { await p.evaluate(() => fetch('/assets/intro/lamelix-intro.mp4').then((r) => r.blob())); });
    await ctx.setOffline(true);
    await p.goto(`${BASE}/konfigurator?intro=1`, { waitUntil: 'commit' });
    const played = await p.waitForFunction(() => { const v = document.querySelector('#lamelix-intro video'); return v && v.currentTime > 1 }, null, { timeout: 20000 }).then(() => true).catch(() => false);
    ok(played, 'offline is lejátszik');
    await p.waitForSelector('.scene-canvas-wrap[data-scene-ready="true"]', { state: 'attached', timeout: 120000 });
    await p.waitForSelector('#lamelix-intro', { state: 'detached', timeout: 20000 });
    ok(true, 'offline: a végén eltűnik, a 3D kész');
    await ctx.setOffline(false);
  } catch (e) {
    issues.push('kivétel: ' + e.message.split('\n')[0]); log('  ✗ kivétel:', e.message.split('\n').slice(0, 3).join(' '));
    await p.screenshot({ path: '/tmp/intro-hiba.png' }).catch(() => undefined);
  } finally {
    const real = errors.filter((e) => !/WebGL|swiftshader/i.test(e));
    ok(real.length === 0, `nincs JS-hiba${real.length ? ': ' + real.slice(0, 3).join(' | ') : ''}`);
    log('\nÖSSZES PROBLÉMA:', issues.length); issues.forEach((i) => log(' -', i));
    await b.close();
    process.exit(issues.length ? 1 : 0);
  }
})().catch((e) => { console.error('FAILED', e.message); process.exit(1) });
