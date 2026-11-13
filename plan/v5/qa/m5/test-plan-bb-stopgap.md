# M5.0 QA test plan: bb-stopgap "no ★ on zero-gain rows"
**v0.1 DRAFT · 2026-10-24 17:55 CEST (UTC+2) · Head of QA · paper only (build hold D-CEO-20261024-06; no repo, build or branch touched)**
**Spec under test:** `product/farm/bb-stopgap-spec.md` **v1.2.1**, sha1 `11d98516a6f2e8b89dd0fca1b748c3c995b8dc4a` (QA `sha1sum` matches; supersedes v1.2 c02615af…, v1.1 db0f5f04…, v1.0 2b6abda7…). Ruling D-HOP-2026-10-24-25 (strict BB-1, UI-only, AC7 hashes identical). HoE size XS 0.4 dd (17:55 note; header not bumped). Review history: `qa/m5/review-bb-stopgap.md` (v1.1, G1–G9 all taken into v1.2/v1.2.1). ACs **SG-1…SG-11**.
**Testable now?** **Yes, as written.** No open gaps. Two QA readings recorded in §4 (SG-7 scope, SG-9(b) reporting format); neither needs a spec change.

## 0. Baseline, lanes, severity
- **Baseline SHA ("baseline build", SG-2/SG-4/SG-7):** the M5.0 base **after the post-M4.1 patch1** lands on main (spec header; review G9), **not** `5d9efa6`. QA records the base SHA and its AC7 hash set before the PR is tested.
- **Lanes:** **UI QA** owns SG-1 (DOM part), SG-2 (DOM), SG-3, SG-6, SG-11. **Saves QA** owns SG-1/SG-2 trace runs, SG-4, SG-7, SG-9, SG-10. **Head of QA** reviews SG-5 diff scope. SG-8 telemetry: UI QA (non-gating).
- **Severity:** Blocker = any ★/chip on a zero-gain pick (SG-1), any change to a meaningful pick's mark (SG-2), any AC7 hash diff (SG-4), any SG-9(a) case, any SG-10 hit. Major = SG-6 a11y text wrong, SG-11 layout shift, chip/strip ★ disagree. Minor = SG-8 event count/fields (non-gating).
- **Merge gates (hard):** SG-1, SG-2, SG-4, SG-5, SG-7, SG-9(a), SG-10. **Reported, not gating:** SG-8 (spec), SG-9(b) list (HoP reviews; spec v1.2.1 pre-ruling).

## 1. Definitions and oracles
- **Meaningful row:** key ∈ {FARM, worker hire W1–W4, Grader tier} (exempt, no gain check), **or** `optionGain(s,b,key).gain > 0` in **$/s** on `assumeWorking:true` (`econ/income.ts` `priceDollars`). **ε = 0.**
- **Zero-gain row:** non-exempt key with gain ≤ 0 (negatives included). No `key === 'coll'` special case may exist (grep in the diff: 0 hits for a COLL literal in `goal-label.ts`).
- **Reference mark (test-only):** `oldMark = p => p?.affordable ? p.key : null`; `newMarkRef = (p,s,b) => (!p?.affordable) ? null : (exempt(p.key) || optionGain(s,b,p.key).gain > 0) ? p.key : null`. The build's `bestBuyMark(pick,s,b)` must equal `newMarkRef` on every evaluated state.
- **DOM observables:** chip = `[data-best-buy]` (`.best-chip`); strip ★ = `#goal .ng-star` and any U+2605 in `#goal .goal-label` textContent; a11y = `#goalDesc`, `#goalLive`, accessible name of `#goal`.
- **State stream ("traces"):** AC7 bot runs, **seeds 1–200**, one `DualPicker` per seed on a fake clock = sim time; evaluate on every bot buy check (every 3 s sim) and on every state change. Observer hook in `tests/bot-m4.ts` is **observe-only** (no writes; SG-4 runs with it present).
- **Fixtures (committed JSON, per spec §3):** F10/C10, F14/C10, F17/C14, F22/C18, plus the SG-3 L17 fixture (coins $37.3K, F17 H19 V18 C10). Each = coins (¢), F/H/V/C, workers + moods, Grader tier, and the picker history (`DualPicker.tick(s,b,t)` sequence). Browser loading via a `build:qa` save fixture or `eggfarmQa.set.levels({F,H,V,C})` (dev/`build:qa` only; the release `check-release-build.mjs` leak check must still pass).

