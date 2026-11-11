# Code review: rc1/ux-clarity-v3 (Cut A v3), a01faea..5d8a058

Reviewer: Code Reviewer. Worktree `/workspace/review-5d8a058` (read-only). Base: main a01faea. Topic: Cut A v3.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 1 |
| minor | 10 |
| nit | 5 |

**Verdict: no blockers. Fix major #1, or get the AC-R2 ruling in writing, before merge.**

**Not verified:** I could not run `tsc` or `vitest` (see "What I ran"). Every finding comes from reading the code. Type-correctness and the suite's pass/fail state are unconfirmed by me, so CI must show both green.

**What changed since my last review (ee4ff89).**
- `git diff ee4ff89..5d8a058 --stat -- src` is empty. The only changes are `scripts/rc0-browser.mjs` (the `orderFit11` section) and `tests/orders.test.ts` (one new `describe`).
- So findings #1-#11 below are carried over from `rc1-ux-clarity-v3-ee4ff89.md`. None were fixed. I re-checked each one against the 5d8a058 source, and all still reproduce.
- #12-#16 are new: they come from the last commit (5d8a058) and from `app.ts` code I had not read closely before.

**Scope.**
- The range contains the merges of main (2700804): seller-variance port, vendored economy sim, m4-design docs, save-recovery. I treated those as already reviewed on main.
- I read the branch-owned `src/` work: sim/workers and actions, econ/income and best-buy, next-goal, workers-ui, orders and order-list, format, app.ts, s2-economy-ui and rates.
- I read tests, CSS and `rc0-browser.mjs` for coverage and layout only.
- I did not run browsers, so layout at 360/390/1280 is judged from CSS and from what the rc0 sections assert.

---

## Findings

### 1. [major] Header net rate and worker banners claim "production stopped" when the sim keeps producing
`src/econ/income.ts:68-75` (`productionStopped`), consumed at `src/ui/app.ts:549` and `src/ui/workers-ui.ts:76-80`.

**Evidence.**
- `productionStopped` returns true if any hired worker of any of the four roles is Asleep or Unpaid.
- `rateView(cps, {stopped})` (`s2-economy-ui.ts`) then clamps any positive net rate to 0 and prints `⚠ ▼ $0.00/s` in red.
- The sim does not stop production in those cases:
  - Asleep Hawker: `hawkerDemandMult` returns 1 for any mood other than working/tired (`workers.ts:50-52`). Base demand continues.
  - Asleep Grader: `graderMult` keeps `asleep_bonus_share` (15%) of the bonus (`workers.ts:42-47`). The Grader banner itself says "bonus down to 15%".
  - Asleep Coop Hand: `collectPerSec` falls back to tap-only. Income drops but is not zero.
  - Asleep Market Hand: `incomePerSec` has no Market Hand term, so only the wage disappears and income rises.
- The non-Grader asleep banner (`workers-ui.ts:80`) reads "Asleep, production stopped". For the Hawker that is false.
- The doc comment on `isOff` (`workers.ts:12`) says "Off = produces nothing". It is true for the two wage workers and false for the other two roles.
- The AC-R2 text is not in the repo. `grep -rn "AC-R2\|production stopped" engineering docs tests` only hits code comments, so I cannot tell which reading the spec intends.

**Impact.**
- With an asleep Hawker or Grader hired, the HUD shows `⚠ ▼ $0.00/s` and the aria says "production stopped" while eggs sell and coins arrive.
- The Grader card says production continues at 15%, and the HUD says it stopped. The player sees a number that contradicts their coin counter.
- `income-bestbuy.test.ts:17-21` asserts `productionStopped(asleep coop hand) === true`. That locks in the questionable behaviour for the one role where it is plausible, and nothing tests Hawker or Grader.

**Fix.**
- Option A: make the clamp and `productionStopped` depend on computed live income, or only on roles that halt output (Coop Hand, and Market Hand if the spec says so).
- Option B: if AC-R2 really says "any asleep or unpaid worker means $0.00", record the ruling in `engineering/decisions.md`, and fix the Hawker and Grader banner copy and aria.
- Either way add a test: hired Hawker asleep with positive `incomePerSec` must not render `$0.00`, or pin the ruling.

### 2. [minor] `fmtGoalEta` can print "~1h 60m"
`src/ui/format.ts:47`. The same pattern is in pre-existing `fmtTimeToAfford`, `format.ts:28`.

**Evidence.**
- `m = Math.round((s % 3600) / 60)` is not carried into `h`.
- `s = 7170` gives `h = 1`, `s % 3600 = 3570`, `round(59.5) = 60`, so the output is `~1h 60m`.
- `fmtShortDur` in the same file floors, so it is immune. `tests/p1-oct16.test.ts:45-` has no case near an hour boundary.

