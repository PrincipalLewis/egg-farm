# PR #12 save compatibility @ e7035f7 — SUPERSEDED by 8b1b23b (box reset ~04:43 CEST cut the run)
Completed before the reset (pr12-save-compat-e7035f7-evidence/):
- Save code vs 003ddcc: only comment lines changed (save-diff-003ddcc-e7035f7.patch).
- Unit checks PASS: fixture round-trip, v7 fields, stale-IDB repro, 999,999 cases i and ii, recovery export. Case iii is still the known Minor.
- tsc 0, build 0.
Cut by the reset: vitest (empty log) and all browser runs.
