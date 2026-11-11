# EXP1 fix recheck — 246de09c8b329360754cc0d77a6cd6b6788b6ad4 (FINAL, 3 engines, 08:45 Europe/Belgrade)
Runtime build-id m3-rc1-pre+246de09. Ports: 4823 for the main set, 4824 for the reload-after-Got-it add-on. One engine at a time. Lane 1, except the chromium add-on, which ran on lane 2 (load ~1.3).
Pushed: gh/fix/m4-exp1-seen-revert, gh/rc/m4-t3-capped. Diff vs 45eb5e3: tracks-explainer.ts, 1 line.
**Expectation (by design, HoQ 07:51):**
- While blocked, no card and no flag write for the whole session, even after storage becomes writable again.
- On the next writable load, the card shows exactly once and the flag is saved.
- After a reload while still blocked: no card.
- After Got it and another reload: no card, flag persisted in eggfarm.save.
The storage results here supersede the 8396ed1 and 45eb5e3 storage results.

| Check | chromium | firefox | webkit |
|---|---|---|---|
| Storage-blocked: real QuotaExceededError + setItem-throw × canonical committed-unseen + acdbedc-v6 × 360/390 | PASS 8/8 | PASS 8/8 | PASS 8/8 |
| exp-blkreload: canonical, real + mock, 360/390 (blocked → reload while blocked → writable → next load card once) | PASS 4/4 | PASS 4/4 | PASS 4/4 |
| C5b (v6 in-session + canonical committed) | PASS 2/2 | PASS 2/2 | PASS 2/2 |
| A&UX reload after Got it: canonical, real + mock, 360 (no card, count 1, eggfarm.save flag true, tab asserted) | PASS 2/2 | PASS 2/2 | PASS 2/2 |

## Evidence
- exp1-fix-246de09/manifest.json:
  - full SHA, pushed branches and runtime build-id;
  - 150 shot entries (50 per engine, 30 of them from the add-on), all files present, sha256 recorded;
  - asserted_tab=collection on every entry;
  - per-case records for the blocked, blkreload and cardreload runs.
- Shots opened and checked against the manifest state, canonical 360, real + mock, all 3 engines:
  - 1-blocked, 1b-reload-still-blocked and 2-writable: "Saving is paused" dialog, no explainer.
  - 3-reload: the "Upgrades got an upgrade!" card, shown once.
  - 4-reload-after-gotit (expcrl-*, 6 shots): no card, normal farm, tab bar intact.
- Each shot is taken right after its own measurement (step(): tab/card/flag/count, then screenshot).
- Scripts: gate5-final-prep/exp-blocked.mjs, exp-blkreload.mjs, exp-cardreload.mjs (new), exp-ro.mjs, run-246d.sh, run-246d-webkit.sh, run-cardreload.sh; regrade.py.
- Logs: exp-*.log, run-246de09*.out.

## Findings
- None new.
- F-8396-1 is closed as by design.
- Observation, no defect: the "Saving is paused" dialog stays up after storage becomes writable again until the user dismisses it.

## Carry-over from 8396ed1 (counts)
EXP1 non-storage 50/50, C5-gate-readonly (re-graded), C5b: PASS in chromium, firefox and webkit.

## Not run
- The reload-after-Got-it add-on ran at 360 only (as requested). 390 and 1280 were not run.
- 246de09 non-storage EXP1 (exp-final): not rerun. It carries over from 8396ed1 because the diff since then touches only tracks-explainer.ts.
- Broader g5 rerun: after the verdict.

## Housekeeping
- run-fix.sh lane fix: lane 2 is now used only when the engine is chromium and the 1-min load is under 12.
- Removed /tmp worktrees qa-fix-8396ed1, qa-fix-45eb5e3 and qa-fix-246de09; no processes were using them.
- /tmp/qa-fix-c9d7523 is left as it is (from the earlier executor, not in scope).
