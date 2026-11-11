// QA rerun @780b2d4: TG-UI-9 audio, focus ring contrast, 320px button, save_restore once-per-load. ENGINE=.. PORT=.. HEADED=1 node rc1-780-qa.mjs <worktree>
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const ROOT = process.argv[2], ENGINE = process.env.ENGINE ?? 'chromium', port = +(process.env.PORT ?? 4950);
const pw = createRequire(ROOT + '/package.json')('playwright-core');
try { await fetch(`http://127.0.0.1:${port}/`); console.error(`port ${port} already serving (stale server?) - refusing`); process.exit(3); } catch {} // served-bundle guard (98396ed)
const srv = spawn('npx', ['vite', 'preview', '--outDir', process.env.DIST ?? 'dist', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
for (let i = 0; i < 80; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
{ const _d = process.env.DIST ?? 'dist', _w = fs.readdirSync(`${ROOT}/${_d}/assets`).find(f => /^index-.*\.js$/.test(f)), _h = await (await fetch(`http://127.0.0.1:${port}/`)).text(); if (!_h.includes(_w)) { console.error(`served bundle is not ${_d}/${_w} - refusing`); process.exit(4); } }
const U = `http://127.0.0.1:${port}/`, fx = fs.readFileSync(ROOT + '/tests/fixtures/saves/m2-rc1-v5-40min.json', 'utf8');
const browser = await pw[ENGINE].launch({ headless: !process.env.HEADED, ...(ENGINE === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {}), ...(ENGINE === 'firefox' ? { firefoxUserPrefs: { 'media.autoplay.default': 0 } } : {}) });
const R = []; const ok = (n, p, i) => { R.push({ n, pass: !!p, i }); console.log(`${p ? 'PASS' : 'FAIL'} [${ENGINE}${process.env.HEADED ? ' headed' : ''}] ${n} — ${JSON.stringify(i)}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const INIT = () => { window.__a = { starts: 0, ctxs: [] }; const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) { const W = function (...a) { const c = new AC(...a); window.__a.ctxs.push(c); return c; }; W.prototype = AC.prototype; window.AudioContext = W; if (window.webkitAudioContext) window.webkitAudioContext = W;
    const S = AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start = function (...x) { window.__a.starts++; window.__a.lastState = this.context.state; return S.apply(this, x); }; } };
const UI = JSON.stringify({ onboardingDone: true, sessions: 3, workersIntroA: true, workersIntroB: true });
async function ctxNew(o = {}) { const c = await browser.newContext({ viewport: { width: 390, height: 844 }, ...o }); await c.addInitScript(INIT); return c; }
async function seed(c, raw = fx) { const p = await c.newPage(); await p.goto(U); await p.evaluate(([r, u]) => { localStorage.clear(); localStorage.setItem('eggfarm.save', r); localStorage.setItem('eggfarm.ui', u); }, [raw, UI]); await p.close(); }
async function start(p, nav = true) { if (nav) await p.goto(U); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm, null, { timeout: 15000 }); await p.waitForTimeout(600);
  const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) { await wb.click(); await p.waitForTimeout(200); } return p; }
const aud = p => p.evaluate(() => ({ starts: window.__a.starts, states: window.__a.ctxs.map(c => c.state), last: window.__a.lastState }));
const play = p => p.evaluate(async () => { window.eggfarm.state.coinsCents = 1e12; document.querySelector('nav [data-nav=upgrades]')?.click(); await new Promise(r => setTimeout(r, 200)); document.querySelector('button.buy[aria-disabled=false]')?.click(); await new Promise(r => setTimeout(r, 300)); });
const lum = c => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
{ const c = await ctxNew(); await seed(c); const A = await start(await c.newPage()); await play(A); const a0 = await aud(A);
  const B = await start(await c.newPage()); await A.waitForSelector('.recovery-layer.tab-guard', { timeout: 5000 });
  const n0 = await aud(A); await A.evaluate(() => { try { window.eggfarm.state.coinsCents = 1e12; } catch {} document.querySelectorAll('button').forEach(b => { if (b.id !== 'tgPlay') try { b.click(); } catch {} }); }); await A.keyboard.press('Escape'); await sleep(2000); const n1 = await aud(A);
  const fr = await A.evaluate(() => { const b = document.querySelector('#tgPlay'), cs = getComputedStyle(b); return { outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`, card: getComputedStyle(document.querySelector('.tab-guard [role=alertdialog]')).backgroundColor, focused: document.activeElement === b }; });
  const ratio = cr(fr.outline.match(/rgb[^)]*\)/)[0], fr.card);
  ok('Focus ring 3px solid, ≥3:1 vs card, on focused Play here', fr.focused && fr.outline.startsWith('3px solid') && ratio >= 3, { ...fr, ratio });
  ok('TG-UI-9a no audio while notice up (no new sound starts; AudioContext not running)', n1.starts === n0.starts && n1.states.every(s => s !== 'running'), { beforeNotice: a0, atNotice: n0, after2sAndInput: n1 });
  await A.click('#tgPlay'); await A.waitForLoadState('load'); await start(A, false); await play(A); await sleep(500); const p1 = await aud(A);
  ok('TG-UI-9b sound back after Play here (+Tap to start): context running and sfx start', p1.starts > 0 && p1.states.some(s => s === 'running'), p1); await c.close(); }
{ const c = await ctxNew({ viewport: { width: 320, height: 568 } }); await seed(c); const A = await start(await c.newPage()); await start(await c.newPage()); await A.waitForSelector('.recovery-layer.tab-guard');
  const r = await A.evaluate(() => { const b = document.querySelector('#tgPlay').getBoundingClientRect(), t = document.querySelector('.tab-guard h2'); return { btnH: b.height, wrapLines: Math.round(t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight)), trunc: t.scrollWidth > t.clientWidth + 1 }; });
  ok('320 px: Play here 48 px tall, title wraps not truncated', r.btnH >= 48 && !r.trunc, r); await c.close(); }
