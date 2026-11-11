# v5 schedule draft (one release, all M5 features flag-on): HoE
2026-10-30 13:10 CET (UTC+1) · Head of Engineering · for HoP to merge into the single v5 schedule to the CEO (due 14:00).
Under D-CEO-20261030-09 (one release, all features on, one full gate on the final RC) as amended by **D-CEO-20261030-10 (nothing is cut; the schedule moves, slips go to the CEO)**.
Sources: m5-build-plan.md 2e32b078 (sequence and deps), product/m5-gate-acs.md 3ae96752 (gate cards), v5-rc-manifest.md 86a20c9e, Architect lane-A estimates (12:58), UI near-term estimates (12:58). **Saves lane S uses plan values until Saves sends its own.**

## 1. Assumptions
- Start: **Fri 30 Oct 15:00 CET**. 24/7 lanes, 1 dd = 8 h of lane time, so 3 dd per calendar day.
- **Review/integration buffer, HoE est.: +15% on every lane total.** This covers cross-lane review (the Architect reviews the sims, HoE pushes bundles), waits on another lane's sim, and box load during QA runs (one heavy sim at a time). The schedule does not assume perfect parallelism.
- **Integration + flags-on golden pin: 2.5/3.0/3.5 dd (low/likely/high).** Most of it rolls as rows merge into rc/v5. The **final serial pin is 1.0/1.25/1.5 dd after the last build-complete** (HoE est.). Owner: the lane with the most slack. That is Saves in scenario (i) and Features in (ii)/(iii). The Architect reviews it in every scenario.
- Code freeze = last build-complete + final pin. RC cut/QA handoff = freeze + 4 h (RC build + smoke, HoE est.).
- Constraint (HoP): freeze can't come before Econ's all-flags-on sims, due **Sun 1 Nov 18:00**. Every scenario below freezes later than that, so the constraint holds.
- All dates are CET (UTC+1), rounded to the hour.

## 2. Lane loads (dd, low/likely/high, before buffer)
| lane | (i) 3 lanes, Features stopped | (ii) + Features 95daf662 | (iii) + Features + hire |
|---|---|---|---|
| A Architect 205f4268 | 17 / 20 / 23 | 13.5 / 15.5 / 17 (golden + abilities sims move to F) | 11 / 12.75 / 14 (clockWage also moves to H) |
| U UI e80556fd | 16 / 17.5 / 19 | 14 / 15.25 / 16.5 (abilities UI 4b/4c moves to F) | 12.5 / 13.5 / 14.5 (zeroGainUi moves to H) |
| S Saves 3ba38cf3 (plan values) | 14.5 / 16 / 17.5 (incl. rolling integration) | 13 / 14.25 / 15.5 | 11 / 12.25 / 13.5 (~2 dd of telemetry v0.6.2 moves to H) |
| F Features 95daf662 | — | 7.5 / 9 / 11 (0.5 ramp, golden sim, abilities sim, abilities UI, rolling integration) | same as (ii) |
| H hire (spec: hiring/v5-second-engineer-spec.md) | — | — | from Sat 31 Oct 15:00: 1 ramp, zeroGainUi, telemetry share, then clockWage after A's rc2Refill |

