# CSR-17-16 fuzz generator: is "greedy best-buy.ts" the AC7 bot policy? **MISMATCH**
HoQA / QA Engineer, Saves & Release Verification · 2026-10-19 ~10:25 CEST · code at main dd223f5 (`qa/csr/tmp-dd223f5`); spec v0.3.1 FROZEN, sha256 `0771dac0…1ad0`.

**The claim:** spec v0.3.1:224 says the generator is "driven by the greedy best-buy policy (src/econ/best-buy.ts; HoQA's 'AC7 bot' policy)".

**The AC7 bot I run:**
- qa/m3-scripts/ac7-l18-25-gate.ts:5 imports `runM2` from `<clone>/tests/bot-m2.ts`.
- :15 calls `runM2(b, sd, { model: 'seller15', use: [], T: 6*3600 })`. Seeds are `1..N` (:13), with N ≥ 30, default 30 (:7-8).
- The workers variant (ac7-l18-25-gate-workers.ts:6) and combined/f1-pacing.ts:4 use the same `runM2`.
- `tests/bot.ts` `buy()` (:13-22) uses the same `pickBuy`.

| Aspect | best-buy.ts `bestBuy()` | AC7 bot at dd223f5 (M4 on, seller15) |
|---|---|---|
| Entry point | `bestBuy(s,b)` best-buy.ts:72-110 | bot-m2.ts:57 `pickBuy` → bot-m4.ts:40 `pickM4All` (:23-28) → `bestPaybackAmong` best-buy.ts:151-161. **`bestBuy()` is never called** |
| Greedy? | **No.** Depth-3 bundle look-ahead (:80-96), max Σgain/Σcost | Bundle payback per first key: min Σcost/Σgain over depth-3 paths (`optionGain` :113-135), via `paybackOf` :147-149 |
| Affordability | Ignored: ranks every offered option (:73-74) | Best among **affordable** candidates. If none are affordable, buys nothing that check-in (**wait rule**, bot-m4.ts:25-27) |
| Option set | `options()` :44-66: Farm, Hens, Egg value, Collection **plus W1–W3 hires and W4 grader tiers** whenever unlocked | `candidates()` src/ui/next-goal.ts:20-30 **filtered to `keys`**: M1_KEYS = FARM/HENS/VALUE/COLL (bot-m4.ts:29), plus workers only if in `use` (bot-m2.ts:57) |
| Tie-breaks | Score within 1e-12 → BUY_ORDER (:86-88); no-gain fallback = first by BUY_ORDER (:99). The header comment :6 claims a lower-cost tie-break that `bestBuy` doesn't implement | Payback within 1e-12 → **lower cost** → BUY_ORDER (:156-158) |
| Workers | Always candidates when unlocked | M4 on + seller15: the hire-first loop is skipped (`allPick`, bot-m2.ts:51-55). Workers only through the pick if in `use`. **The AC7 gate passes `use: []`, so no worker or grader is ever hired** |
| Non-buy behaviour | None (a pure function) | 1 tap/s (bot-m2.ts:37), sellAll every 15 s (:39-40), Manage at the threshold (:41-46), buy loop ≤ 200/check-in (:49-61) |
| Seeds | n/a | `initialState(b, seed)` market RNG only (bot-m2.ts:29); no SellerVariance in the gate |
| Snapshot | n/a | `runM2` returns `M2Result` (reach/manages/hired/tiers…, :63-67). **No GameState**, so it can't emit a save at a stop tick without a hook |
| Older AC7 tree | — | qa/wt-ac7-8e6d53e has **no src/econ**. Its bot-m2.ts:56-57 rule is "Farm if affordable, else Collection if ≤ 50 % of Farm cost", and there are no tracks. Our AC7 runs there didn't use best-buy at all |

**Empirical check:** `qa/csr/tmp-dd223f5/tests/csr-fuzzpolicy.qa.test.ts`, vitest with 2 workers, output `qa/csr/probe-fuzzpolicy-out.json`. It replays the gate config (seller15, use: [], tap 1/s, sell 15 s) on seeds 1..10 × 1800 s and compares the two pick functions at every buy decision:
- **827 AC7 buys, of which `bestBuy()` agrees on 327 (39.5 %).**
- Of the 708 decisions where bestBuy's own pick was affordable, it agreed on 327 (46 %).
- In 538 of the 1,700 disagreements, bestBuy picked a worker.
- 1,319 bestBuy picks were unaffordable at the time.

**Verdict: MISMATCH.**
- best-buy.ts `bestBuy()` is neither greedy nor the AC7 policy.
- The AC7 bot is `pickM4All` (bundle payback over affordable FARM/HENS/VALUE/COLL [+ workers in `use`], tie → cost → BUY_ORDER, wait rule) inside runM2's tap/sell/Manage loop.

**Suggested rewrite for PM** (my wording; I'm not messaging anyone):
> Save generator = `tests/bot-m2.ts` `runM2(b, seed, { model: 'seller15', use: ['market_hand','coop_hand','hawker','grader'] })` at dd223f5 with M4 on (buy rule: tests/bot-m4.ts `pickM4All`), seeds 1..500, snapshotting `GameState` at a seeded stop tick via a QA-side copy or hook (runM2 returns no state), serialized with save.ts `serialize`.

- **Use the full `use` list, not the gate's `use: []`.** Otherwise no fuzz save ever has workers or a grader tier, and bounds (c)/(d) of §17.2 are never exercised.
