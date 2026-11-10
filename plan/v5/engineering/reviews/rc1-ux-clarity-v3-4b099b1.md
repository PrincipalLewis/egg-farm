# Code review: rc1-ux-clarity-v3 @ 4b099b1 (Cut A v3)

Range: `a01faea..4b099b1` (165 commits, 154 files, +7394/-480), worktree `/workspace/review-4b099b1`, branch `rc1-ux-clarity-v3`.
Reviewer: Code Reviewer. Static review only. **`npx tsc --noEmit` and `npx vitest run ...` could not be run (Bash denied them, see "What I ran"), so nothing below is backed by a green or red test run.**

Relation to the previous review (`rc1-ux-clarity-v3-b765e14.md`): `b765e14..4b099b1` is one commit that changes one string in `scripts/rc0-browser.mjs:581`. No `src/` or `tests/` file changed. I re-read the cited code at 4b099b1 and re-confirmed every earlier finding. Findings 1-15 below are the b765e14 findings, still open and re-verified. Finding 16 is new.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 1 |
| minor | 7 |
| nit | 8 |

Verdict: no blocker found by reading. Finding 1 (major) needs a Product or Art & UX ruling before merge. The tsc and vitest gates still have to be run by someone with permission. None of the b765e14 findings were addressed in the new commit.

## Findings

### 1. [major] Farm-row "Limited by collecting ›" is shown almost permanently, so it carries no information
`src/ui/app.ts:495-496`

Evidence: the condition is `isF && !max && S.eggsPerTap(C, b) <= 0.5 * S.coopCapacity(F, b)`. With the shipped balance, eggsPerTap = 5 + 5C and coopCapacity = 50 + 50F, so the hint shows whenever C <= 5F + 4. At F=1 that is C<=9. At F>=5 it is every Collection level (max 30), so it always shows. The spec (`product/farm/rc1-upgrade-clarity-spec.md:35,83,131`) fixes the copy, the target tab and the screen-reader text, not when the link shows. The branch moved it from the Collection row to the Farm row and changed the proxy, with no test and no stated rule.

Impact: nearly every Farm card carries a "Limited by collecting" nudge for the whole game, even when the player is demand-limited or sales-limited in the income model (`incomePerSec` = min(eggs/s, demand/s, collect/s)). It trains players to ignore it and sends them to Collection upgrades that may add 0% income.

Fix: drive it from the income model. Show it only when `collectPerSec(s, b) < min(eggsPerSec, demandPerSec)`. Or get Product to confirm "always on" is intended. Add a unit test for the condition (none exists; `rc0-browser.mjs` only checks the layout).

### 2. [minor] Docked (>=960 landscape) next-goal pill is 40px, not the `--goal-h-lg` 44px; cascade override, untested at 1280
`src/ui/styles.css:461` vs `:586`

Evidence: line 461 (docked media) sets `.goal-pill{height:auto;min-height:var(--goal-h-lg)}` (44px). The later unconditional line 586 sets `.goal-pill{height:auto;min-height:var(--goal-h);...}` (40px). Same specificity, later source order wins, so at 1280 the pill is 40px. `.goal` (line 461) is `min-height:44px;padding:0`, leaving a 4px dead strip under the pill. The only geometry assertions are in `rc0-browser.mjs` (`taps`) at 360 and 390. `tests/rc1-ui.test.ts` pins the base rule by regex and cannot see the override.

Impact: the docked strip is 40px against a 44px layout spec, and the hit area is taller than the visible control.

Fix: scope the line-586 rule with `:not()`, or move the docked media block after it. Add 1280 to the `taps` section and assert `pill === 44` when docked.

### 3. [minor] `bestBuy` (depth-3 search) plus `optionGain` run every rendered frame while the Upgrades sheet is open, always at 1280 docked
`src/ui/app.ts:470,473` (in `upRowHtml`, called from `render()` each rAF); `src/econ/best-buy.ts`

