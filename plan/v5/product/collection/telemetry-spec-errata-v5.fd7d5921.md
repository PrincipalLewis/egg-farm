# Collection telemetry v0.6.2: errata v5 (v5 allowlist, pinned set, schema version, viewport_h, key names) · rev. 7 · 2026-10-30 13:56 CET · PM, Collection
*(rev. 1 13:16, frozen `telemetry-spec-errata-v5.107653d7.md`; rev. 2 13:21 (mtime), frozen `telemetry-spec-errata-v5.6a10a918.md`; rev. 3 13:29, frozen `telemetry-spec-errata-v5.ee707672.md`; rev. 4 13:39, frozen `telemetry-spec-errata-v5.9e02ac3a.md`; rev. 5 13:45, frozen `telemetry-spec-errata-v5.cea3d717.md`; rev. 6 13:47, frozen `telemetry-spec-errata-v5.83424120.md`)*

> **Ruled: D-HOP-2026-10-30-33 (13:22, option (a)):** "The telemetry-spec v0.6.2 pin d170eb09 stays, and D-HOP-2026-10-29-07 stands. PMC writes product/collection/telemetry-spec-errata-v5.md (ZG v0.3.8 pattern) … HoQA reviews and HoE pins it in the manifest." Rev. 4 applies **D-HOP-2026-10-30-41** (13:34) and its **13:36 amendment** (`product/decisions.md` L1880–1881), **D-HOE-20261030-19/-20/-21** (`engineering/decisions.md`), and HoQA's rev. 3 review (`qa/m5/review-telemetry-errata-v5-rev3.md` sha1 `cb19ab84…`, QA-D-1030-TELERR2). Paper only. Rev. 5 adds **D-HOE-20261030-23** (13:40, `engineering/decisions.md` L433–437, sha1 `260ea9cc…`). Rev. 6 adds **D-HOP-2026-10-30-42** (13:43, `product/decisions.md` L1944). Rev. 7 applies HoQA's rev. 6 review (QA-D-1030-TELERR3, `qa/m5/review-telemetry-errata-v5-rev6.md` sha256 `a5ddb717…`) via **D-HOE-20261030-24/-25** (13:48/13:52, `engineering/decisions.md` sha1 `e0a359a8…`). Recorded as D-COL-2026-10-30-12 (rev. 1), -13 (rev. 2), -14 (rev. 3), -15 (rev. 4), -19 (rev. 5), -20 (rev. 6), **-21 (rev. 7)**.
>
> **Status: HoQA re-review pending. In force once HoQA passes it; then HoE pins it in `engineering/v5-rc-manifest.md`** (D-HOE-19: rev. 2 and rev. 3 are not pinned).
>
> **Ship-set of record:** `product/v5-ship-set.md` L23 (D-HOP-41 (1), amends -40): "telemetry v0.6.2 (telemetry-spec.md d170eb09) + telemetry-spec-errata-v5.md (sha of record at gate): no flag, ships always-on, TELEMETRY_SCHEMA_VERSION "0.6.2" per D-HOE-20261030-19 (pre-0.6.2 rings marked legacy:true), gated by the #T card and save-migration tests (D-HOP-2026-10-30-41)". sha256 `56090a61cf28d70632b52f09bd86f48b968a978dcc6bb554d3407151d5048de1` (sha1 `646ec202…`).

- **Target spec:** `product/collection/telemetry-spec.md` v0.6.2, sha1 `d170eb09ae6bf056151c16ee248e017c2808c35a` (**not edited; pin unchanged; D-HOP-2026-10-29-07 stands**).
- **Why a separate errata file:** D-HOP-2026-10-29-07 (no edit before the RC). ZG errata v0.3.8 pattern. The first post-v5 telemetry-spec revision absorbs this errata.
- **Source rule:** every event, field, type and pin status is copied from a file on disk or a cited, verified ruling. Types not stated by any source stay *proposed* with an owner (V-8).

