// trace10 producer CLI (thin; logic in tests/trace10/producer.ts). One side, one process.
// Env (documented only): CSV (data/economy.csv) SIDE (before|after) SEEDS (5) S0 (1) T (4000) PROFS (optimal,seller15,casual) OUT (required)
// Flags: --card=<path to product/m5-gate-acs.md> (required)  --card-sha1=<re-pin override>  --synthetic  --selftest-id=<id>
//        --observer-proof (P1-P3 per seed/profile + P4 informational, writes OUT/observer-proof.json; no streams)
// Exit: 0 ok, 2 usage, 3 INVALID (no manifest written; OUT/<side>/<prof>/producer-errors.json explains). No certification text.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { produceProfile, balanceFromCsv, ROOT } from '../tests/trace10/producer';
import { writeProfile, writeManifestSha } from '../tests/trace10/io';
import { proveSeed, p4Reach } from '../tests/trace10/observer-proof';
import { PROFILES, type Profile } from '../tests/trace10/manifest';
import { checkEnv } from '../tests/bot-m5';

const argv = process.argv.slice(2).filter(a => a !== '--'), flag = (k: string) => argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null, has = (k: string) => argv.includes(`--${k}`);
const usage = (m: string) => { console.error(`trace10: ${m}`); process.exit(2); };
const E = process.env, DOC = ['CSV', 'SIDE', 'SEEDS', 'S0', 'T', 'PROFS', 'OUT'];
try { checkEnv({ SEEDS: E.SEEDS ?? '5', S0: E.S0, T: E.T }); } catch (e) { usage((e as Error).message); }
const OUT = E.OUT; if (!OUT) usage('OUT is required');
const csvPath = E.CSV ?? 'data/economy.csv', side = (E.SIDE ?? 'before') as 'before' | 'after', NS = +(E.SEEDS ?? 5), S0 = +(E.S0 ?? 1), T = +(E.T ?? 4000);
const profs = (E.PROFS ?? PROFILES.join(',')).split(',') as Profile[];
if (side !== 'before' && side !== 'after') usage('SIDE must be before|after');
for (const p of profs) if (!(PROFILES as readonly string[]).includes(p)) usage(`unknown profile ${p}`);
const card = flag('card'); if (!card || !existsSync(card)) usage('--card=<path to product/m5-gate-acs.md> is required and must exist');
const seeds = Array.from({ length: NS }, (_, k) => S0 + k);
const csvText = readFileSync(resolve(ROOT, csvPath), 'utf8');
const env = Object.fromEntries(DOC.filter(k => E[k] !== undefined).map(k => [k, E[k]!]));
let exit = 0;
if (has('observer-proof')) {
  const bal = balanceFromCsv(csvText), rows = [], p4: Record<string, unknown> = {};
  for (const p of profs) { const reach: Record<number, Record<string, number>> = {};
    for (const s of seeds) { const r = proveSeed(bal, s, p, T); rows.push(r); if (!(r.P1 && r.P2 && r.P3) || r.observer_invalid.length) exit = 1; }
    const prod = produceProfile({ side, csvPath, csvText, seeds, profile: p, T, cardPath: card!, cardSha1: flag('card-sha1'), synthetic: true, selftestId: 'observer-proof-P4' });
    for (const x of prod.perSeed) reach[x.seed] = x.reach;
    p4[p] = p4Reach(join(ROOT, '../egg-farm-studio/scratch/post-l10/baseline/out', `raw-${p}.json`), reach); }
  mkdirSync(OUT!, { recursive: true });
  writeFileSync(join(OUT!, 'observer-proof.json'), JSON.stringify({ schema: 'trace10-observer-proof-v1', label: 'SYNTHETIC/SELFTEST — not PL-AC5(iii) evidence', csv: csvPath, seeds, profiles: profs, T,
    all: rows.every(r => r.P1 && r.P2 && r.P3 && !r.observer_invalid.length) ? 'P1-P3 EQUAL' : 'FAIL', rows, P4: p4 }, null, 1) + '\n');
  console.log(JSON.stringify({ observer_proof: exit === 0 ? 'P1-P3 EQUAL' : 'FAIL', n: rows.length, P4: Object.fromEntries(Object.entries(p4).map(([k, v]: any) => [k, v.status])) }));
  process.exit(exit);
}
const sideDir = join(OUT!, side); rmSync(sideDir, { recursive: true, force: true });
for (const p of profs) {
  const r = produceProfile({ side, csvPath, csvText, seeds, profile: p, T, cardPath: card!, cardSha1: flag('card-sha1'), synthetic: has('synthetic'), selftestId: flag('selftest-id'),
    cmd: 'vite-node scripts/trace10.ts', argv, env });
  if (!r.data) { mkdirSync(join(sideDir, p), { recursive: true }); writeFileSync(join(sideDir, p, 'producer-errors.json'), JSON.stringify(r.invalid, null, 1) + '\n'); console.error(`trace10 ${side}/${p}: INVALID\n` + r.invalid.slice(0, 20).join('\n')); exit = 3; continue; }
  writeProfile(sideDir, p, r.data, { 'gaps.json': r.gaps });
  console.log(JSON.stringify({ side, profile: p, seeds: seeds.length, i10: r.perSeed.map(x => x.i10) }));
}
writeManifestSha(sideDir);
process.exit(exit);
