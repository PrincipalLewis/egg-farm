#!/usr/bin/env python3
"""Apply one named mutation to the #90 @27157b0 worktree (exactly one match per edit). Revert: git checkout -- tests."""
import sys, pathlib
R = pathlib.Path('/workspace/egg-farm-studio/qa/scratch/wt-pr90-27157b0')
F = 'tests/bot-m5.ts'
M = {
 'M0-author-guard-call-removed': [(F, '  assertNoDoubleModel(bal, K);\n', '  // assertNoDoubleModel(bal, K);\n')],
 'M1-throw-removed': [(F, '  if (both.length) throw new Error(', '  if (false && both.length) throw new Error(')],
 'M2-condition-weakened-golden-only': [(F, "SRC_M5_FLAGS.filter(k => flagOn(b, k))", "SRC_M5_FLAGS.filter(k => k === 'golden' && flagOn(b, k))")],
 'M3-caught-and-ignored': [(F, '  assertNoDoubleModel(bal, K);\n', '  try { assertNoDoubleModel(bal, K); } catch { /* ignored */ }\n')],
 'M4-ignores-m4.enabled': [(F, "SRC_M5_FLAGS.filter(k => flagOn(b, k))", "SRC_M5_FLAGS.filter(k => (b as any).m4?.flags?.[k] === 1)")],
 'M5-ignores-stack-on(false-positive)': [(F, "const both = K.on ? SRC_M5_FLAGS.filter(k => flagOn(b, k)) : [];", "const both = SRC_M5_FLAGS.filter(k => flagOn(b, k));")],
 'M6-any-flag(false-positive-on-unmodelled)': [(F, "SRC_M5_FLAGS.filter(k => flagOn(b, k))", "(Object.keys((b as any).m4?.flags ?? {}) as M5Flag[]).filter(k => flagOn(b, k))")],
 'M7-list-drops-pause': [(F, "['golden', 'streak', 'tapCoins', 'broody', 'abilities', 'pause'] as const", "['golden', 'streak', 'tapCoins', 'broody', 'abilities'] as const")],
}
for f, a, b in M[sys.argv[1]]:
    p = R / f; t = p.read_text(); n = t.count(a)
    assert n == 1, f'{sys.argv[1]}: {n} matches in {f}'
    p.write_text(t.replace(a, b)); print(f'applied {sys.argv[1]} to {f}')
