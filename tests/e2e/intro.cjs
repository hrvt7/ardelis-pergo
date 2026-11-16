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

    log('3) nincs gomb, érintésre nem zárul be');
    await p.goto(`${BASE}/konfigurator?intro=1`, { waitUntil: 'commit' });
    await p.waitForFunction(() => { const v = document.querySelector('#lamelix-intro video'); return v && v.currentTime > 0.3 }, null, { timeout: 15000 });
    ok(await p.locator('#lamelix-intro button').count() === 0, 'nincs se kihagyás, se lejátszás gomb');
    await p.touchscreen.tap(195, 420); await p.mouse.click(195, 420); await p.waitForTimeout(700);
    ok(await p.locator('#lamelix-intro').count() === 1 && await p.evaluate(() => document.getElementById('lamelix-intro').style.opacity) === '1', 'koppintásra nem zárul be, a videó fut tovább');
    const box = await p.locator('#lamelix-intro video').boundingBox();
    ok(box && box.width >= 389 && box.height >= 843, `teljes képernyő (${box && Math.round(box.width)}×${box && Math.round(box.height)})`);
    await p.waitForSelector('#lamelix-intro', { state: 'detached', timeout: 60000 });

    log('3b) tiltott automatikus lejátszás (iOS energiatakarékos mód, play-jel): ugyanez az animáció animált képként fut, gomb nélkül');
    const blockedPage = await ctx.newPage(); blockedPage.setDefaultTimeout(60000);
    await blockedPage.addInitScript(() => {
      // Mint iOS energiatakarékos módban: sem az autoplay attribútum, sem a play() nem indít.
      Object.defineProperty(HTMLMediaElement.prototype, 'autoplay', { set() {}, get() { return false }, configurable: true });
      const setAttr = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function (name, value) { if (this instanceof HTMLMediaElement && name === 'autoplay') return; return setAttr.call(this, name, value) };
      HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('blocked', 'NotAllowedError')) };
    });
    const t0 = Date.now();
    await blockedPage.goto(`${BASE}/konfigurator?intro=1`, { waitUntil: 'commit' });
    await blockedPage.waitForSelector('#lamelix-intro img[src$="lamelix-intro.avif"]', { timeout: 20000 });
    const videoHidden = await blockedPage.evaluate(() => getComputedStyle(document.querySelector('#lamelix-intro video')).display === 'none');
    ok(videoHidden && await blockedPage.locator('#lamelix-intro button').count() === 0, 'a videó (és a play-jel) rejtve, az animált kép fut, nincs gomb');
    await blockedPage.waitForTimeout(2500); const a1 = await blockedPage.screenshot();
    await blockedPage.waitForTimeout(2500); const a2 = await blockedPage.screenshot();
    ok(!a1.equals(a2), 'az animált kép mozog (két képkocka eltér)');
    await blockedPage.screenshot({ path: '/tmp/intro-blocked.png' });
    await blockedPage.waitForSelector('#lamelix-intro', { state: 'detached', timeout: 30000 });
    const took = (Date.now() - t0) / 1000;
    ok(took >= 9, `végigfut, utána eltűnik (${took.toFixed(1)} mp)`);
    await blockedPage.close();

    log('3c) lassú hálózat: a videó 4 mp késéssel érkezik – nem adja fel, utána lejátszik');
    const slowPage = await ctx.newPage(); slowPage.setDefaultTimeout(60000);
    await slowPage.route('**/assets/intro/lamelix-intro.mp4', async (route) => { await new Promise((r) => setTimeout(r, 4000)); await route.continue() });
    await slowPage.goto(`${BASE}/konfigurator?intro=1`, { waitUntil: 'commit' });
    await slowPage.waitForTimeout(3500);
    ok(await slowPage.locator('#lamelix-intro').count() === 1, '3,5 mp-nél a nyitókép még vár a videóra (régen 2,5 mp-nél feladta)');
    const slowPlayed = await slowPage.waitForFunction(() => { const v = document.querySelector('#lamelix-intro video'); return v && v.currentTime > 0.5 }, null, { timeout: 15000 }).then(() => true).catch(() => false);
    ok(slowPlayed, 'a késve érkező videó lejátszik');
    await slowPage.close();

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
