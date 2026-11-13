# m1-rc2 QA Report (Head of QA, 2026-10-15 ~20:00 CEST)
Build: tag **m1-rc2** = commit `f485987` (merge of 53917b5 RNG seed fix + dc15b39 UI fixes). Supersedes m1-rc1 (235dcc9).
Method: tested a clean `git archive m1-rc2` export in /tmp, so no game code or working tree was touched (Engineering was committing to the tree during testing). Headless Chrome (Playwright, 390×844) against `vite preview` of the production build with `?debug=1`. Sim-level cases ran via vite-node on the real sim modules. Scripts: `qa/rc2-scripts/` (paths point at the /tmp export).

## Automated
| Check | Result |
|---|---|
| `npm test` (incl. sync-economy --check) | PASS, 159/159 tests, 12 files |
| `npm run build` | PASS |
| `npm run smoke` (Engineering smoke, mobile viewport) | PASS |
| balance.json → formulas vs product/economy.csv (QA parity.ts) | PASS: 527/527 cells; 961/961 sale prices (F×C grid) |
| AC7 pacing (Engineering bot on real sim, 20 seeds) | PASS: first 15 s, 10 upg @5 m, F10 at 10.0 min, F18 at 28.0 min; cheapest 9 / F8 / F17 (80% / 94%) |

## First-upgrade gap (rc1 30 s vs sim 15 s): resolved
- rc1 root cause, confirmed independently: `initialState` used the raw seed as xorshift32 state, so the first draw for seeds 1–20 was ≈0 and **every** first customer wanted demand_min = 8 → $8 < $10 Collection cost at the 15 s sell → first buy at 30 s (0/20 seeds could buy at 15 s). Starting coins (0), first customer (t = 10.0 s), and sell-tick alignment (sell at 15 s after the arrival) were all correct and not the cause. The first tap yielding 0 (float coop 0.9999 at t=1 s) only shifts the basket by one egg (15 at 15 s either way).
- rc2: first customer's demand per seed 1–20 = spread 8–16 (only 1/20 at minimum); 17/20 seeds buy at 15 s → **median first upgrade 15 s, PASS**.
- **Demand uniformity (new check Q9), F0 range 8–16, 9 buckets, chi-square critical 20.09 at p=.01, per-bucket tolerance ±25%:**
  - Seeds 1–2000 (small seeds), first customer: χ² = 6.96, max bucket deviation 8.0%, min-share 11.1% → **PASS**
  - Large time-like seeds ×2000: χ² = 0.84, max dev 3.3% → **PASS**
  - Full demand stream, 50 seeds × 30 min (9,000 customers): χ² = 13.41 → **PASS**
  - Seeds 1–20: χ² = 5.20 (pass); per-bucket tolerance not meaningful at n=20; not stuck at minimum → **PASS**

## Case results
| Case | Result | Evidence |
|---|---|---|
| AC1 coop rate / cap (F0 50, F1 100) | PASS | sim: 10.000 eggs @10 s; cap holds |
| AC2 collect min(coop, tap), fractional coop, never negative | PASS | sim |
| AC3 interval, queue ≤ max, demand bounds F0/10/20/30 | PASS | sim, 2000 s per level |
| Q1 4th arrival into full queue → full_queue | **FAIL (spec/ordering), Minor**: see QA-RC2-1 | at 40 s, timeout of customer 1 is processed before the arrival, so the 4th customer joins |
| Q2 timeout at exactly 40 s, customer_lost timeout | PASS | |
| Q3 partial: +$3.00, stays wanting 7, leaves at 40 s; full serve leaves at once | PASS | |
| Q4 arrival grid 10/20/…/90 incl. full-queue arrivals | PASS | |
| Q5 queue max 3/4/4/5/5 at F9/10/19/20/30 | PASS | |
| Q6 freed slot does not reset timer | PASS (via Q4 grid) | |
| Q7 customer_partial vs customer_lost | PASS | |
| Q8 prices $1.12 / $3.30 / 7×$1.18 = $8.26 | PASS | |
| AC4 sale credits k×price, half-up cents | PASS | sim + parity grid |
| AC5 disabled when unaffordable; exact cost; exact-afford → 0 | PASS | sim + UI |
| AC6 L0–30 table, MAX at L30 | PASS | parity + sim |
| AC7 pacing | PASS | above |
| AC8 reload restores coins/coop/basket/levels; autosave ≤ 5 s | PASS | UI |
| AC9 single config | PASS (sim/game code; UI code only skimmed) | no economy literals in src/sim, game.ts |
| AC10 HUD, coop x/cap, queue, buttons | PASS (headless presence check; visual layout = Art & UX) | |
| O1/O2/O6 59 s → 0; 60 s → 15; 61/62 s → 15 | PASS | |
| O3 1 h F0 900, F10 9,900 | PASS | sim + UI |
| O4/O5 2 h → 1,800 (F10 19,800); 7 days → 1,800, "away 2h+" | PASS | UI |
| O7 Collect adds exactly the grant; coop unchanged, cap ignored | PASS | UI |
| O8 clock backwards → 0, no modal | PASS | UI |
| O9 reload with modal open → granted once, no second modal; second tab → no modal | PASS | UI |
| O10 uses saved Farm level | PASS | UI |
| O11 close without Collect → +150 granted | PASS | UI |
| O12 30 s away → no modal | PASS | UI |
| O13 5 min → one grant (75); immediate reload → none | PASS | UI |
| O14 one grant per load, measured from last save | PASS | UI (O9/O13) + code review (constructor saves on load) |
| Corrupt save → fresh start, no crash | PASS | UI |
| No page errors during run | PASS | |
| Fixes: no "Collect +0"; debug Replay onboarding keeps save | PASS | UI |

Not covered headlessly: Firefox/Safari, real mobile devices, desktop layout (known: no desktop smoke test), real hidden-tab throttling, simultaneous play in two tabs, localStorage full/disabled, audio.

## New bugs
| ID | Severity | Owner | Summary |
|---|---|---|---|
| QA-RC2-1 | Minor | Head of Product (rule) → Engineering / Designer (align) | Same-tick order of timeout vs arrival differs from reference: build removes timed-out customers before the arrival (4th customer joins at 40 s); `product/sim/economy_sim.py` processes the arrival first (4th lost as full_queue). At F0, patience 30 = 3 × interval 10, so this coincides on every unserved queue. AC7 pacing unaffected (parity passes). Needs one rule in AC3. |
| QA-RC2-2 | Minor (debug only) | Engineering | With `?debug=1` on a 390 px viewport, the open debug panel covers the welcome-back modal's Collect button (pointer events intercepted). |
| QA-RC2-3 | Trivial (docs) | Engineering | `engineering/sim-rules.md` offline section still says 0.5× (build and CSV use 0.25×). `src/sim/state.ts` header comment says "filled > 0 => served: never walks away", which contradicts MK-10. |
Known non-blocking (accepted): empty nest showing eggs; missing desktop smoke test. Fixed in rc2 and verified: "Collect +0", debug replay wiping the save.

## Sign-off recommendation
**Conditional GO for M1 (m1-rc2).** 0 Blocker / 0 Critical / 0 Major. All AC1–AC11 pass headlessly; Q1 fails only on an unresolved same-tick rule (Minor).
Conditions (QA criteria not yet met):
1. Cross-browser (Firefox, Safari) and desktop smoke are not run. Needs a waiver from CEO + Product for M1, or a manual pass.
2. HoP rules on QA-RC2-1 (either way is acceptable; fix can land post-M1).
Final sign-off will be recorded in qa/decisions.md once the conditions are waived or met.
