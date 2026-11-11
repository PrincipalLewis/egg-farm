# QA queue: M4.1 re-plan (D-CEO-20261021-01). Reset 2026-10-21 17:20 CEST by Head of QA
Previous queue archived verbatim: [archive/queue-2026-10-21-pre-replan.md](archive/queue-2026-10-21-pre-replan.md). Base main dd223f5. **L30+ is out of M4.1** (moved to M4.2 with D-CEO-16/18/19 unchanged; former rows 6 and M4.1 items 1/5/6 are parked there).

## Intake rule (D-CEO-20261018-01), unchanged
To join this queue a build needs: the full SHA; whether it's pushed and on which branch; the PR number; a list of what changed; and for data changes, the CSV sha256 plus the harness and code SHA. Until CI is green, the interim evidence is local gates on committed scripts at a pushed SHA (D-CEO-15). Nothing goes Latest without green CI.

## M4.1 intake (caps are limits)
| # | Item | Code cap | Gate | QA lane | Status |
|---|------|----------|------|---------|--------|
| 1 | M41-11 lock label (#60 @ 5789805, replaces #54) — **QA PASS 20:15 Oct 22** (m41/m41-11-5789805.md) | 19:00 Oct 21 | m4a-spec v1.24 FROZEN (38e95a5d…): B1-6b, B1-9, B1-10, F4-19 ('Needs Farm L50' / 'Max for this farm' / MAX). N comes from tracks.ts trackCap/trackLock per row. Property test on main data. B1-11 and F4-25 are N/A (no L30+) | UI QA (edb6ef85) | DONE (QA PASS) |
| 2 | M41-10 build-id (#61 @ 33f1538, replaces #53) — **QA PASS 19:40 Oct 22** (m41/m41-10-33f1538.md) | 19:00 Oct 21 | build-id shows the QA-passed SHA with no +dirty | Saves QA (33ec1b55) | DONE (QA PASS) |
| 3 | M41-6 QE-LATE-e | 20:00 Oct 21 | Spec v0.3 FROZEN (c6a37023…). gate4-explainer 17/17. Chromium qe-late-browser QEL-12/13. QEL-7 byte-identical LS/IDB. QEL-8 exactly 2 hits for `rg mirrorOnFail src` | Saves QA | **QA PASS 20:05 Oct 22** @ 1682a0c (#59), m41/qe-late-e-1682a0c.md. FF and WK not run. Rerun on the combined SHA if CSR loadsafe lands on top |
| 4 | M41-8 F3/F4 (#62 @ 09cee47 — **QA PASS 23:16 Oct 22**, m41/m41-8-09cee47.md; Art PASS) + M41-9 (#64 @ 3110e88 — **QA PASS 00:46 Oct 23**, m41/m41-9-3110e88.md; Art PASS @ 9b6fc4a, re-check at RC; #65 @ c877f69 — **QA PASS 05:22 Oct 23**, m41/m41-9-c877f69.md; Art PASS @ c877f69) | 23:00 Oct 21 | UI gate plus Art & UX sign-off at the RC SHA | UI QA | DONE (ALL QA PASS) |
| 5 | M41-7 CSR v0.2.3 incl. IndexedDB must-have (D-HOP-34) (#63 @ 3c86720, code 8694222) — **QA PASS 03:38 Oct 23** (m41/m41-7-3c86720-csr.md; Art PASS @ 8694222) | spec 18:30, code 03:00 Oct 22 | Spec of record product/farm/corrupt-save-recovery-spec.m41-final.md (2fbcd4eb / 530b29d3, D-HOP-23-01 res
…[truncated for evidence; full file unchanged]…
