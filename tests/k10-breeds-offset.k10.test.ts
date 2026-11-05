// K10 breeds offset test (engineering/decisions.md 2026-10-25 03:52 item (6), D-HOP-2026-10-24-47): `npm run test:k10`.
// F20-29 median active premium (optimal, seeds 1-200, T 12000, windows every 300 s): breeds g1max at streak 0.27 must not exceed the
// no-breeds premium nor the calm-gated Present-only premium at streak 0.28. Slow (~10-15 min on 2 cores); run by CI job k10-breeds-offset
// only when scripts/k10-trigger.mjs says the diff can move it. Env: K10_CSV (default data/economy.csv), K10_SEEDS (200), K10_S0 (1),
// K10_SETTLE=1 (forced loadout settles 300 s per slot; informational, not the parity variant), K10_OUT=<file> (write the result JSON).
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../scripts/sync-economy';
import { validateBalance, type Balance } from '../src/config/balance';
import { loadTargets } from './pacing-guards';
import { k10 } from './k10-breeds-offset';

const E = process.env, csvPath = E.K10_CSV ?? new URL('../data/economy.csv', import.meta.url).pathname;
describe('K10 breeds offset (B4)', () => {
  it(`g1max@0.27 F20-29 median premium <= no-breeds and Present-only @0.28 (${csvPath})`, () => {
    const raw = readFileSync(csvPath), csv = raw.toString('utf8'), sha = createHash('sha256').update(raw).digest('hex');
    const b = validateBalance(buildBalance(parseEconomyCsv(csv), JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8')), readEconomyConfig() as any) as Balance, false);
    const r = k10(b, csv, sha, { seeds: +(E.K10_SEEDS ?? 200), s0: +(E.K10_S0 ?? 1), T: 12000, step: 300, targets: loadTargets() }, { forcedSettle: E.K10_SETTLE === '1' });
    const line = `K10 csv=${sha.slice(0, 8)} bc=${r.bcSource} seeds=${r.seeds.join('-')} settle=${E.K10_SETTLE === '1' ? 1 : 0} F20-29 median premium: g1max ${r.premium.g1max.toFixed(2)} | no-breeds ${r.premium.noBreeds.toFixed(2)} | Present-only ${r.premium.presentOnly.toFixed(2)} -> ${r.pass ? 'PASS' : 'FAIL'}`;
    console.log(line);
    if (E.K10_OUT) writeFileSync(E.K10_OUT, JSON.stringify({ csv: csvPath, settle: E.K10_SETTLE === '1', ...r }) + '\n');
    expect(r.premium.g1max, line).toBeLessThanOrEqual(r.premium.noBreeds);
    expect(r.premium.g1max, line).toBeLessThanOrEqual(r.premium.presentOnly);
  }, 3_600_000);
});
