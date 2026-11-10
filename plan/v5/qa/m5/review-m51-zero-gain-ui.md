# HoQA testability review: M5.1 zero-gain purchase UI v0.2 [QA-D-1025-ZG1]

2026-10-25 (Europe/Budapest, UTC+1). Requested by PM Collection for the HoP gate D-HOP-2026-10-25-08/09. Paper review only; no code was run against a build.

## Pins (verified with sha1sum, both MATCH)
| File | Expected | Live | Snapshot |
|---|---|---|---|
| `product/collection/m5.1-zero-gain-purchase-ui.md` v0.2 | e8c4e7064db2606d8ff7785444817108ce687b0e | MATCH | `/workspace/snap/zero-gain-ui-e8c4e706.md` |
| `product/collection/telemetry-spec.md` | 8d265a52ce28d3f5997f434fd4a2223f84d645b3 | MATCH | `/workspace/snap/telemetry-8d265a52.md` |

- Telemetry diff vs the f077899f snapshot: only the `upgrade.zero_gain` clause, the `zero_gain_confirm` row, the §3.1 allowlist entry, the "No other new events" line and a changelog section. Existing fields and the pinning rules are unchanged. Field presence (flag on only, collection/hens/eggValue only, absent with the flag off) and both enums (`upgrade_id` collection|hens|eggValue; `outcome` confirm|cancel) are fully listed. The spec's §10 matches.
- `product/economy.csv`: sha1 35672cfe… = sha256 c7bb783f… (the frozen lineage). Consistent.

## Code checks at 30b29d3 (game/ repo)
- Confirmed: `bestBuyMark` at `ui/goal-label.ts:96` (single-arg); `optionGain` at `econ/best-buy.ts:113` and `options()` at `:44`; `trackCoopCapacity` at `formulas.ts:130`, `coopCapacity(F)` at `:93`; `new DualPicker()` constructed with no args in `ui/app.ts` (~:418); `DualPicker(hl, all, sig)` already accepts scorers; `bestChip` at ~:502; `PickHysteresis.evaluate` returns null on empty rows; `keepable` needs the row in `rows`, so E17 behaves as described.
- `sim/events.ts:9`: the `upgrade` field is `'collection'|'farm'|'hens'|'eggValue'`, so `upgrade_id` = `upgrade.upgrade` works.
- **`bestBuyV2` doesn't exist** in `src/` or `data/` at 30b29d3, or on any local ref. Today, only the "current picker" half of every ★ AC can run.
- **The M5.0 stopgap** (`product/farm/bb-stopgap-spec.md` v1.2.1) changes `bestBuyMark` to `bestBuyMark(pick, s, b)` and suppresses ★ on income-only zero-gain picks (SG-1, SG-3, SG-8). This spec cites the single-arg 30b29d3 version and doesn't say whether the stopgap is in its base.
- **"AC5 labels" in the code** means the **M3-AC5 next-goal strip labels on the M4-off path**:
  - `ui/next-goal.ts:66`: "flag-off keeps the AC5 labels byte-identical";
  - `tests/m41-8-f4-label.test.ts:238`: "M4 off: AC5 labels unchanged";
  - `tests/m41-8-best-chip.test.ts:57, 205–207, 224`: "flag-off AC5 sentence";
  - `tests/next-goal.test.ts`.
  
  The M4-on labels (where `zeroGainUi` lives) are the M41-8 F3/F4 labels, pinned by `m41-8-f4-label.test.ts`, `m41-8-best-chip.test.ts` and `scripts/m41-8-f4-14a.mjs`. The real golden files are `engineering/golden/flagoff-golden.a01faea.test.ts` and `m4on-golden.90a9c84.test.ts`.

## Verdict: **NEEDS FIX**: 10 blocking (B) + 8 text (T)
The design is clear and the telemetry is complete. The blockers are undefined baselines, fixture contents, and a few oracles that can't be reached as written. ZG-AC14 doesn't need UI/VD's numbers to pass or fail: its binary criteria are enough (see F13). So UI/VD's measurements are a **named non-blocking dependency** once F13's wording lands.

