# #116 abilities UI: Architect review at dc3c60f (Draft)

Date: 2026-11-06 01:58 CET (Europe/Belgrade, UTC+1)  
Lane: architect · PR: https://github.com/PrincipalLewis/egg-farm/pull/116 · Draft: **true** (stay Draft — HoE)  
Exact: `dc3c60f390fd2da4cebf0cc9075df9a59d17dbc0` · parents `bf1e554…` + rc `19121b75…` · tree `5e56ccd…`  
Artifact: `artifacts/v5-116-mergefwd-dc3c60f/` (NOTE + digests)  
Spec: `product/workers/m5-worker-abilities-spec.md` v1.3.12 · Art `fc1ca17d` · Contract: `arch-golden-slice2-contracts-20261105.md` fireAbility ADDENDA  
Writes: this note + `engineering/status.md` only. **No** code / PR post / Ready / push / merge / messages. **Not** publishing authority.

## Inherit ruling (D-HOE-51)

**Does NOT inherit.** D-HOE-51 clean mergefwd inherit requires a **prior Architect PASS** of an identical patch. There is **no** Architect APPROVE of `bf1e554` (abilities UI). Only abilities **sim** reviews exist (`abilities-sim-*`). This tip is first-time UI content review.

Auto-merge probe: `git merge --no-commit 19121b75` onto `bf1e554` → tree `5e56ccd…` **MATCH** live HEAD (clean parent-only merge of UI tip onto current rc; `actions.ts` is a clean union of UI `fireAbility`/`activateAll` arms + rc income-ref/tapCoins). Clean merge ≠ content APPROVE.

## Verdict: **CHANGES**

Architecture of selection / eligibility / flag0 / action wiring is largely sound, but the **portrait sheet fire path violates rule 10 / AB-14 (ii) / AC-M5A-22**: focus countdown can start on the next frame while the Upgrades sheet is still closing, because `open` is cleared synchronously instead of holding attendance through `sheetCloseComplete`.

### Required before Architect APPROVE / Ready

1. **Sheet close clock (blocking).** On successful `fireAbility` / `activateAll` with `inSheet`, keep Upgrades counted as an open menu until a real `sheetCloseComplete` (existing `registerSheet` / `closeComplete` in `src/ui/overlay.ts:19–26`, already OR’d into `makeDialogOpen` at L47). Today `afterAbilityFire` → `openPanel(null)` (`src/ui/app.ts:225–228`) sets `open = null` immediately (`openPanel` L192), so `makeDialogOpen` (`overlay.ts:44–47`) drops the upgrades dialog while `.sheet` still runs `transition:transform` (`styles.css:116–118`). Sim stores no pending-close state (`abilities.ts` header L7–9); UI must hold the freeze. Docked path (`abilityInSheet` false) is unaffected.

### Important (should fix in same pass; not alone enough for CHANGES)

2. **`ability_blocked` from UI.** Comment at `app.ts:231` says always dispatch so blocked taps emit `ability_blocked`, but `onFireAbility` / `onActivateAll` return early on `aria-disabled="true"` (L233, L240) → `cantAfford` only. Cooldown / lockout / asleep / unpaid / paused / active buttons are rendered disabled (`abilities-ui.ts` `callButtonHtml` L198), so direct blocked taps never reach `fireAbility` / never emit. Spec rule 4 / TEL: blocked taps emit `ability_blocked`. Prefer dispatch-then-shake (or only gate unavailable chrome that has no button).

### Minors / scope notes (non-blocking for Draft shape)

3. Boost / Shift-sheet chip + `refillAgoSimMs` intentionally **out of this Draft** (abilities-ui.ts L7; actions Action type accepts optional `refillAgoSimMs` but UI never passes it). Matches contract guard “until Refill lands”.
4. `workersHtml(..., nowMs = Date.now())` default (`workers-ui.ts`) — app passes `now()`; prefer no wall default for pure render helpers.
5. `closeSheet` argument uses `inSheet` proxy rather than sim `ActivateAllResult.closeSheet` / `fireAbility.closeSheet`; equivalent when `ok` is state-changed, but prefer the sim result for activateAll zero-fire edge.
6. Assets preload includes `ico_boost_combo` ahead of Boost DOM — fine.

## What PASSes (content evidence)

| Check | Result |
|---|---|
| Live head / tree | `dc3c60f…` / `5e56ccd…` **MATCH** artifact + `origin/feat/v5-abilities-ui` |
| Parents / base | `bf1e554` + `19121b75`; PR base rc/v5 `19121b75` **MATCH**; Draft MERGEABLE CLEAN |
| Scope | **13 files +506/−8** — 6 SVGs, `abilities-ui.ts` (new), `app.ts`, `workers-ui.ts`, `styles.css`, `main.ts` preload, `actions.ts` fire/activateAll arms, `tests/v5-abilities-ui.test.ts`. **No** `balance.json` / flags / `abilities.ts` / timers / save schema delta |
| Flags | shipping `m4.flags.abilities: 0` (and all peers 0) |
| Flag0 UI | `abilitiesUiOn` false on `flag_off` probe; no call buttons / Activate-all (`abilities-ui.ts:36–40`, test AB-UI-1) |
| Sim/UI separation | UI renders via `abilityEligibility` / `abilityActive` / `wallRemainingMs`; mutates only through `g.dispatch({fireAbility\|activateAll})` → `apply` → sim `fireAbility`/`activateAll` with injected `nowMs` (`actions.ts:113–122`). No DOM in sim. |
| Order / eligibility | Activate-all ready count + nearest CD among hired non-active (`activateAllEligibility`); call kinds ready/active/cooldown/lockout/asleep/unpaid/paused; progress uses `AbilityState.durS` (`callProgressPct`) |
| Names / a11y shape | Content + `.sr` / `.sr-in`; no `aria-label` on call / Activate-all (Art D2 / AC-M5A-10); compact docked Q8 |
| Save / transient | No new persist keys; abilities remain in `M5_SAVED_FIELDS`; UI adds no session fields |
| Auto-merge tree | MATCH tip (evidence `merge-probe.txt`) |
| Independent gates | Node **v20.19.2**, lane architect, flock `.vitest-eng.lock`, nice 10 (omit `--maxWorkers=1` tinypool exception): **tsc 0**, **sync-economy --check 0**, vitest `v5-abilities-ui` + `v5-abilities-sim` + `m4a-flag-off` **41/41** |
| Hosted (read-only one shot) | Draft checks **skipping** (gate / pacing / release-globals) — **not** SUCCESS; do not claim green |

Evidence: `engineering/reviews/evidence/abilities-ui-116-dc3c60f/` · WT: `/workspace/wt-review-116-dc3c60f`

## Missing gates (after CHANGES land)

- Hosted gate SUCCESS at exact tip (not skipping).
- HoQA UI / abilities plan (AC-M5A sheetCloseComplete, names, compact, flag0).
- Stay Draft until HoE; stack after sim abilities on rc (already in `19121b75`).

## Artifact digests (bind)

```
NOTE.md     feea39fb73d91d3874031863cd3254a79df3f909b6dfcfbd8b6c46ea3811a3df
tree.sha    255b624ccf5b68b3bf6164a0b6aab7d78a813983818fd04f86a3d2f41484e7e1 → 5e56ccd…
new-head    8b05c7683786d7fafd434f9019e45afeeba9139b6e2ff18776b4ee4ae1b77a24 → dc3c60f…
rcv5.sha    38b5e719ec60a6cdd11c382b3772a4a7ab2ea3db994f8885f3759dad4ea8cea3 → 19121b75…
```
