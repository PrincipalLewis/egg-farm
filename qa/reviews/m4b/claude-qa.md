# Claude QA: M4 B release m4b-dd223f5
- **Build:** /tmp/relchk/egg-farm.html, sha256 0bc5bb72…8f179a4c (verified). **build-id:** m3-rc1-pre+246de09, found 3× in the asset. dd223f5 has the same tree as 246de09 (`git diff` is empty).
- **How it was opened:** file:// works in all three engines, so no server was needed.
- **Source:** /tmp/egg-claude-qa, a detached worktree at dd223f5.
- **PASS_ID:** m4b-dd223f5. **Claude:** 1 call.
- **Engines:** Chromium (system Chrome) at 320, 360 and 1280. Playwright Firefox and WebKit (1.64.1) at 360, covering the explainer, fresh save and big numbers.
- **Browser runs:** all under `flock .browser-test.lock`, at 09:21, 09:29 and 09:32 CEST.
- **Evidence:** qa/reviews/m4b/claude-qa/
  - Script: m4b.mjs, plus run-c2.log and run-c3.log.
  - Results: <engine>-results-*.json.
  - Screenshots and logs: <engine>-<case>-w<W>.png and .console.log.

## Findings (2: 1 Major, 1 Cosmetic, plus 3 carried over)
### M4B-1 Major: on a migrated save, the Egg value lock text "Needs Farm L(F+1)" is wrong and keeps moving up
**Engine:** Chromium, at 360 and 1280. **build-id:** m3-rc1-pre+246de09.

**Repro:**
1. Load a pre-M4 save (no tracksV7) with farmLevel=5, collectionLevel=15 and plenty of coins.
2. Tap start, then dismiss the explainer.
3. Open Upgrades → Farm.
4. Buy Farm twice.

**Expected:** the Egg value row (L9, cap F+3) says "Needs Farm L7" from the start.

**Actual:**
- At F5 it says "Needs Farm L6". At F6 it says "Needs Farm L7", and the row only unlocks at F7.
- A farm at F0 with Collection 30 migrates to V12 and shows "Needs Farm L1". Then it shows L2, then L3, but it actually needs Farm L10.
- The aria-label has the same wrong text.

**Cause:** trackLockText(F) returns F+1 (tracks-ui.ts:10), but the migration places V above F+3 on purpose.

**Evidence:** chromium-lock-F5C15-0/2-w{360,1280}.png, chromium-lock-F0C30-0/2-w{360,1280}.png, chromium-lock-text-w*.console.log, chromium-results-lock.json.

### M4B-2 Cosmetic: no-op arrows on the Farm row at L27–29
**Engine:** Chromium, at 360 and 1280.

**Repro:** load an M4 save with farmLevel=27 and open Upgrades → Farm.

**Actual:** "Hens & Egg value up to L30 → L30" and "Customers every 1.5s → 1.5s".

**Expected:** no arrow when the value doesn't change. The cap comes from min(F+3, 30), at app.ts:456.

**Evidence:** chromium-lock-F27-farmrow-w{360,1280}.png, chromium-lock-text-w*.console.log.

## Retest of earlier findings
**Sources:**
- Chromium: chromium-big-*-w{320,360,1280}.png and chromium-big-numbers-w*.console.log.
- Firefox and WebKit: <engine>-big-*-w360.png.

**Results:**
- **QA4-1 Major: STILL BROKEN.**
  - At 320 the B/T order line clips: 999.9B needs 148px but gets 116px, and 2,000T needs 146 of 116.
  - 0/1,000,000T clips at every width in all three engines.
  - In WebKit at 360, the word "eggs" disappears from that card.
- **QA4-2 Minor: STILL BROKEN.** The card reads "Sell 13K +$12.9K" while Sell all reads "(13K eggs · $13K)". This holds in all engines.
- **QA4-3 Minor: STILL BROKEN.** There is still no tier above T: "1,500T", "$9,990T".
- **QA4-4 Minor: FIXED.** `?marketSeed=7` now gives a different rng on every run.
- **DD-1 Minor: FIXED.** At $1,000,000 the HUD and the live text both read "$1M".

## Passed
- **Explainer:**
  - A new save never shows it, even after a reload. This was checked in Chromium (360/1280), Firefox and WebKit.
  - A pre-M4 save shows it once: "Upgrades got an upgrade! … Got it". It auto-closes within about 8 s, and seenTracksExplainer=true is saved. Two reloads don't show it again.
- **Farm L30 cap:**
  - Buying from F29 reaches 30. Hens, Egg value and Farm all show MAX with no buy button.
  - A second click does nothing, and the state is the same after a reload.
  - No overflow at 360.
- **Best-payback highlight:**
  - Exactly one row is highlighted, and it is always affordable.
  - It moves after each purchase (Egg value, Egg value, Hens, Egg value), and the next-goal hint matches ("Egg value L7 Ready!").
  - Purchases are saved.
- **Save/reload:** migration, the explainer flag, the cap and purchases all persist.

## Not tested
- The Claude lead about a missing milestone hint for the Jumbo grade's Farm 15 gate (low confidence).
- The refund line on the explainer.
- Firefox and WebKit at 1280.
