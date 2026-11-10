**v5 F1c: timed-effects registry feeding `saleMultipliers()` and `prodEggsPerSec()`, with `by` attribution** (engineering/m5.0-sizing.md §1 F1(c), §4 hotspot 2, §12.1 D-C3; golden spec X7/R23). Draft into `rc/v5`. Manifest row 7.

**Stacked on #79 (F1b), which is stacked on #77 (F1a).** This PR's own change is commit `e87562c` (6 files, +155 / −14). The diff against rc/v5 includes F1a and F1b until they merge. Merge after #77 and #79.

## What
- `src/sim/effects.ts` (new): `SALE_EFFECTS` and `LAY_EFFECTS` are empty here; each feature PR appends one entry. An entry is `{id, flag, factor(s, b, ctx)}` and is consulted only while `flagOn(b, flag)` and the context isn't `suspended`. `saleEffectFactors()` returns `[{id, factor}]` so the UI can attribute chips. `layFactor()` returns the product of the live lay factors. `SaleCtx {by: 'player' | 'market_hand', suspended?}`: Rush keys on `by`.
- `payout.ts`: `saleMultipliers(s, b, ctx = PLAYER_SALE)` = `[grader, ...live factors]`, rounded once (X7). `saleValueCents(s, k, b, ctx)`. **Every preview and the credit go through the same function, so preview == credit.**
- `tracks.ts`: `prodEggsPerSec(s, b, ctx?)` = base × `layFactor`. With no ctx it's the base rate, so offline grants, income previews and golden E can't pick up a timed effect (§9.5 edge 3).
- `tick.ts`: when some M5 flag is on, the coop fill and Market Hand sales get `{suspended: !clock.focus}` (D-C3: no uplift on ticks without focus). `actions.ts`: `sellTo(..., by, suspended)`.

## Flags off: byte-identical
With every flag off, `fx` is `undefined`, the registry is empty, `layFactor` is exactly 1 and `saleMultipliers` is `[grader]`. flag-off f90d1678, M4-on a54c9cf9 and the 24 h trace 2c0d3ec3… all match.

## Gates (HEAD e87562c; gate id `v5-f1c-e87562c`)
tsc 0 · vitest (--minWorkers=1 --maxWorkers=2) 1595 passed | 1 skipped (1596) · test:slow 16 passed / 1 skipped · sync-economy --check 0 · build 0 · check-globals chromium 0 · verify --hours 24 PASS (goldens f90d1678 / a54c9cf9 match; trace 2c0d3ec3… MATCH).
Artifacts: `/workspace/egg-farm-studio/artifacts/v5-f1c-e87562c/results/` (SHA256SUMS) and `artifacts` branch `v5-f1c-e87562c/results/` (a612c0e).

## Tests (`tests/v5-f1c-effects.test.ts`, 10 tests)
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
Gates at 1a64e95: sync --check 0 · tsc 0 · vitest 1647 passed / 1 skipped · goldens 4/4 byte-identical · build + check-release-build 0 · build:html 0 · check-globals chromium 0 (3× PASS, flock .browser-test-2.lock, load ≤ 12).