Evidence: at Farm >= 8 with all workers unlocked, `options()` returns about 6 entries, so one `bestBuy` walk is about 258 `incomePerSec` evaluations, and `optionGain` walks the tree again. Permutations are not deduplicated. The result depends only on farm level, collection level, worker moods and grader tier, not on coins or time.

Impact: about 500 `incomePerSec` evaluations per frame. Cheap on desktop, real main-thread work on low-end phones and WebKit (`app.ts:160` already flags WebKit perf). Worst docked, where the sheet is permanently open.

Fix: memoize on (farmLevel, collectionLevel, graderTier, mood bucket per worker), or compute in the 1 Hz goal tick and share with the card renderer.

### 4. [minor] `aria-label` on a plain `<div class="up">`; dead ternary in the label
`src/ui/app.ts:497-500`

Evidence: the card root has no `role`, so `aria-label` on a generic element is prohibited by ARIA 1.2 (axe: `aria-prohibited-attr`) and most screen readers ignore it. Inside the `aria` template, `${og.gain > 0 ? ... : ''}` is dead: the outer condition at line 497 already requires `og.gain > 0`.

Impact: the "Adds N percent income. Pays back in ..." summary is not reliably announced, and the card may trip an axe gate.

Fix: put the text on the Buy button via `aria-describedby`, or give the card `role="group"`. Drop the dead ternary.

### 5. [minor] Many new tests are source-text regexes or tautologies; a broken implementation would still pass
`tests/rc1-ui.test.ts:12,15,36,38-39,43,87,115-119,129,149,176,187-189`

Evidence:
- `:15` is `expect(44 + (8 - 4)).toBe(40 + 8)`, arithmetic on literals that tests nothing.
- Most CSS and markup checks are `toMatch` on `styles.css` or `app.ts` source. They pass while the rule is overridden (finding 2 is exactly that) or dead.
- `:87` is titled "Rested, refill below 40%" but asserts the balance value (now 50%). The title is stale.
- No unit test exists for the "Limited by collecting" condition (finding 1) or for the header-rate sign/text pairing (finding 9).

Impact: false confidence on the layout items. Behavioural logic (`income`, `best-buy`, `next-goal`, `format`, `workers`) is tested properly and I found no gaps by reading.

Fix: delete `:15`, fix the stale title, and prefer browser geometry assertions in `rc0-browser.mjs` over source regexes for layout.

### 6. [minor] `priceDollars` hard-codes the price formula instead of using `eggPriceCents`
`src/econ/income.ts:21` vs `src/config/formulas.ts:77`

Evidence: `Math.round((1 + 0.05 * F) * (1 + collectionPriceBonus(C, b)) * 100) / 100` re-implements `eggPriceCents`, which uses `eggPriceCentsBase/PerLevel` and `pricePercentPerLevel * C` with `roundHalfUp`. The shipped sale path (`actions.ts:13,23`) uses `eggPriceCents`. `Math.round` vs `roundHalfUp` and the rounded `collectionPriceBonus` already differ in principle. The 0.05 and the 1 are literals; `balance.json:105-106` holds 100 and 5.

Impact: income, ETA, "+N% income" and best-buy silently diverge from real sales when the price coefficients are retuned (a retune just landed from main).

Fix: `base = eggPriceCents(F, C, b) / 100`, then multiply by the grader multiplier. Add a test that `priceDollars` with no grader equals `eggPriceCents / 100` over all F, C.

### 7. [minor] Build tag in the HUD may collide with the pills at 360; the guard test is too weak
`src/ui/app.ts:75-77` (`#buildTag`), `src/ui/styles.css:538-540`, `scripts/rc0-browser.mjs` (`p1build`)

