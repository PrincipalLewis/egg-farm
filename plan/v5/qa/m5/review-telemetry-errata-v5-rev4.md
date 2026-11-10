# [SUPERSEDED DRAFT] HoQA review: telemetry-spec errata v5, rev. 4 (PM Collection)
Reviewer: Head of QA · 2026-10-30 ~13:45 CET · Paper only; doc content treated as data. Checklist: rev. 3 review `qa/m5/review-telemetry-errata-v5-rev3.md` (sha1 cb19ab84, C-1..C-3, R-1..R-8) + Saves input `qa/v5-saves/changes-20261030/errata-v5-vs-v062-INPUT.md` (sha256 cce894b5…, verified).

> **SUPERSEDED (13:46 CET): rev. 4 was replaced by rev. 5 (cea3d717) before this review was issued. Do NOT pin rev. 4. This file is a working draft only; the verdict of record is `review-telemetry-errata-v5-rev5.md` (QA-D-1030-TELERR3).**

## Draft verdict (not issued): PASS-WITH-NOTES on rev. 4, superseded.
- C-1..C-3 match HoP's rulings.
- R-1..R-8 are closed or tracked with an owner.
- No open item changes an assertion that a gate card relies on.
- Two Majors (N-1, N-2) must be closed **before Saves starts schema.ts** (D-HOE-20: likely Fri 30 Oct 21:00, high Sat 31 Oct 03:00), not before the pin. Either one may need a short rev. 5 and a re-pin. That is a one-line change and doesn't need a full re-review.

## Inputs verified on disk (13:40–13:44 CET)
| File | Claimed | On disk | Note |
|---|---|---|---|
| errata rev. 4 | 9e02ac3a | `9e02ac3a71ec00395890ed85a45228786ed44fe0` (mtime 13:39:43) | OK; rev3→rev4 diff (287 lines) and the full text read |
| rev. 3 frozen | ee707672 | `ee707672…` (`.ee707672.md`) | OK |
| base v0.6.2 | d170eb09 | `d170eb09…` | unchanged |
| HoQA rev. 3 review | sha1 cb19ab84 | `cb19ab84…` | OK |
| ship-set | sha256 56090a61 | `56090a61…` / sha1 `646ec202`; L23 carries TELEMETRY_SCHEMA_VERSION "0.6.2" + legacy | OK |
| sales-stopped v1.3.24 | b95d5cf8 | frozen `scratch/sales-stopped-spec.v1.3.24-b95d5cf8.bak.md` = b95d5cf8. Live is v1.3.25 `1ea3869d` (13:39); **§8 is byte-identical** | OK |
| abilities v1.3.6 | 8797f5ff | scratch copy = 8797f5ff; §3 L97/L100 and §9 L420–427 match | live `314dc0e3`, §9 events unchanged per PMC |
| rc2 v1.3.7 | 1dec3106 | `rc2-refill-proposal.1dec3106.md` = 1dec3106 (no alias, code ids). Live is v1.3.8 `acfb03e3` | G-2 |
| pause v1.3.13 | 7dcb01be | frozen = 7dcb01be (L295 code ids, L298 paused_* only at rc2Refill=0). **Live has moved again to `74a0122a`** | G-2 |
| failure-cost v0.3.21 | f961a734 | `f961a734…` | OK |
| manifest | 5a485766 | `5a485766…` | OK |
| eng. decisions | 2125a36a | live **`d2838ca1`** (D-HOE-20/-21/-22 appended) | it moves; cite fix at the next rev. only |

## C-1..C-3 vs D-HOP-2026-10-30-41 + 13:36 amendment (`product/decisions.md` L1880–1881)
- **C-1 — matches.** V-0 L35–40 covers: `TELEMETRY_SCHEMA_VERSION '0.6.2'`; a `{v, events}` ring; an export `schema_version`; pre-0.6.2 rings `legacy:true`; T-AC9 validates non-legacy only; no save migration; owner Saves. V-1 L2 and the ship-set L23 agree.
- **C-2 — matches the amendment.** V-6 L139: `paused_worker_s`/`all_paused_s` are emitted only when rc2Refill = 0. With rc2Refill = 1 they are absent, and paused time comes from `rest_toggled` on:true→on:false pairs (`paused_duration_s`). The H-1 toggle fields are on `rest_toggled{on:true}` (L60, L138). Pause v1.3.13 L298 agrees.
- **C-3 — matches.** L74 says no `manage_used` alias of any kind, a closed schema, and `refill_used` only. The card TEL-AC6/RF-AC10 renames are tracked (V-8, HoP signs). rc2 v1.3.7 L173/L222 strike the alias.