## Fix list
**F1 (B) ZG-AC12/13/19, AC3, AC16: baseline build and stopgap interaction.** "The build without this change" has no SHA, and the stopgap's place in the base is unstated. With the stopgap on, an income-only ★ suppression still applies to a HENS 10/20/30 step with gain ≤ 0 (not ZG here). SG-3 ("strip still names Collection") and the SG-8 counts change once the flag is on.
*Wording:* "Baseline = the M5.1 kickoff base commit `<sha>` (named at kickoff by HoE), with `zeroGainUi` absent. If the M5.0 stopgap is in that base, `bestBuyMark(pick, s, b)` is the stopgap signature, and with the flag on: (a) SG-1 suppression still applies to a picked HENS milestone row with gain ≤ 0 (so ZG-AC3 reads 'gets ★ only if picked and meaningful'); (b) SG-3 and the SG-8 tests are pinned to `zeroGainUi` off; (c) SG-8 is expected to fire 0 times with the flag on, since no ZG row is ever picked."

**F2 (B) §9 preamble ("every ★ AC runs twice").** `m5.flags.bestBuyV2` exists in no build.
*Wording:* "The `bestBuyV2` on runs apply once `m5.flags.bestBuyV2` exists in the build under test. Until then they are recorded N/A, and the ★ ACs pass on the current picker alone. The on runs are re-run on the first build that has both flags."

**F3 (B) ZG-AC11/17, fixture list: the all-ZG fixture isn't guaranteed.** At L30 MAX the Coop Hand is hired. Under `bestBuyV2` (Q-E2), COLL's gain can be > 0 (E2), so "the L30 MAX state qualifies" may be false on the BBv2 run.
*Wording:* "All-ZG fixture: a committed state where `options(s, b)` returns only COLL **and** `optionGain(COLL).gain ≤ 0` under the `bestBuyV2` setting of the run. The test asserts both preconditions first and fails the fixture, not the AC, if they don't hold. If no such state exists with BBv2 on, ZG-AC17's BBv2 run uses a synthetic state (Coop Hand not hired) and says so."

**F4 (B) §9 fixtures: contents for F27–29, HENS 19→20 and L30 MAX.**
*Wording:* "Each fixture is a committed state JSON in the stopgap format (coins, F/H/V/C, workers and moods, Grader tier, picker history), on `product/economy.csv` sha256 c7bb783f with balance.json `m4.enabled` 1. Each states its preconditions, asserted in the test:
- **F27–29:** the first post-action state on seed 1, profile casual (AC7 trace, current picker) with 27 ≤ F ≤ 29, COLL offered and affordable and `optionGain(COLL).gain ≤ 0`, plus at least one affordable non-ZG row.
- **HENS 19→20:** H19, demand binding, `optionGain(HENS).gain ≤ 0` and Δcapacity > 0.
- **L30 MAX:** as in F3."

**F5 (B) ZG-AC1: the boundary seam and the comparator.** Δincome values like −1e-6 or 1e-12 can't be produced through `isZeroGain(s, b, key)` from game states. The comparator is unnamed (Q-ZG-E2).
*Wording:* "`isZeroGain` delegates to a pure exported `zeroGainVerdict(incBefore, incAfter, dCap)`. ZG-AC1 tests it on these pairs:
- (100, 100, 0) → true;
- (100, 100 − 1e-6, 0) → true;
- (100, 100 + 1e-12, 0) → false;
- (1e15, 1e15 + 0.125, 0) → false;
- (100, 100, 1) → false;
- (100, 101, 0) → false;
- a NaN input → throws (or true; HoE picks one and states it).

The comparator is `incAfter <= incBefore` on IEEE doubles unless HoE names another before kickoff (Q-ZG-E2). Either way, ZG-AC20 is the cross-check."

**F6 (B) ZG-AC4 vs E11: conflicting Buy oracle.** AC4 requires a full-opacity, enabled Buy on every ZG row. E11 says an unaffordable ZG row has a dimmed Buy and `Need $X more`. Also, "none of these present" on non-ZG rows can't hold for full opacity, enabled or no aria-label.
*Wording:* "Given an **affordable** ZG row: Buy has no `.affordable`, opacity 1, and is enabled. Given an **unaffordable** ZG row: chip and muted effect line, plus the existing dimmed Buy and `Need $X more` (E11). Given a non-ZG row: no `data-zero-gain`, no chip, no `aria-describedby` to the ZG node, and `.affordable` follows coins as today." Also name the DOM hooks (chip class, describedby node id) so the selectors are stable.

