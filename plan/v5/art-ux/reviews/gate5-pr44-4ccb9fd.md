# Gate 5 partial set: PR #44 @ 4ccb9fd, m4-on-checklist pass · UI/Visual Designer · 2026-10-19 04:15 CEST

**Verdict: PASS, 0 Majors or worse. Art & UX isn't holding this partial set.** The parts that aren't covered are listed below and stay open for the final #41 set.

## Manifest
- sha `4ccb9fde8251b371c6ee6444b735990e488e2aae`. It matches `git rev-parse 4ccb9fd` in game/, and the commit is on rc/m4-retune-t3, rc/m4-t3-l30plus and fix/saves-level-tolerance. `pushed: true`, rev 1.
- There are 253 shots: chromium 85, firefox 84, webkit 84. Saves are fresh 84, L10 84 and acdbedc-v6rich 84, plus 1 W2 shot. Sizes are 360/375/390/1280 (docked). States are farm, market, the upgrades collection/farm/farm-tracks/workers tabs, and settings.
- Build label: Settings `.version` reads `Egg Farm m3-rc1-pre+4ccb9fd` (checked in the FF contact sheet). Every probe line has the same sha. dd52bfd and later have no HUD label, and Settings is the agreed label.
- Automated checks: docOverflow=false, clip=[] and badText=false on all 253. The only `small` hits are the Upgrades tab selectors.

## Rulings
1. **26px controls = tab selectors → Minor (not Major).** The 107/112/117×26 (WebKit 29) controls are `Collection / Farm / Workers` `<button role="tab">` inside `<div class="tabs" role="tablist">`. Source: game@4ccb9fd src/ui/app.ts:95-98, styled by src/ui/styles.css:117-119, :286-291 and :316. In the Farm and Farm-tracks tabs (and L10 workers) they squash to 26px, compared with 36px on the Collection tab. The ≥44px hit-area rule (styles.css:290) only applies at ≥960. Buy and track buttons don't appear in any `small` list and read at 44px or more in the shots. Fix after the freeze: give `.tabs` `flex-shrink:0` and `min-height:44px` on mobile, so `.tabs button` stops shrinking. This is the same family as the logged 36px tab Minor.
2. **Hint vs highlightPick: matches in every state shot → the chip and copy stay Minor.** The probes/m1.jsonl samples show 0 mismatches (12/12 each): fresh gives `Hens L1` with the hens highlight, and L10 gives `Egg value L10: Large` with eggValue. Migrated has no probe, so I checked it visually: the hint `Hens L5` and the highlighted row is Hens (CR 360, WK 1280 docked). Shots agree: fresh hint and highlight are both Hens (FF 360/375), and L10 is Egg value (WK 360, FF 375/390). selectGoal uses the shared pick (src/ui/next-goal.ts:49-58, the `shared`/bestPaybackAmong path) and the highlight uses src/ui/tracks-ui.ts:53-59. The missing `★ Best buy` chip and the different next-goal copy (no `★ … · +X% income`) are Minor.
3. **W2 asleep (Chromium only) is correct and acceptable for #41.** chromium/w2-asleep-L10-390x844.png reached sleep through natural game time (403 s, no injection). Market Hand and Coop Hand show `· Asleep 💤`, Energy 0% and a Manage button. The label is 69.7px wide with overflow false.

## Other Majors on the checklist
- N1 `1000B`: nothing above $5,000 in this set. No `1000B` and no raw digits. A full test needs the L30+/L50 coins shots, so it's uncovered.
- N3/W1 cut $ at 360: none. `0/17 eggs · $37.40` and `Sell 17 +$37.40` are whole, all prices are whole, and clip is empty everywhere.
- H3 capped row: L10 Hens L13 shows `Needs Farm L11` with a lock and no Buy (OK).
- G1/G2 migration: the M4 tracks UI is visible on first load. Values match fixture acdbedc-v6rich (coins 500000 → $5,000.00, farm 4, collection 6 → Collect per tap L6, workers {} → none hired, eggs 9,005). They map to Hens L4/30 and Egg value L5/30, the same as probe g3 (F4 C6 H4 V5). No L0, $0.00 or NaN.
- MAX/disabled/no price at the top level, hint on an unbuyable level, C1–C4: **not shot** (no L30+/L50/L55 states).
- D1 1280 docked: the tracks block and Balanced strip sit clear of the side panel (WK migrated 1280).

## Not covered by this partial set (stay open for final #41)
- L30+ state (skipped until L30+ merges), so H4, N1 (T tier), N3 `Wants 181B · $1.78T` at 360 and B1 5/5 aren't covered.
- The whole L31–55 section: F40 surcharge price, L50 Farm MAX with Collection $100.4B, L55 H/V MAX, HUD $999.96B/$1.68T.
- The 03:25 addendum (MAX/disabled/no price on all 4 rows, hint never on an unbuyable level) and C1, C2, C3 and C4 (before and after L50→51).
- G1 coach mark, G3 explainer once, W3 toast under the explainer: no explainer on 4ccb9fd. **Not counted**, because HoQA is ruling on it.
- M1 2 s hold / 0.9× switch dynamics. Only static agreement was probed.
- W2 in Firefox and WebKit (accepted as not needed for #41).

## Minors (log, post-freeze)
- Upgrades tab selectors 26/29px (ruling 1).
- `★ Best buy` chip missing, and next-goal copy differs from spec M3 (ruling 2).
- Console errors: 2 per shot. They didn't affect rendering, but QA should name them.
