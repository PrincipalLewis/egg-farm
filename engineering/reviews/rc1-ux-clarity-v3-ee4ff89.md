# Code review: rc1/ux-clarity-v3 (Cut A v3), a01faea..ee4ff89

Reviewer: Code Reviewer. Worktree `/workspace/review-ee4ff89` (read-only). Base: main a01faea.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 1 |
| minor | 7 |
| nit | 3 |

**Verdict: no blockers. Fix the major (#1) or get the AC-R2 ruling in writing before merge.**

**Not verified:** I could not run `tsc` or `vitest` (see "What I ran"). All findings come from reading the code. The suite's pass/fail state and type-correctness are unconfirmed by me, so CI must show both green before merge.

**Scope.**
- The range contains the merges of main (2700804): seller-variance port, vendored economy sim, m4-design docs, save-recovery. I treated those as already reviewed on main.
- I read the branch-owned work in `src/` closely. That covers sim/workers, econ/income and best-buy, next-goal, workers-ui, orders and order-list, format, app.ts, styles.css and the new UI modules.
- I read the tests and `rc0-browser.mjs` sections for coverage only.
- I did not run browsers, so layout at 360/390/1280 is judged from CSS and from what the rc0 sections assert.
- The latest commits (56513e7, ee4ff89) match their messages. Their three review fixes are correct as written:
  - Nav and docked Refill now use `refillCount` (`app.ts:~583`, `workers-ui.ts:53`).
  - The order fit key includes the value text (`order-list.ts:~38`).
  - `--refill-bar-h` is re-measured through `refillDirty` (`app.ts:512,605`).

---

## Findings

### 1. [major] Header net rate and worker banners claim "production stopped" when the sim keeps producing
`src/econ/income.ts:68-75` (`productionStopped`), consumed at `src/ui/app.ts:549` and `src/ui/workers-ui.ts:76-80`.

**Evidence.**
- `productionStopped` returns true if any hired worker of any role is Asleep or Unpaid.
- `rateView` (`s2-economy-ui.ts`) then clamps any positive net rate to 0 and prints `⚠ ▼ $0.00/s` in red.
- The sim does not stop production in those cases:
  - Asleep Hawker: `hawkerDemandMult` returns 1, so base demand continues (`workers.ts:~49`).
  - Asleep Grader: `graderMult` keeps `asleep_bonus_share` of the bonus (`workers.ts:42-47`). The Grader banner itself says "bonus down to 15%".
  - Asleep Coop Hand: `collectPerSec` falls back to tap-only. Income drops but is not zero.
  - Asleep Market Hand: `incomePerSec` has no Market Hand term, so income is unchanged.
- The non-Grader asleep banner (`workers-ui.ts:80`) reads "Asleep, production stopped". That applies to Hawker, which has no such effect.

**Impact.**
- With an asleep Hawker or Grader hired, the HUD shows `$0.00/s` with a warning while eggs sell and coins arrive.
- The Grader card says production continues at 15% while the HUD says it stopped.
- The player sees a number that contradicts their coin counter.

**Fix.**
- Either make `productionStopped` and the clamp true only when the computed live income is 0 or less, or only for roles that actually halt output.
- Or, if AC-R2 really specifies "any asleep or unpaid worker means $0.00", record that ruling and fix the Hawker banner copy.
- The AC-R2 text is not in the repo (`git grep AC-R2 -- engineering tests` is empty), so I could not check which reading is intended.
- Add a unit test: hired Hawker asleep with positive `incomePerSec` must not render `$0.00`, or the ruling must be pinned in a test.
- The only current test (`income-bestbuy.test.ts:17-21`) asserts `productionStopped(asleep coop hand) === true`, which locks in the questionable behaviour.

### 2. [minor] `fmtGoalEta` can print "~1h 60m"
`src/ui/format.ts:47`. The same pattern is in pre-existing `fmtTimeToAfford`, `format.ts:28`.

**Evidence.**
- `m = Math.round((s % 3600) / 60)` is not carried into `h`.
- `s = 7170` gives `h = 1`, `s % 3600 = 3570`, `round(59.5) = 60`, so the output is `~1h 60m`.

**Impact.**
- The goal-strip status shows an impossible time for the last 30 s of every hour.
- It also shows up in the "Pays back in …" chips and the aria text via `fmtTimeToAfford`.

**Fix.**
- Round total minutes first: `const tm = Math.round(s / 60); h = floor(tm / 60); m = tm % 60`.
- Add a test at 3570 to 3599 s past each hour.

### 3. [minor] Goal aria leaks the internal key: "Next goal: refill W4."
`src/ui/next-goal.ts:211-212`.

**Evidence.**
- `goalAria` for `state === 'refill'` interpolates `g.key`, which is `W1`..`W4`.
- The key used to be a worker id, so this regressed when the key type became `BuyKey`.
- No test covers the refill aria.

**Impact.**
- Screen readers read "refill W4". The same text is appended to the button aria-label at `app.ts:~417`.

**Fix.**
- Use a display name, for example `Next goal: refill the Grader.`, from a key to name map.
- Add a unit test for the refill label and aria.

### 4. [minor] A shown Refill goal on a hired W1-W3 can flip to "All upgrades done!"
`src/ui/next-goal.ts:186` (and `:176`).

**Evidence.**
- `selectGoal`'s `live <= 0` branch returns `key: 'W1'|'W2'|'W3'` with `payback: 0` for a hired worker.
- `buyOptions` only lists unhired W1-W3.
- On a due re-evaluation with a different pick, `GoalHysteresis.tick` skips the switch rules. `newPb <= 0.9 * 0` is false and `curPb` is finite.
- It then calls `goalFrom('W1', …)`, which finds no option and returns `{key: null, state: 'done', label: 'All upgrades done!'}`.
- This persists until the next due tick, up to 5 s.
- The click paths set `goalImm`, so only non-click transitions are affected. An example is wage recovery making live income positive.

**Impact.**
- Narrow: `live <= 0` is rare, because off workers are excluded from wages. When it hits, "All upgrades done!" is shown wrongly.

**Fix.**
- In `tick`, treat `state === 'refill'` (or `payback === 0`) as always replaceable by `next`.
- Alternatively make `goalFrom` handle hired W1-W3 keys by returning the refill goal.
- Add a hysteresis test: shown refill, then a different pick on a due tick.

### 5. [minor] Nav and docked Refill accessible name omits the visible text in cooldown and docked modes
`src/ui/workers-ui.ts:107-116` (`navManageView`) and `src/ui/app.ts:583-586`.

**Evidence.**
- During cooldown the visible label is `0:28` (phone) or `Ready in 28s` (docked).
- The aria-label is `Refill available in 28 seconds`.
- The docked visible label is `Refill 1 tired worker` while aria is `Refill 1 tired workers` style text, which is close enough.
- The cooldown case fails WCAG 2.5.3 Label in Name.
- The goal button on the same branch already got this fix (`app.ts:~415`: "Visible name must be in the accessible name (axe label-content-name-mismatch)"), so the Refill button is the odd one out.

**Impact.**
- Voice-control users saying the visible words ("Ready in 28") cannot target the button.
- axe flags `label-content-name-mismatch` if it is run on a cooldown state.

**Fix.**
- Include the visible string in the name, for example `Refill, ready in 28 seconds` / `0:28 until refill`.
- Keep the 5 s aria throttle.
- Add a unit case on `navManageView`: label text is a substring of `aria.text`.

### 6. [minor] Single-worker Refill can spend the shared cooldown on an Unpaid worker
`src/sim/workers.ts:26` (`lowestManageTarget`), used at `src/sim/actions.ts:54`. `refillCount` counts the same worker.

**Evidence.**
- `needManage` and `canManageWorker` look only at energy 40% or below. They ignore `unpaid`.
- Ruling 2 is "Unpaid stays Unpaid". Refill sets energy to 100 but does not clear `unpaid`.
- With 2 hired (Unpaid Market Hand at 10% and a tired Coop Hand at 30%), the single tap picks the lowest energy, the Unpaid hand. The Coop Hand stays tired for the 30 s cooldown.

**Impact.**
- The one tap that ruling (b) offers is wasted on a worker that will not resume.
- The label still reads "Refill 1 tired worker".

**Fix.**
- Prefer non-Unpaid targets in `lowestManageTarget`, or exclude Unpaid from `refillCount`/`needManage` in the single-worker path.
- This needs a PM ruling if "Unpaid also counts" was intended.
- Add a test for the 2-hired case with one Unpaid worker.

### 7. [minor] Several new tests are source-text greps and would pass on a wrong or inert implementation
- `tests/rc1-ui.test.ts:13` asserts `/\.goal-pill\{[^}]*height:var\(--goal-h\)/`.
  - It passes on the first `.goal-pill` rule (`styles.css:454`).
  - `styles.css:584` overrides it with `.goal-pill{height:auto;…}`, so the effective rule differs from what the test claims to pin.
  - Many neighbouring `rc1-ui.test.ts` checks are exact CSS string matches (lines 36-43, 233-235, 311-336). They break on harmless reformatting, and they stay green if a later override changes the cascade.
- `tests/workers-v11.test.ts:164-166` (ee4ff89's own regression test) reads `app.ts` and matches `navManageView(refillCount(s, b)`.
  - Any equivalent wiring, or the same text inside a comment, passes or fails regardless of behaviour.
  - Nothing exercises the real nav path.
  - The previous commit 772dbd2 had just moved other tests from greps to behaviour. This one goes back.
- The Market-empty `#nextIn` short format (`fmtShortDur`) and the hysteresis refill path have no unit coverage that would catch #2, #3 or #4.

**Fix.**
- Keep the pure-function unit tests, which are good.
- For wiring, extract a small pure `navRefillState(s, b, docked, prev, now)` that app.ts calls, and test that.
- Leave the cascade and layout assertions to the rc0 browser sections, and drop or relax the CSS regexes that duplicate them.

### 8. [minor] Worker copy hard-codes values that live in balance
- `src/ui/workers-ui.ts:79`: "Asleep, bonus down to 15%". `balance.json:77` has `asleep_bonus_share: 0.15`.
- `src/ui/workers-ui.ts:64`: "Rested, refill below 40%". `manage_prompt_threshold` is 0.4.
- Elsewhere this branch derives the numbers from balance. `collection-copy.ts` says "deltas from balance, never hard-coded".

**Impact.** A balance retune silently makes the UI copy wrong.

**Fix.** Interpolate `Math.round(b.workers.grader.asleep_bonus_share * 100)` and `Math.round(b.workers.energy.manage_prompt_threshold * 100)`.

### 9. [nit] Three near-duplicate duration formatters
`fmtTimeToAfford`, `fmtGoalEta` and `fmtShortDur` in `format.ts` differ only in floor versus round and the separator. This produced #2. One shared helper with a total-minutes carry would be safer.

### 10. [nit] Stale or dead CSS and comments
- `styles.css:335`: `.manage-all small, .manage-all .count{display:none}` no longer matches any markup, because the "(N need it)" markup is gone.
- `styles.css:133` `.hint .link` is superseded by the later `.hint.limit .link, .hint .link` rule.
- `styles.css:582` and the `.long` class comment mention "Need 181.2B", but `count3` produces `Need 181B`.
- `#p-upgrades:has(…)` at `styles.css:586` needs Safari 15.4 or later (fine if that is the iOS floor, but unstated).

### 11. [nit] `count3` rounds up, so a partial order can read as complete
`src/ui/orders.ts` (`count3`). With 999,600 of 1,000,000, the line shows `1M/1M` while the state is `partial` and the button says `Sell 1M`. Use floor for `have` and `rem`, or note that this is accepted. `eggsLegacy` (floor to 1 decimal) is still used for the slot preview, so the two formats now differ.

---

## Layout notes (no browsers run)

- **Nav at 360:** four equal columns with a 64px minimum is 256px, which fits. The Refill count badge is positioned from `right: calc(50% - 26px)` and stays inside the button.
- **Goal pill:** a 17px line height gives 34px for two lines inside the 40px pill. `height:auto; min-height:40px` lets it grow only for a third line. The ResizeObserver, dock change and `fonts.ready` refit the label.
- **Order line:** `rc0 orderFit11` covers 360/375/390/1280 with the worst cases (181.2B, 9.99M). That is adequate. It checks "value never cut", the 44px button height and "No eggs", but not font-swap re-fit. The fit cache key has no font signal, so a late web-font swap that keeps `clientWidth` equal leaves a stale `' eggs'` decision (low risk).
- **Sticky Refill bar:** `--refill-bar-h` is measured from the bar's real height plus 8px (`app.ts:605`). It is re-measured on html change, resize and dock change. A late font swap that changes only the bar height is not re-measured (cosmetic, `scroll-margin-top`).
- **1280 docked:** the header Refill pill is hidden while the sticky bar shows (`styles.css:586`), and the pill is still available on Collection/Farm tabs. This is consistent.

## What I ran

- `git diff` / `git log` / `git show` over a01faea..ee4ff89, and source reads of every file listed under Scope.
- `npx tsc --noEmit`: **blocked.** The sandbox denied the Bash call. The worktree also has no `node_modules`, so a local `tsc` is not installed and I did not try to install anything (that would modify the worktree).
- `npx vitest run --pool=forks …`: ran once on `tests/workers-v11.test.ts tests/orders.test.ts`. It resolved to an unrelated cached vitest outside the project and failed with `CACError: Unknown option --poolOptions`, so **no test results.**
- No browsers were run, as instructed.

COUNTS critical=0 blocker=0 major=1 minor=7 nit=3
