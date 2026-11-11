// Hire 3 streak / tapCoins visual + rect check v2 (2026-11-10). Run from a THROWAWAY trial worktree: origin/feat/v5-f6-rebuild (v1.0)
// + v5/ui-streak-tapcoins + f6-swap.diff, balance m4.flags streak=1 tapCoins=1 in the trial tree only, then
// `npx vite build --mode qa --outDir dist-qa`. ENGINE=chromium|firefox|webkit SHOTS=dir [RM=1 adds the reduced-motion pass].
// Checks vs product spec v1.3.3 §9.1 (±1 px) and art-ux/m5-combo-tiers.md v0.3 (§1 tiers, §2 pill, §3 cooling, §4 no cover, §6 a11y).
import pw from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path'; import { serveForRun } from './scripts/serve-own.mjs';
const ENGINE = process.env.ENGINE ?? 'chromium', SHOTS = process.env.SHOTS ?? 'artifacts/streak-browser'; fs.mkdirSync(SHOTS, { recursive: true });
const SPEC = { '360x640': { collect: [8, 328, 504, 552], band: [552, 576], bar: [8, 240, 560, 572], label: [248, 328] },
  '390x844': { collect: [8, 358, 708, 756], band: [756, 780], bar: [8, 270, 764, 776], label: [278, 358] },
  '1280x800': { collect: [160, 720, 724, 772], band: [772, 796], bar: [160, 632, 780, 792], label: [640, 720] } };
