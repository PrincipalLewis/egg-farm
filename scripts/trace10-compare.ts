// trace10 comparator CLI (thin; logic in tests/trace10/compare.ts). Usage: trace10-compare.ts BEFORE_DIR AFTER_DIR OUT_DIR [--card-sha1=<sha1>]
// Exit 0 MATCH_ALL, 1 DIVERGED, 2 usage, 3 INVALID/UNASSESSED. Writes OUT_DIR/verdict.json (+ .sha256). Prints no certification.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compareSides, readSide, SYNTH_LABEL, type Verdict } from '../tests/trace10/compare';
import { sha256 } from '../tests/trace10/encode';
import { inputDiff } from '../tests/trace10/inputdiff';
import { balanceFromCsv, ROOT } from '../tests/trace10/producer';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2).filter(x => x !== '--'), flag = args.find(a => a.startsWith('--card-sha1='))?.slice(12) ?? null;
const [bd, ad, od] = args.filter(a => !a.startsWith('--'));
if (!bd || !ad || !od || !existsSync(bd) || !existsSync(ad)) { console.error('usage: trace10-compare.ts BEFORE_DIR AFTER_DIR OUT_DIR'); process.exit(2); }
const profs = (d: string) => readdirSync(d).filter(n => statSync(join(d, n)).isDirectory()).sort();
const pb = profs(bd), pa = profs(ad);
const per: Verdict[] = []; const invalid: string[] = [];
if (!pb.length) invalid.push('before: no profile directories');
if (JSON.stringify(pb) !== JSON.stringify(pa)) invalid.push(`profile sets differ: before ${pb.join(',')} after ${pa.join(',')}`);
for (const p of pb) per.push(compareSides(readSide(bd, p), readSide(ad, p), { cardSha1: flag }));
const all = per.flatMap(v => v.invalid.map(x => `${v.profile}: ${x}`)).concat(invalid);
const verdict = all.length || per.some(v => v.verdict === 'INVALID') ? 'INVALID' : per.some(v => v.verdict === 'DIVERGED') ? 'DIVERGED' : per.some(v => v.verdict === 'UNASSESSED') ? 'UNASSESSED' : 'MATCH_ALL';
const exit = verdict === 'MATCH_ALL' ? 0 : verdict === 'DIVERGED' ? 1 : 3;
const label = per.length && per.every(v => v.label === null) ? null : SYNTH_LABEL;
const out = { schema: 'trace10-verdict-set-v1', label, verdict, exit, invalid: all, profiles: per };
mkdirSync(od, { recursive: true }); const txt = JSON.stringify(out, null, 1) + '\n';
writeFileSync(join(od, 'verdict.json'), txt); writeFileSync(join(od, 'verdict.json.sha256'), `${sha256(txt)}  verdict.json\n`);
// §9: input-diff written AFTER the verdict, carrying the verdict's sha256; the verdict never reads it.
let inputCheck: string | null = null;
try { const csvOf = (d: string) => { const m = JSON.parse(readFileSync(join(d, pb[0], 'manifest.json'), 'utf8')); return readFileSync(resolve(ROOT, m.inputs.csv_path), 'utf8'); };
  const cb = csvOf(bd), ca = csvOf(ad), d = inputDiff(cb, ca, balanceFromCsv(cb), balanceFromCsv(ca), sha256(txt)); inputCheck = d.input_check;
  writeFileSync(join(od, 'input-diff.json'), JSON.stringify(d, null, 1) + '\n');
} catch (e) { writeFileSync(join(od, 'input-diff.json'), JSON.stringify({ schema: 'trace10-input-diff-v1', verdict_sha256: sha256(txt), error: String(e), input_check: 'FAIL' }, null, 1) + '\n'); inputCheck = 'FAIL'; }
console.log(JSON.stringify({ label, verdict, exit, input_check: inputCheck, invalid: all.length, profiles: per.map(v => ({ profile: v.profile, verdict: v.verdict, counts: v.counts })) }));
process.exit(exit);
