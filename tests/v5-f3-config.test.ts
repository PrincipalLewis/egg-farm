// v5 F3 (engineering/m5.0-sizing.md §1 F3, §9.5, §12.1 D-C1, §12.2, §14 pt 5): m4.flags.* kept whole by sync-economy,
// explicit mappings for non-tc_ M5 columns, validateBalance rules, and the no-literal-tunables grep over src/.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { balance } from '../src/config/balance';
import { validateBalance } from '../src/config/balance';
import { M5_FLAGS } from '../src/config/flags';
import { parseEconomyCsv, buildBalance, readEconomyConfig, keepFlags, M5_MAPPED_COLS } from '../scripts/sync-economy';

const rows = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
const withM4 = (m4: any) => ({ ...structuredClone(balance), m4: { ...structuredClone(balance.m4!), ...m4 } }) as typeof balance;
const withTc = (tc: Record<string, number>) => withM4({ tc: { ...balance.m4!.tc, ...tc } });

describe('F3 flags block (m4.flags.*, HoE D-C1)', () => {
  it('ships every known flag, all 0, with m4.enabled kept as shipped (1)', () => {
    expect(balance.m4!.enabled).toBe(1);
    expect(balance.m4!.flags).toEqual(Object.fromEntries(M5_FLAGS.map(f => [f, 0])));
  });
  it('sync keeps the flags block whole (a flipped flag survives a re-sync) and fills absent flags with 0', () => {
    const prev = withM4({ flags: { ...balance.m4!.flags, golden: 1, pause: 1 } });
    expect(buildBalance(rows, prev, readEconomyConfig()).m4.flags).toEqual({ ...balance.m4!.flags, golden: 1, pause: 1 });
    const { flags: _f, ...noFlags } = balance.m4 as any;
    expect(buildBalance(rows, { ...balance, m4: noFlags }, readEconomyConfig()).m4.flags).toEqual(balance.m4!.flags);
  });
  it('sync refuses an unknown flag or a non-0/1 value (no silent typos)', () => {
    expect(() => keepFlags({ m4: { flags: { goldenEgg: 1 } } })).toThrow(/unknown flag m4\.flags\.goldenEgg/);
    expect(() => keepFlags({ m4: { flags: { golden: 2 } } })).toThrow(/must be 0 or 1/);
    expect(() => keepFlags({ m4: { flags: { golden: '1' } } })).toThrow(/must be 0 or 1/);
  });
  it('validateBalance refuses an unknown flag or a non-0/1 value', () => {
    expect(() => validateBalance(withM4({ flags: { ...balance.m4!.flags, nope: 1 } }), false)).toThrow(/not a known flag/);
    expect(() => validateBalance(withM4({ flags: { ...balance.m4!.flags, golden: 0.5 } }), false)).toThrow(/0 or 1/);
    expect(() => validateBalance(withM4({ flags: { ...balance.m4!.flags, golden: 1 } }), false)).not.toThrow();
  });
});

describe('F3 CSV wiring', () => {
  it('every tc_* column lands in m4.tc (auto), plus the explicit non-tc_ mappings, values verbatim from the CSV', () => {
    const tc = balance.m4!.tc as Record<string, number>;
    for (const c of Object.keys(rows[0]).filter(c => c.startsWith('tc_'))) expect(tc[c.slice(3)]).toBe(rows[0][c]);
    for (const c of M5_MAPPED_COLS) expect(tc[c]).toBe(rows[0][c]);
  });
  it('a mapped column that varies by row, or appears twice (x and tc_x), fails the sync', () => {
    expect(() => buildBalance(rows.map(r => r.level === 4 ? { ...r, rest_recovery_mult: 0.3 } : r), balance, readEconomyConfig())).toThrow(/rest_recovery_mult must be constant/);
    expect(() => buildBalance(rows.map(r => ({ ...r, tc_rest_recovery_mult: r.rest_recovery_mult })), balance, readEconomyConfig())).toThrow(/both rest_recovery_mult and tc_rest_recovery_mult/);
  });
});