**Impact.** The goal-strip status and the "Pays back in …" chips show an impossible time for the last 30 s of each hour.

**Fix.** Round total minutes first: `const tm = Math.round(s / 60); h = floor(tm / 60); m = tm % 60`. Add a test at 3570 to 3599 s past each hour.

### 3. [minor] Goal aria leaks the internal key: "Next goal: refill W4."
`src/ui/next-goal.ts:212`.

**Evidence.** `goalAria` for `state === 'refill'` interpolates `g.key`, which is `W1`..`W4` (a `BuyKey`). No test covers the refill aria.

**Impact.** Screen readers read "refill W4". The same text is appended to the goal button's aria-label at `app.ts:~417`.

**Fix.** Use a display name (`Next goal: refill the Grader.`) from a key to name map, and add a unit test.

### 4. [minor] A shown Refill goal on a hired W1-W3 can flip to "All upgrades done!"
`src/ui/next-goal.ts:186` (and `:176`, `:128`).

**Evidence.**
- `selectGoal`'s `live <= 0` branch returns `key: 'W1'|'W2'|'W3'`, `payback: 0`, for a hired worker.
- `buyOptions` only lists unhired W1-W3.
- On a due tick with a different pick, `GoalHysteresis.tick` skips both switch rules: `newPb <= 0.9 * 0` is false, and `curPb` is finite.
- It falls through to `goalFrom('W1', …)`, which finds no option and returns `{state: 'done', label: 'All upgrades done!'}`.
- It persists until the next due tick, up to 5 s. The click paths set `goalImm`, so only non-click transitions are affected, for example wage recovery making live income positive.

**Impact.** Narrow, because `live <= 0` is rare. When it hits, the strip shows "All upgrades done!" wrongly.

**Fix.** In `tick`, treat `state === 'refill'` (or `payback === 0`) as always replaceable by `next`. Add a hysteresis test: shown refill, then a different pick on a due tick.

### 5. [minor] Nav and docked Refill accessible name omits the visible text in cooldown and docked modes
`src/ui/workers-ui.ts:107-116` (`navManageView`), applied at `src/ui/app.ts:~583-586`.

**Evidence.**
- During cooldown the visible label is `0:28` (phone) or `Ready in 28s` (docked). The aria-label is `Refill available in 28 seconds`.
- This fails WCAG 2.5.3 Label in Name. The goal button on the same screen already got this fix (`app.ts:~415`, "Visible name must be in the accessible name"), so Refill is the odd one out.

**Impact.** Voice-control users saying the visible words cannot target the button. axe flags `label-content-name-mismatch` in a cooldown state.

**Fix.** Put the visible string in the name, for example `Refill, ready in 28 seconds` or `0:28 until refill`. Keep the 5 s aria throttle. Add a unit case on `navManageView`: label text is a substring of `aria.text`.

### 6. [minor] Single-worker Refill can spend the shared cooldown on an Unpaid worker
`src/sim/workers.ts:26` (`lowestManageTarget`), used at `src/sim/actions.ts:54`. `refillCount` counts the same worker.

**Evidence.**
- `needManage` and `canManageWorker` look only at energy ≤ 40%. They ignore `unpaid`. Ruling 2 says "Unpaid stays Unpaid", and Refill does not clear `unpaid`.
- With 2 hired (Unpaid Market Hand at 10%, tired Coop Hand at 30%), the single tap picks the lowest energy, which is the Unpaid hand. The Coop Hand stays tired for the 30 s cooldown.

**Impact.** The one tap ruling (b) offers is wasted on a worker that will not resume. The label still reads "Refill 1 tired worker".

**Fix.** Prefer non-Unpaid targets in `lowestManageTarget`, or exclude Unpaid from the single-worker path. This needs a PM ruling if "Unpaid also counts" was intended. Add a 2-hired test with one Unpaid worker.

### 7. [minor] Several tests are source-text greps and would pass on a wrong or inert implementation
- `tests/rc1-ui.test.ts:13` asserts `/\.goal-pill\{[^}]*height:var\(--goal-h\)/`.
  - It passes on the first `.goal-pill` rule. `styles.css:584` later overrides it with `.goal-pill{height:auto;…}`, so the test pins a rule that is not the effective one.
  - Many neighbouring `rc1-ui.test.ts` checks are exact CSS string matches. They break on harmless reformatting, and they stay green if a later override changes the cascade.
