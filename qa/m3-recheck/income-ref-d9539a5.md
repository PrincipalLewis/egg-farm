# Saves QA: #105 income-ref exact-head @ d9539a5 (HoE/qa-105-exact-head + HoQA/PR105-106-exacthead)

Date: 2026-11-05 22:40–23:36 CET (Europe/Belgrade). Write scope: `qa/m3-recheck/` only. Nothing merged, pushed, or tagged. Formal evidence cites **d9539a5** only.

## Recommendation: **PASS**

Exact merge-forward head of #105 clears the HoQA bar. Hosted gate SUCCESS. Pacing shards SUCCESS; aggregate FAIL attributed solely to RC-only row 904 NOT-WIRED ×3 (named lines below). k10 known-red non-required. No pacing grant. `release-globals` skipped on PR ≠ pass (noted, not treated as pass). Merge go is HoQA’s call — this report does not grant merge.

## Identity (evidence/income-ref-d9539a5/identity.txt)

- Tip **d9539a54e3f0beb36168d4dc247e337d1bd878b4** — "Merge rc/v5 into feat/v5-income-ref (HoQA merge-forward for #105)"
- Parents: `91a01445362ada4aeaf7215d93f8cf7f79f90312` + **`844f8e15774daeb1c0a855cb69b1fabd2f0ab820`** (`origin/rc/v5`)
- Contains `844f8e15`: YES. Remote `feat/v5-income-ref` head matches tip.
- Diff vs `origin/rc/v5` (`844f8e15`): **exactly 8 files, +286/−5**, no reverts:
  - `src/config/formulas.ts` (M)
  - `src/config/m5-rules.ts` (M)
  - `src/game.ts` (M)
  - `src/save/m5-fields.ts` (M)
  - `src/sim/actions.ts` (M)
  - `src/sim/income-ref.ts` (A)
  - `src/sim/timers.ts` (M)
  - `tests/v5-income-ref.test.ts` (A)
- PR: https://github.com/PrincipalLewis/egg-farm/pull/105 (open, not Draft, not merged at observation)
- Artifact note cited by Features: `artifacts/v5-105-mergefwd-d9539a5/NOTE.md`
- Worktree: `qa/scratch/income-ref-d9539a5/wt` (detached at tip)

## Bar results

| # | check | result | evidence |
|---|---|---|---|
| 1 | Identity re-confirm | **PASS** tip d9539a5, parents 91a0144+844f8e15, contains rc/v5, remote match | identity.txt |
| 2 | Diff vs rc/v5 = 8 income-ref files only, no reverts | **PASS** 8 files +286/−5; name-status A/M only for listed paths | identity.txt, diff-detail.txt |
| 3 | `tsc --noEmit` | **PASS** EXIT=0 | tsc.txt |
| 4 | Full vitest 0 fail; count ≥ rc/v5 baseline +27 | **PASS** 2138 passed \| 1 skipped (148 files). Prior rc tip ~2111 at daee4c1; +27 from v5-income-ref met | vitest-full.txt |
| 5 | v5-income-ref | **PASS** 27/27 | vitest-income-ref.txt |
| 6 | Flag-off golden 7/7 identical | **PASS** 7/7. GOLDEN1 flag-off `f90d1678…`; m4on `a54c9cf9…`. Pin blobs identical vs rc/v5 | vitest-flagoff-golden.txt, golden-pins-identity.txt |
| 7 | `npm run build` + check-release-build | **PASS** EXIT=0; `check-release-build: m4.1+d9539a5 ok` | build.txt |
| 8 | Hosted gate SUCCESS on tip | **PASS** run **42114562185** conclusion **success**; gate job SUCCESS. `release-globals` job **skipped** on PR (≠ pass; noted) | gh-runs-final.txt |
| 9 | Pacing shards SUCCESS; aggregate FAIL OK iff RC-only row 904 named | **PASS (bar)** shards casual/optimal/seller15 all SUCCESS. Aggregate run **42114562232** conclusion **failure**; only FAIL lines are blocking row 904 NOT-WIRED ×3. No pacing grant | pacing-aggregate.txt, row904.txt, pacing-aggregate-full.txt, gh-pacing-final.txt, gh-runs-final.txt |
| — | k10-breeds-offset | FAIL known-red non-required (D-HOP-2026-10-30-52/53). Does **not** block PASS | gh-runs-final.txt (run 42114562165) |

## Hosted runs (exact tip d9539a5)

