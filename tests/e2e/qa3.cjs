const { chromium } = require('playwright');
const issues = []; const log = (...a) => console.log(...a); const bad = (w) => { issues.push(w); log('  ✗', w) };
const BASE = 'http://127.0.0.1:4173';
const setRange = (p, sel, v) => p.evaluate(([sel, v]) => { const el = document.querySelector(sel); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, String(v)); el.dispatchEvent(new Event('input', { bubbles: true })) }, [sel, v]);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); p.setDefaultTimeout(150000);
  const errors = []; p.on('pageerror', e => errors.push('pageerror: ' + e.message)); p.on('console', m => m.type() === 'error' && errors.push('console: ' + m.text().slice(0, 200)));
  p.on('response', r => r.status() >= 400 && errors.push(`http ${r.status()} ${r.url()}`));
  const val = async () => Number(await p.locator('.total-price strong').getAttribute('data-value'));
  await p.goto(BASE + '/studio/pergola'); await p.waitForSelector('.scene-canvas-wrap[data-scene-ready="true"]', { timeout: 120000 }); await p.waitForTimeout(2000);

  // Ctrl+Z / Ctrl+Y
  const v0 = await val();
  await p.locator('.furniture-options button', { hasText: 'Étkező 8' }).click(); await p.waitForTimeout(500);
  await p.locator('.control-tabs button', { hasText: 'Extrák' }).click(); await p.locator('.stepper button').last().click(); await p.waitForTimeout(500);
  const v1 = await val(); if (v1 === v0) bad('fűtés + nem változtatott árat');
  await p.locator('canvas').click({ position: { x: 600, y: 300 } }).catch(() => {});
  await p.keyboard.press('Control+z'); await p.waitForTimeout(600);
  if (await val() !== v0) bad(`Ctrl+Z nem vonta vissza: ${await val()} vs ${v0}`);
  await p.keyboard.press('Control+y'); await p.waitForTimeout(600);
  if (await val() !== v1) bad(`Ctrl+Y nem ismételte: ${await val()} vs ${v1}`);
  await p.keyboard.press('Control+z'); await p.waitForTimeout(400);

  // Árnyék – szélsőséges bemenetek
  await p.locator('.weather-toolbar button', { hasText: 'Árnyék' }).click(); await p.waitForTimeout(1500);
  for (const code of ['0000', '12', 'abcd', '9999', '1011']) { await p.fill('#sun-postal', code); await p.waitForTimeout(900); log('irsz', code, '→', await p.locator('.sun-location small').innerText()) }
  await p.fill('#sun-date', '2026-12-21'); await p.waitForTimeout(600);
  await setRange(p, '#sun-hour', 3); await p.waitForTimeout(500); log('hajnal 3:', await p.locator('.sun-time strong').innerText());
  await setRange(p, '#sun-hour', 23); await p.waitForTimeout(500); log('este 23:', await p.locator('.sun-time strong').innerText());
  await p.fill('#sun-date', ''); await p.waitForTimeout(500);
  await p.fill('#sun-date', '1999-06-21'); await p.waitForTimeout(800);
  await p.locator('.sun-play').click(); await p.waitForTimeout(4000); await p.locator('.sun-play').click();
  await p.waitForTimeout(6000);
  log('árnyék eredmény:', (await p.locator('.sun-result').innerText()).replace(/\n+/g, ' | '));
  for (const f of ['É', 'K', 'Ny']) { await p.locator('.sun-facing button', { hasText: new RegExp('^' + f + '$') }).click(); await p.waitForTimeout(300) }
  await p.locator('.sun-close').click(); await p.waitForTimeout(800);
  if (await p.locator('.sun-panel').count()) bad('árnyékpanel nem zárult be');
  const night = await p.evaluate(() => document.querySelector('.weather-toolbar').innerText); log('toolbar az árnyék után:', night.replace(/\n/g, '|'));

  // Keret – szélsőséges bemenetek
  await p.locator('.budget-trigger').first().click(); await p.waitForTimeout(500);
  for (const amount of ['0', '50000', '999999999999', '12a34', '-5000000', '3000000']) {
    await p.fill('#budget-amount', amount); await p.waitForTimeout(2200);
    log('keret', amount, '→', (await p.locator('#budget-amount').inputValue()), '|', (await p.locator('.budget-results').innerText()).replace(/\n+/g, ' | ').slice(0, 160));
  }
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);

  // Hangulat
  await p.locator('.weather-toolbar button', { hasText: 'Éjszaka' }).click(); await p.waitForTimeout(3000);
  if (!(await p.locator('.mood-panel').count())) bad('esti hangulat panel nem jelent meg');
  await setRange(p, '#mood-level', 0); await p.waitForTimeout(500); await setRange(p, '#mood-level', 100); await p.waitForTimeout(500);
  const heat = p.locator('.mood-add', { hasText: 'fűtés' }); if (await heat.count()) { const before = await val(); await heat.click(); await p.waitForTimeout(800); if (await val() <= before) bad('fűtés hozzáadása nem emelte az árat') }
  await p.locator('.mood-heat').click().catch(() => bad('fűtés kapcsoló nincs'));
  await p.locator('.weather-toolbar button', { hasText: 'Nappal' }).click(); await p.waitForTimeout(1500);
  if (await p.locator('.mood-panel').count()) bad('nappal is látszik az esti panel');

  // AR
  await p.locator('.ar-launch').click(); await p.waitForSelector('.ar-modal'); await p.waitForTimeout(1500); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  if (await p.locator('.ar-modal').count()) bad('AR ablak nem zárult Esc-re');

  // Útvonalak
  for (const path of ['/', '/k/demo', '/embed/demo', '/nincs-ilyen-oldal', '/k/nincs-ilyen']) {
    const q = await ctx.newPage(); const errs = []; q.on('pageerror', e => errs.push(e.message));
    await q.goto(BASE + path); await q.waitForTimeout(4500);
    log('útvonal', path, '→', (await q.locator('h1').first().innerText().catch(() => '(nincs h1)')).replace(/\n/g, ' ').slice(0, 60), errs.length ? 'HIBA ' + errs[0] : '');
    if (errs.length) bad(`${path}: ${errs[0]}`); await q.close();
  }
  // Mobil: vízszintes görgetés
  for (const w of [320, 375, 414]) {
    const q = await b.newPage({ viewport: { width: w, height: 760 }, isMobile: true, hasTouch: true }); await q.goto(BASE + '/studio/pergola'); await q.waitForTimeout(9000);
    const over = await q.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, wide: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && r.width > 0 && getComputedStyle(e).position !== 'fixed' }).slice(0, 5).map(e => e.className.toString().slice(0, 40) + ':' + Math.round(e.getBoundingClientRect().right)) }));
    log('mobil', w, JSON.stringify(over)); if (over.sw > over.iw) bad(`mobil ${w}px vízszintes görgetés: ${over.sw}`);
    await q.goto(BASE + '/'); await q.waitForTimeout(3000);
    const over2 = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (over2 > 0) bad(`főoldal ${w}px túllóg ${over2}px`);
    await q.close();
  }
  [...new Set(errors)].forEach(e => bad(e));
  log('\nÖSSZES PROBLÉMA:', issues.length); issues.forEach(i => log(' -', i));
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1) });
