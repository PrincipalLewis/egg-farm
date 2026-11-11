# m3/rc1-s2-money @ 16d0fe3 (contains 63245f8, 5cc8889, eb2ec26): S2-4b, S2-4a hardening, S2-3a MK-16..22, S2-10 · 2026-10-16 · Head of QA
Worktree /tmp/qa-s2money-16d (detached, clean, release dist; check-release-build m3-rc1-pre+16d0fe3 ok; build.txt). Unit tests 357/357 (unit.txt).
Engines: Chromium (google-chrome), WebKit, Firefox (Playwright). Headless, 375x812. Scripts in qa/m3-scripts: s2-4b-stall.mjs, s2-regress.mjs, s2-7-recheck.mjs, s2-3a-mk.mjs, s2-10-latency.mjs, mk20-sim-hash.ts. Logs, JSON, screenshots in s2-money-16d0fe3/. bd0dc66 baseline in s2-4b-63245f8/bd0dc66/.
Frame stall method: rAF wrapped in-page so no frames are delivered (same effect as an occluded window or a throttled device mode). A real background tab was also tried in Chromium (header still advances).

## Results
| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | S2-4b: header, open Upgrades sheet, ETA, buy button with frames stopped 9.5 s | **PASS** Chromium, WebKit, Firefox | header lag 0 ms after each sim tick (10/10), ETA hint changed 3x, buy flipped to affordable. bd0dc66 FAILS in all 3: header stuck at $2,952.20 while money was $3,961.83 |
| 1b | Goal chip ETA with frames stopped | PASS (3 engines) | bd0dc66 frozen |
| 2 | Greyed taps: money + save unchanged (a, a2) | PASS 3 engines | regress-*.log |
| 2b | 5cc8889 live money: drawn grey but affordable now -> buys; drawn enabled-state stale, money now short -> rejected, no spend, save unchanged | PASS 3 engines | bd0dc66 ignored the affordable tap |
| 3 | Live sheet refresh (b) | PASS 3 engines | |
| 4 | Offline count (c), 10 min and 2 h | PASS 3 engines | |
| 5 | Collect count loosened to [min(per, ready), per] | PASS | s2-7-*.log |
| 6 | tick.ts:42 comment = min(10, 6+floor(F/5)) | PASS | text: "queue_max_base + floor(F / queue_max_step_levels), capped at queue_max_cap (6..10 from balance); the strip draws at most 5" |
| - | S2-6 "Queue full" over "+5" at 375/390 | FAIL (expected, fix is on m3/rc1-ui, not this branch) | |
| MK-16 | Served card "Thanks! +$X" for 1.5 s | **FAIL (Minor)** | 25 cards; text right; most last 1.5 s, but some vanish after ~0.9 s with no leave animation (Chromium min 900 ms, WebKit 914 ms). Cause: app.ts render drops dwelling cards when live customers fill the 5-slot strip (`if (kids.length >= stripSlots) break`) |
| MK-17 | Dwelling card outside queue_max, no "lost" | PASS (unit tests s2-3a.test.ts; code path checked) | browser check not separate |
| MK-18 | Not tappable, ignored by Sell all | PASS | pointer-events none, aria-hidden, click opens nothing, money unchanged |
| MK-19 | Reduced motion: static card, same dwell | PASS (script flagged FAIL only on the first sample, 1.2 s, which was already mid-dwell when sampling started; others 1.46 to 1.57 s; class rm, no animation) | |
| MK-20 | Same seed -> identical sim | PASS | 6 runs (3 seeds, Market Hand and none, 600 s, sell/collect inputs): hashes identical to eb2ec26 (mk20-sim-hash.log) |
| MK-21 | Card on screen >= 40% with Market Hand | PASS | 70.2% Chromium, 70.4% WebKit (Eng 66.3%); live customer alone 16% |
| MK-21b | No workers ~91.8% | PASS | 100% in my fixture (stock 1500, queue never empties) |
| MK-22 | First customer within 1 s of closing welcome-back | PASS | 21 ms Chromium, 60 ms WebKit |
| - | Full-queue "+$X" pop | PENDING (not built) | |

## S2-10: tap -> screen update (15 taps each; ms)
| Action | Frames | Chromium header med/p95 | Chromium button med/p95 | WebKit header med/p95 | WebKit button med/p95 |
|---|---|---|---|---|---|
| Buy (farm) | normal | 12 / 22 | 8 / 22 | 14 / 32 | 12 / 32 |
| Collect (basket) | normal | 12 / 20 | 13 / 20 | 11 / 25 | 11 / 25 |
| Hire | normal | 12 / 24 | 12 / 24 | 18 / 50 | 18 / 50 |
| Buy | stalled | **148 / 311** | **143 / 311** | **156 / 250** | **141 / 250** |
| Collect | stalled | **130 / 326** | **130 / 326** | **126 / 248** | **126 / 248** |
| Hire | stalled | **136 / 384** | **136 / 384** | **156 / 258** | **156 / 258** |
- Normal frames: all under 100 ms; no tap left the pre-tap state on screen. The UI is not "one action behind" with frames running.
- Frames stalled: every action is over 100 ms (flag), p95 250 to 384 ms. This is the 250 ms timer fallback (checks every 125 ms): the tap changes state at once but the screen waits for the next fallback redraw, so for up to ~0.4 s the screen shows the state from before the tap. Low; would need a redraw right after each dispatch to fix.
- 5 of 15 buy taps per run changed nothing because the farm cost had passed the $9,000 test money (correctly rejected). Not a defect; excluded from the timings.

## Defects
- **S2-3a-1 (Minor, MK-16):** served "Thanks!" card disappears early (~0.9 s, no leave animation) when the strip is full of live customers. Repro: F12, C9, 1500 stock, Market Hand + Coop Hand working, watch the queue strip 60 s at 375 px. Expected 1.5 s or per Art & UX layout.
- **S2-10-1 (Low):** with frames throttled, the screen lags each tap by a median ~130 to 156 ms, p95 up to 384 ms, before showing the result. Repro: stall rAF (occluded window/device mode), open Upgrades, tap Buy; header and button update only on the next 250 ms fallback.
- S2-6 still open on this branch (fix on m3/rc1-ui).
