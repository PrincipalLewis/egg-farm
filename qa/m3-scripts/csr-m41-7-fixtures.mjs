// M41-7 CSR test fixtures (spec of record product/farm/corrupt-save-recovery-spec.m41-final.md, sha256 cc6b7e23…8817c since 20:28 Oct 22;
// was 6131c290…; oracle incl. D-HOP-2026-10-22-01 (a)-(c), -03 (tried[] / per-store / defer) and -04 (no main: .bak chosen => M1, IDB chosen => silent + save_restore)).
// Saves QA, 2026-10-22. Deterministic: re-running yields byte-identical files (no clock, no RNG).
// usage: node qa/m3-scripts/csr-m41-7-fixtures.mjs   -> writes qa/m41/csr-fixtures/{raw,scenarios,matrix,…} + SHA256SUMS
// Reuses: qa/m3-recheck/oq1 (OQ-1 bytes), qa/csr/fixtures (L*/C*/S*/N*/P*/U1, checksum rule), qa/csr/fixtures/idb1 (IDB1 manifests),
//         qa/m3-fixtures/saves (real v4/v5 saves). CSR-17 fixtures (qa/csr/fixtures/f17) are OUT OF SCOPE for M4.1 and not used.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const Q = '/workspace/egg-farm-studio/qa', OUT = `${Q}/m41/csr-fixtures`, CSR = `${Q}/csr/fixtures`;
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const fnv = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };
const rd = p => fs.readFileSync(p, 'utf8');
const OQ1 = rd(`${Q}/m3-recheck/oq1/OQ1-farmLevel-abc-nobak.json`); const oq1 = JSON.parse(OQ1);
const T = oq1.savedAt;            // 1792378780000 = 2026-10-19 04:59:40 CEST
const NOW = T + 60_000;           // loader clock for every scenario unless stated
const base = { ...oq1.state, farmLevel: 18 };
const mk = (patch, { savedAt = T, saveSeq = 5, badSum = false, version = 6, drop = [], noSum = false } = {}) => {
  const st = { ...base, ...patch }; for (const k of drop) delete st[k];
  const j = JSON.stringify(st); let sum = fnv(j); if (badSum) sum = sum === '00000000' ? '00000001' : '00000000';
  return `{"version":${version},"savedAt":${savedAt},"saveSeq":${saveSeq}${noSum ? '' : `,"sum":"${sum}"`},"state":${j}}`;
};
const unmarked = (patch, o) => mk(patch, { ...o, drop: ['tracksV7', 'v6BackupId', 'hensLevel', 'eggValueLevel', 'celebratedMilestones'] });
const rec = (raw, migrationId = '00112233aabbccdd') => JSON.stringify({ migrationId, raw });
// ---------- raw bytes ----------
const RAW = {
  'MAIN-OQ1-abc.json': OQ1,                                                         // invalid_state (farmLevel "abc"), seq 5, savedAt T
  'BAK-valid-F20-seq4-older.json': rd(`${CSR}/P1-bak-valid-F20-older.json`),        // valid, seq 4, T-1h
  'IDB-valid-F17-seq4-T-10m.json': rd(`${CSR}/P2-idb-valid-older-F17.json`),         // valid, seq 4, T-10m  (beats BAK-F20-seq4 on savedAt)
  'BAK-valid-F20-seq6.json': mk({ farmLevel: 20, coinsCents: 1_000_000 }, { savedAt: T - 3_600_000, saveSeq: 6 }), // beats IDB-F17-seq4 on saveSeq
  'IDB-valid-F19-tie-with-BAK-F20-seq4.json': mk({ farmLevel: 19, coinsCents: 2_000_000 }, { savedAt: T - 3_600_000, saveSeq: 4 }), // same rank+savedAt as BAK-F20-seq4 -> tie -> .bak
  'BAK-invalid-neg1.json': rd(`${CSR}/L2-farmLevel-neg1.json`),                     // invalid_state
  'IDB-invalid-truncated.raw': rd(`${CSR}/idb1/IDB1-truncated.idb-main.raw`),       // parse
  'V6B-valid-unmarked-F14-T-1d.json': rd(`${CSR}/U1-unmarked-v6-farmLevel-abc.v6_backup.json`), // record {migrationId, raw}; raw valid unmarked F14
  'V6B-valid-unmarked-F12-T-3h.json': rec(unmarked({ farmLevel: 12 }, { savedAt: NOW - 3 * 3_600_000, saveSeq: 0 })),
  'V6B-valid-unmarked-F12-savedAt-pre2020.json': rec(unmarked({ farmLevel: 12 }, { savedAt: 1000, saveSeq: 0 })), // valid raw, savedAt invalid -> fallback variant
  'V6B-invalid-raw-abc.json': rec(unmarked({ farmLevel: 'abc' }, { savedAt: T - 86_400_000, saveSeq: 0 })), // decodes; raw invalid_state
  'V6B-invalid-raw-version7.json': rec(unmarked({ farmLevel: 12 }, { savedAt: T - 86_400_000, saveSeq: 0, version: 7 })), // CSR-1: invalid (version), NOT newer
  'V6B-invalid-undecodable.txt': 'not-a-record',                                    // decodeBackup -> null
  'V6B-invalid-short-id.json': rec(unmarked({ farmLevel: 12 }, { saveSeq: 0 }), 'abc123'), // migrationId length != 16 -> null
  // CSR-1 trigger set (one per CorruptReason, main bytes)
  'TRIG-empty.txt': '', 'TRIG-whitespace.txt': '   \n',
  'TRIG-parse-truncated.raw': OQ1.slice(0, Math.floor(OQ1.length / 2)),
  'TRIG-wrong_type-array.json': '[1,2,3]',
  'TRIG-wrong_type-version-string.raw': rd(`${CSR}/idb1/IDB1-wrongtype-version-string.idb-main.raw`),
  'TRIG-wrong_type-savedAt-string.json': mk({}).replace(`"savedAt":${T}`, `"savedAt":"${T}"`),
  'TRIG-version-0.json': mk({}, { version: 0 }), 'TRIG-version-1.5.json': mk({}, { version: 1.5 }),
  'TRIG-missing_state.json': `{"version":6,"savedAt":${T},"saveSeq":5}`,
  'TRIG-checksum.json': mk({}, { badSum: true }),
  'TRIG-invalid_state-coins-neg.json': rd(`${CSR}/N1-coinsCents-neg.json`),
  'TRIG-newer-version7.json': rd(`${CSR}/S3-abc-version-7.json`),                   // NOT a trigger: M4A-31(b) refusal
  // CSR-9a prevLevel sources (all have a bad checksum so they are corrupt but parseable)
  'MAIN-L17-badsum.json': mk({ farmLevel: 17 }, { badSum: true }),
  'MAIN-L12-badsum.json': mk({ farmLevel: 12 }, { badSum: true }),
  'MAIN-L31-badsum.json': mk({ farmLevel: 31 }, { badSum: true }),
  'MAIN-L12.5-badsum.json': mk({ farmLevel: 12.5 }, { badSum: true }),
  'MAIN-Lnull-badsum.json': mk({ farmLevel: null }, { badSum: true }),
  'MAIN-Lneg1-badsum.json': mk({ farmLevel: -1 }, { badSum: true }),
  'MAIN-Lstr17-badsum.json': mk({ farmLevel: '17' }, { badSum: true }),
  'BAK-L15-badsum.json': mk({ farmLevel: 15 }, { badSum: true, saveSeq: 4, savedAt: T - 3_600_000 }),
  // CSR-7 seeds: three prior LS corrupt copies (distinct bytes)
  'PRIOR-corrupt-1.raw': '{"prior":1', 'PRIOR-corrupt-2.raw': '{"prior":2', 'PRIOR-corrupt-3.raw': '{"prior":3',
  // RC gate migration (v1..v3 synthetic from migrate() shapes at dd223f5 save.ts:73-81; v4/v5 real saves are in qa/m3-fixtures/saves)
  'MIG-v1-coins-float.json': JSON.stringify({ version: 1, savedAt: T, state: { coins: 12.345, coop: oq1.state.coop, basket: 3, collectionLevel: 2, farmLevel: 4, customers: [{ id: 1, want: 2 }], nextCustomerInS: 5, nextCustomerId: 2, rng: 7, pendingOfflineEggs: 0 } }),
  'MIG-v2-customers-nofilled.json': JSON.stringify({ version: 2, savedAt: T, state: { coinsCents: 1234, coop: oq1.state.coop, basket: 3, collectionLevel: 2, farmLevel: 4, customers: [{ id: 1, want: 2 }], nextCustomerInS: 5, nextCustomerId: 2, rng: 7, pendingOfflineEggs: 0 } }),
  'MIG-v3-no-celebratedTier.json': JSON.stringify({ version: 3, savedAt: T, state: { coinsCents: 1234, coop: oq1.state.coop, basket: 3, collectionLevel: 2, farmLevel: 12, customers: [{ id: 1, want: 2, filled: 0 }], nextCustomerInS: 5, nextCustomerId: 2, rng: 7, pendingOfflineEggs: 0 } }),
};
const V6B_F14_RAW = JSON.parse(RAW['V6B-valid-unmarked-F14-T-1d.json']).raw;
RAW['IDB-same-bytes-as-main.raw'] = OQ1;                                             // CSR-3: IDB == corrupt main -> invalid, deduped
// ---------- scenario helpers ----------
const ls = o => o; const S = {};
const idbOk = recs => ({ status: 'ok', records: recs }); const idbNone = { status: 'ok', records: [] };
const idbUnknown = { status: 'unknown', reason: 'idb_timeout', records: [] }; const idbAbsent = { status: 'absent', reason: 'no_global', records: [] };
const R = n => ({ ref: `raw/${n}` }); const M = 'MAIN-OQ1-abc.json';
const add = (id, o) => { S[id] = { id, now: NOW, ...o }; };
// CSR-1 triggers
for (const [n, reason] of [['TRIG-empty.txt', 'empty'], ['TRIG-whitespace.txt', 'empty'], ['TRIG-parse-truncated.raw', 'parse'], ['TRIG-wrong_type-array.json', 'wrong_type'], ['TRIG-wrong_type-version-string.raw', 'wrong_type'], ['TRIG-wrong_type-savedAt-string.json', 'wrong_type'], ['TRIG-version-0.json', 'version'], ['TRIG-version-1.5.json', 'version'], ['TRIG-missing_state.json', 'missing_state'], ['TRIG-checksum.json', 'checksum'], ['TRIG-invalid_state-coins-neg.json', 'invalid_state'], [M, 'invalid_state']])
  add(`CSR1-${reason}-${n.replace(/\.(json|raw|txt)$/, '')}`, { csr: ['CSR-1', 'CSR-6', 'CSR-15'], ls: { 'eggfarm.save': R(n) }, idb: idbNone, expect: { recovery: true, reason, store: 'ls', recovered_from: 'none', notice: 'M3', corruptLsMin: 1 } });
