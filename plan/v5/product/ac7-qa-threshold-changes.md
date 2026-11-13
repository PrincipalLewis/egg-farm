# AC7 / pacing gates: changes QA needs under the HoP 23:15 standard (Economy, 2026-10-16). QA's files were not edited.
Standard: pacing gates (2× active/idle, 2× level step, 3-min gap) are judged at P95 across seeds, with worst-seed guards of ≤2.25× for ratios and ≤4 min for gaps.

| file | test / check | current | new |
|---|---|---|---|
| game/tests/pacing.test.ts | 'Farm L18 reached within 24-36 min' (8 seeds × 40 min, median) | median 24–36 min (M1 AC7) | Superseded after the F1 merge (qa/m3-test-plan.md:107). Replace it with level at 30:00 in L18–22 with no workers, judged at P95 across 30 seeds (P95 seed ≥L18 and ≤L22). Add a with-workers case at L20–24. |
| game/tests/pacing.test.ts | 'Farm L10 reached within 8-12 min' (median, 20 seeds) | median 8–12 min | Keep the band. Judge at P95 (P95 seed ≤12 min) on ≥30 seeds. |
| game/tests/pacing.test.ts | header comment, SEEDS | "20 seeds, medians, ±20%" | ≥30 seeds (P95 needs it); "P95 + worst-seed guard". |
| qa/m3-scripts/combined/f1-pacing.ts | 'L18-25 worst step <= 6' | med(steps) ≤ 6 min | P95(steps) ≤ 6 min and worst-seed guard ≤ 8 min (HoP 23:19). |
| qa/m3-scripts/combined/f1-pacing.ts | 'AC7 Farm level at 30:00 in L18-22' | median | P95 across seeds (P95-low and P95-high seeds both in L18–22). |
| qa/m3-scripts/combined/f1-pacing.ts | per-level time bands L5–14, income ±20% | median | Leave as is: these are level-time bands, not pacing-ratio gates under the standard. |
| product/farm/m4/tr5_run.py (PM Farm Upgrades' bot that QA runs; qa/m4-ac-testability.md TR-5) | gap ≤3.0 min, F18 17.8–21.7, L@30 L18–22 | median AND ≥80% of seeds (`need = ceil(0.8N)`, lines 69/77/80) | ≥95% of seeds in band (P95) plus a worst-seed gap ≤4.0 min. Edit `need` to ceil(0.95N) and add a worst-gap check. PM Farm Upgrades owns this file. |
| qa/m4-ac-testability.md TR-5 text | "median AND ≥24/30 seeds" | 80% rule | "≥29/30 seeds (P95), worst gap ≤4 min". |
| (new) 2× active/idle (CEO cap; M4 ACs) | the sims check worst seed ≤2.0 | worst ≤2.0 | P95 ≤2.0 and worst ≤2.25 on the 10-min window. **Logged exception (HoP 23:19): F22–24 only, P95 ≤2.15 and worst ≤2.25 (Focus +5%, 30 s cooldown; measured P95 2.12, worst 2.19). Re-check against playtest telemetry.** |
| (new) 2× level-step ratio (designer step metric, m2-proposal §12; soft) | soft, medians, steps <30 s ignored | median | P95 ≤2.0 and worst ≤2.25 (30 s floor kept). |
| AC-FH3 (rc2-first-hire-nudge.md) | — | — | Already P95 (≤8 min). QA adds the casual sim run (sim/market/first_hire.py). |

- Oct 16 23:30, Head of Product: level-step ratio only counts when the previous level took >=1 min, at every level range; absolute guards unchanged. L18-29 step ratio is warn-only (hard gate from L30). TR-5 on economy.f1-m4cols.csv recorded as PASS.
