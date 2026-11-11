# Review: fix/toast-first-frame-main @ 4938e94 (topic #5, main merge delta, recheck of f122811)

Range a01faea..4938e94, worktree /workspace/review-4938e94. Since the f122811 review there is one new commit, `4938e94`. It touches only `src/ui/app.ts` (+6/-5) and the new `tests/toast-queue-glue.test.ts` (+11). It adds a synchronous `toastBusy` flag so that `queueToasts` no longer relies on the `.show` class, which the toast-v3 controller adds a frame late. The remaining ~150 files in the range are main's M4-A/F1/vendor/release content, merged unchanged in f122811 and reviewed under PRs #31/#33/#34/#36; I did not re-review them.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 1 |
| minor | 1 |
| nit | 1 |

Verdict: the `toastBusy` fix correctly closes the "Coop upgraded! then milestone" case from f122811 #1 (first paragraph). The second path named in that finding (the slot toast overwriting a milestone toast) is still open at Farm L15. Fix finding 1 before merging.

## Findings

### 1. [major] A milestone toast is still overwritten at Farm L15 by the unconditional slot toast
- Where: `src/ui/app.ts:521-523` (`render()`), with `showToast` at `src/ui/app.ts:164`.
- Evidence:
  - Line 521 calls `queueToasts(...)`. The new `toastBusy` is false, so it takes the idle branch: `showToast(texts[0], true)` sets the text and `toastAtHud = true`, and pushes the rest onto `toastQ`.
  - Line 523 then runs in the same frame: `if (slotToastPending) { showToast('Coop upgraded! +1 customer slot'); ... }`. `showToast` always overwrites `toast.textContent` and resets `toastAtHud = false`. The controller is still pending its settle (`pending` in `toast-place.ts:17-24`), so the first milestone text is replaced before it is ever painted, and the toast loses its HUD anchoring.
  - `slotToastPending` is set in `renderQueue()` (line 348, called at line 522, so it is already set when line 523 runs). It is true on a Farm level where `queueMax` rises: `queue_max_step_levels` is 5, so Farm L5, 10, 15 and 20 (`balance.json` customers block, `orders.ts:56`).
  - Line 518 consumes the flag for L5, L10 and L20, which are coop tiers (`coopTier` in `state.ts:50`). **L15 is not a coop tier**, so only line 523 fires there.
  - Balanced tier 3 is `min(F,H,V) >= 15` (`balance.json` m4.milestones.balanced). Hens and Egg value are capped at F+3, so a player at F14 with H and V at 15 or more gets `balanced:3` and the +1 slot from the same Farm buy. The milestone id has already been dispatched as `markMilestones`, so it is never replayed.
  - This is the second half of f122811 #1 ("Line 522 makes it worse ... the first milestone toast is then lost too"). 4938e94 claims `review f122811 #1`, but its test and fix only cover `showToast` followed by `queueToasts`, not `queueToasts` followed by `showToast`.
- Impact: the M4-A "each gets its own toast, in order, never overwritten" guarantee (comment at `app.ts:158`) is still broken. One toast (`Balanced farm 3/5: +20% income`) is lost on a one-time event, M4 flag on only. Flag off is unaffected, because `pendingMilestones` returns `[]`.
- Fix: route the slot toast through the same busy check instead of overwriting. For example, when `toastBusy` is true, push `'Coop upgraded! +1 customer slot'` onto `toastQ` (or `queueToasts([...])`), and otherwise `showToast` it. Better, make `showToast` itself queue when `toastBusy` is true, with a separate "replace" path only for the repeat-toast case. Add a behavioural test for the `queueToasts` then slot-toast order (see finding 2).

