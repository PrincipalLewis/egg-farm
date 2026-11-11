// v5 Saves lane shared helpers (Saves QA 33ec1b55, prep 2026-10-29). Black-box: works on any single-file egg-farm.html.
// Rules: ports 5961-5964 only, never :4173; the caller holds `flock .browser-test.lock`; kills only the server PID it started.
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import { mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto'; import path from 'node:path';
// Own pinned node_modules (qa/v5-saves/tools, playwright-core 1.64.1 = firefox-1555 / webkit-2370 in ~/.cache/ms-playwright).
// The old default (qa/wt-rc1-5d9efa6) had lost its node_modules and silently resolved a global 1.59.1 (firefox-1511, not installed): now asserted.
const NM = process.env.PW_FROM ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), '../tools/package.json');
const PW_VERSION = createRequire(NM)('playwright-core/package.json').version;
if (PW_VERSION !== '1.64.1') throw new Error(`playwright-core ${PW_VERSION} resolved from ${NM}; expected 1.64.1`);
export const pw = createRequire(NM)('playwright-core');
export const sha256 = b => createHash('sha256').update(b).digest('hex');
export const PORTS = [5961, 5962, 5963, 5964];
export function assertPort(p) { if (!PORTS.includes(+p)) throw new Error(`port ${p} not in 5961-5964`); return +p; }
/** Serve `files` ({name: srcPath}) from a fresh dir with python http.server on 127.0.0.1:port. Adds blank.txt + empty favicon.ico (no 404 noise). */
export async function serve(dir, files, port) {
  assertPort(port); mkdirSync(dir, { recursive: true });
  for (const [n, src] of Object.entries(files)) copyFileSync(src, path.join(dir, n));
  writeFileSync(path.join(dir, 'blank.txt'), 'blank\n'); writeFileSync(path.join(dir, 'favicon.ico'), '');
  // Port must be FREE first: a stale listener (e.g. a leaked earlier server) would otherwise answer with the wrong directory.
  try { await fetch(`http://127.0.0.1:${port}/`); throw new Error(`port ${port} already has a listener; refusing to serve (find and stop it first)`); } catch (e) { if (/already has a listener/.test(e.message)) throw e; }
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: dir, stdio: 'ignore' });
  const kill = () => { try { srv.kill('SIGTERM'); } catch {} }; process.once('exit', kill); // never leak the server if the caller crashes
  let up = false; for (let i = 0; i < 40 && !up; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/blank.txt`); up = r.ok && (await r.text()) === 'blank\n'; } catch { await new Promise(r => setTimeout(r, 150)); } }
  for (const n of Object.keys(files)) { const r = await fetch(`http://127.0.0.1:${port}/${n}`).catch(() => null); if (!r || !r.ok) { kill(); throw new Error(`server on ${port} does not serve ${n} (status ${r?.status})`); } await r.arrayBuffer(); }
  return { url: `http://127.0.0.1:${port}/`, pid: srv.pid, stop: () => new Promise(r => { process.removeListener('exit', kill); srv.once('exit', r); srv.kill('SIGTERM'); setTimeout(r, 2000); }) };
}
/** Serve an existing build dir (e.g. dist-qa) in place, read-only, with the same free-port / no-leak rules as serve(). */
export async function serveDir(dir, port) {
  assertPort(port); try { await fetch(`http://127.0.0.1:${port}/`); throw new Error(`port ${port} already has a listener; refusing to serve`); } catch (e) { if (/already has a listener/.test(e.message)) throw e; }
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: dir, stdio: 'ignore' }); const kill = () => { try { srv.kill('SIGTERM'); } catch {} }; process.once('exit', kill);
  let up = false; for (let i = 0; i < 40 && !up; i++) { try { up = (await fetch(`http://127.0.0.1:${port}/index.html`)).ok; } catch { await new Promise(r => setTimeout(r, 150)); } }
  if (!up) { kill(); throw new Error(`serveDir ${dir} on ${port}: index.html not served`); }
  return { url: `http://127.0.0.1:${port}/index.html`, pid: srv.pid, stop: () => new Promise(r => { process.removeListener('exit', kill); srv.once('exit', r); srv.kill('SIGTERM'); setTimeout(r, 2000); }) };
}
export async function launch(engine) {
  if (engine === 'chromium') return pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  if (!['firefox', 'webkit'].includes(engine)) throw new Error('engine ' + engine); return pw[engine].launch();
}
/** Collect page errors, console errors and HTTP >= 400 into sink. */
export function watch(page, sink, tag = '') {
  page.on('pageerror', e => sink.push({ tag, t: 'pageerror', m: String(e) }));
  page.on('console', m => m.type() === 'error' && sink.push({ tag, t: 'console.error', m: m.text(), url: page.url(), loc: m.location()?.url }));
  page.on('response', r => r.status() >= 400 && sink.push({ tag, t: 'http' + r.status(), m: r.url() }));
}
/** Seed localStorage keys once per context (sessionStorage guard so reloads don't re-seed). kv: {key: string|null}. */
export const seedLS = (page, kv) => page.addInitScript(o => { if (sessionStorage.getItem('__seeded')) return; for (const [k, v] of Object.entries(o)) { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } sessionStorage.setItem('__seeded', '1'); }, kv);
export const ids = page => page.evaluate(() => ({ meta: document.querySelector('meta[name="build-id"]')?.content ?? null, app: document.getElementById('app')?.dataset.buildId ?? null, dirty: /\+dirty/.test(document.documentElement.outerHTML) }));
export const ui = page => page.evaluate(() => ({ coins: document.getElementById('coins')?.textContent ?? null, basket: document.getElementById('basket')?.textContent ?? null,
  recovery: !!document.querySelector('.recovery-card, .recovery-layer'), recoveryOutcome: document.querySelector('.recovery-layer')?.dataset.outcome ?? null,
  welcome: !!document.querySelector('#wbT'), welcomeText: document.querySelector('#wbT')?.parentElement?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
  newer: !!document.querySelector('.newer-save, [data-newer]'), guardBlocked: /another tab|open in another/i.test(document.body.innerText) }));