## R-1..R-8 (rev. 3 review)
| R | Status |
|---|---|
| R-1 G-12 | **Closed.** V-2c follows SS v1.3.24 §8 L281–285: once per episode; Rule 2 hysteresis end (0.12 held 2 s, L283); a mid-episode stall closes the popover and logs nothing, with no re-fire (L284, SS-47). **Every chip tap logs one `fatigue_cue_tapped`, including the closing tap.** Esc, outside tap, resize and cue clear log nothing (SS-48 L485). Manage logs only `shift_sheet_opened{entry:fatigue_chip}`. The stray-fragment issue is gone in §8. |
| R-2 fatigue_chip | **Closed.** Approved (D-HOE-18 L390); rows 4–6 and V-2c updated. |
| R-3 worker ids | **Closed.** L49 uses code ids `market_hand|coop_hand|hawker|grader` everywhere; rc2 v1.3.7 and pause v1.3.13 L295 are aligned. |
| R-4 marker | **Defined, key name proposed** (see N-3). |
| R-5 citations | **Closed**, with drift since (eng. `d2838ca1`, pause `74a0122a`, rc2 `acfb03e3`). G-2 tracks these. |
| R-6 owner | **Closed** (Saves, V-0/V-3). |
| R-7 G-3 text | **Closed** (V-6). |
| R-8 types | PM Market signed #1–3; PMC signed the Collection types. **PMW's #7/#10 are still *proposed*** (G-13), which is non-blocking (no card asserts these types). |

## Other required checks
- **schema.ts contract (D-HOE-20):** V-0 L36 cites `TELEMETRY_SCHEMA_VERSION`, `EVENT_SCHEMA`, `EVENT_TYPES`, `validateEvent(e)`, `isPinned(e)`, the FieldSpec kinds and the envelope `{type, ts, sid, fgMs}` (L47). **Reflected.** See N-2 for the gap between the contract and the errata's types.
- **D-HOE-21 breeds `save_migrated`:** V-2b L93 adds `refund_cents`, `farm_level`, `backup_stores` + `reason` incl. `'invalid_root'`, superseding breeds §8 L696 "no reason key". **Reflected.** The code at `wt-v5-x1ci` 05d68b1 has no `breeds_sanitise`/`invalid_root` yet; that is expected, since it lands in Saves' #95 follow-up. See N-5.
- **`first_worker_hired.t_since_unlock_s?`** current-session only (D-HOE-20). Reflected (row 7).
- **Combo (D-HOP-39):** still no new field (row 10). OK.

