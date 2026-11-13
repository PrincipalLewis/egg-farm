# HoQA review: telemetry-spec errata v5, rev. 9 (PM Collection) — QA-D-1030-TELERR5
Reviewer: Head of QA · 2026-10-30 14:15 CET · Paper only; doc content treated as data. Baseline: rev. 7 `fd7d5921` (pin of record, manifest L121) and rev. 8 `b989e3cd` (skipped, read as part of the diff). Rule 23: I re-read the TASK line; no HANDOFF.md exists for this helper (none under qa/handoffs or qa/scratch names TELERR5). Owner and scope match, so I proceeded.

## Verdict: **REJECT (rev. 9 not pinnable; fixable in rev. 10). Rev. 7 `fd7d5921` stays the pin of record.**
The re-pin and `stall_id` part of rev. 9 is clean, and G-14 is now met. Two Blockers remain:
- **B-1:** the `dead_zone` emission and its definition, as they bear on the D-HOP-49 blocking bar and BB-AC16.
- **B-2:** the `state`/`mood` enum values are not listed anywhere.

The BBv2 rows also lack HoE's allowlist line. PMFU's 14:15 rulings (D-PMFU-2026-10-30-BB8) cover most of the BBv2 field points but not B-2, nor parts of B-1. Rev. 10 can PASS if it closes the "Rev. 10 must" list below.

## Verified on disk (14:11–14:15 CET)
| File | Cited | On disk | Note |
|---|---|---|---|
| errata rev. 9 | 49b76d62 | `49b76d621292c11f781d2bfb880e038f7990e755` | OK |
| rev. 7 / rev. 8 frozen | fd7d5921 / b989e3cd | match | OK; diffs 7→8 (101 lines), 8→9 (59), 7→9 (138) read |
| base | d170eb09 | match | unchanged |
| abilities v1.3.9 | 133adb21 | live = 133adb21; §9 byte-identical to frozen v1.3.8 `113dcbc5` | OK |
| rc2 v1.3.14 | 944ca78e | frozen = 944ca78e; **live v1.3.15 `40a1f0b0`** (14:12, FZ-4: L1/L111 combo key name only; telemetry L209–224 unchanged) | drift, citation only |
| pause v1.3.14 / nudge / LR v0.8.12 / FC v0.3.23 | 74a0122a / 2786a08f / 064c412d / 8c03eb07 | all match live | OK |
| sales-stopped | 49253341 | frozen `scratch/…v1.3.27-49253341.bak.md` = 49253341; **live `89dadb43`** = + errata note 2 (14:11, Art toast copy re-pin, citation only) | drift, citation only |
| BBv2 v1.0.1 | 5dc9596b | live + frozen = 5dc9596b | OK |
| bb-stopgap v1.2.6 | fdc1c199 | match | OK |
| code `BuyKey` | best-buy.ts:16 | `wt-v5-x1ci` 05d68b1: `'FARM'\|'HENS'\|'VALUE'\|'COLL'\|'W1'\|'W2'\|'W3'\|'W4'`, BUY_ORDER L17; balance.json `bestBuyV2: 0` | OK |
| eng. decisions | e57076d1 (rev 8: 5cc13f2a) | live **`f14390a5`** (+ D-HOE-30, 14:12, combo key names) | drift; D-HOE-29 text (L493–497) read verbatim and matches rev. 9's claims |
| gate | ff02c1e1, BBV2-AC16 L1037 | live **`c9fec321`**, BBV2-AC16 at **L1044** | drift |
| manifest | 2b8987fc | live `c2af536a`; L121 = rev. 7 pinned, as stated | OK |

**Counts:** 18 + 5 = 23 new types. Pinned: 16 + `zero_gain_purchase` + `dead_zone` = 18. Ring: 2 + 3 = 5. `isPinned` additions: 19 + 2 = 21. **Correct.**

**Out-of-scope check, rev. 7 → rev. 9:** rows #1–6 and #9–13, V-2c and V-6 change only line/sha citations. Rows #5/#6 gain only `stall_id?` int ≥ 1 per-session counter (D-HOE-24, the same as row #1/#4 and Saves' G-8 probe). The V-3 list gains only `zero_gain_purchase` and `dead_zone`. The sizing text grows to 21. No other rev-7 rule, pin, type or count changed. **Clean.** G-14 is closed correctly: v1.3.9 §9 L437–439 and AC-M5A-24 (10000/10001 ms, auto and card negatives, `combo` on every emit) match row #10. HoE already checked this at manifest L121.

