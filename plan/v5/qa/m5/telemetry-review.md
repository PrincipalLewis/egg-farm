# M5.0 telemetry review: pinned events and telemetry-spec v0.6.2 names
**v0.4 · 2026-10-24 16:42 CEST · Head of QA · paper only.** Now also against abilities **v1.2.2** (3586f15) and pause **v1.2.1** (22dcc18). Answers HoE sizing §8.11 (names, `skin` values, pinned list). Updated for D-HOP-2026-10-24-07 (X4 scope), D-HOP-2026-10-24-10 #4 (TEL-4, TEL-14), pause spec v1.2 B6 (AC-P16 N/A for M5.0) and the spec versions on disk now: golden egg v1.1, streak + tap coins v1.1, Broody v1.1 (all on disk 16:25), abilities v1.1.1 (16:22) and pause v1.2 (16:30).
**Compared:** `product/collection/telemetry-spec.md` v0.6.2 (§3.1 allowlist, §3.2 pinning, §3.3 compaction, T-AC1–15); the five M5 specs' telemetry sections; HoE sizing F4/§10.1; code RC1 `5d9efa6` and origin/main `dd223f5` (`telemetry.ts`, `events.ts`, `game.ts`, read only).

## 0. Headline
**Overall: OK-WITH-CONDITIONS for every M5.0 item.** Pause and Broody move from NOT OK to OK-with-conditions now that their specs define fields.
The upstream fact is unchanged: v0.6.2 is approved but not built (no `schema.ts`, envelope `{type, ts, sessionMs}`, `session_end` with no payload, `tap` with only `count`/`eggs`). **X4 sets the scope.** M5.0 builds only the M5 slice: `sid`/`fgMs` on the M5 events, the ability events on the allowlist, and `ability_blocked` rate-limited. The full v0.6.2 migration is a separate item. The specs now tag fields [T-sub] (M5.0) / [T-full] (migration) / [T-req] (requested for the subset), and QA asserts accordingly.

