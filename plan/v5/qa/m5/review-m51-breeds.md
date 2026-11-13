# Testability review: M5.1 Chicken breeds (m5.1-breeds-spec; telemetry review v0.1 → rev. 7, full review at rev. 3.8.2 on 2026-10-25 01:50, see the end)
Head of QA · 2026-10-24 17:58 CEST (UTC+2) · paper only (no repo, build or messages)

- **Spec:** `product/m5.1-breeds-spec.md` Draft v0.1 (rev. 4, 17:45), sha1 `510d9f0a472faaf2b12aa05948c9da40a47bbacf`. Checked with sha1sum: **match**. Owner PM Collection (D-HOP-2026-10-24-26 #1).
- **Scope:** §8 telemetry (new `breed_revealed`, `breed_slotted`, `flock_complete`; reuse of `upgrade`; extensions of `offline_grant`, `session_end`, `save_migrated`) and BR-AC27, read against `product/collection/telemetry-spec.md` (T-AC9 allowlist, `isPinned`, 200 KB pinned cap, `session_summary`). Gameplay ACs were only skimmed.

## Verdict: telemetry **TESTABLE WITH FIXES** (M5.1, does not affect M5.0)
The event set is the right size. BR-AC27 checks presence only, though. Triggers, de-dup and field units are missing for 4 of the 6 rows, and one field (`elapsed_since_unlock_s`) can't be computed from the saved state.

## Findings
| # | Event / field | Problem | Proposed fix (wording) |
|---|---|---|---|
| T1 | `upgrade{track:"hatch", cost_cents, …}` (reuse, pinned) | The existing `upgrade` schema uses `upgrade` (collection\|farm), `newLevel`, `cost` and `coinsBefore`, with `is_first_upgrade` and `taps_before` added (telemetry-spec §2). `track` and `cost_cents` are new names on a pinned event, so the T-AC9 schema would reject them, or two shapes would coexist. Also not defined: whether the free hatch counts toward `is_first_upgrade` and TTFU (M2), and whether a failed press (BR-R7, coins < cost) emits anything | "Emit `upgrade{upgrade:"hatch", newLevel:hatches, cost, coinsBefore, breed_id, rarity, pity_before, free, farm_level}` once per **started** hatch, from the frame that charges. A failed press emits nothing. Hatch upgrades never set `is_first_upgrade` and are excluded from TTFU." Or choose a new event `hatch_started` (ring) and leave `upgrade` alone |
| T2 | `breed_revealed` | The trigger is ambiguous for offline completion: the reveal happens in the grant step, but the card is queued behind welcome-back. `wait_ms` has no clock (sim? wall? includes the offline span?) | "Emitted once per hatch on the frame `remainingMs` ≤ 0 (in the grant step if offline, `offline:true`), not when the card is shown. `wait_ms` = sim ms from start to reveal, offline span included. Exactly 1 per started hatch; a reload mid-incubation never emits." Test: 1 hatch with a reload plus 1 offline hatch → 2 events, 0 duplicates |
| T3 | `breed_slotted` | Not defined: which placements emit (manual place, a move between slots per BR-R3, the auto-slot on reveal per BR-R11, sanitise-on-load nulling per E10/E12), whether a move is 1 or 2 events, whether a same-slot no-op emits, and whether `loadout` counts settling breeds. Free, cooldown-less swaps can flood the ring | Add `cause` (manual\|auto_reveal\|move). A move = 1 event (`slot` = destination, `prev_slot`). A no-op emits 0. Sanitise emits 0, because `save_migrated` covers it. `loadout` = slotted family counts, settling included, plus a `settling` count. Coalesce to ≤ 1 per slot per 1 s sim with `count` (the TEL-14 pattern). Test: 20 swaps in 10 s → Σcount = 20, ≤ 10 events per slot |
| T4 | `flock_complete` (pinned, "once per save") | No saved flag makes "once per save" survive a reload. `elapsed_since_unlock_s` needs an unlock time, but §6 saves none, and BR-R8 says there's no saved absolute sim clock | Add `breeds.flockCompleteLogged: 0\|1` (or emit only on the completing reveal's transition and say so). Replace `elapsed_since_unlock_s` with `hatches` + `farm_level` + `session_index`, or add a saved `unlockFgMs`. Add `flock_complete` to `isPinned`, schema.ts and `session_summary.counts` |
| T5 | `session_end` breed fields | No units or rounding for `breed_present_eggs`/`breed_away_eggs` (fractional sim eggs). No rule for which session owns `breed_away_eggs` (the grant lands at the next session start). The KPI "no family > 70 % of slotted sessions" can't be computed from ring-trimmed `breed_slotted` | "Integer eggs, floor per session. Away eggs belong to the session in which the grant is applied. Add `breed_loadout_end` (family counts at session end) and `breed_family_s` (seconds settled per family)" |
| T6 | Flag off / schema | BR-AC1 covers sim traces only. With `m4.flags.breeds` off it's unstated whether the breed `session_end` fields are absent or 0. `save_migrated.reason:"breeds_sanitised"` must be added to the reason enum | "Flag off: 0 breed events, and breed `session_end` fields absent (not 0). All new names and enum values are in schema.ts (T-AC9). The breeds-sanitised event is logged once per load" |
| T7 | BR-AC27 | Checks that fields are non-null, not their values or de-dup | Extend: exact counts for T2–T4 above, `broody_cents ≥ breed_broody_cents ≥ 0`, Σ`upgrade{hatch}`.cost = `breed_spend_cents`, and a pinned-store growth bound (≤ 25 hatch upgrades + 1 flock_complete per save) |

