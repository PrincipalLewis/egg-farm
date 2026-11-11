// Q-Q1 fixtures (HoQA): built with dd223f5's own migrateStoredTracksV7 so the migrated states are reachable, not invented.
// Run: ./tmp-dd223f5/node_modules/.bin/vite-node fixtures/make-fixtures-q1.ts   (from qa/csr)
import fs from 'node:fs'; import crypto from 'node:crypto';
import { balance as b } from '../tmp-dd223f5/src/config/balance';
import { migrateStoredTracksV7 } from '../tmp-dd223f5/src/sim/migrate-v7';
import { checksum } from '../tmp-dd223f5/src/save/save';
import { coopTier } from '../tmp-dd223f5/src/sim/state';
const dir = new URL('.', import.meta.url).pathname;
const oq1 = JSON.parse(fs.readFileSync(dir + '../../m3-recheck/oq1/OQ1-farmLevel-abc-nobak.json', 'utf8'));
const T = oq1.savedAt;
const raw = (st: any, seq = 5) => { const j = JSON.stringify(st); return `{"version":6,"savedAt":${T},"saveSeq":${seq},"sum":"${checksum(j)}","state":${j}}`; };
const out: Record<string, string> = {};
// (i) CSR-17-2 exactly as specified: F "abc", H null, V -1, C valid (12), celebratedMilestones ["hens:10","grade:5"], celebratedTier 2, workers {coop_hand}
out['Q1i-csr17-2-three-bad.json'] = raw({ ...oq1.state, farmLevel: 'abc', hensLevel: null, eggValueLevel: -1, collectionLevel: 12,
  celebratedMilestones: ['hens:10', 'grade:5'], celebratedTier: 2, workers: { coop_hand: { energy: b.workers.energy.start_pct, cdS: 0 } } });
// (ii) migrated saves with V > F + 3 (M4A-28 grandfathering), real migration output, then marked (tracksV7:1 + v6BackupId) and F corrupted
for (const [F, C] of [[0, 30], [4, 30], [6, 30]] as const) {
  const v6 = { ...oq1.state, farmLevel: F, collectionLevel: C, coinsCents: 7_777_777, celebratedTier: coopTier(F) } as any; delete v6.tracksV7; delete v6.v6BackupId; delete v6.hensLevel; delete v6.eggValueLevel; delete v6.celebratedMilestones;
  const m = migrateStoredTracksV7({ ...v6, hensLevel: 0, eggValueLevel: 0, celebratedMilestones: [] }, b).state as any;
  const st = { ...m, tracksV7: 1, v6BackupId: '00112233aabbccdd' };
  if (!(st.eggValueLevel > F + 3)) throw new Error(`F${F}C${C}: V ${st.eggValueLevel} not > F+3`);
  out[`Q1ii-migrated-F${F}-V${st.eggValueLevel}-valid.json`] = raw(st);                       // control: loads as-is today
  out[`Q1ii-migrated-F${F}-V${st.eggValueLevel}-farmLevel-abc.json`] = raw({ ...st, farmLevel: 'abc' }); // repair target
}
const lines: string[] = [];
for (const [n, r] of Object.entries(out)) { fs.writeFileSync(dir + n, r); lines.push(`${crypto.createHash('sha256').update(r).digest('hex')}  ${n}`); }
fs.appendFileSync(dir + 'SHA256SUMS', lines.join('\n') + '\n'); console.log(lines.join('\n'));
