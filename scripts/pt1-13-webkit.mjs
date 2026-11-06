// PT1-13: WebKit narrow phones: farm column, Collect bar and next-goal chip right edges <= viewport width (no clipped UI).
// Usage: [SHOTS=dir] node scripts/pt1-13-webkit.mjs [gameDir=.]  (expects <gameDir>/dist-qa). Exit 1 on overflow.
import { webkit, devices } from 'playwright-core';
import { spawnRecorded, stopOrReport } from './recorded-pid.mjs';
import { mkdirSync } from 'node:fs';
const dir = process.argv[2] || '.'; const port = 4600 + Math.floor(Math.random() * 300);
const { child: srv, rec: srvRec } = spawnRecorded('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', cwd: dir });
await new Promise(r => setTimeout(r, 2500));
const br = await webkit.launch(); let bad = 0; const shots = process.env.SHOTS; if (shots) mkdirSync(shots, { recursive: true });
const ph = (w, h) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: devices['iPhone SE (3rd gen)'].userAgent });
const profiles = { '320': ph(320, 568), '360': ph(360, 640), '375': ph(375, 667), '390': ph(390, 844), 'iphone-se': devices['iPhone SE (3rd gen)'] };
for (const [name, prof] of Object.entries(profiles)) for (const F of [0, 25]) {
  const ctx = await br.newContext(prof); const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true })));
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm);
  await p.evaluate(F => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: F, collectionLevel: F, coop: F ? 9.99e12 : 3, basket: F ? 9.99e12 : 0, coinsCents: F ? 9.99e14 : 0, nextCustomerInS: 1e9,
    customers: Array.from({ length: F ? 10 : 2 }, (_, i) => ({ id: i + 1, demand: F ? 99999 : 8, filled: 0, waitedS: 0 })) }; }, F);
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const R = s => { const e = document.querySelector(s); return e && !e.hidden && e.getBoundingClientRect().width ? Math.round(e.getBoundingClientRect().right) : null; };
    return { vw: innerWidth, farm: R('.farm'), collectbar: R('.collectbar'), goal: R('#goal'), app: R('#app'), sw: document.documentElement.scrollWidth }; });
  const ok = ['farm', 'collectbar', 'goal'].every(k => r[k] !== null && r[k] <= r.vw);
  if (shots && ['360', '375', '390'].includes(name)) await p.screenshot({ path: `${shots}/pt1-13-webkit-${name}-F${F}.png` });
  if (!ok) bad++; console.log(name, 'F' + F, JSON.stringify(r), ok ? 'ok' : 'OVERFLOW');
  await ctx.close();
}
await br.close(); const stopped = stopOrReport(srv, srvRec, 'pt1-13-webkit'); process.exit(bad ? 1 : stopped ? 0 : 3);