**F7 (B) ZG-AC16 SG-3 clause and E17.** With the flag on, Collection is ZG at load in the SG-3 L17 state. It can never be "held first", so the clause passes trivially. E17 (a held ★ row turning ZG) has no AC.
*Wording:* "(a) SG-3 L17 at load: the first evaluation's hint is a non-ZG key, equal to the stock scorer's pick over the non-ZG rows. (b) E17, unit: a `DualPicker` built with the filtered scorers and an injected predicate holds key K ≥ 2 s; flip the predicate to ZG for K; the next `tick` returns the best non-ZG row or null, with no 2 s hold."

**F8 (B) Missing case: every affordable row is ZG, and an unaffordable non-ZG row is offered.** The picker falls back to `rows` and picks the unaffordable row, and `bestBuyMark` is null. No AC or edge case covers what the strip and hint show.
*Wording:* "E18 / ZG-AC17b: if every affordable offered row is ZG and ≥ 1 unaffordable non-ZG row is offered, the hint = the best unaffordable non-ZG row, `bestBuyMark` = null, no `[data-best-buy]`, and the strip names that row without ★ (its existing unaffordable status)."

**F9 (B) ZG-AC8: the flip fixture.** E1 says COLL had gain 0 on 5,000/5,000 current-picker buys, so a 0 → > 0 flip may not exist with BBv2 off.
*Wording:* "Up-flip: from a state with COLL ZG, hire Coop Hand (W2) under `bestBuyV2` on → COLL not ZG on the next render. Down-flip: buy COLL until `optionGain(COLL).gain ≤ 0` → ZG on the next render. If no up-flip exists with BBv2 off, that direction is BBv2-only (see F2). A HENS demand/production flip may substitute; name it."

**F10 (B) ZG-AC19: the baseline is undefined (Q-ZG-Q1).** See the answer below.
*Wording:* "With `zeroGainUi` 0 and `m4.enabled` 1: `tests/m41-8-f4-label.test.ts`, `tests/m41-8-best-chip.test.ts`, `tests/m4a-max-label.test.ts`, `tests/d5-goal-pill.test.ts` and `scripts/m41-8-f4-14a.mjs` (3 engines) pass unmodified, and the `#goal` / `#goalDesc` / row-chip text and accessible names on every ZG fixture are byte-identical to the baseline build (F1). With `m4.enabled` 0: the M3-AC5 labels (`tests/next-goal.test.ts`, the 'M4 off: AC5 labels unchanged' case) and `engineering/golden/flagoff-golden.a01faea.test.ts` pass unmodified."

**F11 (T) ZG-AC5/16/18/20: the trace harness.**
*Wording:* "Traces: the AC7 harness (`tests/bot-m4.ts`, observe-only hook) at the baseline, seeds 1–200, profiles <list>, every post-action state. UI checks render each state in jsdom with a fresh `DualPicker`, `nowMs` = trace sim ms. Artifact: `qa/m5/zg-parity-<sha7>.json` with per-key ZG counts and any disagreements (pass = 0 disagreements)."

**F12 (T) ZG-AC10 and telemetry: confirm emission and definitions.**
*Wording:* "`Buy anyway` → exactly one `zero_gain_confirm{outcome:'confirm'}`, then (if affordable) the `upgrade` event with `zero_gain: true`. Cancel, Esc, an outside tap, or opening another row's strip → exactly one `{outcome:'cancel'}`. `Buy anyway` with coins < cost → `confirm` and no `upgrade`. 'Double-tap' = two clicks on Buy within 300 ms. 'Outside tap' = a pointerdown outside the strip and the row."

**F13 (T) ZG-AC14: pass criteria without UI/VD.**
*Wording:* "Pass/fail now: chip and effect contrast ≥ 4.5:1 computed on the actual background; the chip's bounding box doesn't intersect any other element; chip `scrollWidth ≤ clientWidth` with no `text-overflow: ellipsis`; the chip's top ≥ the effect line's top; `Limited by coop` on its own line box; axe-core 4.x (wcag2a/aa) 0 violations on the Upgrades panel. Tested on the F27–29 fixture (ZG COLL row plus `Limited by coop`) and L30 MAX. Live region: for the same action, `#goalLive` and every aria-live node get identical text with the flag on and off. UI/VD's pixel tolerances add checks; they don't replace these." Once this wording is in, UI/VD's measurements are a non-blocking dependency.

**F14 (T) ZG-AC12: enumerate it.**
*Wording:* "Suites: `engineering/golden/*.test.ts`, `tests/m41-8-*.test.ts`, `tests/m4a-*.test.ts` and the `m41-8-shots` DOM checks, against the F1 baseline. Combinations: (`zeroGainUi` 0, `m4` 1), (`zeroGainUi` 1, `m4` 0) and (0, 0). Save JSON after the same actions is byte-identical with the flag on and off (no save field, E15). The flag is read once at boot, so there's no runtime toggle to test."

