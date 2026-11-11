// Pure checks for m4a-v3-delta.mjs (self-test: node delta-lib.mjs --selftest). Rules: m4-design @f1869c4 ADR M4-12/15/16, m4a-spec v1.6 M4A-31(g)(h); v1.10 (j)(k), ADR M4-24.
import { backupStatus, parseBackup } from '../m3-scripts/m4-guard-lib.mjs';
// m4a-spec v1.9 + m4-design v0.3.1 @cf66ce5 (ADR M4-19..24, §3c/§3d). M4-A commit is LS-ONLY (§3d): no IDB v6_backup, zero IDB writes until the commit is confirmed by LS read-back.
// One 1500 ms limit (open/read). IDB write rows (idb_write_timeout, store idb quota/error) are S-4 rows under §3d. Params stay overridable.
export const IDB_TIMEOUT_MS = +(process.env.IDB_TIMEOUT_MS ?? 1500); // open with no answer by T => deferred; T-1 counts as available
export const IDB_HANG_MS = +(process.env.IDB_HANG_MS ?? IDB_TIMEOUT_MS); // (h) write still pending at the limit => abort, reason idb_write_timeout
export const ATTEMPTS_KEY = process.env.ATTEMPTS_KEY ?? 'eggfarm.save.migration_attempts';
/** variant -> { path: 'unavailable'|'deferred'|'abort'|'idb-ok', reason } */
export const PATHS = Object.freeze({
  none: { path: 'unavailable', reason: 'no_global' }, security: { path: 'unavailable', reason: 'security' }, invalidstate: { path: 'unavailable', reason: 'security' /* security = SecurityError, InvalidStateError, private-mode errors (v1.9) */ }, blocked: { path: 'deferred', reason: 'idb_blocked' /* v1.9 / M4-20: onblocked is a deferral, attempt_count+1 */ },
  timeout: { path: 'deferred', reason: 'idb_timeout' }, open_failed: { path: 'deferred', reason: null, anyReason: true /* other open failure: no listed reason -> any accepted, observed reason recorded */ }, read_error: { path: 'deferred', reason: 'idb_read_error' },
  under: { path: 'idb-ok' }, quota: { path: 'abort', s4: true }, error: { path: 'abort', s4: true }, hang: { path: 'abort', reason: 'idb_write_timeout', s4: true }, readback_mismatch: { path: 'abort', reason: 'readback_mismatch' }, quota_headroom: { path: 'deferred', reason: 'quota_headroom' }, main_newer: { path: 'abort', reason: 'idb_main_changed' }, main_fail: { path: 'abort', reason: 'idb_main_changed' } });
export const UNAVAIL_REASONS = ['no_global', 'security'], DEFER_REASONS = ['idb_timeout', 'idb_read_error', 'idb_blocked', 'quota_headroom'];
export const PROBE_KEY = process.env.PROBE_KEY ?? 'eggfarm.save.headroom_probe', HEADROOM_MARGIN = 64 * 1024; // §3d-1
/** §3d-3: first IDB write of 'main' only AFTER the committed main was read back byte-equal from LS AND the LS backup read back with the matching id (both after the commit write). No IDB write before that. */
// v1.10 (k): zero IDB writes (put/add/delete/clear + readwrite/versionchange tx) during the migration attempt = everything before the
// read-back-confirmed commit (or the whole log when no commit happened). Opens and reads are fine.
export const IDB_WRITE_OPS = ['idb.put', 'idb.add', 'idb.delete', 'idb.clear', 'idb.tx.rw'];
export function attemptIdbWrites(seq) { const i = seq.findIndex(e => e.op === 'save.set' && (e.marked || e.v6BackupId)); const end = i < 0 ? seq.length : (seq.slice(i).findIndex(e => e.op === 'bk.get') + i + 1 || seq.length);
  const w = seq.slice(0, end).filter(e => IDB_WRITE_OPS.includes(e.op)); return { ok: w.length === 0, writes: w.slice(0, 10), committed: i >= 0 }; }
