# v5 flags-on RC — one 3-engine UI pass (360/390/1280): estimate
UI QA, written 2026-10-30 ~13:00 CET; **rev 2 13:05 CET after HoQ rulings D-CEO-20261030-10 (quality over speed)**: full 3 engines on every case, 390 stays, no QA runs on PR heads, #5b salesStopped IN v5 (costed). Basis: D-CEO-20261030-09 (decisions.md:103, one release, all M5 on), product/m5-gate-acs.md (QA lines QA-D-1030-M5QA), artifacts/v5-ui/plan.md §Lanes + §Projection (QA-D-1030-V5ULANE). The 13:50 Saves no-lock window is cancelled per HoQ, so it is not a constraint here. Lock rule kept: one engine per lock, each hold ≤ 600 s, load gate per plan (lane B pauses at 1-min load ≥ 12; our own browser starts need < 8).
Labels: **M** = measured today or in a logged run; **D** = derived in plan.md from measured inputs; **A** = assumption, no measured basis yet.

## Headline
- **The pass cannot start until every M5 UI is built and on one RC SHA.** Per the gate cards, the last UI ETAs are clockWage Thu 5 Nov 11:00 and autoRefill Wed 4 Nov 11:00; zeroGainUi is Wed 4 Nov 13:00; salesStopped/fatigueCue are on Wave C Thu 5 Nov 07:00. Build completion is the critical path, not QA time.
- **QA wall-clock from final-RC handoff (rev 2): likely ≈ 14.5 h, best ≈ 9.5 h** (A-heavy; see the arithmetic).
- **Harness prep (can run now, in parallel with the builds): ≈ 2–3 working days of probe authoring (A), plus ≈ 1 h self-test (D/M) and an HoQ review/swap (≈ 1 h, A).**

## Lanes (V5ULANE, plan.md:223)
| lane | engines | lock | ports | load rule |
|---|---|---|---|---|
| A | Firefox | `.browser-test.lock` | base+0 | never pauses |
| B | Chromium, then WebKit after `wk-preflight` | `.browser-test-2.lock` | base+1 | pauses at 1-min load ≥ 12 |
| W (fallback) | WebKit | `.browser-test-2.lock` (shared with B) | base+2 | as B |
Wall = non-browser block + max(lane A, lane B). Every browser step runs under a 600 s watchdog via lane-run/lane-kill.

## Measured / derived inputs
- **M** #83 ba398b6 p2 + axe matrix: 3 engines × 8 sizes, browser work 12:02–12:28 CET = 26 min ≈ 65 s per engine×size cell (qa/m3-recheck/pr83-ba398b6-delta.md).
- **M** Tap suite: Cr 98 s, WK 100 s, FF 194 s, so FF ≈ 2.0× Cr and WK ≈ 1.0× Cr (plan.md §Projection). The older planning factor was 1.3×; I use the measured 2.0×/1.0×.
- **M** CI on ba398b6: 16 min (11:52:46 → 12:09:03 CET). **M** wk-preflight ≈ 1 min. **M** ZG traces at 12,000 s: 200 seeds ≈ 12.3 min, non-browser. Self-test browser parts were reported at ≈ 40–60 s each; I didn't re-measure them.
- **D** Existing v5 matrix (legacy + v5 cases, M5 part excluded), lock time without contention: Cr ≈ 4.2 h; FF ≈ 7.9 h; WK ≈ 3.8 h (plan.md §Runtime estimate minus its M5 part). Non-browser block (gates, variants, unit, zg-trace) ≈ 0.92 h.
- **A** M5 per piece × size run ≈ 3 min on Chromium (plan.md says so itself: "assumptions until m5dry on real UI heads calibrates them"). No M5 UI exists yet, so no M5 probe has a real-UI timing.

