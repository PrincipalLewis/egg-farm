# Phase-2 PM Role Specs — draft for CEO approval · 2026-10-15
All report to Head of Product. Shared rules: write feature specs with testable ACs in `product/<area>/`; numbers proposed by PM, approved by Head of Product (economy.csv is single source of truth); handoff Product → Engineering → QA, Art & UX consulted on UI; append status to status.md.

## 1. PM, Collection
- **Mission:** Make gathering eggs satisfying and the coop/basket a meaningful bottleneck.
- **Scope:** Coop production/capacity, Collect interaction, eggs-per-tap upgrades, later auto-collect hooks, offline accrual rules.
- **Deliverables:** Collection feature spec + ACs; tap feel/feedback requirements; collection upgrade curve proposals.
- **Interfaces:** Engineering (input/tick loop), Art & UX (tap feedback), Workers PM (auto-collect), QA.
- **Success metrics:** Taps/session; time-to-first-upgrade ≤30 s; coop-full idle time within target band.

## 2. PM, Market/Customers
- **Mission:** Turn eggs into coins via a readable, lively customer market.
- **Scope:** Customer spawn, demand, queue, patience, pricing, later customer types/orders/events.
- **Deliverables:** Market spec + ACs; demand/price tables; customer type roadmap.
- **Interfaces:** Farm Upgrades PM (price/demand scaling), Art & UX (customer UI), Engineering, QA.
- **Success metrics:** % customers served; income/min vs pacing targets; lost-customer rate.

## 3. PM, Farm Upgrades
- **Mission:** Own the progression spine: what players buy and when.
- **Scope:** Farm levels, hens, capacity, buildings, upgrade tree and cost curves, unlock cadence.
- **Deliverables:** Upgrade tree spec + ACs; cost curve proposals with pacing sim updates; unlock schedule.
- **Interfaces:** All PMs (upgrades touch every system), Head of Product (economy), QA (balance checks).
- **Success metrics:** Upgrade cadence vs targets (e.g. Farm L10 by 10 min); no dead zones >3 min without an affordable purchase; D1 retention proxy.

## 4. PM, Workers (M2 lead)
- **Mission:** Add hired workers that automate tasks but fail without the player's active management.
- **Scope:** Hiring, worker roles (collector/seller/carer), wages, fatigue/failure model, management actions.
- **Deliverables:** Workers spec + ACs; failure model with numbers and tunables; M2 integration plan.
- **Interfaces:** Collection & Market PMs (what workers automate), Farm Upgrades (worker unlocks), Engineering (AI/sim), Art & UX, QA.
- **Success metrics:** Worker adoption %; management actions/session; failure rate in target band (felt but not punishing); income uplift vs manual.

## Role: Economy/Balance Designer (reports to Head of Product) — DRAFT for CEO approval
- Mission: keep the economy fun and on-pace with data, not guesses.
- Owns: economy.csv, economy.md tunables, economy_sim.py and farm_stress_sim.py, AC7 pacing tests (with QA), L18+ late-game curve, Workers (M2) economy modelling with PM Workers.
- Deliverables: one canonical sim (merge the sims) with random-demand variance runs; a balance change log; M2 Workers economy proposal; telemetry-vs-sim comparison once playtest data exists.
- Interfaces: PMs propose number changes, which go to this role for modelling and then Head of Product for approval; Engineering maps tunables into balance.json; QA verifies.
- Success: pacing targets within ±20% in both sim and telemetry; no level after L18 more than 2x the previous level's time once M2 lands; every number change is traceable.
