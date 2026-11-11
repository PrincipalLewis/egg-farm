// QA PT1-10 check (final rule): Manage all during 30 s cooldown / after. Usage: ENGINE=chromium|webkit node pt1-10-check.mjs <worktree with dist-qa>
import { createRequire } from 'node:module'; import path from 'node:path'; import { spawn } from 'node:child_process';
const ROOT = process.argv[2], ENGINE = process.env.ENGINE ?? 'chromium';
const pw = createRequire(path.join(ROOT, 'package.json'))('playwright-core');
const port = 4300 + Math.floor(Math.random() * 50);
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
await new Promise(r => setTimeout(r, 2500));
const b = ENGINE === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const R = []; const ok = (n, p, i) => R.push(`${p ? 'PASS' : 'FAIL'} [${ENGINE}] ${n}${i ? ' — ' + JSON.stringify(i) : ''}`);
for (const [w, h] of [[390, 844], [1280, 800]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
  await p.addInitScript(() => { if (!sessionStorage.s) { localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true })); sessionStorage.s = 1; } });
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(300);
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 10, coinsCents: 1e9, manageCdS: 0, workers: { market_hand: { energy: 30, cdS: 1 }, coop_hand: { energy: 35, cdS: 1 }, hawker: { energy: 90, cdS: 0 } } }; });
  await p.locator('[data-nav=upgrades]').click().catch(() => {}); await p.locator('[data-tab=workers]').click().catch(() => {}); await p.waitForTimeout(400);
  const probe = () => p.evaluate(() => {
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const bgOf = e => { for (let x = e; x; x = x.parentElement) { const c = getComputedStyle(x).backgroundColor; if (!/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return 'rgb(255,255,255)'; };
    return [...document.querySelectorAll('[data-act=manageAll]')].map(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); const L1 = lum(cs.color), L2 = lum(bgOf(e));
      const ring = e.querySelector('.ring-cooldown'); return { cls: e.className.replace(/btn |manage /g, ''), vis: !e.hidden && r.width > 0 && cs.visibility !== 'hidden' && cs.display !== 'none', dis: e.getAttribute('aria-disabled'), cr: +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2), ring: !!ring && getComputedStyle(ring).display !== 'none' && ring.getBoundingClientRect().width > 0, txt: e.innerText.trim() }; }); });
  const pre = await probe();
  await p.locator('.manage-all').first().click(); await p.waitForTimeout(600);
  const cd = await probe(); const vis = cd.filter(x => x.vis);
  ok(`during cooldown both Manage all visible (${w})`, vis.length >= 2, cd);
  ok(`during cooldown greyed aria-disabled=true, contrast >=4.5, ring (${w})`, vis.length >= 2 && vis.every(x => x.dis === 'true' && x.cr >= 4.5 && x.ring), vis.map(x => [x.cls, x.dis, x.cr, x.ring, x.txt]));
  // jump past cooldown: everyone > 0.4 -> hidden
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, manageCdS: 0 }; }); await p.waitForTimeout(600);
  const after = await p.evaluate(() => window.eggfarm.state.workers);
  const a1 = await probe(); ok(`after cooldown, no worker <=0.4 -> hidden (${w})`, a1.every(x => !x.vis), { energies: Object.values(after).map(x => Math.round(x.energy)), a1 });
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, manageCdS: 0, workers: { ...g.state.workers, hawker: { energy: 40, cdS: 0 } } }; }); await p.waitForTimeout(600);
  const a2 = (await probe()).filter(x => x.vis); ok(`after cooldown, one worker at 0.4 -> visible + active (${w})`, a2.length >= 2 && a2.every(x => x.dis === 'false'), a2.map(x => [x.cls, x.dis, x.txt]));
  if (w === 390) ok('pre-click (2 at <=40%) visible+active', pre.filter(x => x.vis).every(x => x.dis === 'false') && pre.some(x => x.vis), pre.map(x => [x.cls, x.vis, x.dis]));
  await ctx.close();
}
console.log(R.join('\n')); console.log(`${R.filter(x => x.startsWith('PASS')).length}/${R.length} passed`);
await b.close(); process.kill(-srv.pid); process.exit(R.some(x => x.startsWith('FAIL')) ? 1 : 0);
