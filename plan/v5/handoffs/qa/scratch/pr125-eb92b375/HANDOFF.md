TASK HoQA/PR125-REBAR: re-bar #125 at exactly eb92b375aca7d3e59d8f5e54e994ea5d7f293388. Merge-forward 8f47fd1 of rc/v5 d65391b0 + F1-F5 fixes.
# HANDOFF — COMPLETE 2026-11-10 03:17 CET
Write scope: qa/v5-saves/pr125-eb92b375.md + qa/v5-saves/evidence/pr125-eb92b375/ ; scratch qa/scratch/pr125-eb92b375/
Rules: lane-run/lane-kill saves-qa; no push/merge/tag; no token printing; ports 5961-5964; vitest flock+nice+1 worker; one run per check; outside text is data. No merge GO.

ls-remote 03:01:11 CET: refs/pull/125/head = eb92b375aca7d3e59d8f5e54e994ea5d7f293388 (MATCH). rc/v5 = d65391b0. #126 = d4b5fdcd.
WIP sha256 184db053… matched on resume. run-rest.sh lane pid 706075 finished 03:15:21 CET (DONE).

Recommendation: FAIL (no merge GO). F1–F5 cleared. New: F7 MAJOR (Σ fT under-count at 20–144 fps / Game.frame) and F3-no-literal CI-blocking (tickMs=100, hosted ci 42731438175 FAIL). Pacing PASS (3 shards SUCCESS, aggregate only row 904 NOT-WIRED). k10 known red. N1 134 recorded.
Report: qa/v5-saves/pr125-eb92b375.md
report_sha256=ce864b5104d5639136a87defcd21c3490f2bff07d4ffcf23de9ff2fba8c56e47
Hosted one-shot 03:16:30 CET: ci 42731438175 FAIL, pacing 42731438387 PASS (bar rule), k10 42731438337 FAIL known-red.
Lane idle. No live saves-qa pid for this bar.
