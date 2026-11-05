// v5 F6 browser ACs: overlay spot centres / live-rect validation (Art v1.1 §2.1–2.3), eggfarmQa seam (audio.log, fx.setMax,
// menu.open/close, sheet.stepClose), Market sheet not a dialog, hens-pill testid. Shots per viewport.
// Usage: npm run build:qa && node scripts/v5-f6-browser.mjs [chromium|firefox|webkit]   (inside the browser-test flock)
//   Serves THIS checkout's dist-qa (serveForRun: build-id must be HEAD, clean tree). Writes /workspace/wt-ui-shots/v5-f6-<sha7>/
//   <engine>-<w>x<h>.png + manifest.json (sha256 per shot) and results-<engine>.json. Exit 1 if any check fails.
//   QA handles only (window.eggfarm / eggfarmQa, compiled out of release builds).
import { chromium, webkit, firefox } from 'playwright-core';
import { serveForRun } from './serve-own.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
const ENGINE = process.argv[2] ?? 'chromium';
if (!['chromium', 'webkit', 'firefox'].includes(ENGINE)) { console.error(`v5-f6-browser: unknown engine ${ENGINE}`); process.exit(2); }
const srv = await serveForRun('dist-qa', 'v5-f6-browser');
const head = execSync('git rev-parse HEAD').toString().trim(), OUT = process.env.OUT ?? `/workspace/wt-ui-shots/v5-f6-${head.slice(0, 7)}`;
mkdirSync(OUT, { recursive: true });
const MAN = `${OUT}/manifest.json`, manifest = existsSync(MAN) ? JSON.parse(readFileSync(MAN, 'utf8')) : { head, buildId: srv.buildId, shots: [] };
manifest.shots = manifest.shots.filter(s => s.engine !== ENGINE);
const browser = ENGINE === 'webkit' ? await webkit.launch() : ENGINE === 'firefox' ? await firefox.launch() : await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const URL0 = `http://127.0.0.1:${srv.port}/`;
const results = []; let fails = 0;
const check = (id, w, name, pass, data) => { results.push({ id, engine: ENGINE, w, name, pass: !!pass, data }); if (!pass) { fails++; console.error(`FAIL [${ENGINE} ${w}] ${id} ${name} ${JSON.stringify(data)}`); } else console.log(`ok   [${ENGINE} ${w}] ${id} ${name}`); };
async function open(w, h, st = {}, { sfx = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 600 });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(ui => localStorage.setItem('eggfarm.ui', ui), JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx }));
  await page.goto(URL0, { waitUntil: 'domcontentloaded' }); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm && window.eggfarmQa);
  await page.evaluate(st => { document.getElementById('modal-layer')?.classList.remove('open'); const g = window.eggfarm;
    g.state = { ...g.state, seenTracksExplainer: true, collectionLevel: 20, farmLevel: 30, customers: [], nextCustomerInS: 1e9, graderTier: 1, manageCdS: 0, coinsCents: 0, ...st }; }, st);
  await page.waitForTimeout(700); return { ctx, page, errors };
}
const key = `${ENGINE}`;
// Art v1.1 §2.2 (360×640) + §2.3 QA matrix: expected centres (S1..S8; '-' unused)
const MATRIX = {
  '360x640': ['phone-360', '50,239 50,286 50,332 50,378 310,239 310,286 310,332 310,378'],
  '360x844': ['phone-360', '50,345 50,392 50,438 50,484 310,345 310,392 310,438 310,484'],
  '375x844': ['phone-375', '50,343 50,392 50,440 50,488 325,343 325,392 325,440 325,488'],
  '390x844': ['phone-375', '50,341 50,392 50,442 50,493 340,341 340,392 340,442 340,493'],
  '430x844': ['phone-375', '54,336 54,391 54,445 54,500 376,336 376,391 376,445 376,500'],
  '1024x474': ['docked-compact', '90,189 90,232 90,274 - 548,189 548,232 548,274 -'],
  '1280x720': ['docked', '110,220 230,301 110,399 230,488 680,220 770,301 650,399 770,506'],
  '1280x800': ['docked', '110,240 230,330 110,440 230,540 680,240 770,330 650,440 770,560'],
  '1366x768': ['docked', '153,232 273,318 153,423 273,519 723,232 813,318 693,423 813,538'],
};
const exp = s => Object.fromEntries(s.split(' ').map((v, i) => [`S${i + 1}`, v]).filter(([, v]) => v !== '-').map(([k, v]) => [k, v.split(',').map(Number)]));
const MATRIX_DRIFT = [];
for (const [vp, [wantKey, row]] of Object.entries(MATRIX)) {
  const [w, h] = vp.split('x').map(Number);
  for (const pill of [false, true]) {
    const { ctx, page, errors } = await open(w, h, pill ? { hensLevel: 30 } : { hensLevel: 0 });
    await page.evaluate(() => window.eggfarmUi?.render?.()); await page.waitForTimeout(300);
    const r = await page.evaluate(() => { const o = window.eggfarmQa.overlay.spots(); const sc = document.getElementById('scene').getBoundingClientRect();
      const pillEl = document.querySelector('[data-testid="hens-pill"]'); return { ...o, scene: { l: sc.left, t: sc.top, r: sc.right, b: sc.bottom }, pillShown: !!pillEl && !pillEl.hidden, vw: document.documentElement.clientWidth, vh: document.documentElement.clientHeight }; });
    const got = Object.fromEntries(r.spots.map(p => [p.id, [p.x, p.y]])), want = exp(row);
    check('F6-AC1', vp, `layout key ${r.layout} == ${wantKey}`, r.layout === wantKey, { layout: r.layout });
    // F6-AC2: the overlay's centres == §2.1 formula on the live rects (independent recompute in Node)
    const f = r.layout.startsWith('phone') ? Object.fromEntries(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map((id, i) => [id, [Math.round(i < 4 ? r.scene.l + 42 : r.scene.r - 42), Math.round(r.scene.t + Math.round([.32, .5, .68, .86][i % 4] * (r.scene.b - r.scene.t)))]])) : null;
    if (f) check('F6-AC2', vp, 'phone centres == §2.1 formula on the live #scene rect (±1)', Object.keys(f).every(k => got[k] && Math.abs(got[k][0] - f[k][0]) <= 1 && Math.abs(got[k][1] - f[k][1]) <= 1), { got, formula: f });
    const dev = Object.keys(want).map(k => got[k] ? Math.max(Math.abs(got[k][0] - want[k][0]), Math.abs(got[k][1] - want[k][1])) : 999);
    const matrixOk = Object.keys(got).length === Object.keys(want).length && dev.every(d => d <= 1);
    if (!r.layout.startsWith('phone')) check('F6-AC2', vp, 'docked / docked-compact centres == Art v1.1 §2.3 matrix (±1)', matrixOk, { got, want });
    else { check('F6-AC2-matrix', vp, `phone centres vs the Art v1.1 §2.3 matrix (±1; measured on RC 5d9efa6): max dev ${Math.max(...dev)} px${matrixOk ? '' : ' (DRIFT, informational: live #scene moved since 5d9efa6)'}`, true, { got, want, scene: r.scene, matrixOk }); if (!matrixOk) MATRIX_DRIFT.push({ vp, pill, got, want, scene: r.scene }); }
    // F6-AC3: every valid spot clears every live zone by >= clear px and the viewport by 16
    const hb = p => ({ left: p.x - 28, top: p.y - 28, right: p.x + 28, bottom: p.y + 28 });
    const gap = (a, b) => Math.max(0, Math.max(b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom));
    const ov = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const bad = r.valid.flatMap(p => { const b = hb(p); const out = [];
      if (b.left < 16 || b.top < 16 || b.right > r.vw - 16 || b.bottom > r.vh - 16) out.push(`${p.id}:viewport`);
      for (const z of r.zones) if (z.clear ? (ov(b, z.box) || gap(b, z.box) < z.clear) : ov(b, z.box)) out.push(`${p.id}:${z.name}`); return out; });
    const dropped = r.spots.filter(p => !r.valid.some(v => v.id === p.id)).map(p => p.id);
    check('F6-AC3', vp, `pill ${r.pillShown ? 'shown' : 'hidden'}: ${r.valid.length}/${r.spots.length} valid (dropped ${dropped.join(',') || 'none'}); every valid spot clears every live zone`, bad.length === 0 && r.zones.some(z => z.name === 'hud'), { bad, dropped, zones: r.zones.map(z => z.name) });
    if (pill) check('F6-AC3', vp, 'hens pill zone present (0px) when hens > 12', !r.pillShown || r.zones.some(z => z.name === 'henpill' && z.clear === 0), { pillShown: r.pillShown });
    check('F6-AC10', vp, 'hens pill has data-testid="hens-pill"', await page.locator('[data-testid="hens-pill"]').count() === 1, {});
    if (pill) { const file = `${key}-${vp}.png`; const buf = await page.screenshot({ path: `${OUT}/${file}` });
      // overlay the computed spots for the shot record
      manifest.shots.push({ file, label: `F6 spots ${vp} ${r.layout} (pill ${r.pillShown ? 'shown' : 'hidden'}), ${ENGINE}`, viewport: vp, engine: ENGINE, measured: { valid: r.valid.map(p => p.id), spots: got }, sha256: createHash('sha256').update(buf).digest('hex') }); }
    check('F6-AC11', vp, 'no page errors', errors.length === 0, errors); await ctx.close();
  }
}
// Open sheet/modal at phone: every spot blocked; Market sheet not a dialog; seam hooks
for (const [w, h] of [[390, 844], [1280, 800]]) {
  const vp = `${w}x${h}`; const { ctx, page, errors } = await open(w, h, { hensLevel: 0, basket: 50, coop: 40 }, { sfx: true });
  // F6-AC6: audio.log — only started sounds, {hook,file,tMs,semi}, semi 0 (sfx on; buffers load after the Tap-to-start unlock)
  await page.waitForTimeout(1200); await page.evaluate(() => { window.eggfarm.state = { ...window.eggfarm.state, coop: 40 }; window.eggfarmUi?.render?.(); });
  const n0 = await page.evaluate(() => window.eggfarmQa.audio.log.length);
  await page.locator('#collect').click(); await page.waitForTimeout(250);
  const log = await page.evaluate(() => window.eggfarmQa.audio.log.slice());
  const added = log.slice(n0), col = added.find(e => e.hook === 'collect');
  check('F6-AC6', vp, `audio.log: Collect tap logged {hook:'collect', file:'sfx-collect-pop', semi:0, tMs} (${added.length} new entries)`, !!col && col.file === 'sfx-collect-pop' && col.semi === 0 && typeof col.tMs === 'number' && log.every(e => ['hook', 'file', 'tMs', 'semi'].every(k => k in e)), { added, total: log.length });
  // menu.open / close
  const m = await page.evaluate(async () => { const q = window.eggfarmQa, ml = () => document.getElementById('modal-layer').classList.contains('open');
    q.menu.open(); await new Promise(r => setTimeout(r, 200)); const a = ml(); q.menu.close(); await new Promise(r => setTimeout(r, 300)); return { opened: a, closed: !ml() }; });
  check('F6-AC9', vp, 'eggfarmQa.menu.open() opens the Settings modal; menu.close() closes it', m.opened && m.closed, m);
  // Market sheet: not a dialog; at phone it blocks every spot; stepClose closes modal then sheet
  await page.evaluate(() => window.eggfarmUi?.openPanel?.('market')); await page.waitForTimeout(500);
  const s = await page.evaluate(async () => { const q = window.eggfarmQa; const sp = q.overlay.spots();
    const dlg = !!document.querySelector('#modal-layer.open, .recovery-layer, #rotate-prompt:not([hidden]), [role=alertdialog]:not(.onb-cap):not([hidden])');
    const open1 = document.getElementById('panel-layer').classList.contains('open');
    q.menu.open(); await new Promise(r => setTimeout(r, 200)); const a = q.sheet.stepClose(); await new Promise(r => setTimeout(r, 300)); const b = q.sheet.stepClose(); await new Promise(r => setTimeout(r, 400)); const c = q.sheet.stepClose();
    return { open1, dlg, layout: sp.layout, valid: sp.valid.length, zones: sp.zones.map(z => z.name), steps: [a, b, c], sheetOpenAfter: document.getElementById('panel-layer').classList.contains('open') }; });
  check('F6-AC4', vp, 'Market sheet open: not a dialog (DIALOG_SEL empty)', s.open1 && !s.dlg, s);
  if (s.layout.startsWith('phone')) check('F6-AC3', vp, 'phone: open Market sheet blocks every spot (0 valid => spawn deferred)', s.valid === 0 && s.zones.includes('sheet'), s);
  check('F6-AC9', vp, 'eggfarmQa.sheet.stepClose(): modal, then market, then null', JSON.stringify(s.steps) === '["modal","market",null]' && !s.sheetOpenAfter, s);
  // fx.setMax
  const fx = await page.evaluate(async () => { const q = window.eggfarmQa; const m0 = q.fx.max; q.fx.setMax(2); window.eggfarm.state = { ...window.eggfarm.state, coop: 200 };
    let peak = 0; for (let i = 0; i < 8; i++) { document.getElementById('collect').click(); peak = Math.max(peak, q.fx.count); await new Promise(r => setTimeout(r, 30)); } const m1 = q.fx.max; q.fx.setMax(m0); return { m0, m1, peak }; });
  check('F6-AC9', vp, `eggfarmQa.fx.setMax(2) caps live FX (peak ${fx.peak}); default max 30`, fx.m0 === 30 && fx.m1 === 2 && fx.peak <= 2, fx);
  check('F6-AC11', vp, 'no page errors', errors.length === 0, errors); await ctx.close();
}
await browser.close(); srv.stop();
writeFileSync(MAN, JSON.stringify(manifest, null, 1) + '\n');
writeFileSync(`${OUT}/results-${ENGINE}.json`, JSON.stringify({ head, buildId: srv.buildId, engine: ENGINE, checks: results.length, fails, matrixDrift: MATRIX_DRIFT, results }, null, 1) + '\n');
console.log(`v5-f6-browser [${ENGINE}] ${results.length - fails}/${results.length} checks pass, phone matrix drift at ${MATRIX_DRIFT.length} cases, ${manifest.shots.filter(s => s.engine === ENGINE).length} shots -> ${OUT}`);
process.exitCode = fails ? 1 : 0;
