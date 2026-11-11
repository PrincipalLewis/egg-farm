# Code review: m4-gate5-C @ bac1c27 (DELTA 24e3674..bac1c27)

Scope: 65cbf3e (A, shared: hold toasts, queue behind modals, focus) and bac1c27 (C, m4a-spec v1.15: non-modal card, outside taps register and never close it).
Files: `src/ui/tracks-explainer.ts`, `src/ui/app.ts`, `tests/m4-exp1-explainer.test.ts`, `scripts/rc0-browser.mjs`. Reviewed by reading the diff and the surrounding code (styles.css, app.ts).

**Limits of this review.** Midway through, Bash was denied in this session. I could not run vitest or `tsc --noEmit`, and I could not grep outside the files I read directly. Test and type status is therefore **unverified**. I read the test bodies by hand. Browser behaviour (layout at 360/390/1280) was not run, as instructed. Layout conclusions come from reading the CSS.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 1 |
| minor | 6 |
| nit | 2 |

The core of C is correct. The `click` capture listener closes only on a target inside the card. Outside taps are never `preventDefault`ed or `stopPropagation`ed. Esc and Enter-on-Got-it are consumed. The timer is cleared by `off()` on every exit path. The 8 s timer now starts when the card appears. The held toasts replay on `EXP_CLOSED`. The problems are in focus handling, the card/modal coexistence, and what the tests and the browser script actually prove.

## Findings

### 1. [major] Focus is yanked to the Upgrades tab on every close, even when the user's focus is elsewhere
`src/ui/tracks-explainer.ts:31-34` (`close`).

