# PR #12 save compatibility @ 182b932 — SUPERSEDED by 003ddcc (2026-10-17 03:09 CEST)
Evidence (reused for 003ddcc): pr12-save-compat-182b932-evidence/
- Stale-IDB repro (qa/m3-scripts/pr12-stale-idb-rank.mjs): PASS (it FAILS on bd487ab).
- 999,999 case: unit PASS (i, ii); Chromium PASS (build 182b932 found in the loaded script index-Cwg9SR7w.js; LS 99,999,900 cents kept, stale seq-5 IDB copy lost).
- Main round-trip, 14 fixtures: byte-identical to main. v7 fields: kept. M4-on saveSeq ranking: PASS. tsc 0.
- vitest (2 workers): 680 passed, 2 failed, 1 skipped. Failures: tests/cost-segments.test.ts (Economy's draft economy.f1.csv) and engineering/golden/flagoff-golden.a01faea.test.ts "sim trace". Whether these are pre-existing is checked in the 003ddcc report. m4a-v3-backup passed.
- Open (Minor): case iii, a stale IDB copy with seq 5 against a newer LS copy with seq 2, still restores the stale copy (exact-b-unit.txt).
