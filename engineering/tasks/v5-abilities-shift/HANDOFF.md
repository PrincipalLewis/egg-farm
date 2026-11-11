# TASK ui/v5-abilities-shift-q8 — Shift sheet + Q8 + D-HOE-27 + ability.call

Owner: Senior Engineer, UI & rc1 Fixes
Authority: D-CEO-20261105-01 (resume), D-HOP-2026-11-05-06 (slim F6 for v5), HoE TASK ui/v5-abilities-shift-q8
Written: 2026-11-05 20:32 CET (before any code; standing rule 23)

## Write scope
- `/workspace/wt-v5-abilities-shift` (UI/app/tests only)
- `/workspace/egg-farm-studio/engineering/tasks/v5-abilities-shift/`
- `/workspace/egg-farm-studio/artifacts/v5-abilities-shift/`
- Bundles under `scratch/bundles/` after each commit

No sim changes. No art/product/qa writes. No push / open / edit PRs. Do **not** edit `/workspace/wt-v5-p8-qa-hooks`.

## Specs read (verified this turn)
| Doc | Pin |
|---|---|
| D-CEO-20261105-01 | decisions.md — stop lifted; stale Oct ETAs; one full RC gate |
| D-HOP-2026-11-05-06 | product/decisions.md — v5 P8 carries **slim** F6 attended/overlay for RF-AC16, abilities gap 6, Q-AB-N7/N8; broader #86 → 5.1 |
| art-ux/m5-abilities-flows.md | sha1 **fc1ca17d0013039d37638b49d67763fc1deb2dfe** (§4.2 / AB-UI-7 Q8 compact docked) |
| product/workers/m5-worker-abilities-spec.md | sha1 **12fec4b0…** (v1.3.11 mirrors Q8) |
| art-ux/reviews/m5-refill-axe/sr-markup.md | `.lbl` / `.sr-in` exact-name pattern |
| D-HOE-20261030-27 | `egg:sheetopened` / `egg:sheetclosecomplete` detail exactly `{id,docked}`, once each, after animation; no repeat close |
| Q-AB-N7 / N8 / N16 | qa/m5/test-plan-abilities.md — Shift = menu; closeComplete; CustomEvents + globals allowlist |

## Required behavior (build contract)
1. **Shift sheet attended:** `registerSheet('shift'|…)` → not-attended from `opened()` through `sheetCloseComplete` at **every** width incl. docked; running call **suspends**; cooldowns keep running on **sim time**.
2. **D-HOE-27 / Q-AB-N16:** document CustomEvents `egg:sheetopened` and `egg:sheetclosecomplete`, detail `{id,docked}` only, once per open/close, after close animation; second `closeComplete()` → 0 events. Unit tests at **360** and **docked 1280**.
3. **Q8 (final-RC only):** docked with Refill visible → compact Activate-all visible `N` / `4:51` / `—`, 48 px tall, 8 px right of Refill, full names via inline `.sr-in`, no aria-label, no second row, Refill unchanged. Without Refill → full ≥132 px label. Verify all 3 compact states at 960×600 and 1280×720 (final RC, not interim gate).
4. **ability.call** sound as signed (sfx-ability-call-01..04, gain 0.6, ±15¢, 1 voice, P1 rank 1, ducked, mute). No sim edits; stop/report missing APIs.

## Base dependency — UNBLOCKED (2026-11-05 21:00 CET)
**Slim P8 base verified:**
| Item | Value |
|---|---|
| SHA | `bd641ffc3fd9429494b09fdbe2e70aaab12bcbdd` |
| Branch | `feat/v5-p8-slim` |
| Worktree | `/workspace/wt-v5-p8-slim` |
| Bundle | `scratch/bundles/feat-v5-p8-slim-bd641ff.bundle` (verified) |
| Parent | `origin/rc/v5` `518de30` |

This task branches **`feat/v5-abilities-shift`** from `bd641ff` directly (not full #86 `05a1e01`). Do not edit `/workspace/wt-v5-p8-qa-hooks` or `/workspace/wt-v5-p8-slim`.

## Base tip steering (2026-11-05 21:20 CET, parent)
- Architect review found slim attendance defect: mobile Upgrades open → docked resize leaves attendance suspended (raw state predicate).
- **P8 owns the fix** on the slim tree. Corrected tip will follow; **merge `--no-ff` into Shift when available — never rebase**.
- Do **not** duplicate the app/overlay predicate fix in this worktree.
- Preserve independent Shift `registerSheet` suspension at every width (already in 6dd1f43 / createShiftSheet).
- Shared slim tip reportedly at `eafd08c` (= bd641ff + #99 merge only; **attendance fix not in eafd08c yet**). Do **not** overwrite `/workspace/wt-v5-p8-slim`.

## Status
- **done (20:32):** prior block recorded.
- **done (21:00):** slim base bd641ff verified; HANDOFF unblocked; worktree created.
- **done (21:15 CET):** implemented + committed on `feat/v5-abilities-shift` @ **1ebcd7a** (base bd641ff):
  - D-HOE-27 CustomEvents on registerSheet
  - createShiftSheet attended lifecycle
  - Activate-all compact/full (Q8 / AB-UI-7 / AC-M5A-8/9b/10)
  - ability.call Audio API + assets
  - unit tests in tests/v5-abilities-shift.test.ts
  - bundles: feat-v5-abilities-shift-{6dd1f43,d40e787,1ebcd7a}.bundle
  - body: artifacts/v5-abilities-shift/pr-body-1ebcd7a.md
- **gates:** tsc --noEmit PASS. Targeted vitest under .vitest-eng.lock (retry after 600s timeout #1).
- **blocked:** (1) wait P8 attendance-fix tip (post-eafd08c) then merge --no-ff; do not overwrite slim / duplicate predicate. (2) no sim fireAbility. (3) targeted vitest: 2× flock -w 600 on .vitest-eng.lock timed out (rule 17 cap); tsc PASS; re-run when lock free — no 3rd flock retry.
- **head:** 1ebcd7a on bd641ff. Bundles feat-v5-abilities-shift-{6dd1f43,d40e787,1ebcd7a}.bundle. Body artifacts/v5-abilities-shift/pr-body-1ebcd7a.md.

## Rules
node v20.19.2; `lane-run.sh ui` / `lane-kill.sh ui` only; flock `.vitest-eng.lock` / `.browser-test.lock` (never `-3`); load ≤11 before browser; no Claude processes; commit identity `Senior Engineer, UI & rc1 Fixes <engineering@egg-farm-studio.local>`; bundle+verify each commit; AC-trace PR body; HoE pushes.
