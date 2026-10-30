// CI check `pacing-x1-stack` (v5 manifest row 1; economy §13.2a AC-X1; sizing §15b). Owner of the check: HoE.
// Usage (read-only; writes only under --out):
//   npx vite-node scripts/pacing-x1-stack.ts -- shard --profile <optimal|seller15|casual> --out <dir> [--seeds 1-200] [--data <key>]
//   npx vite-node scripts/pacing-x1-stack.ts -- verdict --in <dir with shard-*.json> --out <dir>
// shard: builds balance IN MEMORY from the pinned fixtures in tests/pacing-x1/source.ts (sha256 asserted), then runs
//   tests/bot-m5.ts windowGate() (Econ's m5x.ts harness of record, ported byte-exact in #78) for none / N (AssZ) / H (AssZhold)
//   on seeds 1-200, T 4000, window step 300 s, step ratio from L11, plus the stack with each modelled flag toggled off (N),
//   plus the workers L10 P95 / L30 median from the N stack's own runs.
// verdict: compares the shards with the pinned §13.2a table (tests/fixtures/x1/pred-13.2a-e4369888.csv); exit 1 on any
//   blocks-merge=Y row that misses, else 0. G5-P pause rows are excluded (X1 note). Writes verdict.json and summary.md.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { loadTargets, quantile } from '../tests/pacing-guards';
import { run, PROFS, windowGate } from '../tests/bot-m5';
import { X1_DATA, X1_SOURCES, type X1SourceKey, type X1Toggle } from '../tests/pacing-x1/source';
import { evaluate, verdictOf, type Shard, type Gate } from '../tests/pacing-x1/compare';
import { X1_PRED, X1_RUN, ROOT, sha256, pinned, parsePred, x1Balance, x1Stacks } from '../tests/pacing-x1/harness';

const args = process.argv.slice(2).filter(a => a !== '--'), opt = (k: string, d?: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const sh = (c: string) => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };

