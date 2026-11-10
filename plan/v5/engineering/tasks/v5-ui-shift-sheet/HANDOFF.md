# HANDOFF v5-ui-shift-sheet (2026-11-10 ~01:40 CET, UTC+1)

TASK HoE/v5-ui-shift-sheet · Owner: Senior Engineer, Features & Economy Wiring · Paper only until Thu ~18:00 CET restart · Write scope: this file only.

## Purpose
Build the **Shift sheet UI** (Refill-era sheet that nav/docked Refill, card Manage, and the sales-stopped asleep chip's `· Manage` open). Flag `m4.flags.rc2Refill` = 1 at ship; flag-off must stay byte/DOM-identical to today. Not in the train yet; `origin/rc/v5` `d65391b` has **no** Shift sheet in `src/ui/` (telemetry schema entry only).

## Spec / art refs (verified this turn)
| Doc | Role | Hash (algo) | Sign-off |
|---|---|---|---|
| `product/market/sales-stopped-spec.md` | SS-36 Manage → Shift (L74, L78, L86, L126, L429) | **sha1 `cfff3817…`** = `cfff3817efce93e26969f6527e3b5236d1206e22` (matches HoE/backfill pin; **not** sha256 `7e4d61ae…`, **not** `git hash-object` `321583a9…`) | FROZEN for QA (QA-D-1030-PINFREEZE); ACCEPTED M5.0; Art CONFIRMED rects; **SST-AC13/SS-36 label "Art to sign" still open in gate-acs** (gap) |
| `art-ux/m5-refill-flows.md` v1.0.1 | Shift sheet UI of record (anatomy, RF-UI-1…20, §.lbl/.sr-in) | **sha1 `43828d0b…`** = `43828d0b5c7b4a9939477444a71053492cd1aeb2` | **SIGNED** Head of Art & UX 2026-10-30 13:32 CET (`art-ux/decisions.md` L534); covers gate #6a/#6b/#10 |
| `art-ux/m5-refill-flows.HANDOFF.md` | Art DoD | sha1 `9ac4bc20…` | points at signed 43828d0b |
| `product/workers/rc2-refill-proposal.md` v1.3.16 | Product ACs RF / telemetry | **sha1 `e4d98651…`** (gate #6a pin); AC-RF2 errata body pinned at Art time as **`2fdd84a2`** | PMW freeze + dated errata; HoP APPROVED v1.0 |
| `product/workers/m5.1-lighter-refill-proposal.md` v0.8.14 | Auto-refill rows (AC-LR*) | **sha1 `c4c1a5cd…`** | Design APPROVED (D-HOP-2026-10-24-45); Art wireframe signed |
| `art-ux/rc2-workers-copy.md` | Copy | sha1 `92ab9a76…` | SIGNED |
| `art-ux/m5-layout-rects-960.md` | Rects / SS-17 fit | sha1 `54a59d49…` | Art CONFIRMED |
| `art-ux/wireframes/m51-autorefill-row-360.png` | Auto-refill row | sha1 `bdbbee41…` | signed 2026-10-24 23:15 |
| Fit shots | `art-ux/wireframes/m5-refill-fit-*.png` | — | Art evidence |
| Markup snippet | `art-ux/reviews/m5-refill-axe/sr-markup.md` | — | required `.lbl`+`.sr-in` |

**Missing / open:** no separate "Shift sheet" product doc beyond refill-flows + rc2 proposal. **SS-36 chip label / "Tap to manage." describedby Art sign still marked pending in `product/m5-gate-acs.md` SST-AC13** (flows themselves are signed). Public game assets still lack some icons the sheet/pills need (`icon-moon-ink.svg`, `icon-warn.svg` aliases vs today's `icon-moon.svg`/`icon-warning.svg` — reconcile at build).

## AC list (IDs verbatim — UI-owned / UI-visible)
**From Art `m5-refill-flows` (RF-UI-*):** RF-UI-1, RF-UI-2, RF-UI-3, RF-UI-4, RF-UI-5, RF-UI-6, RF-UI-7, RF-UI-8, RF-UI-9, RF-UI-10, RF-UI-11, RF-UI-12, RF-UI-13, RF-UI-14, RF-UI-15, RF-UI-16, RF-UI-17, RF-UI-18, RF-UI-19, RF-UI-20.

**From gate #6a (RF-AC* ← product AC-RF*):** RF-AC1 (flag-off goldens), RF-AC2 (AC-RF1 no /refill/i outside sheet+nav; card Manage → sheet), RF-AC3 (AC-RF2 refill/charges UI + exact names), RF-AC5 (AC-RF3 sort by workerAtRisk), RF-AC7 (no manage cooldown lockout when flag on — UI must not show Ready-in), RF-AC8 (AC-FC20 card cue + Manage opens sheet), RF-AC9 (AC-RF9 **sheetCloseComplete** one callback/width incl. docked; F6/`registerSheet` not-attended), plus telemetry RF-AC10 fields on open/refill.

**From sales-stopped (chip caller):** **SS-36** / **SST-AC13** (asleep `· Manage` opens Shift focused on that worker's **row heading**; 0 refill spent; no cooldown swap; name = visible text; describedby "Tap to manage.").

**From lighter-refill (sheet Auto-refill row, flag `autoRefill`):** AC-LR17, AC-LR18 (a11y switch row); AR-AC9 toast-on-close; AR-AC10; AR-AC2 (absent when rc2Refill=0).

**Sim-owned (not Features build, but sheet consumes):** AC-RF4/RF-AC4 charges regen, AC-RF6 rest recovery, AC-RF10 manageCdS skip, AC-LR1–16/19–21 auto spend rules — **owner Saves** (manifest row 25 not started).

## UI anatomy / states
- **Title** `Shift`. Portrait: bottom sheet ~75% height, 328px content at 360. Docked 1024/1280: right 400px column, 368px content, 44px close ✕.
- **Sticky header:** `Charges N/2`; while N<2, `Next charge in m:ss` (ceil, never `0:00`).
- **Rows:** hired workers sorted by `workerAtRisk` desc (ties lower energy, then W1→W4); re-sort on open + every 5 s; never within 1 s of a tap; hold re-sort while a row control focused (+1 s after blur).
- **Row:** role heading (focus target) + state pill + `$X/s at risk`; energy / Tired-in / Asleep-in (Paused/Unpaid hide times); Auto-refill switch (autoRefill=1); `[Refill]` (≥48px tall, min-width 253px, flex:1) + pause/Rest toggle (44×44) + Boost slot iff `abilities && rc2Refill`.
- **Refill button states:** Affordable / 0-charge countdown / Rested / Unpaid / Paused≤T / Asleep+clockWage describedby; refused = shake or reduced-motion refusedFlash + cant-afford SFX; success keeps focus.
- **Opener (nav/docked):** opens sheet (never refuses); badge N rules RF-UI-16; no countdown on opener when flag on.
- **Card:** no Refill; `[pause][Manage][call]`; Manage → sheet focused on that worker.
- **Flag-off (`rc2Refill=0`):** no sheet DOM; today's Manage/Refill/#83 behaviour; goldens byte-identical.

## Data / sim API needs (owner: Saves) — gaps on `origin/rc/v5` d65391b
| Need | Status on rc/v5 |
|---|---|
| `m4.flags.rc2Refill` / `autoRefill` keys | present, default 0 |
| Charge pool / regen / `charges` on state | **MISSING** (schema mentions charges_* only on telemetry) |
| `workerAtRisk` / sort key | **MISSING** in src (promised in ss-fatigue SIM-API for Saves) |
| Refill action spending 1 charge → energy 100 | today's `manage` still uses `manageCdS` cooldown path |
| AC-RF10: skip `manageCdS` tick when rc2Refill=1 | **not implemented** |
| `autoRefill` per-worker + tick | **MISSING** |
| Pause toggle in sheet | `paused` + `isPaused` exist (F3); UI Rest control not on sheet |
| Boost / combo (`refillAgoSimMs`) | abilities sim partial; sheet Boost UI not on rc/v5 |
| Emitters: `shift_sheet_opened`, `refill_used`, `rest_toggled`, `autorefill_toggled` | **schema pinned**; **emitters not wired in gameplay** |

Sheet should **read** Saves helpers and call note*/action hooks; UI emits no telemetry of its own (same contract as ss-fatigue).

## Telemetry (schema already on rc/v5)
- `shift_sheet_opened{entry: nav|card|stall_chip|fatigue_chip, sheet_id, stall_id?}` — `stall_id` **iff** `entry==='stall_chip'` (schema invariant L238).
- `refill_used{…, entry_point, sheet_id, stall_id?, …}`; `rest_toggled{…}`; `autorefill_toggled{worker,on,farm_level}`.
- Sales-stall join: chip Manage → `resolved_by: chip_manage` + `shift_sheet_opened{entry:stall_chip}` joined on `sheet_id` to later `refill_used` (SS-36j).

## Flags
- `rc2Refill=1`: sheet + openers + SS-36 Manage path.
- `autoRefill=1` (requires rc2Refill): Auto-refill rows; else not rendered, saved value kept.
- `abilities && rc2Refill`: Boost slot visible (AC-RF4 / D-HOP-35); else omit.
- Flag-off: no sheet module behaviour; openShiftSheet no-op; goldens identical.

## A11y / layout
- Label-in-name: names from content via `.lbl`+`.sr-in`; **no `aria-label`** on row Refill (RF-UI-9/19/20).
- Targets: Refill ≥48px; other controls ≥44px; contrast per RF-UI-12.
- 360×640 fit: 328px content; Refill min-width 253px; 3-engine shots 360/390/1024-docked/1280.
- Reduced motion: no sheet slide; refusedFlash instead of shake; toast fade 150 ms.
- Focus: open → target worker **row heading** in view; close → return focus to `opener`.

## Test plan
- **Unit (vitest):** open/close + `registerSheet('shift')` attendance; sort/re-sort guards; button state matrix; flag-off no-op; openShiftSheet focus restore; stub recording before full DOM.
- **Hosted Chromium browser job** (pattern #111/#116): RF-UI-2/3/4/9/13/16/19/20 + SS-36 focus at 360×640; axe 0; no-digit 0-charge name (CDP); docked ✕ + sheetCloseComplete once.
- Flag-0 goldens must stay byte-identical (RF-AC1).

## Files to touch (build phase; not now)
- **New:** `src/ui/shift-sheet.ts` (export `openShiftSheet`; mount/render), CSS under `styles.css` (`.shift-*` / sheet rows), tests `tests/v5-shift-sheet*.test.ts`, browser script under `scripts/` or existing hosted job.
- **Edit:** `src/ui/workers-ui.ts` / `app.ts` — nav/docked opener + remove Farm Refill bar when flag on; card Manage → `openShiftSheet`; wire `registerSheet('shift')` (overlay API already on rc/v5).
- **Reuse pattern:** Architect breeds sheet (`worktrees/v5-breeds-ui-a` `breeds-mount.ts`: `registerSheet('flock')`, phone vs docked attendance). Prior lifecycle shell exists only off-train in `wt-v5-abilities-shift/src/ui/shift-sheet.ts` (`createShiftSheet` attendance only — **no DOM/charges**; merge-forward or rewrite on rc/v5 tip, do not treat as shipped).
- **Do not invent sim:** block on Saves for charges / workerAtRisk / refill_used emitters.

## Risks / open questions
1. Saves M5.1 refill sim (manifest row 25) not started — largest schedule risk.
2. SS-36 Art sign for chip copy still "pending" in gate-acs while refill-flows are signed.
3. Boost slot couples to abilities UI + combo timing from `sheetCloseComplete` (AC-RF4/RF-AC9).
4. Icon path aliases (moon-ink / warn) vs current public assets.
5. Prior `createShiftSheet` WIP on abilities-shift branch may collide — Features owns full sheet; reconcile ownership with HoE at restart.

---

## ENTRY POINT (AGREED with backfill UI engineer 1d79672c)

Cited from `engineering/tasks/v5-ui-ss-fatigue/HANDOFF.md` ("Shift-sheet hook" line) under D-HOP-2026-11-10-17 / SS-36 (`#5b` chip reads `<Role> asleep · Manage` at `rc2Refill=1`).

```ts
// src/ui/shift-sheet.ts
import type { WorkerId } from '../sim/workers';

/** Opens the Shift sheet focused on `id`'s row heading; on close, returns focus to `opener`.
 *  No-op when m4.flags.rc2Refill === 0 (callers must not call then, but safe if they do). */
export function openShiftSheet(id: WorkerId, opener: HTMLElement): void;
```

**Status: AGREED with 1d79672c** for the two-arg shape, focus-return, and flag-0 no-op.

### COUNTER (spec-forced; telemetry `entry`) — AGREED 2026-11-10 by 1d79672c: `openShiftSheet(id, opener, entry)`; #5b passes 'stall_chip', #11 chip passes 'fatigue_chip'
Pinned schema requires `shift_sheet_opened.entry ∈ {nav,card,stall_chip,fatigue_chip}` and `stall_id` iff `entry==='stall_chip'`. The two-arg hook cannot carry that. **Propose additive 3rd arg (defaultable only if Features owns all non-chip openers and sets entry internally):**

```ts
export type ShiftSheetEntry = 'nav' | 'card' | 'stall_chip' | 'fatigue_chip';
export function openShiftSheet(
  id: WorkerId,
  opener: HTMLElement,
  entry: ShiftSheetEntry, // REQUIRED for correct shift_sheet_opened / refill_used.entry_point
): void;
```

- Chip `#5b` passes `entry: 'stall_chip'` (and sim already has `stallId` for the optional field).
- Fatigue `#11` Manage passes `'fatigue_chip'`.
- Features' own nav/card openers pass `'nav'` / `'card'`.
- Until agreed, treat two-arg as the public chip contract and keep `entry` as an **internal/Features-owned** overload — but SS-36j / RF-AC10 fail without it. **1d79672c ACKED the required 3rd arg (2026-11-10); recorded AGREED in v5-ui-ss-fatigue/HANDOFF.md.**

### Mount / register
- Module mounts once from app (or flag-guarded import): `registerSheet('shift')` → not-attended from `opened()` through `closeComplete()` at **every** width incl. docked (AC-RF9 / D-HOE-19).
- `openShiftSheet` scrolls the worker's **row heading** into view and focuses it (RF-UI-3 / SS-36).

### Stub before the sheet exists (for #5b tests)
```ts
// until Shift DOM lands: exported stub
const _calls: { id: WorkerId; opener: HTMLElement; entry?: ShiftSheetEntry }[] = [];
export function openShiftSheet(id: WorkerId, opener: HTMLElement, entry?: ShiftSheetEntry) {
  if (!flagOn(b, 'rc2Refill')) return;
  _calls.push({ id, opener, entry });
  // no DOM; tests assert _calls / __openShiftSheetCalls
}
export const __shiftSheetOpenCallsForTests = () => _calls.slice();
```
Backfill wires chip Manage → `openShiftSheet(causeWorkerId, chipEl, 'stall_chip')` and asserts the stub recorded the call + focus restore contract once real close exists.

---

## Sizing (engineer hours → Ready)
**18 h** (±3) Features UI to Ready, **assuming Saves charges / workerAtRisk / refill actions + emitters are available** (or thinly stubbed behind the flag for UI-first). Reasoning: ~20 RF-UI ACs + opener/card rewires + exact-name markup + 360/docked + hosted Chromium/aXe, patterned on breeds sheet; Boost/combo is the main overrun (+3–5 h if abilities surface slips).

**Blocked add:** +8–12 h calendar if Saves row 25 has not landed (cannot grade RF-AC3/4/5 spends).

### Queue vs F6 (6 h) → streak/tapCoins (11 h)
**Recommend Shift sheet BEFORE streak, and ahead of or parallel with F6 rebuild:**  
`Shift sheet (18 h) → F6 overlay rebuild (6 h) → streak/tapCoins (11 h)`.

Reason: SS-36 / `#5b` Manage at `rc2Refill=1` is freeze-critical and blocked on this sheet; `registerSheet` already exists on `origin/rc/v5` (slim overlay), so Shift does **not** hard-depend on the F6 spots/registry rebuild (golden/streak/Broody do). F6 can follow for those mounts; streak stays after F6.

## HoE RULINGS (2026-11-10)
- Queue (HoE): F6 (6 h) → Shift (18 h) → streak (11 h). F6 unblocks Generalist golden + streak.
- Saves inputs: workerAtRisk/emitters = TASK HoE/v5-risk-helpers; refill/charges being confirmed with Saves; expected landed before Shift starts. Code against pinned contract `engineering/tasks/v5-ui-ss-fatigue/SIM-API.md`.
- Entry point: required 3rd arg `openShiftSheet(id, opener, entry)` APPROVED by HoE.
- SST-AC13: HoP ruled the Art check = SS-17 three-engine shots; no separate Art sign (HoQA to re-cite).
- Paper only until Thu ~18:00 CET.
- SIM-API.md sha256 at pin read: 3a4b62a7868a613d592a4624f24a3b6a53c72155586e389b97135713af09b495
- ART PIN (HoE 2026-11-10, for SS-36 Manage / Shift sheet): `art-ux/m5-abilities-flows.md` sha1 `fc1ca17d0013039d37638b49d67763fc1deb2dfe` (v0.2 SIGNED + Q8 erratum 2026-11-05: §4.2 E-2d compact docked header, 48 px, 8 px right of Refill; docked labels bolt+N / bolt+m:ss / bolt+—; full names via `.sr-in`, no aria-label). Cite this in the PR body alongside m5-refill-flows.md.

## Questions for Saves (G0-API.md read 2026-11-10 ~03:40 CET; Features, paper only)
**Pin check first:** the parent cited G0-API.md **b456e6eb**, and no hash of the file on disk matches it. At 03:40 the file reads sha256 `75cf152e…`, sha1 `fc35f9d4…`, git blob `b77ee934…`, mtime 03:27, which includes §11, the D-HOE-57 amendment. The questions below are against that 03:27 revision. Separately, `v5-ui-ss-fatigue/SIM-API.md` now reads sha256 `ccbbe6ec…` (it carries "Changes 03:25"), not the pinned `3a4b62a7`. Which revisions are of record for the Architect's G0?

1. **Game wrappers (what the sheet calls).** §3 gives pure reducers returning `{state, events}`. The UI only calls `Game`. What are the exact Game method names and return shapes for `noteShiftSheetOpened` (the UI needs `sheetId` back), `refillWorker` (the UI needs `{ok:false, reason}` for the refusal shake/refusedFlash plus the cant-afford SFX), `setRest`, `setAutoRefill` and `takeAutoRefillToast`? Proposal: `g.openShiftSheet(entry, stallId?) → sheetId`, `g.refill(id, ctx) → {ok} | {ok:false, reason}`, `g.setRest(id, on, ctx)`, `g.setAutoRefill(id, on)`, `g.takeAutoRefillToast()`.
2. **RefillCtx lifetime.** I plan for the UI to build ONE `RefillCtx {sheetId, entryPoint, stallId?}` at open and pass that same object to every refill/Rest call until `closeComplete`. So a sheet opened from the stall chip tags every later `refill_used` with `entry_point:'stall_chip'` and the `stall_id` (SS-36j join). Is that the intended semantics, or should `entry_point` after the first action change?
3. **Where `stallId` comes from on the chip path.** `openShiftSheet(id, opener, entry)` (agreed with 1d79672c and HoE) has no stallId parameter. At `entry==='stall_chip'`, should Features read it from `StallView.stallId` (SIM-API) at open time, or do you want a 4th arg? Proposal: read `StallView.stallId` inside openShiftSheet, so the agreed signature doesn't change. Also, who calls `noteStallChipTap(s,'manage')`: the chip (1d79672c) before `openShiftSheet`, or `openShiftSheet` itself? It must be exactly one of them, so the event isn't emitted twice.
4. **Button-state mapping.** Art has these Refill states: Affordable / 0-charge countdown / Rested / Unpaid / Paused≤T / Asleep(+clockWage describedby). My mapping: `above_threshold` → Rested (Active and Paused, per §8 7.8); `no_charges` → countdown from `chargesView().nextChargeMs`; `unpaid` → Unpaid. `ok:true` + paused → Paused≤T, and `ok:true` + asleep → Asleep, with the UI reading worker state for those last two. `not_hired` never renders, because `shiftOrder` is hired-only. Please confirm. Does the UI also need `refill_threshold_pct` from a view, or is "Rested" text-only (RF-UI copy has no number)?
5. **Countdown rounding.** The header reads `Next charge in m:ss` with ceil, and never `0:00`. Can `nextChargeMs` be ≤ 0 below the cap on a rendered frame? The sanitiser clamps to [1, regen] on load, but what happens between ticks? Also, it's in sim ms: while the sheet is open under a modal it still regens (G-5), so the UI shows the sim value as is. Confirm.
6. **Rest gating view.** §9 7.5 gates Rest on the pause flag + `tc_pause_unlock_farm`, and B5 `callLockoutS` applies on resume. Can I have a pure `restEligibility(s, id, b): {ok:true} | {ok:false, reason: 'flag_off'|'farm_locked'|'unpaid'|…}`, so the 44×44 Rest toggle can hide or disable without re-deriving the rules in the UI?
7. **Per-row times.** Rows show energy plus Tired-in / Asleep-in (hidden for Paused/Unpaid) and `$X/s at risk` (`workerAtRisk`, SIM-API). Which view supplies Tired-in / Asleep-in at rc2Refill=1? The existing workers-ui helpers, or a new refill view? Rest changes the recovery rate (`rest_recovery_mult`), so the UI must not compute these locally.
8. **Auto-refill toast timing (AR-AC9 / AC-LR14).** The toast is drained on sheet `closeComplete`. What happens to auto refills while the sheet is NOT open? Does `autoToastQueue` accumulate until the next close, or is there a separate drain point (e.g. any frame with no sheet open)? `refillSession` is session-only, so a reload drops the queue. Is that intended?
9. **Charges materialisation (G-3).** Before the first rc2Refill=1 tick with a hire, what does `chargesView` return: `{charges: start_charges, cap, nextChargeMs: null}`, or the flag_off/empty state? The opener badge (RF-UI-16) renders before the first tick.
10. **Boost slot.** `refillAgoSimMs(s,id)` goes to `fireAbility`. Will the combo window also be readable from a view, so the slot can show the combo state? Or is that #116's call entirely (sheet passes through only)?
- D-HOE-59 (2026-11-10 03:48): 'asleep_banner' approved for shift_sheet_opened.entry + refill_used/rest_toggled.entry_point (Rule 3 Asleep banner Manage, lane U #5b). Keep the union at the pinned four until the PMW/PMC errata lands; then add the value + RF-AC13 enum test update in ONE commit.

## BUILD (Features, 2026-11-10 ~04:08 CET): branch `feat/v5-ui-shift-sheet` @ 8f96091 (ON ORIGIN), worktree /workspace/wt-v5-ui-shift-sheet
**Pins (sha256, of record):** G0-API.md **rev 6 sha256 5225aab8** (§12 answers; §9–§11 supersede §8 where they overlap) · SIM-API.md **rev 3 sha256 38bfc0d1** (setUiGates, int stallId from #128 @ b7a562f8) · Art m5-refill-flows.md v1.0.1 (sha1 43828d0b, Art pin as issued) · m5-abilities-flows.md (sha1 fc1ca17d, §16 Boost / Q8). Superseded reads: G0 7256acb8 / 75cf152e, SIM-API a9b2c8d4 / ccbbe6ec.
**Base:** feat/v5-f6-rebuild 7a72faa (F6 registerSheet/overlay) + merge commit e5cbe51 of origin/rc/v5 **68f58c0** (#126). Clean merge.
**Built (focused vitest tests/v5-shift-sheet.test.ts 31/31, tsc 0; browser author check 3 engines × 360/390/1280: chromium 58/58, firefox 52/52, webkit 52/52):**
- `src/ui/shift-sheet.ts`: `openShiftSheet(id, opener, entry)` with `ShiftSheetEntry = nav|card|stall_chip|fatigue_chip` ('asleep_banner' waits for D-HOE-59). It focuses the row heading, returns focus to the opener on closeComplete, and is a no-op at rc2Refill=0 or when unmounted. Sheet shell (dialog; ✕ 44px, Escape; portrait 75% / docked 400 px right column; content 328 / 358 / 368), sticky header `Charges N/cap` + `Next charge in` data-cd, and rows (heading, pill, at-risk, energy, Auto-refill switch iff autoRefill, Refill + Rest 44×44, Boost slot iff abilities). §8.2 markup is exact; names are verified in CDP and Playwright on all 3 engines. Refused taps shake (refusedFlash under rm) + cantAfford. Re-sort gate (5 s / 1 s tap / focus hold + 1 s) and focus-preserving DOM moves. `registerSheet('shift')` opened→closeComplete after the 200 ms slide (instant under rm). One coalesced auto-refill toast on close. Opener view (RF-UI-16 badge/name). CSS is injected on the first flag-on open only, so styles.css and the flag-0 build are untouched.
- `src/ui/shift-adapter.ts`: a thin `ShiftSim` with the G0/SIM-API names verbatim; `bindShiftSim(g, b, views)`; `NULL_SHIFT_SIM`.
- Test double tests/fixtures/shift/fake-sim.ts; harness tests/fixtures/shift/harness; scripts/v5-shift-sheet-browser.mjs (logs HEAD + porcelain). Evidence /workspace/artifacts/v5-ui-shift-sheet-8f96091/.
**Per Saves answer (§12):** Q1 wrapper names → `ShiftGame` (refill/setRest return {ok}|{ok:false,reason}), BUILT. Q2 one RefillCtx open→closeComplete, BUILT + test. Q3 stallId read from StallView at stall_chip only; the sheet never calls noteStallChipTap, BUILT + test. Q4 button state from refillEligibility.reason only, BUILT. Q5 max(0,ceil(ms/1000)) m:ss from the sim value, no UI timer, BUILT. **Note:** this can show `0:00` between a regen boundary and the next tick, while Art RF-UI-4 says "never 0:00"; Art/HoQA to ack. Q8 drained at closeComplete, BUILT. Q9 no Next line at cap/null, BUILT. Q10 Boost slot passes refillAgoSimMs to a #116 hook, slot BUILT (chip content is #116's).
**Still TODO markers:** TODO(Saves G2 Q6) restEligibility (until G2, Rest stays enabled and setRest {ok:false} refuses). TODO(Saves G2 Q7) restEtas, so rows show `Energy N%` only until G2. TODO(Saves G1) bind real views: src/sim/refill.ts and src/econ/stall.ts are not on this base. TODO(Saves R1) the Rested copy uses #83 manage_prompt_threshold until refill_threshold_pct lands.
**Not built yet (next):** app.ts wiring (nav/docked opener, card Manage → openShiftSheet, Farm Refill bar removal at flag 1). This is held until the G1 sim binding exists, because mounting with NULL_SHIFT_SIM shows an empty sheet; flag-0 app.ts is untouched so far. Also: the clockWage Asleep describedby (needs the Hire 2 view), the shift_sheet toast via app showToast, the worker.refill / icon-pause / icon-moon-ink / icon-warn assets (harness uses icon-warning.svg; the pause icon 404s, it's a missing asset), and axe runs.

## PARKED (Features, 2026-11-10 ~04:12 CET; D-CEO-17 65% usage stop). Branch tip `feat/v5-ui-shift-sheet` @ c85f656 (ON ORIGIN).
- **Stopped before:** axe run (not started), refill-sim binding (not started). Only checked: `origin/saves/v5-refill-sim` @ 7cbbb9b has **no `src/sim/refill.ts` yet**: G1 is WIP with save tests and R1 column mapping only. The binding is NOT proven; it's the first job at the restart, in a separate local branch, without merging Saves' WIP.
- **Rulings to apply at the restart:**
  - `'asleep_banner'` approved (D-HOP-2026-11-10-23; no stall_id; opens on the named worker) and `'fatigue_bubble'` (Rule 4 bubble) approved engineering-side (D-HOE-59 amendment). Both go to HoP for errata rev 16. **After rev 16 lands, add both to `ShiftSheetEntry` together with the RF-AC13 test, in ONE commit.**
  - **D-HOE-60:** the sim keeps `max(0, ceil(ms/1000))`. The UI shows a **floor of 0:01, never 0:00**. Implement at the restart in `fmtChargeCountdown` and its test, where today's test expects `0:00`. Art may overrule at the restart.
- F6 7a72faa is queued with HoQA for the restart.
- Next at the restart, in order: G1 binding proof → axe on 3 engines → D-HOE-60 → rev-16 entries → app.ts openers (held until real sim binding).
