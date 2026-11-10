# M5 interaction plan: give the Farm L10+ player something meaningful to do
**v0.3 BUILD-READY CANDIDATE · Head of Product · 2026-10-24 ~17:50 CEST · for the CEO (D-CEO-20261024-05/-06) → Vadim**
Paper only. Implementation stays on hold until Vadim's go (D-CEO-20261024-04, -06): no code, no PRs, no CSV edits. Sizes are **dev-days (dd)** from HoE (`engineering/m5.0-sizing.md` v1.2 §15, §15a) unless marked *HoP est.* **Notation:** `F10` = Farm level 10; `#4` = feature 4 in §4; `R7` = HoP ruling 7 in §5; `D-HOP-NN` = `D-HOP-2026-10-24-NN`; `D-COL-01` = `D-COL-2026-10-24-01`. **[P]** = proposal. `product/economy.csv` (sha256 `c7bb783f…`) stays the source of truth until Vadim's build go (D-HOP-24); the M5.0 CSV draft of record is `scratch/v2-econ/economy.m50-draft.csv` (§0.1). **OPEN** = value not found in any file. **SCRATCH** = Economy scratch-runner figure, not the harness of record.

## 0. Changelog and status
**Status: BUILD-READY CANDIDATE.** Every M5.0 spec is final, design-reviewed (APPROVED), HoE BUILDABLE and sized, and pinned by sha1 in §0.1. The CSV draft of record is verified (§0.1) and its PR plan is signed (D-HOP-24). The Economy gates pass on the harness definition (SCRATCH, §7.1), with the harness-of-record checks moved to the X1 CI merge gate (D-HOP-22, -24). **HoQA: M5.0 BUILDABLE/TESTABLE (18:12)**: B-X1a and B-X1b are closed (economy §13.2a sha256 `1cf6da7c…069e`, check `pacing-x1-stack`; pause v1.3.5, abilities v1.3.3). Non-blocking follow-ups: the (b) seller15/casual re-run at 45 s before the Pause merge; G4 ruled (D-HOP-30); E-4 re-based once patch1 is cut. **One item is still open: Vadim's go for code** (§11.2). **Build precondition, not a paper item:** the post-Latest patch (asleep signal, #69 v2, m-RC1-1) lands before the M5.0 build (D-CEO-20261024-07). M4.1 Latest shipped at tag `m4.1-5d9efa6`; the patch SHA is awaited from HoE.

**Addendum D-HOP-40 / D-CEO-20261024-09 (21:55, paper only):** G5-P PASSES with variant (ii) (golden freeze). Spec-of-record additions: golden errata `product/collection/m5-golden-egg-errata-v1.3.3-DRAFT.md` rev. 4, sha1 `569f26ffd1538e599ba8ea2697c1ae54c869aeb9`, and pause errata `product/workers/m5-worker-pause-errata-v1.3.6-DRAFT.md` rev. 3, sha1 `d4ab134c44fd6b9705bc092effd0d6220fda5f4e`. Both are approved by the CEO and apply on top of golden v1.3.2 and pause v1.3.5 (`d3c1afb0`, not edited). The gate evidence is economy §12a/§13.2a in `product/research/v2-slices/economy.md`, sha256 `fe24954d72074a218a66bd25659f4d26eae1be6e11ad3f4d3924eee505b934d9` (lockout 45, resume wait 0). Before the Pause merge: the HoQA gate, AC-P14-CI on seeds 1–200 with the slow profile, the PGT tests proving no tap and no ×2 while frozen in the build, and HoE's 3 telemetry fields with a single shared freeze function. Pause #4b stays the last PR and the first to cut. Code still waits for Vadim's go. **Re-pin 22:09 (D-HOP-2026-10-24-41/-42):** the D-HOP-41 gap fixes are wording and boundary clarifications, with no rule or number changes. Golden errata is now rev. 5 sha1 `8439752d62fc34fc0fe814a75321975738b2acf2` (was 569f26ff), and pause errata is now rev. 4 sha1 `9245d27ca60212d989f6af953727c3ea6f5a1621` (was d4ab134c). The economy.md evidence wording cleanup is sha256 `8137205cb5d5836287c07c8c136db531c553060f3ad3cac883e77773d6c2edc5`, and the numbers are the same as fe24954d. HoE's H-1 telemetry and shared-goldenFrozen precondition is APPROVED. Still open: HoQA's final TESTABLE on these sha1s, and the pacing-x1-stack run on the PR's final SHA.

