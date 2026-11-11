#!/usr/bin/env python3
"""Apply one named mutation to the #91 @7d59dda worktree. (file, old, new, count): exactly `count` matches. Revert: git checkout -- src tests."""
import sys, pathlib
R = pathlib.Path('/workspace/egg-farm-studio/qa/scratch/wt-pr91-7d59dda')
MF, PS = 'src/save/m5-fields.ts', 'src/sim/pause.ts'
M = {
 'P1-anyFlag-omits-pause': [(MF, "'abilities', 'pause'] as const).some", "'abilities'] as const).some", 1)],
 'P2-sanitise-even-when-pause-off': [(MF, "if (m5Flag(b, 'pause') && o.workers && typeof o.workers === 'object')", "if (o.workers && typeof o.workers === 'object')", 1)],
 'P3-lockout-keeps-non-finite': [(MF, "id !== 'market_hand' || !fin(v) || v === 0)", "id !== 'market_hand' || typeof v !== 'number' || v === 0)", 1)],
 'P4-lockout-no-cap-clamp': [(MF, "if (v > cap) {", "if (false && v > cap) {", 1)],
 'P5-lockout-on-any-worker': [(MF, "id !== 'market_hand' || ", "", 1)],
 'P6-lockout-kept-below-unlock': [(MF, "if (!open || id !== 'market_hand'", "if (id !== 'market_hand'", 1)],
 'P7-paused-kept-below-unlock': [(PS, "(open && typeof w.paused === 'boolean')", "(typeof w.paused === 'boolean')", 1)],
 'P8-paused-non-boolean-kept': [(PS, "(open && typeof w.paused === 'boolean')", "(open)", 1)],
 'P9-lockout-zero-kept': [(MF, " || v === 0) {", ") {", 1)],
 'P10-no-required-pause-tc': [('src/config/m5-rules.ts', "  pause: ['pause_unlock_farm', 'pause_call_lockout_s'],", "", 1)],
 'P11-unlock-off-by-one': [(MF, "const open = farmLevel >= tc(b, 'pause_unlock_farm')", "const open = farmLevel > tc(b, 'pause_unlock_farm')", 1)],
 'P12-mutate-input-in-place': [(MF, "if (out === ws) out = { ...ws }; ", "", 3)],
 'P13-negative-lockout-kept': [(MF, "!fin(v)", "!(typeof v === 'number' && Number.isFinite(v))", 1)],
 'A1-new-paused-read-in-m5-fields': [(MF, "const n: any = sanitizePausedOnLoad(w, open);", "const n: any = sanitizePausedOnLoad(w, open || (w as any).paused === 1);", 1)],
 'A2-allowlisted-name-in-other-file': [('src/sim/streak.ts', "export const streakSaleFactor", "export const sanitizePausedOnLoad = (w: any): boolean => w.paused === 1;\nexport const streakSaleFactor", 1)],
 'A3-extra-read-on-allowlisted-line': [(PS, "(open && typeof w.paused === 'boolean')) return w;", "(open && typeof w.paused === 'boolean') || (w as any).paused === 1) return w;", 1)],
 'V3-M1-tc-keys-drop-streak_cap': [('src/config/formulas.ts', "'streak_decay_per_s', 'streak_cap', 'streak_tier_count']", "'streak_decay_per_s', 'streak_tier_count']", 1)],
}
for f, a, b, n0 in M[sys.argv[1]]:
    p = R / f; t = p.read_text(); n = t.count(a)
    assert n == n0, f'{sys.argv[1]}: {n} matches in {f} (want {n0})'
    p.write_text(t.replace(a, b)); print(f'applied {sys.argv[1]} to {f}')
