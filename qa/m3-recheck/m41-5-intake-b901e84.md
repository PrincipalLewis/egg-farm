# M41-5 intake: PR #57 @ b901e847bf6f64df27176f32057e95408e4fffc2

**Verdict: PASS. 5/5 checks pass, unit suite 988/988, build ok.** No defects. There are two Minor observations, listed under Anomalies.
QA Engineer, Saves & Release Verification, Mon 2026-10-19, 10:09–10:20 CEST. Evidence is in `m41-5-intake-b901e84/`.

## Provenance
| item | value |
|---|---|
| PR | #57 "M41-5 (D-HOP-25): drop 8 dead economy.csv columns + unread-column CI check (v2, bisectable)". Open, not merged, body says DO NOT MERGE (CI down). Replaces #55. |
| head | b901e847bf6f64df27176f32057e95408e4fffc2 (7 commits on top of main) |
| remote refs holding head | `refs/remotes/origin/arch/m41-5-dead-cols-v2` and `refs/remotes/origin/pr/57` (= GitHub `refs/pull/57/head`), both b901e847. Fetched 10:09 CEST (`01-fetch.log`, `02-refs-containing.log`). |
| main | origin/main = **dd223f510e9acabf9b1915b56e39da8b88dcac63** (as expected). Merge-base with head = dd223f5. |
| #55 head | 2cf9dc5da184107210890337045241da2d75cc04, on origin/arch/m41-5-dead-cols and origin/pr/55 |
| worktree | my own: `qa/wt-m41-5-b901e84`, detached at b901e847. `git status --porcelain` is empty before and after every run, so **dirty = false**. |
| node / npm | v20.19.2 / 11.21.0. `npm ci` exit 0 into the worktree's own node_modules (`04-npm-ci.log`). |
| vitest | 2.1.9, `--poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1` (threads also capped at 2) |

## Checks
### (1) data/economy.csv sha256 = c7bb783f…: **PASS**
- At head: `c7bb783fe890928f747c142411503261f0711388e73fe1cdadbfd76cc8d68b44` (both the worktree file and `git show b901e847:data/economy.csv`).
- main: b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857.
- Studio `product/economy.csv` is also c7bb783f, a byte-for-byte match.
- File shape: 123 columns, 32 lines (header plus 31 rows), LF line endings, no CR, trailing newline.
- Log: `10-checks-1-2-5.log`.

### (2) balance.json, economy_sim.json and goldens byte-identical to main: **PASS**
| path | blob main | blob head | sha256 |
|---|---|---|---|
| src/config/balance.json | 834fceee9b396c138c02616fbd7e5aca108cd9e8 | 834fceee9b396c138c02616fbd7e5aca108cd9e8 | 2e7f0f3e…a04b |
| tests/fixtures/economy_sim.json | d9749c386bb5b00bf6353d9902bfd7da89c7430b | d9749c386bb5b00bf6353d9902bfd7da89c7430b | 7b3ed73b…e86c |
| engineering/golden/flagoff-golden.a01faea.test.ts | 3584795c42b509f61799260323e46ee37c210bc2 | 3584795c42b509f61799260323e46ee37c210bc2 | 419a7111…64ca |
| engineering/golden/m4on-golden.90a9c84.test.ts | dd9c637fc3d28acc013bc72fce90889b9863175a | dd9c637fc3d28acc013bc72fce90889b9863175a | c3814e6c…8ce8 |

**What the "4 goldens" are.** The repo has 2 golden files (`git ls-tree`; nothing else matches "golden" under tests/ or fixtures). Together they hold **4 golden test cases**, and the PR body's "4/4" counts those:
- flag-off: `storage bytes` and `sim trace`, pin f90d1678
- M4-on: `storage bytes` and `sim trace`, pin a54c9cf9

Both files are byte-identical to main, so the pins are unchanged. `git diff main..head` on those paths is empty. All 4 cases **pass** at head in the unit run (`20-unit.json`).

### (3) seller_variance.json differs only in the CSV sha field: **PASS**
- Blob main b7606f87… → head 2e936089…. sha256 4ea66e5c… → c7ed96e9…, which matches the PR body.
- Raw text diff: 1 line added and 1 line removed (numstat 1/1), hunk at line 5.
- JSON structural diff (recursive over dicts and lists): **exactly 1 difference**, `/economy_csv_sha256 : "b48be8a4" -> "c7bb783f"`. It's an 8-char short form. All runs, traces and draws are identical.
- Log: `11-check3-seller-variance.log`.

### (4) The new `sync --check` reads product/economy/csv-column-allowlist.md and passes: **PASS**
- **Entry point:** `npm run sync-economy -- --check`, which is `vite-node scripts/sync-economy-cli.ts -- --check`. It's also the first step of `npm test`, `build`, `build:html` and `build:qa`.
- **New file `scripts/csv-columns.ts`:** it sets `ALLOWLIST_PATH = ../product/economy/csv-column-allowlist.md`. `readAllowlist()` calls readFileSync on that path, and `parseAllowlist()` parses the markdown table at runtime.
- **CLI:** `sync-economy-cli.ts` calls `checkColumns(rows, prev, cfg, readAllowlist(), todayUtc(), strict)` and exits 1 on errors.
- **Allowlist location:** it's in the **game repo** at `product/economy/csv-column-allowlist.md`, added by the PR. sha256 **e5094483285596ee9aa4388fa90ba65d1d0b5f37edc1eb34928a2d6dabcd86b1**, identical to the studio's `/workspace/egg-farm-studio/product/economy/csv-column-allowlist.md`.
- **Result at head:** `economy.csv columns: 107 read by sync, 16 unread + allowlisted, 0 unknown` / `balance.json up to date`, exit 0. With `ECONOMY_ALLOWLIST_STRICT=1` it also exits 0 today. Log: `12-check4-sync-check.log`.
- **Negative probes:** run on a `git archive` copy at `qa/scratch/m41-5-probe-b901e84`, never committed (`13-check4-negative-probes.log`):

