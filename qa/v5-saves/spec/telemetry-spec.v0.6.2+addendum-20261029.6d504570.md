# Collection Telemetry & Dashboard Spec · v0.6.2 · 2026-10-16 · PM, Collection
Status: **APPROVED by Head of Product (v0.5 storage, v0.6 sim reconciliation, 2026-10-16); queued for Engineering after M4-A and SQ-1.** Open: none (streak mean set 2026-10-16). **[P]** = PM proposal (tracking only).
Sources read: `game/src/telemetry/telemetry.ts`, `game/src/game.ts` (session_*, `coop_full`, tap batching), `game/src/sim/actions.ts` + `events.ts` + `tick.ts`, `product/workers/rc1-b1-coop-full-spec.md` (B-1, owned by PM Workers), `m4-timed-collectible-spec.md` (v0.5), `m4-collect-streak-spec.md` (v3), `feature-spec.md` (M1 v2), `product/economy.md`, `product/economy_sim.py`.

## 1. Success metrics (owned by PM, Collection)
| # | Metric | Target |
|---|---|---|
| M1 | Taps per session; taps that move eggs | `effective_tap_share` (taps that move eggs / all taps) — **alert if < 0.85** (sim 1.00). Taps/active-min has no target; it segments players: **≥ 45** (bot-like), **15–45** (casual), **< 15** (visitor) [v0.6] |
| M2 | Time to first upgrade (TTFU) | **p50 ≤ 30 s, p75 ≤ 45 s** (sim 15 s); **TTFU < 10 s = clock/telemetry bug** [v0.6] |
| M3 | Coop-full idle time | Within the approved band (§5.3) [v0.6] |

## 2. Sessions
- **Session** = one page load / "Tap to start" (matches the existing `flags.sessions` counter, AC14g). It starts at `session_start` and ends at `session_end` (sent on `pagehide`, or on return after a hide ≥ `session_hidden_end_s`, back-dated to the hide; see v0.3 B3) or, if that never lands, at the last event of the session.
- **Hidden split (approved):** a hidden-tab gap ≥ `session_hidden_end_s` (default 60 s, measured by visibility events) closes the current session and the return opens a new one (`session_end{reason:"hidden"}` then `session_start{reason:"resume"}`). A gap < 60 s stays in the same session; hidden time is excluded from `fg_ms`.
- **Ids:**
  - `install_id` — existing, random UUID under its own storage key (M3-AC7). Survives save reset. Not linked to any account.
  - `session_id` — **new**: 6-char random id (base36, from `crypto`, not sim RNG) created at session start, carried as `sid` on every event (so ring-buffer exports from several sessions can be split without guessing).
  - `session_index` — **new**: the existing `flags.sessions` counter (1 = first-ever session; used to isolate FTUE for TTFU).
  - `sessionMs` — **dropped from events in v0.4** (R2); derive it as `ts − session_start.ts` for the same `sid`. **New** `fgMs`: foreground ms since session start (excludes hidden time); all duration metrics use `fgMs`.
- Common envelope on every event (v0.3, cost fix): `type`, `ts`, + new `sid` (6 chars) and `fgMs`. `build`, `install_id`, `session_index`, viewport, reduced-motion and level fields go on `session_start` **only**; the dashboard joins on `sid`. `farm_level`/`collection_level` are added where listed below, not on every event (volume).

## 3. Event catalogue
Status: **existing** = already emitted with these fields; **extend** = existing name, new fields; **rename** = spec name differs from the code name, code name wins; **new** = not emitted yet.

