# Review: fix/toast-first-frame-main @ f122811 (topic #5, main merge delta)

Range a01faea..f122811, worktree /workspace/review-f122811. The branch has 9 toast commits (a01faea..a56b3a2), then `f122811` merges origin/main (acdbedc: M4-A tracks v4, F1 economy, vendor sims, release scans). The merge auto-merged (`git diff --cc` is empty), so every conflict-free-but-semantic interaction needs a manual check. The only place the two lines of work meet is `src/ui/app.ts` (toast glue), `src/ui/toast-place.ts` and `scripts/rc0-browser.mjs`.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 1 |
| minor | 1 |
| nit | 2 |

Verdict: fix finding 1 before merging. The M4-A milestone queue and the toast-v3 controller each work alone, but together they drop a toast.

## Findings

### 1. [major] The "Coop upgraded!" toast (or the first milestone toast) is silently lost when a Farm buy also reaches a milestone
- Where: `src/ui/app.ts:163-164` (`showToast`, `queueToasts`) with `src/ui/app.ts:515-522` (`render()`), and `src/ui/toast-place.ts:17-24`.
- Evidence:
  - On main (acdbedc), `showToast` added `.show` synchronously. `queueToasts` tests `toast.classList.contains('show')` as "a toast is busy, so queue behind it".
  - With toast-v3, a hidden toast only gets `.show` on the next frame (`toastController` sets `pending` and calls `raf`). Inside `render()`, `showToast('Coop upgraded!')` (line 517) is followed by `queueToasts(...)` (line 520) in the same frame. `.show` is still absent, so `queueToasts` takes the "idle" branch: `showToast(texts[0], true)` overwrites `toast.textContent` and sets `toastAtHud = true`. Only `texts.slice(1)` is queued.
  - This is a common case, not a corner case:
    - Coop tiers are F5, F10 and F20. Balanced tiers are `min(F,H,V) >= 5, 10, 15, 20, 25` (`balance.json` m4.milestones.balanced).
    - `hensCap = F + capOverFarm`, so Hens and Egg value can already be at L5 or higher when Farm goes 4→5. That one Farm buy then produces both the tier celebration and `balanced:1`. The same happens at F10 (`balanced:2`) and F20 (`balanced:4`).
  - Line 522 makes it worse. If the level also adds a customer slot, `showToast('Coop upgraded! +1 customer slot')` overwrites the milestone text again and flips `toastAtHud` back to false. The first milestone toast is then lost too.
  - The milestone ids are already `markMilestones`-ed and the tier is already `markCelebrated`. Nothing ever replays the lost toast.
  - On main the order was coop toast, then every milestone in sequence.
- Impact: a player who buys Farm L5/10/20 with Hens and Egg value already at that level sees one celebration, not two. The M4-A "never overwritten" guarantee in the `toastQ` doc comment (`app.ts:157`) is broken. This is a regression from the merge, since neither parent has it. It shows only with the M4 flag on. Flag-off is unaffected, because `pendingMilestones` returns `[]` when `m4On` is false.
- Fix: make "busy" include the pending settle and the exit fade.
  - Option A: return `{ show, busy: () => pending || d.shown() }` from `toastController`, and make `queueToasts` use `toastBusy()` instead of the `.show` class check. The coop toast then counts as busy, and the milestones queue behind it as on main.
  - Option B: have `queueToasts` always push and kick the drain.
  - Add a regression test; see finding 2.

### 2. [minor] No test covers the app.ts glue (the interaction in finding 1), and the browser checks would not catch it
- Where: `tests/toast-controller.test.ts`, `scripts/rc0-browser.mjs` (`b2`, `toastfirst`).
- Evidence:
  - The controller tests use fake DOM and clock, so they only cover the controller. They pass today even though finding 1 exists: the controller is correct in isolation, and the bug is in how `queueToasts` reads its state.
  - `b2` and `toastfirst` buy Farm L4→5 on the flag-off build (`m4.enabled` 0), so `pendingMilestones` is empty and `queueToasts` never runs.
  - No test references `queueToasts`, `toastQ` or `showToast`. I grepped `tests/`, `scripts/` and `engineering/`.
