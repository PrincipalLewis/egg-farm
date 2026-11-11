# v51-f5-live-balance-fixture: F-5 `on` and PZ are built from the live balance (D-HOE-20261030-05)
Severity: **Minor** | Target: **v5.1** | Owner: **HoE** | Found at: 2d15dacdb45884bf1aabce48ea20e7571fb69d66 (PR #92, base rc/v5 a923206) | Found 2026-10-30 10:54 CET by Saves QA | Ruling: HoQ, 2026-10-30
File: tests/v5-m5load-pause-sanitize.test.ts L5 (`import { balance as b }`), L14 (PZ), L74-75 (`on`). Rule: engineering/decisions.md L322 D-HOE-20261030-05.
Report: [qa/v5-saves/trace-reviews/pr92-2d15dac.md](../trace-reviews/pr92-2d15dac.md) §(4), finding M2.

Repro: shows that #91's F-5 broke on a retune because it read shipped data.
```
cd /workspace/egg-farm-studio/game && git fetch origin pull/92/head && git worktree add --detach ../qa/scratch/wt-pr92-2d15dac 2d15dacdb45884bf1aabce48ea20e7571fb69d66 && cd ../qa/scratch/wt-pr92-2d15dac && npm ci
python3 /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr92-2d15dac/mutate.py T4-revert-to-91-F5-line   # #91's live-balance 'on' line
npx vitest run --maxWorkers=2 tests/v5-m5load-pause-sanitize.test.ts tests/v5-f3-config.test.ts
git checkout -- src tests
```
Expected (D-HOE-20261030-05): a test whose result depends on balance data reads a committed, sha256-pinned fixture, so a retune can't break it. Only tests whose job is to check the shipped data read live files.
Actual: T4 fails F-5 (1 failed / 37 passed). #91's F-5 passed only because the live balance happened to lack the two pause keys, and V5-HOP-1's CSV (10/45) broke it. 2d15dac strips the two keys, which removes that particular dependency. The head file also passes 10/10 on a923206 (12-head-file-on-base.log). But `on` and PZ still spread the rest of the live `b.m4` (flags, tc and every other rule input), so a future retune that trips another validateBalance rule makes F-5 fail with a different message. The failure would be loud, not a silent pass, so this is Minor. `validateBalance(b)` (L78) is a legitimate shipped-data check and should stay on live data.
Evidence: qa/v5-saves/trace-reviews/pr92-2d15dac/30-mut-T4-revert-to-91-F5-line-vitest.log, 12-head-file-on-base.log, 01-commits.txt (PR body: the 33e775e run failed 1 of 10 on F-5).
Suggested fix (test-only): build `on` and PZ from the committed pre-pause CSV fixture **tests/fixtures/economy-b48be8a4.csv**, sha256 b48be8a4…, which has 0 tc_pause_* columns. It is already used by tests/bot-m5.test.ts L14-18/L76 via `validateBalance(buildBalance(parseEconomyCsv(csv), …))` with a `PARITY_CSV_SHA256` assert. Then:
- set `m4.flags.pause = 1`, so the keys are missing by construction with no strip needed;
- build PZ as fixture + PTC {10, 45};
- add the per-key variants from v51-f5-per-key-check;
- keep `expect(() => validateBalance(b)).not.toThrow()` as the only live-data line.
