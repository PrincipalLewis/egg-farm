# QA review — PR #104 slim P8

- Decision: **MERGE-WITH-NOTES** (source/unit merge review only; not complete-RC QA or release approval).
- Exact remote and local head: `0e9151b6a8b543803a00c01a1bb14002ada0d90e`.
- Completed: 2026-11-05 22:13 CET (Europe/Belgrade).
- Scope: slim attendance foundation; no real Shift/fatigue/golden feature acceptance. Flags remain held.
- Open findings: **0 blocker, 0 critical, 0 major/P2, 0 minor** in reviewed scope.
- No Claude review claimed (rule 22).

## Independent exact-head verification

Separate checkout: `qa/m5/review-pr104-evidence/checkout`, created from the existing local exact commit and given independent Git metadata; no other bot checkout modified. Node **20.19.2**, existing dependency installation reused through per-entry symlinks, test caches local. Clean exact HEAD before gates; clean restored HEAD after mutation (`git diff --exit-code HEAD`, `git diff --check`, porcelain empty).

| Check | Observed result |
|---|---|
| `node node_modules/typescript/bin/tsc --noEmit` | PASS, exit 0 |
| `vitest run tests/v5-p8-slim.test.ts tests/v5-f1b-focus-wiring.test.ts tests/v5-f1c-effects.test.ts` | **54/54**, 3 files, exit 0 (27 slim + 6 focus + 21 effects) |
| `vitest run` | **2061 passed, 1 skipped**, 146 files, exit 0; 154.09 s |
| Three mounted resize regressions, pre-fix app/overlay restored from parent | **3 failed**, exit 1; each fails at expected docked attendance true assertion |
| Same three tests, exact-head production files restored | **3/3 passed**, exit 0 |

The full-suite count is the repository's default Vitest suite, excluding separately configured `*.slow.test.ts` and `*.k10.test.ts`; those separate suites were not independently run here. No browser/device full QA, build, or final pacing acceptance claimed.

All long runs used `ops/tools/lane-run.sh qa-pr104 -- ...`; shared `.vitest-eng.lock` respected. Initial 180-second lock attempt timed out without running tests (lock exit 1); after it terminated a bounded retry obtained the lock and passed. Mutation ran separately after full completion, under the same lock. PIDs 1141520, 1161037, 1182618 have terminated; no kills or orphaned jobs.

## F1 — P2, CLOSED

Historical repro: while visible and focused, open mobile Upgrades; cross into the docked layout without navigating panels. The old raw `open='upgrades'` term keeps attendance false even though Upgrades is now permanently docked play surface. Reverse resize and close-during-resize paths share this failure.

Source correction: `app.ts:185` supplies a live `docked: () => docked.matches`; `overlay.ts:46-47` applies that only to Upgrades dialog status. Registered sheets, existing dialogs, and explainer remain independent suspension terms. No new source-level blocking finding.

Coverage verified in `tests/v5-p8-slim.test.ts`:
- Lines 134–138: mobile Upgrades suspended → docked attendance restored.
- Lines 139–144: reverse transition suspends again with Upgrades still selected.
- Lines 145–151: close Upgrades after docked transition; return mobile remains attended.
- Lines 152–160: registered sheet stays suspended across both layouts until closeComplete; predicate-level combined Upgrades/sheet case at lines 97–106.

Mounted tests use the real mountApp and captured Game probe, with controllable MediaQueryList and emitted media/resize events. They are not physical-browser layout/animation tests. For independent red/green evidence, only isolated checkout app/overlay were reverted to parent source while retaining exact-head tests; all three failed at lines 137/142/148, then passed after restoration. Thus these are genuine discriminating regressions, not merely passing assertions. The reverse/close post-resize branches are verified on green; red fails at the earlier shared docked step.

## Architect addendum and provenance

Read `engineering/reviews/p8-slim-eafd08c-architect.md`, especially lines 50–76. It accepts F1 by source inspection, not final merge/QA approval. Its historical pending targeted run now records 54/54 in `scratch/architect/review104-0e9151b/targeted.log`; this review additionally ran its own exact-head gates. Earlier UI `f1-red` EXIT0 evidence is invalid and NOT used. No Claude-role PASS is asserted.

## Hosted exact-head CI snapshot

Checked 2026-11-05 22:13 CET (Europe/Belgrade); evidence `review-pr104-evidence/hosted-final.json`:
- `release-globals`: completed / skipped — https://github.com/PrincipalLewis/egg-farm/actions/runs/42107706418/job/127534651348
- `k10-breeds-offset (KNOWN-RED monitor, non-required, D-HOP-2026-10-30-52/53)`: completed / success — https://github.com/PrincipalLewis/egg-farm/actions/runs/42107706897/job/127526806703
- `pacing-x1-stack shard (seller15)`: in_progress / pending — https://github.com/PrincipalLewis/egg-farm/actions/runs/42107706606/job/127526805809
- `pacing-x1-stack shard (casual)`: in_progress / pending — https://github.com/PrincipalLewis/egg-farm/actions/runs/42107706606/job/127526805633
- `pacing-x1-stack shard (optimal)`: in_progress / pending — https://github.com/PrincipalLewis/egg-farm/actions/runs/42107706606/job/127526805237
- `gate`: completed / success — https://github.com/PrincipalLewis/egg-farm/actions/runs/42107706418/job/127526804818

Required `gate` is green on the exact head. The pacing shards remain pending, not green; this does not grant pacing or complete-RC sign-off (existing plain-CI non-gating policy). Hosted release-globals is skipped, not a pass; no independent runtime-globals claim is made here. K10 monitor success does not replace Economy/HoQA review of a final candidate.

## Notes / remaining boundaries

- Merge verdict applies only to this exact head and slim attendance base; no merge executed or authorized on another head.
- Keep real Shift lifecycle/ability/cooldown integration, fatigue/risk hooks, golden geometry, full #86 and final-RC rows UNVERIFIED until owning builds and single complete-RC gate.
- No push, PR comment, external message, source commit, or release action performed.

## Evidence

Logs and exit files: `qa/m5/review-pr104-evidence/{tsc,targeted,full,mutation-red,mutation-green}.*`; remote snapshot `remote-pr-final.json`; head `head.txt`; runner scripts retained. SHA256 for this review is stored separately in `review-pr104-evidence/review.sha256` to avoid self-reference.
