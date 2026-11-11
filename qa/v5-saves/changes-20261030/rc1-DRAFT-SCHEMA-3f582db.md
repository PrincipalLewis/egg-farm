# Shipped telemetry schema, rc/v5 3f582dbfe31a9d309e6b1d0e96a4f77711b333ec (DRAFT for HoQ OK; D-CEO-20261030-04)
Source read with `git show 3f582db:<file>`; paths under src/. Checker: draft scripts/telemetry-check.mjs `--schema shipped` (table SHIPPED).
Types: i integer, n finite number, b boolean, s string, a array, [..] enum, T literal true; `?` optional. Every field list is CLOSED (extra field = FAIL).

## Envelope (every stored event in LS `eggfarm.telemetry`)
| field | type / rule | source |
|---|---|---|
| type | s, must be in the allowlist below | telemetry/telemetry.ts:40, :58, :62 |
| ts | i (ms) | telemetry.ts:40 (track), :58 (worker_summary = window start), :62 (tap = window start) |
| sessionMs | i >= 0; `ts - sessionMs` == the load's sessionStart, identical for every event of one page load (session identity) | telemetry.ts:28 (sessionStart = now()), :40, :58, :62 |
| sid, fgMs | ABSENT (v0.6.2 envelope; present = drift FAIL) | — (not in 3f582db) |
| privacy | every string <= 64 chars except session_start.install_id/build, save_corrupt.build, save_newer_version.build, path/migration fields; no email / IPv4 / UA patterns | spec/telemetry-v062.schema.json `privacy` (unchanged) |
| export | `window.eggfarmExportTelemetry()` returns events and contains no `install_id` | telemetry.ts:72 (REDACT), :76-80 (snapshotJSON); main.ts:124 |
| retention | session_start/_end, upgrade, onboarding_*, worker_hire, worker_manage*, save_reset, milestone_reached, balanced_tier, save_migrated, save_migration_aborted pinned; others ring-trimmed to ring_size 5000 | telemetry.ts:12-15, :33-37; balance.json telemetry.ring_size |

