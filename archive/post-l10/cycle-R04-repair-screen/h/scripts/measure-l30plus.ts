// THE L30+ step-gate harness (engineering/l30plus-harness.md). Senior Software Architect, 2026-10-19.
// Usage: npm run measure:l30plus -- <csv> [--seeds 1-200] [--T 14400] [--out <dir>] [--collection-table on|off] [--no-baseline-cache]
// Read-only. It builds balance.json IN MEMORY from <csv> with the committed sync-economy (buildBalance + readEconomyConfig)
// and validateBalance, then runs the committed bots at their defaults (no overrides). It never writes data/ or src/.
// Writes <out>/result.json and <out>/summary.txt (default out: /tmp/l30plus-measure-<csv sha8>-<HEAD7>).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './sync-economy';
import * as syncEconomy from './sync-economy';
import { snap, compareSeed, summarize, firstBuys, dceo15Verdicts, compareSeedB, summarizeB, distribution, longestGap, type TraceEvent, type SeedCompareB } from './l30plus-trace';
import { existsSync } from 'node:fs';
import { validateBalance, balance as repoBalance, type Balance } from '../src/config/balance';
import { tableRow, farmCost, collectionCost } from '../src/config/formulas';
import { runBot } from '../tests/bot';
import { runM2 } from '../tests/bot-m2';
import { VAR_DEFAULT } from '../tests/seller-variance';
import { loadTargets, quantile as q, maxStepRatio, type Reach } from '../tests/pacing-guards';
const GATE = { id: 'D-CEO-20261019-04', p95Max: 2.0, worstMax: 2.25, topStepShareMax: 0.25 /* D-HOP-2026-10-19-22 product rule */, l10P95Max: 12.1, deadZoneS: 180 };
const args = process.argv.slice(2).filter(a => a !== '--'), opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const csvPath = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
if (!csvPath) { console.error('usage: npm run measure:l30plus -- <csv> [--seeds 1-200] [--T 14400] [--out <dir>] [--collection-table on|off] [--no-baseline-cache]'); process.exit(2); }
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
say(`L30+ harness ${out.harness.path} blob ${out.harness.blob.slice(0, 12)}${out.harness.blob === out.harness.committedBlob ? '' : ' (NOT the committed blob)'} | code ${head}${dirty ? ' DIRTY' : ''}`);
say(`csv ${csvPath} sha256 ${sha} | seeds ${s0}-${s1} | workers T ${T}s`);
// collectionCostFromCsv (D-HOP-23): data/economy-config.json value unless --collection-table on|off overrides it; recorded either way.
const cfg0 = readEconomyConfig() as any, ov = opt('--collection-table', '');
if (ov && ov !== 'on' && ov !== 'off') { console.error('--collection-table must be on or off'); process.exit(2); }
const flagOn = ov ? ov === 'on' : !!cfg0.collectionCostFromCsv;
const flagSupported = typeof (syncEconomy as any).collectionTableConflicts === 'function'; // the D-HOP-23 sync code is present
out.collectionTable = { flag: 'collectionCostFromCsv', state: flagOn ? 'on' : 'off', source: ov ? `override --collection-table ${ov}` : 'collectionCostFromCsv' in cfg0 ? 'data/economy-config.json' : 'default (absent from data/economy-config.json)', codeSupportsFlag: flagSupported };
say(`collectionCostFromCsv ${out.collectionTable.state} (source: ${out.collectionTable.source}; sync-economy implements it: ${flagSupported ? 'yes' : 'NO'})`);
if (flagOn && !flagSupported) { out.build = { ok: false, error: 'collectionCostFromCsv on but this code has no D-HOP-23 sync support' }; say(`BUILD FAILS: ${out.build.error}`); finish(1); }
const cfg = { ...cfg0, collectionCostFromCsv: flagOn || undefined };
if (!flagOn) delete (cfg as any).collectionCostFromCsv;
// Baseline CSV (HoE 09:36): the post-D-HOP-25 economy.csv (123 kept columns), sha256 BASELINE_SHA. Used for the L0-30 / L30-row
// cell checks AND as the play-equivalence baseline run. --baseline <csv> overrides; its path + sha256 are always printed.
const BASELINE_SHA = 'c7bb783fe890928f747c142411503261f0711388e73fe1cdadbfd76cc8d68b44', BASELINE_DEFAULT = '/workspace/egg-farm-studio/scratch/m41-5-drop/economy.dropped8.csv';
const basePath = opt('--baseline', BASELINE_DEFAULT), baseRaw = readFileSync(basePath), mainTxt = baseRaw.toString('utf8'), mainSha = createHash('sha256').update(baseRaw).digest('hex');
out.baselineCsv = { path: basePath, sha256: mainSha, expectedSha256: BASELINE_SHA, pinned: mainSha === BASELINE_SHA, columns: mainTxt.split(/\r?\n/)[0].split(',').length, overridden: basePath !== BASELINE_DEFAULT };
say(`baseline csv ${basePath} sha256 ${mainSha} (${out.baselineCsv.columns} columns; ${out.baselineCsv.pinned ? 'matches the post-D-HOP-25 pin' : `DOES NOT match the post-D-HOP-25 pin ${BASELINE_SHA.slice(0, 12)}`})`);
// L0-30 diff vs the repo's data/economy.csv (shared columns; added columns listed separately)
const rows = parseEconomyCsv(raw.toString('utf8'));
const rawTable = (txt: string) => { const ls = txt.trim().split(/\r?\n/), h = ls[0].split(',').map(x => x.trim()); return { h, rows: ls.slice(1).map(l => Object.fromEntries(l.split(',').map((v, k) => [h[k], v.trim()]))) }; };
const BT = rawTable(mainTxt), CT = rawTable(raw.toString('utf8'));
const cells: string[] = []; for (let L = 0; L <= Math.min(30, BT.rows.length - 1); L++) for (const k of BT.h) if (BT.rows[L][k] !== CT.rows[L]?.[k]) cells.push(`L${L} ${k} ${BT.rows[L][k]} -> ${CT.rows[L]?.[k] ?? '(missing)'}`);
const added = CT.h.filter(k => !BT.h.includes(k)), removed = BT.h.filter(k => !CT.h.includes(k));
const l011 = cells.filter(c => +c.slice(1, c.indexOf(' ')) <= 11);
out.l0_30 = { vs: `${basePath} ${mainSha}`, columnsCompared: BT.h.length, verdict: cells.length ? 'FAIL' : 'PASS', l0_11: l011.length ? 'FAIL' : 'PASS', cellDiffs: cells, addedColumns: added, removedColumns: removed };
say(`L0-30 byte check vs baseline (${BT.h.length} baseline columns, raw cells): ${out.l0_30.verdict} (${cells.length} cell diffs; L0-11 ${out.l0_30.l0_11})${cells.slice(0, 6).map(c => '\n  ' + c).join('')}${added.length ? `\n  extra columns not in baseline (${added.length}): ${added.join(', ')}` : ''}${removed.length ? `\n  baseline columns missing (${removed.length}): ${removed.join(', ')}` : ''}`);
// L30-row byte check vs baseline (raw CSV text cells, shared columns): FAIL if any L30 cell differs
{ const cellsOf = (txt: string) => { const ls = txt.trim().split(/\r?\n/), h = ls[0].split(','), r = ls.find(l => l.split(',')[h.indexOf('level')] === '30'); return r ? Object.fromEntries(r.split(',').map((v, k) => [h[k], v])) : null; };
  const a = cellsOf(mainTxt), c = cellsOf(raw.toString('utf8')), d = a && c ? Object.keys(a).filter(k => a[k] !== c[k]).map(k => `${k} ${a[k]} -> ${c[k] ?? '(missing)'}`) : ['L30 row missing'];
  out.l30Row = { verdict: d.length ? 'FAIL' : 'PASS', vs: `${basePath} ${mainSha}`, diffs: d };
  say(`L30 row byte check vs baseline: ${out.l30Row.verdict}${d.length ? ` (${d.length} cells: ${d.slice(0, 6).join('; ')})` : ' (every cell identical)'}`); }
