# fix/hidden-tab-offline @ b3341bd — QA recheck (S2 hidden-tab over-credit)

**STATUS: handed to Saves QA (owner now, at 59cce62 / PR #25), per Head of QA 06:07 CEST. Not rerun by UI/Layout QA.**
2026-10-17 (CEST). Remote: origin/fix/hidden-tab-offline = b3341bdba2c1c5a07e032b88e276b17a40a96944 ✔ (on top of fix/rc1-qa-bugs-v4 7d52952 ✔). Worktree /tmp/qa-hto-b3341bd, `npm run build` + `build:qa`; runtime build ID **m3-rc1-pre+b3341bd** read from the loaded bundle (clean). Ports 4311–4315. One engine at a time.
Method: `hidden-tab-offline-b3341bd/qa-hidden.mjs` — init script overrides `document.visibilityState`/`hidden` and dispatches `visibilitychange`; `Date.now` frozen at the hide and advanced by H (the hook and Game both read Date.now); throttled frames run 1.5 s while hidden. Close+reload comparison = fresh context with the same save and savedAt = now − H. L15, coins $123.45, basket 40.
Evidence: `hidden-tab-offline-b3341bd/` (shots/, result-<engine>.json, run-<engine>.log, gate-*.log, summary.txt, merge-conflict-pr16-x-b3341bd.diff).

## Verdict: **PASS with one Major edge-case finding (H-1)** — core over-credit fixed in Chromium, Firefox and WebKit.
(Box reset 04:43 wiped /tmp and Playwright browsers; worktree rebuilt at b3341bd, firefox-1555/webkit-2370 reinstalled, Firefox run 04:56: 19/22, same 3 expected-copy/H-1 results as the other engines.)

| Check | Chromium | Firefox | WebKit |
|---|---|---|---|
| (1) 61 s hide → N = 244 exact; = reload (same formula, basket/coins/customers equal, coop ±2) | PASS | PASS | PASS |
| (1) 671 s hide → N = 2,684 exact (bug repro: was 215 arrivals); nextCustomerId unchanged → **0 arrivals** | PASS | PASS | PASS |
| (1) 3 h hide → N = 28,800 (2 h cap), awayS 7,200 = reload | PASS | PASS | PASS |
| (1) popup identical hide vs reload (61/671/3 h) | PASS | PASS | PASS |
| (2) 30 s / 59 s hide: no popup, no grant, played online | PASS | PASS | PASS |
| (3) 59.999 s: online, no popup; 60 s: grant 240 + popup "You were away 1m" | PASS | PASS | PASS |
| (4) fast hide/show 0.1 s: nothing; double hidden + double visible (671 s): exactly one grant; second separate 671 s hide: one more grant; 5×10 s hides: none | PASS | PASS | PASS |
| (4b) re-hide in the **same ms** as an already-accounted hide | **FAIL** | PASS | **FAIL** |
| (5) rc0 incl. "S2 hidden tab" row | 201/201 | 201/201 | 201/201 |
| Unit (vitest 2 workers) | 50 files, 540 passed, 2 skipped | | |
| build (tsc, sync-economy --check, check-release-build) | PASS | | |

(My first-pass "popup text" FAILs at 3 h / 60 s were my v2-copy expectations; this branch still ships the v1 popup, identical between hide and reload.)

## Finding H-1 — Major (low likelihood): game stuck "hidden" after a same-millisecond re-hide
Repro (Chromium, Firefox, WebKit): freeze Date.now; hidden → visible → hidden in the same ms; advance 671 s; visible.
Result: `isHidden` stays true, `hiddenSince` = old startAt; 671 s **not granted**, no popup; the hidden sim keeps running its 60 s budget (coop 100→800, 18 customer arrivals, 9 queued) and every save keeps writing the stale hide snapshot.
Cause: `accountHiddenPeriod` dedupes by `(game, startAt)`; the second hide reuses the same startAt (ms clock), so `seen.has(startAt)` returns null and `settleHiddenPeriod` never clears `this.hidden`.
Likelihood: needs two hides in one Date.now tick — rare, but more plausible with coarse timers (Firefox resistFingerprinting rounds to 16–100 ms) or rapid OS app-switch events. Suggested fix: key periods by a monotonic counter (or clear `hidden` when a duplicate startAt is rejected while `hiddenSince === startAt`).

## C-AC36 on PR #16 with the real hook — NOT RUN
Local merge 5248dd9 × b3341bd (scratch worktree, never pushed) → CONFLICT in src/game.ts (PR #16 stub `suspendForHidden/resumeFromHidden` vs `onHidden/onShown/settleHiddenPeriod`); 1 hunk, diff saved. Merge aborted, worktree removed. Needs an engineering rebase of #16 onto the hook (main.ts should call PR #16's `showWelcomeIfFree()` so the popup respects open dialogs and focuses Collect).

## Copy / popup wording observations (for Head of QA)
Verbatim popup text (card innerText, lines joined with " | "), Chromium; Firefox and WebKit identical:
| Case | Hidden return | Close + reload |
|---|---|---|
| 60 s | `Welcome back! \| You were away 1m \| +240 eggs \| Collect` | — |
| 61 s | `Welcome back! \| You were away 1m \| +244 eggs \| Collect` | `Welcome back! \| You were away 1m \| +246 eggs \| Collect` (61.5 s incl. load) |
| 671 s | `Welcome back! \| You were away 11m \| +2,684 eggs \| Collect` | `Welcome back! \| You were away 11m \| +2,686 eggs \| Collect` (671.5 s) |
| 3 h | `Welcome back! \| You were away 2h+ \| +28.8K eggs \| Collect` | same |
| 2nd separate 671 s hide | `Welcome back! \| You were away 11m \| +2,684 eggs \| Collect` | — |
- Seconds are dropped ("11m" for 671 s, "1m" for 61 s); v2 spec wants "Away 11m 11s".
- This branch shows the **v1** popup on hidden return: "Welcome back! | You were away 2h+ | +28.8K eggs | Collect" — "2h+" hides real away time and "+28.8K" is short-form; both are what v2 (PR #16) fixes. Fine for this fix; it will look different once combined.
- 60 s boundary reads "You were away 1m" — correct but terse; v2 shows "Away 1m".
- main.ts calls `ui.showWelcome()` directly on return — no focus move to Collect, and it could open over another dialog (PR #16 has `showWelcomeIfFree`).

## Not run
- Real OS tab backgrounding (used visibility override + clock mock).
- C-AC36 on the merged build (conflict).