## Answer to Q-HoE-2 (new names vs reuse)
New names `breed_revealed`, `breed_slotted` and `flock_complete` are **OK from QA**, provided T2–T4 are applied. Reusing `upgrade` is OK only with the existing field names (T1).

## Re-check, 2026-10-24 18:14 CEST (UTC+2): spec rev. 6 → on disk rev. 7
- **Hash:** requested rev. 6 sha1 `a03854392cff303f426a0720c2e95227f8cf7d0d` is **not on disk**. `sha1sum` gives **`c045a0dab2b60d1c7e3df949b8b0269bf3279eb2`**, i.e. **rev. 7** (18:05). Per the changelog, rev. 7 = rev. 6 + HoE `sinceUnlockMs` closure (BR-AC2b extended, new BR-AC2c) + Art copy ACs (BR-AC31a/b). The rev. 6 telemetry text (T1–T7) is unchanged in it. **This re-check is of rev. 7.**
- **Verdict: telemetry TESTABLE, with 3 small fixes (N1–N3).** None of them blocks the rev. 7 paper set. The M5.0 telemetry envelope dependency (`sid`/`fgMs`, `session_end` payload; HoE §2) remains a precondition.

| Fix | Status at rev. 7 | Evidence |
|---|---|---|
| T1 `hatch_started` (`cost`/`coinsBefore`, not TTFU, failed press emits nothing) | **In** (new pinned event; no `track`/`cost_cents`; replaces the `upgrade` reuse per HoE R1) | §8; BR-AC27 bullet 1 |
| T2 `breed_revealed` at completion, incl. the offline grant step | **In** (`revealHatch` tick or `applyOffline`, `offline:true`; not on card show; `wait_ms` = sim ms incl. the capped offline decrement; 0 after reload) | §8; BR-AC27 bullet 2 |
| T3 `breed_slotted` cause / prev_slot / coalescing + count | **In** (`cause` manual\|auto_reveal\|move; move = 1; no-op = 0; sanitise = 0; ≤ 1 per slot per s, last state wins, `count`) | §8 |
| T4 `flock_complete` once via `flockCompleteLogged`, pinned | **In** (saved flag in §6, `isPinned` + schema + `session_summary.counts`; BR-AC27 "exactly 1 after 2 reloads") | §6, §8 |
| T4b `elapsed_since_unlock_s` from saved `sinceUnlockMs` | **In and no longer pending:** HoE closed it at rev. 7 (optional v6 field, telemetry-only, frozen after `flock_complete`, BR-AC2b/BR-AC2c) | §6, §14 |
| T5 `session_end` integer eggs, `breed_loadout_end`, `breed_family_s`, absent when the flag is off | **In** (floor per session; away eggs go to the session that applies the grant) | §8; BR-AC27 |
| T6 `save_migrated` shape | **In**, changed to the existing shape `{migration:"breeds_sanitise", from:6, to:6}` (no `reason` key), used consistently in E12, §8 and BR-AC26 | – |
| T7 BR-AC27 exact counts | **Mostly in** (see N2) | BR-AC27 |

