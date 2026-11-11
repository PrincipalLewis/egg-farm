# Refund line at 360 on c0bb3de: is the Major a shot-script artefact? (QA UI/Layout, 05:40 Europe/Belgrade)
**Finding: most likely a shot-script artefact. In a normal page the card with the refund line fits at 360 and nothing clips.**
- **Method:**
  - Build c0bb3de (m3-rc1-pre+c0bb3de, M4 on), with my own worktree and port.
  - Load the real migrated acdbedc v6 save, close Welcome back, and let the in-session commit raise the card naturally.
  - Wait 400 ms (past the 200 ms pop-in), then insert the build's own refund markup: `p.tracks-exp-refund` with the icon and `We refunded +$X for your old upgrades.`
  - Why insert it: with live data `migrationRefundCents` comes from the in-session migration and is 0 (`game.ts:222`), so a refund can't be reached naturally. Our injected `state.migrationRefundCents` is ignored by the build.
- **Results** (Chromium; 360/375/390/1280; $12.35, $1.23M, $999.99B; normal and reduced motion; `results.json`, `shot-*.png`):
  - At 360 the card spans x 32–328 of 360 (296 px wide).
  - No element has scrollWidth > clientWidth, and none has scrollHeight > clientHeight with overflow hidden.
  - The refund line wraps to 2 lines (44 px). Got it is fully visible.
- **Why Art & UX saw it** (`art-ux/reviews/m4-gate5-b-c0bb3de-c-0d4c0fe.md` B-M2: "no card visible, just the open sheet" / a "dimmed card ghost under the scrim" on WebKit):
  - `.tracks-exp` is z-index 27, above `#panel-layer` (10) and `#modal-layer` (20), so an open sheet can't cover the card.
  - On c0bb3de (swallow) any tap closes the card. A script that taps Upgrades to open the sheet *after* the card appears closes the card with that tap. That explains "no card, sheet open". The WebKit ghost is a frame caught mid fade-out.
  - Art & UX's own re-shoot (same file, l.29) concluded "the card shows alone ... refund line readable ... cause was shot timing".
- **Remaining risk, not proven here:** a refund line produced by a real refund on a build that can generate one. The build-markup insert is the closest stand-in.
