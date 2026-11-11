# Review: fix/rc2-minors-2 @ e9b9826 (PR #35)

Range `9677d26..e9b9826`, worktree `/workspace/review-e9b9826`. Topic: M-Order-zero, M-Tut-parity, M-Tut-goal, M-Toast-layer (`toastGate` on the PR #5 controller), plus the merges of #5 (a56b3a2) and #30. Spec: `art-ux/rc2-notes-b2-b3.md` lines 60-63.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 1 |
| minor | 4 |
| nit | 4 |

Verdict: not ready as is. Fix the major (a toast queued in the same frame as a modal opening still appears over the modal) or get the owner to accept it explicitly. M-Order-zero and M-Tut-goal look correct. M-Tut-parity matches the spec but drops two action verbs (finding 3).

I did not run browsers, as instructed, so the 320x568, 360, 390 and 1280 layout claims below are from reading CSS and code, not measurement.

## Findings

### 1. [major] A toast that is only queued (rAF pending) when a modal opens is not pulled and appears over the modal
`src/ui/app.ts:174` (`pullToast`), `src/ui/toast-place.ts:20-23` (`toastController`), call sites `app.ts:252`, `app.ts:277`; trigger path `app.ts:544` and `app.ts:756`.

Evidence:
- `toastController` does not touch the DOM when the toast is hidden. It sets `pending = true` and defers `show()` to the next `requestAnimationFrame`.
- `pullToast` returns early when `.show` is absent and `getComputedStyle(toast).opacity === 0`. A queued toast has neither, so it is not pulled and not held.
- `toastGate` only checks `blocked()` at call time. The toast was called before the modal opened, so it went straight to `rawToast`.
- Sequence on reload: `renderAll()` runs the tier check at `app.ts:536-544`. That calls `showToast('Coop upgraded!')`, which queues a rAF. Right after, `app.ts:756` runs `showWelcome()`, which adds `.open`. The rAF then fires and shows the toast while Welcome-back is open.
- This is the case the spec names: "'Coop upgraded!' must not draw over it on reload" (spec line 63).
- It is reachable whenever `celebratedTier` was not persisted before reload. `markCelebrated` is dispatched in `render`, and the toast and modal then happen in the same tick.
- The same race applies to Settings. A tap on the cog within one frame of a farm-tier purchase hits it.

Why the tests miss it:
- The rc0 `rc2minors2` cases open the modal first (`during`), or wait 400 ms after the toast (`before`). No case puts the toast and the modal in one frame.
- The unit tests for `toastGate` fake `blocked()` and never exercise the controller's pending state.

Impact: the invariant "no toast in any frame while `#modal-layer.open`" fails for the reload case the item was written for.

Fix, either of these:
- (a) Gate at the DOM-write point. Have the controller's rAF callback re-check `blocked()` and, if blocked, call `toastQ.hold(text, ms)` instead of `d.show()`. This covers every path, including a pending toast.
- (b) Make `pullToast` also treat `pending` as on screen. Expose `pending` from the controller and hold plus cancel it.
- Add a unit test: `controller.show()`, then block, then run the frame, and assert no `show` and that the text is held. Add an rc0 case that fires the buy and opens Welcome-back in the same task.

### 2. [minor] The last held toast ends the drain as soon as it is shown, so a later toast cuts it short
`src/ui/toast-place.ts:32` (`next`): `if (held.length) c.setTimeout(next, ...) else draining = false`.

Evidence: after the last held toast is shown, `draining` is false immediately. A `toast('D')` then goes to `show()` at once and `rawToast` overwrites the text of the toast still on screen. `tests/toast-gate.test.ts:18` asserts exactly that ("drain over: pass-through again"), right after C was shown.

Impact: contradicts the stated rule "one at a time, each its own duration + gap". It is unreachable today because there is only one toast type (`app.ts:544` is the sole `showToast` caller), but the doc comment and the test claim otherwise.

Fix: clear `draining` after `t[1] + TOAST_GAP_MS` for the last toast too, e.g. always `setTimeout(next, ...)` and let `next` clear `draining` when `held` is empty.

### 3. [minor] M-Tut-parity collapses panel-state captions, so the CTA verb is lost on the Sell and Buy targets
`src/ui/onboarding.ts:13` (`TUT_COPY`) and `src/ui/app.ts:717`.

Evidence:
- Before the change, at 390 with Market open the caption was "Tap **Sell** to earn coins.", and with Upgrades open (or docked) it was "Tap **Buy**.".
- Now step 2 always says "A customer! Tap them to sell eggs." and step 3 always says "Spend coins to collect more eggs per tap.".
- With Market open, or at 1280 where the queue chip is not the target, the ring and hand sit on a Sell or Buy button while the caption says "Tap them" or names no action.
- `tests/rc2-minors-2.test.ts:26` explicitly forbids the old strings.
- The spec says "The 390 strings are the source". Those strings include the panel-state variants, and the change keeps only the closed-panel ones.

Impact: a tutorial regression in action clarity on the highlighted button, in the market-open and Upgrades-open states (the latter on narrow widths too). It is a product call, not a defect against the literal spec.

Fix: confirm with Art & UX. If the 390 panel-state captions are canonical, keep the three states in `TUT_COPY` (a shared table keyed on step and panel state, not on width). If one string per step is intended, say so in the spec.

### 4. [minor] Most of the M-Toast-layer, M-Tut-goal and M-Order-zero wiring is checked by source regexes, so a broken implementation can still pass
`tests/rc2-minors-2.test.ts:14, 27-40, 46-48`.

Evidence:
- `order-list` aria: `readFileSync(...)toMatch(/bar\.setAttribute\('aria-label', v\.aria\)/)`.
- The tut-link handler: a regex over `app.ts` for `closest?.('.tut-link') ... openPanel('upgrades') ... scrollIntoView ... retrigger(buy,'pulse')`.
- `pullToast` and `closeModal` wiring: a regex over source text. It would pass with `pullToast` in a dead branch, or with the early return on the wrong condition (which is how finding 1 slipped through).
- The CSS check is a string match.
- The only behavioural tests are the pure ones (`orderView`, `toastGate`, `toastController`, `ftueGate`).
- `fitOrderEggs` is tested with a stub `fits`. The narrow (<=375) branch in `order-list.ts:44`, `/^Wants /.test(e) ? fitOrderEggs : strip`, is untested.

Impact: the real behaviour is covered only by `scripts/rc0-browser.mjs`, which is not in the vitest gate and was not run here.

Fix:
- Extract `pullToast` into a pure helper (DOM facade in, same style as `ToastDom`) and unit-test hold vs no-hold vs pending.
- jsdom-test the tut-link click if jsdom is available.
- Add a `fitOrderEggs` case for `Wants` at narrow.

### 5. [minor] The tutorial hint innerHTML is rewritten as the amount changes, which drops focus from the new `.tut-link` button
`src/ui/onboarding.ts:112` (`txt.innerHTML = text`), and the hint built at `onboarding.ts:30`.

Evidence: the hint text embeds the `$N to go` amount, so it changes on every dollar earned. The whole `.onb-txt` is replaced, so a keyboard user focused on the "Upgrades ›" button loses focus on each tick. The caption is also `aria-live="polite"`, so the whole sentence is re-announced on each change.

Impact: the link is not reliably keyboard-operable while coins are rising.

Fix: update only the amount text node and leave the button in place (build the button once, or diff on a stable prefix).

### 6. [nit] The comment says the toast z-index is 31, but the cascade gives 35
`src/ui/app.ts:170` ("`.toast` z 31 stays above #modal-layer 20 on purpose"). `styles.css:154` sets 31 and `styles.css:500` overrides with `.toast{z-index:35}`. Still above the modal at 20 but below `.recovery-layer` (40). Fix the comment. Toasts are not gated for the recovery layer or the rotate prompt, only `#modal-layer`. That matches the spec scope but is worth one line in the comment.

### 7. [nit] Duplicated default duration
`1300` appears in `app.ts` (`toastMs = 1300`, `showToast(..., ms = 1300)`) and as `TOAST_MS` in `toast-place.ts`. Use the constant.

### 8. [nit] Style and tidiness
- `app.ts:5` puts the `toast-place` import above the type imports, away from the other `./` UI imports.
- `tests/ftue-v11.test.ts:3` has two import statements for the same module joined on one line.
- `rc2-minors-2.test.ts` has imports in the middle of the file.

### 9. [nit] Scope
The range includes the PR #5 toast controller, toast-place and hire-banner work, and the #30 merge, which belong to other PRs. The diff is large for a "minors" PR (343 insertions). The merges are as described in the brief, so no action beyond making sure PR #5 and #30 land first or are reviewed on their own.

## Checked, no finding

- **M-Order-zero:**
  - `have === 0` only happens in the `wait` state, so "✓ Ready" is untouched, and the partial and filled states keep "n/N eggs".
  - `aria-label` is now refreshed when it changes, not only on `aria-valuenow`, so it updates the moment `have` goes 0→1 even when the value is unchanged.
  - The fallback `Wants 3.98M` → `0/3.98M` never cuts mid-word and is reapplied through the fit-key cache.
  - On narrow widths `Wants` goes through the fit path instead of always dropping " eggs" (which would have produced "Wants 13" anyway).
  - `v.aria` is a plain number string, so it is safe in the HTML attribute.
- **M-Tut-goal:**
  - NBSPs are preserved and unit-tested.
  - The button is `pointer-events:auto` inside a `pointer-events:none` overlay.
  - `min-height:44px` with `margin:-12px 0` keeps the line box about 20 px tall, so the bubble does not grow. The bubble stays under `max-width:280px` at 320.
  - The handler sets `tab='collection'` and opens Upgrades only when not docked. The target is the same `uRow .btn.buy` the tutorial uses.
  - The hint is only shown while the gate is closed, and only for the first 15 s, then it hides. That is existing behaviour.
- **M-Toast-layer, release paths:** `closeModal` is the only path that removes `.open`, including the Reset-confirm cancel path and Esc, so `released()` always fires. The `draining` flag cannot double-schedule, because `next` is only scheduled by itself or by `released()`, and `released()` returns while `draining` is true.
- **toastController:** no regressions to the PR #5 controller from the merge. Its 8 tests and the 6 `toastGate` tests are meaningful: they assert ordering, re-arm and mid-drain re-block.

## What I ran

- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc2-minors-2.test.ts tests/toast-gate.test.ts tests/toast-controller.test.ts tests/rc2-toast-banner.test.ts tests/ftue-v11.test.ts tests/orders.test.ts`: 6 files, 56 tests, all passed.
- `npx tsc --noEmit`: **not run.** The tool call was denied twice by the permission layer ("don't ask mode"), and I did not try to work around it. Someone with permission should run it.
- Not run (per instructions): browsers, `scripts/rc0-browser.mjs`. The `rc2minors2`, `toastfirst` and `b2` sections are unverified by me. The layout notes above are from reading CSS and code only.
- Read: the full diff, `onboarding.ts`, `toast-place.ts`, and the surrounding `app.ts` modal, toast, panel and tutorial code, plus `art-ux/rc2-notes-b2-b3.md`.
