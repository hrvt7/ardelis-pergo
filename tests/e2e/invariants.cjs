// Állapot-invariánsok végigjárása: minden lépés minden gombja, legördülője, csúszkája és számmezője, és mindegyik után
// 3D- és UI-ellenőrzés (üres InstancedMesh = eltűnt lamellák/elemek, NaN mátrix, ár, NaN/undefined szöveg, fejléc ↔ tető, JS-hiba).
// Használat: npx vite --port 5199  (másik terminálban), majd: node tests/e2e/invariants.cjs [desk|phone] [http://127.0.0.1:5199]
// A jelenetet a ?debug=1 teszi elérhetővé (window.__lamelixScene). Kilépési kód: 1, ha volt probléma.
const { chromium, devices } = require('playwright');
const MODE = process.argv[2] || 'desk';
const BASE = process.argv[3] || 'http://127.0.0.1:5199';
const SKIP = /Következő|Vissza|Előző|Letölt|PDF|Ajánlat|Küld|Megoszt|Mentés|Törlés|Alaphelyzet|Kosár|AR\b|Bemutató|Teljes képernyő|Másol|Visszahív|Időpont|Elküld|Kérem|Kapcsolat|E-mail|Nyomtat/i;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext(MODE === 'phone' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); p.setDefaultTimeout(6000);
  const problems = new Map(); const note = (k, m) => { if (!problems.has(k)) { problems.set(k, m); console.log('  ✗', m) } };
  p.on('pageerror', e => note('pe:' + e.message.slice(0, 80), 'JS-hiba: ' + e.message.slice(0, 220)));
  p.on('console', m => { if (m.type() === 'error') { const x = m.text(); if (!/WebGL|GPU stall|swiftshader|Failed to load resource|favicon|404/i.test(x)) note('ce:' + x.slice(0, 80), 'console: ' + x.slice(0, 220)) } });
  await p.goto(`${BASE}/konfigurator?debug=1`); await p.waitForSelector('.scene-canvas-wrap[data-scene-ready="true"]', { timeout: 120000 });
  const check = async (where) => {
    await p.waitForTimeout(450);
    const r = await p.evaluate(() => {
      const out = []; const sc = window.__lamelixScene; if (!sc) return ['nincs scene'];
      sc.traverse((o) => {
        let worldVisible = true; const chain = []; for (let n = o; n; n = n.parent) { if (!n.visible) worldVisible = false; if (n.name) chain.push(n.name) }
        if (!worldVisible) return; // rejtett (pl. átmeneti vagy összehasonlító) példány nem számít
        const path = chain.slice(0, 3).join(' < ')
        if (o.isInstancedMesh && o.count >= 2) {
          const a = o.instanceMatrix.array; let placed = 0;
          for (let i = 0; i < o.count; i++) { const k = i * 16; if (!(a[k] === 1 && a[k + 5] === 1 && a[k + 10] === 1 && a[k + 12] === 0 && a[k + 13] === 0 && a[k + 14] === 0)) placed++ }
          if (placed === 0) out.push(`üres InstancedMesh (${path || o.type}, ${o.count} db)`)
        }
        const e = o.matrixWorld.elements; if (e.some((v) => !Number.isFinite(v))) out.push(`NaN mátrix: ${path || o.type}`)
      });
      return out;
    });
    // Szoftveres GPU-n (1–7 fps) az új mesh első képkockája késhet: üres példány csak akkor hiba, ha 3 mp múlva is üres.
    let still = r
    if (r.length) { await p.waitForTimeout(3000); still = await p.evaluate(() => { const out = []; window.__lamelixScene.traverse((o) => { if (!o.isInstancedMesh || o.count < 2) return; let worldVisible = true; const chain = []; for (let n = o; n; n = n.parent) { if (!n.visible) worldVisible = false; if (n.name) chain.push(n.name) } if (!worldVisible) return; const path = chain.slice(0, 3).join(' < '); const a = o.instanceMatrix.array; let placed = 0; for (let i = 0; i < o.count; i++) { const k = i * 16; if (!(a[k] === 1 && a[k + 5] === 1 && a[k + 10] === 1 && a[k + 12] === 0 && a[k + 13] === 0 && a[k + 14] === 0)) placed++ } if (placed === 0) out.push(`üres InstancedMesh (${path || o.type}, ${o.count} db) – 3 mp után is`) }); return out }).catch(() => r) }
    for (const x of still) note('3d:' + x, `${where}: ${x}`);
    const price = await p.locator('.total-price strong, .price-bar strong').first().innerText().catch(() => '');
    if (price && !/\d/.test(price)) note('price:' + where, `${where}: ár nem szám: "${price}"`);
    const body = await p.locator('.controls-panel').innerText().catch(() => '');
    if (/\bNaN\b|undefined|\[object Object\]/.test(body)) note('txt:' + where, `${where}: NaN/undefined a panelen`);
    const head = (await p.locator('.viewer-heading h1').innerText().catch(() => '')).split('\n')[0].trim();
    const sel = await p.locator('.roof-card.selected .roof-card-head strong').first().innerText().catch(() => null);
    if (sel && head && !head.startsWith(sel)) note('head:' + where, `${where}: fejléc "${head}" ≠ kiválasztott tető "${sel}"`);
  };
  for (const t of [0, 3000, 6000]) { await p.waitForTimeout(t ? 3000 : 0); await check(`betöltés +${t / 1000}s`) }
  if (MODE === 'phone') { const t = p.locator('.sheet-toggle, .sheet-handle, [aria-label*="Beállítások"]').first(); await t.click().catch(() => {}); await p.waitForTimeout(600) }
  if (MODE === 'phone') { await p.getByText('Beállítások', { exact: true }).first().click().catch(() => {}); await p.waitForTimeout(800) }
  const tabs = p.locator('.control-tabs button'); const tabNames = await tabs.allInnerTexts();
  let clicks = 0;
  for (let ti = 0; ti < tabNames.length; ti++) {
    const tab = tabNames[ti].replace(/\s+/g, ' ').trim();
    const openTab = async () => { await tabs.nth(ti).click().catch(() => {}); await p.waitForTimeout(350) };
    await openTab();
    const panel = p.locator('.controls-panel');
    const done = new Set();
    for (let guard = 0; guard < 140; guard++) {
      const list = await panel.locator('button:visible').evaluateAll((els) => els.map((e, i) => ({ i, t: (e.innerText || e.getAttribute('aria-label') || e.title || '').replace(/\s+/g, ' ').trim().slice(0, 60), dis: e.disabled, nav: !!e.closest('.control-tabs, .step-navigation') })));
      const next = list.find((x) => !x.dis && !x.nav && x.t && !done.has(x.t) && !SKIP.test(x.t));
      if (!next) break;
      done.add(next.t);
      try { await panel.locator('button:visible').nth(next.i).click({ timeout: 2500 }); clicks++ } catch { continue }
      await check(`[${tab}] "${next.t}"`);
      await p.keyboard.press('Escape').catch(() => {});
      if ((await tabs.nth(ti).getAttribute('aria-selected').catch(() => 'true')) === 'false') await openTab();
    }
    const selects = panel.locator('select:visible'); const ns = await selects.count();
    for (let si = 0; si < ns; si++) {
      const opts = await selects.nth(si).locator('option').evaluateAll((os) => os.map((o) => o.value));
      for (const v of opts) { await selects.nth(si).selectOption(v).catch(() => {}); clicks++; await check(`[${tab}] select=${v}`) }
    }
    const ranges = panel.locator('input[type=range]:visible'); const nr = await ranges.count();
    for (let ri = 0; ri < nr; ri++) {
      const r = ranges.nth(ri); const mm = await r.evaluate((e) => [Number(e.min || 0), Number(e.max || 100)]).catch(() => null); if (!mm) continue; const [min, max] = mm;
      for (const v of [min, max, (min + max) / 2]) { await r.evaluate((e, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(e, String(v)); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })) }, v).catch(() => {}); clicks++; await check(`[${tab}] csúszka#${ri}=${v}`) }
    }
    const nums = panel.locator('input[type=number]:visible'); const nn = await nums.count();
    for (let ni = 0; ni < nn; ni++) for (const v of ['0', '99999', '400']) { await nums.nth(ni).fill(v).catch(() => {}); await nums.nth(ni).press('Enter').catch(() => {}); clicks++; await check(`[${tab}] szám#${ni}=${v}`) }
  }
  console.log(`${MODE}: ${clicks} művelet, ${problems.size} egyedi probléma`);
  await b.close();
  process.exitCode = problems.size ? 1 : 0
})();