export const lsDump = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('eggfarm')).sort().map(k => [k, localStorage.getItem(k)])));
export const rawSave = page => page.evaluate(() => localStorage.getItem('eggfarm.save'));
export async function start(page) { await page.getByText('Tap to start').click({ timeout: 15000 }); await page.waitForTimeout(800); }
export async function skipOnb(page) { if (await page.locator('.onb-skip').count()) await page.locator('.onb-skip').click().catch(() => {}); }
export async function closeSheet(page) { const c = page.locator('.sheet:not([hidden]) .close'); if (await c.count()) await c.first().click().catch(() => {}); await page.waitForTimeout(150); }
/** Core loop via UI only: n collect taps, Sell all, buy up to `buys` affordable upgrades. */
export async function dismissWelcome(page, waitMs = 1500) { const t0 = Date.now(); while (Date.now() - t0 < waitMs) { if (await page.locator('#wbCollect').count()) { await page.locator('#wbCollect').click().catch(() => {}); await page.waitForTimeout(300); return true; } await page.waitForTimeout(150); } return false; }
export async function play(page, { taps = 24, gapMs = 400, buys = 1 } = {}) {
  await dismissWelcome(page, 1200);
  for (let i = 0; i < taps; i++) { await page.locator('#collect').click({ force: true }); await page.waitForTimeout(gapMs); }
  await page.locator('[data-nav=market]').click(); await page.waitForTimeout(300);
  const sa = page.locator('#sellAll'); const sellLabel = await sa.textContent(); if (await sa.getAttribute('aria-disabled') !== 'true') await sa.click(); await page.waitForTimeout(400); await closeSheet(page);
  let bought = 0; if (buys) { await page.locator('[data-nav=upgrades]').click(); await page.waitForTimeout(300);
    for (const tab of ['collection', 'farm', null]) { if (tab && await page.locator(`#p-upgrades [data-tab=${tab}]`).count()) { await page.locator(`#p-upgrades [data-tab=${tab}]`).click(); await page.waitForTimeout(200); }
      const b = page.locator('#p-upgrades .btn.buy.affordable[data-kind]'); for (let i = 0; bought < buys && i < buys && await b.count(); i++) { await b.first().click(); bought++; await page.waitForTimeout(250); } if (bought >= buys) break; }
    await closeSheet(page); }
  return { sellLabel, bought };
}
/** Wait until eggfarm.save differs from `prev` (a write happened) or timeout; returns the raw save. */
export async function waitSave(page, prev, ms = 7000) { const t0 = Date.now(); let r; while (Date.now() - t0 < ms) { r = await rawSave(page); if (r && r !== prev) return r; await page.waitForTimeout(150); } return r; }
// ---- save model -------------------------------------------------------------------------------------------------
/** Keys that live sim / offline may legitimately change between "before" and "after" a load. Everything else is INVARIANT. */
export const VOLATILE = [
  /^coinsCents$/, /^coop$/, /^basket$/, /^pendingOfflineEggs$/, /^customers(\.|$)/, /^nextCustomerInS$/, /^nextCustomerId$/, /^rng$/, /^coopFullS$/, /^manageCdS$/,
  /^wageFracCents(\.|$)/, /^workers\.[^.]+\.(energy|cdS|mood|unpaid|state|tiredS|asleepS|wageOwedCents|.*Ms|.*S)$/,
  /^celebrated(Tier|Milestones)(\.|$)/,
  // M5.0 / M5.1 timers and counters (m5.0-sizing F2, breeds §6): ticked by the sim, clamped on load
  /^tc(\.|$)/, /^streak(\.|$)/, /^streakBest$/, /^frenzyEndAt$/, /^nextSpawnRemainingS$/, /^broodyNestCents$/, /^broodyHenIdx$/,
  /^abilities\.[^.]+\.readyAt$/, /^charges?(\.|$)/, /^refill(\.|$)/, /^breeds\.(incubator\.remainingMs|settleMs(\.|$)|sinceUnlockMs|rng)$/,
];
export const isVolatile = p => VOLATILE.some(r => r.test(p));
/** Flatten an object to dotted leaf paths (arrays indexed). */
export function flat(o, pre = '', out = {}) { if (o && typeof o === 'object') { const ks = Object.keys(o); if (!ks.length) out[pre] = Array.isArray(o) ? [] : {}; for (const k of ks) flat(o[k], pre ? `${pre}.${k}` : k, out); } else out[pre] = o; return out; }
export function parseSave(raw) { try { return JSON.parse(raw); } catch { return null; } }
export const M5_KEYS = ['tc', 'streakBest', 'abilities', 'abilitiesCoachSeen', 'abilitiesUnlocked', 'broodyNestCents', 'broodyHenIdx', 'frenzyEndAt', 'nextSpawnRemainingS', 'breeds', 'zeroGain'];
export function summary(raw) {
  const j = parseSave(raw); const s = j?.state ?? {}; const w = s.workers ?? {};
  return { version: j?.version ?? null, savedAt: j?.savedAt ?? null, saveSeq: j?.saveSeq ?? null, coinsCents: s.coinsCents, basket: s.basket, coop: s.coop, pendingOfflineEggs: s.pendingOfflineEggs,
    eggsTotal: (+s.basket || 0) + (+s.coop || 0) + (+s.pendingOfflineEggs || 0), farmLevel: s.farmLevel, collectionLevel: s.collectionLevel, hensLevel: s.hensLevel, eggValueLevel: s.eggValueLevel,
    graderTier: s.graderTier, tracksV7: s.tracksV7, workers: Object.keys(w).sort(), workersPaused: Object.fromEntries(Object.entries(w).filter(([, v]) => v && 'paused' in v).map(([k, v]) => [k, v.paused])),
    m5: Object.fromEntries(M5_KEYS.filter(k => k in s).map(k => [k, s[k]])), stateKeys: Object.keys(s).sort() };
}
/**
 * No-loss oracle. before/after are raw save strings. Rules (case doc §2):
 *  N1 version === expectVersion (default 6); N2 every INVARIANT leaf of before is identical in after;
 *  N3 no before key path disappears (volatile included, except customers[] entries); N4 coins >= before - coinSlack;
 *  N5 eggsTotal >= before - eggSlack (workers can sell: slack documented); N6 levels/workers/graderTier/M5 invariants covered by N2.
 *  `allowAdded` (e.g. M4/M5 migration defaults) never fails; additions are reported.
 */
