#!/usr/bin/env python3
"""Apply one named mutation to the #92 @2d15dac worktree. Revert: git checkout -- src tests."""
import sys, pathlib
R = pathlib.Path('/workspace/egg-farm-studio/qa/scratch/wt-pr92-2d15dac')
MR, T = 'src/config/m5-rules.ts', 'tests/v5-m5load-pause-sanitize.test.ts'
M = {
 'F1-drop-required-pause-entry': [(MR, "  pause: ['pause_unlock_farm', 'pause_call_lockout_s'],", "", 1)],
 'F2-required-loop-never-throws': [(MR, "for (const k of keys!) if (!has(tc, k)) fail(", "for (const k of keys!) if (false && !has(tc, k)) fail(", 1)],
 'F3-only-unlock-required': [(MR, "pause: ['pause_unlock_farm', 'pause_call_lockout_s']", "pause: ['pause_unlock_farm']", 1)],
 'F4-only-lockout-required': [(MR, "pause: ['pause_unlock_farm', 'pause_call_lockout_s']", "pause: ['pause_call_lockout_s']", 1)],
 'F5-missing-key-silent-0': [(MR, "if (!has(tc, k)) fail(", "if (!has(tc, k)) tc[k] = 0; else if (false) fail(", 1)],
 'T1-strip-both-misspelt-noop': [(T, "const { pause_unlock_farm: _u, pause_call_lockout_s: _c, ...tcNoPause }", "const { pause_unlock_farmX: _u, pause_call_lockout_sX: _c, ...tcNoPause }", 1)],
 'T2-strip-unlock-misspelt': [(T, "const { pause_unlock_farm: _u, pause_call_lockout_s: _c, ...tcNoPause }", "const { pause_unlock_farmX: _u, pause_call_lockout_s: _c, ...tcNoPause }", 1)],
 'T3-strip-lockout-misspelt': [(T, "const { pause_unlock_farm: _u, pause_call_lockout_s: _c, ...tcNoPause }", "const { pause_unlock_farm: _u, pause_call_lockout_sX: _c, ...tcNoPause }", 1)],
 'T4-revert-to-91-F5-line': [(T, "flags: { ...b.m4!.flags, pause: 1 }, tc: tcNoPause } }", "flags: { ...b.m4!.flags, pause: 1 } } }", 1)],
}
for f, a, b, n0 in M[sys.argv[1]]:
    p = R / f; t = p.read_text(); n = t.count(a)
    assert n == n0, f'{sys.argv[1]}: {n} matches in {f} (want {n0})'
    p.write_text(t.replace(a, b)); print(f'applied {sys.argv[1]} to {f}')
