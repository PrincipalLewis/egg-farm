// v5 Saves lane: save/load/migration/offline/clock/.bak/IDB/lease cases on ONE single-file build, ONE engine per run.
// usage (caller holds the lock):  node saves-browser.mjs --html <new.html> --engine chromium|firefox|webkit --port 5961 --out <dir>
//        [--expect-build m4.1+abc1234] [--old-l41 <5d9efa6.html>] [--old-p1 <p1.html>] [--only S-COLD,S-OFF] [--expect-version 6]
// Oracle and case list: ../v5-saves-cases.md. Fixtures: ../fixtures (FIXTURES.sha256). Exit 0 = all HARD cases PASS.
import { serve, launch, watch, seedLS, ids, ui, start, skipOnb, play, rawSave, waitSave, lsDump, summary, noLoss, writeJSON, readText, sha256, dismissWelcome, parseSave } from './lib.mjs';
import { parseArgs } from 'node:util'; import path from 'node:path'; import { readFileSync } from 'node:fs';
const { values: A } = parseArgs({ options: { html: { type: 'string' }, engine: { type: 'string', default: 'chromium' }, port: { type: 'string', default: '5961' }, out: { type: 'string' },
  'expect-build': { type: 'string' }, 'old-l41': { type: 'string' }, 'old-p1': { type: 'string' }, only: { type: 'string' }, 'expect-version': { type: 'string', default: '6' } } });
if (!A.html || !A.out) { console.error('need --html and --out'); process.exit(2); }
const FX = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../fixtures'); const EV = +A['expect-version'];
const fx = n => readText(path.join(FX, n));
const FIX = { 'l41-A': '5d9efa6/l41-A-fresh-F0-C1.save.json', 'l41-B': '5d9efa6/l41-B-workers-F10-C12.save.json', 'v5': 'v5/m2-rc1-v5-12min.json',
  'p1-A': 'p1-30b29d3/p1-A-fresh-F0.save.json', 'p1-B': 'p1-30b29d3/p1-B-workers-F10.save.json', 'p1-C': 'p1-30b29d3/p1-C-late-F30.save.json' };
