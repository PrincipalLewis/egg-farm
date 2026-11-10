# #116 abilities UI: Architect CHANGES recheck at a3c6dc5 (Draft)

Date: 2026-11-06 02:08 CET (Europe/Belgrade, UTC+1)  
Lane: architect · Prior: `abilities-ui-dc3c60f-architect.md` (**CHANGES**)  
Exact tip: `a3c6dc510b5f0126a437fc13b9a5788ef8d34206` · tree `639662d15dc13703f4aad4a6d3aef0ccdea235f4`  
Content commit: `11f6b551a288825c64c161882192f3202cd30c94` (same tree; `a3c6dc5` empty Features attribution)  
Prior tip: `dc3c60f390fd2da4cebf0cc9075df9a59d17dbc0`  
Artifact: `/workspace/artifacts/v5-116-architect-changes-a3c6dc5/` (+ studio mirror)  
Delta vs prior: **2 files** `src/ui/app.ts` + `tests/v5-abilities-ui.test.ts` (+157/−8)  
Writes: this addendum + `engineering/status.md` only. **No** code / PR post / Ready / push / merge / messages. **Not** publishing authority.

## Verdict: **CHANGES** (happy-path closed; cancel/reopen/resize still open)

Prior blocking items **1–2 are fixed on the happy path**. Independent DOM/event probes (not only harness `ui.sheetCloseComplete`) show **attendance / freeze hazards remain** on cancel·reopen and docked mid-close — in scope of this recheck request.

## Closed (prior CHANGES)

| # | Finding | Evidence at `a3c6dc5` |
|---|---|---|
| 1 | Portrait sheet fire held until `sheetCloseComplete` | `registerSheet('upgrades')` (`app.ts:188`); `closeUpgradesAfterAbility` opens handle, sets `upgradesClosePending`, clears `open` but keeps `#p-upgrades` visible, drops `#panel-layer.open` (`239–258`); freeze via `anySheetOpen()` in `makeDialogOpen` while `open===null`. `transitionend` filter `target===sheetEl && propertyName==='transform'` (`254–257`); `rm()` → immediate complete (`253`); harness `sheetCloseComplete` exported (`984`). Product tests AB-14 fire+activateAll hold until step — **PASS**. |
| 2 | `ability_blocked` from disabled chrome | `aria-disabled` early returns **removed** (`268–278`). Asleep product test emits `ability_blocked{reason:asleep}` — **PASS**. |

Also verified from source (no new CHANGES):

- **Active tap:** `abilityEligibility` does not special-case `activeS`; post-fire `readyAt` ⇒ `cooldown` block + `ability_blocked` (direct, not viaAll). OK.
- **Zero-fire Activate-all:** `activateAll` with no eligible → state identity → `afterAbilityFire(!ok)` shake, no close; viaAll skips stay silent (spec). OK.
- **Flag0 / QA seam:** `sheetCloseComplete` is mountApp return (like `openPanel`), not a `window.*` release hook; close path gated by `abilityInSheet` (abilities chrome). No balance/flag/sim/schema delta. Shipping flags still 0.
- **Early resume on happy path:** no — `open=null` alone does not resume while `upgradesSheet` open. Harness / transitionend / rm complete correctly in product tests.

## Open — required before APPROVE

### O1. Docked / resize mid-close → **dangling freeze** (blocking)

`closeUpgradesAfterAbility` arms only `transitionend` on `transform`. Docked CSS forces `.sheet{transform:none!important}` (`styles.css` ~175–176). Rotating / matching docked during `upgradesClosePending` can suppress or skip the transform transition → **no `transitionend`**, `anySheetOpen()` stays true, `probe()` stays false.

**Probe (Architect, not product suite):** after portrait fire then `matchMedia` docked=true, wait 50ms → `sheets:true, attended:false` (`evidence/.../edge-probe.txt` DOCKED line).

**Fix direction:** on `docked` change (and/or `visibilitychange` / hard cancel), if `upgradesClosePending` call `sheetCloseComplete()` (same as `openPanel` cancel for non-upgrades). Do not rely on transform transition alone when docked CSS nullifies it.

### O2. Reopen Upgrades while close pending → **stale listener / broken DOM** (blocking)

`openPanel` only auto-completes when `upgradesClosePending && p !== 'upgrades'` (`app.ts:200`). Reopen `p==='upgrades'` leaves pending + `transitionend` armed. A late `transitionend` then runs `sheetCloseComplete` → **hides `#p-upgrades` while `#panel-layer.open` and logical `open==='upgrades'`**.

**Probe:** fire → `openPanel('upgrades')` → synth `transitionend` → `hidden:true, panelOpen:true, sheets:false` (`edge-reopen.txt` REOPEN line). Attendance may still freeze via `open==='upgrades'`, but the sheet is invisible / UX stuck until another navigation.

**Fix direction:** if pending and `p==='upgrades'`, **cancel** pending (remove listener, `upgradesClosePending=false`, `closeComplete` or re-`opened` as appropriate) **before** applying the open; or always `sheetCloseComplete()` then open cleanly. Same for any path that restores `#panel-layer.open` during pending.

## Local / hosted

| Gate | Result |
|---|---|
| Identity | head/tree/PR Draft MATCH artifact; base still `19121b75` |
| Node 20.19.2 architect flock/nice10 | **tsc 0**, **sync-economy 0**, vitest abilities-ui+sim+flag-off **44/44** |
| Hosted `42141268911` | exact sha `a3c6dc5`, **conclusion skipped** — **not** SUCCESS |
| Scope | UI-only vs `dc3c60f`; no src/sim abilities / balance edits |

Evidence: `engineering/reviews/evidence/abilities-ui-116-a3c6dc5/` (identity, vitest, edge-probe, edge-reopen, artifact digests). WT: `/workspace/wt-review-116-a3c6dc5` (no product edits left).

## Remaining after next tip

- Fix O1+O2 → Architect recheck exact tip.
- HoQA UI/abilities plan; hosted gate SUCCESS (not skipped).
- Stay Draft until HoE; not merge/publication authority.

## Artifact digests

```
NOTE.md     163025c174577e56be50c8c908bd4db3453b493129b166d81742db6d33d9e52f
new-head    0184643a8400b98ea88649d783a89e6fba49ce80c8b85476f90e9d52ee251d45 → a3c6dc5…
tree.sha    fe6cf33f9ce9aad34f4473e8027827471955edcec92693776c26db8c149c1f77 → 639662d…
```