Evidence:
```ts
const tab = doc.querySelector<HTMLElement>('[data-tab].active');
(tab ?? (prev && prev.isConnected ? prev : null))?.focus({ preventScroll: true });
```
`close()` runs on Got it, a card tap, Esc, Enter and the 8 s timer. It never checks whether focus is still inside the card. Under v1.15 the user is meant to keep interacting with the game while the card is up. Two scenarios:
- A keyboard or switch user buys with Enter on a Buy button. After 8 s the timer fires and focus jumps from Buy to the Farm tab, which breaks the flow.
- The user opens Settings while the card is up (see #2) and is on a checkbox. The timer moves focus out of the `aria-modal` dialog to a tab behind it.

Impact: unexpected focus theft, an a11y regression that C makes reachable. P46-M1 only asks for focus to return when focus was on the card.

Fix: restore focus only if `el.contains(doc.activeElement) || doc.activeElement === doc.body`. Otherwise leave it alone. Add a test where focus sits on another button when the timer fires.

### 2. [minor] The card can coexist with a modal, and it paints above the modal scrim
`src/ui/styles.css:512` (`.tracks-exp` z-index 27, `#modal-layer` z-index 20), `src/ui/tracks-explainer.ts:37`.

A waits behind `#modal-layer.open` so there are never two dialogs. But v1.15 makes outside taps register and never close the card. A tap on the HUD gear while the card is up (the HUD is at y<56, the card at y≥72, so the gear is not covered) opens Settings or Confirm with the card still open on top.
- At 360 the card spans about y72 to y240+ (more with the refund line).
- The Settings dialog is tall: credits, iOS line, Reset.
- The first Esc then closes the card instead of the modal.

Impact: two stacked dialogs, which is the case A set out to prevent. This is also a spec conflict between A ("never two dialogs") and C ("never closes on outside taps"). Confirm with Art&UX.

Fix: either close the card when a modal opens (a `modal.classList` observer or an event), or document that the card is allowed to overlap and drop it below the modal (z-index below 20, which hides it behind the scrim).

### 3. [minor] Test adequacy: a broken implementation still passes the jsdom tests
`tests/m4-exp1-explainer.test.ts:84-100` (v1.15 test) and `:164-185` (focus tests).
- The v1.14 assertion that exercised `pointerdown` was removed and not replaced. The new test fires only `.click()` on Buy. An implementation that kept the old "outside `pointerdown` closes the card" handler would pass every jsdom test, because the test never dispatches `pointerdown`. A real tap is `pointerdown` followed by `click`.
- Only a click on a Buy button is tested as an outside tap. A tap on non-button chrome (scene, scrim, HUD) is not.
- "A tap on the card closes it and does nothing else": the test clicks `.tracks-exp p` and checks buys stays at 1. Nothing sits under the card in jsdom, so `preventDefault` and `stopPropagation` could be deleted and the test would still pass. Assert `defaultPrevented`, or attach a bubble listener on `document` and check it is not called.
- The Enter test dispatches on the Got it button only. It does not check that Enter with focus elsewhere (for example on Buy) leaves the card open. The `e.target === ok` guard is untested.
- The 8 s test (`:100-101`) does not assert that outside taps leave the timer running, so a reset-on-tap regression would pass.
- Held toasts are tested only with the Coop toast, not the multi-toast order or the `atHud` flag (see #6).

Fix: add a `pointerdown` + `click` outside-tap test, a test that an outside tap on a non-button area leaves the card open, and the assertions above.

### 4. [minor] The `g5` browser section defaults to variant B, which the shipped code no longer implements
`scripts/rc0-browser.mjs`, the `sections.g5` hunk: `MODE = process.env.G5MODE ?? 'swallow'`, then `ok('G5 B dismissing tap on Buy: 0 buys, card closed ...')`.

With `G5MODE` unset, the section asserts that a dismissing outside tap buys 0 and closes the card. After bac1c27 an outside tap buys 1 and keeps the card, so the default run fails against the shipped build. The variant B branches (`swallow`, "next tap on Buy buys exactly 1") are dead code for this branch.

Impact: a gate run that forgets `G5MODE=nonmodal` reports false failures, and the dead branches add noise.

Fix: default to `nonmodal` (or drop the variable) and delete the B-only assertions.

### 5. [minor] The "card never covers Buy/Collect at 360" checks are weak
`scripts/rc0-browser.mjs` (the `G5 C card does not cover Collect/Buy` checks), `src/ui/styles.css:512`.
- `hit(a, b)` returns `false` when either rect is `null`. The `ok(!hit(...))` assertions then pass vacuously if a selector misses or the card is absent. The Collect selector `'.collect, #collect, button.collect'` does match `#collect` in `app.ts:84`, but nothing asserts the rects are non-null.
- The matrix is 360x800, 390x844 and 1280x800 only. The app's minimum height is 640 (`#app{min-height:640px}`) and the sheet is 75dvh, so its top is at y=160 at 640. The card is `top:72px`, 296 wide, and about 165px tall without the refund line (about 210px with the two-line refund text at 264px inner width). That reaches roughly y=285, which overlaps the sheet header and the tabs row (about y232-276) at 360x640. Buy is probably clear, but this is not measured. I did not verify whether the fixture carries `migrationRefundCents > 0`.
- The Buy overlap is measured once, after `scrollIntoView` on the tabs. The Buy row can sit at other scroll offsets in the `.body` scroller. The card is fixed, so overlap is scroll-dependent.

Fix: assert the rects are non-null. Add a 360x640 pass with a refund fixture. Check Buy at the scroll extremes, or clamp the card's max-height.

### 6. [minor] Held toasts: flag loss, ordering, and stale feedback
`src/ui/app.ts:158-160`.
- The `EXP_CLOSED` handler replays `q[0]` with its `atHud` flag, but `q.slice(1)` goes into `toastQ` as bare strings. `toastQ` replays everything with `atHud=true` (`app.ts:160`, the `showToast(nx, true)` call). Non-HUD toasts (placed below the queue strip) come back at the HUD position.
- `showToast(q[0])` is called without checking whether a toast is already `.show`. It overwrites the visible one, and the pending `toastQ` items drain after the held ones, which reverses their order.
- Any toast fired during the 8 s is delayed up to 8 s and replayed stale. C encourages continued play while the card is up. If any action-feedback toast goes through `showToast`, a burst of taps replays N stale toasts at 1.3 s + 250 ms each after close. I could not grep the `showToast` callers to confirm which ones exist. `cantAfford` and "Empty" use shake/float text, from what I read.
- If the card is removed other than via `close()` (the browser script does this), `heldToasts` is never flushed.

Fix: store `[text, atHud]` in the queue. Respect an already-showing toast (`queueToasts` semantics). Consider dropping or de-duplicating held toasts that are not tier/milestone celebrations.

### 7. [minor] The focus fallback is skipped when the tab exists but is not focusable
`src/ui/tracks-explainer.ts:33`.

`tab ?? prev` falls back to `prev` only when no `[data-tab].active` exists. When the Upgrades sheet is `[hidden]` (Market open), `.focus()` is a silent no-op and `prev` is never tried. When the sheet is closed on mobile, the tabs sit off-screen (translateY 100%) and focus lands on an invisible element.

Impact: focus is lost to `body`, or sent off-screen. P46-M1 says "else where it was".

Fix: use the tab only if it is rendered and its sheet is open, or fall back to `prev` when `doc.activeElement` is still `body` after the focus attempt.

### 8. [nit] The `EXP_CLOSED` listener is never removed
`src/ui/app.ts:159`.

`mountApp` adds a `document` listener per call with no teardown. This is harmless in production, which calls it once. In the jsdom suite it accumulates across mounts, each holding a stale `toast` element. Register it once with an `AbortSignal`, or remove it on unmount.

### 9. [nit] Possible overlap with the workers intro card (unverified)
`src/ui/styles.css:257` (`.intro-a`, `top:calc(var(--hud-h) + 8px)` = 64px, z-index 26) against `.tracks-exp` (`top:72px`, z-index 27).

They occupy almost the same rectangle. The browser script marks `workersIntroA/B` as done in its fixture, so the combination is never exercised. In the old modal-style flow the outside tap dismissed the card; under C both can now stay up. I could not confirm whether a migrated save can reach `intro-a` while the card is open.

## Checked and found OK
- Click-vs-keyboard: Enter on the focused Got it is consumed at `keydown` (`preventDefault`), so no second click follows. Space goes through `keyup` to `click`, and the capture handler closes it.
- The `isConnected` guards plus `off()` prevent a double close or timer fire after the card is removed. This also covers the browser script's manual `remove()` calls.
- The modal gating is correct. A retry chain re-checks `shouldShowTracksExplainer` each time, so duplicate chains collapse to one card. The 8 s timer starts at the actual show, and the unit test covers it with fake timers.
- On Esc, `stopPropagation` at `document` capture keeps the sheet behind the card from closing. `window`-level listeners would still run first. I did not inspect where the app handles Esc.
- Scope: `app.ts` changes are limited to the toast hold and replay. No game rules were touched.

## What I ran
- `git log` and `git diff 24e3674..bac1c27` (242 lines), plus a full read of `src/ui/tracks-explainer.ts`.
- Read of `src/ui/app.ts` (toast and panels, 150-300) and `src/ui/styles.css` (panel, modal and z-index rules), and `tests/m4-exp1-explainer.test.ts`.
- **Not run (permission denied mid-review):** `npx vitest run ... tests/m4-exp1-explainer.test.ts` and `npx tsc --noEmit`. Status unknown, so please re-run both. One thing to watch under `tsc`: `off` references `t` before its `const` declaration, and `onKey` references `ok` declared after it. Both are valid at runtime because they are closures called later, but they are worth a glance.
- No browsers were run.

COUNTS critical=0 blocker=0 major=1 minor=6 nit=2
