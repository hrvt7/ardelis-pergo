const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const issues = []; const log = (...a) => console.log(...a);
const bad = (what) => { issues.push(what); log('  ✗', what) };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); p.setDefaultTimeout(150000);
  const errors = []; p.on('pageerror', e => errors.push('pageerror: ' + e.message)); p.on('console', m => m.type() === 'error' && errors.push('console: ' + m.text().slice(0, 200)));
  p.on('response', r => r.status() >= 400 && !r.url().includes('/api/') && errors.push(`http ${r.status()} ${r.url()}`));
  const rawPrice = async () => (await p.locator('.total-price strong').getAttribute('data-value'))
  const price = async () => { let prev = await rawPrice(); for (let i = 0; i < 20; i++) { await p.waitForTimeout(250); const cur = await rawPrice(); if (cur === prev) return cur; prev = cur } return prev }
  const priceNum = async () => Number((await price()).replace(/\D/g, ''))
  const step = async (label) => { await p.locator('.control-tabs button', { hasText: label }).click(); await p.waitForTimeout(400) }
  await p.goto(BASE + '/studio/pergola'); await p.waitForSelector('.scene-canvas-wrap[data-scene-ready="true"]', { timeout: 90000 }); await p.waitForTimeout(3000);
  const p0 = await priceNum(); log('start price', p0);

  // Lépések
  for (const label of ['Méret', 'Rögzítés', 'Szín', 'Oldalak', 'Extrák', 'Összegzés']) { await step(label); const h = await p.locator('.step-heading h2').innerText().catch(() => ''); if (!h && label !== 'Összegzés') bad(`lépés ${label}: nincs fejléc`) }
  await step('Méret');

  // Méret mezők: beírás, szélsőérték
  const widthInput = p.locator('.slider-field input[type=number]').first();
  if (await widthInput.count()) {
    await widthInput.fill('700'); await widthInput.press('Enter'); await p.waitForTimeout(500);
    const dims = await p.locator('.price-product strong').innerText(); if (!dims.includes('7,00')) bad(`szélesség 700 cm beírás után: ${dims}`);
    await widthInput.fill('900'); await widthInput.press('Enter'); await p.waitForTimeout(500);
    const dims2 = await p.locator('.price-product strong').innerText(); if (!dims2.includes('7,00')) bad(`900 cm (határ fölött) után: ${dims2}`);
    await widthInput.fill('100'); await widthInput.press('Enter'); await p.waitForTimeout(500);
    const dims3 = await p.locator('.price-product strong').innerText(); if (!dims3.includes('2,50')) bad(`100 cm (határ alatt) után: ${dims3}`);
    await widthInput.fill(''); await widthInput.press('Tab'); await p.waitForTimeout(400);
    const dims4 = await p.locator('.price-product strong').innerText(); log('üres szélesség után:', dims4);
    await widthInput.fill('500'); await widthInput.press('Enter'); await p.waitForTimeout(500);
  } else bad('nincs szám-mező a méretnél');
  const fieldInfo = await p.evaluate(() => [...document.querySelectorAll('.slider-field input')].map(i => `${i.type}:${i.value}`)); log('mezők', fieldInfo.join(' '));

  // Rögzítés + tető
  await step('Rögzítés');
  for (const m of await p.locator('.mount-options button').allInnerTexts()) {
    await p.locator('.mount-options button', { hasText: m.split('\n')[0] }).first().click(); await p.waitForTimeout(700);
    log('mount', m.split('\n')[0], await price());
  }
  await p.locator('.mount-options button').first().click(); await p.waitForTimeout(500);
  // A tetőválasztó az Oldalak lépésben, a diagram közepén van.
  await step('Oldalak'); await p.locator('button.diagram-core').click(); await p.waitForTimeout(400)
  const roofs = p.locator('.roof-card'); const rc = await roofs.count();
  for (let i = 0; i < rc; i++) { await roofs.nth(i).click(); await p.waitForTimeout(600); log('roof', i, await price()) }
  await roofs.first().click();
  await step('Rögzítés');
  for (const preset of await p.locator('.preset-list button').allInnerTexts()) { await p.locator('.preset-list button', { hasText: preset.split('\n')[0] }).click(); await p.waitForTimeout(800); log('preset', preset.split('\n')[0], await price(), await p.locator('.price-product strong').innerText()) }

  // Szín
  await step('Szín');
  const sw = p.locator('.material-swatches button'); const sc = await sw.count();
  for (let i = 0; i < sc; i++) { await sw.nth(i).click(); await p.waitForTimeout(400) }
  log('custom color price', await price());
  const ral = p.locator('.text-field input'); if (await ral.count()) { await ral.fill('RAL 3004'); await p.waitForTimeout(400); await ral.fill('xyz<script>'); await p.waitForTimeout(300) } else bad('egyedi RAL mező nincs');
  await sw.first().click();

  // Oldalak
  await step('Oldalak');
  const sideBtns = await p.locator('.side-diagram button, .side-diagram [role=button]').count(); log('side diagram gombok', sideBtns);
  const opts = p.locator('.side-options button'); const oc = await opts.count();
  for (let i = 0; i < oc; i++) { const dis = await opts.nth(i).isDisabled(); if (!dis) { await opts.nth(i).click(); await p.waitForTimeout(500) } }
  log('side last price', await price());

  // Extrák
  await step('Extrák');
  const toggles = p.locator('.extra-grid button, .extra-grid [role=switch], .extra-grid input[type=checkbox]'); const tc = await toggles.count(); log('extra kapcsolók', tc);
  for (let i = 0; i < tc; i++) { await toggles.nth(i).click(); await p.waitForTimeout(300) }
  const plus = p.locator('.stepper button').last(); for (let i = 0; i < 8; i++) { if (await plus.isDisabled()) break; await plus.click(); await p.waitForTimeout(150) }
  const heatVal = await p.locator('.stepper').innerText(); log('fűtés max után:', heatVal.replace(/\n/g, ' '));
  const minus = p.locator('.stepper button').first(); for (let i = 0; i < 8; i++) { if (await minus.isDisabled()) break; await minus.click(); await p.waitForTimeout(150) }

  // Visszavonás / újra
  const before = await price();
  await p.locator('.history-actions button').first().click(); await p.waitForTimeout(400);
  const undone = await price();
  await p.locator('.history-actions button').nth(1).click(); await p.waitForTimeout(400);
  const redone = await price(); if (redone !== before) bad(`újra (redo) után más ár: ${before} → ${undone} → ${redone}`);

  // Tételes kalkuláció összege
  const sums = await p.evaluate(() => {
    const lines = [...document.querySelectorAll('.price-lines > *')].map(e => e.textContent);
    return lines
  });
  log('tételek', sums.length);

  // Összegzés + PDF
  await step('Összegzés');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }).catch(() => null), p.locator('.price-actions .primary-action').click()]);
  if (!dl) bad('PDF letöltés nem indult'); else { const path = await dl.path(); const size = require('fs').statSync(path).size; log('PDF', dl.suggestedFilename(), size); if (size < 20000) bad('PDF túl kicsi: ' + size) }

  // Megosztás
  await p.locator('.price-actions .secondary-action').click(); await p.waitForTimeout(800);
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  log('share link', clip.slice(0, 120));
  if (!clip.includes('#c=') && !clip.includes('#k=')) bad('megosztó link hiányzik a vágólapról: ' + clip);
  else {
    const p2 = await ctx.newPage(); await p2.goto(clip.replace(/^https?:\/\/[^/]+/, BASE)); await p2.waitForTimeout(6000);
    const shared = await p2.locator('.total-price strong').getAttribute('data-value'); if (shared !== await price()) bad(`megosztott link ára eltér: ${shared} vs ${await price()}`); await p2.close();
  }

  // Dialógusok
  await p.locator('.header-actions button', { hasText: 'Tudnivalók' }).click(); await p.waitForTimeout(500);
  if (!(await p.locator('.modal-dialog').count())) bad('Tudnivalók nem nyílt meg'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  if (await p.locator('.modal-dialog').count()) bad('Esc nem zárta be a dialógust');
  await p.locator('.header-actions button', { hasText: 'Alaphelyzet' }).click(); await p.waitForTimeout(400);
  await p.locator('.modal-dialog button', { hasText: /visszaáll|Alaphelyzet/i }).last().click(); await p.waitForTimeout(800);
  if (await priceNum() !== p0) bad(`alaphelyzet után nem az induló ár: ${await priceNum()} vs ${p0}`);

  // Bemutató mód
  await p.locator('.presentation-toggle').click(); await p.waitForTimeout(800);
  const pres = await p.evaluate(() => !!document.querySelector('.presentation-mode')); if (!pres) bad('bemutató mód nem kapcsolt be');
  await p.locator('.presentation-toggle').click(); await p.waitForTimeout(500);

  // Kamera nézetek
  for (const v of ['Kívülről', 'Alulról', 'Felülről', 'Részlet', 'Kanapé', 'Kívülről']) { await p.locator('.camera-toolbar button', { hasText: v }).click(); await p.waitForTimeout(1200) }

  log('\nHIBÁK (konzol/hálózat):'); [...new Set(errors)].forEach(e => bad(e));
  log('\nÖSSZES PROBLÉMA:', issues.length); issues.forEach(i => log(' -', i));
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1) });
