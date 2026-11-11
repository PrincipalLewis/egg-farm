#!/usr/bin/env node
// G-8 / T-AC9 C-1 RUNTIME probe (TASK saves-qa/rev12-tel; errata rev 13 a0e8f6d7 PINNED, manifest L131; C-1 RULED D-PMM-2026-10-30-TAPFIELDS,
// sales-stopped-spec cfff3817 errata note 3 L868 + §8 L290-294). Runs the RC's own src/telemetry/schema.ts validateEvent/isPinned:
//   (a) fatigue_cue_tapped with all six SS §8 fields {surface, loss_per_s, loss_share, n_tired, n_asleep, n_paused} -> []; each field missing -> rejected;
//   (b) n_tired + n_asleep + n_paused <= 4: sum 4 accepted, sum 5 (each term <= 4) REJECTED;
//   (c) suppressed_by_stall on tapped REJECTED (shown only); fatigue_cue_shown 6 + suppressed_by_stall accepted, shown without it rejected;
//   plus dead_zone / zero_gain_purchase pinned (isPinned) and dead_zone reason 'cap' rejected (rev 13 row #22, reason single value none_affordable L105; pre-merge blocker (c));
//   zero_gain_purchase capped marker rejected (row #21, pre-merge blocker (b)); (b) above = pre-merge blocker (a).
// Read-only: `git archive <rc> src` into a temp dir, esbuild bundle, import. Never a PR head (D-CEO-20261030-10): pass an rc/v5 SHA.
// usage: node g8-validate-c1.mjs --git <repo> --rc <sha> [--esbuild <bin>]. exit 0 PASS, 1 FAIL (expected until the schema.ts PR lands on rc/v5).
import { execFileSync } from 'node:child_process'; import { mkdtempSync, rmSync, existsSync } from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { parseArgs } from 'node:util';
const { values: A } = parseArgs({ options: { git: { type: 'string' }, rc: { type: 'string' }, esbuild: { type: 'string', default: '/workspace/wt-v5-telemetry-schema/node_modules/.bin/esbuild' } } });
if (!A.git || !A.rc) { console.error('need --git --rc'); process.exit(2); }
const P = [], out = (id, ok, why) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${id}${why ? ': ' + why : ''}`); if (!ok) P.push(id.split(' ')[0]); };
const T = mkdtempSync(path.join(os.tmpdir(), 'g8v-')); let m = null;
try { execFileSync('sh', ['-c', `git -C "$0" archive "$1" src | tar -x -C "$2"`, A.git, A.rc, T], { stdio: ['ignore', 'ignore', 'pipe'] }); } catch (e) { console.log(`archive failed: ${String(e.stderr || e).slice(0, 200)}`); }
const st = path.join(T, 'src/telemetry/schema.ts');
out('G8V-0 src/telemetry/schema.ts exists at the RC SHA', existsSync(st), existsSync(st) ? '' : `absent at ${A.rc}`);
if (existsSync(st)) { try { execFileSync(A.esbuild, [st, '--bundle', '--format=esm', '--platform=node', `--outfile=${path.join(T, 'schema.mjs')}`, '--log-level=error'], { stdio: ['ignore', 'ignore', 'pipe'] }); m = await import(path.join(T, 'schema.mjs')); }
  catch (e) { out('G8V-0b schema.ts bundles and imports', false, String(e.stderr || e.message || e).slice(0, 300)); } }
if (m) { const V = e => { try { const r = m.validateEvent(e); return Array.isArray(r) ? r : ['validateEvent did not return string[]']; } catch (x) { return ['threw: ' + x.message]; } };
  const env = { ts: 1730000000000, sid: 'abc123', fgMs: 1000 }, f6 = { surface: 'hud_chip', loss_per_s: 125, loss_share: 0.183, n_tired: 1, n_asleep: 1, n_paused: 0 };
  const tap = o => { const e = { type: 'fatigue_cue_tapped', ...env, ...f6, ...o }; for (const k of Object.keys(e)) if (e[k] === undefined) delete e[k]; return e; };
  const shown = o => { const e = { type: 'fatigue_cue_shown', ...env, ...f6, suppressed_by_stall: false, ...o }; for (const k of Object.keys(e)) if (e[k] === undefined) delete e[k]; return e; };
  const r0 = V(tap({})); const miss = Object.keys(f6).filter(k => V(tap({ [k]: undefined })).length === 0);
  out('G8V-C1a fatigue_cue_tapped with the six SS §8 fields validates ([]), and each of the six missing is rejected', r0.length === 0 && miss.length === 0, [r0.length ? 'valid tapped rejected: ' + r0.join('; ') : '', miss.length ? 'accepted without: ' + miss.join(',') : ''].filter(Boolean).join(' | '));
  const s4 = V(tap({ n_tired: 2, n_asleep: 1, n_paused: 1 })), s5 = V(tap({ n_tired: 2, n_asleep: 2, n_paused: 1 })), s5b = V(shown({ n_tired: 3, n_asleep: 1, n_paused: 1 }));
  out('G8V-C1b n_tired + n_asleep + n_paused <= 4: sum 4 accepted, sum 5 REJECTED on tapped and shown (SS §8 L293)', s4.length === 0 && s5.length > 0 && s5b.length > 0, [s4.length ? 'sum 4 rejected: ' + s4.join('; ') : '', s5.length ? '' : 'tapped sum 5 accepted', s5b.length ? '' : 'shown sum 5 accepted'].filter(Boolean).join(' | '));
  const sb = V(tap({ suppressed_by_stall: false })), shOk = V(shown({ suppressed_by_stall: true })), shNo = V(shown({ suppressed_by_stall: undefined }));
  out('G8V-C1c suppressed_by_stall REJECTED on fatigue_cue_tapped; shown requires it (SS note 3: shown only)', sb.length > 0 && shOk.length === 0 && shNo.length > 0, [sb.length ? '' : 'tapped + suppressed_by_stall accepted', shOk.length ? 'valid shown rejected: ' + shOk.join('; ') : '', shNo.length ? '' : 'shown without suppressed_by_stall accepted'].filter(Boolean).join(' | '));
  const pin = n => { try { return m.isPinned({ type: n, ...env }) === true; } catch { return false; } };
  const dz = o => ({ type: 'dead_zone', ...env, farm: 12, s: 30, reason: 'none_affordable', ...o }), dzc = V(dz({ reason: 'cap' })), dzo = V(dz({}));
  out("G8V-DZ dead_zone + zero_gain_purchase isPinned; dead_zone valid accepted, reason 'cap' rejected (rev 13 rows #21/#22, L105 single value, V-3)", pin('dead_zone') && pin('zero_gain_purchase') && dzo.length === 0 && dzc.length > 0,
    [pin('dead_zone') ? '' : 'dead_zone not pinned', pin('zero_gain_purchase') ? '' : 'zero_gain_purchase not pinned', dzo.length ? 'valid dead_zone rejected: ' + dzo.join('; ') : '', dzc.length ? '' : "reason 'cap' accepted"].filter(Boolean).join(' | ')); }
if (m) { const env = { ts: 1730000000000, sid: 'abc123', fgMs: 1000 }, V = e => { try { const r = m.validateEvent(e); return Array.isArray(r) ? r : ['not string[]']; } catch (x) { return ['threw: ' + x.message]; } };
  const zg = { type: 'zero_gain_purchase', ...env, key: 'HENS', farm: 12, level: 3, meaningful_eta_s: 20.5 }, z0 = V(zg), zm = V({ ...zg, capped: true, events: 50 }), zmo = V({ type: 'zero_gain_purchase', ...env, capped: true, events: 50 });
  out('G8V-ZG zero_gain_purchase: valid event accepted; capped marker {capped:true, events:50} REJECTED (rev 13 row #21: no marker; pre-merge blocker (b))', z0.length === 0 && zm.length > 0 && zmo.length > 0,
    [z0.length ? 'valid zero_gain_purchase rejected: ' + z0.join('; ') : '', zm.length ? '' : 'event + capped marker accepted', zmo.length ? '' : 'bare capped marker accepted'].filter(Boolean).join(' | ')); }
rmSync(T, { recursive: true, force: true });
console.log(P.length ? `G8V: FAIL (${P.length}) ${P.join(' ')}` : 'G8V: PASS'); process.exit(P.length ? 1 : 0);
