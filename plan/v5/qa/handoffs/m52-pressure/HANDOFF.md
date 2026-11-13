# HANDOFF: M5.2 pressure-metric testability
Owner: HoQA. State: **v0.3.1 ACCEPTED, TESTABLE 2026-10-27 21:30 CET.** No message needed (rule 15).
**Goal:** confirm the M5.2 gates PM1-PM3 are testable, and that the P1-P7 text fixes landed.
**Definition of done:** the hash is verified, a snapshot is taken, the diff against v0.3 shows P1-P7 in QA's wording, no bar has changed, the pins match the files, and it's logged.
**Decisions:** [QA-D-1025-PM1] v0.3 7a5928b5 TESTABLE with 7 fixes; [QA-D-1027-PM2] v0.3.1 9c58e58c TESTABLE, nothing to do. PMW's pause:false / waive0:false note is verified in m5px.ts lines 9-10, and QA folds it into the P1 list.
**Files:** product/workers/m5.2-pressure-metric-spec.md; /workspace/snap/pressure-metric-{7a5928b5,9c58e58c}.md; qa/m5/review-m52-pressure-metric.md; scratch/m51-refill/h2/, scratch/m52-press/.
**Dependency (not QA's):** the TS bot can replace the Econ harness only after the M5.1 code, the tests/bot-m5.ts port and parity (§10.3).
**Next step:** at M5.2 test time, run §10.2 (i) byte-identical on a copy of out/o1a, and use (ii) for the port.
**Retries:** 0 used.