function shard() {
  const profile = opt('--profile'), outDir = opt('--out'); if (!profile || !PROFS[profile] || !outDir) { console.error('shard: --profile <optimal|seller15|casual> --out <dir> required'); process.exit(2); }
  const key = (opt('--data') ?? X1_DATA) as X1SourceKey; if (!X1_SOURCES[key]) { console.error(`unknown --data ${key}`); process.exit(2); }
  const [s0, s1] = (opt('--seeds') ?? '1-200').split('-').map(Number), t0 = Date.now();
  const { b, csvSha256, balanceSha256 } = x1Balance(key), st = x1Stacks(key), tg = loadTargets();
  const g = (cfgs: string[]) => windowGate(b, { cfgs, profs: [profile], seeds: s1 - s0 + 1, s0, T: X1_RUN.T, step: X1_RUN.step, stepFrom: X1_RUN.stepFrom, noWin: false, targets: tg,
    onResult: (k, o) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${k} ${JSON.stringify(o.win ?? o.stepL30)}`) });
  const main = g(['none', 'x1:N', 'x1:H']), gate = { none: main[`none|${profile}`], N: main[`x1:N|${profile}`], H: main[`x1:H|${profile}`] } as Shard['gate'];
  const P = PROFS[profile], l10: number[] = [], l30: number[] = [];
  for (let s = s0; s <= s1; s++) { const r = run(b, s, P, st.N, X1_RUN.T); l10.push((r.reach.get(10) ?? Infinity) / 60); l30.push((r.reach.get(30) ?? Infinity) / 60); }
  const toggles: Shard['toggles'] = {};
  for (const [k, name] of Object.entries(st.toggles) as [X1Toggle, string][]) toggles[k] = name === 'n/a' ? 'n/a' : (g([name])[`${name}|${profile}`] as Gate);
  const live = { csv: sha256(readFileSync(new URL('data/economy.csv', ROOT))), balanceJson: sha256(readFileSync(new URL('src/config/balance.json', ROOT))) };
  const res: Shard & Record<string, unknown> = { profile, source: key, seeds: [s0, s1], T: X1_RUN.T, csvSha256, balanceSha256, gate, l10P95Min: quantile(l10, 0.95), l30MedianMin: quantile(l30, 0.5), toggles,
    stack: { N: st.N, H: st.H }, run: X1_RUN, live, head: sh('git rev-parse HEAD'), dirty: sh('git status --porcelain --untracked-files=no') !== '', runtimeS: Math.round((Date.now() - t0) / 1000), node: process.version };
  mkdirSync(outDir, { recursive: true }); writeFileSync(`${outDir}/shard-${profile}.json`, JSON.stringify(res, null, 1) + '\n');
  console.log(`pacing-x1-stack shard ${profile}: ${key}, seeds ${s0}-${s1}, ${res.runtimeS}s -> ${outDir}/shard-${profile}.json`);
}

function verdict() {
  const inDir = opt('--in'), outDir = opt('--out') ?? inDir; if (!inDir || !outDir) { console.error('verdict: --in <dir> [--out <dir>] required'); process.exit(2); }
  const rows = parsePred(pinned(X1_PRED.fixture, X1_PRED.sha256).toString('utf8'));
  const shards: Record<string, Shard & Record<string, any>> = {}; for (const fn of readdirSync(inDir).filter(n => /^shard-.*\.json$/.test(n))) { const s = JSON.parse(readFileSync(`${inDir}/${fn}`, 'utf8')); shards[s.profile] = s; }
  const ss = Object.values(shards), keys = new Set(ss.map(s => s.source)), heads = new Set(ss.map(s => s.head));
  const problems: string[] = []; if (keys.size > 1) problems.push(`shards ran different data sources: ${[...keys].join(', ')}`); if (heads.size > 1) problems.push(`shards ran different commits: ${[...heads].join(', ')}`);
  for (const p of ['optimal', 'seller15', 'casual']) if (!shards[p]) problems.push(`missing shard ${p}`);
  const o = evaluate(rows, shards), v = problems.length ? 'FAIL' : verdictOf(o), key = [...keys][0] as X1SourceKey, src = X1_SOURCES[key];
  const drift: string[] = []; const s0 = ss[0]; if (s0 && src) { if (src.liveCsvSha256.length === 64 && s0.live.csv !== src.liveCsvSha256) drift.push(`live data/economy.csv is ${s0.live.csv.slice(0, 8)}, this mode pins ${src.liveCsvSha256.slice(0, 8)}: V5-HOP-1 may have landed; flip X1_DATA (tests/pacing-x1/source.ts)`);
    if (s0.live.balanceJson !== src.balanceJson.sha256) drift.push(`live src/config/balance.json is ${s0.live.balanceJson.slice(0, 8)}, fixture pins ${src.balanceJson.sha256.slice(0, 8)}: re-pin the fixture if the change is meant to be measured`); }
  const n = (st: string) => o.filter(x => x.status === st).length;
  const md = [`## pacing-x1-stack: **${v}**`, '', `- data: \`${key}\` (${src?.label ?? '?'}); CSV sha256 ${s0?.csvSha256.slice(0, 8)}, balance.json ${s0?.balanceSha256.slice(0, 8)} (pinned fixtures)`,
    `- run: seeds ${s0?.seeds.join('-')}, T ${X1_RUN.T} s, windows every ${X1_RUN.step} s (A1/A2), step ratio from L${X1_RUN.stepFrom}; commit ${s0?.head?.slice(0, 12)}${s0?.dirty ? ' DIRTY' : ''}; shard runtimes ${ss.map(s => `${s.profile} ${s.runtimeS}s`).join(', ')}`,
    `- table: ${X1_PRED.fixture} sha256 ${X1_PRED.sha256.slice(0, 8)} (§13.2a of record, economy.c0d9492b.md L879-913)`,
    `- rows: ${n('PASS')} PASS, ${n('FAIL')} FAIL, ${n('WARN')} WARN, ${n('INFO')} INFO, ${n('NOT-WIRED')} NOT-WIRED (${o.filter(x => x.status === 'NOT-WIRED' && x.blocks).length} blocking), ${n('EXCLUDED')} EXCLUDED (G5-P pause rows)`,
    ...problems.map(p => `- **problem:** ${p}`), ...drift.map(d => `- **drift (warning):** ${d}`), '',
    '| line | profile | policy | metric | Y/N | predicted | measured | status | why |', '|---|---|---|---|---|---|---|---|---|',
    ...o.map(x => `| ${x.line} | ${x.profile} | ${x.flag} | ${x.metric.replace(/\|/g, '/')} | ${x.blocks ? 'Y' : 'N'} | ${x.predicted.replace(/\|/g, '/')} | ${x.measured.replace(/\|/g, '/')} | ${x.status} | ${x.why.replace(/\|/g, '/')} |`)].join('\n') + '\n';
  mkdirSync(outDir, { recursive: true }); writeFileSync(`${outDir}/verdict.json`, JSON.stringify({ verdict: v, source: key, problems, drift, rows: o }, null, 1) + '\n'); writeFileSync(`${outDir}/summary.md`, md);
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, md, { flag: 'a' });
  console.log(md.split('\n').slice(0, 9).join('\n')); for (const x of o.filter(x => x.status === 'FAIL' || x.status === 'WARN')) console.log(`${x.status} L${x.line} ${x.profile} ${x.flag}: ${x.why}`);
  process.exit(v === 'PASS' ? 0 : 1);
}

if (args[0] === 'shard') shard(); else if (args[0] === 'verdict') verdict(); else if (args.length) { console.error('usage: pacing-x1-stack.ts -- shard --profile <p> --out <dir> [--seeds 1-200] [--data <key>] | verdict --in <dir> [--out <dir>]'); process.exit(2); }
