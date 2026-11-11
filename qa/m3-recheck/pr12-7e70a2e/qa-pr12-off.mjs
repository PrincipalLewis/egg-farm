// flag-off look vs main. usage: node qa-pr12-off.mjs <engine> <portOff> <portMain> <sha7> <mainsha7> <outdir>
import pw from 'playwright-core'; import fs from 'fs';
const [E, PO, PMAIN, S7, M7, OUT] = process.argv.slice(2); const res = [];
const rec = (n, p, i) => { res.push({ e: E, n, p, i }); console.log(`${p === true ? 'PASS' : p === false ? 'FAIL' : 'NOTE'} ${E} ${n} ${JSON.stringify(i)}`); };
const b = await pw[E].launch(E === 'chromium' ? { executablePath: '/usr/bin/google-chrome' } : {});
for (const [w, h] of [[360, 800], [1280, 720]]) {
  const snap = {};
  for (const [tag, port, want] of [['off', PO, S7], ['main', PMAIN, M7]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const pg = await ctx.newPage();
    await pg.addInitScript(() => { if (!sessionStorage.q) { localStorage.clear(); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true })); sessionStorage.q = 1; } });
    await pg.goto(`http://127.0.0.1:${port}/`); await pg.getByText('Tap to start').click(); await pg.waitForFunction(() => window.eggfarm);
    const id = await pg.evaluate(async () => { const t = await Promise.all([...document.scripts].filter(s => s.src).map(s => fetch(s.src).then(r => r.text()))); return (t.join().match(/m3-rc1-pre\+[0-9a-f]+(\+dirty)?/) || [null])[0]; });
    rec(`${w} ${tag} build ID`, id === `m3-rc1-pre+${want}`, id);
    await pg.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 25, coinsCents: 5e7 }; });
    const nv = pg.locator('nav [data-nav=upgrades]'); if (await nv.isVisible()) await nv.click({ force: true });
    await pg.locator('.tabs [data-tab=farm]').click({ force: true }); await pg.waitForTimeout(1500);
    snap[tag] = await pg.evaluate(() => { const r = e => { const b = e?.getBoundingClientRect(); return b && [b.x, b.y, b.width, b.height].map(v => Math.round(v * 10) / 10); };
      return { nudge: [...document.querySelectorAll('[data-testid=hire-nudge-line]')].filter(e => e.getBoundingClientRect().height > 0).length, dots: [...document.querySelectorAll('[data-testid=new-dot],.new-dot')].filter(e => e.getBoundingClientRect().width > 0).length, pulse: document.querySelectorAll('.pulse').length,
        tabs: [...document.querySelectorAll('.tabs [role=tab]')].map(r), pills: [...document.querySelectorAll('.tabs .tab-pill')].map(r), nav: [...document.querySelectorAll('nav button')].map(r), farmBuy: r(document.querySelector('button.btn.buy[data-kind="farm"]')) }; });
    await pg.screenshot({ path: `${OUT}/${E}-${w}-flagoff-${tag}.png` }); await ctx.close();
  }
  rec(`${w} flag-off: no nudge, no dot, no pulse`, snap.off.nudge === 0 && snap.off.dots === 0 && snap.off.pulse === 0, { nudge: snap.off.nudge, dots: snap.off.dots, pulse: snap.off.pulse });
  const same = k => JSON.stringify(snap.off[k]) === JSON.stringify(snap.main[k]);
  rec(`${w} flag-off tab/pill/nav/Farm-Buy geometry identical to main`, ['tabs', 'pills', 'nav', 'farmBuy'].every(same), { diff: ['tabs', 'pills', 'nav', 'farmBuy'].filter(k => !same(k)).map(k => ({ k, off: snap.off[k], main: snap.main[k] })) });
}
await b.close(); fs.writeFileSync(`${OUT}/${E}-off-results.json`, JSON.stringify(res, null, 1));
console.log(`SUMMARY-OFF ${E} ${res.filter(r => r.p === true).length} pass ${res.filter(r => r.p === false).length} fail`);
