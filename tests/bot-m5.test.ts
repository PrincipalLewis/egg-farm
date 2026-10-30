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
  it('windowGate equals the original harness (scratch/v2-econ/h m5x.ts, CSV data/economy.csv b48be8a4, SEEDS=2 T=3000 CFG=none,AssZ PROFS=casual)', () => {
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