### New or still-open items
| # | Issue | Fix |
|---|---|---|
| N1 | **Duplicate AC ID:** two different ACs are both named **BR-AC2c** (the `sinceUnlockMs` save/telemetry AC and the R4 four-argument `step()` AC), so traceability breaks | Renumber the R4 AC to BR-AC2d (and cite it in §0/§14) |
| N2 | **BR-AC27 isn't fully exact for `breed_slotted`.** (a) "coalesced swaps ≤ 1 (count = 5)": 5 swaps inside 1 s can straddle a window boundary and give 2 events unless the window anchor is defined. (b) "+ auto_reveal per BR-R11" depends on whether a slot is empty at each reveal, and the script doesn't say. (c) For a coalesced event, "last state wins" doesn't say whether `prev_slot`/`prev_breed_id` come from the first or the last merged change | (a) "The window opens at the first change for that slot and lasts 1,000 ms of sim time, so the 5 swaps give exactly 1 event with `count` 5". (b) Fix the script's slot state ("slots 0–1 full, slot 2 empty at the online paid reveal → exactly 1 auto_reveal"). (c) "`prev_*` = the state before the first merged change; the other fields are from the last" |
| N3 | **`sinceUnlockMs` origin for existing saves:** "+100 per tick from unlock", but saves already past F10 when M5.1 ships start counting at the first flag-on load, not at the real unlock. `elapsed_since_unlock_s` is then understated for upgraders | State it: "Counts from the later of the F10 crossing and the first flag-on load; saves already ≥ F10 at first flag-on load emit `flock_complete.unlock_backfilled:true`" (or drop those saves from the KPI) |
| Note | `breed_slotted.loadout` counts settling breeds, but `session_end.breed_loadout_end` counts only settled ones. That's intentional per §8, and QA tests each as written | – |

### QA case additions (for the M5.1 plan when written)
- Coalescing: 5 swaps in 0.9 s → 1 event, `count` 5. Swaps at 0.0 s and 1.0 s → 2 events. Σcount always equals the number of changes.
- `sinceUnlockMs` frozen: after `flock_complete`, 600 s online + 1 h offline → unchanged. Values 0 vs 10⁹ → identical sim traces and Best buy picks (BR-AC2c).
- `save_migrated{migration:"breeds_sanitise"}` once per load, and 0 on a clean save.

## Re-check, 2026-10-25 01:50 CEST (UTC+2): full testability review, spec v0.2 rev. 3.8.1 → on disk rev. 3.8.2 ([QA-D-1025-BREEDS381])
Head of QA · paper only (no build, no messages). Requested by PM Collection as a kickoff gate (HoP approved design and numbers, D-HOP-2026-10-25-03). Method: design-doc-review lenses (completeness, consistency, boundary values, AC testability), run by QA alone.

