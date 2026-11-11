# Balance Check Approach (Head of QA, 2026-10-15)
Product owns numbers; QA verifies them independently via simulation (qa/balance_sim.py) against qa/params.json.

## Method
1. Product delivers params (below) → copied to qa/params.json.
2. Sim runs a greedy "buy cheapest affordable upgrade" player (and an active-clicker variant) in 1s ticks over 0–24h.
3. Outputs: time-to-first-upgrade, time between purchases, payback period per upgrade (cost / income gain), income/sec curve, time to milestones.
4. Compare with in-game values on a build (spot-check 3 points) to confirm Engineering implemented the spec.

## Metrics & flagged thresholds (proposed; Product to confirm)
- Time to first upgrade: flag if > 60s or < 5s.
- Gap between purchases in first 30 min: flag if any > 5 min.
- Payback period per upgrade: flag if > 10 min early-game or not increasing smoothly (jumps > 3× level to level).
- Income curve: flag stalls (no purchase for > 2× previous gap) or runaway (income ×100 in < 10 min).
- Offline reward: flag if 8h offline > 50% of 8h active.
- Numerical: flag NaN/Infinity/negative anywhere.

## Pending from Product (blocking real verification)
- Starting eggs/coins; base egg rate (passive + per click)
- Egg sell price; customer demand/arrival model
- Collection upgrade: base cost, cost growth, effect per level, max level
- Farm upgrade: base cost, cost growth, effect (capacity/multiplier), max level
- Storage cap, offline cap and rate multiplier
- Target pacing (intended time to first upgrade, session length)
