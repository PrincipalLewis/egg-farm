# #116 abilities UI: Architect O1/O2 recheck at 9ee76a0 (Draft)

Date: 2026-11-06 02:26 CET (Europe/Belgrade, UTC+1)  
Lane: architect · Prior: `abilities-ui-a3c6dc5-architect-addendum.md` (**CHANGES** — O1 dangling freeze, O2 stale reopen)  
Exact tip: `9ee76a0aa1d9e83fd28a7196844d2a00c32c1a86` · tree `c914276c901a0c780689abc336fab87356595eb5`  
Parent: `a3c6dc510b5f0126a437fc13b9a5788ef8d34206`  
Artifact: `/workspace/artifacts/v5-116-architect-o1o2-9ee76a0/`  
Delta vs prior: **2 files** `src/ui/app.ts` (+4/−1) + `tests/v5-abilities-ui.test.ts` (+34) — bounded to O1/O2 only  
Writes: this addendum + `engineering/status.md` only. **No** code / PR post / Ready / push / merge / messages. **Not** publishing authority.

## Verdict: **APPROVE** (content) — Draft stays Draft

O1 and O2 from the `a3c6dc5` CHANGES addendum are **closed** with minimal, correct wiring. Happy-path sheetCloseComplete hold + blocked telemetry remain closed. No new architectural blocker found in the bounded delta; do not widen.

## Closed findings

| Id | Status | Mechanism (exact) |
|---|---|---|
| Prior #1 sheet hold (happy path) | **still closed** | `registerSheet` + pending + `transitionend`/`rm`/harness `sheetCloseComplete` unchanged; product AB-14 fire+activateAll tests PASS |
| Prior #2 ability_blocked | **still closed** | no aria-disabled gate; asleep telemetry test PASS |
| **O1** docked mid-close dangling freeze | **closed** | `docked.addEventListener('change', () => { if (upgradesClosePending) sheetCloseComplete(); })` (`app.ts:227–228`). Completing removes listener + clears handle (`sheetCloseComplete` L191–197). Product O1 test: dock mid-close → `anySheetOpen` false, `probe` true, sheet hidden — **PASS** |
| **O2** reopen / stale transitionend | **closed** | `openPanel`: always `if (upgradesClosePending) sheetCloseComplete()` before open/nav **including** `p==='upgrades'` (`app.ts:199–201`). Removes `transitionend` before reopen; late synth event must not hide open panel. Product O2 test — **PASS** |

## Scope / non-widening notes

- No sim / balance / flag / schema / Boost / `refillAgoSimMs` changes (correct for this tip).
- Undock while pending also completes (same listener) — safe; ends freeze when docked CSS would otherwise suppress transform.
- `dispose` still does not clear pending (page unload / remount tests use `clearSheets`) — not a ship blocker; do not expand without a real failure mode.
- `sheetCloseComplete` remains mountApp return (test/harness), not a `window` release hook.

## Identity / gates

| Check | Result |
|---|---|
| Live head / tree / PR Draft | `9ee76a0…` / `c914276…` / Draft MERGEABLE CLEAN · base `19121b75` **MATCH** artifact |
| Parent | `a3c6dc5…` (linear fix commit) |
| Local Node **20.19.2** architect flock/nice10 | **tsc 0**, **sync-economy 0**, vitest abilities-ui+sim+flag-off **46/46** (incl. new O1/O2) |
| Hosted (read-only one shot) | Draft checks **skipping** (gate / pacing / release-globals) — **not** SUCCESS |

Evidence: `engineering/reviews/evidence/abilities-ui-116-9ee76a0/` · WT: `/workspace/wt-review-116-9ee76a0` (source clean).

## Remaining (not content blockers)

1. Hosted gate **SUCCESS** at exact tip (today skipped on Draft).
2. HoQA UI / abilities plan GO (AC-M5A sheetCloseComplete, names, compact, flag0, O1/O2 edges if required).
3. Stay Draft until HoE; stack/merge only after HoQA + hosted per D-HOE-52. **This APPROVE is architecture content advice, not merge/publication authority.**

## Artifact digests

```
NOTE.md     68bf83f3101e34f9512bcc7855e5d6e4b04c7f13d7a241a361f4e03e1e4d2e51
new-head    2cf4ac41dd9e176599ab0b9feeaba73e5447c1fb985b8c7fc81ead81f096d465 → 9ee76a0…
tree.sha    b8bbb2fb9f7f95c0fc88617d14e4bfb1896f54c1c5b2bf1c52df25da84f9814f → c914276…
```
