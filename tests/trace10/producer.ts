// trace10 producer library (design §2-§8): one side x one profile -> S1-S4 + manifest + EC-1 gaps, in memory.
// The CLI scripts/trace10.ts is a thin wrapper. Same code is used by the slow self-tests and the observer proof.
// Never calls step/apply (run() does); never mutates the balance; reads no env (the CLI passes documented env only).
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { Balance } from '../../src/config/balance';
import { validateBalance } from '../../src/config/balance';
import { M5_FLAGS, flagOn } from '../../src/config/flags';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../../scripts/sync-economy';
import { run, PROFS, M5X_STACKS } from '../bot-m5';
import { TraceWriter, TraceInvalid } from './writer';
import { SeedObserver } from './observer';
import { gapRow, EC1_SCHEMA, type GapRow } from './gaps';
import { canon, sha256 } from './encode';
import { CONTRACT_SHA256, type Manifest, type Profile } from './manifest';
import { expectedCardSha1 } from './pins';
import type { SideData } from './compare';

export const ROOT = new URL('../../', import.meta.url).pathname;
/** §0 harness table (paths hashed from disk at run time, never hard-coded hashes). */
export const HARNESS_FILES = ['tests/bot-m5.ts', 'tests/bot-m4.ts', 'tests/seller-variance.ts', 'tests/py-random.ts', 'tests/pacing-guards.ts', 'tests/bot-m5.test.ts',
  'src/sim/tick.ts', 'src/sim/actions.ts', 'src/sim/state.ts', 'src/sim/rng.ts', 'src/sim/workers.ts', 'src/sim/events.ts', 'src/sim/tracks.ts', 'src/sim/m5-state.ts',
  'src/ui/next-goal.ts', 'src/econ/best-buy.ts', 'src/config/balance.ts', 'src/config/balance.json', 'scripts/sync-economy.ts', 'scripts/sync-economy-cli.ts',
  'data/economy-config.json', 'package-lock.json', 'package.json'];
export const T_RECORD = 4000;
const fileSha = (rel: string) => sha256(readFileSync(join(ROOT, rel)));
const sha1 = (b: Buffer) => createHash('sha1').update(b).digest('hex');
export function producerFiles(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const n of readdirSync(join(ROOT, 'tests/trace10')).filter(n => n.endsWith('.ts')).sort()) o['tests/trace10/' + n] = fileSha('tests/trace10/' + n);
  for (const n of readdirSync(join(ROOT, 'scripts')).filter(n => /^trace10.*\.ts$/.test(n)).sort()) o['scripts/' + n] = fileSha('scripts/' + n);
  return o;
}
const git = (...a: string[]) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
export function gitState(): { commit: string; dirty: boolean } {
  return { commit: git('rev-parse', 'HEAD'), dirty: git('status', '--porcelain', '--untracked-files=no').length > 0 };
}
/** "after" balances are built in memory exactly like the scratch harness pl.ts L11 (design §2.1). */
export function balanceFromCsv(csvText: string): Balance {
  return validateBalance(buildBalance(parseEconomyCsv(csvText), JSON.parse(readFileSync(join(ROOT, 'src/config/balance.json'), 'utf8')), readEconomyConfig() as any) as Balance, false);
}
export const UNITS = {
  'S1.i': { unit: 'tick (dt = 1/tickHz = 0.1 s)', precision: 'integer', source: 'bot-m5.ts L83, L136; balance.json tickHz' },
  'S1.t': { unit: 's (sim)', precision: 'Math.round(i*dt*10)/10 as the harness computes it; producer adds no rounding', source: 'bot-m5.ts L137' },
  'S2.sell': { unit: 'k,N eggs; price cents/egg; value cents', precision: 'engine', source: 'actions.ts L31-32' },
  'S2.collect': { unit: 'eggs', precision: 'engine', source: 'actions.ts L76' },
  'S2.worker_collect': { unit: 'eggs', precision: 'Math.floor by engine', source: 'tick.ts L96' },
  'S2.worker_yawn.energy_pct': { unit: '%', precision: '0.1 by engine', source: 'tick.ts L27' },
  'S2.wage': { unit: 'cents', precision: 'engine', source: 'tick.ts L93' },
  'S2.buy': { unit: 'rowPaid level; costCents/coins cents', precision: 'engine cost expressions; coinsAfter === coinsBefore - costCents asserted', source: 'actions.ts L42, L50, hire, grader; bot-m5.ts L229' },
  'S2.manage': { unit: 'energy %', precision: 'engine', source: 'bot-m5.ts L225' },
  'S3': { unit: 'fields 0-18 per design §6.2 (coins cents, levels int, eggs, s, workers [energy %, cdS s, ...], rng uint32, sfull sha256)', precision: 'Number::toString exact', source: 'state.ts, workers.ts L14' },
  'S4.engine': { unit: 'xorshift32 cursor uint32 + draws', precision: 'exact replay of nextRand', source: 'state.ts L63' },
  'S4.variance': { unit: 'PyRandom mti + sha256(mt)', precision: 'exact', source: 'py-random.ts L6, seller-variance.ts L17-31' },
  'S4.runner': { unit: 'draw count n, value u in [0,1)', precision: 'exact', source: 'bot-m5.ts L37 via onRunnerDraw' },
};
export interface ProduceOpts { side: 'before' | 'after'; csvPath: string; csvText: string; seeds: number[]; profile: Profile; T?: number;
  cardPath: string; cardSha1?: string | null; synthetic?: boolean; selftestId?: string | null; cmd?: string; argv?: string[]; env?: Record<string, string>;
  /** test seam: skip git (in-process tests on a dirty dev tree) - forces synthetic */ gitOverride?: { commit: string; dirty: boolean } }
