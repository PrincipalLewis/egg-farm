# MVP Test Plan — Milestone 1 (Head of QA, 2026-10-15)
## Scope
In: collect eggs, sell to customers, upgrade collection, upgrade farm, currency/HUD, save/load, offline progress. Web-first (latest Chrome, Firefox, Safari; desktop + mobile viewport).
Out (M2+): workers, monetization, accounts/cloud save.
Source of truth: product/core-loop-spec.md v1 (AC1–AC11) + product/economy.csv. Balance results: qa/balance-report.md.

## Functional test cases
### A. Collect eggs
- A1 Tap/click collect adds exactly the spec amount; counter updates immediately.
- A2 Passive production ticks at spec rate (measure 60s, ±1 tick tolerance).
- A3 Rapid clicking (20+/s) neither drops nor double-counts.
- A4 Storage cap (if any): production stops at cap, UI shows "full".
### B. Sell to customers
- B1 Selling N eggs gives N × price coins; eggs decrease by N.
- B2 Sell with 0 eggs: disabled or no-op, no negative values.
- B3 Customer arrival/demand matches spec; sell-all vs partial behave as specified.
### C. Upgrade collection
- C1 Purchase deducts exact cost, raises rate/yield by spec amount, next cost follows cost curve.
- C2 Can't afford: button disabled, no purchase, no negative balance.
- C3 Exactly-affordable purchase leaves balance 0.
- C4 Max level (if any) disables further purchase.
### D. Upgrade farm
- D1 Same as C1–C4 for farm level; effects (capacity/multiplier) apply instantly.
- D2 Effects stack correctly with collection upgrades.
### E. HUD/UX
- E1 Number formatting (1.2K, 3.4M, …) correct at boundaries.
- E2 Buttons reflect affordability live.

## AC traceability (updated 2026-10-15)
| AC | Test cases | Testable now? |
|---|---|---|
| AC1 coop rate/cap | A2, A4, AC1-a: 60 s at F0 → 50 (cap); F1 cap 100 | Needs build |
| AC2 collect | A1, A3, AC2-a coop 3 → tap moves 3; coop 0 → moves 0 | Needs build |
| AC3 customers | B3, AC3-a interval per farm L, queue ≤3, demand bounds over 500 spawns; patience 30 s | Needs build (I3 ruled, see AC3 cases) |
| AC4 sale | B1, B2, AC4-a rounding half-up, price includes Collection bonus (Q8) | Needs build |
| AC5 upgrade buy | C1–C3, D1, purchase spam | Needs build |
| AC6 table L0–30 | C4/D1 vs CSV; L30 shows MAX | Data PASS for M1-R1 (qa/csv_check.py, 0 mismatches); UI needs build |
| AC7 pacing | balance sim + scripted bot on build | Sim PASS on M1-R1 (seller15 + cheapest ≥70%); scripted bot on build pending |
| AC8 save/load | save/load edge cases; save every ≤5 s + on upgrade | Needs build |
| AC9 single config | code review: grep for literals; change config value → UI/logic follow | Needs repo access |
| AC10 UI contents | E1, E2 + checklist of 6 elements | Needs build + Art & UX layout |
| AC11 offline | O1–O9 below | Needs build (I4 ruled) |

### AC11 offline cases
- O1 Away 59 s → no modal, basket unchanged. O2 Away exactly 60 s at F0 → modal, eggs = 15.
- O3 Away 1 h at F0 → 900; at F10 → 9,900. O4 Away exactly 2 h at F0 → 1,800 (F10 → 19,800). O5 Away 8 h / 7 days → same as 2 h.
- O6 Fractional result floors (F0, 61 s → 15, not 15.25; F0, 62 s → 15).
- O7 Collect adds exactly the shown amount to the basket even when coop is at cap; coop equals the last-saved value.
- O8 Clock set backwards → 0 eggs, no modal/crash; clock forward 1 year → 2 h cap.
- O9 Modal not shown twice: reload while modal is open, reopen tab, two tabs; dismiss without Collect (see O11).
- O10 Farm level used = saved level (upgrade before leaving counts); "time away" display caps at 2 h.

