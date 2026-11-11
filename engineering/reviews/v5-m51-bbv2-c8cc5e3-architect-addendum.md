# #100 v5-m51-bbv2: Architect F3-fix delta addendum at c8cc5e3

Date: 2026-11-05 ~23:50 CET · Lane: architect · Prior: v5-m51-bbv2-e7f3ca7-architect-addendum.md (HELD; FAIL on F3-no-literal; M1/M2 content findings)

## Verdict: content PASS (delta) at exact c8cc5e3f2e10e14627edad1cce5684d53b8d1c76. F3 blocker B1 CLOSED locally
This is NOT final merge approval. The hosted gate (run 42123690754) was still IN PROGRESS at my last read, and QA has no verdict at this head. The flip stays held.

## Identity
- origin v5-m51-bbv2 = pull/100/head = c8cc5e3. Fast-forward: single parent e7f3ca7.
- Author: Generalist, 23:41:54 CET. Message: "fix(bbv2): F3-no-literal — zeroGainUiOn helper (no raw flagOn in best-buy/next-goal)".
- PR #100 is open and not draft, base rc/v5 844f8e15. 31 files, +1129/−68.
- Delta e7f3ca7..c8cc5e3: 4 src files, +9/−7. No test file changed.

## Delta review
- config/flags.ts: adds `zeroGainUiOn = (p) => flagOn(p, 'zeroGainUi')` next to `bestBuyV2On`.
- econ/best-buy.ts (rankable) and ui/next-goal.ts (shipEmpty): `flagOn(b, 'zeroGainUi')` → `zeroGainUiOn(b)`. This is a pure substitution with an identical definition, so behaviour is unchanged.
- ui/zero-gain.ts: its local `zeroGainUiOn` definition (same body) is replaced by a re-export from config/flags. There is a single source, and existing importers (appPicker etc.) are unchanged. tsc is 0.
- Layering: econ now imports only config/flags, and there is still no econ → ui import. OK.
- F3 test and NAMED_OK are NOT weakened: tests/ is byte-unchanged e7f3ca7..c8cc5e3, and NAMED_OK, NEUTRAL and M5_FILES are as before.
- Observation n2 (latent, not a blocker): F3 auto-scopes files that call `flagOn(`. Its scope went from 9 files (e7f3ca7) to 6 at c8cc5e3. best-buy.ts and next-goal.ts drop out, and so does **ui/zero-gain.ts**, which had been scanned since rc 844f8e15.
  - I ran the F3 scan logic on zero-gain.ts at c8cc5e3: 0 bare literals. So nothing is masked today.
  - Going forward, literals added to zero-gain.ts would no longer be caught. This is the same pre-existing gap that the `bestBuyV2On` helper pattern has.
  - Optional hardening for the F3 owner: add the helper-reader files to M5_FILES. Not required for this PR.

## Evidence: NEW at c8cc5e3 (worktree /workspace/wt-arch-review100-c8cc5e3, clean before and after, Node v20.19.2, lane-run architect, flock + nice 10, maxWorkers=1)
- npm ci 0, tsc 0.
- Focused: **32 files / 433 tests pass**, including **v5-f3-config 28/28** (B1 closed locally; it was 1 failed at e7f3ca7). Also bbv2-m1/m2/parta/qapicker/qe2/sim/telemetry, v5-breeds*, zg-*, the v5-f* suites, v5-f3-qa-seam, m4a-flag-off, telemetry-schema, and goldens flagoff a01faea + m4on 90a9c84.
- AC14 seeds 1–3: CONFIRMATORY suppressedAffordable 0, DECISIVE 334. Identical to e7f3ca7.
- build + build:html EXIT 0.

## Evidence CARRIED from e7f3ca7 (not re-run, per HoE). Justification: the delta is a definition-identical rename of the zeroGainUi read; income.ts, breeds-hatch.ts, pick-hysteresis.ts and tracks-ui.ts are untouched, and tests/ is unchanged.
- M1 probe: 129,024 states, 0 hatch cost/charge/step diff across the 4 flag configs (control 92381ed: 9,364).
- M2 probe: 72,000 states × 4 configs. pathBad 0, no regression outside ship-empty, planner Q-E2 diff 0.
- Slow seeds 1–200 (run at e7f3ca7):
  - AC9: 0 / 42,737.
  - DECISIVE: 25,297, unchanged.
  - CONFIRMATORY: suppressedAffordable **0** at all Farms.
- Logs: scratch/architect/review100-e7f3ca7/ (SHA256SUMS cd947a6c…4631).

## Prior findings status at c8cc5e3 (unchanged by this delta)
- B1 F3-no-literal: **CLOSED** locally. Hosted confirmation is pending.
- M1: content CLOSED. Flip prerequisite only.
- M2: core CLOSED. D-HOP-14 flip ACs still open:
  - N1: breeds-on BR-BB4 "Hatch" target is missing (AC4).
  - N2: the 18-state diagnostic is a reconstruction (960,329, not the real 18). The real dump, or a HoP/QA decision on AC5, is needed.
- N3 copy: "All upgrades done!" while capacity rows are still purchasable. For PM/UI QA at 360 on 3 engines.
- n1: hatchEstimate dev hook still uses Q-E2 income. Nit.
- Prior Minors:
  - m1 (FARM label truncator): OPEN.
  - m2: CLOSED.
  - m3, m4: OPEN, non-blocking.

## Hosted (read-only, exact head_sha c8cc5e3; last read 23:47 CET)
- **gate run 42123690754: IN PROGRESS. No SUCCESS cited.**
- pacing-x1 shards (optimal, casual, seller15; run 42123690653) and K10 monitor (42123690639): IN PROGRESS.
- I did not poll further.

## Gates and remaining holds
- **Merge at flags 0** needs:
  - the hosted gate SUCCESS at exactly c8cc5e3
  - the X1 shards with the expected pattern (summary red only on the RC row)
  - K10 known-red non-required
  - QA's exact-head verdict, which is not replaced here
- Architect content is PASS at this SHA, conditional on those.
- **Flip of bestBuyV2: HELD.** It needs:
  - D-HOE-38 SIM-only flag list (Architect, not started)
  - N1 BR-BB4 breeds-on Hatch target, or a HoP/HoE scope ruling
  - N2 real 18-state dump, or a HoP/QA AC5 decision
  - N3 copy + m1 UI QA (360, 3 engines)
  - Econ/HoQA flag-on goldens (BB-AC13)
  - HELD-flip diff/seam pin
- No code/PR post/Ready/push/merge/messages done.
