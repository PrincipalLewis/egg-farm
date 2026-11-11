# Re-check: PR #25 fix/hidden-tab-offline @ 59cce62 (on 926a1e5), against the b3341bd review
Reviewer: CCR (read-only) · 2026-10-17 · worktree /workspace/wt-review-hidden-59cce62 (detached) · Claude calls: 0
Repros: /workspace/scratch/hidden-59cce62/{repro.ts,r3.ts,extra.ts}

## Verdict: PASS. OK to merge. No blocking or major findings left.

## Gates (run by me)
tsc OK · vitest 52 files / 562/562 · test:slow 11/11 · rc0 hiddentab PASS on chromium, firefox and webkit · build OK · check-globals (PORT unset, chromium): only `eggfarmExportTelemetry`, PASS

## Earlier findings
- B1 FIXED. Idempotency now uses a counter periodId (`src/game.ts` onHidden; `src/save/hidden-time.ts` keeps only the last id per Game). R1 stuck=false (savedAt lag 0 s), R2 (clock-back reuse)=false, and same-ms hide/show/hide no longer gets stuck.
- M1 FIXED. In the online branch the uncovered time is `min(gap,60 s) - simMs`. A no-frame 59 s hide gives the same state as one 59 s visible frame. 20 s of frames followed by 39 s with none gives the same state as 59 s visible (nextCustomerId 28 = 28), so there's no double credit with frames that did run. Ten no-frame 59 s hides match visible play.
- m1 FIXED. `deactivate()` and `refuseNewer()` call endHiddenOnFreeze after setting inactive, so the period settles as mode 'none'. In main.ts the TabLease callback calls `gRef.deactivate()` (main.ts:74), `canWrite` → save() → deactivate (main.ts:96), and onShown now runs even when the tab is frozen (main.ts:120). The wiring is correct, though it's only tested at Game level (see n1).
- m2 FIXED: kept hidden sim and uncovered time now count toward playedMs.
- n1/n2 FIXED: only the last id is stored; `capped = gap > budget`.

## The r3 gap (189 vs 206 customers) is expected, not lost credit
In r3 the game is hidden for 120 s, which is ≥ 60 s, so it takes the offline grant. That pays eggs at the offline rate, and customers don't arrive (C-AC36: same as close+reload). The "normal" comparison game sees one 120 s frame gap and simulates 60 s online. That's about 18 customers, the same as 10→28 in 59 s, which explains the 17 fewer customer ids. Eggs for the whole 120 s come through the grant instead.

## Re-probes, all OK
Exactly 60 s → grant of 240 eggs; 59.9 s → 0 eggs, online. Double hide plus double visibilitychange → 1 listener call, the second onShown returns 0. Clock back 1 h → 0 eggs, no pending change, period closed. Forward 1 day → awayS 7200 (2 h cap).

## New findings
- n1 (nit): m1 has no main.ts or browser-level test (only Game-level). Optional: add an rc0 row (hide, then lease-steal, then no welcome and no save).
