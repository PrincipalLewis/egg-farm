# M5 feature build plan (next release after v5): HoE draft
2026-10-30 12:20 CET (UTC+1) · Head of Engineering · under D-CEO-20261030-06. Ranking of record: product/m5-value-ranking.md sha1 bfdfd73ee96aa89c746ac53db65967d950f87ae4 (verified 12:21; order and content as CEO-approved rev 2 47ba604e; only change: Pause cites spec v1.3.10). Code base: rc/v5 3f582db (read-only).

## What already exists in rc/v5
F1a GameState fields, F1b evRng/brRng + focus clock, F1c timed-effects registry, F2 save fields + offline/clock rules, F3 m4.flags block + validateBalance M5 rules, isPaused selector (src/sim/pause.ts) + pause load sanitiser, streak sim #87 (src/sim/streak.ts, no UI), tests/bot-m5.ts. **Not in rc/v5:** F6 overlay (branch origin/feat/v5-ui-f6-overlay, unmerged), src/sim/income-ref.ts, any golden/tapCoins/abilities/broody/breeds/refill/wage/zero-gain/fatigue-cue/pause mechanics or UI, telemetry v0.6.2 (V51-TEL-1), #5b chip (V51-SS-1).

## Assumptions
- Sizes are m5.0-sizing.md v1.2 (§2, §15, §15a/b), engineering/decisions.md 2026-10-24 23:12 (M5.1 workers) and reviews/m5.1-breeds-eng-review.md. "HoE est." marks my own numbers.
- Calendar: 24/7 from the v5 handoff, Fri 30 Oct 15:00 CET. **HoE est.: 1 dd = 8 h of lane time**, upper end of each range used. ETAs are "build complete, gate can start", not "flag on".
- Three lanes: Architect 205f4268 (A), Saves 3ba38cf3 (S), UI e80556fd (U). Features 95daf662 is STOPPED and gets no work here; restarting it (or a hire) is a dependency for pulling the calendar in (see Risks).
- Art (12:15): golden, streak/tapCoins, breeds, zeroGainUi, pause, broody, clockWage and bb-stopgap have signed specs/assets. **fatigueCue, abilities and rc2/auto Refill need Art flows (about 2–4 h each) that start only after the PM agrees the flow.** Art takes Refill first.
- Telemetry v0.6.2 (D-CEO-20261030-04, first after v5) is needed before *tuning* streak, pause, broody or abilities, not before they turn on (rank rev 2).

## Lane sequence (ranked order, engineering-forced moves noted)
- **A:** O-3 loud-fail guard + flags-on X1 stack (0.5, HoE est.; V51-BPAR-1 runs alongside) → income-ref + tapCoins sim → golden sim → broody sim → abilities sim (4a) → G5-P driver → rc2Refill → autoRefill → clockWage.
- **S:** telemetry subset (V51-TEL-1) → breeds sim/save/telemetry/tests → pause sim → full telemetry v0.6.2 → F-3 nest-cap fix (before broody flag).
- **U:** F6 overlay merge → streak UI + A2 + tapCoins pop + F-2 → golden UI → breeds UI → pause UI → abilities UI + sheet auto-close → broody UI → zeroGainUi → V51-SS-1 chip + fatigueCue.

Engineering-forced reorders (only these):
1. **Broody sim before breeds (A, rank 8 → ahead of 3):** breeds needs Broody's R7 accrual and guard (reviews/m5.1-breeds-eng-review.md, verdict + total), so the 0.75 dd sim moves up; Broody UI and its flag keep rank 8.
2. **Abilities sim before pause (A, rank 7 → ahead of 5):** pause guards G1/G2 end and lock calls (sizing §3 ABS→PA, §9.2), and pause shares sim/workers.ts with #4 (hotspot 5, one owner, P/R after #4). Abilities UI and flag keep rank 7.
3. **F6 overlay first (U):** golden, broody and streak UI mount on it (sizing §3).
4. **Pause is no longer "built last"** (see Decision requests).

