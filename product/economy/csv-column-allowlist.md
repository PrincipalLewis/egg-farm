# economy.csv unread-column allowlist (owner: Head of Product) — v1, 2026-10-19 (D-HOP-25)
`npm run sync-economy -- --check` (scripts/csv-columns.ts, gates.md G10) fails on any data/economy.csv column that the sync
does not read into src/config/balance.json, unless the column is listed in the table below. The table is parsed at runtime;
there is no other copy. Repo copy of Product's v1 list (/workspace/egg-farm-studio/product/economy/csv-column-allowlist.md),
with an explicit per-row `expires` date. Source: scratch/unread-cols/classification.md (Economy, file:line evidence).

Rules:
- One row per feature. `column` holds one or more column names separated by commas; a trailing `*` is a prefix entry
  (`tc_*` matches every column starting with `tc_`).
- `owner` and `expires` (YYYY-MM-DD) are required. An entry is expired once the date has passed; expired entries warn on
  every sync and fail under `--strict-allowlist` (or `ECONOMY_ALLOWLIST_STRICT=1`). On expiry, an entry not slotted into a
  milestone is DROPPED (column removed from the CSV).
- Columns the sync already reads never need an entry.

## Documentation-only allowlist (expires at the M4.2 triage, Oct 22)
| column | feature | owner | expires |
|---|---|---|---|
| market_hand_min_wait_s | Market Hand min-wait (PR #38, M4.2) | PM Market | 2026-10-22 |
| charge_regen_s, charge_cap, refill_threshold_pct, start_charges | rc2 Refill | PM Workers | 2026-10-22 |
| rest_recovery_mult | rc2 Rest | PM Workers | 2026-10-22 |
| combo_window_s, combo_boost_s | Boost combo (deferred) | PM Workers | 2026-10-22 |
| nudge_rearm_farm, nudge_max_dismissals | rc2 first-hire nudge | PM Workers | 2026-10-22 |
| nudge_coopfull_share, nudge_coopfull_window_s, nudge_coopfull_min_farm | AC-CF1 coop-full hint | PM Workers | 2026-10-22 |
| w2_asleep_collect_share | unmanaged Coop Hand v0.6 | PM Workers | 2026-10-22 |
| focus_premium | Focus mode +5% (MK-3). Rename to avoid the clash with tc_focus_premium when it's slotted | PM Market | 2026-10-22 |
| leave_attended_window_s | MK-33a attended-only leave penalty | PM Market | 2026-10-22 |
| start_coop_eggs | first-minute 10 eggs (PR #37, M4.2); not on main's CSV yet | PM Collection | 2026-10-22 |
| tc_* | MK-2 trade contracts (reach balance.json m4.tc, unread by game code) | PM Market | 2026-10-22 |

## Dropped in M4.1 (M41-5)
guard_heartbeat_s, guard_stale_s (code constants); farm_ms_price_mult, feed_mill_price_mult, auto_collect_every_s, contracts_manual_bonus (unapproved L30+ v0.2 draft only); farm_max_level, hv_extra_second_markup (duplicates of economy-config.json).
On main only guard_heartbeat_s and guard_stale_s existed; the other six were only in the L30+ candidate b.csv (84bd0b70).

## Note
The old Python late-game sims model the Feed mill, Auto-collector, Contracts and milestones as live. They're retired as evidence for L30+; only `npm run measure:l30plus` counts (D-CEO-12).
