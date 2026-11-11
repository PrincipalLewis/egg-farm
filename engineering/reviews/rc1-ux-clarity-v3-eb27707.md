# Review: rc1/ux-clarity-v3 (Cut A v3) @ eb27707

Worktree /workspace/review-eb27707 (detached, read-only). Requested range a01faea..eb27707.
**Important:** a01faea is not an ancestor of eb27707. The branch is 21 commits ahead of and **42 commits behind** a01faea (`git rev-list --count a01faea..eb27707` = 21, `eb27707..a01faea` = 42). I therefore reviewed the branch's own change with the three-dot diff (`a01faea...eb27707`, 50 files) and the v3-only commits (`1371305..eb27707`, 17 src/tests files). The two-dot diff (74 files) contains main's save-durability work as "deletions" (tab-lease.ts, idb-mirror.ts, save-recovery rewrite and their tests); those are not this branch's changes.

**Verdict: CHANGES REQUESTED.** The v3 UI code itself is mostly sound; the branch cannot be merged as it stands (finding 1), and one sim rule change is under-documented (finding 2).

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 1 |
| major | 1 |
| minor | 4 |
| nit | 2 |

## Findings

### 1. BLOCKER: branch is not based on the stated base; add/add and content conflicts with main
- Evidence:
  - `git rev-list --count eb27707..a01faea` = 42 (save durability v3/v4, newer-save refusal, tab lease, IDB mirror, save-recovery v2.1/v2.2, release-globals CI job, etc.).
  - `scripts/serve-own.mjs` and `scripts/release-globals-browser.mjs` exist on a01faea (`git show a01faea:scripts/serve-own.mjs` prints the file), and a01faea's package.json:17 already has `"check-globals"`. The branch adds all three as new (`git diff a01faea...eb27707` shows `new file mode` for the two scripts and the `check-globals` line as an addition) from commit 55e20cc ("Add check-globals (release-globals-browser from main...)"). This is a certain add/add conflict, and the branch copy carries a `hasNewer` gate ("Cut A predates the newer-save refusal dialog") that is wrong once main's newer-save code is present.
  - `src/ui/save-recovery.ts` and `src/main.ts` are edited on the branch (save-recovery.ts: `type="button"`, pointerdown/touchstart handler; main.ts: build-id meta, `eggfarm` gating) while main rewrote both heavily. Expect textual conflicts, and a silent semantic one: main already compiles `window.eggfarm` out of release (3e342b0).
- Impact: if anyone lands this by `git checkout eb27707 -- .`, a tree copy, or a conflict resolution that takes "ours/theirs" wholesale, 42 commits of save-safety work are reverted (the two-dot diff shows exactly that). Even a clean merge needs the new-save paths re-tested against Cut A.
- Fix: rebase (or squash-rebase, as for v2) onto a01faea. Drop the duplicated scripts/package.json line and take main's versions. Re-run unit + rc0 (all three engines) + check-globals on the rebased tip, and re-request review on the rebased SHA.

### 2. MAJOR: `showManageAll` gate is also a sim rule; economy change not called out, knob left dead
- `src/sim/workers.ts:21` now returns `hiredCount(ws) >= 1`. `src/sim/actions.ts:55` (`case 'manageAll'`) uses the same function, so the sim now accepts `manageAll` with 1 or 2 hired workers. Commit c231c02 describes it as a UI visibility fix.
- Behaviour change beyond the UI: with 2 hired workers both at or below 40%, one tap now refills both under one shared cooldown (`manage_cooldown_s`); before, a player could refill only one per cooldown (per-worker `manage`). That is more worker uptime for the 2-worker stage, i.e. an economy change that nobody signed off in the commit. With 1 worker it is identical to `manage`.
- Dead knob: `workers.energy.manage_all_min_workers` (balance.json:28, balance.ts:32, scripts/sync-economy.ts:107, and `tests/sync-economy.test.ts:19` which still pins it to 3) no longer controls anything, so it looks live but is not. The `_b` parameter is unused.
- Stale comments still say 3 hired: `src/sim/actions.ts:51` ("3+ hired"), `src/ui/workers-ui.ts:29` and `:48` ("hidden < manage_all_min_workers").
- Test gap: the new T5 tests (`tests/workers-v11.test.ts`, per role x tired/asleep) apply `manageAll` with exactly one worker. No test pins the 2-worker case (the one that changes gameplay), and none covers a 2-worker economy run.
- Fix: get Economy/PM to confirm "N>=1 for the sim action too" (or make the bar dispatch per-worker `manage` when N=1 and keep the 3-worker sim rule). Then either remove or repurpose `manage_all_min_workers`, fix the three comments, and add a 2-tired-workers test for `apply(manageAll)`.

