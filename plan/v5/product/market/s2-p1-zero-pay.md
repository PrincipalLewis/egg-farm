# S2-P1: "pays $0.00" / "Sell 0/N" at Farm L16 · findings · 2026-10-16 · PM, Market/Customers
Head of Product P1, due Mon Oct 19. Report: at Farm L16 Vadim saw 4 customers, each "pays $0.00" and "Sell 0/N"; Sell all used 28 eggs on orders of 85–138 and none completed.

## TL;DR
- **Vadim was on the old m3-rc0 build (`game-m3`), not an rc1 branch.** Both the "pays $X / Sell k/N" card and the 85–138 order range exist only there.
- **"$0.00" is how that build was specified** (old layout-spec: pays = min(basket, N) × price), so it shows $0 whenever the basket is empty. It's **superseded by Economy's P2** (full order value + progress, never $0.00), which **is implemented on the rc1 branches** (commit 5c02fe4).
- **Sell all is front to back as specified, not spread.** Partial sales **are paid** per egg at sale time. No bug in the sim.
- **No order completing is by design** (demand ≈ 1.2× supply, ≈ 1.5× with a working Hawker). What's missing is copy telling the player they're paid per egg as they sell.

## 1. What the specs say
- feature-spec.md §2.4 + MK-6/7/8: per-card Sell sells k = min(basket, remaining), coins += round_half_up(k × egg_price) **at that sale**; a partly served customer stays with the rest. core-loop-spec step 3 and answer 2: "Sell sells min(basket, N) … partial fills allowed … Sell all serves queue front-to-back".
- **No spec or decision says unfilled orders pay nothing until complete.** (Searched decisions.md, product/decisions.md, core-loop-spec.md, feature-spec.md.)
- Card display, two generations:
  - Old: `art-ux/layout-spec.md:123`: "pays $X.XX … where X = min(basket,N)×egg_price". With an empty basket that is $0.00 by construction.
  - New (P2): `product/playtest1-economy-proposal.md:12`: "order cards show the full-order value and progress, e.g. 'Wants 40 eggs · pays $70 · 12/40', never '$0.00'". `art-ux/m3-customer-queue-spec.md:49` (v1.2): "`value` = full order value = want × price per egg … never the value of what's currently fillable. Never '$0.00'". `product/playtest1-resim.md:67`: P2 "is still what removes the 'stuck' read".

## 2. Build evidence
| Question | `game-m3` (m3-rc0, last UI change bf1962a, Oct 15 21:36) | rc1 branches (`game-rc1-ui`, `game-rc1-save`, `game`) |
|---|---|---|
| Card copy | `src/ui/app.ts:381–384`: k = min(basket, rem); "pays ${fmtMoney(k × price)}"; button "Sell ${k}/${rem}", disabled when k = 0 | `src/ui/orders.ts:11–17` (P2, commit 5c02fe4, Oct 15 23:47): line "`have`/`want` eggs · `value`" with value = **want × price** (never below $0.01); button "Need N" / "Sell k" / "Sell" |
| Why $0.00 | basket = 0 ⇒ k = 0 ⇒ 0 × price = $0.00 and "Sell 0/N" (exactly the old layout-spec) | Can't happen: value uses the full order (`orders.ts:13–14`) |
| Sell all order | `src/sim/actions.ts:32`: loops `s.customers` in queue order, `sellTo` each until basket < 1 | Same, `src/sim/actions.ts:32` |
| Amount per customer | `actions.ts:12`: k = min(floor(basket), remaining), so the **front customer takes everything it can**; later customers get only leftovers | Same |
| Partial paid? | `actions.ts:14–20`: value = k × price (× Grader); `coinsCents + value` on every sale, partial or not; customer kept with `filled` | Same |
So with 28 eggs and front order 85+, Sell all gives all 28 to the **first** customer, pays 28 × price, and leaves the others untouched. It doesn't spread. After the sale the basket is 0, so every card in the old build shows "pays $0.00 / Sell 0/N", which reads as "nobody paid".