| Event | Status | Fires when | Fields |
|---|---|---|---|
| `session_start` | extend | Game constructed after load (game.ts:29), and on resume after ≥ 60 s hidden [P] | existing `install_id`, `build`; new `session_id`, `session_index`, `reason` (load\|resume), `farm_level`, `collection_level`, `has_coop_hand` (bool), `viewport_w` (CSS px, bucketed: <375 / 375–767 / ≥768), `reduced_motion` (bool) |
| `session_end` | extend | pagehide / final flush (game.ts:80); hidden ≥ session_hidden_end_s, emitted on return (back-dated) | new `reason` (unload\|hidden), `fg_ms`, `taps_total`, `taps_moved_eggs`, `eggs_collected_manual`, `coop_full_ms`, `eggs_lost_while_full`, `managed` (see §5 cuts), `farm_level`, `collection_level`; **M5.0 Pause (D-HOP-2026-10-24-43; HoE H-1):** new `golden_frozen_s` = focus-clock sim seconds while `goldenFrozen()` is true, 0.1 s resolution (golden errata v1.3.3 rev. 5 §8 / GE-AC45); **M5.1 breeds (D-HOP-2026-10-24-47; required while `m4.flags.breeds` is on, absent with it off):** new `present_active_s` (number, focus-clock sim seconds rounded to 0.1 s, with ≥ 1 settled Present breed slotted and the Present rate gate open; HoE Q-COL-9) and `present_lost_count` (int, count of open → closed gate transitions caused by a counted tap), per `product/m5.1-breeds-spec.md` rev. 3.7 §8 / BR-AC53; on HoE's allowlist, no PII |
| `tap` (= `collect_tap` in feature-spec C-AC17) | **rename** + extend | One aggregated event per `tap_batch_ms` window (telemetry.ts `tap()`), closed by any other event, `poll()` or flush | existing `count`, `eggs`; new `empty` (taps that moved 0, feature-spec 3.4), `full_at_start` (bool: coop was full at the window's first tap). **Canonical name stays `tap`**; feature-spec's `collect_tap` is the same thing — update C-AC17 wording, don't add a second event |
| `upgrade` | extend | Purchase applied (actions.ts:25), pinned | existing `upgrade` (collection\|farm\|hens\|eggValue, per `sim/events.ts:9`), `newLevel`, `cost`, `coinsBefore`; new `is_first_upgrade` (bool: first purchase of this install), `taps_before` (session taps so far); **M5.1 zero-gain UI (D-HOP-2026-10-25-09; HoE Q-ZG-E1 (b)):** optional `zero_gain` (bool: the row was zero-gain on the pre-buy state, per `collection/m5.1-zero-gain-purchase-ui.md` v0.3.1 §5.2), **present only while `m5.flags.zeroGainUi` is on and only on `collection` / `hens` / `eggValue` upgrades; absent with the flag off** (the flag-off baseline is the field's absence). Set by the UI purchase handler after the dispatch returns, never in `sim/actions.ts` or the sim stream; on HoE's allowlist, no PII |
| `coop_full` | extend — **per B-1, owned by PM Workers** | Coop reaches cap / first drop below cap (game.ts:65–66), exactly once per transition | existing `phase` (start\|end), `durationMs` (end); B-1 adds `farm_level`, `coop_cap`, `coop_hand_state` (start) and `exit_reason` tap\|coop_hand\|cap_upgrade\|reload\|hidden\|other (end; `hidden` = closed at a session split, proposed v0.4, needs PM Workers' ack). **Collection adds [P]:** `eggs_lost` on end (production that would have entered the coop during the episode = rate × duration, from the sim tick, not estimated client-side). The names `coop_full_start/_end`, `coop_full_enter/_exit` in older specs are aliases of this one event — do not create them |
| `coop_hand_tip` | existing | Tip shown / tapped (app.ts:134, 470) | `phase` (shown\|tap), `farm` |
| `offline_grant` | existing | Welcome-back grant computed | `secondsAway`, `eggs`. **`secondsAway` is the canonical field name** (spec and Latest's emit, `game.ts:50`; D-HOP-2026-10-29-04 G-TEL-3). `awayS` is an internal variable name only and never a schema field; the fix is a code comment, not a schema change |
| `worker_summary` | existing | Per `worker_summary_s` window | includes `coop_hand_eggs` (auto-collect volume, for managed cut) |
| `worker_hire`, `worker_manage*` | existing | Hire / Manage | used only to derive the managed cut |
| `worker_paused` | new (M5.0 Pause; pinned; TEL-14: only if Pause ships) | A hired worker is paused (Pause spec v1.3.5 §12; pause errata v1.3.6 rev. 4 §1.4) | per Pause spec §12: `worker`, `farm`, `energy_pct`, `mood`, `unpaid` (bool), `ability_active` (bool); **new (D-HOP-2026-10-24-43; HoE H-1):** `golden_on_screen` (bool, from the pre-pause state on the pause tick), `frenzy_active` (bool, from the pre-pause state on the pause tick) (golden errata rev. 5 §8) |
| `collectible_spawned` / `_collected` / `_expired` | new (M4, spec'd in m4-timed-collectible §telemetry) | per that spec | per that spec; reuse, don't redefine. `collectible_collected` is the name [HoP 13:10] |
| `frenzy_started` / `frenzy_ended` | new (M4) | per m4-timed-collectible | per that spec |
| `streak_started` / `streak_peak` | new (M4) | per m4-collect-streak §5 | per that spec |
| `goal_tap` | existing | Goal strip tapped | `target`, `state` — used for TTFU funnel |
| `zero_gain_confirm` | new (M5.1 zero-gain UI; D-HOP-2026-10-25-09; HoE Q-ZG-E1 (b); not pinned) | The zero-gain confirm strip closes, **only** while `m5.flags.zeroGainUi` is on **and** the balance.json tunable `m5.zeroGain.confirm` is true (OFF in M5.1, Art Q-Art-4) | `upgrade_id` (`collection`\|`hens`\|`eggValue`, the same value as `upgrade.upgrade` for that row), `outcome` (`confirm`\|`cancel`). No PII, no free text |

No other new events (M5.1 adds only `zero_gain_confirm`, above). Everything else is a field on an existing event or a dashboard derivation.

### 3.1 Complete event schema allowlist (v0.3, B1)
T-AC9 validates every export against a single allowlist module, `src/telemetry/schema.ts` (new; owner Features). It must list **every** event main emits, not only the ones above. Fields for events not in the table above are "as emitted on main" and are frozen into schema.ts at build time; adding an event = adding it to schema.ts in the same change.
- **Session/core:** `session_start`, `session_end`, `tap`, `upgrade`, `offline_grant`, `goal_tap`
- **Coop/workers:** `coop_full`, `coop_hand_tip`, `worker_hire`, `worker_manage`, `worker_manage_all`, `worker_state`, `worker_yawn`, `worker_summary`, `worker_paused` (M5.0 Pause, if Pause ships; TEL-14)
- **Market/customers:** `sell`, `customer_arrive`, `customer_served`, `customer_partial`, `customer_lost`, `grader_tier`
- **Save/integrity:** `save_corrupt`, `save_failed`, `save_reset`, `save_newer_version`, `save_savedat_invalid`, `save_restore`, `save_recovery_export`, `tab_guard_blocked_write` (game.ts:102), `tab_guard_takeover` (main.ts:100), `save_recovery_notice_shown`, `save_recovery_notice_dismissed` (CSR-10; addendum 2026-10-29, D-HOP-2026-10-29-04 G-TEL-1; fields as emitted on Latest m4.1-p1 `30b29d3`, `noticePayload` in `src/ui/save-recovery.ts`: `notice` (NoticeId enum), `source` (RecoverySource enum or null), optional `variant` (M2 variant enum), `store` (enum or null))
- **Onboarding/UI:** `onboarding_step`, `onboarding_skip`, `onboarding_abandon`, `ios_home_tip_shown`, `ios_home_tip_dismissed`, `zero_gain_confirm` (M5.1, D-HOP-2026-10-25-09; schema also allows the optional `upgrade.zero_gain` bool)
- **M4:** pinned (§3.2): `save_migrated`, `save_migration_aborted`, `save_backup_idb_unavailable` (m4-design v0.3.3 §5, added by F-2/F-3); `save_copies_diverged` is **planned (SQ-1/N1), fields TBD by Saves/Architect**, and stays out of the frozen schema until it lands; ring-trimmed (not pinned): `collectible_spawned`/`_collected`/`_expired`, `frenzy_started`/`_ended`, `streak_started`/`streak_peak`, `milestone_reached {id, track: hens|egg_value, level, mult}`, `balanced_tier {id, tier, min_level}` (milestone multipliers; addendum 2026-10-29, D-HOP-2026-10-29-04 G-TEL-2; `src/sim/events.ts:19-20` at `30b29d3`). M4 boot/migration events fire after `session_start` and carry its `sid`.
Source: grep of game/src plus the Architect's review of origin/main a01faea. Engineering confirms the list against main when creating schema.ts.
- **Not events (never in the log, not in the schema):** `collect` (folded into `tap`), `worker_collect` (summed into `worker_summary.coop_hand_eggs`), `wage` (summed into `worker_summary.wage_<id>_cents`), `hire`/`manage`/`collection` (Action types / level name).
- **Budget valve event (v0.5.1):** `telemetry_budget_shrunk {ringEff}`, once per session (§3.3).
- **Variant fields the schema must allow:** export-only `open:true` on `tap` and `worker_summary` (the open window at export); `live:true` on `save_newer_version` (live detection, game.ts:126).
- **`coop_full` capped shape:** `{type:"coop_full", ts, sid, fgMs, capped:true, episodes:100}`, no `phase`.

### 3.2 Pinning rule (v0.4)
`isPinned(e: TEvent)` takes the event, not the type (telemetry.ts:12; callers :32, :34 updated):
```
isPinned(e) = e.type in {session_start, session_end, upgrade, save_migrated, save_migration_aborted, save_backup_idb_unavailable,
                 onboarding_step, onboarding_skip, onboarding_abandon, worker_hire, worker_manage, worker_manage_all, save_reset,
                 session_summary}
           || (e.type === "coop_full" && (e.phase === "end" || e.capped === true))
```
Full set (v0.5.1, per telemetry.ts:12-13 + this spec): existing M3-AC7 types `session_start`, `session_end`, `upgrade`, `onboarding_*`, `worker_hire`, `worker_manage*`, `save_reset`; added here: the 3 M4 save events, `coop_full` end/capped, `session_summary`. Everything else (incl. `coop_full{phase:"start"}`, collectible/frenzy/streak, `telemetry_budget_shrunk`) is ring-trimmed. Per **M3-AC7 (as amended in v0.5, §3.3), pinned events are never silently dropped**: they stay raw until the 200 KB pinned cap, then the oldest sessions are compacted into summary records.

### 3.3 Pinned-store cap and session compaction (v0.5, HoP ruling) — **amendment to M3-AC7**
- **Hard cap:** the serialized pinned store is **≤ 200 KB**. Checked on each flush (and on session rotation).
- **Compaction:** while over the cap, take the **oldest** session (by `session_start.ts`) that still has raw pinned events and replace all its pinned events with one `session_summary` record. Repeat until ≤ 200 KB. **The current session is never compacted.** Already-summarised sessions are not touched again. Raw M4 save events in a compacted session are counted in `counts` (type + count); nothing is dropped without a trace.
- **M3-AC7 amendment:** "pinned events are never evicted" becomes "pinned events are never silently dropped; past 200 KB, the oldest sessions' pinned events are summarised into one record per session that preserves counts, session totals, first-upgrade data and session_start fields."
- **`session_summary` shape** (pinned, in schema.ts):
```
{ type:"session_summary", sid, ts,            // ts = session_start.ts
  start:{ reason, build, session_index, farm_level, collection_level,
          has_coop_hand, viewport_w, reduced_motion, prev_hidden_ms? },
  end:{ reason, fg_ms, taps_total, taps_moved_eggs, eggs_collected_manual } | null,
  counts:{ <event type>: n, ... },             // raw pinned events summarised, incl. coop_full end/capped
  coop_full_ms, eggs_lost_while_full, coop_full_episodes, coop_full_flapping,
  first_upgrade:{ fgMs, upgrade, newLevel, cost, taps_before } | null,  // only if is_first_upgrade was in this session
  upgrades:n }
```
- **Growth sizing (Architect's measurements):** raw pinned ≈ **2.7 KB per typical session** (start/end, ~10 coop_full ends, ~3 manages, ~2 upgrades), ≈ 1 KB idle/managed, ≈ **15 KB per flapping session** (100 ends + capped), plus a one-off ≤ 11 KB lifetime upgrades. 200 KB of raw pinned ≈ 70 typical or ≈ 13 flapping sessions before compaction starts; a summary (≈ 0.5 KB) frees ≈ 2.2 KB (typical) or ≈ 14.5 KB (flapping).
- **Size:** ≈ 450–600 B typical, **≤ 1 KB** hard limit (asserted in tests; `counts` holds only types present, ≤ ~10 keys). 200 KB therefore holds ≥ 200 summaries even if no raw sessions remain. `install_id` is not repeated (one per store).
- **Totals source:** `coop_full_ms`/`eggs_lost_while_full` come from the session's `session_end` totals (which keep counting past the cap); if the session has no `session_end`, they are summed from the raw `coop_full` end events and `end:null`.
- **Safety valve (v0.5.1, Architect C1; complements the 200 KB cap):** if total serialized `eggfarm.telemetry` exceeds **150 KB**, shrink the effective trimmable ring: `ringEff = max(200, floor((150 KB − pinnedBytes) / 110 B))`. **Pinned events are never touched by the valve**; only ring-trimmed history shrinks, never below 200 events. Log `telemetry_budget_shrunk {ringEff}` once per session. Order on flush: compact pinned to ≤ 200 KB (oldest non-current sessions), then apply ringEff.
- **Scope of the 200 KB cap (v0.6 clarification):** the 200 KB cap applies to the **pinned store only**. Total `eggfarm.telemetry` = ring (≈ 95 KB at 900 events, shrinking toward 200 events via ringEff when the total exceeds 150 KB) + pinned (≤ 200 KB). Typical installs stay ≤ 150 KB; **worst case ≈ 225–300 KB** (≈ 225 KB with the ring at its 200-event floor; up to ≈ 300 KB transiently before the valve applies on the next flush). Saves confirmed the fit (2026-10-16): ≈ **404 KB worst case** including a 20 KB save, its `.bak` and M4-A headroom, against a ≈ 5 MB localStorage limit; Saves re-verifies after SQ-1.
- **Saves rules (v0.6.1):** (1) M4-A's `quota_headroom` check counts telemetry's **current** serialized bytes (not an estimate). (2) On quota pressure, **telemetry yields first**: shrink the ring (to its 200-event floor), then compact the oldest non-current sessions' pinned events into `session_summary` records, and retry; only if still short may a save or backup write be refused. Telemetry never causes a save/backup refusal while it can still shrink.
- **T-AC15** Given localStorage near quota and telemetry at its worst case, when a save or `.bak` write would exceed quota, then (a) `quota_headroom` uses telemetry's actual current bytes; (b) the ring is trimmed toward 200 events, then oldest non-current sessions are compacted, before any save/backup refusal; (c) the save/backup write succeeds if the freed bytes suffice; (d) the current session is never compacted and no pinned event is dropped without a summary.

## 4. Volume & retention
- Taps: at most one `tap` event per `tap_batch_ms` (economy.md/balance config) regardless of tap rate; auto-clickers add no events. 10 taps/s for 10 min → ≤ 600 events at a 1000 ms window. `tap` stays ring-trimmed (not pinned).
- `coop_full` (v0.4): **pin only `phase:end`** (it carries `durationMs`, `eggs_lost`, `exit_reason`); `phase:start` is ring-trimmed (§3.2). Cap: **100 episodes per session**, so ≤ 100 pinned end events (≈ 16 KB). Past the cap, stop emitting `coop_full`, but the session totals `coop_full_ms` and `eggs_lost_while_full` **keep counting** (PM Workers' condition), and one `coop_full{capped:true}` event is logged once when the cap is hit (pinned). `session_end.coop_full_flapping=true`. Counter resets on session rotation.
- **Byte budget (v0.4, R2):** target **≤ 150 KB** serialized `eggfarm.telemetry` for a session. Measured average non-pinned event ≈ **130 B** with `sid`+`fgMs` (Architect's JSON.stringify measurements); dropping `sessionMs` saves ≈ 25 B → ≈ 105 B. **`ring_size` = 900** → ≈ 95 KB ring. One worst-case flapping session pins ≈ 16 KB coop_full end (100 × 163 B) + ≈ 12 KB upgrades + ≈ 1 KB start/end ≈ 30 KB → ≈ 125 KB total. Pinned events are never silently dropped; cross-session pinned growth is bounded at 200 KB by session compaction (§3.3). **Byte-budget unit test:** a 10-minute flapping + 20 taps/s auto-clicker fixture asserts serialized size ≤ 150 KB and that no pinned event is evicted. **Multi-session budget test (v0.5.1, C4, separate test):** ~20 typical sessions + 2 flapping sessions (incl. hidden-tab splits); asserts total ≤ 150 KB via ringEff (ring ≥ 200), pinned ≤ 200 KB, no pinned event dropped without a summary, and one `telemetry_budget_shrunk` per session where the valve fires. Reason: flush rewrites the whole log every save and competes with M4-A's LS-only backup / `quota_headroom` rule.
- `session_start/_end`, `upgrade` already pinned. Session totals on `session_end` mean M1/M3 survive ring eviction of `tap` events.
- No per-frame or per-egg events.

## 5. Dashboards (questions · formula · target · cuts)
**Standard cuts** (every metric): Farm level band (0–2, 3–7, 8–14, 15–19, 20–30), Collection level band (0, 1–4, 5–9, 10–19, 20–30), **managed vs unmanaged** (managed = session with ≥ 1 hired worker AND ≥ 1 `worker_manage*`; unmanaged = has workers but no Manage; no-workers = third bucket), **device width** (`viewport_w` bucket: <375, 375–767, ≥768), session_index (1 vs 2+), build.

### 5.1 M1 Taps per session
Questions: Do players keep tapping after FTUE? Does tapping fall off once Coop Hand is hired? Did the streak (M4) raise tapping without auto-clicker abuse? Are narrow-screen players tapping less (layout friction)?
Formulas: `taps_per_session = session_end.taps_total` (fallback Σ `tap.count` per `sid`); `taps_per_active_min = taps_total / (fg_ms/60000)`; `effective_tap_share = taps_moved_eggs / taps_total`; `manual_collect_share = eggs_collected_manual / (eggs_collected_manual + Σ coop_hand_eggs)`.
Report median/p25/p75; exclude sessions with fg_ms < 10 s.
Target: `effective_tap_share` ≥ 0.85 (alert below); report by tap-rate segment (≥ 45 / 15–45 / < 15 taps/active-min). Streak check: p99 of taps_per_active_min ≤ 600 (anything higher = auto-clicker, flag only).

### 5.2 M2 Time to first upgrade
Questions: Do new players buy within 30 s? Where do slow players stall (no tap? tapped but not sold? sold but did not buy)? Does the goal strip help?
Formula: for `session_index=1`, `TTFU = fgMs` of the first `upgrade` with `is_first_upgrade=true`. Report p50, p75, % ≤ 30 s, % never (no upgrade in session 1). Funnel: first `tap` fgMs → first `sell` → first `goal_tap` → first `upgrade`.
Target: **p50 ≤ 30 s, p75 ≤ 45 s** (approved v0.6); flag any TTFU < 10 s as a clock/telemetry bug; [P] ≥ 80% of session-1 players ≤ 60 s (tracking only). Cuts: device width, onboarding skipped vs not (`onboarding_skip`).

### 5.3 M3 Coop-full idle time
Questions: How much foreground time is the coop full (production wasted)? Is it the "go hire a Coop Hand" nudge it should be at early Farm levels, or a stall later (B-1)? Does the Coop Hand fix it? How many eggs are lost?
Formulas: `coop_full_share = coop_full_ms / fg_ms` per session; `episode_ms` distribution from `coop_full{phase:end}.durationMs`; `eggs_lost_share = eggs_lost_while_full / (eggs_produced)` where eggs_produced = manual + Coop Hand + lost; exit-reason mix.
**Target band — APPROVED (v0.6, Economy E-Q4; Coop Hand unlocks at F7):**
| Segment | coop_full_share (median session) | Episode median (provisional, not re-simmed) |
|---|---|---|
| Farm 0–7 (no Coop Hand possible before F7) | **5–40%** | ≤ 60 s |
| Farm 8+, no Coop Hand or hand unmanaged | **10–60%** | ≤ 90 s |
| Coop Hand hired & managed | **≤ 5%** | ≤ 15 s |
**Alerts:** coop_full_share **> 60% at F0–7**, **> 75% at F8+**; **< 2%** only when there is no Coop Hand **and** the session's median tap gap ≥ 20 s (cap never binds → cap too big).
Rationale: below the band, coop size is irrelevant; above it, players sit idle and the B-1 stall returns. Sim cells are matched by median tap gap (§6).

## 6. Sim reconciliation (approved v0.6, Economy E-Q1–E-Q6)
`economy_sim.py` models online play (seller15/cheapest bots) plus visit-player cells by gap between tap bursts (product/collection-telemetry-sim-reconciliation.md). Compare live values against:
| Metric | Sim output to compare | Tolerance |
|---|---|---|
| M2 TTFU | 15.0 s (30/30 seeds, both bots) | live **p50 ≤ 30 s, p75 ≤ 45 s**; **< 10 s = clock/telemetry bug** (10–12 s is physically possible) |
| Pacing check | Farm L at 5/10/30 min fg (4 / 10 / 18) | ±20% (the existing AC7 tolerance), ≥ 45 taps/min segment only |
| M1 taps | `effective_tap_share` sim 1.00 (raw tap rate is a bot input, not compared) | **alert if live < 0.85**; tap-rate segment (≥ 45 / 15–45 / < 15) picks the sim profile for M3 |
| M3 coop_full_share | visit-player sim cell matched on live median gap between tap bursts | **±10pp managed, ±15pp unmanaged/no hand** |
| M3 eggs lost share | same matched cell | **±5pp absolute when sim < 30%; ±15% relative when sim ≥ 30%** |
| M4 golden egg | live catch rate × E1 lift curve per Farm band (managed +17%/+11% at 100%/60% catch to F18; unmanaged +12%/+8%) | **±3pp** of income uplift |
| Streak | cap-0.40 rerun (Economy, 2026-10-16): mean active/idle optimal 1.64–1.72, casual 1.50–1.52; worst seed 1.93 | live **P95 active/idle ≤ 2.0** (hard CEO rule; 0.07 headroom vs worst seed); mean **optimal 1.64–1.72 ±0.15, casual 1.50–1.52 ±0.15** |
Managed/unmanaged ratio excludes collectible income in both arms [HoP decision (4)]; the active-vs-idle 2× check includes it.

## 7. Privacy
- No PII: no names, emails, IPs, precise geo, user agent string, or free text. `install_id` is a random UUID and `sid` a random 6-char id, both never derived from device identifiers. Viewport is bucketed. Data stays in local storage until a user-initiated export (current playtest model); any future upload needs a separate privacy review and consent copy.
- Reset (`save_reset`) keeps `install_id` (existing M3-AC7 behaviour) — documented, not changed here.

## 8. Acceptance criteria
- **T-AC1** Given a fresh load, then `session_start` fires once with non-null `install_id`, `sid` (6-char id), `session_index`, `reason="load"`, `farm_level`, `collection_level`, `viewport_w` bucket, and every later event in that session carries the same `sid`. No event carries `sessionMs`.
- **T-AC2** Given the tab is hidden 30 s and shown again, then no new session starts and `fgMs` advances by < 1 s across the gap. Given hidden ≥ 60 s, then `session_end{reason:"hidden"}` and a new `session_start{reason:"resume"}` with a new `sid` and `session_index+1`.
- **T-AC3** Given 50 Collect taps within 1 s (tap_batch_ms = 1000), then exactly one `tap` event is recorded with `count=50`, `eggs` = Σ moved, and `empty` = taps that moved 0. No `collect_tap` event exists.
- **T-AC4** Given an auto-clicker at 20 taps/s for 60 s, then ≤ 61 `tap` events are recorded and the ring buffer never evicts a pinned event.
- **T-AC5** Given a first-ever session, when the first upgrade is bought, then `upgrade.is_first_upgrade=true` and its `fgMs` equals the TTFU shown on the dashboard (±50 ms). Later upgrades and later sessions have `false`.
- **T-AC6** Given the coop fills and is emptied by a tap, then exactly one `coop_full{phase:start}` and one `{phase:end, exit_reason:"tap"}` fire, `durationMs` matches wall time ±1 s, and `eggs_lost` = production rate × duration ±1 egg (B-1 AC-B5 plus Collection's field).
- **T-AC7** Given a session with two full episodes of 10 s and 20 s, then `session_end.coop_full_ms` = 30000 ±1000 and `eggs_lost_while_full` = Σ episode `eggs_lost`.
- **T-AC8** Given `session_end`, then `taps_total` = Σ `tap.count` for that `sid` (before ring eviction) and `fg_ms` excludes hidden time.
- **T-AC9** Given any export, then no event field contains a name, email, IP, UA string or free text; the export validates against `src/telemetry/schema.ts` (§3.1).
- **T-AC10** Given flapping producing > 100 episodes, then `coop_full` emission stops, exactly one `coop_full{capped:true}` is logged, `session_end.coop_full_flapping=true`, and `coop_full_ms`/`eggs_lost_while_full` still include episodes past the cap.
- **T-AC11** Given the dashboard query on a fixture export (QA-provided, 3 sessions), then M1/M2/M3 values match the hand-computed values exactly, split correctly by managed/unmanaged and width bucket.
- **T-AC14** Given 50 consecutive worst-case flapping sessions (100 coop_full episodes + capped, 60 upgrades each, auto-clicker 20 taps/s, 10 min fg), then after every flush the pinned store is ≤ 200 KB; each compacted session has exactly one `session_summary` ≤ 1 KB with no raw pinned events left; for every session, summary `counts`, `coop_full_ms`, `eggs_lost_while_full`, `upgrades` and `first_upgrade` equal the totals computed from the raw events before compaction (recorded by the test); the current session is never compacted; compaction is oldest-first.
- **QA-T14 (manual/QA fixture):** QA runs the 50-session worst-case fixture via the debug panel/scripted clock, exports, and confirms: pinned ≤ 200 KB, dashboard M1/M2/M3 values computed from summaries match those from a raw (uncapped) reference export of the same run, and the live session's raw events are complete.
- **T-AC12** Given M5.0 collectible and streak events, then their names and fields match the M5.0 specs verbatim (`collectible_collected`, not `collectible_tapped`): `m5-golden-egg-spec.md` §8 (GE-AC27), `m5-streak-tap-coins-spec.md` §8/§8.1 (ST-AC19, ST-AC20) and `m5-broody-hen-spec.md` §8 (BH-AC19).

## 9. Open questions
- ~~Economy E-Q1–E-Q6~~ **Closed (v0.6, approved):** see §1, §5, §6. Streak mean set from the cap-0.40 rerun (2026-10-16) — closed.
- ~~PM Workers B-1 ack~~ **Closed:** PM Workers accepted `eggs_lost`, end-only pinning at cap 100 and `exit_reason: hidden|other` as **B-1 v1.0.2** (C3).
- ~~Head of Product: pinned growth~~ **Closed 2026-10-16:** 200 KB pinned cap with per-session compaction (§3.3).

## v0.2: Head of Product decisions (2026-10-16 22:42)
- Session rule approved: a hidden tab for ≥ `session_hidden_end_s` (tunable, default 60 s) ends the session. The next `session_start` logs `prev_hidden_ms` (how long the tab was hidden) so offline returns stay analysable.
- T-AC13 Given the tab was hidden for H ≥ 60 s, when it becomes visible, then `session_end{reason:"hidden"}` is emitted on return with `ts` = the hide time (back-dated), and the new `session_start` has reason=resume, a new sid and prev_hidden_ms = H ± 1 s.
- Coop-full bands, alerts (>50% / <2%) and time to first upgrade (median ≤ 30 s, P75 ≤ 45 s) are approved as PROVISIONAL. They will be recalibrated after Player's session 3 and the first sim reconciliation.
- Rename: 'Egg Quality' is approved, with 'Collection' as the fallback (see rc2-rename-brief.md).

## v0.3: Buildability fixes (2026-10-16 22:50, per Architect review /workspace/telemetry-buildability-v0.2.md)
- **B1** §3.1 adds the complete allowlist; T-AC9 validates against `src/telemetry/schema.ts`.
- **B2** The hidden-end reason is `hidden` everywhere (§2, §3, T-AC2, T-AC13).
- **B3** No timer while hidden. On `visibilitychange→visible` with gap ≥ `session_hidden_end_s`: emit `session_end{reason:"hidden"}` back-dated to `ts=hiddenAt` (fg totals as of hide), then `session_start{reason:"resume", prev_hidden_ms}`. **One `session_end` per sid:** if `pagehide` fires after the tab has been hidden ≥ `session_hidden_end_s`, it emits the back-dated `session_end{reason:"hidden"}` (if not already emitted) and no second end; pagehide after a shorter hide emits `session_end{reason:"unload"}`. An open `coop_full` episode is closed at the split with `exit_reason:"hidden"` (coordinate with B-1). Read-only/inactive tabs never rotate.
- **B4** `session_hidden_end_s` lives in the `telemetry` block of balance.json (hand-set, preserved by sync-economy; `--check` unaffected). validateBalance enforces `session_hidden_end_s == offline.offlineMinSeconds` (both 60 by default) (v0.4: the session split and offline catch-up are **separate rules that only share a default**; the sim's gap is frame-to-frame and a throttled hidden tab can simulate > 60 s online, while `prev_hidden_ms` is visibility-based).
- **Cost** Slim envelope (`sid` 6 chars + `fgMs`; rest on session_start only), 150 KB budget via ring 1500 (superseded in v0.4), coop_full pin on `end` only at cap 200 (superseded: 100), plus PM Workers' past-cap totals and one-time `capped:true`.
- **Hooks needed:** (1) visibility hook into Game/Telemetry (main.ts; today only autosave listens) + `Telemetry.rotateSession()` and fgMs accumulator; (2) `session_start` moved after save load (game.ts:36 → after :50), staying first in the session, with session_index/viewport/reduced-motion from a UI context provider; (3) `session_end` per-session counters/payload (none today); (4) coop_full B-1 fields not on main — **dependency on PM Workers/B-1**, land together; eggs_lost via sink-only `coop_overflow` SimEvent; (5) persisted first-upgrade flag; (6) schema.ts.
- **Estimate & order:** ≈ 22–24 h eng (≈ 28 h with contingency) + 3–4 h QA (T-AC11 fixture/query). Owner Features; Saves for M4 ordering/isPinned; PM Workers for B-1; QA for T-AC11. Sequenced **after M4-A and SQ-1**; balance key + tap/upgrade fields (2.5 h) can fill gaps.

## v0.4: Architect's v0.3 review (2026-10-16 22:55)
- **R1** §3.1 allowlist fixed: exact `tab_guard_blocked_write` / `tab_guard_takeover`; removed `collect`, `worker_collect`, `wage`, `hire`, `manage`, `collection`; `open:true` (tap, worker_summary) and `live:true` (save_newer_version) allowed; `save_copies_diverged` planned, fields TBD.
- **R2** `sessionMs` dropped (derived from `ts − session_start.ts`); ring 900 at ≈ 130 B measured (≈ 105 B without sessionMs) → ≈ 95 KB; byte-budget test added.
- **R3** M3-AC7 kept: pinned events never trimmed; older-session trim rule removed; coop_full end cap lowered to 100/session; past-cap totals keep counting and one `coop_full{capped:true, episodes:100}` is logged. `isPinned(e)` defined in §3.2.
- **R4** `exit_reason:"hidden"` added to the B-1 enum here and proposed in rc1-b1-coop-full-spec.md for PM Workers.
- **B4** Session split and offline catch-up are separate rules sharing a default (validated equal); no "same gap" claim.
- Stale wording cleaned (§2, §7, T-AC1/2/8/13, §9).
- **Estimate:** ≈ 27–29 h eng (≈ 34 h with contingency) + 3–4 h QA. Owners/order unchanged: Features, after M4-A and SQ-1.

## v0.5: Head of Product ruling on pinned growth (2026-10-16 22:58)
- coop_full stays at 100 per session. Pinned store hard cap 200 KB; past it, the oldest sessions' pinned events compact into one `session_summary` each (§3.3); current session never compacted. Amends M3-AC7 (summarise, never silently drop).
- T-AC14 + QA-T14 added (50 worst-case sessions, ≤ 200 KB, summaries reconcile with raw totals, current session untouched).
- **Estimate:** +3 h eng (assumption: compaction ~1.5 h, summary schema/size guard ~0.5 h, T-AC14 fixture + reconciliation ~1 h) and +1 h QA → **≈ 30–32 h eng (≈ 38 h with contingency) + 4–5 h QA.**
- **Status: approved; queued after M4-A and SQ-1.** Owners unchanged (Features; Saves; PM Workers for B-1; QA for T-AC11/QA-T14).

## v0.5.1: Architect's v0.4 recheck (2026-10-16 23:05)
- **C1** HoP's 200 KB pinned cap + `session_summary` compaction kept; Architect's safety valve added (total > 150 KB → ringEff ≥ 200, pinned never touched, `telemetry_budget_shrunk` once/session).
- **C2** §3.2 enumerates the full pinned set; §3.1 label fixed (only the 3 M4 save events pinned; collectible/frenzy/streak ring-trimmed); duplicate §4 budget-test sentence removed.
- **C3** PM Workers accepted as B-1 v1.0.2; item 6 / T-AC6/7/10 unblocked.
- **C4** Multi-session budget test added (~20 typical + 2 flapping).
- §3.3 sizing uses Architect's figures (≈ 2.7 KB typical, ≈ 15 KB flapping per session).
- **Estimate:** v0.5 + ≈ 0.5 h valve + ≈ 0.5 h multi-session test → **≈ 31–33 h eng (≈ 39 h with contingency) + 4–5 h QA.** Status unchanged: approved, queued after M4-A and SQ-1.

## v0.6: sim reconciliation (Economy E-Q1–E-Q6) — **APPROVED by Head of Product (2026-10-16 23:12)**
Source: product/collection-telemetry-sim-reconciliation.md. These supersede the corresponding targets, tolerances, bands and alerts in §1, §5 and §6 (including the provisional v0.2 bands/alerts).
- **E-Q1 (M1, §6):** drop "taps/active-min ±25%" (sim tap rate is a bot input, 60/min). New metric `effective_tap_share = taps_moved_eggs / taps_total` (sim 1.00); **alert if live < 0.85**. Segment players by live taps/active-min: **≥ 45** (bot-like), **15–45** (casual), **< 15** (visitor); the segment picks the sim profile for E-Q2/E-Q3.
- **E-Q2 (M3 coop_full_share, §6):** compare live against the visit-player sim cell matched on the live **median gap between tap bursts** (always-on bots are 0%). Tolerance **±10pp managed, ±15pp unmanaged/no hand**.
- **E-Q3 (eggs lost, §6):** **±5pp absolute when sim < 30%; ±15% relative when sim ≥ 30%** (relative blows up near 0).
- **E-Q4 (M3 bands, §5.3; Coop Hand unlocks at F7):** healthy bands **5–40% at F0–7**, **10–60% at F8+ with no hand or unmanaged hand**, **managed ≤ 5%**. Alerts: **> 60% (F0–7)**, **> 75% (F8+)**; the "< 2%" alert fires only when there is no hand **and** median tap gap ≥ 20 s. Replaces the provisional 10–30 / 10–35 / ≤ 5 bands and > 50% / < 2% alerts.
- **E-Q5 (M2 TTFU):** keep **p50 ≤ 30 s, p75 ≤ 45 s**; drop the "never > 5 s faster than sim" rule; **TTFU < 10 s is flagged as a clock/telemetry bug** (10–12 s is physically possible).
- **E-Q6 (M4):** golden-egg uplift = live catch rate × E1 lift curve per Farm band, **±3pp**; streak **P95 active/idle ≤ 2.0** (hard CEO rule); streak mean target **pending a rerun at cap 0.40** (current 1.44–1.55 is from cap 0.30).
- Test impact: T-AC11 fixture adds `effective_tap_share`, tap-rate segment and median-gap matching. No new events (all derivable from `session_end`/`tap`).

## v0.6.2: streak targets from Economy's cap-0.40 rerun (2026-10-16 23:50)
- E-Q6 streak: mean optimal 1.64–1.72, casual 1.50–1.52 (both ±0.15); P95 ≤ 2.0 (worst seed 1.93, 0.07 headroom). Streak-mean open item closed.

## v0.6.2 + TEL-7 (2026-10-24, PM Collection)
- T-AC12 re-pointed from the M4 specs to the M5.0 v1.1 specs' telemetry sections and ACs (HoQA `qa/m5/telemetry-review.md` v0.2, TEL-7). No event or field changes.

## v0.6.2 + golden-freeze fields (2026-10-24 22:11 CEST, PM Collection; HoP D-HOP-2026-10-24-43)
- Adds the 3 HoE-approved fields (golden errata v1.3.3 DRAFT **rev. 5**, `product/collection/m5-golden-egg-errata-v1.3.3-DRAFT.md`, sha1 `8439752d62fc34fc0fe814a75321975738b2acf2`, §8 / GE-AC45; pause errata v1.3.6 rev. 4 sha1 `9245d27c…` §1.4 / AC-P26):
  - `session_end.golden_frozen_s`: focus-clock sim seconds while `goldenFrozen()` is true, 0.1 s resolution.
  - `worker_paused.golden_on_screen`: bool, from the pre-pause state on the pause tick.
  - `worker_paused.frenzy_active`: bool, from the pre-pause state on the pause tick.
- **HoE approval of record** (`product/decisions.md`, 21:56): "HoP: D-HOP-40 precondition 3 is closed. HoE approved H-1 on paper: the v0.6.2 telemetry allowlist is session_end.golden_frozen_s, with focus-clock sim seconds rounded to 0.1 s, plus worker_paused.golden_on_screen and frenzy_active, sampled from the pre-pause state."
- `worker_paused` was not catalogued here before. It is added to §3 and the §3.1 allowlist with its Pause spec §12 fields (pinned there; in the M5.0 subset only if Pause ships, TEL-14). Its partner `worker_resumed` and the Pause `session_end` fields (`paused_worker_s`, `all_paused_s`) stay as defined in the Pause spec and are **not** catalogued here (out of this change's scope). The §3.2 `isPinned` set is not edited.
- Paper only; no code. T-AC9 / `schema.ts` picks these fields up when HoE builds the allowlist.

## v0.6.2 + breeds Present-gate fields (2026-10-24 23:26 CEST, PM Collection; HoP D-HOP-2026-10-24-47)
- `session_end` adds `present_active_s` (number, at most 1 decimal: focus-clock seconds rounded to 0.1 s) and `present_lost_count` (integer), **required** while `m4.flags.breeds` is on (0 when no settled Present breed was slotted) and absent with the flag off, like every breed field. Definitions are in `product/m5.1-breeds-spec.md` rev. 3.3 §8 (BR-R12b rate gate, W `bc_present_calm_w_s` = 10, k `bc_present_calm_k` = 6; final A8 names, renamed 2026-10-25 from the D-HOP-47 placeholders); test BR-AC53.
- D-HOP-47: "Telemetry present_active_s and present_lost_count ship with the feature". They monitor the accepted near-threshold pacing limit (breeds K9).
- **Pending:** HoE's `schema.ts` allowlist (breeds Q-COL-9; T-AC9). Paper only.

## v0.6.2 + breeds fields aligned to HoE (2026-10-24 23:45 CEST, PM Collection; HoE `engineering/decisions.md` 23:44, Q-COL-9 CLOSED)
- `present_active_s` changes from an integer (floor) to a **number in focus-clock sim seconds, rounded to 0.1 s** (HoE: "focus-clock sim s, 0.1 s rounding"). `present_lost_count` stays an **int**.
- Unchanged: both are required with `m4.flags.breeds` on (0 if no Present breed is slotted), absent with it off, no PII.
- The previous section's "Pending: HoE's `schema.ts` allowlist" is **closed**: HoE APPROVED them for the allowlist. Definitions are in breeds rev. 3.7 §8.

## Column-name alignment (2026-10-25 01:43 CEST, PM Collection; breeds rev. 3.8, D-HOP-2026-10-25-02)
- The breeds Present-gate columns referenced above are now the final Econ A8 names, `bc_present_calm_w_s` (10) and `bc_present_calm_k` (6). They replace the D-HOP-47 placeholders `bc_present_window_s` / `bc_present_tap_k`. No telemetry field, type or rule changes.

## Type wording fix (2026-10-25 01:55 CEST, PM Collection; HoQA F-2 on breeds rev. 3.8.2; breeds rev. 3.8.3 BR-AC53)
- The "v0.6.2 + breeds Present-gate fields" entry above used to call both fields "(integers)". It now says `present_active_s` is a number with at most 1 decimal and `present_lost_count` an integer, matching the HoE alignment section (Q-COL-9) and breeds §8 / BR-AC53 (non-whole test case 12.3). No rule change.

## v0.6.2 + zero-gain UI fields (2026-10-25 02:56 CET (UTC+1), PM Collection; HoP D-HOP-2026-10-25-09, HoE Q-ZG-E1 (b))
- `upgrade` gets an optional `zero_gain` bool, present only while `m5.flags.zeroGainUi` is on and only on collection / hens / eggValue upgrades. It is absent with the flag off. Set in the UI purchase handler after dispatch; not in the sim stream.
- New event `zero_gain_confirm {upgrade_id, outcome: confirm|cancel}`, ring-trimmed (not pinned), on the §3.1 allowlist. It fires only if `m5.zeroGain.confirm` is true, which stays OFF in M5.1 (Art Q-Art-4). No PII.
- Source: `product/collection/m5.1-zero-gain-purchase-ui.md` v0.2 §10. Pinning rule (§3.2), budgets and existing fields are unchanged.

## Enum fix (2026-10-25 03:16 CET (UTC+1), PM Collection; HoQA F17, QA-D-1025-ZG1)
- The `upgrade.upgrade` enum is now `collection|farm|hens|eggValue`, matching the code (`sim/events.ts:9` at 30b29d3). It used to read `collection|farm`.
- `zero_gain_confirm.upgrade_id` uses the same values minus `farm` (HoE `engineering/decisions.md` 03:02). No other change.

## Cite fix (2026-10-25 03:28 CET (UTC+1), PM Collection; HoQA T5, QA-D-1025-ZG2)
- The `upgrade` row's cite now reads zero-gain spec v0.3.1 §5.2. It used to read v0.2, and §5.2 is unchanged in meaning since v0.3. Record only: no event, field or rule change.

## Record-only addendum: allowlist gaps G-TEL-1..3 (2026-10-29 20:20 CET (UTC+1), PM Collection; HoP D-HOP-2026-10-29-04; no version bump)
Source: HoQA `qa/v5-saves/READINESS.md` G-TEL-1..3 (the telemetry-latest-p1 run). The fields are checked against Latest m4.1-p1 `30b29d3`.
- **G-TEL-1 (§3.1 Save/integrity):** `save_recovery_notice_shown` and `save_recovery_notice_dismissed` (CSR-10) ship. The fields are as emitted on Latest: `notice`, `source`, optional `variant`, and `store`. These are all enums or null.
- **G-TEL-2 (§3.1 M4, ring-trimmed, not pinned):** `milestone_reached {id, track: hens|egg_value, level, mult}` and `balanced_tier {id, tier, min_level}` ship.
- **§7 privacy holds for all four:** `id` is a balance-data milestone id (an enum, never free text), and the schema rejects any other string field. A field emitted on Latest that's outside these lists fails T-AC9.
- **G-TEL-3 (§3 `offline_grant`):** `secondsAway` is canonical, and `awayS` is internal only, so this is a code-comment fix with no schema change.
- §3.2 pinned set unchanged. No AC, target or version changes.
