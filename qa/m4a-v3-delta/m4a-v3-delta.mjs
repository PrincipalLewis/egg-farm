// m4-design §3a @96e895b: backup in LS eggfarm.save.v6_backup AND IDB eggfarm/save/v6_backup; either failing aborts the migration (ADR M4-12),
//   emits save_migration_aborted {store}, saves plain v6 (no tracksV7), retries next load. D1 modes: stub (LS setItem throws), quota (LS full), idb (IDB put throws).
// @f1869c4 ADR M4-15: v6_backup = {migrationId, raw}, committed only if migrationId === state.v6BackupId; else orphan (D4). M4-16 LS readback before in-place write.
// m4a-spec v1.7 (FINAL, HoP 21:59): (1) unavailable [no_global|security|blocked] -> LS-only + readback; (2) deferred [open no answer by IDB_TIMEOUT_MS=1500, other open failure, read failure] -> v6 byte-identical,
//   save_migration_aborted {reason, attempt_count} x1/load, attempts 1,2,3(+stuck_on_v6), reset on success (G, D1-attempts); (3) abort (h) [write fails, write hangs > IDB_HANG_MS=1500, readback_mismatch] (H, RB).
//   Confirmed 22:03: ATTEMPTS_KEY=eggfarm.save.migration_attempts (integer; Reset clears, commit removes, refusal never writes), one 1500 ms limit for open+write (write -> idb_write_timeout), only deferrals count.
// m4a-spec v1.8 (HoP 22:04, N8): S5 boot grant x1.0 = 19,800 then 24,750 (M4A-30); EXP explainer at in-session commit (M4A-33); D4/H orphan rules (M4A-31(i)): only the next migration overwrites an orphan.
// m4a-spec v1.10 (HoP 22:13, ADR M4-24): (f)1 IDB-write row (D1-idb), (h) IDB rows + idb_write_timeout (H), (i) {migrationId, raw} record/orphans (D4) -> PENDING-S4 unless S4=1; (j) QH; (k) explicit zero-IDB-write rows (D2/G/QH/MC/RB), readwrite tx logged.
// cf66ce5 (design v0.3.1) + m4a-spec v1.9: blocked -> deferral idb_blocked; path-1 reasons no_global|security; deferral session = zero IDB writes (autosave+flush); §3d/ADR M4-24 LS-only commit after LS v6_backup readback else readback_mismatch; quota_headroom (QH); mirror resumes only after readback (D2); idb_main_changed (MC); IDB orphan seeds (D4); H = S-4 (PENDING-S4 unless S4=1); D1-attempts 1,2,3,4 then commit.
// m4a-spec v1.12 (HoP): every failed attempt (abort or deferral) increments attempts, cap 3 (1,2,3,3)+stuck_on_v6; idb_main_changed = [deferral]; AC (h)6 -> AH6.
// m4a-spec v1.14 (HoP): OFF = M4A-4(r4) offline grant from economy.csv (fixed fake clock); MG3A = M4A-30 r3a single x1.0 grant on every path; MG3B = r3b crash (fake KV kill) tests.
// M4-A v3 delta check: v6_backup write-failure fix (abort migration, stay v6) + normal path + downgrade. Saves QA, 2026-10-16.
// Usage: ENGINE=chromium|firefox|webkit PORT=4400 HTML=<single-file build.html> EXPECT_BUILD=<sha7[+m4on]> \
//        [DOWN_HTML=<a01faea asset>] [DOWN_BUILD=a01faea] [OUT=dir] [ONLY=D1,D2,D3] node m4a-v3-delta.mjs
// Serves HTML at / and DOWN_HTML at /down.html from a tiny node http server on PORT (refuses 4173 / busy port).
import { createRequire } from 'node:module'; import fs from 'node:fs'; import http from 'node:http'; import crypto from 'node:crypto';
const L = await import('/workspace/egg-farm-studio/qa/m3-scripts/m4-guard-lib.mjs'); const DL = await import('./delta-lib.mjs');
const env = process.env, ENGINE = env.ENGINE ?? 'chromium', PORT = +env.PORT, HTML = env.HTML, EXPECT = env.EXPECT_BUILD;
const DOWN_HTML = env.DOWN_HTML ?? '/workspace/egg-farm-studio/qa/m3-recheck/m4-guard-baseline-a01faea/dist-asset/index.html', DOWN_BUILD = env.DOWN_BUILD ?? 'a01faea';
const OUT = env.OUT ?? `/workspace/egg-farm-studio/qa/m4a-v3-delta/evidence/${EXPECT}`, ONLY = (env.ONLY ?? 'D1,D2,D3,D4,G,H,RB,ATT,S5,EXP,QH,MC,AH6,OFF,MG3A,MG3B').split(',');
const FX = '/workspace/egg-farm-studio/qa/m3-fixtures/saves/', SMOKE = '/workspace/egg-farm-studio/qa/m3-recheck/m4a-v3-677317d-smoke/';
const BK = 'eggfarm.save.v6_backup', SK = 'eggfarm.save';
if (!Number.isInteger(PORT) || PORT === 4173) { console.error('PORT required, never 4173'); process.exit(2); }
if (!EXPECT) { console.error('EXPECT_BUILD required'); process.exit(2); } if (!HTML || !fs.existsSync(HTML)) { console.error('HTML path required'); process.exit(2); }
try { await fetch(`http://127.0.0.1:${PORT}/`); console.error(`port ${PORT} busy - refusing`); process.exit(3); } catch {}
const sha = b => crypto.createHash('sha256').update(b).digest('hex'), files = { '/': fs.readFileSync(HTML), '/down.html': fs.readFileSync(DOWN_HTML) };
const srv = http.createServer((q, r) => { const b = files[q.url.split('?')[0]]; if (!b) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); r.end(b); });
await new Promise(r => srv.listen(PORT, '127.0.0.1', r)); const U = `http://127.0.0.1:${PORT}/`; fs.mkdirSync(OUT, { recursive: true });
console.log(`HTML ${HTML} sha256 ${sha(files['/'])}; DOWN ${DOWN_HTML} sha256 ${sha(files['/down.html'])}`);
const pw = createRequire('/workspace/egg-farm-studio/game/package.json')('playwright-core');
const br = await (ENGINE === 'chromium' ? pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : pw[ENGINE].launch());
const R = []; const ok = (n, p, i) => { R.push({ n, pass: !!p, i }); console.log(`${p ? 'PASS' : 'FAIL'} [${ENGINE}] ${n} — ${JSON.stringify(i).slice(0, 700)}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UI = JSON.stringify({ onboardingDone: true, sessions: 3, seenSlots: 99, workersIntroA: true, workersIntroB: true });
// INIT (browser): seed once per context, sequence-log every backup/save access, optional failure modes. Fake IDB via indexedDB.open wrapper; timing via page.clock (fake clock).
const INIT = ([raw, ui, mode, extra, idbDelay, kill]) => {
  if (location.search.includes('qa=seedidb')) return; // IDB seeding page: no fakes, no LS seed
  window.__bk = []; window.__sv = []; window.__ibk = []; window.__seq = []; window.__idbW = []; let n = 0; const S = Storage.prototype.setItem, G = Storage.prototype.getItem;
  const H = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0') + ':' + t.length; };
  if (!localStorage.getItem('qa.seeded')) { localStorage.clear(); if (raw) S.call(localStorage, 'eggfarm.save', raw); S.call(localStorage, 'eggfarm.ui', ui); for (const [k, v] of extra ?? []) S.call(localStorage, k, v); S.call(localStorage, 'qa.seeded', '1');
    if (mode === 'quota' || mode === 'quota-tight' || mode === 'quota-roomy') { let i = 0, sz = 1 << 20; const ch = s => 'x'.repeat(s); while (sz >= 256) { try { S.call(localStorage, 'qa.fill.' + i, ch(sz)); i++; } catch { sz >>= 1; } }
      const free = mode === 'quota-tight' ? 16384 : mode === 'quota-roomy' ? 4 * raw.length + 192 * 1024 : Math.ceil(raw.length * 0.5); /* tight: < 3 save copies + 64 KiB margin (§3d-1) */ for (let k = i - 1; k >= 0; k--) { const v = localStorage.getItem('qa.fill.' + k); if (v.length >= free) { S.call(localStorage, 'qa.fill.' + k, v.slice(0, v.length - free)); break; } } S.call(localStorage, 'qa.fillCount', String(i)); } }
  { const o = G.call(localStorage, 'qa.mode'); if (o != null) mode = o === 'none' ? null : o; } window.__tel0 = G.call(localStorage, 'eggfarm.telemetry'); window.__dead = false; // v1.14: per-load mode override + telemetry baseline
  const armed = !!kill && !G.call(localStorage, 'qa.killed'); const die = why => { window.__dead = true; S.call(localStorage, 'qa.killed', why); window.__seq.push({ n: n++, op: 'KILL', why }); };
  { const RM = Storage.prototype.removeItem; Storage.prototype.removeItem = function (k) { if (window.__dead && !String(k).startsWith('qa.')) return; return RM.call(this, k); }; }
  Storage.prototype.setItem = function (k, v) { v = String(v); if (window.__dead && !String(k).startsWith('qa.')) return; // r3b fake KV: process is dead, nothing else persists
    if (armed && kill === 'first-save' && k === 'eggfarm.save') { die('before first eggfarm.save write'); return; }
    if (k === 'eggfarm.save.v6_backup') { window.__bk.push({ len: v.length }); window.__seq.push({ n: n++, op: 'bk.set', v: v.slice(0, 60) }); if (mode === 'stub') throw new DOMException('QA stub: backup write refused', 'QuotaExceededError'); }
    if (k === 'eggfarm.save') { window.__sv.push({ len: v.length }); let id = null, mk = false; try { const s = JSON.parse(v).state; id = s.v6BackupId ?? null; mk = s.tracksV7 === 1; } catch {} window.__seq.push({ n: n++, op: 'save.set', marked: mk, v6BackupId: id, h: H(v) }); if (mode === 'commit-fail' && mk) throw new DOMException('QA fake: commit write failed', 'QuotaExceededError'); }
    if (armed && ((kill === 'after-first-save' && k === 'eggfarm.save') || (kill === 'bk' && k === 'eggfarm.save.v6_backup') || (kill === 'commit' && k === 'eggfarm.save' && /"tracksV7":1/.test(v)))) { const r = S.call(this, k, v); die(`after ${k} write (${kill})`); return r; }
    return S.call(this, k, v); };
  Storage.prototype.getItem = function (k) { let r = G.call(this, k); if (mode === 'rb-mismatch' && k === 'eggfarm.save.v6_backup' && r) { try { const o = JSON.parse(r); o.migrationId = 'ffffffffffffffff'; r = JSON.stringify(o); } catch {} }
    if (k === 'eggfarm.save.v6_backup') { let id = null; try { id = JSON.parse(r)?.migrationId ?? null; } catch {} window.__seq.push({ n: n++, op: 'bk.get', migrationId: id, present: r !== null }); }
    if (k === 'eggfarm.save' && r) window.__seq.push({ n: n++, op: 'save.get', h: H(r) });
    if (k === 'eggfarm.save.headroom_probe') window.__seq.push({ n: n++, op: 'probe.get' }); return r; };
  // IDB writes: count all (zero-writes assertion in (g)); (h) makes the v6_backup write fail with a QuotaExceededError / UnknownError on the transaction.
  { const TX = IDBDatabase.prototype.transaction; IDBDatabase.prototype.transaction = function (st, mode, ...r) { if (mode === 'readwrite' || mode === 'versionchange') { window.__idbW.push({ op: 'tx.rw', store: String(st) }); window.__seq.push({ n: n++, op: 'idb.tx.rw', key: String(st) }); } return TX.call(this, st, mode, ...r); }; }
  for (const m of ['put', 'add', 'delete', 'clear']) { const P = IDBObjectStore.prototype[m]; IDBObjectStore.prototype[m] = function (...a) { const k = m === 'put' || m === 'add' ? a[1] : a[0]; window.__idbW.push({ op: m, store: this.name, key: String(k) }); window.__seq.push({ n: n++, op: 'idb.' + m, key: String(k) });
    if (k === 'v6_backup' && (m === 'put' || m === 'add')) { window.__ibk.push({ op: m }); window.__seq.push({ n: n++, op: 'idb.bk.' + m });
      if (mode === 'idb-hang') { const tx = this.transaction, r = P.apply(this, a); try { Object.defineProperty(tx, 'oncomplete', { set() {}, get() { return null; } }); const AE = tx.addEventListener.bind(tx); tx.addEventListener = (t, f, o) => t === 'complete' ? undefined : AE(t, f, o); } catch {} return r; } // completion swallowed: write 'hangs'
      if (mode === 'idb-quota' || mode === 'idb-error' || mode === 'idb') { const tx = this.transaction, err = new DOMException('QA fake IDB write failure', mode === 'idb-quota' ? 'QuotaExceededError' : 'UnknownError'); const r = P.apply(this, a);
        try { Object.defineProperty(tx, 'error', { get: () => err }); Object.defineProperty(r, 'error', { get: () => err }); tx.abort(); } catch {} return r; } }
    return P.apply(this, a); }; }
  // (g) fake IDB availability: blocked / open_failed / timeout (open never settles) / delay (settles after idbDelay ms of the fake clock)
  if (mode === 'idb-none') { try { delete window.indexedDB; } catch {} try { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); } catch {} }
  // idb_main_changed (§3c step 3): the commit's RE-READ of IDB main (2nd+ get of 'main') returns a newer-by-rank copy, or fails
  if (mode === 'idb-main-newer' || mode === 'idb-main-fail') { const Gm = IDBObjectStore.prototype.get; let gets = 0; IDBObjectStore.prototype.get = function (k) { const r = Gm.call(this, k); if (k === 'main' && ++gets >= 2) { window.__seq.push({ n: n++, op: 'idb.main.reread', mode });
      if (mode === 'idb-main-fail') { const tx = this.transaction, err = new DOMException('QA fake re-read failure', 'UnknownError'); try { Object.defineProperty(r, 'error', { get: () => err }); tx.abort(); } catch {} }
      else r.addEventListener('success', () => { const v = r.result; if (typeof v !== 'string') return; const m = v.match(/^\{"version":(\d+),"savedAt":(\d+),"sum":"[0-9a-f]{8}","state":([\s\S]*)\}$/); if (!m) return;
        const st = m[3]; let h = 0x811c9dc5; for (let i = 0; i < st.length; i++) { h ^= st.charCodeAt(i); h = Math.imul(h, 0x01000193); } const nv = `{"version":${m[1]},"savedAt":${+m[2] + 3600e3},"sum":"${(h >>> 0).toString(16).padStart(8, '0')}","state":${st}}`; Object.defineProperty(r, 'result', { get: () => nv }); }, { capture: true }); } return r; }; }
  if (mode === 'idb-read_error') { const Gt = IDBObjectStore.prototype.get; IDBObjectStore.prototype.get = function (k) { const r = Gt.call(this, k); if (k === 'v6_backup') { const tx = this.transaction, err = new DOMException('QA fake IDB read failure', 'UnknownError'); try { Object.defineProperty(r, 'error', { get: () => err }); Object.defineProperty(tx, 'error', { get: () => err }); tx.abort(); } catch {} } return r; }; }
  if (/^idb-(blocked|open_failed|security|invalidstate|timeout|delay)$/.test(mode ?? '')) { const O = IDBFactory.prototype.open; const kind = mode.slice(4);
    IDBFactory.prototype.open = function (...a) { if (kind === 'open_failed') throw new DOMException('QA fake: open failed', 'UnknownError'); if (kind === 'security') throw new DOMException('QA fake: private mode', 'SecurityError'); if (kind === 'invalidstate') throw new DOMException('QA fake: private mode', 'InvalidStateError');
      const fake = new EventTarget(); let onS = null, onE = null, onB = null; Object.defineProperties(fake, { onsuccess: { set(f) { onS = f; }, get() { return onS; } }, onerror: { set(f) { onE = f; }, get() { return onE; } }, onblocked: { set(f) { onB = f; }, get() { return onB; } }, onupgradeneeded: { set() {}, get() { return null; } }, result: { get: () => fake.__res }, error: { get: () => fake.__err }, readyState: { get: () => fake.__res ? 'done' : 'pending' } });
      if (kind === 'blocked') setTimeout(() => { const e = new Event('blocked'); onB?.(e); fake.dispatchEvent(e); fake.__err = new DOMException('QA fake: blocked', 'InvalidStateError'); const er = new Event('error'); onE?.(er); fake.dispatchEvent(er); }, 0);
      if (kind === 'delay') { const real = O.apply(this, a); real.onupgradeneeded = ev => { const db = real.result; if (!db.objectStoreNames.contains('save')) db.createObjectStore('save'); };
        real.onsuccess = () => setTimeout(() => { fake.__res = real.result; const e = new Event('success'); onS?.(e); fake.dispatchEvent(e); }, idbDelay); real.onerror = () => { fake.__err = real.error; const e = new Event('error'); onE?.(e); fake.dispatchEvent(e); }; }
      return fake; }; } // 'timeout': never settles
};
const seedIdbCtx = async (c, entries) => { const p = await c.newPage(); await p.goto(U + '?qa=seedidb'); await p.evaluate(e => new Promise((res, rej) => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('save')) r.result.createObjectStore('save'); };
  r.onsuccess = () => { const tx = r.result.transaction('save', 'readwrite'); for (const [k, v] of e) tx.objectStore('save').put(v, k); tx.oncomplete = () => { r.result.close(); res(); }; tx.onerror = () => rej(tx.error); }; r.onerror = () => rej(r.error); }), entries); await p.close(); };
const idbGet = (p, key) => p.evaluate(k => new Promise(res => { const r = indexedDB.open('eggfarm'); r.onerror = () => res(null); r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('save')) { db.close(); return res(null); } const g = db.transaction('save').objectStore('save').get(k); g.onsuccess = () => { db.close(); res(g.result ?? null); }; g.onerror = () => { db.close(); res(null); }; }; }), key);
async function open(ctx, path = '') { const p = await ctx.newPage(), msgs = []; p.on('console', m => msgs.push({ type: m.type(), text: m.text().slice(0, 300) })); p.on('pageerror', e => msgs.push({ type: 'pageerror', text: String(e).slice(0, 300) }));
  await p.goto(U + path); await p.getByText('Tap to start').click({ timeout: 15000 }); await p.waitForTimeout(1500);
  for (const s of ['#wbCollect', '.recovery-layer .btn', '.modal button.btn']) { const l = p.locator(s).first(); if (await l.isVisible().catch(() => false)) { await l.click().catch(() => {}); await p.waitForTimeout(300); } } return { p, msgs }; }
async function ctxFor(raw, mode = null, extra = [], idbDelay = 0, kill = null) { const c = await br.newContext({ viewport: { width: 390, height: 844 } }); await c.addInitScript(INIT, [raw, UI, mode, extra, idbDelay, kill]); return c; }
const lsAll = p => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith('qa.fill.')) o[k] = localStorage.getItem(k); } return o; });
const forceSave = p => p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })); Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); });
const parse = raw => { try { const d = JSON.parse(raw); return { version: d.version, savedAt: d.savedAt, F: d.state.farmLevel, C: d.state.collectionLevel, H: d.state.hensLevel, V: d.state.eggValueLevel, coins: d.state.coinsCents, refund: d.state.migrationRefundCents ?? 0, tracksV7: d.state.tracksV7 }; } catch (e) { return { err: String(e) }; } };
const telem = p => p.evaluate(() => { try { return window.eggfarmExportTelemetry(); } catch { return null; } });
const errs = msgs => msgs.filter(m => m.type === 'error' || m.type === 'pageerror');
async function buildId(p, want) { await p.locator('#settings').click(); await p.waitForTimeout(700); const t = await p.evaluate(() => document.body.innerText); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const id = (t.match(/m3-rc1[^\s]*/) || [null])[0]; return { id, ok: !!id && id.includes(want) }; }
const fx = n => fs.readFileSync(FX + n + '.json', 'utf8'), EXP = JSON.parse(fs.readFileSync(SMOKE + 'expected-migration.json', 'utf8'));
const SAVES = { 'm1-rc2-v4-12min': fx('m1-rc2-v4-12min'), 'm2-rc1-v5-12min': fx('m2-rc1-v5-12min'), 'm2-rc1-v5-40min': fx('m2-rc1-v5-40min'), 'v6-from-a01faea': fs.readFileSync(SMOKE + 'fixture-v6-from-a01faea.json', 'utf8') };
const expFor = n => n === 'v6-from-a01faea' ? { ...EXP['m2-rc1-v5-40min'], coins: 1317637 } : EXP[n];
// ---- build id gate
{ const c = await ctxFor(null); const { p } = await open(c); const b = await buildId(p, EXPECT); ok(`BUILD runtime id (want ~${EXPECT})`, b.ok, b); await c.close();
  if (!b.ok) { await br.close(); srv.close(); process.exit(5); } }
// ---- D1 forced v6_backup failure (stub + quota) on v5-40min and v6
if (ONLY.includes('D1') && !S4) pend('D1-idb (f)1', 'IDB v6_backup write failure: S-4 per ADR M4-24 (v1.10)');
if (ONLY.includes('D1')) for (const mode of ['stub', 'quota', ...(S4 ? ['idb'] : [])]) for (const name of ['m2-rc1-v5-40min', 'v6-from-a01faea']) { const raw = SAVES[name], tag = `D1-${mode} ${name}`;
  const c = await ctxFor(raw, mode); const { p, msgs } = await open(c);
  const s0 = (await lsAll(p))[SK]; const bk0 = await p.evaluate(() => window.__bk.length);
  await sleep(500); const dlg = await p.evaluate(() => [...document.querySelectorAll('[role=alertdialog],.recovery-card,.toast,[role=status]')].map(e => e.innerText.trim()).filter(Boolean).join(' | ').slice(0, 300));
  await forceSave(p); await sleep(800); await sleep(5500); await forceSave(p); await sleep(800); // >= 1 autosave + 2 flushes
  const all = await lsAll(p), s1 = all[SK], d1 = parse(s1), T = await telem(p), svW = await p.evaluate(() => window.__sv), bkW = await p.evaluate(() => window.__bk);
  const fillN = await p.evaluate(() => localStorage.getItem('qa.fillCount'));
  const wantStore = mode === 'idb' ? 'idb' : 'ls', surfacedTel = /save_migration_aborted/.test(T ?? '') && new RegExp(`"store"\\s*:\\s*"${wantStore}"`).test(T ?? ''), surfacedLog = msgs.some(m => /backup|v6_backup|migrat/i.test(m.text)), surfacedUi = /can.?t save|couldn.?t save|save/i.test(dlg);
  ok(`${tag}: migration aborted, save byte-identical right after load (no tracksV7)`, s0 === raw && !/"tracksV7"/.test(s0), { identical: s0 === raw, inLen: raw.length, outLen: s0?.length, bkAttemptsAtLoad: bk0, fillN });
  ok(`${tag}: later saves still written as v6 without tracksV7`, svW.length > 0 && d1.version === 6 && d1.tracksV7 === undefined && d1.savedAt > JSON.parse(raw).savedAt, { saveWrites: svW.length, after: { ...d1, tracksV7: d1.tracksV7 ?? null } });
  const ibkW = await p.evaluate(() => window.__ibk), idbBk = await idbGet(p, 'v6_backup'), idbMain = await idbGet(p, 'main');
  ok(`${tag}: no committed migration: idb main has no tracksV7, no COMMITTED v6_backup (M4-15; orphans ok), backup attempted in the failing store`, !/"tracksV7"/.test(idbMain ?? '') && DL.noCommitted(s1, [all[BK], idbBk]) && (mode === 'idb' ? ibkW.length >= 1 : bkW.length >= 1), { lsBkAttempts: bkW.length, idbBkAttempts: ibkW.length, lsBkPresent: all[BK] !== undefined, idbBkPresent: idbBk !== null, idbMainV: parse(idbMain ?? '').version });
  await p.close(); const r2 = await open(c); const re = { lsBk: await r2.p.evaluate(() => window.__bk.length), idbBk: await r2.p.evaluate(() => window.__ibk.length) }, s2 = parse((await lsAll(r2.p))[SK]);
  ok(`${tag}: after page close progress survived (v6, no marker) and next load retries the migration`, s2.version === 6 && s2.tracksV7 === undefined && s2.savedAt >= d1.savedAt && (mode === 'idb' ? re.idbBk : re.lsBk) >= 1, { reload: s2, retryAttempts: re }); msgs.push(...r2.msgs);
  ok(`${tag}: failure surfaced: telemetry save_migration_aborted {store:'${wantStore}'} (ADR M4-12); log/UI reported as info`, surfacedTel, { surfacedTel, surfacedLog, surfacedUi, ui: dlg, logs: msgs.filter(m => /backup|migrat|save/i.test(m.text)).slice(0, 5), telemTail: (T ?? '').slice(-400) });
  { const ak = all[DL.ATTEMPTS_KEY], ab = DL.eventProps(T, 'save_migration_aborted'); ok(`${tag}: v1.12 abort counts: attempt_count 1, ${DL.ATTEMPTS_KEY} = 1`, DL.attemptsVal(ak) === 1 && ab[0]?.attempt_count === 1, { attemptsKey: ak ?? null, events: ab }); }
  ok(`${tag}: zero console errors`, errs(msgs).length === 0, { errors: errs(msgs), warnings: msgs.filter(m => m.type === 'warning').length });
  fs.writeFileSync(`${OUT}/${ENGINE}-${mode}-${name}.json`, JSON.stringify({ save: s1, telemetry: T, msgs, svW, bkW }, null, 1)); await c.close(); }
// ---- D2 normal path
const migrated = {};
if (ONLY.includes('D2') || ONLY.includes('D3')) for (const [name, raw] of Object.entries(SAVES)) { const e = expFor(name); const c = await ctxFor(raw); const A = await open(c);
  await forceSave(A.p); await sleep(800); const bkA = await A.p.evaluate(() => window.__bk.length), ibkA = await A.p.evaluate(() => window.__ibk.length); const s1 = (await lsAll(A.p)); await sleep(5500); await forceSave(A.p); await sleep(500); const seqD2 = await A.p.evaluate(() => window.__seq); await A.p.close();
  { const rb = DL.readbackBeforeInPlace(seqD2), mr = DL.mirrorAfterReadback(seqD2);
    ok(`D2 ${name}: §3d/ADR M4-24 commit only after LS v6_backup read back with matching migrationId`, rb.ok, rb);
    ok(`D2 ${name}: §3d-3 IDB mirror paused until commit confirmed (LS main read back byte-equal + backup id), zero IDB writes before`, mr.ok, mr); }
  const B = await open(c); await forceSave(B.p); await sleep(800); await forceSave(B.p); await sleep(800); const bkB = await B.p.evaluate(() => window.__bk.length); const s2 = await lsAll(B.p);
  const d = parse(s2[SK]); migrated[name] = s2[SK]; const msgs = [...A.msgs, ...B.msgs];
  ok(`D2 ${name}: migrates per expected-migration.json (F/C/H/V, refund 0, coins >= expected), tracksV7 set`, d.F === e.F && d.C === e.C && d.H === e.H && d.V === e.V && d.refund === e.refund && d.coins >= e.coins && d.tracksV7 !== undefined, { got: d, want: e });
  const ibA = await B.p.evaluate(() => window.__ibk.length), idbBk = await idbGet(B.p, 'v6_backup');
  const cl = DL.committedOk(s2[SK], s2[BK], raw);
  ok(`D2 ${name}: LS v6_backup {migrationId, raw} written exactly once, committed (id == state.v6BackupId), raw == input bytes`, bkA + bkB === 1 && cl.ok && s1[BK] === s2[BK], { writesTab1: bkA, writesTab2: bkB, ...cl });
  ok(`D2 ${name}: §3d LS-only commit: IDB v6_backup never written (absent), zero IDB backup puts`, idbBk === null && ibA + ibkA === 0, { idbBkPresent: idbBk !== null, idbBackupPuts: ibA + ibkA });
  { const k = DL.attemptIdbWrites(seqD2); ok(`D2 ${name}: (k) zero IDB writes during the attempt (puts/deletes/readwrite tx; ADR M4-24)`, k.ok, k); }
  ok(`D2 ${name}: save stays version 6, no v7 anywhere`, d.version === 6 && !Object.values(s2).some(v => /^\{"version":7/.test(v)), { version: d.version });
  ok(`D2 ${name}: zero console errors`, errs(msgs).length === 0, { errors: errs(msgs) });
  fs.writeFileSync(`${OUT}/${ENGINE}-d2-${name}.json`, s2[SK]); await c.close(); }
// ---- helpers for M4-15/16 + M4A-31(g)(h)
const bkRecs = async p => ({ ls: await p.evaluate(() => localStorage.getItem('eggfarm.save.v6_backup')), idb: await idbGet(p, 'v6_backup').catch(() => null) });
const S4 = env.S4 === '1';
const pend = (n, why) => { R.push({ n, pass: null, pending: why }); console.log(`PENDING-S4 [${ENGINE}] ${n}: ${why}`); };
const kOk = async (tag, p) => { const k = DL.attemptIdbWrites(await p.evaluate(() => window.__seq)); ok(`${tag}: (k) zero IDB writes during the attempt (puts/deletes/readwrite tx; ADR M4-24)`, k.ok, k); };
const attemptsOf = p => p.evaluate(k => localStorage.getItem(k), DL.ATTEMPTS_KEY);
const seqOf = p => p.evaluate(() => window.__seq), idbWrites = p => p.evaluate(() => window.__idbW);
async function retryCommits(c, raw, tag) { const r = await open(c); await forceSave(r.p); await sleep(800); const s = (await lsAll(r.p))[SK], rec = await bkRecs(r.p), co = DL.committedOk(s, rec.ls, raw);
  return { ok: parse(s).tracksV7 === 1 && co.ok, save: parse(s), backup: co, msgs: r.msgs, p: r.p }; }
// ---- D4 orphans, M4A-31(i) v1.8: record exactly {migrationId, raw}; an orphan survives saves/autosaves/reloads untouched; ONLY the next migration overwrites it (new id); never restored, never protected; only Reset deletes it (ATT-reset)
if (ONLY.includes('D4') && !S4) pend('D4 (i)', '{migrationId, raw} record + orphan rule: S-4 per ADR M4-24 (v1.10)');
if (ONLY.includes('D4') && S4) { const raw = SAVES['v6-from-a01faea'], older = SAVES['m2-rc1-v5-40min'], ORPH = 'ffffffffffffffff';
  const orphanI = L.mkBackup(older, 'eeeeeeeeeeeeeeee'); // IDB orphan seed (v1.9): M4-A never writes IDB v6_backup -> must stay byte-identical everywhere
  const orphan = L.mkBackup(older, ORPH); // raw differs from the live save: a restore would be visible
  // (1) shape after a commit, both stores
  { const c = await ctxFor(raw); const A = await open(c); await forceSave(A.p); await sleep(800); const s = (await lsAll(A.p))[SK], rec = await bkRecs(A.p);
    ok('D4-1 after commit (§3d LS-only): LS v6_backup exactly {migrationId, raw}, id == v6BackupId, raw == original; IDB v6_backup absent', DL.exactShape(rec.ls) && rec.idb == null && DL.committedOk(s, rec.ls, raw).ok, { ls: DL.committedOk(s, rec.ls, raw), idb: DL.committedOk(s, rec.idb, raw), shapeLs: DL.exactShape(rec.ls), shapeIdb: DL.exactShape(rec.idb) }); await c.close(); }
  // (2) orphan + unmarked v6, migration DEFERRED every load (idb-timeout): orphan untouched through autosave, flushes and a reload; save never restored from it
  { const T = DL.IDB_TIMEOUT_MS, c = await ctxFor(raw, 'idb-timeout', [[BK, orphan]]); await seedIdbCtx(c, [['v6_backup', orphanI]]); await c.clock.install(); const A = await open(c); await c.clock.runFor(T + 200); await sleep(5500); await forceSave(A.p); await sleep(600); await A.p.close();
    const B = await open(c); await c.clock.runFor(T + 200); await forceSave(B.p); await sleep(600); const all = await lsAll(B.p), s = all[SK];
    ok('D4-2 orphan survives saves/autosaves/reload untouched (no migration ran), never restored into the save', all[BK] === orphan && !s.includes(JSON.stringify(JSON.parse(older).state).slice(0, 80)) && parse(s).tracksV7 === undefined && L.backupStatus(s, all[BK]) === 'orphan',
      { orphanIntact: all[BK] === orphan, save: parse(s), status: L.backupStatus(s, all[BK]) });
    ok('D4-2 IDB orphan byte-identical', (await idbGet(B.p, 'v6_backup')) === orphanI, {}); await c.close(); }
  // (2b) orphan + already-marked save (no migration runs): untouched
  { const marked = fs.readFileSync('/workspace/egg-farm-studio/qa/m3-scripts/m4-fixtures/m4-v6-marked-real.json', 'utf8').trim(); const c = await ctxFor(marked, null, [[BK, orphan]]); await seedIdbCtx(c, [['v6_backup', orphanI]]); const A = await open(c); await sleep(5500); await forceSave(A.p); await sleep(600); await A.p.close();
    const B = await open(c); await forceSave(B.p); await sleep(600); const all = await lsAll(B.p);
    ok('D4-2b orphan next to a marked save (no migration) stays byte-identical across autosave + reload; not protected/restored', all[BK] === orphan && parse(all[SK]).coins !== JSON.parse(older).state.coinsCents, { orphanIntact: all[BK] === orphan, save: parse(all[SK]) });
    ok('D4-2b IDB orphan byte-identical', (await idbGet(B.p, 'v6_backup')) === orphanI, {}); await c.close(); }
  // (3) next migration overwrites the orphan with a fresh id (both stores)
  { const c = await ctxFor(raw, null, [[BK, orphan]]); await seedIdbCtx(c, [['v6_backup', orphanI]]); const A = await open(c); await forceSave(A.p); await sleep(800); const s = (await lsAll(A.p))[SK], rec = await bkRecs(A.p), id = L.parseBackup(rec.ls)?.migrationId;
    ok('D4-3 next migration overwrites the orphan: new migrationId, exact shape, committed, raw == current v6 (not the orphan raw)', id && id !== ORPH && DL.exactShape(rec.ls) && DL.committedOk(s, rec.ls, raw).ok && L.parseBackup(rec.ls).raw !== older, { newId: id, ls: DL.committedOk(s, rec.ls, raw), idbStatus: L.backupStatus(s, rec.idb) });
    ok('D4-3 IDB orphan untouched by the LS-only migration (§3d: no IDB v6_backup write in M4-A)', rec.idb === orphanI, { idbIntact: rec.idb === orphanI });
    ok('D4-3 zero console errors', errs(A.msgs).length === 0, { errors: errs(A.msgs) }); await c.close(); } }
// ---- S5 M4A-30 (N8): boot grant under v6 rules x1.0 = 19,800 (F10/C7, away 3 h), in-session commit, next load after 3 h = 24,750 (x1.25); deferred boot still 19,800
if (ONLY.includes('S5')) { const base = SAVES['v6-from-a01faea'];
  for (const [label, mode, wantCommit] of [['commit', null, true], ['deferred', 'idb-timeout', false]]) { const s0 = await DL.mkS5Save(base, Date.now()); const c = await ctxFor(s0, mode); if (mode) await c.clock.install();
    const A = await open(c); if (mode) await c.clock.runFor(DL.IDB_TIMEOUT_MS + 200); await forceSave(A.p); await sleep(800); const T1 = await telem(A.p), g1 = DL.grantEggs(T1), s1 = (await lsAll(A.p))[SK];
    ok(`S5-${label} boot grant exactly ${DL.S5.bootGrant} eggs (v6 rules, x1.0), once; ${wantCommit ? 'in-session commit happened' : 'migration deferred'}`, g1.length === 1 && g1[0] === DL.S5.bootGrant && (parse(s1).tracksV7 === 1) === wantCommit, { grants: g1, save: parse(s1) });
    await c.close();
    if (wantCommit) { const aged = await DL.ageSave(s1); const c2 = await ctxFor(aged); const B = await open(c2); await sleep(500); const g2 = DL.grantEggs(await telem(B.p));
      ok(`S5 next load after another 3 h: grant exactly ${DL.S5.nextGrant} eggs (x1.25), once`, g2.length === 1 && g2[0] === DL.S5.nextGrant, { grants: g2 }); await B.p.reload(); await B.p.getByText('Tap to start').click().catch(() => {}); await sleep(1200);
      const g3 = DL.grantEggs(await telem(B.p)); ok('S5 reload right after: grant not re-applied', g3.filter(x => x === DL.S5.nextGrant).length <= 1, { grants: g3 }); await c2.close(); } } }
// ---- EXP M4A-33 (N8): explainer at the in-session commit (fake IDB delays commit 1 s), not at boot; deferred load: none; reload after commit: none. EXPLAINER_SEL param (spec gives copy only).
if (ONLY.includes('EXP')) { const raw = SAVES['v6-from-a01faea'], vis = p => p.locator(DL.EXPLAINER_SEL).count().then(n => n), shown = T => DL.eventProps(T, 'tracks_explainer').filter(e => e.action === 'shown').length;
  { const c = await ctxFor(raw, 'idb-delay', [], 1000); await c.clock.install(); await c.clock.pauseAt(Date.now()); const A = await open(c); const atBoot = await vis(A.p), markedAtBoot = parse((await lsAll(A.p))[SK]).tracksV7 === 1;
    await c.clock.runFor(1100); await A.p.waitForTimeout(100); const atCommit = await vis(A.p), T = await telem(A.p);
    ok('EXP-a explainer absent at boot, appears once at the in-session commit (fake IDB +1 s)', atBoot === 0 && !markedAtBoot && atCommit === 1 && shown(T) === 1, { atBoot, markedAtBoot, atCommit, shownEvents: shown(T), sel: DL.EXPLAINER_SEL });
    await c.clock.resume(); await forceSave(A.p); await sleep(600); const s = (await lsAll(A.p))[SK]; await A.p.close(); await c.close();
    const c2 = await ctxFor(s); const B = await open(c2); await sleep(1200); ok('EXP-c reload after commit: explainer not shown again', (await vis(B.p)) === 0 && shown(await telem(B.p)) === 0, {}); await c2.close(); }
  { const c = await ctxFor(raw, 'idb-timeout'); await c.clock.install(); const A = await open(c); await c.clock.runFor(DL.IDB_TIMEOUT_MS + 200); await sleep(300);
    ok('EXP-b deferred load: no explainer', (await vis(A.p)) === 0 && shown(await telem(A.p)) === 0, {}); await c.close(); }
  { const c = await ctxFor(raw, 'stub'); const A = await open(c); await sleep(1500); ok('EXP-b aborted (h, LS backup stub) load: no explainer', (await vis(A.p)) === 0 && shown(await telem(A.p)) === 0, {}); await c.close(); } }
// ---- G: M4A-31(g) per v1.10: unavailable (no_global|security) -> LS-only + readback; blocked/timeout/open_failed/read_error -> deferral; deferred -> v6 byte-identical, aborted {reason, attempt_count} x1/load, retry; T-1 -> available. Fake IDB + fake clock.
if (ONLY.includes('G')) for (const variant of ['none', 'security', 'invalidstate', 'blocked', 'timeout', 'open_failed', 'read_error', 'under']) {
  const raw = SAVES['v6-from-a01faea'], P = DL.PATHS[variant], T = DL.IDB_TIMEOUT_MS, mode = variant === 'under' ? 'idb-delay' : 'idb-' + variant, tag = `G-${variant} [${P.path}, T=${T}ms]`;
  const c = await ctxFor(raw, mode, [], T - 1); await c.clock.install(); const A = await open(c); const s0 = (await lsAll(A.p))[SK]; await c.clock.runFor(T + 200); await sleep(300); await forceSave(A.p); await sleep(800);
  const s = (await lsAll(A.p))[SK], d = parse(s), rec = await bkRecs(A.p), seq = await seqOf(A.p), iw = await idbWrites(A.p), Tm = await telem(A.p);
  const un = DL.eventProps(Tm, 'save_backup_idb_unavailable'), ab = DL.eventProps(Tm, 'save_migration_aborted');
  if (P.path === 'unavailable') { const co = DL.committedOk(s, rec.ls, raw), rb = DL.readbackBeforeInPlace(seq);
    ok(`${tag}: migrates on LS only; backup.raw byte-identical; committed id`, d.tracksV7 === 1 && co.ok, { save: d, backup: co });
    ok(`${tag}: save_backup_idb_unavailable x1, reason ${P.reason} (of no_global|security)`, un.length === 1 && DL.reasonOk(variant, un[0]?.reason), { events: un });
    ok(`${tag}: no deferral counted (${DL.ATTEMPTS_KEY} absent, no aborted event)`, (await attemptsOf(A.p)) == null && ab.length === 0, { attemptsKey: await attemptsOf(A.p), ab });
    ok(`${tag}: zero IDB writes`, iw.length === 0, { idbWrites: iw.slice(0, 10) });
    ok(`${tag}: LS v6_backup read back with matching migrationId BEFORE the in-place write`, rb.ok, rb); await kOk(tag, A.p); }
  else if (P.path === 'deferred') {
    ok(`${tag}: deferred: save byte-identical v6 (never forced), no committed backup`, s0 === raw && s === raw && DL.noCommitted(s, [rec.ls, rec.idb]), { identical: s === raw, save: d, ls: L.backupStatus(s, rec.ls), idb: L.backupStatus(s, rec.idb) });
    await sleep(5500); await forceSave(A.p); await sleep(500); const iwAll = await idbWrites(A.p); // autosave + flushes
    ok(`${tag}: deferral session never writes IDB (zero IDB writes incl. autosave + pagehide/visibilitychange flushes; M4-20 / v1.9 (d1)7)`, iwAll.length === 0, { idbWrites: iwAll.slice(0, 10) });
    await kOk(tag, A.p);
    ok(`${tag}: save_backup_idb_unavailable NOT fired; aborted store 'idb'`, un.length === 0 && ab[0]?.store === 'idb', { un, store: ab[0]?.store });
    ok(`${tag}: save_migration_aborted x1 this load, reason ${P.anyReason ? 'any (observed recorded)' : P.reason}, attempt_count 1, ${DL.ATTEMPTS_KEY} = integer 1`, ab.length === 1 && DL.reasonOk(variant, ab[0]?.reason) && ab[0]?.attempt_count === 1 && DL.attemptsVal(await attemptsOf(A.p)) === 1, { observedReason: ab[0]?.reason ?? null, events: ab, attemptsKey: await attemptsOf(A.p) });
    await A.p.close(); await c.close(); const c2 = await ctxFor(s); const re = await retryCommits(c2, s); const Tm2 = await telem(re.p);
    ok(`${tag}: next load (IDB healthy) retries and commits; attempts reset`, re.ok && DL.countEvent(Tm2, 'save_migration_aborted') === 0 && !(await attemptsOf(re.p)), { save: re.save, backup: re.backup, attemptsKey: await attemptsOf(re.p) }); await c2.close(); continue; }
  else { const co = DL.committedOk(s, rec.ls, raw);
    ok(`${tag}: open answering at T-1 = ${T - 1} ms counts as available: LS-only commit (ADR M4-24), IDB v6_backup absent, no unavailable/aborted event`, d.tracksV7 === 1 && co.ok && rec.idb == null && un.length === 0 && ab.length === 0, { save: d, ls: co, idbBk: rec.idb != null, un, ab }); await kOk(tag, A.p); }
  ok(`${tag}: zero console errors`, errs(A.msgs).length === 0, { errors: errs(A.msgs) }); await c.close(); }
// ---- D1-attempts: M4A-31 (d1)5: 4 timed-out loads -> 1,2,3,4 (stuck_on_v6 from 3); 5th load (IDB 100 ms) commits and removes the key; a later deferral reports 1
if (ONLY.includes('G')) { const raw = SAVES['v6-from-a01faea'], T = DL.IDB_TIMEOUT_MS, evs = [], keys = []; let cur = raw;
  for (let i = 0; i < 4; i++) { const c = await ctxFor(cur, 'idb-timeout', i ? [[DL.ATTEMPTS_KEY, keys[i - 1]]].filter(e => e[1] != null) : []); await c.clock.install(); const A = await open(c); await c.clock.runFor(T + 200); await sleep(300); await forceSave(A.p); await sleep(500);
    const Tm = await telem(A.p), ab = DL.eventProps(Tm, 'save_migration_aborted'); evs.push(ab.length === 1 ? ab[0] : { count: ab.length, events: ab }); keys.push(await attemptsOf(A.p)); cur = (await lsAll(A.p))[SK]; await c.close(); }
  const probs = DL.attemptsOk(evs, keys); const probs4 = probs; ok(`D1-attempts: 4 timed-out loads -> attempt_count 1,2,3,3 (v1.12 cap 3; stuck_on_v6 from 3), x1 per load, ${DL.ATTEMPTS_KEY} integer; save stays v6 byte-identical`, probs.length === 0 && cur === raw, { probs, events: evs, attemptsKey: keys, identical: cur === raw });
  const c = await ctxFor(cur, 'idb-delay', keys[3] != null ? [[DL.ATTEMPTS_KEY, keys[3]]] : [], 100); await c.clock.install(); const re = await retryCommits(c, cur); const s5 = (await lsAll(re.p))[SK];
  ok('D1-attempts: 5th load (IDB answers at 100 ms) commits and removes the attempts key; never forced before', re.ok && !(await attemptsOf(re.p)), { save: re.save, attemptsKey: await attemptsOf(re.p) }); await c.close();
  // a later deferral reports 1, no stuck flag: unmarked v6 again (commit happened, so use a fresh unmarked copy)
  { const c2 = await ctxFor(raw, 'idb-timeout'); await c2.clock.install(); const A = await open(c2); await c2.clock.runFor(T + 200); await sleep(300); const ab = DL.eventProps(await telem(A.p), 'save_migration_aborted');
    ok('D1-attempts: a later deferral (after reset) reports attempt_count 1, no stuck_on_v6', ab.length === 1 && ab[0].attempt_count === 1 && ab[0].stuck_on_v6 !== true, { events: ab }); await c2.close(); } }
// ---- H: M4A-31(h) IDB opens, backup write fails (quota / error) -> abort, v6 byte-identical, aborted x1, play continues, next load retries + commits
if (ONLY.includes('H') && !S4) for (const v of ['quota', 'error', 'hang']) { R.push({ n: `H-${v}`, pass: null, pending: 'S-4' }); console.log(`PENDING-S4 [${ENGINE}] H-${v}: (h) IDB backup-write row${v === 'hang' ? ' / idb_write_timeout' : ''}: S-4 per ADR M4-24 (v1.10)`); }
if (ONLY.includes('H') && S4) for (const variant of ['quota', 'error', 'hang']) { const raw = SAVES['v6-from-a01faea'], tag = `H-${variant}${variant === 'hang' ? ` (> IDB_HANG_MS=${DL.IDB_HANG_MS})` : ''}`; const c = await ctxFor(raw, 'idb-' + variant); if (variant === 'hang') await c.clock.install(); const A = await open(c); if (variant === 'hang') await c.clock.runFor(DL.IDB_HANG_MS + 200);
  const s0 = (await lsAll(A.p))[SK]; await sleep(5500); await forceSave(A.p); await sleep(800);
  const s = (await lsAll(A.p))[SK], d = parse(s), rec = await bkRecs(A.p), Tm = await telem(A.p), ab = DL.countEvent(Tm, 'save_migration_aborted'), abP = DL.eventProps(Tm, 'save_migration_aborted');
  ok(`${tag}: save byte-identical v6 right after load, no marker`, s0 === raw && !/"tracksV7"/.test(s0), { identical: s0 === raw });
  ok(`${tag}: play continues on v6 (later saves written, no marker, no v6BackupId)`, d.version === 6 && d.tracksV7 === undefined && !/"v6BackupId"/.test(s) && d.savedAt > JSON.parse(raw).savedAt, { save: d });
  ok(`${tag}: save_migration_aborted exactly once, store idb${variant === 'hang' ? ', reason idb_write_timeout' : ''}`, ab === 1 && abP[0]?.store === 'idb' && (variant !== 'hang' || abP[0]?.reason === 'idb_write_timeout'), { count: ab, props: abP });
  const ak = await A.p.evaluate(k => localStorage.getItem(k), DL.ATTEMPTS_KEY); ok(`${tag}: (h) abort increments attempts (v1.12): ${DL.ATTEMPTS_KEY} = 1, attempt_count 1`, DL.attemptsVal(ak) === 1 && abP[0]?.attempt_count === 1, { attemptsKey: ak, attempt_count: abP[0]?.attempt_count ?? null });
  ok(`${tag}: no committed backup (orphans tolerated)`, DL.noCommitted(s, [rec.ls, rec.idb]), { ls: L.backupStatus(s, rec.ls), idb: L.backupStatus(s, rec.idb) });
  ok(`${tag}: zero console errors`, errs(A.msgs).length === 0, { errors: errs(A.msgs) });
  const orphanLs = rec.ls; await sleep(5500); await forceSave(A.p).catch(() => {}); await sleep(500); const lsLater = await A.p.evaluate(() => localStorage.getItem('eggfarm.save.v6_backup')); await A.p.close(); await c.close();
  ok(`${tag}: (i) any orphan left by this aborted attempt survives later saves/autosaves untouched (never restored/protected)`, lsLater === orphanLs, { orphanPresent: orphanLs != null, intact: lsLater === orphanLs });
  const c2 = await ctxFor(s, null, orphanLs ? [[BK, orphanLs]] : []); const re = await retryCommits(c2, s); const newId = L.parseBackup((await bkRecs(re.p)).ls)?.migrationId, oldId = L.parseBackup(orphanLs ?? '')?.migrationId ?? null;
  ok(`${tag}: next load (failure removed) = next migration: overwrites any orphan with a fresh migrationId and commits`, re.ok && (!oldId || newId !== oldId), { save: re.save, backup: re.backup, orphanId: oldId, newId }); await c2.close(); }
// ---- QH §3d-1 quota_headroom: LS free < estimate (3 copies + counter + telemetry) + 64 KiB -> deferral {store:'ls', reason:'quota_headroom', attempt_count:1}; main/.bak/telemetry byte-identical; no backup; probe key absent
if (ONLY.includes('QH')) { const raw = SAVES['v6-from-a01faea']; const c = await ctxFor(raw, 'quota-tight'); const A = await open(c); const s0 = await lsAll(A.p); await sleep(300);
  const seq = await seqOf(A.p), Tm = await telem(A.p), ab = DL.eventProps(Tm, 'save_migration_aborted'), all = await lsAll(A.p), iw = await idbWrites(A.p);
  ok('QH quota_headroom: deferral store ls, reason quota_headroom, attempt_count 1, key = 1', ab.length === 1 && ab[0].store === 'ls' && ab[0].reason === 'quota_headroom' && ab[0].attempt_count === 1 && DL.attemptsVal(all[DL.ATTEMPTS_KEY]) === 1, { events: ab, attemptsKey: all[DL.ATTEMPTS_KEY] ?? null });
  ok('QH: main byte-identical v6, no backup written, probe key absent afterwards, main/.bak/telemetry never dropped', all[SK] === raw && !seq.some(e => e.op === 'bk.set') && all[DL.PROBE_KEY] === undefined && all[BK] === undefined && (s0['eggfarm.save.bak'] === undefined || all['eggfarm.save.bak'] !== undefined) && (s0['eggfarm.telemetry'] === undefined || all['eggfarm.telemetry'] !== undefined),
    { mainIdentical: all[SK] === raw, bkWrites: seq.filter(e => e.op === 'bk.set').length, probe: all[DL.PROBE_KEY] ?? null, keys: Object.keys(all) });
  await sleep(5500); await forceSave(A.p); await sleep(400); ok('QH: deferral session: zero IDB writes', (await idbWrites(A.p)).length === 0, {}); await kOk('QH', A.p); await c.close(); }
if (ONLY.includes('QH')) { const raw = SAVES['v6-from-a01faea']; const c = await ctxFor(raw, 'quota-roomy'); const A = await open(c); await forceSave(A.p); await sleep(800); const all = await lsAll(A.p), d = parse(all[SK]), ab = DL.eventProps(await telem(A.p), 'save_migration_aborted');
  ok('QH-ok (j): free space >= 2 x (new save + v6_backup) [+64 KiB design margin] -> trial key removed, migration proceeds and commits, no abort', d.tracksV7 === 1 && all[DL.PROBE_KEY] === undefined && ab.length === 0 && (await seqOf(A.p)).some(e => e.op === 'probe.get' || e.op === 'save.set'), { save: d, probe: all[DL.PROBE_KEY] ?? null, ab });
  await kOk('QH-ok', A.p); await c.close(); }
// ---- MC idb_main_changed (§3c step 3, M4-19/20): IDB main re-read before commit is newer by rank, or fails -> abort idb_main_changed; no marked main written to LS or IDB; attempts not incremented
if (ONLY.includes('MC')) for (const v of ['main_newer', 'main_fail']) { const raw = SAVES['v6-from-a01faea'], c = await ctxFor(raw, v === 'main_newer' ? 'idb-main-newer' : 'idb-main-fail'); await seedIdbCtx(c, [['main', raw]]);
  const A = await open(c); await sleep(800); const seq = await seqOf(A.p), Tm = await telem(A.p), ab = DL.eventProps(Tm, 'save_migration_aborted'), idbMain = await idbGet(A.p, 'main'), all = await lsAll(A.p);
  ok(`MC-${v}: [deferral] (v1.11/12) reason idb_main_changed x1, attempt_count 1, key = 1`, ab.length === 1 && ab[0].reason === 'idb_main_changed' && ab[0].attempt_count === 1 && DL.attemptsVal(all[DL.ATTEMPTS_KEY]) === 1, { events: ab, rereads: seq.filter(e => e.op === 'idb.main.reread').length });
  ok(`MC-${v}: old mains intact: no marked/committed main written to LS, IDB main not migrated (no tracksV7)`, !seq.some(e => e.op === 'save.set' && (e.marked || e.v6BackupId)) && !/"tracksV7"/.test(idbMain ?? '') && parse(all[SK]).tracksV7 === undefined, { lsMain: parse(all[SK]), idbMainMarked: /"tracksV7"/.test(idbMain ?? '') });
  await kOk(`MC-${v}`, A.p);
  ok(`MC-${v}: zero console errors`, errs(A.msgs).length === 0, { errors: errs(A.msgs) }); await c.close(); }
// ---- RB: readback_mismatch (M4-16 / §3d): IDB healthy and unavailable; LS readback returns a different migrationId -> M4-12 abort
if (ONLY.includes('RB')) for (const mode of [null, 'idb-none']) { const raw = SAVES['v6-from-a01faea'], tag = `RB readback_mismatch [IDB ${mode ? 'absent' : 'healthy'}]`; const c = await ctxFor(raw, mode);
  await c.addInitScript(() => { const G2 = Storage.prototype.getItem; Storage.prototype.getItem = function (k) { const r = G2.call(this, k); if (k === 'eggfarm.save.v6_backup' && r) { try { const o = JSON.parse(r); o.migrationId = 'ffffffffffffffff'; return JSON.stringify(o); } catch {} } return r; }; });
  const A = await open(c); await forceSave(A.p); await sleep(800); const s = (await lsAll(A.p))[SK], d = parse(s), ab = DL.eventProps(await telem(A.p), 'save_migration_aborted'), iw = await idbWrites(A.p);
  ok(`${tag}: §3d/ADR M4-24 LS-only commit refused: abort {store:'ls', reason:'readback_mismatch'} x1, save stays v6 without marker/v6BackupId, attempts = 1 (v1.12)`, d.version === 6 && d.tracksV7 === undefined && !/"v6BackupId"/.test(s) && ab.length === 1 && ab[0].store === 'ls' && ab[0].reason === 'readback_mismatch' && ab[0].attempt_count === 1 && DL.attemptsVal(await attemptsOf(A.p)) === 1, { save: d, aborted: ab, attemptsKey: await attemptsOf(A.p) });
  await kOk(tag, A.p); // abort: no commit -> whole session log (incl. the forced flush)
  ok(`${tag}: zero console errors`, errs(A.msgs).length === 0, { errors: errs(A.msgs) }); await c.close(); }
// ---- ATT: migration_attempts lifecycle (v1.7 confirmed): commit removes it; Reset clears it (+ both v6_backup stores, no orphan); newer-save refusal writes nothing
if (ONLY.includes('ATT')) { const raw = SAVES['v6-from-a01faea'];
  { const c = await ctxFor(raw, null, [[DL.ATTEMPTS_KEY, '2']]); const re = await retryCommits(c, raw); const ak = await attemptsOf(re.p);
    ok(`ATT-commit: successful commit removes ${DL.ATTEMPTS_KEY} (seeded 2)`, re.ok && ak == null, { save: re.save, backup: re.backup, attemptsKey: ak }); await c.close(); }
  { const c = await ctxFor(raw, null, [[DL.ATTEMPTS_KEY, '1']]); const A = await open(c); await forceSave(A.p); await sleep(800);
    await A.p.locator('#settings').click(); await A.p.waitForTimeout(500); await A.p.locator('#sReset').click().catch(() => {}); await A.p.waitForTimeout(400);
    for (const sel of ['button:has-text("Reset")', '.modal .btn.danger', 'button:has-text("Yes")']) { const b = A.p.locator(sel).last(); if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await A.p.waitForTimeout(400); } }
    await A.p.close(); const B = await c.newPage(); await B.goto(U); await B.waitForTimeout(1500); // reload, no tap: assert persisted state
    const ls = await lsAll(B), idbBk = await idbGet(B, 'v6_backup').catch(() => null), save = ls[SK] ?? null;
    ok(`ATT-reset: after Reset + reload: LS + IDB v6_backup gone (no orphan), ${DL.ATTEMPTS_KEY} gone`, ls[BK] === undefined && idbBk === null && ls[DL.ATTEMPTS_KEY] === undefined, { lsBk: ls[BK] !== undefined, idbBk: idbBk !== null, attemptsKey: ls[DL.ATTEMPTS_KEY] ?? null, saveAfter: save ? parse(save) : null, keys: Object.keys(ls) }); await c.close(); }
  { const v7 = fs.readFileSync('/workspace/egg-farm-studio/qa/m3-scripts/m4-fixtures/m4-v7-basic.json', 'utf8'), rec = fs.readFileSync('/workspace/egg-farm-studio/qa/m3-scripts/m4-fixtures/m4-v6-backup-record.json', 'utf8');
    const c = await ctxFor(v7, null, [[BK, rec]]); const pre = await c.newPage(); await pre.goto(U); const before = await lsAll(pre); const ib0 = await idbGet(pre, 'v6_backup').catch(() => null); await pre.close();
    const p = await c.newPage(); const msgs = []; p.on('pageerror', e => msgs.push(String(e))); await p.goto(U); await p.getByText('Tap to start').click().catch(() => {}); await p.waitForTimeout(1500);
    const shown = await p.locator('.recovery-layer.newer-save').first().isVisible().catch(() => false); await forceSave(p); await sleep(5500); await forceSave(p); await sleep(500); const seq = await seqOf(p), iw = await idbWrites(p); await p.close();
    const post = await c.newPage(); await post.goto(U); const after = await lsAll(post), ib1 = await idbGet(post, 'v6_backup').catch(() => null); await post.close();
    const d = L.strictDiff({ ls: before, idb: {} }, { ls: after, idb: {} }).filter(x => x.key !== 'qa.seeded');
    ok(`ATT-refusal: v7 save on this build -> newer-save dialog, ZERO save/backup writes, IDB untouched, ${DL.ATTEMPTS_KEY} absent`, shown && d.length === 0 && !seq.some(e => e.op === 'save.set' || e.op === 'bk.set') && iw.length === 0 && ib1 === ib0 && after[DL.ATTEMPTS_KEY] === undefined,
      { shown, diffs: d, saveOrBkWrites: seq.filter(e => e.op.endsWith('.set')), idbWrites: iw.slice(0, 5), attemptsKey: after[DL.ATTEMPTS_KEY] ?? null, pageerrors: msgs }); await c.close(); } }
// ---- D3 downgrade: migrated save into a01faea keeps marker + track fields byte-identical
if (ONLY.includes('D3')) for (const name of ['m2-rc1-v5-40min', 'v6-from-a01faea']) { const raw = migrated[name]; if (!raw) { ok(`D3 ${name}: needs D2 output`, false, {}); continue; }
  const c = await ctxFor(raw); const A = await open(c, 'down.html'); const b = await buildId(A.p, DOWN_BUILD); await forceSave(A.p); await sleep(800); await A.p.close();
  const B = await open(c, 'down.html'); await forceSave(B.p); await sleep(800); const out = (await lsAll(B.p))[SK];
  const F = ['hensLevel', 'eggValueLevel', 'celebratedMilestones', 'tracksV7', 'migrationRefundCents', 'seenTracksExplainer'].filter(f => L.fieldBytes(raw, f) !== null);
  const diff = F.filter(f => L.fieldBytes(raw, f) !== L.fieldBytes(out, f)), kIn = Object.keys(JSON.parse(raw).state).sort(), kOut = Object.keys(JSON.parse(out).state).sort();
  ok(`D3 ${name}: ${DOWN_BUILD} (id ${b.id}) re-saves keeping ${F.join('/')} byte-identical, same state keys`, b.ok && diff.length === 0 && JSON.stringify(kIn) === JSON.stringify(kOut) && JSON.parse(out).savedAt > JSON.parse(raw).savedAt, { buildId: b.id, diff, added: kOut.filter(k => !kIn.includes(k)), dropped: kIn.filter(k => !kOut.includes(k)), errors: errs([...A.msgs, ...B.msgs]) });
  await c.close(); }
// ==== v1.14 / v1.12 additions ====
const ECO = DL.loadEconomy(fs), MS_H = DL.firstHensMilestone(ECO), T0 = Date.UTC(2026, 9, 16, 12, 0, 0); // fixed fake wall clock (context.clock.setFixedTime): away is exact, timers still run
/** one load: open, settle, flush; per-load grants/aborts = telemetry events after the boot baseline (window.__tel0). Returns persisted save + this load's events. */
async function load(c, tag, nextMode) { const A = await open(c); await sleep(1500); await forceSave(A.p); await sleep(700);
  const T = await telem(A.p), t0 = await A.p.evaluate(() => window.__tel0), cut = (n) => DL.eventProps(T, n).slice(DL.eventProps(t0, n).length);
  const all = await lsAll(A.p), seq = await seqOf(A.p), dead = await A.p.evaluate(() => window.__dead); const r = { tag, grants: cut('offline_grant').map(x => x.eggs ?? x.amount ?? x.granted ?? null), aborted: cut('save_migration_aborted'), raw: all[SK], save: parse(all[SK]), attempts: all[DL.ATTEMPTS_KEY] ?? null, killed: all['qa.killed'] ?? null, dead, kills: seq.filter(e => e.op === 'KILL'), errors: errs(A.msgs), seqHead: seq.filter(e => /^(bk|save)\.set|KILL/.test(e.op)).slice(0, 6) };
  if (nextMode !== undefined) await A.p.evaluate(m => localStorage.setItem('qa.mode', m ?? 'none'), nextMode); // next load's fake mode (qa.* key, not a game key)
  await A.p.close(); return r; }
// ---- OFF M4A-4(r4) v1.14: grant == floor(offline_eggs_per_sec[H] x min(away,2h) x mult) capped at offline_max_eggs_2h[H] x mult; values read from economy.csv (milestone mult from ECON_MS_CSV until the M4 merge)
if (ONLY.includes('OFF')) { const marked = fs.readFileSync('/workspace/egg-farm-studio/qa/m3-scripts/m4-fixtures/m4-v6-marked-real.json', 'utf8').trim(); const rows = [];
  for (const H of [0, MS_H]) for (const awayS of [3600, 7200]) { const exp = DL.offlineExpected(ECO, H, awayS), tag = `OFF-H${H}-${awayS / 3600}h`;
    const c = await ctxFor(await DL.mkOfflineSave(marked, H, T0, awayS * 1000)); await c.clock.setFixedTime(T0); const a = await load(c, tag), b = await load(c, tag + ' reload');
    rows.push({ tag, expected: exp.eggs, actual: a.grants }); fs.writeFileSync(`${OUT}/${ENGINE}-${tag}.json`, JSON.stringify({ exp, a, b }, null, 1));
    ok(`${tag}: offline grant expected ${exp.eggs} (CSV rate ${exp.rate} x ${awayS}s x${exp.mult}, cap ${exp.cap}x${exp.mult}, floored) vs actual ${JSON.stringify(a.grants)}`, a.grants.length === 1 && a.grants[0] === exp.eggs, { expected: exp.eggs, actual: a.grants, diff: a.grants.length ? a.grants[0] - exp.eggs : null, exp, save: a.save });
    ok(`${tag}: reload at the same clock pays nothing (no re-grant)`, b.grants.length === 0, { grants: b.grants }); await c.close(); }
  fs.writeFileSync(`${OUT}/${ENGINE}-OFF-summary.json`, JSON.stringify(rows, null, 1)); }
// ---- MG3A M4A-30 r3a v1.14: no flag; the committing session's boot grant is the single x1.0 grant; next 3 h after commit pays x1.25; no 19,800 after a commit, on every path
if (ONLY.includes('MG3A')) { const base = SAVES['v6-from-a01faea'], H = DL.S5.F, X1 = DL.offlineExpected(ECO, H, 3 * 3600, { forceX1: true }).eggs, XF = DL.offlineExpected(ECO, H, 3 * 3600).eggs;
  const PATHS3 = { 'i-commit': [null], 'i-unavailable': ['idb-none'], 'ii-2deferrals': ['idb-timeout', 'idb-timeout', null], 'iii-abort-stub': ['stub', null], 'iii-abort-readback': ['rb-mismatch', null], 'iii-abort-commitfail': ['commit-fail', null], 'iv-away30s': [null] };
  for (const [path, modes] of Object.entries(PATHS3)) { const awayMs = path.startsWith('iv') ? 30e3 : 3 * 3600e3, c = await ctxFor(await DL.mkS5Save(base, T0, awayMs), modes[0]); await c.clock.setFixedTime(T0); const L3 = [];
    for (let i = 0; i < modes.length; i++) L3.push(await load(c, `${path} load ${i + 1} [${modes[i] ?? 'healthy'}]`, i + 1 < modes.length ? modes[i + 1] : undefined));
    const committedAt = L3.findIndex(r => r.save.tracksV7 === 1); await c.clock.setFixedTime(T0 + 3 * 3600e3); const nx = await load(c, `${path} +3h`), rl = await load(c, `${path} +3h reload`), all = [...L3, nx, rl];
    const bootWant = awayMs >= 60e3 ? [X1] : [];
    ok(`MG3A-${path}: first load boot grant ${JSON.stringify(bootWant)} (v6 rules x1.0), every later pre-commit load pays nothing`, JSON.stringify(L3[0].grants) === JSON.stringify(bootWant) && L3.slice(1).every(r => r.grants.length === 0), { perLoad: L3.map(r => ({ tag: r.tag, grants: r.grants, marked: r.save.tracksV7 === 1, aborted: r.aborted.map(a => a.reason) })) });
    ok(`MG3A-${path}: migration committed on the last pre-absence load (load ${modes.length})`, committedAt === modes.length - 1, { committedAt, saves: L3.map(r => r.save) });
    ok(`MG3A-${path}: next 3 h absence after the commit pays exactly ${XF} (x${DL.offlineMult(ECO, H)}), once; reload pays nothing`, JSON.stringify(nx.grants) === JSON.stringify([XF]) && rl.grants.length === 0, { next: nx.grants, reload: rl.grants });
    ok(`MG3A-${path}: no path pays ${X1} again after a commit`, all.slice(Math.max(committedAt, 0) + 1).every(r => !r.grants.includes(X1)), { grants: all.map(r => r.grants) });
    ok(`MG3A-${path}: zero console errors`, all.every(r => r.errors.length === 0), { errors: all.flatMap(r => r.errors).slice(0, 5) });
    fs.writeFileSync(`${OUT}/${ENGINE}-MG3A-${path}.json`, JSON.stringify(all.map(({ raw, ...r }) => r), null, 1)); await c.close(); } }
// ---- MG3B M4A-30 r3b v1.14: fake KV kill (after the kill every write/remove is dropped, page closed) then reload at the same clock; the 3 h absence is paid exactly once in persisted state
if (ONLY.includes('MG3B')) { const base = SAVES['v6-from-a01faea'], H = DL.S5.F, X1 = DL.offlineExpected(ECO, H, 3 * 3600, { forceX1: true }).eggs, XF = DL.offlineExpected(ECO, H, 3 * 3600).eggs;
  for (const [kill, note] of [['first-save', '(1) kill before the post-grant write'], ['after-first-save', '(2) kill right after the post-grant write'], ['bk', '(3) kill after v6_backup write, before the main commit'], ['commit', 'kill right after the main commit write']]) {
    const s0 = await DL.mkS5Save(base, T0, 3 * 3600e3), c = await ctxFor(s0, null, [], 0, kill); await c.clock.setFixedTime(T0); const tag = `MG3B-${kill}`;
    const a = await load(c, `${tag} killed load`), b = await load(c, `${tag} reload`); const aPersist = a.save.savedAt === T0, bPersist = b.save.savedAt === T0;
    ok(`${tag} ${note}: kill happened (fake KV)`, a.kills.length === 1, { kills: a.kills, seqHead: a.seqHead, killedFlag: a.killed });
    { const g = DL.grantOnce([{ grants: a.grants, persisted: aPersist }, { grants: b.grants, persisted: bPersist }], X1); ok(`${tag}: absence paid exactly once in persisted state (${X1}), never twice, never lost`, g.ok, { ...g, storedAfterKill: a.save, storedAfterReload: b.save }); }
    if (kill === 'first-save') ok(`${tag}: next boot recomputes the same single grant from the old savedAt`, a.save.savedAt === T0 - 3 * 3600e3 && JSON.stringify(b.grants) === JSON.stringify([X1]), { storedSavedAtAfterKill: a.save.savedAt, reloadGrants: b.grants });
    if (kill === 'after-first-save') ok(`${tag}: next boot sees the new savedAt and pays nothing`, aPersist && b.grants.length === 0, { storedSavedAtAfterKill: a.save.savedAt, reloadGrants: b.grants });
    if (kill === 'bk') ok(`${tag}: after kill the stored save is still unmarked v6, grant not repeated, migration retries and commits on reload`, a.save.tracksV7 === undefined && b.grants.length === (aPersist ? 0 : 1) && b.save.tracksV7 === 1, { afterKill: a.save, afterReload: b.save, reloadGrants: b.grants, note: 'if the stored savedAt is still the old one the grant was not yet persisted, so the reload must pay it (once)' });
    if (kill === 'commit') ok(`${tag}: committed save survives the kill, reload does not re-migrate or re-grant`, a.save.tracksV7 === 1 && b.save.tracksV7 === 1 && b.grants.length === 0, { afterKill: a.save, afterReload: b.save, reloadGrants: b.grants });
    await c.clock.setFixedTime(T0 + 3 * 3600e3); const nx = await load(c, `${tag} +3h`);
    ok(`${tag}: next 3 h absence after the commit pays ${XF} once`, JSON.stringify(nx.grants) === JSON.stringify([XF]), { grants: nx.grants, save: nx.save });
    fs.writeFileSync(`${OUT}/${ENGINE}-${tag}.json`, JSON.stringify([a, b, nx].map(({ raw, ...r }) => r), null, 1)); await c.close(); } }
// ---- AH6 m4a-spec v1.12 (h)6: 3 consecutive commit_write_failed / readback_mismatch -> 1,2,3(+stuck), 4th stays 3 + stuck; stored save unmarked v6 each time; clean load commits and removes the key
if (ONLY.includes('AH6')) for (const [mode, reason] of [['commit-fail', 'commit_write_failed'], ['rb-mismatch', 'readback_mismatch']]) { const raw = SAVES['v6-from-a01faea'], c = await ctxFor(raw, mode), Ls = [];
  for (let i = 0; i < 4; i++) Ls.push(await load(c, `AH6-${reason} load ${i + 1}`, i === 3 ? null : undefined));
  const evs = Ls.map(r => r.aborted.length === 1 ? r.aborted[0] : { count: r.aborted.length, events: r.aborted }), probs = DL.attemptsOk(evs, Ls.map(r => r.attempts));
  ok(`AH6-${reason}: 4 failing loads -> attempt_count 1,2,3,3, stuck_on_v6 from the 3rd, reason ${reason} x1 per load, key integer`, probs.length === 0 && evs.every(e => e.reason === reason), { probs, events: evs, keys: Ls.map(r => r.attempts) });
  ok(`AH6-${reason}: stored save unmarked v6 (no tracksV7/v6BackupId) on every failed load`, Ls.every(r => r.save.version === 6 && r.save.tracksV7 === undefined && !/"v6BackupId"/.test(r.raw ?? '')), { saves: Ls.map(r => r.save), byteIdentical: Ls.map(r => r.raw === raw) });
  const ok5 = await load(c, `AH6-${reason} clean load`);
  ok(`AH6-${reason}: clean load commits and removes ${DL.ATTEMPTS_KEY} in the commit, no abort`, ok5.save.tracksV7 === 1 && ok5.attempts == null && ok5.aborted.length === 0, { save: ok5.save, attemptsKey: ok5.attempts, aborted: ok5.aborted });
  fs.writeFileSync(`${OUT}/${ENGINE}-AH6-${reason}.json`, JSON.stringify([...Ls, ok5].map(({ raw, ...r }) => r), null, 1)); await c.close(); }
fs.writeFileSync(`${OUT}/${ENGINE}-results.json`, JSON.stringify(R, null, 1)); await br.close(); srv.close();
console.log(`TOTAL [${ENGINE}] ${R.filter(r => r.pass === true).length}/${R.filter(r => r.pass !== null).length}, ${R.filter(r => r.pass === null).length} PENDING-S4`); process.exit(R.some(r => r.pass === false) ? 1 : 0);
