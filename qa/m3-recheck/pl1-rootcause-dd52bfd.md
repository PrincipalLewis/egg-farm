# PL-1 root cause on Latest dd52bfd (plus 48bdb09 comparison) · 2026-10-19 01:55 CEST · QA Engineer (UI/Layout & Gameplay)
Build dd52bfd from /tmp/qa-pl2-dd52bfd on :4417 and 48bdb09 from /tmp/qa-pl1-48bdb09 on :4418. The runtime meta build-id is asserted on every try. State `pl1`: Farm L10, $50,000, so several levels are affordable. Each try starts in a fresh context, asserts `[data-tab=farm].active` plus the Farm card, and focuses Farm Buy before the action. Levels and coins are read from the saved state 1.3–1.5 s before and after. Key, click and focus events are logged by capture listeners. Script: `pl1-rootcause-dd52bfd/pl1rc.mjs`. Raw results: `results-*.jsonl` (dd52bfd chromium is in `results-chromium.jsonl`). Full table: `pl1-rootcause-dd52bfd/table.md`.

## Result: no in-page trigger reproduces PL-1 on dd52bfd
| Trigger (390 unless noted) | dd52bfd Chromium | dd52bfd Firefox |
|---|---|---|
| (a) Escape tap, Buy focused | 0,0,0 | 0,0,0 |
| (b) Enter tap | 1,1,1 | 1,1,1 |
| (c) Enter hold 1.5–2 s: down/wait/up, Playwright auto-repeat (repeat:true trusted keydowns every 33 ms) | 1,1,1 (each variant) | 1,1,1 |
| (c3) synthetic untrusted repeat:true keydowns | 0 (untrusted keys never activate) | n/r |
| (d) Space tap / Space hold 1.5–2 s | 1,1,1 / 1,1,1 | 1,1,1 / 1,1,1 |
| (e) Escape with the Upgrades sheet open; Escape with the Market sheet open (390 and 1280) | 0 / 0 | 0 / 0 |
| (f1) right-click context menu on Buy, then Escape | 0,0,0 | 0,0,0 |
| (f2) alert() over the page, dismissed, then Escape | 0,0,0 | 0,0,0 |
| (g1) synthetic window blur/focus | 0,0,0 | 0,0,0 |
| (g2) second page to front, then back | 0,0,0 | 0,0,0 |
| (g3) Escape keydown on the other page, keyup on the game page | 0,0,0 | 0 (tries 2–3 lost to the timeout) |
| (g4/g5) Enter or Space keyup only, after returning | 0,0,0 | not run (timeout) |
| (g6) Escape tap after returning | 0,0,0 | not run (timeout) |
| (h) Buy by mouse click, then Enter / then Escape | 1 total (the click only; Enter and Escape buy nothing) | same |
Values are levels bought per try. Every buy cost exactly $1,368 (one level); there were no multi-buys.

## Code path (dd52bfd)
- Escape: one global `document` keydown handler (`src/ui/app.ts:281`) that only closes the welcome modal, other modals or the panel. It never dispatches and does not call preventDefault. Browsers do not activate a `<button>` on Escape, so on its own Escape cannot buy.
- Enter/Space activation is native `<button>` behaviour. The click goes to `uRow` (`app.ts:~222`) → `act()` → `tryDispatch` (live-state guard, `src/ui/tap-guard.ts`). No code checks `e.repeat`.
- **Why a held key still buys only one level:** each buy redraws the sheet with innerHTML (S2-10 `act()` → `render()`). The focused Buy node is replaced and focus drops to `<body>`, which was measured in all 3 engines: `focus:body>body>body` and `focus-after-buy:BODY`. Repeat keydowns then go to `body`, so nothing more is activated. Repeat buys are blocked by accident (focus loss), not by design.
- Side effect (a11y Minor): after any buy, keyboard focus is lost to `<body>`. A keyboard user has to tab back to the Buy button.

## Root cause assessment
PL-1 is **not reproducible from inside the page** on dd52bfd in Chromium or Firefox. Player's trigger was an Escape aimed at the DevTools ⋮ menu. That key goes to DevTools, not the page, and it bought exactly 1 level ($11.1K). The most likely explanation (unverified) is that the menu was dismissed by a **pointer click that went through to the page at the Buy position**, or that Player tapped Buy while the menu was open. Headed DevTools-menu input could not be driven from Playwright (DISPLAY :30 exists, but native DevTools menus are not scriptable), so case (f) used page overlays only. PL-1 stays a **keyboard Major as reported, unconfirmed**. The #43 guard is still a valid defence: Escape preventDefault, and repeat Enter/Space are ignored, which makes "1 press = 1 buy" hold by design instead of by focus loss.
