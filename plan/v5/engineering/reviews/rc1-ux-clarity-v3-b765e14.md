# Code review: rc1-ux-clarity-v3 @ b765e14 (Cut A v3)

Range: `a01faea..b765e14` (164 commits, 154 files, +7394/-480), worktree `/workspace/review-b765e14`, branch `rc1-ux-clarity-v3`.
Reviewer: Code Reviewer. Static review only. **`npx tsc --noEmit` and `npx vitest run ...` could not be run (see "What I ran"), so nothing below is backed by a green or red test run.**

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 1 |
| minor | 7 |
| nit | 7 |

Verdict: no blocker found by reading. One major needs a Product or Art & UX ruling before merge (finding 1). The tsc and vitest gates still have to be run by someone with the permission. The rc0 browser sections for 1280 docked have a coverage hole (finding 2).

## Findings

### 1. [major] Farm-row "Limited by collecting ›" is shown almost permanently, so it carries no information
`src/ui/app.ts:494-496`

Evidence: the condition is `isF && !max && S.eggsPerTap(C, b) <= 0.5 * S.coopCapacity(F, b)`. With the shipped balance, eggsPerTap = 5 + 5C and coopCapacity = 50 + 50F. The hint therefore shows whenever 5 + 5C <= 25 + 25F, which means C <= 5F + 4. At F=1 that is C<=9. At F>=5 it is every Collection level (max 30), so it always shows. The previous rule was the Collection row's "Limited by coop" when the *next* tap was > 50% of capacity. That is the rare end of the same inequality, which the new condition now covers from the other side.
The spec (`product/farm/rc1-upgrade-clarity-spec.md:35,83,131`) only fixes the copy, the target tab (Collection) and the screen-reader text. It does not define when the link shows. The branch moved it from the Collection row to the Farm row and inverted the proxy, with no test and no stated rule.

Impact: nearly every Farm card carries a "Limited by collecting" nudge for the whole game. It stays even when the player is demand-limited or sales-limited in the income model (`incomePerSec` = min(eggs/s, demand/s, collect/s)). It trains players to ignore it and sends them to Collection upgrades that may add 0% income. Any later Product ruling that it should be a real limiter signal will need a rewrite.

Fix: drive it from the same model as the chips. Show it only when `collectPerSec(s, b) < min(eggsPerSec, demandPerSec)`, which is the actual limiter. Or get Product to confirm that "always on" is the intent. Add a unit test for the condition (none exists; `rc0-browser.mjs:765` only checks the layout).

### 2. [minor] Docked (>=960 landscape) next-goal pill is 40px, not the `--goal-h-lg` 44px; cascade override, untested at 1280
`src/ui/styles.css:461` vs `:586`

Evidence: line 461 (docked media) sets `.goal-pill{height:auto;min-height:var(--goal-h-lg)}` (44px). The later unconditional line 586 sets `.goal-pill{height:auto;min-height:var(--goal-h);...}` (40px). Same specificity, later source order wins, so at 1280 the visible pill is 40px. `.goal` (line 461) is `min-height:44px;padding:0`, which leaves a 4px dead strip under the pill. Before v3, the docked `.goal` itself was 44px (line 243). The only geometry assertions are `rc0-browser.mjs:44-49` (`taps`), which run at 360 and 390 only. `tests/rc1-ui.test.ts:12` pins the base rule by regex and cannot see the override.

Impact: docked strip visibly shrinks 44 -> 40px against the layout spec, with a hit area taller than the visible control.

Fix: scope the override with `:not()`, or move the docked media block after line 586. Add 1280 to the `taps` section: `pill === 44` when docked.

### 3. [minor] `bestBuy` (depth-3 search) plus `optionGain` run on every rendered frame while the Upgrades sheet is open, and always at 1280 docked
`src/ui/app.ts:470,473` (called from `upRowHtml`, which `render()` calls each frame at `app.ts:603`); `src/econ/best-buy.ts` (`bestBuy`, `optionGain`)

Evidence: `RenderPump` calls `ui.render()` every rAF (`main.ts:123`). At Farm >= 8 with all workers unlocked, `options()` returns ~6 entries, so one `bestBuy` walk is 6 + 36 + 216 ≈ 258 `incomePerSec` evaluations. `optionGain` walks the same tree again. Each evaluation allocates spread states and recomputes pow/round chains. Permutations are not deduplicated (each unordered triple is visited up to 6 times). The result depends only on farm level, collection level, worker moods, and grader tier. It does not depend on coins or time.

Impact: roughly 500+ `incomePerSec` evaluations per frame. That is sub-millisecond on desktop, but it is real main-thread work on low-end phones and in WebKit, which `app.ts:160` already flags as a perf concern. The risk is highest docked, because there the sheet is "open" permanently.

Fix: memoize `bestBuy` and `optionGain` on a key of (farmLevel, collectionLevel, graderTier, mood bucket per worker). Or compute them in the 1 Hz goal tick and share them with the card renderer. Cache the key in `GoalHysteresis`.