**F15 (T) ZG-AC9/15: sim event vs telemetry record.**
*Wording:* "The sim `upgrade` event is deep-equal to the flag-off build's. The telemetry record equals the flag-off record plus `zero_gain`. ZG-AC15 runs one buy each of COLL, HENS and VALUE in a ZG fixture and in a non-ZG fixture, plus one FARM buy, then validates the export with T-AC9."

**F16 (T) ZG-AC7: property-test inputs.**
*Wording:* "Base states: every fixture plus every 50th trace state on seeds 1–20. Run 20 perturbations each, with a fixed property seed."

**F17 (T) telemetry-spec `upgrade` row (record).** The existing field still reads `upgrade (collection|farm)`, but code has `'collection'|'farm'|'hens'|'eggValue'` (`sim/events.ts:9`), and `zero_gain_confirm.upgrade_id` refers to it.
*Wording:* "existing `upgrade` (collection|farm|hens|eggValue)".

**F18 (T) ZG-AC2 and AC3: name the inputs and the flag-on oracle.** AC2 should name the Farm gain ≤ 0 state (any trace state with `optionGain(FARM).gain ≤ 0`, first one on seed 1). AC3 flag on, current picker: "the HENS row is in the filtered scorer's rows with the same `payback` as the stock scorer's". This replaces an oracle that can't be compared to flag-off once other rows are filtered.

## Answers to PM Collection
- **Q-ZG-Q1 ("AC5 labels" in ZG-AC19):** **No, not as read.** In this code base "AC5 labels" means the M3-AC5 next-goal strip labels on the **M4-off** path (`next-goal.ts:66`, `m41-8-f4-label.test.ts:238`, `m41-8-best-chip.test.ts:57/205–207/224`, `next-goal.test.ts`). HoE's phrase likely borrowed that "flag-off byte-identical" idiom. `zeroGainUi` needs M4 on, so the baseline that actually matters is the M41-8 F3/F4 suites (`m41-8-f4-label`, `m41-8-best-chip`) **plus** the M3-AC5 path for `m4.enabled` 0. These are unit-test expectations, not golden files; the goldens are `engineering/golden/flagoff-golden.a01faea` and `m4on-golden.90a9c84`. The spec must list them explicitly (F10).
- **Q2 (F27–29 and all-ZG fixtures at kickoff):** **Yes, QA owns and commits both at kickoff.** What's missing first: the selection rule (seed, profile, picker setting, F range, preconditions), the CSV/balance pin (c7bb783f, `m4.enabled` 1), the JSON format (stopgap format), and the all-ZG validity under BBv2 (F3, F4). Once those are in the text, QA commits the JSONs with precondition asserts.

## Non-blocking dependencies (named)
- UI/VD wireframes and measurements (ZG-AC14 tolerances), once F13 lands.
- HoE: Q-ZG-E2 comparator name (F5 gives a default); Q-ZG-E3 logging of the 02:55 confirmation; kickoff base SHA (F1).
- `m5.flags.bestBuyV2` landing, for the BBv2 half of the ★ ACs (F2).

---

## Re-check 1: v0.3 [QA-D-1025-ZG2] (2026-10-25 03:20 CET, Europe/Budapest)

### Pins
| File | Expected | Live | Snapshot |
|---|---|---|---|
| Spec v0.3 | b367918c6365e9eef7fb6f3cb41987194f7949bc | MATCH | `/workspace/snap/zero-gain-ui-b367918c.md` |
| `telemetry-spec.md` | 0db37c91… | MATCH (0db37c9157aff1b51822c75047c52919f9930a4f) | `/workspace/snap/telemetry-0db37c91.md` |
| `art-ux/m5.1-zero-gain-ui.md` | 3bfec396 | MATCH at 03:17, then **moved to v1.1 `7f015aececabd134da462ba209055649da31fd68` at 03:19:28**, after the spec (03:15:58) | `zg-art-ui-3bfec396.md`, `zg-art-ui-7f015aec.md` |

- **Telemetry diff vs 8d265a52:** the `upgrade` enum now reads collection|farm|hens|eggValue (F17), plus an enum-fix changelog section. Nothing else changed.

