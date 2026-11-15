// Telepíthető webapp / offline próba a `vite preview` buildjén.
// Előtte: npm run build && npx vite preview --port 4173 --host 127.0.0.1   majd: node tests/e2e/offline.cjs [http://127.0.0.1:4173]
// Ellenőrzi: (1) SW átveszi az oldalt, a bemutató mód ultra szintet rögzít, az „Offline letöltés” végigmegy;
// (2) hálózat nélkül a /konfigurator újratöltve működik és a 3D megjelenik; (3) offline ajánlatkérés hibát ad, nem sikert;
// (4) új build (új sw.js) után „Új verzió elérhető” jelzés, frissítés után a régi build-gyorsítótár törlődik.
// A 4. lépés a dist/sw.js verzióját írja át (egy új build szimulálása), a végén visszaállítja.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const SW_FILE = path.resolve(__dirname, '../../dist/sw.js');
const issues = []; const log = (...a) => console.log(...a);
const ok = (cond, what) => { if (cond) log('  ✓', what); else { issues.push(what); log('  ✗', what) } };
const sceneReady = (p) => p.waitForSelector('.scene-canvas-wrap[data-scene-ready="true"]', { timeout: 120000 });
const openView = async (p) => {
  await p.locator('.tools-toggle').click();
  await p.locator('.tools-item:visible', { hasText: 'Nézet és vizualizáció' }).first().click();
  await p.waitForSelector('.view-popover[aria-label="Nézet és vizualizáció"]');
};
const cacheNames = (p) => p.evaluate(() => caches.keys());

