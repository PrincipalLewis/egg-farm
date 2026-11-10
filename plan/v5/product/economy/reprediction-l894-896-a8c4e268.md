# PROPOSAL (for HoP approval): re-prediction of §13.2a G4 dead-zone rows L894–896 (+ L898–899) on CSV a8c4e268

**Status: PROPOSAL, not applied.** Owner: Economy/Balance Designer. Approver: Head of Product. Asked for by D-HOP-2026-10-30-07 (3); HoQA needs HoP sign-off on it before PR #92 (V5-HOP-1) merges.
`product/research/v2-slices/economy.md` (sha1 6718538c, where §13.2a L877–913 lives) is **not edited**. The replacement rows are in §5, ready to paste once HoP approves.
Prepared 2026-10-30, ~11:00 CET. Updated ~10:58 CET with the HoP ruling: the dead-zone rows use the same-seed no-mechanics baseline (§2a).

## 1. Inputs and provenance
- **CSV:** `/workspace/scratch-econ-m51pr/data/economy.csv`, sha256 `a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f` (verified; each raw JSON records the same sha). This is 8dc90e2b plus `farm_cost` r27/28/29 = 160000/175000/190000.
- **Seeds:** 1–200 (`SEEDS=200 S0=1`), T 4000 s, L0–30. All 200 seeds reach L30 in every cell.
- **Harness:** `scratch/m51-pr/gates/h/` is a byte-identical copy of `scratch/v2-econ/h` with the same `.ts` files: m5.ts `29d423c5`, m5x.ts `196e8ed5`, package-lock `56569550`. The G4 meaningful runner is `scratch/m51-econ/ac22/g4/g4.ts` `f311ef62` + `m5g4.ts` `d54f8894` (sources in `scratch/m51-econ/h`, m5.ts `516d09f7`), with `G4M=1`. All hashes were re-checked today and are unchanged.
- **Raw outputs reused (no new sim was needed for any number here):** `artifacts/v5-hop1-2d15dac/results/raw/pacing/ship-a8c4e268/{step-optimal,step-seller15,step-casual}.json` and `g4m.json`/`g4m.log`, run 10:18–10:30 CET. The 8dc90e2b control is in `…/base-8dc90e2b/`. `artifacts/v5-hop1-2d15dac/results/SHA256SUMS`: 98/98 OK today. (`rc.txt` there shows the old output path `artifacts/v5-hop1-33e775e/…`, because the folder was renamed afterwards. The checksums match.)
- **Cross-checks:**
  - The any-row P50/P95/worst from `m5x.ts` (step-*.json) and from `g4.ts` (`G4_record_anyRow`) are identical in all 18 cells (9 ship + 9 control). This is asserted in `extract.py`.
  - The 8dc90e2b control reproduces every current L894–899 number exactly, baselines included. So any change is from the CSV, not the harness.
- **Extract:** `scratch/m51-pr/repredict/extract.py` → `repredict.json` (reads the raw JSON only). A reproducibility re-run of the G4 meaningful job, with its exact command recorded, is in `scratch/m51-pr/repredict/rerun-g4m-a8c4e268/` (see §6).

