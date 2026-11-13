# HoQA review: PR #93 `pacing-x1-stack` (X1) @ 37eb91de0b8485772d127a26d5e1c5606fed6561

- PR: https://github.com/PrincipalLewis/egg-farm/pull/93, base rc/v5 3f582dbfe31a9d309e6b1d0e96a4f77711b333ec (ancestor confirmed), 9 files, +623/−0.
- Scope: read-only review against QA-D-1030-X1-TREE as amended by HoE (one recorded X1 run on the final RC SHA, no tree-match path). Reviewed in a scratch clone at /workspace/scratch-hoqa-pr93. The studio checkout was not touched. Nothing was posted, approved or merged.
- Reviewed 12:00 CET, Oct 30. No Claude review (rule 22).

## Verdict: CONDITIONAL PASS at 37eb91d (required fixes R1-R7 below)

The recorded RC path fails closed: `scripts/pacing-x1-run.sh` with `--require-ac7` cannot report X1 green with row 904 unjudged. But two of my conditions are not met at this SHA:
- **Condition 4:** in plain CI, three blocking 904 rows report NOT-WIRED and the verdict still says PASS.
- **Condition 3:** the `--ac7-from` fallback cannot work with Econ's actual `--csv` script, so row 904 would FAIL on every RC run.

Both must be fixed, and I'll re-review them on the new head, before the recorded run counts as the X1 gate.

## Reproduced (box, node v24.22.1 / npm 11.21.1; CI uses node 20, disclosed)
| check | result | log sha256 |
|---|---|---|
| npm ci | rc 0 | c5f91a75… |
| tsc --noEmit -p . | rc 0, no output | e3b0c442… (empty) |
| vitest run tests/pacing-x1.test.ts | 9/9 pass | 590d5322… |
| vitest run (full) | 130 files, 1769 pass, 1 skip | 71b1b152… |

This matches the Architect's claim (tsc 0, 1769 pass with 1 skip, pacing-x1 9/9). The commands ran under `ops/tools/lane-run.sh hoqa-pr93` (rule 21). Logs are in /workspace/scratch-hoqa-pr93-out/. The full ~22 min X1 was not run.

Verdict-function probe (vite-node over `tests/pacing-x1/compare.ts`, fixture e4369888):
- 904 with no ac7.json, `requireAc7=false` (plain CI): `NOT-WIRED(Y)` ×3, **verdictOf = PASS**
- 904 with no ac7.json, `requireAc7=true` (RC run): FAIL ×3, verdict FAIL
- 904 with ac7.json `status:PASS, csvNamed:false`: FAIL ×3
- pause rows 906-913: 24 rows, 21 blocking, all EXCLUDED, verdict PASS
- 898/899/902: 9 rows, all NOT-WIRED and non-blocking (N), verdict PASS

## Findings

### F1 (Critical): a blocking NOT-WIRED row counts as a pass in plain CI. This is the defect the Architect reported; confirmed independently.
- `tests/pacing-x1/compare.ts:106`: `verdictOf = o.some(x => x.status === 'FAIL') ? 'FAIL' : 'PASS'`. Only FAIL fails the verdict, so NOT-WIRED, EXCLUDED, N/A and PENDING-REPRED all count as PASS.
- `compare.ts:64`: with no ac7.json and `requireAc7=false`, row 904 (blocks_merge=Y on all three profiles, fixture lines 904) is pushed as `NOT-WIRED`.
- `.github/workflows/pacing-x1-stack.yml:55`: the CI verdict step runs `verdict --in x1-out --out x1-out` **without** `--require-ac7`, and CI never produces ac7.json. Every CI run therefore has 3 blocking 904 rows NOT-WIRED, and the check still goes green (`scripts/pacing-x1-stack.ts:50,63`).
- The summary does count them (`pacing-x1-stack.ts:56`, "NOT-WIRED (n blocking)"), but the headline and the exit status say PASS. That breaks condition 4: a NOT-WIRED row must never count as a pass.
- RC path: `scripts/pacing-x1-run.sh:97` passes `--require-ac7`, so the recorded run is not affected (see F2).