export interface Produced { data: SideData | null; gaps: string; invalid: string[]; buys: Record<number, [number, string, number][]>; perSeed: Manifest['per_seed'] }

export function produceProfile(o: ProduceOpts): Produced {
  const invalid: string[] = [], T = o.T ?? T_RECORD, K = M5X_STACKS.none, P = PROFS[o.profile];
  const bal = balanceFromCsv(o.csvText);
  if (K.on !== false || K.rc2 !== undefined) invalid.push('CFG none expected (K.on false, no rc2)');
  const flagsOn = M5_FLAGS.filter(f => flagOn(bal, f)); if (flagsOn.length) invalid.push(`src flags on: ${flagsOn.join(',')}`);
  if (bal.tickHz !== 10) invalid.push(`tickHz ${bal.tickHz} != 10`);
  if (!/^v20\./.test(process.version)) invalid.push(`node ${process.version} is not v20 (evidence runtime)`);
  const card = readFileSync(o.cardPath), cardSha1 = sha1(card), want = expectedCardSha1(o.cardSha1);
  if (cardSha1 !== want) invalid.push(`card ${o.cardPath} sha1 ${cardSha1} != expected ${want} (not the version of record)`);
  const w = new TraceWriter(), buys: Produced['buys'] = {}, perSeed: Manifest['per_seed'] = [], rows: GapRow[] = [];
  const n = Math.round(T * bal.tickHz);
  if (!invalid.length) for (const seed of o.seeds) {
    const ob = new SeedObserver(w, seed, bal);
    const r = run(bal, seed, P, K, T, ob.hooks);
    const res = ob.finish(n); invalid.push(...res.invalid);
    const reach10 = r.reach.get(10) ?? null;
    if ((res.t10 ?? null) !== reach10) invalid.push(`seed ${seed}: observer t10 ${res.t10} != run().reach(10) ${reach10}`);
    const g = gapRow(seed, res.samples, r.reach, T); rows.push(g.row);
    if (g.maxGap !== r.longestNoAff) invalid.push(`seed ${seed}: EC-1 cross-check max gap ${g.maxGap} != longestNoAff ${r.longestNoAff}`);
    if (res.runnerDraws !== 0) invalid.push(`seed ${seed}: runner drew ${res.runnerDraws} under CFG none`);
    buys[seed] = res.buys;
    const sum = w.summaries[w.summaries.length - 1];
    perSeed.push({ seed, i10: sum.i10, t10: sum.t10, trace_sha256: sum.trace_sha256, records: sum.records,
      reach: Object.fromEntries([...r.reach].sort((a, b) => a[0] - b[0]).map(([L, t]) => [String(L), t])),
      rng_end: { engine_cursor: res.engineCursor, engine_draws: res.engineDrawsCum, runner_draws: res.runnerDraws, variance_calls: res.varianceCalls, v_mti: res.vEnd?.mti ?? null, v_mt_sha256: res.vEnd?.mtSha ?? null, final_rng: r.final.rng } });
  }
  invalid.push(...w.nonFinite);
  const gaps = JSON.stringify({ schema: EC1_SCHEMA, rows }) + '\n';
  if (invalid.length) return { data: null, gaps, invalid, buys, perSeed };
  const f = w.finish(), gi = o.gitOverride ?? gitState();
  const manifest: Manifest = {
    schema: 'trace10-manifest-v1',
    producer: { id: 'trace10-producer', version: '1', git_commit: gi.commit, ...(gi.dirty ? { tree_dirty: true as unknown as false } : { tree_dirty: false }), files: producerFiles() },
    side: o.side,
    run: { cmd: o.cmd ?? 'in-process', argv: o.argv ?? [], env: o.env ?? {}, seeds: o.seeds, profile: o.profile, T, tickHz: bal.tickHz, synthetic: !!(o.synthetic || o.gitOverride), selftest_id: o.selftestId ?? null },
    inputs: { csv_path: o.csvPath, csv_sha256: sha256(o.csvText), balance_base_sha256: fileSha('src/config/balance.json'), economy_config_sha256: fileSha('data/economy-config.json'),
      card_sha256: sha256(card), card_sha1: cardSha1, card_sha1_expected: want, card_of_record_match: cardSha1 === want, contract_sha256: CONTRACT_SHA256, balance_built_sha256: sha256(canon(bal)) },
    harness: { commit: gi.commit, files: Object.fromEntries(HARNESS_FILES.map(p => [p, fileSha(p)])) },
    runtime: { node: process.version, vite_node: JSON.parse(readFileSync(join(ROOT, 'node_modules/vite-node/package.json'), 'utf8')).version, vitest: JSON.parse(readFileSync(join(ROOT, 'node_modules/vitest/package.json'), 'utf8')).version, platform: `${process.platform}-${process.arch}` },
    cfg: { name: 'none', stack: K, runtime_streakCap: K.streakCap, runtime_streakCap_inert: true, runtime_streakCap_evidence: 'bot-m5.ts L115 (!K.on -> continue), L163, L188',
      ship_tc_streak_cap: (bal as any).m4?.tc?.streak_cap ?? null, src_flags_on: flagsOn },
    units: UNITS,
    streams: f.info,
    per_seed: perSeed,
    gaps_export: { file: 'gaps.json', sha256: sha256(gaps), schema: EC1_SCHEMA },
    produced_at: new Date().toISOString(),
  };
  return { data: { manifest, streams: { ...f.texts } }, gaps, invalid, buys, perSeed };
}
export { TraceInvalid };
