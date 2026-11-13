# V5SCAP trace check — PR #92 (V5-HOP-1: M5.0 CSV 8dc90e2b + M5.1 farm_cost r27-29) — F-5 re-trace @ 2d15dac

**Verdict: PASS** for the Saves scope (the F-5 test change in 2d15dac plus flags-off save compatibility). No Blocker or Major; 2 Minor and 2 Nit, all non-blocking.
**Merge condition:** green CI on the head. CI was **still in progress** at 10:54 CET (see CI below).
**Head:** `2d15dacdb45884bf1aabce48ea20e7571fb69d66` = PR head (GitHub API) · base `rc/v5` `a923206b80f2c301341d100d9eaa34554e948fb9` (= origin/rc/v5 at 10:50 CET) · OPEN, not draft, mergeable true, mergeable_state "unstable" (CI pending) · 6 commits, 13 files, +316/−280
**CI:** run 41036128859 (`ci`, pull_request) on headSha 2d15dac. Check `gate` started 10:48:40 CET and was **in_progress / no conclusion** at 10:53:54 CET (40-ci-checks.txt).
**Reviewer:** QA Engineer, Saves & Release Verification · 2026-10-30 10:50–10:56 CET · evidence `pr92-2d15dac/` (SHA256SUMS) · read-only worktrees qa/scratch/wt-pr92-2d15dac and wt-pr92-base-a923206 (removed afterwards)

