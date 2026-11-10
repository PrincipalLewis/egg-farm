# QA pass: GitHub Latest release m3-rc1-pre-dd52bfd (asset egg-farm.html)
- **PASS_ID:** m3-rc1-pre-dd52bfd. **Build id:** m3-rc1-pre+dd52bfd. It appears 3 times in the asset, and smoke.mjs read the same id at runtime (smoke-*.png/json). **Source:** dd52bfd (contains 4a25d0d and 7d52952).
- **Asset:** downloaded with `gh release download`, sha256 913c7feb…1ed21cc7. I served this exact file as index.html on 127.0.0.1:4392.
- **Source checkout:** /tmp/egg-claude-qa was wiped and rebuilt as a detached worktree at dd52bfd, for claude-qa.sh.
- **Tests:** headless system Chrome with playwright-core, at 320, 360, 390 and 1280 px (save tests at 390 and 1280). Every run was under `flock .browser-test.lock`. The queue was short, with a wait of minutes at most.
- **Claude:** 1 call (usage.log). It gave 3 leads on hidden-tab handling (#39): 1 could not be reproduced, 2 were not tested.
- **Evidence:** qa/claude-qa/m3-rc1-pre-dd52bfd/
  - Scripts: sd5.mjs (save/offline), ob5.mjs (orders, Sell all, upgrades), hid5.mjs (hidden tab), upg5.mjs (mobile upgrades).
  - Results: results-*.json, orders.json, hidden-buy.json, upg-mobile.json.
  - A .png screenshot and a .console.log for each case.

## Retest of earlier findings
| Finding | Status on dd52bfd | Evidence |
|---|---|---|
| 4a25d0d NEW-1 Major: a future-savedAt localStorage copy beats newer IndexedDB | **FIXED.** The newer IndexedDB copy (basket 15) wins at 390 and 1280. | e3-future-ls-beats-idb-* |
| 4a25d0d NEW-2 Major: a single tab locked out under localStorage quota | **Not seen.** Both runs played on with the storage warning, and the IndexedDB copy was kept. The original bug was timing-dependent. | f6-quota-stale-ls-vs-idb-* |
| 4a25d0d NEW-3 Minor: missing main + bad .bak gave a silent fresh start | **FIXED.** The "A fresh start… Your old save is kept safe" dialog appears. | f3-main-missing-bak-* |
| 4a25d0d NEW-4 Minor | Not retested. | |
| 2959ba0 BUG-1 to BUG-4 | **Still fixed.** savedAt 0, negative, 2019, future and missing all pay 0. The two-tab v99 save survives. Missing main restores .bak. Reset clears .bak. | b-*, a4-*, e1-*, e2-* |
| QA4-1 Major: order line clipped at 320 | **STILL BROKEN.** | orders-b999-w320.png, orders-t1500-w*.png |
| QA4-2 Minor: 13K vs $12.9K rounding | **STILL BROKEN.** Sell all is labelled "(13K eggs · $13K)" but pays exactly $12,960. | orders-k12960-w*, sellall-w* |
| QA4-3 Minor: no tier above T | **CHANGED, still broken.** It now shows "1,500T" and "1,000,000T" with separators. | orders-t1500-w* |
| QA4-4 Minor: ?marketSeed honored in release | **STILL BROKEN.** The rng was identical across 2 runs (1478832577), and main.ts:91 is still ungated. | marketseed-release.png, marketseed.console.log |

## New bug
### DD-1 Minor: the HUD shows "$999.9K" for exactly $1,000,000 while its live/aria text says "$1M"
**Repro (390 and 1280):**
1. Load a valid save with coinsCents=100000000.
2. Tap start.

**Expected:** "$1M", which matches the live region.

**Actual:** the HUD coin pill reads "$999.9K" on first render, while the `#live` text reads "$1M". After a hide and show it reads "$1M", so the two formatters disagree at the rollover point.

**Evidence:** hidden-buy-1-bought-{mobile,desktop}.png, hidden-buy-*.console.log, hidden-buy.json (hud1).

## Passed
- **Saves and reload:** a page close and reopen keeps the progress (d-*). savedAt validation and .bak restore work as in the table above.
- **Offline return:** a 30-minute absence pays +675 once, and nothing more on reload (c-*). A hidden tab of 63 s pays "Welcome back! You were away 1m" once.
- **Sell all:** it pays exactly the sold eggs × price (+$12,960.00 for 12,960 eggs), and the amount survives a reload. Only the label rounding is wrong (QA4-2).
- **Upgrades:** buying Collection L1 for $10.00 at 320, 390 and 1280 deducts exactly 1000 cents, and the level persists after a reload. No buttons overflow.
- **Narrow layout:** at 320, 360 and 390, the Sell, Need and Sell all buttons never clip. The only clipping is QA4-1.

## Not reproduced or not tested
- **Claude lead, not reproduced:** "an upgrade bought while the tab is hidden reverts after 60 s". Clicks on a hidden page made no purchase, so the state did not change.
- **Not tested:** the other two Claude leads (a silent settle of a pending welcome grant; a visible-tab clock jump), plus Firefox and WebKit.
