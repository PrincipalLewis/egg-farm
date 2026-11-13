# HANDOFF — HoP/gate-build-BG5-BG4 v3.1 (D-HOP-2026-11-10-10, amends -06) · WIP CHECKPOINT · Tue 10 Nov 2026 ~00:52 CET (Europe/Belgrade)
TASK: v3.1 delta of the BG5/5b ref verifier per D-HOP-2026-11-10-10. WRITE SCOPE: this folder only. HANDOFF v3 (496cad0d…) was reread before writing; no mismatch.
**PAUSED per D-CEO-20261110-04 (usage guard). NOT FROZEN.** The last frozen state is still v3: `manifest.v3.sha256` (fbc2a4f5…525e, 149 entries), `REPAIR-REVIEW.v3.md` (86285d68…), `HANDOFF.v3.md` (496cad0d…). `manifest.sha256` was NOT regenerated: it still holds the v3 contents and does NOT match the files on disk now. Do not treat it as a v3.1 freeze.

## Done (all runs serial via lane-run econ; no lane job running)
- Rulings implemented in pkg/csvcheck.py:
  - (1) Unverified refs make P5IB/FAM **FAIL**. CONDITIONAL-UNMET is kept only for the non-ref breeds=1 CAP item.
  - (2) Authority by EXACT path under `decisions_root` (default /workspace/egg-farm-studio; none in synthetic mode): D-CEO → decisions.md; D-HOE → engineering/decisions.md; QA-D → qa/decisions.md; D-HOP/D-PMW/D-COL/D-ECON/D-PMFU/D-PMM → product/decisions.md.
    - An unknown prefix FAILS.
    - The product/workers mapping is removed.
    - The legacy `decisions_paths` file list now always FAILS.
    - New `resolve_entry()`. CLI `--decisions-root` replaces `--decisions`.
  - (3) R-1 harness: `R1_HARNESS_PIN=None` / `--harness-pin`. With no pin, P5IB reads **UNPINNED** (never PASS). A pinned mismatch FAILS; a pinned match gives PASS (harness_status PINNED).
- TDD: RED log `logs/bg5-v31-red` (errors on the new API), then green.
- Latest suite `logs/green-v31-3`: **PASS: 258 tests** (pkg 110 + top 148; test_bg5_v3 has 123 tests, incl. named G1/G2/G3 gate tests).
- `logs/mutate-v31-2`: **57/57 mutants killed**. That covers the 47 v3 mutants (8 re-targeted to the new code) plus 10 v3.1 mutants.
  - The run was on the code before the G1/G2/G3 tests were added. Those tests only add tests, with no code change.
- `logs/bg12suite-v31`: 108/110 (same 2 expected failures). `logs/proof-v31`: baseline 6 / pkg 0.
- HoQA probes, on temp copies inside this folder (TMPDIR in scope; deleted after):
  - **Old probe (a12ac3f8)**, `logs/qa-probes-v31`: every NOT-PASS probe stays not PASS. The 5 PASS-controls FAIL because they use the legacy single-file API.
  - **New probe (51ebf5e7)**, `logs/qa-probes2-v31`: unchanged, 56 probes. 0 NOT-PASS→PASS. Its 8 PASS-controls FAIL because they use the legacy decisions_paths dict. T10-3 gives FAIL rather than UNPINNED for the same reason.
  - **New probe via `proofs/probe_adapter.py`**: this only maps an exact-path role dict to decisions_root.
    - ADAPT_PIN=none: the 7 P5IB controls read UNPINNED and the FAM control reads PASS. T10-3 = UNPINNED ✔. 0 bypasses.
    - ADAPT_PIN=fixed: 0 hard fails. The only "GAP" is T10-3, because that run supplies a pin.
- Live read-only check (`logs/live-resolve-v31.log`):
  - All 43 live `## D-PMW-` headings in product/decisions.md resolve. D-COL 31/31, D-ECON 2/2, D-CEO 25/25, D-HOE 60/60, QA-D 58/58 resolve.
  - D-HOP 86/87: only D-HOP-2026-10-24-11 fails (a duplicate heading).
  - QA-D-1106-GATEBUILD-R2 → qa/decisions.md ✔. The 53 D-HOE headings in the qa/m3-recheck evidence copy are never read.

## Files changed vs v3 copies (old → new sha256)
- pkg/csvcheck.py f3fab56e… → bc464c981f08dc82542a7cc3331fa91934eb8e703bce43788cbf1a57a66efd92
- pkg/mutate.py 1efbda55… → e4d2d3ca883fd6771061f6a27514dc749b4fe09c2439e3b80683b8994c01dafc
- pkg/tests/test_csvcheck.py 28b9b847… → 75783284c32ecaa6a7f360211a7e6a3ca66d286a7b666062a754f6f5736b9479 (L209/L266 CONDITIONAL-UNMET→FAIL only)
- tests/decfix.py 4ffc8d89… → 15e37c93042994c9a57b971439dc227a4da75d9f04a4859e19ce059b267bf068
- tests/test_bg5.py 1b23b955… → b418cc91595c96db68367296c43adc9af047aa02cc1233f42fbf6a3549995cc1
- tests/test_bg5_verify.py 8f0850d9… → cfbfbcbf7c5bed0dec91832d83cd29d8c4f08dc05bd72fb1bbc50237c8ac3afa
- tests/test_bg5_v3.py 6798e288… → 924c40c00c887cdbc365feb2b59206256924634d6974e63f0e1c6852adef8795
- HANDOFF.md (this WIP note)
- New files:
  - copies: manifest.v3.sha256, REPAIR-REVIEW.v3.md, HANDOFF.v3.md
  - diffs: csvcheck-v31.diff, mutate-v31.diff, test_csvcheck-v31.diff, test_bg5_v3-v31.diff (made against HoQA's v3 work copies, read-only)
  - proofs/probe_adapter.py
  - logs/*-v31*, proofs/proof-v31-*.json
- Unchanged: REPAIR-REVIEW.md (still the v3 text), manifest.sha256 (still v3), bg4/, baseline/, run.sh.

## Left to do on resume
1. Rerun mutate once against the final tests (expect 57/57). Rerun the suite.
2. Write REPAIR-REVIEW.md v3.1: a changed-files table v3→v3.1 citing D-HOP-2026-11-10-10, the probe/adapter results, the manifest-count note, and the fact that prove_bg5.py's docstring still says CONDITIONAL-UNMET (the file is unchanged and its check is verdict != PASS).
3. Regenerate manifest.sha256, verify `-c` and the entry count, then FREEZE.
4. Record the count correction: v3 manifest = **149 entries** (`wc -l manifest.v3.sha256`). The v3 report's "148" was my miscount (`wc -l` printed 149).
5. HoP: harness-of-record pin (-03) still pending, so a real P5IB can at best reach UNPINNED.

Integrity: gate-build f07f8e42… and repair-bg12 0cb318de… were 0 failures at v3.1 start (see end-of-pause check). s00-base was read only. No decisions/qa/pinned writes, no analyze/compare, no messages.
