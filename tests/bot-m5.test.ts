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
  it('windowGate equals the original harness (scratch/v2-econ/h m5x.ts, uses pinned CSV fixture sha256=b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857, SEEDS=2 T=3000 CFG=none,AssZ PROFS=casual)', () => {
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

// ---- CCR rcv5-vs-main-1a61b36 F-1 (D-HOE-20261030-08): O-3 loud fail. bot-m5 layers its OWN golden/streak/tap-coin/Broody/
// ability/pause model on the real step()/apply(); with the matching src m4.flags.* on too, both would run and double-count.
// Balance here is built from the pinned fixture CSV (sha256 asserted, D-HOE-20261030-05); no balance value is asserted.
import { SRC_M5_FLAGS } from './bot-m5';
import { runVerify } from '../scripts/verify/sim';
import { withFlags } from '../scripts/verify/cli';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
describe('bot-m5: O-3 loud fail (CCR rcv5-vs-main-1a61b36 F-1)', () => {
  const fx = () => { const csv = readFileSync(PARITY_CSV_URL); expect(createHash('sha256').update(csv).digest('hex')).toBe(PARITY_CSV_SHA256); return csvBalance(csv.toString('utf8')); };
  const withSrc = (b: Balance, flags: Record<string, number>, enabled = 1) => ({ ...b, m4: { ...(b as any).m4, enabled, flags: { ...(b as any).m4?.flags, ...flags } } }) as Balance;
  it('[F-1][O-3] the guarded list is exactly the mechanics the bot models itself', () => {
    expect([...SRC_M5_FLAGS]).toEqual(['golden', 'streak', 'tapCoins', 'broody', 'abilities', 'pause']);
  });
  it('[F-1][O-3] run(): bot M5 model (stack on) + any modelled src flag on throws, naming the flag; either alone runs', () => {
    const b = fx();
    for (const k of SRC_M5_FLAGS) expect(() => run(withSrc(b, { [k]: 1 }), 1, PROFS.casual, M5X_STACKS.AssZ, 1), k).toThrow(new RegExp(`bot-m5 models M5 itself.*m4\\.flags\\.${k}.*double-count`));
    expect(() => run(withSrc(b, { golden: 1 }), 1, PROFS.casual, M5X_STACKS.none, 1)).not.toThrow(); // bot model off: src mechanics only
    expect(() => run(withSrc(b, { golden: 1 }, 0), 1, PROFS.casual, M5X_STACKS.AssZ, 1)).not.toThrow(); // src flags need m4.enabled
    expect(() => run(withSrc(b, {}), 1, PROFS.casual, M5X_STACKS.AssZ, 1)).not.toThrow(); // shipped flags (all 0): unchanged
    expect(() => run(withSrc(b, { clockWage: 1, zeroGainUi: 1 }), 1, PROFS.casual, M5X_STACKS.AssZ, 1)).not.toThrow(); // not modelled by the bot
  });
  it('[F-1][O-3] repro: runVerify m5x-casual and windowGate with m4.flags.golden=1 fail loudly instead of returning', () => {
    const b = withFlags(fx(), { 'm4.flags.golden': 1 });
    expect(() => runVerify(b, { hours: 0.25, seed: 1, profile: 'm5x-casual' })).toThrow(/bot-m5 models M5 itself.*m4\.flags\.golden/);
    expect(() => windowGate(b, gateOptsFromEnv({ CFG: 'AssZ', PROFS: 'casual', SEEDS: '1', T: '10', NOWIN: '1' }, loadTargets()))).toThrow(/m4\.flags\.golden/);
  });
  it('[F-1][O-3] CLI: verify --profile m5x-casual --flags m4.flags.golden=1 exits 1 with the O-3 reason in verify.json (not the generic exit 4)', () => {
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
