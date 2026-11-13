# HANDOFF — Economy/MRINTERP2-harness
Task: Economy/MRINTERP2-harness. Owner: Economy. Authority: D-HOP-2026-11-05-12.
This is a new implementation handoff, not a continuation under the audit-only HANDOFF at cycle-MR-accounting-audit (read; left unchanged).
WRITE SCOPE: scratch/post-l10/cand/tools/ MR sampler changes only; this diagnostic folder for snapshots, tests, diffs and reports.
Signed design: MRINTERP2 §2.1–2.2 definition (a) only. Extract the unchanged MR predicate/stretch into a local sampleMR(t); call on non-check-in integers and immediately after sellAll/drain on check-ins. Keep other affordability counters, buys, RNG, broody credit and configuration ordering untouched. No purchase reset.
Plan: verify authority/errata/predecessors; preserve predecessor; write timing/dedup regression tests and observe RED; minimal sampler edit; observe GREEN; diagnostic ordered-buyLog identity on unchanged R04 optimal 1–20 plus known old FAIL seeds and 130; identify flags-on consumers; exact diff, hashes and RESULT for HoQA review.
All named pins verified before this file was created. No matching pre-existing task folder/HANDOFF existed. No repository/worktree changes: these are existing box-local scratch harness files.
NO full 200×3 re-screen, NO B4, NO CSV/tuning/canonical/product/qa/repo writes, NO publication. Not activated until HoQA exact-diff review/pins. Diagnostic runs are not certification.

## C-1 amendment pass (QA-D-1105-MRHARN, 2026-11-05 ~22:45 CET)
HoQA ACCEPT-WITH-CONDITION, review qa/m5/review-mrinterp2-harness-c725da8b.md sha256 fbf90626d12f40e6a40676153fa9aaf5e191dde81b9093cafd602df38cf860d6 (read-only; not edited).
WRITE SCOPE (this pass): cand/tools/ and this folder only. gate/ OUT OF SCOPE (C-2 documented only). No CSV/tuning/B4/re-screen/product/qa writes.
C-1: move check-in sampleMR(t) to directly after `credit('broody', nest)`, still before pause/manage/buy. Predecessor c725da8b preserved as m5mr.c725da8b.ts. New m5mr.ts 6abe6f19ac0f7a7acbf2745ab7ed0b3a2b2b8967c75f8816f18bc9feaa773c18.
Test-first: sampler-timing.test.cjs gains C-1 nest-credit test (RED on c725da8b: test-red-c1.txt; GREEN 4/4 on new: test-green-c1.txt). Prior test copy: sampler-timing.test.c725da8b.cjs.
Parity: run-parity-c1.sh via lane-run.sh econ (one heavy process completed; an earlier launch exited at startup on a relative-path error before any sim). Not activated until HoQA re-pin.