### F2 (OK, verified): `--require-ac7` makes 904 fail closed in the recorded run
- `compare.ts:64`: a missing ac7.json with `--require-ac7` gives FAIL.
- `compare.ts:66-67`: PASS only if `status==='PASS' && csvNamed && exitCode===0`.
- `pacing-x1-run.sh:90-91`: ac7.json is always written, including on missing-script and not-run paths (status FAIL).
- `run.sh:89`: the run also adds its own condition failure when AC7 is not PASS. `run.sh:99`: verdict exit ≠ 0 is a condition failure. `run.sh:105-106,110`: any failure means `rc-gate.txt` = "not RC gate", exit 1.
- `run.sh:86`: the runtime check requires the gate's header line to contain `CSV <abs tree CSV> |`. The studio script (argv-only, `ac7-active-idle-gate.py:23` prints `CSV {a.CSV}` = the f1 path) can never match. It is rejected even earlier by the static check (`run.sh:79`), which I verified: studio script = REJECT.
- So 904 cannot pass on a script that ignores `--csv`. Fail-closed is confirmed for the RC run.

### F3 (Critical): the static `--csv` check rejects Econ's real `--csv` script, so 904 can never PASS through `--ac7-from` (condition 3)
- `run.sh:79` accepts only `add_argument('--csv'`, `'--csv' in sys.argv` or `sys.argv.index('--csv'`.
- Econ's script (econ/ac7-gate-csv-arg @ a7dd71bd7a5eddb94263724f7593bf1a5b065302, `qa/m3-scripts/ac7-active-idle-gate.py:13-15`) uses `args = sys.argv[1:]`, `if '--csv' in args:` and `args.index('--csv')`. None of the three patterns match.
- I ran the exact grep on the a7dd71b blob: **STATIC-REJECT**. `run.sh:80-81` then writes "--csv NOT SUPPORTED … Not run" and 904 FAILs. It fails closed, but the only `--csv`-capable script that exists can never pass, so the RC run is blocked.
- Fix: accept the a7dd71b form, or drop the static check and rely on the runtime header check. Better still, also require the script's `CSV-RECORD path=… sha256=…` stderr line (a7dd71b:25-26, captured via `2>&1`) to equal `SHIP_SHA`. Add a test that runs the AC7 block against the a7dd71b script (expect PASS-able) and the studio script (expect FAIL).

### F4 (Major): the `--ac7-from` source commit is not reachable, and a failed resolve continues on an index copy
- 1037e81/a7dd71b exist only in the local `econ/ac7-gate-csv-arg` branch of /workspace/egg-farm-studio/game, which is "local only, NOT pushed" (scratch/ac7-csv-arg/PR_BODY.md:3).
- `git ls-remote origin 'refs/heads/econ/*'` doesn't list it, and a fresh clone gives `fatal: Not a valid object name a7dd71b`.
- `run.sh:24` resolves the repo from the run script's own location, so the fallback works only when the run starts from a checkout that has that branch.
- `run.sh:69-70`: if the commit doesn't resolve, `fail` is recorded but execution continues with `AC7_COMMIT=""`. `git show ":$AC7_PATH"` then reads the **index** copy of whatever repo the script runs from. The overall run still fails, because the condition is recorded, but ac7.json/ac7.log could show a PASS with no commit. Make this a hard stop: set 904 FAIL and don't run AC7.
- Also, `--ac7-from` without a `:` silently uses the commit string as the path. Reject it.
- Recording itself is OK: the commit and path go into outside-tree.txt (`run.sh:74`) and ac7.json (`:90-91`, `commit`, `scriptSha256`). The extracted script is the one executed (`run.sh:70,84`), and with `--ac7-from` there's no studio fallback (`run.sh:67-72`).

