# Bug investigation: offline over-crediting · 2026-10-16 · PM, Collection
Report: Player session 3 §4: "+2,732 eggs" after 11m11s with coop 51/800; "2,732 eggs is over 3× the 800 coop"; ~$1.5K appeared behind the popup; workers asleep.
Code read: local tree `ce7d59a` (game/src). Player built a01faea (origin/main); offline code paths assumed identical — **Engineering to confirm on a01faea**.

## Verdict
1. **Eggs beyond coop/Basket capacity: NOT a bug — by design, not reproduced as over-credit.** The grant bypasses the coop cap and the Basket is unlimited (game/src/sim/offline.ts:9-13; actions.ts:63). The amount matches the formula exactly: repro A gives `pendingOfflineEggs = 2,732` for Farm L15 and a 683 s gap = floor(683 × 0.25 × 16.0) (offline.ts:7). The player's 11m11s break plus the time since the last autosave (≤ interval) explains 683 s vs 671 s. **Severity: none (copy/UX) → fixed by offline-popup-v2-spec.md.**
2. **Related real defect found — hidden-tab throttling simulates the whole hidden period online (S2, latent over-credit of time).** Rule (game.ts:86-92 comment, engineering/sim-rules.md): a hidden gap ≥ 60 s simulates the first 60 s online, then freezes. Code: `frame()` (game.ts:105-112) applies that per *frame gap*, and main.ts:58 `setInterval(() => g.frame(), 1000)` keeps firing in a hidden tab at the browser's throttled rate (≈ 1/min under Chrome intensive throttling). Each ~60 s gap simulates up to 60 s online, so **nothing is ever frozen**: an 11-minute hidden tab is simulated almost fully online (sales, wages, worker energy drain). Worker energy draining to asleep and coins appearing while "away" match the player's observations.
3. **~$1.5K and coop 51→18 behind the popup: not reproduced.** A load does no online sim before the popup (game.ts:38-46), so coins can't change from the grant. Possible explanations: (a) the tab was hidden first and simulated online via defect 2 before being reloaded; (b) the sim keeps running behind the open modal (app.ts:208-218 doesn't pause frames). Needs a telemetry export from the player's run (offline_grant secondsAway, session_* timing) to confirm.

## Repro A (grant amount — works as designed)
Vitest fixture (temporary, removed): memory KV; `g = new Game(balance, kv, () => t, 7)`; `g.state = {...g.state, farmLevel: 15, coop: 51}`; `g.save()`; `t += 683_000`; `g2 = new Game(balance, kv, () => t, 7)`.
- Expected per AC11: pendingOfflineEggs = floor(min(683, 7200) × 0.25 × 16) = 2,732; coop stays 51.
- Actual: 2,732, coop 51. ✔

## Repro B (hidden-tab defect)
Same setup, Farm L15, no reload; advance clock and call `g.frame()` for 671 s in steps of (i) 1,000 ms (foreground) and (ii) 60,000 ms (throttled hidden tab).
- Expected per rule: (ii) simulates 60 s online then freezes → ≈ 18 customer arrivals.
- Actual: (i) 198 customers; (ii) **215 customers** — the hidden tab was simulated for the full 671 s.
- Manual: open game at F≥7 with Market Hand, hide the tab ≥ 10 min in Chrome (intensive throttling), return: coins/energy changed as if played the whole time; no welcome popup.
- File:line: game/src/main.ts:58 (timer driving frame while hidden); game/src/game.ts:105-111 (`Math.min(gap, maxMs)` per frame, no cumulative hidden budget).
- Fix suggestion (Engineering): track hidden time via `visibilitychange` (same hook telemetry v0.6.1 needs) and cap cumulative online sim while hidden at `offlineMinSeconds`; or skip `frame()` while `document.hidden`. Decide whether the rest of a long hide should go through the offline grant (consistent with closed-tab behaviour).

## Checked
offline.ts (formula, min/cap, negative delta), game.ts constructor (one grant per load; pending settled first), actions.ts collectOffline/dismissOffline (Basket += pending once), app.ts welcome modal (reads pending, single dispatch), autosave.ts (save on hide/pagehide/interval), format.ts (fmtCount → "K" ≥ 10,000; fmtMoney → short ≥ $10K; fmtAway → "2h+" at cap), balance.json offline block, economy.csv L15/L16 offline columns.
