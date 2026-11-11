# economy.csv unread-column allowlist (owner: Head of Product) — v1, 2026-10-19 (D-HOP-25)
Gate G10 in gates.md fails on any CSV column the game doesn't read, except those listed here.
Every entry has an owner and an expiry. On expiry, an entry not slotted into a milestone is DROPPED.
Source: scratch/unread-cols/classification.md (Economy, file:line evidence).

## Documentation-only allowlist (expires at the M4.2 triage, Oct 22)
| column | feature | owner |
|---|---|---|
| market_hand_min_wait_s | Market Hand min-wait (PR #38, M4.2) | PM Market |
| charge_regen_s, charge_cap, refill_threshold_pct, start_charges | rc2 Refill | PM Workers |
| rest_recovery_mult | rc2 Rest | PM Workers |
| combo_window_s, combo_boost_s | Boost combo (deferred) | PM Workers |
| nudge_rearm_farm, nudge_max_dismissals | rc2 first-hire nudge | PM Workers |
| nudge_coopfull_share, nudge_coopfull_window_s, nudge_coopfull_min_farm | AC-CF1 coop-full hint | PM Workers |
| w2_asleep_collect_share | unmanaged Coop Hand v0.6 | PM Workers |
| focus_premium | Focus mode +5% (MK-3). Rename to avoid the clash with tc_focus_premium when it's slotted | PM Market |
| leave_attended_window_s | MK-33a attended-only leave penalty | PM Market |
| start_coop_eggs | first-minute 10 eggs (PR #37, M4.2) | PM Collection |
| tc_* (reach balance.json, unread by game code) | MK-2 trade contracts | PM Market |

## Dropped in M4.1 (M41-5)
guard_heartbeat_s, guard_stale_s (code constants); farm_ms_price_mult, feed_mill_price_mult, auto_collect_every_s, contracts_manual_bonus (unapproved L30+ v0.2 draft only); farm_max_level, hv_extra_second_markup (duplicates of economy-config.json).

## Note
The old Python late-game sims model the Feed mill, Auto-collector, Contracts and milestones as live. They're retired as evidence for L30+; only `npm run measure:l30plus` counts (D-CEO-12).
