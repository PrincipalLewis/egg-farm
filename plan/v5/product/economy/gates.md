# Economy result card (owner: Head of Product) — v1, 2026-10-19

E-Gn = former Gn (pre-2026-10-28 docs)

Every pacing/economy candidate is reported against this full list, every time. A row may not be skipped. "Not measured" counts as a fail.

## Provenance (required)
- Harness: name + commit SHA (the Architect's one-command harness on the #45 code once it's published; scratch numbers are labelled "scratch").
- Code SHA (full), CSV sha256 (full), fixture sha256 (full), seeds and duration.

## Gates
| # | Gate | Limit | Source |
|---|------|-------|--------|
| E-G1 | L30+ step P95 | ≤ 2.00 | D-CEO-04 |
| E-G2 | L30+ step worst seed | ≤ 2.25 | D-CEO-04 |
| E-G3 | Top-step share for any single level | ≤ 25% of seeds | D-HOP-21 |
| E-G4 | Longest stretch with no affordable purchase, worst seed (also report the P95 across seeds) | ≤ 180 s | D-HOP-22/23, studio best practice |
| E-G5 | Workers L10 P95 | ≤ 12.1 (report margin) | release B baseline |
| E-G6 | acw1: F10 within 960 s | ≥ 95% on seeds 1–200 and 201–299; median F18 ≤ 40 | D-CEO-06 |
| E-G7 | L0–30 byte-exact on the 123 kept columns vs main's data/economy.csv: b48be8a4 on main dd223f5 today, c7bb783f once M41-5 merges (the same file minus guard_heartbeat_s and guard_stale_s; identical on the 123 kept columns, so the result is the same either way; the harness prints both; evidence qa/m3-recheck/csv-lineage-c7bb783f/), plus play byte-identical to main on every seed up to that seed's first purchase above level 30 (D-CEO-16 option b). The harness logs the divergence tick and first differing event per seed, and that event must be an L30+ purchase. A Collection row may ease only if 0/200 seeds buy it before F31 (C22 FROZEN; C23–27 easable on 846178a) | exact | D-CEO-11, D-CEO-15, D-HOP-25 amendment |
| E-G8 | sync + strict | 0 errors | CI |
| E-G9 | Costs strictly rising, every track | yes | product rule |
| E-G10 | No CSV column the game doesn't read | 0 | D-HOP-22 / ECON-DEADCOL |

## Card format
`candidate | harness@sha | code sha | csv sha256 | E-G1..E-G10 values | PASS/FAIL per gate | top 3 step levels with shares`


**v1.1 (2026-10-19 09:37):** E-G7 baseline changed to c7bb783f. E-G10 note: hv_extra_cost_farm_share is read by the game on code 729565e9 (sync-economy.ts:181–185, formulas.ts:37), so it passes E-G10 and isn't an allowlist item. Candidates must not carry the 8 columns D-HOP-25 dropped.

**v1.2 (2026-10-19 10:00, D-CEO-20261019-16):** E-G7 uses option (b). Harness of record: arch/m41-integrated 846178a80726eca2ab9590fdad2e16686295afb6, with the Architect's (b) option. Each result reports the harness blob, the CSV sha256, the seeds and the flags. HoQA's added conditions: (1) for each seed, the divergence cause must be an L30+ purchase, otherwise FAIL; (2) report the farm level at divergence across all 200 seeds; E-G1–E-G10, including E-G4 (dead zones), cover F28 onward, not only F31+; (3) workers L10 is re-run in the same pass, and any change at L0–11 fails intake. The L30 row restore (D-HOP-24), E-G3 and E-G4 are not waived.

**v1.3 (2026-10-19 10:10):** E-G7 cites both shas, as agreed with HoQA and HoE per the CEO's D-CEO-16 addendum. Code of record: 846178a.

**v1.4 (2026-10-19 10:32, D-HOP-38), IN FORCE per D-CEO-20261019-18 (10:27). "Worse than main" means worse by any amount, with no tolerance, on the same seeds and the same harness blob.** The E-G1–E-G10 window starts at F28, per HoQA's condition under the D-CEO-16 addendum. Baseline rule for E-G1/E-G2/E-G4: the card reports main's own value for every step ending at F≤30, on the same seeds. A step ending at F≤30 counts against E-G1/E-G2/E-G4 only where the candidate is worse than main's value for that step. L0–30 data is frozen, so the inherited F28 known issue (D-HOP-24) can't be fixed here. It's reported, not gated. Steps ending at F31+ are gated outright.

**v1.5 (2026-10-19 10:36):** Code of record is a05bc74 (integrated head after 846178a), harness blob 75c864752b5a. Evidence from any other code doesn't count.

**v1.6 (2026-10-19 10:40):** D-CEO-18 is in force. The main-baseline values come from the code of record a05bc74 with the flag off (byte-identical to main) and harness blob 75c864752b5a, so candidate and baseline share one harness. The CEO's text named 846178a, the integrated head before a05bc74. HoQA has been told.

**v1.7 (2026-10-19 10:45, D-CEO-20261019-19):** First-difference condition, amended. A seed also passes when its first difference is a Farm purchase whose logged lookahead bundle contains an L31+ track buy, and play is byte-identical to main before it. Each such seed gets E-G1–E-G10 from its divergence tick, with steps ending at F≤30 judged per D-CEO-18. Every other first difference before an L30+ purchase is a FAIL. The card must list, for each divergent seed: seed, tick, farm level, purchase, and the lookahead bundle. E-G7, the C22 freeze, the workers L10 re-run, the L30 row, E-G3 and E-G10 are unchanged. Options (a), cutting L31 gains, and (b), changing the lookahead code, are withdrawn.

**v1.8 (2026-10-19 10:55), correcting v1.7 to match D-CEO-20261019-19 as ruled (HoQA):** E-G1–E-G10 cover F28+ for every seed, including unlock-driven seeds. They are not gated from each seed's divergence tick, so v1.7's "from its divergence tick" is withdrawn. For seeds that diverge at F27, the F27→28 step is compared with main under D-CEO-18 (fails only if worse than main). A seed counts as an unlock-driven Farm buy only when the harness log says unlockDrivenFarmBuy = true. That needs three things: the candidate event is a Farm purchase; the bestBuy depth-3 plan contains a hens or eggValue step to a level above 30; and a counterfactual bestBuy with track levels capped at 30 returns main's event. The Architect adds these fields by 13:00. QA confirms with per-seed trace hashes that adding the fields doesn't change play.
