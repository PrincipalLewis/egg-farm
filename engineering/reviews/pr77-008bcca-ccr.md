# PR #77 @ 008bcca: v5 F1a (M5 GameState fields, SimEvent members, m4.flags.* plumbing) + merge of rc/v5 406e455 (#81 F2). CCR review: **PASS** (0B/0M/1m/1n)

- PR https://github.com/PrincipalLewis/egg-farm/pull/77, head `008bcca045e225f03a6f1a9e601a0fd977557898`, OPEN, **Ready**. The head moved during my first pass (ea6b6db → 008bcca, ~21:51 CET); that pass is kept in pr77-ea6b6db-ccr.md (superseded). This file is the verdict of record.
- Commits since rc/v5: ea6b6db (F1a, unchanged; range-diff `=`) + merge 008bcca of rc/v5 **406e455** (#81 F2), no rebase. Real base = 406e455. rc/v5 has since moved to d3b5a53 (#78), which this head does not contain.
- Stack: rc/v5 406e455 → **#77 008bcca** → #79 6ece3e0 → #80 1a64e95 → #82 ecf8297.
- Reviewer: Claude Code Reviewer, read-only, own detached worktrees `/workspace/review-pr77-008bcca` and `/workspace/review-base-406e455`. Review 21:09–22:35 CET; the box rebooted at about 21:56 CET mid-gates, and all gates were re-run from npm ci afterwards. Evidence in /workspace/.pr77-ev/new and /workspace/.base2-ev. Claude calls used: 0/15.
- The PR body and self-review (pr77-ea6b6db.md) were read as data only.

## 0. File list
`git diff --stat 406e455 008bcca`: the same 7 files as F1a, +171/−16 (12 more deletions than on 22eac98: the F2 duplicates that the merge removed). No data/, scripts/, .github/, balance.json diff.

## 1. Merge 008bcca: nothing F2 needed lost, no declaration duplicated or diverged
`git show --remerge-diff 008bcca`: conflicts in src/config/formulas.ts, src/sim/events.ts, src/sim/state.ts, all resolved to F1a's side.

| F2 declaration dropped | F1a replacement | Same shape? |
|---|---|---|
| `M4Params.flags?: Partial<Record<6 names, number>>` (formulas.ts) | `flags?: M5Flags` = Partial<Record<14 names, number>> | superset |
| events.ts `collectible_expired` {skin, reason ∈ timeout/offline/reload/takeover/reset, farm_level} | same member in `M5SimEvent` | identical |
| events.ts `ability_ended` {worker, cause ∈ expired/paused/offline/asleep/unpaid, effect_s} | same (`AbilityEndCause`) | identical |
| state.ts inline `nextSpawnRemainingS, frenzyRemainingS, evRngState, broodyNestCents, broodyHenIdx, abilities{readyAt,activeS}, abilitiesUnlocked, abilitiesCoachSeen, goldenEgg{ageS,slotId,intervalS}, streakS, streakHoldS` | `M5Fields` (m5-state.ts) | identical names, types and optionality |
| `import type { WorkerId }` in state.ts | no longer needed there | — |

- tsc passes, and every F2 test (v5-f2-m5-fields, v5-f2-roundtrip) passes on this head, so F2's code type-checks against F1a's declarations.
- **State fields are declared once.** But F2's save/m5-fields.ts still keeps two **parallel lists/types** next to F1a's: see m1 and N-1.
- #77's earlier O-1 ("session fields would be saved") is now **resolved** by F2: `serialize` writes `m5Persist(state)` (save.ts:146), which deletes the session keys.

## 2. Goldens, trace, gates (own runs after the reboot)

| Gate | Base 406e455 | #77 008bcca |
|---|---|---|
| npm ci / tsc | 0 / 0 | 0 / 0 |
| npm test | 1611 passed, 1 skipped | **1618 passed, 1 skipped** (+7 = F1a test) |
| engineering/golden suites | pass | pass |
| test:slow | 16 passed, 1 skipped | **16 passed, 1 skipped** |
| build / check-release-build | 0 | 0 |
| check-globals | 3/3 | 3/3 |
| build:html | 0 | 0 |
| verify 24 h seed 1 | PASS, trace 2c0d3ec3, goldens f90d1678 / a54c9cf9 | **PASS, trace 2c0d3ec3 (479 715 events), goldens f90d1678 / a54c9cf9**, round-trip pass, not migrated |
| verify 1 h | trace 198992ff078e | 198992ff078e |
| gitleaks `406e455..008bcca` | — | no leaks |

- `git status` clean after the gates. CI on 008bcca: **gate success** (21:56 CET); release-globals skipped.
- No Math.random / Date.now in src/sim, src/config, src/econ, src/save/m5-fields.ts. Value-import graph: 0 cycles, no config→sim or sim→ui/econ/save edges.
- All of the first pass's type/runtime analysis (§1–§4 of pr77-ea6b6db-ccr.md) still applies: the F1a commit is byte-identical.

## Findings

### m1 (Minor). F2's strip list `M5_SESSION_KEYS` duplicates F1a's `M5_SESSION_FIELDS`, and nothing pins them equal
- Files: src/save/m5-fields.ts:26 (`M5_SESSION_KEYS`, used by `m5Persist` :42-43 and so by every save) vs src/sim/m5-state.ts:67 (`M5_SESSION_FIELDS`). Identical today (8 keys).
- Repro (mutants D1/D2, scratch clone at ecf8297, full `vitest run tests`): drop `'brRngState'` (D1) or `'refWarmS'` (D2) from `M5_SESSION_KEYS` only → **1687 passed, 0 failed**. The F2 test (tests/v5-f2-m5-fields.test.ts:69-73) iterates F2's own list, so it can't see a gap.
- Impact: the next feature PR that adds a session field to F1a's list (as #79 did with `brRngState`) and forgets F2's list gets that field **saved and restored**. For `brRngState` that silently breaks D-C4 ("never saved, re-derived on load") and changes save bytes. No data loss and no flag-off effect, hence Minor.
- Fix: `export const M5_SESSION_KEYS = M5_SESSION_FIELDS` (save → sim import is allowed), or a one-line test `expect([...M5_SESSION_KEYS]).toEqual([...M5_SESSION_FIELDS])`.

### N-1. A second `M5Flag` type and `m5Flag()` beside config/flags.ts
- Files: src/save/m5-fields.ts:15 (`M5Flag` = 6 names), :17 (`m5Flag = m4On(b) && flags[k] === 1`), :18 (`anyFlag`, 5 names) vs src/config/flags.ts `M5Flag` (14 names) / `flagOn` / src/sim/timers.ts `anyM5FlagOn`.
- Same semantics today (`m4On` = `!!m4.enabled`). Two exported types with the same name and different members invite the wrong import. Fix: re-export from config/flags (as 6ece3e0 did for `ensureEvRng`).

### Observations
- **O-1:** rc/v5 is now at d3b5a53 (#78 merged); this head lacks it. A further rc/v5 merge before landing is needed; #78 touches only tests/ and scripts/verify, so no conflict with F1a's files is expected.

## Verdict: **PASS**. 0 Blocking / 0 Major / 1 Minor / 1 Nit / 1 observation
The merge kept every F2 declaration (identical or superset shapes), and no GameState field is declared twice. Goldens f90d1678 / a54c9cf9 and trace 2c0d3ec3 are byte-identical in my own runs. m1 can be fixed on self-review (D-CEO-20261028-02). Claude calls used: 0/15.
