#!/usr/bin/env python3
"""Apply one named mutation to the #82 @2facc3f worktree (exactly one match per edit). Revert: git checkout -- src scripts."""
import sys, pathlib
R = pathlib.Path('/workspace/egg-farm-studio/qa/scratch/wt-pr82-2facc3f')
G = "Number.isFinite(tc.rest_recovery_mult) && tc.rest_recovery_mult >= 0"
CL = "const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));"
AF = "export const anyM5FlagOn = (b: Balance) => M5_FLAGS.some(f => flagOn(b, f));"
M = {
 # baseline set (b0b5c7c), K4 re-pointed to the new guard
 'K1-validate-accepts-any-flag-value': [('src/config/m5-rules.ts', "    if (v !== 0 && v !== 1) fail(`flags.${k} must be 0 or 1`);\n", '')],
 'K2-sync-absent-flag-becomes-1': [('scripts/sync-economy.ts', 'const v = p[f] ?? 0;', 'const v = p[f] ?? 1;')],
 'K3-mapped-cols-drop-rest_recovery_mult': [('scripts/sync-economy.ts', "export const M5_MAPPED_COLS = ['leave_attended_window_s', 'rest_recovery_mult'] as const;", "export const M5_MAPPED_COLS = ['leave_attended_window_s'] as const;")],
 'K4-drop-rest-mult-lower-guard': [('src/config/m5-rules.ts', f"  if (has(tc, 'rest_recovery_mult') && !({G})) fail('tc.rest_recovery_mult must be a finite number >= 0 (pause spec §6; 0 is valid, AC-P17)');\n", '')],
 'K5-rest-mult-bound-0.4': [('src/config/m5-rules.ts', '!(tc.rest_recovery_mult <= 0.35)', '!(tc.rest_recovery_mult <= 0.4)')],
 'P1-ccr-isPaused-no-flag-gate': [('src/sim/pause.ts', "w.paused === true && flagOn(b, 'pause')", 'w.paused === true')],
 'P2-ccr-income-raw-paused-read': [('src/econ/income.ts', 'return !!w && !isPaused(w, b) && isOff(mood(w, b));', 'return !!w && w.paused !== true && isOff(mood(w, b));')],
 # new: guard boundaries
 'R1-ge0-becomes-gt0': [('src/config/m5-rules.ts', G, "Number.isFinite(tc.rest_recovery_mult) && tc.rest_recovery_mult > 0")],
 'R2-drop-isFinite': [('src/config/m5-rules.ts', G, "tc.rest_recovery_mult >= 0")],
 'R3-upper-bound-0.36': [('src/config/m5-rules.ts', '!(tc.rest_recovery_mult <= 0.35)', '!(tc.rest_recovery_mult <= 0.36)')],
 'R4-upper-bound-0.3500001': [('src/config/m5-rules.ts', '!(tc.rest_recovery_mult <= 0.35)', '!(tc.rest_recovery_mult <= 0.3500001)')],
 'R5-upper-bound-strict-lt': [('src/config/m5-rules.ts', '!(tc.rest_recovery_mult <= 0.35)', '!(tc.rest_recovery_mult < 0.35)')],
 # new: [F3-no-literal] allowlist tightness
 'A1-new-named-literal-in-m5-fields': [('src/save/m5-fields.ts', 'export const BROODY_NEST_MAX_CENTS = 1e15; export const BROODY_SLOTS = 12;', 'export const BROODY_NEST_MAX_CENTS = 1e15; export const BROODY_SLOTS = 12;\nexport const BROODY_EXTRA_MAX = 7;')],
 'A2-allowlisted-name-in-other-M5-file': [('src/sim/timers.ts', AF, AF + '\nexport const BROODY_SLOTS = 12;')],
 'A3-expression-on-allowlisted-line': [('src/save/m5-fields.ts', 'export const BROODY_SLOTS = 12;', 'export const BROODY_SLOTS = 12 + 3;')],
 'A4-bare-literal-elsewhere-in-m5-fields': [('src/save/m5-fields.ts', CL, CL.replace('Math.max(lo, v)', 'Math.max(lo, v * 1.5)'))],
}
for f, a, b in M[sys.argv[1]]:
    p = R / f; t = p.read_text(); n = t.count(a)
    assert n == 1, f'{sys.argv[1]}: {n} matches in {f}'
    p.write_text(t.replace(a, b)); print(f'applied {sys.argv[1]} to {f}')