| workflow | run id | conclusion | notes |
|---|---|---|---|
| ci (gate) | [42114562185](https://github.com/PrincipalLewis/egg-farm/actions/runs/42114562185) | **success** | gate job SUCCESS (~15m). release-globals job skipped |
| pacing-x1-stack | [42114562232](https://github.com/PrincipalLewis/egg-farm/actions/runs/42114562232) | **failure** | shards SUCCESS; aggregate FAIL = row 904 only |
| k10-breeds-offset | [42114562165](https://github.com/PrincipalLewis/egg-farm/actions/runs/42114562165) | **failure** | known-red, non-required |

### Pacing shard detail (42114562232)

- shard (seller15) job 127550630198 — **success**
- shard (casual) job 127550630561 — **success**
- shard (optimal) job 127550630688 — **success**
- aggregate `pacing-x1-stack` job 127572997956 — **failure**

### Row 904 attribution (aggregate FAIL allowed)

Headline: `## pacing-x1-stack: **FAIL**`

Rows summary: `45 PASS, 0 FAIL, 1 WARN, 20 INFO, 0 PENDING-REPRED, 3 N/A (row 903), 12 NOT-WIRED (3 blocking), 24 EXCLUDED`

Named failing lines (only FAIL lines in the verdict):

```
FAIL: blocking row 904 optimal NOT-WIRED
FAIL: blocking row 904 seller15 NOT-WIRED
FAIL: blocking row 904 casual NOT-WIRED
```

Row 904 is RC-only (not run in plain CI / without `--require-ac7`). Aggregate FAIL is attributed solely to these three named lines. No pacing grant issued. Also present (non-FAIL): `WARN L897 optimal N / H: worst 191 > 180 s (pre-existing L0–30 dead zone, known risk)`.

### release-globals note

Standalone `release-globals` job on run 42114562185 is **skipped** (PR path). Skipped ≠ pass. Gate job itself ran its Chromium allowlist step successfully as part of the gate SUCCESS. No claim that release-globals passed.

## Environment / method

- Local Node used for tsc/vitest/build in worktree (lane `saves-qa` / prior executor). This finish pass **did not re-run** tsc/vitest/build; reused existing evidence logs after verifying contents.
- Hosted gate/pacing/k10 re-polled to final conclusions; aggregate log fetched for row-904 attribution.
- No push/merge/tag. No GITHUB_TOKEN printed. No writes outside `qa/`.

## Evidence sha256 (`qa/m3-recheck/evidence/income-ref-d9539a5/`)

- `qa/m3-recheck/evidence/income-ref-d9539a5/build.txt` — `c28d1036a7d5ec1411bd81d6b901fd005aa6ca4fcf3472ffeb8a1719278002b9`
- `qa/m3-recheck/evidence/income-ref-d9539a5/diff-detail.txt` — `5f34cad5f382c7aa8598b1ebef5bd6420091d6a0f8098d6881615077642ed64c`
- `qa/m3-recheck/evidence/income-ref-d9539a5/gh-pacing-final.txt` — `4626e0fda8cee1850dc8d82b628a44d70cfc9de7ec17c74f0b04226790df00a3`
- `qa/m3-recheck/evidence/income-ref-d9539a5/gh-runs-final.txt` — `a011046cfa17669e5e2545c7f1a6dacec61d80345a2b1d6dc54bc3a02b88f18c`
- `qa/m3-recheck/evidence/income-ref-d9539a5/gh-runs-initial.json.txt` — `354d98b42a722d1bf08c4eead3d485332d93afbd270b7b44ad91b83b3b7f93f1`
- `qa/m3-recheck/evidence/income-ref-d9539a5/gh-runs-poll1.txt` — `c2e18e0307e29a6edcae145a6a5e8c9eae6ecf27c76edab5afad913c7916298b`
- `qa/m3-recheck/evidence/income-ref-d9539a5/gh-runs-poll2.txt` — `e376519c4af20d12e1fd2c29c5946952d10b7a6ed4e192ddf81993ba504592e3`
- `qa/m3-recheck/evidence/income-ref-d9539a5/golden-pins-identity.txt` — `8bf09ce441dc268db35459637729ea603f6a3f6f4d84397424a43199203bf505`
- `qa/m3-recheck/evidence/income-ref-d9539a5/identity.txt` — `8dc7930a1f428b3c2a53bf518e203df7e5532cf6a8f1e02e5ed08d10151b821c`
- `qa/m3-recheck/evidence/income-ref-d9539a5/pacing-aggregate-full.txt` — `5604240e237a0d70d9c7b218b1aea581fb5c4f88fbdec29606732837f0cf4852`
- `qa/m3-recheck/evidence/income-ref-d9539a5/pacing-aggregate.txt` — `15ccb71134fb2bc0dc4ba7f0e99f86f16305b99a908a8dce7ed49f0ebb5fa6d7`
- `qa/m3-recheck/evidence/income-ref-d9539a5/row904.txt` — `57f0ff1db39f07f7e093a63bacca2555aefe84be30bd95aae418c91c9f3b84d3`
- `qa/m3-recheck/evidence/income-ref-d9539a5/tsc.txt` — `8c6845e83ee0394c270246179f2fa445d97c6811e285404238fab5f5aa4d5ef2`
- `qa/m3-recheck/evidence/income-ref-d9539a5/vitest-flagoff-golden.txt` — `aed4c388f150088f4e7a0046fb4d42930db16f3111c8abd773853aa00e785993`
- `qa/m3-recheck/evidence/income-ref-d9539a5/vitest-full.txt` — `e09a4a370e3b679da044ba248b0f1503a5566492b27bc41e1263affbf78c9267`
- `qa/m3-recheck/evidence/income-ref-d9539a5/vitest-income-ref.txt` — `0acea8ccd6021c2aff0e3b101fef84ee60d5dee3fe67cc81db4c3155642d2cc8`

## Report sha256

Companion file `qa/m3-recheck/income-ref-d9539a5.sha256` holds the sha256 of this report body **excluding this section**. Body-without-section hash:

`bc1f1f34268c0c45e3fb9d0fb59989ba6c8c208097ec2dcdca197e1f260aa8cd`
