# HANDOFF: standard verification command (`npm run verify`)
Status: GO, D-CEO-20261027-02 (20:44 CET). **accepted** by Senior Software Architect 205f4268, 2026-10-27 20:50 CET (rule 3/15). Studio tooling only. Conditions: NO diff to src/, sim, economy or save code (any such need goes back to CEO via HoE); no Latest swap; ONE PR, usual CI + CCR; no secrets/PII in outputs.
Owner: Senior Software Architect 205f4268 (owns harness). Accountable: HoE. Reviewer: CCR 5c46fe73. Size: ~1.0-1.5 dd.
Origin: Vadim's idea via Researcher And Improver, relayed by HoOps.

## Goal
One command every engineer attaches to every PR, QA runs instead of re-reading code, and CCR / UI QA cite.

## Interface
`npm run verify -- --hours N [--seed S] [--profile idle|m5x-casual] [--flags k=v,...] [--out dir]`
Defaults: seed 1, profile idle, flags from balance.json, out `verify-out/<buildId>/`.

## Definition of done
1. Builds the single-file HTML (`build:html`) from HEAD; records build id (`m4.1+<sha>`, `+dirty` flagged) and the asset sha256.
2. Fast-forwards N hours of seeded play through the real fixed-step sim (same tick order as the build, D-HOP-41), headless, no wall clock. Deterministic: two runs at the same SHA, seed and flags give byte-identical JSON.
3. Writes `verify.json`: schema version, buildId, sha, asset sha256, seed, hours, profile, flags, and at checkpoints (1 h, then every N/4) eggs, coins (cents), farm/hens/eggValue/collection levels, worker states, plus the AC7 trace hash and the flag-off golden comparison (f90d1678 / a54c9cf9) as pass/fail.
4. Loads the built HTML with the end state in headless Chromium (Playwright, already a dev dependency for rc0) and saves one 390x844 `verify.png` showing the build label (Settings label 'Egg Farm m4.1+<sha>' accepted by HoE 2026-10-27; no src/ui change).
5. Exits non-zero on build failure, NaN/Infinity/negative values, golden mismatch with flags off, or a missing build label.
6. Runs in under 3 minutes for `--hours 24` on CI. A CI job `verify-smoke` (`--hours 1`) runs ONLY on ready-for-review PRs and workflow_dispatch, never on every push; it uploads the outputs as an artifact and stays non-required until HoE flips it.
7. Docs: a `scripts/README.md` section and a PR-template line: "verify: attach verify.json + verify.png".
8. In the same PR, as a separate commit: retire duplicate one-off scripts (screenshot-m2/m3/nest/post-rc1, ac14, rc0 one-offs, recovery-v11) only if verify or rc0 covers them; list each one as kept or removed in the PR. Re-add `measure:l30plus` to package.json or fold it in as `--profile l30plus`.
9. No secrets, tokens or personal data in outputs (public repo).

## Checkpoints / retries
Save progress here. Max 2 retries per step, then escalate to HoE.
- 2026-10-27 20:50 CET CP0 accepted. Worktree /workspace/wt-ver1, branch tools/verify-cmd off origin/main d1fb206. Plan: scripts/verify.ts (vite-node) + scripts/verify-shot.mjs (Playwright Chromium) + tests/verify.test.ts; separate workflow .github/workflows/verify-smoke.yml; retire commit second.
- 2026-10-27 21:00 CET CP1 implemented: 2dfedbe (verify + tests + verify-smoke.yml + docs), 31e1538 (retire 8 scripts, measure:l30plus restored). No src/data diff. Next: gates, --hours 24 sample, push, Draft PR.
- 2026-10-27 21:15 CET CP2 Draft PR #71 https://github.com/PrincipalLewis/egg-farm/pull/71, head 31e1538. Gates green locally; ci.yml skipped on the draft by design, so verify-smoke has not run. Samples: /workspace/ver1-samples/verify.json + verify.png (--hours 24, PASS). DoD 1-3, 5-9 met. DoD 4: met using the Settings label, because no HUD label exists in src. DoD 6: CI time not measured yet (verify-smoke runs on Ready). Next: CCR 5c46fe73 review via HoE.

Checkpoint 2026-10-27 21:15: PR #71 Ready at 31e1538, sent to CCR.

Checkpoint 2026-10-27 21:26: HoQA Major on verify end-state save marker (qa/bugs/T-goalpill.md). Fix commit pending; CCR gates on the new head.
- 2026-10-27 21:27 CET CP3 QA-D-1027-GOALPILL fix committed (saved-end-state marker), m5x-casual message per HoE (3). Next: full gates, push, 24 h samples, verify-smoke timing.
- 2026-10-27 21:50 CET CP4 CCR #71 m1/m2/n1/n2/n3 fixed in 53c7136 (on top of the goalpill fix 0dcf590). PNG stable 4/4 locally. Gates running; then push, 24 h samples.
- 2026-10-27 21:55 CET CP5 pushed 53c7136. Gates green. Samples regenerated (PASS; PNG "All upgrades done!" and byte-identical over 2 runs). DoD 6: verify-smoke on Ready (31e1538) succeeded in 39 s total; the verify step took 20 s for --hours 1. --hours 24 on CI has not been measured (smoke runs --hours 1); locally it takes about 21 s.

Checkpoint 2026-10-27 21:58: fix head 53c7136 (0dcf590 + 53c7136). Sent to CCR for re-check and to HoQA for the GOALPILL re-run. verify-smoke dispatch hours=24 run 40582323417 (DoD 6 timing).

Checkpoint 2026-10-27 22:02: HoQA PASS on the GOALPILL fix @53c7136 (QA-D-1027-GOALPILL-V); QA scripts pinned. Waiting on CCR re-check + CI.

DONE 2026-10-27 22:15: merged as 0a20e485. DoD 6 measured: 24h verify step 27 s on CI. Follow-up VER-1a open.
