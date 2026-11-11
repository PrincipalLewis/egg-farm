**v5 F1c: timed-effects registry feeding `saleMultipliers()` and `prodEggsPerSec()`, with `by` attribution** (engineering/m5.0-sizing.md §1 F1(c), §4 hotspot 2, §12.1 D-C3; golden spec X7/R23). Into `rc/v5`. Manifest row 7. **Head `174286e`.**

**Stacked on #79 (F1b), which is stacked on #77 (F1a).** This PR's own diff against the #79 head (`02e7ede`) is 7 files (game.ts, sim/actions.ts, effects.ts, payout.ts, tick.ts, tracks.ts, tests/v5-f1c-effects.test.ts); the original F1c commit was `e87562c`. The diff against rc/v5 includes F1a and F1b until they merge. Merge after #77 and #79.

## What
- `src/sim/effects.ts` (new): `SALE_EFFECTS` and `LAY_EFFECTS` are empty here; each feature PR appends one entry. An entry is `{id, flag, factor(s, b, ctx)}` and is consulted only while `flagOn(b, flag)` and the context isn't `suspended`. `saleEffectFactors()` returns `[{id, factor}]` so the UI can attribute chips. `layFactor()` returns the product of the live lay factors. `SaleCtx {by: 'player' | 'market_hand', suspended?}`: Rush keys on `by`.
- `payout.ts`: `saleMultipliers(s, b, ctx = PLAYER_SALE)` = `[grader, ...live factors]`, rounded once (X7). `saleValueCents(s, k, b, ctx)`. **Every preview and the credit go through the same function, so preview == credit.**
- `tracks.ts`: `prodEggsPerSec(s, b, ctx?)` = base × `layFactor`. With no ctx it's the base rate, so offline grants, income previews and golden E can't pick up a timed effect (§9.5 edge 3).
- `tick.ts`: when some M5 flag is on, the coop fill and Market Hand sales get `{suspended: !clock.focus}` (D-C3: no uplift on ticks without focus). `actions.ts`: `sellTo(..., by, suspended)`.

## Flags off: byte-identical
With every flag off, `fx` is `undefined`, the registry is empty, `layFactor` is exactly 1 and `saleMultipliers` is `[grader]`. flag-off f90d1678, M4-on a54c9cf9 and the 24 h trace 2c0d3ec3… all match.

## Historical gates (HEAD e87562c; gate id `v5-f1c-e87562c`; superseded, see **Gates at 174286e** below)
tsc 0 · vitest (--minWorkers=1 --maxWorkers=2) 1595 passed | 1 skipped (1596) · test:slow 16 passed / 1 skipped · sync-economy --check 0 · build 0 · check-globals chromium 0 · verify --hours 24 PASS (goldens f90d1678 / a54c9cf9 match; trace 2c0d3ec3… MATCH).
Artifacts: `/workspace/egg-farm-studio/artifacts/v5-f1c-e87562c/results/` (SHA256SUMS) and `artifacts` branch `v5-f1c-e87562c/results/` (a612c0e).

## Tests (`tests/v5-f1c-effects.test.ts`; 10 tests at e87562c, 21 now, see the AC trace table)
- Composition: an empty registry gives `[grader]`; factors multiply and round once (X7 shape); an entry with its flag off (or `m4.enabled` 0) is never called; `by` attribution (Rush applies to Market Hand only, Frenzy to both); suspended gives no timed factor while the Grader stays; the Sell all preview equals the credit.
- Laying: the factor applies only with a live ctx; on a tick it applies only on focus ticks, still capped by the coop.
- Worker sales: uplift on focus ticks, none on suspended ticks.
- Flags off: a fixture entry with its flag off changes nothing over 10 min.

## Questions (all RULED, D-HOP-2026-10-29-06; see the update below)
- **Q-F1c-1 (PM Collection/HoP):** when the player sells from the Market sheet on mobile (a menu is open), are Frenzy/streak suspended? R23 says "sales under a menu get no ×2", but the sheet *is* the sell surface. F1c defaults player sales to not suspended; the UI can pass `{by: 'player', suspended: true}` if the ruling goes the other way.
- **Q-F1c-2 (Economy):** does Sweep count in golden reward E? It doesn't now: E uses the base rate, with no ctx.

Self-review: engineering/reviews/pr80-e87562c.md (studio folder).