## Per-feature plan
| HoP rank | feature (flag) | exists | missing | size (dd) | hard deps | lane | build-complete ETA (CET) | gate |
|---|---|---|---|---|---|---|---|---|
| 1 | Streak UI + tapCoins (streak, tapCoins), one unit | streak sim #87, F1b/F1c | income-ref.ts, A1 tap sim, meter/chips UI, A2 pops, +$ pop, F-2 sale-preview fix, telemetry fields | streak UI 1.25–1.5 + A2 0.5 (§2 #2, sim done); tapCoins 1–1.5 (§2 #3); F-2 0.25 HoE est. | income-ref (A) before tapCoins; F6 (U); telemetry before tuning only | A + U | Sat 31 Oct 17:00 | ST-AC1–30 |
| 2 | Golden (golden) | evRng, F1c registry, F2 fields | spawn/lifetime sim, frenzy, tapCollectible, overlay UI, SFX hooks, telemetry | 3.75–4.25 (§2 #1: sim 1.5, UI 2–2.5, tel 0.25) | F6; telemetry subset for GE-AC27 | A + U | Sun 1 Nov 13:00 | GE-AC1–36 |
| 3 | Breeds (breeds) | flag + focus clock | all sim/save, hatch, incubator, Flock sheet UI, telemetry, fixtures | 7.0 (breeds review: sim/save 3.0, UI 2.0, tel 0.5, tests 1.5) | broody sim R7 (A); telemetry envelope (S); +0.5–1.0 dd each if a prereq slips | S (sim/save/tel/tests) + U (UI) | Mon 2 Nov 05:00 | BR-AC1–53 |
| 4 | Progression past Farm L10 (no flag; data) | L0–30 economy.csv | Econ rows past L10 (candidate CSV by 18:00 CET Oct 30) | Econ data lane; engineering 0.25–0.5 **HoE est.**: sync-economy CSV→balance.json mapping check + pacing test on the new rows | CEO ruling D-HOP-2026-10-30-11 (below) | Econ; wiring check A | candidate Fri 30 Oct 18:00; QA gates ~20:00 | Econ pacing test + mapping check; ACs per m5-gate-acs.md |
| 5 | Pause (pause) | isPaused selector, load sanitiser, save fields | paused flag through 15 call sites, guards G1–G4, lockout, toggle/banner UI, G5-P driver | 3.0–3.5 (§15b: sim 1.25–1.5, UI 0.75–1, guards, P-12, G5-P 0.5) | abilities sim (forced reorder 2); spec m5-worker-pause-spec v1.3.10 b4f86ca8; AC-P1(a) blocked until engineering/golden/m5-abilities-only exists; PR must ship a committed tracksV7 save fixture with ≥1 hired worker (AC-P1/AC-P13) | S (sim) + U (UI) + A (G5-P) | build Mon 2 Nov 19:00; **gate starts after abilities build-complete Tue 3 Nov 09:00** (pause needs abilities=1, HoP ruling) | AC-P1–19 |
| 6 | Refill (rc2Refill, then autoRefill) | flags only | charges, refill action, Manage/Shift sheet, auto rule, save field, telemetry | rc2 3–4.5 + auto 2.0–2.5 (decisions 2026-10-24 23:12) | **Art flow after PM agrees (2–4 h)**; rc2 before auto; spec m5.1-lighter-refill-proposal v0.8.9 3b64af39 | A | rc2 Tue 3 Nov 15:00; auto Wed 4 Nov 11:00 | AC-LR1–21 (+ rc2 AC-RF*) |
| 7 | Abilities (abilities) | F1c registry, focus clock | 4a sim, 4b card/Activate-all UI, 4c sheet auto-close | 4.0–4.75 (§15a: 2.0–2.25 / 1.5–2.0 / 0.5) | **Art flow after PM agrees (2–4 h)**; 4c with 4b; m2 card (B3) | A (4a) + U (4b/4c) | Tue 3 Nov 09:00 | AC-M5A-1–22 |
| 8 | Broody (broody) | brRng, save fields | nest sim, tapBroody, yard UI, glow, telemetry | 2.25–2.5 (§2 #5) | #69 yard (in main); F6; F-3 nest-cap fix (S) | A (sim) + U (UI) | Tue 3 Nov 21:00 | BH-AC1–29 (incl. BH-AC20 release test) |
| 9 | zeroGainUi (zeroGainUi; zeroGain.confirm stays 0) | flag only | purchase-gain check + UI | 1.5–2 **HoE est.** (no sized figure on file) | none beyond F3 | U | Wed 4 Nov 13:00 | ZG-AC1–21 |
| 10 | clockWage (clockWage) | flag only | wage rule in workerActions, U1/U2-e, captions/toast, telemetry | 2.5–3.0 (decisions 2026-10-24 23:12) | rc2Refill (charges) | A | Thu 5 Nov 11:00 | AC-FC1–19 |
| 11 | salesStopped + fatigueCue (salesStopped, fatigueCue; ship paired, D-HOP-2026-10-30-16) | §4.2 income selector already in rc/v5 (src/econ/income.ts marketHandStalled/demandPerSec, salesStopped(), headerRate; checked 12:29 at 3f582db) | #5b Sales-stopped chip + stall timers (Rules 2–4), SS-15 cases, sales_stall/fatigue_cue telemetry; fatigueCue Rule 2 HUD cue on the chip | 1.75–2.0 (§14 2.0–2.25 less the §4.2 fix already shipped) + fatigueCue share 0.5–0.75 **HoE est.** | **Art flow after PM agrees (2–4 h)**; F6 (chip rect in spawn exclusions, E11); Econ tc_fatigue_cue_* rename | U (V51-SS-1) | Thu 5 Nov 07:00 (Wave C, both in one build row) | SS-1–35 |

Lane loads (HoE est.): A ≈ 19–23 dd, S ≈ 13–15.5 dd (full telemetry 6–7.5 per §10.2), U ≈ 16–19 dd. Last build-complete Thu 5 Nov ~11:00 CET; release date depends on QA effort in product/m5-gate-acs.md.

## Gate per feature (each its own flag, next release)
Every row's gate is: **ACs and QA line: product/m5-gate-acs.md §<feature> (pending 12:55)**, citing the spec AC IDs in the table. Engineering items on every row:
- flag-on unit tests and flag-off byte-identical goldens (f90d1678, a54c9cf9, AC7 hashes);
- sim/pacing: its X1 row(s) on the shipped economy table, with a flag off/on delta and Econ's re-prediction for that flag;
- save compat: Saves QA trace, old→new→old fixtures, sanitiser on tampered saves;
- UI rows: UI QA plus Art live-build check; balance: HoQA;
- **flag-1 rule (D-CEO-20261030-07):** a flag goes to 1 only on a row that is built and whose gate passed; otherwise it ships 0.
- Claude is never a gate (rule 22).

## Gate-card engineering gaps (PMC product/m5-gate-acs.md 106b7a90; HoE 12:26)
- **Flag-off golden:** f90d1678 is rc1. Owner Architect: regenerate the flags-0 golden on the v5 RC SHA at the cut (~14:00); HoE re-pins ST-AC29 / GE-AC34 to that hash in this plan and tells PMC.
- **#69 (yard):** in rc/v5. ebf3a7a is an ancestor of 3f582db (checked 12:26). #69's **Minor m1 follow-up** (build the 12 yard slots once, or re-apply the Broody layers after every rebuild; broody spec R2, BH-AC20) is NOT confirmed. Owner UI, before broody UI; BH-AC20's CI check owner Architect.
- **QA hooks (committed in spec, not built). Each is built in the same PR as its feature:**
  - `eggfarmQa.streak.set` and `audio.log` go to UI (streak UI).
  - `tc.spawn`/`state` and `frenzy.start` go to Architect (golden sim), with UI for the overlay side.
  - `broody.set` and `eligible` go to Architect (broody sim).
  - The m5x-casual observe hook goes to Architect.
- **Breeds:** the K10 CI step goes to Architect, alongside the #93 X1 CI work; Econ owns the K10 harness. BR-AC31e (E22c, asleep/unpaid estimator edge) hook is named `eggfarmQa.breeds.hatchEstimate`, owner Saves (breeds sim), built in the breeds sim PR. Breeds UI is on lane U (not waiting for Features).
- **Wave A date:** the hooks fit inside the sized test budget (breeds tests 1.5 dd), and the K10 CI step runs on A in parallel, so the build-complete date stays Mon 2 Nov 05:00. The gate can slip if Econ's K10 harness arrives late, but the build date does not move.

## Decision requests
- **D-HOP-2026-10-30-11 (CEO):** supersede the Oct 19 L0–30 byte-exact economy ruling so Econ's post-L10 rows can ship. Needed before the ~20:00 QA gates count.
- **CEO:** confirm D-CEO-20261029-01's "pause built last, cut first" was a v5 cut rule and is retired for this release (rank rev 2 puts pause at 5). If not, pause moves to the end of S/U (+0 dd, ETA ~Thu 5 Nov).
- **CEO + Hiring Manager:** restart Features 95daf662 or hire (Risk 4).

## Risks
1. **Built vs flag-only drift.** Row 34 read as if features existed. Fixed by HoO's Build state column (manifest e3846400) and D-CEO-20261030-07: a flag goes to 1 only on a built row whose gate passed, with the code checked at the RC SHA before any ship-values call.
2. **Flags-ON is a code release, not a balance.json edit.** X1 and the B drivers read the tree's balance.json and record its sha256 and m4.flags; the O-3 guard throws on flags it has no mechanics for. Each flag needs its src mechanics stacked, the O-3 guard updated and an Econ re-prediction before its X1 row means anything.
3. **Pacing G1 under the stacked effects** (sizing §6.1, §9.3: up to ×4.5 at F18). A late G3/X1 fail turns into retunes or a flag shipping 0.
4. **Three lanes, Features stopped.** U is the busiest seat; A carries six sims. Restarting 95daf662 (or a hire) for abilities UI + full telemetry would take ≈6–9 dd off U/S (HoE est.). See Decision requests.
5. **Art flows for Refill, abilities and fatigueCue** start only after PM agreement; a late flow pushes those ETAs one for one.
6. **Telemetry before tuning:** features can turn on with modelled values, but no retune until full v0.6.2 lands (S, ~Wed 4 Nov).
7. **Box load during QA** (D-HOE 2026-10-29 23:18): parallel 3-browser lanes cap engineering at one heavy sim.
8. Pause E13 amendment (D-HOE-20261030-10) and F-3 nest cap must close before their flags go to 1.
