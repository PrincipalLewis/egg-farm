# Code review: #3 merge-forward to main acdbedc (rc1-ux-clarity-v3-main @ 6b0bfd7)

Reviewer: Code Reviewer. Range `8a49d35..6b0bfd7` (merge of origin/main `acdbedc` into rc1; parents `8a49d35`, `acdbedc`). Worktree `/workspace/review-6b0bfd7`, not modified.

## Verification limits (read first)

The session's permission mode (don't-ask) denied `npx tsc --noEmit` and `npx vitest run ...` when I tried them. I did not work around that. **Nothing below was confirmed by running code.** Every finding comes from reading the diff and the merged source. I also did not run browsers, as instructed. The 360/390/1280 layout comments are CSS-cascade reasoning, not measurements.

Please run on the merge SHA before QA:
- `npx tsc --noEmit`
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/m4a-*.test.ts tests/next-goal.test.ts tests/rc1-ui.test.ts tests/workers-v11.test.ts tests/income-bestbuy.test.ts tests/s2-6-qtag.test.ts tests/d5-goal-pill.test.ts tests/rc2-fmt.test.ts tests/sellall-label-grader.test.ts tests/orders.test.ts`

The worktree also has an uncommitted change to `tests/fixtures/product/economy.csv`. It is a CRLF-vs-LF line-ending flip only (git warns "CRLF will be replaced by LF"). It is not part of 6b0bfd7 and must not be committed.

## Method

- The merge-base is `2700804` (main as last merged at `595335d`). I compared the rc1 delta over old main (`2700804..8a49d35`, 50 files) with the delta over new main (`acdbedc..6b0bfd7`, 49 files). Every rc1 file that dropped out of the delta or changed shape is an add/add or both-sides conflict resolution. These are `src/econ/best-buy.ts`, `src/econ/income.ts`, `src/ui/app.ts`, `next-goal.ts`, `format.ts`, `orders.ts` and `styles.css`.
- `8a49d35..6b0bfd7` shows what the merge changed in rc1 files.
- `src/main.ts`, `src/game.ts` and `src/save/*` are taken from main as stated in the merge message. The rc1 delta there is empty, so no rc1 behaviour was reverted. The save, lease and IDB boot block matches `acdbedc`.

**Held up (read-only evidence):**
- `best-buy.ts` equals main's version. Main already carried the rc1 port and adds only the HENS and VALUE options behind `m4On`. With the flag off, rc1's depth-3 `bestBuy` and its `BUY_ORDER` tie-break are unchanged.
- `income.ts` keeps rc1's `grossSalesPerSec` and `salesStopped`, and `priceDollars` now goes through `salePriceCents`, which is `eggPriceCents(F, C)` with the flag off.
- `actions.ts` keeps rc1's ruling (b) in `manageAll`, and `workers.ts` keeps `showManageAll` (N>=1), `bulkManageAllowed` and `lowestManageTarget`. `tests/bot-m2.ts` only sends `manageAll` when 3 or more workers are low, so main's P4 pacing numbers are not perturbed.
- `balance.m4.enabled` is `0` in `src/config/balance.json`, so the shipped behaviour is flag-off. Findings 1–3 are latent until the flag flips.
- The main economy retune (yawn and Manage threshold 50%, new CSV 6dca24cd) arrives as intended. rc1 tests that hard-coded 40 were rewritten to read the balance (`workers-v11`, `rc1-ui`, `post-rc1`).

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 6 |
| minor | 2 |
| nit | 4 |

## Findings

### 1. [major] The goal hint no longer follows the shared M4 pick (M4A-41 broken on merge)
`src/ui/app.ts:404-412`, `src/ui/next-goal.ts:154-197`

**Evidence.**
- Main's `renderGoal` passed the shared pick into the goal: `goalHold.tick(selectGoal(g.state, b, rate, M4 ? hintPick?.key : undefined), imm)`. It also bypassed the 1 Hz gate when the pick changed: `!(M4 && hintPick?.key !== prevKey)` (`git show acdbedc:src/ui/app.ts` lines 394-403).
- The merge kept rc1's `GoalHysteresis(5000).tick(g.state, b, t, imm || goalImm)`. That method calls `selectGoal(s, b)` with no `shared` argument (`next-goal.ts:~176, ~184`).
- `hintPick` is assigned at `app.ts:409` and never read. `selectGoal`'s `shared` branch (`next-goal.ts:155`) is therefore dead in the app.
- With M4 on, the hint is driven by rc1's own `bestBuy` plus a separate 5 s/10% hysteresis. The Farm-tab highlight is driven by `DualPicker`. The two can disagree, which is the M4A-41 "hint === highlight" requirement. The hint also does not refresh immediately when the pick changes.

**Impact.** Latent while `m4.enabled = 0`. When the flag flips, the goal strip can name a different row than the highlighted Farm row for up to 5 s or longer, and can hold a stale target.

**Fix.**
- Either give `GoalHysteresis.tick` a `shared?: GoalKey | null` and forward it to `selectGoal` when `m4On(b)`.
- Or have `renderGoal` call `goalFrom`/`selectGoal(g.state, b, undefined, hintPick?.key)` directly when M4 is on.
- Restore the "pick changed" bypass of the 1 Hz throttle.
- Delete the dead `hintPick` otherwise.

### 2. [major] The Farm row loses its M4 highlight and `data-track` whenever it is also rc1's Best buy
`src/ui/app.ts:547` (with `:487`, `:521`)

**Evidence.**
- `farmTabHtml` does `upRowHtml('farm').replace('<div class="up"', ...)`.
- rc1's `upRowHtml` emits `<div class="up best-buy" ...>` when `isBest` is true (`bb.key === 'FARM'`). The literal `<div class="up"` (closing quote right after `up`) then does not occur, so the `replace` is a silent no-op.
- That row gets no `data-track="farm"` and no `best` or `best pending` class from `rowHl`, even when `DualPicker` picked Farm.
- With M4 on, `bestBuy` now includes HENS and VALUE options. The rc1 `★ Best buy` chip and the `.up.best-buy` outline on the Farm row are driven by the stateless `bestBuy`, while the Hens and Egg value rows only use the picker's `.best` outline. These are two different "best" signals on one tab, so you can get a yolk best-buy outline on Farm and a dashed `.best.pending` outline on Hens.

**Impact.** Latent (flag off). With M4 on, the highlight can be missing or doubled on the Farm row, and the M4A-18 contract that exactly one row is highlighted does not hold.

**Fix.**
- Build the track-row wrapper explicitly instead of string-replacing.
- Match with a regex `/<div class="up( best-buy)?"/`, or pass `{best, track}` options into `upRowHtml`.
- Suppress rc1's `isBest` chip and outline when `m4On(b)`, since the picker owns the signal there.

### 3. [major] The Farm and Collection rows lost main's M4 previews and show pre-track numbers
`src/ui/app.ts:464-477`, `:491`, `:507-509`

**Evidence.** Main's `upRowHtml` had an `M4` branch:
- Farm shows `Hens & Egg value up to L{hensCap(F)} → L{hensCap(F+1)}`.
- `Coop capacity` uses `trackCoopCapacity(F, s.hensLevel, b)`.
- The `Egg price` lines are hidden on the Farm and Collection rows.

rc1's rewritten `upRowHtml` replaced the whole block and the M4 branch was not carried over. The merged code uses:
- `S.hens(F, b)` (`cl('Hens ', ...)`)
- `S.coopCapacity(F, b)` (line 472)
- `Egg price` from `S.eggPriceCents` (lines 464, 473)
- the `+N eggs/s` chip from `S.eggsPerSec(F+1) - S.eggsPerSec(F)` (line 491)
- the "Limited by collecting" test against `S.coopCapacity(F, b)` (line 508)

`git grep "up to L"` finds nothing in src or tests, so the string is gone entirely.

**Impact.** With M4 on, Farm and Collection rows promise a Hens count, a coop capacity and an egg price that Farm and Collection no longer control (Hens and Egg value tracks do). The Farm tab then contradicts the Hens and Egg value rows beside it. The "Limited by collecting" hint can be wrong, because `coopCap` depends on Hens under M4.

**Fix.** Re-apply the `M4` branches in `upRowHtml`:
- Hens and Egg value cap line.
- `trackCoopCapacity` for capacity.
- Egg price lines suppressed.
- `coopCap(s, b)` in the limiter.
- A track-aware eggs/s chip: use `prodEggsPerSec`-style values, or hide the chip under M4.

### 4. [major] Main's later D5 block overrides rc1's `.goal-pill{height:auto}` fix (cuta3 #2 regressed)
`src/ui/styles.css:587` vs `:620` and `:626`

**Evidence.**
- rc1 has `.goal-pill{height:auto;min-height:var(--goal-h);align-items:center}` at line 587. It is commented "cuta3 #2 (v1.6.1 §4): grows only when 2 lines exceed 40px (large text)". It is the fix for the two-line goal label.
- The merge left both D5 and S2-6 blocks: rc1's at 452-470 and main's copy at 616-636. Main's copy is last in the file.
- Main's `.goal-pill{... height:var(--goal-h) ...}` at line 620 wins on equal specificity.
- Main's `@media (min-width:960px) and (orientation:landscape){... .goal-pill{height:var(--goal-h-lg)}}` at line 626 beats rc1's `height:auto;min-height:var(--goal-h-lg)` at line 462.
- `min-height` survives, but a fixed `height` means the pill can no longer grow.

**Layout.**
- 360/390: a two-line label is 2 × 17 = 34px in a 36px content box (40px less the 2 × 2px border). It still fits at default text size, so the default screenshots will not show it.
- Large-text or zoomed 360: a wrapped two-line label overflows the fixed 40px pill. Text spills past the pill border over the Collect bar gap, which is exactly what #2 fixed.
- 1280 docked: locked to 44px. Fine for one line.
- No unit test pins this. The height regex pin was deliberately dropped ("rc0 measures it"), and the browser run did not happen here.

**Fix.** Delete main's duplicate D5/S2-6 blocks (lines 616-636) and keep rc1's. Main's "M4A-18 highlight" rules at 605-614 are separate and stay. Or move `height:auto;min-height:...` after main's block. Then have QA re-measure `#goal .goal-pill` at 360/390/1280 with a large-text profile.

### 5. [major] `scripts/rc0-browser.mjs` still expects "Rested, refill below 40%"
`scripts/rc0-browser.mjs:581`

**Evidence.**
- `manageCaption` builds the text from `b.workers.energy.manage_prompt_threshold`. The merge brought main's retune (0.5), so the caption is now `Rested, refill below 50%`.
- The merge updated `tests/rc1-ui.test.ts` (to `${T}%`) but not the browser harness. The `p1refill` section compares against the literal `'Rested, refill below 40%'`.
- The other energy literals in the harness (30/35/20/10) are still at or below the threshold, so only this string is off.

**Impact.** The rc0 browser pass, which is the QA gate for this branch, fails section `p1refill` on the merge SHA. I could not confirm other rc0 sections that hard-code main-retuned values, because I did not run browsers.

**Fix.** Read the threshold from the page (`window.eggfarm.balance` or the `workers.energy` config) in the harness, or change the literal to 50%.

### 6. [major] No test exercises the merged M4 UI wiring, so findings 1–3 would all pass the suite
`tests/m4a-tracks-ui.test.ts`, `tests/m4a-pick-hysteresis.test.ts`, `tests/m4a-max-label.test.ts`

**Evidence.**
- The M4 tests call pure functions: `selectGoal(s, on, 100, r.hint!.key)`, `highlightPick`, `balancedStripText`. Nothing mounts `mountApp` or asserts `app.ts` wiring beyond source greps (`m4a-max-label.test.ts` greps for the MAX span).
- `m4a-pick-hysteresis` "M4A-41: 60 s hint === highlight" proves `selectGoal` obeys a `shared` key. It cannot see that `renderGoal` no longer passes one.
- Nothing asserts `farmTabHtml` output, the Farm-row fx lines under M4, or `data-track="farm"`.

**Impact.** A broken merge (findings 1–3) passes every M4 unit test. The strongest parity test, `m4a-flag-off` (sim trace hash), proves flag-off sim parity only, not UI.

**Fix.** Add a jsdom (or string-level) test of `mountApp` with `m4.enabled = 1`. It should assert:
- The goal label key equals the `.best` row's `data-track`.
- Farm row markup carries `data-track="farm"` when `bestBuy` picks FARM.
- Farm fx lines contain "up to L" and not "Egg price".

### 7. [minor] Duplicate D5 / S2-6 CSS blocks left behind by the both-sides merge
`src/ui/styles.css:452-470` and `:616-636`

Same selectors, same rules (`:root{--goal-h...}`, `.goal`, `.qtag`, `.queue{padding-top:9px...}`). Besides the override in finding 4, any future edit to one copy silently loses to the other. `tests/s2-6-qtag.test.ts` passes on either copy. Delete the second copy. The `:root{--goal-h:40px;--goal-hit:44px}` redeclaration at line 618 repeats line 454 and also duplicates the earlier `:root{--goal-h:40px;--goal-h-lg:44px;...}` at line 222.

### 8. [minor] `m4a-flag-off` now proves parity against a frozen old economy, not the shipping one
`tests/m4a-flag-off.test.ts:13-15`, `tests/rc1-balance.ts`

The golden hash was computed on main 4aadcbf with `tests/fixtures/economy.rc1.csv`. It is replayed with `rc1Balance`, not the live balance. After this merge the live balance is the F1 table (CSV 6dca24cd). The test no longer shows that the shipping config with the flag off reproduces main, which the file header still claims ("flag off = main bit for bit"). I could not run it, so I do not know whether the hash still holds with rc1's `sellAll`/`apply` changes. The action set in the trace has no `manageAll`, so rc1's ruling (b) is not exercised. Add a second, live-balance golden recomputed on `acdbedc`, or reword the header.

### 9. [nit] `.btn.maxed` is dead CSS and a test pins it
`src/ui/styles.css:42`, `tests/rc1-ui.test.ts:339`

MAX is now `<span class="maxed" aria-hidden="true">` (main), so `.btn.maxed{...}` matches nothing. `rc1-ui.test.ts:339` still asserts it exists. Drop the rule and the assertion, or assert `.maxed`.

### 10. [nit] rc1's updated `productionStopped` doc comment was reverted
`src/econ/income.ts:72`

`8a49d35` had "True when any hired worker is asleep/unpaid. Ruling (a): only used for the aria reason when the live rate is <= 0; never clamps the rate." The merged file has main's older "(Critic #3 / AC-R2)". It is only a comment, but it was a review fix (23a3798 #6/#7) and it is now wrong about when the function is used.

### 11. [nit] Comments and a test title still say 40% after the retune
`src/sim/actions.ts:82`, `src/sim/workers.ts:31`, `src/ui/workers-ui.ts:26,63`, `tests/rc1-ui.test.ts:87`

The threshold is read from balance and is now 0.5. "(0.4 = Yawning)", "above 40%", "only at <= 40%" and the test title "Rested, refill below 40%" are stale.

### 12. [nit] Orphan stale fixture kept
`tests/fixtures/product/economy.csv`, `tests/fixtures/product/README.md`

It is the pre-F1 table. Nothing reads it any more (`grep` finds no references), and the README says `tests/economy.test.ts` compares it to `../../product/economy.csv`, which that test no longer does. It is also the file with the CRLF noise in the worktree. Remove it, or note it as unused.

## Not findings, but worth recording

- `fmtMoneyShort(345_000_000)` is now `$3.5M` (was `$3.4M`) and `fmtCount`/`fmtMoney` roll up per main's FMT-1/FMT-2. `s2-3a` and `rc2-fmt` were updated to match. This is main's rule overriding rc1's floor and is deliberate in the test diff. Confirm Art & UX accepts it for the rc1 pops and cards.
- `src/ui/app.ts` `ghost()` now clips inside `.ghosts` (main) and no longer goes through `spawn()`/`animationend`. It is bounded by its own 1.5 s timer and the 30-element cap, so no leak. `.queue>.ghosts{position:absolute;inset:0}` takes it out of the flex flow, so the 360/390 strip height and the rc1 `padding-top:9px` band are unaffected.
- `window.eggfarmQaFitBanners` (rc1, behind `IOS_FLAG_ENABLED`) is not in `check-release-build.mjs`'s forbidden-hook list. It was already missing at 8a49d35. The release scan flags `eggfarm*` writes in the built bundle, so a leak would still be caught there.

## What I ran

- `git diff` and `git show` over `8a49d35..6b0bfd7`, `2700804..8a49d35`, `acdbedc..6b0bfd7` and `acdbedc:src/ui/app.ts`, plus `grep`/`sed` reads of the merged tree.
- `npx tsc --noEmit`: **denied by the permission mode; not run.**
- `npx vitest run ...`: **denied by the permission mode; not run.**
- No browsers (per instructions).
