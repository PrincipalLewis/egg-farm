## Summary
CCR **rcv5-vs-main-1a61b36 F-1** (O-3): bot-m5 layers its own golden / streak / tap-coin / Broody / ability / pause model on the real `step()`/`apply()`, and nothing failed loudly if the matching src `m4.flags.*` were on too. Once a release ships one of those flags at 1, `npm run verify -- --profile m5x-casual`, `windowGate()` and `scripts/bot-m5x.ts` would have run both models silently and double-counted.

HoE triage **D-HOE-20261030-08**: F-1 is minor-latent. It must merge before any M5 flag ships at 1. Owner: Architect, as its own small PR.

Fix, in bot-m5's own area only (`tests/bot-m5.ts`):
- `SRC_M5_FLAGS = ['golden','streak','tapCoins','broody','abilities','pause']` lists the mechanics the bot models itself. It is typed `satisfies readonly M5Flag[]`, so a renamed src flag fails tsc.
- `assertNoDoubleModel(b, K)` uses src `flagOn` (`m4.enabled` and flag === 1). It throws `bot-m5 models M5 itself: its own M5 model (stack on) and src m4.flags.<k> are both on; that would double-count. …` when `K.on` and any listed flag is on.
- `run()` calls it first. `runVerify` m5x-casual, `windowGate` and `bot-m5x` all go through `run()`, so all of them are covered, and the verify CLI now exits 1 with the O-3 reason in `verify.json` instead of the generic exit 4.
- **Flags-off behaviour is unchanged.** It is a pure check, and every shipped flag is 0. `src/`, `scripts/` and data are untouched. Flags the bot does not model (clockWage, UI flags) are not guarded.

## Acceptance criteria
| AC | Criterion | Evidence |
|---|---|---|
| AC1 | With the bot's own M5 model on, any src `m4.flags.*` it models (golden, streak, tapCoins, broody, abilities, pause) at 1 makes `run()` throw, naming the flag | `[F-1][O-3] run()` test (each of the 6 flags) |
| AC2 | The CCR repro (`runVerify` m5x-casual and `windowGate` with `m4.flags.golden=1`) fails loudly instead of returning | `[F-1][O-3] repro` test |
| AC3 | The verify CLI exits 1 with the O-3 reason in `verify.json` | `[F-1][O-3] CLI` test |
| AC4 | No false positives: bot model off, `m4.enabled=0`, all flags off, or only flags the bot doesn't model all still run | `[F-1][O-3] run()` test, either-alone cases |
| AC5 | Shipped behaviour is unchanged (flags all 0); `src/`, `scripts/` and data are untouched | diffstat (2 test files, +54); bot-m5 parity pin 10/10 |
| AC6 | The guard list stays in sync with the real flag names | `satisfies readonly M5Flag[]` (tsc) plus the list test |

## Trace table
| Finding | Commit | Test (tests/bot-m5.test.ts) |
|---|---|---|
| F-1 (O-3) guard list | 27157b0 | `bot-m5: O-3 loud fail (CCR rcv5-vs-main-1a61b36 F-1) > [F-1][O-3] the guarded list is exactly the mechanics the bot models itself` |
| F-1 run() guard | 27157b0 | `… > [F-1][O-3] run(): bot M5 model (stack on) + any modelled src flag on throws, naming the flag; either alone runs` |
| F-1 repro (runVerify / windowGate) | 27157b0 | `… > [F-1][O-3] repro: runVerify m5x-casual and windowGate with m4.flags.golden=1 fail loudly instead of returning` |
| F-1 CLI loud fail | 27157b0 | `… > [F-1][O-3] CLI: verify --profile m5x-casual --flags m4.flags.golden=1 exits 1 with the O-3 reason in verify.json (not the generic exit 4)` |

The guard tests build their balance from `tests/fixtures/economy-b48be8a4.csv` with a sha256 assert (`b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857`, D-HOE-20261030-05). They assert throw / no-throw only, not balance values.

## Gates (local, node v20.19.2, head 27157b0, base rc/v5 458f74c, clean tree)
- `npx tsc --noEmit`: 0
- `vite-node scripts/sync-economy-cli.ts -- --check`: 0 ("balance.json up to date with economy.csv")
- `vitest run tests/bot-m5.test.ts` (eng lock, nice 10, --maxWorkers=1): **10/10 passed**, including the b48be8a4 parity pin.
- `vitest run tests/verify.test.ts -t m5x-casual` (same lock): **4/4 passed**. m5x-casual still runs, is deterministic, round-trips, and the CLI runs with flags off.
- `npm run build` (incl. check-release-build): 0, build id `m4.1+27157b0`
- `npm run check-globals -- chromium` (browser lock): 0, 3/3 PASS. Allowed `["eggfarmExportTelemetry"]`, not allowed `[]`. The port was closed afterwards.
- Red before the fix (test-first, same file): 4/4 new tests failed. `SRC_M5_FLAGS` didn't exist. The repro failed with `expected [Function] to throw an error`, a silent pass. The CLI test failed with `expected 4 to be 1`, the generic flags-differ exit.

## Mutation proof
With `assertNoDoubleModel(bal, K);` in `run()` replaced by a comment (guard removed, rest unchanged), `vitest run tests/bot-m5.test.ts -t "O-3 loud fail"` gave **3 failed | 1 passed**:
- `run()` test: `golden: expected [Function] to throw an error`
- repro: `expected [Function] to throw an error`
- CLI: `expected 4 to be 1`

The one that still passes is the list-content test, as expected. The file was restored, with sha256 c65b9e85… identical to the committed one.

## Note for merge order
B (bot-m5 port, unmerged at 61f7a00) carries its own `assertNoDoubleModel` / `SRC_M5_FLAGS`, plus `SRC_M51_FLAGS` for `rc2`. Whichever lands second gets a textual conflict in `tests/bot-m5.ts` that should be resolved by merge, not rebase. Keep the union: src `flagOn`, B's `rc2` / `SRC_M51_FLAGS` branch, and this PR's message, which contains both "bot-m5 models M5 itself" and "double-count", so both sets of tests match.

Ref: D-HOE-20261030-08 (engineering/decisions.md), engineering/reviews/rcv5-vs-main-1a61b36-ccr.md F-1.

## Self-review (Architect, rule-22 non-Claude review)
- **Boundary:** the change stays in the bot-m5 test tooling. No sim, save, econ, ui or telemetry module is touched, so no design doc is needed.
- **Determinism:** it is a pure check before the sim runs. There is no state, RNG or timing effect.
- **Data-driven:** it reads the real `flagOn` from balance, with no new tunables.
- **Mutation proof:** removing the call fails 3 of 4 tests. The list test is guarded by the type check instead.
- **Risk:** a known text conflict with B, which will be resolved by a union merge in B's rc/v5 merge (see above). No open architecture risk.

Manifest: `artifacts/f1-o3-guard/MANIFEST.md` (sha256 dbb0794ece8200a040be406a8638768791b576885dacb274ae89c9013c23a7ce).

Review: Architect self-review + green gates + Saves QA trace; no Claude review

