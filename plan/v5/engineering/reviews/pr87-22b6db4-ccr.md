Claude calls used: 1/15 (wrapper log lines: 2026-10-30T09:02:59+01:00, PASS_ID pr87-22b6db4, status ok)

```
219: 2026-10-30T09:02:59+01:00	pr87-22b6db4	code-review	claude-sonnet-5-5/high	ok	154	0	1
verify-claude-verdict.sh: Claude calls used: 1 (status ok) for PASS_ID pr87-22b6db4
```
Raw Claude output: `pr87-22b6db4-ccr-claude-raw.txt` (session 08209eb5).

# PR #87 — v5 #2 Collect Streak sim @ 22b6db41a7424285f10aa003ada774a415d4e9c5 — streak code paths only

**Claude Code Reviewer (Claude, 1 call) PASS — blocking/major/minor/nit = 0/0/4/2**

Scope (HoE): streak files only; a further rc/v5 merge for a balance.ts conflict is pending. Earlier full pass at 14894bd: `pr87-14894bd-ccr.md` (Claude, 2 calls, PASS 0/0/2/3) — kept, covers 14894bd.
Why a new pass: 22b6db4 = merge of rc/v5 6bcc194 (#80 F1c registry + #88) into 14894bd. `git diff 14894bd 22b6db4` on src/sim/streak.ts, src/save/m5-fields.ts, src/sim/state.ts, src/sim/timers.ts, src/config/*, tests/v5-streak-sim.test.ts is EMPTY, but the streak integration changed: the (1+s) factor moved into `SALE_EFFECTS` (src/sim/effects.ts:22-24), and payout.ts / actions.ts / tick.ts / game.ts (dispatch now passes `attended`) changed. This pass covers that wiring.

## Gates (reviewer-run)
- npm ci OK, tsc OK, `npm test` 1698 passed / 1 skipped, EXIT 0.
- Claude: `npx vitest run tests/v5-streak-sim.test.ts tests/v5-f1c-effects.test.ts tests/v5-f2-m5-fields.test.ts tests/m4a-flag-off.test.ts` → 78/78; goldens f90d1678 / a54c9cf9 printed.
- `npm run verify -- --hours 24 --seed 1 --no-shot`: trace **2c0d3ec37be1**, goldens flagOff ok, m4On ok (exit 1 only for "build-label: no screenshot: --no-shot", expected with --no-shot).

## Findings
**N-1 — minor — src/game.ts:396-402 (`attendedProbe` default `() => false`, `attendedNow`), call site src/game.ts:308.** Nothing in src calls `setAttendedProbe`. With `m4.flags.streak` on in the real Game, `dispatch` → `apply(..., attended=false)` → `sellTo(..., 'player', suspended=true)` → `playerSaleCtx(false)` → `saleEffectFactors` returns [] → player sales get no streak. New vs 14894bd (dispatch passed no `attended` there); intended per Q-F1c-1 (D-HOP-2026-10-29-06). Hold/decay were already frozen at 14894bd (focusMs 0 with unwired probe). Gated: no M5 flag on in the shipped build, no streak UI yet. Would be major if the streak flag were turned on before the probe is wired (row 17). Repro: `new Game(B({streak:1}))`, state with streakS 0.1 + a customer, `g.dispatch({type:'sell',customerId:1})`, no probe → credit = plain k·base·g.
**N-2 — minor — src/ui/app.ts:607, :613** (from rc/v5 #80, not introduced by #87): market previews call `saleValueCents(s,k,b)` / `sellAllPreview(s,b)` with the default attended ctx, not `Game.playerSaleCtx()` as payout.ts:19-20 / game.ts:403-405 document. With a flag on and the probe false, preview shows (1+s), credit gives none. No effect with flags off; F1c deliberately left UI wiring to UI #85/F6.
**F1 (from 14894bd) — minor — still stands, src/game.ts:304**: `endSession` emits `streak_peak{reason:'reload'}` without ending the run; a surviving page can emit it again.
**F2 / O-3 (from 14894bd) — minor — still stands, tests/bot-m5.ts:41,100,114**: no loud fail when bot-m5's own streak and the real `m4.flags.streak` are both on. The #88 change to bot-m5.test.ts only adds the CSV fixture.
**Nit — src/game.ts:399-402**: two consecutive JSDoc blocks above `attendedNow` (the actions.ts stacked-JSDoc nit from 14894bd is resolved at actions.ts:18).
**Nit — src/sim/payout.ts:16-17**: float association `(1*g)*(1+s)` vs spec order (unchanged from 14894bd).

## Checked, no issue
- (1+s) applied exactly once on every sale path (player sell, sellAll, Market Hand, sellAllPreview), via SALE_EFFECTS only; payout.ts no longer imports streakSaleFactor.
- `streakSaleFactor` gate (m4On && flags.streak===1, s>0, !suspended) and `saleEffectFactors` gate (flagOn, factor≠1, !suspended) agree; sellTo passes the same suspended to both, so extra_coins is never credited without the factor or vice versa; extra = value − value(streakS=0) with the same ctx, single rounding.
- Flag-off: `live=false` → no fx ctx, `layFactor` 1, no stepTimers; goldens and 24 h trace unchanged. No RNG use added. Offline grants call prodEggsPerSec with no ctx, so no timed effect enters offline earnings.
