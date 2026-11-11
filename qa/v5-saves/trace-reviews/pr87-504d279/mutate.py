#!/usr/bin/env python3
"""Apply one named mutation to the #87 worktree (exactly one match per edit). Revert with git checkout -- src."""
import sys, pathlib
R = pathlib.Path('/workspace/egg-farm-studio/qa/scratch/wt-pr87-504d279')
M = {
 'S1a-flag-absent-means-on': [('src/sim/streak.ts', 'export const streakOn = (b: Balance) => m4On(b) && b.m4?.flags?.streak === 1;', 'export const streakOn = (b: Balance) => m4On(b) && (b.m4?.flags?.streak ?? 1) === 1;')],
 'S1b-flag-ignored': [('src/sim/streak.ts', 'export const streakOn = (b: Balance) => m4On(b) && b.m4?.flags?.streak === 1;', 'export const streakOn = (b: Balance) => m4On(b);')],
 'S2-decay-on-unfocused-ticks': [('src/sim/tick.ts', 'return streakTick(out, dt, clock?.focus ? dt : 0, b, ev);', 'return streakTick(out, dt, dt, b, ev);')],
 'S3-no-credit-window': [('src/sim/streak.ts', "|| (s.tapCreditCdS ?? 0) > EPS) return { s, credited: false };", ") return { s, credited: false };")],
 'S4-no-K18-clamp': [('src/sim/streak.ts', 'sv = Math.min(sv0, cap);', 'sv = sv0;')],
 'S5-MH-focus-sale-no-streak': [('src/sim/payout.ts', 'streakSaleFactor(s, b, ctx?.suspended)', "streakSaleFactor(s, b, ctx?.suspended || ctx?.by === 'market_hand')")],
 'S6-offline-keeps-streak': [('src/save/m5-fields.ts', "  if (m5Flag(b, 'streak') && 'streakS' in o) o = endStreak(o, 'offline', b, ev);\n", '')],
 'S7-unlock-off-by-one': [('src/sim/streak.ts', "s.farmLevel < tc(b, 'streak_unlock_farm')", "s.farmLevel <= tc(b, 'streak_unlock_farm')")],
 'S8-tap-does-not-restart-hold': [('src/sim/streak.ts', "streakHoldS: tc(b, 'streak_hold_s'), tapCreditCdS", "streakHoldS: s.streakHoldS ?? tc(b, 'streak_hold_s'), tapCreditCdS")],
 'S9-extra-coins-full-value': [('src/sim/actions.ts', 'addStreakExtra(o, value - saleValueCents({ ...s, streakS: 0 }, k, b))', 'addStreakExtra(o, value)')],
}
for f, a, b in M[sys.argv[1]]:
    p = R / f; t = p.read_text(); n = t.count(a)
    assert n == 1, f'{sys.argv[1]}: {n} matches in {f}'
    p.write_text(t.replace(a, b)); print(f'applied {sys.argv[1]} to {f}')
