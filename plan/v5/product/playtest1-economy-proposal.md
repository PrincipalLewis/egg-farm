# Player playtest 1: economy response (Economy/Balance Designer, 2026-10-15)
Source: playtest/player-notes/2026-10-15-session1.md. Workers are frozen at v1.1, so P4 is a change request. Nothing is applied until Product approves.

## Diagnosis
1. **Unfillable orders from L5.** Each order is sized at 0.8–1.6 × (eggs/s × customer interval), so one customer wants more than a whole interval's production. With 3–4 queue slots, total demand is about 1.2× supply, so the queue is always full of big orders that only ever get partly filled. Income is correct, but it reads as "stuck". The "$0.00" on the card is the value of the current basket, not the order (UI).
2. **Slow first 2 min.** L0 is 1 egg/s at $1. The nest, not tapping, caps income, so about $1/s is by design.
3. **Tap upgrades feel pointless.** The Collection card says "Eggs per tap", but supply is capped by the nest rate. Collection's real value is +12% egg price per level, which the card doesn't show.
4. **Manage is a chore.** It's a free instant refill whenever the cooldown is ready. Manage all counts workers at 81%+.

## Proposals
- **P1 (numbers, needs re-sim): smaller, more frequent orders.** Halve order size to 0.4–0.8 k and halve the customer interval, so demand per second stays the same. Orders become completable (a level-15 order goes from about 60–120 eggs to 30–60), and full sales happen regularly. Target: no change to AC7/AC-W pacing beyond ±5%. If the queue overflows, raise patience instead of the queue cap.
- **P2 (UI, no numbers): order cards show the full-order value and progress**, e.g. "Wants 40 eggs · pays $70 · 12/40", never "$0.00". Owners: Art & UX and Engineering.
- **P3 (UI and small numbers): the Collection card leads with "+12% egg price"**, with eggs per tap as secondary. Optional, needs re-sim: L0 at 1.5 eggs/s so the first minute runs at about $1.5/s, while keeping the AC7 5-min target of 9 or more upgrades and L10 at 10 min ±20%.
- **P4 (Workers change request): Manage becomes a reaction to a cue.** Manage is only enabled once a worker yawns (≤40%), and Manage all counts only those workers (this also fixes bug 5). The refill stays free. I'll re-sim AC-W4/W4b/W5 to confirm, because the Manage rate per 15 min may drop.
- Out of scope for economy: the tutorial order, banner, toast and 375px bugs (UX and Engineering).

## ETA
- P1 + P3 numbers re-simmed (AC7, AC7-soft, AC-W1/W4/W4b) with a CSV diff: **Fri Oct 16, 14:00 UTC+2**.
- P4 re-sim (AC-W4/W4b/W5): same time.