export function noLoss(beforeRaw, afterRaw, { expectVersion = 6, coinSlackPct = 0.01, coinSlackAbs = 100, eggSlackPct = 0.01, eggSlackAbs = 50, ignore = [] } = {}) {
  const b = parseSave(beforeRaw), a = parseSave(afterRaw); const r = { pass: true, fails: [], notes: [] };
  if (!b || !a) return { pass: false, fails: ['unparseable save'], notes: [] };
  const fail = m => { r.pass = false; r.fails.push(m); };
  if (a.version !== expectVersion) fail(`N1 version ${a.version} != ${expectVersion}`);
  const fb = flat(b.state ?? {}), fa = flat(a.state ?? {});
  for (const [p, v] of Object.entries(fb)) {
    if (ignore.some(x => (x instanceof RegExp ? x.test(p) : x === p))) continue;
    if (/^customers\./.test(p)) continue;
    if (!(p in fa)) { const parent = Object.keys(fa).some(k => k.startsWith(p + '.')); if (!parent) fail(`N3 dropped ${p}`); continue; }
    if (!isVolatile(p) && JSON.stringify(fa[p]) !== JSON.stringify(v)) fail(`N2 ${p}: ${JSON.stringify(v)} -> ${JSON.stringify(fa[p])}`);
  }
  const sb = summary(beforeRaw), sa = summary(afterRaw);
  if (sa.coinsCents < sb.coinsCents - Math.max(coinSlackAbs, sb.coinsCents * coinSlackPct)) fail(`N4 coins ${sb.coinsCents} -> ${sa.coinsCents}`);
  if (sa.eggsTotal < sb.eggsTotal - Math.max(eggSlackAbs, sb.eggsTotal * eggSlackPct)) fail(`N5 eggs ${sb.eggsTotal} -> ${sa.eggsTotal}`);
  r.added = Object.keys(fa).filter(p => !(p in fb) && !/^customers\./.test(p) && !Object.keys(fb).some(k => p.startsWith(k + '.'))).slice(0, 60);
  r.delta = { coinsCents: sa.coinsCents - sb.coinsCents, eggsTotal: sa.eggsTotal - sb.eggsTotal, pendingOfflineEggs: (sa.pendingOfflineEggs ?? 0) - (sb.pendingOfflineEggs ?? 0) };
  r.before = sb; r.after = sa; return r;
}
export function writeJSON(f, o) { mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(o, null, 2)); }
export const readText = f => readFileSync(f, 'utf8');
