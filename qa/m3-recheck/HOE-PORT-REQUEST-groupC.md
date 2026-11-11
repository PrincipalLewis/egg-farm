# Request to HoE: docked/compact golden-spot port + P8 QA hooks (UI QA group C, P8 fatigueCue) - 2026-10-30 14:2x Europe/Belgrade
For HoQ to send (HoQ 14:20 ruling 5). Pins: sales-stopped spec c29c9285 (v1.3.27 + errata 1-3, ACs = 7148a34d; re-pinned 14:4x from 89dadb43), plan qa/m5/test-plan-sales-stopped.md sha256 99654090 (v0.14.1 + HoQ-authorised edit), Art fatigue-ux ffb13c19, ship set d71ed8cf.

## 1. Golden-spot port for docked / compact layouts (SS-38f, spec L443; Art FC-SV13 L67-78)
P8 has the PHONE branch of the v11 golden-spot port (art-ux/reviews/fc-ac9-golden-spots-360.md 34e86e22, `v11.py`) as `spotsPhone` in m5/fatigue-cue-rules.mjs. It grades SS-38f at **959x600** (phone layout, < 960 wide; flag-off 6/6/4 of 8) as of 14:2x.
Still UNVERIFIED (6 rows: popover closed + open at each size), because P8 has no port for the layouts >= 960 landscape:
| Viewport | Layout | Art flag-off (FC-SV13) | Need |
|---|---|---|---|
| 960x600 | docked-compact (farm width 560 < 880) | 5/4/2 of 6 | spot coordinates + zone list (docked panel, no nav) for docked-compact |
| 1024x474 | docked-compact (farm width 624) | 6/5/3 of 6 | same |
| 1280x720 | docked (farm width 880, vh 720) | not measured by Art | spot table for docked + flag-off measurement (QA asserts flag-on = flag-off) |
Ask: the docked / docked-compact branches of v11 (spot positions as a function of the farm rect, `None` spots, zone set incl. the docked panel), or the engineering source of truth for golden-spot placement at W >= 960, so QA can port them like the phone branch.
Note for HoQ: ruling 5 said "the other 8 spot-count rows stay UNVERIFIED"; with 959x600 graded, 6 remain (8 before).

## 2. QA hooks / names P8 needs (none named by spec or Art; rows in artifacts/v5-ui/harness-rc-next/tests/SELECTORS-NEED-TESTID.md)
Until named, the P8 RC probe (m5/fatigue-cue.mjs) records every dependent row UNVERIFIED (never FAIL); names can be confirmed at the RC with QA_FC_CONFIRMED.
| Hook / selector (P8 working name) | Used by | Purpose |
|---|---|---|
| `eggfarmQa.fatigue.force('tired'\|'asleep'\|'none')` | all rows | force the Rule 2 cue state (fallback today: `eggfarmQa.worker.set` + 6.5 s focus clock) |
| `eggfarmQa.fatigue.setShare(share)` + `eggfarm.debugAdvance(ms)` | SS-49, SS-47 (d) | drive the Rule 2 share for the hysteresis traces (0.11 for 1.9 s vs 2.0 s; 0.13 no end) |
| `eggfarmQa.fatigue.read()` -> {loss_per_s, loss_share, n_tired, n_asleep, n_paused} | SS-48t tapMoment | read the cue state at the tap (spec c29c9285 note 3 (a): tapped values are taken at the tap) |
| `eggfarmQa.stall.force(on)` | SS-47 | show / clear the stall chip mid-episode (stall chip selector: group B P7 row) |
| `eggfarmQa.workers.atRisk()` -> per-worker workerAtRisk $/s | SS-40d, SS-42 (b), SS-48 | Manage target = costliest, ties in code id order market_hand > coop_hand > hawker > grader |
| `eggfarmQa.tc.spawn({ spot })` | SS-40p1 | spawn the golden egg at S1/S5/S8 |
| `eggfarmQa.layout.showZones()` | SS-37, SS-38f | force toast + Full! + x N pill visible for the spot count |
| `window.eggfarm.telemetry.events()` (export read) | SS-38e, SS-47/48/49, SS-36j, SS-TEL | already used by group A (lib/qa-page.mjs `tel`); please confirm it stays in build:qa |
| `src/telemetry/schema.ts` (Saves draft ~21:00, merge Sat ~01:00-07:00) | SS-36j | run is BLOCKED-BUILD until it lands (authoring done) |
| sub-line pill button, its aria-describedby id, popover cue-text id, popover Manage, chip icon, docked panel root, Workers sheet, `.wk[data-risk]`, x N hens pill | see SELECTORS-NEED-TESTID rows | data-testid / stable ids |