| Version | Date | sha256 | Change |
|---|---|---|---|
| v0.1 DRAFT | 2026-10-24 15:58 | `08a1ec35b205f05ebc05996a302eaed19e80aa12c79bfca48acbd5f18faf4ab3` (as accepted by the CEO, `product/decisions.md:492`) | Direction draft. |
| v0.1 on disk before the v0.2 edit | 2026-10-24 16:07 (file mtime) | `2e814e14a80800e159bc8a4d38e5b1d87cc17d568413e00d680e93b5acad3fac` | Differs from the accepted sha (edited after acceptance; D-HOP-21 note). |
| v0.2 | 2026-10-24 17:10 | logged as `8e7321cf…5326` (D-HOP-21) | Folded in D-HOP-02…-20, CEO rulings, Economy G3–G5 scratch, Critic/Player reads, HoE sizing v1.2, 7 M5.0 specs, HoQA plans, Art/Audio. |
| v0.2 on disk before this edit | copied 2026-10-24 17:45 to `/workspace/m5plan-work/v0.2-ondisk.md` | `750600a868441b23e88c5113d1deb879f6f23bbf584fb805a23b46108cd9279f` | **Differs from the logged `8e7321cf…`** (§11.3 #16). This on-disk text is the base for v0.3. |
| **v0.3** | 2026-10-24 ~17:50 | see the report / `sha256sum` | Folds in **D-HOP-21…-27** and **D-COL-01**. New §0.1 spec-of-record table (sha1 computed this pass) with the verified CSV draft 8dc90e2b. Economy gate results on the harness definition (seeds 1–200, 6 cells) and the D-HOP-22/-24 gate sequencing (§7, §7.1). SS-21 = Option B (#5b, §8 Q9). New **#5c Best buy stopgap** in M5.0 (D-HOP-25). Broody minimum 1 slot (#5, D-COL-01). #6 breeds re-owned to PM Collection, coin hatches (D-HOP-26). §11.2 checklist and §11.3 contradictions refreshed; Q7–Q11 resolved or marked (§8). Addendum: D-HOP-27 X1 gate definition (§7), L28–30 correction (#6), HoQA TESTABLE (§11.2), M5.1 Best buy re-baseline proposal v0.2 (§0.1, §8 Q12). |

**Inputs read for v0.3 (all paths exist):**
- Decisions: `product/decisions.md` D-HOP-21…-27, D-COL-01 and their log lines (`product/decisions.md:703-775`).
- M5.1 Best buy: `product/farm/m5.1-bestbuy-rebaseline-proposal.md` v0.2.
- Economy: `product/research/v2-slices/economy.md` §6.1, §13, §13.1, §13.2, §13.2a (the "economy.md" sections cited below are this file; `product/economy.md` is the M1 table doc and has no §13).
- Engineering: `engineering/m5.0-sizing.md` v1.2 (§0, §15, §15a).
- Specs: the six M5.0 specs, `product/farm/bb-stopgap-spec.md`; for #6 only, `product/m5.1-breeds-spec.md` (M5.1 draft).
- Art: `art-ux/m5-layout-rects-960.md` v1.0.
- Everything else is carried from v0.2 (its input list is in `/workspace/m5plan-work/v0.2-ondisk.md` §0) and was not re-read in this pass.

### 0.1 Spec of record (sha1 by `sha1sum`, re-run 2026-10-24 ~17:55 CEST; all M5.0 sha1s unchanged since ~17:47)
The build uses exactly these texts. A later edit to any of them needs a version bump and a new sha1 in this table.

| # | File | Version (header) | sha1 | Owner | Notes |
|---|---|---|---|---|---|
| 1 | `product/collection/m5-golden-egg-spec.md` | **v1.3.2** (17:43) | `f6b3a05e44e66df1baad53124abb4d4c707b8861` | PM Collection | v1.3.2 = wording errata only (D-HOP-26 #7: GE-17 chip inside `#goal`) |
| 2+3 | `product/collection/m5-streak-tap-coins-spec.md` | **v1.3.1** (17:25) | `895ca903700fe63280e659fdc625bbd2416118ab` | PM Collection | v1.3.1 = errata, adds ST-AC26b |
| 5 | `product/collection/m5-broody-hen-spec.md` | **v1.3.2** (17:43) | `f180c3ff2535088e7d748fff4947fe9de56e70ee` | PM Collection | v1.3 = BH-k measured + D-COL-01; v1.3.2 = wording errata (BH-AC13 +1024×1366, BH-n line) |
| 4 | `product/workers/m5-worker-abilities-spec.md` | **v1.3.3** (17:54) | `06f98b49c6831206ab8ef64db1b6e791c8afc5f1` | PM Workers | HoE §15a per-PR split; CSV sha 8dc90e2b; D-HOP-27 E-3 wording |
| 4b | `product/workers/m5-worker-pause-spec.md` | **v1.3.5** (17:57) | `d3c1afb02702aa02791e0afaca2f465e42b3430e` | PM Workers | CSV sha 8dc90e2b; D-HOP-27 E-1/E-2/E-3 wording + HoQA (f) band clarification; no rule changes |
| 5b | `product/market/sales-stopped-spec.md` | **v1.3.9** FINAL for build | `2609ba88e787ed3782f8d13f249a2062796b782c` | PM Market/Customers | SS-21 Option B since v1.3.8 (D-HOP-23); Art rects signed |
| 5c | `product/farm/bb-stopgap-spec.md` | **v1.2.1** | `11d98516a6f2e8b89dd0fca1b748c3c995b8dc4a` | PM Farm Upgrades | HoQA: testable as written; HoE 0.4 dd (header not bumped, §11.3 #17) |
| — | `art-ux/m5-layout-rects-960.md` | **v1.0** | `54a59d4940e17c1e77fab5618cc37ef54601b487` | UI/Visual Designer | GE-16 / BH-k / GE-17 / SS-G6: all PASS |
| — | `engineering/m5.0-sizing.md` | **v1.2** (+ §15a 17:20) | `2172c00b05d59e4646045345955e18f238b2b35d` | HoE | Totals §15; abilities split §15a |
| — | `product/research/v2-slices/economy.md` | DRAFT (17:43 mtime) | `9267d1ce5fd023c2e8f0059da26c62e899b435d7` | Economy | §13.2a = X1 prediction table |
| M5.1 | `product/m5.1-breeds-spec.md` | Draft v0.1 (rev. 5, 17:50) | `c2753d835dd887ee61fdf8611b74d449f5fee9c5` | PM Collection | **Not M5.0.** D-HOP-26 ruled on `07908e96`; the file has moved since (§11.3 #18) |
| M5.1 | `product/farm/m5.1-bestbuy-rebaseline-proposal.md` | **v0.2** (17:55) | `63ef466db46be0d11e8a667e32e02b82b814c2eb` | PM Farm Upgrades → HoP → CEO | **Not M5.0.** Best buy full fix + pacing re-baseline; HoE ≈1.25 dd, one PR behind `m5.flags.bestBuyV2`; **awaiting the CEO** (§8 Q12) |

**CSV draft of record (D-HOP-24), verified this pass:**

| File | sha256 (`sha256sum`) | Check | Result |
|---|---|---|---|
| `scratch/v2-econ/economy.m50-draft.csv` | `8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b` | matches D-HOP-24 | **✓** |
| | | columns | **152** = 123 base (c7bb783f) + **29 added** (20 M5.0, 9 UI-only sales-stopped/fatigue) ✓ |
| | | rows | 31 (L0–30) ✓ |
| | | value changes vs c7bb783f (cell-by-cell diff) | exactly **2**, on all 31 rows: `tc_streak_cap` 0.40 → **0.28**; `w2_asleep_collect_share` 0.20 → **0.15** ✓ |
| | | `w2_asleep_collect_share` live in M5.0? | **No, inert**: no reader in game code; an off Coop Hand collects 0 (PM Workers finding, `product/decisions.md:730`) |
| `scratch/v2-econ/m50-draft.diff` | `e05c291fc0ae8d7437b527eba8284c3354a3edfe95056b78d5da8bbcb3dfc5e9` | matches D-HOP-24 `e05c291f…` | ✓ |
| `product/economy.csv` | `c7bb783fe890928f747c142411503261f0711388e73fe1cdadbfd76cc8d68b44` | unchanged | ✓ (stays until Vadim's build go) |

Dropped from the draft: `guard_heartbeat_s`, `guard_stale_s` (D-HOP-22, -24) and `tc_stall_min_show_s` (D-HOP-20). The five Collection/Workers specs cite 8dc90e2b; older shas (45095351, edfd8902) appear in them only as supersession history.
---

## 1. Shipped vs specced vs not built vs cut (from the Audit, RC1 `5d9efa6`, same on main `dd223f5`)
"Not built" = approved around Oct 16 and stopped by the Oct 17 freeze (D-CEO-20261017-01), never restored. "Cut" applies only to monetisation. v0.2 added the current M5 spec for each item; v0.3 updates the spec versions (§0.1). Nothing below is built yet: still 0 readers of golden/streak/ability code in `src/` (`qa/decisions.md:259`; HoE confirms in `engineering/m5.0-sizing.md` §1).

| Item | Status | Evidence | M5 action (v0.3) |
|---|---|---|---|
| 3 tracks Farm / Hens / Egg value | **Shipped** (M4 on) | `src/sim/tracks.ts:13-25`, `balance.json:164` | Keep. RV-7 "both bought every level" still open (Critic: "Hens and Egg value are bought every level") |
| Hens milestones H10/20/30 (coop + offline) | **Shipped** | `balance.json:307-323` | Keep (passive) |
| Egg value grades V5/10/20 | **Shipped** | `balance.json:325-340` | Keep (passive) |
| Balanced farm + N/5 strip | **Shipped** | `balance.json:342-363`, `tracks.ts:39-42` | Keep; explain it (Critic) |
| Milestone toasts, tracks explainer | **Shipped** | `tracks.ts:28-37`, `ui/tracks-explainer.ts` | Reuse the toast channel for M5 rewards |
| Workers W1–W3 + Grader tiers + Manage all (energy refill) | **Shipped** (M2/M3) | `balance.json:23-75`, `sim/actions.ts:80` | Keep; Manage all is the left slot of the Activate-all bar (abilities v1.3 §5.1) |
| Golden egg / timed collectible + Frenzy | **Specced → not built** | Old: `m4-timed-collectible-spec.md` v0.5 DRAFT. Now: `collection/m5-golden-egg-spec.md` v1.3.2. Final art `golden-egg.svg` 40×48 (Art sign-off 17:02, `art-ux/decisions.md:263`) | **M5.0 #1** |
| Collect streak | **Specced → not built** | Now `collection/m5-streak-tap-coins-spec.md` v1.3.1 (supersedes `m4-collect-streak-spec.md` v0.3) | **M5.0 #2**, cap 0.28 (G3-scratch) |
| Worker abilities + Activate-all | **Specced → not built** | Now `workers/m5-worker-abilities-spec.md` v1.3.2 final | **M5.0 #4** |
| rc2 Refill (charges, Rest, Shift sheet) | **Specced (v1.2 approved, `product/decisions.md:159-165`) → not built** | No `charge`/`shift` in RC1 `src/` | M5.1 #8, plus the lighter-refill proposal (`workers/m5.1-lighter-refill-proposal.md` v0.1) |
| Per-worker Pause/Resume | **Specced → not built** | Now `workers/m5-worker-pause-spec.md` v1.3.3; no pause state in RC1 (`sim/workers.ts:14`) | **IN M5.0 as #4b**: last PR, own flag; cut second, after the #5c stopgap (D-CEO-20261024-06 Q3; D-HOP-04 #9; D-HOP-25) |
| Market Hand asleep signal (rc1 AC-R1–R9) | **Approved, QA PASS @ `8a49d35`, dropped from the release line** | `market/bug-l10-sales-stall-5d9efa6.md` (S2) | **Post-Latest patch `fix/m41-patch1`** (asleep signal + #69 v2 + m-RC1-1), outside M5.0, lands before the M5.0 build (D-CEO-20261024-07). M4.1 Latest shipped at tag `m4.1-5d9efa6` |
| "Sales stopped" chip + fatigue Rules 2–4 | **New spec (M5.0)** | `market/sales-stopped-spec.md` v1.3.9; Rules 2–4 moved from `workers/m4.2-fatigue-visibility-spec.md` v0.2.2 | **M5.0 #5b** (D-HOP-11 (b), D-HOP-13) |
| Market completion bonus 0.05 | Specced → not built | Inert `tc_complete_bonus_share` | Defer; fold into Order Board rewards |
| Focus/Bulk + Focus premium | Specced → not built | Inert `tc_focus_premium`, `focus_premium` (name clash) | **Drop** (R13) |
| Queue-leave penalty | Specced → not built | Inert `tc_leave_penalty_share` | **Defer** (R13) |
| Mini-goals + bulk buyer (customer-type roadmap v0.3) | Specced (roadmap draft) → not built | `product/market/customer-type-roadmap.md` | M5.1 with the Order Board |
| Rewarded boost / monetisation rows (M4-B) | **Cut** (parked) | D-HOP-2026-10-17-01; D-CEO-20261017-01; Q6 (D-CEO-20261024-06) | Out of M5 |
| Active/idle band 1.5–2.0× | **Not met:** ≈1.00× at F10/F18/F24 with workers | `m4-active-checks.md` §1; Economy no-mechanics run 1.00/1.01 (`v2-slices/economy.md` §10.1) | M5.0 restores it: P95 over all windows 1.661–1.757 on the harness definition (SCRATCH, §7.1) |
| "★ Best buy" on zero-gain rows (Collection) | **Shipped behaviour** (strip ★ + row chip) | `ui/goal-label.ts:96` `bestBuyMark` (bb-stopgap §2); Critic (§7.2 E11) | **M5.0 #5c stopgap** (no ★ on zero-gain rows); full fix M5.1 (D-HOP-25) |
---

## 2. Problem statement
**Vadim, playtest 2026-10-24 15:40 (verbatim, from CCGS §1):** "at level 10 when I am buying all 3 workers there nothing to do… clicking is useless… clicking giving more eggs, clicking on the hens giving more eggs, more golden eggs appear, now I see none, different type of chicken to buy… do much more than just 3 updates and do nothing after that."

**Measured cause:**
1. With workers hired and no M4 active mechanics, **active/idle = 1.00× at F10/F18/F24** (`m4-active-checks.md` §1; Audit). A player who taps earns exactly what an idle player earns.
2. Collect moves `min(coop, eggs_per_tap)`, and the Coop Hand (F7) does the same every 2 s at ≈2× the laying rate. **A tap moves eggs the hand would move 1–2 s later** (`sim/actions.ts:55`; `v2-slices/collection.md:15,23`).
3. All 3 hires are done by F8. The next new system, the Grader at F18, comes **≈18 min later** (≈10 → 28 min p50; `v2-slices/upgrades.md:14`).
4. The approved fix, the M4 active layer, was **never built** (§1). Vadim's "I see none [golden eggs]" is correct.
5. Extra *eggs* are worth ≈0 from F10: demand ≈1.2× supply, and Hens out-produce demand from ≈F20 (`collection.md:18,24`). **Rewards must pay coins or price, scaled to income.**

**v0.2: the reads confirm it** (details and the fix map in §7.2):
- Economy: tap share at L10 is **0%**; income is $72.8/s at 0, 1 or 3 taps/s, and L30 lands at 49.7 / 49.7 / 49.6 min (`v2-slices/economy.md` §0 #1, §1.1).
- Critic: from L10 the only input is Buy, plus Manage all every 9–14 min; tapping is worth +0–8% while workers are awake (`critic/l10-interaction-read-2026-10-23.md`).
- Player: "I'd have quit here (~21 min after L10)"; golden eggs never seen (`playtest-l10-interaction-2026-10-23.md`).
- New cause found by both reads: sales stop silently when the Market Hand falls asleep (S2, `market/bug-l10-sales-stall-5d9efa6.md`).

**Goal for M5:** from F8 to the L30 cap, an attentive player always has something to do that pays visibly. An idle player still meets AC7 pacing, and the combined active premium stays inside the CEO cap (§5 R3, §8 Q1).

---

## 3. Loop map, dead zones, player journey
*v0.2:* the structure below is unchanged from v0.1. The measured dead zones and quit points from the Critic and Player reads are in **§7.2** and confirm the F8–F18 "Bored" and L30 "Total" rows. One timing changes: the Critic reached L30 about 36 min after L10 (script-paced), and Economy's idle bot reaches L30 at 49.7 min from start (`v2-slices/economy.md` §1.3), against v0.1's ≈41–44 min.

### 3.1 Target aesthetics (MDA)
1. **Sensation**: a tap visibly pays (coin pop within 0.5 s).
2. **Discovery / Expression**: "my flock", breeds to hatch, collect and show.
3. **Light Challenge**: timing and allocation (when to pop, what to hold back), never twitch.
**Submission** (relaxed idle) stays intact: a player who never taps meets AC7.

### 3.2 Target player (assumption, from Vadim's sessions and the Critic)
Has played Egg, Inc. / AdCap / Cookie Clicker and expects their depth. Plays short sessions (about 5 a day of 6–8 min, the genre benchmark, Study v1 §4 Q4) on desktop web and phone portrait. Doesn't read long text, and judges a mechanic in the first minute of seeing it. Here to watch the farm grow and to make a few good decisions, not to grind taps.

### 3.3 Journey (emotional arc)
Curiosity and quick wins at the start (tap, sell, first upgrade ≤30 s). Then the pleasure of handing chores to workers at F3–F8. **Then emptiness** at F8–F18, when the workers took the verbs and nothing replaced them. Then a slow buy-wait loop to a **flat L30 cap** (Critic: "the moment a player would close the game"). M5 has to turn F8 from "the game stopped needing me" into "the game gave me new toys", and give the cap a payoff.

| Phase (our levels, p50 time) | Arrives feeling | Player's question | Must deliver | Today (evidence) | Gap | Proposed fix |
|---|---|---|---|---|---|---|
| First contact F0–F3 (0–3 min) | Curious | "What do I do?" | Juicy tap → sell → first buy | Works; first upgrade ≤30 s (AC7) | — | A2 combo juice only |
| Orientation F3–F8 (3–8 min) | Engaged | "How do I grow?" | Automation as a reward | Workers arrive at F3/F7/F8 | Collect fades out with no replacement | B1 Broody Hen at the first Coop Hand hire; golden egg at F8 |
| **First mastery F8–F18 (8–28 min)** | **Bored** (Vadim) | "Is there anything to do?" | A new verb, a choice, a collection | Buy rows + Manage all only; 1.00× | **Dead zone** | #1–#5 (M5.0), breeds + Order Board (M5.1) |
| Depth F18–F30 (28–≈44 min) | Patient / drifting | "What's the strategy?" | Real trade-offs, long goals | Grader tiers; 1.5–2.7 min per level (Critic) | Shallow choices (RV-7) | Farm Lab (M5.2), album milestones, golden-egg frequency upgrades |
| Cap L30 (≈41–44 min) | Let down | "Now what?" | Celebration + next goal | Flat "MAX", coins pile up (RV-1) | **Total** | Show Day prestige (later); interim: cap toast + album/Lab goals |
| Habitual (hours+) | — | "Why come back?" | Return payoff, events | Welcome-back eggs only | No return hook | Broody nest kept on reload, Market Fair (M5.2), daily missions |

### 3.4 Nested loop map: today vs proposed
| Stage | 30-s micro-loop | 5–15 min meso-loop | Session macro-loop | Dead zone today? |
|---|---|---|---|---|
| **L1** today | Tap Collect → Sell; readable | Next Farm/Collection | First worker | No |
| L1 proposed | Same + combo tier pops (A2) | Same | Same | No |
| **L10** today | **None** (hand collects, Market Hand sells) | Buy the next track; one dominant answer (RV-7) | Manage all every ≈7.5 min (chore) | **Yes** |
| L10 proposed | Credited tap pays +$ (A1); golden egg every 2–5 min; Broody Hen ready every ≈75–150 s | Ability calls on a 5-min cooldown; hatch a breed (M5.1); an Order Board contract (M5.1) | Album entry, contract tiers, milestones | No |
| **L20** today | None | Same buy loop, longer waits; Grader tiers | Balanced 4/5 | **Yes** |
| L20 proposed | Same as L10 + Golden Hen chain outcome | Lab nodes, nest slot 3, Rush Hour | Album 8/8, Lab tier | No |
| **L30** today | None | None ("MAX", coins pile up) | None | **Total** |
| L30 proposed | Same as L20 | Lab top tiers, Legendary hatch pool (F24+) | **Show Day prestige** (later), interim cap toast + "what's next" | Interim partial; fixed by prestige |

### 3.5 SDT / player types (today → after M5)
- **Autonomy:** a false choice today (buy both tracks). After M5: which breeds to place, which contract to take, when to pop the nest, when to fire calls, and sell vs hatch.
- **Competence:** income flattens silently today (RV-3). After M5, every active action shows its coin pop, and calls show $/s at risk.
- **Relatedness:** hens are a count today. Breeds give them names, looks and traits.
- **Player types:** Achievers (album, contracts, milestones) and Explorers (breed reveals, Lab unlocks) gain the most. Collectors were unserved and are now served. Socializers/Competitors stay unserved (no server), which is acceptable for M5.

---

## 4. Prioritised feature list
Order = priority. "Vadim" marks which of his four ideas the feature answers: **(a)** taps give more, **(b)** tap hens/coop, **(c)** more golden eggs, **(d)** chicken types. Sizes are *HoP est.* unless a slice or HoE gave a figure.

**v0.2 reading guide.** #1–#13 below keep their v0.1 text as the design rationale. Where a spec now exists, **the spec wins**, and each M5.0 item carries a **v0.2** line with its spec, the values that changed and the HoE size. The M5.0 roll-up with versions, verdicts, flags and gates is **§6.1**. Two items were new in v0.2: **#4b Pause/Resume** and **#5b "Sales stopped" chip**. **v0.3** adds a **v0.3** line wherever a spec moved since v0.2, plus one new M5.0 item, **#5c Best buy stopgap** (D-HOP-25). Spec versions and sha1s of record are in **§0.1**.

### #1 · Golden egg, AS-IS from spec v0.5 + Art v1.0 · Vadim (c) · M5.0
- **Problem:** there is no random, presence-rewarding moment after F8, and Vadim sees no golden eggs because none exist in the build.
- **Behaviour (spec v0.5, unchanged):**
  - Unlock F8 (`tc_egg_unlock_farm`). First spawn 45 s after unlock.
  - Gap U[120, 300] s, counted from the moment the previous egg resolves (≈17/h). 30 s visible life.
  - Outcomes: cash 45 s of income (0.45), Frenzy ×2 price on all sales for 30 s (0.35), eggs 60 s (0.20), paid as cash from F20.
  - Workers never tap it; never offline. Frenzy and boost never stack.
- **Owner:** PM Collection. **Size:** M, 3–4 dd *HoP est.* (spawn timer, slots and exclusion zones, popup, Frenzy entry in `saleMultipliers`, pause on hidden/modal, telemetry). Art is done.
- **Missing before build** (Audit):
  1. v0.5 review sign-off (was due Thu Oct 22). HoP signs at M5.0 kickoff (R14).
  2. Spawn-spot coordinates + mocks (Art & UX, `art-ux/m4-timed-collectible.md`).
  3. Eng design: timer, visibility pause, modal pause, save of the pending timer.
  4. QA ACs (M4-AC5/15/22 named in the Art spec) → a test plan.
  5. Economy **re-sim on the T3-retuned economy** (D-CEO-20261019-04); every earlier figure predates T3.
- **Fit:** 5/5. **Risks:** payout inflation (Egg, Inc. drone nerf, Study §2.3); prompt fatigue at 360 px with #5.
- **Economy checks:** catch-rate curves at 60/100%; premium at F10/F18/F24 inside the shared budget (R3); AC7 never-tap unchanged.
- **Telemetry:** existing names `collectible_spawned/_collected/_expired` (`telemetry-spec` v0.6.2) with `skin:"golden_egg"`, `outcome`, `reward_cents`; `session_end.golden_cents`.
- **v0.2:** spec `product/collection/m5-golden-egg-spec.md` v1.1 (supersedes v0.5). Behaviour as above, values unchanged and tagged *G3-scratch* (weights 0.45/0.35/0.20, first spawn 45 s, warn/urgent 20/27 s). Timers, Frenzy and the streak run on the **focus clock** (visible, no menu; ≤ 1.0 s per frame; D-HOP-04 #4, D-HOP-08 #3, D-HOP-09 #1). Frenzy is saved as `frenzyRemainingS`. Calls may stack with Frenzy (D-HOP-06 (e)). All 5 "missing before build" items above are closed: sign-off D-HOP-08; Art spots v1.1 (`art-ux/m4-timed-collectible.md`); HoE buildable §12; HoQA plan `qa/m5/test-plan-golden-egg.md`; Economy G3 scratch (§7.1). **HoE size 3.75–4.25 dd.**
- **v0.3:** spec **v1.3.2** (§0.1). v1.3 measured GE-16/GE-17 on Art rects v1.0: ≥ 2 golden spots at every size (959×600 6/8, 960×600 4/6, 960×1280 and 1024×1366 8/8; ≥ 2 with a broody hen), and `#goal` clear space ≥ 2 px on both sides everywhere (`art-ux/m5-layout-rects-960.md` §B, §D). v1.3.2 is wording only (D-HOP-26 #7). No value changes; CSV draft of record 8dc90e2b.

### #2 · Collect streak v0.3 + A2 combo tiers · Vadim (a) · M5.0
- **Problem:** sustained tapping has no visible payoff.
- **Behaviour:**
  - Streak per spec v0.3: +`tc_streak_per_tap` 0.01 per credited tap (≤ `tc_streak_max_taps_per_s` 1/s); hold 3 s, decay 0.03/s; multiplies price.
  - **Cap provisional 0.28** (R9; CSV 0.40, CCGS 0.30).
  - A2 adds tier pops every +10% plus a MAX sparkle, with a coin burst equal to one A1 bonus. This is juice, budget ≈0 (`collection.md:51`).
- **Owner:** PM Collection. **Size:** S–M, 1.5–2 dd + 0.5 dd A2 *HoP est.* The hook exists (`payout.ts:7`).
- **Fit:** 4/5. **Risks:** an invisible premium, since it lands on worker sales (Collection §4); autoclicker (credited 1/s gate).
- **Economy:** run P1 (R9); report the smallest cap that keeps the mean ≥ 1.5.
- **Telemetry:** `streak_peak` (existing in the spec), `session_end.credited_taps`.
- **v0.2:** spec `product/collection/m5-streak-tap-coins-spec.md` v1.1 (with #3). Cap **0.28** (draft CSV change 0.40 → 0.28, G3-scratch). 4 tiers at 0.07/0.14/0.21/0.28. Streak hold and decay freeze under menus and short hides (D-HOP-07 X2, D-HOP-08 #2). Visual ladder `art-ux/m5-combo-tiers.md` v0.2 (Collect 64 → 48 px). **HoE size 2.75–3 dd** (incl. A2).
- **v0.3:** spec **v1.3.1** (adds ST-AC26b, errata). Cap **0.28** is in the draft of record 8dc90e2b (§0.1). The **0.27** trim is an **M5.1** proposal tied to the breeds Broody family, pending Economy (D-HOP-26 #4); it does not change the M5.0 draft.

### #3 · A1 "Hand-picked bonus": every credited tap pays coins · Vadim (a) · M5.0
- **Problem:** "clicking is useless". The tap is coupled to coop contents, so the hand steals it.
- **Behaviour:**
  - From F8, each credited Collect tap (≤1/s, same gate as the streak) also pays `tap_income_share` [P 0.03] × 60 s rolling income. Income excludes streak, Frenzy and boost, and excludes hidden time.
  - It pays even with an empty coop. "+$X" fly-to-money pop; nothing shown below $0.01.
  - Never offline; the welcome-back Collect is not credited.
- **Owner:** PM Collection. **Size:** S, 1 dd *HoP est.*
- **Fit:** 5/5 (Cookie Clicker +1% CpS per click; Clicker Heroes 0.5% DPS per click; Study §2.1).
- **Risks:** small on purpose (+3 pp optimal, +1.5 pp casual).
- **Economy:** include in P1. Frenzy doesn't multiply A1 (default).
- **Telemetry:** `tap.credited`, `tap.bonus_cents`, `session_end.tap_bonus_cents`; `effective_tap_share` redefined on credited taps at F8+ (`collection.md:218`).
- **v0.2:** credited tap = a coop tap ≥ 1.0 s of sim time after the last credited tap, eggs or not (D-HOP-04 #1). Pays `round_half_up(0.03 × I_ref × 100)` ¢ (G3-scratch); HoE ruled integer basis-point rounding (`engineering/decisions.md` 17:05; spec text still to update, ST-11). I_ref = trailing 60 s of base-price sales; steady-state I_ss after a reload or offline return (D-HOP-08 #1, D-HOP-10 #1). **I_ss = 0 while a hired Market Hand is Asleep or Unpaid**, so tap coins pay 0 then (HoE §12 D-C6; X8 closed by HoP, 17:04). **HoE size 1–1.5 dd.**

### #4 · Worker abilities ("Shift Calls") + Activate-all, unlock F10 · M5.0
- **Problem:** after the third hire the worker system has nothing to decide (F8–F17).
- **Behaviour (abilities v0.3 sizes):**
  - Market Hand **Rush** ×1.15 price, Coop Hand **Sweep** ×1.15 lay, Hawker **Shout** ×1.15 price, Grader **Inspect** +0.5 tier (from F18).
  - Each lasts 30 s on a 300 s cooldown. Activate-all fires every ready call.
  - **Unlocks F10** (R7), shown in the Workers tab. **Energy cost = 0 in M5.0**, 10 from M5.1 (R10). Never offline; cooldowns tick in wall-clock time.
  - One "⚡N ready" badge, attended only. It must not collide with Manage all (separate control; Art to place).
- **Owner:** PM Workers. **Size:** M, ≈3–3.5 dd (PM Workers §6 minus the energy-cost item; HoE gave 1.5–2 dd for the sim).
- **Fit:** 4/5. **Risks:**
  - The v0.3 stack already sat at P95 2.12 with Focus (`m4-focus-bulk-cooldown.md:56`). Dropping Focus (R13) frees part of that.
  - Sweep raises supply, which is worth ≈0 when demand-capped (F20+). **Economy to confirm Sweep's value at F20+; swap to a price effect if it's ≈0.**
- **Economy:** AC-SC8/SC9 (`workers.md:121-130`); L10–11 re-run (P41-6 lifted for this item, R7).
- **Telemetry:** `ability_used/_ended/_blocked` (PM Workers §5).
- **v0.2:** spec `product/workers/m5-worker-abilities-spec.md` v1.3 final (sha1 `825cf4d`). **Sweep = A, lay ×1.15** (R15 resolved by D-HOP-16 (1); B rejected: 0.15–1.21% of passive, peak ×5.19, +0.5–0.75 dd). Call durations run on the focus clock; cooldowns on sim time (D-HOP-10 #2). A call fired inside the Workers sheet closes the sheet and starts at once (D-HOP-12). Energy cost 0 in M5.0. **HoE size 4.0–4.75 dd** (v0.1 *HoP est.* 3–3.5).
- **v0.3:** spec **v1.3.3** (sha1 `06f98b49…`, §0.1). HoE per-PR split (§15a): **4a** abilities-sim 2.0–2.25, **4b** abilities-ui 1.5–2.0, **4c** sheet auto-close 0.5 dd. The flag follows the SS-21 Option B trace-gate pattern unless the spec says otherwise (D-HOP-23).

### #4b · Per-worker Pause/Resume · M5.0, last PR, cut second (after #5c)
- **v0.3 cut order:** the #5c Best buy stopgap is cut before Pause (D-HOP-25 #4), so Pause is now the second cut.
- **Why it's back:** the CEO added it "if it fits the sizing" (D-CEO-20261024-06 Q3); HoE says it fits, off the critical path (§5 of the sizing doc). R13's drop is overridden (D-HOP-04 #9).
- **Behaviour (spec `product/workers/m5-worker-pause-spec.md` v1.3.1; **v1.3.3** in v0.3, no rule changes):** unlocks F10; a paused worker produces nothing, earns no wage and recovers energy at **0.25×** the drain rate (D-HOP-06 (a)); pausing ends a running call; the Market Hand's Rush/Shout lock for **45 s** after Resume (`tc_pause_call_lockout_s`, D-HOP-16 (3)); no auto-end in M5.0 (D-HOP-06 (c)); a paused Market Hand with zero sales gets the `mh_paused` "on break" chip after 20 s (D-HOP-18).
- **Owner:** PM Workers. **HoE size 3.0–3.5 dd** (§15b: 2.5–3.0 + 0.5 dd G5-P pause-pattern driver, HoE-owned, Features seat builds; off the critical path). Flag `m4.flags.pause`, default 0.
- **Economy:** G5-P passes at 45 s (worst seed +1.6%); one full-coop seed at +2.5% accepted as variance (D-HOP-16 (4)). Window gate with Pause 1.77/1.84 (100-seed run). *v0.3:* the seeds 1–200 X1 table doesn't split Pause out; G4 worst 785 s is with Pause pattern (e) (economy §6.1). G5-P and the Pause window check move to the X1 merge gate (D-HOP-24).
- **Telemetry:** `worker_paused`/`worker_resumed`, in the M5.0 subset only if Pause ships (D-HOP-10 #4).

### #5 · B1 "Broody Hen" + B2 coop flutter · Vadim (b) · M5.0
- **Problem:** there's nothing to tap on the farm itself; the yard is decoration.
- **Behaviour (Collection B1):**
  - One yard hen at a time is broody. While the tab is visible her nest accrues `broody_income_share` [P 0.05] × 60 s income, capped at `broody_cap_s` [P 150] s of that rate.
  - She glows from `broody_ready_share` [P 0.5]. One tap pays the nest as coins, then another hen becomes broody. Not diverted from production; never accrues offline.
  - **The nest is saved and persists on reload** (R12): `broody_nest_cents`, `broody_hen_idx`.
  - Unlocks at the first Coop Hand hire (F7+).
  - B2: a coop-roof tap flutters the hens (cosmetic).
- **Owner:** PM Collection. **Size:** S–M, 2 dd on the #1 framework (M standalone) *HoP est.*
- **Fit:** 5/5 (Cookie Clicker wrinklers, TT2 Heart of Gold, Hay Day hens; Study §3b).
- **Risks:** tap density at 360 px with the golden egg, Collect and the streak meter (≥48 px, exclusion zones); chore feel if the cap is too short.
- **Economy:** include in P1. Check the managed/unmanaged F22–24 ≥1.5 gate.
- **Telemetry:** `collectible_*` with `skin:"broody_hen"`, `nest_fill_share`; `session_end.broody_cents/broody_collects`.
- **v0.2:** spec `product/collection/m5-broody-hen-spec.md` v1.1. Fill 0.05 × I_ref, cap 150 s, glow at 0.5 (G3-scratch; columns renamed `tc_broody_*`, D-HOP-16 (5)). Save fields are camelCase `broodyNestCents`, `broodyHenIdx` (HoE D-C5; R12 names updated). Own RNG stream `brRng` (D-C4). Unlocks at the first Coop Hand hire and **needs PR #69 in main** (D-HOP-04 #7). **B2 coop flutter moved to M5.1** (broody spec R14c; `art-ux/decisions.md:256`). Nest art `overlay-broody-nest.svg` final (17:02). **HoE size 2.25–2.5 dd.**
- **v0.3:** spec **v1.3.2** (§0.1). **Minimum 1 eligible nest slot per viewport** (D-COL-01, approved by HoP 17:22, logged 17:23). Measured BH-k slots (pill hidden / shown): 959×600 **2 / 2** (Y0, Y5), 960×600 8 / 7, 960×1280 8 / 7, 1024×1366 8 / 7 (`art-ux/m5-layout-rects-960.md` §C). At 0 slots the hen stays hidden and the nest keeps accruing, never lowered. **The m4 hen-row overlap fix is not a precondition** for M5.0 (D-COL-01). It still needs #69 in main, via the post-Latest patch.

### #5b · "Sales stopped" chip + fatigue-visibility Rules 2–4 · M5.0 (new)
- **Problem:** both L10+ reads hit a silent sales stall: the Market Hand falls asleep, eggs pile up, money goes flat, and nothing on the farm screen says why (`market/bug-l10-sales-stall-5d9efa6.md`, S2; Player "Bored, about 2 min… I thought the game had stalled").
- **Behaviour (spec `product/market/sales-stopped-spec.md` v1.3.6, FINAL for build):** when eggs pile up but nothing sells, one chip in the goal-strip slot names the cause and fixes it in one tap (Refill, Sell all or Collect). It replaces the goal bubble while shown and hides ≤ 100 ms after a real sale (D-HOP-15, -19, -20). Rules 2–4 (HUD fatigue chip, Asleep banner, "Refill workers" bubble) move here from parked M4.2. Banner copy "Market Hand asleep/unpaid: sales stopped" (D-HOP-14, -17).
- **v0.3:** spec **v1.3.9** FINAL (§0.1). **SS-21 = Option B, two hard merge gates** (D-HOP-23, applied in v1.3.8): (1) flag off ≡ patch1 golden (sim/economy traces, farm DOM snapshot, 0 new telemetry events); (2) flag on vs off in the same build: sim/economy traces byte-identical; flag-on telemetry and DOM differences are outside gate 2. The CSV clause covers only the 9 `tc_*` columns. Art's rects are signed: 960×600 `#goal` is x 24–536; the chip ⊆ `#goal`, 44 px tall, one line at all 7 sizes (`art-ux/m5-layout-rects-960.md` §D, §E).
- **Owner:** PM Market/Customers. **Size: HoE final 2.05–2.2 dd, cap 2.2** (spec §12.1, D-HOP-20); if over, cut Rule 4. Flag `m4.flags.salesStopped`; kill switch `tc_stall_hold_s` = 0. Off the critical path (Features seat).
- **Depends on** `fix/m41-patch1` (banner, HUD rate slot, §4.2 live-income fix); +0.75–1 dd if the patch slips (spec §10).
- **Economy:** UI-only, 9 `tc_*` columns, no re-run (spec §12.1). It does **not** lighten the Refill chore (D-HOP-13 (5)); see M5.1 lighter refill.
- **Telemetry:** `sales_stall`, `fatigue_cue_shown`/`_tapped` (pinned, in the M5.0 subset).

### #5c · Best buy stopgap: no ★ on zero-gain rows · M5.0 (new in v0.3), own small PR, cut first
- **Problem:** the "★ Best buy" chip and strip ★ endorse Collection, which adds **zero** modelled income once the Coop Hand is hired (all 5,000 bot Collection buys on seeds 1–200 had gain 0; bb-stopgap §1; §7.2 E11).
- **Behaviour (spec `product/farm/bb-stopgap-spec.md` v1.2.1, sha1 `11d98516…`):** UI only. `bestBuyMark` returns null when the pick isn't a **meaningful row**: FARM, a worker hire or a Grader tier, or any row with `optionGain` > 0 $/s (ε = 0, so the ★ always matches the "+%" suffix). The rule is generic (no Collection hard-code). The pick, `econ/best-buy.ts`, hysteresis, the bot and every sim are **unchanged**, so it is **AC7-neutral** (SG-4: AC7 trace hashes byte-identical, seeds 1–200).
- **Known limit, accepted:** because the pick doesn't change, in the C2/C4 states (pick held on a zero-gain row while Farm or a track is affordable, e.g. the SG-3 L17 fixture) players see **no ★** instead of a wrong ★. SG-9 (b) reports and lists those states for HoP; they don't block merge. SG-9 (a), suppression while the suffix shows > 0, is a hard fail. M5.1 Part A fixes C2/C4.
- **Owner:** PM Farm Upgrades (D-HOP-21 Q8). **Size: XS, 0.4 dd** (HoE resize: 0.25 mark + 0.05 SG-8 + 0.1 SG-9/10/11; `product/decisions.md:753`). Its own small PR; **cut before Pause** if M5.0 slips (D-HOP-25 #4). Seat: **OPEN** (not in HoE's §15 seat plan).
- **Reviews:** HoE sized (XS); HoQA rated v1.2 testable as written; v1.2.1 adds the SG-9 pass rule and the SG-10 traces-only note (`product/decisions.md:740-742`).
- **Economy:** none (UI-only, no CSV columns). **Telemetry:** `best_buy_suppressed_zero_gain {key, farm, level}` (SG-8, edge-triggered; doesn't gate merge).
- **Full fix = M5.1** (Part A in UI and bot + Economy's collect fix + re-baseline; Part B dropped). It changes the bot, so it needs a **CEO re-baseline amendment** (L10 floor, L0–30 freeze) before it can be approved (`product/decisions.md:752`; §8 Q12).

### #6 · Chicken breeds: hatches + flock slots (+ album later) · Vadim (d) · M5.1
*v0.3: rewritten from D-HOP-26. The v0.1 PM Farm Upgrades design is superseded by the spec below; where they differ, the spec and D-HOP-26 win.*
- **Problem:** there's no collection, no attachment, and no long-arc goal in F10–F30 (RV-7, "hens are a count").
- **Spec:** `product/m5.1-breeds-spec.md` **Draft v0.1** (§0.1; D-HOP-26 ruled on sha1 `07908e96`, the file is now rev. 5). Paper only; every number is **[P]** pending Economy.
- **Owner: PM Collection** (D-HOP-26 #1). **PM Farm Upgrades is consulted** on Best buy (BR-BB1–5) and the L29→L30 costs. Joint items (R16) are unchanged.
- **Rulings (D-HOP-26):**
  1. **Hatch currency = coins, not eggs** (#2, per Economy E2). This deviates from R2 and is accepted because it gives an L30+ coin sink.
  2. **Intransitive traits:** "best for one play pattern" meets the CEO's intent (Q5) **if an AC proves no breed is best in two or more contexts** (#3).
  3. **Budget:** keep the Broody trait family, with the offsetting trim **`tc_streak_cap` 0.28 → 0.27, pending Economy** (#4). The stacked M5.1 active budget (Order Board, Rush Hour) is decided once at M5.1 plan level, not per spec.
  4. **Album milestones and the breed stall are deferred** (#5).
  5. **Breeds are a collection meta, not the L28–30 pacing fix**; that stays with the **parked L30+ reshape** (plan "Later"), **not #12** (D-HOP-27 corrects D-HOP-26 (6)). The return of the post-flock dead zone is a known risk (#6).
  6. **Gate comparator:** Q-Eco-1 (idle comparator tab-open vs tab-closed) decides G1; Economy defines it consistently with M5.0 G1 (#6). The rev. 4–5 spec reports it closed as tab open (spec §9); Economy's E-1…E-10 model is in progress (spec §13).
- **Best buy:** hatches, slots and swaps are never buy keys and never get ★ (spec BR-BB1); §4.6 (BR-BB1–5) sits on D-HOP-25 and is co-signed by PM Farm Upgrades (spec header).
- **Size:** M, 5–7 dd *HoP est.* (unchanged; no HoE sizing yet) + Art (sprites, Flock UI).
- **Risks:** power creep vs AC7; a dominant breed; 360 px UI (R5); the post-flock dead zone.
- **Economy:** G6 (§7) on the spec's model, incl. the 0.27 trim and the Q-Eco-1 comparator.
- **Telemetry:** per the spec (§8 of the spec, M5.1 subset).

### #7 · Order Board contracts + Missions v0 (+ bulk buyer) · M5.1
- **Problem:** market goals are already met by the workers. There's no allocation decision.
- **Behaviour (PM Market §1, §3):**
  - **Board:** 3 offers (Easy/Med/Hard), one active. "Ship N eggs in T min", with N in seconds of production and T in online time only.
  - **Hold for contract** stops Market Hand selling and **auto-offs after 30 s unattended**. Tap Ship to deliver.
  - **Tiers:** 40/70/100% pay coins at `contract_price_mult` [P]; the 100% tier also grants a breed hatch (R4). No fail penalty.
  - **Missions v0:** 10 attention-based missions ("serve 10 by hand", "fill your first contract", "hatch a Rare").
  - **Bulk buyer** per customer-type roadmap v0.3.
- **Owner:** PM Market. **Size:** M, 4–5 dd board + 2–3 dd missions *HoP est.*
- **Fit:** 4/5. **Risks:** Hold starves the shop (auto-off); budget stacking (bulk 1.5×, contract, Frenzy).
- **Economy:** full-stack re-sim (bulk + mini-goals + contracts) under R3.
- **Telemetry:** PM Market §1 (`contract_*`), mission events.

### #8 · rc2 Refill (charges, Rest, Shift sheet) + ability energy cost 10 + combo · M5.1
- **Problem:** with unlimited Manage-all refills, an energy cost on calls is meaningless. Scarcity needs charges (`workers.md:7-14`).
- **Behaviour:**
  - rc2 Refill v1.2 as approved: charge regen 150 s, cap 2, Rest auto-ends at 100%.
  - Calls cost `ability_energy_cost` [P 10]; blocked at ≤ cost ("Too tired").
  - Refill-then-call within 10 s → 45 s call (`combo_window_s`/`combo_boost_s`). Energised after a full Rest.
- **Owner:** PM Workers. **Size:** M, 3–4.5 dd *HoP est.* (rc2 sheet + charges; +0.5 dd cost/Energised per PM Workers).
- **Economy:** AC-SC8 (in L10–17, Refillable workers > charges ≥20% of the time); 2× budget.
- **Telemetry:** `refill_*`, `ability_blocked{reason:"tired"}`.

### #9 · Golden egg extensions: C1 Hot hands, C2 Golden Hen · Vadim (c) "more and more" · M5.1
- **Problem:** Vadim wants golden eggs "more and more" as he progresses; the v0.5 timer is flat.
- **C1:** while streak ≥ 0.20, the spawn countdown runs ×1.25 [P].
- **C2:** a new outcome taking 0.10 weight from cash (0.45 → 0.35). A golden hen crosses the yard and drops 5 eggs, each worth 1/5 of the cash outcome. **EV-neutral at 100% catch.**
- **Owner:** PM Collection. **Size:** S + S–M, 2–3 dd *HoP est.* **Fit:** 4/5. **Risks:** C1 rewards tapping twice (streak + more eggs) and is the first item to cut if the budget is short; C2 needs extra Art.
- **Economy:** C1 in P1 (fallback: drop C1 first); C2 EV check at 60% catch. **Telemetry:** `skin:"golden_hen_drop"`, `streak_peak.hot_ms`.

### #10 · Farm Lab research tree (incl. worker levels, golden-goose nodes) · M5.2
- **Problem:** depth in F18–F30; long goals; where coins go.
- **Behaviour (PM Upgrades §3):**
  - 4 branches: Coop (Farm), Flock (Hens + breeds), Market (Egg value), Crew (Workers). Tiers unlock by buying enough of the previous tier. Unlock F12 [P].
  - Some nodes unlock *things*: nest slot, second incubator, golden-goose gap ×0.9 ×3, golden life +5 s.
  - **Worker levels live in the Crew branch** (R8), not as a 4th track.
  - Lab buys are excluded from best buy/★ in v1 (R11/H3).
- **Owner:** PM Farm Upgrades (+ PM Workers for Crew). **Size:** M, 5–7 dd *HoP est.* + nodes costed with their systems.
- **Risks:** becoming another "+%" list. Rule: ≥1 node in 3 must unlock a behaviour.
- **Economy:** node pricing at 0.4–1.0× the Farm step; gap ≤3 min gate.
- **Telemetry:** `lab_node_bought {branch, tier, node}`.

### #11 · Rush Hour + Market Fair / seasonal skin · M5.2
- **Problem:** no reason to return or check in beyond income; no time-boxed moments.
- **Rush Hour:** from F10, every U(480, 720) s online, a 45 s warning, then 30 s of a tap-only rush lane at ×1.5 [P] (PM Market §4). Delayed while Frenzy is active.
- **Fair:** one per local day (device clock, R6), points ladder for manual serves. Seasonal skins on fixed dates, cosmetic only.
- **Owner:** PM Market (+ Art for skins). **Size:** Rush S–M 2–3 dd; Fair M 3–4 dd; skin S (Art). **Fit:** 3/5.
- **Risks:** Rush shares the screen with golden egg and Broody (prompt fatigue); device-clock events can be cheated (accepted, R6).
- **Economy:** hoarding with bulk + contracts (G10). **Telemetry:** `rush_started/_served`, `fair_points`, `fair_tier_reached`.

### #12 · L30 cap payoff, interim · M5.1
- **Problem:** RV-1, "L30 lands flat".
- **Behaviour:** a celebration toast at Farm MAX, a summary card (time, coins, breeds), and a "what's next" pointer to album/Lab goals. **No economy change.**
- **Owner:** PM Farm Upgrades + Art. **Size:** S, 0.5–1 dd *HoP est.* **Fit:** 3/5 (a stopgap until #13).
- **Risks:** a celebration with nothing after it can feel like "the end". The pointer must lead to a real goal. **Economy:** none. **Telemetry:** `farm_max_reached {elapsed_s}`, `session_after_max`.

### #13 · Show Day prestige · later (after M5.2 and the L30+ decision)
- **Problem:** the L30 cap ends progression (RV-1).
- **Behaviour:** reset at the cap for Rosettes (keep-only first version, R2/H4). It carries over the album and a Heritage Lab branch.
- **Owner:** PM Farm Upgrades. **Size:** L, 10–15 dd *HoP est.* (reset, CSR/save coverage, Heritage UI, sim of runs 1–3). **Fit:** 4/5.
- **Risks:** save migration; the first reset feels like a loss. **Economy:** run 2 to cap in ≤ 60% of run 1's time [P]. **Telemetry:** `prestige_done {run, rosettes}`.

### Vadim's four ideas → where they land
| Idea | Answer | Phase |
|---|---|---|
| (a) clicking gives more eggs / combos | #3 A1 coin-per-tap (coins, not eggs: extra eggs are worth ≈0 from F10), #2 streak + A2 combo tiers | M5.0 |
| (b) clicking hens/coop gives more | #5 Broody Hen + coop flutter | M5.0 |
| (c) more golden eggs, I see none | #1 golden egg as-is; #9 Hot hands + Golden Hen; Lab golden-goose nodes; Golden Hen breed trait | M5.0 → M5.2 |
| (d) different chicken types to buy | #6 breeds (hatched for **coins**, slots, traits; album milestones and breed stall deferred, D-HOP-26) | M5.1 |

---

## 5. Rulings (HoP)
Each ruling is final for this plan unless the CEO overrides it. The CEO accepted R1–R16 as drafted (D-HOP-02). **v0.2/v0.3** mark each ruling that a later decision changed; the CEO rulings are in §5.1 and the decision index in §5.2.

**PM Farm Upgrades H1–H6** (`v2-slices/upgrades.md:250-256`)
- **R1 (H1) Order:** breeds (#6, unlock F10) → Farm Lab (#10, unlock F12) → prestige later, **after** M5.0 makes the active layer real. Breeds before the Lab, because Vadim asked for chicken types and they carry the visual novelty. The Lab is cheaper in Art but adds less that the player can see.
- **R2 (H2 + H4) Hatch cost and prestige** *(v0.3: **hatch currency changed to coins** and the **breed stall is deferred**, D-HOP-26 #2, #5; the egg-cost and stall bullets below are superseded)*:
  - Hatching costs **eggs**, sized in seconds of production, which makes sell-or-hatch a real choice at F10–F20. Economy sets the F20+ cost so it doesn't go trivial.
  - **Breed stall** (F16) sells one rotating breed for coins. That is the literal "chicken types to buy".
  - Prestige (H4) waits for the L30+ decision. Keep-only Rosettes is acceptable as v1. An F30 teaser comes with F12.
- **R11 (H3) Best buy / ★** *(v0.3: ★ scoring owner = PM Farm Upgrades (D-HOP-21 Q8); strict BB-1, UC17 retired (D-HOP-25); M5.0 stopgap #5c; the full fix is M5.1 and needs a CEO re-baseline amendment, §8 Q12. The breed stall is deferred, D-HOP-26 #5)*: Lab nodes, breed-stall buys and Golden Goose nodes are **excluded** from best buy/★ in M5, so the best-buy strip and AC7 traces stay stable. Revisit after telemetry.
- **R5 (H5) Placement at 360 px:**
  - Album + incubator open from the yard (tap the coop → "Flock" sheet).
  - The Lab gets a bottom-nav item.
  - No 4th segmented tab (v1 §8 rejected it).
  - Art & UX owns the final layout and can overrule the entry points, not the "no 4th tab" rule.
- **R16 (H6) Joint items:** yes, they're listed in this plan (Silkie with PM Workers, blue-egg orders with PM Market, breed drops from golden eggs with PM Collection). The joint owner signs each slice before build.

**Earlier rulings, confirmed and completed here**
- **R4 Market Stars:** no new currency in M5. **Stars fold into breeds/album:** a contract's 100% tier and mission milestones grant a **breed hatch** (a Rare-or-better roll at the Hard tier [P]). I picked album over cosmetics because hatches feed the M5.1 headline system and give contracts a reward that coins can't buy (PM Market rule (d)). Cosmetics come later with seasonal skins.
- **R6 Device clock:** OK for daily missions, the Fair and seasonal skins. We accept clock cheating (the Cookie Clicker precedent). Nothing competitive uses it.
- **R3 Shared budget** *(v0.3: measured **+47 to +65%** on seeds 1–200 vs the +50% cap; **accepted for M5.0 because G1 holds** (D-HOP-21). There is **no headroom for M5.1 actives**: each must ship with an offsetting trim, and the stacked M5.1 budget is decided once at M5.1 plan level (D-HOP-21, D-HOP-26 #4); §7.1, §8 Q7)*: **one active-reward budget under the P95 ≤ 2.0 cap** (worst-seed guard ≤ 2.25, `product/decisions.md:157`). Economy allocates it across golden egg, streak, A1, broody, abilities, contracts, bulk buyer and Rush. PMs propose; Economy splits; HoP approves the split.
- **R7 Abilities unlock F10:** approved. **The P41-6 L0–11 guardrail is lifted for this item only.** Economy re-runs L10–11 (AC-SC9 for L0–9 byte-identical).
- **R8 Worker levels** go into the Farm Lab **Crew branch**, not a 4th track and not a worker-local XP track (closes PM Workers Q4).
- **R9 Streak cap** *(v0.3: **0.28** in the draft of record 8dc90e2b, signed into the CSV PR plan (D-HOP-24); G1 passes on the harness definition. M5.1 proposes **0.27**, pending Economy (D-HOP-26 #4))*: Collection's P1 is **provisional**. Cap 0.40 → **0.28**, funding A1 + B1 + C1. Economy runs P1 first; if P1 fails, use Collection's fallback order (drop C1, then broody 0.03). See §9 for the CEO's 0.30.
- **R10 Ability energy cost 10:** accepted **as a proposal**. It only means something once charges exist, so it ships in **M5.1 with rc2 Refill**. M5.0 abilities are free, as in approved v0.3. The config value is 0 in M5.0.
- **R12 Broody nest persists on reload:** yes, with save fields `broody_nest_cents` and `broody_hen_idx` *(v0.2: renamed `broodyNestCents`, `broodyHenIdx`, HoE D-C5)*. A missing field defaults to 0 (no version bump). It still never accrues offline.
- **R13 Drop / defer:**
  - ~~**Drop** per-worker Pause/Resume~~ *(v0.2: **overridden** by the CEO, D-CEO-20261024-06 Q3 / D-HOP-04 #9. Pause is in M5.0 as the last PR, behind its own flag, first to cut. Economy's G5-P found no exploit at a 45 s lockout, §7.1)*.
  - **Drop** the Focus premium and Focus/Bulk (it already broke the cap, and it frees budget for R3).
  - **Defer** the leave penalty (negative pressure, a poor fit for "more meaningful interaction").
  - The market completion bonus folds into Order Board tier rewards.
  - Their inert CSV columns stay at "off" until an Economy cleanup.
- **R14 Golden egg v0.5 sign-off** *(v0.2: done; v0.5 is superseded by `m5-golden-egg-spec.md` v1.1, approved D-HOP-08)*: I sign the spec as-is at M5.0 kickoff. Art spawn spots and mocks already exist (`art-ux/m4-timed-collectible.md` §2, final per D-HOP-2026-10-24-04; asset file `golden-egg.svg`). Open items are Eng design, QA ACs and the T3 re-sim; none of them change behaviour.
- **R15 Sweep** *(v0.2: resolved. Sweep A (lay) is worth 0.98–1.04% of passive at F10–19 and 1.31–1.51% at F20+, above the 1% bar, so it stays lay ×1.15; D-HOP-16 (1), `v2-slices/economy.md` §11)*: if Economy shows Sweep (×1.15 lay) is worth < 1% at F20+ because demand caps sales, Sweep becomes a price effect (×1.15 on Coop-Hand-collected eggs sold within 30 s). PM Workers re-specs it.

### 5.1 CEO rulings on v0.1 (D-CEO-20261024-06, `decisions.md:25`; logged as D-HOP-02/-03)
| Q | Ruling | Effect on this plan |
|---|---|---|
| Q1 | The 2× gate stays: **P95 ≤ 2.0, worst seed ≤ 2.25** (10-minute active/idle window) | G1 (§7) unchanged |
| Q2 | **No cap reset.** R9 trims first; a P95 ≤ 2.5 (F10+ only) proposal comes back only with Economy numbers | Not needed: the scratch stack passes at 1.77 / 1.84 (§7.1) |
| Q3 | **M5.0 active layer first**: golden egg as-is, streak + combos, coin per tap, abilities + Activate-all at F10, Broody Hen. **Pause/Resume in if it fits** | Pause in as #4b: flagged, last PR, first cut (D-HOP-04 #9) |
| Q4 | Golden egg base cadence per spec v0.5 (**2–5 min**, U[120, 300] s); "more and more" via **Hot hands, Golden Hen and Lab nodes** | #1 unchanged; #9 (M5.1) and #10 (M5.2) carry "more and more" |
| Q5 | Breeds are **strategic slots with intransitive traits**, in M5.1 | #6 (§6.3) |
| Q6 | **Monetisation stays parked** | No paid items in M5 |
| — | **Code starts only on Vadim's go** (D-CEO-20261024-04, -06) | Build hold stands |
| D-CEO-07 | 4th engineer: seat 95daf662 re-activated (on Vadim's go). Full telemetry v0.6.2 = **M5.0.1** on that seat, before any wide release; M5.0 carries the gate subset only. The asleep-signal hotfix ships as a patch after M4.1 Latest, on the same gates as #69 | §6.2, §11.1, `fix/m41-patch1` row in §6.1 |

### 5.2 D-HOP decision index (2026-10-24; full text in `product/decisions.md:491-754`)
| ID | Time | One line |
|---|---|---|
| D-HOP-02 | 15:58 | CEO accepted v0.1 (sha 08a1ec35…) as direction; gate unchanged; no cap reset; monetisation parked; R1–R16 stand. |
| D-HOP-03 | 15:59 | Per D-CEO-06: M5.0 first, Pause in if it fits, golden egg 120–300 s, breeds as strategic slots; drive v0.2 to build-ready. |
| D-HOP-04 | 16:10 | 10 M5.0 spec-gap rulings: one credited-tap definition, reference income, cap 0.28 provisional, menus freeze timers, "attended", Broody needs #69, Pause in, CSV columns via Economy only. |
| D-HOP-05 | 15:41 | Accepted D-CEO-05: research + PM only; staffed the study, slices and L10+ reads. |
| D-HOP-06 | 16:15 | Abilities + Pause specs approved (conditional); 0.25× recovery, Pause unlock F10, no auto-end, calls may stack with Frenzy. |
| D-HOP-07 | 16:20 | HoQA testability X1–X7: ±20% vs G3, RC1 hidden model, seeds/tolerances, telemetry subset only (X4), one rounding chain. |
| D-HOP-08 | 16:22 | Collection specs v1.0 approved (conditional); I_ref = base-chain sales; Frenzy freezes too; docked breakpoint 960 px. |
| D-HOP-09 | 16:30 | Collection v1.1 to HoQA; "focus clock" named; `credited_taps`; ST-AC20 events in the subset. |
| D-HOP-10 | 16:34 | I_ref = steady-state after reload; call durations on the focus clock; `session_end` and Pause events in the subset. |
| D-HOP-11 | 16:26 / 16:36 | Market slice answers (no Stars currency yet, device clock OK, one shared budget); L10 sales stall: M4.1 hotfix (asleep signal) + M5.0 "Sales stopped" chip. |
| D-HOP-12 | 16:39 | A call fired inside the Workers sheet closes the sheet and starts at once. |
| D-HOP-13 | 16:41 | I_ss keeps the 1 tap/s term; sales-stopped v1.1 into M5.0 (cut Rule 4 then Rule 2); §4.2 into the patch; PM Workers owns an M5.1 lighter refill. |
| D-HOP-14 | 16:44 | Patch banner: "Market Hand asleep: sales stopped". |
| D-HOP-15 | 16:46 | The chip takes the goal-strip slot at all widths; the bubble returns when sales resume. |
| D-HOP-16 | 16:51 | Economy G3 rulings: Sweep A; judge M5.0 on the window gate + L0–30 (step-gate delta is a known risk); lockout 45 s; full-coop outlier accepted; draft CSV approved in principle, applied only after the re-measure; asleep CH share 0.15. |
| D-HOP-17 | 16:52 | Unpaid banner "Market Hand unpaid: sales stopped"; "auto-selling stopped" only in the toast and welcome-back line. |
| (no id) | 16:50 | `mh_paused` chip accepted; standing rule: over 2.0 dd, cut Rule 4 then Rule 2 (cap later raised to 2.2 by D-HOP-20). |
| D-HOP-18 | 16:53 | Confirms `mh_paused` "Market Hand on break · Sell all" after 20 s of zero sales. |
| D-HOP-19 | 16:56 | Chip min-show default 0; hides ≤ 100 ms after a real sale with a 150 ms crossfade. |
| D-HOP-20 | 16:58 | Min-show state machine and column dropped; Rule 4 kept; sales-stopped cap 2.2 dd. |
| X8 (no id) | ~17:04 | Tap coins and Broody pay 0 while a hired Market Hand is Asleep/Unpaid; intended; tested as an edge case (`qa/m5/testability-gaps.md` v0.5.3, which cites it as D-HOP-13). |
| D-HOP-21 | 17:18 | Q7: G1 is the binding gate; the M5.0 +52–65% budget overrun is accepted for M5.0 if G1 is confirmed; any M5.1 active ships with an offsetting trim. Q8: ★ scoring owner = PM Farm Upgrades. |
| D-HOP-22 | 17:19 | Gate sequencing: paper build-ready gates on the scratch runner re-run to the harness definition (every 10-min window, seeds 1–200, final draft); the harness-of-record re-measure becomes an M5.0 CI merge gate (±20% vs prediction, X1). `guard_*` columns out. |
| D-HOP-23 | 17:20 | SS-21 = Option B, two hard gates (flag off ≡ patch1 golden; flag on vs off: sim/economy traces byte-identical). CSV clause = the 9 `tc_*` columns. Default pattern for the other M5.0 flags. |
| D-HOP-24 | 17:21 | CSV PR plan signed: draft of record 8dc90e2b (152 cols, 29 added, 2 value changes); HoR play-equivalence 200/200; G7 fails exactly the 62 ruled cells; window/step/G4/G5-P + chip-on SS-21 → X1 CI merge gate. `product/economy.csv` stays c7bb783f until Vadim's go. |
| D-COL-01 | 17:22 (approved 17:23) | Broody: minimum 1 eligible nest slot per viewport; 959×600's 2 slots OK; hidden at 0; M5.0 not dependent on the m4 hen-row overlap fix. |
| D-HOP-25 | 17:26 | Best buy: strict BB-1; UC17 retired (fresh-save first ★ = meaningful buy within 30 s); full fix M5.1; M5.0 stopgap "no ★ on zero-gain rows" as its own small PR, cut before Pause. |
| D-HOP-26 | 17:42 | M5.1 breeds spec v0.1: owner PM Collection (PMFU consulted); coin hatches; intransitivity AC; Broody family + `tc_streak_cap` 0.27 trim pending Economy; album milestones + breed stall deferred; not the L28–30 fix; HoQA wording errata as v1.3.2. |
| D-HOP-27 | 17:54 | AC-X1 merge gate (HoQA testability-gaps v0.7): B-X1a X1 runs on the shipping CSV 8dc90e2b with a blocking/non-blocking split; B-X1b HoQA's G5-P bands for the Pause merge; E-6 whole enabled stack + per-flag off-vs-on delta at every merge; E-4 flag-off hash vs the post-M4.1 patch baseline. Corrects D-HOP-26 (6): the L28–30 fix is the parked L30+ reshape, not #12. |

---

## 6. Phased options
| Phase | Contents | Dev-days | What it fixes | Risk |
|---|---|---|---|---|
| **Post-Latest patch `fix/m41-patch1`** (outside M5) | rc1 asleep signal (AC-R1–R9 port, incl. §4.2 live-income fix + D-HOP-14/-17 banners) + #69 v2 yard hens + m-RC1-1 | ≈9–11 h dev + gates (`engineering/decisions.md`, 16:45) | The silent sales stall (S2); unblocks Broody (#69) and the chip | M4.1 Latest shipped (tag `m4.1-5d9efa6`); lands **before** the M5.0 build (D-CEO-20261024-07); patch SHA awaited from HoE |
| **M5.0 "Make the active layer real"** | #1 golden egg · #2 streak + A2 · #3 tap coins · #4 abilities at F10 (free) · #5 Broody Hen · #5b Sales-stopped chip · **#5c Best buy stopgap (cut first)** · M5.0 telemetry subset · **#4b Pause (last PR, cut second)** | **≈29.5–37 dd**, **≈32–40 with Pause** (HoE §15), **+0.4 dd** for #5c (HoE resize, `product/decisions.md:753`) | Vadim's (a) (b) (c), "nothing after 3 workers", the silent stall, the wrong ★. Active/idle P95 1.661–1.757 (SCRATCH, harness definition, §7.1) | X1 merge gate (±20%); step-gate delta (known risk); budget over +50%, accepted (D-HOP-21) |
| **M5.0.1** | Full telemetry v0.6.2 migration | **6–7.5 dd** + ≈1.5 QA days (HoE §10.2) | Unbounded pinned growth; full dashboards | Must land before any wide release (D-CEO-07) |
| **M5.1 "My flock + goals"** | #6 breeds (PM Collection, coin hatches) · #7 Order Board + missions + bulk buyer · #8 rc2 Refill + energy cost + lighter refill · #9 Hot hands + Golden Hen · #12 cap payoff · B2 coop flutter · **Best buy full fix** (Part A UI + bot, collect fix, re-baseline) | **≈19–25.5 dd** *HoP est.* (v0.1 17–23 + lighter refill 2–2.5); Best buy full fix **≈1.25 dd eng** + 1–2 dd Economy + 0.5 dd QA (proposal v0.2 §7) | Vadim's (d); RV-7; meso goals; worker scarcity; Refill chore; ★ C2/C4 states | Art load; **no budget headroom** (§7.1, offsetting trims, D-HOP-21); Best buy needs a CEO re-baseline amendment (§8 Q12) |
| **M5.2 "Depth + return"** | #10 Farm Lab (+ worker levels, Golden Goose, Crew "Stamina" nodes) · #11 Rush Hour + Fair/seasonal | **≈11–15 dd** *HoP est.* | F18–F30 depth; small buys between Farm levels; return hooks | Lab as a "+%" list; Rush has no budget headroom |
| **Later: L30+ reshape + Show Day prestige** | #13 | **≈10–15 dd** *HoP est.* | L30 horizon (Critic gap 3) | Parked L30+ decision; step gates fail today (§7.1) |

### 6.1 M5.0 scope table (v0.3, as on disk 2026-10-24 ~17:47 CEST)
"DDR" = design-doc-review verdict. dd = HoE `engineering/m5.0-sizing.md` §2/§15/§15a unless noted. All flags default 0 and need `balance.m4.enabled` (HoE §12 D-C1). Spec sha1s are in §0.1. **HoQA: all 7 specs TESTABLE** (B-X1a/B-X1b being fixed in economy §13.2a, D-HOP-27). **Every row is waiting on Vadim's go.** **Every Economy value** is SCRATCH until the X1 CI merge gate (D-HOP-22, -24).

| # | Feature | Spec (version) | Owner | DDR verdict | HoE buildable | dd | Flag | Merge gates (build time) |
|---|---|---|---|---|---|---|---|---|
| 1 | Golden egg + Frenzy | golden-egg **v1.3.2** | PM Collection | APPROVED | YES (§12.0) | 3.75–4.25 | `m4.flags.golden` | X1 window/G4 gate; CSV PR (GE-8). Art rects GE-16/GE-17: **PASS** (rects v1.0). Art + SFX done |
| 2 | Streak + A2 tiers | streak-tap-coins **v1.3.1** | PM Collection | APPROVED | YES (§12.0) | 2.75–3 | `m4.flags.streak` | X1 (cap 0.28 in 8dc90e2b); CSV PR (ST-5); SS-21-pattern trace gates (D-HOP-23) |
| 3 | A1 tap coins | same spec as #2 | PM Collection | as #2 | YES | 1–1.5 | `m4.flags.tapCoins` | As #2 |
| 4 | Worker abilities + Activate-all | abilities **v1.3.2** | PM Workers | APPROVED | YES (§11) | 4.0–4.75 = 4a 2.0–2.25 + 4b 1.5–2.0 + 4c 0.5 (§15a) | `m4.flags.abilities` | X1 (AC-M5A-15); CSV PR (AB-4); SS-21-pattern trace gates |
| 5 | Broody Hen | broody-hen **v1.3.2** | PM Collection | APPROVED | YES (§12.0; #69 by construction) | 2.25–2.5 | `m4.flags.broody` | **PR #69 in main** (post-Latest patch); X1; CSV PR (BH-b). BH-k **PASS**, min 1 slot (D-COL-01). Nest art done |
| 5b | "Sales stopped" chip + Rules 2–4 | sales-stopped **v1.3.9** FINAL | PM Market/Customers | APPROVED (spec §13) | YES, final 2.05–2.2, cap 2.2 | 2.05–2.2 | `m4.flags.salesStopped` (+ kill switch `tc_stall_hold_s` = 0) | Post-Latest patch landed (else +0.75–1 dd); **SS-21 Option B** (2 hard gates) + SS-27 hard gate; chip-on half of SS-21 at X1. SS-G6 rects **PASS** |
| **5c** | **Best buy stopgap** (new) | bb-stopgap **v1.2.1** | PM Farm Upgrades | Quick design spec; HoQA testable as written | YES, XS | **0.4** (`product/decisions.md:753`) | none (UI-only; follows `m4.enabled`, SG-7) | SG-4 AC7 hashes identical (seeds 1–200); SG-9 census ((a) hard fail; (b) listed for HoP). **Cut first** (D-HOP-25) |
| 4b | Pause/Resume (**last PR, cut second**) | pause **v1.3.5** | PM Workers | APPROVED | YES (§11) | 3.0–3.5 (§15b, incl. G5-P driver) | `m4.flags.pause` | X1 G5-P (lockout 45 in the CSV PR; (f) outlier accepted) |
| — | M5.0 telemetry subset (X4) | HoE §10.1 + per-spec telemetry sections | HoE (Saves seat) | — | YES | 2–2.5 (in F4) | — | Lands by ≈day 5 |
| — | Foundations F1–F6, X5 hooks, integration/RC | HoE §1, §13, §2 | HoE | — | — | F1 3–3.75, F2 1.75–2.25, F3 0.75–1.25, F5 2–3, F6 1.5–2; X5 + BH-m 0.35–0.6; RC 2.5–3.5 | — | X1 harness commit (active bots + window metric + `--m5 on`; economy §13.2) |
| — | One CSV PR (draft 8dc90e2b) | economy §13.1, D-HOP-24 | Economy → HoP | Plan **signed** (D-HOP-24) | — | — | — | PR card lists the **62 ruled G7 cells**; G10 = 16 (same as prod); `product/economy.csv` changes only after Vadim's go |
| **Outside M5.0** | **Post-Latest patch `fix/m41-patch1`** | asleep signal (rc1 AC-R1–R9) + #69 v2 + m-RC1-1 | HoE / UI engineer | — (bug fix) | Sized (`engineering/decisions.md` 16:45) | ≈9–11 h + gates | none | Lands **before** the M5.0 build (D-CEO-20261024-07). M4.1 Latest = tag `m4.1-5d9efa6`; patch SHA awaited from HoE |

### 6.2 Sizing and parallel work plan (paper; HoE `engineering/m5.0-sizing.md` §3, §4, §7, §15)
- **Totals:** M5.0 **≈29.5–37 dd**, **≈32–40 with Pause** (HoE §15), plus **0.4 dd** for the #5c stopgap, which §15 predates. QA **≈11 QA days**. Art ≈3.5–4.5 days (assets now delivered). Calendar **≈13–15 working days with 4 engineers**; ≈17–20.5 with 3. **Critical path ≈12.5–12.75 days.**
- **Before day 1:** Vadim's go; B-X1a/B-X1b fixed in economy §13.2a (D-HOP-27); the post-Latest patch (asleep signal, #69 v2, m-RC1-1) merged (D-CEO-20261024-07); spec freeze = the §0.1 sha1s; the one CSV PR on 8dc90e2b (plan signed, D-HOP-24). The paper Economy re-measure is done (§7.1); the harness-of-record check is the X1 merge gate, before any flag ships on.
- **Critical path:** F1 sim event framework (3–3.75) → #1 golden egg sim → #1 golden egg UI (needs F6) → #5 Broody → full-stack G0/G1 gate (F5) → RC gate (one SHA, QA + Art).

| Seat | Owns (in order) | dd | Days |
|---|---|---|---|
| Senior Software Architect | F1, F3, #1 sim, #3 income-ref, #5 sim, integration/RC lead | ≈10–11 | d1–d12 |
| Saves & Persistence | F2, hidden/offline wiring for every item, save fixtures/goldens, #2 streak sim, **telemetry subset (d3–d5)**, Pause sim | ≈8–9.5 | d2–d11 |
| UI & rc1 Fixes (busiest) | #69 rebase first, F6, #2 UI + A2, #1 UI, #3 pop, #5 UI | ≈9–10.5 | d1–d12 |
| Features & Economy Wiring (seat 95daf662, re-activated by D-CEO-07) | F5 harness, #4 abilities sim + UI (two-row card), #5b Sales-stopped, Pause UI; then M5.0.1 telemetry | ≈9.5–11.5 (§15) | d2–d11, then M5.0.1 |

- **Order** (HoE §3): F1 + F3 + F6 in parallel → F2 → #1 sim → #2 sim → #3 → #4 sim → #1 UI → #2 UI → #4 UI → #5 → #5b → **(Pause last)** → F5 full-stack gate → RC. ≈14 PRs, each ≤ ~400 lines, each behind its flag. #4 lands as 3 PRs (4a/4b/4c, §15a). **#5c** is its own small PR; its slot in the order and its seat are **OPEN** (not in HoE §3/§15).
- **Merge hotspots:** `ui/app.ts` (F6 lands first; #5c touches its 4 `bestBuyMark` call sites, bb-stopgap SG-5), `sim/payout.ts` (F1 registry), `GameState` (fields declared in F1), `sim/workers.ts` (one owner; Pause after #4), **one** Economy CSV PR.
- **Cut order if the calendar slips:** (1) the #5c Best buy stopgap (D-HOP-25 #4); (2) Pause/Resume, whole PR (flag off); (3) Sales-stopped Rule 4, then Rule 2 (D-HOP-13, D-HOP-20); (4) if G1 fails at X1: lower the streak cap, then `tc_tap_income_share`, then Broody 0.03 (spec fallbacks); last resort plan option C, drop #4.

### 6.3 M5.1 and M5.2 outline (updated)
**M5.1 "My flock + goals"** (all *HoP est.*; nothing specced to build level yet)
- **#6 Breeds** (Q5: strategic slots, intransitive traits): spec `product/m5.1-breeds-spec.md` Draft v0.1, **owner PM Collection**, PM Farm Upgrades consulted (D-HOP-26 #1). **Coin** hatches (#2); intransitivity AC (#3); Broody family kept with `tc_streak_cap` 0.27, pending Economy (#4); album milestones and breed stall deferred (#5); not the L28–30 fix (#6). 5–7 dd *HoP est.* + Art.
- **#7 Order Board + Missions v0 + bulk buyer:** 6–8 dd. **Budget blocker:** the M5.0 stack measures +47 to +65% vs the +50% budget (§7.1), so there is **no headroom**. Per D-HOP-21 each M5.1 active ships with an offsetting trim (Economy's lever: streak cap toward 0.20) or the budget is re-ruled; the stacked M5.1 budget is decided once at M5.1 plan level (D-HOP-26 #4).
- **Best buy full fix** (PM Farm Upgrades): Part A in UI and bot, Economy's collect fix and a re-baseline; Part B dropped (`product/decisions.md:752`). Fixes the C2/C4 no-★ states left by #5c. **Needs the CEO re-baseline amendment** (L10 floor, L0–30 freeze; §8 Q12). Proposal `product/farm/m5.1-bestbuy-rebaseline-proposal.md` v0.2 (sha1 `63ef466d`): HoE ≈1.25 dd, one PR behind `m5.flags.bestBuyV2`; overall M with 1–2 dd Economy + 0.5 dd QA; awaiting the CEO.
- **#8 rc2 Refill + energy cost 10 + combo + lighter refill:** rc2 3–4.5 dd + lighter refill **2.0–2.5 dd** = 5–7 dd (`workers/m5.1-lighter-refill-proposal.md` §8). Recommended: per-worker Auto-refill (spends the same charges, fires at 20%, keeps 1 in reserve) + auto-Rest at 0 charges; reject a bigger pool and a paid Overseer. Economy gate: AC-SC8 holds and auto-only income is 85–95% of best manual play. Status: v0.1 draft for HoP; needs Economy (after the re-measure), Art (toggle placement) and HoE. `charge_regen_s` 150 → 120 from F18 if charges ship (`v2-slices/economy.md` §0 #5).
- **#9 Hot hands + Golden Hen** (Q4 "more and more"): 2–3 dd.
- **#12 L30 cap payoff (interim):** 0.5–1 dd.
- **B2 coop flutter** (moved from M5.0, broody spec R14c): S.
- **Backlog decisions carried:** Pause auto-end, decided from M5.0 telemetry (D-HOP-06 (c)); asleep Coop Hand collect share 0.15 (PM Workers; D-HOP-08, D-HOP-16 (6)); the column is inert in M5.0 (no reader; `product/decisions.md:730`).

**M5.2 "Depth + return"**
- **#10 Farm Lab:** 5–7 dd + nodes. Includes worker levels (R8), Golden Goose nodes (Q4), and the lighter-refill option A Crew nodes "Stamina I–III" and "Early whistle" (≈0.5 dd per node). Also the answer to the Player's "small purchases between Farm levels".
- **#11 Rush Hour + Fair/seasonal:** 5–7 dd. Same budget blocker as #7.

**Later:** L30+ reshape (parked; it is also what fixes the failing step gates) and **#13 Show Day prestige**, 10–15 dd.

**Recommendation (unchanged): build M5.0 next, playtest with Vadim from an F8/F10 save, then M5.1.** Alternatives (A) breeds first, (B) M5.0 + M5.1 together and (C) M5.0 without abilities are as in v0.1; (C) stays the G1 fallback.
---

## 7. Economy checks and gates per phase
Every gate runs on the **T3-retuned economy** (D-CEO-20261019-04). Nothing is built before its phase gate passes.

**Gate sequencing (D-HOP-22, D-HOP-24):** the harness of record `npm run measure:l30plus` (code `a05bc74`) **can't model M5.0** yet: there are no M5.0 mechanics in `src/` and no active bots (economy §13.2). So:
- **Paper build-ready** gates on the **scratch runner re-run to the harness definition**: `scratch/v2-econ/h/m5x.ts`, every 10-minute window (window starts every 300 s from F10 to L50, approximation A1; timers reset per window, A2), **seeds 1–200**, final draft columns on the T3 lineage (`scratch/v2-econ/t3-draft.csv`), Sweep A, the I_ss = 0 stall rule, **6 cells** = 3 profiles (optimal / seller15 / casual) × 2 call policies (naive / frenzy-holder), 3,909–4,156 windows per cell (economy §13.2a). **SCRATCH; not the harness of record.**
- **The harness of record has run on the mechanic-free draft** (economy §13.2): play-equivalence **200/200**, every pacing number identical to c7bb783f, G7 fails exactly the **62 ruled cells** (2 value changes × 31 rows, no reader), G10 = 16 (same as prod).
- **X1 CI merge gate** (economy §13.2a AC-X1, defined by **D-HOP-27**): runs on the harness of record once the mechanics land behind `m4.flags.*` and a reviewed harness commit adds the active bots and the window metric. Every value must land within **±20% of the prediction**, and every absolute gate must hold, **before any M5.0 flag ships on**.
  - **CSV (B-X1a):** X1 runs on the **shipping CSV, the M5.0 draft 8dc90e2b (L0–30)**. Economy republishes the §13.2a prediction table on that CSV, one row per gate, with columns: metric, prediction, ±20% band, blocks merge Y/N, CI check name, owner. **HoE owns and names the CI check; Economy owns the numbers.** Check name **`pacing-x1-stack`** (CI job = status check, HoE): runs on every PR and every merge to main, whole enabled stack on the shipping CSV plus each flag's off/on delta; Y rows fail the check, N rows are warnings in the job summary; G5-P adds a pause-driver summary row. It becomes a *required* check only after Vadim's go on M5. **(f) band reading (HoP):** at most one seed-checkpoint may fall in (+2.0%, +2.5%]; every other seed-checkpoint stays ≤ +2.0%, and the mean stays ≤ +1.0%; anything else blocks (HoQA, pause v1.3.5). **E-4:** HoE checks flag-off hash `f90d1678` against the post-M4.1 patch baseline once `fix/m41-patch1` is cut (open, build precondition).
  - **Blocking (Y):** G1 window P95 and worst seed in the L0–30 range; G4; SS-21 chip-on; AC7 flag-off byte-identical.
  - **Non-blocking info (N):** the L30+ step deltas, run on the `t3-draft.csv` fixture (dd301dfd…), labelled as a known risk.
  - **Pause merge only (B-X1b), HoQA's G5-P bands:** patterns (a)(b)(e)(g) ≤ +1.0% mean / ≤ +2.0% worst seed; (d) ≤ never-pause; (f) ≤ +2.5% on at most 1 seed-checkpoint, otherwise block. HoE owns the pause-pattern harness driver.
  - **Scope (E-6):** every merge checks the **whole enabled stack (cumulative)** plus **each flag's off-vs-on delta**. **Flag-off hash (E-4)** is checked against the post-M4.1 patch baseline.
  - The current §13.2a table is on the T3 lineage; its republication on 8dc90e2b is the B-X1a fix (Economy/HoE, in progress).

| Phase | Gate | Pass condition | Owner | v0.3 result (SCRATCH, harness definition, seeds 1–200, unless noted) |
|---|---|---|---|---|
| All | **G0 AC7 never-tap** | An idle (never-tap) player meets M4 AC7 / TR-5 unchanged | Economy → HoQA | Mechanic-free draft on the harness of record: play-equivalence 200/200, pacing identical. Per-flag trace identity at build: SS-21 Option B pattern (D-HOP-23); #5c SG-4 |
| All | **G1 active/idle cap (R3, CEO Q1)** | Optimal active/idle over a 10-min window: **P95 ≤ 2.0, worst seed ≤ 2.25** | Economy | **PASS in all 6 cells** (table in §7.1). Max P95 1.757; max P95 of each seed's worst window 1.835; worst seed **1.936** |
| All | **G2 active floor** | Mean optimal active/idle ≥ 1.5 at F10/F18/F24; casual ≥ 1.2 [P] | Economy | **Mean not reported: OPEN.** Medians (all windows F10+): naive 1.661 / 1.580 / 1.547, holder 1.645 / 1.567 / 1.487 (optimal / seller15 / casual; economy §13.2a) |
| M5.0 | G3 P1 package | streak 0.28 + A1 0.03 + Broody 0.05/150 s + golden + abilities (free) meet G1/G2 | Economy | **G1 PASS** (as above). G2: as above. Smallest streak cap keeping G2: OPEN |
| M5.0 | G4 golden egg | Catch curves 60/100%; premium per F; first spawn ≤ 45 s after F8; no frenzy/boost stack | Economy + HoQA | Unchanged from v0.2 (100-seed run, economy §6.1): golden cash 11.2/7.7/5.6% + Frenzy 4.8/0.4/0.0% of passive at F10–19. Spawn rules are ACs (GE-AC) |
| M5.0 | G5 workers | AC-SC9 L0–9 on/off; L10–11 re-run (R7); managed/unmanaged F22–24 ≥ 1.5; Sweep at F20+ (R15) | Economy | Workers L10 P95 **11.05 / 11.37 ≤ 12.1 PASS** (100-seed run; §13.2a). Harness of record, mechanic-free: 12.08 (margin 0.022). Sweep closed (R15). Managed/unmanaged F22–24: **OPEN** |
| M5.0 | G5-P Pause | (a)(b)(e)(g) ≤ +1.0% mean / ≤ +2.0% worst seed; (d) ≤ never-pause; (f) ≤ +2.5% on ≤ 1 seed-checkpoint, else block (HoQA bands, D-HOP-27 B-X1b) | Economy; HoE driver | **PASS with lockout 45 s**; (f) +2.5% on one seed accepted (D-HOP-16 (4)). Not measurable on the harness of record until Pause is built → **X1, blocking for the Pause merge** |
| M5.0 | Step gate (`gates.md` G1/G2/G4) | L30+ step P95 ≤ 2.0 / worst ≤ 2.25; nothing-affordable ≤ 180 s; a mechanic adds ≤ +0.10 | Economy | **FAIL, pre-existing; known risk** (§7.1). Not the M5.0 basis (D-HOP-16 (2)); at X1 the L30+ step deltas are **non-blocking info** on the t3-draft fixture (D-HOP-27); G4 is **blocking** in the L0–30 range. Re-judged after the L30+ reshape with the +0.10 rule |
| M5.0 | #5c stopgap | AC7 trace hashes byte-identical (SG-4); SG-9 census | HoQA | Paper: AC7-neutral by construction (pick and bot unchanged, bb-stopgap §2). Run at build |
| M5.1 | G6 breeds | Order fill ≥ 75%; AC7 + gap ≤ 3 min; stacking cap; Q-Eco-1 comparator consistent with M5.0 G1 | Economy + PM Collection (PMFU consulted) | Not run by Economy yet (E-1…E-10 in progress, breeds spec §13); spec first-pass model is SCRATCH |
| M5.1 | G7 contracts/bulk | Full-stack re-sim meets G1; Hold never strands sales > 30 s | Economy + PM Market | Not run; **no budget headroom** (7.1); offsetting trim required (D-HOP-21) |
| M5.1 | G8 refill scarcity | AC-SC8 ≥ 20% charge-starved in L10–17 (also with Auto-refill on) | Economy + PM Workers | Not run |
| M5.1 | Best buy full fix | L10 floor and L0–30 pacing after the bot change; new hashes | Economy + PM Farm Upgrades | Needs a **CEO re-baseline amendment** first (§8 Q12); proposal v0.2 awaiting the CEO |
| M5.2 | G9 Lab | Node prices 0.4–1.0× the Farm step; gap ≤ 3 min; ≥ 1 in 3 nodes unlocks a behaviour | Economy + PM Farm Upgrades | Not run |
| M5.2 | G10 Rush/Fair | Hoarding bound; Rush adds < 5% income [P] | Economy + PM Market | Not run; no budget headroom |

### 7.1 Economy results (SCRATCH; `product/research/v2-slices/economy.md` §6.1, §13.1, §13.2, §13.2a)
**G1 window gate: PASS in all 6 cells** (scratch runner `m5x.ts`, harness definition, seeds 1–200, T3 + final draft, Sweep A, stall rule on; economy §13.2a):

| Policy | Profile | P95, all windows F10+ | P95 of each seed's worst window | Worst seed | Limit |
|---|---|---|---|---|---|
| Naive casts | optimal | 1.742 | 1.809 | 1.917 | P95 ≤ 2.00 / worst ≤ 2.25 |
| | seller15 | 1.697 | 1.769 | 1.816 | |
| | casual | 1.665 | 1.754 | 1.815 | |
| Frenzy-holder | optimal | 1.757 | 1.835 | **1.936** | |
| | seller15 | 1.699 | 1.796 | 1.875 | |
| | casual | 1.661 | 1.768 | 1.858 | |

- **Headroom: 0.165 on P95** (2.00 − 1.835, the P95 of each seed's worst window) and **0.31 on the worst seed** (2.25 − 1.936). The earlier 100-seed checkpoint run gave 1.77 / 1.84 (economy §6.1).
- **Step gate, known risk (D-HOP-16 (2)).** The no-mechanics baseline **already fails**: L30+ step P95 **2.467 / 2.604 / 2.794** (optimal / seller15 / casual), the parked L30+ reshape. M5.0 adds to the step P95: naive **+0.21 / +0.54 / +0.58**, frenzy-holder **+0.85 / +0.67 / +0.83**, so the known-risk range is **+0.21 to +0.85** (was +0.23 to +0.97 at one window per checkpoint). Worst-seed deltas +0.54 to +1.71 (baseline 2.566 / 2.823 / 3.160). G4 nothing-affordable worst seed 378–785 s (baseline 427–768); the stack improves it except with Pause pattern (e) (785 s). All FAIL pre-existing; re-check after the reshape with the same-seeds +0.10 rule.
- **Budget: over, accepted.** Median premium over passive (F10–19 / F20–29 / F30+): naive optimal +61.3 / +63.8 / +64.7%, seller15 +56.6 / +57.8 / +58.4%, casual +53.0 / +54.5 / +54.5%; frenzy-holder +47.0 to +63.9%. So **+47 to +65%** vs the **+50%** cap, up to 15 pp over. **Accepted per D-HOP-21** because G1 holds. The overrun is the streak (an always-on ×1.28 vs a +12% allocation; economy §6.1). **There is NO headroom for M5.1 actives** (Order Board, Rush Hour): each needs an offsetting trim or a budget re-ruling (D-HOP-21), decided once at M5.1 plan level (D-HOP-26 #4).
- **Other pass lines:** G3 top-step share worst seed 7.8–9.7% ≤ 25% PASS; G5 workers L10 P95 11.05 / 11.37 ≤ 12.1 PASS (casual 14.11 info only); G5-P PASS (lockout 45, (f) outlier accepted) (economy §6.1).
- **Peak per-sale multiplier ×4.51 at F18** (exact, formula). L30 median 34.4 / 35.2 / 37.2 min (optimal / seller15 / casual). The L10 and L30 rows come from the 100-seed run (seeds 0–99), because `m5x.ts` doesn't record them (economy §13.2a).
- **Approximations, labelled (economy §13.2a):** (A1) windows start every 300 s, not every second; every 600 s span overlaps a measured window by ≥ 300 s. (A2) mechanic timers reset per window (streak 0, calls ready, no Frenzy, empty nest). Calls ready at t = 0 slightly over-state the ratio; the streak at 0 under-states it by ≤ 28 s × 0.28.
- **Draft CSV:** verified in §0.1 (8dc90e2b, 152 columns, 29 added, 2 value changes; `w2_asleep_collect_share` inert in M5.0). The CSV PR plan is signed (D-HOP-24); `product/economy.csv` stays c7bb783f until Vadim's go.
- **D-HOP-30 (18:14):** B-X1a done, with economy §13.2a republished on 8dc90e2b (sha256 `1cf6da7c…069e`). G1 PASS (P95 ≤ 1.761, worst ≤ 1.936); the L11–30 step ratio falls with the stack. **G4 split:** the no-regression check against the baseline worst seed is Y; P95 ≤ 180 s is Y (126–166 today); worst seed ≤ 180 s is N, a warning, a **pre-existing L0–30 dead zone** (baseline 226–381 s, stack 196–294 s) and a known risk for the CEO. The G5-P (b) seller15/casual cells are re-run at 45 s in X1.
- **What moves to X1** (D-HOP-24, defined by D-HOP-27): blocking = G1 window P95 + worst seed (L0–30), G4, SS-21 chip-on, AC7 flag-off byte-identical (vs the post-M4.1 patch baseline), and for the Pause merge the HoQA G5-P bands; non-blocking = L30+ step deltas on the t3-draft fixture. Whole enabled stack plus per-flag deltas at every merge. All on the shipping CSV 8dc90e2b; a confirmatory harness run on 8dc90e2b (rather than 45095351 = 8dc90e2b + 2 unread `guard_*` columns) is part of it (economy §13.2).


### 7.2 Evidence: Critic and Player L10+ reads, mapped to fixes
Sources: Critic `product/critic/l10-interaction-read-2026-10-23.md` (build m4.1+5d9efa6, L10 save with 3 workers, L10 → L30 in ≈36 min, then ≈14 min at the cap; buys were script-paced after 16:17, so real waits are longer). Player `product/playtest-l10-interaction-2026-10-23.md` (same build, 375×700, hand play, L10 at 16:04:39 → L18 at 16:25:30). Economy cross-check `v2-slices/economy.md` §1.3.

| # | Finding (measured) | Source | Fixed by | Phase |
|---|---|---|---|---|
| E1 | From L10 the only input is Buy, plus Manage all every 9–14 min | Critic | #1 golden egg, #2 streak, #3 tap coins, #4 calls, #5 Broody (an action every ≤ 30 s, PT-1) | M5.0 |
| E2 | Tapping stops mattering by L15: 20 taps gave ≈$205/s vs $189/s idle (+8%, noise); L20 $574/s vs $573/s. Player: "Collect +20… never gives coins" | Critic; Player; Economy tap share 0% | #3 tap coins (every credited tap pays), #2 streak (×1.28 price) | M5.0 |
| E3 | Golden eggs, abilities, streak absent from the build | Critic DOM scan; Player "never seen" in ≈41 min | #1, #2, #4 (built for the first time) | M5.0 |
| E4 | **Dead zone L17: 56 s** (only Collection buyable) | Critic | Calls, golden egg, Broody fill the wait; the buy itself is not faster | M5.0 (partial) |
| E5 | **Dead zone L22: ≈20 s** with $60K banked; 20–45 s waits L18–27 | Critic | Same as E4 | M5.0 (partial) |
| E6 | **Dead zones L28 ≈2:15, L29 ≈1:55** (only Collection) | Critic | M5.0 fills the time; L30 comes 29–35% sooner for active players (§7.1) | M5.0 (partial) |
| E7 | **L30+: open-ended**; only Collection, waits 1 → 7.5+ min and growing | Critic | **NOT fixed by M5.0.** #12 cap payoff (M5.1, interim), Lab (M5.2), L30+ reshape + #13 prestige (later) | M5.1+ / parked |
| E8 | **Quit point 1, ≈16:14** (≈10 min after L10): coop 999/1,000, "Full", only hint "Collection L4" | Player | #1–#5 | M5.0 |
| E9 | **Quit point 2, 16:19–16:21** (≈2 min flat money; Market Hand asleep, sales silently stopped) | Player; bug file (S2) | `fix/m41-patch1` (asleep banner, HUD rate) + #5b chip | Patch + M5.0 |
| E10 | **Quit point 3, 16:23–16:25:30** (≈2.5 min, nothing affordable, nothing to tap): "I'd have quit here (~21 min after L10)" | Player | #1–#5 (something to tap); small buys between Farm levels: **not in M5.0** (Lab, M5.2) | M5.0 (partial) |
| E11 | "★ Best buy" chip pushes Collection over Farm, slowing progress; ≈26% of L0–30 spend is on Collection that adds nothing once the Coop Hand is hired | Critic; Economy §1.2 #5 | **Partly in M5.0: #5c stopgap** removes the ★ from zero-gain rows. The pick is unchanged, so in the C2/C4 states (e.g. the L17 fixture) players see **no ★** instead of a wrong ★ (SG-3, SG-9 (b)). Full fix M5.1 Part A (owner PM Farm Upgrades; D-HOP-21, -25) | M5.0 (partial) / M5.1 |
| E12 | Manage is a chore every 9–14 min; missing it costs up to 100% of passive income | Critic | #5b makes it visible; **the chore is not lightened in M5.0** (D-HOP-13 (5)). M5.1 lighter refill (Auto-refill) | M5.1 |
| E13 | Decisions collapse to "buy what's affordable", then "wait"; Hens/Egg value MAX at L27 | Critic gap 2 | Partly #4 calls (when to fire); real trade-offs need breeds (#6), Order Board (#7), Lab (#10) | M5.1 / M5.2 |
| E14 | "Ready in ~N min" timers assume sales that aren't happening | Player | §4.2 live-income fix in `fix/m41-patch1` (steady ETA reads "—" while stalled) | Patch |
| E15 | A next goal further along than one upgrade | Player | **Not in M5.0** (album/Lab goals M5.1/M5.2) | M5.1+ |

**Gaps M5.0 does NOT fix (carried to the CEO):**
1. **L30+ horizon and prestige** (E7, Critic gap 3): parked L30+ reshape + #13 Show Day; interim #12 in M5.1.
2. **"★ Best buy" pushes Collection over Farm** (E11): owned by PM Farm Upgrades; the M5.0 stopgap #5c hides the wrong ★; the full fix is M5.1 and needs a CEO re-baseline amendment (§8 Q8, Q12).
3. **The Refill chore** (E12): visible in M5.0, lighter only in M5.1 (`workers/m5.1-lighter-refill-proposal.md`).
4. Also: small purchases between Farm levels and a longer-range next goal (E10, E15) wait for M5.1/M5.2.

**Baseline for PT-1…PT-7 (§10):** no telemetry exists, so these reads are the baseline (`product/decisions.md:509`). On RC1: PT-1 fails (no paying action at all after L10), PT-3 fails (0 golden eggs), PT-6 fails (Vadim's "nothing to do"; Player would quit at ≈21 min).
---

## 8. Open questions for the CEO / Vadim
**v0.1 Q1–Q6 are answered** (D-CEO-20261024-06; see §5.1): Q1 P95 ≤ 2.0 + worst ≤ 2.25 kept; Q2 no cap reset; Q3 M5.0 active layer first, Pause in if it fits; Q4 2–5 min golden egg; Q5 strategic breed slots; Q6 monetisation parked.

**v0.2 Q7–Q11, status in v0.3:**

| Q | Question (v0.2) | v0.3 status | Ruling / evidence |
|---|---|---|---|
| 7 | The +50% optimal budget is exceeded; accept, trim, or reserve headroom? | **RESOLVED for M5.0 (paper); confirmed at X1** | D-HOP-21: G1 is the binding gate; the overrun is accepted for M5.0 because G1 holds. Measured on seeds 1–200: +47 to +65%, G1 worst 1.936 (§7.1). D-HOP-21 tied acceptance to the harness-of-record re-measure; D-HOP-22/-24 moved that to the X1 merge gate, so acceptance is final only when X1 passes. M5.1: no headroom; each active ships with an offsetting trim; the stacked budget is decided once at M5.1 plan level (D-HOP-26 #4). Breeds propose `tc_streak_cap` 0.27, pending Economy |
| 8 | "★ Best buy" pushes Collection over Farm; owner and phase? | **RESOLVED** (one follow-up → Q12) | Owner PM Farm Upgrades (D-HOP-21). Strict BB-1, UC17 retired (D-HOP-25). M5.0: stopgap #5c (XS 0.4 dd, AC7-neutral, cut first). M5.1: full fix (Part A UI + bot, collect fix, re-baseline; Part B dropped) |
| 9 | SS-21 wording: (a) separate 9-column PR or (b) amend SS-21? | **RESOLVED: Option B** | D-HOP-23: two hard gates (flag off ≡ patch1 golden; flag on vs off: sim/economy traces byte-identical; telemetry/DOM differences outside gate 2); CSV clause = the 9 `tc_*` columns; default pattern for the other M5.0 flags. Applied in sales-stopped v1.3.8 |
| 10 | Economy re-measure date and the window definition | **RESOLVED (sequencing changed)** | The harness of record can't model M5.0 (economy §13.2). Paper: scratch re-run to the harness definition **done** (seeds 1–200, every window per A1/A2; §7.1). Build: harness of record = X1 CI merge gate, ±20% (D-HOP-22, -24). Window definition: overlapping 600 s windows starting every 300 s (A1, labelled approximation) |
| 11 | Vadim's go to start code | **OPEN** | D-CEO-20261024-04, -06. Everything in this plan is paper until then |

**New in v0.3:**

12. **CEO re-baseline amendment for the M5.1 Best buy full fix.** The full fix changes the bot as well as the UI, so it touches the L10 floor and the L0–30 play freeze; it needs a CEO amendment, not only a HoP ruling (`product/decisions.md:752`). The proposal is `product/farm/m5.1-bestbuy-rebaseline-proposal.md` **v0.2** (sha1 `63ef466d`): HoE ≈1.25 dd, one PR behind `m5.flags.bestBuyV2`; **awaiting the CEO**. **The M5.0 stopgap (#5c) doesn't need it** (bot unchanged). Owner: CEO. **OPEN (pending).**
13. **HoQA testability verdict:** **in: all 7 M5.0 specs TESTABLE.** 2 blockers, B-X1a/B-X1b, are in the economy §13.2a text; ruled by D-HOP-27; Economy/HoE are fixing them. Owner of the fix: Economy (numbers) and HoE (CI check, pause driver). **Fix in progress.**

---

## 9. Where this plan differs from the CEO's CCGS first pass
| Topic | CCGS | This plan (v0.3) | Why |
|---|---|---|---|
| Streak cap | 0.30 (CCGS §5 C, §8) | **0.28** in the M5.0 draft of record (8dc90e2b); live CSV still 0.40; M5.1 proposes 0.27 (D-HOP-26 #4) | Collection P1 trim; G1 on the harness definition: P95 ≤ 1.757, worst 1.936 (§7.1). Not live until the CSV PR |
| Tap verb | B: `k` = 0.5–2 s of income per tap; C: hen tap lays an egg; merge B + C | A1 = 0.03 × income per credited tap; Broody Hen separate | 0.5–2 s per tap at 1/s = +50–200% premium, over the cap. Egg-adding taps are ≈0 from F10 (demand cap) |
| `streak_max_taps_per_s` | "= 1 already exists" | Same (1, `economy.csv`) | Agrees |
| Pause/Resume | Listed as shipped (CCGS §1a, §4) | **Not built**; **in M5.0 as #4b**, last PR, own flag, first cut | No pause state in RC1 (`sim/workers.ts:14`); CEO Q3 |
| Mean band | "1.51–1.62× (inside the band)" | **Harness definition, seeds 1–200: P95 1.661–1.757, worst seed 1.815–1.936, median 1.487–1.661** (SCRATCH); mean OPEN | Economy §13.2a; harness of record at the X1 merge gate |
| Breeds scope | L (new system, migration) | M (5–7 dd *HoP est.*) with no merge/breeding (M5.1); coin hatches; album milestones + breed stall deferred | Hatches + slots + traits (D-HOP-26) |
| Abilities | P1 core, prompt cap open | M5.0, free; energy cost + charges M5.1 | rc2 charges not built |
| Package order | P1 → breeds → prestige | Same, plus patch first, M5.0.1 telemetry, Order Board M5.1, Lab/events M5.2 | Adds meso-loop work and the CEO's telemetry ruling |

---

## 10. Playtest acceptance criteria (experiential, measurable)
Baseline on RC1 (`5d9efa6`) from §7.2; the targets are unchanged from v0.1.

| ID | Criterion | RC1 baseline |
|---|---|---|
| PT-1 | At F10–F20 with 3 workers, an attentive player has an action whose payoff appears within 0.5 s at least once every 30 s (median over a 10-min session; telemetry: gap between credited actions) | **Fail**: no paying action after L10 (Critic; Player) |
| PT-2 | At F10, a 10-min session of optimal play earns between G2's floor and G1's cap relative to idle | Fail: ≈1.0× (tapping +0–8%, Critic) |
| PT-3 | At F ≥ 8 a golden egg appears ≥ 2 times in any 10-min visible session (95% of sessions) | **Fail**: 0 seen (Critic DOM scan; Player ≈41 min) |
| PT-4 | A never-tap player meets M4 AC7 (G0) | Pass (RC1 is the reference) |
| PT-5 (M5.1) | In 30 min from F10, best next purchase changes at least every 3 purchases; ≥ 2 breed loadouts within 10% income | Fail: "buy what's affordable" (Critic gap 2) |
| PT-6 | Vadim answers "yes" to "is there something meaningful to do at L10?" after 15 min from an F8 save | **Fail** (Vadim's report; Player would quit ≈21 min after L10) |
| PT-7 | Credited taps per foreground minute at F10+ with 3 workers ≥ 70% of the F3–F7 value [P] (`collection.md:215`) | OPEN: no telemetry baseline |

---

## 11. Dependencies, telemetry and build-readiness
- **Depends on:** Vadim's go (D-CEO-20261024-04, -06); the B-X1a/B-X1b fixes in economy §13.2a (§8 Q13, D-HOP-27); the post-Latest patch (asleep signal, #69 v2, m-RC1-1) merged **before** the M5.0 build (D-CEO-20261024-07); the one CSV PR on 8dc90e2b at build go (D-HOP-24); the X1 harness commit before any flag ships on (D-HOP-22, -24). The L30+ reshape and prestige stay parked.
- **Gaps:** no real-session telemetry until the M5.0 subset ships; Economy numbers are SCRATCH until X1; managed/unmanaged F22–24 (G5) and the G2 mean are not measured.

### 11.1 Telemetry: M5.0 subset (X4) vs M5.0.1 full migration
| | M5.0 subset (X4, D-HOP-07) | M5.0.1 full v0.6.2 (D-CEO-20261024-07) |
|---|---|---|
| What | sid/fgMs envelope, `session_end` payload, `schema.ts` allowlist, `isPinned`, `ability_blocked` coalescing; Pause events (TEL-4, TEL-14) only if Pause ships | Full telemetry-spec v0.6.2 names and events |
| Size | **2–2.5 dd** (inside F4, `engineering/m5.0-sizing.md` §10.1) | **6–7.5 dd + 1.5 dd QA** (HoE sizing §10) |
| Seat | Saves & Persistence (d3–d5) | 4th seat 95daf662 (on Vadim's go) |
| QA | `qa/m5/telemetry-review.md` v0.5.2: OK-with-conditions TEL-10, TEL-15, TEL-16 | Not reviewed yet |
| When | Ships with M5.0 | **Must land before any wide release** |
| Risk | PT-7 and PT-1 only partly measurable | Unbounded pinned-event growth ≈180 KB / 30 h if not fixed (HoE §10) |

### 11.2 Build-ready checklist (v0.3, as on disk 2026-10-24 ~17:50 CEST)
| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Every M5.0 item has a final spec with a DDR verdict, pinned by sha1 | **Done** | §0.1, §6.1 |
| 2 | HoE: every item BUILDABLE, sized, seats planned (sizing v1.2 + §15a) | **Done** | `engineering/m5.0-sizing.md` §11–§15a; §6.2 |
| 3 | CEO rulings on v0.1 (Q1–Q6), 4th seat, M5.0.1, patch | **Done** | D-CEO-20261024-06, -07 (§5.1) |
| 4 | HoQA test plan per item | **Done (drafts)** | `qa/m5/test-plan-*.md` (carried from v0.2) |
| 5 | Art and sound assets delivered and signed off | **Done** | carried from v0.2 (`art-ux/status.md`) |
| 6 | Pause lockout + Sweep at F20+ ruled | **Done** | D-HOP-16 (3), (4) |
| 7 | X8 stall case; ST-11/ST-12 | **Done** | carried from v0.2 |
| 8 | **Economy re-measure** (paper: scratch re-run to the harness definition, seeds 1–200, 6 cells; HoR mechanic-free run) | **Done** | §7.1; economy §13.2, §13.2a; D-HOP-22 |
| 9 | **CSV PR plan** signed; draft of record verified (8dc90e2b, 152 cols, 29 added, 2 value changes) | **Done** | D-HOP-24; §0.1 |
| 10 | **Art rects** 959×600, 960×600, 960×1280, 1024×1366 (GE-16, BH-k, GE-17, SS-G6) | **Done** | `art-ux/m5-layout-rects-960.md` v1.0: all PASS |
| 11 | **GE-17, BH-o, BH-p** | **Done** | golden-egg v1.3/v1.3.2, broody v1.3/v1.3.2 (rects v1.0; D-COL-01; D-HOP-26 #7 errata). GE-8/ST-5/AB-4/BH-b are CSV-PR items, covered by item 9 and checked at build |
| 12 | **SS-21** | **Done: Option B** | D-HOP-23; sales-stopped v1.3.8+ |
| 13 | **Spec contradictions** (incl. draft-CSV sha in specs) | **Done** | §11.3: every item resolved or marked; the five Collection/Workers specs cite 8dc90e2b |
| 14 | **Critic / Player L10+ reads** | **Done** | §7.2 (carried) |
| 15 | **HoE sizing** (incl. #5c stopgap 0.4 dd) | **Done** | sizing v1.2 §15, §15a; `product/decisions.md:753` |
| 16 | Best buy stopgap spec final and testable | **Done** | bb-stopgap v1.2.1 (HoQA: testable as written) |
| 17 | **HoQA consolidated testability verdict** on the final spec set | **Done: all 7 specs TESTABLE**; 2 blockers B-X1a/B-X1b in economy §13.2a text, ruled (D-HOP-27), Economy/HoE fixing | §8 Q13 |
| 18 | **Vadim's go for code** | **OPEN** | D-CEO-20261024-04, -06 |
| — | *Build precondition (not a paper item):* post-Latest patch (asleep signal, #69 v2, m-RC1-1) merged before the M5.0 build | **Pending** (M4.1 Latest shipped at tag `m4.1-5d9efa6`; patch SHA awaited from HoE) | D-CEO-20261024-07 |
| — | *M5.1 only (not an M5.0 blocker):* CEO re-baseline amendment for the full Best buy fix | **Pending**: proposal v0.2 (sha1 `63ef466d`, ≈1.25 dd, `m5.flags.bestBuyV2`) awaiting the CEO | §8 Q12 |

**Tally:** 17 done, 1 open (18, Vadim's go). Follow-up on 17: the B-X1a/B-X1b text fixes (Economy/HoE). The patch is a build precondition, tracked separately.

### 11.3 Contradictions between files (v0.2 list re-checked in v0.3; new ones added)
"Resolved" cites the source that resolves it. "Carried" = the file is outside the v0.3 source set and was not re-read; none of these change M5.0 scope.

| # | Contradiction (v0.2 text, shortened) | v0.3 status |
|---|---|---|
| 1 | v0.1 on disk `2e814e14…` ≠ accepted `08a1ec35…` | **Resolved (historical):** noted in D-HOP-21; v0.2 superseded both |
| 2 | D-HOP-16 and the Collection specs cite `edfd8902`; file was `45095351…` | **Resolved:** D-HOP-22 corrected to 45095351, then D-HOP-24 set **8dc90e2b** (verified, §0.1). All five Collection/Workers specs cite 8dc90e2b; older shas remain only as supersession history |
| 3 | Economy slice cites a missing §13.3; "0.16" vs 0.23 P95 headroom | **Resolved:** §13.3 (Column detail) now exists. 0.23 (2.00 − 1.77) was the 100-seed run (slice §10.2); on the harness definition the headroom is **0.165** (2.00 − 1.835, P95 of each seed's worst window) and 0.31 on the worst seed |
| 4 | Window gate used one 600 s window per checkpoint, seeds 0–99 | **Resolved, with a labelled approximation:** seeds 1–200, windows every 300 s (A1), timers reset (A2) (economy §13.2a). Exact every-second windows come at X1 |
| 5 | Collection specs edited without a version bump | **Resolved** (v0.2; now v1.3.1/v1.3.2) |
| 6 | Sales-stopped header budget, "10 UI columns", "verified on the patch", PM Workers pending | **Resolved:** v1.3.9 header reads 2.05–2.2 dd, PM Workers CONFIRMED, HoQA plan v0.4; the stale strings are gone. **Marked:** HoE sizing's 16:58 note still says 1.95–2.2 dd; the HoE final in spec §12.1 (2.05–2.2) wins |
| 7 | Pause size 2.25–2.75 vs HoE 2.5–3.0; abilities §12 totals older than HoE §15 | **Resolved:** pause v1.3.2+ = 2.5–3.0 dd; the PM-derived 13.75–16 subtotal dropped (abilities v1.3.1; `product/decisions.md:708`) |
| 8 | HoE §0 says Pause "not buildable yet" vs §11 BUILDABLE | **Resolved:** §0 now reads IN, BUILDABLE, 2.5–3.0 (HoE fixed 17:21) |
| 9 | testability-gaps cites X8 as "D-HOP-13" | **Carried** (file not re-read). X8 has no D-HOP id; §5.2 lists it as "X8 (no id)" |
| 10 | Sound spec says `m5-combo-tiers.md` doesn't exist | **Carried** (file not re-read) |
| 11 | `rc1-asleep-state-spec.md` header v1.0.6 vs v1.0.7 cited | **Carried** (file not re-read; patch scope) |
| 12 | Lighter refill flag `m5.flags.autorefill` | **Resolved:** v0.1.1 uses `m4.flags.autoRefill`; HoE accepts (`product/decisions.md:708`) |
| 13 | Patch gate time ~1 h vs ~2 h | **Carried** (files not re-read); this plan keeps "≈9–11 h + gates" |
| 14 | Critic/Player files dated 10-23, played 10-24 | **Carried** (cosmetic) |
| 15 | `telemetry-review.md` header v0.4 vs v0.5.x body | **Carried** (file not re-read) |
| 16 | **New:** D-HOP-21 logs plan v0.2 as sha256 `8e7321cf…5326`; the v0.2 file on disk before this edit was `750600a8…279f` | **Marked:** the v0.2 file was changed after D-HOP-21 logged its sha, or the logged sha came from an earlier save. v0.3 is built on the on-disk copy (`/workspace/m5plan-work/v0.2-ondisk.md`) |
| 17 | **New:** bb-stopgap header says 0.25 / 0.3 dd; HoE resized to 0.4 dd | **Marked:** header deliberately not bumped to keep sha1 11d98516 (`product/decisions.md:753`). This plan uses **0.4 dd** |
| 18 | **New:** D-HOP-26 ruled on breeds spec sha1 `07908e96`; the file has changed since (rev. 5, sha1 `c2753d83` in §0.1) | **Marked:** M5.1 only. Re-cite the sha1 at the next breeds ruling |
| 19 | **New:** economy §6 "Limits" says "CEO rule: worst-seed 10-min window ≤ 2.0×" vs CEO Q1 worst seed ≤ 2.25 | **Marked:** this plan follows D-CEO-20261024-06 Q1 (P95 ≤ 2.0, worst ≤ 2.25), as economy §6.1 and §13.2a also do |
| 20 | **New:** D-HOP-21 accepted the budget overrun "only if the measure:l30plus re-measure confirms G1"; D-HOP-22/-24 moved the harness-of-record check to the X1 merge gate | **Reconciled** in §8 Q7: accepted for paper on the harness-definition run; final at X1 |
| 21 | **New:** timestamps in `product/decisions.md` (17:50, 17:55) and the bb-stopgap header (17:50) are later than the box clock when read (~17:45) and the stopgap file mtime (17:33) | **Marked:** clock skew between writers; no content impact |
| 22 | **New:** the brief's "economy.md §13.1, §13.2a, §6.1" are in `product/research/v2-slices/economy.md`, not `product/economy.md` (M1 table doc, no §13) | **Marked:** cited by full path in this plan |
| 23 | **New:** the Best buy proposal v0.2 uses flag `m5.flags.bestBuyV2`; the convention elsewhere is `m4.flags.*` (cf. #12, `m4.flags.autoRefill`) | **Marked:** M5.1; HoE to confirm the namespace when the proposal is approved |
| 24 | **New:** D-HOP-26 (6) says the L28–30 fix stays with "#12"; #12 is the interim L30 cap payoff | **Resolved:** D-HOP-27 corrects it to the parked L30+ reshape (#6 updated) |

---

## 12. Design-doc review log
### v0.3 self-review (HoP, 2026-10-24 ~17:50 CEST)
- **Completeness:** spec of record with sha1s (§0.1), verified CSV draft, harness-definition gate results (§7.1), gate sequencing (§7), SS-21 Option B, #5c stopgap, Broody minimum slot, #6 re-ownership, checklist (§11.2), contradictions (§11.3), Q7–Q13 (§8).
- **Traceability:** every new number cites D-HOP-21…-26, D-COL-01, economy §6.1/§13.x, HoE sizing v1.2, the specs, or Art rects v1.0. Still OPEN: G2 mean, smallest streak cap, managed/unmanaged F22–24, #5c seat, Best buy full-fix size, PT-7 baseline.
- **Consistency:** 24 cross-file items in §11.3; 11 resolved or reconciled, 7 newly marked, 6 carried unread. None change M5.0 scope.
- **Value conflicts:** +50% budget vs measured +47–65%, accepted by D-HOP-21 because G1 holds (worst 1.936 ≤ 2.25); no M5.1 headroom without trims.
- **Verdict: BUILD-READY CANDIDATE.** HoQA TESTABLE (B-X1a/B-X1b text fixes in progress); code on Vadim's go, after the post-Latest patch.
### v0.2 self-review (HoP, 2026-10-24 ~17:15 CEST)
- **Completeness: 12/12** plus the v0.2 additions (changelog, audit, rulings index, evidence map, scope table, sizing plan, telemetry split, checklist).
- **Traceability:** each number cites a file. Values not in any file are marked OPEN (G2 mean, smallest streak cap, managed/unmanaged F22–24, re-measure date, best-buy owner, PT-7 baseline).
- **Consistency:** 15 cross-file contradictions listed (§11.3). None change the M5.0 scope; #2 (CSV sha) and #6 (sales-stopped header) must be fixed before build.
- **Value conflicts:** the +50% budget vs the measured +52–65% (§8 Q7); Vadim's "a lot more interaction" vs the 2× cap: resolved by measurement (P95 1.77).
- **Verdict: BUILD-READY CANDIDATE.** Not build-ready until checklist items 8–15 close (§11.2).

### v0.1 self-review (HoP, 2026-10-24, kept)
- First pass 9/12 → 12/12 after fixes: renumbered rulings R1–R16 (R3 = shared budget, R11 = best buy); features renamed `#1–#13`; per-feature fields added on #9, #11–#13; M5.0 build order added; cross-references fixed; G2 floor vs M4-A guardrail stated; 360 px used throughout.
- Verdict then: READY FOR CEO REVIEW as v0.1 DRAFT, not build-ready.