## 2. AC → test cases
| AC | Cases | Pass threshold | Type | Lane |
|---|---|---|---|---|
| SG-1 | (a) Trace property: every evaluated state on seeds 1–200 + 4 fixtures where the pick is zero-gain → `bestBuyMark` null, `[data-best-buy]` count 0, no `.ng-star`/U+2605 in `#goal` (jsdom `mount()` render of that state). (b) Unit boundaries, non-exempt key: gain 0 → null; −1e-6 → null; 1e-12 → key; 1e-9 → key. (c) Exempt keys FARM, W1–W4 hire, Grader tier at gain 0 and −1 → key. (d) Unaffordable meaningful pick → null (unchanged, spec §4). (e) **Patch1 interaction (review §5):** Market Hand Asleep + HENS pick → ★ kept (gain on the working base). (f) Strip assertions apply only while the strip is rendered (sales-stopped chip may own `#goal`, SS-16/35) | 0 violations | U (pure + jsdom) | Saves / UI |
| SG-2 | Same states; pick meaningful or exempt → `bestBuyMark(pick,s,b) === oldMark(pick)`; chip outerHTML and `#goal` innerHTML byte-equal to the baseline build's render of the same state | 0 diffs | U + jsdom golden | Saves / UI |
| SG-3 | L17 fixture with COLL held as pick ≥ 2 s (picker history in the fixture): chip count 0, no ★, strip label still names Collection, `hintPick.key === 'COLL'` (pick unchanged). **Passes when the documented limit reproduces** (M5.1 Part A fixes it) | exact | U (DualPicker + fake clock) | UI |
| SG-4 | AC7 trace hashes, seeds 1–200, PR head vs baseline SHA; hook present | byte-identical, **hard CI gate** | S, CI | Saves |
| SG-5 | `git diff --name-only base..head` ⊆ {`src/ui/goal-label.ts`, `src/ui/app.ts`, the M5 telemetry schema file, `tests/**`}; `app.ts` hunks only at the **4** `bestBuyMark(` call sites (prevMark, bypass check, `selectGoal(…)`, `bestChip`) and the SG-8 emit; 0 lines under `src/econ/`, `src/sim/`, `src/ui/pick-hysteresis.ts`, `src/ui/next-goal.ts`. PR description lists the by-design test edits: `m41-8-best-chip.test.ts:67` (COLL chip expectation) and `m41-8-f4-label.test.ts:219,229-230` (signature) | all true | review + script | HoQA |
| SG-6 | Suppressed pick (COLL fixtures, 360 and 1280): `#goalDesc` === the starred sentence minus `"best buy, "` (e.g. `Next goal: Collection level 11, plus 1 per tap. Ready now.`); case-insensitive `best buy` count 0 in `#goal`, `#goalDesc`, `#goalLive` and every row; accessible name of `#goal` = visible text; a suppression edge alone (same key, same state otherwise) causes **0** `#goalLive` mutations; one axe run per engine, 0 new violations | exact | jsdom U + B (axe) | UI |
| SG-7 | `m4.enabled: 0` balance from `tests/m4a-flag-off.test.ts`: flag-off golden hashes (bot, 10 Hz trace, offline) unchanged; **0** `best_buy_suppressed_zero_gain` events in the ring over a 10-min flag-off run; flag change only via reload (no runtime toggle case) | exact | U | Saves |
| SG-8 (non-gating) | Edge per (key, level), field check `{key: BuyKey, farm: s.farmLevel, level: row's current level}` and schema registration (T-AC9 export validates). **Fires:** first suppressed render after load = 1; reload while suppressed = 1 per load; A→B→A = 2; COLL level-up while still suppressed = +1 (new level). **No fire (0 extra):** affordability flips with unchanged pick, 1 Hz tick, 5 s re-check, hide/show, offline return / Welcome-back, while the sales-stopped chip fills `#goal`, flag off. **Spec test:** COLL held 10 s, no level change → exactly 1. Also: M5.0 post-patch baseline count reported | counts exact | U / T | UI |
| SG-9 | Census over seeds 1–200: suppressions per key published (table: key, count, first state). **(a) HARD FAIL:** any state where a key is suppressed (mark null on an affordable non-exempt pick) while its `pctOf` suffix shows > 0 (`+<1%` or `+N%`) — QA checks the suffix string in the same render. **(b) REPORT for HoP, non-blocking:** states with no ★ anywhere while some positive-gain buy is affordable → count + state list (seed, t, pick, affordable meaningful keys); expected non-zero in C2/C4 states (pick held on a zero-gain row while Farm/a track is affordable, as SG-3). Suppression of any key with genuine gain ≤ 0 (incl. demand-limited HENS/VALUE) passes | (a) 0 cases; (b) list delivered | S | Saves |
| SG-10 | **Traces only** (seeds 1–200 states): fail on any non-exempt row with 0 < \|gain\| ≤ 1e-6 $/s; report min non-zero \|gain\| seen. **SG-1 unit boundary fixtures (1e-12, 1e-9, −1e-6) are exempt** (spec v1.2.1) | 0 hits | S | Saves |
| SG-11 | Chromium, Firefox, WebKit × 360×640, 959×600, 960×600, 1280×800, suppressed fixtures: chip count 0, no strip ★; layout unchanged vs baseline (`#goal` and row rects Δ 0 px). **Mid-render pick change:** COLL becomes pick in the same tick a meaningful row's affordability flips, and coins crossing the COLL cost → chip key === strip ★ key === `bestBuyMark(hintPick, g.state, b)` in that render and the next (one mark per render) | exact | B (3 engines) + U | UI |

