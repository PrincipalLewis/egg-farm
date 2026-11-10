# T-goalpill: goal pill reads "Egg value L21 · Ready!" with Egg value at L30 [QA-D-1027-GOALPILL]
2026-10-27 21:30 CET · HoQA · Triage from HoE (engineering/status.md 21:15). Owner of the fix: HoE (verify tooling), not UI.

## Verdict
- **Latest game build (main d1fb206): NOT A BUG. No player severity.** The pill is right for the state the page actually loaded.
- **Verify tool (scripts/verify.ts + scripts/verify/sim.ts, 2dfedbe/31e1538): Major (tooling).** verify.png doesn't show the run's end state for any M4-on run, so it's weak verify-before-publish evidence. It isn't player-facing and doesn't block Latest. No CEO escalation (it's not Blocker/Critical).

## Repro
1. `npm run verify -- --hours 24` (seed 1, m4.1+31e1538). verify.json end state: F30 H30 V30 C30, Grader tier 5, all 4 workers hired, 210,676,467.01 coins.
2. verify.png (Settings open) shows the pill "Egg value L21 · +6% income · Ready!" and $210.7M.
3. Probe (worktree at 31e1538, tsx, 1 h run, seed 1): `runVerify` end has `tracksV7` **undefined**, V 30. After `save()` → `validate()`, the result is `tracksMigrated: true`, **V 20**, H 30, coins unchanged. Then `selectGoal` gives "Egg value L21 · +6% income", ready, cost 14,397 coins, tab farm. That's exactly the screenshot.

## Root cause
- `sim.ts:61` starts from `initialState(b, seed)`, which has no M4 marker. The real game sets `tracksV7: 1` + `v6BackupId` on every fresh M4 farm (`src/game.ts:87`).
- verify.ts:71 saves `run.end` unmarked. When the built html loads it, `save.ts migrate()` (line 104: `m4On && !state.tracksV7`) treats it as a pre-M4 v6 farm and runs the one-time price-match (M4A-27..29, `migrate-v7.ts`): H = F = 30, and V = the lowest V whose v7 price ≥ the v6 price at F30/C30 = **20**. The refund is 0.
- The UI is correct: `next-goal.ts` labels VALUE as `eggValueLevel + 1` from live state, and `trackLock` drops VALUE at V = maxLevel (30). The label isn't stale, there's no off-by-one, and L30 *is* the cap (maxLevel 30). At the true end state (all MAX, tier 5/5, all workers), `candidates()` is empty and the pill reads "All upgrades done!".

## Player impact
- **Reachable by a normal player? No.** Fresh M4 farms are marked at creation. Real v6 saves are migrated once by design, and their pill then matches their migrated level.
- **Tap:** `openGoal` only switches to the Farm tab and highlights the Egg value row. It doesn't buy anything. In the migrated page state, that buy would be legitimate.
- No progress, money or save loss in real play; nothing misleads the player.
- **Earlier Latest builds:** the pill logic is unchanged. The artifact exists only since VER-1 (2dfedbe), so no earlier Latest is affected.

## Tests
- tests/verify.test.ts (14 cases) has no save → load round-trip check.
- tests/next-goal.test.ts and m41-8-best-chip.test.ts already cover "All upgrades done!".

## Suggested fix (tooling only; HoE decides whether D-CEO-20261025-01 applies)
- In sim.ts, when M4 is on, start from what Game creates: `{ ...initialState(b, seed), tracksV7: 1, v6BackupId: <fixed verify id> }`.
- Alternatively, mark the state in verify.ts before `save()`. Note that changing the sim's start state may move the trace hash, so check the goldens.

## Regression test idea
- verify.test.ts: `validate(save(run.end))` must **not** be `tracksMigrated`, and F/H/V/C, the tier, workers and coins must equal `run.end`.
- Add a verify check `end-state-roundtrip`: shot.mjs reads `#goal .goal-label` and compares it with `selectGoal(run.end)`. A 24 h seed-1 run must read "All upgrades done!".

## Fix re-run: PR #71 head 53c7136 (tools/verify-cmd) [QA-D-1027-GOALPILL-V] 2026-10-27 22:10 CET: **PASS**
- **Setup:** detached worktree /workspace/qa-gp71 at 53c7136ee067ff2a35a045c316272944267fe5c0 (fetched refs/pull/71/head); `npm ci` exit 0. Other checkouts were not touched.
- **Fix (0dcf590 + 53c7136):** `markFreshM4()` in scripts/verify/sim.ts adds `tracksV7: 1` and a fixed `v6BackupId` to the **saved** end state only, when M4 is on. The sim run itself is unchanged.
- **`npm run verify -- --hours 24 --seed 1`:**
  - exit 0, **PASS m4.1+53c7136**, 20.9 s; all 6 checks pass.
  - **Trace 2c0d3ec37be1… is unchanged from 31e1538**, so play didn't change. Goldens: flagOff f90d1678 ok, m4On a54c9cf9 ok. 0 page errors.
  - End state: F30 H30 V30 C30, tier 5, 210,676,467.01 coins.
- **verify.png** (viewed; sha256 8accc527…2388): the pill reads **"All upgrades done!"** with no status chip; the label is "Egg Farm m4.1+53c7136".
- **Independent round-trip (QA tsx probe, 24 h seed 1):** `validate(save(markFreshM4(run.end)))` returns tracksMigrated undefined. F, H, V, C, tier, coins and the set of workers all equal run.end; `selectGoal` gives "All upgrades done!", state done.
- **New tests in tests/verify.test.ts:** 3 round-trip cases (marked end state not migrated and equal to run.end; unmarked end state shows the old V price-match; 24 h seed 1 has nothing left to buy), plus a marker determinism case. All pass.
- **Full suite** (`npx vitest run`): **115 files, 1537 passed, 1 skipped** (an existing skip in serve-own.test.ts), 0 failed, exit 0. 0 retries used.
- **Evidence:** qa/bugs/T-goalpill-53c7136/{verify.json, verify.png, gp71-verify.log, gp71-test.log}.
- **Status:** the verify-tool Major is FIXED on #71 @ 53c7136, and QA can close it once #71 merges. The game is unchanged (it was never a game bug).
