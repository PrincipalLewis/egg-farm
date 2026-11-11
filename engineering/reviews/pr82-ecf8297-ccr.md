# PR #82 @ ecf8297: v5 F3 (m4.flags.* block + fatigueCue, m4.zeroGain.confirm, isPaused selector, validateBalance M5 rules, QA-seam test) + merge of #80 1a64e95. CCR review: **PASS** (0B/0M/0m/2n)

- PR https://github.com/PrincipalLewis/egg-farm/pull/82, head `ecf82970b29bf1ba30dbb4fd3a225488a0e1043f`, OPEN, **Draft**, base branch `feat/v5-f1c-effects` (= #80 1a64e95). The head moved during my first pass (c5b0371 → ecf8297); that pass is kept in pr82-c5b0371-ccr.md (superseded) and applies unchanged to the F3 code (see §1).
- Own commits: e743462, 60ca5e4, c5b0371 (unchanged; range-diff `=`) + merge ecf8297 of feat/v5-f1c-effects 1a64e95 (which brings rc/v5 406e455 F2). Real base = **#80 1a64e95**; needs #80 → #79 → #77.
- CI on ecf8297: gate and release-globals skipped (draft).
- Reviewer: Claude Code Reviewer, read-only, own detached worktree `/workspace/review-pr82-ecf8297` + scratch clone for mutants. Gates re-run after the ~21:56 CET reboot. Evidence in /workspace/.pr82-ev/new; mutants pr82-ecf8297-ccr-mutants.sh.txt / .out.txt. Claude calls used: 0/15.

## 0. File list
`git diff --stat 1a64e95 ecf8297`: 18 files, +372/−20: F3's 17 files plus tests/v5-f2-m5-fields.test.ts (merge resolution). `git diff c5b0371 ecf8297 -- src/config src/sim/pause.ts src/econ scripts` is **empty**: the F3 source is byte-identical to what I reviewed at c5b0371.

## 1. The delta: F2's flag test now asserts the shipped block
- Merge ecf8297 (remerge-diff, 8 lines) only touches tests/v5-f2-m5-fields.test.ts:17-22: `expect(b.m4!.flags).toBeUndefined()` becomes `toEqual(Object.fromEntries(M5_FLAGS.map(f => [f, 0])))`, and the `golden: true` probe now spreads the shipped block. That is correct: after F3 the shipped balance carries all 14 flags at 0, and F2's `m5Flag` is still false for every key. The test passes.
- F2 + F3 interaction checked: F2's `m5Flag` (save/m5-fields.ts:17) and F3's `flagOn` agree on the shipped block (both false), and `validateM5` accepts it. F2's `anyFlag` (5 names) ignores `pause`/`fatigueCue`/M5.1 flags, so `m5Load`/`m5Offline` stay no-ops when only those are on. Consistent with F2's scope, but it is another parallel flag list (#77 N-1).

## 2. Carried over from the first pass (code unchanged, re-verified at this head)
- **isPaused** (src/sim/pause.ts:10) is the only value read of `Worker.paused` in src (grep at ecf8297, F2's save/m5-fields.ts included: no `.paused` read there). Mutants P1–P3 killed again.
- Flag block, `m4.zeroGain.confirm`, `keepFlags`/`keepZeroGain`, `validateM5`, `fatigueCue`, and the eggfarmQa release-check test are as described in pr82-c5b0371-ccr.md §1–§3.
- Whole-stack mutants at ecf8297: **18 run, 17 killed, 1 equivalent (G2)**. The 2 extra survivors D1/D2 are #77 m1 and are not counted here.

## 3. Gates (own worktree)

| Gate | Result |
|---|---|
| tsc | 0 |
| npm test (sync --check + vitest) | **1691 passed, 1 skipped** |
| golden suites | pass |
| test:slow | 16 passed, 1 skipped |
| build / check-release-build | 0 |
| check-globals | 3/3 PASS (release globals = eggfarmExportTelemetry only) |
| build:html | 0 |
| verify 24 h seed 1 | **PASS**, trace **2c0d3ec3** (479 715 events), goldens **f90d1678 / a54c9cf9**, round-trip pass, not migrated |
| verify 1 h | trace 198992ff078e |
| gitleaks `1a64e95..ecf8297` | no leaks |

- 24 h verify.json vs base 406e455: only build id/sha/label, html bytes and the 14 added `m4.flags.*` entries (all 0) in `flags` differ.
- My RNG/isolation harness at this head: all 13 original flags on, 2 h × 3 seeds, byte-identical to flags off; evRng save/load stable.
- `git status` clean. 0 import cycles.

## Findings
No Blocking, Major or Minor findings. Both nits from the first pass still apply (files unchanged):

### N-1. The QA-seam test leaks 4 temp dirs per run
- tests/v5-f3-qa-seam.test.ts:51 (`mkdtempSync(join(tmpdir(), 'rb-q8-'))`, never removed). Repro: `/tmp/rb-q8-*` count 20 → 24 across one `vitest run tests/v5-f3-qa-seam.test.ts` (measured at c5b0371; the test file is unchanged). Fix: `rmSync` after `spawnSync`. I deleted nothing.

### N-2. `npm run verify -- --flags` accepts m4.flags values other than 0/1
- scripts/verify/cli.ts:56-61 (`withFlags`), newly reachable via `flagsOf` (:52). Repro: `--flags m4.flags.pause=2` runs and exits 4 instead of usage exit 2; `validateM5` (src/config/m5-rules.ts:19) would reject the value. It is never a PASS. Fix: reject non-0/1 for `m4.flags.*` as a UsageError.

### Observations
- **O-1:** pre-existing stale comments, src/econ/income.ts:33 and :56 (paused handling that isn't there).
- **O-2:** Draft on a feature-branch base: no CI gate run on ecf8297.

## Verdict: **PASS**. 0 Blocking / 0 Major / 0 Minor / 2 Nits / 2 observations
The F3 code is unchanged from c5b0371. The F2 test now pins the shipped all-0 flag block correctly. Every paused read goes through isPaused. Goldens f90d1678 / a54c9cf9 and trace 2c0d3ec3 are byte-identical. Claude calls used: 0/15.