## 3. Edge cases (spec §4)
| Case | Expected | Type |
|---|---|---|
| Meaningful but unaffordable pick | no ★ (unchanged) | U |
| Negative gain on HENS/VALUE (demand-bound fixture) | null; counted in SG-9 census; not a fail | U |
| After Farm L30, only zero-gain rows | no ★ at all; strip unchanged | U |
| Collection gains real value later (Economy Q-E2) | COLL becomes meaningful by rule, no code change: unit case with a stubbed gain 0.01 → key | U |
| Reload with COLL pick | mark recomputed; SG-8 once per load | U |
| Sales-stopped chip occupying `#goal` | no strip ★ assertion; SG-8 silent | U |

## 4. QA readings (no spec change needed)
- **SG-7 scope:** flag-off asserts goldens + 0 SG-8 events only; the stopgap is not flag-gated, so ★ behaviour with `m4.enabled: 0` follows SG-1/SG-2 on whatever rows render.
- **SG-9(b) format:** CSV `seed,t_s,pick,affordable_meaningful_keys,coins_c,F,H,V,C`, attached to the PR card for HoP.
- **UC17 / BB-13 (M5.1):** report time to first ★ on fresh saves, seeds 1–200 (non-gating, review §5).

## 5. Estimate
≈ 0.25 QA-day: unit/property + jsdom, the 4 × 3 smoke, SG-8 cases. One pass on the final SHA.

## Change log
- v0.1 (17:55): first plan on spec v1.2.1 (11d98516); SG-1…SG-11 mapped; SG-10 traces-only; SG-9 (a) hard fail / (b) HoP list non-blocking.