Near-term, every scenario: UI F6 0.25–0.5, streak UI 1.25–1.75, A2 0.5–0.75, tapCoins pop 0.25–0.5 (waits on A's tapCoins sim), F-2 0.25–0.5. **Streak + tapCoins build-complete: Sat 31 Oct 13:00–23:00.** Architect lane A items 1–6, serial (O-3 + flags-on X1, income-ref, tapCoins, golden, broody, abilities), likely finish **Mon 2 Nov ~13:00** with no buffer (~23:00 with buffer). Broody R7, which breeds on S needs, lands ~Sun 1 Nov 17:00.

## 3. Dates per scenario (CET, buffer included)
| milestone | (i) 3 lanes | (ii) + Features | (iii) + Features + hire |
|---|---|---|---|
| last build-complete (lane that sets it) | Sat 7 Nov 07:00 (A); low Fri 6 Nov 03:00, high Sun 8 Nov 11:00 | Thu 5 Nov 14:00 (A; U close behind at 11:00); low Thu 5 Nov 00:00, high Fri 6 Nov 03:00 | Wed 4 Nov 19:00 (U); low Wed 4 Nov 10:00, high Thu 5 Nov 04:00 |
| **code freeze** | **Sat 7 Nov 17:00** (low Fri 6 Nov 11:00 / high Sun 8 Nov 23:00) | **Fri 6 Nov 00:00** (low Thu 5 Nov 08:00 / high Fri 6 Nov 15:00) | **Thu 5 Nov 05:00** (low Wed 4 Nov 18:00 / high Thu 5 Nov 16:00) |
| **RC cut / QA handoff** | **Sat 7 Nov 21:00** | **Fri 6 Nov 04:00** | **Thu 5 Nov 09:00** |
| full gate (one pass, final RC) | **[GATE_LEN: HoQA sends at 13:30]** | [GATE_LEN] | [GATE_LEN] |
| re-gate buffer (HoE est.) | 24 h fix + 0.5 × GATE_LEN | same | same |
| **release (Latest)** | **[handoff + GATE_LEN + re-gate buffer]** | [same] | [same] |

Gate sizing on file (m5-gate-acs.md, not a calendar duration): 12 cards total ≈177 QA-hours, about 62 authoring and 115 running. Authoring can finish before freeze, so only the ≈115 run-hours come after handoff, spread across the QA lanes HoQA staffs. HoQA's 13:30 number replaces the placeholder.

Gain: (ii) is ≈1.7 days earlier than (i). (iii) is ≈0.8 days earlier than (ii). A hire **instead of** Features gives about (ii) minus ~1 day, because the hire starts ~24 h later and needs a ramp.

## 4. Critical path
- **(i):** lane A, serial: O-3 guard + flags-on X1 → income-ref → tapCoins sim → golden sim → broody sim → abilities sim → G5-P → rc2Refill → autoRefill → clockWage → final integration pin → freeze → RC → full gate → re-gate buffer → release. U and S have 1–2 days of float.
- **(ii):** still lane A (income-ref → tapCoins → broody → G5-P → rc2Refill → autoRefill → clockWage), with U only ~3 h behind. A and U are both critical, so any slip on U's golden/broody UI now moves the date.
- **(iii):** lane U (streak UI → golden UI → breeds UI → pause UI → broody UI → #5b chip + fatigueCue). A ends ~7 h earlier. H's clockWage chain (A rc2Refill ~Mon 2 Nov 21:00 → H clockWage ~Tue 3 Nov 23:00) has float.
- Cross-lane joins that can move any scenario: broody R7 (A) → breeds sim (S); abilities sim (A or F) → pause sim (S) and abilities UI; the pause gate runs only with abilities = 1 (D-HOP-16); rc2Refill → autoRefill and clockWage; golden sim → golden UI.

## 5. ACs to settle before freeze (HoQA rule: every 'Art sign pending' / 'blocked: sim' item)
"Need by" is the date the dependent build work starts in scenario (ii). The hard latest date is freeze − 24 h.
| card | open item | owner | due (record) / need-by |
|---|---|---|---|
| #1 Streak + tapCoins | flag-on AC7 **blocked: sim**: X1 reads no tc_*, the streak cap is hardcoded at 0.30 vs the CSV's 0.28, tapCoins isn't modelled | Econ (D-HOP-17) | Econ target Sat 31 Oct 12:00; record Sat 31 Oct 17:00 |
| #8 Broody | flag-on AC7 **blocked: sim** (broody not modelled) | Econ | target Sun 1 Nov 18:00; record Tue 3 Nov 21:00 |
| #2 Golden | GLD-AC2 not testable as written: needs the HoP-approved 90–240 s gap range, then a spec bump and the CSV tc_egg_gap_*; Econ to confirm X1's ACT = the shipped CSV | HoP + Econ, PMC spec | before golden sim ~Sat 31 Oct 13:00 |
| #3 Breeds | bc_* columns + cap 0.27 in the CSV, B4 re-run, K10 harness (Econ) + K10 CI step (Architect); PMC writes the ST-ACs at 0.27 | Econ, Architect, PMC | K10 handover today 16:30; before breeds sim ~Sun 1 Nov 17:00 |
| #6a rc2Refill | **Art pending**: m5-refill-flows v1.0 6173f757 not signed (signs final after PMW's AC-RF2 errata); AC7 flag-on needs Econ's bot-config doc sha | PMW → Art; Econ | before rc2 build ~Mon 2 Nov 21:00 (ii) |
| #6b autoRefill | **Art pending** (draft e9a8dfd5, no signed sha); tc_autorefill_* not in the CSV; Econ bot-config sha | Art, PMW, Econ | before auto build ~Wed 4 Nov 04:00 |
| #7 Abilities | **Art pending**: no signed M5 flow, 5910646c holds only until Art rules; call policy undefined (gap 4); Econ bot-config sha; values on 8dc90e2b pending measure:l30plus | PMW → Art; Econ | before abilities UI ~Mon 2 Nov 07:00 (F) |
| #5 Pause | Art to confirm 5910646c holds for v1.3.10 (gap 5); E13 amendment (HoP); golden/m5-abilities-only + tracksV7 hired-worker fixture; Econ bot-config sha | Art, HoP, Architect/Saves, Econ | before the pause gate, after abilities build-complete |
| #10 clockWage | AC10/AC11 hang on refill Art 6173f757; Econ bot-config sha | Art, Econ | with #6a |
| #5b salesStopped | **SST-AC13 / SS-36 Art sign pending**; SS-G27 focus target; SS-G29 join fields (PMW); tc_fatigue_cue_* rename (Econ) | Art, PM Market, PMW, Econ | before the chip build (U tail) ~Wed 4 Nov |
| #11 fatigueCue | Art signed (v1.2 3e4dbc9f). FC-AC9 gate risk (pill-hidden spots 6–7/8), needs a UI-VD GE-16 re-count | Art/UI-VD, HoP | before the chip build |
| all | AC7 flag-off rows need the RC flags-0 golden; under -10 this becomes the flags-on golden pin at freeze | Architect/HoE | at freeze |

## 6. Gaps / open items
1. **Features status is contradictory.** D-CEO-09 says "Features engineer restarted now", but D-HOE-20261030-14 says Features declined to restart without Vadim's own go. Scenario (ii) needs Features confirmed running by ~15:00 today. The CEO should confirm.
2. **Saves S estimates are pending.** S uses plan values (13–15.5 dd). In (iii), S is ~11 h from becoming critical.
3. **GATE_LEN and the release date are placeholders** until HoQA's 13:30 number.
4. **Stale scope text:** gate cards #5b/#11 and manifest row 23 still say salesStopped is "CUT to 5.1". Manifest row 9 says F6 is `cut` (D-HOP-03), and manifest cut rule 1 still says "pause built last, cut first". All three conflict with -09/-10. Owners: PM Market/HoQA (cards), Architect (manifest).
5. **Telemetry v0.6.2 and post-L10 are now in v5.** Telemetry is in S's load. Post-L10 is the Econ data lane plus a 0.25–0.5 dd A check that is inside A's total. Econ's candidate CSV is due today 18:00.
6. **No-cut rule plus one gate means a slip anywhere moves the release.** The re-gate buffer is a single fix-and-re-gate cycle. A second failure adds another one, and it is reported to the CEO.
7. The **box-load risk** (17–28 load on 8 cores during QA) is not modelled beyond the 15% buffer.

## Addendum (HoE 13:1x, D-HOP-2026-10-30-29)
- New step after the RC cut, before the full gate starts: the Architect builds a flags-0 test config of the final RC and generates its golden; HoE pins it (sha256) as the comparison base for the flag-off AC7 rows (STK/GLD/BRO, BRD-AC1) and re-pins ST-AC29/GE-AC34 to it. HoE est. 0.25 dd (~2 h wall clock), inside the RC-cut +4 h window before QA handoff, so no date moves.

## Addendum 2 (HoE 13:1x, HoQA QA-D-1030-PR93-FINAL): named prerequisites of the RC pacing gate
X1 can't give a flags-on pacing verdict on the final RC until both of these land in rc/v5:
1. **Lane-A item 1:** bot driver of the real src mechanics, plus a per-flag O-3 guard and flags-on X1 rows. Owner: Architect. First in lane A, starting after #94 lands (~16:00 today). Item 1 alone is 1.0/1.5/2.5 dd at 3 dd per day, +15%: likely Sat 31 Oct ~06:00, high Sat 31 Oct ~14:00. Items 1–3 together finish ~Sat 15:00. Econ's Sun 1 Nov ~20:00 input, not this item, sets the pacing-freeze floor.
2. **X1COV:** X1 reads tc_* plus hens_cost/egg_value_cost, takes the streak cap from the CSV (0.27 with breeds=1, D-HOP-27) instead of the hardcoded 0.30, and models streak+tapCoins and broody. Owner: Econ. Scratch results: streak+tapCoins Sat 31 Oct 12:00, broody Sun 1 Nov 18:00, then a PR each (~2 h Engineering commit).
   **Dependency:** Econ's PRs (and the ac7 `--csv` commit a7dd71b) wait on Vadim's go. Without it, X1 can't verify the flags-on pacing gate. CEO to raise with Vadim.
Both are due before code freeze; every scenario freezes after Sun 1 Nov 18:00, so neither moves the date if Vadim's go comes by ~Sun 1 Nov.

## Addendum 3 (HoE 13:37): combined economy CSV PR and Vadim's go
- Econ's combined v5 data/economy.csv PR (post-L10 rows 11–30, 32 bc_* columns, tc_streak_cap 0.27) is likely Sat 31 Oct 16:00, high 22:00 CET. It follows HoP's 18:00 post-L10 approval, the D-HOP-23 retune Sat 10:00, and QA's 100-seed TS gate set.
- **Each Econ PR needs Vadim's own go** (Econ's rule; three are queued: --csv a7dd71b, X1COV, combined CSV). Buffer: the freeze plan assumes each go arrives within ~6 h of the sha being posted. The CEO should raise the batch with Vadim now so they don't arrive serially.
- Engineering isn't blocked meanwhile: Saves wires bc() to balance by the stable column names now (fail-closed when breeds=1 and bc_* are absent); the values arrive with the PR.

## Addendum 4 (13:38): Saves item dates, from Saves itself (order revised by D-HOE-20261030-22)
Saves' own dates (CET) replace the "pending" note for the near-term items. The order is now (1)→(2)→(4)→(3):
(1) #96 fix likely Fri 15:00 / high Fri 16:30; (2) schema.ts (adds worker_summary.wage_<id>_asleep_cents) likely Fri 21:00 / high Sat 03:00; (4) subset that emits shortage_s/asleep_cents likely Sat 09:00 / high Sat 15:00, which meets HoQA's Sat 12:00 need on the likely path; (3) #95 follow-up with M1 (bc() reads balance by the 32 stable bc_* names, sync-economy fails closed) likely ~Sat 15:00 / high ~Sat 22:00 (Saves to confirm). That's still no later than Econ's combined CSV PR (high Sat 22:00), which carries the bc_* values (3) needs, so the RC date doesn't move. OQ-2 is agreed with PMC (v5-save-shapes 740edf79).
