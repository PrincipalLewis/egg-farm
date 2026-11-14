// ST-AC18 8th streak key (QA-D-1113-STAC18-8 / HoE/stac18-key8):
// tc_streak_cool_cue_min_tier is required while streak is on, and the cool cue follows the CSV/balance value.
// Autorefill keys stay out. streak-view.ts is not on rc/v5; the cue predicate is runMax >= min_tier (combo-tiers §1 / D-HOP-2026-11-13-01).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance, validateBalance, type Balance } from '../src/config/balance';
import { tcNum } from '../src/config/formulas';
import { parseEconomyCsv } from '../scripts/sync-economy';

const rows = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
const streakOn = (tc: Record<string, number>): Balance =>
  ({ ...balance, m4: { ...balance.m4!, flags: { ...balance.m4!.flags, streak: 1 }, tc: { ...balance.m4!.tc!, ...tc } } } as Balance);
/** Cool sting / "Streak cooling" only if the run reached a tier >= the CSV/balance min (Hire 3 streak-view: runMax >= coolCueMinTier). */
const coolCueAt = (tier: number, b: Balance) => tier >= tcNum(b, 'streak_cool_cue_min_tier');

describe('ST-AC18 [QA-D-1113-STAC18-8] tc_streak_cool_cue_min_tier', () => {
  it('ST-AC18 [QA-D-1113-STAC18-8]: shipped CSV and balance.json both carry tc_streak_cool_cue_min_tier = 2', () => {
    expect(balance.m4!.flags.streak).toBe(0); // flags stay 0
    expect(tcNum(balance, 'streak_cool_cue_min_tier')).toBe(2);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.tc_streak_cool_cue_min_tier).toBe(2);
  });

  it('ST-AC18 [QA-D-1113-STAC18-8]: validateBalance rejects a streak-on config missing tc_streak_cool_cue_min_tier; off flags need nothing', () => {
    const t: Record<string, number> = { ...balance.m4!.tc! };
    delete t.streak_cool_cue_min_tier;
    const on = { ...balance, m4: { ...balance.m4!, flags: { ...balance.m4!.flags, streak: 1 }, tc: t } } as Balance;
    expect(() => validateBalance(on, false)).toThrow(/tc_streak_cool_cue_min_tier/);
    expect(() => validateBalance({ ...on, m4: { ...on.m4!, flags: { ...on.m4!.flags, streak: 0 } } } as Balance, false)).not.toThrow();
    expect(() => validateBalance(streakOn({}), false)).not.toThrow();
  });

  it('ST-AC18 [QA-D-1113-STAC18-8]: the cool cue follows the CSV/balance value (3 means no cue at tier 2, and the cue appears at tier 3)', () => {
    const shipped = 2; // D-HOP-2026-11-13-01 / #143; not a code constant
    expect(tcNum(balance, 'streak_cool_cue_min_tier')).toBe(shipped);
    expect(coolCueAt(1, balance)).toBe(false);
    expect(coolCueAt(2, balance)).toBe(true);
    const b3 = streakOn({ streak_cool_cue_min_tier: 3 });
    expect(() => validateBalance(b3, false)).not.toThrow();
    expect(tcNum(b3, 'streak_cool_cue_min_tier')).toBe(3);
    expect(coolCueAt(2, b3)).toBe(false);
    expect(coolCueAt(3, b3)).toBe(true);
  });
});