### 4. [minor] `aria-label` on a plain `<div class="up">`
`src/ui/app.ts:497-500` (the return template)

Evidence: the card root has no `role`, so `aria-label` on a generic element is prohibited by ARIA 1.2. axe reports it as `aria-prohibited-attr` or needs-review, and most screen readers ignore it, so the "Adds N percent income. Pays back in ..." text is not reliably announced. Also, inside the `aria` template, `${og.gain > 0 ? ... : ''}` is dead code: the outer condition already requires `og.gain > 0`.

Impact: the intended spoken summary is not delivered, and the card may trip the axe gate.

Fix: put the text on the Buy button (its `aria-describedby`), or give the card `role="group"`. Drop the dead ternary.

### 5. [minor] Many new tests are source-text regexes or tautologies; a broken implementation would still pass
`tests/rc1-ui.test.ts:12,15,36,38-39,43,115-119,129,149,176,187-189`

Evidence:
- `:15` is `expect(44 + (8 - 4)).toBe(40 + 8)`, arithmetic on literals that tests nothing.
- Most CSS and markup checks are `toMatch` on `styles.css` or `app.ts` source. They pass if the string exists even when the rule is overridden (finding 2 is exactly that case) or is dead.
- `:87` is titled "Rested, refill below 40%" but asserts the balance value (50%).
- There is no unit test for the "Limited by collecting" condition (finding 1) or for the header-rate sign/text pairing (finding 8).

Impact: the suite gives false confidence for the layout items. Behavioural logic (`income`, `best-buy`, `next-goal`, `format`, `workers`) is tested properly, and I did not find gaps there by reading.

Fix: delete `:15`. Prefer browser geometry assertions in `rc0-browser.mjs` (which this branch extends heavily) over source regexes for layout rules. Fix the stale title.

### 6. [minor] `priceDollars` hard-codes the price formula instead of using `eggPriceCents`
`src/econ/income.ts:21`

Evidence: `Math.round((1 + 0.05 * F) * (1 + collectionPriceBonus(C, b)) * 100) / 100` re-implements `eggPriceCents` (`formulas.ts:77`, which uses `eggPriceCentsBase/PerLevel` and the unrounded `pricePercentPerLevel * C`). `collectionPriceBonus` rounds to 4 dp, so the paths already differ slightly. The file header says "Python-compatible", but the shipped sale price comes from `eggPriceCents`.

Impact: income, ETA, "+N% income" and best-buy silently diverge from real sales if `eggPriceCents*` or `pricePercentPerLevel` is retuned (an economy retune just landed from main).

Fix: `base = eggPriceCents(F, C, b) / 100`, then multiply by the grader multiplier. Add a test that `priceDollars(s, b) * 100 === eggPriceCents(...)` with no grader.

### 7. [minor] Build tag in the HUD may collide with the pills at 360; the guard test is too weak
`src/ui/app.ts:75-77` (`#buildTag` in `.spacer`), `src/ui/styles.css:538-540`, `scripts/rc0-browser.mjs:621-630`

Evidence: the HUD row at 360 is 344px of content. The coins pill is at least 96px, plus the new rate line (up to about "⚠ ▼ −$12.50/s" at 11px), the basket pill is at least 88px, settings is 44px, and there are three 8px gaps, so about 276-320px is used. A "build 1234abc" tag (about 80px plus padding) has 24-68px left. `.hud .spacer` has `min-width:0` and `justify-content:flex-end`, so overflow goes left over the pills. `p1build` only checks overlap with `button/a/[data-act]/.chip/input` (not `.pill`), and only in the initial state ($0 coins).

Impact: unverified, but plausible: the tag overlaps or clips the money or basket value at 360 once numbers grow ("$1,234.50", "1.2K", a long rate).

Fix: assert no overlap with `.pill` (both bounding boxes) after seeding larger coins, basket and a negative rate. If it overlaps, hide the tag under ~380px or let the spacer clip it.

### 8. [minor] Scope: the range mixes merged-in main PRs and a gameplay-rule change into a "UX clarity" cut
Range-wide. Branch-only gameplay changes: `src/sim/workers.ts:25-31`, `src/sim/actions.ts` (`manageAll`)

Evidence: against `a01faea`, about 100 of the 154 files come from the main PRs merged in (`acaceee`: economy.csv and `costTable`, vendored `economy-sim` Python (~1,000 lines), CI/release scripts, pacing). `git diff acaceee..b765e14` is the branch's own work (51 files, +2912/-283). Within that, `showManageAll` changed from `>= manage_all_min_workers` to `>= 1`, and `manageAll` now falls back to refilling a single lowest worker when fewer than 3 are hired (PM rulings (b)/T5). This is a sim rule change, not presentation. `engineering/golden/flagoff-golden.a01faea.test.ts` exists to pin pre-change behaviour.

Impact: the review diff is far larger than the Cut A v3 topic. A sim-rule change has no stated owner sign-off in the commit titles that I could cite from the repo. Whether the flag-off golden and the bot tests still pass is unverified here.

