// #5b/#11 flag-on screenshots (worst-case strings: Tired −$999.9K/s) on the QA build. TEST-ONLY flag patch of the served bundle
// (src/config/balance.json is never edited; shipped flags stay 0). Sim views come from the local stub via window.eggfarmQaStall.
// Usage: npx vite build --mode qa --outDir dist-qa && OUT=<dir> node scripts/v5-ss-shots.mjs
import pw from 'playwright-core'; import fs from 'node:fs'; import { serveForRun } from './serve-own.mjs';
const OUT = process.env.OUT ?? 'artifacts/v5-ss-shots/'; fs.mkdirSync(OUT, { recursive: true });
const srv = await serveForRun(process.env.DIST ?? 'dist-qa', 'v5-ss-shots');
const br = await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const UI = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false, reducedMotion: true });
const errors = [];
const W = e => ({ energy: e, cdS: 0 });
async function shot(name, vp, set, after) {
  const ctx = await br.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: 'reduce', isMobile: vp.width < 600, hasTouch: vp.width < 600 });
  await ctx.addInitScript(u => localStorage.setItem('eggfarm.ui', u), UI);
  await ctx.route(/\/assets\/index-[^/]+\.js$/, async r => { const res = await r.fetch(); const t = (await res.text()).replace('salesStopped:0', 'salesStopped:1').replace('fatigueCue:0', 'fatigueCue:1'); await r.fulfill({ response: res, body: t }); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(`${name}: ${e.message}`));
  await p.goto(srv.url); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm && window.eggfarmUi && window.eggfarmQaStall);
  await p.waitForTimeout(300); const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) { await wb.click(); await p.waitForTimeout(200); }
  await p.evaluate(set); await p.waitForTimeout(400);
  if (after) await after(p);
  await p.screenshot({ path: `${OUT}${name}.png` }); console.log('saved', name); await ctx.close();
}
const mk = (workers, stall, cue, atRisk) => new Function(`const g = window.eggfarm; g.state = { ...g.state, farmLevel: 6, collectionLevel: 3, hensLevel: 6, tracksV7: 1, coinsCents: 512300, basket: 3, coop: 2,
  workers: ${JSON.stringify(workers)} }; const s = window.eggfarmQaStall; s.atRisk = ${JSON.stringify(atRisk)}; s.stall = ${JSON.stringify(stall)}; s.cue = ${JSON.stringify(cue)};
  window.eggfarmUi.render(); window.eggfarmUi.render();`);
const WORST = { market_hand: 666600, coop_hand: 333300 }; // Σ = $999.9K/s
const CUE = { share: 0.5, shown: true, episodeId: 'e1', suppressedByStall: false };
const STALL = { shown: true, trigger: 'sell', cause: 'mh_asleep', stallId: 1, noSaleS: 9, noCollectS: 0 };
const tired = { market_hand: W(30), coop_hand: W(25) };
for (const vp of [{ width: 360, height: 780 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  const tag = `${vp.width}x${vp.height}`;
  await shot(`5b-stall-chip-${tag}`, vp, mk({ market_hand: W(0), coop_hand: W(100) }, STALL, null, WORST));
  await shot(`5b-farm-banner-${tag}`, vp, mk({ market_hand: W(100), coop_hand: W(0) }, null, null, { coop_hand: 333300 }));
  await shot(`11-subline-${tag}`, vp, mk(tired, null, CUE, WORST));
}
for (const vp of [{ width: 360, height: 640 }, { width: 390, height: 700 }]) {
  const tag = `${vp.width}x${vp.height}`;
  await shot(`11-chip-${tag}`, vp, mk(tired, null, CUE, WORST));
  await shot(`11-chip-popover-${tag}`, vp, mk(tired, null, CUE, WORST), async p => { await p.locator('.fchip').click(); await p.waitForTimeout(300); });
  await shot(`11-popover-over-banner-${tag}`, vp, mk({ market_hand: W(30), coop_hand: W(0) }, null, CUE, WORST), async p => { await p.locator('.fchip').click(); await p.waitForTimeout(300); });
}
await br.close(); srv.stop?.();
if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exit(1); }
