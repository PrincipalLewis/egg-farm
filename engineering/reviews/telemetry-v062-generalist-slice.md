# Telemetry v0.6.2 emission: slice for Senior Engineer Generalist (5a6a207d)

Author: Senior Engineer, Saves & Persistence · 2026-10-30 CET · Draft for HoE to assign · Paper only

## Scope of record
- **Schema:** `src/telemetry/schema.ts` (Saves, feat/saves-v5-telemetry-schema). It is the allowlist; every field below is already typed there. If you emit something the schema doesn't accept, the schema is wrong or the emit is wrong. Raise it with Saves; don't widen the schema in your PR.
- **Spec:** telemetry-spec v0.6.2 `d170eb09` §3–§4, plus errata v5 **rev. 13 `a0e8f6d7`** (HoQA TELERR7 passed 14:47 CET; HoE pinned it 14:51 CET, manifest `8446ff40`).
- **Rulings:** D-HOE-20261030-18/-19/-20/-23/-24/-25/-29/-31/-32/-33.
- **Card:** #T in product/m5-gate-acs.md.
- **Gating:** every flag-gated event or field must be absent with its flag at 0 (TEL-AC10). Releases never drop events; tests validate them with `validateEvent` (T-AC9).

## What Saves keeps (lane S; not yours)
- **Envelope:** `sid` (6-char base36 from crypto) and `fgMs` (foreground ms) on every event, and `sessionMs` removed (TEL-AC1).
- **Stored ring:** `{v, events}`, with legacy events tagged `legacy:true`. The export header carries `schema_version` (V-0).
- **isPinned:** telemetry.ts switches to the event-based `isPinned(e)` from schema.ts (V-3).
- **`session_end`:**
  - Firing, plus the base fields `reason`, `fg_ms`, `taps_total`, `taps_moved_eggs`, `eggs_collected_manual`, `coop_full_ms`, `eggs_lost_while_full`, `managed`, `farm_level`, `collection_level` and `coop_full_flapping`.
  - `shortage_s` and `ability_blocked_taps`.
  - Workers/breeds fields: `wage_paid_asleep_cents`, `asleep_s`, `refills_manual`, `refills_auto`, `charge_starved_s` and the breeds fields.
  - `zero_gain_purchase_dropped`, as the counter that goes with the cap.
- **Caps:**
  - `ability_blocked`: 50 per session, then one `{capped:true, events:n}` marker.
  - `zero_gain_purchase`: 50 per session (`telemetry.bbv2.zero_gain_purchase_cap`) with **no marker**. Rev. 13 forbids one; overflow is counted only in `session_end.zero_gain_purchase_dropped`.
  - Saves builds both counters.
- **Workers emitters:** `worker_summary.wage_<worker>_asleep_cents`, `refill_used`, `rest_toggled` and `shift_sheet_opened`.
- **Breeds emitters:** `hatch_started`, `breed_revealed`, `breed_slotted`, `flock_complete`, `offline_grant.away_bp`, and the breeds `save_migrated` shape.

**Open for HoE:** which of the `session_end` field families are Saves' and which are yours. I've read "session_end incl. shortage_s and ability_blocked_taps" as the event and its base fields being Saves'. The per-feature field families in §2 below are yours.

## Your slice

### 1. `session_start` v0.6.2 fields (TEL-AC2, TEL-AC3 data part, T-AC1)
- **Fields:** `session_id`, `session_index` (flags.sessions, ≥ 1), `reason` (load | resume), `farm_level`, `collection_level`, `has_coop_hand`, `reduced_motion`, `prev_hidden_ms?` on resume.
- **`viewport_w`:** buckets `'<375' | '375–767' | '≥768'`. These are spec L27's literals, en dash and ≥ included. Confirm the strings with PMC before you emit.
- **`viewport_h`:** buckets `'<740' | '740-899' | '>=900'`, from `innerHeight`, and never absent (0 → `'<740'`).
  - The 740 edge is the single constant shared with the sales-stopped CSS breakpoint (V-4).
  - Boundary test: 739 → `'<740'`, 740 → `'740-899'`, 899 → `'740-899'`, 900 → `'>=900'`.