### 2. [minor] The new test is a source-text regex, so a broken implementation still passes
- Where: `tests/toast-queue-glue.test.ts:5-9`.
- Evidence: the test reads `app.ts` as a string and matches single-line patterns. It never runs `showToast`, `queueToasts` or the controller. These broken variants would all pass:
  - `queueToasts` with the `else` branch changed to `showToast(texts[0])` (the HUD flag dropped).
  - The `toastQ.push(...texts.slice(1))` after `showToast` deleted, so the tail of a multi-milestone buy is lost.
  - Any reformatting that splits those lines across `\n` makes the test fail with a correct implementation.
  - Finding 1 itself is invisible to it.
  - f122811 #2 asked for the queue to be extracted into `toast-place.ts` as a pure function over the controller, with a same-tick test (`show('Coop')`, then `queue(['A','B'])`, asserting the order Coop, A, B and nothing dropped). The commit message cites #2 as addressed, but that was not done.
- Impact: no real regression protection for the queue/controller integration, which is exactly the bug class this branch fixes. The existing 7 controller tests do not cover it either.
- Fix: move `toastQ`, `showToast`, `queueToasts` and the `hide` chaining into `toast-place.ts` (for example `toastQueue(controller, dom, clock)`), with injected fakes as in `toast-controller.test.ts`. Test: same-tick coop toast then 2 milestones yields 3 sequential shows; a slot toast after milestones also queues; the busy flag clears only after the last hide.

### 3. [nit] Review-id tag still sits in a source comment
- Where: `src/ui/app.ts:151-152`.
- Evidence: the comment still carries "(Art&UX 02:54 #1)" and "toast-v3 / review 148591a" history tags. The "main merge:" prefix from f122811 #4 was removed, but the tags remain. The `toast-place.ts` doc comment is behaviour-only, which is the surrounding convention.
- Impact: cosmetic.
- Fix: reword the comment as behaviour only.

## Checked, no finding
- `toastBusy` lifecycle. Every `showToast` leads to exactly one `hide()` call: the pending settle arms the timer after `.show`, and the instant re-show re-arms it. The exceptions are a backgrounded tab (rAF paused, so busy stays true until it resumes, and milestones simply queue, which is correct) and a throw inside the controller's rAF callback. I found no stuck-true path.
- `hide()` keeps `toastBusy` true across the 250 ms gap when the queue is non-empty, so a milestone arriving in the gap is queued, not shown over the top. When `toastBusy` goes false at `.show` removal the fade-out is still running, and a new toast then takes the controller's "still fading, re-show at once" branch. Nothing is dropped.
- Tier celebration path (L5/10/20): line 518 consumes `slotToastPending`, so the slot text merges into the single coop toast and the milestones queue behind it. This is the f122811 #1 repro and it is fixed.
- Layout 360/390/1280 (static reading): 4938e94 changes no CSS and no placement code. `placeToast` and `toastTop` are untouched, so the previous layout conclusions stand. The longest known HUD-anchored text is `Balanced farm 5/5: +30% income` (30 characters) under `max-width: calc(100vw - 24px)` with `nowrap`. I did not measure the `Hens L{n}: ...` effect strings at 360px, which needs the rc0 browser run.
- Scope: `git show 4938e94 --stat` is two files, both toast. In scope.

## What I ran
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/toast-queue-glue.test.ts tests/toast-controller.test.ts tests/rc2-toast-banner.test.ts tests/m4a-tracks-ui.test.ts tests/art-ux-rc0.test.ts`: 5 files, 33 tests, all passed.
- `npx tsc --noEmit`: **not run**. The sandbox denied it ("don't ask mode"), as it did in the f122811 review, even though the brief allows it. Type-checking is unverified; please run it locally or in CI. The change adds only a `let` boolean and reads of it, so risk is low.
- No browsers (per brief). The `b2`/`toastfirst` sections of `scripts/rc0-browser.mjs` run flag-off, so they would not exercise any of this anyway.
- Read: `git show 4938e94`, `src/ui/app.ts` (lines 148-166, 340-352, 510-525), `src/ui/toast-place.ts`, `src/sim/tracks.ts`, `src/ui/tracks-ui.ts` (`milestoneToast`), `src/ui/orders.ts` (`slotAdded`), and the `customers` and `m4.milestones` blocks of `balance.json`.
- The worktree was not modified.

COUNTS critical=0 blocker=0 major=1 minor=1 nit=1