for (const f of ['L1-farmLevel-null', 'L2-farmLevel-neg1', 'L3-farmLevel-inf-1e309', 'L4-hensLevel-str2.5', 'L5-eggValueLevel-bool', 'L6-collectionLevel-obj'])
  add(`CSR1-sanitize-${f}`, { csr: ['CSR-1', 'CSR-15'], ls: { 'eggfarm.save': { ref: `../../csr/fixtures/${f}.json` } }, idb: idbNone, expect: { recovery: true, reason: 'invalid_state', store: 'ls', recovered_from: 'none', notice: 'M3' } });
for (const f of ['C1-farmLevel-999-oversized-valid', 'C2-farmLevel-12.9-float-valid', 'C3-farmLevel-str12-valid', 'N5-workers-array'])
  add(`CSR1-control-valid-${f}`, { csr: ['CSR-1', 'control'], ls: { 'eggfarm.save': { ref: `../../csr/fixtures/${f}.json` } }, idb: idbNone, expect: { recovery: false, notice: null, noSaveCorrupt: true } });
add('CSR1-missing-main-no-sources', { csr: ['CSR-1'], ls: {}, idb: idbNone, expect: { recovery: false, newGame: true, notice: null, noSaveCorrupt: true } });
add('CSR1-missing-main-invalid-bak', { csr: ['CSR-1', 'CSR-6'], ls: { 'eggfarm.save.bak': R('BAK-invalid-neg1.json') }, idb: idbNone, expect: { recovery: true, reason: 'invalid_state', store: 'ls', recovered_from: 'none', notice: 'M3' } });
add('CSR1-newer-main-refused', { csr: ['CSR-1'], ls: { 'eggfarm.save': R('TRIG-newer-version7.json') }, idb: idbNone, expect: { recovery: false, newer: 7, noWrites: true, noSaveCorrupt: true } });
add('CSR1-v6b-version7-is-invalid-not-newer', { csr: ['CSR-1', 'CSR-4'], ls: { 'eggfarm.save': R(M), 'eggfarm.save.v6_backup': R('V6B-invalid-raw-version7.json') }, idb: idbNone, expect: { recovery: true, newer: null, recovered_from: 'none', notice: 'M3', tried: [['bak', 'absent'], ['idb', 'absent'], ['v6_backup', 'invalid', 'version']] } });
// CSR-3 / B1
add('CSR3-B1-corrupt-ls-valid-idb', { csr: ['CSR-3', 'CSR-7', 'CSR-10'], ls: { 'eggfarm.save': R(M) }, idb: idbOk([{ key: 'main', ...R('IDB-valid-F17-seq4-T-10m.json') }]), expect: { recovery: true, recovered_from: 'idb', notice: 'M1', store: 'ls', farmLevel: 17, corruptLsMin: 1, noSaveRestoreEvent: true } });
add('CSR3-idb-identical-to-corrupt-main', { csr: ['CSR-3', 'CSR-7'], ls: { 'eggfarm.save': R(M) }, idb: idbOk([{ key: 'main', ...R('IDB-same-bytes-as-main.raw') }]), expect: { recovery: true, recovered_from: 'none', notice: 'M3', corruptLsExact: 1, idbCorruptExact: 1, tried: [['bak', 'absent'], ['idb', 'invalid', 'invalid_state'], ['v6_backup', 'absent']] } }); // D-HOP-22-03(3): each copy in its own store
// CSR-4/5 + CSR-9a (M2 variants) + CSR-9c
add('CSR4-v6b-restore-pending-migration', { csr: ['CSR-4', 'CSR-5', 'CSR-9a', 'CSR-9c'], ls: { 'eggfarm.save': R('TRIG-parse-truncated.raw'), 'eggfarm.save.v6_backup': R('V6B-valid-unmarked-F14-T-1d.json') }, idb: idbNone, expect: { recovery: true, recovered_from: 'v6_backup', notice: 'M2', variant: 'age', ageText: 'about 24 hours', body: 'We restored a save from about 24 hours ago.', farmLevel: 14, tracksMigrationPending: true, v6bUnchangedAtBoot: true, afterCommit: { migrationIdChanged: true, rawUnchanged: V6B_F14_RAW.length } } });
add('CSR9a-1-level-17-to-12', { csr: ['CSR-9a'], ls: { 'eggfarm.save': R('MAIN-L17-badsum.json'), 'eggfarm.save.v6_backup': R('V6B-valid-unmarked-F12-T-3h.json') }, idb: idbNone, expect: { recovered_from: 'v6_backup', notice: 'M2', variant: 'level', prevLevel: 17, body: 'We restored an earlier save, from Farm level 12.' } });
add('CSR9a-2-prev-from-bak-15', { csr: ['CSR-9a'], ls: { 'eggfarm.save': R('TRIG-parse-truncated.raw'), 'eggfarm.save.bak': R('BAK-L15-badsum.json'), 'eggfarm.save.v6_backup': R('V6B-valid-unmarked-F12-T-3h.json') }, idb: idbNone, expect: { recovered_from: 'v6_backup', notice: 'M2', variant: 'level', prevLevel: 15, body: 'We restored an earlier save, from Farm level 12.' } });
add('CSR9a-3-age-3h', { csr: ['CSR-9a', 'CSR-9b'], ls: { 'eggfarm.save': R('TRIG-parse-truncated.raw'), 'eggfarm.save.v6_backup': R('V6B-valid-unmarked-F12-T-3h.json') }, idb: idbNone, expect: { recovered_from: 'v6_backup', notice: 'M2', variant: 'age', prevLevel: null, body: 'We restored a save from about 3 hours ago.' } });
add('CSR9a-3-fallback-savedAt-invalid', { csr: ['CSR-9a'], ls: { 'eggfarm.save': R('TRIG-parse-truncated.raw'), 'eggfarm.save.v6_backup': R('V6B-valid-unmarked-F12-savedAt-pre2020.json') }, idb: idbNone, expect: { recovered_from: 'v6_backup', notice: 'M2', variant: 'fallback', body: 'We restored an earlier save. A little recent progress may be missing.' } });
add('CSR9a-level-equal-falls-to-age', { csr: ['CSR-9a'], ls: { 'eggfarm.save': R('MAIN-L12-badsum.json'), 'eggfarm.save.v6_backup': R('V6B-valid-unmarked-F12-T-3h.json') }, idb: idbNone, expect: { notice: 'M2', variant: 'age', prevLevel: 12, body: 'We restored a save from about 3 hours ago.' } });
for (const m of ['MAIN-L12.5-badsum', 'MAIN-Lnull-badsum', 'MAIN-Lneg1-badsum', 'MAIN-Lstr17-badsum']) {
  add(`CSR9a-4-${m}-falls-to-bak15`, { csr: ['CSR-9a'], ls: { 'eggfarm.save': R(`${m}.json`), 'eggfarm.save.bak': R('BAK-L15-badsum.json'), 'eggfarm.save.v6_backup': R('V6B-valid-unmarked-F12-T-3h.json') }, idb: idbNone, expect: { notice: 'M2', variant: 'level', prevLevel: 15, body: 'We restored an earlier save, from Farm level 12.' } });
  add(`CSR9a-4-${m}-no-bak-unset`, { csr: ['CSR-9a'], ls: { 'eggfarm.save': R(`${m}.json`), 'eggfarm.save.v6_backup': R('V6B-valid-unmarked-F12-T-3h.json') }, idb: idbNone, expect: { notice: 'M2', variant: 'age', prevLevel: null, body: 'We restored a save from about 3 hours ago.' } });
}
add('CSR9a-4-L31-above-max-accepted', { csr: ['CSR-9a'], ls: { 'eggfarm.save': R('MAIN-L31-badsum.json'), 'eggfarm.save.v6_backup': R('V6B-valid-unmarked-F12-T-3h.json') }, idb: idbNone, expect: { notice: 'M2', variant: 'level', prevLevel: 31, body: 'We restored an earlier save, from Farm level 12.' } });
// CSR-7 dedupe/cap
add('CSR7-cap3-evicts-oldest', { csr: ['CSR-7'], ls: { 'eggfarm.save': R(M), 'eggfarm.save.bak': R('BAK-invalid-neg1.json'), 'eggfarm.save.corrupt.1792378000000': R('PRIOR-corrupt-1.raw'), 'eggfarm.save.corrupt.1792378100000': R('PRIOR-corrupt-2.raw'), 'eggfarm.save.corrupt.1792378200000': R('PRIOR-corrupt-3.raw'), 'eggfarm.save.corrupt.index': { value: JSON.stringify(['eggfarm.save.corrupt.1792378000000', 'eggfarm.save.corrupt.1792378100000', 'eggfarm.save.corrupt.1792378200000']) } }, idb: idbOk([{ key: 'main', ...R('IDB-invalid-truncated.raw') }]), expect: { corruptLsExact: 3, idbCorruptExact: 1, idbBytesNotInLs: true, survivors: 'LS: the 3 newest by index order (PRIOR-1/2 evicted); IDB copy only in IDB (D-HOP-22-03(3))', v6bNeverCopied: true } });
add('CSR7-v6b-never-copied', { csr: ['CSR-7', 'CSR-5', 'CSR-11'], ls: { 'eggfarm.save': R(M), 'eggfarm.save.v6_backup': R('V6B-invalid-raw-abc.json') }, idb: idbNone, expect: { recovered_from: 'none', notice: 'M3', v6bUnchanged: true, noCorruptValueEquals: 'V6B-invalid-raw-abc.json (record or its raw)' } });
// CSR-11 every source corrupt
add('CSR11-all-sources-invalid', { csr: ['CSR-11', 'CSR-7', 'CSR-10'], ls: { 'eggfarm.save': R(M), 'eggfarm.save.bak': R('BAK-invalid-neg1.json'), 'eggfarm.save.v6_backup': R('V6B-invalid-raw-abc.json') }, idb: idbOk([{ key: 'main', ...R('IDB-invalid-truncated.raw') }]), expect: { recovered_from: 'none', notice: 'M3', store: 'ls', triedPairs: [['bak', 'invalid'], ['idb', 'invalid'], ['v6_backup', 'invalid']], corruptLsExact: 2, idbCorruptExact: 1, idbBytesNotInLs: true, v6bUnchanged: true } });
// CSR-12 / CSR-13
add('CSR12-idb-absent-skipped', { csr: ['CSR-12'], ls: { 'eggfarm.save': R(M), 'eggfarm.save.v6_backup': R('V6B-valid-unmarked-F14-T-1d.json') }, idb: idbAbsent, expect: { recovered_from: 'v6_backup', notice: 'M2', tried: [['bak', 'absent'], ['idb', 'absent', 'no_global'], ['v6_backup', 'valid']] } });
add('CSR12-ls-throws-securityerror', { csr: ['CSR-12'], ls: { 'eggfarm.save': R(M) }, lsThrows: 'SecurityError', idb: idbNone, expect: { notice: 'cantsave|storage (existing v2.2 outcome)', noFreshAutosave: true } });
add('CSR13a-idb-unknown-bak-valid', { csr: ['CSR-13', 'CSR-13a'], ls: { 'eggfarm.save': R(M), 'eggfarm.save.bak': R('BAK-valid-F20-seq4-older.json') }, idb: { ...idbUnknown, records: [{ key: 'main', ...R('IDB-valid-F17-seq4-T-10m.json') }] }, expect: { recovered_from: 'bak', notice: 'M1', farmLevel: 20, idbPutsAfterAutosave: 0, idbMainUnchanged: true } });
add('CSR13-defer', { csr: ['CSR-13', 'CSR-5'], ls: { 'eggfarm.save': R(M), 'eggfarm.save.bak': R('BAK-invalid-neg1.json'), 'eggfarm.save.v6_backup': R('V6B-valid-unmarked-F14-T-1d.json') }, idb: idbUnknown, expect: { recovered_from: 'deferred', notice: 'M4', noSaveWrite: true, v6bUnchanged: true, onlyCorruptKeysMayChange: true, triedPairs: [['bak', 'invalid'], ['idb', 'unavailable']] } });
add('CSR13b-defer-quota', { csr: ['CSR-13b'], ls: { 'eggfarm.save': R(M) }, lsQuota: 'all-setItem', idb: idbUnknown, expect: { recovered_from: 'deferred', notice: 'M4', noKeyChanged: true } });
// CSR-14
add('CSR14-preserve-quota-case-Q', { csr: ['CSR-14'], ls: { 'eggfarm.save': R(M) }, lsQuota: 'corrupt.*', idb: idbNone, expect: { notice: 'storage', copy_failed: true, exportFromMemory: true } });
add('CSR14-restored-storageBlocked-M5', { csr: ['CSR-14', 'CSR-9'], ls: { 'eggfarm.save': R(M), 'eggfarm.save.bak': R('BAK-valid-F20-seq4-older.json') }, leaseBlocked: true, idb: idbNone, expect: { notice: 'M5', exportsCurrentFarm: true, noStorageToastAfterClose: true } });
add('CSR14-restore-write-fails-continue', { csr: ['CSR-14'], ls: { 'eggfarm.save': R(M), 'eggfarm.save.bak': R('BAK-valid-F20-seq4-older.json') }, lsQuota: 'eggfarm.save', idb: idbNone, expect: { farmLevel: 20, noStorageText: true, stateKept: true } });
// CSR-16
add('CSR16-fresh-no-rotation-until-progress', { csr: ['CSR-16'], ls: { 'eggfarm.save': R(M) }, idb: idbNone, expect: { bakAbsentAfterFirstSave: true, bakAfterProgress: true } });
add('CSR16-restore-rotates', { csr: ['CSR-16'], ls: { 'eggfarm.save': R(M), 'eggfarm.save.bak': R('BAK-valid-F20-seq4-older.json') }, idb: idbNone, expect: { bakRotatesOnNextRotatingSave: true } });
// CSR-AC-IDB1 (manifests reused from qa/csr/fixtures/idb1)
for (const [f, reason] of [['IDB1-abc', 'invalid_state'], ['IDB1-truncated', 'parse'], ['IDB1-wrongtype-version-string', 'wrong_type'], ['IDB1-nonstring-object', 'wrong_type']])
  add(`IDB1-${f.slice(5)}`, { csr: ['CSR-AC-IDB1', 'IDB1-1', 'IDB1-2', 'IDB1-5', 'IDB1-6', 'IDB1-8', 'KF-IDB-ONLY'], idbManifest: `../../csr/fixtures/idb1/${f}.manifest.json`, expect: { recovery: true, store: 'idb', reason, notice: 'M3', idbCorruptExact: 1, idbCorruptByteEqual: true, corruptPutBeforeFirstMainPut: true, coinsCents: 'initialState', noSaveRepaired: true, saveCorruptCount: 1 } });
