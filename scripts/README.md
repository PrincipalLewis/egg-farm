# scripts/

## `npm run verify` (VER-1, D-CEO-20261027-02)

One command every PR attaches, QA runs instead of re-reading code, and CCR / UI QA cite.

```sh
npm run verify -- --hours N [--seed S] [--profile idle|m5x-casual] [--flags k=v,...] [--out dir]
```

Defaults: seed 1, profile `idle`, flags from `src/config/balance.json`, out `verify-out/<buildId>/` (git-ignored).

What it does, in order:

1. **Build.** `npm run build:html` from HEAD into `dist-html/egg-farm.html`. It records the build id (`m4.1+<short sha>`, with `+dirty` when the tree has uncommitted changes) and the asset's sha256. On a dirty tree it runs the same steps minus `check-release-build`, which refuses `+dirty` by design, and says so in `asset.build`.
2. **Run.** It fast-forwards N hours of seeded play through the real fixed-step sim (`src/sim/tick.ts` `advance()`, then input, in the build's order). It runs headless and reads no wall clock. Profile `idle` is the AC7 workers bot (`tests/bot-m2.ts` `runM2`, seller15, managed, no variance), and `tests/verify.test.ts` pins it to `runM2`.
3. **Report.** It writes `verify.json` (schema below). Two runs at the same SHA, seed and flags give byte-identical JSON.
4. **Screenshot.** It loads the built html with the end state in headless Chromium (playwright-core, `/usr/bin/google-chrome` or `CHROME=`). The page clock is frozen at the save time. It opens Settings, where the game shows its build label (`Egg Farm <build id>`), and saves one 390x844 `verify.png`.
5. **Exit code.** It exits non-zero on failure:

| Code | Meaning |
|---|---|
| 0 | PASS |
| 1 | A check failed. See `checks[]`: build id mismatch, NaN / Infinity / negative values, golden mismatch, or a missing or wrong build label. |
| 2 | Usage error, or a profile that isn't available yet. |
| 3 | Build failure. |

Runtime: about 20 s for `--hours 24` locally (build about 5 s, sim about 8 s, goldens about 2 s, browser about 3 s).

### Golden rules

Both GOLDEN1 sim-trace hashes are recomputed on the shipped balance every run:

- **flagOff** is pinned to `f90d1678` (`engineering/golden/flagoff-golden.a01faea.test.ts`). It is always enforced.
- **m4On** is pinned to `a54c9cf9` (`engineering/golden/m4on-golden.90a9c84.test.ts`). It is enforced unless `--flags` changes a shipped flag. In that case it is reported but not enforced.

### `verify.json` (schemaVersion 1)

| Field | Content |
|---|---|
| `buildId`, `sha`, `dirty` | Build id from the built html; full HEAD sha; whether the tree was dirty. |
| `asset` | `{ path: "dist-html/egg-farm.html", sha256, bytes, build }` |
| `seed`, `hours`, `profile`, `flags`, `flagsOverridden` | The run's inputs. Flags are the effective values (balance.json plus overrides). |
| `sim` | `{ tickHz, ticks, tickPath, bot }` |
| `checkpoints[]` | At 1 h, then every N/4 (those of 1 h or more), ending at N. Each holds `hours`, `tick`, `eggs { coop, basket, collected, sold }`, `coinsCents`, `levels { farm, hens, eggValue, collection, graderTier }` and `workers { <id>: { state, energyPct } }`. |
| `trace` | `{ name, sha256, events }`. The AC7 trace hash: every sim event of the run, plus the end state. |
| `goldens[]` | `{ name: flagOff, m4On; source; expected; actual; pass }` |
| `screenshot` | `{ file, viewport, browser, label, dataBuildId, metaBuildId, pageErrors }` |
| `checks[]`, `result` | `{ id, pass, detail }`, and `PASS` or `FAIL`. |

`verify.json` has no timestamps, durations, absolute paths, user or host names, or tokens. Paths are repo-relative, and a `no-private-data` check fails the run if anything token-, e-mail- or home-path-like is left.

### Profiles

- `idle` is available.
- `m5x-casual` is refused with exit 2 until `tests/bot-m5.ts` (the Q-ZG-H3 casual-profile port) is on main.

`--skip-build` and `--no-shot` are for development only. Both are recorded in `verify.json`, and `--no-shot` fails the label check.

### CI: `verify-smoke`

`.github/workflows/verify-smoke.yml` runs `--hours 1` on the PR head **only** when:

- a PR is marked Ready for review (`pull_request: [ready_for_review]`, with the job also guarded on that action), or
- someone triggers it by hand (`workflow_dispatch`, with an `hours` input).

It never runs on push, open or synchronize. It uploads `verify-out` (`verify.json` + `verify.png`, 14 days). It is not a required check until HoE flips it.