// save_restore once per load, only when copies differ
const sr = p => p.evaluate(() => { const t = JSON.parse(window.eggfarmExportTelemetry()); const a = Array.isArray(t) ? t : t.events ?? []; return a.filter(e => e.type === 'save_restore').map(e => e.source); });
{ const c = await ctxNew(); await seed(c); let A = await start(await c.newPage()); await sleep(800); const first = await sr(A); await A.close();
  A = await start(await c.newPage()); await sleep(500); const same = await sr(A); await A.evaluate(() => { window.eggfarm.state.coinsCents = 4242424242; window.eggfarm.save(); }); await sleep(800); await A.close();
  let p = await c.newPage(); await p.goto(U); await p.evaluate(() => { localStorage.setItem('eggfarm.save', '{{bad'); localStorage.removeItem('eggfarm.lease'); }); A = await start(p, false).catch(async () => start(p)); await sleep(500); const corrupt = await sr(A); const coins = await A.evaluate(() => window.eggfarm.state.coinsCents); await A.close();
  A = await start(await c.newPage()); await sleep(500); const next = await sr(A); await A.close();
  // LS newer than IDB: write LS directly with a newer valid save while IDB holds the old one
  p = await c.newPage(); await p.goto(U); await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('eggfarm.save')); localStorage.setItem('eggfarm.save', JSON.stringify({ version: d.version, savedAt: Date.now() + 5000, state: d.state })); localStorage.removeItem('eggfarm.lease'); });
  A = await start(p); await sleep(500); const lsNewer = await sr(A);
  const cum = JSON.stringify([first, same, corrupt, next, lsNewer]);
  ok('save_restore exactly once per load and only when copies differ (fresh seed / identical / LS corrupt / identical / LS newer)', cum, { first, same, corrupt, coinsRestored: coins, next, lsNewer }); await c.close(); }
await browser.close(); try { process.kill(-srv.pid); } catch {} fs.writeFileSync(process.env.OUT ?? '/tmp/x.json', JSON.stringify(R, null, 1)); process.exit(0);
