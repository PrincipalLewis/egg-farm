// Breeds UI PR-B browser harness (Features; AUTHOR EVIDENCE ONLY, not QA evidence). Chromium, 360x640, Playwright page.clock.
// Builds the test-only harness page tests/fixtures/breeds-prB/harness (the REAL Game + mountApp → PR-A mountBreeds → PR-B
// registry extender) with vite, serves it, and checks BR-AC52 / 52b / 52c (computed AX names via CDP), BR-AC23b DOM, BR-AC33/34
// yard, and flag-off byte identity. The flag-on balance is an in-page overlay (tests/fixtures/breeds-prB-flag-on.json); this
// script never writes src/config/balance.json. Usage: node scripts/breeds-ui-prB-browser.mjs  (SHOTS=dir, CHROME=path)
import pw from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import crypto from 'node:crypto';
import { build } from 'vite';
const ROOT = path.resolve(new URL('..', import.meta.url).pathname), HARNESS = path.join(ROOT, 'tests/fixtures/breeds-prB/harness');
const OUT = fs.mkdtempSync(path.join((await import('node:os')).tmpdir(), 'breeds-prB-harness-')), SHOTS = path.resolve(process.env.SHOTS ?? 'artifacts/breeds-ui-prB-browser');
await build({ configFile: path.join(ROOT, 'vite.config.ts'), root: HARNESS, base: './', publicDir: path.join(ROOT, 'public'), mode: 'qa', logLevel: 'warn',
  build: { outDir: OUT, emptyOutDir: true } });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const srv = http.createServer((rq, rs) => { const u = decodeURIComponent(new URL(rq.url, 'http://x').pathname); const f = path.join(OUT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(OUT + path.sep) && f !== OUT || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}/`;
fs.mkdirSync(SHOTS, { recursive: true });
const br = await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (n, p, i = {}) => { if (!p) bad++; console.log(`${p ? 'PASS' : 'FAIL'} [chromium] ${n} — ${JSON.stringify(i)}`); };
const shots = []; const shot = async (p, f) => { const fp = path.join(SHOTS, f); await p.screenshot({ path: fp }); shots.push([f, crypto.createHash('sha256').update(fs.readFileSync(fp)).digest('hex')]); return f; };
const errors = [];
const leghorn312 = { owned: { leghorn: { stars: 1 } }, slots: ['leghorn', null, null], incubator: null, settleMs: [0, 0, 0], hatches: 1, pity: 0, rng: 1, freeHatchUsed: 1, flockCompleteLogged: 0 };
const url = o => BASE + '?' + new URLSearchParams(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])));
async function open(o, rm = false) {
  const ctx = await br.newContext({ viewport: { width: 360, height: 640 }, reducedMotion: rm ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-10T08:00:00Z') }); await p.clock.pauseAt(new Date('2026-11-10T08:00:01Z')); // no natural time flow: wall time = focus time (BR-AC52b)
  await p.goto(url(o)); await p.waitForFunction(() => window.__prB?.ready); await p.clock.runFor(200);
  const cdp = await ctx.newCDPSession(p); return { ctx, p, cdp };
}
/** Engine-computed name + description of the first node matching sel (Chromium AX tree via CDP). */
async function ax(cdp, sel) {
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 }); const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
  if (!nodeId) return null; const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
  const n = nodes.find(x => !x.ignored) ?? nodes[0]; return { role: n.role?.value, name: n.name?.value, desc: n.description?.value ?? '' };
}
const CHIP = '[data-testid="breeds-hud-chip"]';

// ---- Flag off: no breeds DOM; registered vs not registered → identical #app ----
{ const hash = async reg => { const { ctx, p } = await open({ flag: 0, reg, F: 30, breeds: leghorn312 }); await p.clock.runFor(500);
    const h = await p.evaluate(() => document.getElementById('app').outerHTML.replace(/style="[^"]*"/g, '')); const n = await p.locator('[data-testid^="breeds-"]').count();
    if (reg) await shot(p, 'flag0-hud-360x640.png'); await ctx.close(); return { h: crypto.createHash('sha256').update(h).digest('hex'), n }; };
  const a = await hash(1), c = await hash(0);
  ok('F0-1 flag 0: no breeds-* nodes; #app DOM hash identical with and without the PR-B extender', a.n === 0 && c.n === 0 && a.h === c.h, { reg: a.h.slice(0, 12), unreg: c.h.slice(0, 12) }); }

// ---- Flag on: chip active / paused / tooltip / a11y (AC52, AC52c) ----
{ const { ctx, p, cdp } = await open({ flag: 1, F: 10, H: 5, breeds: leghorn312 });
  const a = await ax(cdp, CHIP); const box = await p.locator(CHIP).boundingBox(); const rate = await p.locator('#rate').boundingBox();
  const hit = await p.evaluate(s => { const r = getComputedStyle(document.querySelector(s), '::before'); return [parseFloat(r.width), parseFloat(r.height)]; }, CHIP);
  ok('F1-1 active: name "+3% active", description exact, role button, no aria-label', a?.name === '+3% active' && a?.desc === 'Breed bonus +3.12% active' && a?.role === 'button'
    && !(await p.locator(CHIP).getAttribute('aria-label')), a);
  ok('F1-2 chip right of #rate on the rate row (gap ≈ 4 px), hit area ≥ 44×44', box && rate && Math.abs(box.x - (rate.x + rate.width) - 4) <= 0.5 && hit[0] >= 44 && hit[1] >= 44, { box, rate, hit });
  const bs = await p.evaluate(s => getComputedStyle(document.querySelector(s)).borderTopStyle, CHIP); ok('F1-3 active border solid', bs === 'solid', { bs });
  await shot(p, 'flag1-chip-active-360x640.png');
  await p.clock.runFor(3000); ok('F1-4a boot toast cleared before the tooltip tap', !(await p.locator('.toast.show').count()));
  await p.evaluate(() => { document.querySelector('.toast').classList.add('show'); }); await p.locator(CHIP).click(); await p.clock.runFor(50);
  ok('F1-4b tooltip suppressed while a .toast is visible', await p.evaluate(() => document.querySelector('[data-testid="breeds-hud-tip"]').hidden));
  await p.evaluate(() => { document.querySelector('.toast').classList.remove('show'); document.activeElement?.blur(); }); await p.mouse.move(0, 300); await p.clock.runFor(50);
  await p.locator(CHIP).click(); await p.clock.runFor(50);
  const tip = await p.evaluate(() => { const t = document.querySelector('[data-testid="breeds-hud-tip"]'), h = document.querySelector('.hud').getBoundingClientRect(), r = t.getBoundingClientRect();
    return { shown: !t.hidden, text: t.textContent, top: r.top, hudBottom: h.bottom, right: r.right, pe: getComputedStyle(t).pointerEvents, ariaHidden: t.getAttribute('aria-hidden') }; });
  ok('F1-4 tap shows tooltip at HUD bottom + 8, 1 line, inside 360 − 8, pointer-events none, aria-hidden', tip.shown && tip.text === 'Bonus returns when you tap slower' && Math.abs(tip.top - tip.hudBottom - 8) <= 1 && tip.right <= 352 && tip.pe === 'none' && tip.ariaHidden === 'true', tip);
  await shot(p, 'flag1-chip-tooltip-360x640.png');
  await p.clock.runFor(1600); ok('F1-5 tooltip hides after 1.6 s', await p.evaluate(() => document.querySelector('[data-testid="breeds-hud-tip"]').hidden));
  await p.evaluate(() => window.__prB.force(false)); await p.clock.runFor(100);
  const ap = await ax(cdp, CHIP); const pst = await p.evaluate(s => { const c = document.querySelector(s), pt = c.querySelector('.breeds-hud-pt');
    return { border: getComputedStyle(c).borderTopStyle, deco: getComputedStyle(pt).textDecorationLine, anims: c.getAnimations({ subtree: true }).length, live: document.querySelectorAll('[aria-live]:not([aria-live=off])').length }; }, CHIP);
  const box2 = await p.locator(CHIP).boundingBox();
  ok('F1-6 paused: dashed + line-through, 0 animations, name "+3% paused", paused description', pst.border === 'dashed' && pst.deco.includes('line-through') && pst.anims === 0
    && ap?.name === '+3% paused' && ap?.desc === 'Breed bonus paused while you tap fast. Returns when you tap slower.', { ...pst, ...ap });
  ok('F1-7 active and paused chip boxes identical (UI-BR-17)', Math.abs(box2.width - box.width) <= 0.5 && Math.abs(box2.x - box.x) <= 0.5, { a: box.width, p: box2.width });
  await shot(p, 'flag1-chip-paused-360x640.png');
  await p.evaluate(() => window.__prB.force(null)); await ctx.close(); }

// ---- AC52b scripted pacing under page.clock (taps at 0..5, 10.5..14.5, repeated +30 s; tick 100 ms) ----
for (const rm of [false, true]) {
  const { ctx, p } = await open({ flag: 1, F: 10, H: 5, breeds: leghorn312 }, rm);
  const res = await (async () => {
    const T = [0, 1, 2, 3, 4, 5, 10.5, 11.5, 12.5, 13.5, 14.5].flatMap(t => [t * 1000, (t + 30) * 1000]).sort((x, y) => x - y);
    const t0 = await p.evaluate(() => performance.now()); const mism = [], pops = []; let last = 0, peak = 0, dur = 0;
    for (let t = 0; t <= 60000; t += 100) {
      if (t) await p.clock.runFor(100);
      for (const x of T) if (x === t) await p.evaluate(() => window.__prB.tap());
      await p.evaluate(() => window.__prB.render());
      const r = await p.evaluate(s => { const c = document.querySelector(s); const an = c.getAnimations(); const kf = an[0]?.effect?.getKeyframes?.() ?? [];
        return { open: window.__prB.gateOpen(), st: c.dataset.state, sr: c.querySelector('.sr').textContent, border: getComputedStyle(c).borderTopStyle, pops: window.__prB.pops(),
          dur: an[0]?.effect?.getTiming?.().duration ?? 0, peak: Math.max(0, ...kf.map(k => parseFloat(/scale\(([\d.]+)\)/.exec(k.transform ?? '')?.[1] ?? '0'))) }; }, CHIP);
      const want = r.open ? 'active' : 'paused';
      if (r.st !== want || r.sr !== ' ' + want || r.border !== (r.open ? 'solid' : 'dashed')) mism.push(t);
      if (r.pops > last) { pops.push(t); last = r.pops; dur = r.dur; peak = r.peak; }
    }
    void t0; return { mism, pops, dur, peak };
  })();
  if (!rm) ok('F2-1 AC52b: chip state/sr word/border match the gate on every 100 ms tick; exactly 2 pops at 10 s and 40 s; 300 ms, peak ≤ 1.08',
    res.mism.length === 0 && JSON.stringify(res.pops) === '[10000,40000]' && res.dur === 300 && res.peak <= 1.08 && res.peak > 1, res);
  else ok('F2-2 AC52b reduced motion: state still matches every tick; 0 pops', res.mism.length === 0 && res.pops.length === 0, res);
  await ctx.close();
}

// ---- Pop-cap boundary (9,999 vs 10,000 ms on performance.now) ----
{ const { ctx, p } = await open({ flag: 1, F: 10, H: 5, breeds: leghorn312 });
  const flipAt = async ms => { await p.evaluate(() => { window.__prB.force(false); window.__prB.render(); }); await p.clock.runFor(ms); await p.evaluate(() => { window.__prB.force(true); window.__prB.render(); }); return p.evaluate(() => window.__prB.pops()); };
  const a = await flipAt(1000), b2 = await flipAt(9999 - 0), c = await flipAt(1);
  ok('F2-3 boundary: first return pops; return 9,999 ms after the pop start swaps; 10,000 ms pops', a === 1 && b2 === 1 && c === 2, { a, b2, c }); await ctx.close(); }

// ---- Strip Hatch target (fallback forced: the #100 seam) ----
{ const { ctx, p, cdp } = await open({ flag: 1, fb: 1, F: 30, H: 5, coins: 1e15, breeds: { ...leghorn312, owned: { leghorn: { stars: 1 } } } });
  await p.clock.runFor(1200);
  const s = await p.evaluate(() => { const g = document.getElementById('goal'); return { label: g.querySelector('.goal-label').textContent, tgt: g.dataset.breedsTarget, desc: document.getElementById('goalDesc').textContent }; });
  const a = await ax(cdp, '#goal');
  ok('F3-1 AC23b (forced fallback): strip reads "Hatch · $X", no ★, own description; name starts with visible text', /^Hatch · \$/.test(s.label) && !s.label.includes('★') && s.tgt === 'hatch' && a?.name?.startsWith('Hatch · '), { ...s, name: a?.name });
  await shot(p, 'flag1-strip-hatch-360x640.png'); await ctx.close(); }

// ---- Yard sprites (AC33 via <img>, AC34 boxes) ----
{ const yb = { owned: { brahma: { stars: 0 }, cochin: { stars: 0 }, ayam_cemani: { stars: 0 } }, slots: ['brahma', 'cochin', 'ayam_cemani'], incubator: null, settleMs: [0, 0, 0], hatches: 3, pity: 0, rng: 1, freeHatchUsed: 1, flockCompleteLogged: 0 };
  const { ctx, p } = await open({ flag: 1, F: 20, H: 10, breeds: yb }); await p.clock.runFor(500);
  const y = await p.evaluate(() => { const imgs = [...document.querySelectorAll('#yard img.hen')]; const base = imgs.find(i => !i.dataset.breed); const bb = base.getBoundingClientRect();
    return { breeds: imgs.filter(i => i.dataset.breed).map(i => { const r = i.getBoundingClientRect(), c = i.parentElement.getBoundingClientRect();
      return { id: i.dataset.breed, w: r.width, h: r.height, loaded: i.complete && i.naturalWidth > 0, cx: r.x + r.width / 2 - (c.x + c.width / 2), cy: r.y + r.height / 2 - (c.y + c.height / 2) }; }),
      base: { w: bb.width, h: bb.height, cx: bb.x + bb.width / 2 - (base.parentElement.getBoundingClientRect().x + base.parentElement.getBoundingClientRect().width / 2) },
      dupIds: (() => { const ids = [...document.querySelectorAll('[id]')].map(e => e.id); return ids.length - new Set(ids).size; })() }; });
  ok('F4-1 AC34: Brahma/Cochin/Cemani in yard cells, loaded, same 48×48 box and cell centre as the base hen', y.breeds.length === 3 && y.breeds.every(r => r.loaded && Math.abs(r.w - y.base.w) < 0.5 && Math.abs(r.h - y.base.h) < 0.5 && Math.abs(r.cx - y.base.cx) < 0.5), y);
  ok('F4-2 AC33: sprites via <img src> → 0 duplicate ids in the document', y.dupIds === 0, { dup: y.dupIds });
  await shot(p, 'flag1-yard-breeds-360x640.png'); await ctx.close(); }

ok('F9 no page errors', errors.length === 0, { errors: errors.slice(0, 5) });
fs.writeFileSync(path.join(SHOTS, 'SHA256SUMS'), shots.map(([f, h]) => `${h}  ${f}`).join('\n') + '\n');
await br.close(); srv.close(); fs.rmSync(OUT, { recursive: true, force: true });
console.log(bad ? `BREEDS PR-B BROWSER: ${bad} FAIL` : 'BREEDS PR-B BROWSER: ALL PASS'); process.exit(bad ? 1 : 0);