## Update 2026-10-29 21:4x CET: merged #79 (incl. #81 F2), head 1a64e95; D-HOP-2026-10-29-06 rulings applied
- **Q-F1c-1 RULED**: the Market sheet is a play surface. A player sale is suspended ONLY when that tick's attended probe is false; the UI never passes `suspended: true` for the sheet. **Change:** `apply(s, a, b, ev?, attended = true)` passes `!attended` to `sellTo` for `sell`/`sellAll`; `Game.dispatch` passes `attendedNow()` (= `!readOnly && probe()`), the same read `frame()` uses. Before this, player sales were never suspended. Flags off: registry empty, so goldens are unchanged. Tests: attended=true sheet sale gets Frenzy x streak (via `apply` and via `Game.dispatch` + probe); attended=false is suspended; sellAll credit == preview.
- **Q-F1c-2 RULED**: Sweep is excluded from golden E. **Change:** `goldenEEggsPerSec(s, b)` in `sim/tracks.ts` = base `prodEggsPerSec` with no ctx (as GE-AC8 for P), the single path #1 must use. Test: it ignores a live Sweep.
- The "Open questions" above are closed; code comments name the question ids and D-HOP-2026-10-29-06.
Gates at 1a64e95 (historical): sync --check 0 · tsc 0 · vitest 1647 passed / 1 skipped · goldens 4/4 byte-identical · build + check-release-build 0 · build:html 0 · check-globals chromium 0 (3× PASS, flock .browser-test-2.lock, load ≤ 12).

## AC trace (AC id → test file::exact test name @ 174286e)
All in `tests/v5-f1c-effects.test.ts` (21 tests). Names are `describe > it` exactly as in the file; R23 and R24 are partial.