### Exact commands (as run for the reused raw)
```
# step + G4 any-row + no-mech baseline (per profile p ∈ optimal, seller15, casual); cwd scratch/m51-pr/gates/h
CSV=/workspace/scratch-econ-m51pr/data/economy.csv SEEDS=200 S0=1 T=4000 CFG=none,AssZ,AssZhold PROFS=<p> NOWIN=1 STEP_FROM=11 \
  node node_modules/.bin/vite-node m5x.ts > step-<p>.json 2> step-<p>.log        # exact script: artifacts/v5-hop1-2d15dac/results/raw/run-pacing.sh
# G4 meaningful (bb5) + any-row; cwd scratch/m51-econ/h
G4M=1 CSV=/workspace/scratch-econ-m51pr/data/economy.csv SEEDS=200 S0=1 T=4000 CFG=none,AssZ,AssZhold PROFS=seller15,optimal,casual \
  node /workspace/egg-farm-studio/scratch/m51-pr/gates/h/node_modules/.bin/vite-node ../ac22/g4/g4.ts > g4m.json 2> g4m.log
# extract
python3 scratch/m51-pr/repredict/extract.py > scratch/m51-pr/repredict/repredict.json
```
(The g4m command line wasn't recorded for the gate-3 run. The defaults in g4.ts are the same values, and the §6 re-run records it exactly.)

## 2. Old vs new: L894–895 G4 longest nothing-affordable F10–30, any-row (s), P50 / P95 / worst
| L | policy | profile | old pred (8dc90e2b) | **new pred (a8c4e268)** | ratio new/old P50/P95/worst | new ±20% band P50 · P95 · worst | P95 ≤180 | worst ≤180 |
|---|---|---|---|---|---|---|---|---|
| 894 | N | optimal | 84 / 160 / 234 | **68 / 114 / 143** | ×0.81 / ×0.71 / ×0.61 | 54.4–81.6 · 91.2–136.8 · 114.4–171.6 | yes | yes |
| 894 | N | seller15 | 77 / 126 / 294 | **47 / 77 / 132** | ×0.61 / ×0.61 / ×0.45 | 37.6–56.4 · 61.6–92.4 · 105.6–158.4 | yes | yes |
| 894 | N | casual | 70 / 126 / 196 | **36 / 64 / 92** | ×0.51 / ×0.51 / ×0.47 | 28.8–43.2 · 51.2–76.8 · 73.6–110.4 | yes | yes |
| 895 | H | optimal | 84 / 166 / 272 | **70 / 107 / 191** | ×0.83 / ×0.64 / ×0.70 | 56.0–84.0 · 85.6–128.4 · 152.8–229.2 | yes | **no (191)**, L897 warning |
| 895 | H | seller15 | 78 / 142 / 231 | **47 / 86 / 120** | ×0.60 / ×0.61 / ×0.52 | 37.6–56.4 · 68.8–103.2 · 96.0–144.0 | yes | yes |
| 895 | H | casual | 73 / 141 / 216 | **40 / 81 / 140** | ×0.55 / ×0.57 / ×0.65 | 32.0–48.0 · 64.8–97.2 · 112.0–168.0 | yes | yes |

**No-mechanics baseline, same seeds** (the header of L894): old 129/260/381 · 110/196/305 · 103/149/226 → **new 104/161/202 · 68/115/153 · 59/94/129** (optimal · seller15 · casual).

**L895 frenzy-holder casual worst (called out explicitly):** the old prediction was **216 s**, and the new measured and predicted value is **140 s**. The 129 s figure is not the old prediction. It is the new **same-seed no-mechanics worst** (it was 226 s on 8dc90e2b). Against the literal absolute clause "worst ≤ baseline worst", 140 > 129 still fails (+11 s, +8.5%). This re-prediction fixes the band, but the clause would fail again on every future run. HoP ruled it PASS with a note (D-HOP-2026-10-30-07 (2)). §5 proposes writing that ruling into the gate cell (×1.2 of the baseline worst) so the next gate doesn't fail it literally. **HoP decision needed (option A below).**

## 2a. Baseline basis for the dead-zone rows (HoP ruling, 2026-10-30 ~10:56 CET)
**The dead-zone rows L894–896 (N and H, the L895 H row included) are measured against the SAME-SEED no-mechanics baseline on the CSV under test. They are not measured against the baseline numbers printed in the §13.2a row header.** The same-seed baseline is `CFG=none`: same harness, same seeds 1–200, same T 4000, same CSV (a8c4e268), from the same `step-<p>.json` run. The header print is only a record of the last measurement. The no-mech baseline doesn't depend on call policy, so N and H share it.

| L | policy | profile | mechanics P50 / P95 / worst | **same-seed no-mech P50 / P95 / worst (a8c4e268)** | worst vs no-mech worst | P95 vs no-mech P95 |
|---|---|---|---|---|---|---|
| 894 | N | optimal | 68 / 114 / 143 | **104 / 161 / 202** | −59 s (×0.71) | −47 |
| 894 | N | seller15 | 47 / 77 / 132 | **68 / 115 / 153** | −21 s (×0.86) | −38 |
| 894 | N | casual | 36 / 64 / 92 | **59 / 94 / 129** | −37 s (×0.71) | −30 |
| 895 | H | optimal | 70 / 107 / 191 | **104 / 161 / 202** | −11 s (×0.95) | −54 |
| 895 | H | seller15 | 47 / 86 / 120 | **68 / 115 / 153** | −33 s (×0.78) | −29 |
| 895 | H | casual | 40 / 81 / 140 | **59 / 94 / 129** | **+11 s (×1.085)** | −13 |
| 896 | N / H | optimal | P95 114 / 107 | **P95 161** | — | −47 / −54 |
| 896 | N / H | seller15 | P95 77 / 86 | **P95 115** | — | −38 / −29 |
| 896 | N / H | casual | P95 64 / 81 | **P95 94** | — | −30 / −13 |

For comparison, on 8dc90e2b the same-seed no-mech values were 129/260/381 · 110/196/305 · 103/149/226 (control run, identical to the old print). L895 H casual is the only cell where the mechanics worst exceeds the same-seed no-mech worst.

### Proposed exact replacement for economy.md:895 (Option A, same-seed basis)
```
| | H | 70 / 107 / 191 (same-seed no-mech 104 / 161 / 202) | 47 / 86 / 120 (same-seed no-mech 68 / 115 / 153) | 40 / 81 / 140 (same-seed no-mech 59 / 94 / 129) | ×0.8–1.2 | worst ≤ 1.2 × same-seed no-mechanics worst (CFG=none, same seeds, same CSV; not the printed baseline; D-HOP-2026-10-30-07 (2)) | Y | `pacing-x1-stack` | PASS; casual worst 140 vs same-seed no-mech 129 (+11 s, ×1.085 ≤ ×1.2), note per D-HOP-2026-10-30-07 (2) |
```
If HoP keeps the literal clause (Option B), the gate cell reads `worst ≤ same-seed no-mechanics worst (CFG=none, same seeds, same CSV; not the printed baseline)`. The result cell then reads `PASS with note: casual 140 > 129 (+8.5%) accepted by D-HOP-2026-10-30-07 (2)`.

## 3. Old vs new: L896 G4 P95 ≤ 180 s, any-row (s)
| profile | old cell (N only) | **new N / H** | new ±20% band N · H | ≤ 180 s |
|---|---|---|---|---|
| optimal | 160 | **114 / 107** | 91.2–136.8 · 85.6–128.4 | PASS |
| seller15 | 126 | **77 / 86** | 61.6–92.4 · 68.8–103.2 | PASS |
| casual | 126 | **64 / 81** | 51.2–76.8 · 64.8–97.2 | PASS |
Format change: the old cell held only the N value, though the CI compares both. I propose writing N / H explicitly. Every upper band edge is ≤ 136.8 s, inside the 180 s cap.

## 4. Old vs new: L898–899 G4 meaningful rows (bb5), P50 / P95 / worst (s), non-blocking (N)
| L | policy | profile | old pred | **new pred** | ratio P50/P95/worst | new ±20% band P50 · P95 · worst | P95 ≤180 | worst ≤180 |
|---|---|---|---|---|---|---|---|---|
| 898 | N | optimal | 135 / 231 / 286 | **85 / 122 / 223** | ×0.63 / ×0.53 / ×0.78 | 68.0–102.0 · 97.6–146.4 · 178.4–267.6 | yes | **no (223)** |
| 898 | N | seller15 | 95 / 162 / 294 | **71 / 107 / 140** | ×0.75 / ×0.66 / ×0.48 | 56.8–85.2 · 85.6–128.4 · 112.0–168.0 | yes | yes |
| 898 | N | casual | 80 / 158 / 200 | **54 / 90 / 110** | ×0.68 / ×0.57 / ×0.55 | 43.2–64.8 · 72.0–108.0 · 88.0–132.0 | yes | yes |
| 899 | H | optimal | 135 / 237 / 292 | **87 / 141 / 191** | ×0.64 / ×0.59 / ×0.65 | 69.6–104.4 · 112.8–169.2 · 152.8–229.2 | yes | **no (191)** |
| 899 | H | seller15 | 104 / 182 / 277 | **73 / 105 / 154** | ×0.70 / ×0.58 / ×0.56 | 58.4–87.6 · 84.0–126.0 · 123.2–184.8 | yes | yes |
| 899 | H | casual | 82 / 162 / 219 | **57 / 100 / 192** | ×0.70 / ×0.62 / ×0.88 | 45.6–68.4 · 80.0–120.0 · 153.6–230.4 | yes | **no (192)** |
**Meaningful no-mech baseline:** old 225/381/567 · 153/260/381 · 129/218/271 → **new 125/195/232 · 99/143/172 · 89/125/143**. The optimal baseline P95 of 195 is still above 180. That doesn't gate anything, because the row measures the mechanics stack.

## 4a. ≤ 180 s check, every row (answer to HoQA)
- **P95 ≤ 180 s: holds in every cell** of L894–896 and L898–899 (any-row max 114 s, meaningful max 141 s). The only P95 gate (L896, Y) passes, and the M5.1-exit meaningful P95 ≤ 180 gate would pass on all 6 cells.
- **Worst ≤ 180 s: does NOT hold everywhere.**
  - Any-row: H optimal is 191 s. That's the existing non-blocking warning row L897 (it was 272 s), and the optimal no-mech baseline (202 s) fails too.
  - Meaningful: N optimal 223, H optimal 191 and H casual 192. These are N rows with no worst-seed gate.
  - None of these blocks under the current spec or D-HOP-2026-10-30-07, which applies the 180 s cap to P95.

## 5. Ready-to-paste replacement rows (economy.md §13.2a L894–896, L898–899)
**Option A (recommended):** the absolute clause in L894–895 states D-HOP-2026-10-30-07 (2), so L895 H casual (140 vs 129) passes without needing a note on every run. **Option B:** keep the gate cell as it is now (`worst ≤ baseline worst, same seeds`). L895 casual then needs the "PASS with note" on every run. Rows below are Option A. For B, swap the L894 gate cell back.

```
| G4 longest nothing-affordable F10–30, P50 / P95 / worst (s), any-row (M5.0 record, D-HOP-30; kept by D-HOP-2026-10-24-36 (2); re-predicted on a8c4e268, D-HOP-2026-10-30-07 (3)) (same-seed no-mechanics baseline on a8c4e268: 104/161/202, 68/115/153, 59/94/129; gates compare against the same-seed run, not this print) | N | 68 / 114 / 143 | 47 / 77 / 132 | 36 / 64 / 92 | ×0.8–1.2 | worst ≤ 1.2 × same-seed no-mechanics worst (CFG=none, same seeds, same CSV; D-HOP-2026-10-30-07 (2)) | Y | `pacing-x1-stack` | PASS (worst ≤ baseline worst) |
| | H | 70 / 107 / 191 (same-seed no-mech 104 / 161 / 202) | 47 / 86 / 120 (same-seed no-mech 68 / 115 / 153) | 40 / 81 / 140 (same-seed no-mech 59 / 94 / 129) | ×0.8–1.2 | worst ≤ 1.2 × same-seed no-mechanics worst (CFG=none, same seeds, same CSV; not the printed baseline; D-HOP-2026-10-30-07 (2)) | Y | `pacing-x1-stack` | PASS; casual worst 140 vs same-seed no-mech 129 (+11 s, ×1.085 ≤ ×1.2), note per D-HOP-2026-10-30-07 (2) |
| G4 P95 ≤ 180 s, any-row (D-HOP-2026-10-24-30 (2); D-HOP-36 (2); a8c4e268; same-seed no-mech P95 161 / 115 / 94) | N / H | 114 / 107 | 77 / 86 | 64 / 81 | ×0.8–1.2 | P95 ≤ 180 s | Y | `pacing-x1-stack` | PASS (64–114 s) |
```
L897 (out of scope, but it sits between them and goes stale. Optional, for consistency):
```
| G4 absolute ≤ 180 s, worst seed, any-row (D-HOP-2026-10-24-30 (3): warning, pre-existing L0–30 dead zone, CEO known risk; a8c4e268) | N / H | 143 / 191 | 132 / 120 | 92 / 140 | — | ≤ 180 s | N | `pacing-x1-stack` | **FAIL (warning), optimal H only** (191; optimal no-mech baseline 202 also fails); 5 of 6 cells ≤ 180 |
```
L898–899:
```
| G4 **meaningful rows** (D-HOP-2026-10-24-35; FARM and W* always count, D-HOP-36 (3); re-predicted on a8c4e268, D-HOP-2026-10-30-07 (3)), P50 / P95 / worst (s) (baseline 125/195/232, 99/143/172, 89/125/143) | N | 85 / 122 / 223 | 71 / 107 / 140 | 54 / 90 / 110 | ×0.8–1.2 | reported in M5.0 (D-HOP-36 (2)); P95 ≤ 180 s becomes a Y gate at M5.1 exit | N | `pacing-x1-stack` | P95 ≤ 180 on every profile (90–141 s; M5.1-exit gate would PASS); worst > 180 on optimal N/H (223/191) and casual H (192); optimal baseline P95 195 > 180 |
| | H | 87 / 141 / 191 | 73 / 105 / 154 | 57 / 100 / 192 | ×0.8–1.2 | (same) | N | `pacing-x1-stack` | (same) |
```
Suggested extra bullet under "Row sources":
`- G4 rows L894–899: re-predicted on the V5-HOP-1 CSV a8c4e268 (farm_cost r27–29 cut), seeds 1–200, T 4000, from artifacts/v5-hop1-2d15dac/results/raw/pacing/ship-a8c4e268/ (step-*.json, g4m.json); D-HOP-2026-10-30-07 (3). The other rows of this table stay 8dc90e2b predictions.`

## 6. Notes / doubts
1. After the paste, the table has mixed bases: G4 rows on a8c4e268, everything else on 8dc90e2b. The other rows were in band on a8c4e268 (gate-3 pacing.md), so no other re-prediction is needed. The table caption "(8dc90e2b, …)" should get a "G4 rows: a8c4e268" note.
2. The 8dc90e2b control in the CI would now fall outside these G4 bands (it's the old CSV). CI must run the shipping CSV.
3. Every move is favourable (shorter dead zones) and comes from the intended r27–29 cut. Economy did not retune anything to hit a band.
4. Reproducibility re-run of g4m: `scratch/m51-pr/repredict/rerun-g4m-a8c4e268/`, started with `ops/tools/lane-run.sh econ` (PID 1678172). The result is in §7, and all files are checksummed in `scratch/m51-pr/repredict/SHA256SUMS`.

## 7. Re-run result
Re-run 10:50:58–10:57:32 CET, rc=0. `g4m.json` is identical to the gate-3 `ship-a8c4e268/g4m.json` on every key except `csv`, which is the same path string. The 9 cells, any-row, meaningful (strict/bb5/bundle) and worst seeds are all identical. `g4m.log` is byte-identical (cmp). So the reused raw reproduces with the recorded command.
