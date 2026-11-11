#!/usr/bin/env python3
"""Apply one named mutation to the #87 @22b6db4 worktree (exactly one match per edit). Revert: git checkout -- src tests scripts."""
import sys, pathlib
R = pathlib.Path('/workspace/egg-farm-studio/qa/scratch/wt-pr87-694468e')
ENT = "{ id: 'streak', flag: 'streak', factor: s => 1 + (s.streakS ?? 0) }"
M = {
 'S1a-flag-absent-means-on': [('src/sim/streak.ts', 'export const streakOn = (b: Balance) => m4On(b) && b.m4?.flags?.streak === 1;', 'export const streakOn = (b: Balance) => m4On(b) && (b.m4?.flags?.streak ?? 1) === 1;')],
 'S1b-flag-ignored': [('src/sim/streak.ts', 'export const streakOn = (b: Balance) => m4On(b) && b.m4?.flags?.streak === 1;', 'export const streakOn = (b: Balance) => m4On(b);')],
 'S2-decay-on-unfocused-ticks': [('src/sim/timers.ts', 'const streak: TimerSystem = (s, dt, f, b, _c, ev) => streakTick(s, dt, f, b, ev);', 'const streak: TimerSystem = (s, dt, _f, b, _c, ev) => streakTick(s, dt, dt, b, ev);')],
 'S3-no-credit-window': [('src/sim/streak.ts', "|| (s.tapCreditCdS ?? 0) > EPS) return { s, credited: false };", ") return { s, credited: false };")],
 'S4-no-K18-clamp': [('src/sim/streak.ts', 'sv = Math.min(sv0, cap);', 'sv = sv0;')],
 'S5-MH-focus-sale-no-streak(effects)': [('src/sim/effects.ts', ENT, "{ id: 'streak', flag: 'streak', factor: (s, _b, ctx) => ctx.by === 'market_hand' ? 1 : 1 + (s.streakS ?? 0) }")],
 'S6-offline-keeps-streak': [('src/save/m5-fields.ts', "  if (m5Flag(b, 'streak') && 'streakS' in o) o = endStreak(o, 'offline', b, ev);\n", '')],
 'S7-unlock-off-by-one': [('src/sim/streak.ts', "s.farmLevel < tc(b, 'streak_unlock_farm')", "s.farmLevel <= tc(b, 'streak_unlock_farm')")],
 'S8-tap-does-not-restart-hold': [('src/sim/streak.ts', "streakHoldS: tc(b, 'streak_hold_s'), tapCreditCdS", "streakHoldS: s.streakHoldS ?? tc(b, 'streak_hold_s'), tapCreditCdS")],
 'S9-extra-coins-full-value(actions)': [('src/sim/actions.ts', 'addStreakExtra(o, value - saleValueCents({ ...s, streakS: 0 }, k, b, ctx))', 'addStreakExtra(o, value)')],
 'S11-MH-unfocused-not-suspended(tick)': [('src/sim/tick.ts', 'out = workerActions(out, dt, b, ev, !!fx?.suspended);', 'out = workerActions(out, dt, b, ev, false);')],
 'S12-no-reload-peak-on-pagehide': [('src/game.ts', "const p = streakOn(this.b) ? streakPeak(this.state, 'reload', this.b) : null; if (p) this.emit([p]);", 'const p = null;')],
 'S13-streak-entry-removed': [('src/sim/effects.ts', ENT + ',', '')],
 'S14-streak-entry-wrong-flag': [('src/sim/effects.ts', ENT, "{ id: 'streak', flag: 'golden', factor: s => 1 + (s.streakS ?? 0) }")],
 'S15-player-unattended-sale-gets-streak': [('src/sim/actions.ts', "const ctx = by === 'player' ? playerSaleCtx(!suspended) :", "const ctx = by === 'player' ? playerSaleCtx(true) :")],
 'S16-streak-applied-twice': [('src/sim/effects.ts', ENT + ',', ENT + ', ' + ENT.replace("id: 'streak'", "id: 'streak2'") + ',')],
 'T1-f1c-no-beforeEach-reset': [('tests/v5-f1c-effects.test.ts', 'beforeEach(reset); afterEach(reset);', 'afterEach(reset);')],
 'V1-drop-validateM5-call': [('src/config/balance.ts', '  validateM5(b.m4, W); // v5 F3: m4.flags (0/1, known names) + M5 tunable rules\n', '')],
 'V2-drop-streak-tc-key-check': [('src/config/balance.ts', "  if (m4On(b)) for (const [f, ks] of Object.entries(M5_TC_KEYS)) if ((b.m4?.flags as any)?.[f] === 1) ks.forEach(k => tcNum(b, k));\n", '')],
 'V3-tc-key-list-drops-streak_cap': [('src/config/formulas.ts', "'streak_decay_per_s', 'streak_cap', 'streak_tier_count']", "'streak_decay_per_s', 'streak_tier_count']")],
 'V4-validateM5-streak_cap-upper-unbounded': [('src/config/m5-rules.ts', '!(tc.streak_cap > 0 && tc.streak_cap <= 1)', '!(tc.streak_cap > 0)')],
}
for f, a, b in M[sys.argv[1]]:
    p = R / f; t = p.read_text(); n = t.count(a)
    assert n == 1, f'{sys.argv[1]}: {n} matches in {f}'
    p.write_text(t.replace(a, b)); print(f'applied {sys.argv[1]} to {f}')
