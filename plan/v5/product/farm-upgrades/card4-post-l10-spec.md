# Card #4 — Post-L10 farm progression · **v1.0.1** · 2026-11-09 CET (UTC+1)

| Field | Value |
|---|---|
| **Version** | v1.0.1 (supersedes v1.0 `e43ab882`, frozen at farm-upgrades/frozen/) |
| **Date** | 2026-11-09 (Europe/Belgrade, UTC+1) |
| **Owner** | PM Farm Upgrades (PMFU) |
| **Status** | accepted as draft (D-HOP-2026-11-09-02); final approval waits for the accepted combined CSV |
| **Task** | HoP/PMFU-card4 (finalise Card #4 on paper) |
| **Ship** | data only — economy CSV rows L11–30; **no flag** (`product/v5-ship-set.md` rev 2: "post-L10 progression: data only (economy CSV L11-30), no flag") |
| **Paper only** | no code, no PR, no sims from PMFU |

## Sources (read-only; not edited by this doc)

| Source | Role | Pin |
|---|---|---|
| Gate card of record | Card #4 ACs PL-AC1..PL-AC9 live in `product/m5-gate-acs.md` § Card #4 | live file; PMFU decisions D-PMFU-2026-10-30-01..04 applied those ACs |
| Card #4 before CSV | RC-PIN-2 / D-HOP-2026-10-30-11 reference | `/workspace/scratch-econ-m51pr/data/economy.csv` sha256 `a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f` (31 rows L0–30) |
| Before metrics | s00-base | `scratch/post-l10/cand/sweep/s00-base/metrics.json` sha256 `d6ac395cbf96b5149af7a16fd9f45dc8a26988ec451862ec1876d81e9af19997` |
| Before tables | baseline | `scratch/post-l10/baseline/out/tables.md` sha256 `4da712bb7b53a0eafc11c7e964990483ad768119eddb560e2fbe636eb22527d1` |
| Shipped product CSV (SoT for build) | `product/economy.csv` | sha256 `c7bb783fe890928f747c142411503261f0711388e73fe1cdadbfd76cc8d68b44` (31 rows; **not** yet the accepted post-L10 combined CSV) |
| F27–29 o1a pin | D-HOP-2026-10-25-11 | `farm_cost` r27/28/29 = values on a8c4e268 (see Tunables) |
| Constraint rulings | D-HOP-2026-10-30-11 / -15 / -18 / -32 / -34 / -37; D-HOP-2026-11-05-15; D-CEO-20261030-09/-10 | `product/decisions.md` |
| BBv2 pins (**unchanged**, D-HOP-2026-11-05-14) | cited only | best-buy spec `product/farm/m5.1-bestbuy-rebaseline-proposal.md` **v1.0.4** sha1 `4ea3841a611493aeac821b070b49f694fcc4a29e`; Card #12 snapshot `9f900304`; gate-acs pin `c2610288` |
| Candidate CSV | after / TBD-CAND | **TBD: pending accepted combined CSV (R04 blocked)** — R04 path `scratch/post-l10/cycle-2320/R04/candidate.csv` sha256 `d1cff5ac…` is **not** accepted (CERTIFIED PL-AC1/2 FAIL stands; D-HOP-2026-11-05-15) |

Every numeric cell this card cares about is a **pointer** into an economy.csv column (and row `level`). No new numeric values are introduced here. Where the accepted after-CSV does not yet exist, the cell is marked **TBD: pending accepted combined CSV (R04 blocked)**.

---

## 1. Goals

Post-L10 (Farm levels 11→30) is the mid/late active session on the L0–30 curve. Intent, consistent with D-HOP-2026-10-30-11/-15, D-CEO-20261030-09, role-spec "no stretch >3 min without an affordable purchase", and `product/farm/l30plus-spec.md` (prestige parked):

1. **Visible near-affordable next purchase.** At every Farm level in 11..29 there is always a meaningful next spend (Farm / Hens / Egg value / Collection / workers as unlocked) that the player can see approaching — via strip countdown and ★ rules owned by Card #12 / BBv2 v1.0.4 (cited above; not redefined here).
2. **No dead zones > 3 min.** Longest nothing-affordable stretch starting at Farm L ∈ 11..29 is gated at **180 s** (3 min) on the ruled profiles/seeds (PL-AC4 / D-CEO-09). Studio best practice and Card #4 share this bar; this doc does not invent a second one.
3. **Smooth L10→L30 total.** Per-profile P50 of `reach(30) − reach(10)` stays within ±10% of the before refs on a8c4e268 / s00-base (PL-AC3).
4. **No step cliffs on L11–29.** Adjacent `farm_cost` list-price steps on L11..29 stay ≤ ×1.30; L0–10 byte-exact (with the one ruled `tc_streak_cap` exception); L30 `farm_cost` stays anchored.
5. **Prepare for prestige later, without shipping it.** L30 remains a reachable ceiling (MAX), not a goal. No L31+ rows in this card. Prestige stays parked (`l30plus-spec.md`); this card leaves a clean L30 anchor so a later L30+ / prestige track can attach without rewriting L0–10.

Constraint priority when a candidate cannot meet every bar at once (D-HOP-2026-10-30-37 A2; relaxes no bar without a HoP ruling):

1. worst-seed dead zone ≤ 180 s (PL-AC4 (c) target / final-RC block)
2. 2× step bar (PL-AC1)
3. ±10% L10→L30 total (PL-AC3)
4. milestone steps at F15/F20/F25 (PL-AC6 (c), **target only**)

---

## 2. Behaviour

### 2.1 What changes

- **Data only.** Rows `level` 11..29 (and the locked row-30 `farm_cost` anchor) of the economy CSV may change under the bars below. There is **no feature flag**.
- **"Before" / "after"** on this card = CSV a8c4e268 vs the accepted candidate CSV, on the same code and the same harness (gate card § Card #4). That pair replaces flag-off / flag-on for this card.
- **Play up to reach(10)** is identical before vs after (PL-AC5). Post-L10 play follows the after CSV under PL-AC1..PL-AC7 / PL-AC9.

### 2.2 What the player experiences (product)

- Buying Farm at level L charges `farm_cost` on CSV row `level = L` (cost of L→L+1). At L30 the row shows MAX; row 30's `farm_cost` is never buyable at `maxLevel` 30.
- Hens / Egg value / Collection / worker rows continue to read their CSV columns; caps stay `hens_cap_over_farm` / `egg_value_cap_over_farm`.
- Best-buy / strip / ★ behaviour is **out of this card's normative text** and stays exactly as BBv2 v1.0.4 + Card #12 (D-HOP-2026-11-05-14). Card #4 only supplies the cost curve those systems read.
- Workers unlock thresholds (`w1_unlock_farm`, `w2_unlock_farm`, `w3_unlock_farm`) and grader schedule (`w4_tier`, `w4_price_mult`, `w4_tier_cost`) remain CSV-driven; L21–30 `w4_price_mult` must match the a8c4e268 baseline cells in any repair proposal (D-HOP-2026-11-05-15 non-AC note (a)).

### 2.3 Governs vs gates.md

Per D-HOP-2026-10-30-32 (a): `economy/gates.md` (M4.1 L30 card) is **not** amended. Card #4 governs post-L10 for v5. Where they differ (E-G7 L0–30 byte-exact; E-G4 worst ≤ 180 s on any candidate), **this card decides** (PL-AC5 for L0–10 only; PL-AC4 (c) for dead-zone block timing).

### 2.4 Blocking vs reported (summary; full text in gate card)

| Run | Blocks on | Reported only |
|---|---|---|
| Candidate / PR-head, flags-off `CFG none` | PL-AC1, PL-AC2, PL-AC3, PL-AC4 (a)/(b), PL-AC5, PL-AC6 (a)/(b)/(d), PL-AC7 | PL-AC4 (c) + 18:00 target, PL-AC6 (c), PL-AC8 |
| All flags on, final RC | PL-AC9 (= PL-AC1+PL-AC2), D-CEO-09 pacing ±20% (PL-AC7 metric), D-CEO-09 dead zone (PL-AC4 (c)) | PL-AC3, PL-AC4 (a)/(b) |
| Flags-off at final RC | (as candidate set) | PL-AC4 (c) |

---

## 3. Tunables

All values are **read from CSV**, never invented here. "Current (before)" = a8c4e268 unless noted. "After" = accepted combined CSV, else TBD.

| Tunable | economy.csv pointer | Current (before = a8c4e268) | After / ship |
|---|---|---|---|
| Farm list price L→L+1 | col `farm_cost`, row `level` = L | L10=`1368`; L11=`1710`; L12=`2138`; L13=`2672`; L14=`3340`; L15=`4844`; L16=`7024`; L17=`10185`; L18=`11076`; L19=`18201`; L20=`31050`; L21=`40660`; L22=`56589`; L23=`68756`; L24=`72194`; L25=`97461`; L26=`131573`; L27=`160000`; L28=`175000`; L29=`190000`; L30=`624316` | L11–29: **TBD: pending accepted combined CSV (R04 blocked)**; L30 stays `624316` (D-HOP-2026-10-30-37 A1); L0–10 byte-exact per PL-AC5 |
| F27–29 o1a pin | `farm_cost` rows 27/28/29 | `160000` / `175000` / `190000` (D-HOP-2026-10-25-11; on a8c4e268) | Candidate may retune under PL-AC1..7; if changed, PMFU re-runs F27–29 dead-zone checks (BB-9 / meaningful-wait) on that candidate (gate card Dependencies §6) |
| L30 anchor | `farm_cost` row 30 | `624316` | **KEEP** `624316` (D-HOP-37 A1). L29→30 step is a watch-list exception; steps gated on L11–29 only |
| Step bar | derived: `farm_cost[L] / farm_cost[L−1]` for L=11..29 | (info) several before steps exceed ×1.30 — candidate must clear the bar | every step satisfies `1.00 < step(L) ≤ 1.30` (PL-AC6 (b)) |
| Milestone discount target | derived on `farm_cost` steps at L=15,20,25 | no dedicated CSV column; target only | **target, not hard fail** (D-HOP-37 A2 / PL-AC6 (c)) |
| Hens count / coop | cols `hens`, `coop_capacity`, row `level` | L10=`55`/`550` … L30=`155`/`1550` (a8c4e268; matches `product/economy.csv` on these cols for L10–30) | L0–10 frozen; L11–30 follow accepted CSV or stay as before until accepted |
| Track costs | cols `hens_cost`, `egg_value_cost`, `collection_cost` | per-row on a8c4e268 | L11–30: **TBD: pending accepted combined CSV (R04 blocked)** if retuned; else before |
| Caps over Farm | cols `hens_cap_over_farm`, `egg_value_cap_over_farm` | `3` on L0–30 (a8c4e268 / product) | unchanged unless accepted CSV says otherwise under PL-AC5 rules |
| Grader mult L21–30 | col `w4_price_mult`, rows 21–30 | L21=`2.5`; L22–23=`3.0`; L24–30=`4.0` (a8c4e268; D-HOP-2026-11-05-15 note (a)) | must match these baseline cells in any repair proposal; R04's differing cells are **not** authorized |
| Grader tier / tier cost | cols `w4_tier`, `w4_tier_cost` | per a8c4e268 | as accepted CSV; subject to PL-AC5 on rows 0–10 |
| Worker unlock Farm levels | cols `w1_unlock_farm`, `w2_unlock_farm`, `w3_unlock_farm` (constants on rows) | `3` / `7` / `8` | L0–10 byte-exact; no Card #4 change expected |
| Streak cap | col `tc_streak_cap` | a8c4e268 = `0.28` on all rows | **0.27** on rows 0–10 (and ship config) under breeds=1 (D-HOP-2026-10-30-27 / -32; sole PL-AC5(i) numeric exception per D-HOP-2026-11-05-15). Subject to B4 re-run on final combined CSV |
| Combo window / boost | cols `combo_window_s`, `combo_boost_s` (rename map may move to `tc_combo_window_s` / `tc_combo_boost_duration_s`) | `10` / `45` on a8c4e268 | values stay `10` / `45` with explicit old→new map + HoE confirm if renamed (D-HOE-30/31; D-HOP-15) |
| `bc_*` breeds columns | 32 `bc_*` cols (ride same PR) | not on post-L10 candidate sweeps; draft source `scratch/m51-econ/economy.m51-draft.csv` | listed per column on rows 0–10 as 32 constants (PL-AC5 (i-b)); `bc_broody_cap_bp` 700 unapproved/untraced (D-HOP-15 note (b)) |
| Dead-zone bar | AC constant (not a CSV cell) | 180 s | 180 s (D-CEO-09 / D-HOP-15 / PL-AC4) |
| ±10% total refs | sim output on before CSV | optimal `2116.0` s; seller15 `2100.2` s; casual `2041.5` s (`tot10_30_P50_s` in s00-base `d6ac395c`) | after P50 within ±10% of these (PL-AC3) |
| ±20% band-time refs | sim output, minutes | optimal `5.53/11.22/10.75/7.15`; seller15 `5.69/10.31/10.79/7.44`; casual `5.48/9.02/11.13/7.65` (F11-15/F16-20/F21-25/F26-30; s00-base) | \|after/before − 1\| ≤ 0.20 per band (PL-AC7) |
| Band-gap P95 before (no-regression) | sim output, seconds | optimal `81/125/121/157`; seller15 `53/79/77/115`; casual `35/59/58/93` | after ≤ before per band (PL-AC4 (b)) |
| Row count | CSV row count | 31 (L0–30) | no L31+ (PL-AC6 (d)) |

**Drift note (D-HOP-2026-10-30-46, ruled D-HOP-2026-11-09-02):** `product/economy.csv` r27–29 `farm_cost` (`177624`/`239792`/`323719`) and `tc_streak_cap` `0.4` are stale; a8c4e268 o1a is the baseline of record (`160000`/`175000`/`190000`, cap `0.28`, ship target `0.27`); promoting that file is post-cut item A, owned by Econ, and is not edited here.

---

## 4. Edge cases

1. **L30 purchase / MAX.** Row 30 `farm_cost`=`624316` is never buyable at maxLevel 30. The L29→L30 purchase is the last Farm buy; its wait is gap(29) and **is** inside the dead-zone check (D-HOP-37 A1). After L30 the strip / ★ path is Card #12 / BBv2 (post-L30 empty meaningful set → no-pick or BR-BB4), not this card.
2. **L29→30 step cliff.** `624316 / farm_cost[29]` is a known watch-list exception (×3.29 on a8c4e268). Excluded from PL-AC6 (b); not a free pass on gap(29).
3. **L0–10 must not move** (string-identical on all pre-existing columns vs a8c4e268), except `tc_streak_cap`→`0.27` under the ruled breeds=1 config. Renames need an explicit map, byte-identical values, and HoE confirm (or empty map).
4. **New `bc_*` on rows 0–10.** Only as listed 32 per-column constants for B4; unlisted values = FAIL. `bc_broody_cap_bp` remains unapproved until modelled + B4-traced.
5. **Unauthorized grader retune.** Any candidate that changes `w4_price_mult` L21–30 away from a8c4e268 cells is not authorized; its results do not transfer to a corrected CSV (D-HOP-15).
6. **Seed that never reaches L30.** analyze.py treats it as FAIL, not skip (all 200 seeds × 3 profiles must reach L30).
7. **Harness blob change.** If the after run uses a different harness blob than the pinned scratch harness, the before run is redone on that blob before PL-AC4 (b) / PL-AC7 compare.
8. **Flags-on vs flags-off.** PL-AC4 (c) blocks only on the all-flags-on final-RC run (D-HOP-37 C). Flags-off worst-seed ≤180 s remains the 18:00 candidate **target** (D-HOP-34), not the final-RC block on flags-off.
9. **Conflict with gates.md E-G7 / E-G4.** Card #4 wins for v5 post-L10 (D-HOP-32 (a)).
10. **R04 and any unaccepted candidate.** Scratch candidates may be measured for Econ search, but until HoP accepts a combined CSV, ship numbers stay TBD and CERTIFIED FAILs stand.

---

## 5. Testable ACs

IDs **C4-AC1..C4-AC12**. Each pass condition is measurable from CSV cells and/or the Card #4 harness outputs (`metrics.json` / `verdicts.json` / `compare.md` / `csvcheck.py`). Numeric bars are the ones already ruled on the gate card — referenced, not re-litigated. Full harness command, pinned file shas, and quantile definitions live in `product/m5-gate-acs.md` Card #4; this section is the product AC index.

Profiles = `{optimal, seller15, casual}`. Seeds = 1..200. T = 4000 s. Before CSV = a8c4e268. After CSV = accepted combined CSV (**TBD: pending accepted combined CSV (R04 blocked)**).

| ID | Gate map | Given | When | Then (pass) |
|---|---|---|---|---|
| **C4-AC1** | PL-AC1 | after CSV, flags-off harness | each profile p, each L ∈ 11..29 | `prof.<p>.level.<L>.tstep` ≤ 2.000 (rounded 3 d.p.); `verdicts.json` `2x_P50` empty. 57 checks. |
| **C4-AC2** | PL-AC2 | same run | each p, each L ∈ 11..29 | `tP95` ≤ 180.0 s; `verdicts.json` `P95_180` empty. 57 checks. |
| **C4-AC3** | PL-AC3 | same run | each p | \|`tot10_30_P50_s` / before_ref − 1\| ≤ 0.10, where before_ref ∈ {`2116.0`,`2100.2`,`2041.5`} s from s00-base `d6ac395c` (`prof.<p>.tot10_30_P50_s`). `verdicts.json` `total_pm10` second element = true. P10/P90 of per-seed totals reported. |
| **C4-AC4** | PL-AC4 (a) | same run | each p × band ∈ {F11-15,F16-20,F21-25,F26-30} | band gap P95 ≤ 180 s; `verdicts.json` `bandgap_P95_180` empty. 12 checks. |
| **C4-AC5** | PL-AC4 (b) | same run vs before on same harness blob | each p × band | after band gap P95 ≤ before band gap P95 (before: opt `81/125/121/157`, s15 `53/79/77/115`, cas `35/59/58/93`). Zero tolerance. |
| **C4-AC6** | PL-AC4 (c) | all-flags-on final-RC harness config (validated at freeze on RC commit; path TBD Econ) | each p × band | worst band gap `gW` ≤ 180 s (12 checks); equiv. `gap_seeds_over_180` empty for L ∈ 11..29. Flags-off: reported + 18:00 target (opt F21-25 / F26-30 / L21 → ≤180 s). |
| **C4-AC7** | PL-AC5 (i)/(i-b)/(ii)/(iii) | after CSV vs a8c4e268 | rows `level` 0..10 | all pre-existing columns string-identical except `tc_streak_cap`=`0.27` (breeds=1); renames only via map + byte-identical + HoE confirm; `bc_*` = 32 listed constants; sim reach(0)..reach(10) identical on 600 seed-runs; event-trace hash up to reach(10) identical (unmeasured = FAIL until harness lands). |
| **C4-AC8** | PL-AC6 (a)(b)(d) | after CSV | csvcheck | row 30 `farm_cost` == `624316`; for L=11..29, `1.00 < farm_cost[L]/farm_cost[L−1] ≤ 1.30`; no rows L31+. |
| **C4-AC9** | PL-AC6 (c) | after CSV | report | milestone-smaller steps at L=15,20,25 present or not — **target only**, does not fail the card; listed on Econ trade-off table. |
| **C4-AC10** | PL-AC7 | same flags-off run | each p × band | \|after band time P50 / before band time P50 − 1\| ≤ 0.20; `verdicts.json` `perband_pm20` empty. Before minutes from s00-base (see Tunables). Per-level deviations reported. |
| **C4-AC11** | PL-AC8 | candidate package | report | candidate reported on E-G1..E-G10 in gates.md format with full provenance; E-G7/E-G4 superseded here by C4-AC7 / C4-AC6. |
| **C4-AC12** | PL-AC9 + D-CEO-09 | all-flags-on final RC (streak cap `0.27`) | ship config | C4-AC1 and C4-AC2 pass with all flags on; pacing ±20% (C4-AC10 metric) and dead zone (C4-AC6) block; C4-AC3 and C4-AC4/C4-AC5 report-only under all flags on (D-HOP-34 (1)). |

**Evidence for every AC:** sha256s of after CSV, `metrics.json`, `compare.md`, `verdicts.json`, raw JSON/logs, and (where applicable) `csvcheck.py` / reachdiff / trace10 output — filled by Econ at TBD-CAND / TBD-PR.

**UI:** N/A for Card #4 (no new UI). Existing UI that renders `farm_cost` stays on its own cards. BBv2 surfaces stay on Card #12.

---

## 6. Open questions

1. **TBD-CAND / accepted combined CSV.** No HoP-accepted after CSV yet. R04 (`d1cff5ac…`) remains blocked (CERTIFIED PL-AC1/2 FAIL). Final tunables for L11–29 stay **TBD: pending accepted combined CSV (R04 blocked)**.
2. **TBD-PR.** PR URL, head sha, CSV sha256, rename map (may be empty), and per-column `bc_*` list — owned by Econ when opened.
3. **All-flags-on harness config** (path, command, sha, freeze validation record, flags-on before run on a8c4e268 for ±20%). Owned by Econ (gap 5 on gate card).
4. **Harness of record for final RC** (Econ + Architect). Scratch harness in the gate card is not final.
5. **Scripts still owed by Econ** (`csvcheck.py`, `reachdiff.py`, P10/P90 totals, trade-off table, `bandguard.py`, `trace10.ts`, AC7 `--csv` in repo).
6. **Flags-0 golden post-merge sha** (HoE posts with RC cut).
7. **`bc_broody_cap_bp`.** 700 unapproved/untraced; draft/K002 2000 not endorsed (D-HOP-15). Resolve via approval + model + B4 only.
8. **Prestige / L30+ attachment point.** Parked. Confirm with HoP that Card #4's L30 anchor + no L31+ is sufficient prep, or whether a forward-looking teaser string (no numbers) is wanted before L30+ ships.
9. **Product CSV drift — RESOLVED by D-HOP-2026-11-09-02 (1):** keep the a8c4e268 o1a values; see the drift note in §3. `product/economy.csv` promotion is post-cut item A (Econ).
10. **R04 `w4_price_mult` — RESOLVED by D-HOP-2026-11-09-02 (2):** R04's w4 changes stay unauthorized (D-HOP-15(2)); the card keeps L21=`2.5`, L22–23=`3.0`, L24–30=`4.0`. PL-AC1/2 stay FAIL until a passing candidate is accepted.
11. **Live gate-acs sha vs D-HOP-14 pin.** BBv2 pins stay cited as v1.0.4 / Card #12 `9f900304` / gate-acs `c2610288` (D-HOP-14). The live `product/m5-gate-acs.md` sha continues to move as other cards edit the file; Card #4 body text is the gate section titled "Card #4 — Post-L10 progression". This paper spec does not freeze or edit that file.

---

## 7. Out of scope

- Any edit to `product/m5-gate-acs.md`, `product/decisions.md`, `product/status.md`, `product/economy.csv`, code, PRs, or sims.
- BBv2 / Card #12 behaviour, ★ rules, `qaPicker`, zeroGainUi (cited pins only; D-HOP-2026-11-05-14 unchanged).
- Breeds B4 numeric retune (rides the same CSV PR; owned by Collection / Econ).
- Prestige mechanics, L31–50 rows (`l30plus-spec.md`).
- UI / Art / new player-facing strings.
- Accepting or rejecting any Econ candidate (HoP).
- Changing gates.md M4.1 L30 card.
- Starting long-running processes or sims (standing rule 21 / usage constraint).

---

## 8. Dependencies (carry-forward)

1. Econ delivers / HoP accepts the combined CSV (TBD-CAND).
2. CSV PR (TBD-PR) shared with breeds `bc_*`; HoP records merge sha in `v5-ship-set.md`.
3. HoP approval + Vadim's go for economy CSV ship.
4. Harness of record + all-flags-on config at freeze.
5. If candidate moves F27–29 off o1a, PMFU re-checks F27–29 dead-zone / BB-9 on that candidate (paper follow-up).
6. B4 re-run on final combined CSV (streak-cap exception condition).

---

*End of Card #4 paper spec v1.0.1 — accepted as draft (D-HOP-2026-11-09-02); remaining open questions stay TBD, tied to the final CSV/RC.*
