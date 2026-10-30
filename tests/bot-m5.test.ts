// tests/bot-m5.ts (port of Economy's m5.ts 29d423c5 / m5x.ts 196e8ed5): pinned to the ORIGINAL harness's output, observers
// are read-only, runs are deterministic. Full 200-seed parity evidence: artifacts/bot-m5-parity (studio folder).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../scripts/sync-economy';
import { validateBalance, balance, type Balance } from '../src/config/balance';
import { loadTargets } from './pacing-guards';
import { run, PROFS, M5X_STACKS, windowGate, gateOptsFromEnv } from './bot-m5';
import type { SimEvent } from '../src/sim/events';

// Built exactly as m5x.ts / scripts/bot-m5x.ts build it: an economy CSV over src/config/balance.json.
// The parity pin below was captured with data/economy.csv b48be8a4, so the test reads a byte-exact fixture copy of that CSV
// (tests/fixtures/economy-b48be8a4.csv, from 0808fa6:data/economy.csv), not the live file: farm_cost retunes must not break a
// port-equivalence check (D-HOE-20261030-03).
const PARITY_CSV_URL = new URL('./fixtures/economy-b48be8a4.csv', import.meta.url);
const PARITY_CSV_SHA256 = 'b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857';
const csvBalance = (csv: string): Balance => validateBalance(buildBalance(parseEconomyCsv(csv),
  JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8')), readEconomyConfig() as any) as Balance, false);

describe('bot-m5: parity with m5x.ts', () => {
  it('[F-1][AC5] windowGate equals the original harness (scratch/v2-econ/h m5x.ts, uses pinned CSV fixture sha256=b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857, SEEDS=2 T=3000 CFG=none,AssZ PROFS=casual)', () => {
    const g = gateOptsFromEnv({ SEEDS: '2', S0: '1', T: '3000', CFG: 'none,AssZ', PROFS: 'casual' }, loadTargets());
    const csv = readFileSync(PARITY_CSV_URL);
    expect(createHash('sha256').update(csv).digest('hex')).toBe(PARITY_CSV_SHA256); // fixture is still the b48be8a4 CSV
    const out = windowGate(csvBalance(csv.toString('utf8')), g), s = JSON.stringify(out);
    // Captured from the original m5x.ts run (stdout minus its csv/sha/seeds/T/STEP header keys); identical bytes from the port.
    expect(createHash('sha256').update(s).digest('hex')).toBe('41324ef47af46e79255f22b72d9e982f198eed45da26ff031f4c4d188abea985');
    expect(out['AssZ|casual'].win).toEqual({ P95_allWindows: 1.59, P95_ofSeedMax: 1.59, worstSeed: 1.59, median: 1.491 });
    expect(out['none|casual'].G4_noAff_F10_to_max).toEqual([85, 86, 86]);
  }, 120_000);
  it('gateOptsFromEnv keeps m5x.ts defaults', () => {
    const g = gateOptsFromEnv({}, loadTargets());
    expect(g).toMatchObject({ cfgs: ['AssZ'], profs: ['optimal', 'seller15', 'casual'], seeds: 200, s0: 1, T: 12000, step: 300, stepFrom: 30, noWin: false });
  });
  it('rejects an unknown stack or profile instead of running with undefined', () => {
    expect(() => windowGate(balance, { ...gateOptsFromEnv({ CFG: 'nope', PROFS: 'casual', SEEDS: '1' }, loadTargets()) })).toThrow(/CFG nope/);
    expect(() => windowGate(balance, { ...gateOptsFromEnv({ CFG: 'AssZ', PROFS: 'nope', SEEDS: '1' }, loadTargets()) })).toThrow(/profile nope/);
  });
});

describe('bot-m5: run()', () => {
  it('observers are read-only: same end state, reach and mechanics totals with and without them', () => {
    const a = run(balance, 3, PROFS.casual, M5X_STACKS.AssZ, 1500);
    const seen: SimEvent[] = []; const secs: number[] = [];
    const b = run(balance, 3, PROFS.casual, M5X_STACKS.AssZ, 1500, { onEvents: (_t, evs) => { seen.push(...evs); }, onSecond: t => { secs.push(t); } });
    expect(JSON.stringify(b.final)).toBe(JSON.stringify(a.final));
    expect([...b.reach]).toEqual([...a.reach]); expect(b.src).toEqual(a.src); expect(b.base).toBe(a.base);
    expect(seen.length).toBeGreaterThan(0);
    expect(secs).toEqual(Array.from({ length: 1500 }, (_, i) => i + 1)); // one call per whole second, ending at T
  }, 60_000);
  it('is deterministic per seed, and the stack changes the outcome', () => {
    const a = run(balance, 5, PROFS.casual, M5X_STACKS.AssZ, 1200), b = run(balance, 5, PROFS.casual, M5X_STACKS.AssZ, 1200);
    expect(JSON.stringify(b.final)).toBe(JSON.stringify(a.final));
    const off = run(balance, 5, PROFS.casual, M5X_STACKS.none, 1200);
    expect(off.mech).toBe(0); expect(a.mech).toBeGreaterThan(0);
  }, 60_000);
  it('does not mutate the balance it is given (sim_test.poisson_arrivals is set on a copy)', () => {
    const before = JSON.stringify(balance); run(balance, 1, PROFS.casual, M5X_STACKS.AssZ, 300);
    expect(JSON.stringify(balance)).toBe(before);
  });
});

// ---- bot-m5 B: m5p/m5px (M5.2) and m5l/m5lx (M5.1) port. Pins are the ORIGINAL harnesses' bytes on the b48be8a4 CSV with clock wage
// off (scratch/bot-m5b-harness/orig-noclock: h2/src, m5px.ts with only L8 __clockWage=false; m5lx.ts with CLOCK unset). Clock-wage-on parity
// (o1a, 200 seeds, artifacts/m51-o1a + m52-o1a) needs the h2 tick.ts diff (M5.1 src piece): artifacts/bot-m5b-parity (studio folder).
// D-HOE-20261030-05: these pins assert balance-derived values, so they read the committed fixture (PARITY_CSV_URL, sha256 asserted on
// every read), never the live data/economy.csv (a8c4e268 since #92). The base is src/config/balance.json, as for the #88 pin above.
import { pressureSeed, refillGate, M5PX_RC2 } from './bot-m5';
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const csvRaw = () => { const csv = readFileSync(PARITY_CSV_URL); expect(sha(csv)).toBe(PARITY_CSV_SHA256); return csv; };
const csvB = () => csvBalance(csvRaw().toString('utf8'));

describe('bot-m5 B: parity with m5px.ts / m5lx.ts (clock wage off)', () => {
  it('[REQ-d M5.2] pressureSeed rows equal m5px.ts jsonl bytes: casual, on/off, PERT 0/+1, seeds 1-2', () => {
    const b = csvB();
    const pins: Record<string, string> = { 'off.p0': '69695d09a1ce0e01f32a96a721763f0ca5c8d9f607959a37486adf5db34e3af2', 'off.p1': 'f3567fd4a46f1cc3eee910db7a2880a5b51ff09907913b1bbab8e4c47c5f6fe8',
      'on.p0': '91adb309939100681eaae33caf8ca0340d2ef6c419d2c9505238894dc076708f', 'on.p1': '53c8b991dc0f560e5619ab99d0bd1a4983e0309b86301fdaf4c2227ee24d6347' };
    for (const ck of ['off', 'on'] as const) for (const p of [0, 1]) {
      const lines = [1, 2].map(seed => JSON.stringify(pressureSeed(b, seed, 'casual', ck, p).row) + '\n').join('');
      expect(sha(lines), `${ck}.p${p}`).toBe(pins[`${ck}.p${p}`]);
    }
  }, 240_000);
  it('[REQ-d M5.1] refillGate equals m5lx.ts stdout: CFG=base,auto,off casual, SEEDS=2 T=3000 NOWIN=1 AT=30 RES=0 REST=0 MANAT=32', () => {
    const E = { SEEDS: '2', T: '3000', NOWIN: '1', AT: '30', RES: '0', REST: '0', MANAT: '32', CFG: 'base,auto,off', PROFS: 'casual' };
    const out = refillGate(csvB(), E, loadTargets(), { csv: 'economy.b48be8a4.csv', sha: sha(csvRaw()) });
    // m5lx.ts stdout bytes = console.log(JSON.stringify(out)), i.e. with the trailing newline
    expect(sha(JSON.stringify(out) + '\n')).toBe('541425dbe1050199c83aab61ba1004015c8f0f1f584ec2c0c594f584a67e73c3');
    expect(out['auto|casual'].refillsPer30m_F10).toEqual({ manual: 0, auto: 10.269 });
  }, 240_000);
  it('[REQ-d M5.1] charges stay in [0, cap], the auto arm never refills manually, and the M5.2 series is measurement-only', () => {
    const b = csvB(); const seen: number[] = [];
    const K = { ...M5X_STACKS.AssZ, hold: true, rc2: M5PX_RC2.on };
    run(b, 7, PROFS.casual, K, 3000, { onSecond: (_t, s) => { seen.push((s as any).__ch); } });
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0); expect(Math.max(...seen)).toBeLessThanOrEqual(2);
    const a = run(b, 7, PROFS.casual, K, 3000), z = run(b, 7, PROFS.casual, K, 3000, { series: { start: -1, st: [], ex: [], el: [], pertT: null }, pert: 0 });
    expect(JSON.stringify(z.final)).toBe(JSON.stringify(a.final)); expect(a.rm.refM).toBe(0); expect(a.rm.refA).toBeGreaterThan(0);
  }, 120_000);
});

describe('[Q4] bot-m5: onObserve (QA seam Q4) is observe-only', () => {
  it('[Q4][AC7] windowGate (m5x-casual: AssZ casual) keeps the pinned parity hash with a hook that mutates what it is given', () => {
    const g = gateOptsFromEnv({ SEEDS: '2', S0: '1', T: '3000', CFG: 'none,AssZ', PROFS: 'casual' }, loadTargets());
    const kinds = new Set<string>(); let calls = 0;
    const hook = (kind: 'action' | 'buyCheck', a: string, _t: number, s: any) => { calls++; kinds.add(kind + ':' + a.split(':')[0]); s.coinsCents = -1; s.farmLevel = 99; s.workers = {}; };
    const out = windowGate(csvB(), { ...g, onObserve: hook });
    expect(sha(JSON.stringify(out))).toBe('41324ef47af46e79255f22b72d9e982f198eed45da26ff031f4c4d188abea985'); // same pin as without the hook (above)
    expect(calls).toBeGreaterThan(1000);
    for (const k of ['action:collect', 'action:sellAll', 'action:buy', 'action:activate', 'buyCheck:buyCheck']) expect(kinds.has(k), k).toBe(true);
  }, 120_000);
  it('[Q4] M5.1/M5.2 rows are byte-identical with and without the hook, and the hook sees refills and a fresh clone per call', () => {
    const b = csvB(); const kinds = new Set<string>(); const states = new Set<object>();
    const hook = (_k: 'action' | 'buyCheck', a: string, _t: number, s: any) => { kinds.add(a.split(':')[0]); states.add(s); Object.freeze(s); };
    for (const ck of ['on', 'off'] as const) {
      const a = pressureSeed(b, 3, 'casual', ck, 1), h = pressureSeed(b, 3, 'casual', ck, 1, hook);
      expect(JSON.stringify(h)).toBe(JSON.stringify(a));
    }
    expect(kinds.has('refill')).toBe(true); expect(states.size).toBeGreaterThan(100);
  }, 240_000);
});

// ---- CCR nits on #78 (VER-1h, self-review): N-1 guard + env checks, N-2 seed bound, O-3 no double model.
import { gateOptsFromEnv as gOpts, checkEnv, BotUsageError, MAX_SEED, assertNoDoubleModel, M5PX_STACK } from './bot-m5';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT5 = fileURLToPath(new URL('..', import.meta.url));
describe('bot-m5: driver input (CCR N-1, N-2 on #78)', () => {
  it('[VER-1h N-1] unknown CFG/PROFS names, including inherited prototype keys, are rejected (own keys only)', () => {
    for (const bad of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      expect(() => windowGate(balance, gOpts({ CFG: bad, PROFS: 'casual', SEEDS: '1' }, loadTargets())), `CFG ${bad}`).toThrow(BotUsageError);
      expect(() => windowGate(balance, gOpts({ CFG: 'AssZ', PROFS: bad, SEEDS: '1' }, loadTargets())), `PROFS ${bad}`).toThrow(BotUsageError);
      expect(() => pressureSeed(balance, 1, bad, 'on', 0), `pressureSeed ${bad}`).toThrow(BotUsageError);
      expect(() => refillGate(balance, { CFG: bad, PROFS: 'casual', SEEDS: '1', T: '10', NOWIN: '1' }, loadTargets(), { csv: 'x', sha: 'x' }), `refillGate CFG ${bad}`).toThrow(BotUsageError);
    }
  });
  it('[VER-1h N-1][VER-1h N-2] SEEDS/S0/T/STEP must be valid numbers, and the last seed must keep the PyRandom seed safe (<= MAX_SEED)', () => {
    expect(MAX_SEED).toBe(9007172232);
    for (const E of [{ SEEDS: 'abc' }, { SEEDS: '0' }, { SEEDS: '1.5' }, { S0: '-1' }, { T: '-5' }, { T: '' }, { STEP: '0' }, { STEP: 'x' }, { S0: '9007172233', SEEDS: '1' }, { S0: '9007172232', SEEDS: '2' }])
      expect(() => checkEnv(E), JSON.stringify(E)).toThrow(BotUsageError);
    expect(() => checkEnv({ S0: '9007172232', SEEDS: '1' })).not.toThrow(); expect(() => checkEnv({})).not.toThrow();
    expect(() => run(balance, MAX_SEED, PROFS.casual, M5X_STACKS.AssZ, 1)).not.toThrow(); // the bound is exact
  });
  it('[VER-1h N-1][VER-1h N-2] the CLIs exit 2 on bad input before simulating (scripts/bot-m5x.ts, bot-m5px.ts, bot-m5lx.ts)', () => {
    const cli = (script: string, env: Record<string, string>) => spawnSync(process.execPath, [`${ROOT5}node_modules/vite-node/vite-node.mjs`, script], { cwd: ROOT5, encoding: 'utf8', env: { ...process.env, CSV: 'data/economy.csv', ...env } });
    for (const env of [{ CFG: '__proto__', PROFS: 'casual' }, { PROFS: 'toString' }, { SEEDS: 'abc' }, { T: '-5' }, { STEP: '0' }, { S0: '9007172233', SEEDS: '1' }] as Record<string, string>[]) {
      const r = cli('scripts/bot-m5x.ts', { SEEDS: '1', T: '10', NOWIN: '1', ...env }); expect(r.status, `bot-m5x ${JSON.stringify(env)}: ${r.stderr}`).toBe(2);
    }
    expect(cli('scripts/bot-m5px.ts', { OUT: '/nonexistent/x', PROFS: 'constructor' }).status).toBe(2);
    expect(cli('scripts/bot-m5lx.ts', { CFG: 'toString', SEEDS: '1' }).status).toBe(2);
    expect(cli('scripts/bot-m5lx.ts', { CLOCK: '1' }).status).toBe(2);
  }, 120_000);
});
describe('bot-m5: no double model (CCR O-3 on #78)', () => {
  const withSrc = (flags: Record<string, number>, enabled = 1) => ({ ...balance, m4: { ...(balance as any).m4, enabled, flags } }) as any;
  it('[O-3] the bot M5 model (on) and any src m4.flags M5 mechanic on at once throws; either alone runs', () => {
    for (const k of ['golden', 'streak', 'tapCoins', 'broody', 'abilities', 'pause'])
      expect(() => run(withSrc({ [k]: 1 }), 1, PROFS.casual, M5X_STACKS.AssZ, 1), k).toThrow(/double-count/);
    expect(() => run(withSrc({ golden: 1 }), 1, PROFS.casual, M5X_STACKS.none, 1)).not.toThrow(); // bot model off: src mechanics only
    expect(() => run(withSrc({ golden: 1 }, 0), 1, PROFS.casual, M5X_STACKS.AssZ, 1)).not.toThrow(); // src flags need m4.enabled
    expect(() => run(withSrc({ golden: 0 }), 1, PROFS.casual, M5X_STACKS.AssZ, 1)).not.toThrow();
  });
  it('[O-3] bot Refill charges (rc2) and src m4.flags.rc2Refill or m4.flags.autoRefill at once throws', () => {
    expect(() => assertNoDoubleModel(withSrc({ rc2Refill: 1 }), { ...M5PX_STACK, on: false, rc2: M5PX_RC2.on })).toThrow(/rc2Refill/);
    expect(() => assertNoDoubleModel(withSrc({ rc2Refill: 1 }), { ...M5PX_STACK, on: false })).not.toThrow();
    expect(() => assertNoDoubleModel(withSrc({ autoRefill: 1 }), { ...M5PX_STACK, on: false, rc2: M5PX_RC2.on })).toThrow(/autoRefill/);
    expect(() => assertNoDoubleModel(withSrc({ autoRefill: 1 }), { ...M5PX_STACK, on: false })).not.toThrow();
    expect(() => assertNoDoubleModel(withSrc({ clockWage: 1 }), { ...M5PX_STACK, rc2: M5PX_RC2.on })).not.toThrow(); // the bot never models clock wage
  });
});
import { firstDivergence } from './bot-m5';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
describe('[REQ-L35] bot-m5 B: parity-break report and toggle metric', () => {
  const row = (o: Record<string, unknown>) => JSON.stringify({ seed: 3, t10: 720.2, start: 720, st: '0000000000', ex: '0000000000', el: 'HHHHHHHHHH', pertT: null, sc29: 0.5, ...o });
  it('[REQ-L35 FDT] firstDivergence: null on identical bytes; a series diff maps char i to second start+i+1 and its tick range (STEP 0.1)', () => {
    const ref = row({}) + '\n' + row({ seed: 4 }) + '\n';
    expect(firstDivergence(ref, ref)).toBeNull();
    const d = firstDivergence(ref, row({}) + '\n' + row({ seed: 4, ex: '0000010000' }) + '\n')!;
    expect(d).toMatchObject({ line: 2, seed: 4, field: 'ex[5]', second: 726, tick: [7251, 7260] }); // (725, 726] s = ticks 7251..7260
    expect(firstDivergence(ref, row({}) + '\n' + row({ seed: 4, sc29: 0.6 }) + '\n')).toMatchObject({ line: 2, seed: 4, field: 'sc29', ref: 0.5, port: 0.6, tick: null });
    expect(firstDivergence(ref, row({}) + '\n')).toMatchObject({ line: 2, field: '(line count)', tick: null });
  });
  it('[REQ-L35 FDT] scripts/bot-m5-diverge.ts exits 0 on identical files, 1 with the first divergence, 2 on usage', () => {
    const dir = mkdtempSync(join(tmpdir(), 'b5d-')), a = join(dir, 'a.jsonl'), z = join(dir, 'z.jsonl'), y = join(dir, 'y.jsonl');
    writeFileSync(a, row({}) + '\n'); writeFileSync(z, row({}) + '\n'); writeFileSync(y, row({ st: '0100000000' }) + '\n');
    const cli = (...args: string[]) => spawnSync(process.execPath, [`${ROOT5}node_modules/vite-node/vite-node.mjs`, 'scripts/bot-m5-diverge.ts', ...args], { cwd: ROOT5, encoding: 'utf8' });
    expect(cli(a, z).status).toBe(0);
    const r = cli(a, y); expect(r.status).toBe(1); expect(JSON.parse(r.stdout.trim().split('\n').pop()!)).toMatchObject({ field: 'st[1]', second: 722, tick: [7211, 7220] });
    expect(cli(a).status).toBe(2);
  }, 120_000);
  it('[REQ-L35 D6] toggle sidecar: Asleep<->Unpaid flips per 30 min = tog / tAll * 1800, F10 variant on t10, casual seeds 1-2 within the D6 bar (<= 12)', () => {
    const b = csvB();
    for (const seed of [1, 2]) for (const ck of ['on', 'off'] as const) {
      const { tog } = pressureSeed(b, seed, 'casual', ck, 0);
      expect(tog.tAll).toBe(12000);
      expect(tog.per30m_all).toBe(+(tog.tog / tog.tAll * 1800).toFixed(4));
      expect(tog.per30m_F10).toBeCloseTo(tog.tog10 / tog.t10 * 1800, 3); // t10 in the sidecar is rounded to 0.1 s
      expect(tog.tog10).toBeLessThanOrEqual(tog.tog);
      expect(tog.per30m_all).toBeLessThanOrEqual(12);
    }
  }, 120_000);
});

// ---- CCR rcv5-vs-main-1a61b36 F-1 (D-HOE-20261030-08): O-3 loud fail. bot-m5 layers its OWN golden/streak/tap-coin/Broody/
// ability/pause model on the real step()/apply(); with the matching src m4.flags.* on too, both would run and double-count.
// Balance here is built from the pinned fixture CSV (sha256 asserted, D-HOE-20261030-05); no balance value is asserted.
import { SRC_M5_FLAGS } from './bot-m5';
import { runVerify } from '../scripts/verify/sim';
// (node:child_process/fs/os/path/url imports are shared with the bot-m5 B tests above)
import { withFlags } from '../scripts/verify/cli';
describe('bot-m5: O-3 loud fail (CCR rcv5-vs-main-1a61b36 F-1)', () => {
  // #90 AC ids (QA M1, qa/v5-saves/trace-reviews/pr90-27157b0.md §5): AC1/AC4 run(), AC2 repro, AC3 CLI, AC6 list (+ tsc `satisfies`).
  // AC5 (shipped behaviour unchanged) is the parity pin '[F-1][AC5] windowGate equals the original harness' (41324ef4, fixture b48be8a4).
  const fx = () => { const csv = readFileSync(PARITY_CSV_URL); expect(createHash('sha256').update(csv).digest('hex')).toBe(PARITY_CSV_SHA256); return csvBalance(csv.toString('utf8')); };
  const withSrc = (b: Balance, flags: Record<string, number>, enabled = 1) => ({ ...b, m4: { ...(b as any).m4, enabled, flags: { ...(b as any).m4?.flags, ...flags } } }) as Balance;
  it('[F-1][O-3][AC6] the guarded list is exactly the mechanics the bot models itself', () => {
    expect([...SRC_M5_FLAGS]).toEqual(['golden', 'streak', 'tapCoins', 'broody', 'abilities', 'pause']);
  });
  it('[F-1][O-3][AC1][AC4] run(): bot M5 model (stack on) + any modelled src flag on throws, naming the flag; either alone runs', () => {
    const b = fx();
    for (const k of SRC_M5_FLAGS) expect(() => run(withSrc(b, { [k]: 1 }), 1, PROFS.casual, M5X_STACKS.AssZ, 1), k).toThrow(new RegExp(`bot-m5 models M5 itself.*m4\\.flags\\.${k}.*double-count`));
    expect(() => run(withSrc(b, { golden: 1 }), 1, PROFS.casual, M5X_STACKS.none, 1)).not.toThrow(); // bot model off: src mechanics only
    expect(() => run(withSrc(b, { golden: 1 }, 0), 1, PROFS.casual, M5X_STACKS.AssZ, 1)).not.toThrow(); // src flags need m4.enabled
    expect(() => run(withSrc(b, {}), 1, PROFS.casual, M5X_STACKS.AssZ, 1)).not.toThrow(); // shipped flags (all 0): unchanged
    expect(() => run(withSrc(b, { clockWage: 1, zeroGainUi: 1 }), 1, PROFS.casual, M5X_STACKS.AssZ, 1)).not.toThrow(); // not modelled by the bot
  });
  it('[F-1][O-3][AC2] repro: runVerify m5x-casual and windowGate with m4.flags.golden=1 fail loudly instead of returning', () => {
    const b = withFlags(fx(), { 'm4.flags.golden': 1 });
    expect(() => runVerify(b, { hours: 0.25, seed: 1, profile: 'm5x-casual' })).toThrow(/bot-m5 models M5 itself.*m4\.flags\.golden/);
    expect(() => windowGate(b, gateOptsFromEnv({ CFG: 'AssZ', PROFS: 'casual', SEEDS: '1', T: '10', NOWIN: '1' }, loadTargets()))).toThrow(/m4\.flags\.golden/);
  });
  it('[F-1][O-3][AC3] CLI: verify --profile m5x-casual --flags m4.flags.golden=1 exits 1 with the O-3 reason in verify.json (not the generic exit 4)', () => {
    const root = fileURLToPath(new URL('..', import.meta.url)), dir = mkdtempSync(join(tmpdir(), 'o3-')), html = join(dir, 'fake.html'), out = join(dir, 'out');
    writeFileSync(html, '<!doctype html><meta name="build-id" content="m4.1+0000000"><div id="app" data-build-id="m4.1+0000000"></div>');
    const r = spawnSync(process.execPath, [`${root}node_modules/vite-node/vite-node.mjs`, 'scripts/verify.ts', '--', '--hours', '0.1', '--profile', 'm5x-casual', '--skip-build', '--no-shot', '--flags', 'm4.flags.golden=1', '--out', out],
      { cwd: root, encoding: 'utf8', env: { ...process.env, VERIFY_HTML: html, CHROME: join(dir, 'must-not-launch') } });
    expect(r.status).toBe(1);
    const j = JSON.parse(readFileSync(join(out, 'verify.json'), 'utf8'));
    expect(j.result).toBe('FAIL'); expect(j.complete).toBe(false);
    expect(j.reason).toMatch(/bot-m5 models M5 itself.*m4\.flags\.golden.*double-count/);
  }, 120_000);
});