const srv = await serveForRun('dist-qa', `streak-browser-${ENGINE}`);
const br = await (ENGINE === 'chromium' ? pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : pw[ENGINE].launch());
let bad = 0; const errors = [], rows = [];
const ok = (n, p, i = {}) => { if (!p) bad++; const l = `${p ? 'PASS' : 'FAIL'} [${ENGINE}] ${n} ${JSON.stringify(i)}`; rows.push(l); console.log(l); };
const near = (a, b) => Math.abs(a - b) <= 1;
const inter = (a, b) => a && b && a[0] < b[1] && b[0] < a[1] && a[2] < b[3] && b[2] < a[3];
const UI = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false, reducedMotion: false, seenSlots: 3 });
async function open(vp, rm) {
  const [w, h] = vp.split('x').map(Number), ctx = await br.newContext({ viewport: { width: w, height: h }, reducedMotion: rm ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(u => { if (!localStorage.getItem('eggfarm.ui')) localStorage.setItem('eggfarm.ui', u); }, UI);
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(`${vp}: ${e.message}`));
  await p.goto(srv.url); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm && window.eggfarmUi); await p.waitForTimeout(300);
  const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) { await wb.click(); await p.waitForTimeout(200); }
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 8, coinsCents: 500000, coop: 60 }; window.eggfarmUi.render(); });
  const R = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom].map(Math.round); }, sel);
  const set = st => p.evaluate(x => { const g = window.eggfarm; g.state = { ...g.state, ...x }; window.eggfarmUi.render(); }, st);
  const tap = async () => { await p.waitForTimeout(1050); await p.locator('#collect').click(); await p.waitForTimeout(150); };
  const txt = sel => p.evaluate(s => document.querySelector(s)?.textContent ?? null, sel);
  const shot = n => p.screenshot({ path: path.join(SHOTS, `${ENGINE}-${vp}${rm ? '-rm' : ''}-${n}.png`) });
  return { ctx, p, w, h, R, set, tap, txt, shot };
}
for (const vp of Object.keys(SPEC)) {
  const { ctx, p, w, R, set, tap, txt, shot } = await open(vp, false), sp = SPEC[vp];
  const hiddenRow = await R('#streak'); await shot('s0');
  const c = await R('#collect');
  ok(`${vp} Collect 48 px at spec rect (>= 44 px target)`, c && near(c[0], sp.collect[0]) && near(c[1], sp.collect[1]) && near(c[2], sp.collect[2]) && near(c[3], sp.collect[3]) && c[3] - c[2] >= 44, { c, want: sp.collect });
  ok(`${vp} row reserved at s=0 (band ${sp.band})`, hiddenRow && near(hiddenRow[2] - 4, sp.band[0]) && near(hiddenRow[3], sp.band[1]), { hiddenRow });
  // tier 1 by real taps (7 credited taps, 1.05 s apart)
  await p.locator('#collect').click(); for (let i = 1; i < 7; i++) await tap();
  await p.waitForTimeout(150); // pill still phase is 200-600 ms after the tap (combo-tiers §2); tap() already waited 150
  const bar = await R('#streak .streak-bar'), lab = await R('#streak .streak-label'), pill = await R('.streak-pill'), coin = await R('.coin-pop'), meter = await R('#meter'), goal = await R('#goal'), c2 = await R('#collect');
  const pillT = await txt('.streak-pill'), coinT = await txt('.coin-pop'); await shot('tier1');
  ok(`${vp} bar rect`, bar && near(bar[0], sp.bar[0]) && near(bar[1], sp.bar[1]) && near(bar[2], sp.bar[2]) && near(bar[3], sp.bar[3]), { bar, want: sp.bar });
  ok(`${vp} label column + copy`, lab && near(lab[0], sp.label[0]) && near(lab[1], sp.label[1]) && (await txt('.streak-label')) === '+7% price', { lab, want: sp.label, label: await txt('.streak-label') });
  ok(`${vp} tier-1 pill copy + 8 px above #meter, inside 8 px edges (§2)`, pillT === 'Warm streak! +7% price' && pill && meter && near(pill[3], meter[2] - 8) && pill[0] >= 8 && pill[1] <= w - 8, { pill, meter, pillT });
  ok(`${vp} pill clear of Collect/goal/meter (CT-AC8)`, !inter(pill, c2) && !inter(pill, goal) && !inter(pill, meter));
  ok(`${vp} coin pop (if paid) +$ text, no overlap with pill/goal/Collect (CT-AC8)`, !coin || (/^\+\$/.test(coinT ?? '') && !inter(coin, pill) && !inter(coin, goal) && !inter(coin, c2)), { coin, coinT });
  ok(`${vp} 1 tick lit at tier 1`, (await p.locator('#streak .streak-tick.lit').count()) === 1);
  // tier 2 (state jump to 0.13, then a real credited tap)
  await set({ streakS: 0.13, streakHoldS: 3 }); await tap(); await shot('tier2');
  ok(`${vp} tier-2 pill "Hot streak! +14% price", 2 ticks`, (await txt('.streak-pill')) === 'Hot streak! +14% price' && (await p.locator('#streak .streak-tick.lit').count()) === 2, { pill: await txt('.streak-pill') });
  // MAX
  await set({ streakS: 0.27, streakHoldS: 3 }); await tap(); await p.waitForTimeout(400); await shot('max');
  const ticks = await p.evaluate(() => [...document.querySelectorAll('#streak .streak-tick.lit')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
  ok(`${vp} MAX: 4 lit tabs, each 4x16 px (combo-tiers §0)`, ticks.length === 4 && ticks.every(([tw, th]) => near(tw, 4) && near(th, 16)), { ticks });
  const fillBg = await p.evaluate(() => { const gl = document.querySelector('#streak .streak-gold'); return gl ? `${getComputedStyle(gl).backgroundColor} op ${getComputedStyle(gl).opacity}` : 'none'; });
  ok(`${vp} MAX: label "MAX +28%", pill "MAX +28%!", 4 ticks, gold fill`, (await txt('.streak-label')) === 'MAX +28%' && (await txt('.streak-pill')) === 'MAX +28%!' && (await p.locator('#streak .streak-tick.lit').count()) === 4 && /232, 176, 32\).* op 1$/.test(fillBg), { label: await txt('.streak-label'), pill: await txt('.streak-pill'), fillBg });
  // cooling (hold spent)
  await set({ streakHoldS: 0 }); await p.waitForTimeout(600); await shot('cooling');
  const vt = await p.evaluate(() => document.querySelector('#streak')?.getAttribute('aria-valuetext'));
  ok(`${vp} cooling: aria ", cooling", label back to +N% price (§1 MAX row, §3)`, /cooling$/.test(vt ?? '') && /^\+\d+% price$/.test((await txt('.streak-label')) ?? ''), { vt, label: await txt('.streak-label') });
  // Market chips (S-AC19): a streak + customers, the Market open (docked at 1280)
  await set({ streakS: 0.14, streakHoldS: 3, basket: 40, nextCustomerInS: 0 }); await p.waitForTimeout(1500);
  if (w < 1000) await p.evaluate(() => window.eggfarmUi.openPanel('market')); await p.waitForTimeout(600);
  const chip = await R('.order .price-chip'), sellChip = await R('.sellall-chips .price-chip'), chipT = await txt('.order .price-chip'), sa = await R('#sellAll');
  await shot('market-chips');
  ok(`${vp} order-card + Sell all chip "+14%", 14 px tall, Sell all chip above the button`, chipT === '+14%' && chip && near(chip[3] - chip[2], 14) && sellChip && sa && sellChip[3] <= sa[2], { chip, chipT, sellChip, sa });
  await ctx.close();
}
if (process.env.RM) { // CT-AC14 reduced motion, one viewport
  const { ctx, p, set, tap, shot } = await open('390x844', true);
  await set({ streakS: 0.06, streakHoldS: 3 }); await p.locator('#collect').click(); await p.waitForTimeout(150); await shot('tier1');
  ok('390x844 reduced motion: no spark dots, pill .rm (CT-AC14)', (await p.locator('.streak-spark').count()) === 0 && (await p.locator('.streak-pill.rm').count()) === 1);
  await ctx.close();
}
await br.close(); srv.stop?.();
if (errors.length) { console.log('page errors:\n' + errors.join('\n')); bad++; }
fs.writeFileSync(path.join(SHOTS, `${ENGINE}-result.txt`), rows.join('\n') + (errors.length ? '\npage errors:\n' + errors.join('\n') : '') + `\n${bad ? `FAILED ${bad}` : 'ALL PASS'}\n`);
console.log(bad ? `FAILED ${bad}` : 'ALL PASS'); process.exit(bad ? 1 : 0);