### F1–F18 (spec §14 map, checked against the actual text)
All 18 are handled. F1 is handled conditionally (base SHA pending), F2/F3 for BBv2 are N/A until the flag exists, and F11 needs one follow-up (T1).

| # | Where | Result |
|---|---|---|
| F1 | §5.6 "Baseline and stopgap" (a)–(c), ZG-AC3 | OK; base SHA is a named dependency (below) |
| F2 | §5.6 "BBv2 runs", §10 run conditions | OK |
| F3 | §9 FX-L30 preconditions per run | OK; verified on the current picker (below) |
| F4 | §9 format, CSV pin, selection rules | OK except FX-F27's "casual" source (T1) |
| F5 | §5.2 `zeroGainVerdict`, ZG-AC1 pairs, NaN/∞ | OK; the pairs are representable doubles (100 + 1e-12, 1e15 + 0.125 = 1 ulp) |
| F6 | ZG-AC4 split (affordable / unaffordable / non-ZG), DOM hooks | OK; matches Art 03:10 and E11 |
| F7 | ZG-AC16 (a)/(b) | OK |
| F8 | §5.6, E18, FX-L30u, ZG-AC17b | OK; verified |
| F9 | FX-FLIP, ZG-AC8 | OK; verified |
| F10 | ZG-AC19 lists | OK; paths exist at 30b29d3 |
| F11 | §10 traces | Profiles not reproducible from the repo (T1) |
| F12 | ZG-AC10, §11 | OK against UI doc v1; v1.1 drift (T2) |
| F13 | ZG-AC14 | OK |
| F14 | ZG-AC12 | OK; add `aria-controls` (T2) |
| F15 | ZG-AC9 / ZG-AC15 | OK |
| F16 | ZG-AC7 | OK |
| F17 | telemetry-spec `upgrade` row | OK; the row's "v0.2 §5.2" cite is stale (T5) |
| F18 | ZG-AC2 (FX-FARM0, W1 in FX-FLIP), ZG-AC3 payback oracle | OK |

### New items
- **ZG-AC17b / E18 (FX-L30u):** checked against the code; see the fixtures table below.
- **ZG-AC21 (nav dot):** `canUp` at `app.ts:573` and the `[data-nav=upgrades] .badge` selector (`app.ts:94`) exist, and the asleep-count precedence is at `:576-578`. The four cases are objective. E19 is worded too broadly; see T4.

### Fixtures verified in code
- **Method:** my own vitest probe in a throwaway worktree of `game` at 30b29d3, current picker, `m4.enabled` 1. Probe kept at `qa/m5/scratch/zg-probe-30b29d3.test.ts`; worktree removed.
- **Data:** the bundled balance is synced from `data/economy.csv` b48be8a4, which is identical to c7bb783f on the 123 kept columns (D-HOP-25/33). I spot-checked the CSV cells: col 3 L27 = 140, col 6 L30 = 31.0, col 30 = 2.

| Fixture | Probe result | Verdict |
|---|---|---|
| **FX-L30** F30 H30 V30 C27, 4 workers Working, graderTier 5 | `options` = [COLL] only, gain 0 (C28 also 0). Stock picker: hint COLL (★ today). Filtered picker: both picks null | **All-ZG on the current picker: CONFIRMED** |
| **FX-FLIP** F4 H5 V0 C0, no workers | Before: COLL gain 1, HENS 0, W1 −0.0167 (offered). After C1: COLL 0, HENS 0.14251. Costs: C1 16 < Farm 332 | **Flips both ways: CONFIRMED** (COLL down, HENS up). ZG-AC21 and ZG-AC2 inputs hold |
| **FX-H20** F17 H19 V0 C0, no workers | HENS gain 0; `trackCoopCapacity` 1125 → 1350 (+225); COLL gain 5 > 0 (collect binds) | **CONFIRMED, collect-bound** |
| **FX-L30u** F29 H30 V30 C10, 4 workers, graderTier 5 | `options` = [FARM gain −0.0125 (exempt), COLL gain 0]. Costs: COLL $1,099, FARM $323,719. Filtered picker at coins $1,099 / $1,099.01 / $323,718.99: hint = highlight = FARM, unaffordable; `bestBuyMark` null | **CONFIRMED** |
| **FX-FARM0** F0 H0 V0 C0 | FARM gain 0 | CONFIRMED |

