# HANDOFF — HoP/gate-build-BG5-BG4 round 2 (D-HOP-2026-11-09-05) · Tue 10 Nov 2026 ~00:15 CET (Europe/Belgrade)
TASK (reread before writes): implement BG5 reference verification (test-first) + assemble BG4 replacement evidence (EC-3), scratch only.
WRITE SCOPE: /workspace/egg-farm-studio/scratch/post-l10/gate-build/repair-bg5-bg4/ only. v1 frozen first: `manifest.v1.sha256` = fbb92cb4… and `REPAIR-REVIEW.v1.md`.
Prior handoffs reread: this folder HANDOFF (v1 STOP), repair-bg12/HANDOFF.md. No task/owner/scope mismatch.
INTEGRITY at start: gate-build manifest f07f8e42…e3e168 failures 0; repair-bg12 0cb318de…bfb6 failures 0. Re-checked after v2: both still 0 failures.
FORBIDDEN observed: no production CSV, no decisions.md edits, no screens/tuning/600-run/B4/flags-on/pins, no messages sent.

## STATUS (Tue 10 Nov 2026 ~00:15 CET): BG5 VERIFY + BG4 REPLACEMENT EVIDENCE READY FOR INDEPENDENT REVIEW — STOP
- BG5: `verify_ref` implements D-HOP-2026-11-09-05 (entry ID + authority + artifact sha256). TEMP decisions fixtures only in tests. 135 tests OK; 31/31 mutants killed; repair-bg12 suite 108/110 (2 expected bypass-encoding fails); proofs baseline 6 / pkg 0.
- BG4: PROPOSED on-disk analyze 8f6e4e9b / compare 2b85337d under `bg4/tools/`; `bg4/REPLACEMENT.md`; tables.md reproduced **byte-exact** to 4da712bb… under `bg4/repro/out/`. No repin.
- Incident: accidental rewrite of `cand/sweep/s00-base/metrics.json` during analyze invoke (outside scope); original d6ac395c bytes unrecoverable; values match card. Documented in REPLACEMENT.md §5.
- Open: BG3; HoQA certify BG4 then HoP repin; combined changed-files-only review per rule 25 (HoP asked Econ to send — this task forbade messages; package path below is the handoff).
- Deliverable path: `/workspace/egg-farm-studio/scratch/post-l10/gate-build/repair-bg5-bg4/`
- v2 deliverable: `manifest.sha256` (sha256sum -c failures=0 at freeze).
