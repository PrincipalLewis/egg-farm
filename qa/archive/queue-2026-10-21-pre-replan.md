# QA queue: M4.1 (D-CEO-20261019-11). Reset 2026-10-19 09:10 CEST by Head of QA
Previous queue (M4 B, shipped as m4b-dd223f5 = 246de09 tree) archived verbatim: [archive/queue-2026-10-19-m4b.md](archive/queue-2026-10-19-m4b.md).

## Intake rule (D-CEO-20261018-01)
A build joins this queue only with: **full SHA**, **pushed** (yes/no, branch), **PR number**, **list of what changed**, and for data changes the **CSV sha256** plus the **harness + code SHA** behind every quoted number (HoOps item 2).
A QA capacity yes must name the **lane** and give an **ETA**.

## Active
| # | Item | SHA | Status | Owner |
|---|------|-----|--------|-------|
| 1 | Post-publish smoke on m4b-dd223f5 (egg-farm.html sha256 0bc5bb72…179a4c, build-id m3-rc1-pre+246de09) | dd223f5 (tree = 246de09) | CLOSED: full PASS 3 engines 09:23 (first upgrade CR 15.9 s, FF 16.4 s, WK 20.5 s; L30 cap PASS) | Saves QA (33ec1b55) |
| 2 | Published-build UI: g5 groups, reload-after-Got-it 390/1280, A&UX set (rc0 on local build:qa 246de09) | dd223f5 | RUNNING | UI QA (edb6ef85) |
| 3 | Reviewer passes on m4b (Player, Game Critic, Claude QA Tester, Claude Gamer), one each | dd223f5 | RUNNING since 09:16, due 11:30 → qa/reviews/m4b/ | Head of QA |
| 4 | M4 B test report filed | — | After #3 | Head of QA |
| 5 | CSR spec testability review | spec v0.3.3 sha bca075fe… | CLOSED 10:19: GO carried over to v0.3.3 (CSR-17 → M4.2 if code not pushed 17:15; out of M4.1 if not passed 08:00 Oct 20) | Head of QA |
| 6 | Independent harness rerun before any L30+ gate ruling (retro A2). First: M41-2 reshape before the 18:00 cap; candidate CSV + sha256 + code SHA due to QA by 17:15 | per candidate | STANDING (D-CEO-20261019-14); 2026-10-19 CEST CSV lineage VERIFIED — only guard_heartbeat_s+guard_stale_s removed; 123 kept cols; 31 data rows byte-identical (log: qa/m3-recheck/csv-lineage-c7bb783f/diff.log) | Saves QA (33ec1b55); HoQA reviews |

## M4.1 intake (scope D-CEO-11, verdict + Latest cap 10:00 Oct 20)
| Item | Gate | Status |
|------|------|--------|
| 1. L30+ #45 + L31+ data-only reshape | Code of record a05bc74 (or head after daf9157); D-CEO-16/-18/-19: first difference = L30+ buy or unlock-driven Farm buy, G1–G10 from F28 (F≤30 steps vs main, same harness), C22 frozen; L0–30 byte-exact vs b48be8a4 (123 cols, c7bb783f); L30+ step gate on Architect harness + ≤25% top-step; L10 P95/acw1/AC7 rerun; farm/track caps per data | WAITING FOR INTAKE (reshape cap 18:00) |
| 2. QE-LATE-e | Saves gate4 QE-LATE a–f incl. e | WAITING FOR INTAKE |
| 3. Corrupt-save recovery (CSR v0.2.3) | CSR-1..16 test plan | Spec review first |
| 4. Explainer F3/F4 + A&UX Minors | UI gate + A&UX shots | WAITING FOR INTAKE |
| 5. **Art & UX L30+ UI sign-off** (D-CEO-19; incl. F27→28 goal bubble 'Farm L28: unlocks Hens L31' wording, #54 'Max for this farm') | A&UX sign-off file on the **M4.1 build SHA HoE posts before 17:15** (shots on 846178a/a05bc74 = early evidence only) | REQUIRED for 17:15 handoff; owner Head of Art & UX (e17bab0a) |
| 6. **D-CEO-19 unlock-driven first-difference check** | Architect harness addition on arch/l30plus-bundle-check off a05bc74 (per seed: cand kind 'f'; winning depth-3 bundle has hens/eggValue toLevel>30; counterfactual capped-30 result as evidence; 4-way summary, 'other'=0). QA checks: trace hashes 200/200 = a05bc74 (observational only), then rerun independently | HoQA confirmed checkable 10:40; harness SHA due ≤12:00 (HoE) / 13:00 cap; owner Architect → Saves QA rerun |

## Release rule (D-CEO-20261019-13, from M4.1)
Verify-before-publish: HoE posts the built HTML sha256 + build-id with the merge request; Saves QA (33ec1b55) checks both against the QA-passed SHA (no +dirty, tree match) BEFORE the tag goes Latest. Post-publish smoke stays as a re-confirmation.
