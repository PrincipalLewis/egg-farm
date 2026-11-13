<!-- Draft PR body for HoE to open: feat/saves-v5-f2 -> rc/v5 (Draft; mark Ready at the gate SHA). Not opened by Saves. -->
# v5 F2: save + offline/clock rules (M5 optional fields, no SAVE_VERSION bump)

**Piece:** v5-rc-manifest row 10 (F2) · **Owner:** Senior Engineer, Saves & Persistence · **Base:** `rc/v5` @ 22eac98
**Head:** `dff771b9454a1f1d8f7303a8d0c78f3a64843dee` · **Size:** 12 files, +366/−4 (370 lines ≤ 400) · **Flags:** `m4.flags.{golden,streak,broody,abilities}`, all absent = 0 (F3 adds the block)

## What
- New `src/save/m5-fields.ts`: load sanitisers (D-C5), reload ends a running call once with `offline` (AB-1), readyAt clamped to [now, now + tc_ability_cd_s], session-only fields never saved, the ≥ 60 s settle (calls end at the gap start, on-screen egg expires `offline` + fresh evRng gap, streak s = 0, Frenzy frozen, Broody nest kept with no accrual) and the < 60 s settle (streak unchanged: 0 focus seconds while hidden).
- `game.ts`: load, `settleHiddenPeriod` (both paths; idempotent per period as before) and the visible-throttled ≥ 60 s frame path (§9.1a; the legacy 60 s catch-up is unchanged).
- `save.ts`: `serialize` drops session-only keys; the same object and bytes when there are none.
- `sim/offline.ts` untouched. No `SAVE_VERSION` bump (stays 6).

## Flag off = byte-identical
With every flag off each F2 function returns its input object, so saves, sim and goldens are unchanged: `engineering/golden` (f90d1678 / a54c9cf9 pins) and the full unit suite pass unmodified.

## Save compatibility (§6 risk 4)
- Fixture `tests/fixtures/v5-f2/m5-save.json` + sha256 pins for old→new→old→new across LS main, `.bak` and the IndexedDB mirror.
- Downgrade: `tests/v5-f2-downgrade.test.ts` run unchanged on tag `m4.1-5d9efa6` (M4.1 RC1) and on base 22eac98: the M5 save loads from all three stores, the unknown fields are ignored and written back unchanged.

## Depends on / merge notes
- **F1a (ea6b6db, Architect) isn't on rc/v5 yet.** F2 declares the minimal optional fields it needs with F1a's exact names and shapes. On merge, take F1a's `sim/m5-state.ts` / `M5SimEvent` / `config/flags.ts`, drop F2's inline copies, and switch `m5Flag` → `flagOn` and `ensureEvRng` → `sim/rng.ts`.
- Cooldowns follow F1b: epoch `readyAt` against an injected `now`, clamped on every read (`wallRemainingMs`).
- #1 sim: reuse `drawGap` (one evRng draw, `min + u·(max − min)`) for R3 gaps, so the draw order matches.
- #2 streak sim (Saves) adds `streak_peak{reason:"offline"}` in `m5Offline`.

## Gates (artifacts/v5-f2-dff771b/results/, `sha256sum -c SHA256SUMS`)
| Gate | Result |
|---|---|
| tsc | pass |
| sync-economy --check | pass |
| engineering/golden | 4/4 |
| unit (vitest forks 1–2) | 1611 passed, 1 skipped (1612) |
| F2 tests | 47/47 |
| build / build:html / build:qa (release check) | pass |
| check-globals chromium / firefox / webkit | pass / pass / pass |
| rc0 chromium / firefox / webkit | 394/394 · 394/394 · 394/394 |
| downgrade on m4.1-5d9efa6 / 22eac98 | 3/3 · 3/3 |

SHA256SUMS sha256 `28590a47a5cd3b87b1a9b0fc0c4369cab9d2ce2f69442be344b22d7c83d654bc` (49 files, `sha256sum -c` OK).

## Review
Self-review (D-CEO-20261028-02): `engineering/reviews/v5-f2-dff771b-self-review.md`. Minor/Nit findings only (m1–m4, n1–n3), so no CCR re-review is needed unless QA raises a Major.