// build
let b: Balance;
try { b = validateBalance(buildBalance(rows, JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8')), cfg) as Balance, false); }
catch (e) { out.build = { ok: false, error: (e as Error).message }; say(`BUILD FAILS (sync-economy/validateBalance): ${(e as Error).message}\n  -> this code cannot build the CSV; see engineering/l30plus-harness.md (needs the #45 L30+ code)`); finish(1); }
const tm = (t: 'hens' | 'eggValue') => (b! as any).m4 ? (b! as any).m4[t].costs.length - 1 : null;
out.build = { ok: true, farmMax: b!.maxLevel, hensMax: tm('hens'), eggValueMax: tm('eggValue'), coopTable: !!(b!.farm as any).coopCapacityTable, m4Enabled: (b! as any).m4?.enabled, collectionCostTable: !!(b!.collection as any).costTable };
say(`build OK: Farm max ${b!.maxLevel}, Hens max ${tm('hens')}, Egg value max ${tm('eggValue')}, coop table ${out.build.coopTable}, m4.enabled ${out.build.m4Enabled}`);
const tr: string[] = []; for (let L = 0; L <= 11; L++) { const a = tableRow(L, repoBalance) as any, c = tableRow(L, b!) as any; for (const k of Object.keys(a)) if (a[k] !== c[k]) tr.push(`L${L} ${k}`); }
for (const t of ['hens', 'eggValue'] as const) for (let L = 0; L <= 11; L++) if ((repoBalance as any).m4?.[t].costs[L] !== (b! as any).m4?.[t].costs[L]) tr.push(`m4.${t} L${L}`);
out.l0_11_balance = { diffs: tr }; say(`L0-11 balance (tableRow + m4 costs) vs repo balance.json: ${tr.length ? `${tr.length} diffs: ${tr.slice(0, 6).join(', ')}` : 'identical'}`);
// runs (committed bots, defaults)
const S = Array.from({ length: s1 - s0 + 1 }, (_, i) => s0 + i), get = (r: Reach, L: number) => (r instanceof Map ? r.get(L) : (r as any)[L]) ?? Infinity;
const TR: TraceEvent[][] = [];
const W = S.map(s => { const tr: TraceEvent[] = []; TR.push(tr); return runM2(b!, s, { model: 'seller15', T, variance: VAR_DEFAULT, onBuy: e => tr.push(snap(e.i, e.t, e.kind, e.s)) }).reach as Reach; });
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
// play-equivalence: same code + same flag state on the baseline CSV; baseline traces cached by code SHA + baseline sha256 (+ flag, T, seeds)
const EQ_MODE = opt('--equiv-until', 'first-l30plus-buy');
if (EQ_MODE !== 'first-l30plus-buy' && EQ_MODE !== 'f31') { console.error('--equiv-until must be first-l30plus-buy or f31'); process.exit(2); }
let mb: Balance | null = null; const mainBal = () => mb ??= validateBalance(buildBalance(parseEconomyCsv(mainTxt), JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8')), cfg) as Balance, false);
const key = `${head.slice(0, 12)}${dirty ? '-dirty' : ''}-${mainSha.slice(0, 12)}-coll${flagOn ? 'on' : 'off'}-T${T}-s${s0}-${s1}`, cdir = opt('--baseline-dir', '/workspace/.cache/l30plus-baseline'), cf = `${cdir}/${key}.json`;
const useCache = !args.includes('--no-baseline-cache') && !dirty;
let base: TraceEvent[][] | null = null, cached = false;
if (useCache && existsSync(cf)) { base = JSON.parse(readFileSync(cf, 'utf8')).traces; cached = true; }
if (!base) { base = S.map(s => { const tr: TraceEvent[] = []; runM2(mainBal(), s, { model: 'seller15', T, variance: VAR_DEFAULT, onBuy: e => tr.push(snap(e.i, e.t, e.kind, e.s)) }); return tr; });
  if (useCache) { mkdirSync(cdir, { recursive: true }); writeFileSync(cf, JSON.stringify({ key, code: head, baselineCsv: basePath, baselineCsvSha256: mainSha, collectionCostFromCsv: flagOn, T, seeds: [s0, s1], traces: base })); } }
const baseInfo = { key, cached, file: useCache ? cf : null, dirtyNoCache: dirty };
say(`play-equivalence baseline: ${basePath} sha256 ${mainSha.slice(0, 12)}, same code + collectionCostFromCsv ${flagOn ? 'on' : 'off'}; traces ${cached ? 'from cache' : 'computed'} (${key})`);
// mode f31 (info unless --equiv-until f31): hash of the trace up to the first F31 tick must match
const rsA = S.map((s, k) => compareSeed(s, TR[k], base![k], 31)), eqA = summarize(rsA);
// mode first-l30plus-buy (D-CEO-16 option b, DEFAULT/gating): first differing event must be an L30+ purchase on the candidate side
const rsB = S.map((s, k) => compareSeedB(s, TR[k], base![k], 31)), eqB = summarizeB(rsB);
const gatingA = EQ_MODE === 'f31', tag = (g: boolean) => g ? 'GATING (default)' : 'info only';
out.playEquivalenceModes = {
  gating: EQ_MODE,
  f31: { ...eqA, gating: gatingA, upTo: 'first tick at Farm L31 (exclusive); hash of every event must match', perSeed: rsA.map(r => ({ seed: r.seed, until: r.until, events: r.events, hash: r.hash.slice(0, 16), match: r.match, firstDiff: r.firstDiff ?? null })) },
  firstL30plusBuy: { ...eqB, gating: !gatingA, rule: 'traces compared event by event up to the first F31 tick (exclusive); identical = PASS; else the first differing event must be, on the candidate side, a purchase whose target level is > 30 on Farm/Collection/Hens/Egg value, no later than the baseline event at that position; anything else = FAIL', perSeed: rsB },
  baseline: baseInfo,
};
out.playEquivalence = gatingA ? out.playEquivalenceModes.f31 : out.playEquivalenceModes.firstL30plusBuy;
const ffA = eqA.firstFail;
say(`play-equivalence [f31, ${tag(gatingA)}]: ${eqA.verdict} | ${eqA.seeds - eqA.mismatches}/${eqA.seeds} seeds hash-identical to the first F31 tick${ffA ? ` | first FAIL seed ${ffA.seed} tick ${ffA.firstDiff!.tick} event #${ffA.firstDiff!.index}\n  cand ${ffA.firstDiff!.cand}\n  base ${ffA.firstDiff!.main}` : ''}`);
const fl = rsB.map(r => r.firstL30).filter(Boolean) as NonNullable<SeedCompareB['firstL30']>[];
const flTrack: Record<string, number> = {}; for (const x of fl) flTrack[`${x.track} L${x.level}`] = (flTrack[`${x.track} L${x.level}`] ?? 0) + 1;
const flT = distribution(fl.map(x => Math.round(x.t)));
const dv = rsB.filter(r => r.divergence), dvF = distribution(dv.map(r => r.divergence!.farm)), dvT = distribution(dv.map(r => Math.round(r.divergence!.tick / b!.tickHz)));
out.playEquivalenceModes.firstL30plusBuy.firstL30PlusBuyDistribution = { seedsWithOne: fl.length, byTrackLevel: flTrack, time_s: { min: flT.min, p50: flT.p50, max: flT.max } };
out.playEquivalenceModes.firstL30plusBuy.divergence = { seedsDiverged: dv.length, seedsIdenticalThroughF31: eqB.identical, farmLevel: dvF, time_s: { min: dvT.min, p50: dvT.p50, max: dvT.max } };
const ffB = eqB.firstFail;
say(`play-equivalence [first-l30plus-buy, D-CEO-16 option (b), ${tag(!gatingA)}]: ${eqB.verdict} | ${eqB.seeds - eqB.failing}/${eqB.seeds} seeds pass (${eqB.identical} identical through F31, ${eqB.divergedByL30PlusBuy} diverge at an L30+ purchase, ${eqB.failing} diverge at something else)${ffB ? `\n  first FAIL seed ${ffB.seed} tick ${ffB.divergence!.tick} (F${ffB.divergence!.farm}) event #${ffB.divergence!.index}\n  cand ${ffB.divergence!.cand}\n  base ${ffB.divergence!.main}` : ''}`);
say(`  first L30+ purchase per seed: ${fl.length}/${S.length} seeds; time min/P50/max ${flT.min}/${flT.p50}/${flT.max} s; by track/level ${Object.entries(flTrack).sort((a, c) => c[1] - a[1]).map(([k, n]) => `${k} x${n}`).join(', ')}; first seeds ${rsB.slice(0, 5).map(r => `s${r.seed} ${r.firstL30 ? `tick ${r.firstL30.tick} ${r.firstL30.track} L${r.firstL30.level}` : 'none'}`).join(' | ')}`);
say(`  divergence: ${dv.length} seeds; Farm level at divergence min/P50/max ${dvF.min}/${dvF.p50}/${dvF.max}; histogram ${Object.entries(dvF.hist).map(([k, n]) => `F${k}:${n}`).join(' ')}; first seeds ${dv.slice(0, 5).map(r => `s${r.seed} tick ${r.divergence!.tick} F${r.divergence!.farm} cand ${r.divergence!.cand?.split('|').slice(2, 4).join(' ') ?? '-'} vs base ${r.divergence!.main?.split('|').slice(2, 4).join(' ') ?? '-'}`).join(' | ')}`);
// Collection first buy (row C = collection level before the buy) and D-CEO-15 per-row verdicts under each mode
const fb = firstBuys(TR, [22, 23, 24, 25, 26, 27, 28], 31).map(r => ({ ...r, earliestSeed: r.earliestSeedIdx >= 0 ? S[r.earliestSeedIdx] : null }));
out.collectionFirstBuy = fb.map(({ earliestSeedIdx, ...r }) => r);
say(`Collection first buy (rows 22-28; earliest Farm level across seeds, seeds buying before F31): ${fb.map(r => `C${r.row} ${r.earliestFarm == null ? 'never' : `F${r.earliestFarm} (seed ${r.earliestSeed})`} ${r.seedsBuyingBeforeF31}/${r.seeds}`).join(' | ')}`);
const conv = 'row convention: 0-based, row C = collectionCost(C) = price of C -> C+1';
out.dceo15 = { gate: 'rows 22-27 (buys to L23-L28)', rowConvention: '0-based: row C = economy.csv level C = collection.costTable[C] = collectionCost(C) = price of C -> C+1', gatingMode: EQ_MODE,
  byMode: { 'first-l30plus-buy': { playEquivalence: eqB.verdict, gating: !gatingA, rows: dceo15Verdicts(eqB.verdict, fb) }, f31: { playEquivalence: eqA.verdict, gating: gatingA, rows: dceo15Verdicts(eqA.verdict, fb) } } };
out.dceo15.rows = out.dceo15.byMode[EQ_MODE].rows;
for (const m of ['first-l30plus-buy', 'f31'] as const) { const x = out.dceo15.byMode[m];
  say(`D-CEO-15 rows 22-27 (buys to L23-L28) [${m}, ${tag(x.gating)}] | ${conv}\n${x.rows.map((r: any) => `  row ${r.row} (buy to L${r.buysToLevel}): ${r.verdict}${r.eligible ? '' : ' [not eligible: info only]'} - ${r.reason}`).join('\n')}`); }
// step gate (G1/G2) and top-step share (G3) over F28+ (HoQA, gates.md v1.2); the committed L30+ range is printed for reference
const t = loadTargets(), FROM = 28;
const stepOver = (from: number) => { const per = S.map((s, i) => [s, maxStepRatio(W[i], from, t.step_ratio_min_prev_s)] as const).filter(x => x[1] != null) as [number, number][];
  if (!per.length) return null; const v = per.map(x => x[1]), ws = per.reduce((a, x) => (x[1] > a[1] ? x : a)); return { from, counted: per.length, p95: q(v, .95), worst: ws[1], worstSeed: ws[0], top5Seeds: [...per].sort((a, c) => c[1] - a[1]).slice(0, 5) }; };
const st = stepOver(FROM), stRef = stepOver(t.step_ratio_from_level);
if (!st) { out.stepGate = { verdict: 'NOT EVALUATED', reason: `no counted F${FROM}+ steps (Farm max ${b!.maxLevel})` }; say(`step gate ${GATE.id}: NOT EVALUATED (${out.stepGate.reason})`); finish(1); }
const top = (r: Reach) => { let best = -1, lv = -1; for (let n = FROM; n < b!.maxLevel; n++) { const a = timeOn(r, n), p = timeOn(r, n - 1); if (Number.isFinite(a) && Number.isFinite(p) && p >= t.step_ratio_min_prev_s && a / p > best) { best = a / p; lv = n; } } return lv; };
const cnt: Record<number, number> = {}; for (const r of W) { const n = top(r); if (n >= 0) cnt[n] = (cnt[n] ?? 0) + 1; }
const shares = Object.entries(cnt).map(([n, c]) => ({ level: +n, share: +(c / st!.counted).toFixed(4) })).sort((a, c) => c.share - a.share);
const pass = { p95: st!.p95 <= GATE.p95Max, worst: st!.worst <= GATE.worstMax, topShare: shares[0].share <= GATE.topStepShareMax };
out.stepGate = { range: `F${FROM}-F${b!.maxLevel - 1} (step(n) = time on n / time on n-1, n >= ${FROM}, prev >= ${t.step_ratio_min_prev_s}s)`, verdict: pass.p95 && pass.worst ? 'PASS' : 'FAIL', ...st, pass, topStepShare: shares, topStepRuleVerdict: pass.topShare ? 'PASS' : 'FAIL', committedRange: stRef };
say(`step gate ${GATE.id} over ${out.stepGate.range} (P95 <= ${GATE.p95Max}, worst <= ${GATE.worstMax}): ${out.stepGate.verdict} | P95 ${st!.p95.toFixed(3)} | worst ${st!.worst.toFixed(3)} (seed ${st!.worstSeed}) | ${st!.counted} seeds${stRef ? ` | ref committed range F${t.step_ratio_from_level}+: P95 ${stRef.p95.toFixed(3)} worst ${stRef.worst.toFixed(3)} (seed ${stRef.worstSeed})` : ''}`);
say(`top-step share per level over F${FROM}+ (rule <= ${100 * GATE.topStepShareMax}%): ${out.stepGate.topStepRuleVerdict} | ${shares.slice(0, 6).map(x => `F${x.level} ${(100 * x.share).toFixed(1)}%`).join(', ')}`);
// G4: dead zones over F28+ and the longest no-purchase stretch (conservative: gap between consecutive bot purchases) from reaching F28 to reaching Farm max
const dead28 = levels.filter(e => e.level >= FROM && e.seeds && e.p95_s > GATE.deadZoneS).map(e => `F${e.level}`);
const gaps = S.map((s, k) => [s, longestGap(TR[k], get(W[k], FROM), get(W[k], b!.maxLevel))] as const).filter(x => x[1] != null && Number.isFinite(x[1])) as [number, number][];
const gw = gaps.length ? gaps.reduce((a, x) => (x[1] > a[1] ? x : a)) : null, gp95 = gaps.length ? q(gaps.map(x => x[1]), .95) : null;
out.g4 = { range: `F${FROM} reached -> F${b!.maxLevel} reached`, definition: 'longest gap between consecutive bot purchases (conservative upper bound of a no-affordable-purchase stretch: the bot also waits while its pick is unaffordable)', worst_s: gw?.[1] ?? null, worstSeed: gw?.[0] ?? null, p95_s: gp95, seeds: gaps.length, deadZonesF28plus: dead28, verdict: gw && gw[1] <= GATE.deadZoneS ? 'PASS' : 'FAIL' };
say(`G4 no-purchase stretch ${out.g4.range} (conservative, purchase-to-purchase): worst ${gw?.[1]?.toFixed(1)} s (seed ${gw?.[0]}) | P95 ${gp95?.toFixed(1)} s | ${out.g4.verdict} vs ${GATE.deadZoneS}s; dead zones F${FROM}+ (P95 time on level > ${GATE.deadZoneS}s): ${dead28.length ? dead28.join(' ') : 'none'}`);
// G6 acw1 casual (tests/pacing-acw1.test.ts model): F10 within 960 s >= 95% on 1-200 and 201-299; median F18 <= 40 min
const casual: Balance = { ...b!, sim_test: { poisson_arrivals: true, demand_scale: 0.75 } } as Balance;
const acw = (a: number, z: number) => { const R = Array.from({ length: z - a + 1 }, (_, i) => runM2(casual, a + i, { model: 'seller15', sellEvery: 20 }));
  const t10 = R.map(r => r.reach.get(10) ?? Infinity), t18 = R.map(r => r.reach.get(18) ?? Infinity).sort((x, y) => x - y);
  return { seeds: `${a}-${z}`, pctF10in960: +(100 * t10.filter(x => x <= 960).length / R.length).toFixed(2), medianF18_min: +(t18[Math.floor((t18.length - 1) / 2)] / 60).toFixed(2) }; };
const g6 = args.includes('--no-acw1') ? null : [acw(1, 200), acw(201, 299)];
out.g6 = g6 ? { runs: g6, verdict: g6.every(r => r.pctF10in960 >= 95 && r.medianF18_min <= 40) ? 'PASS' : 'FAIL' } : { verdict: 'NOT RUN (--no-acw1)' };
say(`G6 acw1 casual: ${g6 ? g6.map(r => `seeds ${r.seeds} F10<=960s ${r.pctF10in960}% median F18 ${r.medianF18_min} min`).join(' | ') : 'not run'} -> ${out.g6.verdict}`);
// G9 strictly rising costs on every level track; G10 columns the code doesn't read (perturbation of each column, not grep)
const rising: string[] = []; const chk = (name: string, xs: number[]) => { for (let k = 1; k < xs.length; k++) if (!(xs[k] > xs[k - 1])) { rising.push(`${name} L${k - 1}->L${k} ${xs[k - 1]} -> ${xs[k]}`); break; } };
chk('farm', Array.from({ length: b!.maxLevel }, (_, L) => farmCost(L, b!))); chk('collection', Array.from({ length: b!.maxLevel }, (_, L) => collectionCost(L, b!)));
for (const tk of ['hens', 'eggValue'] as const) if ((b! as any).m4) chk(tk, (b! as any).m4[tk].costs);
out.g9 = { verdict: rising.length ? 'FAIL' : 'PASS', violations: rising };
const prevJ = JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8')), ref = JSON.stringify(buildBalance(rows, prevJ, cfg));
const unread = Object.keys(rows[0]).filter(c => c !== 'level').filter(c => { const pr = rows.map(r => ({ ...r, [c]: Number.isInteger(r[c]) ? r[c] * 3 + 7 : r[c] * 1.37 + 0.01 })); try { return JSON.stringify(buildBalance(pr, prevJ, cfg)) === ref; } catch { return false; } });
const unreadNew = unread.filter(c => !BT.h.includes(c));
out.g10 = { verdict: unread.length ? 'FAIL' : 'PASS', unread, unreadNotInBaseline: unreadNew, unreadAlsoInBaseline: unread.filter(c => BT.h.includes(c)), method: 'each column perturbed on every row; unread = buildBalance output unchanged and no throw' };
say(`G9 costs strictly rising (farm, collection, hens, eggValue): ${out.g9.verdict}${rising.length ? ' ' + rising.join('; ') : ''}`);
say(`G10 unread CSV columns (perturbation): ${out.g10.verdict} | ${unread.length} unread${unread.length ? `: ${unread.join(', ')}` : ''}${unreadNew.length ? ` | not in baseline: ${unreadNew.join(', ')}` : ''}`);
// gates.md v1.2 card
const v = (x: boolean) => (x ? 'PASS' : 'FAIL');
const g7 = out.l0_30.verdict === 'PASS' && out.l30Row.verdict === 'PASS' && out.playEquivalence.verdict === 'PASS';
const card = [
  ['G1', `step P95 F${FROM}+`, st!.p95.toFixed(3), v(pass.p95)], ['G2', `step worst F${FROM}+`, `${st!.worst.toFixed(3)} (seed ${st!.worstSeed})`, v(pass.worst)],
  ['G3', `top-step share F${FROM}+`, shares.slice(0, 3).map(x => `F${x.level} ${(100 * x.share).toFixed(1)}%`).join(', '), v(pass.topShare)],
  ['G4', `no-purchase stretch F${FROM}+ (worst/P95)`, `${gw?.[1]?.toFixed(0)}/${gp95?.toFixed(0)} s; dead zones ${dead28.length}`, out.g4.verdict],
  ['G5', 'workers L10 P95', `${q(lw, .95).toFixed(2)} min (margin ${out.l10.workers.margin})`, v(q(lw, .95) <= GATE.l10P95Max)],
  ['G6', 'acw1', g6 ? g6.map(r => `${r.pctF10in960}%/${r.medianF18_min}m`).join(' ; ') : 'not run', out.g6.verdict],
  ['G7', `L0-30 bytes + L30 row + equivalence [${EQ_MODE}]; rows`, `${out.l0_30.verdict}/${out.l30Row.verdict}/${out.playEquivalence.verdict}; ${out.dceo15.rows.filter((r: any) => r.eligible).map((r: any) => `C${r.row} ${r.verdict}`).join(' ')}`, v(g7)],
  ['G8', 'sync (in-memory build + validateBalance) + strict', `sync OK; strict n/a (owner Economy/CI: check-economy-copy --strict at landing)`, 'PASS (sync only)'],
  ['G9', 'costs strictly rising', rising.length ? `${rising.length} violations` : 'yes', out.g9.verdict],
  ['G10', 'unread CSV columns', `${unread.length}`, out.g10.verdict],
];
out.gatesCard = card.map(([id, what, value, verdict]) => ({ id, what, value, verdict }));
say(`gates.md v1.2 card | candidate ${csvPath} | harness ${out.harness.path}@blob ${out.harness.blob.slice(0, 12)} | code ${head} | csv ${sha} | baseline ${mainSha}\n${card.map(r => `  ${r[0]} ${r[1]}: ${r[2]} -> ${r[3]}`).join('\n')}\n  top 3 step levels: ${shares.slice(0, 3).map(x => `F${x.level} ${(100 * x.share).toFixed(1)}%`).join(', ')}`);
finish(0);
