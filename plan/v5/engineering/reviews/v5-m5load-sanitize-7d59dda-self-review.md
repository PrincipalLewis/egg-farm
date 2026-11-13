# v5 CCR-F4 m5Load Pause sanitiser self-review: fix/saves-v5-m5load-pause-sanitize @ 7d59ddac8f1e5b610ddef4db9c1b62de9799da5a
Senior Engineer, Saves & Persistence · 2026-10-30 · D-HOE-20261030-08 + Saves QA pr87-694468e follow-ups · no rebase, no amend, no push.
Review rule: D-CEO-20261030-01: CCR post-merge if Claude is available, otherwise recorded as 'no Claude review'.

Before: `git fetch`; origin/rc/v5 = 458f74cc76767452c9c980b2fed382bc0e461376 (#87 squash; same tree as 694468e). Commits this round:
- `a202ed1b7c812cbe75123e3c454383cf999b41f3`: --no-ff merge of origin/rc/v5 458f74c into fb4015d.
- `7d59ddac8f1e5b610ddef4db9c1b62de9799da5a`: #87 QA follow-ups (tests/comments only).
Size vs origin/rc/v5 458f74c: 7 files, +109 / −4 = 113 lines. No SAVE_VERSION line. balance.json 0 diff.

## Merge (a202ed1)
Conflict: `src/save/m5-fields.ts` header only. Resolution: both import sets; `anyFlag` with `pause`; #87's `const tc = tcNum`. pauseLoad's tunable
reads now go through the throwing tcNum. Together with `M5_REQUIRED_TC.pause` (validateBalance), a Pause-on balance without
`pause_unlock_farm`/`pause_call_lockout_s` fails at load; at read time tcNum would throw too, so there is never a silent 0. The pauseLoad doc comment says this.
Pre-commit check: tsc 0; 5 files 102/102.
Note: the new F-4 tests use a fixture with both pause keys, so they don't depend on the throw. The validateBalance rejection is covered by `[CCR-F4][F-5]`.

## QA follow-ups (7d59dda): no src change needed
- M1: literal 7-key list in ST-AC18 (sorted compare with `M5_TC_KEYS.streak` + validateBalance rejects each missing key). M1-V3 is killed at 7d59dda and
  survives at a202ed1 (control log), which proves the test.
- ON helper comment fixed. Basket: D-HOE-20261030-07 cited in engineering/reviews/v5-streak-sim-694468e-pr-body.md (both rows + a header note that HoE may PATCH
  the merged #87 body). `rg -i basket tests src/sim/streak.ts` finds no Basket-row reference in test names or comments (only the `basket: 10` fixture), so no change there.

## Checks (7d59dda)
sync-economy --check 0 · tsc 0 · 15 files 266/266 · mutations 11/11 killed (QA streak set S1a–S9 + M1-V3). Control M1-V3 @a202ed1 survived.
Not run: full suite, golden, builds, check-globals, rc0 (load caps).

## Risks / open (unchanged from fb4015d)
- E13 flag-off clearing and the rc2 `rest` mapping are open for the Pause PR.
- The row-8 grep allowlist names `sanitizePausedOnLoad`; FYI Architect/HoE.
- Post-cut follow-up still proposed: `streakOn` → `flagOn(b,'streak')`; move M5_TC_KEYS into M5_REQUIRED_TC.
Manifest: artifacts/v5-m5load-sanitize-7d59dda/results/SHA256SUMS (45 files) sha256 7ae964d4e4237f6970155f0ddaf65f08f5c5b00ba257850a55a36e40df35be43.
Bundles: scratch/bundles/fix-saves-v5-m5load-pause-sanitize-a202ed1.bundle, -7d59dda.bundle (verify okay; require 458f74c + 1a61b36).
