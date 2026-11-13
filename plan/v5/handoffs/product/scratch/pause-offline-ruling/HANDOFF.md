# HoP/Pause-offline-ruling — D-HOP-2026-11-06-01 LOGGED · 2026-11-06 00:06 CET

## Ruling
**OPTION (a)** = **D-HOP-2026-11-06-01** at `product/decisions.md` **L2337**. Pause v1.3.15 `4c081f64` §3 L88 + AC-P13 L330 retain hen offline grant; no pause/hire-based egg suppression; worker freezes unchanged; flag-off unchanged; no spec erratum; no merge/flip/publication.

## QA withdrawal (located)
`qa/decisions.md` **QA-D-1106-PR115-A1** **L916** (Nov 6 00:10 CET) — withdraws QA-D-1105-PR115 Extra; QA aligns with (a). Independently read.

## Concise HoE handoff
1. New exact head: remove offline-egg suppression by worker-pause/hire predicate + conflicting zero-eggs tests; keep worker recovery/wage/lockout freezes; do not change online pause semantics.
2. Clarification tests → existing **AC-P13** only (no new AC id): same hen state + eligible gap + existing cap/clock inputs ⇒ grant invariant across all-paused / mixed / unpaused / no-hired; flag-off unchanged.
3. A1 closes only after Architect recheck + QA offline parity/regression on that head. Do not inherit `a73804d` approvals.
4. No merge/flip/economy feature/pacing/publication from this id.

## Status
Own HoP → 2026-11-06 00:06 CET. Other teams preserved. No code/spec/gate/messages.