### F5 (Major): AC7 sim inputs are only partly hashed (condition 1)
- `run.sh:73-75` hashes the AC7 script and the studio `product/sim/m4/m4_active.py`. It does **not** hash `product/sim/economy_sim.py`, which my condition names explicitly.
- `m4_active.py:12` imports economy_sim by absolute path (`sys.path.insert(0,'/workspace/egg-farm-studio/product/sim'); import economy_sim as m`). The gate calls `a.m.spec_from_csv` (a7dd71b:22).
- Add the sha256 of economy_sim.py, plus the two CSVs read at import (`product/economy.f1.csv`, m4_active.py:13-14; `product/economy.f1-m4cols.csv`, read by economy_sim at import), to outside-tree.txt.
- Current values for reference: m4_active.py 95b867ac…, economy_sim.py 10f29a4a…, studio gate script 03d8e825….
- Note: AC7 depends on box paths under /workspace/egg-farm-studio (a7dd71b:11), so it can only run on the box, never on a clean CI runner. Disclose this in the RC report.

### F6 (Major): the RC run accepts any seed range and the verdict doesn't check it
- `run.sh:22` lets `--seeds` override 1-200, and `run.sh:94-95` passes it to the shards.
- Nothing downgrades rc-gate.txt for non-default seeds. `pacing-x1-stack.ts:45-48` checks shard presence, data source and head, but not `seeds==[1,200]` or `T==4000`.
- A `--seeds 1-5` run with zero condition failures would write "pending trees check" and could become "RC gate: yes".
- Fix: run.sh fails a condition unless SEEDS=1-200. The verdict adds a problem when any shard's `seeds`/`T` differ from 1-200/4000, and also when shard `csvSha256` values differ (CI path).

### F7 (Major): rows the job doesn't judge that the RC report must carry; rulings needed
1. **Pause rows 906-913 (24 rows, 21 blocking):** EXCLUDED at `compare.ts:47,60`, on the authority of D-HOE-20261029-05 (engineering/decisions.md:230, "X1 is wired without the G5-P pause rows until Features delivers them").
   - They don't count as FAIL, and the summary counts EXCLUDED without a blocking count (`pacing-x1-stack.ts:56`).
   - Required: the summary/verdict states "21 blocking pause rows not judged (D-HOE-20261029-05)".
   - The RC report lists them as not run, and X1 can't be cited as covering G5-P if pause ships in v5.
   - HoE's planned fix ("any blocking non-PASS fails, 903 excepted") must decide these rows explicitly. Without an exception, every run FAILs. With a silent exception, they become hidden passes. They must be an explicit, listed exception.
2. **Row 904 semantics:** the pinned table says "AC7 with every M5.0 flag off **vs c7bb783f**, byte-identical, tolerance exact" (fixture row 904). The job instead runs QA's 2× active/idle gate and passes on exit 0 (`compare.ts:63-67`). HoE's message says that's what 904 is, but I found no recorded ruling that remaps it.
   - Required: cite the ruling in the 904 `why`/summary, or add the c7bb783f byte-identical comparison.
   - Until one of those exists, the X1 report must say 904 was judged as the 2× gate, not as the table's byte-identical check.

### F8 (Minor): a tree-match path is still in the code after HoE ruled it out
- `scripts/pacing-x1-trees-check.sh:16-18` gives "RC gate: yes" on tree equality alone.
- Under the amended condition (one run on the final RC SHA), require `tested_sha == rc_sha` as well, or label a tree-only match "not RC gate".

### F9 (Minor): watch-list reporting for worst values over 180 s (D-HOP-08)
- The 894/895 logic matches D-HOP-08:
  - signed bands at `compare.ts:41-43`;
  - worst ≤ 1.2 × same-seed no-mech worst, using `sh.gate.none` from the same shard, seeds and CSV, at `compare.ts:84`;
  - the P95 ≤ 180 s cap as a FAIL at `compare.ts:84,86,99`;
  - row 897 (worst ≤ 180, blocks=N) only WARNs, at `compare.ts:87` and :101.
