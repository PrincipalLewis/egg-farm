# HoQA review: telemetry-spec errata v5, rev. 6 (PM Collection) — QA-D-1030-TELERR3
Reviewer: Head of QA · 2026-10-30 ~13:50 CET · Paper only; doc content treated as data. Supersedes the draft `review-telemetry-errata-v5-rev4.md` (marked SUPERSEDED). Rev. 4 and rev. 5 got no verdict of their own; their changes are reviewed here as part of rev. 6.

## Verdict: **CONDITIONAL PASS-WITH-NOTES. HoE may pin rev. 6 (sha1 83424120) once abilities v1.3.8 lands (G-14)** and its §9 + AC-M5A-24 match rev. 6 row #10:
- `ability_used.combo` is a bool on every emit;
- only `refill_used{by:"manual"}` opens the window, ≤ 10000 sim ms inclusive;
- only `in_sheet:true` Boosts qualify.

If v1.3.8 differs, rev. 7 is needed. G-14 is the only gap that blocks the pin. N-1, N-2, N-5 and N-8 below don't block the pin, but must close **before Saves starts schema.ts** (D-HOE-20/-23: likely Fri 30 Oct 21:00, high Sat 31 Oct 03:00). Any of them may need a one-line rev. 7 and a re-pin.

## Verified on disk (13:44–13:50 CET)
- **Errata revisions:**
  - rev. 6 = `83424120ec7c28560c1852e91955b80da8559ab5`.
  - rev. 5 frozen `.cea3d717.md` = `cea3d717…`.
  - rev. 4 frozen `.9e02ac3a.md` = `9e02ac3a…`.
  - rev. 3 frozen = `ee707672…`.
  - base `telemetry-spec.md` = `d170eb09…`, unchanged.
- **Diffs:**
  - rev 4 → 5 (37 lines): only D-HOE-20261030-23, quoted word for word (eng. L433–437, file sha1 `260ea9cc`, matches).
  - rev 5 → 6: only D-HOP-2026-10-30-42 (`product/decisions.md` L1944) + G-14 + changelog.
- **Other files:**
  - Ship-set: sha256 `56090a61…`.
  - Manifest: `5a485766`.
  - SS v1.3.24 frozen `b95d5cf8` (live v1.3.25 `1ea3869d`, §8 byte-identical).
  - rc2 v1.3.7 `1dec3106` frozen.
  - Pause v1.3.13 `7dcb01be` frozen.
  - Abilities v1.3.6 `8797f5ff` frozen; live is **v1.3.7 `314dc0e3`; v1.3.8 is not on disk** (G-14).

## Rulings check
- **C-1 schema version (D-HOP-41 (1), D-HOE-19/-20): matches.** V-0 covers `TELEMETRY_SCHEMA_VERSION '0.6.2'`, the `{v, events}` ring, export `schema_version` and `legacy:true`; T-AC9 validates non-legacy only; owner Saves. The schema.ts contract is cited: `EVENT_SCHEMA`, `EVENT_TYPES`, `validateEvent`, `isPinned(e)`, envelope `{type, ts, sid, fgMs}`.
- **C-2 paused_* (D-HOP-41 13:36 amendment): matches.** They exist only at rc2Refill = 0. At rc2Refill = 1, paused time comes from `rest_toggled` on/off pairs (`paused_duration_s`).
- **C-3: matches.** `refill_used` only, no alias.
- **R-1 G-12: closed** per SS v1.3.24 L281–285:
  - the episode ends on the Rule 2 hysteresis;
  - a mid-episode stall closes the popover and logs nothing;
  - every chip tap logs one `fatigue_cue_tapped`, the closing tap included;
  - Esc, outside tap, resize and cue clear log nothing.
