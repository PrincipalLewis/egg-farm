# M5.0 stopgap: no ★ on zero-gain rows · quick design spec · v1.2.2 · 2026-10-29 CET

Owner: PM Farm Upgrades. Ruling: D-HOP-2026-10-24-25 (HoP). Paper only; no code until Vadim's go.
Source: `product/farm/bestbuy-scoring-diagnosis.md` §7 (stopgap) and §2 (terms). Code refs are at RC1 `5d9efa6`. The **build and test baseline is the M5.0 base after the post-M4.1 patch**, not 5d9efa6.
Size: XS, HoE confirmed: 0.25 dd for the mark change plus unit tests, 0.3 dd with the SG-8 event. It's its own small PR in M5.0, **cut before Pause if M5.0 slips**.
Reviews: HoE sizing (v1.0); HoQA testability (v1.1, `qa/m5/review-bb-stopgap.md`). v1.2 takes in all of HoQA's fixes, and HoQA rated it testable as written. v1.2.1 adds HoP's SG-9 pass rule (pre-ruled) and HoQA's note on the SG-10 scope. v1.2.2 (D-HOP-2026-10-29-08) adds SG-12, the read-only QA picker hook, because HoQA's UI QA couldn't verify SG-3 without picker history and `hintPick`; SG-3 and SG-5 now point to it. v1.2.1 is frozen at `frozen/bb-stopgap-spec.v1.2.1.md` (sha1 11d98516…).

## 1. Problem
The ★ Best buy chip and the strip ★ endorse Collection, a buy that adds **zero** modelled income (diagnosis C1/C2: all 5,000 bot Collection buys on seeds 1–200 had gain 0). The game should stop recommending something that does nothing for income.

## 2. Change (UI only)
- `bestBuyMark` (`ui/goal-label.ts:96`, the ONE source for the strip ★ and the UX-M4 row chip) returns `null` when the pick isn't a **meaningful row**. Today it returns `pick.key` whenever the pick is affordable. The signature becomes `bestBuyMark(pick, s, b)`. **All 4 call sites in `ui/app.ts`** are updated in the same PR.
- **The mark is computed once per render**, and that one value feeds the chip and the strip ★, so the chip key always equals the strip ★ key.
- **Meaningful row:** FARM, a worker hire or a Grader tier (these keys skip the gain check), **or** `optionGain(s, b, key).gain > 0`. Units are **$/s** (`incomePerSec` uses `priceDollars`, `econ/income.ts:20,64`), on the `assumeWorking: true` base. That's the same single-step gain `bestRoiDelta` uses (`goal-label.ts:36`). **ε = 0**, so the ★ and the '+<1%' suffix (shown for any gain > 0) can never disagree.
- **Zero-gain row:** any non-exempt row with gain ≤ 0, negatives included. The rule is generic, with no `key === 'coll'` hard-code. On M5.0 data only Collection is expected (its gain is exactly 0); see SG-9.
- **Unchanged:** `econ/best-buy.ts`, `ui/pick-hysteresis.ts`, the pick itself, the strip target and text, the row outline or highlight, the bot and every sim. The strip may still name Collection, without ★. The 0.9× hold, the L17 lock (C4) and the L28–29 tie (C5) are **not** fixed here; that's M5.1 Part A.

## 3. Acceptance criteria
**Fixtures:** F10/C10, F14/C10, F17/C14 and F22/C18 each get a committed state JSON (coins, F/H/V/C levels, workers and moods, Grader tier) plus picker history. Track levels are set through a `build:qa` save fixture or an `eggfarmQa.set.levels` setter covered by the leak check. The trace hook in `tests/bot-m4.ts` only observes, and SG-4 must pass with it present.

- **SG-1 No ★ on zero-gain rows.** For every state on the AC7 traces (seeds 1–200) and the 4 fixtures: if the pick is zero-gain, `bestBuyMark` is null, no `[data-best-buy]` chip is rendered, and the strip has no ★. Boundary unit cases (non-exempt key): gain 0 → null; −1e-6 → null; 1e-12 → key; 1e-9 → key. Exempt keys (FARM, worker, Grader) → key at any gain.
- **SG-2 Meaningful rows unchanged.** In the same states, when the pick is meaningful, `bestBuyMark`, the chip and the strip ★ are byte-identical to the baseline build.
- **SG-3 L17 fixture (documents the known limit).** Coins $37.3K, F17 H19 V18 C10, with Collection held as the pick for ≥ 2 s first: no ★ anywhere, and the strip still names Collection. Expected until M5.1 Part A. **Verified through the SG-12 hook:** `hint.key === 'COLL'`, `heldMs >= 2000`, `mark === null`, `suppressed === true`, and the last `history` entry has `key: 'COLL'` and `mark: null`.
- **SG-4 Determinism gate.** AC7 trace hashes are byte-identical on seeds 1–200 (CI assert).
- **SG-5 Scope guard.** The PR diff touches only `ui/goal-label.ts`, the 4 `bestBuyMark` call sites and the SG-8 emit and the SG-12 QA hook in `ui/app.ts` plus the one-word `qaPicker` addition to `scripts/check-release-build.mjs` (no other file; `ui/pick-hysteresis.ts` stays untouched), the M5 telemetry schema, and tests. The PR must list the tests that break by design and are updated: `m41-8-best-chip.test.ts:67` and `m41-8-f4-label.test.ts:219,229-230`.
- **SG-6 Accessibility.** On a suppressed pick: `#goalDesc` equals the starred sentence minus `"best buy, "`; the text "best buy" appears nowhere in `#goal`, `#goalDesc`, `#goalLive` or any row; and a change in suppression alone does not re-announce in the live region.
- **SG-7 Flag-off.** With the `m4.enabled: 0` balance from `tests/m4a-flag-off.test.ts`, goldens are unchanged and no SG-8 event fires. A flag change means a reload.
- **SG-8 Telemetry.** New event `best_buy_suppressed_zero_gain {key, farm, level}`, registered in the M5 schema. `farm` is `s.farmLevel`, and `level` is that row's current level. It's edge-triggered per **(key, level)**:
  - **Fires:** on the first suppressed render after load; on A→B→A (2 events); and when the held row levels up (e.g. a Collection level-up while it stays suppressed).
  - **Doesn't fire:** on affordability flips, the 1 Hz or 5 s ticks, hide/show, an offline return or Welcome-back, or while the sales-stopped chip fills the slot.
  - **Test:** a Collection pick held for 10 s with no level change emits exactly 1 event.
  - Doesn't gate merge.
