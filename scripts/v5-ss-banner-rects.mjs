// #5b/#11 Rule 3 banner placement gate (Art ruling, art-ux/decisions.md; fatigue-ux ffb13c19 §2/§8): Chromium on the QA build.
// Flag-on = TEST-ONLY patch of m4.flags in the served bundle (never written to src/config/balance.json; shipped flags stay 0).
// Asserts: queue / scene / #collect / collectbar / HUD / tab bar rects are byte-equal to flag off with the banner shown (0 px shift);
// banner x 8, width farm-16, top 8 under the HUD (or under .fslot when laid out), height 44-52; clear of the toast slot and the
// golden-spot hit boxes; with #11 on, no .fslot below 740 px high and the popover stacks above the banner.
// Usage: npx vite build --mode qa --outDir dist-qa && node scripts/v5-ss-banner-rects.mjs   (CHROME=/usr/bin/google-chrome)
import pw from 'playwright-core'; import { serveForRun } from './serve-own.mjs';
const srv = await serveForRun(process.env.DIST ?? 'dist-qa', 'v5-ss-banner-rects');
const br = await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (n, p, i) => { if (!p) bad++; console.log(`${p ? 'PASS' : 'FAIL'} ${n}${p ? '' : ' — ' + JSON.stringify(i)}`); };
const UI = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false, reducedMotion: true });
const SEL = ['#queue', '#scene', '#collect', '.collectbar', '.hud', 'nav', '#meter', '#goal'];
const FC = process.env.FC === '1'; // #11 branch: also flip fatigueCue
async function run(vp, flagOn, cue) {
  const ctx = await br.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.addInitScript(u => localStorage.setItem('eggfarm.ui', u), UI);
  if (flagOn) await ctx.route(/\/assets\/index-[^/]+\.js$/, async r => { const res = await r.fetch(); let t = await res.text();
    t = t.replace('salesStopped:0', 'salesStopped:1'); if (FC) t = t.replace('fatigueCue:0', 'fatigueCue:1'); await r.fulfill({ response: res, body: t }); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(srv.url); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm && window.eggfarmUi);
  await p.waitForTimeout(300); const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) { await wb.click(); await p.waitForTimeout(200); }
  const out = await p.evaluate(async ([SEL, cue]) => {
    const g = window.eggfarm; g.state = { ...g.state, farmLevel: 6, collectionLevel: 3, hensLevel: 6, tracksV7: 1, coinsCents: 512300, basket: 3, coop: 2, customers: [],
      workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 0, cdS: 0 } } };
    const s = window.eggfarmQaStall; if (s) { s.reset(); s.atRisk = { coop_hand: 9999 }; if (cue) s.cue = { share: 0.5, shown: true, episodeId: 'e1', suppressedByStall: false }; }
    window.eggfarmUi.render(); await new Promise(r => setTimeout(r, 250)); window.eggfarmUi.render();
    const R = el => { if (!el || el.hidden || !el.offsetParent && getComputedStyle(el).position !== 'fixed') return null; const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
    const rects = Object.fromEntries(SEL.map(q => [q, R(document.querySelector(q))]));
    const farm = document.querySelector('.farm').getBoundingClientRect(), hud = document.querySelector('.hud').getBoundingClientRect();
    const fslot = document.querySelector('.farm > .fslot'); const fs = fslot && fslot.offsetHeight ? fslot.getBoundingClientRect() : null;
    const ban = R(document.querySelector('.farm-banner')); const chip = document.querySelector('.fchip');
    let pop = null, popZ = null, banZ = null, topAtPop = null;
    if (chip && !chip.hidden && chip.offsetParent) { chip.click(); await new Promise(r => setTimeout(r, 100)); const pe = document.getElementById('fpop'); pop = R(pe);
      if (pop && ban) { const cx = (Math.max(pop[0], ban[0]) + Math.min(pop[2], ban[2])) / 2, cy = (Math.max(pop[1], ban[1]) + Math.min(pop[3], ban[3])) / 2;
        const hit = document.elementFromPoint(cx, cy); topAtPop = hit ? (hit.closest('#fpop') ? 'popover' : hit.closest('.farm-banner') ? 'banner' : hit.tagName) : null; }
      popZ = pe && getComputedStyle(pe).zIndex; banZ = getComputedStyle(document.querySelector('.farm-banner') ?? document.body).zIndex; }
    return { rects, farm: [farm.left, farm.top, farm.right, farm.bottom], hudB: hud.bottom, fs: fs && [fs.left, fs.top, fs.right, fs.bottom], hasFslot: !!fslot,
      fslotShown: !!fs, ban, pop, popZ, banZ, topAtPop, toast: R(document.querySelector('.toast')) };
  }, [SEL, cue]);
  await ctx.close(); return { ...out, errs };
}
const VPS = [{ width: 360, height: 640 }, { width: 360, height: 739 }, { width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 800 }];
for (const vp of VPS) {
  const tag = `${vp.width}x${vp.height}`;
  const off = await run(vp, false, false);
  for (const cue of FC ? [false, true] : [false]) {
    const on = await run(vp, true, cue); const t = `${tag}${cue ? ' +cue' : ''}`;
    ok(`${t} no page errors`, !off.errs.length && !on.errs.length, [off.errs, on.errs]);
    ok(`${t} banner shown`, !!on.ban, on.ban);
    if (!on.ban) continue;
    // 0 px shift vs flag off. With #11's ≥740 sub-line shown the queue band moves by design (FC-AC9 covers it), so compare non-cue runs only.
    if (!on.fslotShown) ok(`${t} queue/scene/#collect/collectbar/HUD/nav/meter/goal rects byte-equal to flag off`, JSON.stringify(on.rects) === JSON.stringify(off.rects), { off: off.rects, on: on.rects });
    const [l, tp, r, b] = on.ban, h = b - tp, under = on.fs ? on.fs[3] : on.hudB;
    ok(`${t} banner x = farm + 8, width = farm - 16`, Math.abs(l - (on.farm[0] + 8)) < 0.01 && Math.abs((r - l) - (on.farm[2] - on.farm[0] - 16)) < 0.01, { ban: on.ban, farm: on.farm });
    ok(`${t} banner top = ${on.fs ? '.fslot' : 'HUD'} bottom + 8`, Math.abs(tp - (under + 8)) < 0.6, { top: tp, under });
    ok(`${t} banner height 44-52`, h >= 44 && h <= 52, { h });
    ok(`${t} banner clear of HUD and tab bar`, tp >= on.hudB && (!on.rects.nav || b <= on.rects.nav[1]), { ban: on.ban, nav: on.rects.nav });
    ok(`${t} banner above #scene (golden spots live in the scene) and #collect`, b <= on.rects['#scene'][1] && b <= on.rects['#collect'][1], { b, scene: on.rects['#scene'] });
    if (vp.width === 360 && vp.height === 640) ok(`${t} banner clear of toast slot y147-179 and spot hit boxes (y >= 211)`, b <= 147, { b });
    if (FC) { if (vp.height <= 739) ok(`${t} no laid-out .fslot below 740 px high`, !on.fslotShown, { fs: on.fs });
      if (cue && on.pop) ok(`${t} popover stacks above the banner`, on.topAtPop !== 'banner' && Number(on.popZ) > Number(on.banZ), { topAtPop: on.topAtPop, popZ: on.popZ, banZ: on.banZ }); }
  }
}
await br.close(); srv.stop?.();
console.log(bad ? `FAIL ${bad}` : 'ALL PASS'); process.exit(bad ? 1 : 0);
