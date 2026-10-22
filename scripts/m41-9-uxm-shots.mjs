// M41-9 Art Minors before/after shots + checks (art-ux/m4.1-ui-minors.md UX-M1, M2, M3, M5; UX-M4 is PR #62).
// Usage: npm run build:qa && node scripts/m41-9-uxm-shots.mjs <chromium|firefox|webkit> <before worktree with dist-qa> [outDir]
//   AFTER = this worktree's dist-qa (must be HEAD, not +dirty); BEFORE = the given worktree's dist-qa (must be main dd223f5).
//   outDir defaults to /workspace/wt-ui-shots/m41-9-<sha7 of AFTER>/ and must end with -<sha7>; no environment override.
//   One engine per run, inside the browser-test flock. Checks are scored on AFTER only; BEFORE rows are logged as observations.
// Seeding (QA handle only): the explainer is re-armed with g.state.seenTracksExplainer=false and g.onTracksCommitted() (the
// in-session commit hook), with g.migrationRefundCents set for the refund pop (M4-A data always refunds 0). UX-M5 frames
// pause the Web Animations at fixed currentTime values and keep the decorative nodes (pop / coin / fade copy) in the DOM
// until the frames are taken (their remove() is stubbed in the page); that is evidence-only and never in the game build.
import pw from 'playwright-core'; import { serveOwn } from './serve-own.mjs';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'; import { basename } from 'node:path'; import { execSync } from 'node:child_process';
const [eng = 'chromium', BEFORE_WT, OUT_ARG] = process.argv.slice(2);
if (!['chromium', 'firefox', 'webkit'].includes(eng) || !BEFORE_WT) { console.error('usage: node scripts/m41-9-uxm-shots.mjs <engine> <before worktree> [outDir]'); process.exit(2); }
const MAIN = 'dd223f5', HEAD = execSync('git rev-parse HEAD').toString().trim();
const servers = []; const die = m => { console.error(`m41-9-uxm-shots: ${m}`); servers.forEach(s => s.stop()); process.exit(2); };
async function buildOf(srv) { const html = await (await fetch(srv.url)).text();
  for (const [, u] of html.matchAll(/src="([^"]+\.js)"/g)) { const m = (await (await fetch(new URL(u, srv.url))).text()).match(/["'`](m\d[a-z0-9.-]*)\+([0-9a-f]{7,40})(\+dirty)?["'`]/); if (m) return m; } return null; }
const after = await serveOwn('dist-qa'); servers.push(after); const before = await serveOwn('dist-qa', 0, BEFORE_WT); servers.push(before);
const va = await buildOf(after), vb = await buildOf(before);
if (!va || !vb) die('no build id in a served dist-qa');
if (va[3] || vb[3]) die(`a build is +dirty (${va[0]} / ${vb[0]})`);
if (!HEAD.startsWith(va[2])) die(`AFTER build ${va[0]} is not HEAD ${HEAD}; npm run build:qa`);
if (!vb[2].startsWith(MAIN) && !MAIN.startsWith(vb[2].slice(0, 7))) die(`BEFORE build ${vb[0]} is not main ${MAIN}`);
const sha7 = va[2].slice(0, 7), OUT = OUT_ARG ?? `/workspace/wt-ui-shots/m41-9-${sha7}`;
if (!basename(OUT).endsWith(`-${sha7}`)) die(`outDir ${OUT} must end with -${sha7}`);
mkdirSync(OUT, { recursive: true });
if (!existsSync(`${OUT}/README.txt`)) writeFileSync(`${OUT}/README.txt`, `M41-9 UX-M1/M2/M3/M5 before/after (scripts/m41-9-uxm-shots.mjs). AFTER = ${va[0]} (HEAD ${HEAD}); BEFORE = ${vb[0]} (main). Files: <engine>-<UX-Mn>-<before|after>-<state>-<w>x<h>.png; checks in checks-<engine>.txt.\n`);
const br = eng === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[eng].launch();
let bad = 0; const log = [];
const ok = (lab, k, v, d) => { const scored = lab === 'after'; if (scored && !v) bad++;
  const line = `${scored ? (v ? 'PASS' : 'FAIL') : (v ? 'BEFORE-ok' : 'BEFORE-defect')} [${eng}] ${k} ${JSON.stringify(d ?? '')}`; console.log(line); log.push(line); };
const shot = (p, lab, ux, st, w, h) => p.screenshot({ path: `${OUT}/${eng}-${ux}-${lab}-${st}-${w}x${h}.png` });
const SRV = { before, after };
async function open(lab, w, h, extra = {}) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, ...extra }); const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, seenSlots: 6 })));
  await p.goto(SRV[lab].url); await p.getByText('Tap to start').click({ force: true }).catch(() => {}); await p.waitForFunction(() => window.eggfarm);
  await p.evaluate(() => { document.getElementById('modal-layer')?.classList.remove('open'); const g = window.eggfarm; g.state = { ...g.state, seenTracksExplainer: true, customers: [], nextCustomerInS: 1e9 }; });
  await p.waitForTimeout(800); return { ctx, p };
}
const showCard = (p, refund = 0) => p.evaluate(r => { document.querySelectorAll('.tracks-exp').forEach(e => e.remove()); const g = window.eggfarm; g.migrationRefundCents = r; g.state = { ...g.state, seenTracksExplainer: false }; g.onTracksCommitted(); }, refund)
  .then(() => p.waitForSelector('.tracks-exp', { timeout: 3000 })).then(() => p.waitForTimeout(350));
const rect = (p, s) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; }, s);
const hit = (a, b) => !!a && !!b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
const ring = p => p.evaluate(() => { const a = document.activeElement, cs = a && getComputedStyle(a);
  return a ? { el: a.tagName + (a.dataset.nav ? `[data-nav=${a.dataset.nav}]` : '') + (a.dataset.tab ? `[data-tab=${a.dataset.tab}]` : '') + (a.id ? '#' + a.id : ''), style: cs.outlineStyle, width: cs.outlineWidth, color: cs.outlineColor, kbd: a.classList.contains('kbd-focus') } : null; });
const ringOk = r => !!r && r.style !== 'none' && parseFloat(r.width) >= 3 && /43,\s*121,\s*168/.test(r.color);
for (const lab of ['before', 'after']) {
  // UX-M1: Esc and Got it on 360/375/390 (sheet closed -> bottom-nav Upgrades)
  for (const [w, h] of [[360, 640], [375, 667], [390, 844]]) {
    const { ctx, p } = await open(lab, w, h);
    for (const how of ['esc', 'gotit']) {
      await showCard(p);
      if (how === 'esc') await p.keyboard.press('Escape'); else await p.locator('.tracks-exp-ok').click();
      await p.waitForTimeout(300); const r = await ring(p);
      ok(lab, `UX-M1 ${how} -> focus on bottom-nav Upgrades with a 3px #2B79A8 ring at ${w}`, r?.el === 'BUTTON[data-nav=upgrades]' && ringOk(r), r);
      await shot(p, lab, 'UX-M1', `after-${how}`, w, h);
    }
    await ctx.close();
  }
  // UX-M2: no-storage notice at 360 (score) and 1280 (record): Collect clear of the notice and tappable
  for (const [w, h] of [[360, 640], [1280, 800]]) {
    const { ctx, p } = await open(lab, w, h);
    await p.evaluate(() => window.eggfarm.onStorageFail?.()); await p.waitForSelector('.save-warn', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300);
    const n = await rect(p, '.save-warn'), c = await rect(p, '#collect');
    await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 20, basket: 0 }; }); await p.waitForTimeout(200);
    const b0 = await p.evaluate(() => window.eggfarm.state.basket); await p.locator('#collect').click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(250);
    const b1 = await p.evaluate(() => window.eggfarm.state.basket);
    ok(lab, `UX-M2 no-storage notice clear of Collect and Collect tappable at ${w}`, !!n && !!c && !hit(n, c) && b1 > b0, { notice: n, collect: c, basket: [b0, b1] });
    await shot(p, lab, 'UX-M2', 'no-storage', w, h); await ctx.close();
  }
  // UX-M3: Upgrades sheet open + card, every [data-tab] fully visible (360, 1280)
  for (const [w, h] of [[360, 640], [1280, 800]]) {
    const { ctx, p } = await open(lab, w, h);
    if (w < 900) await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(400);
    await showCard(p);
    const cr = await rect(p, '.tracks-exp'), place = await p.evaluate(() => document.querySelector('.tracks-exp')?.dataset.place ?? null);
    const tabs = await p.evaluate(() => [...document.querySelectorAll('[data-tab]')].map(e => { const r = e.getBoundingClientRect(); return { tab: e.dataset.tab, l: r.left, r: r.right, t: r.top, b: r.bottom }; }));
    const vis = await p.evaluate(() => [...document.querySelectorAll('[data-tab]')].every(e => { const r = e.getBoundingClientRect(); const pts = [[r.left + 3, r.top + 3], [r.right - 3, r.top + 3], [r.left + 3, r.bottom - 3], [r.right - 3, r.bottom - 3], [(r.left + r.right) / 2, (r.top + r.bottom) / 2]];
      return r.width > 0 && pts.every(([x, y]) => e.contains(document.elementFromPoint(x, y))); }));
    ok(lab, `UX-M3 sheet open: every [data-tab] fully visible with the card up at ${w}`, tabs.length === 3 && tabs.every(t => !hit(t, cr)) && vis, { place, card: cr, tabs });
    await shot(p, lab, 'UX-M3', 'sheet-open-card', w, h); await ctx.close();
  }
  // UX-M5: refund pop frames and the close fade frames (360, 1280), then reduced motion
  for (const [w, h] of [[360, 640], [1280, 800]]) {
    const { ctx, p } = await open(lab, w, h);
    await p.evaluate(() => { window.__fx = []; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && /exp-pop|exp-coin|tracks-exp-out/.test(n.className)) {
      n.remove = () => {}; window.__fx.push({ cls: n.className, text: n.textContent?.trim() ?? '' }); requestAnimationFrame(() => n.getAnimations().forEach(a => a.pause())); } }).observe(document.body, { childList: true }); });
    await p.evaluate(() => { const g = window.eggfarm; g.migrationRefundCents = 123450; g.state = { ...g.state, seenTracksExplainer: false }; g.onTracksCommitted(); });
    await p.waitForSelector('.tracks-exp', { timeout: 3000 }); await p.waitForTimeout(150);
    const fx1 = await p.evaluate(() => window.__fx.slice());
    ok(lab, `UX-M5 refund number pop + coin particle at ${w}`, fx1.some(f => /exp-pop/.test(f.cls) && f.text === '+$1.2K') && fx1.some(f => /exp-coin/.test(f.cls)), fx1);
    for (const t of [0, 60, 120, 300, 500, 650, 790]) {
      await p.evaluate(t => { for (const n of document.querySelectorAll('.exp-pop,.exp-coin')) n.getAnimations().forEach(a => { a.pause(); a.currentTime = t; }); document.querySelector('.tracks-exp')?.getAnimations().forEach(a => a.finish()); }, t);
      await p.waitForTimeout(60); await shot(p, lab, 'UX-M5', `refund-pop-t${String(t).padStart(3, '0')}ms`, w, h);
    }
    await p.evaluate(() => document.querySelectorAll('.exp-pop,.exp-coin').forEach(n => Element.prototype.remove.call(n)));
    await p.keyboard.press('Escape'); await p.waitForTimeout(120);
    const fx2 = await p.evaluate(() => ({ out: !!document.querySelector('.tracks-exp-out'), card: !!document.querySelector('.tracks-exp'),
      anim: (() => { const a = document.querySelector('.tracks-exp-out')?.getAnimations()[0]; const t = a?.effect?.getTiming(); return a ? { name: a.animationName, duration: t?.duration, easing: t?.easing } : null; })() }));
    ok(lab, `UX-M5 close: card gone at once, 150ms fade copy at ${w}`, !fx2.card && fx2.out && fx2.anim?.name === 'expout' && fx2.anim?.duration === 150, fx2);
    for (const t of [0, 50, 100, 149]) {
      await p.evaluate(t => document.querySelectorAll('.tracks-exp-out').forEach(n => n.getAnimations().forEach(a => { a.pause(); a.currentTime = t; })), t);
      await p.waitForTimeout(60); await shot(p, lab, 'UX-M5', `close-fade-t${String(t).padStart(3, '0')}ms`, w, h);
    }
    await ctx.close();
    // reduced motion: no pop, no fade copy (instant)
    const rm = await open(lab, w, h, { reducedMotion: 'reduce' });
    await rm.p.evaluate(() => { window.__fx = []; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && /exp-pop|exp-coin|tracks-exp-out/.test(n.className)) window.__fx.push(n.className); }).observe(document.body, { childList: true }); });
    await rm.p.evaluate(() => { const g = window.eggfarm; g.migrationRefundCents = 123450; g.state = { ...g.state, seenTracksExplainer: false }; g.onTracksCommitted(); });
    await rm.p.waitForSelector('.tracks-exp', { timeout: 3000 }); await rm.p.waitForTimeout(250); await shot(rm.p, lab, 'UX-M5', 'reduced-motion-card', w, h);
    await rm.p.keyboard.press('Escape'); await rm.p.waitForTimeout(30); await shot(rm.p, lab, 'UX-M5', 'reduced-motion-after-close', w, h);
    const fx3 = await rm.p.evaluate(() => ({ fx: window.__fx, card: !!document.querySelector('.tracks-exp') }));
    ok(lab, `UX-M5 reduced motion: no pop / fade copy, closes instantly at ${w}`, fx3.fx.length === 0 && !fx3.card, fx3);
    await rm.ctx.close();
  }
}
writeFileSync(`${OUT}/checks-${eng}.txt`, log.join('\n') + `\n${eng}: ${bad ? `${bad} FAIL` : 'all AFTER checks PASS'} (build ${va[0]} vs ${vb[0]})\n`);
console.log(`m41-9-uxm-shots ${eng}: ${bad ? `${bad} FAIL` : 'all AFTER checks PASS'}`);
await br.close(); servers.forEach(s => s.stop()); process.exit(bad ? 1 : 0);
