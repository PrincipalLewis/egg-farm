# Review: fix-rc2-minors-2 @ 1827a27 (recheck of 6a744d6)

Range `9677d26..1827a27`, worktree `/workspace/review-1827a27`. Topic: recheck of `engineering/reviews/fix-rc2-minors-2-6a744d6.md` (#1 no `0/N`, #2 rc0 per-fixture §9, #3 FM-AC5/7 scope), plus the new work since then: `eca7002` and `fcdda2c` (§9.1 fallback chain), `eb41368`, `072602e`, `cd3d316` (N3 hen z-index), `1827a27` (375 widths, SHOT_LOG, SHOTS_ALL_ENGINES). I read the whole `6a744d6..1827a27` delta (5 files: `orders.ts`, `order-list.ts`, `styles.css`, `rc2-minors-2.test.ts`, `rc0-browser.mjs`). I also read the older part of the range through the 6a744d6 review, and the whole of `styles.css`, the HUD/farm template in `app.ts`, and spec §9 and §9.1.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 4 |
| nit | 3 |

Verdict: no code-correctness problem found, and nothing blocks merge. The pure `fitOrderText` chain is correct, and I traced every unit assertion by hand against it. The N3 CSS is correct and does not override any earlier `.hud`, `.collectbar` or `.scene` position rule. The four minors are all test-adequacy or tooling gaps. Two of them (1 and 2) leave a spec decision unrecorded or unpinned.

**Limits of this review.** Part-way through the session the permission layer began denying every Bash call ("don't ask mode"), so I could not run vitest or `npx tsc --noEmit` on this SHA. I never ran browsers (per the brief), so layout at 360, 390 and 1280 comes from code, CSS and the spec, not from measurement. I also could not see the PR body, so I could not check #3 (FM-AC5/7). See "What I ran" below.

## Status of the 6a744d6 findings

| # | Finding | Status | Evidence |
|---|---|---|---|
| 1 | `0/N` fallback outside the spec | **Fixed in code.** The spec text and the worst-case row are still not updated (finding 2). | `fitOrderText` no longer produces `0/N`: `'Wants N'` that does not fit goes to the value alone, which is the §9.1 "drop the count entirely" step. The unit test asserts `''` for `Wants 13` / `Wants 3.98M`. rc0 now rejects `/^0\//` at every width (`!/^0\//.test(m.t)`). |
| 2 | rc0 §9 fixtures: no 3.98M at 360, 320 permissive | **Partly fixed** | A `[4, 9, 3976000, '3.98M · $9.94M']` fixture is added, and 375 is added to the width list. But the 3.98M expectation accepts both outcomes at 360 and 375 (finding 2). The 320 case is correct (`l1` is 124px, below every `Wants` string). |
| 3 | FM-AC5/7 scope for the goal-link pulse not recorded | **Not verifiable by me** | The brief says it is in the PR body. The PR body is not in the worktree and I had no `gh`. No code change since 6a744d6 (`.pulse` is still `scale(1.12)`, 240 ms). Please confirm the PR body has the line. |
| 4 (nit) | Wiring asserted by source regex | **Still open**, and it covers more now (finding 3). | |
| 5, 6, 7 (nits) | `fmtCount` `1000M` roll-over, preview vs chip format, leftovers | Not touched, not in the brief. | |

## Findings

### 1. [minor] N3 has no vitest guard, and the rc0 check does not assert that hens overlap the covered elements
`src/ui/styles.css:603-605`, `tests/rc2-minors-2.test.ts` (no CSS assertion), `scripts/rc0-browser.mjs` (N3 block, ~1155-1166).

Evidence:
- The CSS is right. `.scene{z-index:0}` works because `.scene` is already `position:relative`. `.hud,.collectbar{position:relative;z-index:1}` is the last rule in the file, so it overrides earlier `position` values. I read the whole file and found none: `.hud` and `.collectbar` have no `position`, `sticky` or `fixed` anywhere, and the docked `@media` blocks only set grid and width. `#panel-layer` (z 10), `#modal-layer` (20), `.onb` (25), `.toast` (35) and `#fx-layer` (30) are root-level and still outrank the HUD at z 1.
- The commit history shows this exact CSS being lost once: `eb41368` committed a swapped-in old `styles.css`, and `cd3d316` restored it. Nothing in vitest guards the three rules. The repo already has vitest CSS guards for similar cases (for example the Nunito 700 12px chip rule, `a39375f`). The rc0 browser run is the only check.
- The rc0 N3 check hit-tests only the text centres of `#coins`, `#basket`, `#meterText`, `#goal .goal-label`, `#goal` and `#collect`. `hensOverlap` is computed but only printed in the failure message, so it is never asserted. If no hen sits on those points in the fixture (360x420, `farmLevel 12`, `coop 30`), the check passes with the old CSS too. The commit message for `cd3d316` says the check failed against the old CSS in the author's proof run, so it is not vacuous today. I could not reproduce that.

Impact: a future revert, merge conflict or reordering of those rules passes vitest, and passes rc0 whenever the hens happen not to cross those exact points.

Fix: add a vitest guard in `rc2-minors-2.test.ts`. For example: `expect(css).toMatch(/\.scene\{z-index:0\}/)` and `expect(css).toMatch(/\.hud,\.collectbar\{position:relative;z-index:1\}/)`. In rc0, assert `hensOverlap === true` as a precondition (fail with "fixture no longer overlaps"), and hit-test the centre of each hen-versus-HUD and hen-versus-collectbar intersection rather than only the text centres.

### 2. [minor] The 3.98M fixture at 360 and 375 accepts both outcomes, and the spec still says `Wants 181B · $1.78T` is the worst case
`scripts/rc0-browser.mjs` (§9 loop, ~1108-1112), `art-ux/rc2-order-sell-preview.md:94,98`.

Evidence:
- `want = m.t === full && w > 375 ? full : m.t === valueOnly && (w < 360 || (w <= 375 && !specFits360)) ? valueOnly : 'Wants ' + txt`. For 3.98M at 360 and 375, `specFits360` is false, the 170px check is skipped, and `m.t` may be either `Wants 3.98M · $9.94M` or `$9.94M`. The check passes in both cases, as long as the line is one line and not clipped. So it cannot tell whether the string fits at the design width, and a font or engine difference that flips the result goes unnoticed. The commit that introduced the case says `Wants 3.98M · $9.94M` does not fit at 360, so the expected result is deterministic in Chromium. Pin it.
- The `ok()` name embeds `want`, which is computed from the result, so the test name changes with the outcome.
- At 360 the `$9.94M` form means a mid-game 3.98M order shows no count and no "Wants". That is what §9.1 prescribes for an order that does not fit, and `status.md` at 09:53 says Art & UX accepted the #35 Chromium shots. But §9 still lists `Wants 181B · $1.78T` as the worst case at 159 of 170px, and neither §9 nor §9.1 states what the zero line does after the count is dropped. The code comment cites "Head of Art & UX 09:26", which covers only the partial-count chain. The zero-line step (`Wants N` goes straight to the value alone, skipping a bare `3.98M · $9.94M`) is an engineering reading. It is a sensible one, since a bare count reads as delivered eggs, but it is not written down.
- The threshold is marginal, so Firefox and WebKit may differ from Chromium at 360. The `SHOTS_ALL_ENGINES` manifest runs will show it. I have not measured this.

Impact: no code defect. The fixture checks "no clip" for the 3.98M case but not "which form". The spec table is stale.

Fix: assert `$9.94M` exactly for 3.98M at 360 and 375 (or whatever Chromium measured), or make the check engine-aware. Ask Art & UX to add the 3.98M row to the §9 table and one sentence to §9.1 saying the zero line goes from `Wants N` to the value alone.

### 3. [minor] The new value-alone DOM glue is covered only by a source regex
`src/ui/order-list.ts:34,43,47`, `tests/rc2-minors-2.test.ts:83`.

Evidence:
- The pure chain is well covered. I traced each assertion at `:77-82` against `fitOrderText`:
  - `Wants 13 eggs`, narrow, fits ≤5 → `''`.
  - `1.23M/9.99M eggs`, narrow, fits ≤5 → `1.23M`; `() => false` → `''`; fits ≤11 → `1.23M/9.99M`.
  - `4/17 eggs`, fits ≤4 → `4/17`.
  - `Wants 3.98M eggs`, wide, fits ≤7 → `''`.
  - `Wants 181B eggs` wide → `Wants 181B`.
  
  These cover each branch of the chain. I did not run them (see above).
- The glue that turns `''` into a rendered line is not tested outside rc0: `vText` (`eggs ? ' · ' + val : val`), the `V.textContent` write inside `fitsL1`, and the final `E`/`V` write after the cache. The only vitest check on this file is `toMatch(/const fe = fitOrderText\(e, narrow, fitsL1\)/)`. A regression such as `vText` always returning the NBSP form (a leading `· $20.8M` with no count), or `fitsL1` forgetting to write `V` (the chain would measure the wrong text), passes vitest. The rc0 N2 check would catch it, via `m.t` and `x.e === '' ? /^\$/.test(x.v)`.

Impact: small, because rc0 covers it, but this is now the headline behaviour of the PR and has no unit-level check.

Fix: extract `vText` (and ideally the `E`/`V` write pair) as a tiny pure helper, for example `orderLineText(fe, val) → { e, v }`, and assert `{ e: '', v: '$20.8M' }` and `{ e: '1.23M', v: ' · $20.8M' }` directly.

### 4. [minor] `SHOTS_ALL_ENGINES` makes the three engines overwrite each other's PNGs, and the SHOT_LOG record is weak on attribution
`scripts/rc0-browser.mjs:15,27`, the `rc2minors2` section (`MS = MINOR2_SHOTS ?? ${SHOTS}/rc2-minors-2`).

Evidence:
- Before this commit, screenshots came from headless Chromium only. Now `shot` is true for any engine when `SHOTS_ALL_ENGINES` is set. Several shot names do not contain the engine: the `rc2minors2` set (`order-wants-…-${nm(w)}.png`, `order-fit-1.23M-9.99M-20.8M-…`, `n3-hens-under-hud-goal-360x420.png`), unlike the `orderFit11` ones, which end in `-${ENGINE}.png`. Running the script for Firefox and WebKit with the same `SHOTS` / `MINOR2_SHOTS` leaves one file on disk per name, from the last engine. `SHOT_LOG` appends a second line with a different `engine` for the same `path`. The manifest then lists one file twice with different engines, and only the last is true.
- The `SHOT_LOG` `ls` field is `'onboarding done (localStorage eggfarm.ui)'` for any non-empty `ls`, even if `ls` holds other keys. The `label` is the 7-hex `#buildTag` text. The designer's manifest template wants the full SHA; the log does not record it. This is only a gap if the template check is meant to use this file.
- It also adds a second `import … from 'node:fs'` at the top, next to the existing one.

Impact: the manifest sets for Firefox and WebKit can silently carry another engine's pixels. Designer checks that read the manifest would be accepting the wrong file.

Fix: add `-${ENGINE}` to every `rc2minors2` shot name when `SHOTS_ALL_ENGINES` is set (or default the output dir to `${SHOTS}/${ENGINE}`), and merge the `fs` imports. Optionally log the commit SHA once at start.

### 5. [nit] The fallback chain also collapses `✓ Ready`, and the rc0 order-fit assertions got looser
`src/ui/orders.ts` (`fitOrderText`), `scripts/rc0-browser.mjs` (`orderFit11`, ~732-737).

Evidence:
- `t = '✓ Ready'` matches neither `w` nor `r`, so the chain is `['✓ Ready', '']`. If it does not fit, the card shows the value alone with no ✓ cue. That is probably fine (the card keeps its green outline, the button reads Sell), and §9.1 does not mention it. The `bk >= 1e12 ? x.e === '✓ Ready'` rc0 clause still holds it at the tested widths.
- In `orderFit11`, `x.e === ''` is now accepted at every width, including 1280, and `v994` matches `'$9.94M'` at any width. A regression that forces value-only on wide screens would still pass those clauses. The `need18` row (`^1\.8M\/181B` or `✓ Ready`) still needs a visible count, so there is some protection. But if `orderFit11` is run at 320, a partial `1.8M/181B` row now legitimately drops to `1.8M`, so `need18` would be undefined and the check would fail. I could not see which widths it runs, so please confirm.

Impact: none today as far as I can tell.

Fix: accept `x.e === ''` only when `w <= 375` (and say why), and note the `Ready` collapse in §9.1.

### 6. [nit] Stale labels, and a broken intermediate commit
`scripts/rc0-browser.mjs` (~1190), `eb41368`.

- The check name `'M-Tut-parity tutorial captions identical at 360, 390 and 1280'` now compares 375 too (`[375, 390, 1280].every(...)`). Rename it.
- `eb41368` committed a swapped-in old `styles.css` and `cd3d316` restored it. The net diff is correct (`styles.css` is +3 lines against 6a744d6), but any bisect that lands on `eb41368` or `072602e..eb41368` has no hen z-index. Squash `eb41368` and `cd3d316` before merge if the branch is not already going in as a squash.

### 7. [nit] The fit cache key does not include font readiness
`src/ui/order-list.ts:42` (`key = …|${l1.clientWidth}|${narrow}`).

Evidence: this is not new, and I did not measure it. The fit decision is cached by width and text, not by whether Nunito 700 has loaded. `index.html` preloads only Nunito 400 and Fredoka 700. The Market sheet is `display:none` until opened, so the 700 face may be requested at the first open. If the first fit pass runs with the fallback font, the result is cached, and the real font arriving later does not change the key. Now that the 3.98M case is within a few pixels of the threshold (finding 2), a wrong first measure has more visible consequences (a clipped value, or a count dropped for no reason).

Fix (optional): include `document.fonts.status` or a font-loaded flag in the key, or re-run the fit on `document.fonts.ready` / `loadingdone`.

## Checked, no finding

- **`fitOrderText` logic.** `/^Wants (\S+)$/` matches only the already-dropped zero form. `Wants 13 eggs` (two words) never matches, so the count is not stripped while ` eggs` is kept. Partial counts `a/b` go `a/b` → `a` → `''`. Value is never cut because `''` is the last step and is not measured. A fits-then-return loop means each candidate is measured at most once per pass, plus one extra measure of the first candidate in the wide case, which is harmless (`fitsL1` only writes when the text changes).
- **Cache and `''`.** `dataset.fitE = ''` is not `null`, so `el.dataset.fitE == null` does not retrigger the pass. The final write after the cache sets both `E` and `V` from `fitE`, so a cache hit after a probe of a longer candidate still ends on the right text. `make()` runs `fill()` before the node is in the DOM (`clientWidth` 0, so every candidate "fits"); the key contains the width, so the first real pass after insertion re-fits.
- **a11y.** `E` is an empty span in the value-alone state. The full text is in the `.bar` progressbar's `aria-label` (`Customer wants N eggs` / `Order a of b eggs`), unchanged, and the new rc0 N2 check asserts `Order 1230000 of 9990000 eggs`.
- **N3 stacking.** `.hud` and `.collectbar` both come before and after `.scene` in DOM, so z 1 over z 0 gives the wanted order at any width. `.qtag` (z 1, inside `.queue`, which has no stacking context) ties with `.hud` and `.collectbar` and is resolved by DOM order. It sits in the queue strip, clear of both, so nothing changes. Flyers, floaters and `.qpop` live in `#fx-layer` or are `position:fixed`, so they are not trapped under the HUD. Layout-wise the change adds no box. Docked 1280: `.hud{grid-column:1/-1}` is unaffected.
- **375 widths.** The loop and the caption checks add 375 consistently. Expectations at 375 (`Wants 13 …` exact for 13 and 181B) follow from the 360 bar being narrower.
- **Scope.** Net diff since 6a744d6 is the five files above; no stray files, no unrelated source changes. The eb41368 CSS revert is fully undone in the net diff.
- **Earlier part of the range** (toast controller, toast-place, tutorial captions, sold chip): not re-reviewed beyond what the 6a744d6 review already covered; this delta does not touch them.

## What I ran

- Read: `git diff 6a744d6..1827a27` (all five files), `git diff eca7002~1..1827a27 -- src tests`, `git diff --stat 9677d26..1827a27`, `git log 9677d26..1827a27`, `orders.ts`, `order-list.ts`, the whole of `styles.css`, the HUD/farm template in `app.ts:60-120`, `index.html`, `tests/rc2-minors-2.test.ts`, spec §9 and §9.1 in `art-ux/rc2-order-sell-preview.md`, the tail of `art-ux/status.md`, and the 6a744d6 review.
- **Not run:** `npx vitest run …` and `npx tsc --noEmit`. The first Bash calls in the session (git log, diff, stat) worked. After that, every Bash call was denied by the permission layer ("don't ask mode"), including the vitest and tsc runs. I did not try to get round the denial. So **I cannot confirm that the tests pass or that the code type-checks at 1827a27.** My claims about the unit assertions come from tracing them by hand against `fitOrderText`.
- **Not run:** browsers and `scripts/rc0-browser.mjs` (per the brief). Everything about rc0 outcomes, widths in pixels, and the 3.98M fit at 360 is from the code and the commit messages, not measurement.
- Could not check: the PR body (for #3), and whether `balance`/price values in the N2 fixture (`farmLevel 0, collectionLevel 9`) really yield `$20.8M`. If they do not, the rc0 N2 check fails on its `/\$20\.8M$/` clause, which is a quick thing to confirm when someone runs rc0.