export function mirrorAfterReadback(seq) { const commit = seq.find(e => e.op === 'save.set' && (e.marked || e.v6BackupId)); if (!commit) return { ok: false, why: 'no commit write' };
  const idbBefore = seq.filter(e => e.op.startsWith('idb.') && /^idb\.(put|add|delete|clear)$/.test(e.op) && e.n < commit.n);
  const mainRb = seq.find(e => e.op === 'save.get' && e.n > commit.n && e.h === commit.h), bkRb = seq.find(e => e.op === 'bk.get' && e.n > commit.n && e.migrationId === commit.v6BackupId);
  const firstIdb = seq.find(e => /^idb\.(put|add|delete|clear)$/.test(e.op) && e.n > commit.n);
  const ok = idbBefore.length === 0 && !!mainRb && !!bkRb && (!firstIdb || firstIdb.n > Math.max(mainRb.n, bkRb.n));
  return { ok, idbWritesBeforeCommit: idbBefore.length, mainReadback: mainRb?.n ?? null, bkReadback: bkRb?.n ?? null, firstIdbWrite: firstIdb ? { n: firstIdb.n, op: firstIdb.op, key: firstIdb.key } : null, commit: commit.n }; }
/** reason check per variant: exact listed reason, or (anyReason) anything recorded. */
export function reasonOk(variant, got) { const P = PATHS[variant]; if (P.anyReason) return true; if (P.path === 'unavailable') return UNAVAIL_REASONS.includes(got) && got === P.reason; if (P.path === 'deferred') return DEFER_REASONS.includes(got) && got === P.reason; return P.reason ? got === P.reason : true; }
/** migration_attempts must be absent or a non-negative integer string. */
export const attemptsVal = v => v == null ? null : (/^(0|[1-9]\d*)$/.test(v) ? +v : NaN);
/** attempt_count sequence check across consecutive deferred loads: 1,2,3 and stuck_on_v6:true from 3. */
// v1.12: capped at ATTEMPTS_CAP (1,2,3,3 ...), stuck_on_v6 from 3; aborts and deferrals both count.
export const ATTEMPTS_CAP = 3;
export function attemptsOk(events, keys = []) { const r = []; keys.forEach((k, i) => { const w = Math.min(i + 1, ATTEMPTS_CAP); if (attemptsVal(k) !== w) r.push(`load ${i + 1}: ${ATTEMPTS_KEY}=${JSON.stringify(k)} (want integer ${w})`); }); events.forEach((e, i) => { const want = Math.min(i + 1, ATTEMPTS_CAP); if (e?.attempt_count !== want) r.push(`load ${i + 1}: attempt_count ${e?.attempt_count}`); if ((want >= 3) !== (e?.stuck_on_v6 === true)) r.push(`load ${i + 1}: stuck_on_v6 ${e?.stuck_on_v6}`); }); return r; }
/** HoQA bar (M4-16): LS v6_backup read back with migrationId === committed v6BackupId BEFORE the first in-place (marked) save write. */
export function readbackBeforeInPlace(seq) { const first = seq.find(e => e.op === 'save.set' && (e.marked || e.v6BackupId)); if (!first) return { ok: false, why: 'no in-place write' };
  const rb = seq.filter(e => e.op === 'bk.get' && e.n < first.n && e.present && e.migrationId && e.migrationId === first.v6BackupId);
  const wr = seq.filter(e => e.op === 'bk.set' && e.n < first.n);
  return rb.length && wr.length && wr[0].n < rb[rb.length - 1].n ? { ok: true, firstInPlace: first.n, readback: rb[rb.length - 1].n } : { ok: false, why: rb.length ? 'readback before backup write' : 'no matching readback before in-place write', firstInPlace: first, bkOps: seq.filter(e => e.op.startsWith('bk.')).slice(0, 6) }; }
