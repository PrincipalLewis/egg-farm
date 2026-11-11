# Review: fix-rc2-minors-2 @ 6a744d6 (recheck of dbc6948)

Range `9677d26..6a744d6`, worktree `/workspace/review-6a744d6`. Topic: recheck of `engineering/reviews/fix-rc2-minors-2-dbc6948.md` plus the #30 merge `a39375f`. The delta since dbc6948 is `35a37a6`, `181251c`, `a39375f` and `13fdec8`, merged in `6a744d6`. I read the full range diff and the surrounding code (`orders.ts`, `order-list.ts`, `toast-place.ts`, `app.ts`, `format.ts`, the rc0 script) and the spec `art-ux/rc2-order-sell-preview.md` §9 and §9.1.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 3 |
| nit | 4 |

Verdict: no code-correctness problem found, and nothing blocks merge. The code changes are small and look behaviour-preserving. The three minors are about the new `0/N` fallback: it is outside the signed-off spec, its rc0 coverage is thin, and it has no terminal step. One more is that the FM-AC5/7 flag, which is an open item and not a code item, left no written trace I could find.

I did not run browsers, so the 360, 390 and 1280 notes below come from code, spec and the rc0 script, not from measurement. `npx tsc --noEmit` was denied by the permission layer (three attempts), as in the last two reviews, so type-checking is not verified by me.

## Status of the dbc6948 findings

| # | Finding | Status | Evidence |
|---|---|---|---|
| 1 | rc0 'same' case does not create the pending-settle state | **Fixed (comment corrected)** | `rc0-browser.mjs` (~line 1126) now says the modal is open before the next render and that the pending-settle case is unit-tested in `toast-controller.test.ts`. That test exists: 'show() then the modal opens before the settle frame: nothing is drawn, the toast is held with its duration' (`toast-controller.test.ts:52`). Per dbc6948 it fails if the `raf` re-check is removed. The comment is now true. |
| 2 | §9 narrow branch had no fit fallback; fixtures only 360/1280 | **Fixed in code, partly in coverage** | `fitOrderText` (`orders.ts:29`) adds the `0/N` last resort. rc0 now runs 320, 360, 390 and 1280, with the `[0,0,181e9,'181B · $181B']` fixture added. See findings 1 to 3 below for what is still open. |
| 3 | Wiring asserted by source regex, tautological narrow test | **Mostly fixed** | The tautological `.replace` test is gone. It is replaced by behaviour tests for `fitOrderText` (6 asserts) and `pullToast` (3 cases). Wiring is still regex. See nit 4. |
| 4 | M-Tut-goal pulse vs FM-AC5/7 | **Open, by design (flagged)** | No code change. See finding 3. |
| 5 (nit) | `$1000B` just below the old T cut-off | **Fixed** | `orders.ts:21` now uses `count3` from `valueCents >= 1e11` (= $1B), which rolls over (999.5B → 1T). The test asserts `$181B` and `$1T` (from `1e9 × 99996¢`). |
| 6, 7, 8 (nits) | Drain delay after modal re-open, stale tutorial strings and doc, import tidiness | **Not touched** | Not in the brief's list. Still present (nit 3 below). |

## Findings

### 1. [minor] The `0/N` fallback is outside the signed-off spec, and it exposes that the spec's "worst case" row is wrong
`src/ui/orders.ts:29-32`, `art-ux/rc2-order-sell-preview.md:86-98`, commit `181251c`.

Evidence:
- Spec §9 gives exactly one narrow behaviour: at <=375 `Wants {N} · ${X}`. §9.1 gives the overflow fallback for partial counts: drop `/{want}`, then drop the count, and "the $ value is never cut". `0/N` is in neither section. Head of Art & UX also rejected alternative readings of the zero line ("Got 4 of 17"). `0/13` is the reading that M-Order-zero was created to remove. The designer only keeps the full string in the aria.
- The spec's table calls `Wants 181B · $1.78T` the "worst case" at 159 of 170px. Commit `181251c` says `Wants 3.98M · $9.94M` does not fit at 360, and that the 320 l1 is 124px. Both come from the author's own rc0 measurements, which I can't reproduce without browsers. If they are right, the table is not a worst case. A plausible mid-game order (3.98M eggs at $9.94M) would show `0/3.98M · $9.94M` at 360, and 360 is the design width.
- `art-ux/status.md` (last entry 09:28) has no entry that mentions `0/N` or the changed worst case. I could not see where Art & UX approved this.

Impact: possible spec drift, not a code bug. At 360 a common state could show the very `0/N` format the designer rejected. The rc0 §9 check would not notice (finding 2).

Fix: send the `0/N` fallback and the `3.98M · $9.94M` measurement to Art & UX and ask for a sign-off, or a different last step. For example, follow §9.1: `Wants 3.98M` first, then the value alone. Either way, record the decision in §9.1 and correct the worst-case row.

### 2. [minor] rc0 coverage of the fallback: nothing exercises it at 360, and 320 is permissive
`scripts/rc0-browser.mjs` (the §9 fixture loop in `rc2minors2`, ~line 1103-1108).