describe('F3 validateBalance M5 rules (rules from the specs; values are test inputs)', () => {
  const bad: [Record<string, number>, RegExp][] = [
    [{ egg_w_cash: 0.5 }, /weights must sum to 1/],
    [{ egg_gap_min_s: 301 }, /egg_gap_min_s/],
    [{ warn_at_s: 27, urgent_at_s: 27, egg_despawn_s: 30 }, /warn_at_s < urgent_at_s < egg_despawn_s/],
    [{ warn_at_s: 20, urgent_at_s: 31, egg_despawn_s: 30 }, /warn_at_s < urgent_at_s < egg_despawn_s/],
    [{ streak_cap: 0 }, /streak_cap/], [{ streak_cap: 1.5 }, /streak_cap/],
    [{ streak_tier_count: 0 }, /streak_tier_count/], [{ streak_tier_count: 2.5 }, /streak_tier_count/],
    [{ tap_bonus_income_window_s: 0.5 }, /tap_bonus_income_window_s/],
    [{ broody_cap_s: 0 }, /broody_cap_s/], [{ broody_ready_share: 0 }, /broody_ready_share/],
    [{ stall_hold_s: 3 }, /stall_hold_s/],
    [{ fatigue_cue_min_share: 0.3, fatigue_cue_clear_share: 0.3 }, /fatigue_cue_clear_share/],
    [{ ability_s: 400 }, /ability_s/], [{ rest_recovery_mult: 0.4 }, /rest_recovery_mult/],
    [{ frenzy_price_mult: 0.5 }, /frenzy_price_mult/],
  ];
  it('the shipped balance passes', () => { expect(() => validateBalance(structuredClone(balance), false)).not.toThrow(); });
  for (const [tc, re] of bad) it(`rejects ${JSON.stringify(tc)}`, () => { expect(() => validateBalance(withTc(tc), false)).toThrow(re); });
  it('tc_stall_hold_s = 0 is the supported kill switch (SS-23); keys a CSV does not carry yet are skipped', () => {
    expect(() => validateBalance(withTc({ stall_hold_s: 0 }), false)).not.toThrow();
    expect(() => validateBalance(withTc({ warn_at_s: 20, urgent_at_s: 27 }), false)).not.toThrow(); // despawn 30 shipped
  });
});

// No literal tunables in src/ (sizing §1 F3, §12.2). Two checks:
//  1. no `tc.<key> ?? <number>` / `tc['key'] || <number>` fallback anywhere in src (a missing column must fail validation, not
//     silently take a code default);
//  2. M5 code (any src file that reads m4.tc or imports config/flags or the F1 modules) has no bare numeric literal except
//     the neutral ones (0, 1, 1000 ms/s, the 1e-9 float guard) and the named code constants HoP/HoE ruled are not CSV columns.
const SRC = new URL('../src/', import.meta.url).pathname;
const files = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : []; });
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
/** Named code constants that are not CSV columns, by ruling: FOCUS_DT_MAX_S (HoP, sizing §13 GE-15), the RNG salts (D-C2, D-C4),
 *  and the uint32 bound of the xorshift state (D-C5 sanitising). tc_broody_max_on_screen = 1 is "fixed by design" (§12.2). */
const NAMED_OK = /^export const (FOCUS_DT_MAX_S|EV_RNG_SALT|BR_RNG_SALT) = [0-9.xa-fA-F]+;$/;
const NEUTRAL = new Set(['0', '1', '1000', '1e-9', '0xffffffff', '1.0']);
/** The F1/F3 M5 modules; every later M5 module that calls flagOn() is picked up automatically. */
const M5_FILES = /(?:sim\/(?:rng|clock|timers|effects|m5-state)|config\/flags)\.ts$/;
describe('F3 no literal tunables in src/', () => {
  const all = files(SRC);
  it('no code-default fallback for an m4.tc key', () => {
    const hits = all.flatMap(f => strip(readFileSync(f, 'utf8')).split('\n').map((l, i) => [f, i + 1, l] as const)
      .filter(([, , l]) => /\btc(?:\.\w+|\[[^\]]+\])\s*(?:\?\?|\|\|)\s*-?\d/.test(l))).map(([f, n]) => `${f.slice(SRC.length)}:${n}`);
    expect(hits).toEqual([]);
  });
  it('M5 modules carry no bare numeric literal (only 0/1/1000/1e-9/uint32 and the ruled named constants)', () => {
    const m5 = all.filter(f => M5_FILES.test(f) || /\b(?:evRng)?[fF]lagOn\(/.test(strip(readFileSync(f, 'utf8'))));
    expect(m5.filter(f => M5_FILES.test(f))).toHaveLength(6);
    const bad: string[] = [];
    for (const f of m5) {
      strip(readFileSync(f, 'utf8')).split('\n').forEach((l, i) => {
        if (NAMED_OK.test(l.trim())) return;
        for (const m of l.matchAll(/(?<![\w.$])(\d[\d_]*(?:\.\d+)?(?:e-?\d+)?|0x[0-9a-fA-F]+)(?![\w$])/g)) if (!NEUTRAL.has(m[1])) bad.push(`${f.slice(SRC.length)}:${i + 1} ${m[1]}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