/** Committed-backup assertion for a migrated save: record shape, raw == original bytes, id == state.v6BackupId. */
export function committedOk(saveRaw, rec, originalRaw) { const st = backupStatus(saveRaw, rec), b = parseBackup(rec); return { ok: st === 'committed' && b?.raw === originalRaw, status: st, rawEq: b?.raw === originalRaw }; }
/** Aborted attempt: no committed backup may exist (orphans tolerated, M4-15). */
export const noCommitted = (saveRaw, recs) => recs.every(r => backupStatus(saveRaw, r) !== 'committed');
export const countEvent = (telemetryJson, name) => { if (!telemetryJson) return 0; let o; try { o = JSON.parse(telemetryJson); } catch { return 0; } const a = Array.isArray(o) ? o : (o.events ?? []); return a.filter(e => (e.name ?? e.event ?? e.type) === name).length; };
export const eventProps = (telemetryJson, name) => { try { const o = JSON.parse(telemetryJson); return (Array.isArray(o) ? o : o.events ?? []).filter(e => (e.name ?? e.event ?? e.type) === name); } catch { return []; } };

// ---- m4a-spec v1.8 (HoP 22:04, N8)
export const EXPLAINER_SEL = process.env.EXPLAINER_SEL ?? 'text=Upgrades got an upgrade!'; // spec gives copy, no selector (title per Art & UX v1.2)
export const S5 = Object.freeze({ F: 10, C: 7, awayMs: 3 * 3600e3, bootGrant: 19800, nextGrant: 24750, away1h: { boot: 9900, next: 12375 } }); // M4A-30 N8 AC
/** Unmarked v6 F10/C7 save, savedAt = nowMs - awayMs, valid sum. Strips any track fields/marker. */
export async function mkS5Save(baseRaw, nowMs, awayMs = S5.awayMs) { const { serialize } = await import('../m3-scripts/m4-guard-lib.mjs'); const d = JSON.parse(baseRaw), st = { ...d.state, farmLevel: S5.F, collectionLevel: S5.C };
  for (const k of ['tracksV7', 'hensLevel', 'eggValueLevel', 'celebratedMilestones', 'v6BackupId', 'migrationRefundCents', 'seenTracksExplainer']) delete st[k]; return serialize(6, nowMs - awayMs, st); }
/** Re-age a stored save by awayMs (savedAt -= awayMs, sum recomputed over the unchanged state bytes). */
export async function ageSave(raw, awayMs = S5.awayMs) { const { checksum } = await import('../m3-scripts/m4-guard-lib.mjs'); const m = raw.match(/^\{"version":(\d+),"savedAt":(\d+),"sum":"[0-9a-f]{8}","state":([\s\S]*)\}$/); if (!m) throw new Error('unexpected save layout');
  return `{"version":${m[1]},"savedAt":${+m[2] - awayMs},"sum":"${checksum(m[3])}","state":${m[3]}}`; }
/** Offline grant eggs from telemetry offline_grant events (field eggs|amount|granted). */
export const grantEggs = T => { const e = eventProps(T, 'offline_grant'); return e.map(x => x.eggs ?? x.amount ?? x.granted ?? x.offline_eggs ?? null); };
/** M4A-31(i) record shape: exactly {migrationId, raw}, no other keys. */
export const exactShape = rec => { try { const o = JSON.parse(rec); return !!o && JSON.stringify(Object.keys(o).sort()) === '["migrationId","raw"]' && /^[0-9a-f]{16}$/.test(o.migrationId) && typeof o.raw === 'string'; } catch { return false; } };