- **Re-sampling:** a `session_start{reason:"resume"}` after a hide of ≥ 60 s re-samples. A resize never re-emits.
- **Files:** src/game.ts:60 (emit), src/ui/app.ts (viewport/reduced-motion inputs), and the shared breakpoint constant.

### 2. `session_end` feature field families (TEL-AC8, TEL-AC10)
- **Golden:** `golden_spawned`, `golden_collected`, `golden_cents`, `frenzy_extra_cents`.
- **Broody:** `broody_cents`, `broody_collects`.
- **Streak:** `credited_taps`, `tap_bonus_cents`, `streak_extra_cents`. §8.1 has more fields; if you add any, Saves adds them to the schema.
- **Pause:**
  - `golden_frozen_s`, at 0.1 s.
  - `paused_worker_s` and `all_paused_s`, only when rc2Refill = 0 (V-6).
- **Abilities:** `ability_uses`, `calls_ready_unused_s`.
- **Absence:** each family is absent with its flag at 0, not 0.
- **Files:** wherever each feature accumulates its totals, plus the `session_end` payload builder in game.ts, which Saves owns. Agree the hand-off point with Saves: Saves' builder takes a `Record<string, number>` from each feature.

### 3. Core event extensions (§3 table; T-AC3, T-AC10)
- **`tap`:**
  - `empty` and `full_at_start`, in telemetry.ts `tap()` / `closeTapWindow`.
  - `credited`, `empty_credited` and `bonus_cents` (streak/tapCoins flags) from the collect SimEvent.
- **`upgrade`:**
  - `is_first_upgrade` (first purchase of the install) and `taps_before` (session taps so far).
  - `zero_gain`, set by the UI purchase handler only. It's present only with `m4.flags.zeroGainUi` on and only on collection/hens/eggValue.
- **`coop_full`:**
  - B-1 fields: `farm_level`, `coop_cap` and `coop_hand_state` on start, and `exit_reason` on end.
  - `eggs_lost` on end, from the sim tick.
  - The 100-episode cap and one `{capped:true, episodes:100}` marker. Totals keep counting past the cap (T-AC10).
  - Files: game.ts:127-128.
- **`coop_hand_tip`, `goal_tap`, `zero_gain_confirm`:** no change, but check them against the schema. `zero_gain_confirm` never fires with `m4.zeroGain.confirm` = 0.

### 4. Retention: compaction and the budget valve (§3.3, T-AC14, T-AC15, multi-session budget test)
- **Compaction:**
  - `session_summary`, with the shape in schema.ts. `start` carries `viewport_h` (TEL-AC11 last bullet).
  - The ≤ 200 KB pinned cap: oldest non-current sessions first. The current session is never compacted, and a summary is ≤ 1 KB.
- **Budget valve:** `ringEff`, with `telemetry_budget_shrunk {ringEff}` at most once per session.
- **Quota rule (v0.6.1):** telemetry yields first. Saves owns the `quota_headroom` call site in save code; you own the telemetry side (`shrinkForQuota()` returning the freed bytes). Agree the interface with Saves before building it.
- **Files:** src/telemetry/telemetry.ts.

