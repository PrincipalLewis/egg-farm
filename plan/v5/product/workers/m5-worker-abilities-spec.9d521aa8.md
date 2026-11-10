# M5.0 #4 Worker abilities ("Shift Calls") + Activate-all, unlock F10 (PM, Workers)
**v1.3.12 (final, pending harness re-measure; combo values pending Econ model) · 2026-11-05 22:12 CET** (v1.3.11 2026-11-05 20:29 CET; v1.3.10 2026-10-30 14:20 CET; v1.3.9 13:59 CET; v1.3.8 13:48 CET; v1.3.7 13:38 CET; v1.3.6 13:29 CET; v1.3.5 13:20 CET; v1.3.4 13:15 CET; v1.3.3 2026-10-24 17:54 CEST) · **Status: Final — D-HOP-06/16; all gates cleared (HoE, Art, HoQA, Econ G3/G5-P); Economy values pending harness-of-record re-measure.** · build hold stands (code only on Vadim's go)
v1.3.12 (D-PMW-2026-11-05-04, 2026-11-05 22:12 CET; **dated Product errata mirroring Architect contract `engineering/reviews/arch-abilities-fireAbility-combo-persist-20261105.md` §4 (22:08 CET; D-HOE-20261105-41); no new rule beyond the Architect contract, no SAVE_VERSION bump**): E2, E7 and AC-M5A-12 now use the **granted** duration `durS` (tc_ability_s or combo_boost_duration_s) for the clamp and `effect_s`, not always `tc_ability_s`. `AbilityState` gains optional `durS`. Reload still ends the call (TEL-8). Top-level `abilityDurS` is rejected as a persisted shape.
v1.3.11 (D-PMW-2026-11-05-03, 2026-11-05 20:29 CET; **dated Art-erratum mirror, final-RC checks only; no number, flag, behaviour or copy change beyond Art's signed text**): mirrors Art signed abilities flows Q8 erratum `fc1ca17d` (§4.2 L57, AB-UI-7 L183; art-ux/decisions.md L568–571, 2026-11-05 20:28 CET). Docked occupied Activate-all with Refill visible: compact 48 px button 8 px right of Refill, visible bolt + `N` / `4:51` / `—`, full names via `.sr-in`; no second row; Refill unchanged. Applied at §5.1 docked (L200), §5.6 Activate-all (L314), AC-M5A-8 and AC-M5A-10. Signed flow of record becomes `fc1ca17d`.
v1.3.10 (D-PMW-2026-10-30-25, 2026-10-30 14:20 CET; **post-freeze dated erratum, no AC/number/flag change**; FZ-4: §7 L359 data mapping note per D-HOE-20261030-30; was v1.3.9 133adb21, freeze D-PMW-2026-10-30-23): **Errata (FZ-5, HoQA QA-D-1030-FREEZE-RR1 §4; D-PMW-2026-10-30-25; citation only: no AC, number, rule, flag or bar changed):** §9 L438 and AC-M5A-24 L586 are re-cited from PMC telemetry errata v5 rev. 6 83424120 to rev. 7 fd7d5921, the pin of record (row #10 has the same meaning; rev. 7 reads "always present when abilities = 1"). The 8 live in-place `eb2b3b7d` cites (L294, L316, L318, L320, L332, L333, L403, L589) now read 3d238b6b, the signed flow of record (art-ux/decisions.md L560). Changelog and review-delta lines (L3, L5, L7, L792, L794) stay as history.
v1.3.9 (D-PMW-2026-10-30-22, 2026-10-30 13:59 CET; **copy only**): Art copy erratum (art-ux/decisions.md L560): abilities flows now sha1 **3d238b6b0cd24f3d03c19a3e34737307f9c32c25**, which replaces eb2b3b7d as the signed flow; every eb2b3b7d cite below reads as 3d238b6b. SG-4 combo describedby is exactly `Combo, 45-second boost: {effect} Starts when the sheet closes.` (one colon, parallel to Ready `30-second boost: …`; 30/45 read from data). Exact names, layout, rules, tunables unchanged.

v1.3.8 (D-PMW-2026-10-30-20, 2026-10-30 13:48 CET; **telemetry and text only, no layout change to the signed flows; no rule number or tunable changed**): **Art signed m5-abilities-flows v0.2 eb2b3b7d** (SIGNED 13:47 CET, art-ux/decisions.md L549, sha1 eb2b3b7dbf48c5ee8aed115a327c5dd44dee88ec; pins v1.3.7 314dc0e3; gate card #7). Every Art v0.2 draft-sha / sign-pending reference now cites it (SG-10); Art Q8 (docked-header rects) is non-blocking: a conflict becomes an erratum, not a re-sign. **D-HOP-2026-10-30-42 (13:43, product/decisions.md L1944):** both PMW scope calls accepted (only a manual refill opens the window; only a Shift-sheet Boost can combo); condition `ability_used.combo:true|false` (bool, every emit) added to §9 and AC-M5A-24, matching PMC telemetry errata rev. 6 83424120 row #10; no window-remaining field. HoQA test plan v0.9 (qa/m5/test-plan-abilities.md) SG-1…SG-6 ruled by PMW: **SG-1** sha `60ed26a0` was an **unversioned intermediate** (v1.3.6 8797f5ff + HoE 13:32 / Rush notes, written in place with no bump or decision line), **superseded by v1.3.7 314dc0e3 via D-PMW-2026-10-30-17**; plans must target the live version (now v1.3.8). **SG-2 as corrected by SG-9** (Art signed eb2b3b7d §16.3 L240–250 wins for the Shift-sheet Boost chip; §5.6 now mirrors that table): the resting worker's Boost chip is `Paused, {Call}, {Role}`, the same string as the Workers-tab card call button on a different surface; `Paused, {Role}` names no element and is removed; a Boost tap on a resting worker logs `ability_blocked{reason:"paused"}` (Rest = Pause + restAuto when rc2Refill=1); E5 fixed. **SG-3** (ruled in D-PMW-2026-10-30-18): combo window in sim ms, inclusive: ≤ 10000 ms since the manual refill tap is in, > 10000 ms is out (10000 ms = combo, 10001 ms = no combo; 10.05 s is out). **SG-4** combo-eligible Boost describedby says `45-second` instead of `30-second`; exact copy Art-owned. **SG-5** `ability_blocked` session cap in §9/AC-M5A-20 (D-HOE-20261030-23). **SG-6** §5.6 Inspect +0.5 recorded as HoE-confirmed (D-HOE-20261030-25). Art §16.3 L240–250 states/names/describedby mirrored in §5.6. D-HOP-42 (4): `Boost, {Call}, {Role}` replaces the earlier `{Call}, {Role}` Ready proposal; `Combo` is capitalised; exact-name checks are case-sensitive. Frozen pre-edit copy: `m5-worker-abilities-spec.314dc0e3.md` (v1.3.7); backup `scratch/m5-worker-abilities-spec.v1.3.7-314dc0e3.md`. HoE manifest rows 15/18/19 pin v1.3.7 (manifest 6daddcca) until HoE re-pins.

v1.3.7 (D-PMW-2026-10-30-17, 2026-10-30 13:38 CET): **Art errata from abilities flows v0.2 `art-ux/m5-abilities-flows.md` §16.8 (v1.3.8: Art signed m5-abilities-flows v0.2 eb2b3b7d)** (~~sign pending Sat 31 Oct 12:00 CET~~ v1.3.8: Art signed m5-abilities-flows v0.2 eb2b3b7d, 13:47 CET): **D5** Boost Ready name is exactly `Boost, {Call}, {Role}`; **D6** combo name is exactly `{Call}, Combo, {Role}` (capital C, matches the visible word; lower-case fails Chromium CDP); **D7** the PMW fold test ("row 4 above the fold at 360×640") is withdrawn and replaced by Art **AB-UI-15** (Boost adds ≤ 4 px per row; the Refill action line stays as signed v1.0.1), because the signed sheet without Boost already starts row 4 at 773 px at 360×640; placement **(b)** approved: a 44×44 chip in the Rest column with a visible text label, never icon-only. **PMW ruling 13:37 CET (rule 11, AC-M5A-24; rc2 AC-RF4):** only a **manual** refill (`refill_used{by:manual}`) opens the 10 s combo window; an auto refill never does (the combo rewards active management). Also folds HoE 13:32 (written in place after v1.3.6 8797f5ff was logged, frozen `m5-worker-abilities-spec.60ed26a0.md`): telemetry `worker` = code ids `market_hand|coop_hand|hawker|grader`, no `manage_used` alias; docked `sheetCloseComplete` as a build AC in AC-M5A-24; and §5.6 Q4 `Rush`/`Rush Hour` closed (PM Market 13:30 CET). Frozen pre-edit copies: `m5-worker-abilities-spec.8797f5ff.md` (v1.3.6 as logged in D-PMW-2026-10-30-13) and `m5-worker-abilities-spec.60ed26a0.md`.

v1.3.6 (D-PMW-2026-10-30-13, 2026-10-30 13:29 CET): **D-HOP-2026-10-30-39 (13:27): the refill→Boost combo ships in v5** (rc2 AC-RF4 L145, Option B). New rule 11 (combo), tunables `combo_window_s` 10 and `combo_boost_duration_s` 45 (proposed; Econ models them), new AC-M5A-24, and the combo-eligible Boost name row is live (copy pending Art). Gate `abilities && rc2Refill`; cooldown and multipliers unchanged. Resolves the v1.3.5 combo conflict (HoQA O-7 vs §3). Base call stays `tc_ability_s` 30. Econ models both tunables by **Sat 31 Oct 18:00 CET** in the all-flags-on harness (Sun 1 Nov 18:00 CET); a miss is a **schedule slip to HoP, nothing cut**. Art's combo cue goes into the **Sat 31 Oct 12:00 CET** abilities sign (Art designs the flat 30 s Boost as the base and the combo cue as an add-on, no re-layout); HoQA O-7 cases use these values (10.0 s qualifies, 10.1 s does not; 45/30 s). D-HOP-39 accepted v1.3.5 eb33aad0 as final for spec. Also: telemetry `worker` = code ids `market_hand|coop_hand|hawker|grader`, no `manage_used` alias (HoE 13:32); docked `sheetCloseComplete` worded as a build AC in AC-M5A-24 (HoE 13:32); §5.6 Q4 `Rush` / `Rush Hour` collision note closed (PM Market 13:30 CET: no clash in v5; sales-stopped v1.3.23 L31, rename before M5.2 L538). This is a rule addition ruled by HoP; no other rule or number changes. Frozen pre-edit copy: `m5-worker-abilities-spec.eb33aad0.md`.

v1.3.5 (D-PMW-2026-10-30-12, 2026-10-30 13:20 CET, **record-only**): (1) **D-HOP-2026-10-30-35 (13:20):** the rc2 Shift sheet Boost slot is **VISIBLE in v5**, gated on `flags.abilities && flags.rc2Refill`; it reuses the in-sheet ability entry (E14) and emits only `ability_used{in_sheet:true}`, no new event; Activate-all stays in the Workers tab. Replaces v1.3.4's "hidden in v5 (Workers recommendation)" (§5.6 Q1, Q2, §3 note). (2) **HoQA 13:20:** axe `label-content-name-mismatch` only evaluates elements that have an `aria-label`, so it passes trivially on content-named controls and is recorded as **inapplicable** here; AC-M5A-23's axe line is replaced by "no `aria-label` attribute on the control, and the exact computed name equals X". (4) **HoQA 13:22 (test plan v0.8 7a8d43e3):** O-1 read method (CDP `getFullAXTree` in Chromium, `ariaSnapshot` in all 3 engines; AC-M5A-23); O-3 "only active timer" = only timer graphic, with the allowed digit sources listed (AC-M5A-18); O-7 Shift-sheet Boost timing (starts on `sheetCloseComplete`, combo window on sim time) and a PROPOSED Boost slot name table pending Art v0.2 (§5.6 Q1). (3) **D-HOP-2026-10-30-38 (13:22):** E2 reworded to match the code: a negative `readyAt` is removed (field dropped, reads as ready), not clamped; same player outcome, no code change (rc/v5 e77fc5c `src/save/m5-fields.ts:34`, `:71`; `src/sim/clock.ts:27-30`). Frozen pre-edit copy: `m5-worker-abilities-spec.c65dfbc5.md`.

v1.3.4 (D-PMW-2026-10-30-11, 2026-10-30 13:15 CET, **record-only errata**): folds in Art's abilities flows v0.1 (`art-ux/m5-abilities-flows.md` bbe9d142, HANDOFF 320eab84, DRAFT, sign due Sat 31 Oct 12:00 CET), which **extends** the signed `art-ux/m5-workers-ui-signoff.md` 5910646c (and its 16:22/16:25 amendments) and does not replace it. PMW accepted at 13:14 CET: §4 describedby copy; D1 (disabled Activate-all name `Next call`, no digits); D2 (call names carry the `.sr` role suffix; names from content, never `aria-label`; no space before the comma, Art F1); D3 (§5.5 30 s ring dropped); D4 (AC-M5A-8 fit set `0:01`…`0:30`); Q1 (rc2Refill = 1: Activate-all stays in the Workers tab; Shift sheet Boost slot hidden in v5, PMW recommendation, HoP's call under D-HOP-2026-10-30-30); Q2 (the rc2 Shift sheet is a rule 10 menu at every width); Q4 (`Rush` stays). Name ACs are exact-string on the raw computed name (Art + HoQA 13:15). Q2 build dependency: F6 `overlay.wireAttended` PR #86 (D-HOE-20261030-18). See §5.6 and AC-M5A-23. No rule, number, flag or threshold changes. Frozen pre-edit copy: `m5-worker-abilities-spec.06f98b49.md`.

v1.3.3 (D-HOP-2026-10-24-27, HoQA E-3, wording only): AC-M5A-15 judges the window gate against the §13.2a X1 oracle, not the 100-seed checkpoint figures. No rule changes.

v1.3.2 (D-HOP-2026-10-24-24): the CSV draft of record is now `scratch/v2-econ/economy.m50-draft.csv` sha256 8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b (152 columns, 31 rows; supersedes edfd8902), and HoE's per-PR split (§15a) replaces the "no per-PR split" note. No rule changes.

v1.3.1 aligns every sizing figure to HoE `engineering/m5.0-sizing.md` v1.2 §15 "Totals after §11–§14" (with §0 headline, §11 16:40 and §13) (HoP v0.2 cross-check). No rule changes.

v1.3 finalises the spec under D-HOP-2026-10-24-16: Sweep is A (lay ×1.15, no level scaling) and B2 is closed; Economy G3 and the hold-for-Frenzy result are recorded (§4a, AC-M5A-15) from `research/v2-slices/economy.md` §10–§11; tunables cite the §13 column drafts by name; HoE confirmed AB-13/AB-14 (FX eviction rule, AC-M5A-21). Every Economy value is **pending re-measure on the harness of record** (`npm run measure:l30plus`); §10–§13 are SCRATCH runs.

v1.2.4 closes HoQA text items AB-10 to AB-14 (rulings relayed by steering): E1 wording, in-button blocked reason, the exact lockout sentence, the FX-cap selector (proposal, HoE to confirm) and the real docked breakpoint. Rule 10 start point reworded; no other rule changes. (v1.3: HoE confirmed AB-13 and AB-14.)

v1.2.3 records HoE's confirmation that the sheet auto-close is buildable. It adds +0.5 dd for that work (§12) and pins E14 (a)/(c)/(d) to the close-complete callback. AC-M5A-22 now steps a single deterministic close-complete event. No rule changes.
v1.2.2 folds in:
- HoE's v1.2.1 re-check: the focusClock definition, the `activeS` clamp, the final end causes
- D-HOP-2026-10-24-12 (Q10): a call tapped in the sheet closes the sheet and starts at once. This supersedes "starts suspended" and HoE's accept-for-M5.0 position.
v1.2.1 folds in:
- **D-HOP-2026-10-24-10 (AB-9):** call durations run on `focusClock` and are suspended under menus and short hides. **This is a rule change HoE hasn't reviewed** (rule 10).
- HoQA testability v0.2 (§15 has the resolution per ID)
- Art Q7e and Q7f
- the HoE decisions: FX cap, end causes, coalescing, flag keys, B3 accepted
- B2: the build assumes Sweep-L until G3 (closed in v1.3: Sweep A, D-HOP-16)
v1.2 folds in HoE's buildable review (`engineering/m5.0-sizing.md` §9). Changes:
- the frame-gap wording (Ask 1/E1) and a read-time cooldown cap
- the Frenzy ×4.5 peak and hold-for-Frenzy in G3
- B1: the true slot width is 160 px, taken from CSS
- B4: AC-M5A-13 restated against hints that exist
- B3: a conflict, recorded in Q8
- CSV columns cited by name
- flags renamed to `m4.flags.*`
- downgrade/upgrade behaviour stated

No game rule changes.
v1.1.2 folds in Art's Q7c = (a): a two-row 128 px card with the row [pause 44] 8 [Manage flex:1] 8 [call flex:1]. It confirms the 14/12 px floor on both sticky slots and replaces the v1.1.1 wrap fallback. It also proposes time-only labels where the signoff strings don't fit (Q7e). No rule changes.
v1.1.1 folds in Art's Q6 answers, the 20 px bar icon with a 6 px gap, and the coach duration template.
v1.1 folds in every string, size and position from `art-ux/m5-workers-ui-signoff.md` (Head of Art & UX, 2026-10-24 16:20), which is the source of truth for UI. Wherever this doc writes **[bolt]**, it means the inline `icon-bolt.svg` (24×24 source, drawn at 20 px in the sticky bar and on call buttons; 2px `--c-outline`; `aria-hidden`). No emoji glyphs appear in UI strings.
v1.0.1 records the HoP rulings (d) and (e) and closes Q3 and Q5. It also adds AC-M5A-17 and makes E10 precise. No rule changes.
Folds in D-HOP-2026-10-24-04 (items 5, 8, 9, 10): the attended definition, Rush scope, Sweep decided in G3, Pause in scope behind a flag, and new CSV columns drafted by Economy. HoE input: `engineering/m5.0-sizing.md` #4 and §8.7. v0.2 → v1.0 changes are in §14.
Research and PM only. No code or PRs.

**Basis**
- `product/workers/m4-abilities-spec.md` v0.3: sizes APPROVED by HoP on 2026-10-16, never built. This spec replaces it for M5. Rules 1–8 and AC-A1–A6 are carried forward and restated here.
- `product/m5-interaction-plan.md` v0.1 (sha256 08a1ec35…, accepted in D-HOP-2026-10-24-02): §4 #4 and rulings R3, R7, R10, R13, R15.
- `product/research/v2-slices/workers.md` v0.1 §2.
- Layout sources:
  - `art-ux/m2-workers-layout.md` §4 and §4.4
  - RC1 `art-ux/scratch/rc1-5d9efa6/src/ui/styles.css:192-209` and `workers-ui.ts:44-73`
  - `product/workers/rc1-b1-coop-full-spec.md` Polish P-1

**Data source of truth:** `product/economy.csv`, sha256 `c7bb783fe890928f747c142411503261f0711388e73fe1cdadbfd76cc8d68b44` (**CSV c7bb783f**). **Columns are cited by name only (v1.2).** The game copy `game/data/economy.csv` (b48be8a4) has 2 extra `guard_*` columns, so header positions differ between copies (HoE §9.5(3)). Every column cited holds the same value on rows L0–L30.

## 1. Overview
From **F10**, every hired worker gets one **call**: a 30 s price or supply multiplier on a 300 s cooldown. One **Activate-all** button fires every ready call. Calls are **free in M5.0**. They never fire offline, and they only pay a player who is present.

## 2. Player fantasy
"My crew runs the farm, and I'm the foreman who calls the rush." Automation keeps the chores done, and the player chooses *when* to push. The decision is about timing, never upkeep (IMT precedent, v2 slice P1/P3).

## 3. Scope
**In scope (M5.0)**
- 4 calls: Rush, Sweep, Shout, Inspect.
- A per-card call button.
- Activate-all.
- A [bolt]+N ready badge.
- Unlock at F10.
- Telemetry and debug setters.

**Out of scope**
- **M5.1** (#8, R10):
  - `tc_ability_energy_cost` 10 [P]: the value is 0 here, and the config key ships now so M5.1 is data-only.
  - ~~The refill→call combo (`combo_window_s`, `combo_boost_s`).~~ **v1.3.6: in scope for v5** (D-HOP-2026-10-30-39; rule 11).
  - Energised.
  - The rc2 Shift sheet and charges.
- **M5.2** (R8): worker levels, in the Farm Lab Crew branch.
- **Separate item:** Pause/Resume (`m5-worker-pause-spec.md`). This spec works with or without it (§4 rule 4).
- **Not changed:** energy drain, wages, Manage/Refill rules, the 30 s `manage_cooldown_s`, and Manage-all eligibility.

## 4. Rules
1. **Unlock.**
   - Calls exist only while `farmLevel ≥ tc_ability_unlock_farm` (10).
   - **`abilities_unlocked` fires once per save** (AB-7). It fires the first time `farmLevel ≥ 10` with the flags on and sets the saved flag `abilitiesUnlocked: true`. A reload, or dropping below F10 and re-crossing in the same save, doesn't fire it again. A fresh start (a new save, including the CSR fresh-start fallback) has no flag, so it fires again on its first F10.
   - Crossing F10 also shows a one-time coach card in the Workers tab (once per save, saved flag `abilitiesCoachSeen`). Copy is from the signoff §5:
     - Title: **"Shift calls unlocked!"**
     - Body: **"Tap [bolt] on a worker for a 30-second boost. Calls recharge on their own."** The "30" is rendered from `tc_ability_s`, so it is never hard-coded.
     - Button: **"Got it"**. This is the only way to dismiss the card, and it sets `abilitiesCoachSeen`.
     - Placement follows the explainer no-overlap rules: the card never overlaps a visible Buy, Collect or Activate-all control.
   - A worker hired at or after F10 starts with its call **ready**.
   - Below F10 (including after a CSR fresh start that drops Farm below 10), no call UI, badge or ability telemetry exists. Saved `readyAt` values are kept.
2. **Effects** (each lasts `tc_ability_s` = 30 s from activation):
   | Worker | Call | Formula while active |
   |---|---|---|
   | Market Hand (W1) | **Rush** | Price of each egg *sold by the Market Hand* × `tc_ability_w1_price_mult` (1.15). **Market Hand sales only** (D-HOP-2026-10-24-04 item 8). Manual taps, Sell all and other sales are unaffected. The sim attributes each sale with `by: market_hand \| player` (HoE F1c). |
   | Coop Hand (W2) | **Sweep** | **Sweep A (D-HOP-16):** laying rate (eggs/s into the coop) × `tc_ability_w2_lay_mult` (1.15), still capped by `coop_capacity`. **One rule from F10 up, with no switch at F20.** No level scaling. The price variant (B) was considered and rejected (§4a). |
   | Hawker (W3) | **Shout** | Price of *all* sales (manual and Market Hand) × `tc_ability_w3_price_mult` (1.15). |
   | Grader (W4, F18+) | **Inspect** | `graderMult = 1 + (tiers[t−1].mult + tc_ability_w4_tier_add − 1) × share(mood)`. `tc_ability_w4_tier_add` is 0.5, and share is 1 when Working, `w4_tired_bonus_share` (0.5) when Tired. At tier 3 (×2.5) while Working, the result is ×3.0. |
3. **Cooldown.**
   - On activation, `readyAt = activatedAt + tc_ability_cd_s` (300 s), so the cooldown includes the 30 s effect (10% uptime). This matches Economy's sim (`product/sim/m4/m4_sim.py:163`, `ab_next = t + ab_cd`).
   - **Cooldowns run on sim time** while the game is live, including under menus and in a hidden period under 60 s (D-HOP-2026-10-24-10).
   - Offline, reload and ≥ 60 s gaps are subtracted as wall-clock time on return (HoE §9.1: sim-seconds remaining internally, saved as an epoch `readyAt`). So a 10 min absence still makes a call ready (v0.3 rule 5).
   - The remaining time is capped at `tc_ability_cd_s` on every read (E2b).
4. **Eligibility.** A worker is *eligible* when all of these hold:
   - it is hired
   - `mood ∈ {working, tired}`
   - it isn't paused (applies when `m4.flags.pause` = 1; Pause is in scope behind its flag, D-HOP-2026-10-24-04 item 9, `m5-worker-pause-spec.md`)
   - `now ≥ readyAt`
   - `farmLevel ≥ 10`

   When a worker isn't eligible, its button is disabled (`aria-disabled="true"`). The **button text** (Art Q7e, approved; no extra caption) shows the first reason that applies, in this order:
   1. "Asleep"
   2. "Unpaid"
   3. "Paused"
   4. [pause] "0:ss": the Market Hand lockout (Pause G2)
   5. [bolt] "m:ss": the cooldown

   The full sentence ("Ready in m:ss" / "Ready in 0:ss after a break") goes in `aria-describedby`.
5. **Tired.** The call applies in full. Energy drains at the normal 1× rate, and the call spends nothing (`tc_ability_energy_cost` 0).
6. **Early end.** If the worker becomes Asleep, Unpaid or Paused during a call, the effect ends that tick. `readyAt` doesn't change and nothing is refunded (AC-A6). Manage/Refill during a call doesn't end it.
7. **Activate-all.**
   - Fires every eligible worker in the same tick and has no cooldown of its own.
   - When nobody is eligible, it's disabled with the label [bolt] **"Next call m:ss"**, using the smallest `readyAt` among workers that aren't blocked (Asleep, Unpaid or Paused). If every worker is blocked, the label is [bolt] **"No calls ready"**.
   - **v1.3.4 (D1):** the disabled *visible* text stays [bolt] "Next call m:ss", but the **accessible name is `Next call`** with no digits: the time is the empty `aria-hidden` `data-cd` span, and `aria-describedby` reads "Next call ready in m:ss" (§5.6).
8. **Stacking.**
   - Rush × Shout multiply each other: a Market Hand sale during both earns ×1.3225.
   - All calls multiply with the streak, A1 (the tap-coin bonus) and golden-egg Frenzy, which is how Economy modelled the ALL stack (`m4-active-checks.md` §6; `m4-tracks-model.md:176`).
   - The timed-collectible rule "Frenzy and boost never stack" refers to the **M4-B rewarded boost** (cut), not to calls (§13 Q3).
   - Everything draws from the R3 shared budget.
9. **Attended** (D-HOP-2026-10-24-04 item 5): the tab is visible **and** there was a player input (pointer down or key) within the last `leave_attended_window_s` (30 s) of **sim time**. While a modal, sheet, explainer, onboarding or coach screen is open, sim-time attended timers are frozen (ruling 4). The one attended tracker is HoE F1(b), shared with the golden egg and streak. Here it gates only the §5.4 badge; calls themselves fire whenever the player taps.
10. **Call duration on the focus clock (D-HOP-2026-10-24-10, settles AB-9; replaces the v1.2 wording).**
   - **Definition (HoE-confirmed v1.2.2):** a call's 30 s (`tc_ability_s`) is counted in **`focusClock` seconds**. `focusClock` adds **min(frame dt, 1.0 s)** only while the tab is visible and no menu is open. It adds **0 offline**, and a hidden period or frame gap of **≥ 60 s counts as offline**. This is HoE's F1(b) clock (`engineering/decisions.md` 2026-10-24 16:29: `focusClock += min(frame dt, 1.0 s)` only while the tab is visible and no menu is open, driven by injected sim time, 0 offline), named by D-HOP-2026-10-24-09 #1.
     - Menus are the golden-egg spec's R6 list: modals, sheets, the tracks explainer, onboarding, and coach marks with a scrim. **A sheet that is closing counts as open** until `sheetCloseComplete` (AB-14 (ii)).
     - "Attended" (rule 9) is a different thing and only gates the badge.
   - **While the focus clock is stopped** (a menu is open, or the tab is hidden for under 60 s and the sim keeps running live), the call is **suspended**:
     - **no ability multiplier** applies to any sale, including Market Hand sales made in the live hidden sim or under a menu
     - Sweep adds no laying
     - the remaining duration doesn't decrease
     - When the focus clock restarts, the effect resumes with its **remaining time**.
     - The button shows "Active 0:ss" frozen, with its fill bar frozen.
   - **Cooldowns keep running on sim time** during a suspension (rule 3). This is the same pattern as D-HOP-2026-10-24-08 #3 for the streak and Frenzy.
   - **A hide or frame gap ≥ 60 s (exactly 60.0 counts) is still offline and ends the call (E1).**
     - **How E1 and rule 10 agree:** the focus clock stops at the hide, so the call is already suspended from that moment. When the gap reaches 60 s, the provisional hidden sim is discarded, and the suspended call ends **at the hide** with `cause:"offline"`. `effect_s` is the focus seconds it ran before the hide, so no effect time accrues in the gap either way.
     - On the visible-throttled path (no visibility event), the focus clock gets no advance for the gap. The call ends at the gap start, the same as E1.
     - Under 60 s: the call is suspended, then resumes. It never ends because of a short hide.
   - No call fires and no effect accrues offline.
   - **Activation from the sheet (D-HOP-2026-10-24-12, supersedes v1.2.1 "starts suspended"):**
     - When a call or Activate-all tap **succeeds** inside the Upgrades/Workers sheet, the sheet **closes** and the call **starts** on `focusClock`. It counts **from `sheetCloseComplete` when fired from the sheet** (focusClock advances from the first frame after it), **otherwise from the tap's tick** (AB-14 (ii)).
     - This applies at every viewport where the tab is a sheet. **Docked = `(min-width:960px) and (orientation:landscape)`** (`game/src/ui/app.ts:101`, `styles.css:155`; read-only at ce7d59a). Docked has no sheet, so nothing changes there. A portrait viewport ≥ 960 px wide is still a sheet.
     - `ability_used.in_sheet = true` records it.
     - Edge cases E14 (a)–(d).
11. **Refill→Boost combo (v1.3.6, D-HOP-2026-10-30-39; rc2 AC-RF4 L145).** Exists only when `m4.flags.abilities && m4.flags.rc2Refill`.
   - **Window:** a Boost started **from the Shift sheet** within `combo_window_s` (10) **sim seconds** of a **manual** refill on **that same worker** (`refill_used{by:manual}`), measured from the refill tap to the Boost tap (≤ 10.0 s qualifies; HoQA O-7), is a combo. **v1.3.8 (SG-3, D-PMW-2026-10-30-18):** the window is measured in **sim milliseconds and is inclusive**: a Boost tap with sim elapsed **≤ 10000 ms** since the manual refill tap is in the window; **> 10000 ms is out** (10000 ms = combo, 10001 ms = no combo; 10.05 s = 10050 ms is out). No tick quantisation. **v1.3.7 (PMW 13:37 CET):** an auto refill (`refill_used{by:auto}`) never opens the window, because the combo rewards active management.
   - **Duration:** a combo Boost lasts `combo_boost_duration_s` (45) **focus seconds**, counted from `sheetCloseComplete` (rule 10 "Activation from the sheet", AB-14 (ii)). Any other call, including a Boost outside the window and every card or Activate-all call, lasts `tc_ability_s` (30).
   - **Unchanged:** the cooldown (`readyAt = activatedAt + tc_ability_cd_s`, rule 3), the multipliers (rule 2), eligibility (rule 4), early end (rule 6) and suspension under menus (rule 10). Only the duration changes.
   - Telemetry: still only `ability_used{in_sheet:true}` (no new event; D-HOP-35). **v1.3.8 (D-HOP-2026-10-30-42):** `ability_used` carries `combo:true|false` on every emit, true only when this Boost got the 45 s combo duration; a card-button call (`in_sheet:false`) is always `combo:false`. No window-remaining field (§9).
   - The window is per worker: refilling one worker never makes another worker's Boost a combo.

## 4a. G3 decision: Sweep A (D-HOP-2026-10-24-16; B2 closed)
- **Rule:** Sweep = lay ×1.15 (`tc_ability_w2_lay_mult`) for 30 s on a 300 s cooldown, no level scaling, one rule from F10 up. `tc_ability_w2_mode` = 0 (§13 draft).
- **G3 result** (`research/v2-slices/economy.md` §11, T3 splice, seeds 0–99; SCRATCH, pending re-measure on the harness of record):
  - Sweep A's own income: **0.98 / 0.99 / 1.04%** of passive at F10–19 (optimal / seller15 / casual), **1.31 / 1.51 / 1.49%** at F20–29, 1.48 / 1.47 / 1.47% at F30+. The §4a ≥ 1% at F20+ test passes.
  - Full stack with A, window gate (10-min active ÷ idle): **naive P95 1.77, worst 1.84; Frenzy-holder P95 1.75, worst 1.84** (optimal, 100-seed checkpoint, §10.1; the gate of record is §13.2a, AC-M5A-15). Peak per-sale ×4.51 (F18).
- **Considered, rejected: Sweep B (price ×1.15 on Coop Hand–collected eggs sold within 30 s).** Per §11 it is worth only **0.15–1.21%** of passive (0.2% for the optimal tapper, who collects most eggs by hand), raises the per-sale peak to **×5.19** (vs A's ×4.51), and costs Engineering +0.5–0.75 dd for basket FIFO tagging (`engineering/m5.0-sizing.md` §9.5 edge 4). B ×1.10 was not needed. `tc_ability_w2_price_mult` is not added.
- **Caveat (§11):** A's extra eggs only pay while demand exceeds supply. Re-check after any demand change (Order Board, Rush Hour).

## 5. UI and placement (rc1/main Workers tab; no rc2 sheet in M5.0)
Tokens: `--s-2` = 8 px and `--s-3` = 12 px (`art-ux/layout-spec.md:18`). All interactive targets are **≥ 44 × 44 px**. The two sticky-bar slots are **48 px** tall, because the primary CTA floor is 48 (signoff §1). All gaps between interactive targets are **≥ 8 px**.

**5.1 Sticky top bar (Workers tab)** (v1.2, B1 re-derived from code)
- **Today (RC1 = main after #67):**
  - `.btn.manage-all` is a sticky pill, `width:calc(100% - 24px); margin:0 12px 6px; min-height:44px` (`game/src/ui/styles.css`, selector `.btn.manage-all`).
  - It sits inside `.sheet .body`, which has `padding:var(--s-4)` (16 px a side).
  - `manageAllHtml()` returns `''` when it's hidden (`workers-ui.ts`, `manageAllHtml`). That must become a reserved box.
- **F10+ with ≥1 hired worker:** the bar becomes **one row with two fixed slots** and an 8 px gap.
  - The bar row is the full `.sheet .body` content width with **no extra 12 px margins**, so the slots line up with the cards' edges.
  - At 360 px each slot is (328 − 8) / 2 = **160 px** wide (derivation in §5.1a) and **48 px** tall. Both slots are the same height.
  - **Left slot:** RC1's Manage all. Its behaviour and visibility rules don't change. When those rules hide it, the slot keeps its box (`visibility:hidden`, **not** `display:none`), so the right slot never moves. This fixes the Critic's "Manage all moves under the cursor" finding (`critic/review-m4b-dd223f5-2026-10-19.md`).
  - **Right slot: Activate-all.**
    - Visible label: [bolt] **"Shift calls (N)"**, where N is the number of eligible workers. **Kept by Art (Q7f), and it fits at the true width** (§5.1a).
    - **Art Q7f overrides HoE's B1 label request:** 8 px padding stays, and the labels "Shift calls (N)" / "Manage all (N)" stay at 14 px with a 12 px floor. "Calls (N)" / "Manage (N)" are a **fallback only for localised overflow**.
    - The text is 14 px semibold `--c-ink` on yolk fill. Below that, it uses a 12 px floor and then wraps to 2 lines. Numbers never clip.
    - **No `aria-label`** (WCAG 2.5.3). The accessible name is the visible text. The sentence "Use N ready shift calls" goes in `aria-describedby`, pointing to a visually hidden element.
    - Disabled states: [bolt] "Next call m:ss" / [bolt] "No calls ready" on 50% yolk, with text contrast ≥ 4.5:1. **v1.3.4 (D1):** the names are `Next call` (no digits; the m:ss is an `aria-hidden` `data-cd` span; describedby "Next call ready in m:ss") and `No calls ready`.
    - Slot padding is `0 var(--s-2)` (8 px) **on the two bar slots only**. The base `.btn` is not changed (Art, v1.1.1). The bar icon is 20 px with a 6 px gap.
    - Distinct label, icon and colour: yolk fill, not meadow. The word "Manage" or "all" never appears in it.
- **Below F10:** the bar is unchanged.
- **Labels under 400 px wide:**
  - The left label uses its short form, "Manage all (N)", or "Manage all 0:ss" in cooldown.
  - Both slots use 14 px text, with a 12 px floor and then wrap (Art, v1.1.2). The left label lands on 12 px at 360 (§5.1a).
- **1280 docked:** Activate-all sits directly right of `desk-manage-all` in the Upgrades panel header (`.sheet header`), with an 8 px gap.
  - **v1.3.11 (Art Q8 erratum, Art signed abilities flows Q8 erratum `fc1ca17d` (§4.2 L57, AB-UI-7 L183; art-ux/decisions.md L568–571, 2026-11-05 20:28 CET); D-PMW-2026-11-05-03):** when **Refill is visible** in the docked Upgrades header, Activate-all is a **48 px-high compact button 8 px right of Refill**, not a second row. Its width is content-sized (8 px horizontal padding, 2 px border) and must fit the measured free run (61.953 px on #86 F6 `05a1e014`, 960×600 and 1280×720). Visible content: bolt + `N`, bolt + `4:51` (signed `data-cd` countdown), or bolt + `—`, in place of `Shift calls (N)` / `Next call 4:51` / `No calls ready`. The full exact names stay `Shift calls (N)` / `Next call` / `No calls ready` with the §5.6 describedby, via inline `.sr-in`. No aria-label, no digit in a name, and the bolt is `aria-hidden`. When Refill is not visible, the full signed ≥ 132 px label is kept. Refill is unchanged and never icon-only. The old 132 px occupied-docked requirement is withdrawn (Art AB-UI-7).
  - Both controls are 48 px tall, and the header min-height must be ≥ 48 px plus its padding.
  - HoE measured about 25 px of slack in the 400 px column (§9.4).
  - Manage all never moves when Activate-all changes state.

**5.1a Fit check at 360 px (v1.2; widths are Fredoka 700 advance widths from `game/public/fonts`, and the semibold weight falls back to the 700 file)**
- **True width (reconciling with v1.1's 12 + 164 + 8 + 164 + 12):**
  - v1.1 started from the 360 px viewport. The bar actually lives inside `.sheet .body{padding:var(--s-4)}`: 16 px a side, so the content box is 328, not 336.
  - Below 600 px the sheet is full width (`.sheet{inset:auto 0 0 0}`; the 480 px cap applies only from `@media (min-width:600px)`).
  - **HoE is right** about the two options:
    - Keeping RC1's `.btn.manage-all` 12 px margins gives (328 − 24 − 8) / 2 = 148 px.
    - Dropping them gives (328 − 8) / 2 = 160 px.
  - **The spec drops them, so 160 px is the true number.** The bar row is 16 + 160 + 8 + 160 + 16 = 360.
- **Vertical:** RC1's 48 px slot plus the existing 6 px bottom margin gives a 54 px bar. Nothing else shares the row. The "All workers paused" line sits under it.
- **Label room per slot** at 160 px: 160 − 2 × 2 border (`--bw`) = 156, minus padding. Art's 8 px padding leaves 140; HoE's 12 px proposal leaves 132. Right slot: minus the 20 px icon and 6 px gap, the label gets **114** (Art) or **106** (HoE). Left slot: minus the 44 px ring box and 6 px gap, it gets **90** (Art) or **82** (HoE).

| Slot · label | 14 px | 12 px | Fits at 14, Art 8 px pad (room) | Fits at 14, HoE 12 px pad (room) |
|---|---|---|---|---|
| Right · "Shift calls (4)" | 85.1 | 72.9 | ✓ 28.9 spare (114) | ✓ 20.9 spare (106) |
| Right · "Next call 0:00" | 87.4 | 74.9 | ✓ 26.6 | ✓ 18.6 |
| Right · "No calls ready" (widest) | 90.9 | 77.9 | ✓ 23.1 | ✓ 15.1 |
| Right · HoE alt "Calls (4)" | 52.7 | — | ✓ | ✓ |
| Left · "Manage all (4)" | 90.8 | 77.8 | ✗ 0.8 over (90); ✓ at 12 px, 12.2 spare | ✗ 8.8 over (82); ✓ at 12 px, 4.2 spare |
| Left · "Manage all 0:30" (cooldown, widest) | 99.9 | 85.6 | ✗ at 14; ✓ at 12 px, 4.4 spare | ✗ at 14 and 12 → wraps to 2 lines inside 48 px |
| Left · HoE alt "Manage (4)" / "0:30" | 71.0 / 26.8 | — | ✓ | ✓ |

- **Verdict:** "Shift calls (N)" **fits at the true 160 px width**, with ≥ 15 px spare even at HoE's 12 px padding, so Art's label is kept.
- **Left slot:** "Manage all (N)" needs the 12 px floor that Art already confirmed. With HoE's 12 px padding its cooldown label would wrap.
- **Art Q7f ruling (v1.2.1):** 8 px padding, signed-off labels, with HoE's short labels only as a localisation fallback. The items below were the question:
  - padding 8 (signed off) vs HoE's 12
  - whether to adopt HoE's shorter left label "Manage (N)" / "0:ss" so it stays at 14 px. **PROPOSED, not adopted.**
- HoE's 132 px "⚡ Shift calls (4)" and 177 px "Manage all (3 need it)" were measured at the base 18 px / 24 px-padding tokens with an emoji. v1.1 already removed the emoji, and neither long string is in this spec.
- The `.btn` `min-width:120px` is harmless here, since 160 > 120. AC-M5A-8 enforces no truncation in the real build.

**5.2 Worker card (v1.1.2, Art Q7c = (a)): two rows, 128 px**
- **Row 1:** the avatar (56 px; in rc1, until the m2 avatar ships, a 56 px min-height block) followed by the name, state pill, energy bar and sub-line. The rc1 `.yawn-ov` stays where it is (top-right, `top:6px; right:8px`).
- **Row 2, the action row,** spans the full card content width: **[pause 44×44] 8 px [Manage `flex:1`] 8 px [call `flex:1`]**.
  - Without `m4.flags.pause`, the row is [Manage `flex:1`] 8 px [call `flex:1`].
  - All targets are 44 px tall.
- **Card height = 10 + 56 + 8 + 44 + 10 = 128 px.** This uses rc1's `.wk` 10 px padding, no border, and the 8 px row gap. The m2 card (8 px padding + 2 px outline) also gives 128.
  - The **rc1 card uses the same two-row layout**. This replaces v1.1.1's single-row/wrap fallback of about 121 px.
  - The Grader card may be taller because of its grade line and tier-buy button. The 128 px applies to the other three cards and is the Grader's minimum.
- **No wrapping in the action row:** `white-space:nowrap`. All labels are 14 px Fredoka 700, with 8 px side padding and a 2 px border.
- **Manage label:**
  - Ready: "Manage".
  - **During its cooldown: the time only, "0:ss"** (tabular). This is Art's own m2 countdown string, `m2-workers-layout.md:54` "0:29 … 0:01". It replaces RC1's placeholder "Manage 0:29", which doesn't fit (§5.2a).
  - **APPROVED (Art Q7e).** The accessible name is the visible time, and `aria-describedby` reads "Manage {role}, ready in N s".
- **Call label:**
  - Ready: [bolt] "Rush", "Sweep", "Shout" or "Inspect". The visible text is the accessible name, with no `aria-label`. **v1.3.4 (D2):** the name gains a visually hidden `.sr` role suffix, e.g. `Rush, Market Hand`; full name table in §5.6.
  - Active: **"Active 0:ss"** with a **draining yolk fill bar** (100% → 0% over `tc_ability_s`).
- **Blocked call (Art Q7e, APPROVED):** the reason goes *inside* the disabled button, because a caption outside it would need about 20 px of height that the 128 px card doesn't have (§5.2a).
  - Cooldown: [bolt] "0:ss".
  - Market Hand lockout (Pause G2): `icon-pause.svg` + "0:ss".
  - Asleep / Unpaid / Paused: the word itself, with no icon.
  - The full signoff sentences ("Ready in m:ss", "Ready in 0:ss after a break", no comma, AB-12) move to `aria-describedby`, with **no extra caption**.

**5.2a Action-row fit at 360 px (v1.1.2; measured read-only, Fredoka 700 advance widths from `game/public/fonts/fredoka-latin-700-normal.woff2`)**
- **Content width:** `.sheet .body{padding:var(--s-4)}` (16 px, `game/src/ui/styles.css:107`) gives a 328 px card. `.wk{padding:10px}` (`:179`) gives **308 px of content**.
- **Row widths:** 308 − 44 − 2 × 8 = 248, so **124 px each** for Manage and call. With the Pause flag off, each is 150.
- **Label room inside a 124 px button:** 124 − 4 border − 16 padding = 104.
  - Manage: 104 minus its 44 px ring box (`.manage-ico`, `workers-ui.ts:20`) and 6 px gap (`.btn.manage`, `styles.css:195`) = **54 px**.
  - Call: 104 minus the 20 px icon and 6 px gap = **78 px**.

| Label at 14 px, no wrap | Width | Room | Fits? |
|---|---|---|---|
| Manage "Manage" | 50.0 | 54 | ✓ 4.0 spare |
| Manage countdown "Manage 0:00" (widest digits; "Manage 0:29" = 79.5) | 80.1 | 54 | **✗ 26.1 over** (68.7 even at 12 px) |
| Manage countdown, time only "0:00" (proposed) | 26.8 | 54 | ✓ 27.2 spare |
| Call [bolt] "Inspect" (widest name) | 45.8 | 78 | ✓ 32.2 spare |
| Call "Active 0:00" (worst; "Active 0:29" = 71.6) | 72.2 | 78 | ✓ 5.8 spare |
| Call lockout inside the button: [pause] "Ready in 0:00" | 84.4 | 78 | **✗ 6.4 over** |
| Same, as a caption outside the button (16 px icon + 4 px gap + text, in the 124 px column) | 104.4 | 124 | ✓ by width, ✗ by height: it needs a ≈ 20 px caption line that the 128 px card doesn't have |
| Call lockout, time only: [pause] "0:00" (proposed) | 26.8 | 78 | ✓ 51.2 spare |
| Call blocked words "Paused" / "Unpaid" / "Asleep" | 45.7 / 44.0 / 43.3 | 78 | ✓ |

Result: with the signed-off strings, the call's "Active 0:ss" fits at 14 px with no wrap. The **Manage countdown** and the **"Ready in 0:ss" + icon** do **not** fit at 14 px without wrapping in the 128 px card. The time-only proposals in §5.2 fit with ≥ 27 px spare. Art's decision is needed (Q7e).

**5.3 Farm View:** no new button in M5.0. `nav.actions` already holds the 44 px `farm-manage-all` (`styles.css:205-209`).

**5.4 Ready badge ([bolt] + N pill)**
- **Where:**
  - on the Workers tab label, right after the label text and vertically centred
  - on the Upgrades nav button at the **top-left corner of the icon, offset −4/−4 px**. The existing dot stays top-right, so their boxes never intersect at any nav width.
- **Look:** yolk fill, `--c-ink` 12 px bold, **18 px tall**, min-width 18 px, 2 px white ring.
- **Motion:** never loops. One 300 ms scale-in when N goes from 0 to ≥ 1. With reduced motion, there is no scale-in.
- **Behaviour:**
  - `pointer-events:none`, and never inside or shrinking a 44 px target.
  - Shown when N ≥ 1 and the player is **attended** (rule 9: tab visible and an input in the last 30 s of sim time).
- **Hint priority** (coop-full > nudge > UC25 > **badge** > M4):
  - The badge is hidden while the coop-full hint, a nudge (F3 first hire, coop-hand AC-CF1, L25 hire) or UC25 is on screen.
  - M4 hints never hide the badge, and the badge never appears in the goal bubble.

**5.5 Feedback:** on a call, a 6-dot sparkle on the card. ~~and a 30 s ring on the call button. This uses the existing `ring-cooldown.svg`.~~ **v1.3.4 (D3, Art flow v0.1 §13):** the ring is dropped; the draining yolk fill plus the 4 px `--c-text` progress strip is the only active timer (AC-M5A-18). `ring-cooldown.svg` is not used on the call button. **FX cap (HoE): `m4.fx.maxActive` = 8** in `balance.json`, not a CSV column. When a new FX element would go over the cap, the **oldest active element is dropped** (insertion order). Counted set: `#fx-layer > [data-fx]` (AB-13, **HoE confirmed**; AC-M5A-21). Collection's existing 30-node `#fx-layer` cap evicts **only nodes without `data-fx`**, so tap flyers can never push out ability FX. The sheet auto-close keys on `sheetCloseComplete`, the single deterministic event, never on animation timing (E14, AC-M5A-22). That replaces the earlier "at most 8 FX elements per Activate-all".

**5.6 v1.3.4 errata: Art abilities flows v0.1 (D-PMW-2026-10-30-11, 13:15 CET; record-only)**
- **Source:** `art-ux/m5-abilities-flows.md` v0.1 bbe9d142 (HANDOFF 320eab84), ~~**DRAFT, not signed; sign due Sat 31 Oct 12:00 CET.**~~ **v1.3.8: Art signed m5-abilities-flows v0.2 eb2b3b7d (13:47 CET, sha1 eb2b3b7dbf48c5ee8aed115a327c5dd44dee88ec; pins v1.3.7 314dc0e3; gate card #7); signed flow of record is now **3d238b6b** (sha1 `3d238b6b0cd24f3d03c19a3e34737307f9c32c25`, copy errata 13:58 CET, art-ux/decisions.md L560; FZ-5). Art Q8 (docked-header rects) is non-blocking: a conflict becomes an erratum, not a re-sign.** It **extends** the signed `art-ux/m5-workers-ui-signoff.md` 5910646c and its 16:22/16:25 amendments; it is not a replacement. Everything signed there stands except D1–D4 below (Art §13). No rule, number, flag or threshold changes; every number in the copy is rendered from its tunable (`tc_ability_s`, `tc_ability_cd_s`, the `*_mult` keys, `tc_ability_w4_tier_add`, the Pause 45 s lockout), never hard-coded.
- **Describedby copy (Art §4, accepted as spec text).** The describedby target is a `.sr` node, not a live region; it updates at most once per second and is read on focus.
  | Ability (worker) | Ready-state describedby (effect line) |
  |---|---|
  | Rush (Market Hand) | `30-second boost: Market Hand sales earn 15% more.` |
  | Sweep (Coop Hand) | `30-second boost: hens lay 15% faster.` |
  | Shout (Hawker) | `30-second boost: every sale earns 15% more.` |
  | Inspect (Egg Grader, F18+) | `30-second boost: grade bonus +0.5.` (~~HoE to confirm the shown number, Art Q7~~ **v1.3.8, SG-6: HoE confirmed to HoQA 30 Oct (per HoQA review, qa/m5/test-plan-abilities.md v0.9 O-6) and logged it in D-HOE-20261030-25 (engineering/decisions.md L468, sha1 e0a359a8): "grade bonus +0.5" is the base `tc_ability_w4_tier_add` (0.5), not mood-scaled**) |
  - **Combo-eligible Boost describedby (v1.3.8, SG-4):** for a combo-eligible Boost the effect line says `45-second` instead of `30-second` (rendered from `combo_boost_duration_s`, never hard-coded). **Exact copy (v1.3.9, Art L560, 3d238b6b):** `Combo, 45-second boost: {effect} Starts when the sheet closes.` (Art-owned).
- **Call button states (Art §4.1; D2).** First match wins (rule 4 order). `aria-disabled="true"` for disabled states, never `disabled`. No `aria-label`.
  | State | Visible | DOM order | Accessible name | describedby |
  |---|---|---|---|---|
  | Ready | [bolt] `Rush` | icon · text `Rush` · `.sr` `, Market Hand` | `Rush, Market Hand` | effect line |
  | Active | [ability icon] `Active 0:21` | icon · text `Active` · `data-cd` span · `.sr` `, Rush, Market Hand` | `Active, Rush, Market Hand` | `Ready in m:ss` |
  | Cooldown | [bolt] `4:51` | icon · `.sr` `Rush recharging, Market Hand` · `data-cd` span | `{Call} recharging, {Role}` | `Ready in m:ss` |
  | MH lockout (Pause G2; Rush, Shout) | [pause] `0:45` | icon · `.sr` `Rush after a break, Market Hand` · `data-cd` span | `{Call} after a break, {Role}` | `Ready in 0:ss after a break` |
  | Asleep / Unpaid / Paused | `Asleep` (no icon) | text · `.sr` `, Rush, Market Hand` | `Asleep, Rush, Market Hand`; **v1.3.8 (SG-2): the card call button is exactly `Asleep, {Call}, {Role}` / `Unpaid, {Call}, {Role}` / `Paused, {Call}, {Role}`** (e.g. `Paused, Rush, Market Hand`; the resting worker's Shift-sheet Boost chip uses the same string on a different surface, SG-9) | `Rush is blocked while Market Hand is asleep.` / `… is unpaid.` / `… is on a break.` |
  | Suspended (menu or hide < 60 s) | `Active 0:21` frozen | as Active, `data-cd` stops | unchanged | unchanged |
  - `data-cd` = `m:ss` of `ceil(remaining)`; `0:00` never renders (the state changes that tick). Digits never reach a name.
- **Activate-all (Art §4.2; D1).** ≥ 1 eligible: name `Shift calls (N)`, describedby `Use N ready shift calls`. 0 eligible, one not blocked: visible [bolt] `Next call 4:51`, DOM icon · text `Next call` · `data-cd` span, **name `Next call`**, describedby `Next call ready in m:ss`. All blocked: `No calls ready`, no describedby. *(v1.3.11, Art Q8 erratum `fc1ca17d` §4.2: docked with Refill visible, the visible text is compact bolt + `N` / `4:51` / `—`; these names and describedby are unchanged and carried by inline `.sr-in`; see §5.1 docked.)*
- **D3:** §5.5's 30 s ring is dropped; fill + 4 px strip is the only active timer (AC-M5A-18).
- **D4:** the AC-M5A-8 Active fit set is `0:01`…`0:30`.
- **Q1 (rc2Refill = 1, PMW 13:14 CET):** Activate-all **stays in the Workers tab** right slot (docked: Upgrades header), so AC-M5A-8/9/22 are unchanged. With `rc2Refill` = 1 there is no bulk Refill (AC-RF1); the left slot keeps its 160 px box with `visibility:hidden` and Activate-all moves 0 px (AC-M5A-9). ~~The Shift sheet shows no call controls in v5: the header Activate-all slot and the row Boost slot stay hidden (Workers recommendation).~~ **v1.3.5, ruled by D-HOP-2026-10-30-35 (13:20):** the Shift sheet header Activate-all slot stays hidden (Activate-all stays in the Workers tab), but the **row Boost slot is VISIBLE in v5**, rendered iff `m4.flags.abilities && m4.flags.rc2Refill` (both 1 in ship-set rev 2, 7be8e1db; a specced surface is not cut, D-CEO-20261030-10). The Boost slot is that worker's call: it reuses the in-sheet ability entry (rule 10 "Activation from the sheet", E14 (a)–(d)) and emits only `ability_used{in_sheet:true}`; there is **no new event** (`boost_used` retired, D-HOE-20261030-18). Its states and names follow the call-button table below. ~~Art includes it in the Sat 31 Oct 12:00 CET abilities sign.~~ Included in Art signed m5-abilities-flows v0.2 eb2b3b7d (13:47 CET), now 3d238b6b (FZ-5). If HoE or Art size it at over 1 day, that is a **schedule slip raised to HoP, not a cut**. ~~Not changed by this ruling: the refill→call combo duration stays out of scope (§3), so a Boost lasts `tc_ability_s`.~~ **v1.3.6 (D-HOP-2026-10-30-39):** the combo ships in v5; a Boost lasts `combo_boost_duration_s` (45) inside the combo window, else `tc_ability_s` (30) (rule 11).
  - **Boost timing (v1.3.5, HoQA 13:22 O-7; test plan v0.8 7a8d43e3; same as rule 10 "Activation from the sheet" / AB-14 (ii)):** a successful Boost tap in the Shift sheet closes the sheet, and the call starts on `sheetCloseComplete` on `focusClock`; its duration (30 s, or 45 s if the AC-RF4 combo applies) counts from there. The combo window (≤ 10.0 s) is measured on **sim time** from the refill tap to the Boost tap. Logs `ability_used{in_sheet:true}`. ~~Conflict to rule (HoP): HoQA's plan tests the 45 s combo, but §3 and D-HOP-35 leave the combo out of v5.~~ **Resolved by D-HOP-2026-10-30-39 (13:27): the combo ships in v5** (rule 11, AC-M5A-24).
  - **Boost slot names** (v1.3.5, HoQA 13:22 O-7; v1.3.6: all rows live, including combo-eligible per D-HOP-39; **v1.3.7: Ready and Combo names per Art v0.2 §16 D5/D6**; v1.3.8: Art signed m5-abilities-flows v0.2 ~~eb2b3b7d~~ 3d238b6b). They mirror the call-button names in this section, since the slot fires the worker's call. Names from content only, no `aria-label`, **no digit in any name**; times only in the `aria-hidden` `data-cd` span and describedby.
    ~~| Slot state | Accessible name (visible text + `.sr`) |~~ (v1.3.7 table superseded in v1.3.8 by the mirror below; struck rows: ~~Resting worker `Paused` + `.sr` `, {Role}`~~, ~~Recharging~~, ~~MH lockout~~, ~~Asleep / Unpaid "as on the call button"~~; Ready and Combo names unchanged)
  - **v1.3.8 mirror of Art signed m5-abilities-flows v0.2 ~~eb2b3b7d~~ 3d238b6b §16.3 L240–250 (HoQA SG-9; copied exactly; Art's table wins for the Shift-sheet Boost chip).** First match wins, spec rule 4 order; `aria-disabled="true"`, never `disabled`; no `aria-label`; DOM per sr-markup: icon (`aria-hidden`) · `.lbl` [ text · empty `aria-hidden` `data-cd` span · `.sr-in` ]. Exact-name checks are **case-sensitive** and exact-string (no digit, no space before a comma). `Boost, {Call}, {Role}` replaces the earlier `{Call}, {Role}` Ready proposal, and `Combo` is capitalised (D-HOP-2026-10-30-42).
    | State | Visible (icon + text) | Look | Exact name (no digit, no space before a comma) | describedby |
    |---|---|---|---|---|
    | Ready | `icon-bolt` + `Boost` | yolk, ink 8.6:1 | `Boost, {Call}, {Role}` e.g. `Boost, Rush, Market Hand` | `30-second boost: {effect} Starts when the sheet closes.` |
    | **Combo** (ready, ≤ 10.0 s since this worker's Refill tap) | `ico_boost_combo` + `Combo` | yolk, ink | `{Call}, Combo, {Role}` e.g. `Rush, Combo, Market Hand` | `Combo, 45-second boost: {effect} Starts when the sheet closes.` |
    | Active (frozen while the sheet is open, rule 10) | `ico_ability_{call}` + `m:ss` | white + yolk fill + 4 px ink strip, frozen | `Active, {Call}, {Role}` | `Ready in m:ss` |
    | Cooldown | `icon-bolt` + `m:ss` | disabled #CFC6BA, text #5A4C42 4.88:1 | `{Call} recharging, {Role}` | `Ready in m:ss` |
    | MH lockout | `icon-pause` + `m:ss` | disabled | `{Call} after a break, {Role}` | `Ready in m:ss after a break` |
    | Paused (Rest on; AC-RF4) | `icon-pause` + `Paused` | disabled | `Paused, {Call}, {Role}` | `{Call} is blocked while {Role} is on a break.` |
    | Asleep | `icon-moon-ink` + `Asleep` | disabled | `Asleep, {Call}, {Role}` | `… is asleep.` |
    | Unpaid | `icon-warn` + `Unpaid` | disabled | `Unpaid, {Call}, {Role}` | `… is unpaid.` |
    - PMW notes (v1.3.8, not part of Art's table): the Combo row shows only while the worker was **manually** refilled ≤ `combo_window_s` (≤ 10000 sim ms inclusive, rule 11) ago and its call is ready. A tap on the Paused (resting) chip fires nothing and logs `ability_blocked{reason:"paused"}` (Rest = Pause + restAuto when rc2Refill=1). The resting worker's Boost chip and the Workers-tab card call button (call-button table above, Paused state) **share the string `Paused, {Call}, {Role}` on different surfaces**. `Paused, {Role}` names no element in v5 and is removed (SG-9). The Combo describedby `45-second` wording is Art-owned (SG-4).
  - **Boost placement and layout bar (v1.3.7, D7; Art v0.2 §16.2/§16.8; v1.3.8: Art signed m5-abilities-flows v0.2 ~~eb2b3b7d~~ 3d238b6b):** placement **(b)**: a 44×44 chip in the Rest column with a **visible text label**, never icon-only. The PMW fold test ("row 4 starts above the fold at 360×640") is **withdrawn**: Art rules that the signed v1.0.1 sheet without Boost already starts row 4 at 773 px at 360×640, so no placement can pass. The bar is Art **AB-UI-15**: Boost adds **≤ 4 px per row**, and the Refill action line stays as signed v1.0.1 (Refill ≥ 253 px wide, 48 ±1 tall; Rest 44×44).
  - **Combo cue and test values (v1.3.6, D-HOP-2026-10-30-39):** Art designs the Boost slot at its base state (flat `tc_ability_s` 30 s) and the **combo cue as an add-on** to it (icon plus text, never colour alone), with **no re-layout** of the slot or row; the cue ~~**must be in Art's Sat 31 Oct 12:00 CET abilities sign**~~ **is in Art signed m5-abilities-flows v0.2 ~~eb2b3b7d~~ 3d238b6b** (with the AB-UI-13 update and the Boost slot). HoQA O-7 / Q-AB-N11 cases use these values: `combo_window_s` 10 sim s (refill tap → Boost tap, sim ms inclusive, SG-3; ~~+10.0 s → 45.0 ± 0.5 focus s, +10.1 s → 30.0 ± 0.5 s~~ 10000 ms → 45.0 ± 0.5 focus s; 10001 ms → 30.0 ± 0.5 s; 10.05 s (10050 ms) → out, 30.0 ± 0.5 s), `combo_boost_duration_s` 45 focus s from `sheetCloseComplete`, otherwise `tc_ability_s` 30. Econ models both by Sat 31 Oct 18:00 CET (all-flags-on harness); if Econ changes a value, the ACs follow the CSV of record; a missed model is a schedule slip to HoP, not a cut.
- **Q2 (PMW 13:14 CET):** the rc2 Shift sheet is a **menu for `focusClock` at every width, docked overlay included** (rule 10 / golden-egg R6 list; a closing sheet counts as open until `sheetCloseComplete`). While it is open a running call is **suspended** (no multiplier, time frozen, button shows frozen `Active`), and **cooldowns keep running on sim time**. **Build dependency (HoE 13:15, D-HOE-20261030-18):** the existing menu flag does **not** cover the Shift sheet. On rc/v5 e77fc5c, `src/game.ts:397` defaults the attended probe to `() => false`, `setAttendedProbe` (`:398`) has no caller, and `dialogOpen()` (`src/ui/onboarding.ts:65`) covers only `#modal-layer.open`, `.recovery-layer`, `#rotate-prompt` and `[role=alertdialog]`. The fix is UI's single probe, F6 `overlay.wireAttended` (PR #86): the rc2 Shift sheet registers there as not-attended (menu) at every width, docked included, from open until `sheetCloseComplete`. HoE is adding this to UI's F6 ACs. Until PR #86 lands with that registration, Q2 is not buildable as written. AC-M5A-22's docked no-close rule covers the docked Upgrades panel only. **v1.3.5:** a Boost fired from the Shift sheet follows E14 at every width, docked included (the sheet is a menu everywhere): one close request, the call starts on `sheetCloseComplete`, `in_sheet:true` (PMW reading of D-HOP-35 "reuses the in-sheet entry"). ~~HoE/Art to confirm at docked.~~ **v1.3.6 (HoE 13:32): this is a build AC, AC-M5A-24 "Sheet close callback"**, not a confirmation.
- **Q4:** the Market Hand call keeps the name **`Rush`** in v5. "Rush Hour" is the M5.2 Market demand event only; no v5 surface shows it (Art AB-UI-12). ~~PM Market to run the `Rush` / `Rush Hour` name-collision check before M5.2 (sales-stopped §7.3).~~ **Closed v1.3.6 (PM Market 13:30 CET):** no clash in v5. "Rush Hour" appears only in the M5.2 forward rules (`market/sales-stopped-spec.md` v1.3.23 2bafd9b3 L31, §7.3 L245–248), and PM Market renames before M5.2 (same spec L538, "Rename the MH 'Rush' call before M5.2 Rush Hour ships").
- **§3 scope note:** "The rc2 Shift sheet and charges" was out of scope for M5.0; under D-HOP-2026-10-30-30 `rc2Refill` ships = 1 in v5, so Q1/Q2 above define how calls behave with it. **v1.3.5:** the Shift sheet Boost slot ships in v5 (D-HOP-35). **v1.3.6:** the refill→Boost combo also ships in v5 (D-HOP-39, rule 11).

## 6. Formulas and pacing
- **Uptime** = `tc_ability_s / tc_ability_cd_s` = 30 / 300 = 10% per worker if fired on cooldown.
- **Calls per 7 min session**, fired on cooldown: ⌊420 / 300⌋ + 1 = up to 2 per worker. At F10–F17 (3 workers) that's up to 6 calls, or 2 Activate-all taps.
- **Budget reference** (G3 done on T3, §4a and AC-M5A-15; earlier pre-T3 figure kept for history): v0.3 at these sizes added +9.9–13.6% managed income with the stack under the 2× cap (P95 2.12 *with* Focus, `m4-focus-bulk-cooldown.md:56`). Focus is dropped (R13).
- **Boundary checks:**
  - Grader at tier 5 (×4.0) with Inspect: ×4.5 Working, ×2.75 Tired, no effect Asleep (blocked). No negative or zero factors.
  - `tc_ability_cd_s` < `tc_ability_s` is invalid. `balance.ts` validates `cd_s ≥ s > 0`, `mult ≥ 1`, `tier_add ≥ 0` and `unlock_farm ∈ [0, 30]`.

## 7. Tunables
| key | M5.0 value | source (CSV c7bb783f, by column name) | range | owner/notes |
|---|---|---|---|---|
| `tc_ability_unlock_farm` | 10 | §13 draft column `tc_ability_unlock_farm` (Economy) | 8–12 | pending re-measure on the harness of record |
| `tc_ability_s` | 30 | CSV `tc_ability_s` | locked | v0.3 |
| `tc_ability_cd_s` | 300 | CSV `tc_ability_cd_s` | locked | v0.3 |
| `tc_ability_w1_price_mult` | 1.15 | CSV `tc_ability_w1_price_mult` | locked (fallback 1.10, decisions.md:156-157) | Rush |
| `tc_ability_w2_lay_mult` | 1.15 | CSV `tc_ability_w2_lay_mult` | locked | Sweep A (D-HOP-16) |
| `tc_ability_w2_mode` | 0 (lay) | §13 draft column `tc_ability_w2_mode` | 0 only | Sweep A; 1 (price) rejected (§4a) |
| `tc_ability_w3_price_mult` | 1.15 | CSV `tc_ability_w3_price_mult` | locked | Shout |
| `tc_ability_w4_tier_add` | 0.5 | CSV `tc_ability_w4_tier_add` | locked | Inspect |
| (all Economy values above) | — | §13 drafts `scratch/v2-econ/economy.m50-draft.csv` (sha256 8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b, D-HOP-24; verified), awaiting application | — | **pending re-measure on the harness of record** |
| `combo_window_s` | 10 (sim s) | **proposed** new economy.csv column (D-HOP-2026-10-30-39; rc2 L39) | 5–15 | **proposed, Econ to model by Sat 31 Oct 18:00 CET, all-flags-on harness** (harness Sun 1 Nov 18:00 CET per D-HOP-39); rule 11 window |
| `combo_boost_duration_s` | 45 (focus s) | **proposed** new economy.csv column (D-HOP-2026-10-30-39; rc2 L40, MJ2 L67 caps it at 45) | 30–45 (MJ2) | **proposed, Econ to model by Sat 31 Oct 18:00 CET, all-flags-on harness** (harness Sun 1 Nov 18:00 CET per D-HOP-39); rule 11 duration. ~~rc2 L111 calls it `combo_boost_s`;~~ `combo_boost_duration_s` is the key of record (rc2 v1.3.15 L111 aligned). **Data mapping (14:20 CET, FZ-4, D-HOE-20261030-30, engineering/decisions.md L499–504; D-PMW-2026-10-30-25):** CSV `tc_combo_window_s` (10) / `tc_combo_boost_duration_s` (45), the renames of studio economy.csv cols 112 `combo_window_s` / 113 `combo_boost_s` in Econ's CSV PR, values unchanged; sync-economy.ts:185 maps them to balance.json **`m4.tc.combo_window_s`** / **`m4.tc.combo_boost_duration_s`** (not M5_MAPPED_COLS); code reads only these two paths, no other alias; a sync test asserts both exist when `abilities` && `rc2Refill`. Name only; values, ranges and ACs unchanged |
| `tc_ability_energy_cost` | 0 | §13 draft column `tc_ability_energy_cost` (`tc_` so sync maps it, HoE §9.5(1)) | 0 (M5.0); 10 [P] M5.1 | R10 |
| `m4.flags.abilities` | 1 | **not a CSV column**: a release flag in `balance.json` `m4.flags`, kept by sync (HoE §9.5(2)) | 0/1 | item flag, **default 0** (agreed with HoE) |
| `m4.fx.maxActive` | 8 | **not a CSV column**: `balance.json` (HoE) | — | FX cap, drop the oldest (§5.5) |
| `m4.telemetry.ability_blocked_window_s` | 1.0 (sim s) | **not a CSV column**: `balance.json`, UI/telemetry only (TEL-9) | — | coalescing window |
| `leave_attended_window_s` | 30 | CSV `leave_attended_window_s` (exists, but **not synced or read today**, HoE §9.5(1); needs an explicit mapping or a `tc_` prefix, Economy's choice) | — | attended window (rule 9), in sim seconds |
| `w4_tired_bonus_share` | 0.5 | CSV `w4_tired_bonus_share` | — | Inspect formula, existing |
| `tired_below_pct` / `yawn_at_pct` | 30 / 50 | CSV `tired_below_pct` / `yawn_at_pct` | — | mood thresholds, existing |

## 7a. Proposed CSV column for Economy: `tc_ability_unlock_farm` (draft only; no CSV is edited, D-HOP-2026-10-24-04 item 10)
| Field | Proposal |
|---|---|
| Name | `tc_ability_unlock_farm` (the `tc_` prefix means `scripts/sync-economy.ts:161` maps it to `balance.m4.tc.tc_ability_unlock_farm` with no new sync code) |
| Type | integer, Farm level |
| Default | **10** (R7), the same value on every row L0–L30, like the other `tc_ability_*` columns |
| Placement | append after `tc_ability_w4_tier_add`, or at the end of the header, at Economy's choice; `sync-economy --check` must pass |
| Validation (`config/balance.ts` `validateBalance`) | integer; `0 ≤ v ≤ maxFarmLevel` (30 on today's CSV); identical on every row (sync takes row 0 and warns on a mismatch); fail the build on non-integer or out-of-range values |
| Readers | `sim/workers.ts` eligibility (rule 4 `farmLevel ≥ v`), `sim/actions.ts` (`useAbility` / `activateAll` guard), `ui/workers-ui.ts` (call buttons, two-slot bar), `ui/app.ts` (badge, coach card, `abilities_unlocked` event); tests: AC-M5A-1, AC-M5A-15 |
| Not read by | offline (`sim/offline.ts`: calls never act offline) and save code (no save field depends on it) |
| Companion columns | `tc_ability_energy_cost` (0), `m4.flags.abilities` (flag), and `tc_ability_w2_mode` (0). Drafted by Economy in §13; HoP ruled (D-HOP-16); applied with the M5 CSV PR, pending re-measure on the harness of record |

## 8. Edge cases
- **E1 Hidden or frame gap ≥ 60 s (exactly 60.0 counts), or offline** (v1.2, HoE §9.1):
  - The provisional hidden sim is **discarded**, and the **whole gap is paid as offline**.
  - No ability effects apply during the gap. A running call **ends at the hide**, or at the start of a visible-throttled gap: `ability_ended{cause:"offline"}`, with `effect_s` counted up to that point.
  - Cooldowns tick on `readyAt` (wall clock), so a 10 min absence makes the call ready.
  - **Under 60 s (hide or frame gap):** the sim and sales run live, but the call is **suspended** (no ability multiplier, remaining time frozen) and resumes with its remaining time on return. Cooldowns keep running. Same as rule 10 and AC-M5A-11 (AB-10).
  - The visible-throttled ≥ 60 s path (OS sleep, a frozen visible tab) is treated the same way for M5 timed systems. The legacy 60 s catch-up for coop, customers and wages is unchanged (HoE decision §9.1(a)).
- **E2 Reload mid-call:**
  - A call running at save time stores its remaining focus seconds as `abilities.{id}.activeS`, through the normal autosave, including the existing pagehide save.
  - **On load the call ends** (the reload counts like a ≥ 60 s gap). It logs `ability_ended{cause:"offline", effect_s: ~~tc_ability_s~~ granted − activeS}` once, and the field is cleared. There is no `reload` or `pagehide` cause (HoE TEL-8).
  - *(v1.3.12 erratum, D-PMW-2026-11-05-04, 2026-11-05 22:12 CET, per Architect contract `engineering/reviews/arch-abilities-fireAbility-combo-persist-20261105.md` §4 (22:08 CET; D-HOE-20261105-41))* The running call also stores `abilities.{id}.durS`, its granted focus duration. On load: `granted = fin(durS) && durS > 0 ? durS : tc_ability_s`, capped at `max(tc_ability_s, combo_boost_duration_s)` when that key exists; `activeS` is clamped to [0, granted]; `effect_s = granted − activeS`; then **both `activeS` and `durS` are cleared**. The call still ends, with one `ability_ended{cause:"offline"}`, and never resumes (TEL-8).
  - `readyAt` is saved as an epoch ms per worker and restored.
  - On load a finite, non-negative `readyAt` is clamped to [now, now + `tc_ability_cd_s`], which guards against clock skew. **A negative or non-finite (or non-number) `readyAt` is removed, not clamped:** the field is dropped, and a missing `readyAt` reads as ready (v1.3.5, D-HOP-2026-10-30-38: wording aligned to the code, no code change; the player outcome is the same, the call is ready). Code, read-only, rc/v5 e77fc5c (`/workspace/wt-v5-rcv5-e77fc5c`): `src/save/m5-fields.ts:34` `fin` = finite number `>= 0`; `src/save/m5-fields.ts:71` keeps `readyAt` only when `fin(readyAt)` and clamps it to `[now, now + cdMs]`, else writes the entry back without `readyAt`; `src/sim/clock.ts:27-30` `wallRemainingMs` returns 0 (ready) for a missing or non-finite value and caps every read at `[0, capMs]` (E2b).
- **E2b Clock rollback (v1.2):** the remaining cooldown is capped at `tc_ability_cd_s` (300 s) **on every read**, not only on load.
  - Case: the clock moves back mid-session while the tab is hidden, the offline grant is skipped (`validSavedAt` fails), and a wall-clock `readyAt` would otherwise show more than 300 s.
  - A clock moved forward makes calls ready early. That's accepted, the same as real offline time.
- **E14 Sheet auto-close (D-HOP-12):**
  - **Close hook (HoE v1.2.3):** a successful tap requests the sheet close. The call starts on the close-complete callback, `sheetCloseComplete`, which is one deterministic event when the menu flag clears and the focus clock runs again. Each input event requests at most **one close**.
  - (a) **Already closing:** the request is a no-op. A call fired then starts on the same close-complete callback that is already pending. No second close runs.
  - (b) **Menu reopened mid-call:** the call is suspended under rule 10 (no multiplier, time frozen) and resumes with its remaining time when the menu closes. Reopening never closes anything by itself.
  - (c) **Activate-all:** fires every eligible call in **one pass**, then requests the close **once**. All the calls start on that single close-complete callback. There is one close event, and each call logs `ability_used{via_all:true, in_sheet:true}`.
  - (d) **Blocked tap:** a tap that fires nothing **never reaches the close request**. The sheet stays open, and logs `ability_blocked` as usual. That covers cooldown, lockout, Asleep, Unpaid, Paused, and Activate-all with 0 eligible. The spec has no "Too tired" block: Tired workers can use calls (rule 5). If one is added later, it follows (d).
- **E3 Unpaid:** blocked ("Unpaid"). Going Unpaid mid-call ends it.
- **E4 Asleep:** blocked. Falling asleep mid-call ends it. Manage on an Asleep worker doesn't make the call ready early.
- **E5 Resting / Paused:** ~~Rest doesn't exist in M5.0 (rc2 is M5.1).~~ **v1.3.8 (SG-2):** Rest exists when `m4.flags.rc2Refill` = 1, as `paused:true` + `restAuto` (Rest = Pause + restAuto in v5). A resting worker is blocked like a Paused one: its Shift-sheet Boost chip and its card call button both read `Paused` with name `Paused, {Call}, {Role}` (different surfaces, same string; Art ~~eb2b3b7d~~ 3d238b6b §16.3, SG-9); a tap logs `ability_blocked{reason:"paused"}` (there is no `resting` reason). With `m4.flags.pause` = 1, a Paused worker is blocked ("Paused") and pausing ends its active call (Pause spec rule 6, guard G1). With the flag at 0 the paused clause is inert, and every AC except AC-M5A-4's Paused case still applies.
- **E6 1–2 workers hired** (e.g. a player who skipped the Hawker): calls exist per hired worker. The two-slot bar shows once ≥1 worker is hired at F10+, and Activate-all fires ≥1. This is independent of `manage_all_min_workers` (3) and the rc1 bulk-refill rule, which don't change.
- **E7 Save migration:**
  - *(v1.3.12 erratum, D-PMW-2026-11-05-04, 2026-11-05 22:12 CET, per Architect contract `engineering/reviews/arch-abilities-fireAbility-combo-persist-20261105.md` §4 (22:08 CET; D-HOE-20261105-41))* **`AbilityState { readyAt?: number; activeS?: number; durS?: number }`.** `durS` is the granted focus duration of the running call (`tc_ability_s`, or `combo_boost_duration_s` for a combo). It is persisted only while the call runs and is cleared with `activeS` on load/offline end. A top-level `abilityDurS` on GameState is **rejected** as a persisted shape. There is **no SAVE_VERSION bump**: a save without `durS` gives granted = `tc_ability_s` (today's behaviour).
  - New optional fields: `abilities: Partial<Record<WorkerId, {readyAt:number, activeS?:number}>>`, `abilitiesCoachSeen:boolean` and `abilitiesUnlocked:boolean` (v1.2.1). Defaults are ready, no active call, false and false.
  - **`activeS` (HoE v1.2.2):** optional, with no save-version bump.
    - On read it is clamped to [0, ~~`tc_ability_s`~~ **granted**] (*(v1.3.12 erratum, D-PMW-2026-11-05-04, 2026-11-05 22:12 CET, per Architect contract `engineering/reviews/arch-abilities-fireAbility-combo-persist-20261105.md` §4 (22:08 CET; D-HOE-20261105-41))*: `granted = fin(durS) && durS > 0 ? durS : tc_ability_s`, capped at `max(tc_ability_s, combo_boost_duration_s)` when that key exists). A non-finite value is treated as missing, and missing means no active call.
    - On load, a present `activeS` > 0 logs `ability_ended{cause:"offline"}` **once**, then the field is cleared.
  - An rc1 save that is already at F10+ when it first loads with the flags on fires `abilities_unlocked` once (it has no `abilitiesUnlocked` flag yet).
  - **No SAVE_VERSION bump**, same pattern as `tracksV7`/`wageFracCents` (`engineering/reviews/rc2-workers-buildability.md:59`).
  - rc1 saves load with every call ready.
  - rc2 Refill was never built, so no rc2 saves exist in the wild. Dev or QA saves with rc2 fields (`charges`, `rest`) are ignored by this feature.
  - **Downgrade then upgrade (v1.2, HoE §9.5):** RC1 **preserves unknown fields**. `migrate` passes state through, `step` spreads `{...w0}` and `serialize` writes the whole state.
    - So an older build ignores `abilities` and `abilitiesCoachSeen` but writes them back.
    - On re-upgrade, the saved `readyAt` is read again and clamped (E2/E2b), and the coach card stays seen. This is acceptable.
  - **Flag off then on, in the same build:** the fields are kept but not read while the flag is off. On re-enable the clamp applies, so the calls are usually ready.
- **E8 Grader before F18 / not hired:** no Inspect row or button, and it doesn't count toward N.
- **E9 Hint priority:** see §5.4. Coop-full with Sweep ready: the coop-full hint text doesn't change in M5.0. A "Sweep" CTA inside it is an Art & UX option for v0.3, not in scope.
- **E10 Golden-egg Frenzy overlap** (D-HOP-2026-10-24-06 (e)):
  - Calls **do** stack multiplicatively with Frenzy. With Frenzy (×2 on all sales, golden-egg spec v0.5 / HoE #1) plus Rush and Shout, a Market Hand sale earns ×2 × 1.15 × 1.15 = **×2.645**. A manual sale with Frenzy and Shout earns ×2.3.
  - The "never stack" rule covers only the parked M4-B rewarded boost.
  - The overlap draws from the shared G1 budget (P95 ≤ 2.0, worst seed ≤ 2.25). **Economy must include Frenzy × calls overlap in G3** at 100% catch with Activate-all on cooldown.
  - **v1.2 (HoE §9.3):** the peak Market Hand sale at F18 is about **×4.5 over idle** for up to 30 s: Frenzy 2 × Rush × Shout 1.3225 × Inspect 2.0/1.5 = 1.333 × streak 1.28.
  - G3 **must also model the "hold calls for Frenzy" pattern**: hold calls for up to one cooldown until the next Frenzy. The on-cooldown model alone understates P95.
  - Economy should report Inspect's F18 contribution separately.
  - The fallback knobs are all data: Rush 1.10, the streak cap and `tc_ability_w4_tier_add`.
  - Neither effect extends or shortens the other's timer.
- **E11 Second tab:** the existing single-sim rule applies. Calls only run in the tab that holds the sim.
- **E12 Calls and Manage cooldown:** they're independent. A call never starts or affects `manage_cooldown_s`, and the reverse is also true.
- **E13 M4 flag off** (D-HOP-2026-10-24-06 (d)): calls sit behind `balance.m4.enabled` **and** their item flag `m4.flags.abilities`. Both must be on. Flag-off players see no call UI.

## 9. Telemetry and KPIs
**Events** (proposed for the pinned, never-trimmed set: `ability_used`, `abilities_unlocked`)
- `abilities_unlocked {farm, hired:[ids]}`
- **`worker` values (v1.3.6, HoE 13:32):** every `worker` field below carries the code id `market_hand` | `coop_hand` | `hawker` | `grader`, not `W1`–`W4` (W1–W4 in this spec are role labels only). There is no `manage_used` alias.
- `ability_used {worker, farm, energy_pct, mood, via_all:bool, t_since_ready_s, in_sheet:bool, combo:bool}` (`in_sheet`: the tap happened inside the Upgrades/Workers sheet, which then auto-closed, D-HOP-12)
  - **v1.3.8 (D-HOP-2026-10-30-42):** must match `ability_used` row #10 of PMC telemetry errata v5 ~~rev. 6 (sha1 `83424120ec7c28560c1852e91955b80da8559ab5`)~~ **rev. 7** (`product/collection/telemetry-spec-errata-v5.md`, sha1 `fd7d59214cf5845279beae50f740bde4b7f62985`, frozen `.fd7d5921.md`, pin of record; errata FZ-5), copied: "`worker, farm, energy_pct, mood, via_all, t_since_ready_s, in_sheet, combo`" · "**`combo` bool, always present when abilities = 1 (D-HOP-2026-10-30-42, L1944; D-HOE-25 N-8):** true only when this Boost got the 45 s combo duration. Only `refill_used{by:"manual"}` opens the 10 s window (sim ms, inclusive: ≤ 10000 ms is in); `by:"auto"` never does. Only a Shift-sheet Boost (`in_sheet:true`) qualifies; a card-button call (`in_sheet:false`) stays 30 s and is always `combo:false`. `refill_used.by` and `ability_used.in_sheet` ride pinned events (#5, #10) and are required on every emit, for HoQA's negative cases. The optional window-remaining value ("if cheap") is **not added** unless PMW/HoE spec it."
  - Determinism pins (HoQA): `ability_used.in_sheet` is **false on card-button calls** and **true on Shift-sheet Boosts**; `ability_used.combo` is a bool on **every** emit, `true` only when this Boost got the 45 s `combo_boost_duration_s`; `refill_used.by` is `manual|auto`, and **only `by:manual` opens the window** (≤ 10000 sim ms inclusive, rule 11, SG-3). **No combo window-remaining field** (not needed for the D-HOP-42 metric).
- `ability_blocked {worker, reason:"cooldown"|"asleep"|"unpaid"|"paused"|"lockout", count}`: logged when the player taps a disabled call button. It is coalesced to at most **1 per worker per reason per `m4.telemetry.ability_blocked_window_s` (1.0 s of sim time)**, with a `count` field (TEL-9, HoE). This is a UI/telemetry-only tunable in `balance.json`, not a CSV column. **Session cap (v1.3.8, SG-5; D-HOE-20261030-19 G-1, D-HOE-20261030-23):** at most **50** `ability_blocked` events per session, then exactly **one** `{capped:true}` marker whose cap-count key is **`events`** (coop_full keeps `episodes`), then none. A Boost tap on a resting worker logs reason `paused` (SG-2).
- `ability_ended {worker, cause:"expired"|"paused"|"offline"|"asleep"|"unpaid", effect_s}`. **The causes are final (HoE v1.2.2).** There are no `reload`, `pagehide` or `duration` causes.
  - `effect_s` counts focus seconds.
- `session_end` additions: `ability_uses`, `calls_ready_unused_s`, **`ability_blocked_taps`** (v1.3.8, D-HOE-20261030-23: integer count ≥ 0 of all blocked taps in the session, including those after the 50-event cap). The second is the summed seconds during attended time in which ≥1 worker was eligible and none fired.

**KPIs (F10+ sessions).** Baseline: the Critic/Player L10+ reads (HoP ruling; no L10+ telemetry exists).
| KPI | Target | Gate/source |
|---|---|---|
| Ability uses per session (median) | ≥ 1.5 | v2 slice §5 |
| Sessions with ≥ 1 call | ≥ 60% [P] | — |
| `calls_ready_unused_s` / attended s | ≤ 50% [P] | Too high means the badge isn't being read |
| Optimal active/idle at F10/F18/F24 | mean ≥ 1.5 (G2), P95 ≤ 2.0, worst ≤ 2.25 | D-HOP-2026-10-24-02 (1) |
| Managed/unmanaged F22–24 | ≥ 1.5 | G5 |
| PT-1 (action within 0.5 s, at least every 30 s) | calls count toward it | plan §10 |

## 10. Acceptance criteria
Tested with ?debug=1 setters (§11).
- **AC-M5A-1 Unlock:** at F9, a DOM scan at 360 and 1280 finds 0 elements matching `[data-act^="ability"]`, no badge, and no coach card.
  - At F10 the coach card shows once with title "Shift calls unlocked!", body "Tap [bolt] on a worker for a 30-second boost. Calls recharge on their own." and the single button "Got it".
  - Its box doesn't intersect any visible Buy, Collect or Activate-all box.
  - "Got it" sets `abilitiesCoachSeen`, and the card never returns after a reload. At F10 it finds exactly one call button per hired worker, plus one Activate-all.
- **AC-M5A-2 Effect and duration:** with the tab visible and no menu open (docked 1280, or Farm View at 360 with the sheet closed), each effect applies for 30.0 s ±0.5 s of focus time from activation and then stops (`cause:"expired"`).
  - **Menu suspension (rule 10):** activate, then open Settings at t = 10 s for 20 s.
    - During the 20 s, Market Hand sales carry no ability multiplier, and the button shows a frozen "Active 0:20".
    - After closing, the effect runs another 20.0 ± 0.5 s, so it ends at wall t ≈ 50 s.
    - `readyAt` is still activation + 300 s ± 1, because the cooldown kept running.
 With debug fixed prices, each worker's measured effect matches the §4 rule 2 formula within ±$0.01 per sale: Rush on Market Hand sales only, Shout on manual and Market Hand sales, Sweep on laying, and Inspect at tier 3 Working giving ×3.0.
- **AC-M5A-3 Cooldown:**
  - The button text reads [bolt] "m:ss" (time only, Art Q7e), its `aria-describedby` reads "Ready in m:ss", and it is ready again 300 s ±1 s after activation. The cooldown counts on through a 60 s menu.
  - The cooldown keeps counting through a simulated 10 min offline: on return at t = 610 s it's ready.
- **AC-M5A-4 Blocked states:**
  - An Asleep, Unpaid or (with `m4.flags.pause` = 1) Paused worker has `aria-disabled="true"`, and the text **inside** the 44 px button is exactly "Asleep", "Unpaid" or "Paused" (no icon). Cooldown reads [bolt] "0:ss" and Market Hand lockout reads [pause] "0:ss" inside the button. No text node renders outside the button box. `aria-describedby` carries the full sentence (AB-11, §5.2, Art Q7e).
  - Tapping it changes nothing and logs `ability_blocked` with the matching reason.
- **AC-M5A-5 Tired:** a call at 20% energy applies the full effect, and energy after 30 s equals 20 − 30/9 ±0.1.
- **AC-M5A-6 Early end:** setting a worker Asleep or Unpaid mid-call stops the effect within 1 tick, logs `ability_ended{cause}`, and leaves `readyAt` unchanged.
- **AC-M5A-7 Activate-all:**
  - Set up four workers: W1 Asleep, W2 on cooldown, W3 ready, W4 Unpaid. One tap activates exactly W3 and logs 1 `ability_used{via_all:true}`.
  - With 0 eligible, the button is `aria-disabled` and its text is exactly "Next call m:ss" or "No calls ready", with an `icon-bolt.svg` before it. Text contrast is ≥ 4.5:1.
- **AC-M5A-8 Layout at 360 × 640 and 1280:**
  - The Activate-all box and the Manage all box don't intersect.
  - The horizontal gap between them is 8 ± 1 px. At 360 each is **160 ± 1 px** wide, and both are **48 ± 1 px** tall.
  - **Docked with Refill visible (v1.3.11, Art AB-UI-7 Q8 erratum `fc1ca17d` L183; final-RC check):** compact §5.1 labels (`N` / `4:51` / `—`), 8 ± 1 px right of Refill, 48 ± 1 tall, content width ≤ the measured free run, 0 clip and no header wrap. Without Refill: the full ≥ 132 px label, and toggling Refill never moves the control (AC-M5A-9). Verify the three compact states at 960×600 and 1280×720 in all 3 engines at the final RC.
  - The bar's left and right edges equal the `.sheet .body` content edges (16 px from the viewport) ±1 px.
  - The right label computes 14 px. The left label computes ≥ 12 px.
  - With N = 4 and the longest disabled label, the text in each slot isn't truncated: `scrollWidth ≤ clientWidth`. Its font size is ≥ 12 px.
  - **Card (v1.1.2):**
    - At 360 × 640 each non-Grader card is **128 ± 1 px** tall with the Pause flag on or off.
    - The action row is a second row below the avatar/name row. Its left edge equals the card's content left and its right edge equals content right, ±1 px.
    - Left to right it holds pause (44 × 44 ± 1), then Manage, then call, with 8 ± 1 px gaps.
    - Manage and call compute `flex-grow: 1` and are equal width, 124 ± 1 px; with the Pause flag off they are 150 ± 1.
  - **No wrap or truncation in the action row:** every label computes ≥ 14 px, has one line box (height ≤ 1 line), and has `scrollWidth ≤ clientWidth`. This holds in each state:
    - Manage ready and in cooldown
    - call ready, Active at every value `0:01`…`0:30` (v1.3.4 D4: `0:00` never renders; was ~~"Active at 0:30 and 0:00"~~), cooldown, Market Hand lockout, Asleep, Unpaid and Paused
    - **all four roles**
  - `.yawn-ov` keeps `top:6px; right:8px` and doesn't intersect any action-row box.
- **AC-M5A-9 Stability:** toggling the left control between shown and hidden (N from 1 to 0) changes Activate-all's `getBoundingClientRect()` by 0 px at 360 and 1280.
- **AC-M5A-10 Label distinctness and accessible name (WCAG 2.5.3):**
  - Activate-all has **no `aria-label`**. Its accessible name, computed from the visible text, matches `/^Shift calls \(\d\)$/`, or exactly `Next call` / `No calls ready` when disabled (v1.3.4 D1: no digits in the disabled name, was ~~"Next call m:ss"~~; the time is in `aria-describedby` "Next call ready in m:ss"; N in `Shift calls (N)` is a count and is the one allowed digit). It matches /shift call|call/i and never /manage|refill/i.
  - Its `aria-describedby` target reads "Use N ready shift calls".
  - *(v1.3.11, Art Q8 erratum `fc1ca17d`; final-RC check)* In the docked compact state (Refill visible), the accessible name is the button's text content including the inline `.sr-in` text. It still equals exactly `Shift calls (N)` / `Next call` / `No calls ready`, with no `aria-label`.
  - The left control's name doesn't match /call/i.
  - No UI string in this spec contains U+26A1 (⚡), U+23F8 (⏸) or U+25B6 (▶). The DOM scan checks every text node.
- **AC-M5A-11 Hidden or frame gap ≥ 60 s (exactly 60.0 counts), and short hides:** run through the §11 gap setter, which uses the real hide/show path.
  - **Short hide (rule 10):** a call at 20 s remaining is hidden for 30 s.
    - During the hide, live hidden-sim Market Hand sales carry no ability multiplier.
    - On return it shows "Active 0:20" and runs 20.0 ± 0.5 s more.
    - The cooldown advanced 30 s.
  - **Long gaps:** 59.9 s hidden → suspended, then resumes. 60.0 s and 600 s hidden → ended **at the hide**.
    - Each logs `ability_ended{cause:"offline"}`, with `effect_s` equal to the focus time before the hide (±0.1).
    - The provisional hidden sim is discarded.
  - A visible-throttled 60.0 s frame gap ends the call at the gap start.
  - No `ability_used` and no call effect occurs during any gap. After a 600 s gap, a call that started 30 s before the hide is ready.
- **AC-M5A-12 Reload:**
  - Reloading mid-call shows the call ended, with the same `readyAt` (±1 s).
  - Exactly one `ability_ended{cause:"offline"}` is logged on load, with `effect_s` = 30 − saved `activeS` ±0.1. No `reload` or `pagehide` cause exists in the schema.
  - *(v1.3.12 erratum, D-PMW-2026-11-05-04, 2026-11-05 22:12 CET, per Architect contract `engineering/reviews/arch-abilities-fireAbility-combo-persist-20261105.md` §4 (22:08 CET; D-HOE-20261105-41))* 30 is `tc_ability_s` and applies when no valid `durS` is saved. With a saved `durS`, `effect_s` = granted − clamped `activeS` ±0.1 (granted per E7), and both `activeS` and `durS` are cleared after load.
  - A save with `readyAt` set to now + 3600 s loads clamped to ≤ now + 300 s.
  - **Rollback (E2b):** mid-session, with a debug clock moved back 3600 s while hidden, the displayed and effective remaining cooldown is ≤ 300 s on every read.
- **AC-M5A-13 Badge and priority:**
  - The badge is shown iff N ≥ 1, the tab is visible and there was input in the last 30 s of sim time.
  - With a modal open for 60 s wall-clock straight after an input, the badge is still shown on close, because attended sim time is frozen.
  - **B4, restated against hints that exist on main/RC1** (v1.2): the badge is hidden while the `cooptip` Coop Hand tip (`shouldShowCoopTip`), the onboarding coach (`.coach`) or the Workers explainer is visible. Test each pair.
  - The coop-full > nudge > UC25 > badge > M4 rule applies to the nudges, UC25 and the rc1-b1 coop-full hint **only once they ship**. Those pair tests are N/A for M5.0 until then.
  - It isn't hidden by an M4 hint.
  - It is 18 ± 1 px tall.
  - On the nav button its top-left sits at the icon's top-left −4/−4 ±1 px.
  - Its box never intersects the existing top-right dot at 360, 375 or 1280, and never reduces a 44 px target.
  - With N going 0 → 1, exactly one scale-in animation runs (`animationiteration` count 0). With `prefers-reduced-motion` there is no animation.
- **AC-M5A-14 Migration:**
  - An rc1 save (no `abilities` field) loads at F10+ with every call ready.
  - SAVE_VERSION is unchanged.
  - Loading the new save in the previous build doesn't throw.
- **AC-M5A-15 (sim, Economy G5):**
  - The L0–9 economy trace is byte-identical with the feature on and off.
  - The L10–11 re-run is reported.
  - The G2/G3 band and cap hold with abilities in the stack.
  - Sweep A's F20+ value is reported, and the §4a decision rule is applied and recorded (done, v1.3).
  - **Hold-for-Frenzy pattern** (v1.2): P95 and the worst seed are reported for the optimal hold-calls-for-Frenzy player, as well as for on-cooldown use. The F18 peak (≈ ×4.5) and Inspect's F18 share are reported separately.
  - **Recorded result (v1.3; `economy.md` §10.1/§11, SCRATCH, pending re-measure on the harness of record):**
    - Sweep A: 0.98–1.04% at F10–19, 1.31–1.51% at F20+ → A ships (D-HOP-16).
    - Window gate: the oracle is the X1 oracle in `research/v2-slices/economy.md` §13.2a (seeds 1–200, every window; e.g. worst seed 1.936 optimal/frenzy-holder; ≤ 2.00 P95, ≤ 2.25 worst, ±20% band), for both call policies, Pause on and off. **PASS** (D-HOP-16; §13.2a). The harness-of-record value must fall within its ±20% band (AC-X1).
    - Hold-for-Frenzy triples call–Frenzy overlap (0.88% → 3.49% of F10+ time, worst 5.1%) but casts ≈3× less, so P95 doesn't rise. Cross-term 0.4–0.7% of active coins (worst 1.5–2.1%).
    - Peak per-sale ×4.51 at F18 (Frenzy × Rush × Shout × Inspect × streak, ≤ 30 s). Inspect is ×1.333 of it; 2.9% of passive income at F10–19, 1.4% at F20+.
    - gates.md G1/G2 (L30+ step) and G4 fail at baseline on T3 and are left to the L30+ reshape (§10.2); G3 top-step ≤ 9.7% and G5 workers L10 P95 11.05 / 11.37 PASS.
- **AC-M5A-16 Flag:** with `m4.flags.abilities` = 0, **or** `balance.m4.enabled` = 0, the build is byte-identical to the matching pre-M5 golden (no DOM, no telemetry and no save fields from this spec).
- **AC-M5A-19 Unlock event once per save (AB-7):**
  - Crossing F10 logs exactly 1 `abilities_unlocked` and saves `abilitiesUnlocked: true`.
  - A reload at F10+ logs 0.
  - Dropping to F9 by debug and re-crossing in the same save logs 0.
  - A fresh start (new save) reaching F10 logs 1 again.
- **AC-M5A-20 Blocked coalescing (TEL-9):** 25 taps in 1.0 s of sim time on one Asleep worker produce exactly 1 `ability_blocked{reason:"asleep", count:25}`.
  - A tap on a second worker, or the same worker with a different reason, in the same second is a separate event.
  - With a debug `m4.telemetry.ability_blocked_window_s` = 2.0, the window follows the setting.
  - **Session cap (v1.3.8, SG-5; D-HOE-20261030-23):** drive 60 coalesced windows in one session → exactly **50** `ability_blocked` events, then exactly **one** `{capped:true}` marker (key `events`), then none; per-event `count` unchanged. `session_end.ability_blocked_taps` is an integer ≥ 0 equal to **all** blocked taps, including those after the cap.
- **AC-M5A-21 FX cap (AB-13, HoE confirmed):** an Activate-all with 4 workers plus a Frenzy burst never has more than `m4.fx.maxActive` (8) nodes matching **`#fx-layer > [data-fx]`** in the DOM. When a 9th is added, the oldest is removed; **oldest = insertion order** (DOM order in `#fx-layer`). Collection's existing 30-node `#fx-layer` cap (`app.ts:103-110`) evicts only nodes without `data-fx`; tap flyers carry no `data-fx`.
  - **8 ability FX plus 40 tap flyers** spawned in one burst: all 8 ability FX nodes are still present, and ≤ 30 non-`data-fx` nodes remain.
  - Sheet auto-close timing in these runs keys on `sheetCloseComplete`, the single deterministic event, not animation timing.
- **AC-M5A-22 Sheet auto-close (D-HOP-12):** at 360 × 640 with the Upgrades/Workers sheet open:
  - **Determinism (QA requirement):** "close complete" is the single `sheetCloseComplete` event, which the harness can step past (debug hook). Assertions never depend on animation timing, timeouts or `transitionend` jitter.
  - Run at **360 × 640 and 390 × 844**.
  - Tap a ready Rush. Exactly one close request is issued. After stepping `sheetCloseComplete`, the sheet is closed (`#p-upgrades` hidden), the call is Active, and `focusClock` advances from the next step. Before the event, the call's remaining time is 30.0. The first Market Hand sale after close carries ×1.15.
  - The call **starts no later than `sheetCloseComplete` + 1 frame** and runs **30.0 ± 0.5 s** of focus time from then, with `ability_used{in_sheet:true}` (AB-14 (ii)).
  - **Breakpoint (AB-14 (i)):** at **959 × 600** (sheet) the same tap auto-closes with `in_sheet:true`; at **960 × 600** (docked, landscape) it issues 0 close requests and starts at once with `in_sheet:false`.
  - (a) Tap a call after the close request but before `sheetCloseComplete`: there is still exactly 1 close, and both calls start on that one event.
  - (b) Reopen the sheet at t = 10 s for 15 s: the call is suspended, then resumes and ends at wall t ≈ 45 s.
  - (c) With 3 ready workers, Activate-all logs 3 `ability_used{via_all:true, in_sheet:true}` in one pass, then exactly 1 close request and 1 `sheetCloseComplete`.
  - (d) Tapping a call that is on cooldown, in lockout, Asleep, Unpaid or Paused, or Activate-all with 0 eligible, issues **0** close requests, leaves the sheet open, logs `ability_blocked`, and starts no call.
  - **1280 no-op check:** at 1280 × 800 docked the same taps issue 0 close requests and the call starts at once, with `in_sheet:false`.
  - Every call fired from the sheet logs `ability_used{in_sheet:true}`.
- **AC-M5A-17 Frenzy stacking:**
  - Use debug fixed prices with Frenzy active and Rush and Shout active. A Market Hand sale pays base × 2.645 ±$0.01, and a manual sale pays base × 2.3 ±$0.01.
  - When Rush and Shout end, Frenzy keeps its remaining time (±0.1 s), and the other way round.
  - Under a 10 s menu, both Frenzy and the calls are suspended (no ×2, no ability multiplier), and both resume with their remaining time ±0.1 s (D-HOP-08 #3, D-HOP-10).
  - Economy's G3 report shows the Frenzy × calls overlap included in the G1 numbers.
- **AC-M5A-18 Active state:** an active call button reads "Active 0:ss". Its fill bar width is 100% ±2 at t = 0, 50% ±2 at t = 15 s and 0% at t = 30 s. **v1.3.4 (D3):** the fill and the 4 px progress strip (same width ±2) are the only active timer; no ring element (`ring-cooldown.svg`) renders on or in the call button. Under a menu both freeze. **v1.3.5 (HoQA 13:22 O-3):** "only active timer" means the only timer **graphic** (no ring). The allowed digit sources are exactly two: (1) the visible countdown text, rendered only by the empty `aria-hidden` `data-cd` span's `::after` (Active `0:ss`, the cooldown `m:ss`, the lockout `0:ss`, the disabled Activate-all `Next call m:ss`); (2) the `aria-describedby` text (`Ready in m:ss`, `Ready in 0:ss after a break`, `Next call ready in m:ss`, `Use N ready shift calls`). **Accessible names never contain a digit** (Activate-all's `Shift calls (N)` count is the one exception, AC-M5A-10). Blocked reasons render **inside** the 44 px box (AC-M5A-4); there is no outside caption (AB-11).
- **AC-M5A-23 Call and Activate-all names (v1.3.4, D1/D2, Art F1):** in Chromium, WebKit and Firefox at 360×640, 390×844 and 1280×800 docked, for all four abilities and every §5.6 state:
  - No call or Activate-all control has an `aria-label` attribute; names come from content only (visible text + `.sr` span), the same pattern as failure-cost v0.3.19 4f5bbc5c.
  - DOM order: icon (`aria-hidden`) · text node (where one exists) · the empty `aria-hidden` `data-cd` span · `.sr`.
  - The computed name equals the §5.6 name exactly and contains **no digit** (Activate-all `Shift calls (N)` excepted), read with **CDP `Accessibility.getFullAXTree` in Chromium, and Playwright `ariaSnapshot` in all 3 engines** (v1.3.5, HoQA 13:22 O-1; test plan v0.8 7a8d43e3).
  - **No space before the comma (Art F1):** the computed name never matches `/ ,/` (e.g. `Rush, Market Hand`, never `Rush , Market Hand`). The check is **exact-string on the raw computed name, with no whitespace normalisation** (Art and HoQA confirmed 13:15 CET; NAMENORM withdrawn, closing Art Q5). Build note: the `.sr` suffix must not be computed as a separate block (Art flows v0.1 §9a F1).
  - **v1.3.5 (HoQA 13:20):** for each of the 7 call states (card button and Shift sheet Boost slot) and the 3 Activate-all states × 3 engines × 3 widths: **no `aria-label` attribute on the control, and the exact computed name equals X** (X = the §5.6 name for that state). axe 4.14 `label-content-name-mismatch` is **inapplicable** to content-named controls (it only evaluates elements with an `aria-label`, so it would pass trivially) and is not an oracle for this AC; was ~~"axe 4.14 `label-content-name-mismatch` = 0"~~.
- **AC-M5A-24 Refill→Boost combo (v1.3.6, D-HOP-2026-10-30-39; rule 11):** with `abilities` = 1 and `rc2Refill` = 1, at 360×640, 390×844 and 1280×800 docked:
  - Manually refill a worker in the Shift sheet (`refill_used{by:manual}`), then tap its ready Boost 10.0 s (10000 ms) of sim time later: the sheet closes once, the call starts on `sheetCloseComplete`, and it lasts **45.0 ± 0.5 focus s** from there (`ability_used{in_sheet:true, combo:true}`, one event).
  - ~~The same at 10.1 s sim time: it lasts **30.0 ± 0.5 s**.~~ **v1.3.8 (SG-3, sim ms inclusive):** Boost tap at **10000 ms** after the manual refill tap → combo, 45.0 ± 0.5 focus s, `combo:true`; at **10001 ms** → no combo, **30.0 ± 0.5 s**, `combo:false`; at **10.05 s (10050 ms)** → out, 30.0 ± 0.5 s, `combo:false`. A card call or Activate-all after a refill: 30.0 ± 0.5 s, `combo:false`.
  - Refill worker A, Boost worker B within 10 s: B lasts 30.0 ± 0.5 s.
  - In every case `readyAt` = activation + 300 s ± 1 and the per-sale multiplier matches rule 2 ± $0.01 (cooldown and multipliers unchanged).
  - A sheet reopened mid-combo suspends it (rule 10); it resumes with its remaining time.
  - With `rc2Refill` = 0 or `abilities` = 0: no Boost slot, no combo, every call 30.0 ± 0.5 s.
  - **v1.3.7 (PMW 13:37 CET):** after an **auto** refill (`refill_used{by:auto}`), a Boost within 10.0 s shows `Boost` and lasts 30.0 ± 0.5 s; only `by:manual` opens the window.
  - **Telemetry (v1.3.8, D-HOP-2026-10-30-42; matches PMC errata ~~rev. 6 83424120~~ rev. 7 fd7d5921 row #10, FZ-5):** every `ability_used` carries `combo` as a bool (true only when this Boost got the 45 s duration); `in_sheet` is `false` on card-button calls and `true` on Shift-sheet Boosts; `refill_used.by` is `manual|auto` and only `by:manual` opens the window (≤ 10000 sim ms inclusive); only `in_sheet:true` Boosts can be `combo:true`. No window-remaining field.
  - **Negative case (a) (HoQA, v1.3.8):** a manual refill (`refill_used{by:manual}`) followed by a **card-button** Boost on the same worker within 10 s → lasts **30.0 ± 0.5 s**, with `ability_used{in_sheet:false, combo:false}`.
  - **Negative case (b) (HoQA, v1.3.8):** an **auto** refill (`refill_used{by:auto}`) followed by a **sheet** Boost within 10 s → lasts **30.0 ± 0.5 s**, with `ability_used{in_sheet:true, combo:false}`.
  - Names (v1.3.7, D5/D6): Ready Boost exactly `Boost, {Call}, {Role}` (v1.3.8: replaces the earlier `{Call}, {Role}` Ready proposal, D-HOP-42); combo-eligible exactly `{Call}, Combo, {Role}` (capital C); resting worker exactly `Paused, {Call}, {Role}` (SG-9, Art ~~eb2b3b7d~~ 3d238b6b §16.3 L240–250; all 8 chip states per that table); **exact-name checks are case-sensitive**; no digit and no `aria-label` (AC-M5A-23 method).
  - Layout (v1.3.7, D7): Art AB-UI-15, Boost adds ≤ 4 px per row and the Refill action line equals signed v1.0.1; placement (b) 44×44 chip with visible text label.
  - **Sheet close callback (build AC, HoE 13:32):** the Shift sheet fires exactly **one** `sheetCloseComplete` callback per close at every width, **docked included**; a successful Boost tap closes the sheet, and the call (combo or not) starts on that callback, `ability_used{in_sheet:true}` once.

## 11. Debug setters (?debug=1)
- Set a worker's `readyAt`, or make it ready now.
- Force a call to be active with N seconds remaining.
- Set mood (working, tired, asleep, unpaid).
- Simulate a frame gap of N s **through the real path** (v1.2, HoE §9.1(b)): `onHidden` → wait/advance N s → `onShown`, or a visible frame with an N s gap. **Not** `debugAdvance` (`debug/panel.ts` t60/t600), which simulates the whole span with no 60 s rule.
- Move the debug clock by ±N s (for E2b).
- Fixed-price mode for AC-M5A-2.
- Read the active multipliers.

## 12. Build size and dependencies
- **Size: M, 4.0–4.75 dd eng** (HoE `engineering/m5.0-sizing.md` v1.2 §15 "Totals after §11–§14" (with §0 headline, §11 16:40 and §13): "#4 abilities 3.5–4.25 → 4.0–4.75, D-HOP-12 sheet auto-close"). That includes the **+0.5 dd sheet auto-close** (§11 16:40: ≈ 0.25 close hook on `sheetCloseComplete` + ≈ 0.25 AC-M5A-22 tests at 360/390 and the 1280 no-op). Before it, 3.5–4.25 (§9.7 v1.1: two-slot bar refactor, 1280 placement, coach card, debug setters through the real gap path; the two-row card overlaps B3). Plus 1.5 QA days and 0.5 Art. Shared foundations (F1–F6) are sized separately by HoE.
  - **Per-PR split (HoE `engineering/m5.0-sizing.md` §15a, 17:20; total 4.0–4.75 dd):**
    | PR | Scope | dd |
    |---|---|---|
    | 4a abilities-sim | `abilities` state (readyAt sim time, activeS, focusClock durations, 5 end causes, clamp-on-read), effects in tick/payout/tracks, Activate-all logic, `ability_used`/`ability_ended`/`ability_blocked` (coalesced) telemetry, flag `m4.flags.abilities` | 2.0–2.25 |
    | 4b abilities-ui | Art m2 two-row 128 px card, call buttons + Activate-all at 360/390/1280, badge, FX under the `[data-fx]` cap 8 (the 30-node cap evicts non-`data-fx` only) | 1.5–2.0 |
    | 4c sheet-auto-close | D-HOP-12 close-on-fire, `sheetCloseComplete`, `in_sheet`, AC-M5A-22 | 0.5 |
  - The earlier PM split (sim 1.5–2, card ≈ 1, telemetry ≈ 0.5) is superseded.
- **Totals** (HoE §15 / §0, verbatim):
  - M5.0 engineering total: **29.6–37.1 ≈ 29.5–37 dd** (adds the Sales-stopped chip 2.0–2.25, F1 3–3.75, X5 hooks + BH-m +0.35–0.6)
  - Pause: **2.5–3.0 dd**; with Pause: **≈ 32–40 dd**
  - QA ≈ 11 days; calendar ≈ 13–15 working days with 4 engineers; critical path ≈ 12.5–12.75 d. This work lands on the abilities UI seat, off the critical path.
  - HoE §15 doesn't restate a features (items 1–4) subtotal, so the earlier PM-derived "13.75–16" is dropped.
- **Dependencies:**
  - Build hold lifted (Vadim's go).
  - Economy G3/G5 runs (T3 economy).
  - Art & UX §5 mocks.
  - HoQA test plan.
  - Pause spec: in scope behind `m4.flags.pause`, as the last PR and the first to cut. Rules 4 and 6 hold with the flag on or off.
  - HoE F1 (event framework, attended clock, multiplier registry with `by` attribution), F2 (save/offline) and F3 (config and flags).
  - The PM Collection stack (streak, A1, golden egg) for budget accounting only.
- **Used by:** M5.1 #8 (energy cost; the combo moved to v5 in v1.3.6, D-HOP-39). Market missions ("Use Activate all", `v2-slices/market.md`).

## 13. Open questions
1. ~~G3 Sweep~~ **Resolved** (D-HOP-16): Sweep A. B considered and rejected (§4a).
2. ~~Art & UX labels~~ **Cleared** by the signoff (16:20). The strings, sizes and positions are in §4 rule 1 and §5. Art still supplies `icon-bolt.svg`, `icon-pause.svg` and `icon-resume.svg` (≈ 0.1 d).
3. ~~Frenzy stacking~~ **Resolved** (D-HOP-2026-10-24-06 (e)): only the parked rewarded boost is excluded. Calls stack with Frenzy inside G1. See E10 and AC-M5A-17.
4. **HoE:** frame-gap behaviour for gaps ≥ 60 s. `engineering/m5.0-sizing.md` describes `settleHiddenPeriod()`: under 60 s the sim keeps running; at 60 s or more it pays an offline grant, and HoE F2 ends abilities on that path. So the whole gap is offline. Resolved, provided HoE confirms the earlier "first 60 s simulated" note is obsolete.
5. ~~M4 flag~~ **Resolved** (D-HOP-2026-10-24-06 (d)): calls stay behind `balance.m4.enabled` and `m4.flags.abilities` (E13, AC-M5A-16).
6. ~~Gates before build~~ **Cleared:** HoE, Art, HoQA, Economy G3 and G5-P. Only the pending re-measure on the harness of record remains.
7. **Art:**
   - (a) ~~Coach duration template~~ **Confirmed** (v1.1.1).
   - (b) The lockout reason "after a break" goes in `aria-describedby` (v1.1).
   - (c) ~~Card height~~ **Closed: Q7c = (a)** (v1.1.2). The card is two rows and 128 px for rc1 and m2.
   - (d) ~~Left-slot 14/12 px floor~~ **Confirmed** (v1.1.2), including "Manage all (4)". RC1's coded 16 px overflow is logged as a Minor polish item in status.md.
   - (e) ~~Time-only labels~~ **APPROVED (Art Q7e, v1.2.1):** the time-only labels for the Manage countdown ("0:ss") and for blocked calls ([bolt]/[pause] "0:ss"), shown inside the button (§5.2). The signoff strings don't fit at 14 px in 124 px without wrapping (§5.2a).
   - (f) ~~Padding and labels~~ **Resolved (Art Q7f, v1.2.1):** 8 px padding and the signed-off labels at 14/12 px, with the short labels only as a localisation fallback. This overrides HoE's B1 label request. Original question: bar slot padding, 8 px (signed off) vs HoE's 12 px. Both fit the right label. Also whether to adopt HoE's short left label "Manage (N)" / "0:ss" (PROPOSED, not adopted). Numbers are in §5.1a.
8. ~~B3 CONFLICT~~ **Resolved (v1.2.1): HoE accepts the two-row 128 px card, still 0.5–0.75 d.** History:
   - HoE §9.6 B3 plans to build Art's **m2 3-column card** (56 / 1fr / 84) with call buttons showing the time only.
   - Art has since ruled Q7c = (a): a **two-row 128 px card** with a full-width action row [pause 44] 8 [Manage flex:1] 8 [call flex:1]. This spec follows **Art's decision** (§5.2).
   - HoE must re-plan the card PR to the two-row layout. The +0.5–0.75 dd is probably unchanged; HoE to confirm.
   - The time-only call labels HoE wanted line up with the §5.2 proposal (Q7e).
9. **HoE B-items status (v1.2):**
   - B1 answered on paper (§5.1/5.1a).
   - B2 is Economy G3.
   - B3 is the conflict in Q8.
   - B4 is restated (AC-M5A-13).
   - B5 and B6 are Pause spec items.
   - Non-blocking items done: the §9.1(a)/(b) wording and debug path, the read-time cap (E2b), columns cited by name, flags as `m4.flags.*`, `tc_` prefixes, and the downgrade wording.
   - ~~Still HoE's~~ **All decided by HoE (v1.2.1):**
     - FX cap `m4.fx.maxActive` = 8, dropping the oldest
     - end causes `expired` / `paused` / `offline` (asleep/unpaid flagged above)
     - coalescing at 1 per worker per reason per 1.0 sim s
     - flags `m4.flags.abilities` / `m4.flags.pause`, default 0
10. ~~Workers sheet = menu~~ **Resolved by D-HOP-2026-10-24-12 (v1.2.2):** a successful call tap in the sheet closes it, and the call starts at once.
    - This supersedes the HoE-agreed "start suspended for M5.0, M5.1 decides" position and the ≈ 0.25 d per-menu `freezesFocus` alternative. HoP's ruling wins.
    - `in_sheet` stays on `ability_used`.
    - HoE to size the auto-close. PM expects it to be small, since the existing sheet close path is reused.
11. ~~AB-9~~ **Resolved by D-HOP-2026-10-24-10** (rule 10). Removed as an open question.

## 14. Design-doc review log (skill: `/home/box/agent-data/workflows/design-doc-review/SKILL.md`)
The skill is read-only: it reports and the author fixes. I couldn't delegate, so I ran the game-design, systems, economy and QA lenses myself.

**Review 1 (on v0.1, 16:20): verdict NEEDS REVISION.** Completeness 5/8: Overview ✓, Rules ✓, Tuning ✓, Dependencies partial, Edge cases partial, ACs partial; Player fantasy and Formulas missing.

Blocking items:
1. The ACs weren't testable ("shows the right caption", "doesn't overlap Manage all", "fires exactly the eligible set").
2. Activate-all's placement was a hand-wave ("next to Manage all"). There was no slot model, so the button would shift when Manage all hides, repeating the Critic's moving-target finding.
3. The badge was placed on the Upgrades nav button, which collided with the existing badge dot (m2 layout §3).
4. Value conflict: v0.3 rule 6 says Activate-all is *disabled* when nothing is ready, but v0.1 said it "shows when ≥1 call is ready".
5. The frame-gap rule wasn't reconciled with HoE's engine note.

Recommended revisions:
- Cooldown start wasn't defined (activation vs end).
- No clock-skew clamp.
- Stacking with Frenzy vs the "never stack" rule was unaddressed.
- Telemetry had no fields or KPI targets.
- Grader Inspect × mood wasn't specified.
- CSR fresh start below F10.
- `tc_ability_energy_cost` key missing.
- The second-tab rule.

**Fixes in v0.2:**
- All 15 ACs are measurable.
- §5 adds the two-slot sticky bar with `visibility:hidden` reservation and AC-M5A-9 for stability.
- The badge must not intersect the dot (AC-M5A-13).
- Rule 7 follows v0.3: disabled with a caption.
- Edge case E1 and Q4 cover the frame gap.
- New: rule 3 (cooldown from activation, cited to the sim), the E2 clamp, rule 8 and Q3, §9, the rule 2 formula, rule 1, the `tc_ability_energy_cost` = 0 key, and E11.

**Review 2 (on v0.2, 16:35): verdict APPROVED.** Completeness 8/8.
- **Dependency check:** two-way with the plan #4/#8, the Pause spec and the market missions.
- **Value check against CSV c7bb783f:** the cited columns all match (v1.2: cited by name). The `tc_ability_unlock_farm` and `tc_ability_energy_cost` values aren't in the CSV yet and are marked new.
- **Boundary checks** pass (§6).
- **Carried, non-blocking:** Q1–Q5 need inputs from Economy, Art, HoE and HoP. None of them changes the M5.0 rule set except R15 (Sweep, a scoped v0.3).
- **Scope signal:** M. It reuses locked sizes, and the only new UI is a bar slot, a card button and a badge.
- **Disagreements:** none.

**Review 3 (on v1.0, 16:50; after HoP D-HOP-2026-10-24-04, HoE m5.0-sizing §8.7 and the parent's G3 brief): verdict APPROVED.** Completeness 8/8.
- **HoE §8.7 gaps closed:**
  - Sweep F20+ → §4a decision rule plus a PM recommendation.
  - Rush scope → Market Hand sales only (rule 2).
  - Attended → rule 9 (sim time, tab visible).
  - Paused rules → tied to `m4.flags.pause`.
  - The new column → §7a draft.
- **Value check:** the `leave_attended_window_s` meaning changed from MK-33a "attended" to the ruling's definition. Same 30 s, so no CSV change. No other mismatches against CSV c7bb783f.
- **Newly checked:**
  - The Sweep-P formula has no divide-by-zero.
  - A tagged batch never gets the multiplier twice.
  - The ×1.10 retry is in the range.
- **Remaining blocking for build (not for spec approval):** Economy G3, HoP's approval of the §7a columns, and the Art §5 mocks. These are listed in §12.
- **Size changed** to HoE's figure.
- **Disagreements:** none.

**v1.0.1 (17:15) delta check:** no rule changes. E10, E13, AC-M5A-16 and AC-M5A-17 now match D-HOP-2026-10-24-06 (d) and (e). The AC-M5A-17 figures are consistent with rule 8 (×1.3225) × Frenzy ×2. The review verdict stands: APPROVED.

**v1.1 (16:18) delta check against `art-ux/m5-workers-ui-signoff.md` (Head of Art & UX, 2026-10-24 16:20):** every signoff item is mapped.
- §1 → §5.1/5.1a, AC-M5A-8 and AC-M5A-10
- §2 → §5.2 and AC-M5A-18
- §3 → §5.4 and AC-M5A-13
- §5 → rule 1 and AC-M5A-1
- Global (icons, WCAG) → header, AC-M5A-10

New finding, fixed: the `.btn` 24 px padding would overflow the 164 px slot (§5.1a), so slot padding is now 8 px. Conflicts with the signoff are listed in §13 Q7. The review verdict stands: APPROVED.

**v1.1.1 (16:22) delta check:**
- Art's Q6 answers (2) and (5) and the bar-padding confirmation are folded into §5.1, §5.1a, §5.2, §5.2a, AC-M5A-8 and Q7.
- The measured fits replace the v1.1 estimates.
- Two new findings are logged rather than silently fixed:
  - (i) RC1's left-slot label overflows at its coded 16 px. Fixed by the 14 px rule.
  - (ii) The m2-target card can't stay at 112 px with the row. This is open for Art in Q7c.
- Verdict stands: APPROVED.

**v1.2 (16:30) review delta:** the HoE §9 items were checked one by one (Q9).
- Re-run against the skill's implementability lens: AC-M5A-8, AC-M5A-11, AC-M5A-12 and AC-M5A-13 now name the real code paths and real hints.
- No game rule changed. Only definitions, layout numbers and AC wording changed.
- Verdict: **APPROVED (spec)**. Build readiness is pending HoE's re-check of B1/B3/B4, plus Art Q7e/Q7f and Economy G3.

## 15. HoQA testability v0.2: resolution per ID (abilities; v1.2.1)
| QA ID | Resolution |
|---|---|
| AB-1 | Closed: E1 and rule 10 (a ≥ 60 s gap ends the call at the hide; the provisional sim is discarded; "first 60 s simulated" doesn't apply to M5 timers) |
| AB-2 | Closed (D-HOP-16): Sweep A; B2 closed |
| AB-4 | Open with Economy (columns in the M5 CSV PR) |
| AB-5 | Closed: the left slot is RC1's Manage all. Every c231c02 Refill-bar citation is removed |
| AB-7 | Closed: fires once per save (`abilitiesUnlocked`), again after a fresh start, never on reload. AC-M5A-19 |
| AB-9 | Closed by D-HOP-2026-10-24-10: durations on `focusClock`, suspended under menus and short hides, cooldowns on sim time. Rule 10, AC-M5A-2/11/17. New Q10 covers the Workers-sheet consequence |
| X7a | Closed: Economy G3 done (§4a, AC-M5A-15) |
| TEL-8 | Closed (HoE): no `reload`/`pagehide` causes; across a reload or ≥ 60 s gap the cause is `offline`, logged once on load from saved `activeS`. AC-M5A-12 |
| TEL-9 | Closed (HoE): 1 per worker per reason per 1.0 s of sim time, with `count`. Tunable `m4.telemetry.ability_blocked_window_s`. AC-M5A-20 |

**v1.2.1 (16:36) review delta:**
- **Rule change:** rule 10 (D-HOP-10). Durations now pause under menus and short hides. HoE re-confirmed v1.2 before this ruling, so **HoE must re-check rule 10**.
- Everything else is definitions, telemetry or UI strings. Three new ACs (AC-M5A-19 to 21) and two new save fields (`abilitiesUnlocked`, `activeS`), both optional with no version bump.
- Verdict: **APPROVED (spec)**.

**v1.2.2 (16:39) review delta:**
- HoE's re-check is folded in: the focusClock definition, the `activeS` clamp and the final end causes.
- **Rule change (D-HOP-12):** a successful call tap in the sheet auto-closes it and the call starts at once. New E14 and AC-M5A-22.
- HoE has cleared rule 10. **The auto-close is new, so HoE to confirm its size.**
- Verdict: APPROVED (spec).

**v1.2.3 (16:40) review delta:** sizing and determinism only. The close hook is specified as one deterministic event, and AC-M5A-22 steps it. No rule changes. Verdict: APPROVED (spec).

**v1.2.4 (16:48) review delta:** HoQA text items AB-10 to AB-14 closed. Rule 10's start point is reworded (close-complete when fired from the sheet); a closing sheet counts as a menu. E1, AC-M5A-4/-18/-21/-22 and §5.2/§5.5 are aligned. Open: AB-13's selector is a proposal (HoE). Verdict: APPROVED (spec).

| ID | Resolution (v1.2.4) |
|---|---|
| AB-10 | Closed: E1 under-60 s line now matches rule 10 and AC-M5A-11 (live sim and sales, call suspended, resumes with remaining time, cooldowns run) |
| AB-11 | Closed: blocked reason inside the 44 px button; AC-M5A-4 and AC-M5A-18 have no outside caption; full sentence in `aria-describedby` |
| AB-12 | Closed: "Ready in 0:ss after a break", no comma (§5.2; Pause rule 7 and AC-P9) |
| AB-13 | Closed (HoE confirmed): counted set `#fx-layer > [data-fx]`; oldest = insertion order; Collection's 30 budget unchanged |
| AB-14 | Closed: (i) docked = min-width 960 px and landscape, so 959×600 auto-closes (`in_sheet:true`) and 960×600 doesn't (`in_sheet:false`); (ii) closing sheet = menu; start ≤ close-complete + 1 frame; 30.0 ± 0.5 s |

**v1.3 (16:51) review delta (final):** D-HOP-16 folded in. Rule 2 Sweep = A; B moved to "considered, rejected" (§4a, citing economy.md §11). B2/AB-2/X7a closed. G3 numbers and hold-for-Frenzy recorded in AC-M5A-15. Tunables cite the §13 draft columns by name. AB-13/AB-14 HoE-confirmed; AC-M5A-21 gains the flyer-eviction line. All Economy values are pending re-measure on the harness of record. Verdict: **APPROVED, FINAL**.

**v1.3.1 (17:17) review delta:** sizing only, aligned to HoE §15 (abilities 4.0–4.75 incl. +0.5 auto-close; M5.0 ≈ 29.5–37; with Pause ≈ 32–40). The PM per-PR split is superseded. No rule changes.

**v1.3.2 (17:21) review delta:** CSV draft citation → 8dc90e2b… (D-HOP-24); HoE §15a per-PR split added (4a 2.0–2.25, 4b 1.5–2.0, 4c 0.5). No rule changes.

**v1.3.3 (17:54) review delta:** HoQA E-3, AC-M5A-15 → §13.2a oracle. Wording only.


**v1.3.4 (13:15 CET 2026-10-30) review delta:** record-only errata from Art abilities flows v0.1 bbe9d142 (extends 5910646c): §4 describedby copy, D1–D4, Q1/Q2/Q4 (§5.6), new AC-M5A-23 (names from content, no digits, no space before the comma). No rule changes. Verdict: APPROVED (spec); Art sign pending Sat 31 Oct 12:00 CET.

**v1.3.5 (13:20 CET 2026-10-30) review delta:** D-HOP-2026-10-30-35 (Shift sheet Boost slot visible in v5, `abilities && rc2Refill`, in-sheet entry, `ability_used{in_sheet:true}` only) HoQA 13:20 (axe name-mismatch inapplicable; exact-name + no-`aria-label` oracle) D-HOP-2026-10-30-38 (E2 wording: negative `readyAt` removed, not clamped) and HoQA 13:22 O-1/O-3/O-7 (test plan v0.8 7a8d43e3). No rule or number changes. Verdict: APPROVED (spec).

**v1.3.6 (13:29 CET 2026-10-30) review delta:** D-HOP-2026-10-30-39: the refill→Boost combo ships in v5 (rule 11, two proposed tunables pending Econ, AC-M5A-24, combo-eligible name row live, copy pending Art). Rule addition by HoP ruling; cooldown and multipliers unchanged. Open: Econ model due Sat 31 Oct 18:00 CET (miss = slip to HoP); Art combo cue in the Sat 31 Oct 12:00 CET sign; HoQA re-point O-7/Q-AB-N11 to v1.3.6.

**v1.3.7 (13:38 CET 2026-10-30) review delta:** Art v0.2 §16.8 (Art signed m5-abilities-flows v0.2 eb2b3b7d) D5/D6/D7 (Boost Ready name, capital-C Combo name, fold test → AB-UI-15, placement (b)); PMW 13:37 ruling: manual refill only opens the combo window (rule 11, AC-M5A-24); HoE 13:32 code ids / no `manage_used` / docked callback build AC; Q4 closed. No number changes. Open: ~~Art sign Sat 31 Oct 12:00 CET~~ (closed in v1.3.8: Art signed m5-abilities-flows v0.2 eb2b3b7d); Econ model Sat 31 Oct 18:00 CET; HoQA re-point O-7/Q-AB-N11; rc2 AC-RF4 manual-only wording (rc2 owner).

**v1.3.8 (13:48 CET 2026-10-30) review delta:** telemetry and text only, no layout change to the signed flows, no rule number or tunable changed. Art signed m5-abilities-flows v0.2 eb2b3b7d (13:47, eb2b3b7d; Q8 non-blocking → erratum, not re-sign). D-HOP-2026-10-30-42: `ability_used.combo` bool every emit (§9, AC-M5A-24; PMC errata rev. 6 83424120 row #10), `refill_used.by` manual|auto pin, `in_sheet` false/true pin, HoQA negative cases (a)/(b), Ready `Boost, {Call}, {Role}` replaces `{Call}, {Role}`, capital-C `Combo`, case-sensitive names. HoQA v0.9 SG-1…SG-6 ruled (60ed26a0 unversioned intermediate superseded by v1.3.7/D-PMW-17; resting Boost chip `Paused, {Call}, {Role}` per Art §16.3 mirror (SG-9; same string as the card call button), reason `paused`; E5 Rest exists when rc2Refill=1; window ≤ 10000 sim ms inclusive, 10001 ms out, 10.05 s out; combo describedby `45-second`, Art-owned; `ability_blocked` cap 50 + one `{capped:true}` key `events`, `session_end.ability_blocked_taps`; Inspect +0.5 base, not mood-scaled, per D-HOE-20261030-25). Verdict: APPROVED (spec). Open: HoE re-pin manifest rows 15/18/19 (6daddcca pins v1.3.7); Econ model Sat 31 Oct 18:00 CET; SG-4 exact copy (Art).
