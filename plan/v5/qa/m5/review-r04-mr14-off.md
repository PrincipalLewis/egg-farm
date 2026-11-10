# HoQA review: R04-MR14-off flags-off package · 2026-11-05 23:26 CET (QA-D-1105-MRHARN-C1 re-screen)

**Overall verdict: candidate stays BLOCKED.** Card #4 / D-HOP-15 PL-AC1 and PL-AC2 remain blocking for CFG-none candidates; D-HOP-37 relaxes no bar and grants no waiver (verified §6). PL-AC1/2/3 are now **certified on Card #4 `pl.ts`** (parityMismatches=0/0/0; reach maps identical to the package's runmr 600/600) — not provisional. PL-AC1 FAIL, PL-AC2 FAIL, PL-AC3 PASS. MR clear does not waive PL-AC1/2. No waivers by HoQA. Remaining ACs: see gap list §8.

Package: `scratch/post-l10/cycle-R04-MR14-off/RESULT.md` sha256 `294925e064eba68e2171ea835b6c536b11cb798d31cde30a382be36b62051367` (verified). Write scope: `qa/m5/` only. Addendum 2026-11-05 23:31 CET: HoQA ran Card #4 `pl.ts` via `ops/tools/lane-run.sh qa`; outputs under `qa/m5/review-r04-mr14-off-plts/`.

---

## 1. Pin and sha verification