Fix: review future rounds against `git merge-base origin/main HEAD`. Run the golden and bot tests. Record the PM ruling references in the PR description.

### 9. [nit] `rateView` prints "⚠" for the non-red `zero` sign
`src/ui/s2-economy-ui.ts:57`

Evidence: when the rounded rate is 0 the text is always `⚠ $0.00/s`, with `sign: cps <= 0 ? 'neg' : 'zero'`. For a sub-cent positive rate the sign is `zero` (grey, not red) but the glyph still shows. `headerRateText` only rewrites `neg`. The doc comment says "red ⚠ only when <= 0".

Fix: use the ⚠ prefix only when `cps <= 0`.

### 10. [nit] Dead and deprecated code left in `src`
`src/ui/next-goal.ts:116` (`GOAL_LABEL_BUDGET_PX`, `fitGoalLabel`), `:195` (`GoalHold`); `src/ui/format.ts:68` (`IncomeRate`); `src/ui/s2-economy-ui.ts` (`wagePerSecCents`, `netRateCents` stubs)

Evidence: all are marked deprecated or "kept for tests". `app.ts` no longer imports them.

Fix: delete them, or move them into test helpers.

### 11. [nit] ETA strings have no upper bound
`src/ui/format.ts` (`fmtAffordableIn`, `fmtGoalEta`) vs `fmtShortDur`, which caps at 24 h

Evidence: with near-zero net income (wages about equal to sales) the goal strip can show "~2777h 46m" and the card "Affordable in ~277777:46:40". `.goal-status` is clipped at 72px by `overflow:hidden; text-overflow:ellipsis`.

Fix: apply the same > 24 h -> "—" rule, or define a "more than a day" copy.

### 12. [nit] "+0% income" is possible
`src/ui/app.ts:472` and `next-goal.ts` (`goalFrom`)

Evidence: `pct = Math.round(100 * gain / base)` with `gain > 0` can round to 0 (a tiny positive gain). The chip, goal label and aria then say "+0% income" while the card still pays back.

Fix: `Math.max(1, ...)`, or show "<1% income".

### 13. [nit] Stale threshold comments
`src/sim/workers.ts:31` ("0.4 = Yawning"), `src/ui/workers-ui.ts:26` ("0.4"), and the `manageCaption` doc ("above 40%") now disagree with `manage_prompt_threshold: 0.5` in `balance.json`.

### 14. [nit] Unreachable `'Sell'` branch in `orderView`
`src/ui/orders.ts` (button): `state === 'wait'` means `sell === 0`, which means `floor(basket) < 1` or `rem <= 0`. The middle branch (`wait` with `basket >= 1`) only happens for an already-filled order, which never exists. Simplify, or add a guard comment.

### 15. [nit] `matchMedia` is created per order per update
`src/ui/order-list.ts:38` creates a `MediaQueryList` for each order on every update before the cache check. Hoist it to a module-level object, or re-read it only on `change`.

(Pre-existing worktree note, not a finding on the commits: `git status` shows `tests/fixtures/product/economy.csv` modified, a CRLF-only change of 32 lines. `.gitattributes` in this range normalizes it. Any test that hashes or byte-compares that fixture may behave differently in this worktree.)

## What I read and checked

- Full stat and targeted full diffs: `src/ui/app.ts`, `next-goal.ts`, `format.ts`, `orders.ts`, `order-list.ts`, `workers-ui.ts`, `s2-economy-ui.ts`, `welcome-sale.ts`, `collection-copy.ts`, `upgrade-card.ts`, `fx.ts`, `rotate-prompt.ts`, `src/econ/*`, `src/sim/{workers,actions}.ts`, `src/config/*`, `styles.css` (whole added CSS), `check-release-build.mjs`.
- Correct by reading: `fmtCount` / `fmtMoneyShort` tier roll-ups, `count3` rounding, `EtaHold` and `GoalHysteresis` state handling, `clampToSafe`, the release-hook list (the three new `eggfarmQa*` hooks and `eggfarmOrderList` are in the check), the economy `costTable` / grader tier cost validation, and `lowestManageTarget` ordering.
- Layout at 360/390/1280 was reasoned from CSS only (no browsers, as instructed). Items of concern are findings 2 and 7. The goal label wrap and fit logic (`fitGoalLabelEl`) and the queue tag at <380px read as consistent with their rc0 sections.

## What I ran

- `git diff`, `git log`, `git diff --stat` and `grep` on the worktree (read-only).
- **`npx tsc --noEmit`: not run.** The Bash tool denied it ("don't ask mode"), in three attempts including the bare command. I did not try to work around the denial.
- **`npx vitest run --pool=forks ...`: not run**, for the same reason, so I could not run `tests/rc1-ui.test.ts`, `income-bestbuy.test.ts`, `next-goal.test.ts` or `workers-v11.test.ts`.
- Please run both before relying on this review: `npx tsc --noEmit` and `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc1-ui.test.ts tests/income-bestbuy.test.ts tests/next-goal.test.ts tests/workers-v11.test.ts tests/review-5d8a058.test.ts`.
- No files in the worktree were modified.