### 3. MINOR: order-card " eggs" fit rewrites the DOM twice and forces two layouts per frame for every shortened row
- `src/ui/order-list.ts:37` runs on every `fill()`. `fill()` first resets `E.textContent` to the full string (line 30), then `fitOrderEggs` calls `fits(e)` (the full text is back, so a write), reads `l1.scrollWidth/clientWidth`, fails, drops " eggs" (second write), reads again. `OrderList.update` is called from `render()` (app.ts:590) on every render pass while the Market is open or docked, and it is not dirty-gated.
- Impact: for each order that needs the short form (the big-number case this fix is for) that is 2 text writes and 2 forced reflows per frame, plus it defeats the anti-churn goal of this file (header: "keyed nodes, <= 1 write", QA §7.17 write counts). Rows that already fit only add layout reads, which are cheap when layout is clean. Not visible to players on a fast device; it is a battery/jank cost on the exact late-game state.
- Fix: cache the last (`e`, button label, `l1.clientWidth`) key on the node and skip the fit when unchanged; keep the current short/long decision as state instead of reverting to the full string first.

### 4. MINOR: goal-label fit runs once per content change, so it goes stale on resize, dock/undock and font load
- `src/ui/app.ts:401-407` re-fits only when `sig` (`key|label|pct`) changes. `document.fonts.ready` (app.ts:~414) sets `goalNow` but the sig is unchanged, so it does not re-fit either. Before v1.6 this was tolerable because CSS ellipsised; v1.6 removed the ellipsis and made the choice (short name, trimmed leading space) a JS decision.
- Concrete bad state: `fitGoalLabelEl` trims the leading space of `.g-gain` when it is on line 2 (`next-goal.ts:109`). If the width then grows (window resize, iPad split view, 960px dock crossing) the gain moves back to line 1 and renders glued: "Collection L5· +12% income". Also a short name chosen at one width stays when there is room for the full name. A related edge: if the gain would fit on line 1 only without its leading space (4px window), the trim un-wraps it, with the same glued text and no re-measure.
- Fix: re-run `fitGoalLabelEl` from a ResizeObserver on `.goal-label` (and on `fonts.ready`), and make the space a CSS margin on `.g-gain` instead of a text character so no trim is needed.

### 5. MINOR: UC24 nav-tab rule deviates from the spec in two cases
- Spec (product/farm/rc1-upgrade-clarity-spec.md:101): "with a hint shown, tapping nav Upgrades opens the hint's tab".
- `src/ui/upgrade-card.ts:6` excludes `state === 'refill'`: the goal strip shows "★ X · Refill" (a hint, tab 'workers', next-goal.ts:136/154) but nav falls back to the last-used tab. No test or comment records that this was intended; the unit test only covers `done`.
- `app.ts:183` passes `goalShown`, which is set while `goalHidden` is true (FTUE, until step 4, app.ts:605/685), so nav can switch tabs for a hint the player cannot see.
- Fix: confirm refill with PM; gate on `!goalHidden`; add both cases to `tests/upgrade-card.test.ts`.

### 6. MINOR: several new tests would pass with a broken implementation
- `tests/rc1-ui.test.ts` FIX3 and `tests/rc2-cuta-followups.test.ts` m1/m2 partly assert source text (`expect(app).toContain('setText(rateEl, headerRateText(v))')`, `not.toMatch(/wagePerSecCents/)`, `toContain('listedWageCentsPerSec')`). Using the wrong rate in `cardWage` still passes; nothing asserts the card shows the exact listed wage (the point of reviewer m1).
- `rc0 refillBar` (scripts/rc0-browser.mjs): `r.sm >= r.barH` is satisfied only by the 88px fallback because `--refill-bar-h` is defined nowhere (finding 7); `r.full` (`width >= row.clientWidth - 1`) is true for any block. It never scrolls a card under the bar, so "no banner parks under it" is untested. Also the new rule is a layout rule in CSS only; the unit side is greps.
- `rc0 goalLabel161` injects the label HTML by hand and forces `width:188px` instead of driving `paintGoalLabel` through the real strip with a real status chip; if the live 360 label box is not 188px, the test says nothing. It does assert one-line / two-line / short-name outcomes and 40px strip, which is good.
- `rc0 orderNeed` accepts either " eggs" or bare for each row, so "always drop" passes; only `orderFit` (small order keeps " eggs") pins that. Acceptable, but orderNeed's name overstates it.
- Good: `farmLimit` is a strong test (hit box vs chip, vs Buy, in flow, inset -14, gap >= 8, 4 widths x 2 states). The `fitOrderEggs` and `.long` unit tests are fine but only cover the pure helper, not `order-list` wiring.