## Sources (sha1 on disk 13:37 CET; "handed off" = sha stated by the owner in a decision)
| Spec | Version | sha1 | Sections cited |
|---|---|---|---|
| `product/market/sales-stopped-spec.md` | **v1.3.24** (PM Market 13:37; supersedes v1.3.23 `2bafd9b3`/`15b36fe7`) | `b95d5cf8568d772ca66ee450516bef79bafcb578` | §4 L173–174 (SS-G35/36), §8 L248–297, L323, SS-48 L485, SS-49 L486 |
| `product/workers/m4.2-fatigue-visibility-spec.md` | v0.2 | `b88083db64abe1a7819d85fffb605c34488d59a6` | L47–50 |
| `product/workers/rc2-refill-proposal.md` | v1.3.7 as read 13:37 (**not handed off**, G-2; live has since moved to v1.3.8 `acfb03e3…` 13:38). HoQA-cited v1.3.6 `2e477a03` is frozen at `product/scratch/rc2-refill-proposal.v1.3.6-2e477a03.md` | `1dec31061d290a00d1f980b114765a0579fd1934` | L173–174, L205–222, L239 |
| `product/workers/rc2-first-hire-nudge.md` | v0.1.1 ("Not in v5") | `2786a08fc38730b37c2a2401fffcb2ce779429bf` | L2, §4 L16, L33 |
| `product/workers/m5.1-lighter-refill-proposal.md` | v0.8.10 | `f71e45161c14382772e8f76f543452164c51b3b1` | §6 L61–64 |
| `product/workers/m5.1-worker-failure-cost-proposal.md` | v0.3.21 live (HoQA-cited v0.3.20 `2f830cb0`, scratch copy) | `f961a73403726f7bcf6c81c2ed13913f0de260d7` | AC-FC15 L138, §6 L165–170 |
| `product/workers/m5-worker-pause-spec.md` | v1.3.13 live (13:34; **not handed off**, G-2) | `7dcb01bef1232912f3242848ae92ddc3f7d954a5` | §12 L290–298 |
| `product/workers/m5-worker-abilities-spec.md` | **v1.3.6 handed off** (D-PMW-2026-10-30-13; accepted D-HOP-39). Line numbers are from the handed-off copy (`scratch/m5-worker-abilities-spec.md.v1.3.6-pre-hoe.8797f5ff.bak`). The live file has since moved (`60ed26a0` 13:37, `314dc0e3` 13:40), adding the HoE 13:32 worker-id line to §9; §9 events unchanged | `8797f5ff5791dc349d8099d3f5c8fce38ef0c7c8` | §3 L97–100, §9 L420–427 |
| `product/m5.1-breeds-spec.md` | rev. 3.8.8 | `254acea385a64ad6fc1ba14a1d37dc15df1a1151` | §8 L687–698, E12 L567, L341 |
| `product/collection/m5-golden-egg-spec.md` | v1.3.2.2 | `910098bdc4b4a7906078c06510e06ac95757ee43` | §8 L314–324 |
| `product/collection/m5-broody-hen-spec.md` | v1.3.2 | `f180c3ff2535088e7d748fff4947fe9de56e70ee` | §8 L246–254 |
| `product/collection/m5-streak-tap-coins-spec.md` | v1.3.2 | `acb4cdbba293db639a409d1c197589b97b1a5c4e` | §8 L283–291, §8.1 L298 |
| `product/collection/m5.1-zero-gain-purchase-ui.md` + errata v0.3.8 | v0.3.7 | `f86de04e0638e3019f81b1e829321c65ff8f4f98` | §11; E-1/E-2 |
| `engineering/decisions.md` | live (HoQA-cited `58169952` not on disk as a file; superseded) | `e0a359a878730c6e975055a49babcbec18d741d2` (rev. 4 read `2125a36a`, rev. 5–6 `260ea9cc`) | H-1 L137, FC-G11 L144, D-HOE-18 L376–390 (fatigue_chip L390), D-HOE-19, D-HOE-20 (L407 ff.), D-HOE-21, D-HOE-23 (L433–437), **D-HOE-24 (L439), D-HOE-25 (L443 ff.)** |
| `engineering/v5-rc-manifest.md` | — | `5a4857669d8daab6bd298eb39adf35ab3348ab46` | rows 11, 24 ("v5, in build") |
| `product/m5-gate-acs.md` card #T | — | `c45de36a…` at 13:37 (moves with other cards) | TEL-AC1–15 |
| code (read-only) | `wt-v5-x1ci` 05d68b1 | — | `src/sim/workers.ts:4`, `src/telemetry/telemetry.ts:12–14`, `src/config/balance.json`; `game.ts:255` (save_migrated shape) |

## V-0 Schema version and stored-ring rule (F-6 / C-1: D-HOP-41 (1), D-HOE-19)
- `src/telemetry/schema.ts` exports **`TELEMETRY_SCHEMA_VERSION = '0.6.2'`** (D-HOE-19; contract in D-HOE-20: `EVENT_SCHEMA`, `EVENT_TYPES`, `validateEvent(e)`, `isPinned(e)`, FieldSpec kinds enum/int/count/bucket/bool, no free text).
- The stored ring is **`{v, events}`**; the **export header carries `schema_version`**.
- A stored ring with **no `v`** (pre-0.6.2) keeps its events, each tagged **`legacy:true`** on load. **T-AC9 validates non-legacy events only.** The telemetry key is separate from the save, so there is no save migration (SAVE_VERSION stays 6, D-HOE-19).
- **Owner: Saves (manifest row 11)**, incl. the event-based `isPinned(e: TEvent)` (F-10/R-6) in the schema.ts PR.
- Supersedes rev. 3's "no separate schema version" (D-HOP-40 as amended by D-HOP-41 (1)).

## V-1 Header (L2) and §3 L37/L43
- **L2, replace** "queued for Engineering after M4-A and SQ-1." **with:** "**v5: ships always-on (no flag) in the single v5 RC, `TELEMETRY_SCHEMA_VERSION` '0.6.2', gated by card #T and save-migration tests (D-CEO-20261030-09/-10; v5-ship-set L23, D-HOP-2026-10-30-41). v5 additions: `telemetry-spec-errata-v5.md` (D-HOP-2026-10-30-33).**"
- L43 and L223 are superseded by V-2. L37 (`collectible_*` "per that spec" = m4-timed-collectible): for v5, fields per golden §8 and broody §8 (V-2b).

## V-2 §3.1 allowlist additions (18 new event types)
Envelope `type, ts, sid, fgMs` (L20). **Null rule:** `?` = **absent** when not applicable (never null); `|null` = present with `null`; everything else always present, never null. No free text (§7).

