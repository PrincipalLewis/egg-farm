# HoQA delta review: PR #93 `pacing-x1-stack` (X1) @ 05d68b1e9a4a86d48a3f1d811ce56f1e0c70ea7f

- PR: https://github.com/PrincipalLewis/egg-farm/pull/93. State: open, **Draft**, base rc/v5 @ e77fc5c, mergeable_state "clean". The PR body sha256 is 018b48ad994a6ea9508bfa9ebf855e01dac1ca081fe22318fb40898096defe08, which matches HoE.
- Scope: a code-level delta review only, per D-CEO-20261030-10. No browser runs and no recorded X1 run. Previous review: QA-D-1030-PR93-1 @37eb91d CONDITIONAL PASS (qa/v5-econ/pr93-37eb91d-hoqa-review.md, R1-R7).
- Reviewed 13:00-13:06 CET, Oct 30. Checks ran in a /tmp worktree (since removed) under `ops/tools/lane-run.sh qa-hoqa` (pid 3212092). The studio checkout was not touched. Nothing was posted, approved or merged. No Claude review (rule 22).
- Logs: qa/m3-recheck/pr93-05d68b1-logs/ (SHA256SUMS 408b1c44…6a94).

## Verdict: PASS-WITH-NOTES (merge condition: CI must actually run, see N1)

The code delta closes R1-R7 and F9 from QA-D-1030-PR93-1. Every local gate HoE cited reproduces exactly, except check-globals, which needs a browser and was not run. The recorded-run path fails closed on every route I checked, including flags-on via the O-3 guard.
No code blocks the merge. One process condition does: **no CI has run on any head of #93**. The PR is still Draft, and all 4 checks at 05d68b1 are `skipped`. So `ci / gate` must be green at 05d68b1 before HoE merges, and the `pacing-x1-stack` red must be exactly the three row-904 NOT-WIRED lines (N1).