- O11 Away 10 min at F0, close modal without Collect → basket +150 (eggs still granted); reload → no second modal, no second grant.
- O12 Save at T, load at T+30 s → no modal, no grant (absence < 60 s).
- O13 Save at T, load at T+5 min → one grant (75 at F0); play 10 s (autosave), reload immediately → no grant (new absence < 60 s).
- O14 Load, then reload without any new save after 2 min → absence measured from the last save → one grant for that gap only. Never two grants on one load.

### AC3 customer cases (I3 ruling; F0: interval 10 s, demand 8–16, patience 30 s, queue = min(5, 3 + floor(F/10)): 3 at F0–9, 4 at F10–19, 5 at F20–30)
- Q1 New game, no sales: arrivals at 10, 20, 30 s fill the queue. At 40 s customer 1 times out in the same tick as the 4th arrival. Per the AC3 ruling, timeouts are processed **before** arrivals in the same tick, so the freed slot takes the arriving customer: customer 1 is logged customer_lost (timeout), the 4th customer joins, queue = 3, **no full_queue** event. Full-queue variant: 3 customers with patience left (e.g. waited 0 s) + forced arrival → lost, logged `full_queue`; queue stays 3. (rc2 build behaviour matches; QA-RC2-1 closed.)
- Q2 Customer A arrives at 10 s, never served → leaves at 40 s exactly (patience from arrival).
- Q3 A arrives at 10 s wanting 10; at 25 s sell 3 (partial) → +$3.00, A stays wanting 7, still leaves at 40 s (patience not reset) and is logged customer_partial. A fully served customer leaves immediately.
- Q4 Arrival timer never pauses: with the Market panel open, during a sale, and while the queue is full, arrivals stay on the 10 s grid (10, 20, 30, 40…); full-queue arrivals count toward the grid.
- Q5 Farm L10: queue max 4; L20 and L30: 5 (never 6). The 5th arrival at L10 with 4 queued → customer_lost reason=full_queue.
- Q7 Timeout with 0 bought → customer_lost reason=timeout; ≥1 bought → customer_partial (not customer_lost).
- Q8 Charged price = round(egg_price × (1 + collection_price_bonus), 2): F0/C0 $1.00; F0/C1 $1.12; F10/C10 $1.50 × 2.2 = $3.30; 7 eggs at F1/C1 = 7 × $1.18 = $8.26.
- Q6 After a slot frees (sale or timeout), the next scheduled arrival joins; the timer is not reset by the freed slot.

- Q9 Demand RNG uniformity: first-customer demand over ≥1,000 seeds (incl. seeds 1..N) passes chi-square (p=.01) and each bucket within ±25% of expected; seeds 1–20 not pinned to demand_min.

## Edge cases
- Overflow/large numbers: drive currency to 1e15, 1e308, beyond; no NaN/Infinity/negative wrap; formatting holds. Decide number type (float vs big-number lib) with Engineering.
- Zero balance: all purchases blocked; sell with 0 eggs; start from fresh save.
- Floating-point drift: 10k small additions equal expected total within tolerance.
- Offline/idle: close 1 min / 1 h / 8 h / 7 days → reward = rate × time, capped per spec; clock moved backwards (no negative/exploit); clock moved forward (cap applies); tab backgrounded (throttled timers still accrue correctly).
- Save/load: autosave interval; reload restores all fields exactly; corrupted/missing save → safe fresh start, no crash; save version migration; two tabs open simultaneously (no clobber/dup gains); localStorage full/disabled.
- Purchase spam: double-click buy doesn't charge twice.

## Regression checklist (run every build)
- [ ] Fresh start loads, HUD at spec initial values
- [ ] Collect, sell, buy each upgrade once
- [ ] Reload: state persists
- [ ] Offline 5 min: correct reward
- [ ] No console errors
- [ ] qa/csv_check.py 0 mismatches; qa/balance_sim.py all AC7 checks PASS on current economy.csv
- [ ] AC11 O1, O4, O8 spot-check (balance-check.md)
- [ ] All previously fixed bugs re-verified

## Release sign-off criteria (QA owns sign-off)
- 100% of Product acceptance criteria pass.
- 0 open Blocker/Critical bugs; Majors have documented waivers from Product + CEO.
- Regression checklist green on all target browsers.
- Save/load and offline progress pass all edge cases above.
- Balance sim within thresholds, or deviations accepted by Product.
- Sign-off recorded in qa/decisions.md with build ID and date.
