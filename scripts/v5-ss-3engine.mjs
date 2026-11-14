// #5b/#11 3-engine shots + SS-17 copy-fit (sales-stopped cfff3817 SS-17; FC-SV v1.3.19 sizes) on the QA build, with an
// Art screenshot manifest (art-ux/screenshot-manifest-template.md; org-plan rule 5). Flag-on = TEST-ONLY patch of m4.flags in
// the served bundle (src/config/balance.json untouched, shipped flags stay 0). Sim views are planted on the live stallSession via the QA hook (window.eggfarmQaStall); atRisk is a QA-only overlay for worst-case copy.
// Usage: npx vite build --mode qa --outDir dist-qa && OUT=<dir> PR=<n> [FC=1] [ENGINES=chromium,firefox,webkit] node scripts/v5-ss-3engine.mjs
import pw from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path'; import { execSync } from 'node:child_process';
import { serveForRun } from './serve-own.mjs';
const OUT = process.env.OUT ?? 'artifacts/v5-ss-3engine/'; const FC = process.env.FC === '1';
const ENGINES = (process.env.ENGINES ?? 'chromium,firefox,webkit').split(',');
const SHA = execSync('git rev-parse HEAD').toString().trim(), BRANCH = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
const pushed = (() => { try { return execSync(`git branch -r --contains ${SHA}`).toString().includes(`origin/${BRANCH}`); } catch { return false; } })();
const srv = await serveForRun(process.env.DIST ?? 'dist-qa', 'v5-ss-3engine');
const UI = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false, reducedMotion: true });
const W = e => ({ energy: e, cdS: 0 });
const WORST = { market_hand: 666600, coop_hand: 333300 }; // Σ = $999.9K/s
const CUE = { share: 0.5, shown: true, episodeId: 'e1', suppressedByStall: false };
const stall = (cause, id = 1) => ({ shown: true, trigger: cause.startsWith('ch') ? 'collect' : 'sell', cause, stallId: id, noSaleS: 9, noCollectS: 0 });
const shots = [], fit = [], errors = []; let bad = 0, labelOk = true;
fs.mkdirSync(OUT, { recursive: true });
async function page(br, vp, flags) {
  const ctx = await br.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: 'reduce', ...(br._eng !== 'firefox' && vp.width < 600 ? { isMobile: true, hasTouch: true } : {}) });
  await ctx.addInitScript(u => localStorage.setItem('eggfarm.ui', u), UI);
  await ctx.route(/\/assets\/index-[^/]+\.js$/, async r => { const res = await r.fetch(); let t = await res.text();
    for (const f of flags) t = t.replace(`${f}:0`, `${f}:1`); await r.fulfill({ response: res, body: t }); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(`${br._eng} ${vp.width}x${vp.height}: ${e.message}`));
  await p.goto(srv.url); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm && window.eggfarmUi && window.eggfarmQaStall);
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) { await wb.click(); await p.waitForTimeout(200); }
  const bid = await p.evaluate(() => document.querySelector('meta[name="build-id"]')?.content ?? '');
  if (!bid.includes(SHA.slice(0, 7)) || bid.includes('dirty')) { labelOk = false; errors.push(`build label ${bid} != ${SHA.slice(0, 7)}`); }
  return { ctx, p };
}
const set = (p, workers, st, cue, atRisk, extra = {}) => p.evaluate(([workers, st, cue, atRisk, extra]) => {
  const g = window.eggfarm; g.state = { ...g.state, farmLevel: 6, collectionLevel: 3, hensLevel: 6, tracksV7: 1, coinsCents: 512300, basket: 3, coop: 2, manageCdS: 0, workers, ...extra };
  const s = window.eggfarmQaStall; s.atRisk = atRisk; s.stall = st; s.cue = cue; window.eggfarmUi.render(); window.eggfarmUi.render();
}, [workers, st, cue, atRisk, extra]).then(() => p.waitForTimeout(350));
async function snap(p, eng, vp, name, state, docked = false) {
  const file = `${eng === 'chromium' ? '' : eng + '/'}${name}-${vp.width}x${vp.height}.png`; fs.mkdirSync(path.dirname(path.join(OUT, file)), { recursive: true });
  await p.screenshot({ path: path.join(OUT, file) });
  shots.push({ file, engine: eng, size: `${vp.width}x${vp.height}`, docked, save: 'fresh + in-page state (eggfarm.state, stub views)', seed: null, state });
}
const CASES = [ // SS-17: 7 causes + 2 cooldown labels at rc2Refill = 0, plus the rc2Refill = 1 Manage rows
  ...['mh_asleep', 'mh_paused', 'mh_unpaid', 'no_mh', 'ch_asleep', 'ch_unpaid', 'other'].map(c => ({ c, cd: false, rc2: false })),
  { c: 'mh_asleep', cd: true, rc2: false }, { c: 'ch_asleep', cd: true, rc2: false }, { c: 'mh_asleep', cd: false, rc2: true }, { c: 'ch_asleep', cd: false, rc2: true }];
