# v5 features: one section per flag (14)

**Main source:** `engineering/v5-flag-table.md` (HoE, 2026-11-10 ~02:10 CET, sha256 `8b7c3e24…`, accepted by D-CEO-20261110-13). Sim state per `engineering/v5-sim-build-state.md` (Architect audit at `rc/v5` `d65391b0`); UI state per `engineering/v5-ui-build-state.md` (at `f20b918`) and the flag table. PR heads were refreshed from GitHub at 2026-11-10 ~11:00 CET (`in-flight.md`).

**Legend:** BUILT = on `rc/v5` · IN-PR = open PR · ON-BRANCH = branch, no PR · MISSING = nowhere. Hours = engineer hours to Ready (low–high). "Art pin" and "spec pin" shas are **sha1 of the file contents**; every pin below was re-checked against the copied file in this pack (match noted ✔).

**Owners (roster.md):** Saves = Senior Engineer, Saves & Persistence `3ba38cf3` · Features = Senior Engineer, Features & Economy Wiring `95daf662` · Generalist = Senior Engineer, Generalist `5a6a207d` · Architect = Senior Software Architect `205f4268` (RC lead + reviewer) · Backfill = Senior Engineer, UI (lane U backfill) `1d79672c` · Hire 2 = Senior Engineer, Sim/TS + UI `821caad7` · Hire 3 = Senior Engineer, UI `dec9a396` · Saves QA = QA Engineer, Saves & Release Verification `33ec1b55` · UI QA = QA Engineer, UI/Layout & Gameplay Verification `edb6ef85`. All engineers report to Head of Engineering (HoE) `61b89361`; QA to Head of QA (HoQA) `78e99c2d`.

**Shared prerequisite – F6 overlay mount layer** (not a flag): golden, streak/tapCoins and Broody UIs mount on F6 "spots/registry". #86 is **rebuilt, not rebased** (D-CEO-20261110-09) on branch `feat/v5-f6-rebuild` (Features, 6–8 h, ~5 h left per its HANDOFF; F6 API v1.0 @ `da38e3f` per the streak HANDOFF). Handoff: `handoffs/worktrees/rev-f6-7810680/engineering/tasks/v5-f6-rebuild/HANDOFF.md`.

---