## 1. Cross-cutting findings
| ID | Finding | Status | Condition / owner |
|---|---|---|---|
| TEL-1 | `sid`/`fgMs` envelope not built | **Resolved by X4** | Built for the M5 events only. Condition: one export holds both envelope shapes, so the schema and the dashboard must accept both (HoE) |
| TEL-2 | No `src/telemetry/schema.ts` | **Open** | Does F4 create `schema.ts` for the M5 slice so T-AC9-style validation can run? Without it QA validates against a QA-side JSON schema built from the specs (HoE) |
| TEL-3 | Pinned set: code vs spec drift | Deferred to the v0.6.2 item (X4) | M5.0 condition: the new pinned events are added to the **code's** `isPinned` list; no other drift fixed in M5.0 |
| TEL-4 | `session_end` has no payload | **Resolved (D-HOP-10 #4)** | `session_end` with every M5 total (GE-AC27, ST-AC19 [T-sub], BH-AC19, abilities §9, pause §12) **and the ST-AC20 fields** (`taps_moved_eggs`, `taps_total`, swap flag) is in the M5.0 subset; asserted in M5.0 |
| TEL-5 | Compaction drops M5 totals | Deferred to the v0.6.2 item (X4) | – |
| TEL-6 | credited vs counted | **Resolved** | `credited` everywhere (streak v1.1 §8). Leftover: HoE §10.1 still says `taps_counted` → rename to `credited_taps` (streak §14 C3, HoE) |
| TEL-7 | T-AC12 points at the M4 specs "verbatim" | **Open (minor)** | Re-point T-AC12 to the M5 v1.1 specs (PM Collection) |
| TEL-8 | `reload` reasons can't fire on the next load | **Resolved** | Golden/streak: pagehide flush (R10c/R11). **Abilities closed (HoE v1.2.2, final):** causes are `expired`/`paused`/`offline`/`asleep`/`unpaid`; no `reload`/`pagehide`/`duration`. A call spanning a reload or a ≥ 60 s gap logs `offline` once on load from the saved `activeS` (AC-M5A-12) |
| TEL-9 | `ability_blocked` spam | **Resolved** | 1 per worker per reason per `m4.telemetry.ability_blocked_window_s` (1.0 sim s) with `count` (AC-M5A-20) |
| TEL-10 | `worker`/`farm` vs `farm_level` naming | Open, minor | Accept per family; write it in telemetry §3 (PM Collection) |
| TEL-11 | Pause AC-P16 asserts `coop_full_start.coop_hand_state` | **Closed for M5.0** (pause v1.2 B6) | AC-P16 is N/A for M5.0. M5.0 guard: zero `coop_full_start` emits, no `coop_hand_state` field anywhere. When rc1-b1 ships: use `coop_full{phase:"start", coop_hand_state}`, never the alias (PM Workers) |
| TEL-12 | Broody reuses `collectible_*` with new values | **OK-with-conditions** | The schema/allowlist must accept `skin:"broody_hen"`, `slot_id` Y0–Y11, `restored`, `reward_type:"broody_cash"`, `nest_fill_share`, `expired{reason:"reset"}` (HoE) |
| TEL-13 | ST-AC19/20 need `tap.empty`, `full_at_start`, `taps_moved_eggs`, `taps_total` | **Narrowed (D-HOP-10 #4)** | `session_end.taps_moved_eggs`/`taps_total` and the ST-AC20 swap flag are now M5.0. `tap.empty` / `tap.full_at_start` stay [T-full], M5.0.1 (HoE to confirm ST-AC20's swap computation doesn't need them) |
| TEL-14 | Pause events and X4 | **Resolved (D-HOP-10 #4; pause v1.2.1 §12)** | `worker_paused`/`worker_resumed` in the M5.0 subset (pinned, allowlisted) if Pause ships; if cut, zero emits and no allowlist entries. The pinned spam budget remains a QA fixture (§2), not a gap |

## 2. Per-event verdicts
| Event | Pinned? | Fields (spec) | ACs | QA verdict |
|---|---|---|---|---|
| `collectible_spawned` | ring | `collectible_id, skin, farm_level, collection_level, slot_id, layout, interval_s, deferred_ms` (+ `restored` for Broody) | GE-AC2/3/15/16/27, BH-AC3/7/14 | **OK.** `interval_s` = drawn gap only, `deferred_ms` separate (GE-10 closed) |
| `collectible_collected` | ring | `collectible_id, skin, reaction_ms, in_warning, reward_type, reward_value, reward_duration_s, farm_level` (+ `nest_fill_share`) | GE-AC6–9/18/25, BH-AC4/6 | **OK.** `reaction_ms` only (GE-12 closed). `reward_value` units vary by type, so dashboards split by type |
| `collectible_expired` | ring | `reason` ∈ timeout / offline / reload / takeover / reset | GE-AC5/14/32, BH-AC23 | **OK** (reload via pagehide; TEL-12 for reset) |
| `frenzy_started` | ring | `collectible_id, mult, duration_s, farm_level, grader_tier` | GE-AC10 | **OK** |
| `frenzy_ended` | ring | `extra_coins, eggs_sold, sold_by_player, sold_by_workers, reason` ∈ {timeout, reset} | GE-AC10b/12 | **OK** (`hidden_end` removed, GE-11 closed) |
| `streak_started` | ring | `farm_level, collection_level` | ST-AC2 | **OK** |
| `streak_peak` | ring | `value, duration_s, credited_taps, time_at_cap_s, extra_coins, frenzy_overlap_s, reason, max_tier` | ST-AC5/9/12 | **OK** |
| `tap` (extend) | ring | + `credited, empty_credited, bonus_cents`; `empty` [T-full] | ST-AC1/3/4/19 | **OK-with-conditions:** TEL-13 |
| `session_end` (extend) | pinned | golden/streak/Broody/abilities/pause totals | GE-AC27, ST-AC19, BH-AC19, AC-M5A, pause §12 | **OK-with-conditions:** TEL-6 rename (TEL-4 resolved: in the M5.0 subset) |
| `abilities_unlocked` | **proposed pinned** | `farm, hired` | AC-M5A-1/19 | **OK.** Once per save via saved `abilitiesUnlocked`; again on a fresh start; never on reload or re-crossing F10 (AB-7 closed) |
| `ability_used` | **proposed pinned** | `worker, farm, energy_pct, mood, via_all, t_since_ready_s, in_sheet:bool` | AC-M5A-2/5/7/22 | **OK-with-conditions:** `in_sheet` must be a bool on every emit (true only for taps inside the Upgrades/Workers sheet, D-HOP-12); ≤ 48/h at 4 workers; add an abilities load to the T-AC14 budget fixture |
| `ability_blocked` | ring | `worker, reason ∈ cooldown/asleep/unpaid/paused/lockout, count` | AC-M5A-4/20, AC-P9 | **OK** (TEL-9 closed) |
| `ability_ended` | ring | `worker, cause ∈ expired/paused/offline/asleep/unpaid` (final), `effect_s` (focus s) | AC-M5A-2/6/11/12, AC-P8 | **OK** (TEL-8 closed; any other cause value fails) |
| `worker_paused` | **proposed pinned** | `worker, farm, energy_pct, mood, unpaid, ability_active` | AC-P8/10 | **OK-with-conditions:** TEL-14 (conditional on Pause shipping); spam cap (AC-P11 makes 40 pinned events/min with the 2 s debounce). QA proposes pinning only the first pause per worker per minute, or a pinned budget test |
| `worker_resumed` | **proposed pinned** | `worker, farm, energy_pct, paused_duration_s, cause` | AC-P12 | same as `worker_paused` |
| `coop_full` (B-1) | existing | `phase, durationMs` only | AC-P18 (AC-P16 deferred) | **OK (guard):** 0 `coop_full_start`, 0 `coop_hand_state` in M5.0; TEL-11 name fix returns with rc1-b1 |

## 3. Pinned list QA OK
`abilities_unlocked` **OK**. `ability_used` **OK-with-conditions** (budget fixture). `worker_paused`/`worker_resumed` **OK-with-conditions** (TEL-14: in iff Pause ships; spam cap). Golden/Frenzy/streak/tap/Broody stay ring-trimmed: **OK**, since their totals ride on the pinned `session_end` (TEL-4 resolved: in the M5.0 subset).

## 4. Untestable in M5.0 (by design, X4)
`tap.empty` and `tap.full_at_start` ([T-full], M5.0.1). (`session_end` totals, `taps_total`/`taps_moved_eggs` and the ST-AC20 swap flag moved into M5.0 by D-HOP-10 #4.) `worker_paused`/`worker_resumed` if Pause is cut (TEL-14). `coop_hand_state` (AC-P16 N/A for M5.0). (`ability_ended{reload}` no longer exists: TEL-8 closed.)

## Change log
- v0.4 (16:42): abilities v1.2.2 / pause v1.2.1: TEL-8 (abilities) closed on HoE's final causes; TEL-9 closed (1.0 sim s + `count`); TEL-14 closed; `ability_used.in_sheet` added; `abilities_unlocked` once per save; `coop_full` guard per AC-P18.
- v0.3 (16:34): D-HOP-2026-10-24-10 #4: TEL-4 resolved (session_end incl. ST-AC20 fields in the M5.0 subset), TEL-13 narrowed to `tap.empty`/`full_at_start`, TEL-14 conditional on Pause shipping; TEL-11 closed for M5.0 (pause v1.2 B6); §4 untestable list updated.
- v0.2 (16:29): X4 applied; TEL-1 and TEL-6 resolved, TEL-8 resolved for golden/streak; TEL-3/5 deferred; TEL-11–14 added; Pause and Broody verdicts moved to OK-with-conditions.
- v0.1 (16:15): first review.

## v0.5 delta · 2026-10-24 16:54 CEST · Head of QA (appended; supersedes rows above where they differ)
Inputs: HoE `engineering/m5.0-sizing.md` §13 (answers) and §14 (Sales Stopped); golden/streak/Broody on disk 16:38–16:41 (D-HOP-13); abilities v1.3 / pause v1.3 final (16:51); `product/market/sales-stopped-spec.md` v1.1 (§8).

### Closures
| ID | Status | Resolution |
|---|---|---|
| TEL-2 | **Closed (HoE §13)** | The §10.1 subset creates `src/telemetry/schema.ts` (allowlist + enums); QA's T-AC9-style validation runs against it, not a QA-side schema |
| TEL-6 | **Closed** | `credited_taps` only (HoE §10.1 renamed; no `taps_counted` alias). `taps_effective` is a dashboard computation, never emitted (D-HOP-10 #4); a `taps_effective` field in any event fails |
| TEL-7 | **Closed** | telemetry-spec T-AC12 now points at GE-AC27, ST-AC19/20, BH-AC19 |
| TEL-12 | **Closed (HoE §13)** | schema accepts the Broody `collectible_*` values (`skin:"broody_hen"`, Y0–Y11, `restored`, `broody_cash`, `nest_fill_share`, `expired{reset}`). See TEL-16 for `layout` |
| TEL-13 | **Closed (HoE §13)** | ST-AC20 swap is computed from `session_end` alone; `tap.empty`/`full_at_start` stay [T-full] and are not needed. `empty_credited` counts only while ≥ 1 Coop Hand is hired at tap time (fallback field `taps_swap_eligible`). QA case: one session spanning the first Coop Hand hire → only post-hire empty taps counted. Oracle per spec (600 taps → 0.75); HoE's §13 example uses 500 → 0.90 |
| TEL-14 | **Closed (HoE §13)** | `worker_paused`/`worker_resumed` spam cap reuses the `ability_blocked` limiter: ≤ 1 per worker per state per 1 s sim, with `count`. Replaces the QA "first per minute" proposal; AC-P11 asserts Σcount |
Envelope/hooks: X5 closed — QA reads the ring and state via `window.eggfarmQa` in `build:qa` only; the release gate fails on an `eggfarmQa` leak.

### New events: Sales Stopped (`test-plan-sales-stopped.md` §6)
| Event | Pinned? | Fields (spec §8) | ACs | QA verdict |
|---|---|---|---|---|
| `sales_stall` | **pinned** (HoE §14: joins `schema.ts` + code `isPinned`) | `phase` shown/resolved, `stall_id`, `prev_stall_id?`, `cause`, `farm_level`, `queue_len`, `sellable_eggs`, `coop_eggs`, `mh_state`, `ch_state`, `focus_s_since_last_sale`, `session_s`; resolved: `resolved_by`, `time_to_resolve_s` (focus s, 1 dp), `chip_tapped` | SS-18/19, E-rows | **OK-with-conditions:** TEL-15 |
| `fatigue_cue_shown` | **pinned** (HoE §14) | `surface, loss_per_s, loss_share, n_tired, n_asleep, suppressed_by_stall` | SS-23/25 | **OK-with-conditions:** values driven by `fatigue_cue_*` config that doesn't sync until renamed `tc_fatigue_cue_*` (SS-G11, Economy) |
| `fatigue_cue_tapped` | **pinned** | `surface, loss_per_s` | SS-25 | **OK** (one per tap; no coalescing needed at human tap rates) |
Assertions: shown/resolved paired by `stall_id`; re-show after a C6 close carries `prev_stall_id`; `cause:"other"` = 0 outside fault injection (hook SS-G8); envelope `sid`/`fgMs`; `m4.flags.salesStopped`=0 → zero events and no allowlist entries.

### New / open
| ID | Finding | Owner |
|---|---|---|
| TEL-15 | `sales_stall` (= SS-G7): no `resolved` rule when the page unloads with the chip shown (pairing breaks; propose `focus_lost` on hide + accept flush loss as TEL-8); `session_s` clock unnamed; no pinned cap for shown/resolved pairs from sheet toggling (QA-9 measures 30 min; flag > 60 pinned/30 min) | PM Market (+ HoE for the cap) |
| TEL-16 | `collectible_spawned.layout`: Broody §8 enum lacks `docked-compact` (BH-o); schema must accept it for `skin:"broody_hen"` at 1024×474 / 960×600 | PM Collection (spec) / HoE (schema) |
| TEL-10 | unchanged, minor | PM Collection |
Spec-text leftovers (not telemetry blockers): streak §12 row 11 still lists `taps_effective`; §14 A4 still ties the swap to `tap.empty`; §8.1 `fg_ms` vs envelope `fgMs` (ST-12, PM Collection).

- v0.5 (16:54): appended. Closed TEL-2/6/7/12/13/14 (HoE §13); added `sales_stall` and `fatigue_cue_*` verdicts; new TEL-15 (sales_stall pairing/budget), TEL-16 (layout enum).

## v0.5.1 delta · 2026-10-24 16:59 CEST · Head of QA (appended): sales-stopped v1.3.2
- `sales_stall` resolved adds **`reuse_count: int`**; resolved is **deferred to the end of the min-show grace window** (C6 still immediate); `time_to_resolve_s` describes the final hide. `mh_state`/`ch_state` gain `paused`; `cause` gains `mh_paused`. `fatigue_cue_shown` gains **`n_paused`**. Verdict stays **OK-with-conditions**.
- TEL-15 narrowed: C6 closes pairs at once; open = a **deferred** resolved still pending at unload, `session_s` clock, pinned-pair cap (PM Market; HoE for the cap). If D-HOP-19 (min-show default 0) is applied, deferral collapses to immediate and the unload case shrinks to C6 only (SS-G20).
- Allowlist: spec §8 asks PM Collection (telemetry-spec §3.1) + `schema.ts` to add all three events in the wiring PR; T-AC9 fails otherwise.
- v0.5.1 (16:59): appended sales-stopped v1.3.2 fields (`reuse_count`, `n_paused`, `mh_paused`/`paused`), deferred resolved; TEL-15 narrowed.

## v0.5.2 delta · 2026-10-24 17:02 CEST · Head of QA (appended): sales-stopped v1.3.3 FINAL
- **Supersedes v0.5.1:** `sales_stall` resolved has **no `reuse_count`** and is **emitted at the hide** (no deferral; D-HOP-20). A `reuse_count` field now fails the schema check. `n_paused`, `mh_paused`, `paused` states stay.
- TEL-15 narrowed again: the unload case is just C6 (`focus_lost` on hide, pagehide flush, loss accepted as TEL-8). Open: `session_s` clock and a pinned-pair cap (PM Market; HoE for the cap). SS-34(b) asserts one pair per real reappearance.
- v0.5.2 (17:02): v1.3.3 — `reuse_count` removed, resolved at the hide, TEL-15 narrowed.

- v0.3.1 (2026-10-24 17:09): sales-stopped v1.3.4: session_s is focus-clock seconds; sales_stall pins are deduped by (role, cause) with no cap.