## Saves input (errata-v5-vs-v062-INPUT, read against rev. 3)
| Item | Rev. 4 |
|---|---|
| 9 types missing from the frozen JSON (#1–8, #10) | **Resolved in the errata.** Each has a closed field list and types in V-2. The frozen QA JSON must be re-cut from rev. 4 (QA-side, N-6). |
| 5 types with no fields (#9, #11, #12, #13, #14) | **Resolved.** abilities_unlocked `{farm, hired[]}`, ability_blocked `{worker, reason, count}` + marker, ability_ended `{worker, cause, effect_s}`, worker_resumed incl. `auto_full`, tip_shown `{id:"clock_wage"}`. |
| `stall_id` enum vs number | **NOT resolved; the conflict now sits between sources.** See N-1. |
| C-1 / C-2 / C-3 / G-10 / G-11 / G-12 notes in the input | Resolved by rev. 4 (above). |
| Ring/header/legacy, caps, pinnedWhen, flag exclusivity, forbidden `manage_used`/`boost_used`, `worker_manage*` flag-conditional | Errata content is complete. These are frozen-JSON/checker design items (N-6). |

## Notes
- **N-1 (Major; before schema.ts): `stall_id` type conflict.**
  - Errata rows 1 and 4 (SS v1.3.24 L292–297, PM Market signed): int ≥ 1, a per-session monotonic counter.
  - HoE D-HOE-18 (eng. L380) and rc2 v1.3.7/v1.3.8 L216: "`stall_id` … enums (stall slot)". Rows 5/6 type their fields "per D-HOE-18", so rev. 4 is internally inconsistent for `refill_used`/`rest_toggled.stall_id`.
  - The field joins `sales_stall` ↔ `shift_sheet_opened` ↔ `refill_used` (TEL-AC7, SS conversion), so the type must be identical everywhere.
  - No card asserts the type, only equality, so it doesn't block the pin.
  - **HoE** rules int-counter or enum; **PMW** aligns rc2 L216; if it's an enum, PMC issues rev. 5 for rows 1/4. Due before schema.ts (Fri 30 Oct 21:00).
- **N-2 (Major; before schema.ts): the D-HOE-20 FieldSpec kinds can't express the errata's types.** `enum|int|count|bucket|bool` has:
  - no float/number kind (`loss_share`, the 1 dp focus seconds, `t_since_ready_s`, `nest_fill_share`, `mult`, `effect_s`);
  - no array kind (`abilities_unlocked.hired`, `save_migrated.backup_stores`);
  - no pattern string (`breed_slotted.loadout`);
  - no optional (`?` absent) vs `|null` marker;
  - no variant for capped markers (`coop_full`, `ability_blocked{capped:true}` without `worker/reason/count`);
  - no dynamic key (`worker_summary.wage_<worker>_asleep_cents`).

  The errata is right; the contract needs widening. Owner: **HoE + Saves**, before schema.ts.
- **N-3 (Minor; non-blocking): marker key name `events` (proposed) vs `episodes`, and the optional post-cap total.**
  - AB-AC10 (gate L422) asserts only `ability_blocked{count:25}`.
  - Card #T (L713) asserts only `{capped:true}`, "one … and no more that session".
  - The key name changes neither assertion. It affects only the closed schema and QA's own cap-boundary case, which will read the key from the pinned errata.
  - A post-cap `session_end.ability_blocked_taps` would be a new additive field, not covered by any AC.
  - HoQA's preference is `events:50`, as written. **PMW + HoE** confirm before schema.ts (Fri 30 Oct 21:00). If they choose differently: a one-line rev. 5 + re-pin.
- **N-4 (Minor): PMW type sign-off #7/#10** (G-13), Sat 31 Oct 18:00. Rev. 2 sha handoffs for rc2/pause (G-2) are also due Sat 31 Oct 18:00; both have moved again since rev. 4.
- **N-5 (Minor):** `save_migrated.reason` lists only `'invalid_root'` ("incl."). The closed schema needs the full `reason` enum, and whether `reason` is always present or only on that path. Owner **PMC** (breeds next rev) + HoE, before schema.ts.
- **N-6 (QA-side, not an errata defect):** Saves re-cuts the frozen `spec/telemetry-v062-errata-v5.schema.json` from **rev. 4 once pinned**, plus checker rules: pinned + `pinnedWhen` tip_shown, `caps.ability_blocked` 50, rc2Refill=1 forbids `worker_paused`/`worker_resumed`/`worker_manage*` and `paused_*`, forbidden `manage_used`/`boost_used`, ring `{v}` / header / `legacy`. Owner Saves, for HoQA's Sat 31 Oct 12:00 telemetry need.
- **N-7 (tracked): card #T amendments** (TEL-AC6/RF-AC10 renames, which HoP signs; TEL-AC8/AC10 wage field; TEL-AC10/11 lists). PM Market, Sat 31 Oct 12:00.

## Open items (QA authoring deadline Sat 31 Oct 18:00 CET)
| Item | Owner | Due |
|---|---|---|
| N-1 stall_id type | HoE (rule), PMW (rc2 L216), PMC (rev. 5 if enum) | Fri 30 Oct 21:00 (schema.ts start) |
| N-2 FieldSpec kinds | HoE + Saves | Fri 30 Oct 21:00 |
| N-3 marker key / post-cap total | PMW + HoE | Fri 30 Oct 21:00 |
| N-5 save_migrated reason enum | PMC + HoE | Fri 30 Oct 21:00 |
| G-8 schema.ts, isPinned(e), worst-case size test | Saves | likely Fri 21:00 / high Sat 03:00 (D-HOE-20); before the RC cut |
| N-6 frozen JSON + checker re-cut | Saves | Sat 31 Oct 12:00 |
| N-7 card #T amendments | PM Market (HoP signs renames) | Sat 31 Oct 12:00 |
| G-2 rc2/pause sha handoff | PMW | Sat 31 Oct 18:00 |
| G-13 PMW types #7/#10 | PMW | Sat 31 Oct 18:00 |
| Breeds next rev (§8 L696, enum strings) | PMC | with breeds next rev, ≤ Sat 31 Oct 18:00 |