## 1. golden — golden egg
- **What / why:** a rare golden egg spawns on a farm spot; tapping it pays a reward (active-play reward loop). Spec: [`product/collection/m5-golden-egg-spec.md`](product/collection/m5-golden-egg-spec.md) v1.3.3, sha1 `2eb630e3` ✔ (includes `goldenFrozen`). Errata draft: `product/collection/m5-golden-egg-errata-v1.3.3-DRAFT.md`.
- **Sim:** BUILT (`src/sim/golden.ts:29`; Game driver via #111, merged). **UI:** MISSING — overlay egg + SFX. Only the helper `src/ui/golden-spots.ts` exists; nothing in `src/ui` calls `setSpotProbe`/`tapGolden`.
- **Remaining:** golden overlay egg UI + SFX hooks, mounted via F6.
- **How:** register a `goldenEgg` feature on the F6 registry (`src/ui/features.ts` on the F6 branch documents the empty slot); call `setSpotProbe` with valid spot ids and `tapGolden` on tap (`game.ts`, from #111). Art: `art-ux/assets/golden-egg.svg`, `golden-egg@2x.png`, `golden-egg-chip@2x.png`; sound per `art-ux/m5-sound-spec.md`. Art pin for golden UI: **TBD** (no golden-specific art pin sha is cited in the flag table).
- **Owner:** Generalist (UI). **Deps:** F6 (Features). **Estimate:** UI 9–11.5 h if F6 lands first (11.5–14.5 h slim-mount fallback).
- **ACs:** `GE-AC*` in the golden spec. **QA bar:** UI QA `edb6ef85` (+ QA bot live smoke), one UI bar on 3 engines, 3–4 h (+2 h re-bar risk).

## 2. streak — collect streak meter
- **What / why:** consecutive collects build a streak with combo tiers and A2 pops. Spec: [`product/collection/m5-streak-tap-coins-spec.md`](product/collection/m5-streak-tap-coins-spec.md) v1.3.3, sha1 `b315dea1` ✔. Art: [`art-ux/m5-combo-tiers.md`](art-ux/m5-combo-tiers.md) v0.3, sha1 `ed4ded1d` ✔.
- **Sim:** BUILT (`src/sim/streak.ts:16,36`); ST-AC19/20 telemetry fields in **PR #123** (`74d640d4`). **UI:** ON-BRANCH `v5/ui-streak-tapcoins` @ `f13d95a8` (Hire 3, pushed, no PR, built against an F6 stub). The flag table (02:10) still says MISSING; the branch was pushed later (04:36).
- **Remaining:** land #123; when F6 merges, rebase the branch onto it, apply `f6-swap.diff`, delete `streak-f6-stub.ts`, run the full suite + `streak-browser.mjs`/`streak-audio.mjs` per engine; fold in the pending `tc_streak_cool_cue_min_tier` ruling (Econ/HoP) and Art's S-AC19 chip placement; open the PR via HoE. (Handoff: `engineering/tasks/v5-ui-streak-tapcoins/HANDOFF.md`.)
- **Owner:** Hire 3 (UI); #123 author for the sim fields. **Deps:** F6; #123 before Generalist's session-end. **Estimate:** sim ~1 h (land #123) · UI 18–24 h (plan 20), partly spent — hours left **TBD** (the handoff does not restate them).
- **ACs:** `ST-AC*`. **QA bar:** Saves QA (#123, 2–3 h) / UI QA (meter UI, 3–4 h).

## 3. tapCoins — +$ pop on credited taps
- **What / why:** credited taps pop coins; same spec and art as streak.
- **Sim:** BUILT (`src/sim/tap-coins.ts:17`); credited-tap telemetry in #123. **UI:** bundled in the streak branch above.
- **How / owner / deps:** as streak (Hire 3). Broody extends `incomeRefOn` (`src/sim/income-ref.ts:13,25`). **Estimate:** included in streak 18–24 h. **ACs:** `ST-AC*` tap-coin rows. **QA bar:** in the streak bars.

## 4. abilities — worker abilities + Activate-all
- **What / why:** worker ability cards and an "Activate all" control. Spec: [`product/workers/m5-worker-abilities-spec.md`](product/workers/m5-worker-abilities-spec.md) v1.3.12. Art: [`art-ux/m5-abilities-flows.md`](art-ux/m5-abilities-flows.md) sha1 `fc1ca17d` ✔ (Boost §16).
- **Sim:** BUILT (`src/sim/abilities.ts:39,68,89`); combo reads `refillAgoSimMs` only with rc2Refill=1. **UI:** IN-PR **#116** (`629ab76d`); Boost slot lives in the Shift sheet (see rc2Refill).
- **Remaining:** resolve #116's conflict in `src/sim/actions.ts` + bar (~3 h); Boost inside the Shift sheet.
- **Owner:** Features (#116 + Boost in Shift). **Deps:** rc2Refill G0 API note; Shift sheet; #116 gets a post-freeze re-bar. **Estimate:** ~3 h (#116) + Boost inside Shift 15–21 h.
- **ACs:** `AC-M*` in the abilities spec. **QA bar:** UI QA (#116 post-freeze re-bar, 2–3 h; Boost in the Shift bar).
- **Note:** a separate older branch `feat/v5-abilities-shift` (`1ebcd7af`, local-only, owner e80556fd who is unreachable) exists; see `in-flight.md`. Whether it is still needed is **TBD** (no ruling found).

## 5. broody — Broody hen nest
- **What / why:** a broody hen sits on a yard nest that accrues value and glows when ready. Spec: [`product/collection/m5-broody-hen-spec.md`](product/collection/m5-broody-hen-spec.md) v1.3.3 sha1 `4441a1d9` ✔. Art: [`art-ux/m5-broody-hen-art.md`](art-ux/m5-broody-hen-art.md) sha1 `4169c17b` ✔; asset [`art-ux/assets/overlay-broody-nest.svg`](art-ux/assets/overlay-broody-nest.svg) sha1 `7de37176` ✔ (FINAL, D-CEO-20261110-08). UI checklist: `product/collection/broody-yard-ui-build-checklist.md`.
- **Sim:** was MISSING; now IN-PR **#134** (Draft, `gen/broody-sim` @ `03888f96`, base `saves/breeds-sim-prB-traits`). **UI:** MISSING (yard/glow).
- **Remaining:** finish/land the nest sim; build the yard UI: call `setYardProbe` with R4 eligible slot ids, `broodyLayoutChanged` on resize, read `broodyView` per frame; copy `overlay-broody-nest.svg` into `public/assets/` in the UI PR. Import `broodyBpEff`, don't edit it. (Handoff: `engineering/tasks/broody-yard-ui/HANDOFF.md`.)
- **Owner:** Generalist (sim + UI, one PR per the flag table; the handoff now has sim on `gen/broody-sim` and UI on `gen/broody-yard-ui`). **Deps:** income-ref and brRng BUILT; stack after Breeds PR-B / #125. **Estimate:** sim 6–8 h · UI 7–9 h (13–17 h).
- **ACs:** `BH-AC*`. **QA bar:** joint Saves QA (sim + save round-trip) + UI QA (yard), 4–5 h.

## 6. salesStopped — sales-stopped chip (#5b)
- **What / why:** tells the player when sales have stalled and offers Manage. Spec: [`product/market/sales-stopped-spec.md`](product/market/sales-stopped-spec.md) v1.3.27 sha1 `cfff3817` ✔ (FROZEN for QA). Art (shared with fatigue): [`art-ux/m4.2-fatigue-visibility-ux.md`](art-ux/m4.2-fatigue-visibility-ux.md) sha1 `ffb13c19` ✔.
- **Sim:** IN-PR **#128** (`saves/v5-risk-helpers` @ `b7a562f8`): risk helpers, stall timers, Rule 2 hysteresis, `sales_stall`/`fatigue_cue_*` emitters. **UI:** IN-PR **#130** (Draft, `ui/v5-sales-stopped` @ `7299bfe3`), incl. SS-36 Manage.
- **Remaining:** land #128; swap #130 from the pinned stub API (`engineering/tasks/v5-ui-ss-fatigue/SIM-API.md`) to the real helpers (~2 h); then Ready. No merge without HoQA GO; flags stay 0. (Handoff: `engineering/tasks/v5-ui-ss-fatigue/HANDOFF.md`.)
- **Owner:** Saves (sim) / Backfill (UI). **Deps:** Shift sheet for Manage; F6 merge-forward after. **Estimate:** sim 10–14 h (shared with fatigueCue) · UI 17–25 h.
- **ACs:** `SS-*` rows in the spec (SS-1…SS-37). **QA bar:** Saves QA (helpers/emitters, 3–4 h) / UI QA (#5b incl. SS-36, 4–5 h).

## 7. fatigueCue — HUD fatigue cue (#11)
- **What / why:** HUD cue when workers are tired. Product spec: [`product/workers/m4.2-fatigue-visibility-spec.md`](product/workers/m4.2-fatigue-visibility-spec.md) v0.2.5; Art `ffb13c19` ✔ (as above).
- **Sim:** in #128 (same PR as salesStopped). **UI:** IN-PR **#131** (Draft, `ui/v5-fatigue-cue` @ `df124220`, stacked on #130).
- **Remaining:** as salesStopped; SS-37/FC-AC9 needs golden spots.
- **Owner:** Saves (sim) / Backfill (UI). **Estimate:** sim in salesStopped · UI 16–23 h. **ACs:** `AC-F*`/`FC-AC*`. **QA bar:** Saves QA (same sim PR) / UI QA (#11, 3–4 h).

## 8. pause — pause/resume a worker
- **What / why:** pause a worker and resume it (Rest stays in the Shift sheet). Spec: [`product/workers/m5-worker-pause-spec.md`](product/workers/m5-worker-pause-spec.md) — the flag table cites v1.3.17 sha1 `7536acfa` (frozen copy `product/workers/m5-worker-pause-spec.7536acfa.md` ✔); the current file is v1.3.19 sha1 `07540579`, which matches HoP's pin. **Which rev governs the build is TBD** (the flag table predates HoP's pin; no reconciling ruling found).
- **Sim:** core BUILT; drift + `worker_resumed` in **PR #119** (`b65d23c6`, done); `worker_paused` emitter IN-PR **#132** (Draft, `saves/v5-worker-paused` @ `d8e278f8`, stacked on #119). **UI:** ON-BRANCH `wip/hire2/v5-pause-ui` @ `29d66915` (Hire 2, pushed, no PR). Workers-UI drift: **#121** (`2e48305e`).
- **Remaining:** #119 bar after restart (after the CP train, verify-smoke, rc2Refill=0 and =1); land #132; open the pause-UI Draft PR at the restart with HoE's OK; Art match + QA slot via HoE. (Handoff: `engineering/tasks/v5-pause-ui/HANDOFF.md`.)
- **Owner:** Saves (`worker_paused`, ~1 h) / Hire 2 (toggle/banner UI). **Deps:** #119 lands before refill exclusive-emission; Rest ↔ Shift/rc2Refill. **Estimate:** sim ~1 h · UI 8–12 h.
- **ACs:** `AC-P*`. **QA bar:** Saves QA (#119 3–4 h, `worker_paused` ~1 h) / UI QA (2–3 h).

## 9. rc2Refill — energy charges, Refill and Rest (Shift sheet)
- **What / why:** workers get refill charges; Refill/Rest from a Shift sheet. Product: [`product/workers/rc2-refill-proposal.md`](product/workers/rc2-refill-proposal.md) v1.3.16; lighter-refill [`product/workers/m5.1-lighter-refill-proposal.md`](product/workers/m5.1-lighter-refill-proposal.md) sha1 `c4c1a5cd` ✔. Art: sheet [`art-ux/m5-refill-flows.md`](art-ux/m5-refill-flows.md) v1.0.1 sha1 `43828d0b` ✔ + `art-ux/reviews/m5-refill-axe/sr-markup.md`; Boost `fc1ca17d` ✔.
- **Sim:** IN-PR **#133** (Draft, `saves/v5-refill-sim` @ `7cbbb9b6`, G1 = save keys + sanitiser + flag-0 identity). **UI:** ON-BRANCH `feat/v5-ui-shift-sheet` @ `c85f6560` (Features; the **Refill UI of record**).
- **Remaining:** finish refill sim G1→done (charges/Refill/Rest/auto/emitters); **no SAVE_VERSION bump** (sanitiser defaults + save round-trip); sync the 6 rc2 CSV cols. Shift sheet at restart, in order: G1 binding proof → axe on 3 engines → D-HOE-60 → rev-16 entries → `app.ts` openers. (Handoffs: `engineering/tasks/v5-refill-sim/HANDOFF.md`, `engineering/tasks/v5-ui-shift-sheet/HANDOFF.md`.)
- **Owner:** Saves (sim; Architect sizes/reviews 3–4 h) / Features (Shift UI). **Deps:** risk-helpers (#128); #119; #116 combo; Econ/PM Workers place `tc_autorefill_at_pct` (30) / `tc_autorefill_reserve` (0); Shift builds after the G0 API note. Shift adds +8–12 h calendar if Saves row 25 hasn't landed. **Estimate:** sim 19–27 h (plan 24, incl. autoRefill) · UI 15–21 h.
- **ACs:** `AC-RF*`. **QA bar:** Saves QA (refill sim, 5–6 h) / UI QA (Shift sheet, 4–5 h).

## 10. autoRefill — auto-refill
- **What / why:** auto-refill rows inside Shift; requires rc2Refill (AC-LR19). Spec: lighter-refill `c4c1a5cd` ✔; flows `43828d0b` ✔.
- **Sim:** MISSING (flag key + schema only), bundled in the refill sim (#133). **UI:** inside the Shift sheet.
- **Owner:** Saves (sim) / Features (UI). **Deps:** rc2Refill; clockWage U1/U2 (AC-LR20/21). **Estimate:** in the rc2Refill row. **ACs:** `AC-LR*`. **QA bar:** in the rc2Refill bars.

## 11. clockWage — running wage while workers are asleep
- **What / why:** workers cost a running wage (captions, welcome-back, yawn tip, toasts). Spec: [`product/workers/m5.1-worker-failure-cost-proposal.md`](product/workers/m5.1-worker-failure-cost-proposal.md) v0.3.24 sha1 `54b994bd` ✔ (frozen copy `.54b994bd.md`).
- **Sim:** ON-BRANCH `wip/hire2/v5-clockwage` @ `e8f42b08` (Hire 2, pushed, no PR; tick still had no Asleep wage at `tick.ts:65,88-92` at the audit). **UI:** MISSING.
- **Remaining:** finish sim against refill G0; rebase (~2 h) when refill merges; **merges after refill**; build the wage UI. (Handoff: `engineering/tasks/v5-clockwage/HANDOFF.md`.)
- **Owner:** Hire 2 (sim + UI; not Architect). Saves + Architect own the `tick.ts`/`workers.ts` seam. **Estimate:** sim 10–14 h · UI 8–12 h (18–26 h).
- **ACs:** `AC-FC*` (+ AC-LR20/21). **QA bar:** Saves QA (sim incl. offline + clock change, 4–5 h) + UI QA (~3 h) + 2 h re-bar after the refill rebase.

## 12. breeds — hen breeds (Flock sheet)
- **What / why:** hen breeds with traits and a Flock sheet. Spec: [`product/m5.1-breeds-spec.md`](product/m5.1-breeds-spec.md) (rev 3.8.x; cited frozen rev `product/m5.1-breeds-spec.13d5255e.md`). Art: [`art-ux/m5.1-breeds-ui.md`](art-ux/m5.1-breeds-ui.md) (art pin sha **TBD**: none cited) + `art-ux/assets/char-breed-*.svg`.
- **Sim:** PR-A sim BUILT; #120/#124/#126 merged into `rc/v5` (all at 03:45 CET on 10 Nov; #118 at 03:44; #111 at 01:14); open: **#125** traits (`77a3ae17`), **#127** telemetry (`7a7c7b2a`, base #125). **UI:** PR-A `v5/breeds-ui-a` (Architect, **local only**, now `8ef9b4cd`; push waits on Vadim's direct yes) + clamp-bind follow-up `v5/breeds-ui-a-clamp-bind` (`d5742e63`, local only); PR-B `feat/v5-breeds-ui-prB` @ `cdbebb5a` (Features, pushed, no PR; ~7 h left).
- **Remaining:** merge order **#125 → #127 (restacked; incl. m1 session-counter reset + pageshow/bfcache guard) → #100**; push PR-A and open it; PR-B: Architect fallback ruling, Saves #126 follow-ups (`presentGateOpen`), #100 goal hook, open Draft once `origin/v5/breeds-ui-a` exists. PR-B before F6. (Handoffs: `engineering/tasks/v5-breeds-ui-a/HANDOFF.md`, `handoffs/worktrees/rev-prB-d66a726/engineering/tasks/v5-breeds-ui-prB/HANDOFF.md`, `engineering/tasks/breeds-telemetry/HANDOFF.md`.)
- **Owner:** Saves (land stack) + Generalist (#127) / Architect (PR-A) + Features (PR-B). **Estimate:** sim review/QA + #127 1–2 h · UI PR-B ~7 h.
- **ACs:** `BR-AC*`. **QA bar:** Saves QA (stack ~5–6 h serial) / UI QA (PR-A ~2 h, PR-B ~3 h).

## 13. zeroGainUi — zero-gain purchase UI
- **What / why:** flags purchases that give no gain. Spec: [`product/collection/m5.1-zero-gain-purchase-ui.md`](product/collection/m5.1-zero-gain-purchase-ui.md) v0.3.8; Art `art-ux/m5.1-zero-gain-ui.md`.
- **Sim:** none needed. **UI:** BUILT (`src/ui/zero-gain.ts`; #97, #99). **Remaining:** flag flip only (held, D-HOE-38); confirm the strip stays off while `m4.zeroGain.confirm=0`.
- **Owner:** — . **Estimate:** 0 h. **ACs:** `ZG-AC*`. **QA bar:** UI QA flip smoke ~1 h. Not on the critical path.

## 14. bestBuyV2 — Best Buy v2
- **What / why:** re-baselined "best buy" scoring. Spec: [`product/farm/m5.1-bestbuy-rebaseline-proposal.md`](product/farm/m5.1-bestbuy-rebaseline-proposal.md) (frozen revs under `product/farm/frozen/`); flip diff [`engineering/tasks/bbv2/HELD-flip-bestBuyV2.diff`](engineering/tasks/bbv2/HELD-flip-bestBuyV2.diff).
- **State:** sim + UI IN-PR **#100** (`2e76d0c5`). Freeze-needed (D-CEO-20261110-06) because PR-B's AC23b renders only through its fallback.
- **Remaining:** merge after #127; QA bar. **Owner:** Generalist (merge/QA). **Estimate:** ~2 h. **ACs:** `BB-AC*`. **QA bar:** Saves QA (#100), 2–3 h after #127.

---

## Non-flag telemetry base (gates `session_end` / TEL-AC1)
| Item | State | Owner | Hours | Notes |
|---|---|---|---|---|
| TEL-AC1 envelope `sid`/`fgMs` (drop `sessionMs`) + hide ≥ 60 s session rotate | local branch `v5/tel-envelope` @ `4c440909` (**not pushed**; "push/PR only on Vadim's own go") | Architect | 7–11 | lands after #123; handoff `engineering/tasks/v5-tel-envelope/HANDOFF.md` |
| session-end-base (+ §8 `session_summary.counts`) | MISSING | Generalist | 10–14 | after #123; handoff `engineering/tasks/v5-session-end-base/HANDOFF.md` |
| Telemetry spec | — | — | — | `product/collection/telemetry-spec.md` + `telemetry-spec-errata-v5.md` (rev15 §10.1 cited by #123) |

## Economy prerequisite (not a flag)
- **collectionCostFromCsv port** — PR **#129** (`e234fad1`, Ready, Generalist). Needed for the R04 CSV repair (D-CEO-20261110-05). Handoff `engineering/tasks/collection-cost-port/HANDOFF.md`.
- **Accepted economy CSV** — `product/economy.csv` + `product/economy.md`; runs of record wait for the sim-complete sha (`gates-and-schedule.md`).