| AC id | test file::name | note |
|---|---|---|
| F1(c) registry composition / flag gate (D-C1) | `tests/v5-f1c-effects.test.ts::F1c registry composition > [F1(c)] empty registry: saleMultipliers is exactly [grader] (pre-F1c behaviour)` |  |
| 〃 | `tests/v5-f1c-effects.test.ts::F1c registry composition > [F1(c)][D-C1] an entry whose flag is off (or m4.enabled off) is never consulted` |  |
| X7 (factors × Grader, round once) | `tests/v5-f1c-effects.test.ts::F1c registry composition > [F1(c)][X7] factors multiply with the Grader and round once (golden X7 example shape)` | `[X7]` tag added in 5dd36d1 (Saves QA N1) |
| F1(c) `by` attribution | `tests/v5-f1c-effects.test.ts::F1c registry composition > [F1(c)] by attribution: Rush applies to Market Hand sales only; Frenzy to both` |  |
| D-C3 / R23 suspension (**R23 partial**) | `tests/v5-f1c-effects.test.ts::F1c registry composition > [F1(c)][D-C3] suspended (no focus): every timed effect counts as 1, Grader stays` | Saves QA gap 2 closed (deb3c9f/42d6274) |
| 〃 | `tests/v5-f1c-effects.test.ts::F1c laying (prodEggsPerSec) > [F1(c)][D-C3] tick: laying uplift only on focus ticks, still capped by the coop` |  |
| 〃 | `tests/v5-f1c-effects.test.ts::F1c laying (prodEggsPerSec) > [F1(c)][D-C3] tick: worker sales get effects on focus ticks and none on suspended ticks` |  |
| 〃 | `tests/v5-f1c-effects.test.ts::F1c D-C3 through advance(): a long frame buys at most 1.0 s of uplift > [D-C3][R23 partial] one 59 s frame (focusMs 1000) with a x2 fixture effect and Market Hand sales pays at most the uplift of 1.0 s (10 focus ticks)` |  |
| Preview == credit (CCR-80-m1) | `tests/v5-f1c-effects.test.ts::F1c registry composition > [F1(c)][CCR-80-m1] preview == credit: Sell all preview equals the sellAll action with live effects` | sim/Game level; UI wiring of `g.playerSaleCtx()` is UI #85/F6 (Saves QA I1) |
| 〃 | `tests/v5-f1c-effects.test.ts::Q-F1c-1 (D-HOP-2026-10-29-06): the Market sheet is a play surface; a player sale is suspended only when not attended > [CCR-80-m1][Q-F1c-1] x2 test effect, attended=true: Sell all and order-card previews == credit (playerSaleCtx + apply)` |  |
| 〃 | `tests/v5-f1c-effects.test.ts::Q-F1c-1 (D-HOP-2026-10-29-06): the Market sheet is a play surface; a player sale is suspended only when not attended > [CCR-80-m1][Q-F1c-1] x2 test effect, attended=false: Sell all and order-card previews == credit (playerSaleCtx + apply)` |  |
| 〃 | `tests/v5-f1c-effects.test.ts::Q-F1c-1 (D-HOP-2026-10-29-06): the Market sheet is a play surface; a player sale is suspended only when not attended > [CCR-80-m1][Q-F1c-1] x2 test effect, attended=true: Sell all and order-card previews == credit (Game.playerSaleCtx + dispatch)` |  |
| 〃 | `tests/v5-f1c-effects.test.ts::Q-F1c-1 (D-HOP-2026-10-29-06): the Market sheet is a play surface; a player sale is suspended only when not attended > [CCR-80-m1][Q-F1c-1] x2 test effect, attended=false: Sell all and order-card previews == credit (Game.playerSaleCtx + dispatch)` |  |
| §9.5 edge 3 / R24 (**R24 partial**) | `tests/v5-f1c-effects.test.ts::F1c §9.5 edge 3 / R24: offline grant and income preview never see a live lay effect (callers, not the helper) > [§9.5-e3][R24 partial] applyOffline and incomePerSec are identical with a live x0.01 lay effect registered` | Saves QA gap 3 closed (deb3c9f) by the caller-level test; the second row is the helper unit test, retitled in 5dd36d1 (Saves QA N2) |
| 〃 | `tests/v5-f1c-effects.test.ts::F1c laying (prodEggsPerSec) > [F1(c)] helper: prodEggsPerSec applies a Sweep-like factor only with a live ctx; with no ctx it returns the base rate (callers: see [§9.5-e3])` |  |
| Q-F1c-1 (D-HOP-2026-10-29-06) | `tests/v5-f1c-effects.test.ts::Q-F1c-1 (D-HOP-2026-10-29-06): the Market sheet is a play surface; a player sale is suspended only when not attended > [Q-F1c-1] attended=true: Frenzy and streak apply; attended=false: suspended (apply)` |  |
| 〃 | `tests/v5-f1c-effects.test.ts::Q-F1c-1 (D-HOP-2026-10-29-06): the Market sheet is a play surface; a player sale is suspended only when not attended > [Q-F1c-1] attended=true: Frenzy and streak apply; attended=false: suspended (Game.dispatch + probe)` |  |
| 〃 | `tests/v5-f1c-effects.test.ts::Q-F1c-1 (D-HOP-2026-10-29-06): the Market sheet is a play surface; a player sale is suspended only when not attended > [Q-F1c-1] sellAll follows the same rule; default (no attended arg) is attended` |  |
| Q-F1c-2 / GE-AC8 | `tests/v5-f1c-effects.test.ts::Q-F1c-2 (D-HOP-2026-10-29-06): Sweep is excluded from golden E > [Q-F1c-2][GE-AC8] goldenEEggsPerSec is the base prodEggsPerSec (no ctx) even with a live Sweep` |  |
| AC-M5A-16 flags off = byte-identical | `tests/v5-f1c-effects.test.ts::F1c flags off = byte-identical > [F1(c)][AC-M5A-16] a registry entry whose flag is off changes nothing over 10 min of play` |  |
| CCR-80-N readonly registries | `tests/v5-f1c-effects.test.ts::F1c registries are readonly in src (CCR nit #80) > [F1(c)][CCR-80-N] no src file mutates or casts away SALE_EFFECTS / LAY_EFFECTS (push/splice/pop/shift/unshift/length =/index assign/as)` | regex tripwire (Saves QA I2) |

## Post-CCR delta (CCR-reviewed `1a64e95` → `174286e`)
`git log --oneline 1a64e95..174286e --first-parent`: the 7 commits Saves QA traced at aa0ed32, plus the title-only commit `5dd36d1` and the rc/v5 merge `174286e`.

