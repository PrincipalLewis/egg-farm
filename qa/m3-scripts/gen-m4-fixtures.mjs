// Generate M4 guard fixtures. Usage: node gen-m4-fixtures.mjs <src-v5-or-v6-fixture.json> <outdir>   (V6_FIXTURE preferred when a real v6 file exists)
import fs from 'node:fs'; import { toV6, toV7, markV6, sha, mkBackup } from './m4-guard-lib.mjs';
const [src, out = './m4-fixtures'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const raw = fs.readFileSync(src, 'utf8'), d = JSON.parse(raw), v6 = d.version === 6 ? raw : toV6(raw);
// Marked fixtures (§3a.4): synthetic from the v6 base, plus a REAL 677317d-written marked v6 (chromium-migrated-v5-40min-save.json) if present.
const REAL = process.env.MARKED_REAL ?? '/workspace/egg-farm-studio/qa/m3-recheck/m4a-v3-677317d-smoke/chromium-migrated-v5-40min-save.json';
const files = { 'm4-v6-base.json': v6, 'm4-v7-basic.json': toV7(v6), 'm4-v7-refund.json': toV7(v6, { refund: 12345 }),
  'm4-v6-backup-record.json': mkBackup(v6, '0123456789abcdef'), // ADR M4-15 record, committed to the m4-v7-* fixtures' v6BackupId
  'm4-v6-marked.json': markV6(v6, { H: d.state.farmLevel, V: 13, milestones: ['hens:10'] }) };
if (fs.existsSync(REAL)) { const r = fs.readFileSync(REAL, 'utf8').trim(); const j = JSON.parse(r); if (j.version === 6 && j.state?.tracksV7 === 1) files['m4-v6-marked-real.json'] = r; else console.error('MARKED_REAL is not a marked v6 - skipped'); }
let sums = ''; for (const [n, c] of Object.entries(files)) { fs.writeFileSync(`${out}/${n}`, c); sums += `${sha(c)}  ${n}\n`; }
fs.writeFileSync(`${out}/SHA256SUMS.txt`, sums); process.stdout.write(sums);
