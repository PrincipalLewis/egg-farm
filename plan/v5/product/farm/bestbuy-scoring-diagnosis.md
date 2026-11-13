# ★ Best buy scoring: diagnosis and fix proposal · PM Farm Upgrades · v0.1 PROPOSAL · 2026-10-24 17:25 CEST
Ask: HoP, from the Critic's L10+ read (`product/critic/l10-interaction-read-2026-10-23.md`, lines 17-27 and 45) under D-CEO-20261024-05. **Paper only**: no code, branches or PRs. Builds on `product/farm/m4b-rv-rootcause.md` RV-2 (affordable-first picker, zero-gain bundle scoring, F14/C10 repro). That isn't repeated here.

**Code of record:** RC1 `5d9efa6` (PR #67 head, build m4.1+5d9efa6), the build the Critic played. Read at `product/critic/wt-5d9efa6` and run from a scratch copy at `/workspace/scratch/bb-5d9efa6`. Newer worktrees (`wt-scratch-asleep-sizing` @ 2302778, `wt-yard-hens` @ 2c9c0bb) differ from 5d9efa6 only in `income.ts` (+5 lines, the asleep signal) and `next-goal.ts` (label), and neither touches scoring or the picker. `src/econ/best-buy.ts`, `src/ui/pick-hysteresis.ts` and `src/ui/goal-label.ts` are identical to 5d9efa6.
**Repro:** `product/farm/bestbuy-diag/` contains `probe.ts` (the real sim from the Critic's `l10-save.json`, Manage all kept up, a buy check every 3 s, as in the Critic's script), `dump.ts` (scores at chosen ticks) and `seeds.ts` (AC7 bots on seeds 1-200, with a 2-line hook added to `tests/bot-m4.ts` **in the scratch copy only**). Outputs are in `probe-out.txt`, `dump-out.txt` and `seeds-out.txt`. Run: `cd /workspace/scratch/bb-5d9efa6 && P=star node_modules/.bin/vite-node <dir>/probe.ts`.

---

## 1. Answer: is it "ROI without weighting the next Farm milestone"?
**Mostly no.** The score is bundle payback, and Farm's unlock value already comes through the bundle. Farm is the **best-payback row** in every L10-L27 state measured. ★ goes to Collection because of **four picker rules** that let a zero-gain row win. The one exception is L28-L29, where Farm genuinely has zero modelled value on shipped data (§1.3).

### 1.1 How candidates are scored (exact)
- `bestBuy` / `optionGain` (`best-buy.ts:72-110`, `:113-136`) use income from the model `incomePerSec(…, {assumeWorking:true})` (`income.ts:62-63`): min(prod, demand, collect) × price − wages.
- **Single-step gain** = income(after) − income(now). **Single payback** = cost/gain, or ∞ if gain ≤ 0.
- **Bundle payback** (`optionGain` walk, `best-buy.ts:120-134`) = min over paths of length ≤ 3 *starting with that row* of Σcost/Σgain, where Σgain is measured at the end of the path and must be > 0.
- **The picker ranks by bundle payback only:** `paybackOf` (`best-buy.ts:147-148`) → `scorerFor` (`pick-hysteresis.ts:26-28`). Ties go to the lower cost, then BUY_ORDER (`pick-hysteresis.ts:34-38`).
- ★ = `bestBuyMark(hintPick)`, i.e. the hint pick when it's affordable (`goal-label.ts:96-97`). The chip is rendered at `app.ts:498`, and the strip at `app.ts:424`.
- **There's no explicit milestone or unlock term.** Track-cap headroom, Grader tiers (Farm L18 onward) and Balanced tiers count **only implicitly**, when a following buy within depth 3 turns them into income (Farm → Hens/Value, or Farm → W4). Farm's own single-step gain is **negative**: wages scale with Farm level (`income.ts:56`) and production is the binding term (Hens), so measured gain is −$0.012/s at every level. Farm scores only through its bundle, and that works on L10-L27 data: Farm's bundle payback is the best (`dump-out.txt`, e.g. F17: Farm 166 s, Value 211 s, Collection 242 s).

### 1.2 Why Collection gets ★ (new findings on top of RV-2)
| # | Cause | file:line | Measured |
|---|---|---|---|
| C1 | **Collection has zero modelled gain everywhere in M4.** Collect is never the binding term because the model assumes 1 tap/s × 1.5 with Coop Hand (`income.ts:31`), and M4A-5/7/15 removed its price bonus (`tracks.ts:6`). | `income.ts:31,63` | The AC7 bots bought 25.0 (workers bot) and 20.0 (band bot) Collection levels per seed via the pick. **Every one of them had gain = 0**, 5,000 of 5,000 on seeds 1-200 (`seeds-out.txt`). |
| C2 | **Zero-gain rows inherit the bundle of the next real buy.** Collection's bundle = (c_Coll + c_Farm + c_X)/gain(Farm→X). Collection is cheap next to Farm, so its bundle payback lands within ~5-15 % of Farm's. | `best-buy.ts:120-134,147-148` | F17: Collection 186.7 s vs Farm 174.5 s (`probe-out.txt` END line). F10: 399 vs 314. |
| C3 | **Affordable-first (RV-2).** Collection is usually the cheapest row, so it's often the only affordable one. | `pick-hysteresis.ts:56` | 13 of 13 ★=Collection buys before L30 happened with Farm ≤ 18 s away (`probe-out.txt`, star run). |
| C4 | **NEW: the 0.9× hysteresis locks ★ on the zero-gain row.** Once Collection is shown, Farm has to beat 0.9 × Collection's payback to take ★. Because of C2, it almost never does. | `pick-hysteresis.ts:15,61-68` | A player who never buys Collection (`P=nocoll`) **stalls at Farm L17 indefinitely**: with $37.3K banked and Farm, Hens, Value and Collection all affordable, ★ stays on Collection (186.7 s), because Farm's 174.5 s > 0.9 × 186.7 = 168.0 s. |
| C5 | **NEW: at L28-L29 every row scores ∞, and the cost tie-break picks Collection.** With Hens and Value at MAX (30), Farm L29/L30 adds no modelled income and no bundle exists (all `null`). | `pick-hysteresis.ts:34-38` (`a.costCents < z.costCents`) | `dump-out.txt` t=2055 / 2250: FARM bundle `null`, COLL bundle `null`, hint = COLL, highlight = FARM. **The bubble and the Farm tab point at different things.** |

### 1.3 What this costs, and which dead zones scoring can and can't fix
- **Following ★ (the current rule) from the Critic's L10 save** (`probe-out.txt`) means 13 Collection buys before L30, and L10→L30 takes **39:27**. Each buy delays Farm by cost ÷ income, e.g. ≈38 s at L17 ($7.2K at $189/s), ≈70 s at L28 ($193K at $2.78K/s) and ≈111 s at L29.
- **The longest gaps between meaningful buys** (Collection with gain 0 doesn't count): L17 1:21, L28 **2:36**, L29 **3:48**. This matches the Critic's measured L17 56 s, L28 ~2:15 and L29 ~1:55 in location and order. The Critic's numbers are shorter because they come from a different path (their own taps and timing).
- **Option A** (§2: zero-gain rows never take ★, Farm wins ∞-ties) gives L10→L30 in **32:03 (−7:24, −19 %)**, longest gaps L28 1:39 and L29 2:09, and no gap > 2:09 between L10 and L30.
- **Option A + B** (adds the effective-payback wait rule) gives **31:21**, with the same longest gaps. B adds only ~40 s over A on this path, so **most of the value is in A**.
- **Scoring can't fix:** (i) **L30+**. Only Collection is left, at 1-7.5+ min per buy and growing. That's content (#12 L30 cap payoff, M5.1; L30+ decision; #13 prestige). (ii) The L22 "nothing affordable" ~20 s and the L18-27 20-45 s waits are cap gating (Hens/Value ≤ F+3) plus cost curves, which is Economy's area. (iii) ~~L29→L30 costs $624,316~~ **Corrected (Economy Q-E3): off by one. L29→L30 is $323,719 (row 29), 1:56 from an empty bank, ×1.35. $624,316 is L30→L31.** The 3:48 gap came from the zero-gain buy; under Option A, L28–30 is ≤ 2:54 on the worst seed.

## 2. Proposal: spec section "Best buy v2" (replaces M4A-18's affordable-first clause for the hint and ★; highlight rules otherwise unchanged)
Terms: **meaningful row** = an offered row with single-step gain > ε (ε = 1e-9 $/s), **or** FARM (a progress gate, exempt because its single-step gain is negative by design, `income.ts:56`), **or** a worker hire or Grader tier. **Zero-gain row** = any other offered row (today: Collection at every level; any future cosmetic or tap-only buy). Rows excluded by D-HOP-40 (`Max for this farm`), by R11 (Lab, breed-stall and Golden Goose buys) or by MAX/cap aren't candidates at all (unchanged).

**Part A: picker rules (UI layer; small).**
- **BBv2-1 Zero-gain never ranked.** The hint, the highlight and ★ rank only meaningful rows. A zero-gain row can be the strip target (without ★) only when no meaningful row is offered at all (today: after Farm L30).
- **BBv2-2 Hysteresis never protects a zero-gain pick.** (This follows from BBv2-1, but it's stated so a test pins it.) If the current pick isn't meaningful, the switch happens at once, without the 0.9× bar or the 2 s hold.
- **BBv2-3 ∞-tie rule.** When the best payback is ∞ (no modelled gain anywhere), FARM wins, then BUY_ORDER. Lower cost never decides an ∞-tie.
- **BBv2-4 Dead-zone display.** When no meaningful row is affordable, the strip targets the meaningful row with the best payback (ties to the nearer ETA) and shows its countdown, e.g. `Farm L29 · ~1 min 10 s`. ★ stays affordable-only (F4-13 unchanged), so a countdown target has no ★.

**Part B: score (econ layer; changes the AC7 bot's pick too).**
- **BBv2-5 Effective payback** = bundle payback + max(0, cost − coins) ÷ income(working). This is "seconds from now until this buy has paid back", so a better row that's a few seconds away beats a worse affordable one. It replaces affordable-first for the hint. It's the RV-2c wait rule written as one number.
- **BBv2-6 Shared source.** `bestPaybackAmong` (which the AC7 seller15 bot uses, `tests/bot-m4.ts` `pickM4All`) and the UI picker apply the same BBv2-1/3/5, so the bot keeps modelling a ★-follower (D-HOP-2026-10-19-02).
- **Explicit milestone term: not proposed for current data.** Farm's unlock value already reaches the score through the depth-3 bundle (§1.1). The only place Farm has no value is L28-30, and there BBv2-3 handles it honestly without inventing income. **Revisit only if L30+ ships:** if a cap offset > 2 puts the first income-bearing buy more than 3 buys after Farm, depth 3 can miss it. Option for Economy: depth 4, or an unlock term = gain of the first newly allowed track level ÷ (Farm cost + that level's cost).

**Tunables** (proposal, for Economy to model): `bb_zero_gain_eps` = 1e-9 $/s; `bb_tie_order` = FARM, then BUY_ORDER; `bb_eta_weight` = 1.0 (the multiplier on time-to-afford in BBv2-5; 0 = Part A only); `bb_switch_ratio` stays 0.9 for meaningful-vs-meaningful switches; `bb_depth` stays 3 (4 only if L30+ needs it).

### Edge cases
- **Before Coop Hand, with real tap-binding:** if a future model makes collect bind (e.g. a lower modelled tap rate), Collection gets gain > 0 and becomes meaningful automatically. The rule is about gain, not about Collection.
- **M5.0 A1 / streak:** if credited taps pay coins scaled by eggs per tap, Collection's real value becomes non-zero but stays unmodelled. See Q-E2.
- **Asleep/Unpaid workers:** scoring stays on `assumeWorking` (RV-2e, separate). The Refill hint path (`bestBuyNeedsRefill`) is unchanged.
- **Paused worker (M5.0 Pause):** follows HoE's Rule 4 (Paused stays out even with `assumeWorking`), and BBv2 doesn't change that.
- **Hysteresis between two meaningful rows** is unchanged (M4A-41 keeps passing).
- **Flag-off (M4 off)** stays byte-identical (M4A flag-off tests).
- **F4-23:** the Farm label is unchanged. F4-19/B1-10: `Max for this farm` stays a non-candidate.
- **Fresh save with income 0:** BBv2-5's ETA term is ∞ for unaffordable rows, so behaviour falls back to the affordable best. UC17 (Collection-first at start) needs a check: Collection has zero gain there too, so **UC17's "Collection first" expectation would stop holding**. Flag it to HoP/Art and decide whether UC17 is retired (Q-H2).

### Telemetry (in the M5 telemetry subset, no PII)
- `best_buy_shown {key, meaningful, affordable, payback_s, eta_s, farm_eta_s}`: on every hint change, rate-limited to 1/5 s.
- `best_buy_followed {key, ms_since_shown}`: a purchase that matches the shown ★.
- `zero_gain_purchase {key, farm_eta_s}`: a Collection buy while a meaningful row was ≤ 60 s away.
- `dead_zone {farm_level, s, reason: 'none_affordable'|'cap'|'max'}`: emitted when ≥ 30 s pass with no affordable meaningful row.

## 3. Acceptance criteria (BB-1..BB-12)
- **BB-1 No ★ on zero-gain while meaningful exists.** Property test over every state on the AC7 traces (seeds 1-200) plus fixtures F10/C10, F14/C10, F17/C14, F22/C18: if any meaningful row is offered, ★, the hint and the highlight are never a zero-gain row.
- **BB-2 No ★ on zero-gain while a positive-gain buy is affordable within N s** (N = `bb_wait_s`, proposal 60 s). This is the weaker form of BB-1 and is kept only if HoP rejects BB-1. With BB-1, it holds trivially.
- **BB-3 Hysteresis can't hold a zero-gain pick.** Fake-clock test reproducing the L17 stall: coins $37.3K, F17 H19 V18 C10, current pick Collection. On the next evaluation the pick is FARM, and ★ = FARM (today it's COLL forever; `probe-out.txt` END).
- **BB-4 ∞-tie goes to FARM.** F28 H30 V30 C21 and F29 H30 V30 C22 (`dump-out.txt`): hint = highlight = FARM. With coins < Farm cost, the strip shows `Farm L29 · ~X`, without ★ and never Collection.
- **BB-5 Dead-zone display.** Whenever no meaningful row is affordable, the strip targets a meaningful row with a countdown. A zero-gain target appears only when no meaningful row is offered (after F30). There's a test for each.
- **BB-6 D-HOP-40 unchanged.** `Max for this farm` rows never get ★, the hint or the highlight (= B1-10 / F4-19, re-run).
- **BB-7 R11 unchanged.** Lab, breed-stall and Golden Goose buys never get ★ (M5 rule, re-run when they exist).
- **BB-8 Meaningful-vs-meaningful hysteresis unchanged.** M4A-41 (a)-(d) and `tests/m4a-pick-hysteresis.test.ts` pass with no edits other than new cases.
- **BB-9 Dead zones (bot).** The seller15 workers bot (runM2, VAR_DEFAULT) following BBv2, on seeds 1-200: no gap > 180 s between meaningful purchases from Farm L10 to reaching L30, P95 and worst seed. ~~Known exception~~ dropped per Economy Q-E3 (the step is $323,719; it was an off-by-one).
- **BB-10 AC7 changes are expected (Part B only).** AC7 trace hashes **will change**, and that's intended. Economy re-runs the AC7 band (`pacing.test.ts`), the L18 sanity check, the L18-25 worst-seed guards, M4A-40 (`m4a_gate40.py`) and TR-5 on the BBv2 bot, and publishes new baseline hashes. Ship needs all hard gates PASS, or a signed retune/re-baseline.
- **BB-11 Sequencing with F4-25.** BBv2 lands in its own PR **after** the F4-25 gate (bundle exposure, AC7 hashes byte-identical) has passed on the pre-BBv2 head. F4-25 is never re-measured across a BBv2 change.
- **BB-12 Telemetry.** The four events in §2 fire with the listed fields (unit test on the event sink). `best_buy_shown.meaningful` is false only after F30.

## 4. Gate impact measured (scratch, not gate runs; `seeds-out.txt`)
| Bot, seeds 1-200 | Current | A (UI rules applied to the bot) | A+B |
|---|---|---|---|
| runBot seller15 (AC7 band bot): Farm level at 30:00, band 18-22 | 20 | 21 (in band) | 21 (in band) |
| runBot: L18 time P50 (sanity 19.8 min ±10 % = 17.8-21.8, non-gating) | 21:15 | **17:15 (out)** | **16:30 (out)** |
| runM2 workers + variance: time to L30 P50 / worst | 49:38 / 51:37 | 41:01 / 45:59 | 40:34 / 45:24 |
| runM2: slowest Farm level L10-30, P95 / worst | 4:07 / 4:27 | 3:22 / 3:57 | 3:19 / 4:00 |
| runM2: L18-25 slowest level, P95 / worst (guard 390 / 480 s) | 3:57 / 4:16 | 3:16 / 3:57 | 3:14 / 4:00 |
| runM2: Farm level at 30:00 | 22 | 24 | 24 |
| Zero-gain Collection buys per run via the pick | 25 (workers) / 20 (band) | 0 | 0 |
**Reading:** today's pacing has **~20-25 zero-gain Collection buys per run built in as a hidden coin sink.** Removing them speeds L0→L30 by ~17-18 % for anyone following ★. The hard AC7 band still passes (L21), the L18-25 guards get better, and the L18 sanity check fails. Hashes change in every case. Under **Part A alone as UI-only** (bot untouched), the AC7 hashes stay byte-identical by construction, but the gates then model a player who buys Collection 20-25 times while the UI tells them not to, so the gates become optimistic about play time.

## 5. Conflict with F4-25
F4-25 (m4a-spec v1.24/v1.25: "adding the bundle output changes no pick; AC7 hashes byte-identical on seeds 1-200") and BBv2 Part B are **incompatible in one change**, because BBv2 changes picks on purpose. Part A as UI-only doesn't touch `best-buy.ts`, so it doesn't conflict, but it still must not ride in the same PR. Sequencing is fixed by BB-11. If D-HOP-42's bundle field ships, BBv2-5 should read the same bundle, so there's one planner and the F4-22 "unlocks" label stays truthful.

## 6. Size
| Part | Eng | QA / Economy | Notes |
|---|---|---|---|
| A (BBv2-1..4), UI picker plus tests | ≈0.5 dd (`pick-hysteresis.ts` scorer filter + tie rule; `next-goal.ts` pool; tests) | QA ≈0.25 dd; AC7 untouched if the bot is left alone | Plus an Art check on the countdown-without-★ strip state (already exists for unaffordable picks) |
| B (BBv2-5..6), econ + bot | ≈0.5 dd | **Economy ≈1-2 dd:** re-run every pacing gate, decide on a retune vs re-baseline for the L18 sanity check and the ~18 % speed-up, publish new hashes | The cost is in the gates, not the code |
| Total | ≈1 dd eng | ≈0.5 dd QA + 1-2 dd Economy | **M** overall because of the gate re-run; S in code |

## 7. Recommendation: **M5.1** for the fix (A+B together with Economy's re-run), plus an optional XS stopgap in M5.0
- **Why not M5.0 as a "small item":** the code is small, but the effect isn't. It speeds L0→L30 by ~17-18 % and needs every pacing gate re-run. M5.0 is judged on the window gate plus L0-30 pacing (decisions.md, 2026-10-24 Economy/HoP note), so a second pacing change would muddy the reading of the active layer the playtest is meant to measure. Faster progression also gets players to the L30 "permanent dead zone" sooner, and its payoff (#12) is M5.1. Ship the fix together with #12 and the Economy retune.
- **M5.0 stopgap (XS, ≈0.25 dd, optional, HoP's call):** **only the ★ chip and the strip ★** skip zero-gain rows (`bestBuyMark` returns null when the pick isn't meaningful). There's no pick change, the AC7 hashes stay identical, and F4-25 is unaffected. The strip may still name Collection, but without ★, so the game stops endorsing a buy that does nothing for income. It doesn't fix the L17 lock (C4) or the L28-29 tie (C5), which need Part A.
- If HoP wants the player-visible improvement in M5.0 anyway, take **Part A UI-only** (≈0.5 dd, AC7 identical). Its known downside is that the gates' bot no longer follows the UI until Part B lands in M5.1.

## 8. Questions for Economy
- **Q-E1:** Is the ~20-25 zero-gain Collection buys per run an intended part of pacing? If ★ stops recommending them, do you **retune** (e.g. Farm and track costs up about 15-20 % across L10-30) or **re-baseline** the L18 sanity check and t20/t30 expectations?
- **Q-E2:** Under M5.0 A1/streak, does Collection gain real value (coins per credited tap scaled by eggs per tap)? If so, should best_roi model it at an assumed tap rate (and which, given `assumeWorking`'s 1 tap/s collect), so Collection becomes meaningful honestly rather than by exemption?
- **Q-E3:** For the Farm L29→L30 step ($624,316 against ~$2.78K/s ≈ 3:44 from an empty bank, ×1.93 over L28→29): retune it, or ask HoP to grant a 240 s exception to BB-9 for that one step?
- **Q-E4:** On the L30+ candidate CSV, can the first income-bearing buy sit more than 3 buys after a Farm level (per-row offsets > 2)? If yes, BBv2 needs depth 4 or the unlock term in §2.
- **Q-E5:** Confirm `bb_eta_weight` = 1.0 (A+B measured only ~40 s better than A alone from L10). Or should Part B be dropped and Part A applied to the bot instead, which keeps the gate model in line with the UI more cheaply?

**Questions for HoP:** Q-H1, BB-1 (strict) or BB-2 (N = 60 s)? Q-H2, retire UC17's "Collection first at start", since Collection has zero modelled gain from the very first tick?


## HoP rulings (D-HOP-2026-10-24-25)
- Q-H1: **strict BB-1**; BB-2 dropped.
- Q-H2: **UC17 retired.** New AC BB-13: on a fresh save, the first ★ is a meaningful buy affordable within 30 s.
- The full fix is M5.1, after F4-25 (BB-11). Part B waits on Economy Q-E1..5. The M5.0 stopgap is `product/farm/bb-stopgap-spec.md`.


## Economy answers (product/farm/reviews/bestbuy-diagnosis-econ-answers.md)
- **Q-E1:** not a deliberate sink, but T3 was tuned with the bot making those buys. Part A in the bot fails the L10 floor (7.50/7.56 vs 7.8 min), so any bot-side change needs a **CEO amendment** (L10 window and L0–30 freeze). No cost retune; re-baseline in M5.1.
- **Q-E2:** no M5.0 value. Add an M5.1 collect fix: model collection at 0 player taps once a Coop Hand is hired.
- **Q-E3:** off-by-one (see above). The BB-9 exception is dropped.
- **Q-E4:** keep depth 3 (1,029 states F29–49 agree).
- **Q-E5:** **drop Part B.** M5.1 = Part A shared by the UI and the bot + the Q-E2 fix + the re-baseline (pending CEO).