## Findings
### Blockers
- **B-1 (Blocker): `dead_zone` emission and definition (row #22 L84; BBv2 v1.0.1 §8 L108; D-HOP-49 (H2); BB-AC12, BB-AC16).**
  - BBv2 §8 says "emitted once when ≥ 30 s pass". Emitted at 30 s, `s` is always about 30, so the field mirror of a **blocking** bar (meaningful-row dead-zone P95 ≤ 180 s) can never be computed from pinned events.
  - Rev. 9 marks stretch-end emission only as *proposed*, so the two sources of record disagree. BB-AC16 (**B**, "§8 events fire with the listed fields") would unit-test the 30 s behaviour.
  - **Covered by D-PMFU-BB8 (14:15):** emit once at stretch end with the full `s`, flushed on unload with `open:true`; `reason` values are defined; §8 defers to the errata.
  - **Not yet covered, rev. 10 must state:**
    - (a) the `open` field in the closed schema (bool, optional, present only on an unload/hide flush);
    - (b) whether an open stretch under 30 s at unload is emitted;
    - (c) **the dead-zone definition is the same one BB-AC12/G4 uses in Econ's harness**: the same start/end rules, the same 30 s floor or none, and the population the P95 is taken over. If the harness P95 counts stretches under 30 s, the field P95 from pinned events is biased high. Then either the floor drops or `session_end` carries a count of short stretches. **Owner:** PMFU + Econ (definition), PMC (text).
- **B-2 (Blocker): the `state` and `mood` enum values are not listed (rows #6 L67, #10 L76; also `worker_paused.mood`).**
  - Rev. 9 (and rev. 7) say only "`state`, `mood` enums". None of the cited sources enumerates them:
    - rc2 v1.3.14 L215 says "`state`: enum (worker state at the toggle)" and "`mood` (enum)";
    - pause v1.3.14 §12 L296 and base L36 give `mood` with no values;
    - abilities §9 likewise.
  - The code has `WorkerMood = 'working'|'tired'|'asleep'|'unpaid'` (`src/sim/workers.ts:6`) and no `state` type.
  - **Ruling:** citing a source is acceptable only if that source enumerates the values exactly. These don't, so rev. 10 must list the values: `mood` (per code, or as PMW rules) and `state` (does it include `paused`/`resting` at `on:false`? `sales_stall.mh_state` does). Without them, schema.ts (G-8) can't write a closed `validateEvent` and TEL-AC11/T-AC9 can't be cased.
  - **HoQA correction:** my rev. 3–7 reviews accepted "enums per HoE" here. That was a miss, and it is pre-existing in the pin of record rev. 7. The schema isn't built yet, so it is fixed in rev. 10, not by an erratum to rev. 7.
  - **Owner:** PMW (values) + HoE (confirm), PMC (text).

### Majors
- **M-1 (Major; condition for the rev. 10 pass): no HoE allowlist line for rows #19–23 or their pin calls (G-15).** D-HOE-29 confirms only the `key`/`payback_s`/`eta_s` types. Every earlier telemetry addition had an explicit HoE allowlist approval (D-HOE-17/-18/-19), and the two new pinned events change the pinned budget. **Owner HoE**, before the rev. 10 pass.
- **M-2 (Major): `zero_gain_purchase` is pinned and uncapped** (V-3 "≤ 1 per purchase"). It's expected to be 0, but in exactly the regression it exists to catch (a buy spree on a zero-gain row while a meaningful row is ≤ 60 s away), it grows with the purchase rate, in a current session that is never compacted (base L71). Either add a per-session cap + marker (the `ability_blocked` pattern, e.g. 50 + `{capped:true, events:50}`), or Saves' worst-case test (G-1) must include a buy-spam fixture under 200 KB. **Owner:** HoE rules; PMC text.
- **M-3 (Major, card follow-up, not errata): Card #12 BBV2-AC16 (gate L1044)** still reads "`farm_eta_s` float|null … HoE type confirmation pending". After BB8, it is `meaningful_eta_s`, non-nullable, and the types are confirmed (D-HOE-29). **Owner PMFU**, with rev. 10. Card #T TEL-AC10 (flag-off) should list rows #19–22 as absent at `bestBuyV2` = 0, and TEL-AC11 should add `zero_gain_purchase` and `dead_zone`. **Owner PM Market.**

### Minors
- **m-1:** citation drift (rc2 `40a1f0b0`, SS `89dadb43`, eng. `f14390a5`, gate `c9fec321`/L1044, manifest `c2af536a`). All are citation-only; re-cite in rev. 10.
- **m-2:** ship-set L19 still cites BBv2 "v0.3 f128f1e6". **HoP** re-cites v1.0.1 `5dc9596b`; not an errata defect.
- **m-3 (G-17):** the 5/60/30 s thresholds. BB8 says they go in `m4.telemetry.*` keys, as HoE rules. Rev. 10 should name the keys once HoE rules (like `ability_blocked_window_s`). They aren't economy tunables, so HoP is not needed unless they become ones.
- **m-4:** row #23 (SG-8) is correctly ring and outside the BBv2 flag (needs `m4.enabled`). BB-AC14 expects 0 below Farm L30 with the flag on, which is consistent with D-HOP-48 (mark-null as an inert safety net). No change.
- **m-5:** `best_buy_shown` is ring at up to ~720/h. That's fine for the ring (`ring_size` 900 trims), but the follow-rate KPI (followed ÷ shown) is lossy over long sessions. It's acceptable as field monitoring only (row #22 note L87: gates run in the harness). No change.

### Checked OK
- **Row #19 `best_buy_shown`:** `key` BuyKey enum via `str{pattern}` (D-HOE-29), `meaningful`/`affordable` bool, `payback_s`/`eta_s` float ≥ 0 or null (null = infinite/unreachable; no "Infinity"), `farm` int. Matches §8 L105/L109.
- **Row #20 `best_buy_followed`:** `{key, ms_since_shown}`, matching §8 L106.
- **Row #21 `zero_gain_purchase`:** `{key, farm, level, farm_eta_s}`, matching §8 L107, with `key` limited to HENS|VALUE|COLL per §2 L26 (FARM and W1–W4 are exempt).
- **Flag gating:** rows #19–22 fire only with `m4.flags.bestBuyV2` = 1 (+ `m4.enabled`), matching §8 heading L102.
- **`session_end`:** BBv2 adds no `session_end` fields, so there is no summary-size impact beyond the pinned events.
- **Privacy:** no free text or PII.

## Which findings rev. 10 already covers (D-PMFU-2026-10-30-BB8, 14:15)
| Finding / gap | BB8 covers? |
|---|---|
| B-1 emission at stretch end, full `s`, `open:true` on unload | **Yes** (text in rev. 10) |
| B-1 (a) `open` typing, (b) a sub-30 s open stretch, (c) matching the harness definition | **No** |
| B-2 `state`/`mood` values | **No** |
| G-15 `reason` values | **Yes** |
| G-15 `farm_eta_s` → `meaningful_eta_s`, non-nullable | **Yes** (card #12 must follow, M-3) |
| G-15 `zero_gain_purchase.level` before purchase | **Yes** |
| G-15 `ms_since_shown` picker clock from the last ★ switch | **Yes** |
| G-15 `best_buy_shown` no fire with no pick; `eta_s` = 0 when affordable | **Yes** |
| G-17 thresholds → `m4.telemetry.*` | **Direction yes**; key names need HoE's ruling |
| M-1 HoE allowlist line / pin calls | **No** (HoE) |
| M-2 `zero_gain_purchase` cap or size proof | **No** (HoE) |
| m-1 re-cites | **No** |

## Rev. 10 must (for a PASS)
1. B-1 (a)–(c) settled, with PMFU's BB8 text adopted and not left as *proposed*.
2. B-2 `state` and `mood` values listed (PMW + HoE).
3. HoE allowlist line for #19–23 and the pin calls (M-1), plus the M-2 cap decision, both on disk.
4. The G-17 key names, or "code constants" stated by HoE.
5. Re-cites (m-1).

The re-review is about 20 min. QA's authoring deadline is Sat 31 Oct 18:00 CET.

## Open items
| Item | Owner | Due | Blocks rev. 10 pass? |
|---|---|---|---|
| B-1 dead_zone definition = harness G4 definition; `open` typing; sub-30 s at unload | PMFU + Econ (definition), PMC (text) | Sat 31 Oct 12:00 | **Yes** |
| B-2 `rest_toggled.state`, `mood` (rows #6, #10, worker_paused) values | PMW + HoE, PMC | Sat 31 Oct 12:00 | **Yes** |
| M-1 HoE allowlist line + pin calls #19–23 (G-15) | HoE | Sat 31 Oct 12:00 | **Yes** |
| M-2 zero_gain_purchase cap or worst-case size fixture | HoE (rule), Saves (test) | Sat 31 Oct 12:00 | **Yes** (decision on disk) |
| G-17 threshold keys `m4.telemetry.*` | HoE | Sat 31 Oct 12:00 | Yes (names) |
| M-3 card #12 BBV2-AC16; card #T TEL-AC10/11 | PMFU; PM Market | Sat 31 Oct 18:00 | No |
| m-1 re-cites; m-2 ship-set L19 | PMC; HoP | next rev | No |
| G-8 schema.ts (incl. BBv2 rows, `open`, enum values) | Saves | before RC cut (likely Fri 21:00 / high Sat 03:00, D-HOE-20) | No |
