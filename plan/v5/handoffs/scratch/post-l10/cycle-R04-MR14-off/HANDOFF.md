# HANDOFF — Economy/R04-MR14-off
Task: Economy/R04-MR14-off. Owner: Economy. Authority: HoP GO (relayed by parent 2026-11-05 23:04 CET) + QA-D-1105-MRHARN-C1 (qa/decisions.md L889–893, "C-1 CLOSED, harness re-pinned"; read-only).
New task: NOT a continuation of cycle-MRINTERP2-harness (that HANDOFF read; left unchanged). No pre-existing matching folder/HANDOFF existed.
Goal: official flags-off measurement of UNCHANGED R04 (cycle-2320/R04/candidate.csv d1cff5ac…) under signed MRINTERP2 (a), harness m5mr.ts 6abe6f19 + runmr.ts 2cef8d3a, seeds 1–200 × optimal/seller15/casual, T=4000, runmr flags-off config exactly.
WRITE SCOPE: this folder only (scratch/post-l10/cycle-R04-MR14-off/): run scripts, diagnostic driver/instrumented copy, raw outputs, tables/JSON, RESULT, HANDOFF, pins. Plus mandatory lane-run registration.
OUT OF SCOPE: any cand/tools edit, gate/, CSV, tuning/search, canonical, product/qa writes, publication, B4, flags-on G4, agent messaging.
Method: (1) verify closure + full pins, freeze run manifest BEFORE any run; (2) official outputs from the UNCHANGED runmr.ts (3 invocations, one per profile, exactly as cycle-2320/run-batch.py); (3) separate diagnostic driver in this folder: uninstrumented m5mr.run (reviewed) + a generated instrumented copy (nest log + buyLog only) proven output-identical per run, plus b2deab63 predecessor trace for per-run buyLog/non-MR parity; (4) nest>0 census per HoQA C-1 condition; (5) report MR worst/P95/n>180 and PL-AC3 pacing vs frozen refs. One serial lane process (econ), ≤2 heavy.
NO acceptance/certification/joint claim. Results go to parent only.

## Status 2026-11-05 23:13 CET
Run complete (one serial lane process 1370915 + 1-seed smoke). RESULT.md written; pins.sha256 covers all artifacts. MR flags-off: P95 93/96/98, worst 121/121/133, n>180 0/0/0. PL-AC3 PASS ×3; PL-AC1 (optimal L24 2.223) and PL-AC2 (L17/L24/L27 etc.) miss as written — flagged for HoP/HoQA. nest>0: 0/600 (structural: accrual inside K.on block). Parity 600/600. Awaiting HoQA review. No further writes planned.