### HoE items: QA decision
- **Q-ZG-E4 (comparator precision): CLOSED, not blocking.** The spec defines it fully: unrounded $/s, `after <= before`, no ε, dev assert finite and |x| ≤ 2^53. HoE `engineering/decisions.md` 03:19 confirms exactly that and corrects 03:02. The spec should cite 03:19 (T3).
- **Q-ZG-E5 (base SHA): named non-blocking dependency.** HoE 03:19 says the base will be main HEAD after M5.0 merges, which **includes the bb-stopgap**, and HoE pins that SHA in `engineering/decisions.md` at M5.1 kickoff. The spec states that tests pin the kickoff SHA. Since the stopgap will be in the base, the §5.6 (a)–(c) clauses become the expected case (T3). No-regression runs (ZG-AC12/13/19) can't start until the SHA is pinned; that's tracked at kickoff.

### Answers to PMC's questions
- **Q-ZG-Q2 (collect binding for HENS 19→20): ACCEPTED.** F17 H19 V0 C0, no workers, gives HENS gain 0 and Δcap +225, with COLL gain 5 (collect binds). I didn't re-run PMC's 390-state grid, but this reference state is verified. Condition (T6): FX-H20's asserted preconditions add "collect-bound: `optionGain(COLL).gain > 0`", and ZG-AC3 says "collect-bound".
- **Q-ZG-Q3 (where "casual" comes from):**
  - The optimal / seller15 / casual set exists **only in Econ's scratch harness** `product/farm/scratch/f27/h/m5s.ts` (sha1 2d4c01a3; `m5sx.ts` 2df58da7 extends it). It is selected via `PROFS`:
    - `optimal` {tap 3/s, checkBase 5 s, catchP 1};
    - `seller15` {tap 'ac7', 15, 0.75};
    - `casual` {tap 0.5/s, checkBase 30 s, catchP 0.6}.
  
    It drives the real sim from an **a05bc74 src snapshot**, using the `pickM4All` bot from `tests2/bot-m4.ts` (= `tests/bot-m4.ts` + a `__BBFIX` hook), with M5.0 mechanics layered on in scratch. It is not in the game repo.
  - The committed `tests/bot-m4.ts` has only `seller15` / `cheapest`.
  - `tests/pacing-acw1.test.ts`'s "AC-W1 casual" is a different model: Poisson arrivals, demand ×0.75, seller15 bot, sell every 20 s.
  - **QA position (T1):**
    - F11 traces use the committed AC7 harness (`tests/bot-m4.ts`) at the kickoff base with its committed models (seller15, cheapest);
    - FX-F27 is selected from **seller15 seed 1**;
    - if HoP wants the f27 profiles, Econ ports `PROFS` optimal/casual into a committed test-only module at kickoff (cite it by sha1).
    
    ZG is a pure function of levels, workers and balance, so the profile only affects which states are visited, not the verdicts.
- **Q-ZG-P2 (no all-ZG L30 state under BBv2):** **N/A with a recorded reason.**
  - When the flag lands, QA first tries a substitute all-ZG state under BBv2: any state where `options` = only non-exempt keys, all ZG. QA commits it if one exists, or records why none does.
  - It is decided then, not now.
  - It's likely moot: at FX-L30, Q-E2 collect = 140/2 = 70 eggs/s > production 31, so COLL gain should stay 0 and FX-L30 should still qualify. That's asserted at run time.
  - QA agrees "Coop Hand not hired" can't work (W2 offered, exempt). My F3 fallback is withdrawn.

### Verdict: **TESTABLE with text fixes** (6, no re-check needed beyond a spot-check)
- **T1 (§9 FX-F27, §10 traces):** "seed 1, profile casual" → "seed 1, profile seller15, committed AC7 harness `tests/bot-m4.ts` at the kickoff base". Profiles: "seller15, cheapest (committed); optimal/casual only if ported to a committed module (sha1 cited)". Close Q-ZG-Q3.
- **T2 (UI doc pin, ZG-AC10/12):** UI doc of record → v1.1 `7f015aec` once HoAUX signs v1.1 (§5/§8/UI-ZG-11/13–16 re-check pending). Align ZG-AC10 with v1.1:
  - the strip is rendered once after the row and toggled with `[hidden]` (not inserted/removed). With the default tunable, no `.zg-confirm` in the DOM and Buy has no `aria-expanded` / `aria-controls`;
  - Buy gets `aria-controls="zgc-<key>"`;
  - `Buy anyway` / `Cancel` ignore activation for 350 ms after opening, and focus uses `preventScroll`. Re-state the double-tap case as "a second Buy activation within 350 ms closes the strip; never buys";
  - the event order for a re-tap close is `[open, close:buy-retap]` → one `cancel`.
  
  ZG-AC12 flag-off: add "no `aria-controls` on Buy". Drop the "A3 text update pending" and "header still v0.1 DRAFT" notes; both are stale.