if (process.argv[2] === '--selftest') { const assert = (await import('node:assert/strict')).default; const { serialize, mkBackup } = await import('../m3-scripts/m4-guard-lib.mjs');
  const id = '00112233445566aa', v6 = serialize(6, 1, { coinsCents: 5 }), mig = serialize(6, 2, { coinsCents: 5, tracksV7: 1, v6BackupId: id });
  const good = [{ n: 0, op: 'bk.set' }, { n: 1, op: 'bk.get', present: true, migrationId: id }, { n: 2, op: 'save.set', marked: true, v6BackupId: id }];
  assert.equal(readbackBeforeInPlace(good).ok, true);
  assert.equal(readbackBeforeInPlace([{ n: 0, op: 'bk.set' }, { n: 1, op: 'save.set', marked: true, v6BackupId: id }, { n: 2, op: 'bk.get', present: true, migrationId: id }]).ok, false); // readback after in-place
  assert.equal(readbackBeforeInPlace([{ n: 0, op: 'bk.set' }, { n: 1, op: 'bk.get', present: true, migrationId: 'ffffffffffffffff' }, { n: 2, op: 'save.set', marked: true, v6BackupId: id }]).ok, false); // id mismatch
  assert.equal(readbackBeforeInPlace([{ n: 0, op: 'bk.get', present: true, migrationId: id }, { n: 1, op: 'bk.set' }, { n: 2, op: 'save.set', marked: true, v6BackupId: id }]).ok, false); // read before write (stale)
  assert.equal(readbackBeforeInPlace([{ n: 0, op: 'save.set', marked: false }]).ok, false);
  assert.deepEqual(committedOk(mig, mkBackup(v6, id), v6), { ok: true, status: 'committed', rawEq: true });
  assert.equal(committedOk(mig, mkBackup(v6 + ' ', id), v6).ok, false); assert.equal(committedOk(mig, mkBackup(v6, 'ffffffffffffffff'), v6).status, 'orphan');
  assert.equal(noCommitted(v6, [mkBackup(v6, id), null]), true); assert.equal(noCommitted(mig, [mkBackup(v6, id)]), false);
  const T = JSON.stringify({ events: [{ name: 'save_backup_idb_unavailable', reason: 'timeout' }, { name: 'x' }] }); assert.equal(countEvent(T, 'save_backup_idb_unavailable'), 1); assert.equal(countEvent('[{"type":"save_migration_aborted"}]', 'save_migration_aborted'), 1); assert.equal(countEvent(null, 'x'), 0);
  assert.equal(PATHS.timeout.path, 'deferred'); assert.equal(PATHS.blocked.path, 'deferred'); assert.equal(reasonOk('blocked', 'idb_blocked'), true); assert.equal(reasonOk('blocked', 'blocked'), false); assert.equal(reasonOk('quota_headroom', 'quota_headroom'), true); assert.equal(reasonOk('main_newer', 'idb_main_changed'), true); assert.equal(PATHS.under.path, 'idb-ok'); assert.equal(PATHS.hang.path, 'abort'); assert.equal(PATHS.read_error.reason, 'idb_read_error');
  assert.deepEqual(attemptsOk([{ attempt_count: 1 }, { attempt_count: 2 }, { attempt_count: 3, stuck_on_v6: true }]), []);
  assert.equal(attemptsOk([{ attempt_count: 1 }, { attempt_count: 1 }, { attempt_count: 3 }]).length, 2); assert.equal(attemptsOk([{ attempt_count: 1, stuck_on_v6: true }]).length, 1);
  assert.equal(reasonOk('invalidstate', 'security'), true); assert.equal(reasonOk('invalidstate', 'blocked'), false); assert.equal(reasonOk('none', 'no_global'), true); assert.equal(reasonOk('none', 'blocked'), false);
  assert.equal(reasonOk('timeout', 'idb_timeout'), true); assert.equal(reasonOk('timeout', 'idb_read_error'), false); assert.equal(reasonOk('read_error', 'idb_read_error'), true); assert.equal(reasonOk('open_failed', 'whatever'), true); assert.equal(reasonOk('hang', 'idb_write_timeout'), true); assert.equal(reasonOk('hang', 'idb_timeout'), false);
  assert.equal(attemptsVal('3'), 3); assert.equal(attemptsVal(null), null); assert.ok(Number.isNaN(attemptsVal('3.0'))); assert.ok(Number.isNaN(attemptsVal('{"n":1}')));
  assert.deepEqual(attemptsOk([{ attempt_count: 1 }, { attempt_count: 2 }, { attempt_count: 3, stuck_on_v6: true }], ['1', '2', '3']), []); assert.equal(attemptsOk([{ attempt_count: 1 }], ['"1"']).length, 1);
  assert.equal(IDB_HANG_MS, +(process.env.IDB_HANG_MS ?? IDB_TIMEOUT_MS));
  assert.equal(IDB_TIMEOUT_MS, +(process.env.IDB_TIMEOUT_MS ?? 1500));
  // v0.3.1 §3d-3 mirror resume order
  const C = { n: 3, op: 'save.set', marked: true, v6BackupId: id, h: 'aa:1' };
  assert.equal(mirrorAfterReadback([{ n: 1, op: 'bk.set' }, { n: 2, op: 'bk.get', present: true, migrationId: id }, C, { n: 4, op: 'save.get', h: 'aa:1' }, { n: 5, op: 'bk.get', present: true, migrationId: id }, { n: 6, op: 'idb.put', key: 'main' }]).ok, true);
  assert.equal(mirrorAfterReadback([C, { n: 4, op: 'idb.put', key: 'main' }, { n: 5, op: 'save.get', h: 'aa:1' }, { n: 6, op: 'bk.get', present: true, migrationId: id }]).ok, false); // mirror before readback
  assert.equal(mirrorAfterReadback([{ n: 0, op: 'idb.put', key: 'main' }, C, { n: 4, op: 'save.get', h: 'aa:1' }, { n: 5, op: 'bk.get', present: true, migrationId: id }]).ok, false); // IDB write during attempt
  assert.equal(mirrorAfterReadback([C, { n: 4, op: 'save.get', h: 'bb:1' }, { n: 5, op: 'bk.get', present: true, migrationId: id }]).ok, false); // main readback not byte-equal
  // v1.8
  const base = serialize(6, 1000, { coinsCents: 5, farmLevel: 19, collectionLevel: 17, tracksV7: 1, hensLevel: 19 }), now = 1e13, s5 = await mkS5Save(base, now); const d5 = JSON.parse(s5);
  assert.equal(d5.state.farmLevel, 10); assert.equal(d5.state.collectionLevel, 7); assert.equal('tracksV7' in d5.state, false); assert.equal(d5.savedAt, now - 3 * 3600e3);
  const { checksum } = await import('../m3-scripts/m4-guard-lib.mjs'); assert.equal(d5.sum, checksum(JSON.stringify(d5.state)));
  const aged = JSON.parse(await ageSave(s5)); assert.equal(aged.savedAt, d5.savedAt - 3 * 3600e3); assert.equal(aged.sum, d5.sum); assert.deepEqual(aged.state, d5.state);
  assert.equal(S5.bootGrant, 2.75 * 7200 * 1.0); assert.equal(S5.nextGrant, 2.75 * 7200 * 1.25); assert.equal(S5.away1h.boot, 2.75 * 3600); assert.equal(S5.away1h.next, 12375);
  assert.deepEqual(grantEggs(JSON.stringify({ events: [{ name: 'offline_grant', eggs: 19800 }] })), [19800]);
  assert.equal(exactShape(mkBackup('x', 'aaaaaaaaaaaaaaaa')), true); assert.equal(exactShape(JSON.stringify({ migrationId: 'aaaaaaaaaaaaaaaa', raw: 'x', extra: 1 })), false); assert.equal(exactShape(JSON.stringify({ raw: 'x' })), false); assert.equal(ATTEMPTS_KEY.length > 0, true);
  assert.equal(attemptIdbWrites([{ op: 'idb.tx.rw' }, { op: 'save.set', marked: true }]).ok, false);
  assert.equal(attemptIdbWrites([{ op: 'save.set', marked: true }, { op: 'bk.get' }, { op: 'idb.put', key: 'main' }]).ok, true); // mirror after read-back is fine
  assert.equal(attemptIdbWrites([{ op: 'idb.get' }, { op: 'idb.delete' }]).ok, false); // no commit: whole session
  assert.equal(attemptIdbWrites([{ op: 'idb.get' }]).ok, true);
  assert.ok(DEFER_REASONS.includes('quota_headroom') && PROBE_KEY === 'eggfarm.save.headroom_probe');
  console.log(`delta-lib selftest OK (v1.10/cf66ce5; PROBE_KEY=${PROBE_KEY}; IDB_TIMEOUT_MS=${IDB_TIMEOUT_MS}, IDB_HANG_MS=${IDB_HANG_MS}, ATTEMPTS_KEY=${ATTEMPTS_KEY})`); }