(async () => {
  const original = fs.readFileSync(SW_FILE, 'utf8');
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 1024 } });
  const p = await ctx.newPage(); p.setDefaultTimeout(120000);
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  try {
    log('0) az előtöltési lista minden fájlja létezik (a preview SPA-fallbackje elfedné a 404-et, ezért a tartalomtípust nézzük)');
    const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../dist/offline-manifest.json'), 'utf8'));
    const missing = manifest.build.concat(manifest.assets).filter((f) => f.url !== '/index.html' && !fs.existsSync(path.resolve(__dirname, '../../dist' + f.url))).map((f) => f.url);
    ok(missing.length === 0, `minden listázott fájl megvan a dist-ben${missing.length ? ': ' + missing.slice(0, 5).join(', ') : ''}`);

    log('1) első betöltés, bemutató mód');
    await p.goto(`${BASE}/konfigurator?bemutato=1`); await sceneReady(p);
    await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 60000 });
    ok(true, 'a service worker átvette az oldalt');
    await openView(p);
    const select = p.locator('.select-field select').filter({ has: p.locator('option[value="ultra"]') }).first();
    ok(await select.isDisabled() && (await select.inputValue()) === 'ultra', 'bemutató módban a 3D minőség rögzítve: ultra');
    await p.getByRole('button', { name: /Offline letöltés/ }).click();
    await p.waitForSelector('.offline-state.is-ready', { timeout: 240000 });
    const ready = await p.locator('.offline-state.is-ready').innerText();
    ok(/Offline is működik/.test(ready), `offline letöltés kész: ${ready.replace(/\n/g, ' ').slice(0, 90)}`);
    const before = await cacheNames(p); log('   tárak:', before.join(', '));
    ok(before.some((n) => n.startsWith('lamelix-build-')) && before.includes('lamelix-assets-v1'), 'verziózott build- és eszköztár létrejött');
    ok(!(await p.evaluate(async () => { for (const n of await caches.keys()) { const c = await caches.open(n); if ((await c.keys()).some((r) => new URL(r.url).pathname.startsWith('/api/'))) return true } return false })), '/api/* nincs egyik tárban sem');

    log('2) hálózat nélkül újratöltés');
    await ctx.setOffline(true);
    await p.reload(); await sceneReady(p);
    const canvas = await p.locator('.scene-canvas-wrap canvas').count();
    ok(canvas > 0, 'offline: a konfigurátor betöltött, a 3D vászon megjelent');
    await p.screenshot({ path: '/tmp/offline-konfigurator.png' });
    const stillUltra = await p.evaluate(() => localStorage.getItem('lamelix-bemutato-eszkoz'));
    ok(stillUltra === '1', 'a bemutató mód paraméter nélkül is megmaradt');

    log('3) offline ajánlatkérés');
    await p.locator('.control-tabs button', { hasText: 'Összegzés' }).click(); await p.waitForTimeout(800);
    await p.fill('input[name=customerName]', 'Teszt Elek'); await p.fill('input[name=phone]', '+36 30 123 4567'); await p.fill('input[name=email]', 'teszt@pelda.hu'); await p.fill('input[name=city]', 'Vép');
    await p.locator('.consent-row input').check();
    await p.waitForTimeout(3200); // az űrlap a robotszűrő miatt minimális kitöltési időt vár
    await p.locator('.lead-submit').click();
    await p.waitForSelector('.form-error, .real-lead-success', { timeout: 20000 });
    const success = await p.locator('.real-lead-success').count();
    const err = await p.locator('.form-error').innerText().catch(() => '');
    ok(!success && /nem sikerült/i.test(err), `offline beküldés hibát ad, nem sikert: "${err.slice(0, 80)}"`);
    await ctx.setOffline(false);

    log('4) új build: frissítés-jelzés és a régi tár törlése');
    const oldBuild = before.find((n) => n.startsWith('lamelix-build-'));
    const version = /version:"([a-z0-9]+)"/.exec(original)[1];
    fs.writeFileSync(SW_FILE, original.split(`version:"${version}"`).join('version:"e2enext"'));
    await p.goto(`${BASE}/konfigurator`); await sceneReady(p);
    await p.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r && r.update()));
    await p.waitForSelector('.sw-update', { timeout: 60000 });
    ok(true, '„Új verzió elérhető” jelzés megjelent (a futó munkamenet nem töltött újra magától)');
    await Promise.all([p.waitForEvent('load', { timeout: 60000 }), p.locator('.sw-update button', { hasText: 'Frissítés' }).click()]);
    await p.waitForFunction((old) => caches.keys().then((k) => !k.includes(old) && k.includes('lamelix-build-e2enext')), oldBuild, { timeout: 60000 }).catch(() => undefined);
    const after = await cacheNames(p); log('   tárak:', after.join(', '));
    ok(!after.includes(oldBuild) && after.includes('lamelix-build-e2enext'), 'a régi build-tár törlődött, az új létrejött');
    ok(after.includes('lamelix-assets-v1'), 'a változatlan jelenet-eszközök tára megmaradt (nem kell újra letölteni)');

    log('5) friss eszköz, offline letöltés NÉLKÜL: első betöltés után hálózat nélkül');
    const ctx2 = await b.newContext({ viewport: { width: 1180, height: 820 } });
    const q = await ctx2.newPage(); q.setDefaultTimeout(120000);
    await q.goto(`${BASE}/konfigurator`); await sceneReady(q);
    await q.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 60000 });
    await q.waitForTimeout(5000); // a már letöltött fájlok átkerülnek a SW-tárba
    await ctx2.setOffline(true);
    await q.reload(); await sceneReady(q);
    ok(await q.locator('.scene-canvas-wrap canvas').count() > 0, 'első betöltés után offline újratöltve is megjelenik a 3D');
    await q.screenshot({ path: '/tmp/offline-elso.png' });
    await ctx2.close();
  } catch (e) {
    issues.push('kivétel: ' + e.message.split('\n')[0]); log('  ✗ kivétel:', e.message.split('\n').slice(0, 3).join(' '));
    await p.screenshot({ path: '/tmp/offline-hiba.png' }).catch(() => undefined);
  } finally {
    fs.writeFileSync(SW_FILE, original);
    const real = errors.filter((e) => !/WebGL|swiftshader/i.test(e));
    ok(real.length === 0, `nincs JS-hiba${real.length ? ': ' + real.slice(0, 3).join(' | ') : ''}`);
    log('\nÖSSZES PROBLÉMA:', issues.length); issues.forEach((i) => log(' -', i));
    await b.close();
    process.exit(issues.length ? 1 : 0);
  }
})().catch((e) => { console.error('FAILED', e.message); process.exit(1) });
