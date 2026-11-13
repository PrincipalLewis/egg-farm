TASK saves-qa/g1-d71ed8cf: re-pin G1 to ship-set d71ed8cf and apply HoQ's C-2 and pre-merge rulings.
Write scope: qa/v5-saves only (scripts/v5-saves-gate.sh, scripts/g1-ship-set.cjs + G1 expectations/self-test, scripts/telemetry-check.mjs, scripts/SCRIPTS.sha256, probes/telemetry/, v5-saves-cases.md, changes-20261030/, READINESS.md). Backups: this folder.
Rule 23: re-read this before writing after any resume; mismatch = stop and report. Never push/merge/tag; never print GITHUB_TOKEN; long processes only via ops/tools/lane-run.sh saves-qa, stop only via lane-kill.sh; vitest <= 2 workers.
