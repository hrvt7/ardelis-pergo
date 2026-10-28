const { chromium } = require('playwright');
const enc = (c) => Buffer.from(JSON.stringify(c)).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const port = process.argv[2] || '3000';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const bad = []; const errors = [];
  for (const mount of (process.argv[3] || 'wall,corner-left,corner-right,niche,freestanding').split(',')) {
    const cfg = { width: 5, depth: 4, height: 2.6, mount, roof: 'louvered', frameColor: 'anthracite', sides: { front: 'glass', back: 'louver', left: 'zip', right: 'none' }, louverAngle: 35, screenOpen: 65, led: true, heaters: 2, speakers: true, sensors: true };
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    p.on('pageerror', e => errors.push(`${mount}: ${e.message.slice(0,150)}`)); p.on('console', m => m.type()==='error' && !/synchronously unmount/.test(m.text()) && errors.push(`${mount}: ${m.text().slice(0,150)}`));
    await p.goto(`http://127.0.0.1:${port}/studio/pergola#k=${enc(cfg)}`, { waitUntil: 'load' }); await p.waitForTimeout(16000);
    const row = [];
    for (const time of ['Éjszaka', 'Nappal']) {
      if (time === 'Éjszaka') { await p.locator('.weather-toolbar button', { hasText: 'Éjszaka' }).click(); await p.waitForTimeout(5000) }
      else { await p.locator('.weather-toolbar button', { hasText: 'Nappal' }).click(); await p.waitForTimeout(5000) }
      for (const view of ['Kívülről', 'Alulról', 'Felülről', 'Részlet', 'Kanapé']) {
        await p.locator('.camera-toolbar button', { hasText: view }).click(); await p.waitForTimeout(3500);
        const mean = await p.evaluate(() => { const c = document.querySelector('canvas[data-pergola-canvas]'); const t = document.createElement('canvas'); t.width = 48; t.height = 30; const x = t.getContext('2d'); x.drawImage(c, 0, 0, 48, 30); const d = x.getImageData(0,0,48,30).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i+1] + d[i+2]; return Math.round(s / (d.length / 4) / 3) });
        row.push(`${time[0]}/${view}:${mean}`); if (process.argv[4] && view === process.argv[4]) await p.screenshot({ path: `shots/sweep-${mount}-${time}-${view}.png`, timeout: 120000 });
        if (mean < (time === 'Éjszaka' ? 8 : 30)) bad.push(`${mount} ${time} ${view} = ${mean}`);
      }
    }
    console.log(mount.padEnd(13), row.join(' '));
    await p.close();
  }
  console.log('BAD:', bad.length ? bad : 'none'); console.log('ERRORS:', [...new Set(errors)].join('\n') || 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1) });