## (1) The diff to the test file is exactly F-5 — PASS
- Blob: 7d59dda = a923206 = `21a5ecc3…` (#91's file is unchanged on rc/v5) → 2d15dac = `27b6877b…`. numstat is +2/−1, one hunk at L74-75 inside `[CCR-F4][F-5]` (03-f5-*.txt/patch).
- The only change is in how `on` is built (it now destructures `pause_unlock_farm`/`pause_call_lockout_s` out of `b.m4.tc` and passes `tc: tcNoPause`). The three `expect` lines, the throw regex and the test titles are byte-identical. The other 9 `it` cases and the file header are byte-identical to #91.
- That file is the only one in the PR that changes under src/save, src/sim or the save tests. Other files changed: balance.json, economy CSVs, vendor pins, and the economy/cost-segments/ac7/seller-variance tests and fixtures. No src/ code changes at all.

## (2) F-5 still exercises the missing-key path — PASS (Minor M1)
Mutants (mutate.py; each run on the F-5 file + v5-f3-config, 38 tests; each reverted and the tree verified clean; tsc 0 for all):
| Mutant | Result |
|---|---|
| F1 drop `M5_REQUIRED_TC.pause` | **killed** (F-5) |
| F2 required-key loop never throws | **killed** (F-5) |
| F5 missing key silently becomes 0 (the original F-5 bug) | **killed** (F-5) |
| T1 both strip names misspelt (strip becomes a no-op) | **killed** (F-5: `on` no longer throws) |
| T4 revert to #91's `on` line (live balance) | **killed** (F-5); this confirms Econ's 1-of-10 failure claim |
| F3 only `pause_unlock_farm` required (lockout key dropped from the list) | **survived** → M1 |
| F4 only `pause_call_lockout_s` required | **survived** → M1 |
| T2 / T3 one strip name misspelt | **survived** (the other key still triggers the throw) → M1 |
- Probe (13-probe-f5.*): the strip removes both keys (`in` check false). Stripping only unlock → `tc.pause_unlock_farm is required…`; only lockout → `tc.pause_call_lockout_s is required…`; both stripped → the unlock message (first in list order); both stripped with the flag at 0 → ok. So the validator does require each key alone. The F-5 test just doesn't pin that.
- Head's F-5 file run on base a923206 (where the keys are absent) passes 10/10 (12-head-file-on-base.log). The strip is harmless on either balance.

## (3) b passes with the shipped keys 10/45 — PASS (info)
- balance.json @2d15dac: `m4.tc.pause_unlock_farm` 10, `pause_call_lockout_s` 45, `m4.flags.pause` 0. All 31 CSV rows carry 10/45 (data/economy.csv a8c4e268).
- Spec v1.3.10 (sha1 b4f86ca8, §9 L222/L226): unlock 10 is "fixed for M5.0" and lockout 45 is within the 15–60 range (D-HOP-16). `validateBalance(b)` and `b + pause:1` both pass.
- m5Load with the shipped keys and pause on: a saved lockout of 1e308 is capped to **45** (the #91 cap now comes from live data and equals PTC); 30 is kept at F10; at F9, paused and the lockout are cleared.
- Caveat on the PR claim that "b proves the shipped keys are valid": the validator is presence plus a leaf check only. NaN and negatives are refused ("invalid"), but lockout 0 or 1e9 and unlock 2.5 are accepted, and the spec range 15–60 is not enforced. This is #91/F3 scope, predates this PR, and m5Load clamps to the tunable anyway. Info only.

## (4) D-HOE-20261030-05 (tests read fixtures, not shipped data) — Minor M2
- The rule targets tests asserting specific balance values. F-5 asserts validator behaviour, but #91's `on` silently depended on the live data lacking two keys, which is exactly the retune breakage the rule exists to prevent (it broke on this PR). The fix removes that dependency for `on` (shown by T4 and the head-file-on-base run). `on` and `PZ` still spread the rest of the live `m4` block, so a future retune that breaks some *other* rule would make F-5 fail loudly with a different message, never pass silently. `validateBalance(b)` is a legitimate "check the shipped data" assertion, which the rule allows.
- **Minor, non-blocking, after the cut.** Fixture alternative: build `on` from the committed, sha-pinned pre-pause CSV `tests/fixtures/economy-b48be8a4.csv` (0 tc_pause columns; already used by bot-m5.test.ts via `buildBalance(parseEconomyCsv(...))` + `PARITY_CSV_SHA256`). Set `flags.pause=1` and add two one-key-present variants (this also fixes M1). Keep `validateBalance(b)` as the shipped-data check.

## (5) Trace table / rule 22 / Post-CCR delta — PASS (Nit N2)
- The 4 trace rows resolve: F-5 (`[CCR-F4][F-5] … never a silent 0`) plus the 9 untouched cases, 10/10 in 10-target-vitest.log, with titles carrying CCR-F4/F-5/E9/AC-P1/B5/E2/E2b/E12/AC-P2/AC-P13.
- The PR has no reviews and no comments. No CCR file for #92 under engineering/reviews/. So there is no CCR pass and no Post-CCR delta is needed. **Nit N2:** the PR body doesn't say "no Claude review" (rule 22, D-CEO-20261030-01). Record it as "no Claude review", not "manual CCR".

## Steer (a): evidence artifacts/v5-hop1-2d15dac/results/ — PASS
`sha256sum SHA256SUMS` = `416aedb4c4f0878959e5e2bfa9b2b9423a10a35e62aeee4009b13b6c669e8985` (matches the PR body). `sha256sum -c`: 98 OK, 0 failed (04-manifest-check.txt). ci-set.md names head 2d15dacdb45884bf1aabce48ea20e7571fb69d66. `ci-set-2d15dac/` logs carry build id `m4.1+2d15dac` (build:html "matches HEAD"); verify PASS trace 169457016d1c. The `m4.1+72419a6` refs sit only in `ci-set-d52f35b-prev/`, which is labelled reference-only.

## Steer (b): #91 flags-off byte-identical save cases on #92's balance — PASS (no Blocker)
The #91 probe (probe-saves.test.ts, an unchanged copy) ran at base a923206 and head 2d15dac. Each run has 72 rows (36 cases × shipped balance and pause-on balance): every committed save fixture plus v5-f2/m5-save.json through validate → m5Load → serialize, the loadSafe main/.bak fallback and the exp1 LS+IDB reconcile.
- base vs head: **identical** (16-probe-diff.txt, diff exit 0).
- head vs the #91 baseline (pr91-7d59dda/15-probe-head.jsonl): **identical** (17-probe-vs-pr91-baseline.txt, diff exit 0).
- So the new CSV/balance (farm_cost r27-29, streak_cap 0.28, the added tc keys) changes no flags-off save byte, outcome or recovery reason.

## (6) tsc / tests (maxWorkers=2, own node_modules, lane-run saves-qa)
- tsc --noEmit: 0.
- F-5 file: 10/10.
- Save suites (#91 set + v5-f2/f3 + goldens flagoff-a01faea, m4on-90a9c84): 21 files **325/325**.
- Full suite: 129 files, **1760 passed, 1 skipped**, exit 0 (matches the author's ci-set count).
- Wall clock: 10:51:23–10:53:44 CET (npm ci → full suite).

## Findings
- **Minor M1:** F-5 doesn't pin each pause key on its own. Mutants F3/F4 (drop either key from `M5_REQUIRED_TC.pause`) and T2/T3 (one strip name misspelt) survive. The test title names both keys and the validator does require each one (probe). Repro: `python3 pr92-2d15dac/mutate.py F3-only-unlock-required`, then run tests/v5-m5load-pause-sanitize.test.ts → 10/10. Fix (test-only): two more expects, each stripping one key and matching that key's message. The same shape existed in #91; non-blocking.
- **Minor M2:** F-5's `on`/`PZ` still derive from the live balance (D-HOE-20261030-05). The fixture alternative is in (4). Non-blocking, after the cut. Can be one small test-only PR together with M1 and the #91 follow-ups (D-HOE-20261030-10).
- **Nit N1:** stale comments in the test file. The PTC comment says "not in balance.json until row 4", but they now are, and PZ is now equal to live + pause:1. The header still cites spec v1.3.6.
- **Nit N2:** the PR body has no rule-22 "no Claude review" line.
- **Info:** the pause key validator is presence + leaf only. The spec range 15–60 and the integer unlock level are not enforced (from #91/F3).

## Not run
- Broader V5-HOP-1 review (economy, pacing, AC7 gates): not my scope.
- test:slow, build, check-globals, build:html, verify: rely on the author's ci-set-2d15dac evidence, checked by sha only.
- Browser and real IDB.
- CI conclusion: pending at report time.
- Note: the local full suite includes serve-own.test.ts (D-HOE-20261030-06 option (a) excludes it locally). I did not check whether it bound a port (I did not use :4173 or the browser lock). It was run the same way in the #91 check. Exclude it next time.
