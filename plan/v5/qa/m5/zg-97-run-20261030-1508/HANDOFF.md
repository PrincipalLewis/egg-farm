# HANDOFF — zg-97-run
TASK HoQA/zg-97-run: Run the #97 ZG cases (ZG-AC10, ZG-AC14, ZG-AC19, ZGU-UI1) on rc/v5 0ad018de at flags 0, and report each case as PASS/FAIL/BLOCKED/UNVERIFIED with an evidence sha.
Owner: UI/Layout QA engineer (UIQA), issued by Head of QA 15:07 CET 2026-10-30.
Write scope: /workspace/egg-farm-studio/qa/m5/ ONLY -> this folder (qa/m5/zg-97-run-20261030-1508). /tmp scratch allowed, must be listed in REPORT.md.
Lane: uiqa-zg97; port 5291+ (never :4173). Locks: .browser-test-2.lock (Chromium, load<12) / .browser-test.lock; never .browser-test-3.lock.
HoE D-HOE-38: no confirm=1 (BLOCKED-FIX); P8 rows UNVERIFIED; flag-on UI BLOCKED (Architect SIM-only flag-list PR).
On resume: re-read this file; stop on task/owner/scope mismatch.
Started: 2026-10-30 15:08 CET
