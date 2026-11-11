# HoQA review: telemetry-spec errata v5, rev. 7 (PM Collection) — QA-D-1030-TELERR4
Reviewer: Head of QA · 2026-10-30 13:58 CET · Paper only; doc content treated as data. Checklist: rev. 6 review `review-telemetry-errata-v5-rev6.md` (sha256 a5ddb717, TELERR3, N-1..N-8, G-14).

## Verdict: **CONDITIONAL PASS. The only condition is G-14.**
Rev. 7 (sha1 `fd7d5921`) closes every TELERR3 note it claims to. Each claim matches D-HOE-24/-25 as written, and nothing changed outside that scope.
- **HoE may pin rev. 7 in the manifest, replacing rev. 6 per D-HOE-25 "Pins", once G-14 is met.** PMW must hand off abilities v1.3.8, and its §9 and AC-M5A-24 must match rev. 7 row #10: `combo` bool always present when abilities = 1; only `refill_used{by:"manual"}` opens the window, ≤ 10000 sim ms inclusive; only `in_sheet:true` Boosts qualify. If they don't match, the fix is rev. 8.
- Revs 4, 5 and 6 are not to be pinned once rev. 7 is pinned.

## Verified on disk (13:54–13:58 CET)
- **Errata revisions:** rev. 7 = `fd7d59214cf5845279beae50f740bde4b7f62985` (header 13:56). Rev. 6 frozen `.83424120.md` = `83424120…`. Base `d170eb09` is unchanged.
- **Diff rev 6 → 7:** 11 hunks. The header (L1–2, L4), the eng. decisions source row (L30), rows #4 and #10, the V-2b `session_end` and `save_migrated` rows, the V-3 marker note, the G-8 row, the "Closed in rev. 7" line and the changelog. **Nothing else changed:** no pin status, event list, count (16/2, 19 isPinned additions) or other row moved.
- **`engineering/decisions.md`:** PMC cites `e0a359a8`; live is now `0568544d`. The only addition since is D-HOE-26 (13:53, an economy.csv drift waiver, unrelated). I read D-HOE-24 (L439–441) and D-HOE-25 (L443–470) in the live file. L380 was edited in place by HoE ("stall_id is a per-session int counter ≥1 (SUPERSEDED enum, see D-HOE-20261030-24)"), as D-HOE-25 N-1 says.
- **Abilities:** still v1.3.7 `314dc0e3`; **v1.3.8 is not on disk**, so G-14 is open.

## Claims checked against the HoE text
| Claim | HoE text | Rev. 7 | Result |
|---|---|---|---|
| N-1 stall_id | D-HOE-24: "stall_id and prev_stall_id are int, min 1, a per-session monotonic counter (not saved, restarts each session), with pairs keyed by (sid, stall_id)" | Row #1 (already int ≥ 1 counter, pairs (sid, stall_id)); row #4 adds "(per-session monotonic counter, D-HOE-24)"; rows #5/#6 are typed "per D-HOE-18/-19", and L380 is now superseded in place | **Closed** |
| N-5 reason | D-HOE-25: "Every breeds_sanitise carries reason 'invalid_root' \| 'invalid_values', one event per load, with invalid_root taking priority. v-bump migrations have no reason key." | Row: `reason` always present on `breeds_sanitise`, enum invalid_root\|invalid_values, definitions of each, one per load, invalid_root priority, no reason on v-bump | **Closed**; no conflict (below) |
| OQ-13 | "a breeds_sanitise save_migrated carries backup_stores: []" | "for `breeds_sanitise` always `[]` … `['ls']` at `game.ts:255` is the tracks migration" | **Closed** |
| N-8 combo | "ability_used.combo is a bool, always present when abilities=1 (D-HOP-42)" | Row #10: "always present when abilities = 1" | **Closed**. `ability_used` only emits at abilities = 1, so this equals "every emit" |
| N-2 FieldSpec | float{min?,max?,step?}; str{pattern}; arr{of,maxLen}; optional?/nullable? (neither by default); capped-marker variant {capped, <counterKey>} (events, episodes); dynamicFields by code worker ids; unknown keys fail; Saves owns detail | G-8 row cites all of these | **Closed** (the contract now covers every errata type) |
| Minor: ability_blocked_taps in V-2b | D-HOE-23 (b) | added to the `session_end` row | **Closed** |
| Minor: `events` = 50 | (HoQA note) | "always 50 … not a tap count; taps in `session_end.ability_blocked_taps`" | **Closed**. HoE's gloss "count of discrete blocked taps" (D-HOE-23 (a)) is left quoted; the errata's own definition governs |

