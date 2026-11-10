# M2 Workers — Estimate (Head of Engineering, 2026-10-15)
Source: product/workers/m2-proposal.md v1.0 (approved) + m2-economy-validation.md. Branch `m2-workers` off main (m1-rc2 untouched while QA tests it). Dev-days = focused days.

| # | Task | Est | Depends on |
|---|---|---|---|
| 1 | M1 carry-overs on M2 branch: QA-RC2-2 debug panel vs modal z-index, QA-RC2-3 doc/comment fixes, AC3 "timeouts before arrivals" lock-in test | 0.5 | — |
| 2 | Worker config in balance.json (unlocks, hire costs, wages, intervals, W3 demand, W4 tiers/costs, energy, cooldown, thresholds, tip timer) + validation | 0.5 | PM Q1–Q3 (draft values from spec §5 meanwhile) |
| 3 | Sim: worker state (hired, energy, Working/Tired/Asleep), energy drain, Manage + 30 s cooldown, wages (no wage asleep, never < 0 coins: Q4) | 1.5 | Q4 |
| 4 | Sim: W1 Market Hand auto-serve 1 s / 3 s; W2 Coop Hand auto-collect 2 s / 4 s; W3 Hawker demand ×1.25/×1.10/×1.0; W4 Grader tier price multiplier with asleep 25% keep; queue cap stays 5 | 2 | Q5–Q7 |
| 5 | Offline: workers frozen (no work/drain/wage); on return W1 sells offline stock | 0.25 | — |
| 6 | Save v5 + migration (workers absent → none hired), telemetry: worker_hire, worker_manage, worker_state (tired/asleep), wage_paid (batched), grader_tier, coop_hand_tip | 0.75 | Q8 (event list) |
| 7 | Tests: AC-W1…W6 + W4b via M2 bots (seller15/cheapest/casual/slow, managed/unmanaged, 100 seeds where affordable) ported from run_m2(); parity fixtures vs economy_sim.py run_m2 | 2 | Economy/Balance confirm run_m2 is the reference |
| 8 | Placeholder UI: Workers panel (hire, energy bar, Manage w/ cooldown, state label), Coop Hand tip text, Grader tier row; energy-drain feel + tip visuals placeholder only | 1.5 | Art & UX (energy bar, Manage, tip copy) for final |
| 9 | Final UI pass once Art & UX lands (assets, layout, animation, sfx) + screenshots | 1.5 | Art & UX assets/layout-spec M2 section |
| 10 | Smoke + regression (M1 ACs, AC7 unchanged with no workers), fix pass after QA | 2 | QA test plan for M2 |
| | **Total** | **≈12.5 days** (10.5 build + 2 QA fixes) | |

**Critical path:** PM answers (Q1–Q8) → sim + config (2–4) → AC bot tests (7) → Art & UX M2 layout/assets → final UI (9) → QA → rc.
Tasks 1, 2 (draft values), 3, 5 and 6 can start now; placeholder UI (8) can run in parallel with the tests.

**Target:** `m2-rc1` local tag **Fri 2026-10-30**, if PM answers arrive by Mon 10-19 and Art & UX M2 assets by Thu 10-22. Each week those slip moves the rc by about the same amount. Sim/logic + AC tests are dev-complete by about Wed 10-21.

**Risks:** AC-W4b has a thin margin (7.8 vs 8 min), so small sim differences from run_m2 could flip it. 100-seed bots over 2 h may be slow in CI (fall back to 20 seeds plus the nightly 100). Energy "chore vs management" feel is open (Art & UX).

## v1.1 update (2026-10-15, HoP approved, m2-proposal §8 items 15–17, §10)
- **Done on `m2-workers` (~1 dev-day, absorbed by rows 3, 4, 7 and 8; target m2-rc1 Fri 2026-10-30 unchanged):**
  - Energy drain 9 s/% (15 min), Tired < 30%, asleep Grader keeps 15%.
  - Yawn cue at ≤ 40%, Manage all at 3+ workers with the shared 30 s cooldown.
  - Unpaid state: no drain, Manage refills it but it stays Unpaid, resume W1→W2 with the R9 reserve.
  - Worker tunables now generated from economy.csv by sync-economy and checked on every row.
  - AC-W1 casual 100-seed test with test-only hooks.
- Row 4's "asleep 25% keep" is now 15%. Row 7's AC-W1 is no longer blocked on Q7.
