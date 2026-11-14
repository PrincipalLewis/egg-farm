/**
 * GEN/bc-wiring (QA-D-1114-K10-WIRE step 1): shipping bc() / rosterTraitBp read m4.bc from
 * sync-economy, byte-identical at 32307f32 defaults, no SAVE_VERSION bump.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { balance as shipping, validateBalance, type Balance } from '../src/config/balance';
import { BC_SPEC_DEFAULTS, BREED_IDS, ROSTER, bc, rosterTraitBp, type BcKey, type BreedId } from '../src/config/breeds';
import { SAVE_VERSION, serialize } from '../src/save/save';
import { initialState } from '../src/sim/state';
import { buildBalance, parseEconomyCsv, readEconomyConfig } from '../scripts/sync-economy';
import { bcFromCsv, type CsvBreeds } from './k10-breeds-offset';

const T0 = Date.UTC(2026, 9, 29, 12);
const F2_RAW = readFileSync(new URL('./fixtures/v5-f2/m5-save.json', import.meta.url), 'utf8').trim();
const SHIPPING_CSV = readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8');
const K002_CSV = readFileSync(new URL('./fixtures/k10/economy.combined-K002.csv', import.meta.url), 'utf8');
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

const m5State = () => ({ ...initialState(shipping, 7), farmLevel: 12, coinsCents: 1_234_567, tracksV7: 1 as const, v6BackupId: '0123456789abcdef',
  workers: { market_hand: { energy: 80, cdS: 1 } }, nextSpawnRemainingS: 87, frenzyRemainingS: 12, evRngState: 123456789, broodyNestCents: 4321, broodyHenIdx: 3,
  abilities: { market_hand: { readyAt: T0 + 120_000, activeS: 18 }, coop_hand: { readyAt: T0 - 5_000 } } });

/** Set a constant CSV column on every data row. */
const withCol = (csv: string, col: string, value: string): string => {
  const nl = csv.includes('\r\n') ? '\r\n' : '\n';
  const lines = csv.trimEnd().split(/\r?\n/);
  const head = lines[0].split(',');
  const i = head.indexOf(col);
  if (i < 0) throw new Error(`missing column ${col}`);
  return [lines[0], ...lines.slice(1).filter(Boolean).map(l => { const c = l.split(','); c[i] = value; return c.join(','); })].join(nl) + nl;
};

const balanceFromCsv = (csv: string): Balance => {
  const prev = JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8'));
  return validateBalance(buildBalance(parseEconomyCsv(csv), prev, readEconomyConfig()) as Balance, false);
};

/** Map a shipping BcKey onto the value bcFromCsv stored for the same column (undefined = harness has no such field). */
const harnessBc = (cb: CsvBreeds, k: BcKey): number | undefined => {
  const row: Record<BcKey, number | undefined> = {
    unlock_farm: cb.bc.unlock, slot2_farm: cb.bc.slot2, slot3_farm: cb.bc.slot3,
    rare_farm: cb.bc.rareF, legendary_farm: cb.bc.legF,
    hatch_cost_s: cb.bc.costS, hatch_farm_share_bp: cb.bc.farmShareBp, hatch_min_cents: cb.bc.minCents,
    hatch_time_s: cb.bc.hatchS, settle_s: cb.bc.settleS, incubators: cb.bc.incubators,
    w_common: cb.bc.w.C, w_rare: cb.bc.w.R, w_epic: cb.bc.w.E, w_legendary: cb.bc.w.L,
    pity_rare_after: cb.bc.pityAfter, star_cap: cb.bc.starCap, star_bonus_bp: cb.bc.starBp,
    present_calm_w_s: cb.env.CALM_W !== undefined ? Number(cb.env.CALM_W) : undefined,
    present_calm_k: cb.env.CALM_K !== undefined ? Number(cb.env.CALM_K) : (cb.env.GATE ? undefined : 0),
    lay_cap_bp_lt18: cb.bc.layLt18, lay_cap_bp: cb.bc.lay, lay_cap_farm: undefined,
    away_cap_bp: cb.bc.away, broody_cap_bp: cb.bc.broody,
  };
  return row[k];
};

describe('GEN/bc-wiring defaults (32307f32 byte-identity)', () => {
  it('shipping CSV has no bc_* columns; buildBalance does not emit m4.bc; --check bytes match', () => {
    const head = SHIPPING_CSV.split(/\r?\n/, 1)[0].split(',');
    expect(head.filter(c => c.startsWith('bc_'))).toEqual([]);
    const prevText = readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8');
    const next = buildBalance(parseEconomyCsv(SHIPPING_CSV), JSON.parse(prevText), readEconomyConfig());
    expect((next as { m4?: { bc?: unknown } }).m4?.bc).toBeUndefined();
    expect(JSON.stringify(next, null, 2) + '\n').toBe(prevText);
  });

  it('bc() and rosterTraitBp on the shipping Balance equal the hardcoded defaults', () => {
    for (const k of Object.keys(BC_SPEC_DEFAULTS) as BcKey[]) expect(bc(shipping, k)).toBe(BC_SPEC_DEFAULTS[k]);
    for (const id of BREED_IDS) expect(rosterTraitBp(shipping, id)).toBe(ROSTER[id][2]);
  });

  it('SAVE_VERSION stays 6', () => {
    expect(SAVE_VERSION).toBe(6);
  });

  it('serialized default save at T0 matches the 32307f32 pin; F2 fixture serialize is unchanged', () => {
    // Pin is sha256 of serialize(initialState(shipping, 7), T0, 5) on origin/rc/v5 32307f32.
    expect(sha256(serialize(initialState(shipping, 7), T0, 5))).toBe('2dd2ab452531079ccbb8173884f90ba256c56e75993ef56227724e1b55a3dfdf');
    expect(serialize(m5State(), T0, 5)).toBe(F2_RAW);
  });
});

describe('AC4 [QA-D-1114-K10-WIRE] shipped path equals K10 bcFromCsv (one value-check)', () => {
  it('buildBalance + bc() + rosterTraitBp match bcFromCsv() on a CSV with bc_trait_cochin_bp set', () => {
    const csv = withCol(K002_CSV, 'bc_trait_cochin_bp', '0');
    const bal = balanceFromCsv(csv);
    const cb = bcFromCsv(csv);
    expect(cb.roster.cochin[2]).toBe(0);
    expect(rosterTraitBp(bal, 'cochin')).toBe(cb.roster.cochin[2]);
    for (const id of BREED_IDS) expect(rosterTraitBp(bal, id as BreedId)).toBe(cb.roster[id][2]);
    for (const k of Object.keys(BC_SPEC_DEFAULTS) as BcKey[]) {
      const h = harnessBc(cb, k);
      if (h !== undefined) expect(bc(bal, k)).toBe(h);
    }
  });
});
