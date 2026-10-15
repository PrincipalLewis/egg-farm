import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { balance as b } from '../src/config/balance';
import * as S from '../src/sim/state';
import { tableRow } from '../src/config/formulas';
import { offlineEggs } from '../src/sim/offline';
import { parseEconomyCsv } from '../scripts/sync-economy';
const csvText = readFileSync(new URL('../../product/economy.csv', import.meta.url), 'utf8');
const data = parseEconomyCsv(csvText);
const fx = JSON.parse(readFileSync(new URL('./fixtures/economy_sim.json', import.meta.url), 'utf8'));
describe('AC6 every economy.csv cell reproduced from config formulas', () => {
  it.each(data)('level $level', (r) => {
    const t = tableRow(r.level, b) as Record<string, number>;
    for (const [c, v] of Object.entries(r)) if (c in t) expect([c, t[c]]).toEqual([c, expect.closeTo(v, 9)]);
  });
});
describe('parity with product/sim/economy_sim.py (fixture: npm run gen-fixtures)', () => {
  it.each(fx.rows as Record<string, number>[])('level $level stats', (r) => {
    const t = tableRow(r.level, b) as Record<string, number>;
    for (const [c, v] of Object.entries(r)) expect([c, t[c]]).toEqual([c, expect.closeTo(v, 9)]);
  });
  it('sale price for all 31x31 (F, C)', () => {
    const bad = (fx.prices as { F: number; C: number; cents: number }[]).filter(p => S.eggPriceCents(p.F, p.C, b) !== p.cents);
    expect(bad).toEqual([]);
  });
  it('offline eggs', () => {
    // The reference sim has no 60 s minimum (game rule AC11): below it the game grants 0.
    for (const o of fx.offline) expect([o.F, o.secs, offlineEggs(o.secs, o.F, b)]).toEqual([o.F, o.secs, o.secs < b.offline.offlineMinSeconds ? 0 : o.eggs]);
  });
  it('config params equal the reference sim params', () => {
    const p = fx.params;
    expect([b.collection.baseCost, b.collection.costGrowth, b.collection.pricePercentPerLevel]).toEqual([p.c_base, p.c_growth, p.c_price_bonus]);
    expect([b.farm.baseCost, b.farm.costGrowth, b.farm.eggPriceCentsBase / 100, b.farm.eggPriceCentsPerLevel / 100]).toEqual([p.f_base, p.f_growth, p.price_base, p.price_per]);
    expect([b.farm.demandLoFactor, b.farm.demandHiFactor, b.customers.queue_max_base, b.customers.queue_max_step_levels, b.customers.queue_max_cap]).toEqual([p.d_lo, p.d_hi, p.q_base, p.q_step, p.q_cap]);
    expect([b.offline.offlineRateMultiplier, b.offline.offlineCapSeconds]).toEqual([p.offline_rate, p.offline_cap_s]);
  });
  const py = existsSync(new URL('../../product/sim/economy_sim.py', import.meta.url).pathname);
  it.runIf(py)('fixture is fresh vs the live reference sim', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'eco-')), 't.csv');
    execFileSync('python3', [new URL('../../product/sim/economy_sim.py', import.meta.url).pathname, '--config', 'current', '--csv', out, '--seeds', '1', '--mins', '1'], { stdio: 'ignore' });
    expect(parseEconomyCsv(readFileSync(out, 'utf8'))).toEqual(data); // reference sim table == economy.csv
  });
});
describe('price formula', () => {
  it('(1.00 + a*F)(1 + c*C) half-up, coefficients from config', () => {
    const x = structuredClone(b); x.collection.pricePercentPerLevel = 0.5; x.farm.eggPriceCentsPerLevel = 10;
    expect(S.eggPriceCents(2, 2, x)).toBe(Math.round(1.2 * 2 * 100));
    expect(S.eggPriceCents(1, 1, b)).toBe(Math.round((1 + b.farm.eggPriceCentsPerLevel / 100) * (1 + b.collection.pricePercentPerLevel) * 100 + 1e-7));
  });
});
