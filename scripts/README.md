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
4. **Screenshot.** It loads the built html with the end state in headless Chromium (playwright-core, `/usr/bin/google-chrome` or `CHROME=`). The end state is saved marked like a fresh M4 farm (`tracksV7: 1` plus a fixed `v6BackupId`, as `src/game.ts` does), so the load doesn't price-match it as a pre-M4 save. The page clock is installed paused at the save time and advanced only in fixed steps, with real-time I/O allowed to finish before each step, and toasts are hidden. The same end state gives the same `verify.png` bytes on the same machine and Chromium. `verify.json` stays the cross-machine determinism proof. It opens Settings, where the game shows its build label (`Egg Farm <build id>`), and saves one 390x844 `verify.png`.
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
- `m5x-casual` is refused with exit 2: "needs tests/bot-m5.ts (M5.1, on Vadim go)".

`--skip-build` and `--no-shot` are for development only, as is `VERIFY_HTML=<file>` (tests: verify another html with `--skip-build`). A failed or skipped browser step deletes any earlier `verify.png` in the out dir and sets `screenshot.file` to null. Both are recorded in `verify.json`, and `--no-shot` fails the label check.

### CI: `verify-smoke`

`.github/workflows/verify-smoke.yml` runs `--hours 1` on the PR head **only** when:

- a PR is marked Ready for review (`pull_request: [ready_for_review]`, with the job also guarded on that action), or
- someone triggers it by hand (`workflow_dispatch`, with an `hours` input).

It never runs on push, open or synchronize. It uploads `verify-out` (`verify.json` + `verify.png`, 14 days). It is not a required check until HoE flips it.

## `npm run measure:l30plus`

The L30+ step-gate harness (`scripts/measure-l30plus.ts`, engineering/l30plus-harness.md), restored at its first committed version (47f0c12) for M4.2:

```sh
npm run measure:l30plus -- <csv> [--seeds 1-200] [--T 14400] [--out <dir>]
```

It is read-only and builds balance in memory from `<csv>`. The later M4.2 revisions stay on the parked L30+ branches.

## Retired one-off scripts (VER-1, D-CEO-20261027-02)

They were removed because `verify` or `scripts/rc0-browser.mjs` covers them. All of them are still in git history (`git show 2dfedbe:scripts/<name>`).

| Script | Status | Covered by |
|---|---|---|
| screenshot-m2.mjs | removed | `verify.png` for the standard shot; rc0 `b58` (Manage all, desktop 44 px) |
| screenshot-m3-pt1.mjs | removed | rc0 `pt1`, `b3` (next-goal strip), `s25` |
| screenshot-nest.mjs | removed | `verify.png`; screenshot-only, no checks |
| screenshot-post-rc1.mjs | removed | rc0 `b58` (Manage all cooldown) |
| screenshot-qa-bug12.mjs | removed | rc0 `sellallgrader`, `sellallgraderfit` |
| ac14-browser.mjs | removed | rc0 `recovery*` (AC14b dialog v2.1: role, focus, Esc/scrim, export, quota), `save-warn`, tab-guard-browser.mjs and rc0 `newertwotab` |
| recovery-v11-browser.mjs | removed | rc0 `recovery*` (v2.1 replaces v1.1), `#sOldSave` |
| b6-check.mjs | removed | rc0 `b6`, `b6b` |

These are kept because nothing else covers them: d2-kill-browser.mjs (kill matrix), pt1-13-webkit.mjs (WebKit narrow phones), tab-guard-browser.mjs, queue-qa.mjs, mk24-1-overflow.mjs, perf-ab.mjs, perf-sm9.mjs, artux-shots.mjs, the m41-* shot and check scripts (M4.1 evidence), screenshot.mjs (`npm run screenshot`), smoke.mjs, rc0-browser.mjs, release-globals-browser.mjs, release-scan.mjs, serve-own.mjs, and the build, sync and fixture scripts.
