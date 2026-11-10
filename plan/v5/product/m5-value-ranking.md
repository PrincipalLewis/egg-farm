# M5 player-value ranking (HoP, 2026-10-30 12:17 CET), for engineering/m5-build-plan.md under D-CEO-20261030-06

Rev 2 (12:20 CET): reweighted toward the active-play direction the CEO passed on: stronger taps, more golden eggs, breeds to buy, and progression past Farm L10. Ranked by player value:

1. **Streak UI + tapCoins.** They share one spec (streak-tap-coins acb4cdbb), so they ship as one unit. The sim already exists (#87). Art is signed.
2. **Golden.** More frequent golden eggs. Art is signed, and the V5-HOP-1 dependency is met (#92).
3. **Breeds.** Chickens to buy. Art is signed (v0.2.7 f349f29f plus 8 CC0 sprites). The flag was at 0 only because the UI wasn't built.
4. **Post-L10 progression.** This isn't a flag. It's an economy/content item: extend the economy.csv rows past L10. Owner: Econ, as an AC7 row on the shipped CSV. It runs in parallel and is a data lane, not an engineering one.
5. **Pause.** Spec v1.3.10 b4f86ca8 (design as accepted at v1.3.7 ee9adae5; v1.3.8–.10 are AC text only, D-PMW-2026-10-30-03/04/05). Art is signed. The sanitiser and isPaused are already in rc/v5.
6. **Refill (rc2Refill, then autoRefill).** Art is open; Art starts this first.
7. **Abilities.** An active-play lever. Art is open.
8. **Broody.** Art is signed.
9. **zeroGainUi.** Art is signed (ZG v1.4). zeroGain.confirm stays at 0.
10. **clockWage.** Art is signed.
11. **fatigueCue.** The UX is a draft. Low value until telemetry lands.

Departure from the direction: Pause and refill stay above abilities. They fix the worker-failure dead zone (P95 ≤180 s, D-HOP-2026-10-30-06), and the art for abilities isn't ready.

## Hard prerequisites (design)
- Telemetry v0.6.2 (5.1) is a prerequisite for *tuning* streak, pause, broody or abilities, not for turning them on (rev 2). They can turn on with modelled values once their AC7 row passes, and they get retuned when telemetry lands.
- rc2Refill comes before autoRefill.
- Streak and tapCoins ship together.
- No other design-level hard dependencies. Engineering-level dependencies are HoE's call.

## Gate per feature
Each feature needs:
- a signed spec + ACs,
- an AC7 row on the shipped CSV with P95 ≤180 s (D-HOP-2026-10-30-06),
- a QA pass,
- Art's live-build check.

A feature that fails its gate ships flag-off.