### Hash check
- Requested rev. 3.8.1 sha1 `2ad4af1d59c30cadc28ec8c351cf9e4c74593585`: **matched at 01:46** (first `sha1sum`).
- At 01:47 the file changed under review to **rev. 3.8.2, sha1 `fd5235bf97ffc6b65ad98d469648fda02af3e3b0`** (still the same at 01:50). Its changelog says it's "from rev. 3.8.1 sha1 `2ad4af1d…`", citation only: BR-R12c's UI spec of record re-pointed to `art-ux/m5.1-breeds-ui.md` v0.2.6 (SIGNED 01:47, sha1 `2b2bda86…`, verified on disk), plus the §14 note and status line. "No requirement, AC or number changed." No copy of 3.8.1 was kept, so QA can't diff it byte for byte. **QA reviewed 3.8.2 (`fd5235bf`), snapshot at `/workspace/snap/breeds-fd5235bf.md`.** The verdict applies to 3.8.2, and to 3.8.1 too if the changelog's citation-only claim is true.
- Other pins checked: telemetry-spec `381b3e80…` (matches QA's sign-off); UI v0.2.6 `2b2bda86…`; pinned CSV `scratch/v2-econ/economy.m50-draft.csv` sha256 `8dc90e2b…` (matches); Econ draft `scratch/m51-econ/economy.m51-draft.csv` sha256 `ad27fe73eab91b5ae0005b719d9822fb063f3a2d1561cfc917e853e1f4d7d477` (written 01:47, **not yet pinned by the spec**).

### Verdict: **NEEDS FIX: two one-line AC fixes (BR-AC53, BR-AC52c). Once they're in, it's TESTABLE.** Everything else is testable as written. The design isn't questioned, and no number changes.

### Earlier QA items: all closed
| Item | Status at 3.8.2 | Evidence |
|---|---|---|
| T1–T7 (17:58 telemetry review) | Closed (closed at rev. 7, and still in the text) | §8; BR-AC27 |
| N1 duplicate BR-AC2c | **Closed**: renumbered BR-AC2d; no duplicate AC IDs left (scripted check over §11; BR-AC37–44 withdrawn, numbers not reused) | §11 |
| N2 BR-AC27 coalescing anchor, slot script, `prev_*` source | **Closed**: window opens at the first swap; slots 0–1 full / 2 empty; `prev_breed_id` from before the first swap; 0.0 s/1.0 s control gives 2 events | BR-AC27 |
| N3 `sinceUnlockMs` backfill | **Closed**: `sinceUnlockBackfilled`, `flock_complete.backfilled`, KPI exclusion | BR-AC2e, E12 |
| testability-gaps.md / decisions.md | No other open breeds gaps (only the [QA-D-1024-M5READY] queue note, now done) | – |

### New items (3.8 / 3.8.1 / 3.8.2)
| Item | Finding | Result |
|---|---|---|
| **E22c + BR-AC31e** | The note shows **iff** the default-income `secondsToAffordSteady` ≤ 2 × `bc_hatch_cost_s` (90 s, inclusive per BR-R7b), whatever the `assumeWorking` ETA. Both directions have fixed examples (85/95 shows, 95/85 doesn't). A Farm-first divergence is recorded, not failed. Asleep and unpaid are separate cases, and both ETAs are logged. **Nothing depends on Econ's 0/4,600 as a guarantee**: BR-R7b and E22c both say it is measured, not guaranteed by the code. The one weak point is the "no divergence reachable" escape: if neither asleep nor unpaid can be driven to divergence, the iff bullet is never exercised (see R-B4) | **Testable** |
| **BR-AC46b** | The boundary is defined: a stamp counts while `focusMs − t < 10000` and drops at age ≥ 10000, so the window is half-open (focusMs − 10000, focusMs]. Unit values 10,999 closed / 11,000 open / 11,001 open; uneven frames at 10,950 → 11,030; a tap on the drop tick keeps 6 (no lost++ or pop); ring capacity 6 vs 64. Hand-checked against BR-AC46/47/52b/53: consistent | **Testable** |
| **BR-AC52b** (pop cap) | Scripted sequence hand-checked: gate closes at 5, opens at 10; closes at 10.5–14.5 and opens at 11–15; repeats at +30. That's 12 returns and exactly 2 pops (10, 40), all measurable. Two non-blocking gaps: (a) the cap's boundary at exactly 10,000 ms isn't defined ("no pop started in the last 10,000 ms", UI v0.2.6 L178/UI-BR-19); the script never hits it; (b) "wall time = focus time" needs a controlled clock in the UI test (see R-B2) | **Testable** |
| **BR-AC52c** (label-in-name) | The chip is exact ("+3% active"/"+3% paused", no aria-label, description strings exact), and the slot-card mirror is measurable. **The Hatch bullet fails a literal reading**: visible text `Hatch · $125.1K`, but per BR-AC31/UI-BR-4 the name contains `fmtMoneyAria(cost)` = `$125,087.85` (format.ts:120-121, `fmtMoneyExact` below 1e15 dollars). So "starts with the visible text" fails, yet the AC says it "passes". The operative rule is UI v0.2.6 UI-BR-23: "Hatch's name starts with `Hatch · `". The spec doesn't say that, and names no engine | **NEEDS FIX (F-1)** |
| **E22b** (+ BR-AC49 rev. 3.7 bullet) | Boundary defined: ≥ 60 s → the ring is empty; 59.9 s → held; 60 s and 10 min → empty. That matches code `game.ts:359-363` (`gap = at − h.at`; `gap < offlineMinSeconds × 1000` takes the live path, so exactly 60,000 ms takes the snapshot path). **The clock isn't named in the spec.** The code uses the Game's injected `now()` (Date.now by default, `game.ts:48`), which is wall time, not focus or sim time. It's unambiguous because there's only one hidden-gap clock, so this isn't blocking (R-B1) | **Testable** |
| **K10** | It's a known-limit process rule, not an AC. **The trigger isn't mechanically checkable as written**: "any change that adds active coins at F20–29" names no files or columns, no owner, and no CI gate. B4 itself is reproducible (pinned harness `g1tap.ts f7a1138b`, `m5tap.ts b7ee9c81`, `h/breeds.ts 10b5d105`, seeds 1–200, 8dc90e2b). Not blocking for kickoff (R-B3) | Process fix recommended |
| **CSV names** | `bc_present_calm_w_s` = 10 and `bc_present_calm_k` = 6 **exist** in Econ's draft `economy.m51-draft.csv` (`ad27fe73…`, columns 183–184, 31 level rows, constant). All 32 `bc_*` columns there match §5/§4.3 values exactly (incl. lt18 700, broody cap 2000, the 8 trait bps). Its first 152 columns are cell-identical to the pinned `8dc90e2b`. The live `product/economy.csv` has no `bc_*` (expected; the spec says so). The names match across the spec (§5, BR-R12b, AC symbols, B6), telemetry-spec `381b3e80` L226/L236 and UI v0.2.6 L163. The old names appear only in changelog or retired-history lines | **Consistent**; pin the draft (R-B5) |

### Required before TESTABLE (blocking, text-only)
| # | AC | Reason | Suggested fix |
|---|---|---|---|
| F-1 | **BR-AC52c**, Hatch bullet | "passes the starts-with rule" can't be judged: the build's name holds `fmtMoneyAria` ("$125,087.85"), so it doesn't start with the visible "Hatch · $125.1K". The real rule (prefix `Hatch · `) is only in UI-BR-23. No engine or tool is named | "Hatch: the computed name starts with `Hatch · ` and contains `fmtMoneyAria(cost)` (UI v0.2.6 UI-BR-23); no aria-label reorders it. All BR-AC52c names are read with Playwright `accessibility.snapshot` at 360 and docked 1280 in Chromium, Firefox and WebKit, and axe reports 0 `label-content-name-mismatch` and 0 `nested-interactive`" |
| F-2 | **BR-AC53**, last bullet | "Both are integers" contradicts §8 L672 and HoE Q-COL-9 (`present_active_s` is a number rounded to 0.1 s, `round(ΣfT/100)/10`). A correct build that reports 12.3 would fail. 660.0 only passes by coincidence | "`present_active_s` is a number with at most 1 decimal (×10 is an integer), `present_lost_count` is an integer, and both pass T-AC9." Add one non-integer case, e.g. a session ending 0.05 focus-s after an open tick gives `x.1` per the half-up rule. Also (record-only, PMC): telemetry-spec `381b3e80` L226 still says "(integers)", superseded by its own L231 |

### Recommended (non-blocking; fold into the next rev.)
- **R-B1 (E22b, BR-AC49):** name the clock: "hidden span = `Game.now()` at show − at hide (wall ms, injectable); the ring is emptied iff span ≥ 60,000 ms (= `offlineMinSeconds`)". Test at 59,999 / 60,000 ms with an injected `now`, not real timers.
- **R-B2 (BR-AC52b / BR-R12c):** define the cap as "a pop may start iff no previous pop, or `performance.now() − lastPopStart ≥ 10000`". Add a boundary case: returns at 10,000 and 19,999 ms after a pop give 1 pop, and at exactly 10,000 ms give 2. Run the UI test under a controlled clock (Playwright `page.clock`) so wall time equals focus time.
- **R-B3 (K10):** make the trigger mechanical. For example: any PR or CSV change touching `tc_*` / `bc_*` columns, or streak / tap-coins / Broody / golden / breeds sim code, runs B4 on the pinned harness. It blocks if g1max at 0.27 > min(no-breeds at 0.28, Present-only at 0.28) at two decimals, rounded half-up. HoE owns the CI lane, Econ the harness.
- **R-B4 (BR-AC31e):** if the fixture can't reach divergence for asleep **and** unpaid, the iff bullet must still be run on a test hook that sets the two incomes, so the AC can't pass with nothing exercised.
- **R-B5:** pin `scratch/m51-econ/economy.m51-draft.csv` sha256 `ad27fe73…` in §5/Sources (and BR-AC22b's column read) once Econ calls it the draft of record.

### Record-only nits (no action needed for the gate)
- RB-1: BR-AC22 still says "Status: FAILS at the current values … Pending Econ tunable fix". That's intentional (the block is byte-identical), and the note under it plus BR-AC45 B4 PASS supersede it. Test against BR-AC45.
- RB-2: §14 Q-COL-16 "Per Art 23:34 … its name is the visible `+X%`" and the old Art line "Fit at 360 is pending the v0.2.5 diff" are stale (superseded by 23:40 and the v0.2.5 sign-off).
- RB-3: BR-AC49 held cases: "opens 4.0 focus-s later" implies the gap starts at `focusMs` = 6,000. Say so.
- RB-4: BR-R1 still cites UI "v0.2.2" while BR-R12c cites v0.2.6 (UI doc wins anyway).
- RB-5: the spec changed during the review (3.8.1 → 3.8.2, 01:47). Future gate requests should name the rev. on disk.

### Scope signal
M. 64 ACs, mostly sim-level with fixed scripts. UI a11y needs 3 engines, and the Eco ACs reuse Econ/PMFU runs.

### Addendum 2026-10-25 01:53 CEST (UTC+2): verdict recorded against rev. 3.8.2 `fd5235bf`
- **sha1 of rev. 3.8.2:** `fd5235bf97ffc6b65ad98d469648fda02af3e3b0` verified (01:46–01:53; unchanged). Rev. 3.8.1 `2ad4af1d…` matched at 01:46, before the overwrite.
- **Diff 3.8.2 vs 3.8.1: NOT POSSIBLE.** No copy of 3.8.1 exists on the box. The spec was overwritten in place at 01:47 with no backup, and a search for files hashing to `2ad4af1d` or `429cab34` found none. What I can confirm indirectly:
  - In 3.8.2, the 3.8.2-specific text shows up only at L3 (status), L41 (changelog) and L414 (BR-R12c citation).
  - PMC's log `product/decisions.md` L1054 (D-COL-2026-10-25-03) says the same thing: "UI citation re-pointed".
  - The no-other-change claim is therefore **PM-asserted, not QA-verified.** It doesn't affect the verdict: QA reviewed every AC on the 3.8.2 text itself, so the verdict stands on `fd5235bf` whatever changed.
- **UI v0.2.6 `2b2bda866b8dd1837c01c2b16f527391b1baf64b`:** exists, and the sha1 of `art-ux/m5.1-breeds-ui.md` matches. Its header reads "v0.2.6 SIGNED HoAUX 2026-10-25 01:47 CEST, against breeds rev. 3.8.1 `2ad4af1d`". `art-ux/decisions.md` L360 logs "01:47 · HoAUX · breeds-ui v0.2.6 SIGNED (sha1 2b2bda86…), text only vs v0.2.5 620d8feb". **Confirmed signed.** Note that the signature names rev. 3.8.1, not 3.8.2; the only difference is that 3.8.2 cites it.
- **Verdict on `fd5235bf`: NEEDS FIX (F-1 BR-AC52c, F-2 BR-AC53, text only), then TESTABLE.** R-B1…R-B5 recommended; RB-1…RB-5 record only (see above).

## Re-check, 2026-10-25 01:58 CEST (UTC+2): rev. 3.8.3 `82f99d6f` → rev. 3.8.4 `2eb03046` ([QA-D-1025-BREEDS383], [QA-D-1025-BREEDS384])
Head of QA · paper only, no messages.

### Hashes and snapshots (in `/workspace/snap/`)
- Breeds rev. 3.8.3 `82f99d6fce6462c075e3741d59a899ab4d5f615d`: **match** at 01:57 → `breeds-82f99d6f.md`.
- Telemetry-spec `f077899fab6bd925764e3714b91951133614335a`: **match** at 01:57 → `telemetry-f077899f.md`.
- Breeds rev. 3.8.4 `2eb0304619ff5faf5ab101cdb1f3f2588c8d35b4`: **match** → `breeds-2eb03046.md`.
- UI `art-ux/m5.1-breeds-ui.md` `3e4675a06beef8c8148e2fcece69ac0fec7d2395`: **match** → `ui-3e4675a0.md`.

### Diffs
- **3.8.2 → 3.8.3** (`diff breeds-fd5235bf.md breeds-82f99d6f.md`): only the claimed changes were made.
  - Status line and changelog.
  - BR-R1 UI citation.
  - BR-R12c pop-cap rule.
  - E22b clock.
  - §5 CSV pin.
  - BR-AC49 focus 6,000 and the 59,999/60,000 boundary.
  - BR-AC52b `page.clock` +9,999/+10,000.
  - BR-AC52c Hatch prefix and method.
  - BR-AC53 decimal rule plus the 12.3/12.2 case.
  - BR-AC22 note.
  - BR-AC31e hook.
  - §14 two stale lines.
  - K10 trigger.
  - Nothing else.
- **3.8.3 → 3.8.4**: only the claimed citation changes were made.
  - Status line and changelog.
  - BR-R1, BR-R12c and the §14 Art line now cite UI `3e4675a0`.
  - §5 CSV marked PENDING Econ, with `ad27fe73` kept as the candidate.
  - No requirement, AC or number changed.
  - Nit RB-6: the status line's history now says "rev. 3.8.2 … re-pointed to signed v0.2.6 `3e4675a0…`". 3.8.2 actually pointed to `2b2bda86`, so this rewrites history. Record only.
- **BR-AC22 v0.2 block:** byte-identical in 3.8.2, 3.8.3 and 3.8.4 (block extracted up to the rev. 3.3 note: sha1 `b89aeb23…` in all three). Only the separate note line changed (RB-1 applied).
- **Telemetry `381b3e80` → `f077899f`:** there is no copy of 381b3e80 on the box, so I rebuilt it from f077899f by restoring the old L226 wording "`present_active_s` and `present_lost_count` (integers)" and removing the new 3-line "Type wording fix (01:55)" section. The rebuild hashes to exactly `381b3e8027b7f158d0089fb59571b1b5fc59f528`, which proves the only changes are L226 plus that appended section.
  - L226 now says "number, at most 1 decimal … / integer". That matches L231 (HoE Q-COL-9), breeds §8 and BR-AC53.
  - T-AC9 (L150: no PII, validates against `schema.ts`) is untouched.
  - **My telemetry sign-off stands and is not reopened.** It corrects a stale word, with no change to any field, type rule or allowlist.
- **UI `2b2bda86` → `3e4675a0`:** there is no copy of 2b2bda86 on the box, so I rebuilt it from 3e4675a0 by restoring the §7a Return row (L178) and UI-BR-19 (L238) from Art's v0.2.6 draft backup and deleting the 01:58 changelog line (L286). The rebuild hashes to exactly `2b2bda866b8dd1837c01c2b16f527391b1baf64b` (`/workspace/snap/ui-2b2bda86-reconstructed.md`). So **only L178, L238 and L286 changed**.
  - Art logged it: `art-ux/decisions.md` L362, 01:58, "wording fix (still signed)", new sha1 3e4675a0.

### Fix checks (on 3.8.3 text, carried unchanged into 3.8.4)
| Item | Result |
|---|---|
| F-1 BR-AC52c | **Closed.** Name starts with `Hatch · ` and contains `fmtMoneyAria(cost)` (UI-BR-23). Playwright `accessibility.snapshot` at 360 and docked 1280 in Chromium, Firefox and WebKit. axe 0 `label-content-name-mismatch` and 0 `nested-interactive` |
| F-2 BR-AC53 | **Closed.** ≤ 1 decimal / int, T-AC9. §8 L672 rounds half-up on integer ms: `round(ΣfT/100)/10`. 12,250 → 122.5 → 123 → **12.3** ✓. 12,249 → 122.49 → 122 → **12.2** ✓. JS `Math.round` rounds .5 up, and 122.5 is exact in binary, so there's no float trap |
| R-B1 E22b/BR-AC49 | **Closed.** `Game.now()` show minus hide (injectable, `game.ts:359-363`). Emptied iff ≥ 60,000 ms. 59,999 kept and 60,000 emptied, matching the code's `gap < 60000` live path. Gap starts at focus 6,000 |
| R-B2 pop cap | **Closed.** `performance.now() − lastPopStart ≥ 10000` (or no pop yet). Tested under `page.clock`: +9,999 swaps, +10,000 pops, and +5,000/+10,000 give 2 pops. **UI-BR-19 and §7a at 3e4675a0 now say the same `>= 10000`, with the exactly-10,000 case playing. No conflict**, and the UI-wins clause no longer bites. UI-BR-19's rapid-pacing case (1 pop per cycle, 12 returns) = BR-AC52b's 2 pops |
| R-B3 K10 | **Closed on paper.** Mechanical trigger (`tc_*`/`bc_*` columns, or streak/tap-coins/Broody/golden/breeds sim code), pinned harness hashes, block rule at two decimals rounded half-up, owners named. The CI step and harness wiring are kickoff items |
| R-B4 BR-AC31e | **Closed in text; hook name open (HoE).** Debug-only hook sets default and `assumeWorking` incomes independently, and the iff always runs. 85/95 → note, 95/85 → none, **90.0/95 → note** (≤ 90 inclusive ✓), **90.1/85 → none** ✓. All four are consistent with the default-income threshold ≤ 2 × `bc_hatch_cost_s`. Note: `secondsToAffordSteady` = `needCents/100/income` (plain float, no ceil; `income.ts:95-100`, null when income ≤ 0). Fixtures must pick values that divide exactly (e.g. $90 need at $1/s gives exactly 90.0). Income ≤ 0 gives null, which means no note (record) |
| R-B5 CSV pin | **Text in; downgraded at 3.8.4 to PENDING Econ** (candidate `ad27fe73`, which I verified on 01:50 contents). Open item, not a blocker |
| RB-1…RB-4 | **In** (BR-AC22 note supersession, §14 lines, BR-AC49 focus 6,000, BR-R1 UI v0.2.6). RB-5 was process only |

### Verdict on rev. 3.8.4 `2eb0304619ff5faf5ab101cdb1f3f2588c8d35b4`: **TESTABLE**
Open items, none blocking:
1. **HoE:** name the BR-AC31e debug income hook. QA needs it before the BR-AC31e test is written.
2. **Econ:** confirm and log the `bc_*` draft CSV sha256 (candidate `ad27fe73…`). If the sha changes, QA re-checks the 32 values against §5.
3. **HoE (CI step) + Econ (harness):** K10 mechanical B4 trigger at kickoff.
4. Record only: RB-6 (status-line history cites `3e4675a0` for rev. 3.8.2).

## Re-check, 2026-10-25 01:59 CEST (UTC+2): rev. 3.8.4 `2eb03046` → rev. 3.8.5 `5dde4b62` (FINAL, [QA-D-1025-BREEDS385])
- **Hash:** `5dde4b62ddaf03570a732d628e9b78b72c627940` **matches**; snapshot `/workspace/snap/breeds-5dde4b62.md`. (The PMC changelog stamps it 02:03; the box clock read 01:58–01:59. The 383/384 entries above were re-stamped to box time.)
- **Diff vs 3.8.4:** 4 hunks, all claimed:
  - the status line;
  - a new changelog entry;
  - the §5 pin paragraph (PENDING → CONFIRMED, plus Econ's check list and a non-normative column-order note);
  - the §5 total line (19 → 20 single, 23 → 24 scalar, total 32 unchanged).
  - No requirement, AC or number changed. The BR-AC22 v0.2 block is still byte-identical (sha1 `b89aeb23…`).
- **32-column arithmetic vs CSV:** `economy.m51-draft.csv` sha256 still `ad27fe73…d477`.
  - Its header has 32 `bc_*` = 8 `bc_trait_*` + 4 `bc_w_*` + **20** other singles, so 20 + 4 + 8 = 32 ✓.
  - The §5 table lists the same 20 singles (11 unlock…incubators, pity, star cap, star bonus, lt18, lay cap, away cap, broody cap, calm W, calm k). The old "19 single" was a miscount; the fix is correct.
  - Values are unchanged from my 01:50 check.
- **Econ's confirmation, on disk:** I found **no Econ-authored log entry** (decisions, review or status) naming `ad27fe73` the draft of record. The "confirmed" wording appears only in PMC's `product/decisions.md` D-COL-2026-10-25-06 and in the spec, so **the confirmation is PMC-reported.**
  - Econ's own run artifacts in `scratch/m51-econ/csv/` (01:47–01:57) back up the content PMC quotes:
    - `celldiff.txt`: 0 of 4,712 existing cells differ, and +32 constant columns;
    - `ac7-m51.json`: traceSha `19d4034d…`, identical;
    - `g1smoke-compare.txt`: identical;
    - `g1csv-compare.txt` / `g1csv-R6-g1F27.json`: CSV-driven R6 F20–29 = 63.58, identical to `g1-8dc-R6-prec.json`, run on sha `ad27fe73`.
  - Not blocking. QA asks Econ to log the confirmation itself.

### FINAL verdict on rev. 3.8.5 `5dde4b62ddaf03570a732d628e9b78b72c627940`: **TESTABLE**
Open items, none blocking:
1. HoE: name the BR-AC31e debug income hook.
2. Econ: log its own draft-of-record confirmation for `ad27fe73`. It's PMC-reported now, and the artifacts back it up.
3. HoE (CI step) + Econ (harness): K10 mechanical B4 trigger at kickoff.
4. Record only, RB-6: the status-line history says rev. 3.8.2 cited `3e4675a0`; it actually cited `2b2bda86`.