// ---- m4a-spec v1.14 (HoP approved): M4A-4(r4) offline from economy.csv; M4A-30 single x1.0 grant (r3a/r3b). Expected values come from the CSV, never hardcoded.
export const ECON_CSV = process.env.ECON_CSV ?? '/workspace/egg-farm-studio/product/economy.csv';
export const ECON_MS_CSV = process.env.ECON_MS_CSV ?? '/workspace/egg-farm-studio/product/economy.m4-candidate.csv'; // hens_msK_* until the M4 merge (spec §2: test M4 cols against the candidate)
export function parseCsv(text) { const [h, ...rows] = text.trim().split(/\r?\n/); const H = h.split(','); return rows.filter(Boolean).map(l => Object.fromEntries(l.split(',').map((v, i) => [H[i], v]))); }
/** Load rate/cap rows (economy.csv) + Hens milestone config (first file that has hens_ms1_level). */
export function loadEconomy(fsMod, csv = ECON_CSV, msCsv = ECON_MS_CSV) { const rows = parseCsv(fsMod.readFileSync(csv, 'utf8')); let ms = rows; if (!('hens_ms1_level' in rows[0])) ms = parseCsv(fsMod.readFileSync(msCsv, 'utf8'));
  const r0 = ms[0], milestones = [1, 2, 3].filter(k => r0[`hens_ms${k}_level`] != null).map(k => ({ level: +r0[`hens_ms${k}_level`], mult: +r0[`hens_ms${k}_offline_mult`] }));
  return { rows, milestones, src: { rate: csv, ms: ms === rows ? csv : msCsv } }; }
