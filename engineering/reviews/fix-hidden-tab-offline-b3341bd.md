# Review: fix/hidden-tab-offline @ b3341bd (base 7d52952), S2 hidden-tab over-credit fix
Reviewer: Claude Code Reviewer (read-only) · 2026-10-17 · worktree /workspace/wt-review-hidden-b3341bd (detached) · Claude calls: 0
Repros: /workspace/scratch/hidden-b3341bd/{repro.ts,r3.ts} (run: `cd <worktree> && npx vite-node /workspace/scratch/hidden-b3341bd/r3.ts`)

## Verdict: CHANGES REQUESTED (1 blocking, 1 major). The design is right; both fixes are small.
The main path is correct. A hide of 60 s or more drops the provisional sim and pays the whole time through grantOffline. It uses the same `validSavedAt` rule and the same 2 h cap (a 1-day jump pays 7200 s). Pending eggs are settled first, and saves made while hidden write the hide snapshot, so a crash mid-hide reloads like a close at the hide. I also confirmed the cases below. A 59.9 s hide credits 0 eggs (online sim) and exactly 60 s goes to the grant. Ten 59 s hides give the same state as 600 s visible. A double visibilitychange, a double hide and a replay are each accounted once. A clock that goes back gives no grant. Neither savedAt nor saveSeq semantics change (the hidden save is stamped with the hide time), and the save schema is untouched, so there's no migration.

## Gates (run by me)
- tsc --noEmit: OK
- vitest: 50 files, 542/542 pass
- rc0 hiddentab: PASS on chromium, firefox and webkit (build:qa)
- npm run build: OK. check-globals (chromium): only `eggfarmExportTelemetry` in release, PASS
- Slow tests: there's no separate slow script on this branch; the slow cases run inside vitest (pacing, release-bundle) and pass.
- Other hidden-time paths: grep finds no other visibilitychange/document.hidden credit path. autosave.ts only saves. The RenderPump rAF/setInterval catch-up goes through Game.frame, which now takes the hidden branch.

## Findings

### B1 (blocking): startAt reuse leaves the game stuck in hidden mode, so progress is silently lost and saves stay frozen
`src/save/hidden-time.ts:28-29` and `src/game.ts:177-178`. `accounted` keys periods only by startAt, per Game. If a new hide has the same ms timestamp as an already-accounted period, `accountHiddenPeriod` returns null and `settleHiddenPeriod` never runs, so `Game.hidden` is never cleared. Two ways to hit it: hide→show→hide within 1 ms, or the clock going back and a later hide landing on an old startAt. After that, every show is ignored. `frame()` stays on the hidden branch, which freezes after 60 s even while the tab is visible. `save()` keeps writing the old hide snapshot stamped at the old hide time, so everything played after that point is lost on reload. The only escape is a reload.
Repro (r3.ts): `g.onHidden(t); g.onShown(t); g.onHidden(t); g.onShown(t+120000);` gives `isHidden=true`. Then 600 s of visible frames: nextCustomerId 28 vs 206 on a normal game, and the saved savedAt lags real time by the whole session (repro.ts R1: 300 s lag after 300 s of play). Also R2: a clock-back reuse gives the same stuck state.
It's unlikely in real use, but the impact is unbounded data loss for the session, and frozen-clock harnesses like rc0 (`Date.now` pinned to `__t0`) can reach it. Fix: key idempotency by a per-period token (a counter incremented in onHidden), or have the guard test only `game.hiddenSince === startAt` and clear it in settle, so it can't wedge.

### M1 (major): a short hide with no frames loses up to 59 s of online progress
`src/game.ts:186-193` (the `online` branch) together with `lastFrameAt = at` at `:187`. On a show under 60 s, only the `h.simMs` already simulated by hidden frames is kept, and `lastFrameAt` jumps to `at`, so the gap since the last hidden frame is never simulated. Browsers that suspend JS in the background (iOS Safari, and frozen or bfcache-suspended tabs) deliver no frames while hidden, so all of a 59 s hide is dropped. Before this fix, the next frame caught up. This is the "no lost credit" case, and C-AC36 only covers H ≥ 60.
Repro (r3.ts R3): `onHidden(t); t+=59000; onShown(t)` leaves the state unchanged, while 59 s visible advances (nextCustomerId 10→28, coopFullS 0→42.2). Fix: before emitting in the online branch, advance `min(gap, budget) - h.simMs` more. Add a test for a 59 s hide with no frames.

### m1 (minor): a frozen tab never clears `hidden`
`src/main.ts:120`. In `!frozen && g.onShown(...)`, a tab frozen while hidden never settles. It's harmless for now because the game is inactive, but if the tab guard ever un-freezes, the B1 symptoms follow. Consider calling onShown unconditionally (settle already handles `inactive`).

### m2 (minor): hidden online sim doesn't count toward playedMs / allowBackup
`src/game.ts:209-212`. The hidden branch returns before the `playedMs` accounting, so up to 60 s of kept hidden play doesn't count toward the `.bak` rotation threshold. That's a small difference from visible play.

### n1 (nit): `accounted` Set grows by one entry per hide for the session
`src/save/hidden-time.ts:24`. It's tiny, and it goes away with the B1 fix if you use a counter.

### n2 (nit): the `capped` flag in online mode can't be true
`game.ts:192`. `gap > budgetMs` means gap ≥ 60 s, which can't happen in the gap < 60 s branch while the budget equals offlineMinSeconds. Drop it or document it.

## Spec check
The design matches C-AC36 (product/collection/offline-popup-v2-spec.md:53) for every H ≥ 60, and the 60/61/671/3600/7200/20000 matrix test passes. Below 60 s the spec says nothing; M1 is a regression against pre-fix behaviour, not a spec breach.
