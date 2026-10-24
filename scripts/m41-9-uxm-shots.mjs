// M41-9 Art Minors before/after shots + checks (art-ux/m4.1-ui-minors.md UX-M1, M2, M3, M5; UX-M4 is PR #62).
// Usage: npm run build:qa && node scripts/m41-9-uxm-shots.mjs <chromium|firefox|webkit> <before worktree with dist-qa> [outDir] [--prev=<6041522 worktree>]
//   --prev: also logs CCR M1's repro on 6041522 (first / second tap on the covered Buy at 360/375/390); observations only.
//   Writes/merges manifest.json (state, viewport, engine, file, sha per shot).
//   AFTER = this worktree's dist-qa (must be HEAD, not +dirty); BEFORE = the given worktree's dist-qa (must be main dd223f5).
//   outDir defaults to /workspace/wt-ui-shots/m41-9-<sha7 of AFTER>/ and must end with -<sha7>; no environment override.
//   One engine per run, inside the browser-test flock. Checks are scored on AFTER only; BEFORE rows are logged as observations.
// Seeding (QA handle only): the explainer is re-armed with g.state.seenTracksExplainer=false and g.onTracksCommitted() (the
// in-session commit hook), with g.migrationRefundCents set for the refund pop (M4-A data always refunds 0). UX-M5 frames
// pause the Web Animations at fixed currentTime values and keep the decorative nodes (pop / coin / fade copy) in the DOM
// until the frames are taken (their remove() is stubbed in the page); that is evidence-only and never in the game build.
import pw from 'playwright-core'; import { serveOwn } from './serve-own.mjs';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs'; import { basename } from 'node:path'; import { execSync } from 'node:child_process';
const ARGS = process.argv.slice(2), PREV_WT = ARGS.find(a => a.startsWith('--prev='))?.slice(7); const [eng = 'chromium', BEFORE_WT, OUT_ARG] = ARGS.filter(a => !a.startsWith('--'));
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
const prev = PREV_WT ? await serveOwn('dist-qa', 0, PREV_WT) : null; if (prev) servers.push(prev); const vp = prev ? await buildOf(prev) : null;
if (prev && (!vp || !vp[2].startsWith('6041522'))) die(`--prev build ${vp?.[0]} is not 6041522`);
const sha7 = va[2].slice(0, 7), OUT = OUT_ARG ?? `/workspace/wt-ui-shots/m41-9-${sha7}`;
if (!basename(OUT).endsWith(`-${sha7}`)) die(`outDir ${OUT} must end with -${sha7}`);
mkdirSync(OUT, { recursive: true });
if (!existsSync(`${OUT}/README.txt`)) writeFileSync(`${OUT}/README.txt`, `M41-9 UX-M1/M2/M3/M5 before/after (scripts/m41-9-uxm-shots.mjs). AFTER = ${va[0]} (HEAD ${HEAD}); BEFORE = ${vb[0]} (main). Files: <engine>-<UX-Mn>-<before|after>-<state>-<w>x<h>.png; checks in checks-<engine>.txt.\n`);
const br = eng === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[eng].launch();
let bad = 0; const log = [];
const ok = (lab, k, v, d) => { const scored = lab === 'after'; if (scored && !v) bad++;
  const line = `${scored ? (v ? 'PASS' : 'FAIL') : lab === 'note' ? 'NOTE' : lab === 'prev' ? 'PREV-6041522' : (v ? 'BEFORE-ok' : 'BEFORE-defect')} [${eng}] ${k} ${JSON.stringify(d ?? '')}`; console.log(line); log.push(line); };
const BUILD = { before: vb, after: va, prev: vp }, shots = [];
const shot = (p, lab, ux, st, w, h) => { const file = `${eng}-${ux}-${lab}-${st}-${w}x${h}.png`;
  shots.push({ state: `${ux} ${st}`, label: lab, viewport: `${w}x${h}`, engine: eng, file, sha: BUILD[lab][2], build: BUILD[lab][0] }); return p.screenshot({ path: `${OUT}/${file}` }); };