- Impact: a broken integration still passes every unit test and the rc0 toast sections.
- Fix:
  - Extract the queue (`queueToasts`, `toastQ`, `hide` chaining) into `toast-place.ts` as a pure function over the controller.
  - Unit-test: call `show('Coop')`, then `queue(['A', 'B'])` in the same tick. Assert the frame shows Coop, then A, then B, with nothing dropped.
  - Alternatively add an rc0 case with `m4.enabled` on and Hens/Egg value at L5 before the Farm buy.

### 3. [nit] Instant re-show swaps text and mode before the position moves
- Where: `src/ui/app.ts:163` and `src/ui/toast-place.ts:20`.
- Evidence: `showToast` sets `textContent` and `toastAtHud` immediately. In the visible or still-fading branch, `place()` only runs on the next frame. A toast replacing another in a different mode (HUD-anchored milestone → strip-anchored slot toast) shows the new text at the old `top` for one frame.
- Impact: one-frame jump on a rare path; cosmetic.
- Fix: none needed if finding 1 is fixed by queueing, since the second toast then goes through the queue. Otherwise call `place()` synchronously in the visible branch (the previous code did).

### 4. [nit] Narrative and scope notes
- `src/ui/app.ts:151-152` has a "main merge:" history comment inside a source comment. Review-id tags were already being stripped from tests in a56b3a2, so reword it as behaviour only (the toast-v3 doc in `toast-place.ts` is already behaviour-only).
- The range a01faea..f122811 is 154 files and +7126/-292. Only about 5 files (`app.ts`, `toast-place.ts`, `rc0-browser.mjs`, `rc2-toast-banner.test.ts`, `toast-controller.test.ts`) are toast work. The rest is main's M4-A/F1/vendor/release-scan content, reviewed under its own PRs (#31, #33, #34, #36). I did not re-review that content. I did confirm that `git diff acdbedc f122811` touches only the toast files (`app.ts`, `toast-place.ts`, `rc0-browser.mjs`, the two toast tests), so main's content came through unchanged.

## Checked, no finding
- No conflict resolution is hidden in the merge: `git diff --cc f122811` is empty. Against acdbedc, `app.ts`, `rc0-browser.mjs` and the two toast tests are the only toast-related changes.
- Controller logic (`toast-place.ts`) is sound:
  - The timer is armed only after `.show`.
  - `pending` is cleared before the work in the rAF callback, so a throw cannot wedge it.
  - The `clearTimeout` on every call plus the re-arm gives one live timer.
  - The seven controller tests match the stated state table.
- `toastTop` is pure, with six boundary tests (docked, banner, strip, fractional edges).
- Layout at 360/390/1280 (static reading only):
  - `.toast` and `.toast.below` CSS in `styles.css` (lines 150-152, 403-404) are unchanged by the merge.
  - The hidden state is off-screen.
  - `max-width: calc(100vw - 24px)` plus `nowrap` is unchanged.
  - Docked 1280 with no banner keeps the default slide, because `toastTop` returns null.
  - The pre-existing M4 HUD-anchored toast text (about 37 characters at 360px) was not measured; it needs the rc0 browser run.
- Main's own changes to the toast area (HUD-anchored toasts, `toastQ`) are preserved in the merged `app.ts`, which makes finding 1 a semantic rather than a textual loss.

## What I ran
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/toast-controller.test.ts tests/rc2-toast-banner.test.ts tests/m4a-tracks-ui.test.ts tests/art-ux-rc0.test.ts`: 4 files, 32 tests, all passed.
- `npx tsc --noEmit`: **not run**. The sandbox denied it twice, even though the brief allows it. Type-checking is unverified; please run it in CI or locally.
- No browsers (per brief), so `scripts/rc0-browser.mjs` `b2` and `toastfirst` were read, not executed. The 360/390/1280 per-frame assertions are unverified at runtime.
- Read: `git diff a01faea..f122811 -- src/ui/app.ts`, `git diff acdbedc f122811`, `src/ui/toast-place.ts`, `src/sim/tracks.ts`, `src/config/formulas.ts`, `src/config/balance.json` (m4 block) and the toast CSS.
- The worktree was not modified.

COUNTS critical=0 blocker=0 major=1 minor=1 nit=2
