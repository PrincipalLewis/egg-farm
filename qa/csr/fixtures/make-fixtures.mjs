// CSR v0.2.3 / CSR-17 fixtures. Base = OQ-1 fixture (qa/m3-recheck/oq1/OQ1-farmLevel-abc-nobak.json, sha256 7dea4a43…3416ed)
// with farmLevel restored to 18 (gate4-sanitize.qa.test.ts `good`). Checksum = save.ts FNV-1a over JSON.stringify(state) of
// the PARSED state (so raw-text tokens like 1e309 are summed as null, exactly as validate() sees them).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const dir = path.dirname(new URL(import.meta.url).pathname);
const fnv = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };
const oq1 = JSON.parse(fs.readFileSync(path.join(dir, '../../m3-recheck/oq1/OQ1-farmLevel-abc-nobak.json'), 'utf8'));
const T = oq1.savedAt; const base = { ...oq1.state, farmLevel: 18 };
// rawText(): optional textual replacement AFTER summing (for tokens JSON can't express, e.g. 1e309 -> Infinity)
const mk = (patch, { savedAt = T, saveSeq = 5, badSum = false, version = 6, replace = null, drop = [] } = {}) => {
  const st = { ...base, ...patch }; for (const k of drop) delete st[k];
  const stJson = JSON.stringify(st); let sum = fnv(stJson); if (badSum) sum = (sum === '00000000' ? '00000001' : '00000000');
  let raw = `{"version":${version},"savedAt":${savedAt},"saveSeq":${saveSeq},"sum":"${sum}","state":${stJson}}`;
  if (replace) raw = raw.replace(replace[0], replace[1]); return raw;
};
const unmarked = (patch, o) => mk(patch, { ...o, drop: ['tracksV7', 'v6BackupId', 'hensLevel', 'eggValueLevel', 'celebratedMilestones'] });
const F = {
  // --- single bad level field (CSR-17 repair candidates; dd223f5: invalid_state) ---
  'L1-farmLevel-null.json': mk({ farmLevel: null }),                      // what NaN serialises to
  'L2-farmLevel-neg1.json': mk({ farmLevel: -1 }),
  'L3-farmLevel-inf-1e309.json': mk({ farmLevel: null }, { replace: ['"farmLevel":null', '"farmLevel":1e309'] }), // parses to Infinity
  'L4-hensLevel-str2.5.json': mk({ hensLevel: '2.5' }),
  'L5-eggValueLevel-bool.json': mk({ eggValueLevel: true }),
  'L6-collectionLevel-obj.json': mk({ collectionLevel: { v: 12 } }),
  // --- controls that must NOT be repaired (valid at dd223f5) ---
  'C1-farmLevel-999-oversized-valid.json': mk({ farmLevel: 999 }),        // above maxLevel: valid + kept (M2)
  'C2-farmLevel-12.9-float-valid.json': mk({ farmLevel: 12.9 }),          // floored to 12, no recovery
  'C3-farmLevel-str12-valid.json': mk({ farmLevel: '12' }),               // coerced to 12
  // --- multiple bad level fields ---
  'M3-three-bad-levels.json': mk({ farmLevel: 'abc', hensLevel: -1, eggValueLevel: null }),   // 3 = repair limit
  'M4-four-bad-levels.json': mk({ farmLevel: 'abc', hensLevel: -1, eggValueLevel: null, collectionLevel: '' }), // >3 -> full fallback
  // --- non-level bad fields (must fall through to the chain) ---
  'N1-coinsCents-neg.json': mk({ coinsCents: -5 }),
  'N2-coinsCents-null-NaN.json': mk({ coinsCents: null }),
  'N3-basket-1e309.json': mk({ basket: null }, { replace: ['"basket":null', '"basket":1e309'] }),
  'N4-customers-object.json': mk({ customers: {} }),
  'N5-workers-array.json': mk({ workers: [] }),                           // dd223f5 ACCEPTS this (typeof [] === 'object')
  'N6-level-bad-plus-coins-bad.json': mk({ farmLevel: 'abc', coinsCents: -5 }),
  // --- structure / integrity (must NOT be repaired) ---
  'S1-abc-bad-checksum.json': mk({ farmLevel: 'abc' }, { badSum: true }),
  'S2-abc-no-sum.json': mk({ farmLevel: 'abc' }).replace(/"sum":"[0-9a-f]{8}",/, ''),
  'S3-abc-version-7.json': mk({ farmLevel: 'abc' }, { version: 7 }),     // newer: refused (M4A-31(b)), never repaired
  // --- migration interaction: unmarked v6 (M4 on => tracks migration) with a bad farmLevel ---
  'U1-unmarked-v6-farmLevel-abc.json': unmarked({ farmLevel: 'abc' }),
  'U1-unmarked-v6-farmLevel-abc.v6_backup.json': null, // filled below
  // --- precedence pairs ---
  'P1-bak-valid-F20-older.json': mk({ farmLevel: 20, coinsCents: 1_000_000 }, { savedAt: T - 3_600_000, saveSeq: 4 }), // pair with OQ-1 as main
  'P2-idb-valid-older-F17.json': mk({ farmLevel: 17, coinsCents: 5_000_000 }, { savedAt: T - 600_000, saveSeq: 4 }),   // IDB copy, pair with OQ-1 as LS main
  'P3-idb-newer-seq9-abc.json': mk({ farmLevel: 'abc', coinsCents: 9_000_000 }, { savedAt: T + 60_000, saveSeq: 9 }), // bad field, IDB newer than LS
  'P4-ls-valid-seq5.json': mk({}),                                                                                   // pair with P3 (reconcile, newer bad IDB)
};
F['U1-unmarked-v6-farmLevel-abc.v6_backup.json'] = JSON.stringify({ migrationId: '00112233aabbccdd', raw: unmarked({ farmLevel: 14 }, { savedAt: T - 86_400_000, saveSeq: 0 }) });
const lines = [];
for (const [n, raw] of Object.entries(F)) { fs.writeFileSync(path.join(dir, n), raw); lines.push(`${crypto.createHash('sha256').update(raw).digest('hex')}  ${n}`); }
fs.writeFileSync(path.join(dir, 'SHA256SUMS'), lines.join('\n') + '\n'); console.log(lines.join('\n'));
