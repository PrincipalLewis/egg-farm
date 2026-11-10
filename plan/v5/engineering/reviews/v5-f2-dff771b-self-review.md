# v5 F2 self-review: feat/saves-v5-f2 @ dff771b9454a1f1d8f7303a8d0c78f3a64843dee
Senior Engineer, Saves & Persistence · 2026-10-29 · D-CEO-20261028-02 (self-review; CCR re-review only after a Blocker/Critical/Major).
Base: origin/rc/v5 = 22eac98 (main). F1a/F1b/F1c (Architect, local ea6b6db/a6b4fe4/e87562c) are NOT on rc/v5 yet.
Size: 12 files, +366 / -4 = 370 changed lines (src 117, tests + fixture 249). Gate: artifacts/v5-f2-dff771b/results/ (SHA256SUMS).

## What it does
- `src/save/m5-fields.ts` (new): `m5Flag` (D-C1), `m5Load` (D-C5 sanitisers, readyAt clamp, AB-1 reload end), `m5Persist`
  (session-only keys never saved), `m5Offline` (>= 60 s), `m5ShortGap` (< 60 s), `drawGap`/`ensureEvRng` (D-C2), `streakAfter`.
- `game.ts`: load (`m5Load` before the offline grant), `settleHiddenPeriod` both paths (`m5Offline` before `grantOffline`, §9.5 #3),
  the visible-throttled >= 60 s frame path (`m5Offline` before the legacy 60 s catch-up, §9.1a). `sim/offline.ts` untouched.
- `save.ts`: `serialize` passes the state through `m5Persist` (same object, same bytes, when no session key exists).
- Types: minimal optional GameState fields, 2 SimEvent members, `M4Params.flags`, named exactly as F1a.

## Findings (all Minor / Nit; none Blocker/Critical/Major)
| # | Sev | Finding | Disposition |
|---|---|---|---|
| m1 | Minor | Merge with F1a: state.ts, events.ts, formulas.ts overlap F1a's declarations (same names/shapes, different text). | Resolution on merge: take F1a's (`sim/m5-state.ts`, `M5SimEvent`, `config/flags.ts`), drop F2's inline copies, switch `m5Flag` → `flagOn` and `ensureEvRng` → `sim/rng.ts`. Mechanical; noted in PR body. |
| m2 | Minor | `drawGap` (fresh R3 gap after an offline egg expiry) is one `nextRand` draw: `min + u·(max−min)`. #1 sim must use the same draw so GE-AC33's fixed draw order holds. | #1 (Architect) reuses `drawGap` or tells me the formula; flagged in PR body. |
| m3 | Minor | `streak_peak{reason:"offline"}` is not emitted by F2: F1a's event needs duration_s/credited_taps/… that only the #2 streak sim tracks. | #2 streak sim (mine) adds it in `m5Offline` where s is zeroed. |
| m4 | Minor | A session that boots with a tracks migration pending runs on `tracksOff(b)` (flags off), so `m5Load` doesn't run for it. | Only reachable with a hand-edited pre-M4 save carrying M5 fields (M5 fields are written only by M4-on, tracksV7-marked farms). Accepted. |
| n1 | Nit | `m5Persist` is presence-based (not flag-gated): a flag-off build strips session keys from a hand-edited save. | Real saves never carry them (no build writes them); flag-off bytes are identical for every save a build can produce (tests). |
| n2 | Nit | `m5ShortGap` is the identity today (0 focus seconds while hidden, D-HOP-08 #2). | Kept as the one place #2 hooks the < 60 s rule. |
| n3 | Nit | TDD: tests were written alongside the module, not strictly red-first. | Coverage is per path (below); no behaviour without a test. |

## Spec ambiguities resolved
1. **`tc` in the F2 row** is the config block `balance.m4.tc` (already typed as `M4Params.tc`), not a save field. No save field added.
2. **`streakBest`**: no spec defines it, and streak R11/K9 say s isn't saved. Not added (absent = nothing to sanitise). If HoP wants a best-streak stat, it's one optional field + one sanitiser line.
3. **`frenzyEndAt` vs `frenzyRemainingS`**: golden R10a/R23 (D-HOP-09 #5) replaced the wall-clock field. Saved field is `frenzyRemainingS` (clamped [0, tc_frenzy_s]); a legacy `frenzyEndAt` is dropped on load with golden on.
4. **Cooldown representation**: sizing §9.1 suggests sim-seconds remaining internally; the Architect's F1b (a6b4fe4, `sim/clock.ts wallRemainingMs`) keeps `readyAt` as epoch ms in memory, checked against an injected `now` and clamped to [0, cd] on every read. Both keep `step()` pure and behave identically (wall-clock elapse across offline/reload/gaps, E2b rollback cap). F2 follows F1b so there is one representation: no subtraction on offline; on load `readyAt` is clamped to [now, now + cd]; non-finite → ready.
5. **< 60 s "streak grace/decay in one step"**: D-HOP-08 #2 / streak R10 superseded the hidden drain (5 s hidden at 0.28 returns 0.28). Implemented as `streakAfter(s, hold, 0)` = unchanged.
6. **"Restart the spawn gap after welcome-back closes"**: with an egg on screen F2 removes it and draws a fresh R3 gap; with none it keeps the countdown (R8, review fix B1). Both are focus-clock seconds, which don't advance while the welcome-back modal is open (F1b), so the countdown starts on close with no extra code.
7. **Event fields**: `collectible_expired{skin, reason, farm_level}` and `ability_ended{worker, cause, effect_s}` exactly as F1a; Game adds `collectible_id` per F1a's note (not F2).
8. **Broody "drawn eligible slot"**: F2 range-checks 0..11 / integer; the drawn-slot check needs the yard (hensN) and is #5's re-pick (R6).

## Test map
- `tests/v5-f2-m5-fields.test.ts` (32): flags; flag-off same-object identity for load/offline/short/persist and base serialize bytes; every D-C5 clamp (table); readyAt clamp incl. a 1-day rollback; activeS reload end once + clamp; per-flag isolation; session keys/frenzyEndAt dropped; persist strips all F1a session keys; >= 60 s settle (events, fresh gap, untouched Frenzy/nest/readyAt/state.rng); no-egg countdown kept; D-C2 seeding; < 60 s identity; streakAfter vs ST-AC5.
- `tests/v5-f2-game-settle.test.ts` (8): hidden exactly 60.0 s offline path + replay no-op (idempotent per period); offline-path save never holds the egg/streak; < 60 s unchanged; clock-back mode none; visible frame gap >= 60 s (M5 offline, legacy catch-up equal to flag-off); 59 s frame not offline; reload ends the call once in telemetry (and not again); flag-off load/play/save keeps every M5 field.
- `tests/v5-f2-roundtrip.test.ts` (4): pinned fixture bytes; old→new→old→new for LS main, .bak and the IndexedDB mirror (fake IDB), sha256 pins per hop.
- `tests/v5-f2-downgrade.test.ts` (3): the M4.1 downgrade; also run unchanged against tag m4.1-5d9efa6 and base 22eac98 (gate logs downgrade-*.log).
