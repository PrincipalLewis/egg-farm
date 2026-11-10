# HoQA delta review: PR #94 (B, bot-m5 port) @ a8e703a9162c4c52bac0f8279956e5182775d0ae

- Previous QA-reviewed head: 40bff29 (QA-D-1030-PR94-1, CONDITIONAL PASS, qa/v5-econ/pr94-40bff29-hoqa-review.md). This is the delta 40bff29..a8e703a.
- Origin check: `git fetch`, then `git ls-remote origin refs/pull/94/head` returned 40bff29 at 14:14 CET (HoE still pushing) and **a8e703a9162c4c52bac0f8279956e5182775d0ae at 14:16:58 CET**, re-confirmed at 14:43 CET. That is also the PR's headRefOid. Base rc/v5 = 65a7443. The PR is still a Draft.
- Reviewer: Head of QA. Read-only outside qa/. No comment, approval, merge or messages. Written 2026-10-30 ~14:45 CET.
- My runs: lane `hoqa-pr94b` (lane-run.sh) on a `git archive a8e703a` copy in qa/m5/scratch/pr94b-a8e703a/tree, with node_modules symlinked from /workspace/wt-v5-botm5b and node v20.19.2. Outputs are in qa/m5/scratch/pr94b-a8e703a/out/.
- Claude: none. The PR says "no Claude review" and gives no PASS_ID, so verify-claude-verdict.sh has nothing to check (rule 22: this never blocks).

## Verdict: PASS-WITH-NOTES

RF1-RF5 and SHIPFLAGS are all present and tested at a8e703a. The Saves RF3/RF4 cherry-pick is exact. The merge of rc/v5 65a7443 is clean: the tree is identical to git's automatic merge. Relative to rc/v5, B changes nothing under src/ or data/. The architect's smoke evidence and gate evidence both pass `sha256sum -c` and were produced on a8e703a. I independently re-compared all 36 smoke files and found them byte-identical. My own spot checks also pass: a 2-seed mini-parity (6/6) and tests/bot-m5.test.ts (24/24).

None of the findings below blocks merging B onto rc/v5. F1 (Major) has to be fixed before the v5 code freeze, because the RC runs with flags on.

Merge conditions:
1. CI has never run on #94: it is a Draft, and at a8e703a gate, release-globals and pacing-x1-stack all show SKIPPED. Mark it Ready at a8e703a. Merge only when ci/gate and release-globals are green. pacing-x1-stack may be red only under the #93 rule (QA-D-1030-PR93-FINAL N1).
2. Fix the stale PR-body hashes (F2). This is text only and needs no new run.

## Verified evidence

