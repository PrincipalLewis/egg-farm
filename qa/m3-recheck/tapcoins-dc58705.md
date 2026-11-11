# Saves QA: #106 tapCoins exact-head @ dc58705 (HoQA/PR105-106-exacthead, QA-D-1105-PR105-106 FULL bar)

Date: 2026-11-05 23:48 – 2026-11-06 00:40 CET (Europe/Belgrade). Write scope: `qa/m3-recheck/` (+ scratch `qa/scratch/tapcoins-dc58705/`). Nothing merged, pushed, or tagged. Evidence cites **dc58705** only. This is the FULL exact-head bar (not a delta).

## Recommendation: **PASS**

The exact merge-forward head of #106 clears the full HoQA bar: tsc 0, full vitest 2160 passed with 0 failed, income-ref 27/27, tap-coins 22/22 including ST-AC8, flag-off golden 7/7, and build plus check-release-build. The hosted gate is SUCCESS. All pacing shards are SUCCESS; the aggregate FAIL comes only from RC-only row 904 (named below). k10 is known-red and non-required. release-globals was skipped by design on a non-rc/* PR. That is not a pass and not a block. The flag-0 and shipping defaults are proven unchanged. No pacing grant. Merge go is HoQA's call; this report does not grant merge.

## Identity (evidence/tapcoins-dc58705/identity.txt)

