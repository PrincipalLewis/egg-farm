# Economy finding: L18–25 step P95 on ce7d59a

**Kind:** economy finding (not a release blocker)  
**SHA:** `ce7d59a` (`ce7d59af8709d940cd4a985e7e402aaffc7c9cf0`)  
**Clone:** `/tmp/qa-x/clean/ce7d59a`  
**Filed:** 2026-10-17 00:22 CEST (Europe/Belgrade)  
**Log:** `/workspace/egg-farm-studio/qa/m3-recheck/ac7-threshold-update/l18-25-qa-gate.log`  
**Per-seed dump:** `/workspace/egg-farm-studio/qa/m3-recheck/ac7-threshold-update/l18-25-per-seed.json`

## Command

```bash
# as run in ac7-threshold-update split rerun step 4 (vite-node fallback after node --experimental-vm-modules failed)
(cd /tmp/qa-x/clean/ce7d59a && npx --yes vite-node \
  /workspace/egg-farm-studio/qa/m3-scripts/ac7-l18-25-gate.mjs \
  /tmp/qa-x/clean/ce7d59a)
```

Gate script: `qa/m3-scripts/ac7-l18-25-gate.mjs`. Seeds default `SEEDS=30` (indices **1..30**). Model `seller15`, `T=6h`, no worker `use` list — same as the gate.

## Gate definition (step + P95)

This gate’s “step” is **wall-clock minutes for the slowest consecutive farm-level advance in L18–L25**, not the TR-5 level-step **ratio**.

1. For each seed `sd ∈ {1..30}`, run `runM2(balance, sd, { model: 'seller15', use: [], T: 6*3600 })`.
2. `maxStep(18, 25)` = max over `L = 19..25` of `(reach(L) − reach(L−1))` seconds; if any level in that range is missing, the seed’s step is treated as `Infinity`.
3. Per-seed step minutes = `maxStep(18, 25) / 60`.
4. With `N=30`, `need = ceil(0.95*N) = 29`. **P95** = the 29th value in the ascending sorted list of the 30 step-minute values (i.e. at least 29/30 seeds ≤ that value). **Worst** = max of the 30. **Median** = ordinary median.
5. **NEW** step pass: `P95 ≤ 6` **and** `worst ≤ 8`.  
   **OLD** (f1-pacing-style) step pass: `median ≤ 6` only.  
   (L@30 band is a separate check; it **PASS**ed here — P95-low=P95-high=median=18 in L18–22.)

## Result

| Metric | Value | Limit | Verdict |
|---|---|---|---|
| P95 step (L18–25) | **14.75 min** | ≤ 6 | FAIL (NEW) |
| Worst step | **14.75 min** | ≤ 8 | FAIL (NEW) |
| Median step | **14.75 min** | ≤ 6 | FAIL (OLD) |
| L@30 band | 18 / 18 / 18 | L18–22 | PASS (OLD+NEW) |

```
OLD_RESULT: FAIL
NEW_RESULT: FAIL
RESULT: FAIL
```

**Note:** Fails the **old** median≤6 gate as well as the new P95/worst gate. This is an **economy / pacing finding**, not a release blocker for the SHA under test.

## Failing seeds

All **30/30** seeds exceed 6 min (and 8 min). Every seed’s worst L18–25 pair is identical:

| Seed(s) | Worst level pair | Step | Ratio vs 6 min limit |
|---|---|---|---|
| 1–30 (all) | **L23 → L24** | **14.75 min** (885 s) | 2.46× over the 6 min P95/median limit; 1.84× over the 8 min worst limit |

Top failing seeds (by step, then seed id) — all tied at 14.75 min on L23→L24:

1. seed **1** — L23→L24 — 14.75 min  
2. seed **2** — L23→L24 — 14.75 min  
3. seed **3** — L23→L24 — 14.75 min  
4. seed **4** — L23→L24 — 14.75 min  
5. seed **5** — L23→L24 — 14.75 min  
… seeds 6–30 identical.

Deterministic bot + current balance makes L23→L24 the single bottleneck for every seed in this band.

## Evidence paths

- Gate log: `qa/m3-recheck/ac7-threshold-update/l18-25-qa-gate.log`
- Split rerun log: `qa/m3-recheck/ac7-threshold-update/split-rerun.log` (STEP4)
- Per-seed JSON: `qa/m3-recheck/ac7-threshold-update/l18-25-per-seed.json`

## Update 2026-10-17 00:29 (Economy root cause)
- The ce7d59a result is VOID: that build reads no approved CSV. balance.json has empty costGrowthSegments and costGrowth 1.35, so it uses old pre-F1 costs (L23 farm 99,466 vs 68,756 in m4cols 86f0e80e).
- Economy's rerun on m4cols costs (scratch/ce7d59a-m4cols-gate/), as reported by Economy and not reproduced by QA:
  - no workers: 615 s at L23→24, still a FAIL at 10.25 min;
  - default workers: max step 4.5 min.
- Judge this gate only on a build synced to 86f0e80e.
- Still open: HoP to decide whether the gate runs without workers. If it does, L23 needs a cost cut to about 40k.

## Update 2026-10-17 00:35
HoP ruling (as relayed by Economy): ac7-l18-25 runs WITH workers; TR-5 stays the no-worker L18-25 check. ce7d59a formula costs are filed with HoE as a bug. Rerun with workers on the HoE fixed SHA synced to 86f0e80e. Status: WAITING for that SHA.