export const offlineMult = (E, H) => E.milestones.filter(m => H >= m.level).reduce((a, m) => Math.max(a, m.mult), 1.0);
/** M4A-4 + r3 mn1/mn2 + r4: floor(rate[H] x min(away, 2 h) x mult), then cap offline_max_eggs_2h[H] x mult; < 60 s -> 0. mult forced to 1.0 for the first post-migration grant. */
export function offlineExpected(E, H, awayS, { forceX1 = false } = {}) { const r = E.rows.find(x => +x.level === H); if (!r) throw new Error(`no economy row for H${H}`); if (awayS < 60) return { eggs: 0, rate: +r.offline_eggs_per_sec, cap: +r.offline_max_eggs_2h, mult: 1 };
  const rate = +r.offline_eggs_per_sec, cap = +r.offline_max_eggs_2h, mult = forceX1 ? 1.0 : offlineMult(E, H), raw = Math.floor(rate * Math.min(awayS, 7200) * mult + 1e-9);
  return { eggs: Math.min(raw, Math.floor(cap * mult + 1e-9)), rate, cap, mult, raw }; }
/** First Hens milestone level (the "one Hens milestone level" case). */
export const firstHensMilestone = E => Math.min(...E.milestones.map(m => m.level));
/** Marked (already-migrated) v6 save at hens H for the OFF checks: F = H (cap-over-farm safe), pending 0, savedAt = nowMs - awayMs. */
export async function mkOfflineSave(markedRaw, H, nowMs, awayMs) { const { serialize } = await import('../m3-scripts/m4-guard-lib.mjs'); const d = JSON.parse(markedRaw), st = { ...d.state, hensLevel: H, farmLevel: H, eggValueLevel: Math.min(d.state.eggValueLevel ?? 0, H + 3), pendingOfflineEggs: 0, tracksV7: 1 }; return serialize(6, nowMs - awayMs, st); }
/** r3b: given per-session grants and whether each session's state persisted, the absence must be paid exactly once in persisted state. */
export function grantOnce(sessions, want) { const paid = sessions.reduce((a, s) => a + (s.persisted ? s.grants.reduce((x, y) => x + y, 0) : 0), 0), bad = sessions.flatMap(s => s.grants).filter(g => g !== want && g !== 0);
  return { ok: paid === want && bad.length === 0, paid, want, perSession: sessions.map(s => ({ grants: s.grants, persisted: s.persisted })) }; }