| probe | result |
|---|---|
| P0 unmodified copy | exit 0 |
| P2 delete the `rest_recovery_mult` row from the allowlist only | **exit 1**: `ERROR economy.csv column rest_recovery_mult is not read … and is not in product/economy/csv-column-allowlist.md`. This proves the file is read. |
| P3 backdate the PM Workers rows to 2026-10-01 | exit 0 with 13 WARNINGs. Under `ECONOMY_ALLOWLIST_STRICT=1`: **exit 1** with 13 ERRORs. |
| P4 allowlist file absent | **exit 1** (ENOENT, fails closed) |
| P5 CSV gets an extra column `zz_new_knob` | **exit 1** |
| P6 CSV re-adds `guard_heartbeat_s` | **exit 1** |
| P1 delete the `tc_*` row | exit 0. Expected: the sync already reads the tc_* columns into balance.json m4.tc, so that entry is unused. See Anomalies. |
| P7 restored | exit 0 |

The "fatal: not a git repository" lines in the probe log come from vite.config's build-id lookup running in the non-git copy. They're harmless.

### (5) Tree identity with #55: **PASS**
`git rev-parse b901e847^{tree} 2cf9dc5^{tree}` gives **c682a5b10046a450f45bc3161c3d74ad12a5361c** for both. `git diff 2cf9dc5 b901e847` is empty.

## Unit suite at head: **988/988**
- Test files 87/87 passed, tests 988 passed, 0 failed, 0 skipped, 0 todo. That matches HoE's claim.
- Run 10:10:49–10:16:21 CEST, 332 s, exit 0. The csv-columns tests pass 8/8 and the goldens pass 4/4.
- Logs: `20-unit.log`, `20-unit.json`. The default config excludes `*.slow.test.ts`.

## Build: ok
- `npm run build` exit 0 (`30-build.log`). That covers sync --check, tsc, vite build and check-release-build. All release checks passed, and the only window global is eggfarmExportTelemetry.
- **build-id `m3-rc1-pre+b901e84`**, no +dirty (2 occurrences in dist/index.html).
- dist/index.html sha256 b2606de8…3e3f. It's a local dist, not the html asset.

## Informational: check-economy-copy --strict
It's trivially available at this SHA, so I ran it once as **INFORMATIONAL ONLY**. This is not the pre-release gate run, which waits for the M41-5 merge per HoQ.
- Command: `ECONOMY_PRODUCT_DIR=/workspace/egg-farm-studio/product npm run check-economy-copy -- --product --strict`
- Result: exit 0. The 4 vendored files match product/, and data/economy.csv matches product/economy.csv byte for byte (c7bb783f).
- The env var is needed from a qa/ worktree because the script defaults to `../../product` relative to scripts/.
- After merge, the real strict run becomes runnable on main. Log: `31-check-economy-copy-INFORMATIONAL.log`.

## What the PR changes vs main (`05-diffstat-vs-main.log`)
13 files, +216/−39:
- data/economy.csv: −2 columns (guard_heartbeat_s, guard_stale_s)
- product/economy/csv-column-allowlist.md (new)
- scripts/csv-columns.ts (new), sync-economy-cli.ts, sync-economy.ts (verify reads keys first)
- tests/csv-columns.test.ts (new)
- CSV-sha pin switches that accept c7bb783f alongside b48be8a4: cost-segments, economy, ac7-worst-seed.slow, seller-variance.slow
- tests/fixtures/seller_variance.json
- engineering/ci-gates.md, engineering/status.md

## Not run
- `npm run test:slow` (16 pass / 1 skip per HoE). Out of scope for this intake, and it's long.
- check-globals in browsers. No browser work was needed and none was done.
- The goldens with GOLDEN_PRINT twice. They ran once, in the unit run, and pass at unchanged pins.
- `build:html` / the single-file asset.
- The pre-release check-economy-copy gate itself; the informational run is above.

## Anomalies / observations
1. **Minor: allowlist expiry is date-dependent.** All 11 entries expire 2026-10-22. `todayUtc()` compares in UTC, so **from 2026-10-23 (UTC) every `sync --check`, which means every `npm test` and build, prints 16 WARNINGs**. Under `--strict-allowlist` / `ECONOMY_ALLOWLIST_STRICT=1` it fails. A release build after Oct 22 will be noisy until the M4.2 triage updates the file. This is by design per the allowlist header, but it makes build output depend on the wall clock.
2. **Minor: two entries are dead and nothing reports them.** The `tc_*` entry is never used, because the sync reads those columns. `start_coop_eggs` isn't in the CSV. `checkColumns` computes `unusedEntries` but the CLI never prints them, so stale entries can pile up silently.
3. **PR title wording.** The title says "drop 8 dead columns", but only 2 were dropped from main (guard_*). The other 6 existed only in HoP's b.csv. The body explains this; it's just a wording note.
4. **Shared clone has someone else's local branches.** It holds local branches `arch/m41-5-dead-cols-v2` and `arch/m41-l30plus-unlock` (c98c873, which contains b901e847). The remote `origin/arch/m41-l30plus-unlock` (31d0035) does not contain it. Neither is mine, I left them untouched, and they don't affect this intake.
5. The `esbuild` postinstall was skipped by npm's allowScripts. vite, vite-node and vitest all worked anyway (platform binary package).

Fetch added refs `origin/pr/57` and `origin/pr/55` to the shared clone (game/.git). Nothing was pushed, merged or tagged. No servers or background PIDs are left running.