| SHA | subject | category |
|---|---|---|
| `4b47158` | Merge feat/v5-f1b-clock-rng (f5265b7, incl. F1a 2e18aba + rc/v5 d3b5a53 #78) | rc/v5 merge (parent restack). Second parent `f5265b7`. Conflict in src/game.ts: #79's inline flag guard moved into `attendedNow()`, equivalent for frame() and now also covers dispatch (Saves QA §1) |
| `90c68ef` | Merge feat/v5-f1b-clock-rng (b041561, incl. F1a 172ca3f) | rc/v5 merge (parent restack). Second parent `b041561`, clean |
| `c2dbb98` | self-review of CCR m1 + nit: `playerSaleCtx(attended)` for credit and previews, registries typed readonly, attendedNow skips the probe with flags off (CCR N-1 #79), x2 preview==credit tests, AC tags | CCR minor fix (+ tags) |
| `deb3c9f` | Saves QA trace gaps (V5SCAP): D-C3 59 s frame through advance(); §9.5 edge 3 / R24 caller-level test | Saves QA test gap |
| `42d6274` | Saves QA D-C3 advance() test: small orders, 1-cent rounding bound, every-tick-focus bound | Saves QA test gap |
| `736d04e` | CCR m1 scope: revert the src/ui/app.ts wiring (UI-owned); sim + `Game.playerSaleCtx()` stay, UI #85/F6 wires it | CCR minor fix (scope revert). `src/ui/` is byte-identical to rc/v5 b563c75 |
| `aa0ed32` | Merge feat/v5-f1b-clock-rng (02e7ede, incl. rc/v5 b563c75 #77) | rc/v5 merge (parent restack). Second parent `02e7ede`, clean; tree identical to 736d04e |
| `5dd36d1` | test titles only (Saves QA nits N1/N2): `[X7]` tag on the X7 composition test; helper-only prodEggsPerSec test retitled | tags/tables. **Minor fixes, self-reviewed (D-CEO-20261028-02)**: 2 `it(...)` title strings changed, no assertion or logic change |
| `174286e` | Merge origin/rc/v5 (2fa7318, #79 F1b squash-merged) | rc/v5 merge. Second parent `2fa7318`; conflicts in src/game.ts and src/sim/tick.ts resolved to this branch's side because 2fa7318's tree equals 02e7ede (merged in aa0ed32). **Merge tree `088814e5` = 5dd36d1's tree** (no content change) |

No unexplained production change (Saves QA qa/m3-recheck/pr80-aa0ed32.md §1).

## Gates at 174286e
- Local (Architect) @ 174286e (node v20.19.2, lane-run, `flock .vitest-eng.lock nice -n 10`, --maxWorkers=1): tsc 0 · targeted vitest v5-f1*/v5-f2* 8 files, 103/103. Tree identical to 5dd36d1 (v5-f1c-effects 21/21 there, every trace row matches a test name). Logs: /workspace/gates-v5/f1c-titles/
- Local (Architect) @ aa0ed32 (tree identical to 736d04e): tsc 0 · sync-economy --check 0 · build incl. check-release-build 0 · targeted vitest v5-f1*/v5-f2* 103/103. `5dd36d1` changes only two test titles, so sync/build are unaffected.
- Saves QA @ aa0ed32 (qa/m3-recheck/pr80-aa0ed32.md): mutations 10/10 killed · targeted vitest 88/88 · full vitest 1677 passed / 1 skipped (1678), exit 0 · tsc 0.
- GitHub CI @ 174286e: run **41017769715** (`ci`, pull_request) **success**: gate pass (12m53s: unit tests incl. sync-economy --check, test:slow, release build incl. tsc + check-release-build, release globals chromium, build:html, build-id check); release-globals job skipped (folded into gate, as on earlier runs). Mergeable: clean.

## Review
- CCR @ 1a64e95 (engineering/reviews/pr80-1a64e95-ccr.md, PASS 0B/0M/1m/1n): **manual CCR review, no Claude**. The file has no PASS_ID; `ops/tools/verify-claude-verdict.sh pr80-1a64e95-ccr` → "Claude calls used: 0 — no Claude review" (matches the file's "Claude calls used: 0/15" and ops/claude-verdict-audit-20261030.md). The superseded e87562c pass is the same: manual CCR review, no Claude.
- **Review: Architect self-review + green CI + Saves QA trace (rule 22: Claude is never a gate).**

## Known optional nits (Saves QA)
- N1 (the missing `[X7]` tag) and N2 (the old title that claimed callers but tested only the helper) are both fixed in `5dd36d1`, titles only.