| Item | Claim | Verified | Result |
|---|---|---|---|
| Origin head | a8e703a | refs/pull/94/head and tests/bot-m5b-port = a8e703a9…d0ae (14:16:58 and 14:43 CET) | OK |
| Ancestry | 6 B commits + merge | 40bff29 → 22466f5 (RF1) → 17f1ecd (RF2) → 89652e5 (RF5) → 3d51b7b (SHIPFLAGS) → c723e70 (RF3/RF4) → cbb1b53 (JOBS=pool2) → a8e703a = merge(cbb1b53, 65a7443). 40bff29 and 65a7443 are both ancestors | OK |
| Merge 65a7443 is clean | no conflicts | `git merge-tree --write-tree cbb1b53 65a7443` = f9b6fe65… = a8e703a^{tree}, so it is byte-identical to the automatic merge. No `<<<<<<<`/`>>>>>>>`/`=======` lines in non-md files | OK |
| Boundary | test tooling only | `git diff 65a7443 a8e703a -- src data` is empty. 29 files under scripts/ and tests/, +1746/-46 | OK |
| Smoke SUMS.sha256 | 771217dd…, 91 files, -c OK | sha256 771217dd908a0433f382dd26336ddb38ad39105c6c240f5132a8a0c7da5bcad6. **91/91 OK.** Covers every file in the dir except itself, including SHA256SUMS and VERDICT.md | OK |
| run-smoke SHA256SUMS | 89, a2fd870a… | a2fd870a… **89/89 OK** | OK |
| VERDICT.md | 10a0e833 | sha256 10a0e83364eb72fb… | OK |
| Produced on a8e703a | — | run.log: `run-smoke head=a8e703a9…`. Both sides `start head=a8e703a9…`. tree-ref/port.txt `head a8e703a9…`. architect.pids:52 lane-run at 13:50:09 CET. The harness/ copies are byte-identical to a8e703a:scripts/bot-m5-parity/* | OK |
| 36/36 byte-identical | compare.txt 7af77eda | Recomputed with cmp: **36/36 identical, 0 empty**, same file lists. All 12 jsonl have 20 rows | OK |
| Tree config | balance 9a73bd8a, CSV a8c4e268, 14 flags 0 incl. breeds | tree-ref = tree-port (tree-diff.txt empty). Matches `git show a8e703a:` sha256 of balance.json (9a73bd8a…) and data/economy.csv (a8c4e268…). m4.enabled 1, 14 flags all 0 | OK (flags-0 test config) |
| Port CLOCK=1 refusal | rc 2 | run.log `CLOCK=1 refusal rc=2`; stderr text present | OK |
| F-PAR-1 not applicable | no ALLDONE | 0 files on either side contain ALLDONE. No driver writes it: git grep finds it only in harness docs and fpar1. It came from Econ's scratch wrappers (scratch/m51-refill/h2/o1aA.sh:6, o1aB.sh:5 `echo ALLDONE >>`). See F5 | Acceptable |
| Gates SHA256SUMS | bd336a59 | bd336a59ae65b897… **12/12 OK**. Covers every file except itself | OK |
| Gates on a8e703a | — | summary.txt `HEAD a8e703a9… porcelain=[]` 13:50:35. tsc, sync-economy --check, build, check-globals, selftest, manifest, targeted 80/80 and slow 1/1 all rc 0. full rc=0 14:01:39-14:09:27. The full run comes from architect.pids:54 in /workspace/wt-v5-botm5b, whose reflog shows HEAD a8e703a from 13:49:59. Porcelain is empty now. See F3 | OK |
| Full suite | 1905 + 1 skipped | full.log: 135 files, **1905 passed / 1 skipped (1906)** | OK, skip is irrelevant (F6) |
| Selftest | 30/30 | parity-selftest.log: 30 `ok`, 0 FAIL, `SELFTEST PASS` | OK |
| MANIFEST | 15/15 | parity-manifest.log 15 OK. MANIFEST.sha256 at a8e703a has sha256 2a3c0935… (was 1dc5008f… at 3d51b7b, as the PR body says) | OK |
| econ-orig provenance | unmodified | sha1 m5p 9eed2879, m5px c20ad937, m5l e930c8c7, m5lx 7123fc25 = scratch/m51-refill/h2. pool2/pool2b/press sha256 = scratch/m52-press | OK |
| Root parity evidence (RF1) | re-sealed | artifacts/bot-m5b-parity/SHA256SUMS **142/142 OK**, covers results/fpar1/*. fpar1.txt records the command, output, script sha256 d4a7bc64… and 3 must-fail self-tests | OK (PR body hashes stale, F2) |
| Pool2-mode default-mode identity | required by QA-D-1030-PR94-POOL2 | results/pool2-mode/default-mode-cmp.txt: default-mode stub output IDENTICAL before and after. The a8e703a JOBS=all smoke also gives exactly the 36-file default set | OK |
| My spot check 1 | — | 2-seed mini-parity at a8e703a: Econ original m5px.ts/m5lx.ts vs B's scripts/bot-m5px.ts/bot-m5lx.ts (casual on/off PERT=1 jsonl + px stderr, lx CFG=auto json+log): **6/6 identical**. The 2 jsonl also equal lines 1-2 of the architect's 20-seed smoke outputs | PASS |
| My spot check 2 | — | `vitest run tests/bot-m5.test.ts` at a8e703a: **24/24 passed**, rc 0 (out/vitest-botm5.log de157756…) | PASS |

## RF and SHIPFLAGS check (40bff29 review → a8e703a)

| # | Fix | Evidence at a8e703a | Status |
|---|---|---|---|
| RF1 | exact-trailer strip script, re-seal | fpar1-strip-compare.py (22466f5) requires the input to end with `\nALLDONE\n` and ALLDONE to occur once, then compares; exit 1 otherwise. Pinned in MANIFEST. Root SHA256SUMS 142/142 incl. fpar1/ | CLOSED (F2: PR body cites old hashes) |
| RF2 | committed, fail-closed smoke on the final head vs references regenerated at the same SHA | scripts/bot-m5-parity/{run-smoke,smoke,ref,jobs}.sh use `set -euo pipefail`, check the rc of every job and stream, check HEAD == SHA plus porcelain, refuse a reused outroot and verify MANIFEST. compare-smoke.py compares an exact file set and exits 1 on a diff, a missing file or an extra file. Econ originals vendored and sha256-pinned. Ran at a8e703a: PASS 36/36. Selftest 30/30 | CLOSED |
| RF3 | D6 positive control | `[REQ-L35 D6][RF3 positive control]` pins a forced Unpaid→Asleep flip: tog = tog10 = 1, per-30-min = 3. Saves' mutant note says rm.tog++ disabled fails it. Passes at head (24/24) | CLOSED |
| RF4 | length 3000, cap not literal | `expect(seen).toHaveLength(3000)`, bound `K.rc2!.cap ?? 2`. A config key for the cap is 5.1 (QA-D-1030-PR94-POOL2 caveat accepted) | CLOSED |
| RF5 | wording | scripts/README.md now says "35 comparisons against references, 29 from uncommitted scratch drivers", and that m52-o1a doesn't depend on clock wage (mechanism inferred) while m51-o1a does. The PR body matches | CLOSED |
| SHIPFLAGS | record balance + flags per side, fail if unreadable | jobs.sh record_tree → results/tree-{ref,port}.txt (balance sha256, CSV sha256, m4.enabled, m4.flags). run-smoke fails if the file is missing or the two sides differ. Selftest covers a missing balance.json or a missing m4.flags | CLOSED |
| Saves RF3/RF4 cherry-pick | c723e70 = 76a3bcd | c723e70 author is the Saves Senior Engineer, and its +/- lines are identical to 76a3bcd's | OK |
| JOBS=pool2 | QA-D-1030-PR94-POOL2 conditions | Selftest covers SEEDS<200, 199-row jsonl (one side and both), missing px jsonl, an extra file, a pool diff, a missing pool file, and an unknown JOBS. Default-mode identity is recorded. MANIFEST 1dc5008f→2a3c0935, diff in results/pool2-mode | OK. The 200-seed run is not on B (F7) |

## Findings

| # | Sev | Finding |
|---|---|---|
| F1 | **Major** (forward; not blocking B's merge onto the all-0 rc/v5; must be fixed before the v5 code freeze, Thu 5 Nov 05:00) | **bot-m5 unit tests break on any flags-on balance.json, so the final RC's full suite will be red.** tests/bot-m5.test.ts `csvBalance` builds on the **live** src/config/balance.json as `prev` (L18-19), and sync-economy keepFlags carries its m4.flags through. The ship set has all 14 m4.flags at 1. Probe: on my archive copy, with all 14 flags set to 1 in the tree's balance.json (no other change), `vitest run tests/bot-m5.test.ts` gives **14 failed / 10 passed** (out/probe-flagson.log 7f841761…). 9 failures are the O-3 guard ("bot-m5 models M5 itself ... golden/streak/tapCoins/broody/abilities/pause are both on"), which is structural and will persist. The rest fail `balance.m4.tc.pause_unlock_farm is required while flags.pause is on` (rc/v5 tc keys not there yet; that depends on the build). This extends the pattern from #78/#90 (the `bot-m5: run()` and O-3 blocks fail too) and was noted as N1 at 40bff29 when v5 was all-0. D-CEO-20261030-09/-10/-11 make it real. Fix: give every bot-m5 test that uses `Stack.on`/`rc2` an explicit flags-0 test config, for example `prev` with m4.flags forced to 0 or a committed flags-0 balance fixture with a sha256 assert. Keep the O-3 tests flipping single flags explicitly. Then show the suite green with the ship-set flags on. The parity smoke itself is fine because it is the flags-0 test config by design. |
| F2 | Minor | The PR body cites the root parity VERDICT.md as 057c0f36… and SHA256SUMS as 5d31b4b3…. On disk they are **aad8bfb8…** and **3475cfb6…** (re-sealed 12:53 CET, `-c` 142/142 OK). RF1 asked for the PR-body hashes to be updated. Text fix only. |
| F3 | Minor | full.log (1905 + 1 skipped) does not record its HEAD or porcelain, and the full run is not in gates.sh. Provenance comes from architect.pids:54 (14:01:39, cwd /workspace/wt-v5-botm5b) plus that worktree's reflog (HEAD a8e703a since 13:49:59, never moved) and porcelain empty at 13:50:35 and at 14:4x. That is acceptable for B. For the RC, put the full suite in the gate script, with a HEAD/porcelain line before and after. |
| F4 | Minor (5.1) | In default mode, compare-smoke.py does not assert that each jsonl has exactly SEEDS rows. Only JOBS=pool2 checks row counts. A run truncated identically on both sides with rc 0 would pass. The per-job rc checks mitigate this, and I counted 12 × 20 rows at a8e703a. Suggest adding the row check in default mode too. |
| F5 | Info | F-PAR-1 not applicable is **acceptable** and does not hide a missing-completion case. The ALLDONE trailer was never driver output. Econ's scratch wrapper shells appended it after the job (o1aA.sh:6, o1aB.sh:5). run-smoke regenerates references fresh, with no wrapper. Completion is proved instead by: every job's `END ... rc=0` (24 per side), `streams rc A=0 B=0` on both sides, `ref.sh rc=0 smoke.sh rc=0`, `[side] DONE`, the expected 36-file set with no missing or empty files, and 20/20 rows per jsonl. fpar1-strip-compare.py stays in the harness for the historical 22eac98 references only. |
| F6 | Info | The 1 skipped test is tests/serve-own.test.ts:101, `it.skipIf(!existsSync('dist-qa/assets'))('rc0 on an explicit free port, TERM as soon as vite listens ...')`. It is pre-existing (B doesn't touch serve-own), it is skipped only because the worktree has no dist-qa build, and it tests the rc0 serving helper, not the economy or bot. It doesn't matter for B. It belongs in the RC 3-engine rc0 run, where dist-qa exists. |
| F7 | Info | pool2/pool2b at 200 seeds is **NOT-COVERED on B**. My option C time-box (QA-D-1030-PR94-POOL2, 14:40) is superseded: the architect cancelled it under D-CEO-20261030-09/-10 (one full gate on the final RC; no full QA on interim builds). Note that -09 does not name pool2; the basis is the "gate once on the final RC" rule. It is carried in qa/v5-final-rc-run-plan.md L17 (lane N) and v5-final-gate-estimate L51 (JOBS=pool2, MANIFEST 2a3c0935). On the RC it runs with refs regenerated at the RC SHA. If the RC's tree flags are on, the flags-0 config must be stated explicitly (see F1). |
| F8 | Info | Today's rulings. B changes no src/data, so it neither conflicts with nor implements D-HOE-20261030-30 (combo keys m4.tc.combo_window_s / m4.tc.combo_boost_duration_s, no alias) or TELEMETRY_SCHEMA_VERSION 0.6.2. Neither string appears in src/ at a8e703a (`git grep combo` / `TELEMETRY_SCHEMA_VERSION` in src: no hits), and B's harness and tests reference neither. Ship set: product/v5-ship-set.md lists all 14 m4.flags = 1 incl. bestBuyV2. The smoke's 14-at-0 is the flags-0 test config (fine). bestBuyV2 and breeds are correctly absent from the bot's O-3 guard lists, because the bot doesn't model them. |

## Commands (reproducible)

- `git -C game fetch origin; git ls-remote origin refs/pull/94/head`
- `git merge-tree --write-tree cbb1b53 65a7443` vs `git rev-parse a8e703a^{tree}`
- `sha256sum -c` in artifacts/bot-m5b-parity/smoke-a8e703a (SUMS.sha256, SHA256SUMS), artifacts/bot-m5b-gates/final-a8e703a (SHA256SUMS), and artifacts/bot-m5b-parity (SHA256SUMS)
- `ops/tools/lane-run.sh hoqa-pr94b -- bash qa/m5/scratch/pr94b-a8e703a/spot.sh` (pid 3875920, 14:21:58-14:24:42 CET; out/spot.log f8627b55…)
- `ops/tools/lane-run.sh hoqa-pr94b -- bash qa/m5/scratch/pr94b-a8e703a/probe.sh` (pid 3960300; waited on .vitest-eng.lock, then ran and exited rc 1 at 14:41:35. A later lane-kill reported GONE, so nothing was signalled)