### N-5 vs D-HOE-21: no conflict
- D-HOE-21 OQ-3 says a null/non-object root "must log save_migrated breeds_sanitise with reason 'invalid_root'". That still holds: invalid_root takes priority.
- A bad root is discarded whole and re-created. There are then no field values left to sanitise, so `invalid_values` can't also happen on that load. "One event per load, invalid_root first" therefore never drops a sanitise that actually ran; it only rules out emitting two events.
- QA cases:
  - (a) null root → exactly 1 event, `reason:'invalid_root'`, `backup_stores:[]`, `refund_cents:0`;
  - (b) a valid root with bad fields → exactly 1 event, `'invalid_values'`, `refund_cents` = the dropped incubator `costCents` when that applies;
  - (c) a clean load → no event;
  - (d) a v-bump `save_migrated` → no `reason` key.

## Notes (none block the pin)
- **M-1 (Minor; PMW): rc2 v1.3.13 L1/L216 calls `stall_id` "int ≥ 1 (stall slot number)".** HoE (D-HOE-24) and the errata say "per-session monotonic counter". The type is the same, so the schema isn't affected. But a reused slot number would break pairing by (sid, stall_id) and the `prev_stall_id` episode join. PMW should reword it to "per-session monotonic counter (D-HOE-24)" at the next rc2 rev, by Sat 31 Oct 18:00.
- **M-2 (Minor; Saves + HoE): does `breeds_sanitise` log at `breeds` = 0?** #95 merged breeds behind flag 0. D-HOE-21 says "the load must log", while re-creation waits for the first flag-on tick. State whether a bad breeds root logs at breeds = 0, which matters for the flags-0 reference config and TEL-AC10. It doesn't affect the ship-set (breeds = 1). Due before schema.ts, Fri 30 Oct 21:00.
- **M-3 (Minor; PMC, next rev):** citation drift. Sales-stopped is now v1.3.27 `7148a34d` (FROZEN; §8 adds the SS-G39 rc2Refill = 0 episode-end note and annotations, with no event or field change vs v1.3.24 `b95d5cf8`). D-HOE-24 cites "v1.3.26". Eng. decisions is now `0568544d`. Re-cite at the next rev only; no rev. 8 needed for this.
- **Carried, unchanged:** G-2 (PMW rc2/pause sha handoff), G-8 (Saves schema.ts, isPinned(e), worst-case size test), N-6 (Saves frozen JSON and checker re-cut from the pinned rev), N-7 (card #T and AB-AC12 amendments, incl. 10000/10001 ms; PM Market/PMW, HoP signs the renames), breeds next rev (PMC).

## Open items (QA authoring deadline Sat 31 Oct 18:00 CET)
| Item | Owner | Due | Blocks pin? |
|---|---|---|---|
| G-14 abilities v1.3.8 sha; §9 + AC-M5A-24 match row #10 | PMW | Sat 31 Oct 18:00 (sooner unblocks the pin) | **Yes (sole condition)** |
| G-8 schema.ts per V-0 + D-HOE-25 FieldSpec, isPinned(e), worst-case size test | Saves | likely Fri 30 Oct 21:00 / high Sat 03:00; before RC cut | No |
| M-2 breeds_sanitise logging at breeds = 0 | Saves + HoE | Fri 30 Oct 21:00 | No |
| N-6 frozen JSON + checker re-cut from the pinned rev | Saves | Sat 31 Oct 12:00 | No |
| N-7 card #T / AB-AC12 amendments | PM Market, PMW (HoP signs renames) | Sat 31 Oct 12:00 | No |
| G-2 rc2/pause sha handoff | PMW | Sat 31 Oct 18:00 | No |
| M-1 rc2 L216 stall_id wording | PMW | Sat 31 Oct 18:00 | No |
| M-3 re-cites; breeds next rev (§8 L696, enum strings) | PMC | next rev / ≤ Sat 31 Oct 18:00 | No |