// verify fixture pins before running anything
const pins = Object.fromEntries(readFileSync(path.join(FX, 'FIXTURES.sha256'), 'utf8').trim().split('\n').map(l => { const [h, f] = l.split(/\s+/); return [f.replace(/^\.\//, ''), h]; }));
for (const f of Object.values(FIX)) if (sha256(fx(f)) !== pins[f]) { console.error('fixture pin mismatch', f); process.exit(3); }
const files = { 'new.html': A.html }; if (A['old-l41']) files['l41.html'] = A['old-l41']; if (A['old-p1']) files['p1.html'] = A['old-p1'];
const ENG = A.engine; const OUT = path.resolve(A.out); const only = A.only ? A.only.split(',') : null; const want = id => !only || only.some(o => id.startsWith(o));
const res = { engine: ENG, html_sha256: sha256(readFileSync(A.html)), expectBuild: A['expect-build'] ?? null, expectVersion: EV, startedAt: new Date().toISOString(), cases: [] };
const srv = await serve(path.join(OUT, '.serve'), files, A.port); res.serverPid = srv.pid; const br = await launch(ENG); res.browser = br.version();
let hardFail = 0;
const rec = (id, pass, d, hard = true) => { if (!pass && hard) hardFail++; res.cases.push({ id, pass: !!pass, hard, ...d }); console.log(`[${ENG}] ${pass ? 'PASS' : hard ? 'FAIL' : 'INFO-FAIL'} ${id} ${JSON.stringify(d.short ?? '')}`); };
const newCtx = () => br.newContext({ viewport: { width: 390, height: 844 } });
const buildOk = b => !b.dirty && (!A['expect-build'] || (b.meta === A['expect-build'] && b.app === A['expect-build']));
const shot = (p, id) => p.screenshot({ path: path.join(OUT, `${ENG}-${id}.png`) }).catch(() => {});
const withSavedAt = (raw, t) => { const j = JSON.parse(raw); j.savedAt = t; return JSON.stringify(j); }; // sum covers state only (save.ts:146), so savedAt edits stay valid
/** Boot `page` (new build) and return {first write after boot, ui, build}. */
async function bootNew(p, seedRaw) {
  await p.goto(srv.url + 'new.html'); const b = await ids(p); await start(p); await skipOnb(p); const u = await ui(p);
  const after = await waitSave(p, seedRaw, 7000); return { b, u, after };
}
async function idbPut(p, raw) { // seed IDB eggfarm/save/main on the game origin from a neutral same-origin page
  await p.goto(srv.url + 'blank.txt');
  await p.evaluate(r => new Promise((res, rej) => { const q = indexedDB.open('eggfarm', 1); q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains('save')) q.result.createObjectStore('save'); };
    q.onsuccess = () => { const tx = q.result.transaction('save', 'readwrite'); tx.objectStore('save').put(r, 'main'); tx.oncomplete = () => { q.result.close(); res(); }; tx.onerror = () => rej(tx.error); }; q.onerror = () => rej(q.error); }), raw);
}
try {
  // S-COLD: each frozen fixture seeded alone into the new build (fresh profile)
  for (const [k, f] of Object.entries(FIX)) { const id = `S-COLD-${k}`; if (!want(id)) continue;
    const errs = []; const ctx = await newCtx(); const p = await ctx.newPage(); watch(p, errs, id); const seed = fx(f); await seedLS(p, { 'eggfarm.save': seed });
    const { b, u, after } = await bootNew(p, seed); await shot(p, id); const nl = noLoss(seed, after, { expectVersion: EV });
    rec(id, buildOk(b) && !u.recovery && nl.pass && errs.length === 0, { fixture: f, build: b, ui: u, noLoss: nl, errors: errs, short: { build: b.meta, recovery: u.recovery, fails: nl.fails, delta: nl.delta, errs: errs.length } }); await ctx.close(); }
  // S-UP: same-origin upgrade: old Latest build boots the fixture (writes its own LS + IDB mirror), then the new build loads that origin state
  for (const [k, oldFile, f] of [['l41-B', 'l41.html', FIX['l41-B']], ['p1-B', 'p1.html', FIX['p1-B']], ['p1-C', 'p1.html', FIX['p1-C']]]) { const id = `S-UP-${k}`; if (!want(id)) continue;
    if (!files[oldFile]) { rec(id, true, { skipped: `no --old-${oldFile.replace('.html', '')}`, short: 'SKIPPED' }, false); continue; }
    const errs = []; const ctx = await newCtx(); const p = await ctx.newPage(); watch(p, errs, id + ':old'); const seed = fx(f); await seedLS(p, { 'eggfarm.save': seed });
    await p.goto(srv.url + oldFile); const ob = await ids(p); await start(p); await skipOnb(p); await dismissWelcome(p, 1200); const oldWrite = await waitSave(p, seed, 7000); await p.close({ runBeforeUnload: true });
    const q = await ctx.newPage(); watch(q, errs, id + ':new'); await q.goto(srv.url + 'blank.txt'); const before = await rawSave(q); const oldDump = await lsDump(q);
    const { b, u, after } = await bootNew(q, before); await shot(q, id); const nl = noLoss(before, after, { expectVersion: EV }); const vsFixture = noLoss(seed, after, { expectVersion: EV });
    rec(id, buildOk(b) && !u.recovery && nl.pass && vsFixture.pass && errs.length === 0, { fixture: f, oldBuild: ob.meta, oldWrite: !!oldWrite, oldKeys: Object.keys(oldDump), build: b, ui: u, noLoss: nl, noLossVsFixture: vsFixture, errors: errs,
      short: { old: ob.meta, new: b.meta, recovery: u.recovery, fails: [...nl.fails, ...vsFixture.fails], delta: nl.delta, errs: errs.length } }); await ctx.close(); }
  // S-RT: round trip: load p1-B, play, save, reload, (export/import if the build has it), second reload; state must survive every hop
  if (want('S-RT')) { const id = 'S-RT-p1-B'; const errs = []; const ctx = await newCtx(); const p = await ctx.newPage(); watch(p, errs, id); const seed = fx(FIX['p1-B']); await seedLS(p, { 'eggfarm.save': seed });
    const { b } = await bootNew(p, seed); const pl = await play(p, { taps: 10, buys: 1 }); const s1 = await waitSave(p, await rawSave(p), 7000) ?? await rawSave(p); const u1 = await ui(p);
    await p.reload(); await start(p); await skipOnb(p); const r1 = await waitSave(p, s1, 7000); const u2 = await ui(p);
    const hasIO = await p.evaluate(() => !!document.querySelector('#sImport, #sExportSave, [data-act=import-save]')); let io = 'N/A (build has no save export/import UI; M4.1 Settings has Export log only)';
    if (hasIO) io = 'PRESENT: extend S-RT with export->import at gate (case doc §3 S-RT step 4)';
    await p.reload(); await start(p); await skipOnb(p); const r2 = await waitSave(p, r1, 7000); const u3 = await ui(p); await shot(p, id);
    const n1 = noLoss(s1, r1, { expectVersion: EV }), n2 = noLoss(r1, r2, { expectVersion: EV }); const levelsKept = ['farmLevel', 'collectionLevel', 'hensLevel', 'eggValueLevel'].every(x => summary(r2)[x] === summary(s1)[x]);
    rec(id, buildOk(b) && n1.pass && n2.pass && levelsKept && !u2.recovery && !u3.recovery && errs.length === 0, { play: pl, ui: [u1, u2, u3], hop1: n1, hop2: n2, exportImport: io, errors: errs, short: { fails: [...n1.fails, ...n2.fails], coins: [summary(s1).coinsCents, summary(r1).coinsCents, summary(r2).coinsCents], io, errs: errs.length } }); await ctx.close(); }
  // S-OFF / S-CLK: savedAt moved relative to the page's real clock. Uses p1-C (no workers, so eggs only move by production).
  const off = {}; for (const [id, dt] of [['S-OFF-30s', -30e3], ['S-OFF-2h', -2 * 3600e3], ['S-OFF-3h', -3 * 3600e3], ['S-CLK-back-1d', +24 * 3600e3]]) { if (!want(id)) continue;
    const errs = []; const ctx = await newCtx(); const p = await ctx.newPage(); watch(p, errs, id); const seed = withSavedAt(fx(FIX['p1-C']), Date.now() + dt); await seedLS(p, { 'eggfarm.save': seed });
    await p.goto(srv.url + 'new.html'); const b = await ids(p); await start(p); await skipOnb(p); await p.waitForTimeout(600); const u = await ui(p); const after = await waitSave(p, seed, 7000); await shot(p, id);
    const nl = noLoss(seed, after, { expectVersion: EV }); const grant = summary(after).pendingOfflineEggs ?? 0; const sa = parseSave(after)?.savedAt; off[id] = { grant, welcome: u.welcome, welcomeText: u.welcomeText };
    let pass = buildOk(b) && nl.pass && !u.recovery && errs.length === 0;
    if (id === 'S-OFF-30s') pass &&= grant === 0 && !u.welcome;
    if (id === 'S-OFF-2h' || id === 'S-OFF-3h') pass &&= grant > 0 && u.welcome;
    if (id === 'S-CLK-back-1d') pass &&= grant === 0 && !u.welcome && sa <= Date.now() + 5 * 60e3; // re-stamped, not kept in the future
    rec(id, pass, { grant, savedAtAfter: sa, ui: u, noLoss: nl, errors: errs, short: { grant, welcome: u.welcome, fails: nl.fails, errs: errs.length } }); await ctx.close(); }
  if (off['S-OFF-2h'] && off['S-OFF-3h']) { const a = off['S-OFF-2h'].grant, c = off['S-OFF-3h'].grant; rec('S-OFF-cap', a > 0 && Math.abs(c - a) <= Math.max(1, a * 0.01), { grant2h: a, grant3h: c, rule: '2 h offline cap: 3 h away grants the same as 2 h (±1%)', short: { a, c } }); }
  // S-BAK: corrupt main (truncated) + valid .bak (p1-B) -> recovery restores the .bak state, no loss vs .bak
  if (want('S-BAK')) { const id = 'S-BAK-p1-B'; const errs = []; const ctx = await newCtx(); const p = await ctx.newPage(); watch(p, errs, id); const bak = fx(FIX['p1-B']);
    // Race fix (QA-D-1030-SAVES-RC-1 (1)): `prev` = the planted truncated main, so waitSave returns only the game's own rewrite;
    // the UI is read only after .recovery-layer is attached (Firefox could read it before the restore screen mounted: dry-run a923206, 1/3 FAIL).
    const trunc = bak.slice(0, Math.floor(bak.length / 2)); await seedLS(p, { 'eggfarm.save': trunc, 'eggfarm.save.bak': bak });
    await p.goto(srv.url + 'new.html'); const b = await ids(p); await start(p); await skipOnb(p);
    const layer = await p.waitForSelector('.recovery-layer', { state: 'attached', timeout: 10000 }).then(() => true, () => false);
    const u = await ui(p); const after = await waitSave(p, trunc, 7000); await shot(p, id);
    const nl = noLoss(bak, after === trunc ? null : after, { expectVersion: EV }); const dump = await lsDump(p); const kept = Object.keys(dump).some(k => k.startsWith('eggfarm.save.corrupt'));
    rec(id, buildOk(b) && layer && u.recovery && nl.pass && kept, { ui: u, layer, noLoss: nl, corruptKept: kept, errors: errs, short: { layer, recovery: u.recoveryOutcome, fails: nl.fails, kept, errs: errs.length } }); await ctx.close(); }
  // S-IDB: LS main absent, IDB main = valid p1-B -> silent restore (save_restore{source:'idb'}), no loss
  if (want('S-IDB')) { const id = 'S-IDB-p1-B'; const errs = []; const ctx = await newCtx(); const p = await ctx.newPage(); watch(p, errs, id); const raw = fx(FIX['p1-B']); await idbPut(p, raw);
    const { b, u, after } = await bootNew(p, null); await shot(p, id); const nl = noLoss(raw, after, { expectVersion: EV });
    const tel = await p.evaluate(() => { try { return JSON.parse(window.eggfarmExportTelemetry()); } catch { return null; } }); const evs = JSON.stringify(tel ?? '');
    const restore = /"save_restore"/.test(evs) && /"source":"idb"/.test(evs); const wrongName = /"save_restored"/.test(evs);
    rec(id, buildOk(b) && !u.recovery && nl.pass && restore && !wrongName && errs.length === 0, { ui: u, noLoss: nl, saveRestoreEvent: restore, save_restored_seen: wrongName, errors: errs, short: { fails: nl.fails, restore, errs: errs.length } }); await ctx.close(); }
  // S-LEASE: two tabs, one context. The newer tab owns the save; the older tab freezes and writes nothing more; no loss.
  if (want('S-LEASE')) { const id = 'S-LEASE-p1-B'; const errs = []; const ctx = await newCtx(); const p1 = await ctx.newPage(); watch(p1, errs, id + ':t1'); const seed = fx(FIX['p1-B']); await seedLS(p1, { 'eggfarm.save': seed });
    const r1 = await bootNew(p1, seed); const p2 = await ctx.newPage(); watch(p2, errs, id + ':t2'); await p2.goto(srv.url + 'new.html'); await start(p2); await skipOnb(p2); await p2.waitForTimeout(1500);
    const t1 = await ui(p1); const t2 = await ui(p2); const atTakeover = await rawSave(p2); await p1.locator('#collect').click({ force: true }).catch(() => {}); await p2.waitForTimeout(6000);
    const later = await rawSave(p2); const nl = noLoss(seed, later, { expectVersion: EV }); await shot(p1, id + '-t1'); await shot(p2, id + '-t2');
    const t1Frozen = t1.guardBlocked; rec(id, buildOk(r1.b) && t1Frozen && !t2.guardBlocked && !t2.recovery && nl.pass && errs.length === 0, { t1, t2, noLoss: nl, wroteAfterTakeover: later !== atTakeover, errors: errs,
      short: { t1Frozen, t2Blocked: t2.guardBlocked, fails: nl.fails, errs: errs.length } }); await ctx.close(); }
} finally { await br.close(); await srv.stop(); }
res.finishedAt = new Date().toISOString(); res.hardFail = hardFail; writeJSON(path.join(OUT, `saves-${ENG}.json`), res);
console.log(`[${ENG}] SAVES ${hardFail ? hardFail + ' HARD FAIL' : 'OK'} (${res.cases.length} cases)`); process.exit(hardFail ? 1 : 0);