- `tests/workers-v11.test.ts:159-166` matches the text `navManageView(refillCount(s, b)` in `app.ts`. Any equivalent wiring fails it, and the same text in a comment passes it. Nothing exercises the real nav path.
- The `#nextIn` `fmtShortDur` format and the hysteresis refill path have no unit coverage that would catch #2, #3 or #4.

**Fix.** Keep the pure-function unit tests. For wiring, extract a pure `navRefillState(s, b, docked, prev, now)` that `app.ts` calls, and test that. Leave cascade and layout to the rc0 browser sections, and drop or relax the CSS regexes that duplicate them.

### 8. [minor] Worker copy hard-codes values that live in balance
- `src/ui/workers-ui.ts:79`: "Asleep, bonus down to 15%". `balance.json` has `asleep_bonus_share: 0.15`.
- `src/ui/workers-ui.ts:64`: "Rested, refill below 40%". `manage_prompt_threshold` is 0.4.
- Elsewhere this branch derives numbers from balance (`collection-copy.ts`: "deltas from balance, never hard-coded").

**Impact.** A balance retune silently makes the UI copy wrong.

**Fix.** Interpolate `Math.round(b.workers.grader.asleep_bonus_share * 100)` and `Math.round(b.workers.energy.manage_prompt_threshold * 100)`.

### 9. [nit] Three near-duplicate duration formatters
`fmtTimeToAfford`, `fmtGoalEta` and `fmtShortDur` in `format.ts` differ in floor versus round and in separator. This produced #2. One shared helper with a total-minutes carry would be safer.

### 10. [nit] Stale or dead CSS and comments
- `styles.css:335`: `.manage-all small, .manage-all .count{display:none}` matches no markup. The "(N need it)" markup is gone.
- `styles.css:133` `.hint .link` is superseded by the later `.hint.limit .link, .hint .link` rule at `:571`.
- `styles.css:577` and the `.long` class comment mention "Need 181.2B". See #15: that label cannot occur.
- `#p-upgrades:has(…)` at `styles.css:586` needs Safari 15.4 or later. Fine if that is the iOS floor, but it is unstated.

### 11. [nit] `count3` rounds up, so a partial order can read as complete
`src/ui/orders.ts` (`count3`). With 999,600 of 1,000,000 filled, the line shows `1M/1M` while the state is `partial` and the button says `Sell 1M`. Use floor for `have` and `rem`, or record it as accepted. `eggsLegacy` (floor to 1 decimal) is still used for the slot preview, so the two formats now differ.

### 12. [minor] New rc0 `orderFit11` assertion for the 181B row is vacuous in the `sell` pass
`scripts/rc0-browser.mjs:704` (and the `good` clause at `:700`).

**Evidence.**
- `need18 = r.find(x => /^1\.8M\/181B/.test(x.e) || x.e === '✓ Ready')`.
- In the `sell` pass (`bk = 1e12`) every order is `✓ Ready`. `find` therefore returns the first row regardless of whether the 1.8M/181.2B row rendered at all. The test title still claims "incl. 1.8M/181B row".
- In the `need` and `partial` passes the regex is meaningful, so those two are fine.
- The row-2 check `v994` depends on price being exactly 250¢ (farm 30 × default collection level). That is implicit coupling to the price formula. It fails loudly if the price changes, so it is not silent.
- The equal-width check `x.bw === r[0].bw` pins the CSS widths (88px, or 80px at ≤375, `styles.css:382,392`). That is a good check.

**Impact.** The "sell" pass cannot detect a clipped or missing 181B row. The worst case in the pass is the `Sell`/`✓ Ready` layout, which is less width-critical than the count line. Low risk but misleading.

**Fix.** In the `sell` pass look up the row by identity, for example `data-row="1"`, and assert on its button and value instead of on its text. Or drop the `|| x.e === '✓ Ready'` alternative and skip the check for `bk >= 1e12`.

### 13. [minor] New unit tests for "never a Need button" cannot fail
`tests/orders.test.ts:80-82`.

**Evidence.**
- `orderView` computes `sell = max(0, min(floor(basket), rem))`. `state === 'wait'` means `sell === 0`.
- With `basket >= 1` and `rem >= 1`, `sell >= 1`, so the `Need ${count3(rem)}` branch (`orders.ts:~26`) is unreachable. It is only reachable for `rem <= 0`, which has no test.
- The loop over baskets `[0, 0.5, 1, 3, 1e7]` can therefore only pass. It would also pass on the pre-fix code.
- The other new case, `0/3.98M eggs · $9.94M`, is a pin on existing `fmtMoney`/`count3` behaviour (`format.ts` is unchanged for those). It is fine as a regression pin but does not demonstrate a fix.