Evidence:
- Fixtures are `13 · $15.34`, `181B · $1.78T` and `181B · $181B`. The string that motivated the fallback, `Wants 3.98M · $9.94M` at 360, is not a fixture. If it were added at 360 the check would fail by construction, because `compact` is accepted only when `w < 360`.
- At 320 the `want` expression accepts either `Wants N` or `0/N` for every fixture, including `13 · $15.34`. A regression that always compacts at 320 still passes. The `m.w <= 170` clause is vacuous at 320, where l1 is 124px.
- Nothing asserts that the fallback is reached when it should be. The unit tests on `fitOrderText` use stubbed `fits`, so the real measure (`l1.scrollWidth`, `V.scrollWidth`) of the fallback path is only exercised if some fixture happens to overflow.
- The facade `fitsL1` has a side effect: it writes `E.textContent = t` on each probe. `fitOrderText` calls `fits` for the `eggs` form, the dropped form, and again for the `Wants N` check. The final write `if (E.textContent !== el.dataset.fitE) …` corrects it, so there is no bug. It is untested, but it is order-sensitive.

Impact: a regression in the §9 fit logic (or a wider real-world string at 360) would not show up in rc0.

Fix: add a 360 fixture for `3.98M · $9.94M` that accepts `0/3.98M · $9.94M` (after finding 1 is decided). At 320 accept compact only for the fixtures that don't fit as `Wants`, or assert `lines === 1` and the rendered form per fixture. Also add `181B · $181.2B`-width fixtures at 390 if a `$181.2B` form can still appear (it can't from `orderView`, so skip it).

### 3. [minor] FM-AC5/7 pulse scope is "flagged", but I found no written trace, and the gap remains
`src/ui/app.ts:725` (`retrigger(buy, 'pulse')`), `styles.css:50`; `product/collection/first-minute-proposal.md` FM-AC5, FM-AC7.

Evidence:
- The brief says the item was flagged to Art & UX. `art-ux/status.md` (last entry 09:28), `rc2-notes-b2-b3.md:62` ("pulses its Buy button") and the other art-ux docs I read have no entry about FM-AC5/7 and the goal-link pulse. Only `product/`, `qa/` and my own earlier review mention FM-AC5/7. It may have been sent by message. I can't see messages.
- The code is unchanged since dbc6948: `.pulse` is a 240 ms, `scale(1.12)` pulse, with no 1.2 s period, no outline, and no static outline under reduced motion. That is what FM-AC7 and FM-AC5 describe, if they apply to this PR.

Impact: only a process gap. If FM-AC5/7 apply to the tutorial goal link, the build does not meet them, and under reduced motion the link gives no visible cue.

Fix: record the answer where the next reviewer can see it: one line in `art-ux/status.md` or in the PR description. If the answer is "in scope", add a goal-pulse class with 1.06 peak, 1.2 s, an outline or glow, and a static 3 px outline under reduced motion.

### 4. [nit] The new pure helpers are covered, but the glue that calls them is still source-regex
`tests/rc2-minors-2.test.ts:47` and `:80`, `src/ui/app.ts:174-176`, `src/ui/order-list.ts:44`.

Evidence:
- The `pullToast` wiring test is now `toMatch(/const pullToast = \(\) => pullToastFrom\(/)`, and the `fitOrderText` wiring test is `toMatch(/const fe = fitOrderText\(e, narrow, fitsL1\)/)`. Both pass for a facade with a wrong sense. For example, `transitions: on => { toast.style.transition = on ? 'none' : '' }` (inverted), or `opacity: () => 1`, would pass vitest.
- The pure logic is correct. I traced `pullToast` against the old inline code: same order (hold before hide, transition off, remove `show`, reflow, transition on), same short-circuit (`getComputedStyle` only when `.show` is absent), same hold text.

Impact: small. rc0 catches an inverted facade (the toast would fade over the modal). This is lower than the old regex-only state.

Fix (optional): export the `PullDom` adapter as a tiny function over `HTMLElement` and test it with a stub element. This needs no jsdom.

### 5. [nit] `fmtCount` still has the `1000M` / `1000K` roll-over glitch in the range below the new cut-off
`src/ui/format.ts:2-8`, used by `fmtMoney` for order values under `1e11` cents.

Evidence: for `d = 999,990,000` (`valueCents = 99,999,000,000`), `n >= 1e6` gives `(999.99).toFixed(1)` = `"1000.0"` and the `.0` is stripped, so the value reads `$1000M`. The same applies to `$999,960` → `$1000K`. The dbc6948 fix moved the cut-off to $1B, which handles the B/T roll-over, but not the M and K cases. This predates the branch, and Art & UX status line 45 tracks the HUD `1000B` under PR #22.

Impact: a 5-character-wide glitch in a narrow value range.

Fix: use `count3` for every value `>= $1,000` in `orderView` (the spec says "3 significant figures at 1,000 and up"), or fix `fmtCount` once for the HUD and orders.

### 6. [nit] Order preview value and the sale chip are formatted differently from $100B up
`src/ui/orders.ts:21`, `src/ui/app.ts:392` (Sold chip via `fmtMoneyShort` / the pop via `fmtMoney`).

