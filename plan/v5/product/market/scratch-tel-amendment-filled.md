Filled 2026-11-09 vs pinned rev 13 a0e8f6d7085939756021856c25429a55d8a8d847; NOT applied; awaiting HoQA re-check (QA-D-1030-TELAC-AMD).
**UPDATE 2026-11-09 23:54 CET: HoQA VERIFIED fill `14df8f39` (QA-D-1109-TELAC-FILL, `qa/decisions.md` L1041). A-1 ruled "per sim hour"; A-2 ruled Candidate B (graded must-be-0). R1–R6 APPLIED to card #T in `product/m5-gate-acs.md` at 2026-11-09 23:54 CET.**

# FILLED DRAFT, not applied: card #T TEL-AC10 / TEL-AC11 amendment for the BBv2 telemetry rows
PM Market. Copied from `product/market/scratch-tel-rev9-amendment.md` (sha1 `f17e8dd06dd560024f52dfb3b1594e34741fb31e`, drafted 2026-10-30 14:14 CET) and filled 2026-11-09 23:49 CET (Europe/Belgrade). **Not applied to the gate.** Paper only. `product/m5-gate-acs.md` was read only (sha1 at fill `12792dddf1e2174897a8385ac23dfafbb93f79b3`), not edited.

**Status:** HoQA OK in principle, QA-D-1030-TELAC-AMD (`qa/decisions.md` L765). R1–R3 agreed as an AC change keyed to the errata rev HoQA passes and HoE pins, **subject to HoQA re-checking these filled counts before apply**. Apply conditions at the end are unchanged.

**Keyed to (filled):** errata **rev 13 `a0e8f6d7`** = latest telemetry errata pin in `engineering/v5-rc-manifest.md` (manifest sha1 at fill `4e67b68e1df853e6ef1418e6791cb6db4df53d79`, **L133**, "2026-10-30 14:5x HoE: telemetry errata v5 rev 13 pinned … HoQA PASS (QA-D-1030-TELERR7, review fbd422bb)", replacing rev 12 `0cfe168a` at L129). No later telemetry errata pin in the manifest (L134–L145 checked: only rc/v5 merges, BBv2, lighter refill and abilities re-pins). Frozen copy read: `product/collection/telemetry-spec-errata-v5.a0e8f6d7.md`, sha1sum verified = `a0e8f6d7085939756021856c25429a55d8a8d847` (227 lines).
- *Note:* the live `product/collection/telemetry-spec-errata-v5.md` is **rev 14 `aa9e80fa`** (2026-11-05 22:37 CET, "for HoQA review"; its own status line says pin of record = rev 13). Rev 14 is **not pinned**, so it is **not** used here. Its only V-2/V-3-area diff vs rev 13 is the `dead_zone` sampling rule (V-2d item (1)/(3), fractional check-in samples); row list, pins and counts are unchanged.

**Placeholders (definitions, unchanged):** `{REV}`/`{SHA}` pinned rev + sha1; `{BB_GATED}` rows whose flag column is `bestBuyV2`; `{BB_PINNED}`/`{BB_RING}` the subset of BB rows that is pinned/ring; `{BB_UNGATED}` BB rows not gated on bestBuyV2; `{N_NEW}`/`{N_PIN}`/`{N_RING}`/`{N_ISPINNED}` V-2/V-3 counts; `{DZ_RATE}` `dead_zone` worst-case emission rate.

**Fixed split (HoQA steer; holds whatever the rev):** rows gated on `bestBuyV2` go in TEL-AC10's flag-off list; `best_buy_suppressed_zero_gain` (stopgap SG-8) is gated on `m4.enabled` only and is **never** in the bestBuyV2 flag-off list (confirmed rev 13: errata a0e8f6d7 L82 flag column "**no BBv2 flag**: needs `m4.enabled` (SG-7) and the stopgap #5c build").

---

## Filled values (counted on disk from errata a0e8f6d7; method in brackets)