## Events (allowlist)
| event | fields | source |
|---|---|---|
| session_start | install_id s (= LS eggfarm.install_id), build s (= expect-build) | game.ts:57 |
| session_end | (none) — one per page load, on pagehide, same anchor | game.ts:302-305; main.ts:145 |
| tap | count i >= 1, eggs n >= 0 (batched per tap_batch_ms 1000; Σcount == taps) | telemetry.ts:42-47, :62; game.ts:115 |
| worker_summary | windowMs i + dynamic n keys wage_{market_hand,coop_hand,hawker,grader}_cents, coop_hand_eggs, market_hand_eggs, market_hand_cents | telemetry.ts:50-58 (window close :56-59); game.ts:116-118 |
| customer_arrive | id i, N i | sim/events.ts:4 |
| customer_served | id i, N i, partial b | sim/events.ts:5 |
| customer_partial | id i, N i, filled n | sim/events.ts:6 |
| customer_lost | reason [timeout, full_queue], id? i, N? i | sim/events.ts:7 |
| sell | id i, k n, N i, price n, value n, by [player] (market_hand sells are summed, never tracked) | sim/events.ts:8; game.ts:118 |
| upgrade | upgrade [collection, farm, hens, eggValue], newLevel i, cost n, coinsBefore n (>= cost), track? [farm, hens, egg_value, collection]; one per purchase | sim/events.ts:9 |
| worker_hire | worker [market_hand, coop_hand, hawker, grader], cost n, farm i | sim/events.ts:12; sim/workers.ts:4 |
| worker_manage | worker [WorkerId], energyBefore n | sim/events.ts:13 |
| worker_manage_all | workers a of WorkerId, energyBefore a (same length) | sim/events.ts:14 |
| worker_state | worker [WorkerId], state [working, tired, asleep, unpaid] | sim/events.ts:15; sim/workers.ts:6 |
| worker_yawn | worker_id [WorkerId], energy_pct n, farm_level i | sim/events.ts:16 |
| grader_tier | tier i, mult n, cost n | sim/events.ts:18 |
| milestone_reached | id in RC balance.json milestone enum, track [hens, egg_value] matching id, level i = id level, mult n > 0 | sim/events.ts:19 (existing closed validator) |
| balanced_tier | id balanced:<n> in enum, tier i = n, min_level i >= 0 | sim/events.ts:20 |
| coop_full | phase [start, end], durationMs? i | game.ts:124-125 |
| offline_grant | secondsAway n, eggs n; awayS forbidden (G-TEL-3 kept) | game.ts:109 |
| save_restore | source [idb] | game.ts:70 |
| save_corrupt | reason [missing, empty, parse, wrong_type, version, missing_state, checksum, invalid_state], had_backup b, restored_from_backup b, build s, copy_failed? T, recovered_from [bak, idb, v6_backup, none, deferred], store [ls, idb], tried a of {source [bak, idb, v6_backup], result [valid, invalid, absent, unavailable], reason? s}, restored_version? i, migrated b | game.ts:81-85; save/save.ts:201, :237-238 |
| save_savedat_invalid | (none) | game.ts:100 |
| save_newer_version | version i, build s, live? T | game.ts:66, :299 |
| save_migration_aborted | store s, reason s, path s, attempt_count i, stuck_on_v6? T | game.ts:206 |
| save_backup_idb_unavailable | reason s, path s | game.ts:225 |
| save_migrated | from i, to i, migration s, refund_cents n, farm_level i, backup_stores a | game.ts:252 |
| save_failed | reason s | game.ts:282 |
| tab_guard_blocked_write | (none) | game.ts:273 |
| tab_guard_takeover | reason s | main.ts:122 |
| save_reset | (none) | ui/app.ts:282; debug/panel.ts:38 |
| save_recovery_export | case [R, F, Q, D] | ui/app.ts:748; save.ts:241 |
| save_recovery_notice_shown / _dismissed | notice [M1..M5, storage, cantsave], source [bak, idb, v6_backup, none, deferred, null], variant? [level, age, fallback], store [ls, idb, null] (shown == dismissed payload) | ui/save-recovery.ts:47, :52-53, :113, :207-209 |
| coop_hand_tip | phase [tap, shown], farm? i | ui/app.ts:157, :626 |
| goal_tap | target s, state [ready, waiting, noincome, done] | ui/app.ts:448; ui/next-goal.ts:14 |
| onboarding_step | step i, name s, action? [shown, open, dismiss, done], timeout? T | telemetry.ts:85; ui/app.ts:647-702 |
| onboarding_skip | atStep i | telemetry.ts:86; ui/app.ts:700 |
| onboarding_abandon | atStep i, reason [reload] | ui/app.ts:693 |
| ios_home_tip_shown | browser s | ui/app.ts:723 |
| ios_home_tip_dismissed | (none) | ui/app.ts:728 |
| M5.0 flag-gated: collectible_spawned/_collected/_expired (golden or broody), frenzy_started/_ended (golden), streak_started/_peak (streak), abilities_unlocked, ability_used/_blocked/_ended (abilities) | closed lists exactly as sim/events.ts:30-40; **any of them with its flag off FAILS** (flags-off RC: all off) | sim/events.ts:22-40; game.ts:119 |

## Firing rules re-targeted (were v0.6.2 T-AC1/2/3/5/8/9; v0.6.2 versions kept in the file, N/A-by-scope)
- S-AC1: one session_start per load; install_id = LS id; build = expect-build; all events share one anchor; no sid/fgMs.
- S-AC2 (TS2, all 3 engines): hidden 30 s and 61 s (stubbed visibility + fake clock, run twice) do NOT split the session: one session_start, one session_end, one anchor. Harness checks (stub applied, exact 30/61 s, deterministic) unchanged.
- S-AC3: Σ tap.count == clicks, no collect_tap (kept); tap = exactly {count, eggs} + envelope.
- S-AC5: one upgrade event per purchase (harness buys >= 1; the v0.6.2 first/later rule needed 2 and is N/A-by-scope); newLevel i; coinsBefore >= cost.
- S-AC8: exactly one session_end on pagehide, same anchor, no payload, nothing pinned after it.
- T-AC9: shipped closed schema on the TS1/TS3/TS6/TS7 logs; G-TEL-4 retention (TS8), CSR-10/CSR-6/IDB1-7/offline_grant scenario checks unchanged.
- Not checked live (no UI path in a flags-off browser run): customer_lost, worker_*, grader_tier, save_migration_*, tab_guard_*, ios_*, save_recovery_export — schema-checked if they fire.