add('IDB1-1-cap3-parsed-order', { csr: ['IDB1-1'], ls: {}, idb: idbOk([{ key: 'main', ...R('IDB-invalid-truncated.raw') }, { key: 'corrupt.1792378700000-2', ...R('PRIOR-corrupt-1.raw') }, { key: 'corrupt.1792378700000-10', ...R('PRIOR-corrupt-2.raw') }, { key: 'corrupt.1792378750000', ...R('PRIOR-corrupt-3.raw') }]), expect: { idbCorruptExact: 3, evicted: 'corrupt.1792378700000-2 (oldest by parsed (ts,n); lexical order would wrongly evict -10)', sameTransaction: true } });
add('IDB1-6-ls-trigger-store-ls', { csr: ['IDB1-6', 'CSR-10'], ls: { 'eggfarm.save': R(M) }, idbManifestRecords: '../../csr/fixtures/idb1/IDB1-abc.manifest.json', expect: { store: 'ls', triedIdb: 'invalid' } });
add('IDB1-7-valid-idb-ls-missing-save_restore', { csr: ['IDB1-7', 'CSR-10'], ls: {}, idb: idbOk([{ key: 'main', ...R('IDB-valid-F17-seq4-T-10m.json') }]), expect: { recovery: false, saveRestoreIdbCount: 1, saveRestoredCount: 0, noSaveCorrupt: true, notice: null } });
// ---------- D-HOP-2026-10-22-01 rulings (binding oracle, product/decisions.md:466) ----------
// (a) corrupt IDB main deleted ONLY in the same transaction as a successful corrupt.* put; copy failure => nothing deleted
for (const f of ['IDB1-abc', 'IDB1-truncated', 'IDB1-wrongtype-version-string', 'IDB1-nonstring-object'])
  add(`RUL-a-ok-${f}`, { csr: ['D-HOP-2026-10-22-01(a)', 'IDB1-1', 'IDB1-5'], idbManifest: `../../csr/fixtures/idb1/${f}.manifest.json`, expect: { idbCorruptExact: 1, mainDeleteOnlyInPutTx: true } });
