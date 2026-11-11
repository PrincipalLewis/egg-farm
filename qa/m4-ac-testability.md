
## Intake notes (Oct 16, 13:06)
- Queue-leave penalty ACs: MK-27..MK-33, product/m4-manage-proposal.md §12 (Product).
- Managed/unmanaged ratio gate (1.5-2x) excludes collectible income from both arms (Product).
- TR-5 / M4 AC7 reference bot (PM Farm Upgrades owns `tr5_run.py`; QA gate = `qa/m3-scripts/ac7-tr5-gate.py` under HoP 23:15): `python3 qa/m3-scripts/ac7-tr5-gate.py --seeds 30 --scenario standard` (also still run PM's bot). Criteria: F18 17.8-21.7 min, Farm L18-L22 at 30:00; **≥29/30 seeds in band (need=ceil(0.95N), P95)**; gap **P95 ≤3.0 min and worst-seed ≤4.0 min**; level-step ratio P95 ≤2.0x and worst ≤2.25x (steps <30 s ignored). PM historical note: PASS on 36/48 (F18 18.88, L22 30/30, worst gap 1.75) under the old 80% rule. Casual/d25 diagnostic only. QA reruns after every economy.csv change; bot is at top edge L22, so watch for tip-over. Uses economy.f1.csv + 36/48 formulas until M4 columns ship.

## M4-A gate (Head of QA, 2026-10-16 ~14:00 CEST)
Scope: TR-1..TR-6, MS-1..MS-2, migration (TR-4, M4-AC-MIG1, edge cases 1–2), explainer (M4-AC-EXP1). The rest of M4 is not reviewed here.
Sources: product/m4-manage-proposal.md §2.1–2.2, §4, §6, §7; product/research/slices/upgrades.md §9 + "M4 acceptance criteria added"; art-ux/m4-tracks-explainer.md; decisions.md:148 (36/48 adopted); product/economy.m4-candidate.csv; game-rc1-ui/src/save/save.ts (SAVE_VERSION 5).

**Verdict: TESTABLE WITH CHANGES.** Nothing is blocked by a missing hook, but the AC text has to change in 9 places before kickoff. The biggest problems: TR-1 still says 30/40 while 36/48 is adopted, and TR-5 fails on the live economy.csv.

### TR-5 run (reference bot, PM Farm Upgrades)
`python3 product/farm-upgrades/m4/tr5_run.py` (or `product/farm/m4/tr5_run.py` if not moved) `--seeds 30 --scenario standard`, which by default reads economy.f1.csv with formula 36×1.30^H / 48×1.33^V and caps F+3:
- F18 median 18.88 min, 30/30 in band (18.50–19.25). L@30 median L22, 30/30 (all at L22). Gap median 1.75, 30/30, worst 1.75 min at F21. **RESULT: PASS, exit 0.**
- **F1-GAP:** economy.f1.csv already includes F1-GAP (farm_cost L17→18 = 10,185, L18→19 = 11,076). economy.f1-gapfix.csv is byte-identical to it. So this run passes **with** F1-GAP. There is no separate run "without" F1-GAP on the F1 table.
- `--csv product/economy.m4-candidate.csv` (real hens_cost/egg_value_cost columns, 36/46/60… and 48/63/84…): identical PASS, exit 0.
- `--csv product/economy.csv` (live main, pre-F1 farm_cost 16,431/22,182): **FAIL, exit 1**. F18 median 21.50 with only 16/30 in band (max 22.00). L@30 L21 PASS. Gap worst 2.00 PASS. So TR-5 passes only once F1 (with F1-GAP) is merged into economy.csv.
- Risk: every seed sits at L22, the top edge of the L@30 band. A small buff will tip it over. Rerun after every economy.csv change.

### Per-AC
| AC | Verdict | Required rewrite / note | Method | Data source |
|---|---|---|---|---|
| TR-1 | Needs change | "Cost to buy Hens L→L+1 = `hens_cost`[L] and Egg value = `egg_value_cost`[L] in economy.csv (= floor(36×1.30^L), floor(48×1.33^L), L 0–29), passed through balance.json. No cost constants in game code (grep sim/ for 1.30/1.33/36/48)." The current text (30/40) contradicts decisions.md:148. | unit (table-driven, every L) + code grep + csv_check sync | economy.csv cols hens_cost, egg_value_cost |
| TR-2 | Needs change | "With H = F + `hens_cap_over_farm` (3), the Hens Buy action is a no-op (state unchanged), the row shows the locked state with the text 'Needs Farm N+1' [exact string from Art & UX], and the same holds for V with `egg_value_cap_over_farm`. Absolute max 30. Buying Farm unlocks exactly one more level." Needs the exact lock string and a cap name that matches the csv (the README says `*_cap_offset`, the csv says `*_cap_over_farm`: pick one and update M4COLS). | unit (buy at cap) + browser script (row state + text at 360/1280) | economy.csv hens_cap_over_farm, egg_value_cap_over_farm; art-ux string |
| TR-3 | Testable as written (tighten) | Add: "customer_interval_s, demand_min/max and queue_max are read at farmLevel. Across 10 Hens + 10 Egg value buys with F fixed, sim RNG with the same seed produces an identical customer arrival sequence." | unit/sim (seeded, compare arrival logs) | economy.csv customer cols |
| TR-4 | Needs change | "v5 save at Farm F → v6: version 6, hensLevel = eggValueLevel = farmLevel, all other fields unchanged. eggsPerSec, eggPriceCents, offline rate and capacity equal the v5 values to the cent at load. v4 saves migrate through v5 to v6. Loading twice gives a deep-equal state (idempotent)." Also say whether "identical eggs/s" holds with milestones (H≥10 ×1.25 is new). Current hens/eggs_per_sec at F must equal the new Hens formula at H = F with multipliers, otherwise a migrated save changes stats. **Owner to confirm the identity holds at F ≥ 10.** | save fixtures (below) + unit | qa/m3-fixtures/saves + new v6 fixtures |
| TR-5 | Testable with change | "QA gate `qa/m3-scripts/ac7-tr5-gate.py --seeds 30` (and PM bot) against **product/economy.csv** exits 0: F18 17.8–21.7, L@30 L18–22, **≥29/30 seeds (P95 / ceil(0.95N))**, gap **P95 ≤3.0 and worst ≤4.0 min**, step-ratio P95 ≤2.0x / worst ≤2.25x." Bind to economy.csv after F1 + M4 columns merge. Risk #2 (gap) uses the HoP 23:15 P95+worst guard. | sim (CI job, exit code) | economy.csv (post-F1/M4) |
| TR-6 | Needs change | "eggPriceCents = round((1 + 0.05V)(1 + 0.12V) × grade × Grader), with V = eggValueLevel. Buying Collection no longer changes price (`collection_price_bonus` = 0 or column removed)." Today it is (1+0.05F)(1+0.12C) per upgrades §9a #14, so the AC must say Collection loses the +12%. Also name the tunable columns for 0.05/0.12 (not in csv yet). | unit (price at V 0..30, C varied) | economy.csv: add egg_value_base_step 0.05, egg_value_level_bonus 0.12 |
| MS-1 | Needs change | List the values and tunables: "eggs/s × `hens_ms_mult` 1.25/1.5/2.0 at H = 10/20/30 (inclusive, ≥); price × `grade_mult` 1.1/1.25/1.5 at V = 5/10/20; Jumbo applies only if F ≥ `jumbo_farm_gate` (15), otherwise Large ×1.25 stays. Test at H 9/10/11, 19/20, 29/30, V 4/5, 9/10, 19/20 and V20 with F14/F15." None of these columns are in economy.m4-candidate.csv yet. **Blocked until Economy adds them** (or they become formulas in balance.json, which TR-1's rule rejects). | unit (boundaries) | economy.csv (missing cols) |
| MS-2 | Needs change | "Income × (1 + `balanced_bonus`[k]) where k = highest tier with min(F,H,V) ≥ 5/10/15/20/25 → +10/15/20/25/30%. The strip reads 'Balanced farm k/5' and names the next tier's threshold and the lagging track(s)." "Shows the next tier" is UX language: give the exact strip content. Say whether the bonus multiplies sale price or eggs/s (the bot multiplies income). Columns are missing from the csv. | unit (min-of-3 boundaries, one track lagging) + browser script (strip text) | economy.csv (missing balanced_* cols); art-ux Option A |
| Edge 1 / MIG1 | Needs change | MIG1 says the refund comes "from economy.csv", but with max 30 and H = V = F no refund can occur. Rewrite: "migrationRefundCents = 0 for every v5 save under current caps. If >0 (future cap change), refund = Σ old-farm-cost delta per `refund_*` column, added once." Add a test: re-load does not double it. Name the column or drop the clause. | save fixture + unit | economy.csv (refund col TBD) |
| Edge 2 | Testable | A migrated save never exceeds a cap (trivial with H = V = F). Covered by the TR-4 fixtures. | save fixture | — |
| EXP1 | Needs change | Conflicts to resolve: (a) trigger: the AC says "first load after migration", the art spec says "first time the player opens the Upgrades/Farm tab". Pick one. (b) naming: the art spec says "Egg quality", the proposal says "Egg value". Use one. (c) the persisted flag is `seenTracksExplainer` (art spec), so name it in the AC. (d) "respects reduced motion" → "with prefers-reduced-motion: 150ms opacity fade only, no scale". (e) "non-blocking" → "the tick advances and a Collect tap registers while it is visible". (f) shown "only to migrated saves" means a fresh v6 save has seenTracksExplainer absent and is never shown. The AC must say what decides that (e.g. `migratedFrom` < 6). | browser script (Playwright: load v5 fixture, assert bubble, tap Collect behind it, reload → absent, reduced-motion emulation, 360/1280) + telemetry `save_migrated` {from,to} | art-ux/m4-tracks-explainer.md; v5 fixtures |

### Migration fixtures needed (QA builds them; Engineering confirms the schema)
Existing: m1-rc2-v4-12min.json, m2-rc1-v5-12min.json, m2-rc1-v5-40min-edge.json, plus corrupt-*.json.
New (qa/m4-fixtures/saves, SHA256SUMS):
1. v5 F0 C0, fresh (min). 2. v5 F3, w1 hired, mid-run. 3. v5 F10 (milestone boundary H10 ×1.25: identity check). 4. v5 F15 (Jumbo gate) and F20 (V20/H20). 5. v5 F30 max (cap/refund path). 6. v5 with coins near 2^53 cents and big coop/basket (big numbers: no precision loss, no float). 7. v5 with customers queued mid-order + a worker tired/asleep/paused (state carried over). 8. v5 saved with offline time pending (offline must use hensLevel after migration, §9a #13). 9. v4 F8 → v5 → v6 chain. 10. Already-v6 mid-track states (H = F+3, V < F, F > H) to check load/validator round-trip and NUM_FIELDS max checks. 11. Corrupt v6 (hensLevel > farmLevel+3, negative, string) → validator rejects/clamps per spec (Engineering to state which).
Checks per fixture: version 6; field mapping; eggs/s, price, capacity, offline equal to the cent; refund 0; `save_migrated` {from:5,to:6} fires once.
- **Idempotency:** migrate → save → load → deep-equal. Run migrate(v6) as a no-op. Refund and explainer are never applied twice.
- **Rollback:** a v6 save loaded by the rc1 (v5) build must not be silently wiped. Today corrupt-version-99 shows the current behaviour for an unknown version. Required: the v5 build refuses it and keeps the raw save (backup key `save_v5_backup` written before migrating), so a rollback restores progress. **Needs an Engineering decision + AC** (none exists).

### Required changes and owners
1. TR-1 → 36/48 + column names. Owner: Head of Product / PM Farm Upgrades.
2. TR-5 bound to economy.csv after F1 (with F1-GAP) + M4 columns merge. Owner: Economy/Balance Designer (merge), PM Farm Upgrades (AC text).
3. Cap column name unified (`*_cap_over_farm` vs `*_cap_offset`) + exact lock string. Owners: Economy + PM Farm Upgrades; Art & UX for the string.
4. MS-1/MS-2 multipliers, thresholds, Jumbo gate, and balanced tiers as economy.csv columns + exact strip text. Owners: Economy (columns), PM Farm Upgrades (AC), Art & UX (strip).
5. TR-6: Collection loses +12%, columns for 0.05/0.12. Owner: Economy + PM Farm Upgrades.
6. TR-4: confirm the stat identity at F ≥ 10 with Hens milestones. Owner: Economy; Engineering for the migration code.
7. MIG1 refund clause: name the column or state that it is always 0. Owner: PM Farm Upgrades.
8. EXP1 trigger/naming/flag/reduced-motion wording. Owners: PM Farm Upgrades + Head of Art & UX.
9. Rollback/backup AC for v6→v5. Owner: Head of Engineering.

## Version correction (Engineering, Oct 16 13:47)
- main is at SAVE_VERSION 6 (wageFracCents), so M4-A is v6->v7. Backup = v6 save before migrating. Rollback test = rc1 (v6) build opens a v7 fixture -> refused, not wiped, backup kept.
- rc1-pt1 may be v5: test it with a fixture one version above whatever it reports (Engineering is sending the version).
- Fixture list: rename the "v4/v5/v6" chain to v4->v5->v6->v7; the new-format saves are v7.

## TR-4 final (Product, Oct 16 13:47)
- After migration, eggs/s and price are >= pre-migration at every Farm level. Exact match at F<10 applies to eggs/s only (price rises because the +12% moves to Egg value).
- Source fixtures v5 and v6, migrated to v7 (v5 goes via v6). Levels F0/3/10/15/20/30. TR-4 now testable.

## TR-4 rev 2 (Product, Oct 16 13:50) - supersedes "TR-4 final"
- Migration sets Hens = F, and Egg value = the lowest V whose price >= the v6 price (not H=V=F).
- Checks: eggs/s and price >= v6 at every F; Hens == F; V is minimal (V-1 would give price < v6); first-minute income after migration <= 1.5x v6 at F10, F15 and F20.
- MS-1/2 columns are now in product/economy.m4-candidate.csv, so MS-1/2 are unblocked for test design (still need the economy.csv merge before running in a build).

## M4-A re-review (Head of QA, 2026-10-16 ~14:00 CEST)
Against: product/farm-upgrades/m4a-spec.md (or product/farm/m4a-spec.md if not moved) v1.0 (changelog "QA M4-A gate fixes applied"), upgrades.md, tr5-README.md, tr5_run.py, m4a-eng-addendum.md (now just a pointer to the spec), economy.m4-candidate.csv (31 rows), and the later notes above (v6→v7, TR-4 rev 2, MS columns).

**Verdict: GATE NOT YET PASSED. 3 small spec/data items remain plus the M4A-31 rollback text (Engineering, due 18:00).** Fixes 2, 3, 5, 7 and 8 are closed, and 1 and 4 are closed for this gate. TR-5 passes.

### Gate fixes 1–9
| # | Status | Evidence |
|---|---|---|
| 1 TR-1 36/48 | Closed | M4A-1 uses hens_cost/egg_value_cost; csv L0 36/48, L1 46/63; grep rule stated. |
| 2 TR-5 binding | Closed | M4A-35/36: bot + QA `ac7-tr5-gate.py`, `--csv economy.m4-candidate.csv`, **29/30 (P95) + worst gap ≤4 min**, rebind to economy.csv after O1. |
| 3 Cap names + lock text | Closed | M4A-2 `*_cap_over_farm` (csv = 3; tr5_run.py reads the same names), "Needs Farm L{n}", "MAX". |
| 4 MS columns + text | Closed for test design | All named columns exist with values (below). Toast text is in M4A-12. Strip text sits in M4A-17ff (Art & UX). Running in a build still needs O1/O3 merge into economy.csv. |
| 5 TR-6 / Collection +12% | **Open: column names** | See TR-6 below. |
| 6 TR-4 identity | **Open: fixture V and the 1.5× criterion** | See TR-4 below. |
| 7 MIG1 refund | Closed | M4A-29: refund 0 for every save, guard tested with a lowered-max fixture table, applied once. |
| 8 EXP1 | Closed | M4A-33: first load after migration (pre-version < 7), "Egg value", `seenTracksExplainer` set on show, tick + Collect tap work while it is shown, reduced motion = 150 ms opacity fade only. |
| 9 Rollback | **Open: owned by Head of Engineering, AC text due 18:00** | M4A-31 is a placeholder. QA test once written: the rc1 (v6) build opens `m4-v7-*` → refused, not wiped, v6 backup kept. |

### TR-6 price formula
- `(1+0.05V)(1+0.12V)` is **not a typo**. It is the intended M4 formula: both terms move to Egg value V (M4A-5, M4A-15, upgrades.md §7.1 line 210, proposal §4). The old v6 formula `(1+0.05F)(1+0.12C)` is what migration has to match against.
- **Name mismatch (RESOLVED 13:58: Economy renamed the csv columns to `egg_value_base_step`/`egg_value_level_bonus`, verified in the candidate csv):** the spec (M4A-5, M4A-15, O3) and upgrades.md name `egg_value_base_step` and `egg_value_level_bonus`. The candidate csv has `egg_value_price_per_level` = 0.05 and `egg_value_collection_bonus_per_level` = 0.12, and G1 cites the csv name. The values match; the names don't. Also, "collection_bonus" in a V-driven column contradicts M4A-15.
- Required: one set of names in both places. QA recommends the spec names. Owners: Economy (csv) + PM Farm Upgrades (spec G1 line).

### TR-4 rev 2 (M4A-28): CORRECTED 13:58 (QA was wrong, Economy is right)
- Cause: my first calculation left out the **Balanced-farm multiplier**, which is part of the v7 price per M4A-5 (base × grade × Balanced × Grader). After migration H = F and V ≤ F, so min(F,H,V) = V and Balanced ×1.10 applies from V5 and ×1.15 from V10. Without it every V came out 1–3 levels too high. It was not an off-by-one: my "V−1" figures (2.732 / 4.125 / 5.695) were real V−1 prices *without* Balanced, and they sit right next to the v6 prices (2.760 / 4.270 / 6.080). Comparison: v7 cents ≥ v6 cents, Grader off on both sides, v6 = f1 `egg_price`[F] × (1 + `collection_price_bonus`[C]), v7 from candidate `egg_value_base_step`/`egg_value_level_bonus`, `egg_grade*`, `balanced*`.
- Final table (recomputed; matches Economy):
  - F10: C2–5 → V5, C6 → V6, C7–8 → V7, C9–10 → V8. C7: $2.76 → $3.01 (V6 $2.71 < v6).
  - F15: C8–9 → V9, C10–14 → V10, C15 → V11. C12: $4.27 → $4.74 (V9 $3.65 < v6).
  - F20: C12–13 → V11, C14–15 → V12, C16 → V13, C17–18 → V14, C19–20 → V15. C17: $6.08 → $6.55 (V13 $6.07 < v6).
- So "F10 → V7, F15 → V10, F20 → V14" is right at **C = F−3** (C7/C12/C17). Remaining ask: the AC/fixtures state C (and Grader off), i.e. "F10/C7 → V7, F15/C12 → V10, F20/C17 → V14". Owner: PM Farm Upgrades.
- Test oracle must read the csv columns, including Balanced (QA's checker fixed).
- **First-minute income ≤ 1.5× v6 at F10/F15/F20 is NOT in the AC.** M4A-28 has only the rationale "×1.23–1.37" (line 164). Required: add a TR-4 check line, "first 60 s income after migration ≤ 1.5 × v6 income at F10, F15, F20 (sim, same seed, Grader state unchanged)". Owner: PM Farm Upgrades. Method: sim on fixtures (m4_sim / unit tick harness).
- The "never lower" check at F0/5/10/15/18/20/29/30, Hens == F, minimal V (V−1 < v6), and the idempotent second load are all testable as written.

### MS-1/MS-2 columns (candidate csv, same value on every row)
hens_ms1..3_level/mult 10/20/30 · 1.25/1.5/2.0; egg_grade1..3_level/mult/farm_gate 5/10/20 · 1.1/1.25/1.5 · 0/0/15; balanced1..5_level/mult 5..25 · 1.10/1.15/1.20/1.25/1.30. **All present.** Note: the spec still calls them "proposals until Economy publishes them" (§3). That clears once O3 merges them into economy.csv.

### TR-5 rerun on candidate
`tr5_run.py --csv product/economy.m4-candidate.csv --seeds 30 --scenario standard`: F18 median 18.88 (30/30, 18.50–19.25); L@30 L22 (30/30); worst gap 1.75 at F21. **PASS, exit 0.** Still at the L22 top edge (R2/O9).

### Updates to my gate section (supersede it)
- Migration is **v6→v7**. Fixtures are renamed **`qa/m4-fixtures/saves/m4-v7-*`**, e.g. `m4-v7-from-v6-F0.json`, `-F3`, `-F5`, `-F10-C7`, `-F15-C12`, `-F18`, `-F20-C17`, `-F29`, `-F30`, `-bignum`, `-midorder-workers`, `-offline-pending`, `-chain-v4-v5-v6`, `-midtrack` (already v7), `-corrupt`, plus a lowered-max table fixture for the refund path. SHA256SUMS updated.
- Telemetry check: **`save_migrated {from:6, to:7, refund_cents, farm_level}`** fires once. For a v4/v5 chain, Engineering to confirm whether it fires once with the original version or only for the 6→7 step.
- Rollback = rc1 v6 build vs v7 fixture, with the v6 backup kept (per M4A-31 once written).

### Remaining items
1. ~~TR-6 column names~~ resolved (csv renamed). Only spec G1 line still cites the old name. Owner: PM Farm Upgrades.
2. TR-4 fixtures must state C (and Grader off): F10/C7→V7, F15/C12→V10, F20/C17→V14 (Economy values confirmed). Owner: PM Farm Upgrades.
3. Add the first-minute ≤1.5× v6 at F10/15/20 check to M4A-28. Owner: PM Farm Upgrades.
4. M4A-31 rollback AC text. Owner: Head of Engineering, due 18:00 today.
Not gating for testability, but needed before running in a build: O1/O3 economy.csv merge (Economy), O4 follow-the-highlight bot for M4A-40 (PM Farm Upgrades + Economy).


## HoP 23:15 AC7 threshold standard (Economy doc 2026-10-16, applied by QA)
Source: `product/ac7-qa-threshold-changes.md`. QA-owned executables (do not edit Eng `pacing.test.ts` / `f1-pacing.ts`):
- `qa/m3-scripts/ac7-tr5-gate.py` — TR-5 P95 / worst-gap≤4 / L18–25 abs≤8 min; L18–29 step-ratio WARN-only (prev≥1 min); HARD ratio from L30+
- `qa/m3-scripts/ac7-l18-25-gate.mjs` — L@30 P95 band + L18-25 step P95≤6 / worst≤8 (sibling to f1-pacing.ts)
- `qa/m3-scripts/ac7-active-idle-gate.py` — 2× active/idle P95≤2.0 (F22-24 P95≤2.15), worst≤2.25
- `qa/m3-scripts/ac7-fh3-gate.sh` — AC-FH3 casual first-hire nudge (≥30 seeds)
PM still owns `product/farm/m4/tr5_run.py` (still on the old 80% rule until they land the same change).