Evidence: the HUD row at 360 has about 344px of content. The coins pill (>=96px), the rate line (up to about "⚠ ▼ −$12.50/s"), the basket pill (>=88px), settings (44px) and three 8px gaps use about 276-320px. A "build 1234abc" tag (about 80px) leaves 24-68px. `.hud .spacer` has `min-width:0` and `justify-content:flex-end`, so overflow goes left over the pills. `p1build` checks overlap only with `button/a/[data-act]/.chip/input` (not `.pill`) and only with $0 coins.

Impact: unverified but plausible overlap or clipping of the money or basket value at 360 once numbers grow.

Fix: assert no overlap with `.pill` after seeding large coins, basket and a negative rate. If it overlaps, hide the tag under about 380px.

### 8. [minor] Scope: the range mixes merged-in main PRs and a gameplay-rule change into a "UX clarity" cut
Range-wide; branch-only gameplay changes in `src/sim/workers.ts:25-32`, `src/sim/actions.ts:61` (`manageAll`)

Evidence: against `a01faea`, about 100 of the 154 files come from main PRs merged in (`acaceee`: economy.csv and `costTable`, vendored `economy-sim` Python (~1,000 lines), CI/release scripts, pacing). The branch's own work is `git diff acaceee..4b099b1`. Within that, `showManageAll` changed from `>= manage_all_min_workers` to `>= 1`, and `manageAll` falls back to refilling the single lowest worker when fewer than the minimum are hired (PM rulings (b)/T5). That is a sim rule change, not presentation. `engineering/golden/flagoff-golden.a01faea.test.ts` exists to pin pre-change behaviour.

Impact: the review diff is much larger than the topic, and the sim-rule change has no ruling reference I could cite from the commit titles. Flag-off golden and bot tests are unverified here.

Fix: review rounds against `git merge-base origin/main HEAD`, run the golden and bot tests, and record the PM ruling references in the PR description.

### 9. [nit] `rateView` prints "⚠" for the non-red `zero` sign
`src/ui/s2-economy-ui.ts:57`

Evidence: when the rounded rate is 0 the text is always `⚠ $0.00/s`, with `sign: cps <= 0 ? 'neg' : 'zero'`. For a sub-cent positive rate the sign is `zero` (grey) but the glyph still shows. The doc comment says "red ⚠ only when <= 0".

Fix: add the ⚠ prefix only when `cps <= 0`.

### 10. [nit] Dead and deprecated code left in `src`
`src/ui/next-goal.ts:116-117` (`GOAL_LABEL_BUDGET_PX`, `fitGoalLabel`), `:194-195` (`GoalHold`); `src/ui/format.ts` (`IncomeRate`); `src/ui/s2-economy-ui.ts` (`wagePerSecCents`, `netRateCents` stubs)

Evidence: marked deprecated or "kept for tests"; `app.ts` no longer imports them.

Fix: delete them or move them into test helpers.

### 11. [nit] ETA strings have no upper bound
`src/ui/format.ts` (`fmtAffordableIn`, `fmtGoalEta`) vs `fmtShortDur`, which caps at 24 h

Evidence: with near-zero net income the goal strip can show "~2777h 46m" and the card "Affordable in ~277777:46:40". `.goal-status` is clipped at 72px by ellipsis.

Fix: apply the same > 24 h -> "—" rule, or define "more than a day" copy.

### 12. [nit] "+0% income" is possible
`src/ui/app.ts:472` and `next-goal.ts` (`goalFrom`)

Evidence: `pct = Math.round(100 * gain / baseInc)` with `gain > 0` can round to 0, so the chip, goal label and aria say "+0% income" while the card still shows a payback.

Fix: `Math.max(1, ...)`, or show "<1% income".

### 13. [nit] Stale threshold comments
`src/sim/workers.ts:31` ("0.4 = Yawning"), `src/ui/workers-ui.ts:26` ("0.4 = Yawning"), the `manageCaption` doc ("above 40%")

Evidence: `balance.json:30` has `manage_prompt_threshold: 0.5`. The caption code (`workers-ui.ts:65`) already reads the balance value, so only the comments are wrong.

Fix: replace "0.4" with "manage_prompt_threshold".

