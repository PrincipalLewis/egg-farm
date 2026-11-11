## Why (D-HOE-20261030-03)
`tests/bot-m5.test.ts` (from #78) pins `windowGate` output to `41324ef4…`, which was captured from Economy's original `m5x.ts` on `data/economy.csv` **b48be8a4**. The test read the **live** CSV, so any `farm_cost` retune broke what should be a port-equivalence check: Econ's V5-HOP-1 head `bb3f633` gives `0f05e1eb…` instead of `41324ef4…`. Per D-HOE-20261030-03 the test now gets its own fixture copy of the b48be8a4 CSV, sha-checked in the test.

## Change (test-only, no `src/` changes)
- New `tests/fixtures/economy-b48be8a4.csv`: a byte-exact copy of the CSV the pin was captured on.
- `tests/bot-m5.test.ts`: `csvBalance()` now takes CSV text. The parity test reads the fixture, asserts its sha256 is `b48be8a4f920…f857`, and then asserts the **unchanged** `41324ef4…` pin and the two value checks. The assertion is not weakened. `balance.json` and `economy-config.json` are still read as before, so the build path matches `m5x.ts` / `scripts/bot-m5x.ts`. Per HoQA (via HoE), the test name now includes the fixture's full sha256. It still starts with `windowGate equals the original harness`.

## Commits
- `a1c50e7`: the fixture change on its own, with the CSV copy and the test switch and nothing else.
- `ce88448`: renames the test to include the fixture's sha256, as HoQA asked. A follow-up commit rather than an amend, because force-pushes aren't allowed.

## Fixture provenance
| | |
|---|---|
| Path | `tests/fixtures/economy-b48be8a4.csv` |
| Source | `0808fa6:data/economy.csv` ("data: M4-on retune T3 economy.csv b48be8a4 …", the same file as `data/economy.csv` on rc/v5 `b563c75`) |
| sha256 | `b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857` |
| git blob | `a566fb87449eadc2bc19f7f2a5f9141f49938375`, identical to the source blob (LF, unaffected by `*.csv eol=lf`) |

## AC trace
| AC | Test |
|---|---|
| D-HOE-20261030-03 / port-equivalence | `tests/bot-m5.test.ts::bot-m5: parity with m5x.ts > windowGate equals the original harness (scratch/v2-econ/h m5x.ts, uses pinned CSV fixture sha256=b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857, SEEDS=2 T=3000 CFG=none,AssZ PROFS=casual)` |

## Gates (local, node v20.19.2, lane `architect`, targeted vitest under the strict load cap)
- `vite-node scripts/sync-economy-cli.ts -- --check`: PASS ("balance.json up to date with economy.csv")
- `tsc --noEmit`: PASS
- `vitest run tests/bot-m5.test.ts --maxWorkers=1`: **6/6 PASS** at both `a1c50e7` and `ce88448`
- Proof of the fix. Each step is a local, uncommitted swap, restored afterwards with a clean `git status`.
  - A: live `data/economy.csv` swapped to `bb3f633`'s version (sha256 `a8c4e268…`). The fixed test passes, **6/6**.
  - B: `bb3f633`'s `data/economy.csv` **and** `src/config/balance.json`. The fixed test passes, **6/6**.
  - C (control): the original rc/v5 test with B's data **fails** with `0f05e1ebc68c…` instead of `41324ef4…`. That is the regression HoE reported, reproduced exactly.

**GitHub CI** on `ce88448` (run 41017272147): `gate` **pass** (8m1s); `release-globals` skipped, as on the earlier rc/v5 PRs. The `a1c50e7` run was cancelled when `ce88448` superseded it.

Review: Architect self-review + green CI (rule 22: Claude is never a gate)