- Tip **dc58705a3ca86902ef0a0d4a58e1799671800ac0** — "Merge origin/rc/v5 (f8036e8, #105) into feat/v5-tapcoins"
- Parents: `e5b3d02b380e0dde1096d789d6a46301a2883f27` + **`f8036e8f0826ca76fcc0ee13092d575533d4969b`** (`origin/rc/v5`, #105 merged)
- Contains origin/rc/v5: YES. `origin/feat/v5-tapcoins` = tip (observed 23:48 CET).
- Diff vs `origin/rc/v5` f8036e8: **exactly 7 files, +213/−8**, A/M only, no reverts (no income-ref file touched; `src/sim/income-ref.ts`, `src/save/m5-fields.ts`, `src/game.ts`, `src/sim/timers.ts`, `tests/v5-income-ref.test.ts` not in diff):
  - `src/config/formulas.ts` (M, +1/−1)
  - `src/config/m5-rules.ts` (M, +1/−0)
  - `src/sim/actions.ts` (M, +7/−3)
  - `src/sim/events.ts` (M, +1/−1, comment only)
  - `src/sim/streak.ts` (M, +7/−3)
  - `src/sim/tap-coins.ts` (A, +32)
  - `tests/v5-tap-coins.test.ts` (A, +164)
- PR: https://github.com/PrincipalLewis/egg-farm/pull/106 (Ready/open). Features artifact: `artifacts/v5-106-mergefwd-dc58705/NOTE.md`.
- Worktree: `qa/scratch/tapcoins-dc58705/wt` (detached at tip; node_modules symlinked from a tree with byte-identical package-lock.json, sha256 `56569550…f6f75e`).

## Bar results

| # | check | result | evidence |
|---|---|---|---|
| 1 | Identity + 7-file diff vs rc/v5, no reverts | **PASS** | identity.txt, diff-detail.txt |
| 2 | `tsc --noEmit` | **PASS** EXIT=0 | tsc.txt |
| 3 | Full default vitest, 0 failures | **PASS** 149 files; **2160 passed \| 1 skipped (2161)**, 0 failed. = rc/v5 line 2138 (d9539a5) + 22 tap-coins | vitest-full.txt |
| 4 | `tests/v5-income-ref.test.ts` | **PASS 27/27** | vitest-income-ref.txt |
| 5 | `tests/v5-tap-coins.test.ts` + ST-AC8 | **PASS 22/22**; ST-AC8 ✓ `#3 tap coins: who pays, unlock and flags (R1, R3, R9, R17, R13a) > ST-AC8 / R9: the streak (s = 0.28) and a live x2 sale effect leave the tap coin unchanged` (test file line 121) | vitest-tap-coins.txt (verbose) |
| 6 | Flag-off golden 7/7 | **PASS 7/7** (4 files). GOLDEN1 flag-off `f90d1678c260…49544`, m4on `a54c9cf9d6a4…9fda5`; m4a-flag-off 2/2; zg-flagoff-dom 1/1. All 4 test blobs identical to rc/v5 | vitest-flagoff-golden.txt, golden-pins-identity.txt |
| 7 | `npm run build` (sync-economy --check, tsc, vite build, check-release-build) | **PASS** EXIT=0; `check-release-build: m4.1+dc58705 ok` + all 6 release checks ok | build.txt |
| 8 | Hosted gate SUCCESS on tip | **PASS** ci run **42124406327** headSha dc58705, conclusion **success**; gate job 127584770718 success. `release-globals` job 127590161412 **skipped — skipped-by-design** on non-rc/* PRs (ci.yml); enforced on the RC PR. Skipped ≠ pass; not a block | gh-runs-poll1.txt, hosted-final.txt |
| 9 | Pacing: shards SUCCESS; aggregate FAIL only if RC-only row 904 named | **PASS (bar)**: shards casual, seller15, and optimal are all SUCCESS. Aggregate 127603711152 is **failure**; its only FAIL lines are blocking row 904 optimal/seller15/casual NOT-WIRED (RC-only). No pacing grant | hosted-final.txt, row904.txt, pacing-aggregate-full.txt |
| A | Addendum: flag-0 / shipping defaults unchanged (formulas.ts, m5-rules.ts) | **PASS** (see below) | flag0-defaults.txt |
| — | k10-breeds-offset 42124406304 | FAIL; known-red non-required (D-HOP-2026-10-30-52/53); does not block | hosted-final.txt |

## Addendum (HoQA): flag-0 / shipping defaults unchanged

Shipping data is byte-identical tip vs rc/v5 f8036e8 (sha256 tip = rc):
- `src/config/balance.json` `ddd02fbaea437e14c55f1df3251c2331b60e33697512a4e5107b69cd5f34b41a`
- `data/economy.csv` `a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f`
- `src/config/flags.ts` `854f869e0eee23ba92423392776a28978c6f6f2fd3a8fe4b516c69d55d169643`
- `git diff --stat origin/rc/v5 dc58705 -- data public src/config/balance.json src/config/flags.ts` = empty.
- Shipping values (unchanged): `m4.enabled 1`, **`flags.tapCoins 0`**, `flags.streak 0`; `tc.tap_income_share 0.03`, `tc.tap_credit_min_s 1`, `tc.streak_unlock_farm 8`, `tc.tap_bonus_income_window_s 60`.

`src/config/formulas.ts` (only change, line 148):
```
- rc/v5 f8036e8 L148:  tapCoins: ['tap_bonus_income_window_s'], // #3 I_ref window (sim/income-ref.ts)
+ tip dc58705  L148:  tapCoins: ['streak_unlock_farm', 'tap_credit_min_s', 'tap_income_share', 'tap_bonus_income_window_s'], // #3: R1 unlock, R2 window, A1 share, I_ref window
```
`M5_TC_KEYS` is read only at `src/config/balance.ts:56`: `if (m4On(b)) for (const [f, ks] of Object.entries(M5_TC_KEYS)) if ((b.m4?.flags as any)?.[f] === 1) ks.forEach(k => tcNum(b, k));` → the extra required keys apply **only when `flags.tapCoins === 1`**. With shipping flag 0 the key list is never evaluated. No numeric default changed. (All four keys exist in shipping balance.json anyway.)

`src/config/m5-rules.ts` (only change, one added line; L42 unchanged both sides):
```
  L42 (rc & tip): if (has(tc, 'tap_income_share') && !(tc.tap_income_share <= 1)) fail('tc.tap_income_share must be <= 1');
+ tip L43:        if (has(tc, 'tap_income_share') && !(Math.abs(tc.tap_income_share * 10000 - Math.round(tc.tap_income_share * 10000)) < 1e-6)) fail('tc.tap_income_share must have at most 4 decimals (basis points, streak spec §4.1b)');
```
This is a validation (not a value). It is not flag-gated, but the shipping value 0.03 (= 300 bp) satisfies it (checked: OK), so flag-0 load is unaffected; the flag-off golden 7/7 + build `sync-economy-cli --check` confirm load parity.

Runtime wiring is flag-gated: `tapCoinsOn = m4On(b) && b.m4?.flags?.tapCoins === 1` (tap-coins.ts); `creditedTapsOn = streakOn(b) || (m4On(b) && flags.tapCoins === 1)` (streak.ts). With both flags 0, `creditTap` returns `{ s }` (credited undefined → rc1 `collect` event shape), `streakTick` returns `s` unchanged, and `actions.ts` adds no `bonus_cents` / coins. `events.ts` change is a comment only.

## Hosted runs (exact tip dc58705)

| workflow | run id | conclusion | notes |
|---|---|---|---|
| ci (gate) | [42124406327](https://github.com/PrincipalLewis/egg-farm/actions/runs/42124406327) | **success** | gate job 127584770718 success (done 23:58:56 CET); release-globals job 127590161412 **skipped-by-design** (non-rc/* PR; enforced on RC PR; ≠ pass, not a block) |
| pacing-x1-stack | [42124406279](https://github.com/PrincipalLewis/egg-farm/actions/runs/42124406279) | **failure** (aggregate) | shards: casual 127584770593 success (00:19:02), seller15 127584770354 success (00:27:44), optimal 127584770592 success (00:31:01); aggregate 127603711152 failure (00:32:55), row 904 only |
| k10-breeds-offset | [42124406304](https://github.com/PrincipalLewis/egg-farm/actions/runs/42124406304) | **failure** | job 127584771075 (00:09:32): known-red, non-required (D-HOP-2026-10-30-52/53); not a block |

### Row 904 attribution (aggregate FAIL allowed; evidence row904.txt, pacing-aggregate-full.txt L209–222)

Headline `## pacing-x1-stack: **FAIL**`. Rows: `45 PASS, 0 FAIL, 1 WARN, 20 INFO, 0 PENDING-REPRED, 3 N/A (row 903), 12 NOT-WIRED (3 blocking), 24 EXCLUDED (G5-P pause rows)`. Data: shipped-tree, economy.csv `a8c4e268…`, balance.json `ddd02fba…` with `tapCoins=0` (same as rc/v5). The only FAIL lines:

```
FAIL: blocking row 904 optimal NOT-WIRED
FAIL: blocking row 904 seller15 NOT-WIRED
FAIL: blocking row 904 casual NOT-WIRED
```

Row 904 is RC-only. The aggregate FAIL comes from these three named lines and nothing else, which is the same signature as #105 @ d9539a5 (run 42114562232). Non-FAIL: `WARN L897 optimal N / H: worst 191 > 180 s` (pre-existing L0–30 dead zone). **No pacing grant.**

Checkout note: the aggregate job checked out `refs/pull/106/merge` = `ccee277` "Merge dc58705 into d9539a5" (the PR merge ref was computed against a d9539a5 base). d9539a5 is an ancestor of dc58705 (verified locally), so that merge tree equals the dc58705 tree. Pacing reports the shipped data hashes as identical. PR #106 base now reads `rc/v5` @ f8036e8 (get_pull_request, 00:38 CET).

## Method

- Local runs via `ops/tools/lane-run.sh saves-qa` (one chain: tsc → tap-coins → income-ref → golden → full → build), vitest under `flock -w 3600 .vitest-eng.lock`, `nice -n 10`, 1 fork / no file parallelism. All exits 0 (`ALL_DONE tsc=0 tap=0 income=0 golden=0 full=0 build=0 2026-11-05T23:53:11+01:00`).
- Hosted: gate polled with gh until 23:59 CET; after the box gh API hit a rate limit, pacing/k10 were polled only via the GitHub connector (`list_workflow_run_jobs`, `get_job_logs`).
- No push/merge/tag. No GITHUB_TOKEN printed. No writes outside `qa/`.

## Evidence sha256 (`qa/m3-recheck/evidence/tapcoins-dc58705/`)

- `qa/m3-recheck/evidence/tapcoins-dc58705/build.txt` — `00dc7666e0097ff57300c424a01eddc7c49c535e10b5c1f860756c5c75b85c34`
- `qa/m3-recheck/evidence/tapcoins-dc58705/diff-detail.txt` — `23a0edbef13e31bf3ccd917c77f13c1002b300be3f7aae1f3d90a291b9865756`
- `qa/m3-recheck/evidence/tapcoins-dc58705/flag0-defaults.txt` — `7ae161bc31f8b86dec7613fe534872de893eff0a80d6770b1ad4899729d29c2f`
- `qa/m3-recheck/evidence/tapcoins-dc58705/gh-runs-poll1.txt` — `687b3e3e4ba6a03f43b23ccc0d661c979cc7da04c1e95df52c74ea77bb40e241`
- `qa/m3-recheck/evidence/tapcoins-dc58705/golden-pins-identity.txt` — `967f35280cadbf507e07cafcae5926209c87fc521695bba7d3b0205dc9a59354`
- `qa/m3-recheck/evidence/tapcoins-dc58705/hosted-final.txt` — `41a1da1f7af1698ebb427daadda7536f472dba48a6d785dca4c33b89488d4d5a`
- `qa/m3-recheck/evidence/tapcoins-dc58705/identity.txt` — `ae157deb3e32bbeeb7990e90b14e95c96e8d0fc2bbaf4bc7237a48417dd38749`
- `qa/m3-recheck/evidence/tapcoins-dc58705/pacing-aggregate-full.txt` — `5b3d2f36d876570abe44ea2aa5c371e0f960df783ec110cdbd3101274b135607`
- `qa/m3-recheck/evidence/tapcoins-dc58705/row904.txt` — `3af7ef1c1fe80c9d62884dae2537de099580b5175f4d43d87403eb845863e76d`
- `qa/m3-recheck/evidence/tapcoins-dc58705/tsc.txt` — `65fd368870d67b91ec6c792e20bec283b9adf82de77d8e3be3f5ae3ac6e0ba3c`
- `qa/m3-recheck/evidence/tapcoins-dc58705/vitest-flagoff-golden.txt` — `b177949dc55b2df7513aacaf089d00df1c7b49d04991259b34c4fe48bac4df22`
- `qa/m3-recheck/evidence/tapcoins-dc58705/vitest-full.txt` — `5060829f43838999e51ca9e1184f9b958ef723f4f9fc52c0299926f195ce370f`
- `qa/m3-recheck/evidence/tapcoins-dc58705/vitest-income-ref.txt` — `c864e0e3bc15f067da7a41a05b08354480a0b437e0e52ba8ad7eefb40b92ff72`
- `qa/m3-recheck/evidence/tapcoins-dc58705/vitest-tap-coins.txt` — `c701a5c397c5dd90cf89b6b3f90ee2cb69159f444e2e24cad5c49d0f9afd12be`

## Report sha256

Companion file `qa/m3-recheck/tapcoins-dc58705.sha256` holds the hashes. The sha256 of the report body, excluding this section, is:

`37f385afcb011594608c75587533935e0d5f1ef34ad28c9f70770a44e23cd2b3`
