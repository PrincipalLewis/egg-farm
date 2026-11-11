# PL-2 repro + QA4-1 @ 360: Latest m3-rc1-pre dd52bfd · 2026-10-19 · QA Engineer (UI/Layout & Gameplay)
Build: dd52bfdc1c695cfc7695b3d63ba6a7883c5fd49b, clean worktree /tmp/qa-pl2-dd52bfd, `npm run build` (check-release-build ok), served on 127.0.0.1:4417. Runtime build-id read from the loaded bundle: `m3-rc1-pre+dd52bfd` (asserted in every script, run aborts otherwise). Chromium (system google-chrome, headless). Load was 11–15, so every run used lane 1 (`.browser-test.lock`). No code changes. Evidence: `pl2-qa41-dd52bfd/`.

## 1. PL-2: coins $7,064 vs ~$13.7K after tapping the active Farm tab: NOT REPRODUCED after 82 tries
**State:** injected valid save (FNV sum), Farm L18 (L19 button $11.1K, same as Player's next buy), Collection L12, all 4 workers hired at 60% energy, grader tier 1, coins $13,700, basket 3,000. HUD showed $14K–$19K during the no-buy runs.
**Detector:** MutationObserver on `#coins` logs every HUD text change, plus a sync read in a capture-phase `.tabs` click listener and one at the next rAF. A try fails if any consecutive HUD drop is >5% with no buy/hire/manage in that variant. Before each measurement the script asserts `[data-tab=farm].active` and the Farm card (`#uRow [data-kind=farm]`).
**Variants (1280x800 docked and 390x844 sheet):** single tap; 5 taps (Playwright clicks); 5 synchronous `.click()` in one task; tap at a random 0–1 s offset into the tick; after Sell all; after a Collection buy; after a Farm buy; Workers→Farm→Farm; Escape then Farm; after Manage all.
- Run A (`pl2-run.log`, `pl2-results.json`): 2 rounds × 10 variants × 2 sizes = 40 tries. 0 fails. The only drops were the expected purchase deductions (Collection buy −18%, Farm L18→L19 −85 to −87%). The HUD read the same before, in the click handler and at the next rAF.
- Run B (`pl2-run-nobuy.log`, `pl2-results-nobuy.json`): 3 rounds × 7 no-buy variants × 2 sizes = 42 tries, all with coins ≥$14K. 0 fails, max drop 0.01% (wage drain).
- Shots, each taken right after its own tab-asserted HUD measurement: `pl2-farmtab-final-w1280.png` ($18.9K, Farm tab active), `pl2-farmtab-final-w390.png` ($19K, Farm tab active). Both opened and checked.

**Code:** a tab tap only sets `tab` and `dirty` (`src/ui/app.ts:184`). It never dispatches or touches money. The HUD is written straight from `g.state.coinsCents` each render (`app.ts:508` `setText(coinsEl, fmtMoney(s.coinsCents))`). That leaves no display path where a Farm-tab tap could show a stale or preview value.
**S2-4a match:** no. S2-4a was a header drop after tapping a *greyed buy button* (playtest/triage/2026-10-16-session2.md:12/47). It was never reproduced (engineering/triage/s2-4a-repro/README.md), and the suspected stale-aria path was hardened in 5cc8889 (`src/ui/tap-guard.ts` `tryDispatch` reads live state; `app.ts:255` comment). A tab tap is outside that path entirely.
**Lead for Player/Eng (unverified):** Player's own log puts PL-2 at the moment of an unintended buy. At 15:09:3x it says "Farm L19 ($11.1K) – bought by pressing Escape … (no click on Buy)", and at 15:08:26 there is a Hire Egg Grader ($5,538). A real purchase lowers the HUD too. Also, the HUD uses short format at ≥$10K ("$13.7K") and exact cents below it ("$7,064.xx"), so a purchase that crosses $10K looks like a format jump as well as a drop. Escape only calls `openPanel(null)` (`app.ts` keydown handler), but the last-tapped Buy button keeps focus (focus ring visible in pl2-farmtab-final-w390.png), so a keyboard Enter/Space from DevTools could have pressed it. Not tested here because it needs Player's exact input. Suggest: Player exports the telemetry log (Settings → Export) if PL-2 recurs.
**Severity:** cannot confirm Major without a repro. Suggest it stays a watch item.

## 2. QA4-1 order-card cut-off at 360: does NOT clip for realistic B/T values → drop to Minor
Script `qa41.mjs`, results `qa41-results.json`, log `qa41-run.log`. Injected saves; Market sheet asserted (`#p-market` visible, `[data-nav=market].on`, ≥2 `.order`) before each measurement; screenshot taken right after.
| Case | 320 | 360 |
|---|---|---|
| 999.9B / 1.2T (500B filled) | **.l1 overflows** 148/116 and 138/116 px. `.v` price overlaps the button (G-strict); "$999.9B" is visually cut | no overflow, no overlap. Only the "eggs" unit word ellipsizes (8–18 px left of 36) |
| 2,000T | overflow 146/116, overlap | OK (unit ellipsis only) |
| 123.4T | overflow 146/116, overlap | OK (unit ellipsis only) |
| 9.9T | OK (unit word hidden) | OK, full "eggs" |
| 1,000,000T (1e18, beyond the T tier, QA4-3) | overflow 211/116 | **overflow 211/156**, `.v` overlaps button/.sk/.sy |
The 320 baseline is confirmed (same numbers as Claude QA). At 360, the count and price stay whole for every value up to 4 significant digits plus a suffix. The `.egg` span ellipsizes by design (`styles.css:345`, `text-overflow:ellipsis` on `.egg` only). The only 360 clip is the 1,000,000T string, which exists only because there is no tier above T (QA4-3 Minor).
**Verdict:** does not clip at 360 for realistic values → **QA4-1 drops to Minor** (it is a 320-only clip). The 1e18 residue belongs to QA4-3.
Side note (Minor, follow-up list): queue-chip demand tags clip at 320 and 360 for "2,000T", and "1,000,000T" overlaps its neighbour (qa41-t1500-w360.png). At 320 the 5th empty queue slot wraps to a second row (qa41-*-w320.png).
Shots (all 6 opened and checked against their case): qa41-{b999,t1500,t5}-w{320,360}.png.

## 3. Gate 5 prep (PR #41 M4-on shot scripts): ready, dry-run PASS on dd52bfd (Chromium)
Scripts: `gate5-pr41/` (run.sh, shoot.mjs, manifest.mjs, fixtures/acdbedc-v6rich.json, README.md). Dry-run: `gate5-pr41/dryrun-dd52bfd/` produced 96 shots, 0 assert failures, 0 BAD (overflow/NaN), manifest valid (0 missing, 0 orphans, label checked). The 20 graceful skips (M4 tracks ×16, explainer ×4) are expected with m4.enabled=0. The only console errors are the favicon 404 that the injection step causes itself. Measured: 36 shots flag the known T2 Minor (36px Upgrades tabs on phones). I opened and checked these shots against their entries: L30-settings-360 (label m3-rc1-pre+dd52bfd), L10-upgrades-workers-1280 (docked, Workers active), migrated-acdbedc-upgrades-farm-375 (Farm active, L4 $5,000), L30-market-390 (B/T orders intact).
On #41: expect 120 shots per engine, 360 total.
**Not automated / needs a human or a separate probe:**
- G2: carry-over judged against the pre-migration acdbedc shot (needs eyes plus the acdbedc build).
- G3: explainer shown once after reload, plus TR-MIG-MS no toast storm.
- H6/V2/B1: milestone toasts at the moment a milestone is reached (needs timed buys).
- M1: hint = highlight and the 2 s hold (a behaviour probe, not a shot; earlier `m4on-pr41-90a9c84/hl` covers it).
- C1: contrast ratios.
- D1/W3: coach-mark anchoring and layering judgement.
- W2: no asleep-worker state in the matrix.
- The L10 fixture needs re-tuning on #41 so that one track is capped at F+3 and Hens L10 is just reached (the trackLock rule is only active with M4 on).
- S1: dd52bfd has no HUD build label; the label is only in Settings. The script asserts it there and in the runtime meta. If Art & UX insists on a "HUD label in frame", that needs an Eng change.
