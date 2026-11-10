# HANDOFF — HoP/gate-build-BG5-BG4 round 3 (QA-D-1110-BG54CERT + D-HOP-2026-11-10-06) · Tue 10 Nov 2026 ~00:35 CET (Europe/Belgrade)
TASK (reread before writes): TASK HoP/gate-build-BG5-BG4: repair v3 of the BG5/5b ref verifier per HoQA review QA-D-1110-BG54CERT (+ HoP steer D-HOP-2026-11-10-06 file authority).
WRITE SCOPE: /workspace/egg-farm-studio/scratch/post-l10/gate-build/repair-bg5-bg4/ only (the brief said product/scratch/…; resolved to this real path by the v2 manifest sha 6dca41fa…a668).
Prior HANDOFF (v2, db0e2c7a…3314) reread before the first write: same task, owner and scope. No mismatch. v2 frozen as manifest.v2.sha256 / REPAIR-REVIEW.v2.md / HANDOFF.v2.md.
INTEGRITY: gate-build f07f8e42…e3e168 and repair-bg12 0cb318de…bfb6, 0 failures at start and end. s00-base metrics.json = 89014e81… (read only).
FORBIDDEN observed: no decisions.md/qa/pinned-dir writes, no analyze/compare runs, no screens/tuning/600-run/B4/flags-on/pins, no messages sent.

## STATUS: BG5/BG5b v3 READY FOR HoQA CHANGED-FILES RE-REVIEW — STOP
- Verifier rule: exact leading `##` token outside fences, in its own authority file, defined once. B4 manifest needs non-empty integer seeds and a harness sha that matches the file on disk. Synthetic mode reads no live decisions file.
- Suite: 219 tests OK, serial (pkg 110 + top-level 109). Mutants: 47/47 killed.
- repair-bg12 suite verbatim: 108/110, the same 2 expected failures. Proofs: baseline 6 / pkg 0.
- HoQA probes on a temp copy: every NOT-PASS probe is fail-closed and nothing became PASS. The 5 controls are fail-closed under D-HOP-11-10-06 (single-file layout).
- Live read-only check: QA-D-1106-GATEBUILD-R2 resolves only to its own qa/decisions.md heading.
- N-1 (test_csvcheck.py in the table) and N-3 (cf37ff30 correction) fixed in the docs.
- For HoQA re-review: pkg/csvcheck.py, pkg/mutate.py, tests/test_bg5_verify.py, tests/test_bg5_v3.py, tests/decfix.py (and pkg/tests/test_csvcheck.py, unchanged since v2). See REPAIR-REVIEW.md §2.
- Open: the HoP choice of FAIL vs CONDITIONAL-UNMET verdict string; harness-of-record pin; QA-D entries must be `##` headings in qa/decisions.md; BG3.
- Deliverable: `manifest.sha256` (v3), `sha256sum -c` gives 0 failures at freeze.