### 5. v5 events from errata V-2 that Saves doesn't keep (TEL-AC4, 5, 8, 9, 11, 14, 15)
| # | Event | Pinned | Flag | Notes / file |
|---|---|---|---|---|
| 1 | `sales_stall` (shown/resolved pairs) | yes | salesStopped | `stall_id`/`prev_stall_id` are an int counter ≥ 1 per session, never saved. Exactly one resolved per shown. Resolved-only fields appear only on resolved. Sales-stopped v1.3.27 §8. UI stall-chip code + game.ts |
| 2–3 | `fatigue_cue_shown`, `fatigue_cue_tapped` | yes | fatigueCue | One shown per episode; one tapped per chip tap, the closing tap included (V-2c). Both carry `surface, loss_per_s, loss_share, n_tired, n_asleep, n_paused`, sampled at each event's own moment (tapped: at the tap), per rev. 13 #3 / D-PMM-2026-10-30-TAPFIELDS. `suppressed_by_stall` goes on shown **only**; the schema rejects it on tapped. `loss_per_s` = Math.round(fatigueLoss × 100). `loss_share` to 3 dp. n_* sum ≤ 4 |
| 7 | `first_worker_hired` | yes | rc2Refill | `t_since_unlock_s` only for an unlock in this session (no save field). `farm_level` ≥ 1. `via_nudge` is always false |
| 8 | `autorefill_toggled` | yes | autoRefill + rc2Refill | |
| 9 | `abilities_unlocked` | yes | abilities | Once per save |
| 10 | `ability_used` | yes | abilities | Add `combo` (bool, every emit; true only for the 45 s refill→Boost combo, `in_sheet:true` only). `t_since_ready_s` is int wall-clock seconds ≥ 0. The SimEvent today (src/sim/events.ts:39) lacks `combo`. The combo code merges in or after Econ's CSV PR (D-HOE-32) |
| 11 | `ability_blocked` | yes | abilities | Coalescing exists in the sim. Saves owns the 50 cap/marker |
| 12 | `ability_ended` | yes | abilities | |
| 13 | `worker_resumed` (+ `worker_paused` toggle fields) | yes | pause = 1 and rc2Refill = 0 only | TEL-AC14: exactly one family per build |
| 14 | `tip_shown{id:"clock_wage"}` | yes (by predicate) | clockWage | Once per save |
| 19–23 | `best_buy_shown`, `best_buy_followed`, `zero_gain_purchase` (with Saves' cap), `dead_zone`, `best_buy_suppressed_zero_gain` | 21 and 22 pinned, the rest ring | bestBuyV2 (#23: m4.enabled) | Errata rev. 10 rows. The thresholds are read from `balance.telemetry.bbv2.{shown_min_gap_s, zero_gain_eta_max_s, dead_zone_min_s, zero_gain_purchase_cap}`, never constants (D-HOE-31/-32). `dead_zone` (V-2d): `farm` is 10–29, `reason` is `none_affordable` only, and it emits once at stretch end. Unload/background flushes it with `open:true`, and only if `s` ≥ 30. `zero_gain_purchase` stops at the cap, with no marker. `meaningful_eta_s` is non-null. BB-AC16 |
- **Collectible/frenzy field deltas (V-2b):**
  - Game adds `collectible_id` (a per-session counter shared by golden and Broody) and `layout`.
  - Broody also gets `slot_id` Y0–Y11 and `restored`.
  - `frenzy_*` carry `collectible_id`.
  - `boost_active` and `rerolled_from` are removed.
- **Never emit:** `boost_used`, `manage_used`, `refill`, `first_hire_nudge_*` (TEL-AC10/11/15).

## ACs you'd own (card #T)
- TEL-AC2, TEL-AC3 (data part), TEL-AC4, TEL-AC5, TEL-AC8 (all except the Saves-kept fields), TEL-AC9 (firing rules for your events), TEL-AC10 (per-feature flag-off for your events and fields), TEL-AC12, TEL-AC14, TEL-AC15.
- T-AC3, T-AC10, T-AC14, T-AC15, the multi-session budget test, and BB-AC16 (events registered and unit-tested).
- **TEL-AC11 export:** shared. Saves runs the schema/isPinned part; the export fixture in 3 engines runs after both halves land.

## Working rules
- Use worktrees and small PRs from rc/v5. Tests are tagged with AC ids, and each PR body has a trace table (QA-D-1029-V5SCAP).
- Run targeted vitest only, using flock + nice with maxWorkers=1, and only at load ≤ 11.
- The rest of what you need is in schema.ts: each event's spec there is the definition of done.
