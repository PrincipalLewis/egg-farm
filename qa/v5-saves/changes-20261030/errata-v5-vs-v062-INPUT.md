# INPUT ONLY — telemetry errata v5 vs frozen spec/telemetry-v062.schema.json (Saves QA, 2026-10-30 ~13:5x CET)
Freeze is HELD (HoQ re-reviewing errata rev 3). This is input for HoE/HoQ; telemetry-check expectations are NOT re-targeted to the errata yet. No frozen spec/ file changed.
- **Errata read:** `product/collection/telemetry-spec-errata-v5.md` rev. 3 (13:29 CET, D-COL-2026-10-30-14): **sha1 ee7076720568…** (= the rev 3 HoQ is reviewing), **sha256 5a3c04fc92828515ca59cee5704506c19d63a5e4ca6ddee8f3cbf4a0b7d0822a**.
- **Compared with:** `qa/v5-saves/spec/telemetry-v062.schema.json` (frozen, SPEC.sha256; 61 event types, 14 pinned types). Base spec d170eb09 unchanged (errata L9).
- **Note (HoQ C-1, 13:36: D-HOP-41 closes F-6 for the HoE variant):** errata rev 3 still says "No separate schema version (F-6, closed by D-HOP-40)" (header block) and V-1 L2 text "no separate schema version"; ship-set L23 (56090a61, D-HOP-2026-10-30-41) and D-HOE-20261030-19/-20 now define TELEMETRY_SCHEMA_VERSION '0.6.2', ring {v, events}, export schema_version. Errata needs a rev 4 for this (owner PMC).

## D1 Envelope (errata V-2 L49 "Envelope type, ts, sid, fgMs on every event (L20)")
- Same as JSON `envelope.required` [type, ts, sid, fgMs], sessionMs forbidden. **No difference.** Null rule (F-3: `?` = absent, `|null` = present null) is NEW and not expressible in the JSON (no null/absent distinction).
- NOT in either: ring `{v, events}`, export header `schema_version`, `legacy:true` tag (D-HOE-19) -> new JSON keys needed (proposal below).