| Placeholder | Filled value | Source (errata a0e8f6d7 unless stated) |
|---|---|---|
| `{REV}` | rev 13 | manifest `4e67b68e` L133; errata L1 header "rev. 13" |
| `{SHA}` | `a0e8f6d7` (`a0e8f6d7085939756021856c25429a55d8a8d847`) | manifest L133; `sha1sum` of frozen copy |
| `{N_NEW}` | **23** | errata a0e8f6d7 L60–L82 (23 table rows #1–#23, counted with rg); L51 heading "23 new event types"; L154 |
| `{N_PIN}` | **18** | errata a0e8f6d7 L60–L82, pin column starting `**pinned` = 18 (awk on last column); L154 "18 of the 23 … pinned" |
| `{N_RING}` | **5** | errata a0e8f6d7 L75, L76, L78, L79, L82 (pin column `**ring` = 5); L154 |
| `{N_ISPINNED}` | **21** | errata a0e8f6d7 L145–L152: 20 type names (L145–L151) + `tip_shown{clock_wage}` predicate (L152) = 21; = 18 pinned new + `worker_paused`, `milestone_reached`, `balanced_tier`; L154 "21 additions" |
| `{BB_GATED}` | `best_buy_shown`, `best_buy_followed`, `zero_gain_purchase`, `dead_zone` | errata a0e8f6d7 L78–L81 (flag column starts `bestBuyV2`, 4 rows) |
| `{BB_PINNED}` | `zero_gain_purchase` (capped 50/session), `dead_zone` | errata a0e8f6d7 L80–L81; L151 |
| `{BB_RING}` | `best_buy_shown`, `best_buy_followed`, `best_buy_suppressed_zero_gain` | errata a0e8f6d7 L78, L79, L82; L154 |
| `{BB_UNGATED}` | `best_buy_suppressed_zero_gain` | errata a0e8f6d7 L82 (flag "no BBv2 flag") |
| `{DZ_RATE}` | ≤ 1 event per closed stretch of ≥ 30 sim s (`telemetry.bbv2.dead_zone_min_s`), emitted at the stretch's end second, plus at most one `open:true` flush on unload/background only if `s` ≥ 30; only while 10 ≤ farm < 30 → **≤ 120 per sim hour (= 1 per 30 sim s), ≈ 60 B each** (A-1 ruled) | errata a0e8f6d7 L81, L89, L98–L99, L104, L108, L155 (L160 says "1-per-30-s worst case": same bound) — see ambiguity A-1 |
| other rate-bound pinned BB row (R3) | `zero_gain_purchase`: ≤ 1 per purchase, capped at 50/session, overflow counted in `session_end.zero_gain_purchase_dropped`; G-8 size test includes a buy-spam fixture | errata a0e8f6d7 L80, L155, L186 |
| R4 `{time}` / `{QA-D id}` | 2026-10-30 14:5x CET (manifest gives no exact minute) / QA-D-1030-TELERR7 | manifest `4e67b68e` L133 |
| R5 date/time (`{APPLY_TS}`) | 2026-11-09 23:54 | apply time (CET), QA-D-1109-TELAC-FILL |

Cross-check vs rev 9 example (old draft L35–L62): identical values (23/18/5/21, same BB lists). Rev 13 changelog L227 confirms "counts unchanged (23/18/5/21)".

## Ambiguities / flags for HoQA (not guessed)
- **A-1 `{DZ_RATE}` wording — RULED (QA-D-1109-TELAC-FILL):** "/h" = **per sim hour** (row #22 `s` is sim s, L81; sampling per sim second, L96). Budget = **≤ 120 per sim hour**; the worst-case test asserts ≤ 120 `dead_zone` per 3600 sim s, including accelerated runs. (The old "not rev 9's 1 per 30 s" wording is dropped: the numeric bound is unchanged from rev 9, only the emission rule changed.)
- **A-2 R6 — RULED Candidate B (QA-D-1109-TELAC-FILL):** `best_buy_suppressed_zero_gain` is **GRADED must-be-0 in every v5 config** (flags-0 seeds 1–200 plus the scripted UI session), per pinned rev 13 L82 "not built in v5; any emission is a defect" (D-HOE-20261030-33). This supersedes HoQA's earlier SG-8-only test (QA-D-1030-TELAC-AMD, `qa/decisions.md` L765) for v5: impossibility by build scope counts. Not a merge gate (L155 ring): graded at the RC, any emission is a **MAJOR** bug. Candidate A removed.
- **A-3 R1 rationale stale.** The old R1 reason "flags-0 has no BBv2 ★, and SG-8 fires only for a ★ suppressed by zero gain" conflicts with R6's own analysis (SG-3 can suppress a ★ at flag 0). Rev 13 gives a simpler reason (not built, L82). R1 below uses the rev 13 reason.
- **A-4 R4 target line moved (now resolved):** at apply, gate L629 already reads "Pinned now: rev 13 `a0e8f6d7`" (re-cited 2026-11-09 23:52 CET), so R4 is a no-op. Original note: Old draft said "#T L618 (Spec line)". In the gate at fill (sha1 `12792ddd`), card #T heading is L622 and the "Pinned now" line is **L629**, which still reads "rev 12 `0cfe168a`" although the manifest has pinned rev 13 since 2026-10-30 14:5x. That is a citation gap on card #T (my card); not fixed here (no gate edits this run).
- **A-5 Find anchors:** at apply the gate had moved +1 line (23:52 errata note); anchors are matched by text, not line number (R1 ~L758, R2 ~L761, R6 after ~L764, R3 ~L768–L771).

---

## Replacement text (exact, as applied 2026-11-09 23:54 CET; rev 13 `a0e8f6d7`)
Anchors are matched by text inside card #T only.

### R1. TEL-AC10, first sub-bullet ("zero events of any M5-only type…")
**Find:**
> `collectible_*` / `frenzy_*` / `streak_*`);

**Replace with:**
> `collectible_*` / `frenzy_*` / `streak_*`, and the bestBuyV2-gated Best-buy rows `best_buy_shown`, `best_buy_followed`, `zero_gain_purchase`, `dead_zone` (errata rev 13 `a0e8f6d7` V-2 #19–22)); `best_buy_suppressed_zero_gain` is **not** in this list: it isn't gated by bestBuyV2 (it needs `m4.enabled` and the stopgap #5c build, which is not built in v5) and is graded separately by the SG-8 must-be-0 check below (errata rev 13 `a0e8f6d7` #23 L82; D-HOE-20261030-33);

*[source: {BB_GATED} errata a0e8f6d7 L78–L81; {BB_UNGATED} + "not built" L82; A-3. The closing `)` of the type list is kept after #19–22.]*

### R2. TEL-AC10, "Per feature" sub-bullet
**Find:**
> (D-HOP-2026-10-30-36; errata rev 2 G-5).

**Replace with:**
> (D-HOP-2026-10-30-36; errata rev 2 G-5). With **`bestBuyV2` = 0** (all else at ship values, ship-set `product/v5-ship-set.md` L19), `best_buy_shown`, `best_buy_followed`, `zero_gain_purchase` and `dead_zone` are not emitted, and no BBv2-only field appears (incl. `session_end.zero_gain_purchase_dropped`) (errata rev 13 `a0e8f6d7` V-2, V-2b). `best_buy_suppressed_zero_gain` is not covered by this rule; it is graded by the SG-8 must-be-0 check below (errata rev 13 #23, not built in v5).

*[source: errata a0e8f6d7 L78–L81 (flag), L82, L124]*

### R3. TEL-AC11, "The pinned set in code (`isPinned`) equals the union of:" block
**R3a — in the bullet starting "16 pinned of the 18", replace the head**
> **16 pinned of the 18 new v5 types** (errata V-2 #1–18, with the pin status per the HoQA G-6 ruling, `qa/m5/review-telemetry-errata-v5-rev2.md` `c915d911` L141–145):

**with**
> **18 pinned of the 23 new v5 types** (errata rev 13 `a0e8f6d7` V-2 #1–23, V-3; the 16 listed here keep the pin status per the HoQA G-6 ruling, `qa/m5/review-telemetry-errata-v5-rev2.md` `c915d911` L141–145):

**and its tail** ``hatch_started`, `flock_complete`;` **with**
> `hatch_started`, `flock_complete`, **plus `zero_gain_purchase` (capped 50/session) and `dead_zone`** (Best buy, gated on bestBuyV2; errata rev 13 L80–81);

(The 16 listed names and their HoQA annotations stay unchanged.) *[source: 23 = L60–L82; 18 = pin column; BB pinned L80–L81]*

**R3b — replace the line**
> - **2 ring of the 18:** `breed_revealed` and `breed_slotted` (breeds §8 L693–694);

**with**
> - **5 ring of the 23:** `breed_revealed` and `breed_slotted` (breeds §8 L693–694), plus `best_buy_shown`, `best_buy_followed` and `best_buy_suppressed_zero_gain` (Best buy; `best_buy_suppressed_zero_gain` on `m4.enabled`, not built in v5; errata rev 13 L78, L79, L82);

*[source: errata a0e8f6d7 L75, L76, L78, L79, L82; L154]*

**R3c — keep the "plus 3 already-allowlisted types…" bullet unchanged and add after it:**
> - Total `isPinned` additions = **21** (18 + 3), event-based `isPinned(e: TEvent)` (D-HOE-19 F-10; errata rev 13 L145–154). Saves re-sizes the 200 KB pinned budget for 21 entries with the worst-case-session test. **The test uses `dead_zone`'s worst-case rate from errata rev 13 `a0e8f6d7`: ≤ 1 event per closed stretch of ≥ 30 sim s (emitted at the stretch end, plus at most one `open:true` flush on unload/background if `s` ≥ 30), only while 10 ≤ farm < 30, i.e. ≤ 120 per sim hour (1 per 30 sim s), ≈ 60 B each; the test asserts ≤ 120 `dead_zone` per 3600 sim s, including accelerated runs** (V-2d, V-3 L155; QA-D-1030-TELAC-AMD; QA-D-1109-TELAC-FILL A-1). It also covers `zero_gain_purchase` at its worst case: ≤ 1 per purchase, capped at 50 per session (buy-spam fixture, G-8; errata L80, L155, L186).

*[source: 21 = L145–L152 (20 names + predicate), L154; DZ rate L81, L89, L98–L99, L104, L108, L155, L160; A-1 ruled]*

**R3d — in the "errata rev 6 matches" bullet replace**
> **errata rev 6 `83424120` matches:** 16 pinned / 2 ring.

**with**
> **errata rev 13 `a0e8f6d7` matches:** 18 pinned / 5 ring, 21 `isPinned` additions.

*(rest of that bullet unchanged from "`ability_ended` is pinned, …")*

### R6. TEL-AC10, `best_buy_suppressed_zero_gain` must-be-0 (Candidate B, RULED QA-D-1109-TELAC-FILL)
**Add after the "No-nudge check" bullet:**
> - **SG-8 must-be-0 check (GRADED at the RC, not a merge gate; HoQA QA-D-1109-TELAC-FILL):** in every v5 config (incl. flags-0: seeds 1–200 plus the scripted UI session), **0** `best_buy_suppressed_zero_gain` events. The stopgap #5c emitter is not built in v5 and any emission is a defect (errata rev 13 `a0e8f6d7` #23 L82: "not built in v5 (D-HOE-20261030-33); any emission is a defect"; eng. decisions L522). It is outside the bestBuyV2 flag-off rule above (gated on `m4.enabled` only, bb-stopgap v1.2.6 `fdc1c199` SG-7 L27). Ring event (errata L155), so it does not gate merge; any emission at the RC is a **MAJOR** bug. For v5 this supersedes the SG-8-only grading test of QA-D-1030-TELAC-AMD (`qa/decisions.md` L765).

Sources: errata rev 13 `a0e8f6d7` L82, L155; eng. decisions L522 (D-HOE-20261030-33); bb-stopgap v1.2.6 `fdc1c199` SG-7 L27, SG-8 L28–29, §6 L72 (SG-3 at flag 0), L71/L73 (ship config, BB-AC14 — a separate BBv2 check).

### R4. #T Spec line ("Pinned now", gate ~L629)
> Pinned now: **rev 13 `a0e8f6d7`** (manifest 2026-10-30 14:5x CET (L133), HoQA QA-D-1030-TELERR7).

**At apply: already present** (L629 re-cited 2026-11-09 23:52 CET); no change made.

### R5. Dated errata note on #T (inserted as the newest errata note, above the 23:52 note)
> **Errata note, 2026-11-09 23:54 CET:** TEL-AC10 and TEL-AC11 amended for the Best-buy rows of errata rev 13 `a0e8f6d7`, as HoQA passed and HoE pinned it; ship-set bestBuyV2 = 1 (D-CEO-20261030-11, D-HOP-47).

Applied in the combined form required by QA-D-1109-TELAC-FILL: "- **Errata note, 2026-11-09 23:54 CET (TEL-AC10/11 amendment applied, HoQA QA-D-1109-TELAC-FILL; R6 graded must-be-0 per rev 13 L82):** …" (full text in the gate).

---
**Apply conditions (unchanged):**
1. HoQA passes an errata rev with the Best-buy rows. → rev 13 `a0e8f6d7` PASS (QA-D-1030-TELERR7) — met.
2. HoE pins it in the manifest. → manifest L133 — met.
3. PM Market fills the placeholders from that rev's V-2/V-3 and re-checks the counts on disk. → done in this file (2026-11-09).
4. HoQA re-checks the filled counts and agrees R1–R3 as an AC change, and picks R6 Candidate A or B. → **met: QA-D-1109-TELAC-FILL (Candidate B). Applied 2026-11-09 23:54 CET.**