const SIZES = [{ width: 360, height: 780 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 1280, height: 800 }];
for (const eng of ENGINES) {
  const br = eng === 'chromium' ? await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[eng].launch();
  br._eng = eng;
  const base = ['salesStopped', ...(FC ? ['fatigueCue'] : [])];
  // SS-17 copy fit at 360 (320 px slot), both rc2Refill values
  for (const rc2 of [false, true]) {
    const { ctx, p } = await page(br, SIZES[0], rc2 ? [...base, 'rc2Refill'] : base);
    for (const k of CASES.filter(x => x.rc2 === rc2)) {
      await set(p, { market_hand: W(0), coop_hand: W(0) }, stall(k.c), null, WORST, { manageCdS: k.cd ? 12 : 0 });
      const m = await p.evaluate(() => { const c = document.getElementById('stallChip'), pill = c.querySelector('.ss-pill'), t = c.querySelector('.ss-txt'), cs = getComputedStyle(pill);
        return { text: t.textContent, shown: !c.hidden, textW: t.scrollWidth, textBox: t.clientWidth, needW: pill.scrollWidth, slotW: pill.clientWidth + 0, lines: t.getClientRects().length,
          font: `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily.split(',')[0]}`, padL: cs.paddingLeft, padR: cs.paddingRight, ws: cs.whiteSpace }; });
      const ok = m.shown && m.textW <= m.textBox && m.needW <= m.slotW && m.lines === 1 && /^700 14px/.test(m.font) && /Fredoka/i.test(m.font) && m.padL === '12px' && m.padR === '12px';
      if (!ok) bad++; fit.push({ engine: eng, size: '360x780', rc2Refill: rc2 ? 1 : 0, cause: k.c, cooldown: k.cd, ...m, fits: ok });
      console.log(`${ok ? 'PASS' : 'FAIL'} SS-17 ${eng} rc2=${rc2 ? 1 : 0} ${k.c}${k.cd ? ' (cooldown)' : ''}: "${m.text}" text ${m.textW}px, pill needs ${m.needW}/${m.slotW}px, ${m.font}`);
    }
    await ctx.close();
  }
  // Shots: worst-case strings at every size
  for (const vp of SIZES) {
    const docked = vp.width >= 960;
    { const { ctx, p } = await page(br, vp, base);
      await set(p, { market_hand: W(0), coop_hand: W(100) }, stall('mh_paused'), null, WORST); await snap(p, eng, vp, '5b-chip-onbreak-sellall', 'stall chip, worst rc2Refill=0: Market Hand on break · Sell all', docked);
      await set(p, { market_hand: W(100), coop_hand: W(0) }, null, null, { coop_hand: 333300 }); await snap(p, eng, vp, '5b-farm-banner', 'Rule 3 banner: Coop Hand asleep (out of flow)', docked);
      await set(p, { market_hand: W(30), coop_hand: W(25) }, null, CUE, WORST); await snap(p, eng, vp, FC ? '11-subline-bubble' : '5b-bubble-refill', `Rule 4 bubble Refill workers · +$999.9K/s${FC ? ' + Rule 2 sub-line/chip' : ''}`, docked);
      await ctx.close(); }
    { const { ctx, p } = await page(br, vp, [...base, 'rc2Refill']);
      await set(p, { market_hand: W(0), coop_hand: W(100) }, stall('mh_asleep'), null, WORST); await snap(p, eng, vp, '5b-chip-asleep-manage', 'stall chip, worst rc2Refill=1: Market Hand asleep · Manage', docked);
      await set(p, { market_hand: W(30), coop_hand: W(25) }, null, CUE, WORST); await snap(p, eng, vp, '5b-bubble-manage', 'Rule 4 bubble rc2Refill=1: Manage workers · +$999.9K/s', docked);
      await ctx.close(); }
  }
  if (FC) for (const vp of [{ width: 360, height: 640 }, { width: 375, height: 667 }, { width: 360, height: 740 }]) {
    const { ctx, p } = await page(br, vp, base);
    await set(p, { market_hand: W(30), coop_hand: W(25) }, null, CUE, WORST);
    if (vp.height < 740) { await snap(p, eng, vp, '11-chip-closed', 'Rule 2 icon chip, popover closed (Tired −$999.9K/s)');
      await p.locator('.fchip').click(); await p.waitForTimeout(250); await snap(p, eng, vp, '11-chip-open', 'Rule 2 icon chip, popover open');
    } else await snap(p, eng, vp, '11-subline-boundary', 'Rule 2 sub-line at the 740 boundary');
    await ctx.close();
  }
  { const vp = SIZES[0]; const { ctx, p } = await page(br, vp, base); await p.locator('#settings').click(); await p.waitForTimeout(400);
    await snap(p, eng, vp, 'build-label-settings', `Settings: build label Egg Farm ${SHA.slice(0, 7)}`); await ctx.close(); }
  await br.close();
}
srv.stop?.();
const man = { pr: Number(process.env.PR ?? 0) || null, branch: BRANCH, sha: SHA, pushed, build_label_checked: labelOk, rev: Number(process.env.REV ?? 1),
  author: 'Senior Engineer, UI (lane U backfill)', created: new Date().toISOString(), shots };
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(man, null, 2)); fs.writeFileSync(path.join(OUT, 'ss17-copyfit.json'), JSON.stringify(fit, null, 2));
if (errors.length) { console.error('errors:\n' + errors.join('\n')); bad++; }
console.log(`${shots.length} shots; SS-17 ${fit.filter(f => f.fits).length}/${fit.length} fit; pushed=${pushed} label=${labelOk}`);
console.log(bad ? `FAIL ${bad}` : 'ALL PASS'); process.exit(bad ? 1 : 0);