- **SG-9 Suppression census (HoP pre-ruling, 2026-10-24).** The seeds 1–200 run publishes suppression counts per key. Under strict BB-1, **any key with genuine zero (≤ 0) $/s gain may be suppressed**, including demand-limited Hens or Egg value, and that alone doesn't block merge. It escalates to HoP only if:
  - **(a)** a key is suppressed while its +% suffix shows above 0. That's a fail, and it can't happen with ε = 0, so it signals a bug.
  - **(b)** a state shows no ★ at all while a positive-gain buy is affordable. The run reports the count and lists those states. Expected: non-zero, in the known C2/C4 states (the pick is held on a zero-gain row while Farm or a track is affordable, as in the SG-3 L17 fixture), which M5.1 Part A fixes. HoP reviews the list, but these states don't automatically block merge.
- **SG-10 Noise detector (traces only; the SG-1 unit boundary fixtures are exempt).** A trace check fails on any non-exempt row with 0 < |gain| ≤ 1e-6 $/s, so float noise can't silently flip the ★. HoQA measured the M5.0 margin at about 2000×.
- **SG-11 Layout and engines.** 3 engines at 360×640, 959×600, 960×600 and 1280×800, with no chip and no strip ★ on the suppressed fixtures and the layout unchanged otherwise. Include a case where the pick changes mid-render: the chip and the strip ★ still agree.
- **SG-12 QA picker hook (makes SG-3 verifiable).** QA and dev builds only, behind the existing `IOS_FLAG_ENABLED` gate: add `qaPicker()` to the object `mountApp()` returns, so it's read as `window.eggfarmUi.qaPicker()`. The release build must not contain it. `mountApp()` is in release too, so both the `qaPicker` key and the history recording go inside `if (IOS_FLAG_ENABLED)` and are dead-code-eliminated, and `qaPicker` is added to the debug-globals list in `scripts/check-release-build.mjs` (line 70 at `23d2b78`). It returns a fresh, JSON-serialisable object, exactly:
  ```ts
  {
    v: 1,                       // format version; bump on any field change
    t: number,                  // ms, the same clock app.ts passes to picker.tick
    m4: boolean,                // m4On(b)
    hint: Pick | null,          // hintPick: the strip/★ pick after the DualPicker Farm-row merge
    hintRaw: Pick | null,       // picker.hint.shown: the all-row pick before the merge
    highlight: Pick | null,     // rowPick: the Farm-tab row highlight
    mark: string | null,        // bestBuyMark(hintPick): the key that gets the ★, or null
    suppressed: boolean,        // hint !== null && mark === null (the stopgap state)
    heldMs: number,             // t minus the t of the last history entry whose key differs from hint.key; 0 if none
    evals: number, changes: number, // picker.hint.evals / picker.hint.changes
    history: { t: number, key: string | null, affordable: boolean | null, mark: string | null }[]
  }
  // Pick = { key: BuyKey, affordable: boolean, costCents: number, payback: number } (SharedPick, copied)
  ```
  `history` is a ring buffer of the last **32** entries, oldest first. app.ts appends one entry, right after `picker.tick` in the goal render, only when `hintPick?.key`, `hintPick?.affordable` or `bestBuyMark(hintPick)` differs from the previous frame. Load counts as a change, so the first render writes one entry. The buffer is reset on reload and isn't saved. Payback is a number in seconds, or `Infinity` for zero-gain rows; the hook serialises `Infinity` as the string `"Infinity"` so that `JSON.stringify` keeps it.
  **Pass:** (a) calling `qaPicker()` 1,000× between frames changes no game state, no DOM, no `picker.evals`, and fires no telemetry; (b) SG-4 AC7 hashes stay byte-identical with the hook present; (c) on the SG-3 fixture the fields read as SG-3 states; (d) a unit test pins the field names and types above, plus the 32-entry cap; (e) `npm run build` (release) has no `qaPicker` string, while `build:qa` does.

## 4. Edge cases
- Pick is meaningful but unaffordable: unchanged (no ★ today either).
- Gain ≤ 0 on a non-exempt row is zero-gain, including negatives. Any gain > 0 keeps ★, matching the suffix.
- After Farm L30, when only zero-gain rows remain: no ★ at all. That's acceptable; L30 content is #12 (M5.1).
- If M5.0 gives Collection real value (coins-per-tap or streak, Economy Q-E2), Collection becomes meaningful by the same rule, with no code change.
- L30+ data: if it ships, revisit the threshold as a relative ε (gain / base income) with M5.1 Part A.

## 5. Out of scope (M5.1, BB-1..13)
Removing zero-gain rows from ranking, hysteresis, the ∞-tie going to Farm, the dead-zone countdown, Part B, the UC17 retirement plus BB-13 (the fresh-save first ★), and Economy's re-run.
