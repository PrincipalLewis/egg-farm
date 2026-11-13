# HANDOFF: Hire2/v5-pause-ui

**TASK Hire2/v5-pause-ui:** pause toggle/banner UI per pause v1.3.17 7536acfa (write scope: src/ui pause surfaces + tests on own branch; this folder; no Shift sheet / Rest; no tick.ts/workers.ts seam; no `worker_paused` emitter, which is Saves').
**Owner:** Senior Engineer, Sim/TS + UI (Hire 2) · HoE · reviewer Architect.
**STATUS: PARKED** (HoE, D-CEO-20261110-17 clean stop) until the Thu 12 Nov restart. At the restart HoE OKs me to open the Draft PR below myself. Art match + QA slot are queued via HoE.
**Branch:** `wip/hire2/v5-pause-ui` @ `29d6691` (pushed), off rc/v5 `d65391b0`, worktree `/workspace/wt-hire2-pause-ui`. Normal merges of #119 and #132 (d8e278f); no rebase/force. Identity via `git -c` (D-HOE-58).

## Pins
pause v1.3.17 7536acfa · flag table 8b7c3e24 · G0-API rev 6 5225aab8 · SIM-API rev 3 38bfc0d1 · hire-2-spec 7ffa46b9.

## Draft PR body (open as Draft → rc/v5 at restart)
> **Lands after #119 and #132** (both merged into this branch).
> Pause toggle + banner UI per pause spec v1.3.17 (7536acfa), behind the pause flag, only at rc2Refill=0 (D-HOP-2026-11-10-20). At rc2Refill=1 the card routes to the Shift sheet with entry `card` (stub opener until Features lands it).
> - 44×44 toggle, aria-label "Pause/Resume {role}", aria-pressed, focus kept, live region `#pzLive`, reduced-motion shake, debounce from balance.json.
> - Paused pill/sub-line, no yawn/asleep banner while paused, "All workers paused" line.
> - actions.ts: `pause` → `pauseWorker(s,id,b,ev)` (worker_paused via #132), `resume` → `resumeWorker(s,id,b,ev,'manual')` (B5 callLockoutS). Saves APPROVED.
> - `callLockoutView` helper for #116 Rush/Shout.
> **Tests:** full `npm test` 159/159 files, 2383 pass + 1 skip; #132 tests 9/9; flag-off goldens (a01faea, 90a9c84) unchanged; QA-D-1030-ACP1-B covered.
> **Art evidence:** `engineering/tasks/v5-pause-ui/evidence/` (chromium/firefox/webkit × 360/390/1280, probe.log).
> **Open deps:** Features Shift-sheet opener; #116 lockout UI; avatar not shipped (AC-P17 N/A); no pixel-golden runner.

## Next (at restart)
1. Re-read the TASK line + this file; merge rc/v5 if #119/#132 have landed; rerun the full suite.
2. Open the Draft PR with the body above; update the SHA here.
3. Art match / QA via HoE; review fixes.

## Hours left
≈ 4 h used of 8–12; ≈ 1 h left plus review fixes.
