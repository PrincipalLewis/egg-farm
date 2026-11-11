# Advisory review: rc1/ux-clarity-v2 @ 32b789c (Cut A 8631e94 squash-rebased onto main 737c2cf)
Read-only. Worktree /workspace/review-32b789c (detached). Claude: 1 of 15 calls via ops/claude/claude-code-review.sh (sonnet/high). Its sandbox denied Bash, so it could not diff against the parents. I did the parent comparison myself and checked each of its claims.
Method: I diffed Cut A's own changes (merge-base bd0dc66..8631e94) against the squash's changes (737c2cf..32b789c) for app.ts, styles.css and rc0-browser.mjs.

**Verdict: CHANGES REQUESTED.** 0 blocking, 2 major, 3 minor, 2 nit.

## Main's behaviour: what survived
- **ServedDwell: preserved.** Imported once (app.ts:29) and constructed once (app.ts:281). The layout covers popped, squeezed, expired and shown (app.ts:306-315). The squeeze fade is still there (app.ts:309, 345-348; styles.css:435). Only comments were trimmed.
- **tryDispatch: preserved.** Used once, inside `act()` (app.ts:188). Every buy, hire and manage path goes through `act()` + `cantAfford`, and Cut A's `goalImm`/`goalNow` flags were merged in correctly.
- **data-queue-full: preserved, not doubled.** Set at app.ts:549 using the cached `navMarket` (main recomputed it inline). The queue-full dot is driven at app.ts:547. `queueFull` now comes from ./rates (app.ts:30) instead of s2-economy-ui.
- **styles.css: no conflicting doubles from the merge.** `.tabs{overflow:visible}` appears twice (styles.css:292 and :552) and `.wk .btn.manage` twice (:517 and :548; the later rule wins with min-width 88px). Both pairs are harmless but redundant (nit N2).

## Findings
### MAJOR M1: main's S2-10 synchronous redraw dropped from welcome-back Collect (app.ts:247)
- Main 737c2cf:src/ui/app.ts:233 has `closeModal(); dirty = true; render(); /* S2-10 */ pulse(...)`. The squash took Cut A's line, which lacks `dirty = true; render();`.
- S2-10 (main e57bf4f) says every action redraws synchronously. After this merge the basket and coins after Collect wait for the next RenderPump frame, and the dirty-gated sheets aren't redrawn.
- Repro: load a 2 h offline save, click #wbCollect, then read the basket text synchronously in the same task (`page.evaluate(() => { document.querySelector('#wbCollect').click(); return document.querySelector('#basket').textContent; })`). On main it shows the new basket; here it shows the old value.
- Fix: restore `dirty = true; render();`.

### MAJOR M2: wages subtracted twice in `ui.rates()` (app.ts:726-727; merge artefact)
- Main computed `inc = income.centsPerSec(now())` from the gross sales tracker (IncomeRate), then `netCentsPerSec(inc)` subtracted wages (rates.ts:22).
- The squash replaced that with `incomePerSec(s, b) * 100`, which is already net of wages (econ/income.ts:61-64). So `incomeCentsPerSec` is really net, and `netCentsPerSec` is gross minus 2× wages. 8631e94 had no `rates()` at all, so the bug comes from the conflict resolution.
- Repro: QA build, hire Market Hand at Farm 3, call `eggfarmUi.rates()`. `netCentsPerSec` is lower than the header `#rate` (app.ts:541) by `wageCentsPerSec`. rc0-browser only checks the type (rc0-browser.mjs:~464).
- Not player-visible, but it breaks the S2-8 QA contract. Fix: use a gross rate, or drop the second subtraction and rename `incomeCentsPerSec`.

### MINOR m1: two `queueFull` definitions
- s2-economy-ui.ts:6-16 still exports `wagePerSecCents`, `netRateCents` and `queueFull`, duplicating ./rates. workers-ui.ts:6 still imports `wagePerSecCents` from there. app.ts:327 also computes "full" inline.
- That's three sources of truth that can drift. Pick one.

### MINOR m2: negative-rate text vs tests (from Claude; confirmed in code, not run)
- The header renders `⚠ ▼ −$x/s` (app.ts:543). rc0-browser s289/dash (rc0-browser.mjs:~157, ~336) assert `▼−$0.03/s`, but they inject that text by hand, so the test passes whatever the code produces.
- Check the spec and make the test drive the real `rateView` path.

### MINOR m3: S2-4c test now checks shape only (rc0-browser.mjs:128)
- **The 339→366 change is justified; it is not a regression.**
  - I ran the S2-4c fixture through `Game` + `instantSale` in a vite-node probe on a /tmp copy. 8631e94 gives `{eggs:339, cents:111870}`; 32b789c gives `{eggs:366, cents:120780}`.
  - The queue demand is 200+139 = 339. The extra 27 come from main's MK-22 (16d0fe3, src/sim/actions.ts collectOffline: `nextCustomerInS -> 0` when offline eggs land): one new customer arrives on the next tick and Market Hand also serves it inside the `every_s` window.
  - Claude's "366 > total demand, so it must be a bug" ignores MK-22 and is wrong.
- But `\d+` can't catch a real regression, and `b0`/`sold` are computed and never asserted.
- Fix: pin 366 with a comment naming MK-22, or assert against `instantSale()` computed in the page.

### NIT
- N1: rc0-browser.mjs:124-127 waits 3 s for `b0`/`sold`, which are only printed.
- N2: the redundant duplicate CSS rules listed above (styles.css:292/552, 517/548).

Not confirmed (from Claude): the `.qtag` may stay up when the queue stops being full but the chips don't change (app.ts:322-329). It's an edge case and I didn't repro it.

## Tests
Run in a /tmp git-archive copy with node_modules symlinked.
- `tsc --noEmit`: clean.
- vitest: 456/457 passed. The only failure is telemetry-m3 BUILD_ID, because the copy has no .git (test environment).
- The browser tests (rc0-browser) weren't run, so M1 is shown from the diff, not in a browser.