### 7. NIT: `--refill-bar-h` is never defined
- `src/ui/styles.css:570` `#uRow .wk{scroll-margin-top:var(--refill-bar-h,88px)}`; no rule sets the variable (grep: only this use). It is a hard-coded 88px, which is also applied when no bar is shown (N=0), leaving an 88px blank band on `scrollIntoView` in that state. Measure the bar into the variable (ResizeObserver) or set the margin only under `:has(> .refill-wrap)`.

### 8. NIT: save-recovery.ts edit is out of topic and partly dead
- `src/ui/save-recovery.ts:60` adds a `closest('button')` exemption for click/pointerdown/touchstart, but line 61 (kept) unconditionally stops `click` propagation, so the exemption does nothing for click. This file belongs to the save work (see finding 1); drop the hunk when rebasing unless it is intentionally required.

## Checked and found OK
- **Limiter link overlap (QA Major):** root cause was the class `coop` on `.hint.coop` colliding with the scene's `.coop{position:absolute;...}`. Fixed by renaming to `.hint.limit` and scoping the sprite rule to `.scene .coop`; no other `.coop` consumers (grep of css/ts/scripts). `::before{inset:-14px 0}` reaches 14px above the link: DOM order is Buy, 8px gap, ETA/placeholder `.hint` (16px, always present when `!max`), `margin-top:8px`, link, so the hit area overlaps the ETA line only, never Buy.
- **UC26 lines:** `changedLine`/`fxOrNoChange` and the `extra=!!slotLines` guard are right; at max the `arrow` helper returns only the current value.
- **Order buttons:** 44px button inside the 60px/2px-border/8px-padding `.order` (padding box 56px, `overflow:hidden`) is not clipped; `.long` threshold matches in `orders.ts` and `order-list.ts`; widest realistic label "Need 999.9B" fits 80px at 12px (rc0 asserts `!bOver`).
- **Goal label CSS:** `.g-head` unbreakable, two 17px lines = 34px in the 40px pill (`min-height` also set); 1280 docked uses `height:auto;min-height:44px`.
- **rotate-prompt `trapFocus`:** released on hide, restores focus only if still connected; recovery dialog takes priority so no double trap.
- **Header rate text, nav badge anchor (`.nav-ic{position:relative}` at styles.css:504), wage source:** correct.

## Layout at 360 / 390 / 1280 (static analysis only, no browser run)
- 360: order line / button (80px, `.long` 12px), goal label 188px box two-line + short name, sticky refill bar and limiter link all reason out fine from CSS; real confirmation is the rc0 sections `goalLabel161`, `orderNeed`, `orderFit`, `refillBar`, `farmLimit` (not run, see below). Risks: findings 3, 4, 7.
- 390: only differences are wider label/line boxes (strip chevron present from 380px); no new risks.
- 1280 docked: goal label font 16px with the fixed 17px line-height (tight but fine), pill `height:auto`; Market list always rendered (finding 3 applies continuously); Refill bar sticky inside the Upgrades sheet.

## What I ran
- `git log`, `git rev-list --count` both ways, `git diff --stat` (two- and three-dot), `git diff a01faea...eb27707` for src/scripts, `git diff 1371305..eb27707` for src/ui and tests, `git show a01faea:...` for the base copies, plus greps in the worktree. No file in the worktree was modified.
- **Not run:** `npx vitest run ...` and `npx tsc --noEmit`. The worktree has no `node_modules` (an `npx vitest` there fetched an unrelated vitest that rejects `--poolOptions`), and the sandbox denied `npx tsc --noEmit` and copying the tree to a scratch dir with a node_modules symlink. So I have **no test or type-check result** for this SHA; the unit-test statements above come from reading the tests. rc0 browser tests were not run (no browsers, as instructed).
- Suggested for the author before re-requesting: `npx tsc --noEmit` and the full vitest run on the rebased tip, plus `rc0` sections goalLabel161, orderNeed, orderFit, refillBar, farmLimit in chromium/firefox/webkit.

COUNTS critical=0 blocker=1 major=1 minor=4 nit=2