| item | claimed | verified |
|---|---|---|
| RESULT.md | `294925e0…51367` | OK |
| pins.sha256 (31 paths) | file present | `sha256sum -c` all OK |
| manifest.sha256 (25 files) | `5c8d33fb…76db73` | OK; `sha256sum -c` all OK |
| manifest-check pre/post | identical | both `7bd105af…cbaef`; all OK |
| frozen.sha256 | `33774430…42cb2` | OK (pre-run freeze of run-manifest / authority / manifest / then-HANDOFF) |
| authority-snapshot.sha256 | `974391d5…ce67f6` | OK |
| cand/tools/m5mr.ts | `6abe6f19…773c18` | OK (QA-D-1105-MRHARN-C1 pin) |
| cand/tools/runmr.ts | `2cef8d3a…90a5f3` | OK |
| R04 candidate.csv | `d1cff5ac…173b65` | OK |
| product/m5-gate-acs.md (Card #4 host) | `3b864ef7…0aea10` | OK (sha1 `c2610288…0b88bb`) |
| product/decisions.md | authority `697e2115…6391a` | OK live = authority |
| qa/decisions.md | authority `e7fc7dae…0de04d` | OK live = authority |
| s00-base/metrics.json (PL-AC3 refs) | `d6ac395c…f19997` | OK |
| raw-{optimal,seller15,casual}.json | pins listed | OK |
| diag-out.json / results.json / tables.md / analyze.py | pins listed | OK |
| errata aa9e80fa / HoQA MRINTERP2 review | RESULT cites `d836f118…` / `fbf90626…` | present in authority-snapshot |

Notes:
- RESULT.md is not listed inside `pins.sha256` (self-reference); its sha was checked independently.
- Pre-run `frozen.sha256` pins HANDOFF as `6006f222…`; current HANDOFF is `b011ca77…` (in `pins.sha256`). Post-run HANDOFF edit only; measurement pins (CSV/harness/raw/diag) unchanged.
- QA decisions cited: `QA-D-1105-MRHARN` (L871) and `QA-D-1105-MRHARN-C1` (L889) in `qa/decisions.md`.

---

## 2. Signed PL-AC1 / PL-AC2 / PL-AC3 text and applicability

### 2.1 D-HOP-2026-10-30-15 (primary bar)

File: `product/decisions.md` sha1 `361fd8d87818edc2a1df174a1a39cb0491036489`, sha256 `697e21159b61c4996e517d0d8644889ebbebcec9d32e4d1d81e79856ca76391a`.

Verbatim L1559:
> Decision: ACCEPT. The candidate's primary bar, for optimal, seller15 and casual over L11-29: (1) median time on each level ≤2× the previous level's median; (2) P95 time on a level ≤180 s. The P95 ≤180 s gap row stays as a guard (no regression; list worst seeds over 180 s). D-HOP-11's other constraints stay: L0-10 byte-exact, L30 anchored at 624,316, step ≤×1.30, F15/F20/F25 milestones, L10→L30 total within ±10% of a8c4e268. ETA unchanged at 18:00. The gap definition stays as pinned (it reads conservative). Shipping still needs the CEO ruling in D-HOP-11.

### 2.2 Card #4 (operational ACs)

File: `product/m5-gate-acs.md` sha1 `c2610288c6c73e3a76bf3ab3f5e3f2d66f0b88bb`, sha256 `3b864ef74dd4611ed20b5549b84994192c0684c7f7659bf2573e944be10aea10`. Card #4 starts L833.

**Time-on-level definition** (L866), verbatim:
> **Time on level L** = reach(L+1) − reach(L), in simulated seconds, per seed. …

**Gap(L)** (L868) is a separate metric (nothing-affordable stretch) used by PL-AC4, not by PL-AC1/2.

**PL-AC1** (L870), verbatim:
> **PL-AC1** (D-HOP-15 bar (1), **blocking**). Given the candidate CSV, run on the harness above, when each profile p and each L in 11..29 are measured, then P50 time on L ≤ 2.000 × P50 time on L−1.

Metric: nearest-rank P50 of whole-level dwell; `tstep = round(P50(L)/P50(L−1), 3) ≤ 2`; profiles optimal/seller15/casual; levels 11..29 (57 checks). Threshold: rounded ratio ≤ 2.000.

**PL-AC2** (L877), verbatim:
> **PL-AC2** (D-HOP-15 bar (2), **blocking**). Given the same run, then for each p and each L in 11..29, P95 time on L ≤ 180.0 s.

Metric: nearest-rank P95 of whole-level dwell (`tP95`); same profiles/levels. Threshold: ≤ 180.0 s. **Not** the gap / dead-zone / meaningful-action gap.

**PL-AC3** (L882), verbatim opening:
> **PL-AC3** (D-HOP-11 L10→L30 total, tightened by D-HOP-18, **blocking** flags-off; metric ruled by D-HOP-2026-10-30-37 … D: "±10% uses the P50 of per-seed reach(30)−reach(10) against refs 2116.0/2100.2/2041.5 s (d6ac395c), and P10/P90 are also reported"). Per profile, total = the P50 over seeds of reach(30) − reach(10) (`tot10_30_P50_s`). It passes when |total_after / total_before − 1| ≤ 0.10 …

### 2.3 Does each AC apply to this flags-off R04 candidate?

Card #4 L841–842:
> **Candidate and PR-head CSV, flags-off `CFG none` (scratch harness above):** blocking: PL-AC1, PL-AC2, PL-AC3, PL-AC4 (a)/(b), PL-AC5, PL-AC6 (a)/(b)/(d) and PL-AC7.

Under current pins (QA-D-1105-MRHARN-C1: flags-off R04 re-screen on m5mr `6abe6f19` + runmr `2cef8d3a`, CSV `d1cff5ac`, CFG none / K.on=false, seeds 1–200, T=4000, 3 profiles):

| AC | Applies? | Role |
|---|---|---|
| PL-AC1 | **Yes — blocking** | flags-off candidate bar |
| PL-AC2 | **Yes — blocking** | flags-off candidate bar |
| PL-AC3 | **Yes — blocking** (flags-off) | ±10% L10→L30 total |
| MR / E-G4 meaningful-row | measured (package target); not a substitute for PL-AC2 | report / G4 family |
| PL-AC4(a)/(b), 5–8 | apply as Card #4 blocking/report rules, but **not measured** in this package | unassessed here |

### 2.4 Source contradictions / distinctions

1. **No metric contradiction between D-HOP-15 and Card #4 on PL-AC1/2.** Both define the primary bar as **time on level** (median/P50 step ≤2×; P95 ≤180 s). Card #4 operationalises "time on level" as `reach(L+1)−reach(L)`.
2. **Gap ≠ time on level.** D-HOP-15 keeps the P95≤180 **gap** row as a separate guard (PL-AC4). Card #4 L868 Gap(L) = longest nothing-affordable stretch. PL-AC2 is dwell, not gap. The MR amendment measures a meaningful-row stretch and **cannot erase** PL-AC1/2.
3. **Harness-of-record caveat (resolved in §7).** Card #4 L861 requires `pl.ts` with live `parityMismatches=0`. The Economy package used `runmr.ts` (hardcoded parity 0) — valid for the authorised MR re-screen, **PROVISIONAL** for Card #4 certification until pl.ts. HoQA subsequently ran Card #4 `pl.ts` (§7): parity 0/0/0 and reach maps identical to runmr 600/600, so PL-AC1/2/3 numbers certify. Runmr buyLog/MR parity remains separate.
4. **RESULT MR section citation stretch.** RESULT L24 cites Card #4 priority (1) "worst seed ≤180" (L840 / D-HOP-37 A2) next to MR clears. Card #4 maps priority (1) to **PL-AC4(c) gap worst**, not to MR/`mrLongest`. MR clear is evidenced; equating it to constraint-priority (1) is a citation stretch, not a measurement error.
5. **Nest / K.on.** Package corrects an earlier MRINTERP2 caveat: broody nest accrual (`m5mr.ts` L97) sits inside `if (K.on)` (L87–105). Under flags-off nest cannot accrue. Confirmed in pinned `m5mr.ts` `6abe6f19`.

---

## 3. Measurement check (recomputed from raw)

Package `analyze.py` (`4701dbf8…`): dwell from official `raw-*.json` `reach` maps; quantiles `sorted(a)[ceil(n*p)-1]` (nearest-rank, n=200 → P50 idx 99, P95 idx 189); PL-AC1 `tstep=round(P50(L)/P50(L−1),3)`; PL-AC3 vs refs 2116.0 / 2100.2 / 2041.5.

**PL-AC2 is measured as whole-level dwell** (`reach(L+1)−reach(L)` P95), **not** as the gap between meaningful actions / dead zones. **That is what the signed AC requires.** Meaningful-action / nothing-affordable gaps are PL-AC4 / Gap(L); MR is a separate sampler.

Independent recompute from `raw-*.json` matches RESULT/tables.md exactly:

### PL-AC1 (tstep ≤ 2)

| profile | max tstep (L) | misses | verdict |
|---|---|---|---|
| optimal | **2.223 at L24** | L24 (P50 L23=71.8 s → L24=159.6 s) | FAIL |
| seller15 | 1.750 | none | PASS |
| casual | 1.962 | none | PASS |

### PL-AC2 (P95 dwell ≤ 180 s), misses only

| profile | level | P95 s | worst s | P50 s |
|---|---:|---:|---:|---:|
| optimal | 17 | 185.0 | 233.1 | 147.2 |
| optimal | 27 | 190.6 | 200.0 | 147.3 |
| seller15 | 17 | 210.1 | 250.3 | 150.9 |
| seller15 | 24 | 183.9 | 214.6 | 138.6 |
| seller15 | 27 | 200.8 | 221.2 | 149.2 |
| casual | 17 | 238.5 | 302.1 | 153.0 |
| casual | 18 | 192.0 | 225.6 | 95.1 |
| casual | 24 | 198.2 | 242.6 | 139.3 |
| casual | 27 | 224.8 | 266.6 | 154.5 |

All three profiles miss. All 200 seeds reached L30 in every profile.

### PL-AC3

| profile | tot10–30 P10/P50/P90 | vs ref | |P50/ref−1| | pass? |
|---|---|---|---|---|
| optimal | 1872.2 / 1913.5 / 1941.6 | 2116.0 | 9.57% | PASS |
| seller15 | 1855.7 / 1897.2 / 1938.2 | 2100.2 | 9.67% | PASS |
| casual | 1817.2 / 1869.1 / 1924.1 | 2041.5 | 8.45% | PASS |

### MR (meaningful-row; not PL-AC2)

| profile | P50 | P95 | worst (seed) | n>180 |
|---|---:|---:|---:|---:|
| optimal | 83 | 93 | 121 (s11) | 0 |
| seller15 | 76.3 | 96 | 121 (s78) | 0 |
| casual | 68 | 98 | 133 (s28) | 0 |

---

## 4. Trajectory parity and nest census

Evidence source: `diag-out.json` (sha `ef8a558b…`) + official raw rows. No independent re-execution of the b2deab63 binary; parity is from per-run digests/flags the diagnostic wrote under asserted identity checks.

### 4.1 Trajectory / buyLog parity — evidenced 600/600

| check | optimal | seller15 | casual |
|---|---:|---:|---:|
| official raw row == diag reviewed row | 200 | 200 | 200 |
| buyLogSha256 == beforeBuyLogSha256 (b2deab63) | 200 | 200 | 200 |
| flag buyLogIdenticalToB2deab63 | 200 | 200 | 200 |
| flag nonMrOutputsIdenticalToB2deab63 | 200 | 200 | 200 |
| official non-MR fields == cycle-2320 R04 raw | 200 | 200 | 200 |
| buyCount | 123 every run | 123 | 123 |
| agg [seed,buyLogSha] sha256 | `7b1fb0df…3898c` | `f8e78435…4ca10` | `b1eabcfa…a7edc` |

Instrument `instrumentedFullOutputIdentical: 200` is asserted by diag-driver (abort-on-mismatch); this review did not re-drive the TS harness. Aggregate buyLog shas recomputed from diag match `results.json`.

**Verdict:** 600/600 trajectory (buyLog vs b2deab63) parity is evidenced in the packaged diag outputs.

### 4.2 Nest>0 count = 0/600 — evidenced

For every profile and seed 1–200, diag fields satisfy: `nestPositive=false`, `nestMax=0`, `nestEnd=0`, `nestCredits=0`, `nestCreditedCents=0`, `nestFirstT=null`, `nestLog=[]`, `broodySrcCents=0`. `results.json` `nest.all.list = []`. coop_hand hired on all 600 runs.

Structural: nest accrual gated on `K.on` (m5mr L87–97); flags-off cannot accrue nest. QA-D-1105-MRHARN-C1 condition (report count/list of nest>0) is satisfied: **0/600, list empty**.

---

## 5. Per-AC verdicts (updated after pl.ts)

Runmr numbers alone were **PROVISIONAL** for Card #4 certification (see §7). After HoQA `pl.ts` evidence (§7): PL-AC1/2/3 are **certified**.

| AC | Verdict | Reason / key numbers |
|---|---|---|
| **PL-AC1** | **APPLIES-FAIL (certified on pl.ts)** | Blocking CFG-none (Card #4 L842; D-HOP-37 does not relax). optimal L24 tstep **2.223** > 2.000. Identical on pl.ts and runmr. |
| **PL-AC2** | **APPLIES-FAIL (certified on pl.ts)** | Blocking. Same dwell P95 misses as §3 on pl.ts (reach maps = runmr 600/600). |
| **PL-AC3** | **APPLIES-PASS (certified on pl.ts)** | −9.57/−9.67/−8.45% vs refs; identical on pl.ts. |
| **MR (E-G4 / runmr)** | **APPLIES-PASS** (runmr package claim; separate from pl.ts) | P95 93/96/98; n>180=0/600. Does **not** waive PL-AC1/2. |
| **PL-AC4+** | see §8 gap list | pl.ts enabled HoQA gap/band recomputes; formal Econ scripts still partly missing. |

### Overall

**R04 candidate `d1cff5ac` stays BLOCKED.** Certified PL-AC1 FAIL + PL-AC2 FAIL on Card #4 `pl.ts` (parity 0). Additional informal FAILs on PL-AC4(b), PL-AC6(b), PL-AC7 (see §8) also keep it blocked even if Product later waived PL-AC1/2. No HoQA waiver.

Open outside this review: C-2 (flags-on G4 driver), B4/tuning, S01 FAIL183, formal `csvcheck.py` / `compare.py` / `verdicts.json` packaging, PL-AC5(iii) event-trace harness, PL-AC8 gates.md report, PL-AC9 flags-on.

---

## 6. HoP claim (a): PL-AC1/2 stay blocking; D-HOP-37 relaxes nothing; no waiver

**Verified: HoP's statement matches the signed sources.**

1. **D-HOP-15** (`product/decisions.md` L1559, sha1 `361fd8d8…`): primary bar for optimal/seller15/casual over L11–29 is (1) median time-on-level ≤2× previous and (2) P95 time-on-level ≤180 s. No later line in this decision relaxes that bar for CFG-none candidates.

2. **Card #4 "What blocks where"** (`product/m5-gate-acs.md` L841–842, sha1 `c2610288…`):
   > **Candidate and PR-head CSV, flags-off `CFG none` …:** blocking: PL-AC1, PL-AC2, PL-AC3, PL-AC4 (a)/(b), PL-AC5, PL-AC6 (a)/(b)/(d) and PL-AC7.

3. **D-HOP-2026-10-30-37 A2** (`product/decisions.md` L1815; restated Card #4 L840):
   > If constraints conflict, the order is (1) worst seed ≤180 s, (2) the 2x bar, (3) ±10% L10→L30 total, (4) milestone steps. … **no bar is relaxed without my ruling.**
   Card #4 gloss (L840): "The order only says which constraint the candidate favours when they conflict. **It relaxes no bar: a bar that the candidate misses still fails until HoP rules.**"

4. **What D-HOP-37 *does* change (not a PL-AC1/2 waiver):**
   - A1: L30 farm_cost keep / L29→30 step watch-list (PL-AC6).
   - A2: milestones = target; priority order; trade-off table.
   - B: bc_* listing / empty rename map OK (PL-AC5).
   - C: PL-AC4**(c)** blocks only on all-flags-on final RC; flags-off reported.
   - D: PL-AC3 metric = P50 of per-seed reach(30)−reach(10) vs d6ac395c refs.

5. **No waiver** for PL-AC1/2 appears in D-HOP-37, Card #4, or QA-D-1105-MRHARN / -C1. MR clear is orthogonal. HoQA grants none.

---

## 7. HoP claim (b): pl.ts is the Card #4 measuring tool — evidence now collected

### 7.1 What Card #4 requires

Path: `scratch/post-l10/baseline/h/pl.ts` (pinned sha256 prefix `16ea5da9…`; on disk `16ea5da9e126c456…`, with `m5.ts` `29d423c5…`, `m5pl.ts` `11ff5046…`, `package-lock.json` `56569550…` — all match Card #4 L854–855).

Invocation (Card #4 L857–861), cwd `baseline/h`, **one profile per run, serial**:
```
CSV=<csv> SEEDS=200 S0=1 T=4000 PROFS=<optimal|seller15|casual> \
  node node_modules/.bin/vite-node pl.ts > <dir>/raw-<p>.json 2> <dir>/raw-<p>.log
```
then `cand/tools/analyze.py <dir> <csv>` → metrics.json; optionally `compare.py` → compare.md / verdicts.json.

**Required before any per-AC FAIL/PASS can be Card #4-certified:**
1. `runner` field in raw JSON = `pl.ts (SCRATCH)` (not run.ts/runmr).
2. `parityMismatches` = **0** in **both** `prof.<p>.parityMismatches` (JSON) **and** the stderr log line `{"prof":p,"parityMismatches":n}` for every profile.
3. cfg `none`, seeds 1–200, T=4000, CSV sha = candidate.
4. PL-AC1/2/3 (and other pacing ACs that read reach/gap) computed from those `pl.ts` raw files (analyze.py / equivalent nearest-rank).

`runmr.ts` / `run.ts` hardcode `parityMismatches: 0` and skip the live m5.run↔m5pl.run check — Card #4 L861 explicitly rejects that as ship evidence. **Runmr trajectory parity (buyLog vs b2deab63) stays a separate claim** and does not certify PL-AC1/2/3.

### 7.2 Was pl.ts run on this candidate before?

**No.** Package RESULT / run-manifest used only `cand/tools/runmr.ts` (same as cycle-2320). No `pl.ts (SCRATCH)` raws in the package.

### 7.3 HoQA pl.ts run (2026-11-05 23:28–23:30 CET)

- Lane: `ops/tools/lane-run.sh qa -- bash qa/m5/review-r04-mr14-off-plts/run-plts.sh` (pid 1393089).
- Outputs: `qa/m5/review-r04-mr14-off-plts/` (pins in that dir's `pins.sha256`).
- Harness pins verified Card #4-matching (see `harness-pins.sha256`).
- Results:

| profile | runner | parity JSON | parity log | n seeds |
|---|---|---:|---:|---:|
| optimal | `pl.ts (SCRATCH)` | **0** | **0** | 200 |
| seller15 | `pl.ts (SCRATCH)` | **0** | **0** | 200 |
| casual | `pl.ts (SCRATCH)` | **0** | **0** | 200 |

**pl.ts vs package runmr (compare-plts-vs-runmr.json):** for all 3 profiles, reach maps identical 200/200, noAffByF identical 200/200, longestNoAff identical 200/200, PL-AC1 tsteps identical, PL-AC3 P50s identical. Therefore PL-AC1/2/3 numbers on pl.ts **equal** the runmr table in §3 (optimal L24 tstep 2.223; same PL-AC2 miss list; same PL-AC3 %).

**Certification status:** PL-AC1/2/3 verdicts upgrade from PROVISIONAL → **certified** on Card #4 pl.ts. Runmr MR / buyLog parity remains a separate, non-substituting claim.

---

## 8. Remaining-AC gap list (Card #4 PL-AC1..8 + related)

Statuses use pl.ts evidence where applicable. "Informal" = HoQA light recompute under `qa/m5/`, not Econ's `analyze.py`/`compare.py`/`csvcheck.py`/`verdicts.json` packaging.

| AC | Card role (flags-off CFG none) | Status | Key numbers / evidence still needed |
|---|---|---|---|
| **PL-AC1** | blocking | **FAIL (certified pl.ts)** | optimal L24 tstep 2.223. Still useful: Econ `metrics.json`/`verdicts.json` `2x_P50` from analyze+compare on these raws. |
| **PL-AC2** | blocking | **FAIL (certified pl.ts)** | dwell P95 misses §3 / identical on pl.ts. Same packaging gap. |
| **PL-AC3** | blocking flags-off | **PASS (certified pl.ts)** | −9.57/−9.67/−8.45%. Formal `verdicts.json` `total_pm10` still nice-to-have. P10/P90 reported in package/HoQA recompute. |
| **PL-AC4 (a)** band gap P95≤180 | blocking | **PASS (informal from pl.ts noAffByF)** | All 12 band P95 ≤180 (max band P95 seen: opt F26-30=122). Need: analyze.py metrics + verdicts `bandgap_P95_180`. |
| **PL-AC4 (b)** no regression vs s00-base | blocking, zero tolerance | **FAIL (informal from pl.ts)** | Regressions vs Card #4 before P95 (81/125/121/157 · 53/79/77/115 · 35/59/58/93): opt F11-15 89>81; seller15 F11-15 66>53, F16-20 82>79; casual F11-15 46>35, F21-25 59>58. Need: formal compare script (Card notes compare.py doesn't judge (b); gap 8). |
| **PL-AC4 (c)** worst/gap dead zone | **reported only** flags-off (D-HOP-37 C) | **REPORTED (informal)** | opt seeds over 180: s130 L25=182, s175 L27=181 (n=2). seller15/casual none. Not blocking on this flags-off run. Blocking form is all-flags-on final RC only. |
| **PL-AC5 (i)** L0-10 CSV pre-existing cols byte-exact | blocking | **FAIL (informal cell compare)** | vs a8c4e268 (`/workspace/scratch-econ-m51pr/data/economy.csv`): `tc_streak_cap` 0.27 vs 0.28 on rows 0–10; ref col `combo_window_s` missing from candidate; candidate has 32 `bc_*` + 184 cols vs ref 152. Need: `scratch/post-l10/gate/csvcheck.py` (gap 8), rename map (empty?), bc_* per-column list (D-HOP-37 B), HoE rename confirm if any. |
| **PL-AC5 (i-b)** bc_* on rows 0–10 | blocking rules | **UNASSESSED / incomplete** | 32 `bc_*` cols present; constants-per-column listing + B4 model traceability not in this package. Evidence: PR per-column list. |
| **PL-AC5 (ii)** reach(0)..reach(10) before=after | blocking | **PASS (informal pl.ts vs baseline/out)** | 0 mismatches × 3 profiles × seeds 1–200 × L0–10. Need: Econ `reachdiff.py` (gap 8). |
| **PL-AC5 (iii)** event-trace hash to reach(10) | blocking; unmeasured=FAIL | **FAIL (not measured)** | Card #4 L936: until event-trace harness exists, (iii) counts as FAIL. Need: Econ+Architect `trace10` / harness-of-record. |
| **PL-AC6 (a)** farm_cost[30]=624316 | blocking | **PASS (informal CSV)** | 624316 on candidate. Need: csvcheck.py. |
| **PL-AC6 (b)** step ≤×1.30 for L11..29 | blocking | **FAIL (informal CSV)** | Misses: L11 step 2.01462; L17 1.42643; L20 1.311657. Need: csvcheck.py. |
| **PL-AC6 (c)** F15/20/25 milestone discounts | **target only** (D-HOP-37 A2) | **N/A (target; reported)** | Observed steps L15=1.1634, L20=1.3117, L25=1.0000. Report in trade-off table; does not fail the card by itself. |
| **PL-AC6 (d)** no L31+ rows | blocking | **PASS (informal CSV)** | 31 rows, max level 30. |
| **PL-AC7** ±20% per band vs s00-base | blocking | **FAIL (informal from pl.ts)** | Misses: optimal F11-15 +24.17%; seller15 F11-15 +20.88%, F26-30 −21.28%. casual all bands pass. Need: analyze+compare `perband_pm20`. |
| **PL-AC8** E-G1..E-G10 report | reported | **UNASSESSED** | Need: gates.md-format report with harness/code/CSV provenance. |
| **PL-AC9** (flags-on PL-AC1+2) | N/A on this flags-off package | **N/A** | Requires Econ all-flags-on config (gap 5); C-2 still OPEN. |
| **MR / E-G4 meaningful-row** | package target (runmr) | **PASS (runmr; separate)** | Not a Card #4 PL-AC1..8 substitute. |

### Bottom line for Product

- **Certified blockers already:** PL-AC1, PL-AC2.
- **Additional informal blockers (would still block if 1/2 waived without more work):** PL-AC4(b), PL-AC5(i) (and (iii) by "unmeasured=FAIL" rule), PL-AC6(b), PL-AC7.
- **Passes:** PL-AC3 (certified); PL-AC4(a) informal; PL-AC5(ii) informal; PL-AC6(a)/(d) informal; MR runmr.
- **No HoQA waiver.** C-2 / flags-on / B4 / tuning remain paused per QA-D-1105-MRHARN-C1.
