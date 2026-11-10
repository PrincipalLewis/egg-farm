# PR #79 @ 6ece3e0: v5 F1b (evRng/brRng, focus clock, wall-clock timers) + F2 merge + Q-F1b-1 ruling. CCR review: **PASS** (0B/0M/0m/1n)

- PR https://github.com/PrincipalLewis/egg-farm/pull/79, head `6ece3e0ad194b2b4b086cc30cd8ff673c2bf73b2`, OPEN, **Draft**. The head moved during my first pass (a6b4fe4 → 6ece3e0); that pass is kept in pr79-a6b4fe4-ccr.md (superseded) and its analysis is reused where the code is unchanged.
- Own commits on top of #77 008bcca: a6b4fe4 (F1b, unchanged; range-diff `=`), merge 8b2286e (feat/v5-f1a-fields 008bcca), 6ece3e0 (Q-F1b-1, D-HOP-2026-10-29-06). Real base = **#77 008bcca**; needs #77 first.
- CI on 6ece3e0: gate and release-globals skipped (draft).
- Reviewer: Claude Code Reviewer, read-only, own detached worktree `/workspace/review-pr79-6ece3e0`. Gates were re-run after the ~21:56 CET box reboot. Evidence in /workspace/.pr79-ev/new; RNG harness output pr79-6ece3e0-ccr-rng-analysis.out.txt (script = pr79-a6b4fe4-ccr-rng-analysis.ts.txt with the worktree path changed). Claude calls used: 0/15.

## 0. File list
`git diff --stat 008bcca 6ece3e0`: 8 files, +269/−10: F1b's 7 files plus src/save/m5-fields.ts +4/−5 (6ece3e0), src/sim/timers.ts +3 (comment), tests/v5-f1b-clock-rng.test.ts +13.

## 1. The delta
- **Merge 8b2286e** (remerge-diff): one conflict, src/game.ts frame(): the resolution keeps both F2's `if (gap >= maxMs) this.state = m5Offline(...)` and F1b's `focusMs` + `advance(..., { focusMs, nowMs: t })` (game.ts:410-415). Correct: a ≥ 60 s gap gets F2's offline settle and `focusFrameMs` gives 0 focus for it.
- **6ece3e0, one ensureEvRng path:** save/m5-fields.ts drops its own `ensureEvRng` and `EV_RNG_SALT` and re-exports sim/rng.ts's. F2's removed copy used the same formula `mixSeed((rng ^ 0x6576526e) >>> 0)` and the same validity rule (`isU32` = integer, > 0, ≤ 0xffffffff = `isRngState`), so behaviour is unchanged. `grep mixSeed src/save` → none left. F2's only other seeding call is `drawGap` (m5-fields.ts:32), reached from the offline settle only when a golden egg is on screen (:83), i.e. after evRng was already seeded; it goes through the same function.
- **Q-F1b-1 ruled:** HoP accepted "seeded at the end of the first flag-on tick" (product/decisions.md:1344). My earlier N-2 (GE-AC33 only holds because no customer is drawn on tick 0) is therefore **closed as ruled**; the new timers.ts:14-17 comment documents it.

## 2. evRng = mixSeed(state.rng ^ K): still sound at this head
Harness re-run on 6ece3e0 (same as the first pass):
- 8 seeds × 10⁶ draws: 0 overlaps between main and ev/br; max |r| 0.0095 (noise).
- 2 h × seeds 1/7/42, all 13 flags on, evDraw + brDraw every tick: rng, state (minus ev/br) and events byte-identical to flags off.
- Save/load: evRngState saved and restored; pre-M5 save seeds from the loaded rng at its first tick, the same on every reload; applyOffline leaves rng and evRngState alone; hidden catch-up seeds the same with or without a clock.
- New with F2: `serialize` strips `brRngState` (m5Persist), so brRng really is re-derived on load now (first pass O-2 resolved, but see #77 m1: that relies on F2's duplicate list).
- Mutants R1–R6, G1, G3 killed on ecf8297 (top of stack); G2 equivalent (pr82-ecf8297-ccr-mutants.out.txt).

## 3. Gates (own worktree)

| Gate | Result |
|---|---|
| tsc | 0 |
| npm test | **1633 passed, 1 skipped** |
| golden suites | pass |
| test:slow | 16 passed, 1 skipped |
| build / check-globals (3/3) / build:html | 0 |
| verify 24 h seed 1 | **PASS**, trace **2c0d3ec3**, goldens **f90d1678 / a54c9cf9**, round-trip pass |
| verify 1 h | trace 198992ff078e |
| gitleaks `008bcca..6ece3e0` | no leaks |

`git status` clean. 0 import cycles; sim never imports save (save/m5-fields → sim/rng is save→sim, allowed).

## Findings
No Blocking, Major or Minor findings.

### N-1. The attended probe is read on every visible frame (and, from #80, every dispatch) even with every flag off
- Files: src/game.ts:411 (`!this.readOnly && this.attendedProbe()`; at the #80 head :413 via `attendedNow()`, plus :303 on every dispatch) against the comment at src/game.ts:389-391 ("Only read while M5 flags are on").
- Repro: tests/v5-f1b-clock-rng.test.ts "F1b Game wiring" asserts `calls >= 120` on the shipped all-off balance.
- Impact: none until UI wires `() => !dialogOpen()`, then a DOM query per frame in flag-off builds. Fix: skip the probe when `!anyM5FlagOn(this.b)`, or fix the comment.

### Observations
- **O-1 (by design, D-C4):** with broody on and golden not drawing, every page session replays the same brRng sequence (harness `brReloadReplays: true`). Accepted by sizing §12 D-C4 ("reproducibility per page session").
- **O-2:** Draft: no CI gate run on 6ece3e0 yet.

## Verdict: **PASS**. 0 Blocking / 0 Major / 0 Minor / 1 Nit / 2 observations
The single seeding path is behaviour-identical to F2's removed copy, the game.ts merge keeps both F2's offline settle and F1b's clock, and the evRng derivation is sound (no main-stream consumption or correlation; frozen once seeded; stable across save/load and offline). Goldens and trace unchanged. Claude calls used: 0/15.
