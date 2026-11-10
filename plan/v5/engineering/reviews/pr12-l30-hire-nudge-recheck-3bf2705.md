# Re-check PR #12 @ 3bf2705 (vs 94dfc06)
One commit; src (formulas, tracks, game, save, ui), tests, staging baseline CSV deleted. Read-only. Claude: 0 calls. /tmp copy with sibling product/.

## Verdict: PASS. The major is fixed; all claimed fixes verified.

## Items
- **Ruling:** decisions.md:259 ("Oct 17 00:28, Head of Product") and product/decisions.md:192 (00:29: extra = max(row, 0.15 × current Farm cost × markup); 3e3d61fd retired; sim re-pinned to late_curve.py ab928dc96d1c). The l30plus-spec.md:202 entry mirrors it.
- **Formula:**
  - formulas.ts: `1 + (mult−1)×(k−1)` (linear) replaces `mult**(k−1)`.
  - tracks.ts: trackBuyCost = `Math.max(row, extra)`. This matches late_curve.py:71 `max(c, share×farm_cost×(1+0.1×(L−F−3)))`, with k−1 = L−F−3 and share 0 below F40.
  - **Floor order:** TS floors before max, Python never floors; since row is an integer, max(row, ⌊x⌋) = ⌊max(row, x)⌋.
  - **Linear vs compound:** identical for k ≤ 2, which is the most an F+5 cap allows.
  - **Python cross-check:** I recomputed all 44 cells of b59c4e0d. 0 are below the row cost (row wins in 9), and the 8 pinned values in tests/l30plus.test.ts all equal the floored Python result.
- **floorSafe** (formulas.ts): `floor(round(x×1e6)/1e6)`. Exact for x < ~9e9 (costs here are ≤ ~1e6), and it fixes 0.29×100. A genuine x.9999995 rounds up by at most 1 coin, which is negligible.
- **Test count 678 → 665:** nothing deleted or skipped.
  - The l30plus suite ran once per CSV, and the retired baseline CSV is gone: 23 tests × 2 = 46 became 25 × 1 = 25 (−21).
  - hire-nudge.test.ts went from 8 to 16 tests (+8). Net −13.
  - The 2 skips are pre-existing (economy.test.ts, economy-copy.test.ts). No .only.
- **Flag-off:**
  - Game.hireNudgeActive and checkHireNudge both short-circuit on `!m4On` (game.ts), so a flag-off build gets no render, no telemetry and no hireNudgeDone write. hire-nudge.test.ts:106 asserts flag-off saved bytes equal a no-nudge build.
  - **Golden (a01faea harness):** GOLDEN1 2ab8ff02… and the GOLDEN2 pins are identical on stack base e38cf76, on 94dfc06 and on 3bf2705, so this PR adds no flag-off delta.
  - The harness does not match the a01faea main pins because of the stack base (m4/m4a-tracks-v3), not this PR. Parity with main is owed by the stack base, not by #12.
- **validate:** save.ts:193 deletes only `hireNudgeDone` on the parsed state when it is not 1. This happens after the checksum/required-field checks, so no other field is touched, and the next save drops the junk.
- **UI (§5 v1.1):** app.ts, hire-nudge.ts and styles.css only (markup, container query, 44px hit areas, one-button hint plus a separate dismiss). The state touched is the session-only dismissal and the gated hireNudgeDone. No sim or save change; SAVE_VERSION is still 6.
- **Runs:**
  - tsc clean; sync up to date.
  - vitest 663 pass + 2 skipped = 665. The golden file only fails to load at its in-repo path; that's PR #14's fix, not this PR.
  - check-globals (Chromium) PASS: [eggfarmExportTelemetry] only; refused boot [].

## Findings
- **NIT:** the code comment and the test name say "additive markup", but with the cap at F+5 the linear/compound distinction is unobservable. Note that in the comment so a later cap raise re-checks it against the Python.