### 14. [nit] Unreachable `'Sell'` branch in `orderView`
`src/ui/orders.ts` (button)

Evidence: `state === 'wait'` implies `sell === 0`, i.e. `floor(basket) < 1` or `rem <= 0`. The middle branch (`wait` with `basket >= 1`) only occurs for an already-filled order, which never exists.

Fix: simplify, or add a guard comment.

### 15. [nit] `matchMedia` is created per order per update
`src/ui/order-list.ts:38`

Evidence: `matchMedia('(max-width:375px)')` runs for each order on every update, before the cache check.

Fix: hoist to a module-level `MediaQueryList`, or re-read it only on `change`.

### 16. [nit] The new rc0 caption expectation is another hard-coded copy of the threshold
`scripts/rc0-browser.mjs:581` (the only change in 4b099b1)

Evidence: the commit swaps the literal `'Rested, refill below 40%'` for `'... 50%'` after the F1 retune. The unit tests were already moved to read `b.workers.energy.manage_prompt_threshold` (`tests/rc1-ui.test.ts:74`, `workers-v11.test.ts:11`), but the browser section keeps a literal, and the energy seed (90) would also be wrong if the threshold moved above 90. The fix is correct for today's balance (`balance.json:30` = 0.5, caption built at `workers-ui.ts:65`).

Impact: the next threshold retune breaks `p1refill` again for the same reason this commit exists.

Fix: have the script import the threshold from `src/config/balance.json` and build the string from it.

## What I read and checked

- Full stat of the range and targeted reads of `src/ui/app.ts` (upRowHtml 445-511), `src/econ/income.ts`, `src/config/formulas.ts`, `src/ui/styles.css` (goal rules 221-243, 452-461, 586), `src/ui/order-list.ts`, `src/ui/next-goal.ts`, and `.gitattributes`. The rest of the code is from the b765e14 pass over the same tree: `format.ts`, `orders.ts`, `workers-ui.ts`, `s2-economy-ui.ts`, `welcome-sale.ts`, `collection-copy.ts`, `upgrade-card.ts`, `src/econ/*`, `src/sim/{workers,actions}.ts`, `src/config/*`, `check-release-build.mjs`.
- `git show 4b099b1`: a single string change in `scripts/rc0-browser.mjs`. It matches the shipped balance value and caption code.
- Correct by reading: `fmtCount` / `fmtMoneyShort` tier roll-ups, `count3` rounding, `EtaHold` and `GoalHysteresis` state handling, `clampToSafe`, the release-hook list, the economy `costTable` and grader tier cost validation, `lowestManageTarget` ordering.
- Layout at 360/390/1280 was reasoned from CSS only (no browsers, as instructed). The items of concern are findings 2 and 7.
- Pre-existing worktree note, not a finding on the commits: `git status` shows `tests/fixtures/product/economy.csv` modified. This is a CRLF-only difference (git warns "CRLF will be replaced by LF"). `.gitattributes` (`*.csv text eol=lf`) normalizes it in the index. Any test that hashes or byte-compares that fixture, or `check-economy-copy --strict` (which requires LF), would behave differently in this worktree.

## What I ran

- `git diff --stat`, `git show`, `git log`, `git grep` and file reads. All read-only.
- **`npx tsc --noEmit`: not run.** The Bash tool denied it ("don't ask mode"). I did not try to work around the denial.
- **`npx vitest run --pool=forks ...`: not run**, for the same reason. I could not run `tests/rc1-ui.test.ts`, `income-bestbuy.test.ts`, `next-goal.test.ts`, `workers-v11.test.ts` or `review-5d8a058.test.ts`.
- Please run both before relying on this review: `npx tsc --noEmit` and `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc1-ui.test.ts tests/income-bestbuy.test.ts tests/next-goal.test.ts tests/workers-v11.test.ts tests/review-5d8a058.test.ts`.
- No files in the worktree were modified.
