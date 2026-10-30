import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { balance as b } from '../src/config/balance';
import * as S from '../src/sim/state';
import { tableRow } from '../src/config/formulas';
import { offlineEggs } from '../src/sim/offline';
import { parseEconomyCsv } from '../scripts/sync-economy';
const csvText = readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8');
const data = parseEconomyCsv(csvText);
const fx = JSON.parse(readFileSync(new URL('./fixtures/economy_sim.json', import.meta.url), 'utf8'));
describe('AC6 every economy.csv cell reproduced from config formulas', () => {
  it.each(data)('level $level', (r) => {
    const t = tableRow(r.level, b) as Record<string, number>;
    for (const [c, v] of Object.entries(r)) if (c in t) expect([c, t[c]]).toEqual([c, expect.closeTo(v, 9)]);
  });
});
describe('parity with vendored reference sim vendor/economy-sim (fixture: npm run gen-fixtures)', () => {
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
  // Vendored, sha-pinned reference sim (vendor/economy-sim). Never reads anything outside the repo.
  const vdir = new URL('../vendor/economy-sim/', import.meta.url);
  const pins = readFileSync(new URL('SHA256SUMS', vdir), 'utf8').trim().split('\n').map(l => l.split(/\s+/));
  const sha = (buf: Buffer | string) => createHash('sha256').update(buf).digest('hex');
  const checkPins = () => {
    const files = pins.map(([, f]) => f).sort().join(',');
    if (files !== 'economy.f1-m4cols.csv,sim/economy_sim.py,sim/seller-variance-proposal.md,sim/seller_variance_sim.py') throw new Error(`vendor/economy-sim/SHA256SUMS must pin exactly 4 files, got ${files}`);
    for (const [h, f] of pins) { const got = sha(readFileSync(new URL(f, vdir))); if (got !== h) throw new Error(`vendored ${f} sha256 ${got} != pin ${h}`); }
  };
  // Hashes are verified before anything runs, so a tampered sim never executes.
  beforeAll(checkPins);
  it('vendored reference sim matches its sha256 pins', () => { expect(checkPins).not.toThrow(); });
  const srcLines = readFileSync(new URL('SOURCE', vdir), 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#'));
  const srcDate = srcLines.find(l => l.startsWith('vendored:'))?.slice(9).trim();
  const src = srcLines.filter(l => !l.startsWith('vendored:')).map(l => l.trim().split(/\s+/));
  it('vendored SOURCE provenance equals the SHA256SUMS pins (unmodified copies)', () => {
    expect(srcDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const [h, f, from] of src) console.info(`economy-sim vendored ${f} from ${from} sha256 ${h} on ${srcDate}`);
    expect(src.map(([h, f]) => [f, h]).sort()).toEqual(pins.map(([h, f]) => [f, h]).sort());
    // Opt-in (ECONOMY_PRODUCT_CHECK=1), advisory only, never fails: warn if a local live copy has drifted from the vendored one.
    if (process.env.ECONOMY_PRODUCT_CHECK === '1') for (const [h, , from] of src) {
      const live = new URL(`../../${from}`, import.meta.url);
      if (existsSync(live)) {
        const lh = createHash('sha256').update(readFileSync(live)).digest('hex');
        if (lh !== h) console.warn(`economy-sim: local ${from} sha256 ${lh} differs from vendored ${h} (advisory; Economy updates vendor/economy-sim via PR)`);
      }
    }
  });
  // data/economy.csv sha256 -> vendored sim --config (decisions.md:295). Unknown sha = hard failure.
  const CONFIG_BY_CSV_SHA: Record<string, string> = {
    '6dca24cd50a6fd6f11c361e16d8b3c797fddea7fe0155c1d9e79006f99845455': 'f1', // F1 m4cols + AC7 L21 trim (was 86f0e80e, #17)
    'b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857': 'f1', // M4-on retune T3 (D-CEO-20261019-04): only hens/egg_value cost L0-L11 (m4 columns, not emitted by the sim)
    '8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b': 'f1', // M5.0 shipping CSV of record (D-HOP-2026-10-29-01 addendum 19:50): +29 tc_* cols, tc_streak_cap 0.28, w2_asleep_collect_share 0.15, guard_* dropped; farm_cost/w4 unchanged
    'a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f': 'f1', // M5.1 o1a (D-HOP-2026-10-29-01): 8dc90e2b + farm_cost L27/28/29 = 160000/175000/190000 only
  };
  it('fixture is fresh vs the vendored reference sim (config chosen by economy.csv sha256)', () => {
    checkPins();
    const csvSha = sha(csvText), config = CONFIG_BY_CSV_SHA[csvSha];
    if (!config) throw new Error(`unknown economy.csv ${csvSha}: update vendor/economy-sim`);
    const out = join(mkdtempSync(join(tmpdir(), 'eco-')), 't.csv');
    execFileSync('python3', [new URL('sim/economy_sim.py', vdir).pathname, '--config', config, '--csv', out, '--seeds', '1', '--mins', '1'], { stdio: 'ignore' });
    // Compare every column the sim's CSV writer emits (46); m4cols-only CSV columns are not written by the sim.
    const sim = parseEconomyCsv(readFileSync(out, 'utf8')), cols = Object.keys(sim[0]);
    expect(cols.length).toBe(46); expect(sim.length).toBe(data.length);
    const pick = (rs: Record<string, number>[]) => rs.map(r => Object.fromEntries(cols.map(c => [c, r[c]])));
    expect(pick(sim)).toEqual(pick(data)); // vendored sim table == economy.csv on every sim column
  });
});
describe('price formula', () => {
  it('(1.00 + a*F)(1 + c*C) half-up, coefficients from config', () => {
    const x = structuredClone(b); x.collection.pricePercentPerLevel = 0.5; x.farm.eggPriceCentsPerLevel = 10;
    expect(S.eggPriceCents(2, 2, x)).toBe(Math.round(1.2 * 2 * 100));
    expect(S.eggPriceCents(1, 1, b)).toBe(Math.round((1 + b.farm.eggPriceCentsPerLevel / 100) * (1 + b.collection.pricePercentPerLevel) * 100 + 1e-7));
  });
});
import { parseEconomyCsv as pCsv } from '../scripts/sync-economy';
import { readFileSync as rf } from 'node:fs';
it('economy.csv parses the same with CRLF (product/economy.csv) and LF (sim output) line endings', () => {
  const lf = rf(new URL('../data/economy.csv', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  expect(pCsv(lf.replace(/\n/g, '\r\n'))).toEqual(pCsv(lf));
});
