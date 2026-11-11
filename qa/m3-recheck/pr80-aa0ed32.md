# PR #80 (v5 F1c timed-effects registry) V5SCAP delta trace check @ aa0ed32: **RETURN TO AUTHOR** (PR body only; code and tests PASS)
Saves QA (33ec1b55), 2026-10-30 07:4x–07:5x CET. Head **aa0ed3227a50e1b3fa1e7f91a8267a5f7b129fa8** (`gh pr view 80` + `git fetch pull/80/head`). State: OPEN, **still Draft** (the Architect calls it "final", but the PR isn't marked Ready), base rc/v5, MERGEABLE. PR body last edited before this head: it is **unchanged since 1a64e95**.
Previous review: pr80-1a64e95.md (RETURN TO AUTHOR). CCR-passed commit: **1a64e95** (engineering/reviews/pr80-1a64e95-ccr.md, PASS 0B/0M/1m/1n).
Logs: `pr80-aa0ed32/` (SHA256SUMS). Scratch worktree qa/scratch/wt-pr80-aa0ed32 (own `npm ci`), removed after the run.

## Verdict: **RETURN TO AUTHOR**. Severity: **Blocking by rule (V5SCAP / QA-D-1029-V5SCAP), process only. No code change is needed.**
The code fixes are in and verified: both old mutation survivors are now killed, and 10/10 mutants are killed in total. But the PR body at aa0ed32 still has:
1. **B1: no trace table.** The body is the 1a64e95 text, with no AC → test file::name table. The test titles now carry AC ids, so the table can be written straight from §2 below without a new push.
2. **B2: no Post-CCR delta section.** It must list the 7 first-parent commits after CCR-passed 1a64e95: 4b47158 (merge #79 f5265b7; conflict in game.ts, see §1), 90c68ef (merge #79 b041561, clean), c2dbb98 (CCR m1 + nit: playerSaleCtx, readonly registries, attendedNow N-1 guard, tests, AC tags), deb3c9f + 42d6274 (Saves QA gaps 2/3 tests), 736d04e (app.ts wiring reverted), aa0ed32 (merge #79 02e7ede, clean).
3. **B3: stale gates and claims in the body.** "Gates (HEAD e87562c)" and "1a64e95" only. There is no gate for the final code (see §5). The body should cite this head's gate, or my run in §4.
Repro: `gh pr view 80 --json body` contains no "| AC" table and no "Post-CCR" heading (`pr-body.md`).
Re-check needed after the body edit: a body-only diff plus a title match, about 10 min, with no re-run if the head is unchanged.

## 0. Stack / ancestry ✔
- aa0ed32 = merge of feat/v5-f1b-clock-rng **02e7ede** into #80 (parents 736d04e, 02e7ede). Ancestors: 02e7ede ✔, b041561 ✔, rc/v5 **b563c75** (#77) ✔, 172ca3f ✔. Required fix (3), re-merging onto the #79/#77 heads, is **done**.
- #80's own diff against the #79 head (`02e7ede..aa0ed32`, `01-files-own-vs-pr79-head.txt`): game.ts, sim/actions.ts, effects.ts, payout.ts, tick.ts, tracks.ts and tests/v5-f1c-effects.test.ts only (7 files, +279/−22).

## 1. Diff 1a64e95..aa0ed32 (`01-files-1a64e95-aa0ed32.txt`, `02-src-diff-1a64e95-aa0ed32.patch`, `03-remerge-diffs.txt`)
18 files. Everything outside #80's own files came in with the #79/#77/#78 merges: scripts/bot-m5x.ts, verify*, README, tests/bot-m5*, verify.test (#78 d3b5a53); flags.ts fatigueCue and m5-fields.ts (#77); the f1a/f1b/f2 tests (#77/#79). Production changes owned by #80:
| file | change | explained? |
|---|---|---|
| src/sim/effects.ts | `SALE_EFFECTS`/`LAY_EFFECTS` typed `readonly`; new `playerSaleCtx(attended)` | yes (c2dbb98, CCR m1 + nit) |
| src/sim/actions.ts | `sellTo` player ctx = `playerSaleCtx(!suspended)` | yes. **Same values as before**: !suspended → PLAYER_SALE (was `undefined` → default PLAYER_SALE); suspended → `{by:'player',suspended:true}` (unchanged) |
| src/sim/payout.ts | `sellAllPreview(s, b, ctx = PLAYER_SALE)` passes ctx | yes (CCR m1); the default keeps old callers unchanged |
| src/game.ts | `attendedNow()` adds `anyM5FlagOn(this.b) &&`; new `playerSaleCtx()` | yes (CCR N-1 #79 / m1). The 4b47158 conflict was resolved by moving #79's inline guard into attendedNow (remerge-diff), which is equivalent for frame() and now also covers dispatch |
- **Readonly registries don't change behaviour:** esbuild output for effects.ts at 1a64e95 vs aa0ed32 differs **only** by the added `playerSaleCtx` function and export (`05-effects-emitted-js-diff.txt`). `readonly` is type-only. Tests cast to push fixtures, and the new [CCR-80-N] source-grep test guards src.
- **app.ts revert is clean:** c2dbb98 changed src/ui/app.ts (+2/−2) and 736d04e reverted it. `git diff 90c68ef 736d04e -- src/ui/` = empty, and `git diff b563c75 aa0ed32 -- src/ui/` = empty (`04-app-ts-vs-rcv5.txt`): app.ts is byte-identical to rc/v5. The 42d6274 gate failure (qa-rc1-bugs / sellall-label-grader source tests, artifacts/v5-f1c-42d6274) was caused by that wiring and is gone at this head (full suite green, §4).
- **No unexplained production change.**

## 2. Trace check (no table in the body, so checked against my proposed table in pr80-1a64e95.md)
All 21 v5-f1c-effects tests pass at aa0ed32, and every title carries an AC or rule id (`11-f1c-titles.txt`). Every row of my proposed table maps to an existing test:
| AC id (proposed row) | test file::name @aa0ed32 | status |
|---|---|---|
| F1(c) registry, flag gate | tests/v5-f1c-effects.test.ts::F1c registry composition > [F1(c)] empty registry…; > [F1(c)][D-C1] an entry whose flag is off… | OK |
| X7 | ::[F1(c)] factors multiply with the Grader and round once (golden X7 example shape) | OK (title lacks an `[X7]` tag; nit N1) |
| F1(c) by attribution | ::[F1(c)] by attribution: Rush applies to Market Hand sales only; Frenzy to both | OK |
| R23 / D-C3 suspension | ::[F1(c)][D-C3] suspended (no focus)…; ::[F1(c)][D-C3] tick: laying uplift only on focus ticks…; ::[F1(c)][D-C3] tick: worker sales…; **::F1c D-C3 through advance() > [D-C3][R23 partial] one 59 s frame (focusMs 1000) with a x2 fixture effect and Market Hand sales pays at most the uplift of 1.0 s (10 focus ticks)** | **GAP 2 closed** |
| preview == credit | ::[F1(c)][CCR-80-m1] preview == credit…; ::[Q-F1c-1] sellAll follows the same rule…; 4× ::[CCR-80-m1][Q-F1c-1] x2 test effect, attended=true/false… (playerSaleCtx + apply / Game.playerSaleCtx + dispatch) | OK (m1 closed at sim/API level) |
| §9.5 e3 / R24 | **::F1c §9.5 edge 3 / R24 … > [§9.5-e3][R24 partial] applyOffline and incomePerSec are identical with a live x0.01 lay effect registered** (both offline paths: M4 table model and legacy prodEggsPerSec); ::[Q-F1c-2][GE-AC8] goldenEEggsPerSec… | **GAP 3 closed** |
| Q-F1c-1 | 2× ::[Q-F1c-1] attended=true… (apply / Game.dispatch + probe) | OK |
| Q-F1c-2 | ::[Q-F1c-2][GE-AC8] goldenEEggsPerSec is the base prodEggsPerSec… | OK |
| flags off | ::[F1(c)][AC-M5A-16] a registry entry whose flag is off changes nothing over 10 min of play | OK |
| CCR nit (readonly) | ::[F1(c)][CCR-80-N] no src file mutates or casts away SALE_EFFECTS / LAY_EFFECTS… | OK (extra) |
R23 and R24 are labelled "partial" in the titles, as I asked (gap 4). The table in the body must say the same.

## 3. Mutations (scratch worktree; tsc + vitest on f1c/f1b/focus-wiring/f1a/f2 = 88 tests; reverted, tree clean after each; `30-mutrun.log`)
| id | mutant | tsc | vitest | killed by |
|---|---|---|---|---|
| Q1 (**my old survivor**, was 29/29) | tick.ts `nFocus = clock && clock.focusMs > 0 ? Infinity : 0` (every-tick focus) | 0 | **2 failed** | [D-C3][R23 partial] 59 s frame (f1c); [D-C3][F1(b)] advance() focus ticks (f1b) |
| Q2a (**my old survivor**, was 68/68) | offline.ts legacy path `prodEggsPerSec(s, b, { suspended: false })` | 0 | **1 failed** | [§9.5-e3][R24 partial] |
| Q2b (new) | offline.ts M4 path `offlineMult × layFactor(s, b, {suspended:false})` | 0 | **1 failed** | [§9.5-e3][R24 partial] |
| Q3 (**my old ask**) | income.ts `incomePerSec` uses `prodEggsPerSec(s, b, { suspended: false })` | 0 | **1 failed** | [§9.5-e3][R24 partial] |
| C1 (playerSaleCtx) | `playerSaleCtx = () => PLAYER_SALE` (ignores attended) | 0 | **5 failed** | Q-F1c-1 / CCR-80-m1 attended=false cases |
| C2 (playerSaleCtx) | `Game.playerSaleCtx()` returns `playerSaleCtx(true)` | 0 | **1 failed** | [CCR-80-m1] Game.playerSaleCtx + dispatch, attended=false |
| C3 (playerSaleCtx) | `sellAllPreview` drops ctx | 0 | **2 failed** | [CCR-80-m1] attended=false preview == credit |
| E1 (CCR list, spot-check) | effects.ts ignores `ctx.suspended` | 0 | **8 failed** | D-C3 suspended, worker-sale, Q-F1c-1, 59 s frame |
| E2 (CCR list, spot-check) | tick.ts `fx = { suspended: false }` | 0 | **3 failed** | D-C3 tick lay/worker + 59 s frame |
| S1 (CCR list, extra) | `sellAll` ignores attended | 0 | **3 failed** | Q-F1c-1 / CCR-80-m1 |
**10/10 killed.** Both old survivors (every-tick focus; live ctx in offline.ts) and the incomePerSec caller now fail. The PR body lists no Architect mutation set for #80, so the spot-checks use the CCR's E1/E2/S1 (engineering/reviews/pr82-ecf8297-ccr-mutants.sh.txt).

## 4. My runs @aa0ed32 (own node_modules; --minWorkers=1 --maxWorkers=2)
- tsc --noEmit **exit 0**. Targeted: v5-f1c-effects (21) + v5-f1b-clock-rng + v5-f1b-focus-wiring + v5-f1a-fields + v5-f2-m5-fields: **88/88 passed** (`10-baseline-*.log`).
- **Full vitest suite: 124 files, 1677 passed / 1 skipped (1678), exit 0**, 07:46:57–07:48:27 CET (`20-full-vitest.log`). I ran it because no complete gate exists for this head (§5).

## 5. Architect artifacts / CI
- **No `artifacts/v5-*-aa0ed32`.** The nearest are artifacts/v5-f1c-736d04e, which is **incomplete** (tsc 0 and sync 0 only; vitest.log cut off mid-run, no summary end and no SHA256SUMS, consistent with the 23:21 CET SIGTERM), and v5-f1c-42d6274 (vitest **exit 1**, 2 app.ts source tests, fixed by 736d04e). Neither has a SHA256SUMS, so there was nothing to `sha256sum -c`. Not a finding against the code, but the Architect should regenerate a gate at the final head (with SHA256SUMS) for the RC evidence trail.
- **CI on aa0ed32:** run 41015431888 `ci` **completed / skipped** (the gate skips Drafts). There will be no green CI until the PR is marked Ready.

## Non-blocking nits / info
- N1: the X7 and by-attribution rows carry only `[F1(c)]`. Add `[X7]` when the file is next touched.
- N2: the older `[F1(c)] Sweep-like factor … offline / income / golden E (no ctx) see the base rate` title still claims callers but tests the helper. Callers are now covered by the [§9.5-e3] test; consider renaming the old one "helper".
- I1 (Info): CCR m1 is closed in sim/Game (`Game.playerSaleCtx()`). **The UI previews still use the default ctx until UI #85/F6 wires `g.playerSaleCtx()`**, so preview ≠ credit stays latent in the shipped UI for any flag-on build where the probe is false. UI QA should assert this on #85.
- I2: the [CCR-80-N] readonly guard is a regex grep (push/splice/…/`as`). It is fine as a tripwire but would not catch aliasing (`const a = SALE_EFFECTS as any`) written differently. Info only.

## Checks run vs not run
Run: head/Draft/CI; ancestry; first-parent Post-CCR commit list; diff 1a64e95..aa0ed32 + remerge-diffs; app.ts revert vs rc/v5; readonly emitted-JS diff; trace mapping vs my proposed table (titles); 10 mutations; tsc; targeted vitest; **full vitest**.
Not run: test:slow, build, check-globals, verify-24h goldens (no artifact at this head; CI skipped as Draft). sha256sum -c had no target (no SHA256SUMS at any #80 head ≥ 42d6274). No browser runs (WebKit still broken, with HoO).

## What the author must do (no code push needed)
Edit the PR body: (1) add the trace table (rows as in §2, R23/R24 marked partial); (2) add the Post-CCR delta (1a64e95 → aa0ed32, the 7 commits in B2); (3) replace the stale gate lines with this head's gate. Then mark Ready so CI runs. I re-check the body only (no re-run if the head stays aa0ed32).