- So worst values over 180 s are reported, not failed. OK.
- But there is no explicit "watch list" line. Also, 898/899 (D-HOP-08 lists their 223/191/192 s worst values for the watch list) are NOT-WIRED, so X1 cannot produce them.
- Required for the RC report, not the PR: the 898/899 values come from the signed re-prediction doc (sha1 1c7a39bd), cited as such. Suggested: add a "watch list (D-HOP-2026-10-30-08)" line to summary.md.

### F10 (Minor): other notes
- `run.sh:45` and workflow `:36,51` run `npm ci`, which needs network; lockfile-pinned, so acceptable. Disclose in the RC record.
- `run.sh:86` matches the header on `$WT/data/economy.csv`, while a7dd71b prints the realpath (a7dd71b:18). A symlinked TMPDIR would make it fail closed (false FAIL). Canonicalize WT with `readlink -f`.
- `run.sh:85` has `|| true` only on the RESULT-line extraction, which is fine. `pacing-x1-stack.ts:22` `sh()` swallows git errors, but `run.sh:102` cross-checks head/dirty, which is fine.

## Condition-by-condition
1. **SHA/tree, porcelain, CSV sha, harness/sim/config hashes: PARTIAL.**
   - Present: `trees.txt` tested_sha/tree (`run.sh:36-37`); a fresh worktree plus porcelain before, after install and after, with dirty = refuse/fail (`:39-43,46,103`); shipped CSV sha256 plus blob (`:57`); per-shard csvSha256/balanceSha256 and the shipped-CSV equality check (`:100-101`); AC7 script and m4_active.py (`:74-75`); node, npm, lock, python3 (`:48-53,76`).
   - Missing: economy_sim.py (F5). The RC SHA slot is filled later (F8).
2. **Command, `2>&1`, results, SHA256SUMS after the log: PASS.**
   - `run.sh:84` runs `python3 <ac7> 30 --csv <tree>/data/economy.csv > ac7.log 2>&1`. That's equivalent, with an absolute tree path.
   - Shard and verdict logs use `2>&1` (`:94-97`).
   - SHA256SUMS is written last over every file, including `ac7-src/`, then `sha256sum -c` (`:109`). The trees check re-verifies before rewriting (`trees-check.sh:10,21`).
   - The results dir is caller-chosen and must be empty (`:27`). Use artifacts/<gate>/results/.
3. **`--ac7-from` fallback: FAIL at this SHA (F3, F4).** Recording, loading and no-studio-fallback are OK. 904 fails closed if `--csv` isn't honoured (F2), but it also fails with the correct script.
4. **Row statuses: FAIL in CI (F1); OK in the RC run.** 903 is N/A citing both decisions (`compare.ts:29-32`, a guard that throws on any other N/A key; test `pacing-x1.test.ts:61-67`). Pause rows: F7.
5. **D-HOP-08: PASS** (F9 for reporting).
6. **Sanity:**
   - No product code changed: all 9 files are under .github/, scripts/, tests/.
   - Exit codes propagate: `set -uo pipefail`, explicit `fail`, `|| fail` on shards, exit at `:110`.
   - Seeds are pinned and deterministic: `tests/bot-m5.ts:28` uses a seeded rng, and there is no Math.random/Date.now in the sim path. The only gap is F6 (seeds are overridable).
   - Claims reproduce (above). Network is only `npm ci`.