- **T3 (§5.2, §5.6, §12):** cite HoE 03:19. Q-ZG-E4 closed as written. Q-ZG-E5: base = main HEAD after M5.0 merges, includes the stopgap, pinned by HoE at kickoff; tests pin it. State that §5.6 (a)–(c) are the expected case.
- **T4 (E19 / §1 / G2):** the dot is hidden whenever (COLL is ZG or unaffordable) and Farm is unaffordable. Hens, Egg value and workers don't feed it. "No dot when every affordable row is ZG" should read "ZG rows never light the dot; Hens/Egg value/workers don't feed it (unchanged)", since FX-FLIP-after has an affordable non-ZG Hens row and still no dot.
- **T5 (telemetry-spec `upgrade` row, record):** "per … v0.2 §5.2" → "v0.3 §5.2".
- **T6 (§9 FX-H20, ZG-AC3):** add the precondition "collect-bound: `optionGain(COLL).gain > 0`", and say "collect-bound" in ZG-AC3.

### Named non-blocking dependencies
- HoE: kickoff base SHA (Q-ZG-E5), at kickoff.
- HoAUX: v1.1 sign-off of the UI doc (T2).
- BBv2 flag landing: the BBv2 runs, Q-ZG-P2.
- Econ: the profile port, only if wanted (T1).
- QA: commits the fixture JSONs at kickoff (values verified above).

---

## Spot-check: v0.3.1 [QA-D-1025-ZG3] (2026-10-25 03:30 CET, Europe/Budapest)

### Pins
| File | Hash | Snapshot |
|---|---|---|
| Spec v0.3.1 | 7d5d4f0eaad7cca8d5d0d62706f7d30acbcb910e **MATCH** | `/workspace/snap/zero-gain-ui-7d5d4f0e.md` |
| `telemetry-spec.md` | 37472b7f80b294a0d183f51a2a5075ce7a33c1c7 **MATCH** | `/workspace/snap/telemetry-37472b7f.md` |
| UI doc of record v1.1 | 7f015aececabd134da462ba209055649da31fd68; QA snapshot taken at 03:19 hashes to it | `zg-art-ui-7f015aec.md` |
| UI doc live v1.2 | 05258b1d667dc0d0b6be2b4c9bc0b87093c91c5d | `zg-art-ui-05258b1d.md` |

- **Telemetry diff vs 0db37c91:** only the `upgrade` row cite (v0.2 → v0.3.1 §5.2) and a record-only changelog. T5 is OK.
- **Spec diff vs b367918c:** only the claimed items:
  - header and status, sources;
  - the §5.2 comparator cite;
  - §5.6 baseline, BBv2 and FX-L30 text;
  - the §5.7 dot wording;
  - the §6 strip/guard text;
  - E19;
  - the §8 `canUp` row;
  - §9 FX-F27, FX-H20 and FX-L30;
  - §10 traces;
  - the ZG-AC3/7/10/12/17/21 text;
  - §12, §14 and §15.
- **No threshold, number or AC id changed.** 350 ms is the signed UI value; v0.3's 300 ms double-tap is replaced by it, per T2.

### T1–T6
- **T1 OK.**
  - FX-F27 and ZG-AC7 use `tests/bot-m4.ts` seller15, seed 1, at the kickoff base. The §10 traces use seller15 + cheapest.
  - The `m5x-casual` second run on `tests/bot-m5.ts` is required only after the port and Econ parity, with no numbers before parity.
  - Cites: `engineering/decisions.md` 03:21 exists (L165: HoE accepts the port, Features 95daf662, ~0.5 dd, parity against Econ F27–29 at the handed-over sha, D-HOP-41 tick order). Q-ZG-H3 is open to HoP. If HoP declines, the seller15 runs stand alone. That's consistent with QA's position.
