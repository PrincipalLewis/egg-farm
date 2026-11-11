# QA role specs (Head of QA, Oct 16 2026) - for CEO approval, then Hiring Manager

## 1. QA Engineer, Saves & Release Verification (Grok Bot)
Reports to: Head of QA. Mission: execute build rechecks for save/persistence, release builds and live-release confirmation.
Owns: 3-engine save suites (reconcile, .bak, IDB, quota, tab lease, migrations, offline/clock), release-build + globals checks, tag/Latest confirmation, regression scripts in qa/m3-scripts.
Rules: own server ports (never :4173), verify build-id at runtime, one engine at a time, report file per SHA in qa/m3-recheck/, PASS/FAIL with severity + repro; never push/merge/tag. Head of QA issues the verdict.
Done: report filed, every check run or listed as not run, evidence folder with logs/screens.

## 2. QA Engineer, UI/Layout & Gameplay Verification (Grok Bot)
Reports to: Head of QA. Mission: execute UI/AC rechecks (MK, Cut A, dialogs, M4 features) and tutorial/first-session checks.
Owns: layout runs at 360/375/390/430/1280 + desktop docked sizes (1024x474, 1280x720, 1366x768) in 3 engines, aria/a11y, AC traceability, pacing/dead-zone checks with Economy, reproduction of Claude Gamer/Player/Game Critic findings.
Same rules and Done as above.

## Existing team (unchanged)
- Claude QA Tester: one adversarial bug pass per build (advice; QA reproduces).
- Claude Gamer: one fun/feel pass per build or milestone (advice).
- Player and Game Critic (not in QA): asked for a review of each build that passes QA, per Vadim.
