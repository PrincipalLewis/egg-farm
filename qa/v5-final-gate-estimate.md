# v5 final-RC gate estimate: one full pass (HoQA) · **v4**
**v4 2026-11-05 ~20:25 CET (TASK HoQA/gate-revalidate-20261105, QA-D-1105-GATEEST4):** re-issued after the studio pause (STOP D-CEO-20261030-13, Fri 30 Oct 15:10 → resume D-CEO-20261105-01, Thu 5 Nov ~20:10 CET). The only figure change is **lane B at UI QA's rev 2 recount** (`qa/m3-recheck/lane-B-minutes-20261030.md` sha256 `f15a1eed…`, verified on disk, mtime Fri 30 Oct 15:08, unchanged since), ACCEPTED with its caveat (below). v3 (sha256 `b0feef98…`) kept as `qa/v5-final-gate-estimate.md.bak-v3-b0feef98` (byte copy verified). **v3 → v4: best ≈ 19.5 → ≈ 18.5 h (18.24 unrounded); expected ≈ 31 → ≈ 30 h (29.74); full re-run ≈ 45 → ≈ 42.5 h (42.48).** Rounding as in v3 (up to the next 0.5 h). Nothing else in the model moved: no build, measurement or rate changed during the pause (rc/v5 `518de304`, last commit Fri 30 Oct 15:59 CET; no remote ref newer than that).
- **Caveat (kept from UI QA rev 2, A10):** the #7 abilities and #5b sales-stopped row counts are read off the plan rows (states × sizes × inputs, sim waits from the stated timings), **not measured on their probes** (BLOCKED-ON-BUILD / not built). Rows with CDP full-tree reads or many rects (Q-AB-N1–N3, SS-37, SS-23f) may sit nearer the high column. The **high column (lane B ≈ 15.53 h) is the planning bound**; it is still below v3 in every scenario.
- **v4 is a re-price, not a re-measure.** WK 1.20× per cell / 1.84× runFor (MEASURED, RESULTS.md `3908dc28`), FF ×2.0 (ASSUMED), Saves 26/37/60 min, fix 6 h and re-gate 5.5 h are unchanged from v3.

