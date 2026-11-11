// CSR-AC-IDB1 (D-HOP-34) IndexedDB-only corrupt fixtures. IDB names from dd223f5 src/save/idb-mirror.ts:11, :31-32, :60, :83:
//   database 'eggfarm' version 1, object store 'save' (createObjectStore(IDB_STORE): no keyPath, no autoIncrement = out-of-line keys),
//   key 'main', value = the raw save STRING (readStrict/read return null for any non-string value, :60/:66).
// Run: node fixtures/idb1/make-idb1.mjs  (from qa/csr)
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const dir = path.dirname(new URL(import.meta.url).pathname);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const oq1 = fs.readFileSync(path.join(dir, '../../../m3-recheck/oq1/OQ1-farmLevel-abc-nobak.json'), 'utf8');
const IDB = { db: 'eggfarm', version: 1, store: 'save', keyPath: null, autoIncrement: false, key: 'main', source: 'dd223f5 src/save/idb-mirror.ts:11' };
const LS_ABSENT = ['eggfarm.save', 'eggfarm.save.bak', 'eggfarm.save.v6_backup', 'eggfarm.save.corrupt.index'];
const variants = [
  { id: 'IDB1-abc', valueType: 'string', value: oq1, todayReason: 'invalid_state', note: 'OQ-1 payload byte-identical (sha256 7dea4a43…3416ed); farmLevel "abc"' },
  { id: 'IDB1-truncated', valueType: 'string', value: oq1.slice(0, Math.floor(oq1.length / 2)), todayReason: 'parse', note: 'OQ-1 payload cut at half its length (truncated JSON)' },
  { id: 'IDB1-wrongtype-version-string', valueType: 'string', value: oq1.replace('"version":6', '"version":"6"'), todayReason: 'wrong_type', note: 'OQ-1 payload with version as the string "6"' },
  { id: 'IDB1-nonstring-object', valueType: 'structured-clone-object', value: JSON.parse(fs.readFileSync(path.join(dir, '../P4-ls-valid-seq5.json'), 'utf8')), todayReason: 'n/a: readStrict returns null (treated as NO copy)', note: 'OPTIONAL edge: a non-string value in save/main (the VALID P4-ls-valid-seq5 save, checksum OK, stored as an object). dd223f5 never reads it; AC wording must say whether it counts as corrupt' },
];
const sums = [];
for (const v of variants) {
  const payload = v.valueType === 'string' ? v.value : JSON.stringify(v.value);
  const m = { fixtureId: v.id, ac: 'CSR-AC-IDB1 (D-HOP-34)', builtAgainst: 'dd223f5', idb: { ...IDB, records: [{ key: IDB.key, valueType: v.valueType, value: v.value }] },
    localStorage: { set: { 'eggfarm.ui': '{"onboardingDone":true}' }, mustBeAbsent: LS_ABSENT }, valueSha256: sha(payload), todayValidateReason: v.todayReason, note: v.note };
  const mj = JSON.stringify(m, null, 1) + '\n';
  fs.writeFileSync(path.join(dir, `${v.id}.manifest.json`), mj);
  if (v.valueType === 'string') { fs.writeFileSync(path.join(dir, `${v.id}.idb-main.raw`), payload); sums.push(`${sha(payload)}  ${v.id}.idb-main.raw`); }
  sums.push(`${sha(mj)}  ${v.id}.manifest.json`);
}
fs.writeFileSync(path.join(dir, 'SHA256SUMS'), sums.join('\n') + '\n'); console.log(sums.join('\n'));