for (const fail of ['QuotaExceededError', 'DataCloneError'])
  add(`RUL-a-fail-${fail}`, { csr: ['D-HOP-2026-10-22-01(a)', 'IDB1-3'], idbManifest: '../../csr/fixtures/idb1/IDB1-abc.manifest.json', idbFail: fail, expect: { recovery: true, idbCorruptExact: 0, noIdbMainDelete: true, idbMainUnchanged: true, idbPutsToMain: 0, copy_failed: true } });
// (b) invalid IDB main + VALID LS main: kept as corrupt.* (deduped, cap 3), no event, no dialog
add('RUL-b-valid-ls-invalid-idb', { csr: ['D-HOP-2026-10-22-01(b)'], ls: { 'eggfarm.save': R('BAK-valid-F20-seq4-older.json') }, idb: idbOk([{ key: 'main', ...R('IDB-invalid-truncated.raw') }]), expect: { recovery: false, noSaveCorrupt: true, noNotice: true, farmLevel: 20, idbCorruptExact: 1, idbCorruptByteEqual: true } });
add('RUL-b-dedupe-two-boots', { csr: ['D-HOP-2026-10-22-01(b)', 'IDB1-4'], bootTwice: true, ls: { 'eggfarm.save': R('BAK-valid-F20-seq4-older.json') }, idb: idbOk([{ key: 'main', ...R('IDB-invalid-truncated.raw') }]), expect: { recovery: false, noSaveCorrupt: true, idbCorruptExact: 1 } });
add('RUL-b-cap3', { csr: ['D-HOP-2026-10-22-01(b)', 'IDB1-1'], ls: { 'eggfarm.save': R('BAK-valid-F20-seq4-older.json') }, idb: idbOk([{ key: 'main', ...R('IDB-invalid-truncated.raw') }, { key: 'corrupt.1792378700000-2', ...R('PRIOR-corrupt-1.raw') }, { key: 'corrupt.1792378700000-10', ...R('PRIOR-corrupt-2.raw') }, { key: 'corrupt.1792378750000', ...R('PRIOR-corrupt-3.raw') }]), expect: { recovery: false, noSaveCorrupt: true, idbCorruptExact: 3, idbEvicted: 'corrupt.1792378700000-2', idbKept: ['corrupt.1792378700000-10', 'corrupt.1792378750000'] } });
// (c) no LS main, no .bak, IDB unknown (a hidden valid farm sits in IDB): fresh game, mirror=null, ZERO IDB puts
add('RUL-c-idb-unknown-nothing-else', { csr: ['D-HOP-2026-10-22-01(c)', 'CSR-1', 'CSR-13'], ls: {}, idb: { ...idbUnknown, records: [{ key: 'main', ...R('IDB-valid-F17-seq4-T-10m.json') }] }, expect: { recovery: false, newGame: true, noSaveCorrupt: true, idbPutsAfterAutosave: 0, idbMainUnchanged: true } });
// (d) as amended by D-HOP-2026-10-22-04: no LS main; .bak chosen (alone, newer, or tie vs a valid IDB) => M1 Restored dialog exactly as at
// dd223f5 (case R, reason 'missing'), no save_restore; IDB chosen => no dialog, save_restore {source:'idb'} exactly once.
for (const [tag, bak, idb, win, F] of [['bak-newer', 'BAK-valid-F20-seq6.json', 'IDB-valid-F17-seq4-T-10m.json', 'bak', 20], ['idb-newer', 'BAK-valid-F20-seq4-older.json', 'IDB-valid-F17-seq4-T-10m.json', 'idb', 17], ['tie', 'BAK-valid-F20-seq4-older.json', 'IDB-valid-F19-tie-with-BAK-F20-seq4.json', 'bak', 20], ['bak-only', 'BAK-valid-F20-seq4-older.json', null, 'bak', 20]])
  add(`RUL-d-${tag}`, { csr: ['D-HOP-2026-10-22-04', 'D-HOP-2026-10-22-03(4)', 'CSR-2'], ls: { 'eggfarm.save.bak': R(bak) }, idb: idb ? idbOk([{ key: 'main', ...R(idb) }]) : idbNone,
    expect: win === 'bak' ? { recovery: true, recoveryCase: 'R', notice: 'M1', farmLevel: F, saveRestoreIdbCount: 0, saveRestoredCount: 0 } : { recovery: false, noNotice: true, noSaveCorrupt: true, farmLevel: F, saveRestoreIdbCount: 1, saveRestoredCount: 0 } });