## V4.0 Headline (supersedes the v3 headline in §0 below)
| | v4 likely | v4 high (#7/#5b at the high column) | v3 | Δ v4 likely vs v3 |
|---|---|---|---|---|
| UI lane B (Cr → WK, critical) | **≈ 14.99 h** (UI QA 14.98: subtracted from rounded 16.10) | ≈ 15.53 h | 16.10 h | **−1.12 h** |
| UI lane A (Firefox, 2.0 × Cr) | ≈ 13.97 h (≈ 7.0 h per lock with lever 3) | ≈ 14.46 h | 15.10 h | −1.13 h |
| Saves gate (lock 1 first) | 26 / **37** / 60 min | same | same | 0 |
| **Best case** (handoff → verdict) | **≈ 18.5 h** (18.24) | ≈ 19.0 h (18.78) | ≈ 19.5 h (19.35) | **−1.0 h** (−1.11 unrounded) |
| **Expected** (one fix ≈ 6 h + targeted re-gate ≈ 5.5 h) | **≈ 30 h** (29.74) | ≈ 30.5 h (30.28) | ≈ 31 h (30.86) | **−1.0 h** |
| **One fix + full re-run** | **≈ 42.5 h** (42.48) | ≈ 44 h (43.57) | ≈ 45 h (44.71) | **−2.5 h** (−2.23 unrounded) |
| Critical path | 0.25 prep → lane B 14.99 → slack 0.75 → Art tail 1.0 → verdict 1.25 | | lane B 16.10 | |

### V4.1 Lane B, v3 → v4 (hours; Cr+WK minutes from UI QA rev 2 `f15a1eed`)
| Component | v3 | v4 | Δ | Basis |
|---|---|---|---|---|
| Cr legacy matrix | 4.20 | 4.20 | 0 | UI estimate rev 2 `8eae75b4` (unchanged) |
| Cr M5 part (152 min) | 2.50 | 2.50 | 0 | unchanged |
| WK legacy (×1.2) | 4.56 | 4.56 | 0 | MEASURED 1.2× (unchanged) |
| WK M5 part (×1.2) | 3.00 | 3.00 | 0 | unchanged |
| No re-baseline cells | −0.50 | −0.50 | 0 | unchanged |
| v2 additions, Cr | 63.1 min (1.05) | **29.1 min (0.49)**; high 43.9 | −0.57 | rev 2 bottom-up |
| v2 additions, WK | 77.6 min (1.29) | **44.7 min (0.75)**; high ≈ 62.5 | −0.55 | rev 2, measured rates applied per row |
| **Lane B** | **16.105** | **14.99** (high 15.53) | **−1.12** | |

Per card (Cr / WK min), v3 → v4: **#7 abilities** 27 / 32.4 → **17.0 (high 22.3) / 28.0**: 72 % of Cr is runFor (N9, N11, N13, N17, N18), so WK is ≈ 1.64× on this card, not 1.2×; **#5b** 30 / 36.0 → **6.7 (high 13.4) / 8.6**; **#9** 0.4 / 0.48 → **1.5 (high 3.1) / 1.7** (+1.1 Cr min for the same-build ZG-AC12 and Card #9 P3 zg-on/zg-on-bb0 snapshots, A9); **#12** 5.70 / 8.69 → **3.9 (high 5.2) / 6.5** (dead zone at frame 0, no 10 s runFor). Sum 140.7 → **73.8 Cr+WK min**. HoQA arithmetic check: Cr 17.0 + 6.7 + 1.5 + 3.9 = 29.1 ✓; WK per-card totals are 27.9/8.6/1.7/6.4 in the line tables vs 28.0/8.6/1.7/6.5 in the headline (rounding, ≤ 0.2 min); 44.7 used.

**Assumption changes vs the v3 table (§3.3):** W4 (which cases are runFor-heavy) is now **per row, from the plan** (rev 2), not "B1(b)/B3/B5 only"; v3's sensitivity "#7/#5b runFor-heavy, +0.6 h" is retired and replaced by the high column. C1 (#7 +27, #5b +30 Cr min) is replaced by rev 2 (ASSUMED-from-plan-rows, A10). A1/A2 are MEASURED as in v3. The legacy-at-×1.0 sensitivity stands (−0.76 h).

### V4.2 Lane A margin (new risk, not a figure change)
Lane A shrinks as much as lane B (FF is 2.0 × the same Cr minutes), so the v3 margin is gone if lever 3 is unusable: lane A on one lock finishes ≈ H+1 + 13.97 = **H+14.97** vs lane B **H+15.24**, a **0.27 h** margin (v3 1.0 h). If the Saves gate runs to its HIGH (60 min + up to 25 min lock wait), lane A on one lock finishes ≈ H+15.4 and **becomes critical by ≈ 0.2 h**. With lever 3 (load < 12) lane A ends ≈ H+8. Mitigation: keep lever 3; Saves releases lock 1 as soon as its browser rows finish. No change to the figures above (the overrun is inside the 0.75 h lane slack).

### V4.3 Calendar on the refreshed schedule (`product/v5-schedule.md` sha256 `dfc795ab…`, HoP Thu 5 Nov 20:25 CET, D-HOP-2026-11-05-01 / D-CEO-20261105-02; handoff = freeze + 4 h; all CET)
| Scenario | Handoff | Best 18.5 h | Expected 30 h | Full 42.5 h | Schedule today (v3 19.5/31/45) |
|---|---|---|---|---|---|
| **(i) OPERATIVE** | Sat 14 Nov 02:00 | **Sat 14 Nov 20:30** | **Sun 15 Nov 08:00** | **Sun 15 Nov 20:30** | Sat 21:30 / Sun 09:00 / Sun 23:00 |
| (ii) | Thu 12 Nov 09:00 | Fri 13 Nov 03:30 | Fri 13 Nov 15:00 | Sat 14 Nov 03:30 | Fri 04:30 / Fri 16:00 / Sat 06:00 |
| (iii) | Wed 11 Nov 14:00 | Thu 12 Nov 08:30 | Thu 12 Nov 20:00 | Fri 13 Nov 08:30 | Thu 09:30 / Thu 21:00 / Fri 11:00 |
High column on (i): Sat 14 Nov 21:00 / Sun 15 Nov 08:30 / Sun 15 Nov 22:00. Every verdict time moves **earlier** by 1.0 / 1.0 / 2.5 h; no scenario choice changes. The schedule's L14/L24/L87 cite v3 `b0feef98` and need HoP to re-issue them; QA does not edit the schedule.

### V4.4 Gate inputs after the pause: stale or unverified (checked Thu 5 Nov 20:20–20:25 CET)
**Spec pins** (UI QA harness `m5/spec-pins.mjs` `verifyPins()`, run by HoQA 20:2x; frozen copies all OK):
- BBv2 spec: pin v1.0.3 `27e753d8` vs live **v1.0.4 `4ea3841a`** (DRIFT-DEFERRED; §6 `suppressed` semantics: tested property is `suppressed && hint.affordable = 0`, only exception the post-L30 mark-null net with zeroGainUi = 0). UI QA's `bbv2-rules.mjs` already asserts the v1.0.4 form (no plain `suppressed = false`). HoQA re-pin to v1.0.4 needed.
- Gate Card #12 block: pin `341609eb` vs live block **`6cb27b3d`** (DRIFT-DEFERRED; must-strings present). Card #9 block `3050a09e` = live (OK). Whole-file gate-acs live sha1 **`7ec49964`** (sha256 `a521c5b2`, mtime Fri 30 Oct 16:01; Oct 30 HoQA cite was `55a9fa1d`). HoE snapshot `4a154bb4` is older than both; not used.
- lighter-refill: pin v0.8.10 `f71e4516` vs live **v0.8.13 `13577395`** (DRIFT-DEFERRED; body edits beyond errata → re-pin only after a diff review). failure-cost re-pinned to v0.3.24 `54b994bd` by UI QA today (OK).
- Gate Card #12 HoQA QA line still cites BBv2 **v1.0.3 `27e753d8`** (L1061) and "N6 … `qaPicker` fields per spec v1.0.3 §6" (L1063); no plain `suppressed = false` assertion found in the B1/B3/U6/N6 text. Its "open tension (HoP)" sentence is stale (closed by D-HOP-51, ship-set `d71ed8cf`).
- UI QA HANDOFF-groupA text still says ship-set `3fdd98ab`; the harness pin is `d71ed8cf` (text only).
- Shot list `shots/shot-list.json` regenerated Thu 5 Nov 20:22 (sha256 `bf185956`, 1257 planned / 45 BBV2): UI QA's `b846cb76` is superseded; counts unchanged. Live file, so pinned by content (QA-D-1030-MANIFESTPIN).
- Abilities plan is **v0.10.3**, sha256 `ef94f478` (rev 13 re-cite); SS plan v0.14.1 sha256 `99654090`; telemetry errata live = pin = **rev 13 `a0e8f6d7`** (no rev 14 issued).
**Head refs:** rc/v5 = **`518de304`** (#98 K10, merged Fri 30 Oct 15:59; known-red monitor). #94 `f14b806d`, #96 `c5b2ddcf`, #97 `0ad018de` are ancestors (verified). No commit on any remote ref since Fri 30 Oct 15:59.
**Open PRs into rc/v5:** #100 BBv2 `d654afda` (flag 0; base behind 518de304; MERGEABLE/UNSTABLE: k10 FAILURE (known-red), `pacing-x1-stack` aggregate FAILURE with all three shards SUCCESS, release-globals SKIPPED; carries the BBV2-AC13 re-baseline probe: **acw1 9 seeds over vs ≤ 5 allowed**). #99 zg-followup `c4a1a76f` (MERGEABLE/UNSTABLE: same `pacing-x1-stack` aggregate FAILURE). Both untouched since Fri 30 Oct 16:00, awaiting the Architect. Stale: #89 (open), #84/#85/#86 (draft; #86 blocks Q-AB-N7/N8).
**Outstanding fixes, all past due, none pushed:** #94 **F1** (Architect, bot-m5 sha-pinned flags-0 fixture; due Sat 31 Oct 18:00, high Sun 1 Nov 12:00); **focus-guard** fix (no confirm = 1 runs until it lands); **P8 hooks** (TASK HoE/p8-qa-hooks, UI `e80556fd`; due Sat 31 Oct 12:00, high 20:00; P8 rows UNVERIFIED); Architect's **SIM-only flag-list PR** (D-HOE-38, due Sat 31 Oct 12:00; all flag-on UI waits on it, and HoE merges #100 only after it). All need new ETAs.
**Open questions:** telemetry errata **rev 14** (TELERR7 minors m-1…m-4: row #23 'below L30' wording, G-8 line refs, eng decisions re-cite, BBv2 v1.0.1 cite) not issued; **C-2** rc2Refill = 0 + pause = 0 paused totals still UNVERIFIED (PMC, for rev 14); K10 green on D-HOP-52 (RC-cut blocker); B4-passing final CSV (schedule O2, at risk); BBV2-AC13 acw1 re-baseline sign-off (Econ + HoQA, Sat 7 Nov 18:00).
**Gate-duration effect of the inputs above:** none on the figures (they change *whether* rows can run, not how long). #100's acw1 9 > 5 raises the odds of the expected/full scenarios; a G4/CSV fix stays a full re-run trigger (§3.2).

---
## v3 text (kept for history; superseded where §V4 says so)
**v3 2026-10-30 ~15:05 CET (TASK HoQA/GATE-EST3, QA-D-1030-GATEEST3):** re-issued with **measured browser timings** from UI QA's measurement run (`qa/m3-recheck/meas-20261030/RESULTS.md` sha256 `3908dc28…` verified; evidence `ev-20261030-144325/SHA256SUMS` sha256 `bb9ff2aa…` verified, `sha256sum -c` 23/23 OK; rc/v5 `65a7443`, build-id `m4.1+65a7443` on both engines; record-only, UI1 cell is a PROXY on FX-L17 $3,000 because BBv2 isn't built) and with UI QA's lane-B recount (`qa/m3-recheck/lane-B-minutes-20261030.md` sha256 `b71fbc7e…`, ACCEPTED, §1.3). v2 (sha256 `05891340…`) kept as `qa/v5-final-gate-estimate.md.bak-v2-05891340`. **v2 → v3: best 18.5 → ≈ 19.5 h; expected 29.5 → ≈ 31 h; full re-run 43 → ≈ 45 h.** Deltas by component: §1.4. Assumptions, each MEASURED (source) or ASSUMED: §3.3.
- **Correction to the brief's framing:** v2 never used a 2.3× WebKit factor. v2 used **WK ×1.0** (UI QA's tap suite, Cr 98 s / WK 100 s, `v5-flagson-ui-pass-estimate.md` L20). 2.3× was UI QA's launch-dominated lane-run hold signal (lane-B file, r_hold), never applied. The measured **1.2× (cells) / 1.84× (runFor)** is therefore **higher** than v2's basis, so lane B grows. It doesn't shrink.
- **Cite drift (not acted on):** v2 cited `v5-flagson-ui-pass-estimate.md` as sha256 `3652d871…`. On disk at 15:00 it is `8eae75b4…` (mtime 13:00, header "rev 2 13:05"). The figures used here (Cr 4.2 / WK 3.8 / FF 7.9 h legacy; M5 152 Cr min; FF 2.0×, WK 1.0×) match that file as read. UI QA should say which sha is of record.

**v2 2026-10-30 ~14:20 CET (TASK HoQA/BBV2-GATE1, QA-D-1030-BBV2GATE1):** re-issued because the wall time moves > 0.5 h. Folds in (a) **BBv2 in v5** (D-CEO-20261030-11 (3), D-HOP-47/-48/-49; ship-set sha256 `3fdd98ab`, `bestBuyV2 = 1`; spec v1.0.1 `5dc9596b`; Card #12), (b) abilities plan v0.9.1 run ≈ 19.5 h (was 11), (c) sales-stopped plan v0.14.1 run ≈ 27 h (was 12 + 2), (d) schedule of record scenario (iii) (D-CEO-11: freeze Thu 5 Nov 05:00, handoff Thu 09:00). Run plan now in its own file: `qa/v5-final-rc-run-plan.md`. v1 (sha256 `f3a385bc…`) kept as `qa/v5-final-gate-estimate.md.bak-v1-f3a385bc`. **v1 → v2: best 15.5 → ≈ 18.5 h; expected 26 → ≈ 29.5 h; full re-run 37 → ≈ 43 h.** The v2 browser deltas are HoQA bottom-up (§1.3) and **provisional until UI QA re-counts lane B** (asked at 13:51).

v1 written 2026-10-30, 13:0x CET. Owner: Head of QA. For HoP and HoE (13:30) and the CEO's v5 schedule (14:00).
Basis: D-CEO-20261030-09 (one release, every M5 feature in ranking `bfdfd73e` built with its flag on, one full gate on the final RC), amended by **D-CEO-20261030-10** (no cuts: a row that isn't built, or fails the gate, is fixed and re-gated, and the release waits). HoP D-HOP-25 and D-HOP-27 apply (owners and dates below).

**There is no "cut" option in this document.** Every slip moves the date.

## 0. Headline
| | Figure |
|---|---|
| QA **authoring** (pre-freeze, no RC needed) | **v2 ≈ 93 h** (v1 60.5 + abilities +9.25 + sales-stopped +17 + BBv2 +6; parallel with the builds, so no wall-clock effect). v1: **≈ 60 h** of card effort (recount 57 h + about 3 h for uncarded post-L10 and telemetry v0.6.2). The bottom-ups agree: UI probes take 2–3 working days, Saves takes 10–16 h plus a 0.5 h rehearsal, and the rest is HoQA/Saves card work. |
| QA **run effort** on the RC (card recount) | **v2 ≈ 148 h** (v1 121 + abilities +8.5 + sales-stopped +13 + BBv2 +5 + #9 BBv2 runs +0.5). v1: ≈ 121 h of effort (117 h carded + SS patch lane 2 h + post-L10/telemetry ≈ 2 h). The card hours overstate RC wall time; the measured lane numbers below govern it. |
| **Gate wall-clock, best case** (RC handoff → verdict) | **v3 ≈ 19.5 h** (19.35 unrounded; floor about 18.5 h); v2 18.5 h; v1 15.5 h |
| **Expected, with one fix and a targeted re-gate** | **v3 ≈ 31 h** (19.5 + fix ≈ 6 h HoE + re-gate ≈ 5.5 h); v2 29.5 h; v1 26 h |
| One fix with a **full** re-run (criteria in §3.3) | **v3 ≈ 45 h** (19.5 + 6 + 19.5); v2 43 h; v1 37 h |
| Critical path | v3: UI lane B ≈ **16.1 h** (+1.0 h vs v2: WebKit measured 1.2× per cell / 1.84× on runFor instead of ×1.0, partly offset by UI QA's −15 Cr min recount; §1.4) → Art tail ≈ 1 h → HoQA verdict ≈ 1.25 h. Lane A FF ≈ 15.1 h (−0.5 h) is **no longer critical even without lever 3** (done ≈ H+16.1 vs lane B ≈ H+17.1). v2: UI lane B ≈ 15.1 h (+2.6 h: abilities, sales-stopped, BBv2, §1.3) → Art tail ≈ 1 h → HoQA verdict ≈ 1.25 h. If lever 3 (second FF lock) is not usable, lane A FF ≈ 15.6 h becomes critical (+0.5 h). v1: UI lane B (Chromium then WebKit, ≈ 12.5–13 h) → Art shot review tail (≈ 1 h) → HoQA verdict (≈ 1 h). Saves, X1/pool2/AC7 and the 2x/dead-zone sims all run in parallel and come in under 3 h. |
| Code freeze (v2) | Schedule of record (D-CEO-20261030-11, `product/v5-schedule.md` rev 2 sha256 `79bb46d8`) scenario (iii): freeze Thu 5 Nov 05:00, handoff Thu 09:00; BBv2 lane H merge likely Sun 1 Nov 08:00 (high Sun 12:00, spec v1.0.1), freeze unchanged (D-HOP-48). v1 text: Earliest code freeze Sun 1 Nov 18:00 CET (Econ all-flags-on sims). With HoE's current plan (`engineering/m5-build-plan.md` sha1 `2e32b078`: last build-complete clockWage, Thu 5 Nov ~11:00), the **realistic freeze is Thu 5 Nov 11:00** unless HoE's re-parallelisation pulls it in. |

The recount differs from the brief: the "≈ 180 h" in the brief recounts to **174 h** across the 12 card QA lines (57 author + 117 run). It is 176 h with the #5b patch lane folded into the single release (+2 h, per the card's own clause). Post-L10 progression (Econ section) and telemetry v0.6.2 have **no HoQA line** yet; ≈ 3 h author + 2 h run are provisional.

## 1. Gate components and wall-clock
### 1.1 Card effort recount (product/m5-gate-acs.md, sha1 `e6783404` at 12:53 CET; HoQA lines QA-D-1030-M5QA)
| Card | Author h (pre-freeze) | Run h (RC only) | Total | Note |
|---|---|---|---|---|
| #1 STK streak + tapCoins | 5 | 9 | 14 | ST rows UNVERIFIED until the CSV PR (cap 0.27, D-HOP-27) |
| #2 GLD golden | 5 | 10 | 15 | GLD-AC2 re-target after HoP 20:00 / PMC 21:00 |
| #3 BRD breeds | 7 | 13 | 20 | K10 harness (Econ/Architect) |
| #8 BRO broody | 4 | 8 | 12 | |
| #9 ZGU zeroGainUi | 3 | ~~7~~ **7.5** | ~~10~~ **10.5** | v2: BBv2 runs (spec L440/L489) now apply, BLOCKED-BUILD |
| #5 PAU pause | 5 | 11 | 16 | after abilities |
| #6a RF rc2Refill | 6 | 10 | 16 | Art unsigned; failure-cost defect |
| #6b AR autoRefill | 5 | 9 | 14 | Art unsigned |
| #7 AB abilities | ~~5~~ **14.25** | ~~11~~ **19.5** | ~~16~~ **33.75** | v2: plan v0.9.1 `be86153b` (35 cases); Art flows v0.2 `eb2b3b7d` signed; ≈ 2.75 h run BLOCKED-ON-BUILD #86 |
| #10 CW clockWage | 6 | 11 | 17 | B3–B10 Art unsigned |
| #5b SS salesStopped (IN v5, -09) | ~~1 (+0.5)~~ **≈ 18.5** | ~~12 (+2)~~ **≈ 27** (incl. patch lane) | ~~13 (+2.5)~~ **≈ 45.5** | v2: plan v0.14.1 `58c745fd` (108 cases, ≈ 45.5 h; no author/run split in the plan, run ≈ 27 h is HoQA's tally of the per-case run splits since v0.10, provisional) |
| #11 FC fatigueCue | 5 | 6 | 11 | design changes: D-HOP-24, spec v1.3.19, Art v1.3 at 16:00 → cases re-point |
| Post-L10 (Econ, no UI) | ≈1 (provisional) | ≈1 | ≈2 | needs an AC7 row and HoQA line |
| Telemetry v0.6.2 | ≈2 (provisional) | ≈1 | ≈3 | back in from 5.1; G-TEL rows in the Saves gate |
| #12 BBV2 bestBuyV2 (IN v5, D-CEO-11 (3)) | **6** | **5** | **11** | v2: Card #12 QA block; UI 45 shots + DOM 2 h, sims/harness verification 2 h (Econ runs the harness), Saves 0.5 h, HoQA co-sign 0.5 h; BLOCKED-BUILD |
| **Total** | ~~≈ 60.5~~ **≈ 93** | ~~≈ 121~~ **≈ 148** | ~~≈ 181.5~~ **≈ 241** | v2 |

### 1.2 Wall-clock per component on the RC
| Component | Wall-clock | Lock | Source / status |
|---|---|---|---|
| Handoff prep: prebuilt dist (lever 4), wk-preflight, record RC SHA + ^{tree} + balance.json sha256 | ≈ 0.25 h | — | UI QA estimate |
| **UI QA 3-engine matrix** at 360/390/1280 (+ card-specific sizes) | **v3 lane B ≈ 16.1 h** (Cr 7.75 + WK 8.85 − 0.5; §1.4); lane A FF ≈ 15.1 h (≈ 7.55 h per lock with lever 3). v1: **≈ 12.5–13 h** with the accepted levers (UI QA baseline ≈ 13.5 h) | lane B `.browser-test-3.lock`; lane A FF split over `.browser-test.lock` + `-2` after Saves releases | `qa/m3-recheck/v5-flagson-ui-pass-estimate.md` sha256 `3652d8717897c9bd5c54c05891d4c7ca1483454b8f3dd0d223adff75d5429673` (verified). Lane B Cr (4.2 + 2.5) + WK (3.8 + 2.5) = 13.0 h; lane A FF (7.9 + 5.1) = 13.0 h at 2.0×. M5 cards ≈ 152 Cr browser-min. |
| **Saves gate** (flags-on, G1 ship set) | LOW ≈ 26, **LIKELY ≈ 37**, HIGH ≈ 60 min (active 23/32/52 + flags-on rows 3/5/8); +12–25 min if a lane takes the lock | `.browser-test.lock`, first slot | `qa/v5-saves/changes-20261030/flagson-save-impact.md` sha256 `e3828c55a52f290075dc032abc026cf143b6bb8e319dc312b3d0c282b4002d6d` (verified). The flags-0 dry-run took 26 min, 12:18→12:44, including ≈ 11 min of lock wait. SAVE_VERSION stays 6, no M5 migration by design. |
| X1 pacing (full stack, flags-on, all rows), ±20% | ≈ 0.5 h | none (Node) | PR92 dry-run 11:00→11:28 (artifacts/pacing-x1-stack/dryrun-pr92-8411c50). Needs Econ's flags-on X1 (§4). |
| AC7 harness (P95 ≤ 180 s, seeds 0–200) per feature + 2x + dead zone | ≈ 1–2 h, background | none | provisional (card run hours include them) |
| pool2 / pool2b at 200 seeds (JOBS=pool2, 12 m5px jobs) | ≈ 2 h provisional (the earlier 12:36→14:40 time-box; never measured) | none | Architect: the mode is kept for the final RC. MANIFEST `2a3c0935…` and selftest 30/30 are on disk (artifacts/bot-m5b-parity/VERDICT.md:166-167, selftest.txt). The 200-seed run on B is cancelled, so the **first 200-seed timing will be on the RC** (risk: unmeasured). |
| Art screenshot checks (SS-17 shots, shot review on signed flows) | ≈ 1–2 h after the last shots land; ≈ 1 h tail past lane B | — | UI QA estimate. Unsigned flows can only be recorded, not PASSed (§4). |
| Claude roles: one pass each (Claude QA / gamer) | in parallel, **never blocking** (rule 22) | — | Cite via verify-claude-verdict.sh |
| HoQA verdict + RC report | ≈ 1 h | — | |

### 1.3 v2 browser delta (HoQA bottom-up, Chromium minutes; WK ×1.0, FF ×2.0 as in the UI estimate) · superseded by §1.3a in v3
| Card | v1 Cr min | v2 added Cr min | Basis |
|---|---|---|---|
| #7 abilities | 9 | **+27** | v0.8–v0.9.1 rows: N1–N3 names harness (3 widths × 10 states × 4 abilities ariaSnapshot + Cr CDP pass) ≈ 9; N4 fit scan 3; N6/N7/N8 3; N9–N16 combo/Boost/close rows ≈ 9; N17–N19 incl. rects 3 × 3 ≈ 3 |
| #5b salesStopped | 21 | **+30** | v0.10–v0.14 rows: SS-37 6 viewports × popover open/closed ≈ 6; SS-38a–f ≈ 5; SS-39/39a names 3; SS-40a–e + 40p1–p3 ≈ 7; SS-41/42/RATE/TEL ≈ 3; SS-23f + SS-17 extra shots ≈ 4; SS-47–49 + reworks ≈ 2 |
| #12 BBv2 | 0 | **+18** | BBV2-UI1 15 cells/engine × ≈ 45 s (fixture + `page.clock` + shot + axe + rect/overflow/tap/CLS) ≈ 11; AC2 (a)/(b) DOM + `build:qa` picker ≈ 3; AC4/AC5 ≈ 2; AC6 re-runs ≈ 2 |
| #9 zeroGainUi | 9 | **+3** | BBv2 runs at the zero-gain states |
| **Sum** | | **+78 Cr min** | lane B (Cr + WK) **+156 min ≈ +2.6 h → ≈ 15.1 h**; lane A FF +156 min: with lever 3 ≈ 7.8 h per lock (not critical), without it ≈ 15.6 h (critical, +0.5 h wall) |

### 1.3a v3 recount (UI QA `b71fbc7e` ACCEPTED, re-priced with measured A1/A2)
**Re-check of UI QA's recount against HoQA's +78:** UI QA's arithmetic checks: 27 + 30 (HoQA, not re-counted) + 0.4 (#9) + 5.8 (#12) = **63.2 Cr min** (vs 78, −14.8). All of the difference is in #12 (18 → 5.8) and #9 (3 → 0.4). My 45 s per UI1 cell was ≈ 6× the measured load + shot + check rate, so **I accept the recount**. UI QA's lane B (+126 min → 14.6 h) was correct at WK ×1.0. Its "high" (+11.8, `runFor` near real time) is **retired**: measured `runFor(240000)` is 80.6 s, not 240 s.

Re-priced with the measured A1/A2 (Cr seconds; r_load 1.9 s, r_shot 2.0 s, r_inv 2 s are UI QA's measured dry-run rates and are kept):
| Item | v2 (HoQA) | UI QA `b71fbc7e` (A1 60 s, A2 1.5 s) | **v3 (measured A1/A2)** | v3 WK min | Basis |
|---|---|---|---|---|---|
| #12 BB-B1(a) | | 0.07 | 0.07 | 0.08 | cell ×1.2 |
| #12 BB-B1(b) `runFor(240000)` × 2 builds | | 2.1 | **2.82** (2 × (2 + 1.9 + 80.6 s)) | **5.10** (2 × 148.3 s runFor + 2 × 3.9 s × 1.2) | runFor MEASURED 80.6 / 148.3 s |
| #12 BB-B2 | | 0.07 | 0.07 | 0.08 | cell ×1.2 |
| #12 BB-B3 (10 s sim) | | 0.23 | 0.12 (10 s sim ≈ 3.4 s wall at 0.336 s/sim-s) | 0.18 (6.2 s at 0.62 s/sim-s + 3.9 s × 1.2) | runFor rate MEASURED (chunked 1664 / 3022 ms per 5 s) |
| #12 BB-B4 | | 0.86 | 0.86 | 1.03 | cell ×1.2 |
| #12 BB-B5 UI1, 15 shots | | 2.4 | **1.76** (15 × (1.9 + 2.0 + 0.17 axe + 1.9 ★-move) + 3 × 3.4 s dead-zone + 3 r_inv) | 2.22 | axe MEASURED 77.4 ms scan + 95.3 ms inject (Cr); WK 112.1 + 67.7 ms |
| **#12 total** | **18** | 5.8 | **5.70** | **8.69** | |
| #9 BB-N8 | 3 | 0.4 | 0.4 | 0.48 | cell ×1.2 |
| #7 abilities | 27 | (27, not re-counted) | 27 | 32.4 | HoQA, ASSUMED cell-type (×1.2) |
| #5b salesStopped | 30 | (30, not re-counted) | 30 | 36.0 | HoQA, ASSUMED cell-type (×1.2) |
| **Sum** | **78** | **63.2** | **63.1 Cr min** | **77.6 WK min** | lane B additions **140.7 min ≈ 2.35 h** (v2 156 min ≈ 2.6 h) |
| FF (lane A) | 156 | | 126.2 (2.0 × Cr) | | FF ×2.0, see §3.3 F1 |

Net effect of the measured A1/A2 on #12: runFor +41 s, axe −20 s, short sims −26 s, so ≈ −0.1 Cr min. **The A1/A2 changes are not drivers. The WebKit factor is.**

### 1.4 v3 delta vs v2 by component (best case, hours)
| Component | v2 | v3 | Δ | Basis |
|---|---|---|---|---|
| Handoff prep | 0.25 | 0.25 | 0 | unchanged |
| Lane B, Cr legacy matrix | 4.2 | 4.2 | 0 | D (UI estimate L22) |
| Lane B, Cr M5 part (152 min) | 2.5 | 2.5 | 0 | A (UI estimate L23/L43) |
| Lane B, Cr v2 additions | 1.30 (78 min) | 1.05 (63.1 min) | **−0.25** | UI QA recount + measured A1/A2 (§1.3a) |
| Lane B, WK legacy matrix | 3.8 (×1.0) | **4.56** (3.8 × 1.2) | **+0.76** | 1.2× MEASURED on proxy cells, applied to legacy cells (ASSUMED transferable, §3.3 W2) |
| Lane B, WK M5 part | 2.5 (×1.0) | **3.0** (× 1.2) | **+0.50** | 1.2× MEASURED; M5 probes ASSUMED cell-type |
| Lane B, WK v2 additions | 1.30 (×1.0) | 1.29 (77.6 min) | −0.01 | §1.3a (B1(b) at 1.84×, rest 1.2×) |
| Lane B, no re-baseline cells | −0.5 | −0.5 | 0 | unchanged |
| **Lane B total** | **15.1** | **16.10** | **+1.00** | |
| Lane-B slack to "done" | 0.75 | 0.75 | 0 | v2 step 5 (H+16.1 = 0.25 + 15.1 + 0.75) |
| Art tail | 1.0 | 1.0 | 0 | |
| HoQA verdict | 1.25 | 1.25 | 0 | |
| **Best case** | **18.35 → 18.5** | **19.35 → 19.5** | **+1.0** | |
| Fix (HoE) | 6 | 6 | 0 | |
| Targeted re-gate | 5 | **5.5** | **+0.5** | UI subset 2–4 h → 2.2–4.4 h with its WK half at 1.2×; top of the 4.2–5.4 h range, rounded up |
| **Expected** | **29.5** | **31** | **+1.5** | |
| Full re-run (= best) | 18.5 | 19.5 | +1.0 | |
| **Full** | **43** | **45** | **+2.0** | |
| Lane A FF (not critical) | 15.6 (7.8 / lock) | 15.1 (7.55 / lock) | −0.5 | FF ×2.0 on the smaller recount |

**Top 3 drivers:** (1) WK legacy matrix at 1.2× instead of 1.0×, **+0.76 h**; (2) WK M5 part at 1.2×, **+0.50 h** (and the same factor on the re-gate subset, +0.5 h on expected and full); (3) UI QA's recount of #12/#9, **−0.25 h** on Cr (the WK share nets to ≈ 0 because B1(b) moves to 1.84×). Measured `runFor` (80.6 s vs 60 s) and axe (0.17 s vs 1.5 s) cancel out within ±0.1 min.

**Sensitivity (lane B only, not a scenario):** if the legacy matrix keeps the tap-suite ×1.0 (it is tap-heavy), lane B ≈ 15.35 h and best ≈ 18.6 h. If #7/#5b turn out runFor-heavy (WK 1.84× on their 57 Cr min), lane B is +0.6 h and best ≈ 20 h. So the range is ≈ 18.5–20 h around 19.5.

Non-browser BBv2 work (lane N: BB-N1…N8, AC7/G4 on seeds 1–200, bot-m4 seller15, bot-m5 m5x-casual once parity) runs in the background and adds ≈ 1 h there; it stays well under the UI critical path. HoQA's verdict step grows ≈ 0.25 h (BBV2-AC12/13 compare against the Econ + HoQA signed values).

**Provisional marks (v3):** lane B per-cell and runFor factors are now MEASURED (record-only run, proxy cell); the legacy/M5 Cr minutes, the #7/#5b additions and Firefox stay ASSUMED/derived (§3.3). v2 text: the UI and Saves figures come from the two lane estimates above (both received and hash-verified). pool2, AC7/2x/dead-zone and the post-L10/telemetry figures are HoQA's own and **provisional**.

## 2. Lanes and parallelism assumptions
- **QA Saves engineer:** Saves gate on `.browser-test.lock`, first at handoff (≤ 1 h), then releases it to UI lane A. Then the non-browser Saves/sim/vitest rows (U/S/P/C/T) and pool2/X1 evidence checks run in parallel with UI.
- **QA UI engineer:** two lanes per QA-D-1030-V5ULANE. Lane B = Chromium then WebKit on `.browser-test-3.lock`. Lane A = Firefox, split over `.browser-test.lock` + `.browser-test-2.lock` (lever 3) once Saves releases, **only if load < 12** (three browsers measured 14.75). Otherwise FF stays on one lock and still finishes ≈ 13 h, so the critical path doesn't change. Every hold uses timeout ≤ 600 s via lane-run/lane-kill (rule 21).
- **Head of QA:** reviews, Art-shot coordination, verdict. Not a run lane.
- **Three lock files only** (`.browser-test.lock`, `-2`, `-3`, HoO). From handoff until verdict, no other lane (ui, Art, Econ, Architect) takes any lock. HoO enforces it, as for today's window.
- **Claude roles:** one pass each, started at handoff, never on the critical path (rule 22).
- **UI levers under D-CEO-10 (HoQA rulings):** REJECTED: reduced FF/WK coverage (file lever 1), dropping 390 (file lever 2), and QA runs on each PR head (file lever 8, "per-piece m5dry"; under -10 there's no QA on small builds). ACCEPTED: second FF lock (3), prebuilt dist (4), reuse of the m41-p2 probes (5), parallel probe authoring (7), and absolute-only checks where the AC is absolute (6), with no vs-base re-baseline for those cells.
  - *Numbering note:* the ruling as relayed numbered the levers differently from UI QA's file (it called "QA runs on every PR head" lever 6 and accepted "8"). I applied the rulings **by content**. HoQA to confirm.
  - *Consequence of rejecting lever 8:* UI QA calibrates the existing probes once on the integration base (rc/v5) before freeze, as a harness self-test, not a gate.
- Effect: lane B ≈ 13.0 − ≈ 0.5 h (no re-baseline cells) ≈ **12.5 h**. Lane A ≈ 6.5 h with lever 3, or 13 h without it. UI wall ≈ 0.25 + 12.5 + slack 0.5 ≈ **13.25 h**, against the 13.5 h baseline. UI QA's 7.5 h best case depended on levers 1 and 2, which are rejected.

## 3. Critical path, RC handoff → verdict
### 3.1 Best case (no blocker)
H = RC handoff (final SHA with ship-set balance.json, flags-on goldens pinned).
1. H+0 → H+0.25: prep, prebuilt dist, preflight.
2. H+0.25 → H+≈1: Saves gate (lock 1). In parallel: lane B starts (lock 3), plus X1, AC7, 2x, dead zone, pool2 (no lock) and the Claude passes.
3. H+≈1: Saves releases lock 1, and lane A FF starts on locks 1 + 2. Non-browser Saves rows continue.
4. H+≈3: X1/pool2/AC7 evidence in, HoQA checks SUMS.
5. H+≈17.1 (v3; v2 16.1; v1 13.5): lane B done (critical). Lane A is done earlier with lever 3 (≈ H+8.6), and without it ≈ H+16.1, still before lane B.
6. H+≈18.1 (v3; v2 17.1; v1 14.5): Art shot review tail (BBv2 shots run early in lane order so the tail stays ≈ 1 h).
7. H+≈19.5 (v3, 19.35; v2 18.5; v1 15.5): **HoQA verdict** (≈ 1.25 h incl. BBv2 re-baseline compare).

### 3.2 Re-gate model (D-CEO-10: fix and re-gate, never cut)
**Targeted re-gate** (default): re-cut RC′ with the fix, then re-run:
- the failed row(s);
- the regression subset: every card or row whose exercised files appear in `git diff RC..RC′`, plus the legacy smoke on 3 engines;
- Saves gate in full (≤ 1 h, cheap, and it holds the save contract);
- X1 + AC7 if any sim/econ/CSV file changed;
- Art re-review of the affected shots;
- verdict.

Wall ≈ 0.5 (re-cut) + 2–4 (UI subset) ‖ 1 (Saves) ‖ 1–2 (sims) + 0.5 Art + 0.5 verdict ≈ **4–5 h** (v3: ≈ 5.5 h used, because the UI subset's WebKit half is 1.2×, so 2.2–4.4 h; v2: ≈ 5 h used; the BBv2 pick paths overlap #9 and the stopgap rows, so the regression subset is larger). A BBv2 fix that touches `econ/best-buy.ts`, the bots or the CSV (e.g. a G4 fail) is a **full re-run** trigger (sim core / CSV beyond the failed row).

Rows not re-run carry over from RC **only if** both of these hold:
- (a) the diff touches none of the files that row exercises;
- (b) the balance.json sha256 is unchanged and equals the ship set.

HoQA records both SHAs, both ^{tree} hashes and the diff in results/. *This needs a QA ruling amending QA-D-1030-SHIPFLAGS*, which today says every result must come from the RC SHA. Proposed in the decision line.

**Full re-run** (v3 ≈ 19.5 h; v2 18.5 h; v1 15.5 h) when any of these hold:
- the fix touches global layout (app.ts, styles.css, HUD), the sim core (`step()`), the save/load path or schema, balance.json flags, or the CSV beyond the failed row;
- it touches the shared QA harness or a second card's files beyond the regression map;
- a second blocker shows up during the targeted re-gate;
- the diff can't be mapped to rows.

### 3.3 Figures
| Scenario | Wall from handoff |
|---|---|
| Best case | **v3 ≈ 19.5 h** (v2 18.5; v1 15.5) |
| Expected: one blocker, fix ≈ 6 h (HoE, 4–8), targeted re-gate | **v3 ≈ 31 h** (v2 29.5; v1 26) |
| One blocker, full re-run | **v3 ≈ 45 h** (v2 43; v1 37) |

**Assumptions table (v3).** M = MEASURED (source), A = ASSUMED.
| # | Assumption | v2 value | **v3 value** | Status / source |
|---|---|---|---|---|
| W1 | WebKit factor, shot/check cells (load + shot + check + axe) | ×1.0 (tap suite) | **×1.2** | **M**: UI1 proxy cell median of 9, 730.2 / 877.6 ms (RESULTS.md `3908dc28` "UI1 PROXY"; load 1.20–1.24×, axe 1.36–1.48×, shots 0.70–0.94×) |
| W2 | ×1.2 transfers to the legacy matrix and M5 probes | — | yes | **A**: measured on one proxy screen at 3 sizes; legacy cells are the same load/shot/check shape (sensitivity in §1.4) |
| W3 | WebKit factor, runFor-heavy cases | ×1.0 | **×1.84** | **M**: `runFor(240000)` single 80,605 / 148,344 ms; chunked 48 × 5000 1.81× (RESULTS.md; chromium/webkit.json, SUMS `bb9ff2aa`) |
| W4 | Which cases are runFor-heavy | — | BB-B1(b), B3, B5 dead-zone states only | **A**: only rows with an explicit `runFor` in run plan §3.3; #7/#5b treated as cell-type (sensitivity +0.6 h) |
| W5 | Launch per engine | — | Cr 152–208 ms, WK 59–97 ms | **M** (RESULTS.md launch table); negligible, not in the totals |
| A1 | `runFor(240000)` wall per call, Cr | 60 s (UI QA A1) | **80.6 s** (≈ 0.336 s wall per sim-s) | **M** (RESULTS.md) |
| A1' | short sims (10 s) | 10 s wall (UI QA A4) | **3.4 s Cr / 6.2 s WK** | **M** rate (chunk mean 1664 / 3022 ms per 5 s sim) |
| A2 | axe per scan | 1.5 s (UI QA A2) | **0.077 s + 0.095 s inject Cr; 0.112 + 0.068 s WK** | **M** (RESULTS.md UI1 PROXY table) |
| A3 | ★-move layout-shift check | 1.9 s | 1.9 s | **A** (UI QA A3; r_load MEASURED in dry-run) |
| F1 | Firefox factor | ×2.0 | **×2.0 (cells and runFor)** | **ASSUMED, unmeasured** on this build (FF skipped: 319 s left of the 29-min cap). Rule used: worse of {Cr, WK measured (1.2×/1.84×), FF tap suite 2.0× (UI estimate L20, older suite)}. The brief's literal rule (worse of Cr/WK only, 1.2×/1.84×) would give FF ≈ 9.1 h. That is less conservative than the only FF measurement we have, so it's not used. Neither choice makes lane A critical. |
| C1 | Cr legacy 4.2 h, M5 152 Cr min, #7 +27, #5b +30 | same | same | **A/D** (UI estimate; HoQA §1.3), not re-measured |
| L1 | lever 3 usable (load < 12) | yes | yes | **A**; no longer affects the critical path (lane A without lever 3 ≈ H+16.1 < lane B H+17.1) |
| R1 | Re-gate UI subset | 2–4 h | 2.2–4.4 h | **A** + W1 |

Measurement caveats: one record-only run at load ≈ 5.9 (WK lock) with < 12 checked (Cr). Lane B under gate-day contention may pause at load ≥ 12, which isn't in any figure (unchanged from v2). The UI1 cell is a proxy, because BBv2 isn't built.

Assumptions (v2, still apply except where the table supersedes them): lever 3 usable (load < 12); BBv2 built and merged before freeze (HoE lane H, likely Sun 1 Nov 08:00); Econ's all-flags-on harness includes `bestBuyV2 = 1` + Q-E2 by Sun 1 Nov 18:00 (latest Mon 2 Nov 06:00), so the flag-on AC7 goldens are signed before the cut; no extra Art shot-review time beyond the 1 h tail; the §1.3 Cr deltas hold within ±25 % (±0.65 h on lane B). BBv2 raises the chance of the one-fix scenarios (known G4 P95 risk 197–199 s on SCRATCH CSV `8dc90e2b`).

### 3.4 Calendar
**v3, on the schedule of record** (`product/v5-schedule.md`, on disk sha256 `83eecd47…`, L18/L19; handoff = freeze + 4 h; all CET):
| Scenario | Handoff | Best (19.5 h) | Expected (31 h) | Full (45 h) | v2 (18.5/29.5/43), as in schedule L19 |
|---|---|---|---|---|---|
| **(iii) of record** | Thu 5 Nov 09:00 | **Fri 6 Nov 04:30** | **Fri 6 Nov 16:00** | **Sat 7 Nov 06:00** | Fri 03:30 / Fri 14:30 / Sat 04:00 |
| (ii) | Fri 6 Nov 04:00 | Fri 6 Nov 23:30 | Sat 7 Nov 11:00 | Sun 8 Nov 01:00 | Fri 22:30 / Sat 09:30 / Sat 23:00 |
| (i) | Sat 7 Nov 21:00 | Sun 8 Nov 16:30 | Mon 9 Nov 04:00 | Mon 9 Nov 18:00 | Sun 15:30 / Mon 02:30 / Mon 16:00 |
**Scenario (iii) verdict:** the window moves **+1.0 / +1.5 / +2.0 h** to Fri 6 Nov 04:30 / Fri 6 Nov 16:00 / Sat 7 Nov 06:00. It stays on the same days (best and expected Fri 6 Nov, full re-run Sat 7 Nov), and (iii) is still the earliest scenario, so the scenario choice doesn't change. The verdict times of record (schedule L19/L68, which cite v2 `05891340`) are stale by those amounts. HoP needs to re-issue them; QA doesn't edit the schedule. `qa/v5-final-rc-run-plan.md` (sha256 `4b178337…`, unchanged) holds no calendar times or wall figures (lanes/rows only), so nothing in it changes.

v2 calendar (superseded): (iii) Fri 6 Nov 03:30 / Fri 6 Nov 14:30 / Sat 7 Nov 04:00; (ii) Fri 22:30 / Sat 09:30 / Sat 23:00; (i) Sun 15:30 / Mon 02:30 / Mon 16:00.
The high freeze adds the schedule's +11 h (iii) / +15 h (ii) / +30 h (i) to every column. The schedule's verdict row needs HoP to re-issue it with these figures.

**v1 table (superseded; freeze F; handoff ≈ F + 2 h for the cut, ship-values commit and pins):**
| F | Best verdict | Expected (1 fix + targeted) | 1 fix + full |
|---|---|---|---|
| Sun 1 Nov 18:00 (earliest possible) | Mon 2 Nov ≈ 11:30 | Mon 2 Nov ≈ 22:00 | Tue 3 Nov ≈ 09:00 |
| **Thu 5 Nov 11:00** (HoE plan 2e32b078 last build-complete) | Fri 6 Nov ≈ 04:30 | **Fri 6 Nov ≈ 15:00** | Sat 7 Nov ≈ 02:00 |

All times CET.

## 4. Pre-freeze prerequisites
- **Latest need-by rule:** anything that changes QA authoring (ACs, specs, Art signs, fixtures) is needed by **F − 24 h**, to allow re-authoring, harness self-test and the HoQA swap. Sim/model items are needed by **F**. Run-time pins are needed by the **RC cut (≈ F + 2 h)**.
- **Against the earliest F (Sun 1 Nov 18:00):** authoring items by **Sat 31 Oct 18:00**; sim items by Sun 1 Nov 18:00; pins by Sun 1 Nov 20:00.
- If F moves to Thu 5 Nov 11:00, every "latest" date moves with it: Wed 4 Nov 11:00, Thu 5 Nov 11:00 and Thu 5 Nov 13:00.
- The **target** dates (D-HOP-25 and others) are earlier and stand.

### 4.1 Art sign pending
| Item | Owner | Target | Latest (F = Sun 1 Nov 18:00) |
|---|---|---|---|
| #6a rc2Refill flow v1.0 `6173f757` (final after PMW AC-RF2 errata), #6b autoRefill (draft `e9a8dfd5`, no sha), #7 abilities M5 flow, #10 CW B3–B10. Record-only until signed (D-HOP-25 (5)). | Art | sign **dates** by today 14:00 | signs by Sat 31 Oct 18:00 |
| SS-36 chip_manage: HoP chose Option A (spec v1.3.16 `ed8a177e`; on-disk spec is now v1.3.19 `fe37d725`); Art to sign SS-36 | Art / PM Market | — | Sat 31 Oct 18:00 |
| fatigueCue redesign: D-HOP-24, spec v1.3.19, Art v1.3. Plan v0.8 re-points FC/SS-23f/QA-11 cases. | PM Market / Art | today 16:00 | Sat 31 Oct 18:00 |
| GE-16 golden-egg spot re-count at 360×640 (FC-AC9; gate risk 6–7/8) | Art / UI-VD | — | Sat 31 Oct 18:00 |
| Pause: Art confirms `5910646c` still holds for v1.3.10 (gap 5); #5b Art sha in art-ux/decisions.md (gap 5) | Art | — | Sat 31 Oct 18:00 |

### 4.2 Blocked: sim (Econ; all-flags-on sims due Sun 1 Nov 18:00, HoP)
| Item | Owner | Latest |
|---|---|---|
| X1 reads tc_* from the CSV under test and models streak + tapCoins (D-HOP-17; parity Q-X1P: flags-0 byte-identical to row 905, sha256 checked by QA) | Econ | F (target Sat 31 Oct 12:00) |
| X1 models broody (BH-AC21). The record date Tue 3 Nov 21:00 is overtaken by the freeze. | Econ | F |
| Econ bot-config doc sha for flag-on AC7 of PAU, RF, AR, AB, CW (D-HOP-16 (4)) | Econ | F − 24 h (authoring) |
| X1 confirmed modelled from the shipped CSV for golden (ACT), pause, refill, abilities (`abil` hardcoded), clockWage | Econ | F |
| Breeds bc_* columns + K10 harness + K10 CI step | Econ / Architect | F |
| `tc_fatigue_cue_*` rename, `tc_autorefill_*` in the CSV/balance.json, abilities `measure:l30plus` | Econ | F |
| Post-L10 progression AC7 row (no QA line yet; HoQA authors it) | Econ + HoQA | F − 24 h |
| **Streak cap of record 0.27** (breeds = 1, breeds spec rev 3.8.7, D-HOP-27; 0.28 only with breeds off). The build's 0.4 goes when the CSV PR merges before freeze. ST rows stay UNVERIFIED until then. UI QA re-points streak.mjs to read the cap per the flag. | Econ / HoE (CSV PR); UI QA | CSV PR by F; ST-ACs at 0.27 by F − 24 h (PMC) |

### 4.3 Pending HoP
| Item | Owner | Target | Latest |
|---|---|---|---|
| GLD-AC2 gap range, mean and tolerance (90–240 s candidate). Not testable as written; interim [120, 300) s, mean 210 ±15 s. | Econ model 19:30 → HoP approves 20:00 → PMC errata 21:00 (D-HOP-25 (3)) | today 21:00 | Sat 31 Oct 18:00 |
| Sales-stopped analytics event: when it fires (QA tests both answers until then) | HoP | — | Sat 31 Oct 18:00 |
| **Ship-set definition (Saves G1)**, see §4.6 | CEO / HoP | today | Sat 31 Oct 18:00 |

### 4.4 Spec defects
| Item | Owner | Latest |
|---|---|---|
| failure-cost **v0.3.19**: #83 markup (text-free aria-hidden span, name from `.sr` content, no aria-label), Art 253 px width bar, AC-FC17 (b) old 208/204 figures | PMW | Sat 31 Oct 18:00 |
| **SS-G27/G28** (PM Market): focus target when the Shift sheet opens; the chip-refill exception is void with rc2Refill = 1; FC-AC9 lives only on the card; 36 px vs 17 px shift mismatch | PM Market | Sat 31 Oct 18:00 |
| **GLD-AC2**: numeric mean + tolerance (§4.3) | PMC | today 21:00 |
| **SG-3 heldMs**: a fresh-load fixture can't reach 2000 ms (spec L49). PMC adds a reachable precondition (D-HOP-25 (4)). | PMC | today 16:00 |
| **Stale flags-0 ship rows** in m5-gate-acs.md ("v5 RC ships all at 0", "flag-off golden PENDING the cut", #5b "CUT to 5.1", Wave C refs) | PMC sweeps by **today 16:00** (D-HOP-25 (1)); HoQA re-cites its own QA lines afterwards | today 16:00 |
| STK HoQA line cites X1's hardcoded **0.30** vs CSV **0.28**. Must re-cite to 0.27 (D-HOP-27). Not edited here. | HoQA | after the PMC sweep |

### 4.5 Saves spec gaps (Saves QA, flagson-save-impact.md)
| # | Gap | Suggested owner | Latest |
|---|---|---|---|
| 1 | Ship-set definition: is salesStopped, bestBuyV2 or breeds on (ranking bfdfd73e)? | CEO / HoP | Sat 31 Oct 18:00 |
| 2 | rc2Refill charges + regen save fields | PMW + HoE | Sat 31 Oct 18:00 |
| 3 | fatigueCue seen-flags | PM Market | Sat 31 Oct 18:00 |
| 4 | Is streakBest saved? | PMC / PMW | Sat 31 Oct 18:00 |
| 5 | Downgrade load into m4.1, .bak rotation, tab reconcile, quota | HoE / Saves engineer | Sat 31 Oct 18:00 |
| 6 | callLockoutS while offline | PMW | Sat 31 Oct 18:00 |
| 7 | Golden errata v1.3.3 (still a draft) | PMC | Sat 31 Oct 18:00 |
| 8 | Expected-values oracle for offline catch-up on the focus clock + V-noreg allowed-diff list | Econ / HoE | Sat 31 Oct 18:00 |

Note: SAVE_VERSION stays 6, with no M5 migration by design.

### 4.6 Ship-set for Saves G1 (proposed, needs CEO/HoP confirmation, Saves gap 1)
- **= 1:** `m4.enabled`, `streak`, `tapCoins`, `golden`, `breeds`, `pause`, `rc2Refill`, `autoRefill`, `abilities`, `broody`, `zeroGainUi`, `clockWage`, `salesStopped`, `fatigueCue`.
- **= 0:** `zeroGain.confirm` (ranking #9: "stays at 0"). ~~`bestBuyV2` (not in ranking bfdfd73e).~~ **v2: resolved: `bestBuyV2 = 1`** (ship-set sha256 `3fdd98ab`, 16 keys, D-CEO-20261030-11 (3), D-HOP-47).
- **Telemetry v0.6.2:** HoE to state whether it has a flag.
- **Pairing/dependency checks** G1 should assert: autoRefill ⇒ rc2Refill; pause ⇒ abilities; fatigueCue ⇔ salesStopped.
- G1 must be re-pinned from today's "14 flags = 0 on balance.json@3f582db (9a73bd8a)" to this set, and still fail closed.
- HoE names the commit that lands the ship values before the cut.

### 4.7 Other run-time prerequisites (by the RC cut)
| Item | Owner | Latest |
|---|---|---|
| Flags-on goldens and traces regenerated on the RC SHA (replace the flags-0 golden re-pin) | Architect / HoE | RC cut |
| `engineering/golden/m5-abilities-only`, tracksV7 hired-worker fixture (PAU-AC2/AC9) | HoE | F − 24 h |
| Pause rows 906–913: a real judged gate on the shipped CSV (they were EXCLUDED in v5) | Econ / HoQA | F |
| Saves F2: run-flagsoff.sh appends DONE after signing (fix before any FO evidence run) | Saves QA | before the rehearsal |
| UI harness: probe authoring 2–3 days, self-test ≈ 1 h, HoQA review + atomic swap ≈ 1 h | UI QA / HoQA | F − 2 h |
| Saves authoring 10–16 h + 30 min rehearsal (rehearsal on the integration base, not a gate) | Saves QA | F − 24 h |
| RC-14 Blocker fixes (UI QA: needed anyway); WebKit-375 "Got it" focus Major | UI engineer / HoE | F |

### 4.8 BBv2 prerequisites (v2; Card #12, run plan §3)
| Item | Owner | Latest |
|---|---|---|
| BBv2 built on rc/v5 (today `65a7443`: `balance.json:179` = 0, no reader) | HoE (lane H) | likely Sun 1 Nov 08:00, high Sun 12:00; **must be in before the freeze**; if not built at the RC cut, no cut, schedule slips (D-CEO-10) |
| All-flags-on harness with `bestBuyV2 = 1` + Q-E2; flag-on AC7 hashes and pacing values on the final CSV; Econ + HoQA sign | Econ (+ HoQA) | Sun 1 Nov 18:00, latest Mon 2 Nov 06:00 (D-HOP-47) |
| BBv2 events in telemetry errata rev 9 `49b76d62` / rev 10 `fd3416ec` (HoE types confirmed D-HOE-29); HoQA review incl. the `dead_zone` emit-timing issue (≥ 30 s stretches only, at stretch end: not usable for the P95 bar, which comes from the Econ harness) | PMC / HoQA | F − 24 h (authoring) |
| ~~Q-BB-H3~~ closed by D-HOP-2026-10-30-50: ±10 % total binds flags-off only; all-flags-on reported | HoP | done |
| FX-L17 / FX-TIE preconditions re-asserted on the final CSV | UI QA (+ Econ for the all-∞ state) | RC cut |
| UI harness `variants`: ship config with `bestBuyV2 = 1`; 0 only as test config | UI QA | F − 2 h |
| Ship-set L19 wording vs D-CEO-10 (conditional "ships at 1 only if built"), and its stale spec cite v0.3 `f128f1e6` | HoP | flag only |

## 5. Obsolete work: pause candidates (nothing deleted)
These existed only for the flags-0 RC. **Pause, don't delete.**
1. The official Saves gate on the flags-0 RC (cancelled 12:53), and the 13:50 browser-lock window for it.
2. The Saves flags-0 re-pin package (QA-D-1030-SAVES-REPIN: FO-1..10, SCRIPTS `a78c572f`, G1 fail-closed on 14 flags = 0). Keep it as the base for the flags-on re-pin. The FO row set becomes a regression subset, not a ship gate.
3. X1 row 905 as "pacing of record" (D-CEO-06), and the "full-stack rows model-only in the RC report" framing. Row 905 stays only as the Q-X1P parity reference.
4. QA-D-1030-X1-TREE: X1 on B's tip counted as the RC run.
5. The pool2/pool2b 200-seed run on B and its 14:40 fallback to A (QA-D-1030-PR94-POOL2). Cancelled by the Architect; the JOBS=pool2 mode (MANIFEST `2a3c0935…`) is kept for the RC.
6. The flags-0 golden re-pin at the ~14:00 cut (`f90d1678…` → flags-0 golden), and all "flag-off rows PENDING the RC flags-0 golden" items on the cards.
7. UI QA's 15-cell re-baseline waiting on the RC-13/14 freeze and swap (absolute checks replace vs-base where the AC is absolute).
8. The flags-0 RC report, including its known-issues list (the #83 focus Major ticket moves to the final RC report).
9. Wave A/B/C sequencing in QA plans and lines (#5b "Wave C row 11 Thu 5 Nov", SS-30 "conditional on pause = 1, Wave B"; per-wave gate starts such as "pause gate after abilities Tue 3 Nov"). Re-point to the single RC.
10. Per-feature gate runs at build-complete (D-CEO-07 "flag to 1 only after its gate") for every card. Replaced by unit tests + Econ model only during dev (D-CEO-09/-10).
11. The three #83 follow-up tickets targeted at 5.1. Re-target decision needed (v5 or keep 5.1; not cut-driven, so HoE's call).
