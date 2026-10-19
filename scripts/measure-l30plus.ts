// THE L30+ step-gate harness (engineering/l30plus-harness.md). Senior Software Architect, 2026-10-19.
// Usage: npm run measure:l30plus -- <csv> [--seeds 1-200] [--T 14400] [--out <dir>]
// Read-only. It builds balance.json IN MEMORY from <csv> with the committed sync-economy (buildBalance + readEconomyConfig)
// and validateBalance, then runs the committed bots at their defaults (no overrides). It never writes data/ or src/.
// Writes <out>/result.json and <out>/summary.txt (default out: /tmp/l30plus-measure-<csv sha8>-<HEAD7>).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './sync-economy';
import { validateBalance, balance as repoBalance, type Balance } from '../src/config/balance';
import { tableRow } from '../src/config/formulas';
import { runBot } from '../tests/bot';
import { runM2 } from '../tests/bot-m2';
import { VAR_DEFAULT } from '../tests/seller-variance';
import { loadTargets, quantile as q, maxStepRatio, type Reach } from '../tests/pacing-guards';
const GATE = { id: 'D-CEO-20261019-04', p95Max: 2.0, worstMax: 2.25, topStepShareMax: 0.25 /* D-HOP-2026-10-19-22 product rule */, l10P95Max: 12.1, deadZoneS: 180 };
const args = process.argv.slice(2).filter(a => a !== '--'), opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const csvPath = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
if (!csvPath) { console.error('usage: npm run measure:l30plus -- <csv> [--seeds 1-200] [--T 14400] [--out <dir>]'); process.exit(2); }
const [s0, s1] = opt('--seeds', '1-200').split('-').map(Number), T = +opt('--T', '14400');
const sh = (c: string) => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const self = fileURLToPath(import.meta.url), raw = readFileSync(csvPath), sha = createHash('sha256').update(raw).digest('hex');
const head = sh('git rev-parse HEAD'), dirty = sh('git status --porcelain --untracked-files=no') !== '';
const out: any = {
  harness: { path: 'scripts/measure-l30plus.ts', blob: sh(`git hash-object ${self}`), committedBlob: sh('git rev-parse HEAD:scripts/measure-l30plus.ts') },
  code: { head, dirty }, csv: { path: csvPath, sha256: sha }, seeds: [s0, s1], T, gate: GATE, at: new Date().toISOString(),
};
const outDir = opt('--out', `/tmp/l30plus-measure-${sha.slice(0, 8)}-${head.slice(0, 7)}`); mkdirSync(outDir, { recursive: true });
const lines: string[] = []; const say = (s: string) => { lines.push(s); console.log(s); };
const finish = (code: number) => { writeFileSync(`${outDir}/result.json`, JSON.stringify(out, null, 1)); writeFileSync(`${outDir}/summary.txt`, lines.join('\n') + '\n'); console.log(`wrote ${outDir}/result.json, summary.txt`); process.exit(code); };
say(`L30+ harness ${out.harness.path} blob ${out.harness.blob.slice(0, 12)}${out.harness.blob === out.harness.committedBlob ? '' : ' (NOT the committed blob)'} | code ${head.slice(0, 12)}${dirty ? ' DIRTY' : ''}`);
say(`csv ${csvPath} sha256 ${sha} | seeds ${s0}-${s1} | workers T ${T}s`);
// L0-30 diff vs the repo's data/economy.csv (shared columns; added columns listed separately)
const rows = parseEconomyCsv(raw.toString('utf8')), repoRows = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
const cells: string[] = []; for (let L = 0; L <= Math.min(30, repoRows.length - 1); L++) for (const k of Object.keys(repoRows[L])) if (repoRows[L][k] !== rows[L]?.[k]) cells.push(`L${L} ${k} ${repoRows[L][k]} -> ${rows[L]?.[k]}`);
const added = Object.keys(rows[0]).filter(k => !(k in repoRows[0])), removed = Object.keys(repoRows[0]).filter(k => !(k in rows[0]));
const l011 = cells.filter(c => +c.slice(1, c.indexOf(' ')) <= 11);
out.l0_30 = { verdict: cells.length ? 'FAIL' : 'PASS', l0_11: l011.length ? 'FAIL' : 'PASS', cellDiffs: cells, addedColumns: added, removedColumns: removed };
say(`L0-30 vs repo data/economy.csv: ${out.l0_30.verdict} (${cells.length} cell diffs; L0-11 ${out.l0_30.l0_11})${cells.slice(0, 6).map(c => '\n  ' + c).join('')}${added.length ? `\n  added columns (${added.length}): ${added.join(', ')}` : ''}`);
// build
let b: Balance;
try { b = validateBalance(buildBalance(rows, JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8')), readEconomyConfig()) as Balance, false); }
catch (e) { out.build = { ok: false, error: (e as Error).message }; say(`BUILD FAILS (sync-economy/validateBalance): ${(e as Error).message}\n  -> this code cannot build the CSV; see engineering/l30plus-harness.md (needs the #45 L30+ code)`); finish(1); }
const tm = (t: 'hens' | 'eggValue') => (b! as any).m4 ? (b! as any).m4[t].costs.length - 1 : null;
out.build = { ok: true, farmMax: b!.maxLevel, hensMax: tm('hens'), eggValueMax: tm('eggValue'), coopTable: !!(b!.farm as any).coopCapacityTable, m4Enabled: (b! as any).m4?.enabled };
say(`build OK: Farm max ${b!.maxLevel}, Hens max ${tm('hens')}, Egg value max ${tm('eggValue')}, coop table ${out.build.coopTable}, m4.enabled ${out.build.m4Enabled}`);
const tr: string[] = []; for (let L = 0; L <= 11; L++) { const a = tableRow(L, repoBalance) as any, c = tableRow(L, b!) as any; for (const k of Object.keys(a)) if (a[k] !== c[k]) tr.push(`L${L} ${k}`); }
for (const t of ['hens', 'eggValue'] as const) for (let L = 0; L <= 11; L++) if ((repoBalance as any).m4?.[t].costs[L] !== (b! as any).m4?.[t].costs[L]) tr.push(`m4.${t} L${L}`);
out.l0_11_balance = { diffs: tr }; say(`L0-11 balance (tableRow + m4 costs) vs repo balance.json: ${tr.length ? `${tr.length} diffs: ${tr.slice(0, 6).join(', ')}` : 'identical'}`);
// runs (committed bots, defaults)
const S = Array.from({ length: s1 - s0 + 1 }, (_, i) => s0 + i), get = (r: Reach, L: number) => (r instanceof Map ? r.get(L) : (r as any)[L]) ?? Infinity;
const W = S.map(s => runM2(b!, s, { model: 'seller15', T, variance: VAR_DEFAULT }).reach as Reach);
const NW = S.map(s => runBot(b!, s, 'seller15', 3600, 15, VAR_DEFAULT).reach as Reach);
// time ON level n = reach[n+1] - reach[n] (the pacing-guards convention: step(n) = time on n / time on n-1)
const timeOn = (r: Reach, n: number) => get(r, n + 1) - get(r, n);
const levels: any[] = [], dead: string[] = [];
for (let n = 0; n < b!.maxLevel; n++) {
  const d = W.map(r => timeOn(r, n)).filter(Number.isFinite);
  if (!d.length) { levels.push({ level: n, seeds: 0 }); continue; }
  const e = { level: n, seeds: d.length, median_s: Math.round(q(d, .5)), p95_s: Math.round(q(d, .95)) }; levels.push(e);
  if (e.p95_s > GATE.deadZoneS) dead.push(`F${n}`);
}
const maxL = W.map(r => { let m = 0; for (let L = 1; L <= b!.maxLevel; L++) if (Number.isFinite(get(r, L))) m = L; return m; });
out.levels = levels; out.deadZones = dead; out.farmLevelAtT = { p5: q(maxL, .05), median: q(maxL, .5), p95: q(maxL, .95) };
say(`workers path: Farm level at T P5/median/P95 ${q(maxL, .05)}/${q(maxL, .5)}/${q(maxL, .95)}`);
say(`time on level (median/P95 s): ${levels.map(e => e.seeds ? `F${e.level} ${e.median_s}/${e.p95_s}` : `F${e.level} -`).join(' ')}`);
say(`dead zones (P95 time on level > ${GATE.deadZoneS}s): ${dead.length ? dead.join(' ') : 'none'}`);
// L10
const l10 = (R: Reach[]) => R.map(r => get(r, 10) / 60), lw = l10(W), ln = l10(NW);
out.l10 = { workers: { p95: q(lw, .95), fastest: Math.min(...lw), margin: +(GATE.l10P95Max - q(lw, .95)).toFixed(3) }, noWorkers: { p95: q(ln, .95), fastest: Math.min(...ln), margin: +(GATE.l10P95Max - q(ln, .95)).toFixed(3) } };
say(`L10 P95 workers ${q(lw, .95).toFixed(2)} min (margin ${out.l10.workers.margin} to ${GATE.l10P95Max}; fastest ${Math.min(...lw).toFixed(2)}) | no-workers ${q(ln, .95).toFixed(2)} (margin ${out.l10.noWorkers.margin}; fastest ${Math.min(...ln).toFixed(2)})`);
// step gate
const t = loadTargets(), per = S.map((s, i) => [s, maxStepRatio(W[i], t.step_ratio_from_level, t.step_ratio_min_prev_s)] as const).filter(x => x[1] != null) as [number, number][];
if (!per.length) { out.stepGate = { verdict: 'NOT EVALUATED', reason: `no counted L${t.step_ratio_from_level}+ steps (Farm max ${b!.maxLevel})` }; say(`step gate ${GATE.id}: NOT EVALUATED (${out.stepGate.reason})`); finish(1); }
const v = per.map(x => x[1]), ws = per.reduce((a, x) => (x[1] > a[1] ? x : a)), p95 = q(v, .95);
const top = (r: Reach) => { let best = -1, lv = -1; for (let n = t.step_ratio_from_level; n < b!.maxLevel; n++) { const a = timeOn(r, n), p = timeOn(r, n - 1); if (Number.isFinite(a) && Number.isFinite(p) && p >= t.step_ratio_min_prev_s && a / p > best) { best = a / p; lv = n; } } return lv; };
const cnt: Record<number, number> = {}; for (const r of W) { const n = top(r); if (n >= 0) cnt[n] = (cnt[n] ?? 0) + 1; }
const shares = Object.entries(cnt).map(([n, c]) => ({ level: +n, share: +(c / per.length).toFixed(4) })).sort((a, c) => c.share - a.share);
const pass = { p95: p95 <= GATE.p95Max, worst: ws[1] <= GATE.worstMax, topShare: shares[0].share <= GATE.topStepShareMax };
out.stepGate = { verdict: pass.p95 && pass.worst ? 'PASS' : 'FAIL', counted: per.length, p95, worst: ws[1], worstSeed: ws[0], pass,
  top5Seeds: [...per].sort((a, c) => c[1] - a[1]).slice(0, 5), topStepShare: shares, topStepRuleVerdict: pass.topShare ? 'PASS' : 'FAIL' };
say(`step gate ${GATE.id} (P95 <= ${GATE.p95Max}, worst <= ${GATE.worstMax}): ${out.stepGate.verdict} | P95 ${p95.toFixed(3)} | worst ${ws[1].toFixed(3)} (seed ${ws[0]}) | ${per.length} seeds counted`);
say(`top-step share per level (D-HOP-22 rule <= ${100 * GATE.topStepShareMax}%): ${out.stepGate.topStepRuleVerdict} | ${shares.slice(0, 6).map(x => `F${x.level} ${(100 * x.share).toFixed(1)}%`).join(', ')}`);
finish(0);
