#!/usr/bin/env python3
"""Apply one named mutation to the #82 worktree (exactly one match per edit). Revert with git checkout -- src scripts."""
import sys, pathlib
R = pathlib.Path('/workspace/egg-farm-studio/qa/scratch/wt-pr82-b0b5c7c')
M = {
 'K1-validate-accepts-any-flag-value': [('src/config/m5-rules.ts', "    if (v !== 0 && v !== 1) fail(`flags.${k} must be 0 or 1`);\n", '')],
 'K2-sync-absent-flag-becomes-1': [('scripts/sync-economy.ts', 'const v = p[f] ?? 0;', 'const v = p[f] ?? 1;')],
 'K3-mapped-cols-drop-rest_recovery_mult': [('scripts/sync-economy.ts', "export const M5_MAPPED_COLS = ['leave_attended_window_s', 'rest_recovery_mult'] as const;", "export const M5_MAPPED_COLS = ['leave_attended_window_s'] as const;")],
 'K4-drop-rest-mult-gt0-guard': [('src/config/m5-rules.ts', "  if (has(tc, 'rest_recovery_mult') && !(tc.rest_recovery_mult > 0)) fail('tc.rest_recovery_mult must be > 0 (pause spec §6)');\n", '')],
 'K5-rest-mult-bound-0.4': [('src/config/m5-rules.ts', '!(tc.rest_recovery_mult <= 0.35)', '!(tc.rest_recovery_mult <= 0.4)')],
 'P1-ccr-isPaused-no-flag-gate': [('src/sim/pause.ts', "w.paused === true && flagOn(b, 'pause')", 'w.paused === true')],
 'P2-ccr-income-raw-paused-read': [('src/econ/income.ts', 'return !!w && !isPaused(w, b) && isOff(mood(w, b));', 'return !!w && w.paused !== true && isOff(mood(w, b));')],
}
for f, a, b in M[sys.argv[1]]:
    p = R / f; t = p.read_text(); n = t.count(a)
    assert n == 1, f'{sys.argv[1]}: {n} matches in {f}'
    p.write_text(t.replace(a, b)); print(f'applied {sys.argv[1]} to {f}')