// ---------- CSR-2 matrix ----------
const BAK = { valid: 'BAK-valid-F20-seq4-older.json', invalid: 'BAK-invalid-neg1.json', absent: null };
const IDB = { valid: 'IDB-valid-F17-seq4-T-10m.json', invalid: 'IDB-invalid-truncated.raw', missing: null, unavailable: 'IDB-valid-F17-seq4-T-10m.json', absent: null };
const V6 = { valid: 'V6B-valid-unmarked-F14-T-1d.json', invalid: 'V6B-invalid-raw-abc.json', absent: null };
const matrix = [];
for (const b of Object.keys(BAK)) for (const i of Object.keys(IDB)) for (const v of Object.keys(V6)) {
  const rankCases = b === 'valid' && i === 'valid' ? [['idb-newer', BAK.valid, IDB.valid, 'idb'], ['bak-newer', 'BAK-valid-F20-seq6.json', IDB.valid, 'bak'], ['tie', BAK.valid, 'IDB-valid-F19-tie-with-BAK-F20-seq4.json', 'bak']] : [[null, BAK[b], IDB[i], null]];
  for (const [rc, bf, inf, winA] of rankCases) {
    const lsKeys = { 'eggfarm.save': `raw/${M}` }; if (bf) lsKeys['eggfarm.save.bak'] = `raw/${bf}`; if (V6[v]) lsKeys['eggfarm.save.v6_backup'] = `raw/${V6[v]}`;
    const idb = i === 'unavailable' ? { status: 'unknown', reason: 'idb_timeout', main: `raw/${inf}` } : i === 'absent' ? { status: 'absent', reason: 'no_global' } : i === 'missing' ? { status: 'ok', main: null } : { status: 'ok', main: `raw/${inf}` };
    let from, notice, idbPutsZero = false;
    if (i === 'unavailable') { if (b === 'valid') { from = 'bak'; notice = 'M1'; idbPutsZero = true; } else { from = 'deferred'; notice = 'M4'; } }
    else if (winA) { from = winA; notice = 'M1'; }
    else if (b === 'valid') { from = 'bak'; notice = 'M1'; } else if (i === 'valid') { from = 'idb'; notice = 'M1'; }
    else if (v === 'valid') { from = 'v6_backup'; notice = 'M2'; } else { from = 'none'; notice = 'M3'; }
    const bakR = b === 'absent' ? 'absent' : b, idbR = i === 'missing' || i === 'absent' ? 'absent' : i;
    // D-HOP-2026-10-22-03(1)(2): both tier-A entries always, bak then idb; v6_backup only if tier A has no valid copy and not deferred
    const tierAValid = bakR === 'valid' || idbR === 'valid'; const pairs = [['bak', bakR], ['idb', idbR]]; if (!tierAValid && from !== 'deferred') pairs.push(['v6_backup', v]);
    const lsCopies = 1 + (bakR === 'invalid' ? 1 : 0), idbCopies = idbR === 'invalid' ? 1 : 0; // (3) per store
    matrix.push({ id: `CSR2-bak_${b}-idb_${i}-v6b_${v}${rc ? `-${rc}` : ''}`, ls: lsKeys, idb, now: NOW, expect: { recovered_from: from, notice, store: 'ls', reason: 'invalid_state', triedPairs: pairs, corruptLsExact: lsCopies, idbCorruptExact: idbCopies, triedOrder: 'D-HOP-2026-10-22-03: bak, idb always (fixed order, own result); v6_backup only if tier A has no valid copy; never on defer', ...(idbPutsZero ? { idbPutsAfterAutosave: 0 } : {}), ...(from === 'deferred' ? { v6bUnchanged: true, noSaveWrite: true } : {}) } });
  }
}
// ---------- CSR-9b {age} formatter table (unit; ms -> text) ----------
const m = 60_000, h = 3_600_000;
const age = [[4 * m + 59_000, 'a few minutes'], [5 * m, '5 minutes'], [59 * m + 59_000, '59 minutes'], [h, 'about 1 hour'], [h + 59 * m + 59_000, 'about 1 hour'], [47 * h + 59 * m, 'about 47 hours'], [48 * h, '2 days'], [24 * h, 'about 24 hours'], [-5000, 'a few minutes'], [m, '1 minute (formatter unit; unreachable in M2)'], [24 * h, '1 day (formatter given n=1 day; unit)']];
// ---------- CSR-15 mutation corpus (deterministic) ----------
const P4 = rd(`${CSR}/P4-ls-valid-seq5.json`); const p4 = JSON.parse(P4); const junk = [null, -1, 'abc', '2.5', true, {}, [], '', 'NaN'];
const corpus = [];
for (const k of Object.keys(p4.state)) for (const j of junk) { const st = { ...p4.state, [k]: j }; const js = JSON.stringify(st); corpus.push({ id: `field-${k}-${JSON.stringify(j)}`, raw: `{"version":6,"savedAt":${p4.savedAt},"saveSeq":5,"sum":"${fnv(js)}","state":${js}}` }); }
for (const k of ['farmLevel', 'basket', 'coinsCents']) { const js = JSON.stringify({ ...p4.state, [k]: null }).replace(`"${k}":null`, `"${k}":1e309`); corpus.push({ id: `field-${k}-1e309`, raw: `{"version":6,"savedAt":${p4.savedAt},"saveSeq":5,"sum":"${fnv(JSON.stringify({ ...p4.state, [k]: null }))}","state":${js}}` }); }
for (let c = 1; c < P4.length; c += Math.max(1, Math.floor(P4.length / 40))) corpus.push({ id: `truncate-${c}`, raw: P4.slice(0, c) });
for (const v of [0, -1, 1.5, '"6"', 'null', 7]) corpus.push({ id: `version-${v}`, raw: P4.replace('"version":6', `"version":${v}`) });
corpus.push({ id: 'badsum', raw: P4.replace(/"sum":"[0-9a-f]{8}"/, '"sum":"00000000"') }, { id: 'no-state', raw: `{"version":6,"savedAt":${p4.savedAt},"saveSeq":5}` }, { id: 'state-array', raw: `{"version":6,"savedAt":${p4.savedAt},"state":[]}` });
// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true }); for (const d of ['raw', 'scenarios']) fs.mkdirSync(`${OUT}/${d}`, { recursive: true });
const files = {};
for (const [n, v] of Object.entries(RAW)) files[`raw/${n}`] = v;
for (const [id, s] of Object.entries(S)) files[`scenarios/${id}.json`] = JSON.stringify(s, null, 1) + '\n';
files['csr2-matrix.json'] = JSON.stringify({ base: 'main OQ-1 bytes (invalid_state)', note: 'IDB "missing" = status ok, no main key; "absent" = status absent (no_global); "unavailable" = status unknown (idb_timeout) with a valid copy present', cases: matrix }, null, 1) + '\n';
files['csr9b-age-cases.json'] = JSON.stringify(age.map(([ms, t]) => ({ ageMs: ms, text: t })), null, 1) + '\n';
files['csr15-mutations.jsonl'] = corpus.map(x => JSON.stringify(x)).join('\n') + '\n';
for (const [n, v] of Object.entries(files)) fs.writeFileSync(`${OUT}/${n}`, v);
const sums = Object.keys(files).sort().map(n => `${sha(files[n])}  ${n}`);
fs.writeFileSync(`${OUT}/SHA256SUMS`, sums.join('\n') + '\n');
console.log(`raw ${Object.keys(RAW).length}, scenarios ${Object.keys(S).length}, matrix ${matrix.length}, age ${age.length}, csr15 corpus ${corpus.length}; files ${sums.length}`);