## 1. Head and ancestry
| check | result |
|---|---|
| `git fetch origin pull/93/head` | 05d68b1e9a4a86d48a3f1d811ce56f1e0c70ea7f = PR head (API agrees) |
| `merge-base --is-ancestor 37eb91d 05d68b1` | ancestor (fast-forward) |
| `git log 37eb91d..05d68b1` | 4 commits on the PR side: 9d2abf6 (R1/904), c376c81 (R1-R7 + HoE (b)), 0c852d9 (SHIPFLAGS balance record + F9), 05d68b1 merge. The merge also brings in e77fc5c (#83) |
| `rev-list --parents -n1 05d68b1` | parents 0c852d9 + **e77fc5c** (= origin/rc/v5 head, = the PR base) |
| evil-merge check | `diff <(git diff 3f582db e77fc5c) <(git diff 0c852d9 05d68b1)` is empty, and the PR files are identical at 0c852d9 and 05d68b1. The merge adds only #83 content (already QA PASS, QA-D-1030-PR83-PASS) |
| PR delta vs base e77fc5c | 17 files, +1097/-0. All under .github/, scripts/, tests/. **No src/ or data/ change** |

## 2. Local gates at 05d68b1 (box node v24.22.1; CI uses node 20)
| gate | HoE / Architect | HoQA | log sha256 |
|---|---|---|---|
| npm ci | n/a | rc 0 | 4a1adc94… |
| tsc --noEmit -p . | 0 | rc 0, empty output | e3b0c442… |
| sync-economy --check | 0 | rc 0, "balance.json up to date with economy.csv" | 0903bd5c… |
| pacing-x1 (tests/pacing-x1.test.ts + tests/pacing-x1-ac7.test.ts) | 33/33 | 2 files, **33/33 pass** | e03d20b7… |
| full vitest | 1854 + 1 skipped | 134 files, **1854 pass, 1 skipped** | f62cab79… |
| check-globals | 3/3 | **not run here**: it's a Playwright browser run (scripts/release-globals-browser.mjs), and this delta is no-browser. It's covered by CI `gate` (see N1). The PR changes no src | n/a |
| worktree porcelain after | n/a | 0 lines (clean) | n/a |

## 3. CI (cursor-github: check-runs for 05d68b1; workflow runs for ci/v5-pacing-x1-stack; branch rc/v5)
- 4 check runs at 05d68b1, **all `skipped`**: `gate`, `release-globals` (ci run 41051838298), `pacing-x1-stack shard (matrix)` and `pacing-x1-stack` (run 41051840405).
- The only other runs on this branch are at 37eb91d, and they were also `skipped` (41043770305, 41043770209). Cause: both workflows skip Draft PRs (D-CEO-20261024-02: "marked Ready only at the gate SHA").
- **pacing-x1-stack has never actually run on #93, so it was never "red".** HoE's "red by design" is correct about what the code does: in plain CI there's no ac7.json, row 904 is a blocking NOT-WIRED row, and `blockingUnjudged` makes the verdict FAIL with exit 1. But there is no CI evidence of it.
- rc/v5 branch protection: `protected:false`, required checks `[]`. No check is formally required. The studio's working rule (as on #83, run 41043968329) is that `ci / gate` must be green.
- pacing-x1-stack is non-required: confirmed, both from protection and from the workflow comment.

## 4. Earlier QA conditions
| condition | status at 05d68b1 |
|---|---|
| R1: blocking non-PASS fails the verdict | **closed**. `verdictOf` = FAIL on any FAIL or `blockingUnjudged`. The only exemptions are 903 N/A and pause rows 906-913 EXCLUDED (`compare.ts:115-148`). In CI, 904 shows "not run in CI (RC-only)" and the headline is FAIL. Tests at pacing-x1.test.ts:92-109 |
| R2: `--csv` judged by behaviour | **closed**. The static grep is gone. `scripts/pacing-x1-ac7.py run` gives PASS only if exit 0, `CSV-RECORD path=<realpath> sha256=<shipped>` is present, the header names the realpath, and the disk sha256 matches. Tests: the a7dd71b fixture gives PASS and studio 03d8e825 gives FAIL. Both fixtures are byte-exact except one line, which I checked by diff, and the test pins 3ba1909d / 03d8e825 |
| R3: `--ac7-from` | **closed**. It must be `<commit>:<path>`, the commit must resolve, and the path must exist. Otherwise exit 2 before any results dir exists (run.sh:33-38). No index read: `git show $AC7_COMMIT:$AC7_PATH` uses a validated commit |
| R4: hash studio imports | **closed**. m4_active.py, economy_sim.py, economy.f1.csv and economy.f1-m4cols.csv go to outside-tree.txt; a missing one fails 904 |
| R5: seeds and T | **closed**. run.sh:108 fails unless 1-200; `shardProblems` checks seeds 1-200, T 4000, and csv/balance hash agreement and format |
| R6: pause rows and 904 ruling | **closed**. `PAUSE_WHY` EXCLUDED-not-judged, `notJudgedLine` counts the 21 blocking rows, `AC7_RULING` is cited on 904. The pinned table changed (see N4) |
| R7: tested_sha == rc_sha | **closed**. trees-check gives MATCH only when the SHA and tree are equal; tree-only gives TREE-ONLY, i.e. not RC gate. Tested |
| F9: watch-list line | **closed** (`watchListLine`) |
| QA-D-1030-SHIPFLAGS: balance.json sha256 in every run | **closed**. balance.txt, balance.json.record.json, an inputs/ byte copy covered by SHA256SUMS, and a per-shard `balanceSha256` that must equal the tree's (run.sh:70-75,119-120; verdict checks the record against balanceSha256) |
| QA-D-1030-X1COV coverage caveat | **still holds, unchanged**. The gate script is unchanged (st_cap 0.30 hard-coded; no tc_*/hens_cost/egg_value_cost read; tapCoins and broody not modelled). Under D-CEO-09/-10 it's no longer "RC impact none at flags-0": the final RC ships tapCoins and broody ON, so the "5.1 item" (X1 reading those columns) becomes a v5 RC dependency (N2) |
| "flags-0 byte-identical parity with row 905" | **no QA condition by this name exists for #93** in qa/decisions.md. The only byte-identity clause was row 904 vs c7bb783f, ruled out in R6 (#92 changed economy src). Row 905 measures per-flag bot toggles against the G1 gates, not byte parity. D-CEO-20261030-06 ("905 = pacing of record, flags-0") is superseded by -09/-10. N/A |
| `--csv` fallback (X1COV: X1 from a7dd71b 3ba1909d with commit + sha256 recorded) | **holds**. `--ac7-from a7dd71b:qa/m3-scripts/ac7-active-idle-gate.py` copies the script into results/ac7-src/, records commit + sha256 in outside-tree.txt and ac7.json, and compares m4_active.py against the commit's copy (MATCH/MISMATCH) |

**a7dd71b reproducibility:** a7dd71b exists only on the local branch `econ/ac7-gate-csv-arg` in /workspace/egg-farm-studio/game. It isn't on origin (`ls-remote` shows no such branch).
- The recorded run works only from the studio repo or one of its worktrees. run.sh derives REPO from its own path, and worktrees share the object store.
- The evidence QA relies on stays self-verifying: the script bytes are in results/ac7-src/ under SHA256SUMS, and an in-tree fixture is byte-exact except one line, with the test pinning 3ba1909d.
- Without `--ac7-from`, the default is the studio's argv-only 03d8e825 script, so 904 FAILS (fail-closed, never a silent pass).
- So nothing QA relies on breaks. The risk is that someone deletes the local branch (N3).

## 5. run.sh fails closed (scripts/pacing-x1-run.sh @05d68b1, `bash -n` OK)
- **Hard refusals, exit 2, no results:** unknown ref; malformed or unresolvable `--ac7-from` or missing path; non-empty results dir; worktree add failure; HEAD != SHA; dirty fresh checkout.
- **Condition failures** (go to conditions.txt and rc-gate.txt "not RC gate"; exit 1):
  - npm ci fail, or dirty after install;
  - missing shipped CSV;
  - `inputs` exit ≠ 0 (a bot-modelled src M5 flag ON);
  - balance.txt or inputs-copy sha mismatch;
  - AC7 script missing, studio imports missing, or m4_active MISMATCH;
  - AC7 status not PASS (`grep -q '^PASS'` on a status file that's empty if node fails, so FAIL);
  - seeds ≠ 1-200;
  - any shard non-zero;
  - verdict exit ≠ 0 (run with `--require-ac7`, so a missing ac7.json is FAIL);
  - measured CSV set ≠ shipped sha (an empty set fails too);
  - measured balance set ≠ tree sha;
  - shard head ≠ SHA or dirty;
  - dirty after the run.
- **SHA256SUMS** is written last and `-c` verified; failure exits 1.
- **trees-check:** re-verifies `-c` first, needs `conditions_failed=0` (a missing conditions.txt means not RC gate) and tested_sha == rc_sha. It can only produce "RC gate: yes" from a zero-failure run on the exact RC SHA. Because the PR is squash-merged, the recorded run has to be made on the rc/v5 SHA itself after the merge (consistent with HoE's plan).
- I found no path where a failed step leads to "RC gate: yes". Minor robustness notes are in N6.

## 6. O-3 guard (flags-on throws, not a silent pass)
I probed this in the worktree. I set `m4.flags.golden=1` (m4.enabled is already 1 in the committed balance.json) and restored the file with `git checkout` afterwards (porcelain 0):
- `pacing-x1-stack.ts -- inputs` **exited 1**. balance.txt summary: "bot-modelled src M5 flags … ON: golden (bot-m5 O-3 guard throws: the bot model cannot run)" (log 150bc7b6…).
- `shard --profile casual --seeds 1-1` **exited 1** with `Error: bot-m5 models M5 itself: its own M5 model (stack on) and src m4.flags.golden are both on; that would double-count`. **No shard JSON was written** (log e61fccd4…).
- In run.sh that gives two condition failures (inputs and shard), plus an empty measured-CSV set, so "not RC gate". The verdict alone reports "missing shard" as a problem, so FAIL.
- The unit tests cover run(), windowGate and the CLI exit 1 (bot-m5.test.ts:75-94). **Holds: flags-on fails loudly and cleanly.**
- The guard covers golden, streak, tapCoins, broody, abilities and pause. Flags the bot doesn't model (clockWage, rc2Refill, …) don't trip it, which is correct for double-counting. But X1 also doesn't measure them.

## Findings
| id | severity | finding | action / owner |
|---|---|---|---|
| N1 | **Major (merge condition)** | No CI has run on #93 at any head (Draft, so all checks are skipped at 37eb91d and 05d68b1). "pacing-x1-stack red by design" is unobserved, `ci / gate` (unit + slow + release-globals chromium + release-html, Node 20) hasn't run, and rc/v5 has no protection to stop a merge. | HoE: mark Ready at 05d68b1 with no new commits. Merge only when `ci / gate` is green at 05d68b1, and the `pacing-x1-stack` summary's only FAIL lines are `blocking row 904 optimal/seller15/casual NOT-WIRED`, with 0 other FAIL rows and 0 `problem:` lines. Any other red is a real finding. Use match-head-commit 05d68b1. |
| N2 | Major (RC plan; not a #93 blocker) | Under D-CEO-09/-10 the final RC ships golden/streak/tapCoins/broody/abilities/pause ON. X1 as built **cannot produce a pacing verdict on the final RC**: the O-3 guard makes the recorded run "not RC gate" by design. A pacing ±20% result on the final RC needs lane-A item 1 (a stack with `on:false` over the src mechanics) and the X1COV gap (tc_*/broody columns, streak cap 0.28) closed first. | HoE/HoP: list these as dependencies before the RC pacing gate in the 14:00 schedule. Econ: re-predict §13.2a for src-mechanics runs. |
| N3 | Minor | The `--ac7-from` source (a7dd71b) is local-only, so the RC run must start from the studio repo. Evidence is self-contained (results/ac7-src + SHA256SUMS), but the source isn't backed up on origin. | Econ/HoE: push `econ/ac7-gate-csv-arg`, or land the `--csv` script as the tree's qa/m3-scripts/ac7-active-idle-gate.py, so the tree default is used and `--ac7-from` isn't needed. |
| N4 | Minor | The pinned prediction table was edited in-tree: pred-13.2a-e4369888 became pred-13.2a-7bbb5925, with 3 lines changed (the row-904 cells only), citing QA-D-1030-X1-TREE/R6. The gate table is no longer byte-equal to Econ's §13.2a e4369888. | RC report: cite 7bbb5925 and the 904 delta. Econ/HoP: confirm, or update §13.2a, so the doc and the fixture match. |
| N5 | Minor | CI `pacing-x1-stack` is permanently red, so a real pacing regression in CI would look the same as the expected red unless someone reads the FAIL list. All three 904 profile rows are judged on the single optimal-player AC7 run. | Suggest a distinct CI-only outcome, e.g. an exit code or headline "FAIL (RC-only rows unjudged)" plus "other FAIL rows: n". Until then, N1's reading rule applies. |
| N6 | Info | run.sh:128 and trees-check:24 build SHA256SUMS with `find … \| xargs sha256sum`, so a results filename with whitespace would break it. None exist today. Node 24 on the box vs Node 20 in CI. `npm ci` needs network (lockfile-pinned). AC7 is box-only (studio imports). | Disclose in the RC record; harden in 5.1. |

## Commands (summary)
```
git fetch origin pull/93/head:refs/remotes/origin/pr93            -> 05d68b1e9a4a…
git merge-base --is-ancestor 37eb91d 05d68b1                      -> yes
git rev-list --parents -n1 05d68b1                                -> 0c852d9 e77fc5c
diff <(git diff 3f582db e77fc5c) <(git diff 0c852d9 05d68b1)      -> empty (clean merge)
git diff 37eb91d 0c852d9  (16 files, +543/-69) reviewed in full
git worktree add --detach /tmp/hoqa-pr93-05d68b1 05d68b1          (removed + pruned after)
ops/tools/lane-run.sh qa-hoqa -- /tmp/hoqa-pr93-out/run.sh        -> npm ci 0, tsc 0, sync --check 0, x1 33/33, full 1854+1 skip, porcelain 0
O-3 probe: balance.json golden=1 -> inputs rc 1, shard rc 1 (throw, no JSON); restored, porcelain 0
cursor-github list_check_runs_for_ref 05d68b1                     -> 4 checks, all skipped (Draft)
cursor-github list_workflow_runs ci/v5-pacing-x1-stack            -> 4 runs (05d68b1, 37eb91d), all skipped
cursor-github get_branch rc/v5                                    -> protected:false, required checks []
cursor-github get_pull_request 93                                 -> open, draft, head 05d68b1, base e77fc5c, clean; body sha256 018b48ad… OK
git ls-remote origin | grep ac7-gate-csv-arg                      -> absent (a7dd71b local-only)
```
