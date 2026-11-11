// Runtime build-id + core-loop smoke for one single-file html, one engine (caller holds the lock).
// usage: node runtime-smoke.mjs --html <f> --port 5961 --out <dir> --expect-build <prefix+sha7> [--engine chromium] [--bad-save <file>]
// --bad-save: step 8(e) rollback guard: a save written by the bad build loads on this build with no recovery/newer-save lock and no loss.
import { serve, launch, watch, seedLS, ids, ui, start, skipOnb, play, rawSave, waitSave, noLoss, writeJSON, sha256, readText } from './lib.mjs';
import { parseArgs } from 'node:util'; import path from 'node:path'; import { readFileSync } from 'node:fs';
const { values: A } = parseArgs({ options: { html: { type: 'string' }, port: { type: 'string', default: '5961' }, out: { type: 'string' }, 'expect-build': { type: 'string' }, engine: { type: 'string', default: 'chromium' }, 'bad-save': { type: 'string' } } });
if (!A.html || !A.out || !A['expect-build']) { console.error('need --html --out --expect-build'); process.exit(2); }
const OUT = path.resolve(A.out); const X = A['expect-build']; const res = { html_sha256: sha256(readFileSync(A.html)), expectBuild: X, engine: A.engine, checks: [] }; let bad = 0;
const ok = (k, v, d) => { if (!v) bad++; res.checks.push({ k, pass: !!v, d }); console.log(`[${A.engine}] ${v ? 'PASS' : 'FAIL'} ${k} ${JSON.stringify(d ?? '')}`); };
const srv = await serve(path.join(OUT, '.serve'), { 'egg-farm.html': A.html }, A.port); res.serverPid = srv.pid; const br = await launch(A.engine); res.browser = br.version();
try {
  const errs = []; const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); watch(p, errs, 'smoke');
  await p.goto(srv.url + 'egg-farm.html'); const id = await ids(p); ok('R1 runtime build-id (meta + #app) == expected, no +dirty', id.meta === X && id.app === X && !id.dirty, id);
  await start(p); await skipOnb(p); const u0 = await ui(p); ok('R2 fresh boot, no recovery dialog', !u0.recovery, u0);
  const pl = await play(p, { taps: 24, gapMs: 450, buys: 0 }); const u1 = await ui(p); ok('R3 collect + sell changes coins', u1.coins !== u0.coins, { u0, u1, pl });
  const s1 = await waitSave(p, null, 7000); await p.reload(); await start(p); await skipOnb(p); const s2 = await waitSave(p, s1, 7000); const u2 = await ui(p);
  const nl = noLoss(s1, s2); ok('R4 save -> reload persists (no-loss oracle)', nl.pass && u2.coins === u1.coins, { fails: nl.fails, u1: u1.coins, u2: u2.coins });
  await p.screenshot({ path: path.join(OUT, `runtime-${A.engine}.png`) }); ok('R5 0 page/console/HTTP errors', errs.length === 0, errs); await ctx.close();
  if (A['bad-save']) { const errs2 = []; const c2 = await br.newContext({ viewport: { width: 390, height: 844 } }); const q = await c2.newPage(); watch(q, errs2, 'badsave'); const raw = readText(A['bad-save']);
    await seedLS(q, { 'eggfarm.save': raw }); await q.goto(srv.url + 'egg-farm.html'); await start(q); await skipOnb(q); const u = await ui(q); const after = await waitSave(q, raw, 7000);
    const n = noLoss(raw, after, { expectVersion: JSON.parse(raw).version }); await q.screenshot({ path: path.join(OUT, `rollback-badsave-${A.engine}.png`) });
    ok('RB-8e bad-build save loads on the restored build: no recovery, not read-only, no loss', !u.recovery && !u.newer && !!after && after !== raw && n.pass && errs2.length === 0, { ui: u, fails: n.fails, errs: errs2 }); await c2.close(); }
} finally { await br.close(); await srv.stop(); }
res.bad = bad; writeJSON(path.join(OUT, `runtime-${A.engine}.json`), res); console.log(bad ? `RUNTIME: ${bad} FAIL` : 'RUNTIME: OK'); process.exit(bad ? 1 : 0);