## Every row the job reports (fixture e4369888, 105 rows) and how it's handled
| source_line | blocks (Y/N per fixture) | status in this job | can it pass silently? |
|---|---|---|---|
| 879-884 | Y ×18 | band ±20% plus absolute (≤2.00 / ≤2.25), FAIL on miss (`compare.ts:75-77,101`) | no |
| 885, 886, 887, 888, 889 | N ×15 | band only, WARN/INFO | n/a (non-blocking) |
| 890-893 | Y ×12 | band plus delta ≤ +0.10 vs no-mech | no |
| 894, 895 | Y ×6 | signed re-pred bands, worst ≤ 1.2 × same-seed no-mech worst, P95 ≤ 180 cap | no |
| 896 | Y ×3 | signed bands N/H, P95 ≤ 180 cap | no |
| 897 | N ×3 | worst ≤ 180, WARN only (D-HOP-08 watch) | n/a |
| **898, 899** | **N ×6** | **NOT-WIRED** (G4M counting not in bot-m5) | non-blocking, correctly N per the table. Its gate text says "reported in M5.0; P95 ≤ 180 s becomes a Y gate at M5.1 exit", so it's not blocking for v5. But it is not reported at all (F9). |
| 900 | Y ×3 | band, plus ≤ 12.1 min for seller15 only | no |
| 901 | N ×3 | band, WARN/INFO | n/a |
| **902** | **N ×3** | **NOT-WIRED** (formula row, info) | non-blocking, correctly N ("exact (formula)", result "info") |
| 903 | Y ×3 | **N/A**, citing QA-D-1030-SS15-NA / D-CEO-20261030-04 | explicit N/A, allowed |
| 904 | Y ×3 | RC run: PASS/FAIL from ac7.json, fail-closed. **Plain CI: NOT-WIRED, counted as PASS (F1)** | **yes, in CI** |
| 905 | Y ×3 | each flag toggled off, G1 gates | no (fails if no toggles measured) |
| 906, 907, 909-913 | Y ×21 | **EXCLUDED** (pause, D-HOE-20261029-05) | **yes: unjudged, not flagged as blocking (F7)** |
| 908 | N ×3 | EXCLUDED | n/a |

A table line with no handler gives FAIL if Y, WARN if N (`compare.ts:97`). The unit test pins full coverage (`pacing-x1.test.ts:24-28`). PENDING_REPRED is empty (`compare.ts:46`).

**NOT-WIRED rows at 37eb91d:**
- 898, 899 and 902 (9 rows, all non-blocking). Confirmed against the fixture, matching HoE's list.
- Plus 904 (3 blocking rows) whenever the verdict runs without `--require-ac7`, which includes every plain CI run. HoE's list leaves this out.

I don't think any of 898/899/902 should be blocking for v5. Per the table, 898/899 become a Y gate at M5.1 exit, and 902 is info.

## Required fixes
1. **R1 (Critical, F1):** any blocking row whose status is not PASS makes the verdict non-PASS. The only exceptions are 903 N/A and an explicit, listed pause-row exception (R6). In CI, 904 must show as "not run in CI (RC-only)" and the headline must not say PASS while it's unjudged. Either a red CI or a distinct non-PASS label is acceptable; a plain green PASS is not. Add a unit test: blocking NOT-WIRED or EXCLUDED leads to non-PASS.
2. **R2 (Critical, F3):** make the static `--csv` check accept Econ's a7dd71b script, or drop it and rely on the header match plus `CSV-RECORD sha256 == SHIP_SHA`. Add positive and negative tests for the AC7 block (a7dd71b gives PASS-able; studio argv-only script gives FAIL).
3. **R3 (Major, F4):** the `--ac7-from` commit must be fetchable: push econ/ac7-gate-csv-arg, or document running from a checkout that has it. If it doesn't resolve, hard-stop 904 (no `git show ":path"` index read). Reject a value without `:`.
4. **R4 (Major, F5):** hash economy_sim.py, product/economy.f1.csv and product/economy.f1-m4cols.csv in outside-tree.txt.
5. **R5 (Major, F6):** the RC run requires seeds 1-200 (otherwise "not RC gate"). The verdict checks shard seeds, T and csvSha256 consistency.
6. **R6 (Major, F7):** state the 21 blocking pause rows explicitly as "not judged (D-HOE-20261029-05)" in summary.md, the verdict and the RC report. Record the row-904 semantics ruling (2× gate vs the table's "byte-identical vs c7bb783f"), or implement the comparison.
7. **R7 (Minor, F8):** the RC gate requires `tested_sha == rc_sha`; the tree-only match is withdrawn.

Non-blocking suggestions: F9 watch-list line; F10 canonicalize WT; disclose npm network use and the box-only AC7 dependency.