## 3. Order range check (economy.csv, no numbers changed)
| Config | L16 base range | with Hawker ×1.25 (Working) | Matches 85–138? |
|---|---|---|---|
| **P1q** (economy.csv now; rc1 branches): interval 2.2 s, demand 30–60 | 30–60 | 38–75 | No |
| **Pre-P1q** (game-m3 balance.json: interval max(3, 10×0.95^16) = 4.40 s, demand 0.8k–1.6k, k = 17 × 4.40 = 74.9) | 60–120 | 75–150 | **Yes** (85–138 sits inside) |
Supply at L16: 17 eggs/s (economy.csv `eggs_per_sec`). Demand: P1q 45 avg / 2.2 s ≈ 20.5 eggs/s (≈ 1.2×), ≈ 25.6 with the Hawker (≈ 1.5×). Old config gives the same per-second demand in half as many, twice-as-large orders. In both, a 28-egg basket is under 2 s of production, smaller than one order, so orders complete only over several sales, and in the old build no single Sell all completes one. **This confirms Vadim's build was pre-P1q game-m3 with a Working Hawker.**

## 4. Classification
| Issue | Class |
|---|---|
| "pays $0.00" on every card when the basket is empty | **Bug against the current spec** (P2 / queue spec v1.2) **in game-m3 only**; intended under the old layout-spec. Already fixed on rc1 branches (5c02fe4). Doc gap: `art-ux/layout-spec.md:123` still describes the old formula. |
| "Sell 0/N" disabled button | Same: old copy; rc1 shows "Need N". |
| Sell all "spreads" eggs | **Not a bug**: front to back per spec (actions.ts:32). The perception came from all cards reading $0.00 afterwards. |
| Partial sales not paid | **Not a bug**: paid per egg at sale time (actions.ts:14–20). |
| No order completes at L16 | **Intended** (demand > supply by design; Economy M1-R1 and P1q). Orders are half the size under P1q. |
| Player can't tell they were paid for a partial fill | **Spec gap**: no copy says coins are paid per egg as you sell. |

## 5. Answers to Economy/Balance
1. **P2 ("pays $70 · 12/40")**: specified in `product/playtest1-economy-proposal.md:12` and `art-ux/m3-customer-queue-spec.md:49`; **implemented** on the rc1 branches in `src/ui/orders.ts:11–17` (commit 5c02fe4, line "`have`/`want` eggs · $full value", progress bar; Art & UX review rc0-pt1-13 confirms "never $0.00 on cards"). The card showed $0.00 because Vadim's build was `game-m3`, which predates P2 and still computes pays = min(basket, N) × price (`game-m3/src/ui/app.ts:383`).
2. **Sell all**: the build does **not** spread. It serves front to back (`src/sim/actions.ts:32` in all builds), and each customer takes min(basket, remaining) (`actions.ts:12`). No fix needed.

## 6. Proposed rc1 fixes
1. **Build/process (no code):** make sure playtests and QA use an rc1 build (P1q + P2), not `game-m3`. Add the build hash to the in-game debug/about line so playtest notes record it. Owner: Engineering/QA.
2. **Copy (rc1, copy only, XS):** keep P2's "12/40 eggs · $70" (full value). Add the per-egg price and payment timing so partial sales read as paid:
   - Card sub-line: "$1.80 per egg · paid as you sell".
   - Partial Sell button: "Sell 28 · +$50.40" (adds the coins of this sale to the existing "Sell k").
   - After a partial sale, the existing "+$X" coin pop plays on the card (same as MK-16a) so the payment is seen even though the customer stays.
3. **Docs:** update `art-ux/layout-spec.md:123` to point at the P2 rule (Art & UX), so the old formula isn't rebuilt.
4. No sim/code fix: Sell all and partial payment match the spec.
Draft ACs (for feature-spec once approved):
- MK-23 An order card never shows a value of $0.00; its value is the full order (N × current price, ≥ $0.01), with progress `filled`/N.
- MK-24 The card shows the current per-egg price and "paid as you sell"; a partial Sell button shows the coins that sale will pay ("Sell k · +$X").
- MK-25 Every sale, partial or full, plays a "+$X" pop on that card and adds exactly that amount to coins (AC4).
