# QA pass: fix/rc1-qa-bugs-v4 @ 7d52952
- **PASS_ID:** rc1-qa-bugs-v4-7d52952. **SHA:** 7d52952. **Build id:** m3-rc1-pre+7d52952.
- **Build:** fresh detached worktree at /tmp/egg-claude-qa. `npm run build` and check-release-build passed.
- **Test setup:** served on 127.0.0.1:4391. Headless system Chrome with playwright-core, at 320, 360, 390 and 1280 px.
- **Browser lock:** every browser session ran under `flock .browser-test.lock`.
  - The lock was acquired at 23:47 and the run finished at 23:51 CEST.
  - Before that, the lock was held for about 45 min by a `sleep 2700` holder, then by a queue of about 18 other jobs.
- **Context:** read qa/m3-recheck/rc1-qa-bugs-v4-7d52952.md first.
- **Claude:** 1 call, as logged in usage.log. It gave source leads; every finding below was verified in the browser.
- **Evidence:** in qa/claude-qa/rc1-qa-bugs-v4-7d52952/.
  - Scripts: qa4.mjs (tutorial, layout audit and globals) and qa4b.mjs (big-number order cards and marketSeed).
  - Results: explore.json and orders.json.
  - Per-width screenshots plus w<W>.console.log and orders-w<W>.console.log.
- **How big numbers were set up:** I wrote saves into localStorage with a valid checksum, then reloaded.

## Bugs (4: 1 Major, 3 Minor)
### QA4-1 Major: the order card line is clipped with no ellipsis at 320px for B/T values, and at every width for 1,000,000T
**Repro:**
1. Load a save with basket 999.9e9 and customers with demand 999.9e9 and 1.2e12 (filled 5e11).
2. Use a 320x740 viewport and open the Market.

**Expected:** "0/999.9B eggs · $999.9B" is fully readable, or truncated with an ellipsis.

**Actual:**
- The `.l1` line is 116px wide but its text needs 148px (and 138px for the second card). The money value is cut off mid-glyph ("· $999", "· $1.2").
- 360px and 390px fit at the B and T values I tested.
- The 0/1000000T card clips at 320, 360, 390 and 1280.

**Evidence:** orders-b999-w320.png, orders-t1500-w{320,360,390,1280}.png, orders-w320.console.log, orders.json.

### QA4-2 Minor: inconsistent rounding between egg count and money on the same Sell
**Repro:** load a save with basket 12,960 and one customer with demand 20,000 (any width).

**Actual:**
- The card button reads "Sell 13K / +$12.9K". The egg count rounds up, while the money is floored.
- "Sell all" reads "(13K eggs · $13K)", which rounds the money up.
- The aria-label is exact: "Sell 13K · +$12,960.00", but the egg count in it is still rounded up to 13K.

**Expected:** one consistent rule, and never more eggs shown than are actually sold.

**Cause:** `eggs()` floors below 10K but fmtCount rounds at 10K and above (orders.ts:6, format.ts).

**Evidence:** orders-k12960-w{320,360,390,1280}.png, orders-w*.console.log.

### QA4-3 Minor: there is no suffix above T, so labels read "1500T" and "1000000T"
**Repro:** load a save with basket 1.5e15 and a customer with demand 1e18.

**Actual:**
- The card shows "0/1000000T eggs · $1000000T", and the button shows "Sell 1500T".
- Sell all shows "(1500T eggs · $1500T)".
- These values feed QA4-1.

**Expected:** a Qa/Q tier, or a cap.

**Cause:** format.ts TIERS stops at T.

**Evidence:** orders-t1500-w*.png.

### QA4-4 Minor: the `?marketSeed=` debug param is still honored in the release build
**Repro:** in two fresh browser contexts, load the release build with `?marketSeed=7` and tap start.

**Actual:** both runs got an identical state.rng (1478832577). Unseeded runs are seeded from Date.now.

**Expected:** release builds ignore debug query params, as already happens for ?debug, ?perf, ?ios and ?qa.

**Cause:** main.ts:83 has no __IOS_FLAG__ gate, and check-release-build doesn't scan for it.

**Evidence:** marketseed-release.png and orders.json (marketSeedRng). No console log was captured for these two contexts.

## Passed
- **Tutorial Sell flow at 320, 360, 390 and 1280:**
  - Step 2 caption.
  - Market Sell paid +$4.00.
  - The tutorial advanced to step 3, "Sell a few more eggs to afford it" (w*-5-after-sell.png).
- **Sell and Need buttons and Sell all:** no clipping or overflow at any width, including the B and T labels. There is no horizontal document overflow.
- **Exact aria labels:** "Sell 999.9B · +$999,900,000,000.00" and similar.
- **Globals with ?debug=1&perf=1&ios=1&qa=1:**
  - The only eggfarm* global is eggfarmExportTelemetry, and there is no perf or debug overlay.
  - eggfarmExportTelemetry() returns {exportedAt, events} with no install id.
- **Bundle identifiers:** eggfarmRecovery and eggfarmTabGuard in the bundle are history.state keys only, not globals.

## Not tested
- Tapping a customer chip to open the sheet during the tutorial: my selector missed the chip, so the Sell step was driven through the Market nav.
- Claude's coach-mark-behind-Upgrades-sheet and 250ms chip-tap leads.
- Firefox and WebKit.
