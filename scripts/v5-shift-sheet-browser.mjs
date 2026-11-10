// Shift sheet browser check (Features; AUTHOR EVIDENCE ONLY). Builds tests/fixtures/shift/harness with vite (real sheet module + styles.css,
// FakeShiftSim test double), then checks layout (RF-UI-13, §9), names (RF-UI-9/19/20), focus (RF-UI-3/SS-36), flag 0 (RF-UI-1).
// Usage (under the shared lock): node scripts/v5-shift-sheet-browser.mjs [chromium|firefox|webkit]   SHOTS=dir
import pw from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import os from 'node:os';
import { execFileSync } from 'node:child_process'; import { build } from 'vite';
const ROOT = path.resolve(new URL('..', import.meta.url).pathname), HARNESS = path.join(ROOT, 'tests/fixtures/shift/harness');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
console.log(`HEAD ${git('rev-parse', 'HEAD')}`); console.log(`git status --porcelain: ${git('status', '--porcelain') || '(clean)'}`);
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'shift-harness-')), SHOTS = path.resolve(process.env.SHOTS ?? 'artifacts/shift-browser');
await build({ configFile: path.join(ROOT, 'vite.config.ts'), root: HARNESS, base: './', publicDir: path.join(ROOT, 'public'), mode: 'qa', logLevel: 'warn', build: { outDir: OUT, emptyOutDir: true } });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const srv = http.createServer((rq, rs) => { const u = decodeURIComponent(new URL(rq.url, 'http://x').pathname); const f = path.join(OUT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(OUT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}/`;
fs.mkdirSync(SHOTS, { recursive: true });
const ENGINE = process.argv[2] ?? 'chromium';
const br = ENGINE === 'chromium' ? await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[ENGINE].launch();
let bad = 0, n = 0; const ok = (name, p, info = {}) => { n++; if (!p) bad++; console.log(`${p ? 'PASS' : 'FAIL'} [${ENGINE}] ${name} — ${JSON.stringify(info)}`); };
const VPS = [[360, 640, 328], [390, 844, 358], [1280, 800, 368]];
const NAMES1 = ['Refill, Market Hand', 'Refill, Coop Hand', 'Refill, Hawker', 'Rested, refill below 50%, Egg Grader'];
const NAMES0 = ['Next charge in progress, Market Hand', 'Next charge in progress, Coop Hand', 'Refill, Hawker', 'Rested, refill below 50%, Egg Grader'];
async function page(vw, vh, qs) {
  const ctx = await br.newContext({ viewport: { width: vw, height: vh } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); await p.goto(BASE + '?' + qs); await p.waitForFunction(() => window.__ready);
  await p.evaluate(() => document.fonts.ready); return { p, ctx, errs };
}
for (const [vw, vh, content] of VPS) for (const charges of [1, 0]) {
  const tag = `${vw}x${vh} charges=${charges}`;
  const { p, ctx, errs } = await page(vw, vh, `flags=rc2Refill&charges=${charges}`);
  await p.click('#opener'); await p.waitForSelector('.shift-sheet');
  const m = await p.evaluate(() => {
    const el = document.querySelector('.shift-sheet'), list = el.querySelector('.shift-list'), r = x => x.getBoundingClientRect();
    const rows = [...el.querySelectorAll('.shift-row')].map(row => { const a = row.querySelector('.shift-actions'), f = row.querySelector('.shift-refill'), s = row.querySelector('.shift-rest');
      const lbl = f.querySelector('.lbl'), sr = f.querySelector('.sr-in');
      return { id: row.dataset.worker, actions: Math.round(r(a).width * 100) / 100, refillW: r(f).width, refillH: r(f).height, restW: r(s).width, restH: r(s).height,
        gap: r(s).left - r(f).right, oneLine: r(lbl).height < 30, srIn: [r(sr).width, r(sr).height], fits: f.scrollWidth <= f.clientWidth,
        l1fits: row.querySelector('.shift-l1').scrollWidth <= row.querySelector('.shift-l1').clientWidth + 0.5, ariaLabel: f.hasAttribute('aria-label'), disabledAttr: f.hasAttribute('disabled') }; });
    const close = r(el.querySelector('.shift-close'));
    return { content: list.clientWidth, docked: el.classList.contains('docked'), sheetW: r(el).width, sheetRight: r(el).right, vw: innerWidth,
      close: [close.width, close.height], focus: document.activeElement?.id, rows };
  });
  ok(`${tag} content width = ${content}px (portrait 360→328, docked 400 column→368)`, Math.abs(m.content - content) <= 1, { content: m.content, sheetW: m.sheetW, docked: m.docked });
  ok(`${tag} docked iff 1280 landscape; docked column is 400px on the right`, m.docked === (vw >= 960) && (!m.docked || (Math.abs(m.sheetW - 400) < 1 && Math.abs(m.sheetRight - m.vw) < 1)), { docked: m.docked, sheetW: m.sheetW });
  ok(`${tag} RF-UI-13 action row ≤ content, Refill ≥253×48, Rest 44×44, gap 8, labels 1 line, no overflow`, m.rows.every(r => r.actions <= m.content + 0.5 && r.refillW >= 253 && r.refillH >= 48
    && Math.abs(r.restW - 44) < 0.5 && Math.abs(r.restH - 44) < 0.5 && Math.abs(r.gap - 8) < 0.5 && r.oneLine && r.fits && r.l1fits), m.rows.map(r => [r.id, r.refillW, r.refillH, r.actions, r.fits, r.l1fits]));
  ok(`${tag} constant Refill width across states (±0.5)`, Math.max(...m.rows.map(r => r.refillW)) - Math.min(...m.rows.map(r => r.refillW)) <= 0.5, m.rows.map(r => r.refillW));
  ok(`${tag} .sr-in renders 0×0; no aria-label / disabled attr`, m.rows.every(r => r.srIn[0] === 0 && r.srIn[1] === 0 && !r.ariaLabel && !r.disabledAttr), m.rows.map(r => r.srIn));
  ok(`${tag} ✕ is 44×44; focus on the opened worker's row heading`, m.close[0] === 44 && m.close[1] === 44 && m.focus === 'shift-h-coop_hand', { close: m.close, focus: m.focus });
  const want = charges ? NAMES1 : NAMES0, got = [];
  for (const nm of want) got.push(await p.getByRole('button', { name: nm, exact: true }).count());
  ok(`${tag} RF-UI-20 accessible names exact (Playwright accname)`, got.every(c => c === 1), { want, got });
  if (ENGINE === 'chromium') {
    const cdp = await ctx.newCDPSession(p); const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const names = nodes.filter(x => x.role?.value === 'button').map(x => x.name?.value);
    ok(`${tag} RF-UI-20 CDP AX names exact, no digits in 0-charge names`, want.every(w => names.includes(w)) && names.filter(x => x?.startsWith('Next charge')).every(x => !/\d/.test(x)), { names });
  }
  await p.screenshot({ path: path.join(SHOTS, `shift-${ENGINE}-${vw}x${vh}-c${charges}.png`) });
  await p.keyboard.press('Escape'); await p.waitForSelector('.shift-sheet', { state: 'detached' });
  ok(`${tag} close returns focus to the opener; no page errors`, await p.evaluate(() => document.activeElement?.id) === 'opener' && errs.length === 0, { errs });
  await ctx.close();
}
for (const qs of ['flags=', 'flags=autoRefill']) {
  const { p, ctx, errs } = await page(360, 640, qs); const before = await p.evaluate(() => document.getElementById('app').outerHTML);
  await p.click('#opener'); await p.waitForTimeout(300);
  const st = await p.evaluate(() => ({ sheet: !!document.querySelector('.shift-sheet'), css: !!document.getElementById('shift-sheet-css'), app: document.getElementById('app').outerHTML }));
  ok(`flag 0 (${qs}) RF-UI-1: no sheet, no sheet CSS, #app unchanged after opener tap`, !st.sheet && !st.css && st.app === before && errs.length === 0, { sheet: st.sheet, css: st.css });
  await ctx.close();
}
{ const { p, ctx } = await page(360, 640, 'flags=rc2Refill,autoRefill,abilities&charges=1'); await p.click('#opener'); await p.waitForSelector('.shift-sheet');
  const m = await p.evaluate(() => [...document.querySelectorAll('.shift-row')].map(row => { const r = x => x.getBoundingClientRect(), a = row.querySelector('.shift-auto'), bs = row.querySelector('.shift-boost'), f = row.querySelector('.shift-refill');
    return { auto: [r(a).width, r(a).height], boost: [r(bs).width, r(bs).height], refillW: r(f).width }; }));
  ok('360 autoRefill+abilities: Auto-refill row 304×52, Boost slot 44×44, Refill floor 253 kept (§16 action line untouched)', m.every(x => x.auto[0] === 304 && x.auto[1] === 52 && x.boost[0] === 44 && x.boost[1] === 44 && x.refillW >= 253), m);
  ok('360 autoRefill: switches named Auto-refill', await p.getByRole('switch', { name: 'Auto-refill' }).count() === 4);
  await p.screenshot({ path: path.join(SHOTS, `shift-${ENGINE}-360x640-auto-boost.png`) }); await ctx.close(); }
await br.close(); srv.close();
console.log(`v5-shift-sheet-browser [${ENGINE}] ${n - bad}/${n} checks pass`); process.exit(bad ? 1 : 0);
