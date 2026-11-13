# Collection telemetry v0.6.2: errata v5 (v5 allowlist, pinned set, viewport_h, key names) · rev. 2 · 2026-10-30 13:24 CET (rev. 1 13:16, frozen `telemetry-spec-errata-v5.107653d7.md`) · PM, Collection

> **Ruled: D-HOP-2026-10-30-33 (13:22, option (a)):** "The telemetry-spec v0.6.2 pin d170eb09 stays, and D-HOP-2026-10-29-07 stands. PMC writes product/collection/telemetry-spec-errata-v5.md (ZG v0.3.8 pattern) with the v5 allowlist and pinned set, session_start.viewport_h, zero-gain key names and the L2 header fix. Card #T cites the pin plus the errata sha. HoQA reviews and HoE pins it in the manifest." Paper only. Recorded as D-COL-2026-10-30-12 (rev. 1) and D-COL-2026-10-30-13 (rev. 2).
>
> **Status: HoQA review pending. In force once HoQA has reviewed it. HoE pins it in `engineering/v5-rc-manifest.md`** (manifest sha1 on disk at 13:15: `3fe4a98c99e33dfad1395c3df32885881bae3ecb`).

- **Target spec:** `product/collection/telemetry-spec.md` v0.6.2, sha1 `d170eb09ae6bf056151c16ee248e017c2808c35a` (**not edited; pin unchanged; D-HOP-2026-10-29-07 stands**).
- **Why a separate errata file:** D-HOP-2026-10-29-07 says the pinned file is not edited before the RC. This follows the ZG errata pattern (`collection/m5.1-zero-gain-purchase-ui-errata-v0.3.8.md`) and the golden Pause errata (`m5-golden-egg-errata-v1.3.3-DRAFT.md` rev. 5 `8439752d`). The first telemetry-spec revision after v5 absorbs this errata.
- **Scope:** the §3.1 allowlist and §3.2 pinned set for every v5 event, `session_start.viewport_h`, zero-gain key names, the L2 header, the -07 text fix, and a rest/pause double-count check. Budgets (§3.3, §4), targets (§1, §5, §6) and privacy (§7) are unchanged.
- **Source rule:** every event, field and pin status below is copied from the owning spec on disk (sha1s checked 13:05–13:15 CET). Nothing is invented. Anything that can't be sourced is listed in §V-8 as an open gap. "Proposed" = the owning spec states no pin status, so PMC proposes one with a reason.
- **Ship context:** telemetry v0.6.2 has no flag and ships always-on in v5 (`product/v5-ship-set.md` rev 2 `7be8e1db` L23). All 14 feature flags are 1 except `m4.flags.bestBuyV2` = 0 (ship-set L5–19). Feature events follow their feature flags (gate card #T TEL-AC10).

## Sources (sha1 on disk)
| Spec | Version | sha1 | Telemetry section |
|---|---|---|---|
| `product/market/sales-stopped-spec.md` | v1.3.22 | `8244e066b0776041d973ab37dea2b97bb58e25b4` | §8 L247–260 |
| `product/workers/m4.2-fatigue-visibility-spec.md` | v0.2 | `b88083db64abe1a7819d85fffb605c34488d59a6` | Telemetry L47–50 |
| `product/workers/rc2-refill-proposal.md` | v1.3 (rev. 1 basis) | `2fdd84a21a9a20ce095f540ce154293eab6ac1a4` (frozen `rc2-refill-proposal.2fdd84a2.md`) | L27–30, L153, v1.2 dec. 7 L170–173, v1.3 Telemetry L203–209 |
| `product/workers/rc2-refill-proposal.md` | v1.3.2 (on disk 13:24; **PMW sha handoff pending, G-2**) | `358c90bae3a16e452327ffa08a4ccb6d8195271b` | L174 (pinned list), L206–211 (refill_used RF5 fields, `session_end.shortage_s`, merged `rest_toggled`, field types), L224 (Boost slot) |
| `product/workers/rc2-first-hire-nudge.md` | v1.2 (header v0.1) | `1c95fc8a907c8eb434a7bbae7bfa7415376a7b2b` | §4 L12–15, v1.1 L32 |
| `product/workers/m5.1-lighter-refill-proposal.md` | v0.8.10 | `f71e45161c14382772e8f76f543452164c51b3b1` | §6 L61–64 |
| `product/workers/m5.1-worker-failure-cost-proposal.md` | v0.3.19 | `4f5bbc5c18f04bf3c1952ce9b2d6ef4f313d5984` | §6 L164–169 |
| `product/workers/m5-worker-pause-spec.md` | v1.3.10 (rev. 1 basis; on disk now v1.3.11 `216b31d6…`, PMW sha handoff pending, G-2) | `b4f86ca81ae43ad514ddc0e6151610953598d885` | L98, §12 L288–293 |
| `product/workers/m5-worker-abilities-spec.md` | v1.3.3 | `06f98b49c6831206ab8ef64db1b6e791c8afc5f1` | §9 L366–373 |
| `product/m5.1-breeds-spec.md` | rev. 3.8.8 | `254acea385a64ad6fc1ba14a1d37dc15df1a1151` | §8 L687–698 |
| `product/collection/m5-golden-egg-spec.md` | v1.3.2.2 | `910098bdc4b4a7906078c06510e06ac95757ee43` | §8 L314–315 (no new events) |
| `product/collection/m5-streak-tap-coins-spec.md` | v1.3.2 | `acb4cdbba293db639a409d1c197589b97b1a5c4e` | §8 L283–296, §8.1 L298 (no new events) |
| `product/collection/m5-broody-hen-spec.md` | — | `f180c3ff2535088e7d748fff4947fe9de56e70ee` | §8 L246–254 (no new events) |
| `product/collection/m5.1-zero-gain-purchase-ui.md` + errata v0.3.8 | v0.3.7 | `f86de04e0638e3019f81b1e829321c65ff8f4f98` | §11; errata E-1/E-2 |
| `product/m5-gate-acs.md` card #T | — | `2906d37281694b5e31ecdff7bae9c3c9b2693bcf` (as read 13:14; #T first written at `d7a38ba4`; later file revs touch other cards) | TEL-AC1–15, L603–695 |
| `engineering/decisions.md` | — | `a0955cce6e7a78a143a9abd75e7e8d1b517bb006` | D-HOE-20261030-17 L370–373, D-HOE-20261030-18 L375–380; FC-G11 L144 |

## V-1 Header (L2) and §3 L43
- **L2, replace** "queued for Engineering after M4-A and SQ-1." **with:** "**v5: ships always-on (no flag) in the single v5 RC, gated once on the final RC (D-CEO-20261030-09/-10; v5-ship-set rev 2 `7be8e1db` L23; D-HOP-2026-10-30-30). v5 additions: `telemetry-spec-errata-v5.md` (D-HOP-2026-10-30-33).**" The rest of L2 is unchanged.
- **L43, read** "No other new events (M5.1 adds only `zero_gain_confirm`, above)" **as superseded** by V-2. L223 ("`worker_resumed` … not catalogued here") is likewise superseded: `worker_resumed` and the Pause `session_end` fields are catalogued in V-2/V-4.

## V-2 §3.1 allowlist additions (18 new event types)
Fields are verbatim from the owning spec. Every event carries the envelope `type, ts, sid, fgMs` (L20). "Pin" = §3.2 status (V-3).

| # | Event | Fields (verbatim) | Owning spec · section | Flag | Pin |
|---|---|---|---|---|---|
| 1 | `sales_stall` | `phase: shown\|resolved, stall_id, prev_stall_id?, cause: mh_asleep\|mh_paused\|mh_unpaid\|no_mh\|ch_asleep\|ch_unpaid\|other, farm_level, queue_len, sellable_eggs, coop_eggs, mh_state, ch_state (each working\|tired\|asleep\|unpaid\|paused\|none), focus_s_since_last_sale, session_s`; resolved adds `resolved_by: chip_refill\|chip_sell_all\|chip_collect\|chip_manage\|refill_elsewhere\|sell_elsewhere\|collect_elsewhere\|auto_resume\|queue_empty\|basket_empty\|paused\|focus_lost\|cause_changed\|none, time_to_resolve_s, chip_tapped: bool` | sales-stopped `8244e066` §8 L248–249 | salesStopped | **pinned** (spec: §8 heading L247 "pinned, never dropped"; pair dedupe by (role, cause), HoE 17:03, L252) |
| 2 | `fatigue_cue_shown` | `surface: hud_chip\|banner\|bubble, loss_per_s, loss_share, n_tired, n_asleep, n_paused, suppressed_by_stall: bool` (≤ 739 icon chip logs `hud_chip`, D-HOP-2026-10-30-24) | sales-stopped §8 L254, L259; base m4.2 `b88083db` L49 | fatigueCue | **pinned** (spec: sales-stopped §8 L247; m4.2 L47 "pinned, never dropped") |
| 3 | `fatigue_cue_tapped` | `surface, loss_per_s` | sales-stopped §8 L259; m4.2 L50 | fatigueCue | **pinned** (same) |
| 4 | `shift_sheet_opened` | `entry: nav\|card\|stall_chip, sheet_id, stall_id?` | rc2 `2fdd84a2` v1.3 L204 | rc2Refill | **pinned** (spec: rc2 L153, L173) |
| 5 | `refill_used` | `worker, energy_pct, charges_left, rank_by_risk, by: manual\|auto, sheet_id, entry_point: nav\|card\|stall_chip\|auto, stall_id?` (`sheet_id` null for `by:auto` outside a sheet) | rc2 v1.3 L205; lighter-refill `f71e4516` §6 L62. **Rev. 2:** rc2 v1.3.x adds RF5 fields `refillable_n, best_worker, lowest_worker` (on-disk v1.3.2 `358c90ba` L208; final per rc2 v1.3.x, sha to follow from PMW, G-2) | rc2Refill (auto: autoRefill) | **pinned** (spec: rc2 L153, L173) |
| 6 | `rest_toggled` | rc2 v1.3 L206: `worker, on, energy_pct, sheet_id, entry_point, stall_id?`; rc2 v1.2 L171: `state, cause: manual\|auto_full`. Merged set per D-PMW-2026-10-30-10 (as recorded in card #T TEL-AC6, `2906d372`): `worker, on: bool, energy_pct, state, cause ∈ {manual, auto_full, manage}, sheet_id, entry_point, stall_id?`, plus on `on:true` `farm, mood, unpaid, ability_active` and on `on:false` `paused_duration_s` | rc2 v1.3 L171/L206; card #T TEL-AC6; **rev. 2:** same merged set in on-disk rc2 v1.3.2 `358c90ba` L210 (final per rc2 v1.3.x, sha to follow from PMW, G-2) | rc2Refill | **pinned** (spec: rc2 L153, L173) |
| 7 | `first_worker_hired` | `worker, farm_level, t_since_unlock_s, via_nudge: bool`; **`via_nudge` is always false in v5** (D-HOP-2026-10-30-36) | first-hire nudge `1c95fc8a` §4 L15 | **`m4.flags.rc2Refill`**; not emitted when rc2Refill = 0 (D-HOP-2026-10-30-36) | **pinned** (spec: nudge v1.1 L32; rc2 v1.3 `2fdd84a2` L173 = rc2 v1.3.2 `358c90ba` L174) |
| 8 | `autorefill_toggled` | `worker, on, farm_level` | lighter-refill §6 L63 | autoRefill (needs rc2Refill, AC-LR19) | **pinned, proposed**: the spec states no pin. A per-worker settings toggle is rare, and the §6 KPI "players with ≥ 1 toggle on" needs it after ring trim |
| 9 | `abilities_unlocked` | `farm, hired:[ids]` | abilities `06f98b49` §9 L368 | abilities | **pinned** (spec L367 "proposed for the pinned, never-trimmed set"; card #T TEL-AC11 adopts) |
| 10 | `ability_used` | `worker, farm, energy_pct, mood, via_all: bool, t_since_ready_s, in_sheet: bool` | abilities §9 L369 | abilities | **pinned** (same as #9). Also replaces retired `boost_used` (TEL-AC15) |
| 11 | `ability_blocked` | `worker, reason: cooldown\|asleep\|unpaid\|paused\|lockout, count` (≤ 1 per worker per reason per `m4.telemetry.ability_blocked_window_s` = 1.0 s) | abilities §9 L370 | abilities | **ring, proposed**: spec states no pin; high-frequency disabled-button taps |
| 12 | `ability_ended` | `worker, cause: expired\|paused\|offline\|asleep\|unpaid, effect_s` | abilities §9 L371–372 | abilities | **ring, proposed**: spec states no pin; one per call, `ability_used` already pins the funnel |
| 13 | `worker_resumed` | `worker, farm, energy_pct, paused_duration_s, cause: manual\|manage` | pause `b4f86ca8` §12 L291 | pause = 1 **and** rc2Refill = 0 only (V-6) | **pinned** (spec L289) |
| 14 | `tip_shown` | `id:"clock_wage"` (only id defined) | failure-cost `4f5bbc5c` §6 L168; HoE FC-G11 (eng. decisions L144) | clockWage | **pinned** (spec L168, once per save) |
| 15 | `hatch_started` | `breed_id, rarity, cost, coinsBefore, pity_before, free (bool), farm_level`; never `track`/`cost_cents`; nothing on a failed press | breeds `254acea3` §8 L692 | breeds | **pinned** (spec L692) |
| 16 | `breed_revealed` | `breed_id, rarity, dupe (bool), stars_after, offline (bool), wait_ms` | breeds §8 L693 | breeds | **ring** (spec L693 "no (ring)") |
| 17 | `breed_slotted` | `slot, prev_slot\|null, breed_id\|null, prev_breed_id\|null, cause: manual\|auto_reveal\|move, loadout, settling, count` (≤ 1 per slot per second) | breeds §8 L694 | breeds | **ring** (spec L694 "no (ring)") |
| 18 | `flock_complete` | `hatches, farm_level, elapsed_since_unlock_s, backfilled (bool)`; once per save | breeds §8 L695 | breeds | **pinned** (spec L695; also count in `session_summary.counts`) |

**Wildcards expanded:** `fatigue_cue_*` = #2, #3. `ability_*` = #10, #11, #12. `breed_*` = #16, #17. PM Market's `tip_shown` = #14 (the only id is `clock_wage`).

**Already allowlisted, no new type:** `worker_paused` (L48; Pause ships, so "if Pause ships; TEL-14" resolves to *ships*, but it fires only with rc2Refill = 0, V-6). `collectible_*`, `frenzy_*`, `streak_*` (golden §8 L315, streak §8 L283, broody §8 L246 reuse them; ring-trimmed, unchanged). `zero_gain_confirm` (L51).

**Not added:** `first_hire_nudge_shown` and `first_hire_nudge_dismissed` are **not in v5** and stay **off the allowlist**: the first-hire nudge goes to 5.1 and was never in the M5 scope (D-HOP-2026-10-30-36). `boost_used` (retired, D-PMW-2026-10-30-10, card #T TEL-AC15; the v5 Boost slot logs only `ability_used{in_sheet:true}`, D-HOP-2026-10-30-35). `refill` (never implemented, renamed to `refill_used`, lighter-refill L62). `wage` stays "not an event" (L54): `wage.state` is a sim-event field summed into `worker_summary` (HoE FC-G11, eng. decisions L144).

**Field additions on existing events (allowlist fields, per owning spec, by reference):**
- `session_end`: Pause `paused_worker_s`, `all_paused_s` (pause §12 L292); abilities `ability_uses`, `calls_ready_unused_s` (L373); failure-cost `wage_paid_asleep_cents`, `asleep_s` (§6 L166–167); lighter-refill `refills_manual`, `refills_auto`, `charge_starved_s` (§6 L64; L169); rc2 `shortage_s` (int, whole seconds; D-HOE-20261030-18 13:16 addendum; on-disk rc2 v1.3.2 L209, final per rc2 v1.3.x, sha to follow from PMW, G-2); breeds L698 fields (already partly in L28); streak `credited_taps`, `tap_bonus_cents`, `streak_extra_cents` + §8.1 fields (streak §8 L291, L298); broody `broody_cents`, `broody_collects` (broody §8).
- `tap`: `credited`, `empty_credited`, `bonus_cents` (streak §8 L288). `streak_peak`: `max_tier` (L290).
- `offline_grant`: `away_bp` (breeds §8 L697).
- `upgrade.zero_gain`: unchanged (L30), key name per V-5.

## V-3 §3.2 pinned set
`isPinned(e)` (L61–65) adds, as an **or** to the type set:
```
sales_stall, fatigue_cue_shown, fatigue_cue_tapped,
shift_sheet_opened, refill_used, rest_toggled, first_worker_hired, autorefill_toggled,
abilities_unlocked, ability_used,
worker_paused, worker_resumed,
hatch_started, flock_complete,
milestone_reached, balanced_tier
|| (e.type === "tip_shown" && e.id === "clock_wage")
```
- That is **14 of the 18 new types pinned** (incl. `autorefill_toggled`, proposed) and **4 ring-trimmed** (`ability_blocked`, `ability_ended` proposed; `breed_revealed`, `breed_slotted` per spec). The set also gains 3 already-allowlisted types: `worker_paused` (pause §12 L289), and `milestone_reached` / `balanced_tier` (V-7).
- L67 "Everything else … is ring-trimmed" still holds for `coop_full{phase:"start"}`, collectible/frenzy/streak and `telemetry_budget_shrunk`.
- `worker_manage` / `worker_manage_all` stay in both sets for the flags-0 and rc2Refill = 0 configs. With rc2Refill = 1 they're retired (rc2 L172).
- **Card #T TEL-AC11 delta (for PM Market):** its union lacks `fatigue_cue_shown`, `fatigue_cue_tapped` (pinned by both owning specs), `autorefill_toggled` (proposed here) and `milestone_reached` / `balanced_tier` (-07). It should match this list once HoQA has reviewed.

## V-4 session_start.viewport_h (L27, L77, T-AC1 L143)
**Ruled:** D-HOP-2026-10-30-28 (1) (`product/decisions.md` L1723). **HoE approval of record:** D-HOE-20261030-18 (13:20 CET, `engineering/decisions.md` L376): "viewport_h (approved 13:03 to PM Market, logged now) … window.innerHeight bucketed '<740' | '740-899' | '>=900'. One threshold constant (single source) and a 739/740 boundary AC." Field text from sales-stopped §8 L255–258.
- **L27 `session_start` row:** after `viewport_w (CSS px, bucketed: <375 / 375–767 / ≥768)` add **`viewport_h`** (CSS px `window.innerHeight` at `session_start`, sent as a bucket only: `'<740'` \| `'740-899'` \| `'>=900'`; no raw value; not re-sent on resize; the 740 edge is the same single constant as the sales-stopped §4.8 breakpoint; v5, D-HOP-2026-10-30-28 (1), D-HOE-20261030-18). Always-on: emitted in every flag config, including flags-0 (card #T TEL-AC10).
- **L77 `session_summary.start`:** read `has_coop_hand, viewport_w, viewport_h, reduced_motion, prev_hidden_ms?`.
- **T-AC1 (L143):** after "`viewport_w` bucket" add "`viewport_h` bucket". **Boundary (HoE AC, = SS-38 (e), card #T TEL-AC3):** innerHeight 739 → `'<740'`; 740 → `'740-899'`; 899 → `'740-899'`; 900 → `'>=900'`. A resize after `session_start` emits nothing.
- §7 privacy ("Viewport is bucketed") covers it. §5 standard cuts are unchanged (adding a height cut is a dashboard choice for PM Market, not ruled).

## V-5 Zero-gain key names (L30, L41, L243)
Per ZG errata v0.3.8 E-1/E-2 (D-HOP-2026-10-30-14) and the ship-set (L15, L20), read:
- `m5.flags.zeroGainUi` → **`m4.flags.zeroGainUi`** (L30, L41, L243). Ship value 1.
- `m5.zeroGain.confirm` → **`m4.zeroGain.confirm`**, a **0/1 number** (L41, L244). L41 "is true" reads "= 1". Ship value 0, so `zero_gain_confirm` never fires in v5.
- Read-only code check (13:15): `src/config/balance.json` in worktree `/workspace/wt-v5-x1ci` (`05d68b1`) and `/workspace/wt-m41-p2` (`ba398b6`) has `m4.flags.zeroGainUi` and `m4.zeroGain.confirm` (numeric), and no `m5` key. HoE confirms against origin/rc/v5 when pinning. The HoE 2026-10-25 02:55 wording "m5.flags.zeroGainUi confirmed" is superseded by D-HOP-2026-10-30-14.

## V-6 Rest/Pause double-count check (Pause = 1 and rc2Refill = 1 in v5)
- **Specs on disk are ambiguous:** pause `b4f86ca8` L98 says "`rest_toggled` replaces `worker_paused` and `worker_resumed`, and the old names stay as aliases for one release", and §12 L293 "These alias to `rest_toggled` from M5.1". rc2 v1.3 doesn't say whether both fire.
- **Ruling found:** D-PMW-2026-10-30-10, as recorded in card #T **TEL-AC14** (`2906d372`) and `product/decisions.md` L1791: one family per build. With pause = 1 and rc2Refill = 1 (the v5 ship config), **only `rest_toggled`** fires (pause → `on:true`, resume → `on:false`), and zero `worker_paused` / `worker_resumed`. With pause = 1 and rc2Refill = 0, only `worker_paused` / `worker_resumed`. Both families stay pinned.
- **Finding:** no double count in v5. One user action → one pinned event. The pinned list lists both families because each covers a different config.
- **Still open for PMW (G-2):** the PMW spec text that carries this ruling (rc2 v1.3.1, pause v1.3.11) isn't on disk yet; rc2 is still `2fdd84a2` and pause `b4f86ca8`.

## V-7 D-HOP-2026-10-29-07 text fix (L52, L257)
In §3.1 L52 and the G-TEL-2 addendum L257, "ring-trimmed, not pinned" for `milestone_reached` and `balanced_tier` reads **"pinned"** (D-HOP-2026-10-29-07, `product/decisions.md` L1351). Code already matches: `src/telemetry/telemetry.ts:14` in `/workspace/wt-v5-x1ci` pins both. They join the §3.2 set (V-3). The post-v5 revision cites -07.

## V-8 Open gaps
- **G-1 (HoE):** `session_summary` size. §3.3 assumes `counts` ≤ ~10 keys and ≤ 1 KB per summary. V-3 adds up to 17 pinned types, and no sizing on disk covers the v5 pinned growth (breeds alone: ≤ 25 `hatch_started` + 1 `flock_complete` per save, breeds L934). HoE re-measures the 1 KB / 200 KB budgets (T-AC14) with v5 pinned events.
- **G-2 (PMW), still open:** the `rest_toggled`, `refill_used` (RF5 fields) and `session_end.shortage_s` fields are per rc2 v1.3.x; the sha is still to follow from PMW. On disk at 13:24: rc2 v1.3.2 `358c90ba` and pause v1.3.11 `216b31d6` (not handed off). V-2 #5/#6, V-6 and the `shortage_s` line re-pin when PMW sends the sha.
- **G-3 (PMW + HoE):** with rc2Refill = 1, do the HoE H-1 fields `worker_paused.golden_on_screen` / `frenzy_active` (L36, golden errata GE-AC45) move to `rest_toggled{on:true}`? Card #T TEL-AC6's Pause-only list omits them. Same question for `session_end.paused_worker_s` / `all_paused_s` (card TEL-AC8 ties them to rc2Refill = 0).
- **G-4 (PMW + HoE):** `manage_used` "aliased to `refill_used` for one release" (rc2 L172/L208). Is `manage_used` a separate exported type that the schema must allow, or only an export-time rename? Not added here.
- ~~**G-5**~~ **Closed (D-HOP-2026-10-30-36, 13:21):** `first_worker_hired` ships in v5, pinned, gated on `m4.flags.rc2Refill` (not emitted at 0), `via_nudge` always false. `first_hire_nudge_shown` / `_dismissed` are not in v5 (5.1) and stay off the allowlist. Card #T TEL-AC10's flag-off list should add `first_worker_hired` under rc2Refill = 0 (PM Market).
- **G-6 (HoQA / HoP):** pin status of `autorefill_toggled` (pinned), `ability_blocked` and `ability_ended` (ring) is PMC's proposal; the owning specs are silent.
- **G-7 (HoE):** manifest rows 11 and 24 still read "CUT to 5.1" (card #T gap 8). Card #T cites manifest `68897e47`; on disk it's now `3fe4a98c`.
- **G-8 (HoE / Features):** `src/telemetry/schema.ts` doesn't exist yet (QA TEL-2; card #T gap 9).
- ~~**G-9**~~ **Closed (D-HOP-2026-10-30-35, 13:20):** the Boost slot is visible in v5, gated on `flags.abilities && flags.rc2Refill`, and logs only `ability_used{in_sheet:true}`; `boost_used` is retired. The event list doesn't change.

## Not changed
- Every existing event, field, budget (§3.3, §4), target (§1, §5, §6) and privacy rule (§7). T-AC2–T-AC15 and QA-T14.
- The pinned file `telemetry-spec.md` `d170eb09`.

## Changelog
- **rev. 1** (2026-10-30 13:16 CET, D-COL-2026-10-30-12): first issue, sha1 `107653d7466591243807e4c0c7f780a2e312fe34` (frozen as `telemetry-spec-errata-v5.107653d7.md`).
- **rev. 2** (2026-10-30 13:24 CET, D-COL-2026-10-30-13): G-5 closed (D-HOP-2026-10-30-36: `first_worker_hired` gated on rc2Refill, `via_nudge` always false; `first_hire_nudge_*` not in v5, off the allowlist). G-9 closed (D-HOP-2026-10-30-35: Boost slot visible, `ability_used{in_sheet:true}` only, no event-list change). G-2 kept open; rc2 v1.3.x fields (`refill_used` RF5, merged `rest_toggled`, `session_end.shortage_s`) cited from on-disk v1.3.2 `358c90ba` pending PMW's sha. Event counts unchanged (18 new: 14 pinned, 4 ring).
