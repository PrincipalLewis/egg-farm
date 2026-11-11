# v5 final-RC run plan (HoQA) · v1.1 · 2026-11-05 ~20:30 CET (UTC+1), re-cited after the Oct 30–Nov 5 pause (D-CEO-20261105-01; QA-D-1105-GATEEST4, QA-D-1105-RR4)
TASK HoQA/BBV2-GATE1. Owner: Head of QA. First standalone run-plan file for the single v5 final-RC gate (D-CEO-20261030-09/-10: one release, all features on, one full gate on the complete RC; no cuts, slips move the date). Until now the run plan lived inside `qa/v5-final-gate-estimate.md` §1–§3 (sha256 `f3a385bc…`, v1); that file is now **v4** (sha256 `147f273a…`; v3 `b0feef98` in `.bak-v3-b0feef98`) and keeps the wall-clock figures. This file holds **who runs what, where, on which lock, and when it is BLOCKED**.

Basis (verified 2026-11-05 ~20:25 CET):
- Ship-set `product/v5-ship-set.md` sha256 `d71ed8cf…` (16 `m4.*` keys; L19 `m4.flags.bestBuyV2 = 1` REQUIRED, D-HOP-51; note: L19 still cites spec v1.0.1 `5dc9596b` and the Sun 1 Nov merge date, HoP to re-cite).
- Gate cards `product/m5-gate-acs.md` (whole file live sha1 `7ec49964`, not a pin; QA pins by card block: Card #12 `6cb27b3d` (QA-D-1105-RR4), Card #9 `3050a09e`).
- BBv2 spec `product/farm/m5.1-bestbuy-rebaseline-proposal.md` **v1.0.4 sha1 `4ea3841a`** (live = frozen `farm/frozen/m5.1-bestbuy-rebaseline-proposal.v1.0.4.4ea3841a.md`, QA-D-1105-RR4; §6: tested property `suppressed && hint.affordable = 0`, only exception the post-L30 mark-null net with `zeroGainUi` = 0; v1.0.3 `27e753d8`, v1.0.1 `5dc9596b`, v1.0 `df9dc86f` frozen; code in open PR #100 `d654afda` at flag 0, no merge ETA). Stopgap `product/farm/bb-stopgap-spec.md` v1.2.6 `fdc1c199`; FX-L17 = SG-3 fixture of v1.2.5 §3 (frozen `farm/frozen/bb-stopgap-spec.v1.2.5.md` sha1 `cc696f48`).
- Rulings: D-CEO-20261030-11 (3) (root decisions.md L117–120), D-HOP-2026-10-30-47/-48/-49 (product/decisions.md L2020/L2029/L2068), D-HOP-44 (L2015), D-HOP-37 C (L1815), D-HOP-34 (1) (L1794).
- Code: `origin/rc/v5` = `518de304` (#98; ancestors #97 `0ad018de`, #94 `f14b806d`, #96 `c5b2ddcf`): `src/config/balance.json:179` `"bestBuyV2": 0`, only `flags.ts` names it, **no reader: BBv2 is not on rc/v5** (checked 2026-11-05 with `git show`/`git grep`). Open into it: #99 `c4a1a76f`, #100 `d654afda`.

## 1. Lanes (unchanged from estimate v1 §2)
| Lane | Who | Lock | Content |
|---|---|---|---|
| S | Saves & Release QA | `.browser-test.lock` first (≤ 1 h), then non-browser | Saves gate (G1 ship set incl. bestBuyV2 = 1), U/S/P/C/T rows, X1/pool2/AC7 evidence checks |
| UI-B (critical) | UI/Layout & Gameplay QA | `.browser-test-3.lock` | Chromium then WebKit, every card, 360×640 / 390×844 / 1280×800 (+ card sizes) |
| UI-A | UI/Layout & Gameplay QA | `.browser-test.lock` + `-2` after S releases (lever 3, only if load < 12) | Firefox (≈ 2.0× Cr) |
| N (no lock) | Econ (harness of record) + Saves QA (verification) | none (Node) | all-flags-on harness, AC7 seeds 1–200, X1 ±20 %, 2×, dead zone, pool2 |
| R | HoQA | — | reviews, Art-shot coordination, BBv2 re-baseline co-sign, verdict |
| Art | Head of Art & UX | — | shot review tail after the last shots land |

Rule 21 (≤ 600 s holds via lane-run/lane-kill) and the three-lock rule apply. No other team takes a lock from handoff to verdict.

## 2. Card rows on the final RC (per-card hours: estimate v2 §1.1)
Cards #1, #2, #3, #5, #5b, #6a, #6b, #7, #8, #9, #10, #11, #T, #4 run as in their gate-card QA lines and test plans of record. Changes folded in this version:
- **#7 abilities:** test plan v0.10.3 (`qa/m5/test-plan-abilities.md` sha256 `ef94f478…`, 35 cases): run ≈ **19.75 h** effort (browser ≈ 19.5 h; was 11 on the card line). ≈ 2.75 h of it is BLOCKED-ON-BUILD #86; combo timing rows wait for `m4.tc.combo_*` in the RC balance.json.
- **#5b salesStopped:** test plan v0.14.1 (sha256 `99654090…`, 108 cases, ≈ 45.5 h total): run ≈ **27 h** effort by HoQA's tally of the plan's run splits since v0.10 (was 12 + 2 patch lane on the card line). Provisional until UI QA/Saves QA confirm.
- **Workers cards (#5, #6a, #6b, #7, #10):** pin once to the Workers M5 freeze D-PMW-2026-10-30-23, with post-freeze erratum D-PMW-24: rc2 now **v1.3.16 `e4d98651`** (D-PMW-26 erratum B-2; was v1.3.15 `40a1f0b0`, combo key name only).
- **#9 zeroGainUi:** the BBv2 runs at zero-gain spec L440/L489 (errata rev. 2 `4cfe6895` E-3) now **apply** on the final RC with `bestBuyV2 = 1` (were N/A). BLOCKED-BUILD until BBv2 is on rc/v5.
- **#12 BBv2:** new rows, §3.

## 3. BBv2 rows (Card #12, spec v1.0.4 §7; all on the final RC commit with the ship-set flags, `bestBuyV2 = 1` unless marked)
Status for every row (Thu 5 Nov): **BLOCKED-BUILD** (no BBv2 code on rc/v5 `518de304`; PR #100 `d654afda` open at flag 0, merges after the Architect's review and the SIM-only flag-list PR; no ETA). Authoring is fixture-only now (QA-D-1030-BBV2GATE1).

### 3.1 Sims / harness (lane N; owner **Econ** for the harness and the re-baseline numbers, D-HOP-47, numbers with harness **Sat 7 Nov 18:00**, all-flags-on harness config Sun 8 Nov 18:00 (schedule `dfc795ab`); **Saves QA** verifies hashes/SUMS; **HoQA** co-signs)
| Row | AC | Run | Pass |
|---|---|---|---|
| BB-N1 | BBV2-AC1 (BB-AC1) | property check over every AC7-trace state, seeds 1–200, + fixtures F10/C10, F14/C10, F17/C14, F22/C18 | 0 violations (B) |
| BB-N2 | BBV2-AC8 (BB-AC8) | fresh save, VAR_DEFAULT taps, seeds 1–200 | first non-null ★ meaningful and affordable ≤ 30 s sim; 0 violating seeds (B) |
| BB-N3 | BBV2-AC9 (BB-AC9) | `tests/bot-m4.ts` seller15 (runBot band bot + runM2 workers bot, VAR_DEFAULT), seeds 1–200 | zero-gain purchases below Farm L30 = 0 per run (`bot-farm-log`) (B) |
| BB-N4 | BBV2-AC12 (BB-AC12) | all-flags-on final-RC harness (Econ config incl. `bestBuyV2 = 1` + Q-E2), bot-m4 seller15 and, once #94 parity holds, `tests/bot-m5.ts` `m5x-casual`; G4 on meaningful rows F10→maxLevel per seed and profile | (1) worst ≤ same-seeds no-mechanics baseline (B); (2) P95 ≤ 180 s (B, D-HOP-49 H2); (3) worst ≤ 180 s (B on all-flags-on final RC, D-HOP-44 / -37 C); flags-off runs: (3) reported (W). Known risk P95 197–199 s (SCRATCH CSV `8dc90e2b`) |
| BB-N5 | BBV2-AC13 (BB-AC13) | Econ publishes flag-on AC7 hashes + pacing values on the final CSV; Econ + HoQA sign (pre-cut), then the RC run is compared | binding: -09 ±20 % per band, 2×, ±10 % L10→L30 total **on the flags-off run only** (D-HOP-50; all-flags-on shift reported); report-only: L10 window, L18 sanity, t20 warn, L30 band. Pre-RC probe on #100: acw1 9 seeds over vs ≤ 5 allowed (sign-off open) |
| BB-N6 | BBV2-AC14 (BB-AC14) | traces seeds 1–200 | zero-gain hint ∧ meaningful offered = 0 (decisive run `bestBuyV2` = 1 + `zeroGainUi` = 0); `qaPicker` `suppressed && hint.affordable = 0` (v1.0.4 §6; only exception post-L30 mark-null net with `zeroGainUi` = 0; never plain `suppressed = false`); `best_buy_suppressed_zero_gain` emissions = 0 (not built, D-HOE-33) (B) |
| BB-N7 | BBV2-AC11 (BB-AC11) | flag = 0 test config: every golden, AC7 hash, SG fixture, save/migration/CSR/offline test, `tests/m41-11-farm-max.test.ts` vs the flags-0 reference (D-HOP-29 b), inside the handoff window | byte-identical (B) |
| BB-N8 | #9 BBv2 runs | zero-gain spec L440/L489 states, real run with the flag on | offered rows and gains identical, no ★/hint/highlight, BB-5 fallback, ZG mute identical (B as on Card #9) |

### 3.2 Unit / CI (lane N; engineer-owned tests, **Saves QA** checks the CI evidence on the RC SHA)
BBV2-AC2 (c) `PickHysteresis` COLL→FARM no 2 s hold · AC3 · AC4 unit fallback (if no reachable all-∞ state) · AC7 M4A-41 (a)–(d) unedited · AC10 Q-E2 exact equality (planner vs live, header rate, `secondsToAffordSteady`, offline) · AC15 `qaPicker` v1 fields on `build:qa`, none in release (`check-release-build`) · AC16 event-sink unit for `best_buy_shown`/`best_buy_followed`/`zero_gain_purchase`/`dead_zone` against errata **rev 13 `a0e8f6d7`** types (pinned, TELERR7 PASS) (B schema; counts W).

### 3.3 Browser (lanes UI-B / UI-A; owner **UI QA**; DOM checks on the RC dist, `qaPicker` checks on `build:qa` from the same commit)
| Row | AC | Fixture | Cells |
|---|---|---|---|
| BB-B1 | BBV2-AC2 (a)(b) | **FX-L17** = SG-3 fixture (stopgap v1.2.5 §3: F17 H19 V18 C10; MH, CH, Hawker at energy 100; Grader tier 0; no customers; `savedAt` = fake now; `page.clock` installed before navigation, faking `Date` and `performance`). (a) $37,300 first frame hint = mark = FARM, chip `[data-best-buy="FARM"]`, strip ★ Farm; (b) $3,000, `runFor(240000)`, no buy input | 3 engines × 390×844 (DOM), precondition re-asserted on the final CSV (failed precondition fails the fixture, not the AC) |
| BB-B2 | BBV2-AC4 | **FX-TIE** (all-∞; re-found on the final CSV, else unit + reachable N/A with reason) | strip Farm countdown without ★, never Collection; 3 engines |
| BB-B3 | BBV2-AC5 | dead-zone countdown fixture (no affordable meaningful row; FX-L17(b) start), **built by UI QA from BB-AC5 and oracle-validated by Econ** | countdown to best meaningful row, no ★; 3 engines |
| BB-B4 | BBV2-AC6 | re-run B1-10 / F4-19 and the R11 UI tests flag-on | `Max for this farm`, Lab, breed-stall, Golden Goose never ★/hint/highlight |
| BB-B5 | **BBV2-UI1** (BB-AC17) | 5 states: FX-L17 $3,000; FX-L17 $37,300; dead-zone countdown strip; post-L30 zeroGainUi = 1 (ship); post-L30 zeroGainUi = 0 (**test-only**, not a ship surface) | **45 shots** = 5 × {360×640, 390×844, 1280×800} × {Chromium, Firefox, WebKit}; automated Art conditions per cell: ≤ 1 ★ across strip + rows, always with text label; longest strip label 1 line, 0 overflow at 360; no layout shift when ★ moves; tap targets ≥ 44; axe 0; no "best buy" in `#goal`/`#goalDesc`/`#goalLive` without ★. Judged against Art's sign (14:05 CET on `df9dc86f` §9). 1280×800 added for this card only (standard set is 1280×720). Manifest rows approved as BLOCKED-BUILD, authored fixture-only: UI QA manifest **45 BBV2 rows** (of 1257 planned) in the live `shots/shot-list.json`, pinned by content (QA-D-1030-MANIFESTPIN; sha256 `bf185956` at Nov 5 20:22). |
UI QA harness follow-up: the `variants` table in `artifacts/v5-ui/harness-rc-next/plan/plan.md` L288–290 runs `bestBuyV2 = 0` for zg-on/zg-off/zg-confirm; with the ship value at 1, zg-on becomes the ship config with `bestBuyV2 = 1`, and a `bestBuyV2 = 0` variant stays only as a test config (stopgap SG fixtures, BBV2-AC11). Done: UI QA group A, HoQA-accepted Oct 30 14:29 (RC variants `bestBuyV2` = 1; `zg-on-bb0` added as the Card #9 P3 comparison build).

### 3.4 Saves (lane S; owner **Saves QA**)
| Row | Source | Check |
|---|---|---|
| BB-S1 | spec §4 edge 5 | a save made with the flag on loads identically with it off; save bytes identical flag on vs off (no BBv2 state persisted) |
| BB-S2 | spec §4 edge 6 + BBV2-AC11 | offline return / Welcome-back: first render evaluates fresh; offline earnings use the live model (unchanged by Q-E2) |
| BB-S3 | Saves G1 | ship-set check expects `bestBuyV2 = 1` among 16 keys (shipflags re-pinned to `d71ed8cf`); a 0 at the RC is a FAIL, not a fallback |

### 3.5 Order on the RC
1. Handoff window (before H): BB-N7 flags-0 reference + flag-off goldens; G4 baseline (no-mechanics) for BB-N4 (1).
2. H+0.25: lane N starts BB-N1…N6, N8 in the background with the rest of the AC7/X1/2×/dead-zone sims.
3. Lane UI-B runs BB-B1…B5 **early** in its order, and lane UI-A runs the Firefox half as soon as Saves releases its lock, so the 45 BBv2 shots reach Art before the tail.
4. HoQA checks BB-N4/N5 against the Econ + HoQA signed values; G4 fail = blocker → fix and re-gate (D-CEO-10). A G4/CSV fix is a **full** re-run trigger (estimate §3.2: CSV beyond the failed row / sim core).

## 4. Blocking map for BBv2 (reconciled, quoted)
- D-HOP-2026-10-30-49 (H2): "the meaningful-row dead-zone P95 ≤180 s BLOCKS on the final all-flags-on RC … The L10 window (7.0–10.0 min), the L18 sanity check and the L30 band are report-only; the ±10% L10→L30 total and the -09 bars are binding."
- D-HOP-2026-10-30-44: "any value over 180 s on the all-flags-on final RC blocks v5 (D-HOP-37 C)." D-HOP-37 C: "PL-AC4c blocks on the all-flags-on final-RC run only … Flags-off is reported."
- **Reconciliation:** no conflict. On the all-flags-on final RC, worst ≤ 180 s (D-HOP-44/-37 C) and P95 ≤ 180 s (D-HOP-49) both block; P95 ≤ worst, so the worst-seed bar is the binding one in practice and P95 is recorded with it. Flags-off: >180 s is reported (W). Report-only items never block. **Q-BB-H3 closed by D-HOP-2026-10-30-50 (14:08):** "The ±10% L10→L30 total binds on the flags-off run only. On the all-flags-on run with BBv2 on, the L10→L30 shift is reported, and the blocking bars are the -09 ±20% per band and G4 (worst/meaningful-row dead zone) ≤180 s. -49 does not reverse -34." (Card #12 re-worded by PMFU; no 'run scope Q-BB-H3' left.)
- **Telemetry dependency (dead_zone):** the P95 ≤ 180 s and worst ≤ 180 s bars are measured **only from Econ's sim harness (BB-N4)**. Errata rev 13 `a0e8f6d7` (pinned) row #22 emits `dead_zone` once per stretch, at its end, and only for stretches ≥ `telemetry.bbv2.dead_zone_min_s` = 30 s; that censored stream cannot feed the D-HOP-49 P95 bar (errata L83 itself says gate metrics come from the sim harness). The rev 9 emit-timing blocker (TELERR5 B-1) is closed (rev 12/13 define it against the harness G4; TELERR6/7); BB-U7 (AC16 schema/unit) runs against rev 13. If anyone proposes measuring G4 from telemetry, that is a gate change for HoP.

## 5. BBv2-not-built rule and the open tension (flagged to HoP, not resolved by QA)
- BBv2 rows stay BLOCKED-BUILD until BBv2 is on rc/v5. Per D-CEO-20261030-10 ("every M5 feature is built and ships in v5; the schedule moves instead") and D-CEO-11 (3), if BBv2 is not built by the RC cut, **no RC is cut** and the schedule slips; a BBv2 gate fail is fixed and re-gated, not shipped at 0.
- **Tension: CLOSED** by D-HOP-51 (ship-set `d71ed8cf` L19: `bestBuyV2 = 1` REQUIRED). Remaining cite drift: ship-set L19 cites spec v1.0.1 `5dc9596b`; live is v1.0.4 `4ea3841a` (HoP).