const SRV = { before, after, prev };
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
    for (const how of ['esc', 'gotit-space', 'gotit-pointer']) {
      await showCard(p);
      if (how === 'esc') await p.keyboard.press('Escape'); else if (how === 'gotit-space') await p.keyboard.press('Space'); else await p.locator('.tracks-exp-ok').click();
      await p.waitForTimeout(300); const r = await ring(p);
      if (how === 'gotit-pointer') ok(lab, `Designer M-1: Got it by pointer -> focus on bottom-nav Upgrades, NO forced .kbd-focus at ${w}`, r?.el === 'BUTTON[data-nav=upgrades]' && !r.kbd, r);
      else ok(lab, `UX-M1 ${how} (keyboard) -> focus on bottom-nav Upgrades with a 3px #2B79A8 ring at ${w}`, r?.el === 'BUTTON[data-nav=upgrades]' && ringOk(r), r);
      if (how === 'esc') { const n1 = await p.evaluate(() => { const b = document.querySelector('[data-nav=upgrades]'), r = b.getBoundingClientRect(), o = parseFloat(getComputedStyle(b).outlineOffset), wd = parseFloat(getComputedStyle(b).outlineWidth);
        return { offset: o, ring: { t: r.top - o - wd, b: r.bottom + o + wd, l: r.left - o - wd, r: r.right + o + wd }, vw: innerWidth, vh: innerHeight }; });
        ok(lab, `Designer n1: bottom-nav ring fully inside the viewport at ${w}`, n1.ring.t >= 0 && n1.ring.l >= 0 && n1.ring.b <= n1.vh && n1.ring.r <= n1.vw, n1); }
      await shot(p, lab, 'UX-M1', `after-${how}`, w, h);
    }
    await ctx.close();
  }
  // UX-M2 + Art (2): the no-storage notice (only .save-warn caller) at the 8 viewports: Collect clear of it and tappable; the goal
  // strip (#goal) may be covered only at widths <= 390, wider it must be clear (rect intersection).
  for (const [w, h] of [[360, 640], [375, 667], [390, 844], [412, 915], [430, 932], [768, 1024], [1024, 768], [1280, 800]]) {
    const { ctx, p } = await open(lab, w, h);
    await p.evaluate(() => window.eggfarm.onStorageFail?.()); await p.waitForSelector('.save-warn', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300);
    const n = await rect(p, '.save-warn'), c = await rect(p, '#collect');
    await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 20, basket: 0 }; }); await p.waitForTimeout(200);
    const b0 = await p.evaluate(() => window.eggfarm.state.basket); await p.locator('#collect').click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(250);
    const b1 = await p.evaluate(() => window.eggfarm.state.basket);
    const gl = await rect(p, '#goal');
    ok(lab, `UX-M2 no-storage notice clear of Collect and Collect tappable at ${w}x${h}`, !!n && !!c && !hit(n, c) && b1 > b0, { notice: n, collect: c, basket: [b0, b1] });
    if (w > 390) ok(lab, `Art (2) notice clear of the goal strip at ${w}x${h}`, !!n && !!gl && !hit(n, gl), { notice: n, goal: gl });
    else ok('note', `Art (2) notice over the goal strip at ${w}x${h} (allowed <= 390): ${hit(n, gl) ? 'overlaps' : 'clear'}`, true, { lab, notice: n, goal: gl });
    await shot(p, lab, 'UX-M2', 'no-storage', w, h); await ctx.close();
  }
  // UX-M3 + Art (1) / HoQA exit: Upgrades sheet open (Farm and Collection tabs) + card (plain / refund line) at 360/375/390/430/1280:
  // no visible Buy (incl. 'Collect per tap') and no #collect rect intersects the card, then the FIRST mouse tap on the first
  // visible Buy buys exactly one level (the card is not in the way; v1.15: it stays).
  const LV = { farm: 'farmLevel', hens: 'hensLevel', eggValue: 'eggValueLevel', collection: 'collectionLevel' };
  for (const [w, h] of [[360, 640], [375, 667], [390, 844], [430, 932], [1280, 800]]) for (const tab of ['farm', 'collection']) for (const refund of [0, 123450]) {
    const { ctx, p } = await open(lab, w, h);
    if (w < 900) await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(400);
    await p.locator(`[data-tab=${tab}]`).click(); await p.waitForTimeout(300);
    await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: 5e7 }; }); await p.waitForTimeout(250);
    await showCard(p, refund);
    const cr = await rect(p, '.tracks-exp'), place = await p.evaluate(() => document.querySelector('.tracks-exp')?.dataset.place ?? null);
    const ctl = await p.evaluate(() => [...document.querySelectorAll('.btn.buy, #collect')].map(e => { const r = e.getBoundingClientRect(); return { id: e.id || e.dataset.kind, l: r.left, r: r.right, t: r.top, b: r.bottom, vis: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight }; }).filter(x => x.vis));
    const covered = ctl.filter(x => hit(x, cr)).map(x => x.id);
    ok(lab, `Art (1) no visible Buy / Collect rect intersects the card (${tab}, refund ${refund ? 'line' : 'none'}) at ${w}`, !!cr && covered.length === 0, { place, card: cr, covered });
    await shot(p, lab, 'UX-M3', `sheet-open-${tab}-card${refund ? '-refund' : ''}`, w, h);
    const first = await p.evaluate(() => { const b = [...document.querySelectorAll('#uRow .btn.buy[data-kind]')].find(b => { const r = b.getBoundingClientRect(); return r.height > 0 && r.top >= 0 && r.bottom <= innerHeight; });
      if (!b) return null; const r = b.getBoundingClientRect(); return { kind: b.dataset.kind, x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const lv = k => p.evaluate(k => window.eggfarm.state[k], LV[first?.kind]);
    const l0 = first ? await lv() : null; if (first) await p.mouse.click(first.x, first.y); await p.waitForTimeout(300); const l1 = first ? await lv() : null;
    ok(lab, `Art (1) first tap on the first visible Buy buys 1 with the card up (${tab}, refund ${refund ? 'line' : 'none'}) at ${w}`, !!first && l1 === l0 + 1, { first, levels: [l0, l1], cardStill: await p.evaluate(() => !!document.querySelector('.tracks-exp')) });
    await ctx.close();
  }
  if (lab === 'after' && prev) for (const [w, h] of [[360, 640], [375, 667], [390, 844]]) { // CCR M1 repro on 6041522 (observation)
    const { ctx, p } = await open('prev', w, h); await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(400);
    await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: 5e7 }; }); await p.waitForTimeout(250); await showCard(p, 0);
    const first = await p.evaluate(() => { const b = document.querySelector('#uRow .btn.buy[data-kind]'), r = b.getBoundingClientRect(), c = document.querySelector('.tracks-exp').getBoundingClientRect();
      return { kind: b.dataset.kind, x: r.left + r.width / 2, y: r.top + r.height / 2, over: r.top < c.bottom && c.top < r.bottom && r.left < c.right && c.left < r.right }; });
    const lv = () => p.evaluate(k => window.eggfarm.state[k], LV[first.kind]); const l0 = await lv();
    await p.mouse.click(first.x, first.y); await p.waitForTimeout(300); const l1 = await lv(), card1 = await p.evaluate(() => !!document.querySelector('.tracks-exp'));
    await p.mouse.click(first.x, first.y); await p.waitForTimeout(300); const l2 = await lv();
    ok('prev', `CCR M1 repro at ${w}: card over first Buy=${first.over}; 1st tap bought=${l1 === l0 + 1} card closed=${!card1}; 2nd tap bought=${l2 === l1 + 1}`, true, { levels: [l0, l1, l2] });
    await shot(p, 'prev', 'UX-M3', 'ccr-m1-after-2-taps', w, h); await ctx.close();
  }
  // UX-M5: refund pop frames and the close fade frames (360, 1280), then reduced motion
  for (const [w, h] of [[360, 640], [1280, 800]]) {
    const { ctx, p } = await open(lab, w, h);
    await p.evaluate(() => { window.__fx = []; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && /exp-pop|exp-coin|tracks-exp-out/.test(n.className)) {
      n.remove = () => {}; window.__fx.push({ cls: n.className, text: n.textContent?.trim() ?? '' }); requestAnimationFrame(() => n.getAnimations().forEach(a => a.pause())); } }).observe(document.body, { childList: true }); });
    await p.evaluate(() => { const g = window.eggfarm; g.migrationRefundCents = 123450; g.state = { ...g.state, seenTracksExplainer: false }; g.onTracksCommitted(); });
    await p.waitForSelector('.tracks-exp', { timeout: 3000 }); await p.waitForTimeout(400);
    const fx0 = await p.evaluate(() => window.__fx.slice());
    ok(lab, `Art (3) no refund pop while the card is up at ${w}`, fx0.length === 0, fx0);
    await shot(p, lab, 'UX-M5', 'refund-card-up-no-pop', w, h);
    await p.locator('.tracks-exp-ok').click(); await p.waitForTimeout(150);
    const fx1 = await p.evaluate(() => window.__fx.slice()), geo = await p.evaluate(() => { const pop = document.querySelector('.exp-pop')?.getBoundingClientRect(), pill = document.querySelector('.pill.coins')?.getBoundingClientRect();
      return pop && pill ? { popCx: pop.left + pop.width / 2, pillCx: pill.left + pill.width / 2 } : null; });
    ok(lab, `Art (3) on dismiss: refund number pop + coin burst at the coin pill, once, at ${w}`, fx1.filter(f => /exp-pop/.test(f.cls)).length === 1 && fx1.some(f => /exp-pop/.test(f.cls) && f.text === '+$1.2K') && fx1.filter(f => /exp-coin/.test(f.cls)).length >= 1 && !!geo && Math.abs(geo.popCx - geo.pillCx) < 4, { fx1, geo });
    for (const t of [0, 60, 120, 300, 500, 650, 790]) {
      await p.evaluate(t => { for (const n of document.querySelectorAll('.exp-pop,.exp-coin')) n.getAnimations().forEach(a => { a.pause(); a.currentTime = t; }); document.querySelector('.tracks-exp')?.getAnimations().forEach(a => a.finish()); }, t);
      await p.waitForTimeout(60); await shot(p, lab, 'UX-M5', `refund-pop-t${String(t).padStart(3, '0')}ms`, w, h);
    }
    await p.evaluate(() => document.querySelectorAll('.exp-pop,.exp-coin').forEach(n => Element.prototype.remove.call(n)));
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
    const bal = await rm.p.evaluate(async () => { const g = window.eggfarm, c0 = g.state.coinsCents, t00 = document.getElementById('coins').textContent; g.migrationRefundCents = 123450; g.state = { ...g.state, coinsCents: c0 + 123450, seenTracksExplainer: false }; g.onTracksCommitted();
      const t0 = performance.now(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return { was: t00, shown: document.getElementById('coins').textContent, ms: Math.round(performance.now() - t0) }; });
    await rm.p.waitForTimeout(1000); const settled = await rm.p.evaluate(() => document.getElementById('coins').textContent);
    ok(lab, `Art (3) reduced motion: the balance shows the refunded total within 2 frames (no tween) at ${w}`, bal.shown !== bal.was && bal.shown === settled && bal.ms < 200, { ...bal, settled });
    await rm.p.waitForSelector('.tracks-exp', { timeout: 3000 }); await rm.p.waitForTimeout(250); await shot(rm.p, lab, 'UX-M5', 'reduced-motion-card', w, h);
    await rm.p.keyboard.press('Escape'); await rm.p.waitForTimeout(30); await shot(rm.p, lab, 'UX-M5', 'reduced-motion-after-close', w, h);
    const fx3 = await rm.p.evaluate(() => ({ fx: window.__fx, card: !!document.querySelector('.tracks-exp') }));
    ok(lab, `UX-M5 reduced motion: no pop / fade copy, closes instantly at ${w}`, fx3.fx.length === 0 && !fx3.card, fx3);
    await rm.ctx.close();
  }
}
const MF = `${OUT}/manifest.json`, old = existsSync(MF) ? JSON.parse(readFileSync(MF, 'utf8')) : { script: 'scripts/m41-9-uxm-shots.mjs', shots: [] };
old.shots = [...old.shots.filter(s => s.engine !== eng || !s.file.includes('-UX-M')), ...shots]; old.head = HEAD; writeFileSync(MF, JSON.stringify(old, null, 1) + '\n');
writeFileSync(`${OUT}/checks-${eng}.txt`, log.join('\n') + `\n${eng}: ${bad ? `${bad} FAIL` : 'all AFTER checks PASS'} (build ${va[0]} vs ${vb[0]})\n`);
console.log(`m41-9-uxm-shots ${eng}: ${bad ? `${bad} FAIL` : 'all AFTER checks PASS'}`);
await br.close(); servers.forEach(s => s.stop()); process.exit(bad ? 1 : 0);