## Per-M5-card table (browser minutes per engine at 360/390/1280; Cr basis; FF ×2.0, WK ×1.0)
"Existing" means a probe already in harness-rc/m5 (or ss/) that was written against the spec and dry-run only on c8c5d0c without UI (rows UNVERIFIED). It still needs calibration on the real UI.
| card | flag(s) | QA line / plan | probe | auto / manual | extra sizes | Cr min (A) |
|---|---|---|---|---|---|---|
| #1 | streak + tapCoins | spec acb4cdbb; ST-AC26b CSV rows | existing `m5/streak.mjs` (+tapCoins legs: NEW) | auto; Art shot review manual | ST-AC26b 8 CSV rows | 9 + 8 = 17 |
| #2 | golden | GE-AC15/24/34 | existing `m5/golden.mjs` | auto; audio-log legs auto via hook; shots manual | 960×600 Full! case | 9 + 2 = 11 |
| #3 | breeds | rev 3.8.7 d43e2ce3; `page.clock` | **NEW** | auto + shots manual | 360×640 | 9 (A) |
| #5 | pause | test-plan-pause-resume e06b83be | existing `m5/pause.mjs` | auto | 360×640 | 9 |
| #5b | salesStopped (IN v5, D-CEO-10) | test-plan-sales-stopped v0.9 | partial: `ss/*` cite spec v1.3.10 (current v1.3.16); see v5-m5-probe-scope.md | auto; Art signs SS-17 shots (manual) | 7 sizes (360×640…1280×800) | 21 |
| #6a | rc2Refill | spec 6f0b95ea + FC 0.3.18 | **NEW** (m41-p2 refill probes reusable) | auto; RF-AC3/8 vs unsigned Art v1.0 | 1024 docked | 12 |
| #6b | autoRefill | spec 3b64af39 AC-LR1–21 | **NEW** | auto; no signed Art (shots can't be judged) | — | 9 |
| #7 | abilities | test-plan-abilities 39cce659 | existing `m5/abilities.mjs` | auto; no signed M5 Art flow | 360×640 | 9 |
| #8 | broody | test-plan-broody-hen 54bcb8a1 | existing `m5/broody.mjs` | auto + shots | — | 9 |
| #9 | zeroGainUi | review 42281fa9, spec 0.3.7 | **NEW** UI probe (zg/ is sims only) | auto; m5x-casual waits on hook | 360×640 | 9 |
| #10 | clockWage | spec af9850b5 | **NEW** | auto; B3–B10 vs unsigned Art v1.0 | — | 9 |
| #11 | fatigueCue | SS-23c/d/e/f, FC-AC8 | **BLOCKED** until spec v1.3.19 + Art fatigue-ux v1.3 (16:00, D-HOP-24: icon-only chip < 740 px height); costed at the old size | auto | — | 9 |
| (bbstop/SG-3/SG-12) | bestBuyV2 stop | plan.md SG-3/SG-12(e) | existing `m5/bbstop.mjs`, `sg12-grep.sh` | auto | — | 3 |
| matrices | BH-AC13/13b ×10, AC-P15 ×4, SG-11 ×2 (plan.md) | | existing | auto | | 16 |
| **M5 total** | | | | | | **Cr ≈ 152 min ≈ 2.5 h; FF ≈ 5.1 h; WK ≈ 2.5 h** (all A) |
Manual work (Art shot review, a human pass on unsigned flows) isn't lock time. It runs after the shots land: ≈ 1–2 h for Art plus me (A).