Evidence: the preview now reads `$181B` (3 sig, signed off in §9). The pop and the Sold chip are `fmtMoney`-based and read `$181.2B`. The comment at the pop says "same figure as the Sold chip". It is the same figure to 3 significant digits, not the same string.

Impact: cosmetic and endgame only. Matches the spec as written.

Fix: none needed. If the spec means one string everywhere, use `count3` on the pop too.

### 7. [nit] Leftovers
- `scripts/rc0-browser.mjs` (~line 1032): `preBw = withRow.find(x => !/^Sold!/.test(x.txt ?? ''))?.bw ?? sold[0]?.bw`. If the frame sampler never sees a pre-Sold row frame, `preBw` falls back to `sold[0].bw`, and the "chip width unchanged" check is then vacuous for the first frame. The assertion message prints `preBw`, so it's visible, but the check could silently pass. Fail it if no pre-Sold frame exists.
- Earlier nits 6 to 8 (`toastGate` drain after a modal re-open, stale `STEPS[].caption`/orphan JSDoc in `onboarding.ts`, import order and mid-file imports) are untouched. The new tests add two more mid-file imports (`import { fitOrderText }` in `rc2-minors-2.test.ts:73`, `import { pullToast }` in `toast-gate.test.ts:34`). New names and comments carry "review dbc6948 #N" tags, although `37524aa` removed such tags from test names.
- `fitOrderEggs` still exists and is used only by `fitOrderText`. Its JSDoc (`orders.ts:26-27`) is now two stacked doc blocks above one export. Cosmetic.

## Checked, no finding

- **`fitOrderText` logic.**
  - `/^Wants (\S+)$/` matches only the dropped zero form. `Wants 13 eggs` has two words, so it never converts when `eggs` is kept. Partial `4/17` is never touched.
  - On the narrow path the result is `Wants N` if it fits, else `0/N` without a further fit check. Cached via `fitKey`, which includes `narrow` and `l1.clientWidth`.
  - The unit test would catch: dropping the narrow branch, dropping the `0/N` branch, converting when it fits, converting partials, or keeping `eggs` when it doesn't fit. I walked each case against the assertions.
  - Gaps are in finding 1 (spec) and finding 2 (no step after `0/N`, so a value can still overflow). `.v` is `flex:none; overflow:visible`, so a too-wide line overflows instead of being cut. The "value never cut" rule holds, but "line fits" does not, and there is no §9.1 final step (drop the count).
- **3 sig from $1B.** `count3` and `fmtMoney` agree below $100B (`15.3B`, `1.78B`), so the change is only visible from $100B up and for the T tier. `1e9 × 99996¢` → `$1T`, `181e9 × 100¢` → `$181B`. Both are asserted.
- **`pullToast` extraction.** Behaviour-preserving; see nit 4. The three cases cover shown, fading, and hidden. A swap of `hold` and `hide` order would not be caught, but the `hold` text is read before the DOM changes, so the order does not matter in practice.
- **#30 merge `a39375f`.** Only the vitest guard and the rc0 assertions changed. The CSS guard matches `styles.css:375` (`font-family:var(--f-body);font-weight:700;font-size:12px`, `--f-body` = Nunito). The rc0 sampler records `bw` and `lines` (`rc0-browser.mjs:1022`). The `app.ts` change is comment-only. `13fdec8` only widens the 320 text check, and `aria` is still asserted.
- **Layout.** At 1280 (docked) `narrow` is false and l1 is wider, so `Wants N eggs` stays when it fits; unchanged from dbc6948. At 390 the `eggs` word is kept only when it fits. The 320 and 360 outcomes depend on the measurements in finding 1.
- **Scope.** The branch holds the #35 items, the merge of #30 and the merged PR #5 toast work. No unrelated changes in `9677d26..6a744d6` beyond the files in `git diff --stat`.

## What I ran

- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1` in two batches. Batch 1: `tests/rc2-minors-2.test.ts tests/toast-gate.test.ts tests/orders.test.ts` → 3 files, 39 tests, all passed. Batch 2: `tests/toast-controller.test.ts tests/rc2-toast-banner.test.ts tests/ftue-v11.test.ts tests/rc1-ui.test.ts tests/rc2-minors-sell-states.test.ts` → 5 files, 95 tests, all passed. The first attempt, which combined all eight files with a `tsc` call, was denied by the permission layer; I split it.
- `npx tsc --noEmit`: **not run.** Denied three times ("don't ask mode"). I read the new `PullDom` facade call in `app.ts:175-176` and the new imports by eye and found no type error, but that is not a check.
- Not run, per instructions: browsers and `scripts/rc0-browser.mjs`. The `rc2minors2` §9 fixtures at 320, 360 and 390, the 'same' toast case and the Sold-chip checks are unverified by me.
- Read: `git diff 9677d26..6a744d6` (src, tests, rc0 script), `dbc6948..6a744d6` for the new delta, `orders.ts`, `order-list.ts`, `toast-place.ts`, `format.ts`, the relevant `styles.css` rules, `art-ux/rc2-order-sell-preview.md` §9 to §9.1, and `art-ux/status.md`.