if (process.argv[2] === '--selftest') { const assert = (await import('node:assert/strict')).default, fsM = await import('node:fs');
  const E = loadEconomy(fsM); const M = firstHensMilestone(E);
  assert.equal(offlineExpected(E, 0, 3600).eggs, Math.floor(+E.rows[0].offline_eggs_per_sec * 3600)); assert.equal(offlineExpected(E, 0, 3 * 3600).eggs, +E.rows[0].offline_max_eggs_2h); assert.equal(offlineExpected(E, 0, 30).eggs, 0);
  assert.equal(offlineMult(E, M - 1), 1.0); assert.ok(offlineMult(E, M) > 1.0); assert.equal(offlineExpected(E, M, 3601, { forceX1: true }).eggs, Math.floor(+E.rows[M].offline_eggs_per_sec * 3601));
  // spec v1.14 worked values, as a cross-check of the CSV reading only (not used by the harness)
  assert.equal(offlineExpected(E, 0, 3600).eggs, 1368); assert.equal(offlineExpected(E, 0, 7200).eggs, 2700); assert.equal(offlineExpected(E, 10, 3600).eggs, 12375); assert.equal(offlineExpected(E, 10, 7200).eggs, 24750); assert.equal(offlineExpected(E, 10, 3601, { forceX1: true }).eggs, 9902); assert.equal(offlineExpected(E, 10, 3601).eggs, 12378);
  assert.equal(offlineExpected(E, 10, 3 * 3600, { forceX1: true }).eggs, S5.bootGrant); assert.equal(offlineExpected(E, 10, 3 * 3600).eggs, S5.nextGrant);
  assert.deepEqual(attemptsOk([1, 2, 3, 3].map(n => ({ attempt_count: n, stuck_on_v6: n >= 3 })), ['1', '2', '3', '3']), []); assert.equal(attemptsOk([1, 2, 3, 4].map(n => ({ attempt_count: n, stuck_on_v6: n >= 3 })), ['1', '2', '3', '4']).length, 2);
  assert.equal(grantOnce([{ grants: [19800], persisted: false }, { grants: [19800], persisted: true }], 19800).ok, true); assert.equal(grantOnce([{ grants: [19800], persisted: true }, { grants: [19800], persisted: true }], 19800).ok, false); assert.equal(grantOnce([{ grants: [19800], persisted: false }, { grants: [], persisted: true }], 19800).ok, false);
  const { serialize } = await import('../m3-scripts/m4-guard-lib.mjs'); const os = JSON.parse(await mkOfflineSave(serialize(6, 1, { hensLevel: 19, farmLevel: 19, eggValueLevel: 13, tracksV7: 1, pendingOfflineEggs: 5 }), 0, 1e13, 3600e3)); assert.equal(os.state.hensLevel, 0); assert.equal(os.state.eggValueLevel, 3); assert.equal(os.savedAt, 1e13 - 3600e3);
  console.log(`delta-lib v1.14 selftest OK (rate/cap ${E.src.rate}, milestones ${E.src.ms}: ${JSON.stringify(E.milestones)})`); }