## Arithmetic (rev 2, lock time, no contention)
Lever mapping (my reply numbering → HoQ ruling): 1 Cr full + FF/WK smoke **REJECTED**; 2 cut 390 **REJECTED**; 3 second browser lock for FF **ACCEPTED**; 4 reuse m41-p2 probes **ACCEPTED**; 5 absolute checks only, no vs-base re-baseline: **only where the AC is absolute**; 6 m5dry on PR heads **REJECTED**; 7 pre-built dist **ACCEPTED**; 8 parallel probe authoring **ACCEPTED**.
- Per engine: Cr 4.2 (D) + M5 2.5 (A) = 6.7 h; WK 3.8 + 2.5 = 6.3 h; FF 7.9 + 5.1 = 13.0 h.
- Relative ACs (flag-off DOM/rects equal to a base: ZGU-AC2, BRD-AC6, SS-36 rc2Refill = 0, every card's flag-off no-UI probe) need a base side. Plan: a flag-off variant of the **same RC SHA**, built once in the pre-built dist (lever 7), not a separate 22eac98 re-baseline. About +0.5 h Cr, +1.0 h FF, +0.5 h WK (A).
- No m5dry on PR heads means the first real-UI run of every new probe is on the RC. Contingency for probe/selector fixes on RC day: +1 h (A).
- **Likely (lanes as V5ULANE, plus FF split over a second lock):** lane A1 FF ≈ 7.0 h, lane A2 FF ≈ 7.0 h, lane B Cr 7.2 + WK 6.8 ≈ 14.0 h. Wall ≈ 0.25 + 14.0 + 1 (contingency) − overlap of non-browser ≈ **14.5 h** (+ load pauses + HoQ verdict). Lane B is critical once FF is split.
- **Best (needs a lock ruling): WK moves to lane A2 after its FF half.** That's about 28 h of lock work over 3 locks, so wall ≈ 0.25 + ~9.3 + contingency ≈ **9.5–10.5 h**. With three browsers at once, load was measured at 14.75, so lane B's ≥ 12 pause will fire. The real best case sits between 9.5 h and 14.5 h, depending on load.
- The second lock means reinstating `.browser-test-3.lock` (retired by V5ULANE) or naming a new one. That needs an HoQ/HoO ruling, plus my own ports base+3.
- The 600 s hold cap stays (chunked steps). The 13:50 Saves window is cancelled.

## Harness (rev 2)
- Scope, probe list and ETAs: `qa/m3-recheck/v5-m5-probe-scope.md`. Authoring ≈ 30 h (A), split over 3 parallel executors (lever 8). Probes are self-tested against fixtures only.
- Where: continue in harness-rc-next after an audit of its 36-entry diff vs the 71b45fce snapshot (`/workspace/qa-v5-scratch/rc13-pre/next-71b45fce.tar`, sha256 95b5d429…). Reasons are in the scope doc.
- harness-rc (bb28040f, SUMS e646c036…, `-c` OK at 12:55 CET) stays the cleared copy until HoQ clears the new one.

## Critical path (rev 2)
M5 UI builds complete on one RC SHA (last ETA Thu 5 Nov 11:00) → Row 34 balance.json verified → pre-built dist (RC + flag-off variant) → wk-preflight → lanes ≈ 14.5 h likely → Art shot review → HoQ verdict. Harness authoring (≈ Sat 31 Oct early hours, see the scope doc), self-test and HoQ swap must all land before the handoff. Selector re-pointing when the UIs land is the main risk, because new probes can't be run on PR heads.

## Flags: not UI-testable or ambiguous
- **Card count:** HoQ said 11 cards; the doc has 12 sections. #5b is IN per D-CEO-10. #11 fatigueCue is BLOCKED until 16:00.
- The gate cards still say the "v5 RC ships all at 0 (D-CEO-20261030-06)". They need a re-header after D-CEO-09/10.
- GLD-AC2 isn't testable as written (no approved gap range/mean/tol); interim [120, 300) s, mean 210 ±15.
- Unsigned Art: #6b has no signed sha; #7 has no M5 flow; #10 B3–B10 sit on 6173f757. The card now says v1.0 is signed (final on the rc2 errata), so re-check.
- SG-3 heldMs can never reach 2000 ms on a fresh-load fixture (spec L49).
- Streak cap: the build reads 0.4 vs 0.28 of record; breeds = 1 changes it to 0.27, and with all flags on both are 1. **ST rows must be judged at 0.27 on the flags-on RC.** PMC hasn't re-written ST-AC3/5/9/21/25 at 0.27 yet.
- SS-30 (`mh_paused`) was conditional on pause = 1. With all flags on, it becomes a real case, not a fixture.
- The AC7 rows are sim gates, not UI. Several are blocked on Econ.
- Dependencies: pause needs abilities; autoRefill needs rc2Refill; fatigueCue is paired with salesStopped. The all-on Row 34 combo is the only combo costed.
