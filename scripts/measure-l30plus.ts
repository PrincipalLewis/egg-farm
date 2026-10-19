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
import { snap, compareSeed, summarize, firstBuys, dceo15Verdicts, type TraceEvent } from './l30plus-trace';
import { existsSync } from 'node:fs';
import { validateBalance, balance as repoBalance, type Balance } from '../src/config/balance';
import { tableRow } from '../src/config/formulas';
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
say(`L30+ harness ${out.harness.path} blob ${out.harness.blob.slice(0, 12)}${out.harness.blob === out.harness.committedBlob ? '' : ' (NOT the committed blob)'} | code ${head.slice(0, 12)}${dirty ? ' DIRTY' : ''}`);
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
// play-equivalence: same code + same flag state on main's CSV; baseline cached by code SHA + main CSV sha256 (+ flag, T, seeds)
{ let mb: Balance | null = null; const mainBal = () => mb ??= validateBalance(buildBalance(parseEconomyCsv(mainTxt), JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8')), cfg) as Balance, false);
  const key = `${head.slice(0, 12)}${dirty ? '-dirty' : ''}-${mainSha.slice(0, 12)}-coll${flagOn ? 'on' : 'off'}-T${T}-s${s0}-${s1}`, dir = opt('--baseline-dir', '/workspace/.cache/l30plus-baseline'), f = `${dir}/${key}.json`;
  const useCache = !args.includes('--no-baseline-cache') && !dirty;
  let base: TraceEvent[][] | null = null, cached = false;
  if (useCache && existsSync(f)) { base = JSON.parse(readFileSync(f, 'utf8')).traces; cached = true; }
  if (!base) { base = S.map(s => { const tr: TraceEvent[] = []; runM2(mainBal(), s, { model: 'seller15', T, variance: VAR_DEFAULT, onBuy: e => tr.push(snap(e.i, e.t, e.kind, e.s)) }); return tr; });
    if (useCache) { mkdirSync(dir, { recursive: true }); writeFileSync(f, JSON.stringify({ key, code: head, baselineCsv: basePath, baselineCsvSha256: mainSha, collectionCostFromCsv: flagOn, T, seeds: [s0, s1], traces: base })); } }
  const rs = S.map((s, k) => compareSeed(s, TR[k], base![k], 31)), eq = summarize(rs);
  out.playEquivalence = { ...eq, upTo: 'first tick at Farm L31 (exclusive)', baseline: { key, cached, file: useCache ? f : null, dirtyNoCache: dirty }, seedsNeverF31: rs.filter(r => r.until < 0).length, perSeed: rs.map(r => ({ seed: r.seed, until: r.until, events: r.events, hash: r.hash.slice(0, 16), match: r.match })) };
  const ff = eq.firstFail;
  say(`play-equivalence vs baseline csv ${mainSha.slice(0, 12)} (trace to first F31 tick, same code + collectionCostFromCsv ${flagOn ? 'on' : 'off'}; baseline ${cached ? 'cached' : 'computed'} ${key}): ${eq.verdict} | ${eq.seeds - eq.mismatches}/${eq.seeds} seeds match${ff ? ` | first FAIL seed ${ff.seed} tick ${ff.firstDiff!.tick} event #${ff.firstDiff!.index}\n  cand ${ff.firstDiff!.cand}\n  main ${ff.firstDiff!.main}` : ''}`);
  // first-buy report, Collection rows 22-27 (row = collection level before the buy)
  const fb = firstBuys(TR, [22, 23, 24, 25, 26, 27], 31).map(r => ({ ...r, earliestSeed: r.earliestSeedIdx >= 0 ? S[r.earliestSeedIdx] : null, earliestSeedIdx: undefined }));
  out.collectionFirstBuy = fb;
  // D-CEO-15 (HoE 09:36): row C = 0-based costTable/economy.csv row = collectionCost(C) = price of C -> C+1 (actions.ts buy()).
  // Gate rows 22-27 (buys to L23-L28): PASS (may be eased) only if play-equivalence PASSes for every seed AND no seed buys the row
  // before F31; else FROZEN. Row 28 is printed for information and is always FROZEN (not eligible under D-CEO-15).
  const fb28 = firstBuys(TR, [22, 23, 24, 25, 26, 27, 28], 31);
  const dceo = dceo15Verdicts(eq.verdict, fb28);
  out.dceo15 = { gate: 'rows 22-27 (buys to L23-L28)', rowConvention: '0-based: row C = economy.csv level C = collection.costTable[C] = collectionCost(C) = price of C -> C+1', playEquivalence: eq.verdict, rows: dceo };
  say(`D-CEO-15 gate rows 22-27 (buys to L23-L28) | row convention: 0-based, row C = collectionCost(C) = price of C -> C+1\n${dceo.map(r => `  row ${r.row} (buy to L${r.buysToLevel}): ${r.verdict}${r.eligible ? '' : ' [not eligible: info only]'} - ${r.reason}`).join('\n')}`);
  say(`Collection first buy (rows 22-27; earliest Farm level across seeds, seeds buying before F31): ${fb.map(r => `C${r.row} ${r.earliestFarm == null ? 'never' : `F${r.earliestFarm} (seed ${r.earliestSeed})`} ${r.seedsBuyingBeforeF31}/${r.seeds}`).join(' | ')}`); }
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