## D2 Event types (errata V-2 L52-69, 18 types)
- **Missing in JSON (9):** sales_stall (#1), fatigue_cue_shown (#2), fatigue_cue_tapped (#3), shift_sheet_opened (#4), refill_used (#5), rest_toggled (#6), first_worker_hired (#7), autorefill_toggled (#8), ability_used (#10).
- **In JSON but without fields (only `ifShips`/empty):** abilities_unlocked (#9), ability_blocked (#11, + `capped:true` marker), ability_ended (#12), worker_resumed (#13: `cause` manage|manual|auto_full), tip_shown (#14, `id` clock_wage).
- **In JSON with fields:** hatch_started, breed_revealed, breed_slotted, flock_complete (#15-18): not field-compared here (breeds §8 L687-698 is the source; breeds rev 3.8.8).
- **Retired / not types (L75-77):** boost_used retired; `manage_used` export-only alias (errata L76, G-4) is **RULED OUT by HoQ C-3 (2026-10-30) = D-HOE-20261030-19 G-4: `refill_used` only, no alias on the wire or in the export** -> errata L76 must change (PMC); telemetry-check v062 now FAILS any `manage_used`; `refill` renamed. JSON has none of these: no change needed except a forbiddenEvents entry for `manage_used`/`boost_used` if HoE wants them rejected.
- `worker_manage`/`worker_manage_all` stay allowed for flags-0 / rc2Refill=0 (V-3 L127); in v5 ship-set (rc2Refill=1) they should never fire -> checker rule needed (flag-conditional).

## D3 sales_stall (errata #1 L52; sales-stopped §8 L248-252)
- JSON: **absent**. Checker today holds a private closed list (telemetry-check STALL/CLOSED.sales_stall) incl. resolved_by 14 values = errata "14-value enum per L249" -> **resolved_by matches** (chip_manage included).
- Errata adds vs checker: `stall_id` = enum (stall slot, D-HOE-18), checker treats it as a number; `prev_stall_id?` optional (checker: opt) OK; precision `time_to_resolve_s`/`session_s` focus s 1 dp (checker: number); `farm_level` int, `queue_len`/`sellable_eggs`/`coop_eggs` *proposed* int >= 0 (G-13 open). Pinned (errata) vs checker: not asserted.

## D4 Field deltas on existing events (errata V-2b L81-97)
| Event | In errata, missing in JSON |
|---|---|
| collectible_spawned | interval_s, deferred_ms, restored (broody) |
| collectible_collected | nest_fill_share (broody) |
| session_end | paused_worker_s, all_paused_s, ability_uses, calls_ready_unused_s, wage_paid_asleep_cents. **HoQ C-2 (2026-10-30): paused_worker_s / all_paused_s apply ONLY with rc2Refill = 0** (errata V-2b/V-6 say "both builds": errata must change); with rc2Refill = 1, `rest_toggled` events are used as on/off PAIRS (HoQ C-2 addition 13:37). v5 ship-set has rc2Refill = 1, so in v5 these two fields are expected ABSENT. |
| session_start | viewport_h (V-4: exact strings '<740' '740-899' '>=900', never null) — JSON enums also still list the non-ASCII viewport_w variants '375–767' '≥768' |
| worker_summary | dynamic key wage_<worker>_asleep_cents (clockWage=1), worker id enum G-10 OPEN (W1-W4 vs market_hand..grader) |
| collectible_expired, frenzy_started/ended, tap, streak_peak, offline_grant, upgrade.zero_gain | no field difference (offline_grant JSON still allows `awayS` via oneOf; G-TEL-3 forbids it — pre-existing, checker already FAILs awayS) |

## D5 Pinned set (errata V-3 L113-128)
- JSON `pinned` = 14 types; errata adds 19: the 16 pinned new types + worker_paused + milestone_reached + balanced_tier, plus the event-based clause `tip_shown && id==='clock_wage'` (needs isPinned(e), F-10 / D-HOE-19). JSON cannot express the event-based clause.
- `ability_blocked` cap: <= 50 pinned per session, then one `{capped:true}` (pinned) — new rule (G-6 HoE pending in errata; D-HOE-19 G-1 approved).

## D6 Flags / rules
- Each new type carries a flag (errata column 'Flag'); JSON `flag`/`ifShips` exists for only some. Ship-set c3aba321..56090a61: all these flags = 1 except bestBuyV2.
- V-6 Rest/Pause exclusivity: with rc2Refill=1 only rest_toggled, never worker_paused/worker_resumed -> new checker rule (TEL-AC14).

## Proposal (QA, for HoE/HoQ to freeze; NOT written to spec/ while the freeze is held)
A frozen `spec/telemetry-v062-errata-v5.schema.json` = JSON v0.6.2 + D2 (9 types with closed field lists and types from errata V-2), D3 (sales_stall with stall_id enum), D4 field deltas,
D5 `pinned` (+ `pinnedWhen: [{type:'tip_shown', id:'clock_wage'}]`, `caps: {ability_blocked: 50}`), D6 `flag` per type + `exclusive: {rc2Refill:1 -> forbid [worker_paused, worker_resumed]}`,
and D1 additions `ring: {v: '0.6.2'}`, `exportHeader: {schema_version: '0.6.2'}`, `legacyTag: 'legacy'` (FINAL, HoQ C-1), D4 `session_end.paused_*` gated `rc2Refill: 0` (C-2), forbiddenEvents + `manage_used` (C-3). Draft JSON not written: HoQ said stop at the differences.
Open: G-10 worker ids, G-11 fatigue_chip, G-12 suppression, G-13 unstated types, G-4 manage_used (errata vs D-HOE-19).