- **T2 OK.**
  - UI doc pinned to v1.1 `7f015aec`. `art-ux/decisions.md` L410 (03:26 HoAUX "ZG UI v1.1 SIGNED", same sha, B1/B2 rulings) exists.
  - ZG-AC10 matches the list:
    - rendered once and toggled with `[hidden]`;
    - `aria-controls="zgc-<key>"`, and `aria-expanded` iff not hidden;
    - `preventScroll` with Δ scrollTop 0 for 350 ms, then `scrollIntoView`;
    - a 350 ms activation guard for pointer, Enter and Space;
    - a second Buy activation within 350 ms closes the strip and never buys;
    - `[open, close:buy-retap]` gives one `cancel`;
    - default: no `.zg-confirm` in the DOM and no `aria-expanded` / `aria-controls`.
  - ZG-AC12 adds "no `aria-controls`".
- **T3 OK.** HoE 03:19 is cited. E4 is closed. The base is M5.0-merged main, includes the stopgap, and is pinned at kickoff; tests pin it. §5.6 (a)–(c) are now the expected case, and ZG-AC3 reads "picked and meaningful".
- **T4 OK** (§5.7, E19).
- **T5 OK.**
- **T6 OK.** The FX-H20 preconditions include "collect-bound: `optionGain(COLL).gain > 0`", and ZG-AC3 says it.

### UI doc v1.2 vs v1.1 (word-diff)
- v1.2 isn't new behaviour, but it isn't purely wording either. It:
  - records the B1/B2 rulings (signed 03:26);
  - writes B1 (guard covers pointer, Enter and Space) into UI-ZG-16;
  - adds a keyboard-guard proof table;
  - opens a new **Q-ZG-C1**: held-Enter OS auto-repeat after 350 ms isn't proven in Playwright. Device QA should check it; HoE may add `e.repeat` suppression.
- No re-render; the manifest is unchanged.
- Pinning the signed v1.1 is fine: ZG-AC10 already encodes B1 from the 03:26 signed ruling. The spec's line "v1.2 records only, no change needed" misses Q-ZG-C1 (R1).

### ZG-AC17 BBv2 run (PMFU 03:17)
- **Source:** relayed in `product/collection/scratch/zg-pending-answers.md` L55–59. I found no PMFU decisions-file entry.
- **Basis:** the scratch `product/farm/scratch/f27/h/p30probe.ts` (seeds 1–2), plus `bestbuy-diag/seeds.ts` MODE=a, a pick-time `__BBFIX` hook.
- **`m5.flags.bestBuyV2` still exists in no build.** So "real run" can only mean "not N/A once the flag exists".
- **The spec wording is correctly conditional:**
  - ZG-AC17 says "a real run in the same state, **once `m5.flags.bestBuyV2` exists** … rows and gains identical (**asserted**)";
  - §5.6 sits under "BBv2 runs, conditional on BBv2 landing";
  - §10 still says BBv2 runs are N/A until the flag exists.
- **Testable.**
- **Record note (R2):** MODE=a models Part A only, not Q-E2's collect change. So "identical gains" is PMFU's scratch claim for Part A. The run-time precondition assert covers it, and at FX-L30 Q-E2 collect 70 > production 31 still gives gain 0.

### Breeds
- FX-L30 is pinned breeds OFF (`m4.flags.breeds` 0).
- The breeds-on variant in ZG-AC17 is defined: flock incomplete, incubator idle.
  - BBv2 run: "Hatch · $X" if coins ≥ cost, else "Hatch · in Xs", never ★, hint or highlight.
  - Current picker with the stopgap: strip target unchanged.
  - ZG mute unchanged.
- This matches BR-AC23b verbatim (breeds rev. 3.8.5 `5dde4b62`, sha verified, L886). It needs BB-5/BBv2 for the Hatch text, so that branch is conditional on BBv2 too.
- QA sets both coin cases (≥ / < hatch cost) when committing the fixture. That's fine.
- **Record note (R3):** ZG-AC11's "(BR-BB4 with breeds on)" should point at the ZG-AC17 breeds-on variant, since FX-L30 is pinned breeds off.

### Verdict: **TESTABLE**
- No fixes needed.
- **Record-only notes**, for the next revision, no re-check:
  - R1: list Q-ZG-C1 (held-Enter auto-repeat, device QA / HoE `e.repeat`) under ZG-AC10's open items;
  - R2: label "identical gains under BBv2" as PMFU's scratch claim (MODE=a, Part A only), asserted at run time;
  - R3: the ZG-AC11 cross-reference.
- PMC may send it to HoP.
- **Named non-blocking dependencies** (unchanged):
  - HoE kickoff base SHA;
  - the `bestBuyV2` flag;
  - the `tests/bot-m5.ts` port and parity, plus Q-ZG-H3 (HoP);
  - QA fixture JSONs at kickoff.