**Impact.** The test gives false assurance that the clip bug was fixed in `orderView`. The real fix is in `fitOrderEggs`/the order-list measure, which only the browser section covers.

**Fix.** Delete the dead `Need` branch (see #15) so the not-`Need` property holds by construction, and keep one test for `rem <= 0`. Cover the clip fix with a jsdom-free unit test on `fitOrderEggs` (drop " eggs" only when `fits` is false, never mid-word).

### 14. [minor] `document.fonts.ready` is not guarded
`src/ui/app.ts:428`: `void document.fonts.ready.then(…)`.

**Evidence.** `src/main.ts:35` already uses `document.fonts?.ready`. The `ResizeObserver` three lines above is guarded with `typeof ResizeObserver !== 'undefined'`, but this line is not.

**Impact.** In any environment without the FontFaceSet API (jsdom-based tests that call `mountApp`, or an old WebView) `mountApp` throws a `TypeError` at mount, after the DOM is built and before the first render. The game does not start.

**Fix.** `void document.fonts?.ready.then(…)`.

### 15. [nit] `Need ${count3(rem)}` order-button branch and the `.long` class are dead for real states
`src/ui/orders.ts:~26`, `order-list.ts:~37`, `styles.css:577-578`.

**Evidence.** See #13. Only labels such as `Sell 1.23M` (10 chars) can exceed 9 characters, so `.long` still has a use. The "Need 181.2B" reference in comments is stale.

**Fix.** Remove the branch (or assert it is only for `rem <= 0`) and update the comments.

### 16. [nit] Goal button aria-label repeats the label
`src/ui/app.ts:~415-425`. The label is `"${visible text}. ${goalAria(gl)}"`. `goalAria` begins with `Next goal: ${g.label…}`, so the goal name and ETA are read twice ("★ Farm · +12% income ~0:41. Next goal: ★ Farm, +12% income. Affordable in about 41 seconds."). Label-in-name is satisfied. Trimming `goalAria` to the part after the label, when the visible text is already prepended, would fix it.

---

## Layout notes (no browsers run)

- **Nav at 360:** four equal columns with a 64px minimum is 256px, which fits. The Refill count badge sits inside the button.
- **Goal pill:** two 17px lines fit in the 40px pill. `height:auto; min-height:var(--goal-h)` only grows it for a third line. The ResizeObserver, dock change and `fonts.ready` all refit the label.
- **Order line, 360/375/390/1280:**
  - The 88px button (80px at ≤375) is fixed, and the value is `flex:none` and never cut. The count shortens instead, and ` eggs` is dropped first.
  - The new `bw` equality check in `orderFit11` covers the width. See #12 for the one hole.
  - The fit cache key has no font signal. A late font swap that keeps `clientWidth` equal leaves a stale decision (low risk).
- **Sticky Refill bar:** `--refill-bar-h` is re-measured on html change, resize and dock change. A late font swap that changes only the bar height is not re-measured (cosmetic `scroll-margin-top`).
- **1280 docked:** the header Refill pill is hidden while the sticky bar shows (`styles.css:586`), and remains on Collection and Farm tabs. Consistent.

## Scope

- The branch carries 79 commits and about 4.8k lines. Much of that is merge-forward of main (m4-design docs, vendored sim, seller-variance, save-recovery) and is not Cut A. The Cut A work is in the `src/ui`, `src/econ` and `src/sim/workers` files named above.
- The last commit (5d8a058) is test-only and in scope. `.github/workflows/ci.yml` gained a `slow` job from main's seller-variance port. The `vite.config.ts` exclusion for `*.slow.test.ts` matches it.

## What I ran

- `git diff a01faea..5d8a058` and `git diff ee4ff89..5d8a058` (the latter touches only `scripts/rc0-browser.mjs` and `tests/orders.test.ts`), `git log`, and source reads of the files listed under Scope.
- `grep` over `src`, `tests`, `engineering` and `docs` to confirm: AC-R2 is not specified anywhere in the repo; `document.fonts` is used unguarded only at `app.ts:428`; and the exact line numbers cited above.
- `npx tsc --noEmit`: **blocked.** The sandbox denied the Bash call. The worktree also has no `node_modules`, so a local `tsc` is not installed, and I did not install anything because that would modify the worktree.
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/orders.test.ts`: **no results.** With no local `node_modules` it resolved to an unrelated cached vitest (`~/.npm/_npx/…`) and failed with `CACError: Unknown option --poolOptions`.
- No browsers were run, as instructed. The worktree was not modified.

COUNTS critical=0 blocker=0 major=1 minor=10 nit=5