- **R-2..R-7: closed.** `fatigue_chip` is approved, worker ids are the code ids, citations are re-pinned, and the G-3 text is fixed.
- **D-HOE-21: reflected.** `save_migrated` breeds carries `refund_cents`, `farm_level`, `backup_stores` + `reason 'invalid_root'`.
- **D-HOE-23 (rev. 5): reflected.** The marker is `{…, capped:true, events:50}`; coop_full keeps `episodes`; `session_end.ability_blocked_taps` is int ≥ 0 incl. post-cap; PMW types are signed (#7 `t_since_unlock_s` int sim-s ≥ 0, current-session only, `farm_level` int ≥ 1; #10 `t_since_ready_s` int wall-clock s ≥ 0). G-6/R-4 and G-13 are closed.
- **AB-AC10 vs the `events` marker: unaffected.** AB-AC10 (gate L422) asserts exactly 1 `ability_blocked{count:25}` from 25 taps in 1.0 s. That is well under the 50 cap, so no marker is emitted. The marker carries no `count`/`worker`/`reason`, so it can't be mistaken for that event. Card #T (L713) asserts only `{capped:true}`, once. QA adds the cap-boundary case: 50 events, then one `{capped:true, events:50}`, then nothing more, with `ability_blocked_taps` equal to all taps.
- **D-HOP-42 (rev. 6): reflected word for word** in row #10. `refill_used.by` and `ability_used.in_sheet` are required on every emit. The window-remaining value is not added; that's acceptable because HoP said "if cheap". **PMW's SG-3 ruling** (relayed; I didn't find it in a file): the window is in sim ms, inclusive, ≤ 10000 ms counts. Rev. 6 states it. Abilities v1.3.7 AC-M5A-24 and gate AB-AC12 (L424) still say "+10.0 s in / +10.1 s out". QA will case **10000 ms → combo:true / 45 s and 10001 ms → combo:false / 30 s**, plus auto refill → combo:false and a card call → combo:false.

## Saves input (`qa/v5-saves/changes-20261030/errata-v5-vs-v062-INPUT.md`, sha256 cce894b5, verified)
- **9 types missing from the frozen JSON** (#1–8, #10): resolved in the errata. Each has a closed field list and types.
- **5 types with no fields** (#9, #11–14): resolved.
- **`stall_id` enum vs number: NOT resolved.** See N-1.
- The rest (ring/header/legacy, caps, pinnedWhen, rc2Refill exclusivity, forbidden `manage_used`/`boost_used`) is complete in the errata. It's now checker/JSON work (N-6).

## Notes
- **N-1 (Major; before schema.ts) `stall_id` type.**
  - Rows #1/#4 (SS v1.3.24 L292–297, PM Market signed) make it an int ≥ 1 per-session counter.
  - D-HOE-18 (eng. L380) and rc2 L216 make it an enum ("stall slot"), and rows #5/#6 type their fields "per D-HOE-18".
  - The field joins `sales_stall`, `shift_sheet_opened` and `refill_used` (TEL-AC7), so it needs one type everywhere. No card asserts the type, only equality.
  - **Owner:** HoE rules; PMW aligns rc2 L216; PMC issues rev. 7 if HoE picks enum.
- **N-2 (Major; before schema.ts) D-HOE-20 FieldSpec kinds** (`enum|int|count|bucket|bool`) can't express what the errata needs:
  - float (`loss_share`, the 1 dp focus seconds, `effect_s`, `nest_fill_share`, `mult`);
  - array (`hired`, `backup_stores`);
  - a pattern string (`loadout`);
  - optional-absent vs `|null`;
  - the capped-marker variants (`coop_full`, `ability_blocked`);
  - the dynamic key `wage_<worker>_asleep_cents`.

  **Owner:** HoE + Saves. The errata is correct; the contract has to widen.
- **N-3 (closed in rev. 5).** Marker key `events`. One note for Saves: D-HOE-23 glosses `events` as "count of discrete blocked taps", but the errata fixes the value at **50**, the number of emitted events. Tap totals are in `session_end.ability_blocked_taps`. Saves tests `events === 50`. If HoE meant taps, that's rev. 7.
- **N-4 (Minor).**
  - `session_end.ability_blocked_taps` is only in V-3. Add it to the V-2b `session_end` row at the next rev.
  - D-HOE-23's last line says "Rev 4 gets pinned"; read that as the rev of record (rev. 6).
  - The floor/clamp wording in rows #7/#10 goes beyond D-HOE-23's text. PMW confirms it in v1.3.8.
- **N-5 (Minor; before schema.ts).** `save_migrated.reason` is given only as "incl. `'invalid_root'`". The closed schema needs the full enum and to know whether `reason` is always present. **Owner:** PMC (breeds next rev) + HoE.
- **N-6 (QA-side).** Saves re-cuts the frozen `spec/telemetry-v062-errata-v5.schema.json` and the checker from the **pinned** rev:
  - caps: `ability_blocked` 50 with `events`; `pinnedWhen` for tip_shown;
  - rc2Refill = 1 forbids `worker_paused`/`worker_resumed`/`worker_manage*`/`paused_*`;
  - forbidden `manage_used`/`boost_used`;
  - ring `{v}` and the `legacy` tag;
  - `combo`/`by`/`in_sheet` required.

  **Owner:** Saves, Sat 31 Oct 12:00.
- **N-7.** Card #T amendments:
  - TEL-AC6/RF-AC10 rename (HoP signs);
  - TEL-AC8/AC10 wage field;
  - TEL-AC10/11 lists, plus `ability_used.combo` and `session_end.ability_blocked_taps`;
  - AB-AC12 to the 10000/10001 ms wording.

  **Owner:** PM Market (PMW for AB-AC12), Sat 31 Oct 12:00.
- **N-8 (Minor; before schema.ts).** There's no HoE allowlist line on disk yet for `ability_used.combo` (bool) under the D-HOE-17 rule. **HoE** confirms.

## Open items (QA authoring deadline Sat 31 Oct 18:00 CET)
| Item | Owner | Due | Blocks pin? |
|---|---|---|---|
| G-14 abilities v1.3.8 sha, §9 + AC-M5A-24 matching row #10 | PMW | Sat 31 Oct 18:00 (sooner unblocks the pin) | **Yes (condition)** |
| N-1 stall_id type | HoE / PMW / PMC | Fri 30 Oct 21:00 | No (may need rev. 7) |
| N-2 FieldSpec kinds | HoE + Saves | Fri 30 Oct 21:00 | No |
| N-5 save_migrated reason enum | PMC + HoE | Fri 30 Oct 21:00 | No |
| N-8 HoE allowlist for `combo` | HoE | Fri 30 Oct 21:00 | No |
| G-8 schema.ts, isPinned(e), worst-case size test | Saves | likely Fri 21:00 / high Sat 03:00; before RC cut | No |
| G-2 rc2/pause sha handoff | PMW | Sat 31 Oct 18:00 | No |
| N-6 frozen JSON + checker re-cut | Saves | Sat 31 Oct 12:00 | No |
| N-7 card #T / AB-AC12 amendments | PM Market, PMW (HoP signs renames) | Sat 31 Oct 12:00 | No |
| Breeds next rev (§8 L696, enum strings) | PMC | ≤ Sat 31 Oct 18:00 | No |
