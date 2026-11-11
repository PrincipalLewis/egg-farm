// Spec v0.3 §17.8 named fixtures (F17-*), crafted by HoQA from dd223f5 code. Run from qa/csr:
//   ./tmp-dd223f5/node_modules/.bin/vite-node fixtures/make-fixtures-f17.ts
// Where §17.8 leaves an input open, the value chosen is noted in NOTES (and in csr-17-gonogo.md).
import fs from 'node:fs'; import crypto from 'node:crypto';
import { balance as b } from '../tmp-dd223f5/src/config/balance';
import { checksum } from '../tmp-dd223f5/src/save/save';
const dir = new URL('./f17/', import.meta.url).pathname;
const oq1 = JSON.parse(fs.readFileSync(new URL('../../m3-recheck/oq1/OQ1-farmLevel-abc-nobak.json', import.meta.url), 'utf8'));
const T = oq1.savedAt, E = b.workers.energy.start_pct, W = { energy: E, cdS: 0 };
const raw = (st: any, seq = 5, savedAt = T) => { const j = JSON.stringify(st); return `{"version":6,"savedAt":${savedAt},"saveSeq":${seq},"sum":"${checksum(j)}","state":${j}}`; };
const base = { ...oq1.state, farmLevel: 18 };
const mig = JSON.parse(fs.readFileSync(new URL('./Q1ii-migrated-F0-V12-valid.json', import.meta.url), 'utf8')).state;
const unm = (() => { const s: any = { ...base, celebratedTier: 2, workers: { hawker: W } }; for (const k of ['tracksV7', 'v6BackupId', 'hensLevel', 'eggValueLevel', 'celebratedMilestones']) delete s[k]; return s; })();
const F: Record<string, string> = {
  'F17-3BAD.json': raw({ ...base, farmLevel: 'abc', hensLevel: null, eggValueLevel: -1, celebratedTier: 2, workers: { coop_hand: W }, celebratedMilestones: ['hens:10', 'grade:5'] }),
  'F17-MIG-V12.json': raw({ ...mig, farmLevel: 'x' }),
  // NOTE: §17.8 doesn't pin H/V/true F here; chosen release-reachable F25 H22 V21 (H <= F+3, balanced:4 needs min >= 20).
  'F17-GRADER5.json': raw({ ...base, farmLevel: '?', hensLevel: 22, eggValueLevel: 21, graderTier: 5, celebratedTier: 3, workers: { grader: W, hawker: W }, celebratedMilestones: ['grade:20', 'balanced:4'] }),
  'F17-H-ONLY.json': raw({ ...base, hensLevel: '', eggValueLevel: 12, celebratedMilestones: ['hens:20', 'balanced:2'] }),
  'F17-C-ONLY.json': raw({ ...base, collectionLevel: -5 }),
  'F17-4BAD.json': raw({ ...base, farmLevel: 'abc', hensLevel: null, eggValueLevel: -1, collectionLevel: '' }),
  'F17-NONLEVEL.json': raw({ ...base, farmLevel: 'abc', coinsCents: 'x' }),
  'F17-BAK-LOWERSEQ.json': raw({ ...base, farmLevel: 'abc' }, 5),
  'F17-BAK-LOWERSEQ.bak.json': raw({ ...base, farmLevel: 18, coinsCents: 7_000_000 }, 4, T - 30_000),
  'F17-IDB.json': raw({ ...base, farmLevel: 'abc' }, 5),
  'F17-IDB.idb.json': raw({ ...base, farmLevel: 17, coinsCents: 5_000_000 }, 3, T - 600_000),
  'F17-IDB-UNKNOWN.json': raw({ ...base, farmLevel: 'abc' }),
  'F17-IDB-SAME.json': raw({ ...base, farmLevel: 'abc' }),
  'F17-IDB-SAME.idb.json': raw({ ...base, farmLevel: 'abc' }),
  'F17-UNMARKED-V6.json': raw({ ...unm, farmLevel: 'abc' }, 0),
  // NOTE: §17.8 expects F 0, which needs H <= 3; H not pinned in the spec -> chosen H 3 (H 18 would give 15).
  'F17-MALFORMED.json': raw({ ...base, farmLevel: 'abc', hensLevel: 3, graderTier: '5', celebratedTier: 9, workers: { foo: {}, hawker: 1 }, celebratedMilestones: 'hens:20' }),
  'F17-STORAGE.json': raw({ ...base, farmLevel: 'abc' }),
};
const lines: string[] = [];
for (const [n, r] of Object.entries(F)) { fs.writeFileSync(dir + n, r); lines.push(`${crypto.createHash('sha256').update(r).digest('hex')}  ${n}`); }
fs.writeFileSync(dir + 'SHA256SUMS', lines.join('\n') + '\n'); console.log(lines.join('\n'));
