# Gate 5 FINAL: PR #49 @ ffc3dfdeafd8448f870b70b0b731288fa56e53fd (QA Engineer UI/Layout). PARTIAL, updated as results land.
- Build: own worktree `/tmp/qa-final-ffc3dfd`, own `npm ci` and build. The build-id meta reads **m3-rc1-pre+ffc3dfd**. Served on port 4797. Lane 1 lock, one engine at a time.
- **Profile B**, read from the data: `maxLevel` is 30 and Hens has 31 cost rows (L0–30). The cap, C4 and L50/L55 cells are **N/A by ruling (D-CEO-09 option B)**.
- EXP1 is judged against **v1.15, non-modal**. Evidence: `gate5-final-ffc3dfd/` (`exp-final-<engine>.jsonl`, `entries-*.jsonl`, `<engine>/exp-*.png`).

## EXP1 + focus + refund (exp-final.mjs), Chromium (360/375/390/1280 docked): 60 shots, 4 fails (all C5 read-only, see below)
- **C1, natural flow** (real acdbedc v6 save, migrated in-session), all sizes PASS:
  - Welcome back shows first with no card under it. The card appears after Collect.
  - Copy is verbatim. role=dialog, aria-modal=false. Got it ≥48 tall. Focus lands on Got it when the card opens.
  - Nothing clips. No refund line, since refund is 0.
  - seenTracksExplainer is persisted when the card shows.
  - Reduced motion: fade only, ≤150 ms.
  - Auto-dismiss happens within 7–9.6 s of the card becoming visible.
  - After a reload the card doesn't come back (count 1).
- **C2, v1.15 taps**, all sizes PASS. The card covers no Buy/Collect control. An outside Collect registers and the card stays open. A tap on the card closes it with no other effect. **No D-07 v1.15 mismatch.**
- **C3, focus fix**, all 24 cells PASS: sheet closed and sheet open, each with Enter, Esc and a click on Got it.
  - Sheet open: focus goes to the active `[data-tab]`. Esc closes only the card, not the sheet.
  - Sheet closed (phone sizes): focus goes to `[data-nav=upgrades]`.
  - 1280 docked: focus goes to the active tab.
- **C4, refund > 0 at every size**, PASS. The build's own refund markup ($999.99B) was inserted into the live card: no clipping, nothing offscreen, Got it ≥48. Refund > 0 can't be reached naturally, because `migrationRefundCents` comes from the in-session migration and is 0 for live data (`game.ts`).
- **C5, gating:**
  - **Hidden tab** PASS: no card and no flag while hidden. After it becomes visible the card shows exactly once.
  - **Read-only (storage refused):** no card and no flag while blocked (PASS). But **the card didn't appear after storage became writable again, without a reload**. Follow-up probe C5b is pending.
- **C6, new farm** PASS: never shown.
- **C7, E3 with Saves QA's canonical committed-unseen fixture** (sha256 de6b0297…): the card shows on reload exactly once. PASS.

## Refund-at-360 Major: script artefact?
**Most likely a script artefact.** On c0bb3de and on ffc3dfd, in a normal page the card with the refund line (up to $999.99B) fits at 360 with nothing clipped. `.tracks-exp` is z-index 27, above the sheet (10) and modal (20) layers. On c0bb3de's swallow build, a script tap that opened the sheet also closed the card, which is what produced "no card, sheet open". Art & UX's own re-shoot reached the same conclusion ("shot timing"). Evidence: `gate5-final-prep/refund360-c0bb3de/NOTE.md` and C4 here.
