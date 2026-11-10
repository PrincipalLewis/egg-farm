# M4-A spec: three-track split + milestones · PM, Farm Upgrades · v1.23 · 2026-10-19

> **2026-10-16 QA M4-A gate fixes applied** (qa/m4-ac-testability.md; HoP decisions 1–9): TR-1 36/48 via hens_cost/egg_value_cost (M4A-1); TR-5 bot/table/24-of-30 (M4A-35); `*_cap_over_farm` + Art & UX lock copy (M4A-2); milestone targets and owners (M4A-8–12); Collection loses +12% (M4A-5/7/15); TR-4 never-lower + price-matched start, HoP-approved (M4A-28); MIG1 guard, refund 0 (M4A-29); EXP1 Egg value / seenTracksExplainer / v6→v7 / fade-only (M4A-33); rollback owned by Engineering (M4A-31). Save migration: SAVE_VERSION stays 6; migrated = `tracksV7: 1` + `v6BackupId` (see v1.14). m4a-eng-addendum.md is merged here.
> **2026-10-16 review response** (product/claude-review/m4a-economy-2026-10-16.md → m4a-review-response.md): price-stack example corrected to ×7.8; M4A-18/28/37/39/40 rewritten as testable; C-sweep migration fixtures added; B1 and M1 rule changes **APPROVED by HoP (decisions.md 2026-10-16 14:45)**.
> **v1.1 changelog (2026-10-16):** B1 APPROVED (M4A-28 V search 0..30, no F+3 cap, grandfathered at migration only; C ≥ F+5 fixtures); M1 APPROVED (M4A-4/8: Hens milestones raise coop size + offline eggs, not lay rate; CSV from Economy); integer-cents half-up price check; M4 ×7.8; M4A-18 hold 2 s; M4A-27 clamp-above-30 APPROVED (HoP 14:46); 60-min TR-5 ship gate added to M4A-35 (known FAIL at F25, HoP 14:46); M4A-12/M4A-22 Hens milestone copy from Art & UX (`bigger coop · offline ×{mult}` / `: bigger coop`); Economy results in: F12/C1 1.35× (all saves ≤ 1.5×), M4A-37 casual 0.5 tap/s 30/30 (median 34.7 min); M4A-35 known-failure note cites the L24–29 ×0.70 proposal.
> **v1.2 changelog (2026-10-16, HoP 14:54, review r2 MJ1/MJ2):** M4A-30: the first offline grant after migration uses Hens offline mult ×1.0; M4A-4: offline eggs = idle eggs/s × min(away, 2 h) × `hens_msK_offline_mult`, and `offline_max_eggs_2h` scales by the same mult; worked test cases added. M4A-35 known-failure note: final late-curve rows taper from ~L22, pending Economy's CSV. **Update:** M3 taper (L23 ×0.90, L24–29 ×0.70, strictly rising; HoP APPROVED 14:56) in the candidate CSVs; the 60-min TR-5 gate now PASSES (worst gap 2.75 min at F26, 30/30), so the M4A-35 known failure is cleared. **Pacing (HoP 14:58):** split L@30 band, L18–22 no workers / L20–24 with workers (`--workers-band`); the with-workers run is still to be reproduced (tr5_run has no worker model). With-workers run (`m4_workers_prog.py`): L23 at 30:00, worst in-play gap 90 s; 14:58 re-check passed, M3 cut + Grader 51,567 final. With-workers gate now `tr5_run.py --workers` (+ realistic 60/60/0.2, 30 and 60 min), all PASS (L23; gaps 1.00/1.00/2.00 min); idle-after-completion issue fixed by Economy.
> **v1.3 changelog (2026-10-16, HoP 15:29 / 16:05):** M4A-18 + M4A-22: highlight and next-goal hint use one rule, best payback with the 3-buy look-ahead (rc1 bestBuy; `best()` / `highlightPick` in tracks-ui.ts / next-goal.ts with M4 on), not cheapest; 2 s hold kept. M4A-40 gate = `product/sim/m4/m4a_gate40.py` (PASS, highlight L21 30/30); PM Farm's m4a_m40_bots.py superseded. L20 Grader cost 10,707 → 9,100 in both CSVs (HoP 16:05). All M4A-35..40 economy gates pass on m4/m4a-tracks @ 4ba3c31 (Economy; HoP 16:05: M4-A economy approved for build).
> **v1.4 changelog (2026-10-16, HoP 16:08):** M4A-18 switching rule shared with clarity-spec UC6: switch only if the new pick's payback ≤ 0.9× the current pick's AND the current pick has held ≥ 2 s; switch at once if the current pick is bought or unaffordable; re-evaluate on state change, 5 s re-check fallback. New M4A-41 (no flicker between near-equal rows). M4A-40 also run with hysteresis (`product/sim/m4/m4a_gate40_hyst.py`): PASS, highlight L21 30/30.
> **v1.5 changelog (2026-10-16, HoP decisions.md 16:15, PM Farm ruling approved):** hint ranks every option, highlight ranks Farm-tab rows only, same picker, must match when the best is a Farm-tab row; a rebuy keeps the 2 s count; a newly affordable row skips the hold but needs ≤ 0.9×; with no pick, the first affordable row is picked at once; M4A-41 test (d) added. Built at m4/m4a-tracks @ 04e2709 (485/485 unit, gate40_hyst PASS, rc0 56/56). **M4-on fresh-save example (Engineering 16:27, PM accepted, no econ change):** Hens 120 s < Egg value 134.6 s < Collection 150.6 s < Farm 177.3 s, so hint = highlight = Hens; the Collection 55.6 s vs Farm 111.9 s example applies with M4 off.
> **v1.6 changelog (2026-10-16 21:56+):** Save versioning aligned with engineering/m4-design.md v0.2.8 (branch arch/m4-design @ f1869c4), ADR M4-8: M4-A keeps `SAVE_VERSION` 6; the migration upgrades the v6 save in place under a `state.tracksV7: 1` marker after a one-time `eggfarm.save.v6_backup`; the real v7 bump is S-4 (later, not needed for M4-A). M4A-31(f)1 split per HoP 21:56 / ADR M4-16: IndexedDB *unavailable* → proceed on the localStorage backup alone + `save_backup_idb_unavailable`; IndexedDB available but write fails → abort, stay v6, retry next load. New ACs M4A-31(g)/(h); telemetry M4A-34 adds the event. **Update (HoE rulings + Saves QA/HoQA M4-16 bar):** `save_migrated {from: 6, to: 6, migration: 'tracksV7_marker'}` (S-4 emits 6→7); 2000 ms limit applies to the IDB open only, a write not finishing within 2000 ms after a successful open = failed write → abort ((h) hang case); LS `v6_backup` read-back with matching `migrationId` before the in-place write, mismatch → M4-12 abort ((g) case).
> **v1.7 changelog (2026-10-16, HoP decisions.md 21:59 amendment; replaces the 2000 ms rule):** M4A-31(f)1/(g)/(h): LS-only migration ONLY when IDB is definitely unavailable (no `indexedDB` global, or open throws/rejects with SecurityError / private-mode InvalidStateError / blocked); open not answering within T = 1500 ms (1499 ms = available), any other open failure, or an IDB read failure → migration DEFERRED (byte-identical v6, `save_migration_aborted {reason: 'idb_timeout'|'idb_read_error', attempt_count}`, retry next load); `attempt_count` = consecutive deferred loads, in localStorage, reset on success; ≥ 3 → `stuck_on_v6: true` on the same event (chosen over a separate event); never forced. (h) unchanged (write failure / `readback_mismatch` abort). All 2000 ms references removed; T matches the mirror's 1.5 s. M4A-34 enums updated. **Update (Architect confirmed PM Farm's 4 calls; ADR M4-16 being updated):** `eggfarm.save.migration_attempts` integer, §3b allowlist, cleared by Reset, removed on commit, never written on refusal; T = 1500 ms for open and backup write (`idb_write_timeout` abort); only deferrals increment; `security` = SecurityError/InvalidStateError, `blocked` = sync reject/onblocked/private-mode error, timeout always `idb_timeout` deferral; key tests added.
> **v1.8 changelog (2026-10-16, HoP decisions.md 22:04, Code Reviewer N8):** M4A-30: the migration commits in-session, so the boot offline grant runs under v6 rules at ×1.0 (MJ1); S-5 expects 19,800 at boot, 24,750 next load. M4A-33: the explainer shows at the in-session commit, not on the first M4 load. M4A-31(a): backup record `{migrationId, raw}`; an orphan backup is overwritten only by the next migration. ACs M4A-30(N8), M4A-33(N8), M4A-31(i) added.
> **v1.9 changelog (2026-10-16, HoP decisions.md 22:09):** IDB `onblocked` (another tab holds an old connection) now DEFERS the migration with `reason: 'idb_blocked'` and increments `attempt_count`; 'unavailable' = `no_global` | `security` only (`security` = SecurityError, InvalidStateError, private-mode errors). M4A-31(f)1, (g), (d1), M4A-34 updated; new AC (d1)7: a deferral session never writes the IDB mirror.
> **v1.10 changelog (2026-10-16, HoP decisions.md 22:13; HoE ADR M4-24: M4-A commits to localStorage only):** IDB backup-write rows of M4A-31(f)1/(h), `idb_write_timeout`, and the M4A-31(i) `{migrationId, raw}` record/orphan rule deferred to S-4; T = 1500 ms now covers the IDB open only; new deferral `quota_headroom` (attempt_count +1) with AC (j); new AC (k): zero IDB writes during the attempt.
> **v1.11 changelog (2026-10-16, HoP approved):** M4A-34 `save_migration_aborted` reasons listed and tagged [abort]/[deferral]; new `idb_main_changed` [deferral] (pre-commit IDB `main` re-read ranks newer under M4-19 or fails) and `commit_write_failed` [abort]; counting rule unchanged (only deferrals increment); `eggfarm.save.migration_attempts` is a plain integer capped at 3; 'aborted' names the event, every reason retries on next boot. New AC (d1)8 for `idb_main_changed`.
> **v1.12 changelog (2026-10-16, HoP approved):** counting rule changed: every failed attempt, [abort] or [deferral], increments `attempt_count` (capped at 3, then `stuck_on_v6`); event tags kept. New AC (h)6: repeated `commit_write_failed` / `readback_mismatch` reach `stuck_on_v6` on the 3rd consecutive failure; a successful migration removes the key on commit. (d1)5 sequence confirmed 1, 2, 3, 3 + stuck (Architect design 96c4a1e).
> **v1.14 changelog (2026-10-16, HoP approved):** migrationGrantPending flag removed; rule is now "the committing session's boot grant is the single ×1.0 grant" (19,800 boot → 24,750 next load at ×1.25); AC r3a/r3b kept. New offline AC M4A-4(r4): build reads `offline_eggs_per_sec` and `offline_max_eggs_2h` from economy.csv (repro: H0 1 h build 1,350 vs spec 1,368, rate 0.375 vs 0.38).
> **v1.23 (2026-10-19 11:05, PM review):** the §18 unlock variant now names the engineering gap (no bundle field exists today; the build must add one) and notes it only fires on L30+ data. F4-20's contradictory 'not best buy' clause is removed, and the note on ★ always dropping is explicit. The §19 Build line no longer says 'fallback = farmMax'. F4-19 moved after F4-18. No rule or number change.
> **v1.22 (2026-10-19 10:58, HoP 10:34 + Art & UX GO 10:34):** new B1-6b for the shipped balance (L52 → `Needs Farm L50`; L53/L54 → `Max for this farm`; L55 → `MAX`). Art GO on the §18/§19 copy. `Max for this farm` has no lock glyph, uses muted MAX styling and has no button (B1-9). F4 aria always uses the full `Egg value`. Art's 'name Hens when both unlock' rule is flagged at F4-22, pending HoP; F4-22 stays first-in-bundle.
> **v1.21 (2026-10-19 10:40, HoP D-HOP-40 + D-HOP-42):** §19 replaces the farmMax fallback with `Max for this farm` (no button) when no F' ≤ farmMax unlocks the next level. B1-6 is rewritten (below F50, L53 → `Needs Farm L50`; L54+ → `Max for this farm` at any F, on the B1-6 balance), and B1-9/B1-10 plus F4-19 are new (best buy and ★ never target that row). §18 has the new F4 Farm unlock variant `★ Farm L{n}: unlocks {Track} L{m}` with ACs F4-20..24; that copy is pending Head of Art & UX sign-off.
> **v1.20 (2026-10-19 10:21, HoE via HoP):** §19 build reference moved from `882b97f` to `88130a767821f2a26e7217b153636f33caaf154a` (PR #54 farmMax commit, pushed, unmerged); OQ-B1-1 marked resolved by that commit. No AC or behaviour change.
> **v1.19 (2026-10-19, HoP D-HOP-32 10:05 + PM rulings D-PMFU-2026-10-19-01..08; HoP accepted v1.18):** §19 M4B-1 search to farm max, fallback farmMax (PR #54), new ACs B1-6/B1-7; §17 new M4A-EXP-B11 `tracks_explainer_shown` / `tracks_explainer_dismissed {method}` (M4.1, M41-9) and M4A-34 updated; §18 `Value` stands, rc1 §4 `Egg val.` + "never truncated" superseded, suffix never cut incl. CSS (F4-17), Collection keeps `Collection L{n}: +{Δtap}/tap` with ★ + same truncation (F4-16), NBSP/counting/aria `<1%`/negative gain/★ source/floor(x+1e-9) (F4-9b) settled; §20 resolved except OQ-F3-2 (anchoring, not ruled). **v1.19 note (10:00, D-PMFU-2026-10-19-09):** OQ-F3-2 resolved as built; §11 anchoring to the tracks block superseded by the fixed top-centre 72 px position (M4A-EXP-B4); §20 now fully resolved.
> **v1.18 (2026-10-19, P41-5, PM Farm Upgrades; due 17:15 before the HoQA handoff):** new §17 F3 explainer AS BUILT (D-HOP-2026-10-19-11 + 04:16 amendment, as superseded by D-HOP-14/CEO v1.15; read from 246de09 = B tree = main dd223f5); new §18 F4 next-goal strip label (D-HOP-29 + 09:55 amendment + 10:00 final; source of truth art-ux/f4-next-goal-label.md, LOCKED 10:10); new §19 **M4B-1** lock-label rule (D-HOP-28; build 882b97f on the M41 line). M4A-2 and M4A-22 now point to §19 / §18. Open questions in §20. No economy change.
> **v1.17 (2026-10-19 06:06): v1.16 below is WITHDRAWN. The CEO ruled v1.15 final (replacing the 04:46 D-07 amendment). BUILD AND TEST v1.15: a non-modal card that never covers Buy/Collect; outside taps register and don't close it; closing via Got it, a tap on the card, Esc/Enter or 8 s, and the closing tap does nothing else; toasts queue, it waits behind Welcome back, the 8 s timer starts on appear, focus Got it, then back to the Upgrades tab, ≥48px, fits at 360, writable+active only.**
> ~~v1.16 (WITHDRAWN) (2026-10-19 04:50, per CEO D-07 amendment 04:46; SUPERSEDES v1.15 and the §11 line "no input is ever blocked / a Collect tap registers while it is visible"):** Any tap while the card is visible (Got it, the card, Buy, Collect or anywhere else), Esc/Enter, or 8 s closes it. The tap that closes it is consumed and does nothing else; the next tap works normally. A pass-through buy is a Major. "Never blocks a buy" = the card never traps the player. Toasts are held while it is open. It queues behind Welcome back (never stacked), and the 8 s timer starts when it appears. Focus goes to Got it on open and back to the Upgrades tab on close. Got it ≥48px; fits at 360 px with and without the refund line. Shown only when the save is writable and the tab is active (v1.14).
> **v1.15 (2026-10-19 04:48, HoP D-HOP-2026-10-19-14; resolves the EXP1 tap conflict):** The card is NON-MODAL: no scrim, and it never covers the Buy or Collect controls. A tap outside the card goes through normally (a buy or Collect registers) and does NOT dismiss the card. "Tap anywhere" is replaced by "tap on the card". It closes on Got it, a tap on the card, Esc/Enter (focus on Got it, then back to the Upgrades tab) or after 8 s. A tap that closes it does nothing else. Sequencing: it waits until Welcome back has closed, and toasts queue while it is visible. Fits at 360 px with the refund line. HoE's 04:4x variant (Buy/Collect tap closes the card without buying) is NOT adopted.
> **v1.13 changelog (2026-10-16, HoP approved; Design Reviewer r3, product/claude-review/m4a-economy-2026-10-16-r3.md):** R3-MJ1 M4A-1: economy.csv is the source of truth, formula only the default, L23–29 overrides listed, QA reads the CSV. R3-MJ2 M4A-30: one flag `migrationGrantPending`, exactly one ×1.0 grant on every path, N8 order (19,800 boot / 24,750 next). mn1: L0 offline cap 2,700 is authored. mn2: fractional offline eggs floored. mn3: grant + timestamp + flag in one save write; crash test. ACs M4A-1(r3), M4A-4(r3a/r3b), M4A-30(r3a/r3b).
> **v1.14 changelog (2026-10-19 04:20, HoP D-HOP-2026-10-19-13; Saves write-up engineering/reviews/l30plus-saves.md):** Every "v6→v7" in M4A-29–33 means the in-place `tracksV7` migration with **SAVE_VERSION 6**. A migrated save is marked by `state.tracksV7: 1` plus `state.v6BackupId`. A version-7 save would be rejected by rollback builds, and the real v7 bump stays S-4. `tracksV7: 1` alone does NOT mean a migrated player, because new M4 farms carry it too. M4A-33 trigger: `Game.onTracksCommitted` in-session, gated by `!seenTracksExplainer` (a separate persisted flag, default absent/false, set when shown). Reload after the commit but before it was shown: show it once if `tracksV7===1 && the v6_backup record id === state.v6BackupId && !seenTracksExplainer`; new farms (no backup record) never see it. Rollback builds need the level-tolerance loader fix to load L31+ saves. The card shows only when the save is writable and the tab is active (otherwise it waits for the next qualifying moment), so `seenTracksExplainer` always persists (D-HOE-20261019-02, HoP-approved 04:36). Behaviour is otherwise unchanged.
Status: **for HoP review, buildable.** CEO priority: M4-A ships ahead of the rest of M4. Why: in Vadim's rc1-pt1 playtest he only ever upgraded Farm.

**Sources:**
- `product/research/slices/upgrades.md`: §5a decisions, §7 tracks, §8 tabs, §9 migration, §9a gate table, M4-AC-MIG1, M4-AC-EXP1.
- `product/farm/m4-track-check.md`: adopted costs, caps, TR-5 gate, risk list.
- `product/farm/m4/tr5_run.py` and `tr5-README.md`.
- `art-ux/m4-tracks-explainer.md`.
- `product/m4-manage-proposal.md` §2.1, §2.2, §2.8.
- Economy: `product/sim/m4/m4_active.py`, `m4_bots_out.md`, `m4_active_raw2.md`.
- `product/economy.m4-candidate.csv`.

**Rules:**
- **`economy.csv` is the source of truth.** ACs name columns and config keys, never hardcoded numbers. Numbers in *italics* are the current adopted values, for reference only.
- `economy.m4-candidate.csv` already carries `hens_cost`, `egg_value_cost`, `hens_cap_over_farm` and `egg_value_cap_over_farm`. Economy merges them into `economy.csv` (open item O1).
- **Until the M4 merge, QA tests MS-1/MS-2 against `product/economy.m4-candidate.csv`.** The M4 columns move into `economy.csv` and `game/data/economy.csv` after Wednesday's F1 merge, once HoP approves the M4 merge.
- Notation: F = Farm level, H = Hens level, V = Egg value level, C = Collection level. "Cost at L" means the price of going L → L+1. All levels are integers from 0 to `maxLevel` (*30*).

## 1. Scope
**In M4-A:**
1. Three purchase tracks (Farm, Hens, Egg value) with caps, costs and stat mapping.
2. Per-track milestones and the cross-track Balanced-farm bonus.
3. Demand on the Farm reference curve.
4. The +12% Collection price bonus moving to Egg value.
5. Grader stacking.
6. The 3-row Farm tab with highlight and bonus strip.
7. Next-goal candidates.
8. Gate mapping (§9a).
9. Save migration: v6 save upgraded in place under the `tracksV7` marker (ADR M4-8; the v7 bump is S-4, later), with refund guard.
10. One-time explainer.
11. Telemetry.
12. The TR-5 balance gate and an active-play check.

**Out of scope (rest of M4, separate specs; m4-manage-proposal §2.3–§2.7, §12):**
- Golden egg / Frenzy.
- Per-worker cooldown abilities and Activate-all.
- Collect streak.
- Per-worker Pause/Resume.
- Market completion bonus, Focus/Bulk and focus premium.
- Queue-leave penalty (MK-27–33).
- Active/idle ratio band (1.5–2.0×).
- Monetisation rows.
- Offline-rate changes.

**Later (M5+):**
- Prestige.
- Achievement multiplier.
- VIP orders, mini-goals.
- Queue-slot purchase.
- The "revisit Grader at prestige" decision.

M4-A must pass every AC here **with all of those mechanics off**.

**Active-play guardrail (HoP decisions.md 2026-10-16 14:57):** the only M4-A guardrail is active/idle (tab open, taps vs no taps) ≥ 1.4; currently 1.53–1.61 at F10/18/24 (Economy, M1 fix). There is **no active-vs-offline target in M4-A**; it is in the rest-of-M4 offline backlog (Economy active/offline over 2 h: 5.28 / 9.45 / 14.72× at H10/20/30). Their tc_* columns at off values are allowed as long as they don't change behaviour.

## 2. Tracks
| Track | Buys | Level cap | Cost column |
|---|---|---|---|
| Farm | Coop capacity, customer queue, patience, market size (interval and demand), coop looks, worker unlocks, Grader tier gates, the Hens and Egg value caps | `maxLevel` | `farm_cost` (F1 segmented table) |
| Hens | Production (eggs/s) | min(`maxLevel`, F + `hens_cap_over_farm`) | `hens_cost` (*36 × 1.30^H*) |
| Egg value | Egg sale price, quality grades | min(`maxLevel`, F + `egg_value_cap_over_farm`) | `egg_value_cost` (*48 × 1.33^V*) |
| Collection | Eggs per tap only (its price bonus moves, §5) | `maxLevel` | `collection_cost` |

- **M4A-1** (TR-1) The Upgrades → Farm tab offers three buy actions: Farm, Hens and Egg value. Each purchase deducts exactly the CSV cost at the current level of that track (`farm_cost[F]`, `hens_cost[H]`, `egg_value_cost[V]`) and raises only that track by 1, applying the new stats in the same tick. **`economy.csv` is the source of truth (v1.13, r3 R3-MJ1):** costs are read per row from the CSV (`farm_cost`, `hens_cost`, `egg_value_cost`), passed through balance.json. The formulas floor(36 × 1.30^L) (Hens) and floor(48 × 1.33^L) (Egg value) and the Farm segment formula are only the default shape; the CSV overrides them where they differ. Overrides at L23–29 (M3 taper, HoP 14:56), from economy.csv (= economy.f1-m4cols.csv):
  - `farm_cost` L23–29: 68756 / 72194 / 97461 / 131573 / 177624 / 239792 / 323719 (also F1-GAP L18 11076, L19 18201);
  - `egg_value_cost` L23–29: 30484 / 31534 / 41940 / 55780 / 74187 / 98670 / 131231 (formula would give 33871 … 187473).
  - **AC:** QA tests read the expected cost for every level L0–29 from economy.csv (never from the formula) and assert the in-game cost equals it, for all three tracks. No cost constants in game code (QA greps sim/ for 36/48/1.30/1.33). Coins never go negative. A double tap never buys twice unless coins ≥ the sum of both costs (same rule as F5).
- **M4A-2** The Hens buy is disabled when H ≥ min(`maxLevel`, F + `hens_cap_over_farm`). The Egg value buy is disabled when V ≥ min(`maxLevel`, F + `egg_value_cap_over_farm`). A capped row shows "Needs Farm L{n}" (Art & UX m4-tracks-copy.md §1). **v1.18: n is defined by §19 M4B-1 (D-HOP-28), not F+1; for normal saves the result is still F+1.** At `maxLevel` the row shows "MAX" with no cost and no button. Buying at the cap is a no-op (state unchanged). Effective cap = min(F+3, 30) with current data. Column names `hens_cap_over_farm` / `egg_value_cap_over_farm` are final (QA gate fix 3).
- **M4A-3** Farm purchases are never gated by Hens or Egg value. Buying Farm immediately lifts both caps by 1, so a capped row becomes buyable in the same tick if coins allow.
- **M4A-4** Production: eggs/s comes from H using the CSV `eggs_per_sec` column indexed by H (the H0 starter-nest value included), with **no** Hens milestone multiplier on the in-tab lay rate (M1, APPROVED). The coop fills at that rate and is capped at `coop_capacity[F]` × the Hens milestone multiplier (M4A-8). **Offline eggs (AC11; MJ2, HoP 14:54):** offline eggs = idle eggs/s × min(away, 2 h) × `hens_msK_offline_mult` (highest reached at H; ×1.0 below H10). Idle eggs/s = `offline_eggs_per_sec[H]` (Economy-confirmed 2026-10-16: the idle "no taps" rate = `eggs_per_sec` × `offlineRateMultiplier` 0.25, rounded half-up to 2 dp, with no demand or collection cap; there is no `incomePerSec` symbol in game/src). The 2 h time cap is fixed. The egg cap is `offline_max_eggs_2h[H]` × the same `hens_msK_offline_mult`.
  - Test cases (economy.m4-candidate.csv; `offline_eggs_per_sec` H9 2.5 / H10 2.75 / H20 5.25 / H30 7.75; `offline_max_eggs_2h` 18000 / 19800 / 37800 / 55800):
    - H9 (×1.0), 1 h: 2.5 × 3600 = **9000**. 3 h: capped at 2 h = **18000** (= cap 18000).
    - H10 (×1.25), 1 h: 2.75 × 3600 × 1.25 = **12375**. 3 h: 2.75 × 7200 × 1.25 = **24750** (= 19800 × 1.25).
    - H20 (×1.5), 1 h: 5.25 × 3600 × 1.5 = **28350**. 3 h: **56700** (= 37800 × 1.5).
    - H30 (×2.0), 1 h: 7.75 × 3600 × 2.0 = **55800**. 3 h: **111600** (= 55800 × 2.0).
    - Boundary: H10, exactly 2 h = 24750, and 2 h + 1 s = 24750 (cap).
    - **L0 cap (r3 mn1):** `offline_max_eggs_2h[0]` = **2,700 is an authored value**, not derived (0.38 × 7200 would be 2736). AC: H0, away 3 h → **2,700**; H0, away 1 h → floor(0.38 × 3600) = **1,368**.
    - **Flooring (r3 mn2):** fractional offline eggs are **floored** after the multiplier and before the cap. AC: H10, away 3601 s (×1.0 case) → 2.75 × 3601 = 9902.75 → **9,902**; with ×1.25 → 12378.4375 → **12,378**.
    - **Offline from CSV (v1.14, AC r4):** the build reads `offline_eggs_per_sec[H]` and `offline_max_eggs_2h[H]` from economy.csv (via balance.json), never derives them (no eps × 0.25 in code). Repro of the current gap: H0, 1 h away → build 1,350 (0.375 unrounded) vs spec **1,368** (CSV 0.38). QA test (expected values computed from the CSV, floored): H0 1 h **1,368**, H0 2 h **2,700**; H10 (×1.25) 1 h **12,375**, H10 2 h **24,750**.
- **M4A-5** Price: the charged unit price = Egg value base price at V × grade multiplier (M4A-9) × Balanced-farm multiplier (M4A-10) × Grader multiplier (M4A-14). Rounded once to cents, half-up, at sale time.
  - (TR-6, Economy-confirmed columns 2026-10-16) price = (1 + `egg_value_base_step` × V) × (1 + `egg_value_level_bonus` × V) × grade multiplier × Balanced multipliers (then × Grader, M4A-14), *0.05 / 0.12*.
  - **Collection loses its +12% price bonus** (HoP, QA gate fix 5): buying Collection never changes price. `collection_price_bonus` **stays as a column, set to 0 on every row**. It is not removed, because the tracks migration reads the old values from the F1 table (`product/economy.f1.csv`, 0.12 × C; review m1). (The Thu Oct 22 check with PM Collection can still revisit this; if so, this AC changes.)
- **M4A-6** Farm stats (`coop_capacity`, `queue_max`, `customer_patience_s`, `customer_interval_s`, `demand_min`/`demand_max`) are read at F, never at H or V (gate table §9).
- **M4A-7** Collection buys change only eggs per tap (`eggs_per_tap[C]`). They never change the price.

## 3. Milestones and Balanced-farm bonus
All multipliers and thresholds live in economy.csv columns. **Owners: Economy adds the columns (names below are proposals until Economy publishes them); Art & UX owns the toast/strip text (delivered, m4-tracks-copy.md).** QA boundary tests: H 9/10/11, 19/20, 29/30; V 4/5, 9/10, 19/20; V20 at F14 and F15; min(F,H,V) at 4/5 … 24/25 with one track lagging.
- **M1 APPROVED (HoP, decisions.md 2026-10-16 14:45):** under the old rule Hens added no in-tab income at H = F for F10–F29. Hens milestones now raise coop size and offline eggs only. Accepted: idle income at a fixed level drops about 20–30%; active/idle stays 1.53–1.61. TR-5 with this change (PM Farm, `m4/m4a_tr5_variant.py` ms 1,1,1): PASS, F18 median 20.75, L@30 L21 (30/30), worst gap 1.50 min. Economy posts the hens_ms CSV.
- **M4A-8 Hens milestones.** At H ≥ `hens_ms{1..3}_level` (*10/20/30*), **coop capacity and offline eggs/s** (never the in-tab lay rate, never price) are multiplied by the matching columns: coop capacity × `hens_ms{1..3}_coop_mult` and offline eggs/s × `hens_ms{1..3}_offline_mult` (*both ×1.25/×1.5/×2.0 at H10/20/30*; Economy CSV 2026-10-16, `economy.m4-candidate.csv` + `economy.f1-m4cols.csv`). Only the highest reached applies; they don't compound.
- **M4A-9 Egg grades.** At V ≥ `egg_grade{1..3}_level` (*5/10/20*), the **price** is multiplied by the matching `egg_grade{1..3}_mult` (*×1.1 Grade A / ×1.25 Large / ×1.5 Jumbo*). Only the highest qualifying grade applies.
  - A grade with a Farm gate (`egg_grade{1..3}_farm_gate`, *Jumbo needs F15*) applies only when F ≥ the gate. Below it, the next lower grade applies (Large ×1.25 stays).
  - Grades stack with the Grader (M4A-14); they never replace it.
- **M4A-10 Balanced farm (cross-track).** Let m = min(F, H, V). At m ≥ `balanced{1..5}_level` (*5/10/15/20/25*), the **unit price** (not eggs/s) is multiplied by the matching `balanced{1..5}_mult` (*×1.10/1.15/1.20/1.25/1.30*). Only the highest tier applies.
  - Collection is not part of m.
  - The tier changes in the same tick m changes.
- **M4A-11** The Farm visual milestones are unchanged: coop look tiers at F5/F10/F20 (F3) and queue steps (F8). They key on F only.
- **M4A-12** Reaching any milestone or Balanced tier for the first time in a save:
  - shows a toast with the exact Art & UX copy: `Hens L{n}: bigger coop · offline ×{mult}` (mult ×1.25/×1.5/×2.0 at L10/L20/L30; Art & UX m4-tracks-copy.md), `Egg value L{n}: {grade} ×{mult}` (grade = Grade A / Large / Jumbo), `Balanced farm {k}/5: +{x}% income`;
  - emits telemetry (M4A-34);
  - never replays after a reload.
  - Exception: milestones and tiers already reached at migration apply immediately and are marked celebrated silently (no toast; M4A-28).
  Art & UX owns the toast style (same pattern as "Coop upgraded!").

## 4. Demand follows Farm
- **M4A-13** Customer interval, demand range and queue size are computed from F only, using the Farm reference production curve: the CSV `demand_min[F]`, `demand_max[F]` and `customer_interval_s[F]` columns, which are derived from the old 0.2 × (5 + 5F) curve.
  - Changing H never changes demand.
  - Test: at a fixed F, H = 0 and H = cap give the same demand distribution for the same seed.
  - Customers already queued keep the demand they arrived with (F4).

## 5. Collection loses +12%; Grader stacking
- **M4A-14 Grader.** The Grader stays a separate worker. Its tier multiplier (`w4_price_mult`, with the tired/asleep shares `w4_tired_bonus_share` and `w4_asleep_bonus_share`) multiplies the full graded Egg value price (M4A-5). Tier gates stay on F (`w4_tier` per row).
  - Example top end (full stack, corrected 2026-10-16 per review M4): *Jumbo ×1.5 × Balanced 5/5 ×1.30 × Grader T5 ×4.0 = **×7.8** on the base Egg value price, from F25 with H, V ≥ 25 (T5 from F24; Balanced 5 needs min(F,H,V) ≥ 25). Without Balanced the product is ×6.0. Review check: F25 = $17.55 without Grader, $70.20 with T5.* The test reads every factor from config.
- **M4A-15 The +12% move.** The +12%/level term is driven by V only (`egg_value_level_bonus`, M4A-5); Collection has no price bonus.
  - The Collection row shows only "+eggs per tap".
  - The Egg value row shows the combined price change: current → next, including the grade if the next level crosses a grade threshold.
  - HoP confirms with PM Collection on **Thu Oct 22**; Economy's result supports this (m4-manage-proposal §2.8).

## 6. UI: Farm tab rows, highlight, bonus strip (Art & UX input adopted; upgrades §8)
- **M4A-16** The Upgrades panel keeps exactly three tabs: Collection | Farm | Workers. Labels and the 375 px layout rules are unchanged (layout-spec §3.5).
- **M4A-17** The Farm tab shows one row per track, in this order: Hens, Egg value, Farm. Each row has:
  - an icon (Art & UX assets);
  - the track name and its current level;
  - current → next effect;
  - cost;
  - a buy button with a hit area of at least 44×44 px;
  - the F7 time-to-afford hint per row, with the same rounding rules.
  The Farm row keeps its existing preview lines ("+1 customer (max N)", "New coop look", worker/Grader unlock labels).
- **M4A-18 Highlight (v1.4, HoP 15:29/16:05/16:08).** Exactly one row carries the highlight: the **best-payback affordable row** among Hens, Egg value and Farm, using the 3-buy look-ahead (payback = cost ÷ income/s gain, bundle of up to 3 buys starting with that row; the same rule as rc1 bestBuy and `best()` / `highlightPick` in tracks-ui.ts / next-goal.ts with M4 on). Ties: lower cost, then Farm > Hens > Egg value. If none is affordable, no row is highlighted and the next-goal hint shows the best-payback row with its ETA (M4A-22).
  - **Switching rule (shared with rc1-upgrade-clarity-spec UC6; HoP 16:08):** the pick changes to a new row only when (a) the new row's payback ≤ **0.9×** the current pick's payback, both computed on the same state, **and** (b) the current pick has been shown for **≥ 2 s**. **Immediate switch, no threshold or hold,** when the current pick is bought or stops being affordable (or becomes capped/MAX). A rebuy of the same row keeps its 2 s count.
  - **Newly affordable rows (HoP decisions.md 16:15):** with **no current pick**, the first row to become affordable is picked at once. With a pick showing, a row that becomes affordable **skips the 2 s hold but must still clear the 10% bar** (payback ≤ 0.9× the current pick's); otherwise the current pick stays.
  - **Scope (HoP decisions.md 16:15, approving PM Farm's ruling):** the next-goal hint ranks over every option (incl. Collection and workers); the Farm-tab highlight ranks over Farm-tab rows only. Both use this same picker, and they must show the same row whenever the overall best is a Farm-tab row (keeps UC7: Collection hint on a fresh save).
  - **When it is evaluated:** on every state change (coins crossing a cost, purchase, hire, level change, income change); a 5 s periodic re-check (UC6) is the fallback.
  - **Fake-clock tests:** (1) choice = best payback among affordable rows (a higher-cost row with better payback beats a cheaper one), ties as above, none if none affordable; (2) a challenger at 0.91× the current payback never takes over (any duration); at 0.90× it takes over once the current pick has held 2 s: at t = 0.5 s after the pick appeared → switch at t = 2.0 s, not before; (3) a challenger at 0.80× appearing 3 s after the pick → switch in that same evaluation; (4) buy the current pick → new pick in the same tick, no hold; (5) coins drop below the current pick's cost → immediate re-pick (or no highlight); (6) no state change for 5 s → the 5 s fallback re-check runs exactly once.
- **M4A-41 No flicker between near-equal rows (new, v1.4).** Fake-clock test with steady income, 60 s, both rows affordable throughout:
  - (a) two rows whose paybacks stay within 10% of each other (e.g. 100 s vs 95 s) → **0 highlight changes** after the initial pick;
  - (b) two rows that swap which is better every 3 s, always within 10% (e.g. 100/95 s ↔ 95/100 s) → **0 highlight changes**;
  - (c) control: one row improves to ≤ 0.9× → exactly **1** change, no earlier than 2 s after the initial pick.
  - (d) newly affordable rows (HoP 16:15): with a pick showing, three cheaper rows become affordable one after another (e.g. at t = 10/20/30 s), each with payback 0.95–1.0× the current pick's → **0 changes**; then a row becomes affordable at **0.85×** → **1 change, in that same evaluation (no 2 s wait)**. With no pick at all, the first row to become affordable is highlighted in the same evaluation.
  - The same cases run for the next-goal hint (UC6). The hint must show the same row as the highlight whenever the overall best option is a Farm-tab row; if it is Collection or a worker, the hint may differ (scope, HoP 16:15).
- **M4A-19 Bonus strip.** The top of the Farm tab shows the Balanced-farm strip:
  - segmented progress with **one segment per track** (Hens, Egg value, Farm), each filled to min(level, N)/N, where N is the next `balanced_levels` threshold;
  - the label `Balanced farm {k}/5 · next +{x}% at all ≥ {N}` (Art & UX copy);
  - the weakest track's segment visually marked (lowest fill; ties mark all tied);
  - at the top tier, the strip shows `Balanced farm 5/5 · +{y}%` with full segments.
- **M4A-20** Badges: the Upgrades nav badge and the Farm tab badge show when any Farm-tab row is affordable (existing badge rule, extended to three rows).
- **M4A-21** Accessibility:
  - each row's button has an aria-label with track, level, cost and effect;
  - the strip has a text alternative (`Balanced farm {k} of 5. Weakest: {track}, level {L} of {N}.`, e.g. "Balanced farm 2 of 5. Weakest: Egg value, level 8 of 10.");
  - reduced motion replaces strip and highlight animations with static states.

## 7. Next-goal candidates
- **M4A-22** next-goal.ts adds the candidates HENS (cost `hens_cost[H]`, only if H is below its cap and below `maxLevel`) and VALUE (cost `egg_value_cost[V]`, same rule). GOAL_ORDER becomes FARM, HENS, VALUE, COLL, W1–W4.
  - Selection = best payback with the 3-buy look-ahead (same rule as M4A-18 and rc1 bestBuy; HoP 15:29), not cheapest-first. GOAL_ORDER only breaks remaining ties.
  - Labels: "Hens L{n}", with the suffix ": bigger coop" when n is a Hens milestone (`Hens L{n}: bigger coop`; Art & UX m4-tracks-copy.md); "Egg value L{n}", with the suffix ": {grade}" when n is a grade threshold (and its Farm gate is met).
  - **v1.18: the next-goal STRIP label for a Hens/Egg value target follows §18 (F4, D-HOP-29), not the m4-tracks-copy strings above.** The m4-tracks-copy strings stay for milestone toasts (M4A-12) and the in-row "Next at L{n}" hint only.
  - Tapping the goal opens the Farm tab and pulses that row (same behaviour as today's "Upgrade Farm →").
- **M4A-23** A capped track is never a candidate. A track at MAX is never a candidate. With all tracks capped or at MAX and nothing else available, the next-goal "done" state appears only when every candidate source is exhausted.

## 8. Onboarding
- **M4A-24** The FTUE step 3 ("buy your first upgrade") completes on any purchase from any track (the existing `upgrade` event, now with `track`). Its spotlight targets the highlighted row.

## 9. Gate mapping (upgrades §9a)
- **M4A-25** Each item keys on the track below. QA verifies each with a test that changes only the other tracks and checks the item doesn't change.

| Item | Driver |
|---|---|
| coopCapacity | F |
| queueMax | F |
| patienceS | F |
| customerIntervalS | F |
| demandRange | F (reference curve) |
| coopTier / celebratedTier | F |
| Worker unlocks w1/w2/w3 (`w*_unlock_farm`) | F |
| Grader tiers (`w4_tier`) | F |
| Wages (`wagePerSecCents`, `wageCents`, `resumeNeedCents`) | F |
| Coop-hand tip (`coop_hand_tip_min_farm`) | F |
| Workers intro A | F |
| farmLabel suffixes | F |
| eggsPerSec (tick and offline) | H |
| eggPriceCents | V (+ grade, Balanced, Grader; never C) |

- **M4A-26** The debug panel adds h± and v± (clamped to cap and max) and shows F/H/V/C. These are debug builds only.

## 10. Save migration: v6 + `tracksV7` marker (engineering/m4-design.md v0.2.8, ADR M4-8; upgrades §9; M4-AC-MIG1)
- **M4A-27 (v1.6, ADR M4-8)** `SAVE_VERSION` **stays 6 for M4-A**. With M4 on, a save without the marker (v1..v6, after the existing chain to v6) is price-matched once by `migrateTracksV7` and gets `state.tracksV7: 1` (literal 1, inside `state`, covered by `sum`; top-level `version` stays 6). New M4 farms are marked at creation. The marker path is allowed only in playtest and M4-flagged builds, never as a release default. Flag-off builds load a marked save normally and **never strip the marker or track fields on write**. *The real v7 bump (`readMax = writeVersion = m4On ? 7 : 6`, `migrations[6] → v7`, `v6BackupId`) is S-4, later; Product does not need it for M4-A.*
  - The state adds integer fields `hensLevel`, `eggValueLevel`, plus the UI flag `seenTracksExplainer` and the milestone-seen set (M4A-12). `migrationRefundCents` is **not stored** in the interim; S-4 adds it (ADR M4-10).
  - The validator adds both levels to its integer and range checks: 0 ≤ level ≤ the track max. On load, Hens/Egg value are clamped (and refunded per M4A-29) **only above `maxLevel` (30)**; the F + offset caps are enforced at purchase only, so grandfathered over-cap levels (M4A-28) survive reload. No new save field. **APPROVED (HoP, decisions.md 2026-10-16 14:46).**
- **M4A-28 Price-matched start (Economy rule, APPROVED by HoP 2026-10-16).** The migration sets `hensLevel = farmLevel` and `eggValueLevel` = the lowest V in economy.csv whose v7 price (M4A-5, incl. grade) is ≥ the v6 price, searched over V = 0..`maxLevel` (30) with **no** min(F+3, 30) cap — **B1 APPROVED (HoP, decisions.md 2026-10-16 14:45), grandfathered at migration only**. Fixes all 186/961 saves where the cap could not reach the v6 price (all C ≥ F+5; worst F0/C30 → V12). Afterwards the Egg value cap blocks *buying* V until F + 3 > V. No new save field; over-cap migrated levels are not clamped or refunded (M4A-27, M4A-29 refund stays 0). collectionLevel keeps its paid levels. farmLevel, coins, coop, basket, customers, workers and graderTier are unchanged.
  - Fixtures assume Collection C = F-3 (C7/C12/C17), giving Egg value start V = 7/10/14 at F10/15/20. Other C values map per the table in qa/m4-ac-testability.md (from Economy).
  - Fixtures `m4-v7-*-F{f}-C{c}` (Economy canonical, H = F, C = F−3; **verified independently by PM Farm against economy.m4-candidate.csv + economy.f1.csv**; QA's V=8/11/15 was off by one):
    - F10/C7, Grader none → V7: v6 $2.76 → v7 $3.01
    - F15/C12, Grader none → V10: $4.27 → $4.74
    - F20/C17, Grader = highest unlocked (F18 tier), same on both sides → V14: $6.08 → $6.55 before the Grader. QA may run F20 with the Grader off: it multiplies both sides equally, so V14 is unchanged. Edge: V13 gives $6.07, $0.01 below, so price rounding must follow M4A-5 exactly.
  - **Additional C-sweep fixtures (2026-10-16, review B1; expected V from `product/farm/m4/m4a_b1_sweep.py`, H = F, Grader off):** F0/C0 → V0 ($1.00→$1.00); F10/C0 → V3 ($1.50→$1.56); F10/C10 → V8 ($3.30→$3.32); F10/C30 → V15* ($6.90→$7.04); F15/C0 → V4; F15/C15 → V11; F15/C30 → V17; F20/C0 → V5 ($2.00→$2.42); F20/C20 → V15; F20/C25 → V17; F30/C30 → V20 ($11.50→$12.75); F0/C5 → V4* ($1.60→$1.78); F1/C6 → V5* ($1.81→$2.20); F3/C10 → V7* ($2.53→$2.73); F5/C14 → V9* ($3.35→$3.65); F13/C30 → V17* ($7.59→$8.08); F0/C30 → V12* ($4.60→$4.88); F5/C30 → V13* (C ≥ F+5 set confirmed by Economy and PM Farm). *\* = over the F+3 cap (grandfathered, B1 APPROVED). HoP-named fixtures: F0/C5, F3/C10, F5/C14, F13/C30.*
  - **Rounding (HoP 14:45):** the migration price check compares integer cents, with one half-up rounding step (M4A-5). Unit tests: F20/C17 → V14 (V13 = 607 ¢ < 608 ¢), F10/C7 → V7, F15/C12 → V10, computed in integer cents with one half-up rounding at the end.
  - **(Product) Income cap (testable form):** bot = Economy `product/sim/m4/m4_active.py`, players `seller15` and `casual`, 30 seeds, workers hired as in the v6 fixture, golden egg / streak / abilities off. Metric = coins earned in the first 60 s after load, v7-migrated save ÷ the same v6 save on the same seed. Threshold: the median ratio ≤ 1.5 for each player at each fixture F10/C7, F15/C12, F20/C17. *Economy measured: seller15 1.31/1.32/1.37×, casual 1.23/1.24/1.23×. All pass.* M2 (HoP ACCEPTED 14:45): with the M1 Hens fix the full static sweep is **≤ 1.5× on all 961 saves** (Economy 2026-10-16: top 5 F12/C1 1.352, F16/C0 1.344, F9/C2 1.344, F28/C25 1.328, F23/C29 1.324; C = F−3 fixtures 1.09/1.11/1.08×). The dynamic catch-up burst stays the accepted 10-min burst.
  - Telemetry: `save_migrated {from: 6, to: 6, migration: 'tracksV7_marker'}` once per migration (HoE ruling; `to` always = the SAVE_VERSION actually written; S-4 will emit `{from: 6, to: 7}`).
  - Rationale (Economy): first-minute income ×1.23–1.37 after migration. Final (HoP).
  - **(TR-4) Never-lower stats on load:** for every v6 fixture (existing QA fixtures plus new ones at F0, F5, F10, F15, F18, F20, F29 and F30), after migration **eggs/s ≥ the v6 eggs/s and the charged egg price ≥ the v6 price** (same Grader state). Price is the new formula (M4A-5) at the migrated V. Queue max, interval and demand range are equal (Farm-driven); coop capacity is ≥ v6 (equal below H10, raised by Hens milestones, M1). The in-tab lay rate matches v6 exactly at every Farm level (H = F, no milestone on lay rate, M1); offline eggs/s is ≥ v6; price may rise because the +12% moves to Egg value. Matches m4-manage-proposal.md TR-4 (line 123).
  - Milestones, grades and Balanced tiers already reached at the migrated levels **apply immediately** and are marked celebrated silently: no toast, popup or reward replay (HoP; resolves G3).
  - Loading twice gives a deep-equal state (idempotent).
- **M4A-29 Cap-and-refund (M4-AC-MIG1, guard).** Under the price-matched rule and current data **`migrationRefundCents` = 0 for every save**. There is **no Collection refund** (Collection keeps its levels). The clamp refund stays as a guard for a future cap change and is tested with a lowered-max fixture table. If a migrated Hens or Egg value level exceeds that track's max, the level is set to the max. The refund in cents is the sum of that track's CSV cost column over the removed levels, read from `economy.csv` (never a code constant).
  - Interim (ADR M4-10): the marker migration **never refunds** (`migrateTracksV7` returns the refund, 0 with current data, and it is not applied). At S-4 the refund is added to coinsCents and stored in `migrationRefundCents`.
  - It is applied exactly once: reloading a migrated save never adds it again (QA test: re-load does not double it).
  - With the current table (caps F+3, max 30) no level is removed and the refund is 0; tests use a fixture table with a lowered max to cover the refund path.
- **M4A-30 Order on load (v1.13, per N8):** the AC11 boot grant is computed first under v6 rules, then the migration commits in-session; grants after the commit use the migrated `hensLevel`, and **the first offline grant after migration uses a Hens offline multiplier of ×1.0** (MJ1, HoP 14:54: that time away was under the old rules); every later grant uses the full `hens_msK_offline_mult`. The grant is not counted as an extra uplift in the M4A-28 income cap.
  - Test (migrated F10/C7 save, so H = 10, ×1.25): away 3 h before the first M4-on load that runs the marker migration → first grant **19800** eggs (2.75 × 7200 × 1.0); play, then away another 3 h → second grant **24750** (× 1.25). Same save away 1 h each time: **9900** then **12375**. Reloading after the first grant never re-applies it. A pending offline grant from the absence (the welcome-back modal) is kept as computed and is never shown twice.
  - **N8 (HoP 22:04): boot grant under v6 rules.** The migration commits in-session (after boot, ADR M4-16), so the offline grant at boot is computed under v6 rules at ×1.0, consistent with MJ1. AC (S-5): unmarked v6 F10/C7 save, away 3 h → boot grant **19,800** eggs (×1.0), then the in-session commit; reload after another 3 h away → **24,750** (×1.25). If the migration is deferred or aborted at that boot, the boot grant is an ordinary v6 grant (19,800 for 3 h).
  - **Single ×1.0 grant (v1.14; supersedes any wording above that implies more):** there is no migration-grant flag. Rule: **the committing session's boot grant is the single ×1.0 grant** (computed under v6 rules before the in-session commit); every grant from the next load on uses the full multiplier. Deferred/aborted boots are plain v6 sessions (v6 grants). Result on every path: 19,800 at boot, then **24,750** on the next load (×1.25) at F10/C7, 3 h + 3 h. A fresh M4 farm has no ×1.0 grant.
    - AC (r3a): paths (i) commit at first boot, (ii) 2 deferrals then commit, (iii) abort then commit, (iv) commit with away < 60 s (no boot grant) → in each, the next 3 h absence after the commit pays **24,750**; no path pays 19,800 twice after a commit.
  - **Crash safety (r3 mn3):** the boot grant (`pendingOfflineEggs`), the new `savedAt` and the state are persisted in **one** `save()` (a single `eggfarm.save` setItem); no intermediate write between computing the grant and stamping the time.
    - AC (r3b, crash test with a fake KV that can kill after any write): (1) kill before the post-grant write → the next boot recomputes the same single grant from the old `savedAt` (not added to the earlier one); (2) kill after it → the next boot sees the new `savedAt` and pays nothing for that absence; (3) kill between that write and the in-session commit → the save is still unmarked v6, the grant is not repeated, and the migration retries; (4) in no case does total granted eggs exceed one grant per absence.
  - There is no mid-purchase state to migrate.
  - The save is written as **v6 with `tracksV7: 1`** at the next save point after load (v7 only from S-4).
- **M4A-31 Downgrade / rollback (Head of Engineering, 2026-10-16).**
  - (a) **Backup (ADR M4-10/12/15/16):** before the in-place `tracksV7` price-match, the game writes the original validated raw v6 bytes once to `eggfarm.save.v6_backup` (**localStorage only in M4-A**, ADR M4-24), tagged with this attempt's `migrationId` for the read-back. Write-once once committed, so later saves never overwrite it. The marked save is committed only after the LS backup is confirmed. *IDB `save/v6_backup` mirror and the formal `{migrationId, raw}` record-shape/orphan AC: deferred to S-4 per ADR M4-24.* **LS read-back (Saves QA / HoQA bar for M4-16):** before the in-place write, `eggfarm.save.v6_backup` is read back and its `migrationId` must equal this attempt's; a failed read or a mismatch triggers the M4-12 abort (stay v6, `save_migration_aborted {store: 'ls', reason: 'error', path}`, retry next load). A failed write aborts the migration (see (f)1).
  - (b) **Refuse newer saves** (applies to v7 saves from S-4 on; a marked v6 save is not "newer" and loads normally in every build): any build that finds a stored save whose version is greater than its own SAVE_VERSION must not load, migrate, overwrite or clear it, and must leave `eggfarm.save.v6_backup` untouched. It shows the full-screen, session-long `.newer-save` layer with the message "This save is from a newer version of Egg Farm. Open the newer build to keep playing." It does not start a new game that autosaves over the save; autosave stays disabled for that session.
  - (c) **Restore:** opening the rc1 / flag-off build after the marker migration loads the marked v6 save and keeps the marker, track fields and `v6_backup` intact (never stripped on write). From S-4: opening the rc1 build after a v7 save exists keeps both keys intact, and reopening the v7 build continues with no loss.
  - (d) **Tests:**
    - unit tests for (a) and (b), including a backup-write-failure case;
    - a browser test in all 3 engines (S-4): the rc1 (v6) build loads the v7 fixtures and then reloads; afterwards localStorage and IndexedDB are byte-identical to before and `eggfarm.save.v6_backup` is present.
  - (e) **Already shipped:** the guard in (b) ships in the save-durability merge before the rc1 tag. Builds already out (rc1-pt1, m2) are verified by QA and documented, not changed.
  - (f) **Clarifications for QA (2026-10-16, qa/m3-recheck/rc1-pt1-t3-rollback.md):**
    1. *IndexedDB: unavailable vs deferred vs failed (v1.7; HoP decisions.md 21:59 amendment, replacing the v1.6 open-timeout rule):*
       - **Definitely unavailable → LS-only migration (path (g)):** there is no `indexedDB` global, or `indexedDB.open` throws or rejects with a private-mode/security error. Reasons: `security` = `SecurityError`, `InvalidStateError` or any private-mode error (including a synchronous throw from `open`). `onblocked` is **not** unavailable: it defers (`idb_blocked`, below). A timeout is **never** 'unavailable': it is an `idb_timeout` deferral. The migration proceeds with the localStorage `v6_backup` alone (read-back with matching `migrationId` still required) and fires `save_backup_idb_unavailable {reason: 'no_global'|'security', path}` once per load.
       - **Deferred (new path (d1)):** the open doesn't answer within **T = 1500 ms** (an open answering at 1499 ms is available), `onblocked` fires (another tab holds an old connection; v1.9, HoP 22:09), the open fails any other way, or an IDB read fails, or localStorage lacks quota headroom (`quota_headroom`, (j)). The migration does **not** run: stored `eggfarm.save` stays byte-identical v6 with no marker, the session keeps flag-off rules, `save_migration_aborted {store: 'idb', reason: 'idb_timeout'|'idb_blocked'|'idb_read_error'|'quota_headroom', path, attempt_count}` fires once, and the next load retries. *Rationale: a slow IDB could hide a newer save, and migrating would overwrite it.* T equals the mirror's existing 1.5 s open timeout.
       - **`attempt_count`:** the number of consecutive failed migration attempts (aborts and deferrals), stored as an integer in localStorage key `eggfarm.save.migration_attempts` (on the design §3b write allowlist; cleared by Settings > Reset via `RESET_KEYS`; **removed on commit**; never written on the newer-save refusal path, which stays zero-writes). **Every failed attempt increments it** ([abort] and [deferral] alike, v1.12), capped at 3. At `attempt_count` ≥ 3 the same `save_migration_aborted` event carries **`stuck_on_v6: true`** (chosen: one event with a flag, not a separate `save_migration_stuck` event). The migration is **never forced**.
       - **Failed → abort (path (h), unchanged):** the localStorage backup write fails, the localStorage read-back fails or its `migrationId` doesn't match (`readback_mismatch`), (ADR M4-12/M4-13). *IDB backup-write failures (incl. `idb_write_timeout`): deferred to S-4 per ADR M4-24.* T = 1500 ms covers the IDB open only. Stored `eggfarm.save` stays v6 with no marker, the session keeps flag-off rules, `save_migration_aborted {store: 'ls', reason: 'quota'|'error'|'readback_mismatch', path, attempt_count}` fires once, and the migration retries on the next load with a fresh `migrationId`. No player-visible message unless the normal v6 save also fails (v2.2 "Can't save" notice).
       - Simulate with a fake IDB / KV stub and a fake clock (ACs (g), (d1), (h)).
    2. *Names:* the localStorage key is `eggfarm.save.v6_backup`. IDB uses database `eggfarm`, store `save`, key `v6_backup`, next to the existing key `main`. The other keys are `eggfarm.save`, `eggfarm.save.bak`, `eggfarm.save.corrupt.<ts>` and `eggfarm.save.corrupt.index`.
    3. *Newer* means the parsed `version` is an integer and greater than the build's SAVE_VERSION. A missing, non-integer or unreadable version goes through the corrupt path. The version check runs before validating the checksum, so a newer save with a bad checksum is still refused, not treated as corrupt.
    4. *Message:* a full-screen layer `.recovery-layer.newer-save` (with `data-version`) that stays up for the whole session, plus a "Try again" button that only reloads the page. Nothing behind it, including "Tap to start", leads to a playable game. Use `.newer-save` as the test selector.
    5. *Byte-identical* covers only the save keys: `eggfarm.save`, `.bak`, `corrupt.*`, `corrupt.index`, `v6_backup`, and IDB `save/main` and `save/v6_backup`. Telemetry and UI settings may change.
    6. *No writes at all* while refused: no autosave, no pagehide or visibilitychange save, no save on load, no .bak rotation, and no IDB mirror. Add a second-tab test (the second tab also writes nothing) and fixtures that reopen the v7 build after the v6 build ran (v7 continues with no loss).
  - (g) **AC: IDB definitely unavailable → LS-only migration (fake IDB).** Cases: `no_global` (`indexedDB` undefined) and `security` (open throws `SecurityError`; also run with `InvalidStateError` and with a private-mode error → all `security`, proceed on localStorage). Load an unmarked v6 fixture with M4 on:
    1. the migration completes: stored `eggfarm.save` has `tracksV7: 1` and migrated levels;
    2. `eggfarm.save.v6_backup` exists and its `raw` equals the pre-migration `eggfarm.save` bytes exactly, with `migrationId` equal to the committed save's id; it was read back before the in-place write and the id matched;
    3. `save_backup_idb_unavailable` fires **exactly once** with the matching `reason`, and `path` set;
    4. no IDB write is attempted (fake IDB records zero puts); `save_migration_aborted` does not fire; `attempt_count` is reset to 0.
    - **onblocked → defer (v1.9):** the fake IDB fires `onblocked` on open → no migration (byte-identical v6, no marker, no committed backup), `save_migration_aborted {store: 'idb', reason: 'idb_blocked', path: 'interim', attempt_count}` fires once with `attempt_count` = previous + 1; `save_backup_idb_unavailable` does not fire; next load retries.
    - **Private mode → unavailable (v1.9):** the fake IDB rejects open with the private-mode error → `reason: 'security'`, migration proceeds on localStorage alone (items 1–4 above).
    - **Read-back mismatch (must abort):** IDB unavailable, the fake LS returns a `v6_backup` whose `migrationId` differs (or the read throws) → no migration (byte-identical v6, no marker), `save_migration_aborted {store: 'ls', reason: 'readback_mismatch', path: 'interim'}` fires once, play stays on v6, next load retries with a new `migrationId`.
  - (d1) **AC: deferral (fake IDB, fake clock, T = 1500 ms).**
    1. open answers at **1499 ms** → available: the migration runs (backup in localStorage only, ADR M4-24); no deferral event.
    2. open still pending at **1500 ms** → deferred, `reason: 'idb_timeout'`.
    3. open fails with a generic error (not security/private mode) → deferred, `reason: 'idb_read_error'`.
    4. open succeeds but an IDB read (e.g. `save/main`) fails → deferred, `reason: 'idb_read_error'`.
    For 2–4: stored `eggfarm.save` byte-identical, still v6, no marker, no committed backup; `save_migration_aborted` fires exactly once with that reason and `attempt_count`; `save_backup_idb_unavailable` does not fire; next load retries.
    5. **Sequence:** four loads with the open timing out → `attempt_count` 1, 2, 3 (with `stuck_on_v6: true`), 3 again (capped, `stuck_on_v6: true`); on the fifth load IDB answers at 100 ms → migration commits, the count resets to 0, and a following deferral (if forced in the fake) reports `attempt_count: 1` with no stuck flag. The migration is never forced at any count. An abort (h) between deferrals also increments the count (v1.12). *Sequence 1, 2, 3, 3 + `stuck_on_v6` confirmed against Architect design 96c4a1e.*
    7. **Deferral session writes no IDB mirror (v1.9, HoP 22:09):** after any deferral (`idb_timeout`, `idb_blocked`, `idb_read_error`), play 60 s with autosaves, a pagehide and a visibilitychange save → the fake IDB records **zero** puts/deletes (no `save/main` mirror, no `v6_backup`); localStorage `eggfarm.save` is written as v6 on each save.
    8. **`idb_main_changed` (v1.11):** just before commit the IDB `save/main` copy is re-read. (i) The fake IDB returns a `main` that ranks newer than the boot copy under M4-19 → no commit, stored `eggfarm.save` byte-identical v6, no marker, `save_migration_aborted {store: 'idb', reason: 'idb_main_changed'}` once, `attempt_count` +1; the IDB mirror resumes on the next normal save. (ii) The re-read throws → same outcome and event, `attempt_count` +1, and the IDB mirror stays **off** for the rest of the session (zero IDB writes until reload). Next load retries in both cases.
    6. **`eggfarm.save.migration_attempts` key:** (i) after two deferrals (value 2), Settings > Reset removes the key; (ii) a successful migration removes the key in the same commit; (iii) on the newer-save refusal path (M4A-31(b)) the key is never written or removed (zero writes, (f)6), even when IDB times out.
    *Items (attempt key, T for open + write, deferral-only count, reason mapping) confirmed by the Architect 2026-10-16; ADR M4-16 being updated.*
  - (h) **AC: localStorage backup fails → abort (fake KV).** The LS `v6_backup` setItem throws `QuotaExceededError` → `reason: 'quota'`, or another error → `reason: 'error'` (read-back mismatch is covered in (g)):
    1. no migration: stored `eggfarm.save` is byte-identical to before, still `version: 6`, no `tracksV7` marker, no backup id;
    2. `save_migration_aborted {store: 'ls', reason, path: 'interim', attempt_count}` fires exactly once (`attempt_count` +1, v1.12); `save_backup_idb_unavailable` does not fire;
    3. the session keeps playing under flag-off rules and its normal v6 saves still happen;
    4. no *committed* `v6_backup` remains (any partial LS record is unreferenced);
    5. next load with the failure removed: the migration retries with a new `migrationId`, commits, and the ×1.0 first offline grant applies once.
    6. **Repeated aborts reach stuck (v1.12):** three consecutive loads where the in-place commit write fails (`commit_write_failed`) → events report `attempt_count` 1, 2, 3, and the 3rd carries `stuck_on_v6: true`; a 4th failure stays 3 + stuck. Same sequence with `readback_mismatch` on three consecutive loads. Then a load with no failure commits and **removes** `eggfarm.save.migration_attempts` in the commit (no separate reset); stored save unchanged v6 on every failed load.
    *IDB backup-write rows (put/transaction failure, `idb_write_timeout` hang): deferred to S-4 per ADR M4-24.*
  - (i) *Backup record shape `{migrationId, raw}` and orphan rule (N8, HoP 22:04): deferred to S-4 per ADR M4-24.*
  - (j) **AC: quota headroom (HoP 22:13).** Before the backup and in-place write, defer with `save_migration_aborted {store: 'ls', reason: 'quota_headroom', path, attempt_count}` (attempt_count +1) unless localStorage free space ≥ **2 × (new save bytes + `v6_backup` bytes)**, verified by a trial write of that size to a scratch key that is then removed (measurement method owned by the Architect). Test (fake KV with a quota): near-full storage (free space below the threshold) → deferred, `attempt_count` +1, stored v6 `eggfarm.save` byte-identical, no `v6_backup` written, and the trial key absent afterwards; with free space at/above the threshold → the trial key is removed and the migration proceeds.
  - (k) **AC: zero IDB writes in M4-A (ADR M4-24).** Across every path in (g), (d1), (h) and (j), the fake IDB records **zero** puts, deletes and write transactions during the migration attempt (opens and reads only). Test: run each path with a recording fake IDB and assert the write log is empty.
- **M4A-32 Tests:**
  - migration unit tests for the `tracksV7` marker path (unmarked v6 and an older-version chain to v6, then marked; marked save idempotent); v6→v7 tests move to S-4;
  - the refund path (lowered-max fixture table);
  - re-load idempotence (refund once, explainer once);
  - the offline order;
  - new fixtures `m4-v7-*-F{f}-C{c}` (C and Grader tier stated per fixture, M4A-28), with `SHA256SUMS.txt` updated.

## 11. One-time explainer (M4-AC-EXP1; merged from m4a-eng-addendum.md; Art & UX m4-tracks-explainer.md v1.3; EXP1 mismatches closed)
- **M4A-33** Trigger: shown only to existing saves, **when the `tracksV7` migration commits in-session** (N8, HoP 22:04), not on the first M4 load (the save had no marker before). A new M4 farm (marked at creation) never shows it.
  - AC: (a) fake IDB delays the commit by 1 s after boot → the explainer appears at the commit (within one frame), not at boot; (b) a deferred (d1) or aborted (h) load shows no explainer, and the load whose commit succeeds shows it once; (c) reload after commit → not shown again.
  - Shown on the first load after migration on **whatever screen is open** (no Farm-tab condition; Art & UX explainer v1.3). ~~Anchored to the tracks block when it's on screen; otherwise top-centre under the top bar~~ **(superseded v1.19, D-PMFU-2026-10-19-09: fixed top-centre at 72 px as built, M4A-EXP-B4)**, **no arrow**; after dismiss the normal best-buy highlight (M4A-18) does the pointing. **Non-blocking = no input is ever blocked**: no scrim, the tick advances and a Collect tap registers while it is visible.
  - Framing: the coach mark presents the post-migration catch-up burst (cheap Egg value levels up to the cap) as the upgrade moment. Copy (Art & UX m4-tracks-explainer.md v1.2, final): title `Upgrades got an upgrade!`; body `Hens and Egg value are now separate. Top them up!` (≤2 lines at 360 px); button `Got it` (≥44×44 px).
  - Refund line `We refunded +$X for your old upgrades.` (coin icon, standard money format) only if `migrationRefundCents` > 0; omitted at 0.
  - Dismiss: shown once. "Got it", any tap, Esc, or 8 s dismisses it. **The dismissing tap passes through to the game and is never swallowed** (v1.3). Coin pop/burst on dismiss when refund > 0.
  - Persist `seenTracksExplainer = true` as soon as it is shown, so reload, closed tab or dismissal never re-shows it.
  - Motion: 200 ms pop-in, 150 ms fade-out. **Reduced motion (`prefers-reduced-motion: reduce`): a 150 ms opacity fade only, no scale.**
  - Accessibility: role="dialog", aria-modal="false"; focus moves to "Got it"; AA contrast. Fits above the tracks block at 360 px (below if not).

## 12. Telemetry
- **M4A-34** Events:
  - The `upgrade` event gains `track: 'farm' | 'hens' | 'egg_value' | 'collection'` and keeps `newLevel`, `cost` and `coinsBefore`. The `upgrade` field is kept as an alias for one release.
  - New events:
    - `milestone_reached {track, level, mult}`;
    - `balanced_tier {tier, min_level}`;
    - `save_migrated {from: 6, to: 6, migration: 'tracksV7_marker'}` (fires once; `to` = SAVE_VERSION actually written; S-4 emits `{from: 6, to: 7}`);
    - `save_migration_aborted {store: 'ls'|'idb', reason, path: 'interim'|'v7', attempt_count, stuck_on_v6?: true}` (once per load). Reasons:
      - `quota` [abort] — LS `v6_backup` write throws QuotaExceededError (h)
      - `error` [abort] — LS `v6_backup` write throws another error (h)
      - `readback_mismatch` [abort] — LS read-back fails or `migrationId` differs (g)
      - `commit_write_failed` [abort] — the in-place write of the marked save to `eggfarm.save` fails; stored save stays the prior v6 bytes
      - `idb_timeout` [deferral] — IDB open not answered within T = 1500 ms (d1)
      - `idb_blocked` [deferral] — IDB `onblocked` fires (d1)
      - `idb_read_error` [deferral] — open fails another way, or an IDB read fails (d1)
      - `quota_headroom` [deferral] — LS free space < 2 × (new save + `v6_backup`) bytes (j)
      - `idb_main_changed` [deferral] — pre-commit re-read of IDB `save/main` ranks newer than the boot copy (M4-19) or the re-read fails (d1)8
      - *`idb_write_timeout`: deferred to S-4 per ADR M4-24.*
      - **Counting rule (v1.12):** every failed attempt, [abort] or [deferral], increments `attempt_count`, capped at 3; `stuck_on_v6: true` when `attempt_count` ≥ 3. The tags only describe the cause.
      - **Note:** `eggfarm.save.migration_attempts` is a plain integer, capped at 3 (it stays 3 on further deferrals, with `stuck_on_v6` set). "Aborted" names the event, not a permanent stop: every reason leaves play on v6 with no marker and retries on the next boot. The migration is never forced.
    - `save_backup_idb_unavailable {reason: 'no_global'|'security', path: 'interim'|'v7'}` (once per load; ADR M4-16, HoP 21:56);
    - ~~`tracks_explainer {action: 'shown' | 'dismissed'}`~~ → **v1.19 (D-HOP-32 2):** `tracks_explainer_shown {}` and `tracks_explainer_dismissed {method: 'button' | 'tap' | 'esc' | 'timeout'}` (M4A-EXP-B11; M4.1 fix with M41-9).
  - `worker_hire` and `worker_yawn` add `hens_level` and `egg_value_level` next to the existing farm level.
  - `session_start` / `session_end` add `farm_level`, `hens_level`, `egg_value_level` and `collection_level`.
  - All new events are pinned like `upgrade` (telemetry.ts isPinned). The JSON export includes them.

## 13. Balance gate: TR-5 (M4 AC7)
- **M4A-35** (TR-5) `python3 product/farm/m4/tr5_run.py --csv product/economy.m4-candidate.csv --seeds 30 --scenario standard` (rebinds to `economy.csv` once Economy merges F1 + F1-GAP + M4 columns; today's main fails) prints `RESULT: PASS` and exits 0. **In band = the median seed in band AND ≥ 80% of seeds (24/30) in band**, for all three criteria:
  1. time to Farm L18 within ±10% of the F1 reference (*19.75 min → 17.8–21.7 min*; a seed that never reaches L18 is out of band);
  2. Farm level at 30:00: **L18–L22 for no-worker runs** (unchanged; default command above) and **L20–L24 for runs with workers** (HoP decisions.md 14:58; the upper bound catches runaway pacing). With-worker gates (canonical, run from the repo root, exit 0 = PASS; `--workers` implies the L20–24 band and stops the clock once everything is bought):
     - `python3 product/farm/m4/tr5_run.py --csv <gating table> --workers`
     - realistic: `python3 product/farm/m4/tr5_run.py --csv <gating table> --workers --refill-delay 60 --ability-jitter 60 --ability-skip 0.2`, at 30 min and with `--minutes 60` (gap ≤ 3.0 min over the whole run).
     - *PM Farm rerun 2026-10-16, 30 seeds, all exit 0: f1-m4cols default L21, worst gap 1.50 (PASS); `--workers` L23 (min L23, max L24), worst gap 1.00 at F17 (PASS); m4-candidate `--workers` identical (PASS); realistic L23, gap 1.00 (PASS); realistic `--minutes 60` worst gap 2.00 at F29 (PASS). Cross-check `product/sim/m4/m4_workers_prog.py` standard with workers: L23, F30 at 40.75 min, worst gap 1.50, 30/30, complete 30/30.*
     - *Caveat: the base `--workers` model is optimistic (always refilled, perfect abilities); the realistic options are the guard, and the L24 upper bound catches runaway pacing.*
     - **14:58 workers + Grader re-check: PASSED**, so the M3 cost cut and the Grader top tier 51,567 stand as final.
  3. gap between consecutive purchases ≤ 3.0 min.

  **60-min ship gate (HoP 14:46):** the same command with `--minutes 60` must also pass criterion 3 (worst gap ≤ 3.0 min) over the whole 60-min run, same in-band rule. **PASS (known failure cleared, 2026-10-16):** M3 cost taper in `economy.m4-candidate.csv` and `economy.f1-m4cols.csv` (source of truth for L23–29; balance-changelog.md ~15:00): `farm_cost` L23 ×0.90 = 68756, L24–29 ×0.70 = 72194 / 97461 / 131573 / 177624 / 239792 / 323719; `egg_value_cost` L23 ×0.90 = 30484, L24–29 ×0.70 = 31534 / 41940 / 55780 / 74187 / 98670 / 131231; both strictly rising at every level (PM Farm check). **APPROVED by HoP (decisions.md 14:56)**, condition of strictly rising costs met. PM Farm rerun, 30 seeds: 60-min worst gap **2.75 min at F26, 30/30** (PASS); 30-min TR-5 PASS (F18 20.75, L21 30/30, worst gap 1.50); M4A-37 casual 0.5 tap/s 30/30, median 34.67 min (PASS). Re-check once workers and the Grader are modelled (HoP 14:52).
  
  The reference bot is the Collection-aware greedy best-ROI buyer (bundle search up to 3 buys; HoP decision). *Confirmation 2026-10-16 on f1 + 36/48: F18 median 18.88 (30/30), L@30 L22 (30/30), worst gap 1.75 min, PASS.*
- **M4A-36** TR-5 is re-run and must PASS after every `economy.csv` change that touches M4-A columns or config, and in CI on every release candidate. The `casual` and `d25` scenarios run as diagnostics: they are reported, not gating (risk R3).
- **M4A-37** AC7-soft (testable form): `python3 product/farm/m4/tr5_run.py --csv <gating table> --seeds 30 --scenario casual --taps 0.5 --minutes 45 --ac37` (casual = Poisson customer arrivals, tap 0.5/s, Sell all every 20 s, demand ×0.75; bot = the TR-5 greedy reference). Pass: ≥ 24/30 seeds reach Farm L18 within 45:00 (not reached = fail). *Economy 2026-10-16: 30/30, median F18 34.7 min.*

## 14. Active play: decisions matter
Run with the m4_sim.py bot set (Collection-aware greedy, Hens-first, Value-first, Balanced; standard scenario; 30 seeds; median).
- **M4A-38 Track switching.** For the greedy bot over purchases made between Farm L5 and L20:
  - the best buy's track differs from the previous purchase's track on ≥ 50% of purchases;
  - the longest run of consecutive same-track purchases is ≤ 3.
  *Reference: 42/53 switches, longest run 3.*
- **M4A-39 No dominant strategy.** Bots (`m4_sim.choose`, standard scenario, 30 seeds, median), defined here so QA needn't read m4-track-check:
  - *Hens-first* priority H > F > V; *Value-first* V > F > H; *Balanced*: the lowest of F/H/V first (ties F, H, V).
  - Each buys its top available item when affordable; otherwise it buys a lower-priority item only if it costs ≤ 50% of the top item; Collection only when eggs per tap < eggs/s and Collection costs ≤ 50% of the cheapest open track. Caps respected.
  - The F18-time medians of Hens-first, Value-first and Balanced lie within ±15% of the midpoint of their own range (max ≤ 1.15 × midpoint and min ≥ 0.85 × midpoint).
  - No fixed strategy beats the greedy reference's F18 time by more than 15%.
  - Each of the three reaches L@30 within the L18–L22 band (in-band rule as M4A-35).
  *Reference 36/48: F18 18.75–21.75 (about ±7.4% around 20.25), L@30 20–22.*
- **M4A-40 Farm-only is not a winning line (testable form).** Gate: `python3 product/sim/m4/m4a_gate40.py <gating table> [s15|casual]` (Economy), standard scenario, 30 seeds, exit 0 = PASS:
  - *Farm-only* bot (Farm when affordable; Collection by the M4A-39 tap rule): median Farm level at 30:00 ≤ greedy median − 3.
  - *Follow-the-highlight* bot (buys the M4A-18 best-payback affordable row as soon as one is affordable; Collection by the same tap rule): Farm level at 30:00 in L18–L22 (median AND ≥ 24/30).
  - *PM Farm rerun 2026-10-16 on economy.f1-m4cols.csv: greedy L21; Farm-only L7 (worst gap 7.50 min); highlight L21, 30/30, worst gap 1.50 min → PASS (matches Economy).* PM Farm's `product/farm/m4/m4a_m40_bots.py` (cheapest-row highlight) is **superseded**.
  - *With the v1.4 hysteresis (PM Farm copy `product/sim/m4/m4a_gate40_hyst.py`; Economy's script unchanged), f1-m4cols, 30 seeds: highlight L21 (30/30), F18 21.38 min, worst gap 1.50; Farm-only L7 → PASS, exit 0. The rule held the current pick over a <10%-better row 127 times.* Economy may fold this in as a flag.
  - This proves the UI steers a Farm-only player out of the stall.

## 15. Open items
| # | Item | Owner | Due |
|---|---|---|---|
| O1 | Merge `hens_cost`, `egg_value_cost`, `hens_cap_over_farm` and `egg_value_cap_over_farm` from `economy.m4-candidate.csv` into `economy.csv`; re-run TR-5 | Economy/Balance Designer | before M4-A build |
| O2 | Confirm the +12% default (`price_bonus_track` = `egg_value`) | HoP with PM Collection | Thu Oct 22 |
| O3 | Name and publish config for milestones, grades, Grader stacking and Balanced tiers (G1). Add columns hens_ms_*, egg_grade_*, balanced_*, egg_value_base_step, egg_value_level_bonus. Check the first 10 min after migration | Economy | with O1 |
| O4 | **Closed (2026-10-16):** M4A-40 gate is `product/sim/m4/m4a_gate40.py` (Economy, best-payback highlight); PASS. `m4/m4a_m40_bots.py` superseded | PM Farm Upgrades + Economy | done |
| O5 | Icons for Hens and Egg value, the bonus-strip and milestone-toast visuals, and the highlight style on rows | Head of Art & UX | before build |
| O6 | Buildability and estimate (migration about 2 days plus tests, plus rows, strip, next-goal and telemetry) | Head of Engineering | before kickoff |
| O7 | Test plan per AC; TR-5 in CI | Head of QA | before kickoff |
| O8 | Risk R1: casual Hens-first/Value-first end at L17 at 30:00 (non-gating). Check whether the highlight and Balanced 5/10/15 pull them into band | Economy + PM Farm Upgrades | with O4 |
| O9 | Risk R2: greedy L@30 sits at L22, the band's top edge. Any rest-of-M4 speed-up must re-run TR-5 | Economy | every change |
| O10 | Remaining Engineering questions from upgrades §9 b/c are answered by this spec (refund inside the migration; explainer, not silent). Engineering to confirm | Head of Engineering | before kickoff |

## 16. Gaps found while writing
- **G1: closed (2026-10-16).** `economy.m4-candidate.csv` now has `hens_ms1..3_level/coop_mult/offline_mult` (`hens_msK_mult` renamed to `hens_msK_coop_mult`, `hens_msK_offline_mult` added, M1, 2026-10-16), `egg_grade1..3_level/mult/farm_gate`, `balanced1..5_level/mult`, `egg_value_base_step` (0.05) and `egg_value_level_bonus` (0.12) (TR-6, renamed per QA 2026-10-16).
  - Economy must publish them (O3) before QA can test without hardcoding.
- **G2: closed (2026-10-16).** M4A-40 gate = `product/sim/m4/m4a_gate40.py` (PASS); `m4/m4a_m40_bots.py` superseded.
- **G5 (review 2026-10-16, product/farm/m4a-review-response.md):** B1 and M1 APPROVED (HoP 14:45).
- **G3: resolved (HoP 2026-10-16):** milestones reached at migration apply immediately and are marked celebrated silently (M4A-28).
- **G4:** the F1 reference time is 19.75 min in Economy's run versus "≈19.8" in HoP's wording. TR-5 uses 19.75; Economy to confirm it's final.

## 17. F3: one-time tracks explainer AS BUILT (v1.18, P41-5)
**Sources:** D-HOP-2026-10-19-11 and its 04:16 amendment (spec governs: existing saves only, non-blocking, copy, Got it ≥48px, refund line only if > 0, `seenTracksExplainer` set when shown, reduced motion = 150 ms fade). The amendment's "tap anywhere" dismissal is **superseded** by D-HOP-2026-10-19-14 / CEO ruling v1.15 (header v1.15 / v1.17). §11 M4A-33 stays the requirement; this section records what the B build actually does so QA tests one behaviour.
**Build read:** `246de09c8b329360754cc0d77a6cd6b6788b6ad4` (Product sign-off D-HOP-20; main `dd223f5` has the identical tree; QA tree /tmp/qa-rc/ffc3dfd). Files: `src/ui/tracks-explainer.ts`, `src/ui/app.ts:158-160, 703-704`, `src/game.ts:138-145, 227`, `src/ui/styles.css:511-518`, tests `tests/m4-exp1-explainer.test.ts`. The M41 line (882b97f) has not changed these files.

- **M4A-EXP-B1 Trigger.** Shown only when M4 is on and `seenTracksExplainer` is not true, from exactly two places: (a) `Game.onTracksCommitted` (the in-session `tracksV7` commit); (b) on load, when `state.tracksV7 === 1` **and** `eggfarm.save.v6_backup` holds a committed record whose `migrationId === state.v6BackupId` (D-HOP-13 reload fallback).
  - AC: (1) unmarked v6 save, M4 on → card appears at the commit, once; reload → not shown. (2) Commit, then reload before it showed (seen false, backup id matches) → shown on that load, once. (3) New M4 farm (no backup record) → never shown, on any load. (4) M4 off → never shown; a stored `seenTracksExplainer` is kept on load and save. (5) Deferred (d1) or aborted (h) load → not shown.
- **M4A-EXP-B2 When it waits / is skipped.**
  - Tab hidden, save not persistable (`canPersist === false`: read-only or inactive tab), or a modal open (`#modal-layer.open`, e.g. Welcome back!) → no card, flag unset, retried every **1000 ms** (`EXP_RETRY_MS`) until all three clear.
  - localStorage blocked (`storageBlocked`, the NO_STORAGE_TEXT signal) → no card, no flag, **no retry this session**; a later load with working storage shows it.
  - The flag write itself fails (QuotaExceededError → `storageFailed`) → no card, `seenTracksExplainer` reverted to false and saved again so the IDB mirror never carries `true`.
  - AC: (1) hidden tab → no card until visible, then shown within ≤1 s; (2) Welcome back! open → card only after it closes, and the 8 s timer starts when the card appears (not at boot); (3) storage blocked → no card, no flag, no save, no retry, reload changes nothing; (4) quota on the flag write → no card, `state.seenTracksExplainer === false`, no later save carries `true`; (5) mirror vs localStorage on the next boot → card shown exactly once overall.
- **M4A-EXP-B3 Content (exact strings).** Title `Upgrades got an upgrade!` (h2); body `Hens and Egg value are now separate. Top them up!`; button `Got it`. Refund line `We refunded +{money} for your old upgrades.` with a 16 px coin icon (alt="") only if `migrationRefundCents > 0` (always 0 in M4-A, M4A-29); omitted at 0.
  - AC: strings byte-exact; refund 0 → no `.tracks-exp-refund` element; refund > 0 (fixture) → line uses `fmtMoney`.
- **M4A-EXP-B4 Layout.** Non-modal card, no scrim: `position:fixed`, top-centre at **72 px** from the top, width `min(296px, 100vw − 32px)`, always (it is **not** anchored to the tracks block; this supersedes §11, D-PMFU-2026-10-19-09). Got it `min-height:48px`, full card width.
  - AC: at 360/375/390 and 1280 the card fits with and without the refund line; Buy and Collect are not covered (elementFromPoint at their centres returns the control); Got it hit box ≥ 48×48.
- **M4A-EXP-B5 Input and closing.**
  - A tap/click **outside** the card goes through normally (Buy buys exactly 1, Collect collects) and does **not** close the card.
  - A tap anywhere **on** the card (Got it or the card body) closes it and does nothing else (event prevented and stopped).
  - **Esc** closes it wherever focus is (and closes only the card, not a sheet behind it). **Enter** closes it only when focus is on Got it.
  - The **8 s** timer (`EXP_MS = 8000`) closes it; it starts when the card is appended.
  - AC: one test per close path (Got it, card tap, Esc, Enter on Got it, 8 s on a fake clock: open at t, still open at t+7999 ms, closed at t+8000 ms); outside Buy tap → +1 level and card still present.
- **M4A-EXP-B6 Focus.** On open, focus moves to Got it. On close, focus moves **only if it was on the card (or on body)**, to the first visible of: the active Upgrades tab `[data-tab].active` (sheet open or docked ≥900 px) → bottom-nav `[data-nav=upgrades]` (sheet closed) → `#collect`. If the player had moved focus elsewhere (e.g. the timer closes it), focus is left alone.
  - AC: the four cases in tests/m4-exp1-explainer.test.ts (sheet open, sheet closed, nothing rendered, timer close with focus elsewhere).
- **M4A-EXP-B7 Toasts.** Any toast fired while the card is open is held and played in order after it closes (`tracks-exp-closed` event).
  - AC: a "Coop upgraded!" toast fired while open is not visible until close, then plays; two held toasts play in fire order.
- **M4A-EXP-B8 Motion.** Appear: 200 ms opacity 0→1 + scale 0.9→1. Reduced motion: 150 ms opacity fade only, no scale. **Close: none, the card is removed at once** (no fade-out, no coin pop; see OQ-F3-1).
- **M4A-EXP-B9 Accessibility.** `role="dialog"`, `aria-modal="false"`, `aria-labelledby` = the title id; focus on Got it. AA contrast (#3E2C23 on white).
- **M4A-EXP-B10 Persistence.** `seenTracksExplainer: true` is saved **before** the card is built (optional v6 field, absent = false, SAVE_VERSION 6, covered by the checksum).
- **M4A-EXP-B11 Telemetry (v1.19, D-HOP-32 2; bug in 246de09, fixed in M4.1 with M41-9).** `tracks_explainer_shown` fires when the card is appended to the DOM; `tracks_explainer_dismissed {method}` fires once when it closes. method: `button` = Got it (click/tap, or Enter with focus on Got it, which activates the button); `tap` = a tap on the card outside Got it; `esc` = Esc; `timeout` = the 8 s timer. Both pinned like `upgrade` (telemetry.ts isPinned) and in the JSON export.
  - AC (one per method, fake clock + recording telemetry): (1) Got it tap → exactly 1 `dismissed {method:'button'}`; (1b) Enter on Got it → `button`; (2) tap on the card body → `tap`; (3) Esc (focus anywhere) → `esc`; (4) no input for 8000 ms → `timeout`. In each: exactly **one** `tracks_explainer_shown` before it, exactly one `dismissed`, no second `dismissed` from a later tap/key/timer.
  - AC (shown exactly once per show): every path that appends the card emits `shown` exactly once; paths that show nothing (storage blocked, flag write fails, hidden/modal wait, new farm, M4 off) emit **zero** `shown`; a 1 s retry that later shows the card emits one `shown` in total; a reload after it was shown emits none. An outside tap emits no event.
- **M4.1 deltas on top of the build (Art & UX Minors M41-9, art-ux/m4.1-ui-minors.md; Art & UX makes the final call, none holds a release):** UX-M1 visible focus ring after Esc/Got it on WebKit; UX-M3 card docks above the open sheet's tab row (every `[data-tab]` fully visible); UX-M5 150 ms close fade and the refund coin pop (reduced motion: instant). When those land they replace M4A-EXP-B4/B8 for that part; QA verifies with the Verify column of m4.1-ui-minors.md.

## 18. F4: next-goal strip label (v1.18, P41-5; M41-8; v1.19 per D-HOP-32 + D-PMFU-2026-10-19-01..06)
**Sources (in precedence order):** D-HOP-32 (10:05), `art-ux/f4-next-goal-label.md` (LOCKED 2026-10-19 10:10, "source of truth"), D-HOP-29 (09:52) + 09:55 amendment + 10:00 final, PM rulings D-PMFU-2026-10-19-01..06. Where the 09:52 text and the file differ (milestone variant; `<1%`), the file wins. **rc1-upgrade-value.md §4 is superseded for the strip:** its short name `Egg val.` and its "never truncated / wrap to 2 lines" rule no longer apply (D-HOP-32 3). **Not built yet:** at 882b97f the strip still uses `trackGoalLabel` (`Hens L{n}: bigger coop` / `Egg value L{n}: {grade}`, no ★, no %), with CSS ellipsis on the whole `.goal-label`.

**Templates.** `·` is U+00B7. A NBSP replaces the space between the track name and `L{n}` (no space inside `L30`), and NBSPs sit either side of `·` (D-PMFU-01).
- **Hens / Egg value, milestone level** (the level being bought is a Hens bigger-coop level `hens_ms{k}_level`, or an Egg value grade level `egg_grade{k}_level` whose `egg_grade{k}_farm_gate` ≤ F): `★ {Track} L{n}: {milestone}`; milestone = `bigger coop` or `Grade A` / `Large` / `Jumbo`. The milestone replaces the %.
- **Hens / Egg value, any other level:** `★ {Track} L{n} · +{X}% income`.
  - X = floor(100 × (income/s after this one buy − income/s now) / income/s now **+ 1e-9**) (D-PMFU-06), at the current state, taken from best_roi's own value (`optionGain(...).gain` over `incomePerSec(s, b, working)` in src/econ/best-buy.ts); no second income calculation.
  - If 0 < delta < 1%: the part reads ` · +<1% income`, **never `+0%`**.
  - If delta ≤ 0 (exactly 0 **or negative**, D-PMFU-04), or income/s now is 0: the whole ` · +X% income` part is hidden → `★ {Track} L{n}`.
- **Collection (D-HOP-32 4):** keeps `★ Collection L{n}: +{Δtap}/tap` (m3-next-goal-spec §2), Δtap = eggs_per_tap[n] − eggs_per_tap[n−1] from config. **No `+X% income`** for Collection (tap gain is not passive income/s). Same ★ rule and the same truncation.
- **★** only when the target is the best buy. Until the UX-M4 Best buy chip ships, ★ uses the same best_roi selection the chip will use; **one source function** decides both (D-PMFU-05).
- n = the level being bought (current level + 1). FARM, W1–W4 and Done labels are unchanged (m3-next-goal-spec §2).

**Truncation** (applied in order, only while the label is over 27; stop as soon as it fits):
1. drop the leading `★ ` (2 code points);
2. short track names: `Egg value` → `Value` (stands, D-HOP-32 3), `Collection` → `Coll.`; `Hens`, `Farm` unchanged;
3. ellipsis on the track name.
- **Counting (D-PMFU-02):** length = Unicode code points of the rendered label; `★`, `·` and each NBSP count 1. In step 3 the ellipsis is `…` (U+2026, 1 code point) and **counts toward the 27**: track name = its first k code points + `…`, with k the largest value that makes the total ≤ 27.
- **Never cut, including by CSS (D-HOP-32 3):** `L{n}`, the ` · +X% income` / ` · +<1% income` part, the milestone text and the Collection `: +{Δtap}/tap` part. Markup: only the track-name span may shrink (`min-width:0; overflow:hidden; text-overflow:ellipsis`); the suffix span (from the NBSP before `L{n}` to the end) has `flex-shrink:0; white-space:nowrap` and never gets an ellipsis. The whole-label `text-overflow:ellipsis` on `.goal-label` goes.
- Screen readers read the **untruncated** label.

**ACs** (unit tests on the pure label function + DOM checks at 360 px):
- **F4-1 exactly 27 keeps ★:** Egg value L5, X = 9 → `★ Egg value L5 · +9% income` (27), unchanged.
- **F4-2 28 drops only ★:** Egg value L9, X = 12 → `★ Egg value L9 · +12% income` (28) → `Egg value L9 · +12% income` (26).
- **F4-3 D-HOP-29 AC1:** Egg value L30, X = 12 → `★ Egg value L30 · +12% income` (29) → `Egg value L30 · +12% income` (27), full name kept.
- **F4-4 still 28+ after step 1 → short name:** Egg value L30, X = 100 → (30) → `Egg value L30 · +100% income` (28) → `Value L30 · +100% income` (24). Also L55, X = 100 → `Value L55 · +100% income` (24). `Egg val.` never appears.
- **F4-5 Hens never truncates:** Hens L55, X = 999 → `★ Hens L55 · +999% income` (25), ★ kept.
- **F4-6 long track name (pure-function fixture with no short form, track `Supercalifragilistic`, L30, X = 12):** steps 1–2 don't fit → `Supercal… L30 · +12% income`, exactly 27 code points (the `…` counted); `L30` and the % part intact.
- **F4-7 no rendered label > 27** (code points) for every Hens/Egg value/Collection level 1..`maxLevel` (and 1..55 with the L30+ data) × X ∈ {hidden, `<1`, 1, 9, 10, 99, 100, 999} × milestone yes/no.
- **F4-8 milestone variant:** Hens L10/L20/L30 (bigger-coop levels from config) → `★ Hens L10: bigger coop` (23), no %; Egg value L5 → `★ Egg value L5: Grade A` (23); L10 → `★ Egg value L10: Large` (22); L20 at F ≥ 15 → `★ Egg value L20: Jumbo` (22). **Farm gate not met** (L20 at F14) → % variant `★ Egg value L20 · +{X}% income`. Milestone text is never cut. Levels read from config, not literals.
- **F4-9 floor:** delta 4.9% → `+4% income`; 1.0% → `+1% income`; 99.99% → `+99% income`; 12.0% → `+12% income`.
- **F4-9b float edge (D-PMFU-06):** a fixture where 100 × gain / base evaluates to 4.999999999999999 (a mathematically exact 5%: base 5.8 /s, gain 0.29 /s, computed as 100 × gain / base in IEEE double = 4.999999999999999) → `+5% income`, not `+4%`; a true 4.99999 % → `+4% income`.
- **F4-10 under 1%:** delta 0.4% (or 0.999%) → `★ Egg value L30 · +<1% income` (29) → `Egg value L30 · +<1% income` (27). No state ever renders `+0%`.
- **F4-11 hidden %:** delta exactly 0 → `★ Hens L12` (no ` · `); a **negative** delta (e.g. a buy that lowers income/s in the working model) → hidden, same output; income/s now = 0 (fresh save before first sale) → hidden even if the buy would add income.
- **F4-12 one calculation:** for a fixed state, the strip's X === floor(100 × best_roi gain / best_roi base + 1e-9) from the same call (unit test), plus the `<1%` case.
- **F4-13 ★ rule:** target = the best_roi pick → ★ present; strip target ≠ the best_roi pick → no ★ (so a 28-char label without ★ shows the full name). The strip ★ and the row chip (once UX-M4 ships) call the same function; a test asserts they agree for the same state.
- **F4-14 aria (untruncated):** `Next goal: best buy, Egg value level 49, Jumbo.`; % variant `Next goal: best buy, Egg value level 30, plus 12 percent income.`; `<1%` → `Next goal: best buy, Egg value level 30, plus less than 1 percent income.` (D-PMFU-03); hidden % → `Next goal: best buy, Hens level 12.`; no ★ → no `best buy,`. Followed by the existing status sentence (`Ready now.` / `Ready in about …` / `Sell eggs to earn coins.`). Aria never contains `…`, a short name or `★`.
- **F4-15 toasts and hints unchanged (D-HOP-29 AC4):** milestone toasts stay `Hens L{n}: bigger coop · offline ×{mult}` / `Egg value L{n}: {grade} ×{mult}` (M4A-12) and the in-row hint `Next at L{n}: …` (m4-tracks-copy.md v1.1) byte-identical; snapshot tests unchanged.
- **F4-16 Collection (D-HOP-32 4):** C4 best buy, Δtap 5 → `★ Collection L5: +5/tap` (23); not best buy → `Collection L5: +5/tap`; L30 → `★ Collection L30: +5/tap` (24); **never** a `% income` part on a Collection label. Truncation (pure-function fixtures, Δtap from a test balance): L55, Δtap 1250 → `★ Collection L55: +1250/tap` (27), unchanged; Δtap 12500 → (28) → `Collection L55: +12500/tap` (26); Δtap 1234567 → `Collection L55: +1234567/tap` (28) → `Coll. L55: +1234567/tap` (23). The `: +{Δtap}/tap` part is never cut. Aria `Next goal: best buy, Collection level 5, plus 5 per tap.` uses the full name.
- **F4-17 360 px, suffix never cut (D-HOP-32 3):** at a 360×640 viewport in all 3 engines, render the worst-case strings `★ Egg value L55 · +999% income`, `★ Egg value L30 · +<1% income`, `★ Hens L30: bigger coop`, `★ Egg value L20: Jumbo` and `★ Collection L30: +5/tap`: the suffix span is fully visible (scrollWidth ≤ clientWidth, no ellipsis on it, bounding box inside the goal pill); if anything is shortened by CSS it is only the track-name span.
- **F4-18 rc1 §4 superseded:** no build path shows `Egg val.` or wraps the strip label to 2 lines (grep src/ for `Egg val.` = 0).
- **F4-19 no ★ on Max-for-this-farm (D-HOP-40):** a row showing `Max for this farm` (§19 B1-9) is never the best buy, never gets ★ and is never the strip target; = B1-10.

**F4 Farm unlock variant (v1.21, D-HOP-42; copy GO by Head of Art & UX 10:34; aria always uses the full `Egg value`, never `Value`).** When the best buy is **Farm** *because* its winning bundle (the ordered buys best_roi scored for the Farm pick). **Engineering gap:** today `bestBuy` keeps only `bestPath.first` and returns no bundle (`paybackOf` is at best-buy.ts:147, identical on dd223f5 and 88130a7). The build must expose the bundle from the same call that picks the strip target, e.g. `bundle: {key, level}[]`; the field name is engineering's call. The variant only fires on L30+ data, since the current config has maxLevel 30 and no L31. contains a Hens or Egg value buy at **L31 or above**, the strip reads `★ Farm L{n}: unlocks {Track} L{m}`. n = the Farm level being bought. {Track} L{m} = the **first** L31+ track buy in that bundle's order (if several tracks unlock, the first one wins). The same NBSP rule applies before both `L{n}` and `L{m}`. The variant applies only when Farm is the best buy, so ★ is always eligible, but every starred unlock label is ≥ 28 code points, so step 1 always drops it (Art & UX: the row's ★ Best buy chip still marks it). and the same ≤ 27 code-point truncation applies: step 1 drops `★ `, step 2 shortens the track names (`Egg value` → `Value`; `Farm` and `Hens` unchanged). The suffix `: unlocks {Track} L{m}` is **never cut** (no step-3 ellipsis on it). Aria: `Next goal: best buy, Farm level {n}, unlocks {Track} level {m}.` (full name, untruncated).
- **F4-20 F27 → Farm L28 → Hens L31:** F27, best buy = Farm whose winning bundle's first L31+ buy is Hens L31 → `★ Farm L28: unlocks Hens L31` (28) → `Farm L28: unlocks Hens L31` (**26**). Aria `Next goal: best buy, Farm level 28, unlocks Hens level 31.`
- **F4-21 F27 → Farm L28 → Value L31:** the first L31+ buy is Egg value L31 → `★ Farm L28: unlocks Egg value L31` (33) → step 1 (31) → step 2 `Farm L28: unlocks Value L31` (**27**). Never `Egg val.`, never an ellipsis.
- **F4-22 first unlock wins (HoP D-HOP-42; Art's 'name Hens when both unlock' addition is pending a HoP ruling and does not apply until ruled):** a bundle containing Egg value L31 then Hens L31 → `… unlocks Value L31`; reversed order → `… unlocks Hens L31`.
- **F4-23 no-unlock Farm rows unchanged:** a Farm best buy whose winning bundle has no L31+ track buy (including all of F0–F27 on current data, and any bundle where the track buys are ≤ L30) keeps today's FARM label byte-identical (m3-next-goal-spec §2; snapshot).
- **F4-24 never over 27:** for every n in 28..50 and m in 31..55, Hens and Egg value, the rendered unlock label is ≤ 27 code points, and the `: unlocks {Track} L{m}` suffix is intact (the worst case `Farm L50: unlocks Value L55` is 27).

## 19. M4B-1: lock label names the real unlock Farm level (v1.18, P41-5; D-HOP-28; v1.19 per D-HOP-32 1)
**Source:** D-HOP-28 (09:44, "pending UI QA confirmation"), D-HOP-32 1 (10:05); M4.1 scope bug fix, UI only, no economy change. May land after the build; it lives here so QA has one spec. **Build (v1.20):** `88130a767821f2a26e7217b153636f33caaf154a` (M4.1 PR #54 farmMax commit; pushed, unmerged), `src/ui/tracks-ui.ts trackUnlockFarm`, `src/ui/app.ts:497`, tests `tests/m41-11-egg-unlock.test.ts`. Search bound = farm max. **The farmMax fallback is replaced by `Max for this farm` (D-HOP-40, v1.21); PR #54 must implement it on top of 88130a7.** *(Previously read from `882b97f` (M41-11), which searched to `b.maxLevel` and fell back to F+1; superseded by PR #54.)*
- **M4B-1 Rule.** A Hens or Egg value row locked by `cap` shows `Needs Farm L{N}`. N = the smallest F' with F < F' ≤ **farmMax** and trackCap(F', track) > the current track level, using the existing `hensCap` / `eggValueCap` (min(track max, F' + cap offset from balance.m4)). The search runs to the **farm max level**, not the track max. **v1.21 (D-HOP-40): if no F' ≤ farmMax has trackCap(F') > the current track level, the row shows `Max for this farm`, with no Buy button, no cost and no time-to-afford hint.** This replaces the v1.19 farmMax fallback; the label is never F+1 and never a Farm level that wouldn't unlock it. The aria-label uses the same N: `{Track}, level {L}, locked. Needs Farm level {N}.` For the new state: `{Track}, level {L}. Max for this farm.` MAX rows (track at track max) are unchanged (`MAX`, no lock text). *Copy (Head of Art & UX GO, 10:34): `Max for this farm` (17 characters) fits at 360 px. The row has **no lock glyph** (it is capped, not locked), is **muted like MAX rows**, and has no button. The UI/Visual Designer confirms this in the #54 re-check shots.*
- **ACs** (offset 3, current data unless stated; expected N computed from config in tests):
  - **B1-1 normal save:** H = F+3 (e.g. F10/H13) → `Needs Farm L11` = F+1; same for V. Unchanged from M4A-2.
  - **B1-2 above-cap Egg value after migration (M4A-28 fixtures):** F5/V9 → `Needs Farm L7`; F0/V12 (F0/C30) → `Needs Farm L10`; F3/V7 → `L5`; F0/V4 → `L2`; F13/V17 → `L15`; F10/V15 (F10/C30) → `L13`. Aria carries the same N in each.
  - **B1-3 boundary:** with V = F+3+k (k ≥ 0), N = F+k+1; buying Farm to F' < N keeps the row locked with the same N; at F = N the row unlocks in the same tick (M4A-3).
  - **B1-4 near max:** F26/V29 → `Needs Farm L27`; V = track max → `MAX`, never a lock label.
  - **B1-5 data-driven offset:** with a test balance where the offset is 5 (or per-row offsets, L30+ S2), N follows the offset (e.g. offset 5, F10/V15 → `L11`, F10/V17 → `L13`); no `+1`/`+3` literal in UI code.
  - **B1-6 Max for this farm (D-HOP-40, replaces the D-HOP-32 1 fallback AC):** test balance with farm max 50 and track max 55 (L30+ shape, the B1-6 balance where cap(49) = 53, i.e. cap(F') = min(55, F'+4), so cap(50) = 54). **Below F50, a track at L53** (cap(50) = 54 > 53) → `Needs Farm L50`, aria `… Needs Farm level 50.`; never F+1. **L54 and above** (no F' ≤ 50 has cap > L) → `Max for this farm`, no button, at **any** farm level F0..F50 (including F50 itself); never `Needs Farm L50`, never F+1. Track at 55 = `MAX` (unchanged). Tests compute the boundary from config: with the shipped offset 3, the same rule gives L52 → `Needs Farm L50` and L53/L54 → `Max for this farm`.
  - **B1-6b shipped balance (D-HOP-40 + HoP 10:34; QA checks the real build):** current data, cap offset 3, farm max 50, track max 55, lock at level ≥ cap. Below F50: Egg value (and Hens) **L52 → `Needs Farm L50`** (cap(50) = 53 > 52), aria `… Needs Farm level 50.`; **L53 → `Max for this farm`** and **L54 → `Max for this farm`** (cap(50) = 53, so no F' ≤ 50 unlocks it), at any farm level including F50; **L55 → `MAX`**. Never F+1, never `Needs Farm L51`+.
  - **B1-7 bound:** the search never evaluates F' > farmMax (spy on trackCap) and never returns a value above farmMax. When the search finds nothing, the row is `Max for this farm`, not a number.
  - **B1-9 Max for this farm row (D-HOP-40):** it has no lock glyph, uses the muted MAX-row styling, has no Buy button and no cost, is never `.affordable` and has no glow, and buying Farm up to farmMax never turns it into a Buy row. Visible text and aria match (B1-8).
  - **B1-10 best buy never targets it (D-HOP-40):** the F4 best-buy pick, the strip ★, the next-goal strip and the row best-buy chip (when it ships) never target a `Max for this farm` row. Such a row isn't a candidate in best_roi or bundle scoring. Test: a save where the only cheaper option is a `Max for this farm` row; the pick is another row or the Farm row, never it. See F4-19.
  - **B1-8 consistency:** the visible text and the aria-label always show the same N; the lock row shows no cost, button or time-to-afford hint (m4-tracks-copy §1).
  - *B1-6 (v1.18), "the fallback is never reached", is replaced by B1-6/B1-7 above: with farm max ≠ track max the fallback is reachable by design.*
- **Copy note (OQ-B1-2):** art-ux/m4-tracks-copy.md §1 "n = F+1" is **superseded by D-HOP-28 / D-HOP-32**; Art & UX to update that file (request goes from PM Farm Upgrades).

## 20. Open questions from P41-5 — RESOLVED (v1.19)
| # | Question (short) | Resolution |
|---|---|---|
| OQ-F3-1 | `tracks_explainer` telemetry not emitted by 246de09 | **Bug, fixed in M4.1 with M41-9** (D-HOP-32 2): `tracks_explainer_shown` / `tracks_explainer_dismissed {method}`; M4A-EXP-B11, M4A-34 updated. |
| OQ-F3-2 | Card not anchored to the tracks block (§11) | **Resolved as built** (D-PMFU-2026-10-19-09): fixed top-centre at 72 px, never covering Buy/Collect (M4A-EXP-B4) supersedes §11 anchoring; UX-M3 (M41-9) still docks it above the open sheet's tabs. |
| OQ-F3-3 | No close fade / coin pop | Covered by UX-M5 (M41-9, Art & UX final call); B ships without it. Not separately ruled. |
| OQ-F3-4 | Esc anywhere, Enter only on Got it | **Keep as built** (D-PMFU-2026-10-19-07). |
| OQ-F4-1 | `Value` vs `Egg val.` | **`Value` stands; rc1 §4 `Egg val.` superseded** (D-HOP-32 3). |
| OQ-F4-2 | Collection template | **`Collection L{n}: +{Δtap}/tap`, ★ when best buy, same truncation; % only for Hens/Egg value** (D-HOP-32 4); AC F4-16. |
| OQ-F4-3 | NBSP placement | **NBSP before `L{n}`** (D-PMFU-2026-10-19-01). |
| OQ-F4-4 | Counting + ellipsis | **Unicode code points, ★ and · count 1; the ellipsis counts toward 27** (D-PMFU-2026-10-19-02). |
| OQ-F4-5 | Aria for `<1%` | **"plus less than 1 percent income"** (D-PMFU-2026-10-19-03). |
| OQ-F4-6 | rc1 §4 "never truncated" vs CSS ellipsis | **Suffix never cut, CSS included; only the track-name span shrinks** (D-HOP-32 3); AC F4-17. |
| OQ-F4-7 | Negative gain | **Treated as 0: % hidden** (D-PMFU-2026-10-19-04). |
| OQ-F4-8 | ★ before the chip ships | **Same best_roi selection, one source function** (D-PMFU-2026-10-19-05). |
| OQ-F4-9 | Float edge at exact % | **floor(x + 1e-9)** (D-PMFU-2026-10-19-06); AC F4-9b. |
| OQ-B1-1 | Fallback F+1 / bound maxLevel | **RESOLVED by `88130a767821f2a26e7217b153636f33caaf154a` (PR #54, pushed, unmerged): search to farm max** (D-HOP-32 1); **fallback replaced by `Max for this farm` (D-HOP-40, v1.21; PR #54 to implement)**; B1-6/B1-7/B1-9/B1-10. |
| OQ-B1-2 | m4-tracks-copy §1 "n = F+1" | **Superseded by D-HOP-28/32**; Art & UX to update the file (D-PMFU-2026-10-19-08; PM sends the request). |
