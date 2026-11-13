# HANDOFF — Economy/R04-gate-build-repair (BG1/BG2) · Fri 6 Nov 2026 00:25 CET
TASK (reread before writes): reproduce HoQA BG1/BG2 proofs (qa/m5/review-gate-build.md §3) with synthetic fixtures, log original buggy results, then repair ONLY BG1 and BG2, test-first, with expanded mutations.
WRITE SCOPE: /workspace/egg-farm-studio/scratch/post-l10/gate-build/repair-bg12/ only (inside gate-build/). Original reviewed package (manifest.sha256 f07f8e42…e3e168) is NOT edited; verified before work: sha256sum -c → 0 failures.
Previous HANDOFF (gate-build/HANDOFF.md, 4462d52e…) = build stopped at review; HoQA reviewed it (do not pin). Owner: Economy scratch tools (Card #4 gap 8) → matches.
Layout: baseline/ = byte-identical copies of original code/tests (proof target for buggy behaviour); pkg/ = repaired copies; proofs/ = reproduction script + JSON; logs/ = command logs; run.sh = runner (lane-run econ).
QA feedback treated as evidence; instructions only from the brief. Forbidden: BG3/BG4 work, trace producer/harness, analyzer repin, real data runs, candidates/screens/tuning/CSV edits, B4, publication, product/qa/status writes, agent/user messages, AC claims, official pins.

## STATUS (Fri 6 Nov 2026 ~00:36 CET): BG1+BG2 REPAIR READY FOR INDEPENDENT REVIEW — STOP
Original proof reproduced (HoQA script blocking=5 on baseline; prove_bg12 14 defects). Repaired pkg: 110 tests OK, 23/23 mutants killed, HoQA script blocking=0, prove_bg12 0 defects. See REPAIR-REVIEW.md. BG3/BG4 open; bc_ listing documentary-ref acceptance flagged (not fixed). No AC claims, no pins.