**Worker ids on the wire (G-10, closed by D-HOE-19):** every worker field (`refill_used.worker`/`best_worker`/`lowest_worker`, `rest_toggled.worker`, `worker_paused`/`worker_resumed.worker`, `first_worker_hired.worker`, `autorefill_toggled.worker`, `ability_*.worker`, `abilities_unlocked.hired[]`, the `<worker>` key in `worker_summary.wage_<worker>_asleep_cents`) is the **code id `market_hand|coop_hand|hawker|grader`** (`src/sim/workers.ts:4`). **W1–W4 is spec shorthand only** (W1 Market Hand … W4 Grader, abilities §3 L97–100). PMW has aligned rc2 v1.3.7 L213/L217, pause v1.3.13 L294 and the abilities §9 worker-id line (live, HoE 13:32).

**Type sign-off status:** **PM Market** signed off #1–3 (sales-stopped v1.3.24 §8 L286–297). **PMC** signs off the Collection-owned types (#15–18, V-2b collectible/frenzy/golden/broody/streak/breeds rows). Types still *proposed* need **PMW** sign-off (#7, #10) — V-8 G-13.

| # | Event | Fields | Type / range / null | Source | Flag | Pin |
|---|---|---|---|---|---|---|
| 1 | `sales_stall` | `phase, stall_id, prev_stall_id?, cause, farm_level, queue_len, sellable_eggs, coop_eggs, mh_state, ch_state, focus_s_since_last_sale, session_s`; resolved adds `resolved_by, time_to_resolve_s, chip_tapped` | **Signed off (PM Market, v1.3.24 L292–297):** `phase` shown\|resolved; `cause` mh_asleep\|mh_paused\|mh_unpaid\|no_mh\|ch_asleep\|ch_unpaid\|other; `mh_state`/`ch_state` working\|tired\|asleep\|unpaid\|paused\|none; `resolved_by` enum per L249; `stall_id`/`prev_stall_id` int ≥ 1, per-session monotonic counter; `farm_level`, `queue_len` int ≥ 0; `sellable_eggs`, `coop_eggs` int ≥ 0 (`Math.floor` of the sim's fractional basket/coop); `focus_s_since_last_sale`, `session_s`, `time_to_resolve_s` float s ≥ 0, 1 dp (focus clock); `chip_tapped` bool; no nulls, optional fields omitted | sales-stopped v1.3.24 §8 L248–252, L292–297 | salesStopped | **pinned** (§8 heading) |
| 2 | `fatigue_cue_shown` | `surface, loss_per_s, loss_share, n_tired, n_asleep, n_paused, suppressed_by_stall` | **Signed off (PM Market, v1.3.24 L287–291):** `surface` hud_chip\|banner\|bubble; `loss_per_s` int cents/s ≥ 0 = `Math.round(dollars × 100)`; `loss_share` float [0, 1], 3 dp; `n_tired`/`n_asleep`/`n_paused` int 0–4, sum ≤ 4; `suppressed_by_stall` bool (this event only) | v1.3.24 §8 L280–291 | fatigueCue | **pinned** |
| 3 | `fatigue_cue_tapped` | `surface, loss_per_s` | as #2 | v1.3.24 §8 L281, SS-48 L485 | fatigueCue | **pinned** |
| 4 | `shift_sheet_opened` | `entry, sheet_id, stall_id?` | `entry` nav\|card\|stall_chip\|**fatigue_chip** (approved, D-HOE-20261030-18 13:21 addendum, eng. L390; restated D-HOE-19); `sheet_id` per-session monotonic int counter; `stall_id` int ≥ 1 (per-session monotonic counter, D-HOE-24), present iff `entry` = stall_chip (never with `fatigue_chip`) | rc2 v1.3.7 L205; SS v1.3.24 L174 | rc2Refill | **pinned** (rc2 L174) |
| 5 | `refill_used` | `worker, energy_pct, charges_left, rank_by_risk, by, sheet_id\|null, entry_point, stall_id?, refillable_n, best_worker, lowest_worker` | per D-HOE-18/-19: worker fields code ids; `energy_pct` int 0–100; `charges_left`, `rank_by_risk`, `refillable_n` counts; `by` manual\|auto; `entry_point` nav\|card\|stall_chip\|**fatigue_chip**\|auto; `sheet_id` int counter, null only for `by:auto` outside a sheet | rc2 v1.3.7 L206, L213; lighter §6 L62 | rc2Refill (auto: autoRefill) | **pinned** |
| 6 | `rest_toggled` | `worker, on, energy_pct, state, cause, sheet_id\|null, entry_point, stall_id?`; **`on:true`** + `farm, mood, unpaid, ability_active, golden_on_screen, frenzy_active`; **`on:false`** + `paused_duration_s` | per D-HOE-18/-19: `on`, `unpaid`, `ability_active`, `golden_on_screen`, `frenzy_active` bool; `energy_pct` int 0–100; `state`, `mood` enums; `cause` manual\|auto_full\|manage; `entry_point` nav\|card\|stall_chip\|**fatigue_chip**\|auto; `farm`, `paused_duration_s` counts; `sheet_id` null for `auto_full` outside a sheet. `golden_on_screen`/`frenzy_active` sampled from the pre-pause state (HoE H-1, eng. L137) | rc2 v1.3.7 L215–219; pause v1.3.13 §12; D-HOE-19 G-3 | rc2Refill | **pinned** |
| 7 | `first_worker_hired` | `worker, farm_level, t_since_unlock_s?, via_nudge` | `via_nudge` bool, **always false in v5** (D-HOP-36); **`t_since_unlock_s` sent only when the unlock happened in the current session, absent otherwise; no save field** (D-HOE-20261030-20 G-10, eng. L407). **Signed off (PMW; D-HOE-20261030-23 L436):** `t_since_unlock_s` is int sim-seconds, min 0 (whole sim seconds, floored), emitted only for an unlock in the current session; `farm_level` is int, min 1 (at the time of hire) | nudge §4 L16; rc2 L174 | rc2Refill; not emitted at 0 | **pinned** |
| 8 | `autorefill_toggled` | `worker, on, farm_level` | `on` bool; `worker` code id; `farm_level` int ≥ 0 | lighter §6 L63 | autoRefill (+ rc2Refill) | **pinned** (HoQA G-6) |
| 9 | `abilities_unlocked` | `farm, hired` | `hired` array of code ids; `farm` int. Once per save | abilities §9 L422 | abilities | **pinned** |
| 10 | `ability_used` | `worker, farm, energy_pct, mood, via_all, t_since_ready_s, in_sheet, combo` | `via_all`, `in_sheet` bool (every emit); `energy_pct` int 0–100; `mood` enum. **Signed off (PMW; D-HOE-20261030-23 L436):** `ability_used.t_since_ready_s` is int wall-clock seconds, min 0 (whole seconds from `readyAt` (epoch ms) to the tap, floored, clamped ≥ 0). No free text. **`combo` bool, always present when abilities = 1 (D-HOP-2026-10-30-42, L1944; D-HOE-25 N-8):** true only when this Boost got the 45 s combo duration. Only `refill_used{by:"manual"}` opens the 10 s window (sim ms, inclusive: ≤ 10000 ms is in); `by:"auto"` never does. Only a Shift-sheet Boost (`in_sheet:true`) qualifies; a card-button call (`in_sheet:false`) stays 30 s and is always `combo:false`. `refill_used.by` and `ability_used.in_sheet` ride pinned events (#5, #10) and are required on every emit, for HoQA's negative cases. The optional window-remaining value ("if cheap") is **not added** unless PMW/HoE spec it. Covers the Boost slot and refill→Boost combo (D-HOP-35, D-HOP-39; no new event) | abilities §9 L423 | abilities | **pinned** |
| 11 | `ability_blocked` | `worker, reason, count`; capped marker per V-3 | `reason` cooldown\|asleep\|unpaid\|paused\|lockout; `count` int ≥ 1 (taps coalesced into this event); ≤ 1 per worker per reason per `m4.telemetry.ability_blocked_window_s` (1.0 s sim) | abilities §9 L424 | abilities | **pinned, capped 50** (D-HOE-19 G-1) |
| 12 | `ability_ended` | `worker, cause, effect_s` | `cause` expired\|paused\|offline\|asleep\|unpaid (final); `effect_s` focus s, ±0.1 | abilities §9 L425–426 | abilities | **pinned** (HoQA G-6) |
| 13 | `worker_resumed` | `worker, farm, energy_pct, paused_duration_s, cause` | `cause` manage\|manual\|auto_full (`auto_full` never emitted with rc2Refill = 0) | pause v1.3.13 §12 | pause = 1 **and** rc2Refill = 0 only | **pinned** |
| 14 | `tip_shown` | `id` | `id` enum `"clock_wage"` only; once per save | failure-cost §6 L169; FC-G11 | clockWage | **pinned** |
| 15 | `hatch_started` | `breed_id, rarity, cost, coinsBefore, pity_before, free, farm_level` | **PMC signs off:** `breed_id` enum of breed ids (§8; unknown ids never emitted, E10); `rarity` enum of the 4 tiers (weights 70/22/7/1); `cost`, `coinsBefore` int cents ≥ 0 (`cost` 0 when `free`); `pity_before` int ≥ 0; `free` bool; `farm_level` int ≥ 0; never `track`/`cost_cents`. Enum value strings are listed in breeds next rev | breeds §8 L692 | breeds | **pinned** |
| 16 | `breed_revealed` | `breed_id, rarity, dupe, stars_after, offline, wait_ms` | **PMC:** `dupe`, `offline` bool; `wait_ms` int sim ms ≥ 0; `stars_after` int in [0, `bc_star_cap`=2] | breeds §8 L693 | breeds | **ring** |
| 17 | `breed_slotted` | `slot, prev_slot\|null, breed_id\|null, prev_breed_id\|null, cause, loadout, settling, count` | **PMC:** `slot` int 0–2; `prev_slot` int 0–2 \| null; `cause` manual\|auto_reveal\|move; `loadout` string `^P\dA\dB\d$` (e.g. `"P2A1B0"`, no spaces); `settling` int 0–3; `count` int ≥ 1 | breeds §8 L694 | breeds | **ring** |
| 18 | `flock_complete` | `hatches, farm_level, elapsed_since_unlock_s, backfilled` | **PMC:** `hatches` int ≥ 1 (24 at a full flock); `farm_level` int ≥ 0; `elapsed_since_unlock_s` int ≥ 0 = floor(`sinceUnlockMs`/1000); `backfilled` bool. Once per save | breeds §8 L695 | breeds | **pinned** |

**Not added (explicit):** `first_hire_nudge_shown`, `first_hire_nudge_dismissed` (not in v5, off the allowlist; D-HOP-36). `boost_used` (retired). **`manage_used`: no alias of any kind (G-4/C-3, D-HOP-41 (2), D-HOE-19). The schema is closed; wire and export carry `refill_used` only.** Card #T TEL-AC6 and rc2 card RF-AC10 are renamed to `refill_used` (name-only, HoP signs). `refill` (renamed). `wage` stays "not an event" (L54).

**Already allowlisted:** `worker_paused` (fires only with rc2Refill = 0; v1.3.13 adds `golden_on_screen`, `frenzy_active` per H-1 — already in base L36); `collectible_*`, `frenzy_*`, `streak_*` (ring; fields V-2b); `zero_gain_confirm` (never fires in v5).

### V-2b M5 field deltas on existing events (PMC signs off the Collection-owned types)
| Event | Fields | Type / range / null | Source |
|---|---|---|---|
| `collectible_spawned` | `collectible_id, skin, farm_level, collection_level, slot_id, layout, interval_s, deferred_ms`; broody `restored` | `collectible_id` int ≥ 1, per-session counter shared golden + broody; `skin` golden_egg\|broody_hen; `slot_id` S1–S8 (golden) \| Y0–Y11 (broody), never null; `layout` phone-360\|phone-375\|docked\|docked-compact; `interval_s` int focus s (0 when `restored:true`); `deferred_ms` int focus ms ≥ 0; `restored` bool (broody only) | golden §8 L319; broody §8 L249 |
| `collectible_collected` | `collectible_id, skin, reaction_ms, in_warning, reward_type, reward_value, reward_duration_s, farm_level`; broody `nest_fill_share` | `reaction_ms` int focus ms; `in_warning` bool (false for broody); `reward_type` cash\|frenzy\|eggs\|eggs_cash\|broody_cash; `reward_value` int (cents, eggs, or 2); `reward_duration_s` 30\|0; `nest_fill_share` float ≥ 0, may be > 1 (broody only) | golden L320; broody L250 |
| `collectible_expired` | `collectible_id, skin, reason, farm_level` | `reason` timeout\|offline\|reload\|takeover\|reset (broody: reset only) | golden L321; broody L251 |
| `frenzy_started` | `collectible_id, mult, duration_s, farm_level, grader_tier` | `mult` number; `duration_s` int; `grader_tier` int ≥ 0 | golden L322 |
| `frenzy_ended` | `collectible_id, extra_coins, eggs_sold, sold_by_player, sold_by_workers, reason` | `extra_coins` int cents; `eggs_sold`, `sold_by_*` int ≥ 0; `reason` timeout\|reset (`hidden_end`, `offline` removed) | golden L323 |
| removed vs v0.5 | `boost_active`, `rerolled_from` | not in the schema | golden L315 |
| `session_end` | golden `golden_spawned, golden_collected` (int ≥ 0), `golden_cents` (int cents = cash + eggs_cash), `frenzy_extra_cents` (int cents); broody `broody_cents` (int cents), `broody_collects` (int ≥ 0); streak `credited_taps` (int), `tap_bonus_cents`, `streak_extra_cents` (int cents) + §8.1; breeds L698 fields + `present_active_s` (0.1 s) / `present_lost_count` (int); abilities `ability_uses`, `calls_ready_unused_s`, **`ability_blocked_taps` (int ≥ 0, all blocked taps incl. post-cap; D-HOE-23 (b))**; failure-cost `wage_paid_asleep_cents` (int cents), `asleep_s` (0.1 s); lighter `refills_manual`, `refills_auto` (int), `charge_starved_s` (0.1 s); rc2 `shortage_s` (int s); Pause `paused_worker_s`, `all_paused_s` per V-6. Flag-gated fields absent with their flag off | golden L324; broody L252; streak L291, L298; breeds L698, base L28; abilities L427; FC L167–168; lighter L64; rc2 L209 area (`shortage_s`, D-HOE-18 13:16 addendum) |
| `worker_summary` | `wage_<worker>_asleep_cents` | int cents; clockWage = 1 only; `<worker>` = code id | FC-G11 eng. L144; AC-FC15 L138 |
| `tap` | `credited, empty_credited` (int ≥ 0), `bonus_cents` (int cents) | | streak §8 L288 |
| `streak_peak` | `max_tier` | int 0–4 | streak §8 L290 |
| `offline_grant` | `away_bp` | int ≥ 0 (0 if none) | breeds §8 L697 |
| `upgrade` | `zero_gain` | bool; key per V-5 | L30 |
| `save_migrated` (breeds) | `migration:"breeds_sanitise"`, `from:6`, `to:6` **+ `refund_cents`, `farm_level`, `backup_stores`** (the `game.ts:255` shape: `refund_cents` int cents, `farm_level` int, `backup_stores` array of store ids; **for `breeds_sanitise` always `[]`, since sanitising writes no backup** (D-HOE-25 OQ-13; `['ls']` at `game.ts:255` is the tracks migration)) **+ `reason`, always present on `breeds_sanitise`, enum `'invalid_root'` \| `'invalid_values'`** (D-HOE-25 N-5): `'invalid_root'` = a null/non-object `breeds` root (treated as absent, re-created on the first flag-on tick; a silent recreate isn't allowed); `'invalid_values'` = any E12 / D-COL-16/-17/-18 field sanitise (stars clamp, slot nulling, unknown incubator dropped and `costCents` refunded, `remainingMs`/`sinceUnlockMs`/counter repairs, invalid `freeHatchUsed` → 1). One event per load; `invalid_root` takes priority. v-bump `save_migrated` events carry **no** `reason` key. **APPROVED, D-HOE-20261030-21 + -25** (OQ-7, OQ-3, OQ-13, N-5; owner Saves, #95 follow-up PR). Supersedes breeds §8 L696 "no `reason` key"; breeds next rev follows (PMC) | D-HOE-21; `game.ts:255` (`wt-v5-x1ci`) |

`wage.state` is a SimEvent field, never exported (AC-FC15, sim-stream test). Card #T (PM Market): TEL-AC8/AC10 re-point to `worker_summary.wage_<worker>_asleep_cents`.

### V-2c Fatigue-cue logging (F-4 / G-12, closed)
Source: sales-stopped **v1.3.24 `b95d5cf8`** §8 L281–285, SS-47 (G35, §4 L173), SS-48 (G36 L174, G37 L485), SS-49 L486, join L323.
- **`fatigue_cue_shown`:** **once per cue episode**, when the cue becomes eligible; `suppressed_by_stall` = whether the stall chip is up at that moment (cue hidden). **No shown/resolved pair**, no resolved event (L282).
- **Episode end:** when the cue condition clears under the Rule 2 hysteresis: share < `tc_fatigue_cue_clear_share` 0.12 held `tc_fatigue_cue_clear_hold_s` 2 s (L283).
- **Mid-episode stall chip:** the popover (if open) closes, focus moves to the stall chip, **nothing is logged**, the episode continues, and `fatigue_cue_shown` is **not re-fired** when the stall clears and the cue reappears (L284, SS-47).
- **`fatigue_cue_tapped` (G37):** **every chip tap logs exactly one `fatigue_cue_tapped`, including the tap that closes the popover** (open + close = 2 events; the ≥ 740 sub-line tap = 1). Esc, outside tap, resize and cue resolution close the popover with no event. Popover open/close emits nothing else (L281, L285, SS-48 L485). *(Replaces rev. 3's "one per chip tap that opens the popover".)*
- **Manage** in the popover logs **only** `shift_sheet_opened{entry:"fatigue_chip"}` (no second `fatigue_cue_tapped`); it opens on the costliest at-risk worker (L174). **`fatigue_chip` is approved** (D-HOE-20261030-18 13:21 addendum, eng. L390): valid at any height, no `stall_id`, `sheet_id` as usual. Fatigue-cue conversion: `shift_sheet_opened{entry:fatigue_chip, sheet_id:K}` → ≥ 1 `refill_used{by:manual, sheet_id:K}` (L323). TEL-AC7's stall join excludes `fatigue_chip` sheets.

## V-3 §3.2 pinned set
`isPinned(e: TEvent)` (event-based, base L60; **owner Saves**, schema.ts PR, D-HOE-19 F-10) adds:
```
sales_stall, fatigue_cue_shown, fatigue_cue_tapped,
shift_sheet_opened, refill_used, rest_toggled, first_worker_hired, autorefill_toggled,
abilities_unlocked, ability_used, ability_ended, ability_blocked,
worker_paused, worker_resumed,
hatch_started, flock_complete,
milestone_reached, balanced_tier
|| (e.type === "tip_shown" && e.id === "clock_wage")
```
- **16 of the 18 new types pinned, 2 ring** (`breed_revealed`, `breed_slotted`); + `worker_paused`, `milestone_reached`, `balanced_tier` = **19 additions** to `isPinned`.
- **`ability_blocked` cap (APPROVED, D-HOE-20261030-19 G-1):** at most **50 `ability_blocked` events per session, counted after coalescing**; then **one** capped marker, and no further `ability_blocked` that session; the counter resets on session rotation. The 200 KB pinned cap stays.
  - **Marker shape, mirroring the `coop_full` cap (base L57 `{type:"coop_full", ts, sid, fgMs, capped:true, episodes:100}`, L94, T-AC10):** `{type:"ability_blocked", ts, sid, fgMs, capped:true, events:50}` — **no `worker`, `reason` or `count`**. **D-HOE-20261030-23 (a) (L434):** "The ability_blocked cap marker keeps the key `events` (count of discrete blocked taps). coop_full keeps `episodes`. Each event family has its own key, and the schema tests check each one separately." **`events` is always 50 (the number of `ability_blocked` events emitted before the marker), not a tap count; taps are counted in `session_end.ability_blocked_taps`.**
  - **Post-cap totals:** the 50 emitted events keep their own `count`. **D-HOE-20261030-23 (b) (L435):** "Added: session_end.ability_blocked_taps, an int count, min 0, covering every blocked tap in the session, including the ones after the 50 cap. No free text." `session_end` gains `ability_blocked_taps` (int ≥ 0; flag: abilities; follows `session_end` pin status). Owner: Saves, in `schema.ts` (L437: likely Fri 21:00 / high Sat 03:00).
  - `session_summary.counts.ability_blocked` counts the raw pinned events incl. the marker, as `counts` does for `coop_full` end/capped (base L79).
- **Sizing (G-1, D-HOE-19):** **Saves** sizes `session_summary` and the pinned budget for the 19 new pinned entries with a worst-case-session test in schema.ts; if it exceeds 200 KB it goes back to HoE (no silent raise).
- `worker_manage` / `worker_manage_all` stay for flags-0 / rc2Refill = 0 configs.
- **Card #T TEL-AC11 delta (PM Market):** add `fatigue_cue_*`, `autorefill_toggled`, `ability_ended`, `ability_blocked` (+ marker), `milestone_reached`, `balanced_tier`; TEL-AC10 adds `first_worker_hired` under rc2Refill = 0.

## V-4 session_start.viewport_h (L27, L77, T-AC1 L143)
**Ruled:** D-HOP-2026-10-30-28 (1) (`product/decisions.md` L1723). **HoE approval of record:** D-HOE-20261030-18 (eng. L376; approved 13:03 to PM Market).
- **L27:** after `viewport_w` add **`viewport_h`** = `window.innerHeight` (CSS px) at `session_start`, bucket only. **Exact ASCII wire strings `'<740'`, `'740-899'`, `'>=900'`.** `viewport_w` keeps its existing literals (`<375` / `375–767` / `≥768`).
- **Never null or absent** (headless / innerHeight 0 → `'<740'`); emitted in every flag config incl. flags-0.
- **Not re-sent on resize; rotation/`orientationchange` is a resize.** A `session_start{reason:"resume"}` after a ≥ 60 s hide **re-samples**.
- **Boundary:** 739 → `'<740'`; 740 → `'740-899'`; 899 → `'740-899'`; 900 → `'>=900'` (single constant shared with the sales-stopped §4.8 breakpoint).
- **L77 `session_summary.start`:** `has_coop_hand, viewport_w, viewport_h, reduced_motion, prev_hidden_ms?`. **T-AC1:** add "`viewport_h` bucket".

## V-5 Zero-gain key names (L30, L41, L243)
`m5.flags.zeroGainUi` → **`m4.flags.zeroGainUi`** (ship 1); `m5.zeroGain.confirm` → **`m4.zeroGain.confirm`**, 0/1 number (ship 0). ZG errata v0.3.8 E-1/E-2 (D-HOP-2026-10-30-14), ship-set L15/L20; `balance.json` in `wt-v5-x1ci`/`wt-m41-p2` has exactly these keys.

## V-6 Rest/Pause (Pause = 1, rc2Refill = 1 in v5) — G-3 FINAL
- **Exclusive emission:** with rc2Refill = 1 only `rest_toggled` (pause → `on:true`, resume → `on:false`); with rc2Refill = 0 and pause = 1 only `worker_paused`/`worker_resumed`. One toggle → one pinned event; **no double count in v5**.
- **Toggle-time fields:** with rc2Refill = 1, `golden_on_screen`, `frenzy_active`, `farm`, `mood`, `unpaid`, `ability_active` ride `rest_toggled{on:true}` (D-HOE-19 G-3; HoE H-1 eng. L137); with rc2Refill = 0 they stay on `worker_paused`.
- **`session_end.paused_worker_s` / `all_paused_s`: emitted only when rc2Refill = 0. With rc2Refill = 1 they are absent, and paused time is derived from `rest_toggled` `on:true` → `on:false` pairs (`paused_duration_s`).** (D-HOP-2026-10-30-41 (3) as reversed by its 13:36 amendment, metric owner PMW accepting D-HOE-20261030-19; pause v1.3.13 L297; card #T TEL-AC8.)

## V-7 D-HOP-2026-10-29-07 text fix (L52, L257)
"ring-trimmed, not pinned" for `milestone_reached` / `balanced_tier` reads **"pinned"** (`product/decisions.md` L1351). Code already pins both (`telemetry.ts:14`).

## V-8 Open items
| Id | Item | Owner | Due |
|---|---|---|---|
| G-2 | sha handoff for rc2 (read v1.3.7 `1dec3106`; live v1.3.8 `acfb03e3`) and pause (live v1.3.13 `7dcb01be`); no PMW decision states them yet | PMW | Sat 31 Oct 18:00 |
| G-8 | `src/telemetry/schema.ts` (V-0 contract), event-based `isPinned(e)`, worst-case pinned-size test. **FieldSpec kinds per D-HOE-25 N-2** (float{min?,max?,step?}, str{pattern} no free text, arr{of,maxLen}, `optional?`/`nullable?` (neither by default), capped-marker variant `{capped, <counterKey>}` with `events`/`episodes`, `dynamicFields` keyed by code worker ids; unknown keys fail) | **Saves** (row 11, D-HOE-19/-20/-25) | before RC cut (schema.ts likely Fri 21:00, high Sat 03:00) |
| — | Breeds spec next rev: §8 L696 `save_migrated` shape (D-HOE-21) and enum value strings for `breed_id`/`rarity` | PMC | with breeds next rev |
| G-14 | Abilities source re-pin to v1.3.8 (combo rules; PMW to hand off sha) | PMW | Sat 31 Oct 18:00 |
| — | Card #T name-only amendments (TEL-AC6/RF-AC10 `refill_used`; TEL-AC8/AC10 wage field; TEL-AC10/11 lists) | PM Market (HoP signs TEL-AC6/RF-AC10) | Sat 31 Oct 12:00 |

**Closed in rev. 4:** F-6/C-1 (D-HOP-41 (1), D-HOE-19), G-3/C-2 (D-HOP-41 13:36 amendment), G-4/C-3 (D-HOP-41 (2), D-HOE-19), G-1 cap (D-HOE-19), G-10 (D-HOE-19), G-11 and F-4 (a) (`fatigue_chip` approved D-HOE-18 L390; SS v1.3.24), G-12 incl. (i) episode end and (ii) popover close (SS v1.3.24 L283–284), R-6 (Saves), G-13 for PM Market (#1–3) and PMC (Collection types), breeds `save_migrated` extras + `invalid_root` (D-HOE-21). Earlier: G-5, G-7, G-9.
**Closed in rev. 7:** N-1 (stall_id int counter, D-HOE-24), N-2 (D-HOE-25), N-5 (D-HOE-25), N-8 (D-HOE-25), OQ-13 (D-HOE-25), HoQA minor notes (V-2b `ability_blocked_taps`; `events` = 50).
**Closed in rev. 5:** G-6/R-4 (D-HOE-23 (a), (b)), G-13 for PMW (#7, #10; D-HOE-23 L436).

## Not changed
Every existing event, field, budget (§3.3, §4; plus the approved `ability_blocked` cap), target, privacy rule, T-AC2–T-AC15, QA-T14; the pinned file `telemetry-spec.md` `d170eb09`.

## Changelog
- **rev. 1** (13:16 CET, D-COL-2026-10-30-12): sha1 `107653d7466591243807e4c0c7f780a2e312fe34`.
- **rev. 2** (13:21 CET by mtime, D-COL-2026-10-30-13): sha1 `6a10a9181b9999e92db2db43ab50605aba63f2d9`. HoQA REJECT fixable (TELERR1).
- **rev. 3** (13:29 CET, D-COL-2026-10-30-14): sha1 `ee70767205689f257b6e5d35186b5a747f857a50` (frozen `telemetry-spec-errata-v5.ee707672.md`). HoQA: not pinnable, superseded by rev. 4 (TELERR2).
- **rev. 4** (13:39 CET, D-COL-2026-10-30-15): V-0 schema version + `{v,events}` ring + `legacy:true` (D-HOP-41 (1), D-HOE-19); no `manage_used` alias (D-HOP-41 (2)); wire worker ids = code ids (D-HOE-19); `ability_blocked` cap 50 approved + marker mirroring coop_full (`events` key proposed); G-3 final: H-1 fields on `rest_toggled{on:true}`, `paused_worker_s`/`all_paused_s` only at rc2Refill = 0 (D-HOP-41 13:36 amendment); `fatigue_chip` approved; G-12 per SS v1.3.24 `b95d5cf8` incl. closing-tap rule; PM Market and PMC type sign-offs; `first_worker_hired.t_since_unlock_s` current-session-only (D-HOE-20); breeds `save_migrated` extras + `invalid_root` (D-HOE-21); re-pins (SS v1.3.24, rc2 v1.3.7, pause v1.3.13, abilities v1.3.6, FC v0.3.21, eng. decisions `2125a36a`, manifest `5a485766`, ship-set sha256 `56090a61…`).
- **rev. 4** frozen: sha1 `9e02ac3a71ec00395890ed85a45228786ed44fe0` (`telemetry-spec-errata-v5.9e02ac3a.md`); superseded by rev. 5 before HoQA's pass.
- **rev. 5** (13:45 CET, D-COL-2026-10-30-19): applies D-HOE-20261030-23 only. `ability_blocked` marker key `events` final; `session_end.ability_blocked_taps` added; PMW types for `first_worker_hired.t_since_unlock_s`/`farm_level` (min 1) and `ability_used.t_since_ready_s` (int, was proposed float) signed off; eng. decisions re-pinned `260ea9cc`. No other change from rev. 4.
- **rev. 5** frozen: sha1 `cea3d7174d5467ee293450cde697f5dd40bcd899` (`telemetry-spec-errata-v5.cea3d717.md`); superseded by rev. 6 before HoQA's pass.
- **rev. 6** (13:47 CET, D-COL-2026-10-30-20): applies D-HOP-2026-10-30-42 only. `ability_used.combo` bool added (manual refill only, 10 s inclusive sim-ms window, Shift-sheet Boost only); `refill_used.by` and `ability_used.in_sheet` confirmed required on pinned events; G-14 abilities v1.3.8 re-pin opened. No other change from rev. 5.
- **rev. 6** frozen: sha1 `83424120ec7c28560c1852e91955b80da8559ab5` (`telemetry-spec-errata-v5.83424120.md`); HoQA CONDITIONAL PASS-WITH-NOTES (QA-D-1030-TELERR3); replaced by rev. 7 if HoQA passes it (D-HOE-25).
- **rev. 7** (13:56 CET, D-COL-2026-10-30-21): N-1 stall_id int ≥ 1 per-session counter (D-HOE-24); N-5 breeds_sanitise `reason` enum invalid_root\|invalid_values, always present, v-bump migrations no reason; OQ-13 breeds_sanitise `backup_stores: []`; N-8 `combo` always present when abilities = 1; N-2 FieldSpec kinds cited (G-8); V-2b `session_end.ability_blocked_taps`; `events` = 50 note; eng. decisions re-pinned `e0a359a8`. G-14 condition carries over unchanged.
