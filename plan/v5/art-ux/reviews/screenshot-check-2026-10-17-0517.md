# Screenshot spec check — 2026-10-17 05:17 (UI/Visual Designer)

**Result: PASS on in-scope shots (no regressions). 2 UX notes (Minor) from QA's claude-gamer triage repro need a Head of Art & UX copy/spec decision.**

## Checked (new since 04:22)
| Set | Verdict |
|---|---|
| qa/m3-recheck/pr17-cf50663-evidence/shots-chromium/{m3-rc0-desktop-1280,m3-rc0-bug9-375-market,save-recovery-v4-{fresh,restored,storage,cantsave}-{360,1280}}.png (10) | PASS, harness re-renders identical in layout to m4a-c108440 baseline (Market rows, Sell 44px+, Sell all 56px, Welcome back dialog fits 360). |
| qa/m3-recheck/pr18-d8d680e-evidence/shots-chromium/ same 10 names | PASS, same as above. |
| qa/m3-recheck/hidden-tab-offline-b3341bd/shots/firefox-{hide,reload}-{61s,671s,10800s}.png (6) | PASS, Firefox matches the chromium/webkit sets already passed (offline popup fits 390, Collect 48px). |
| qa/m3-recheck/claude-gamer-triage-7d52952/shots/chromium-{390,1280}-*.png (22) | Out of spec scope (QA repro of playtest bugs on old build 7d52952; B-1 Coop full not in this build, so no B-1 check). UX notes below. |

Not re-checked (same names as 04:22, rewritten): b2-pr4-192f273/chromium-direct-*-end.png (4), toast-pr5-3930a4c/pr-chromium-toast-1280x720.png. Out of scope: qa/scratch/pr17-18-y/clones/*/docs/readme/*.png (12, README copies).

Non-visual, for QA (not an Art & UX item): rc0 on both cf50663 and d8d680e has 3 FAILs: axe-core missing at /tmp/axe (harness), and B5 pill reads "Manage all (2 need it)" where the test expects "(1 need it)" at 390 and 1280.

## UX notes (Minor, need Head of Art & UX decision)
1. **B2: Sell all says "No eggs to sell" while the basket holds eggs** (chromium-390/1280-B2-basket8-nocust.png: HUD basket 8, no customers). Cause: `game/src/ui/orders.ts:57-59` `sellAllLabel` only knows sellable eggs (0 with no orders), so the F2 empty label fires. The text is false and reads like a bug. Proposal: when basket > 0 and no orders, greyed button reads **"No customers yet"** (spoken the same); keep "No eggs to sell" only for basket = 0. Still present on current game/ code.
2. **B3: the sold card shows a reset, live-looking state for ~0.5 s** (chromium-390-B3-after-sell-{80,300}ms.png). At 80 ms the row is still `order ready`, opacity 1, reading "0/8 eggs · $9.44 · Sell 8 +$9.44"; at 300 ms it fades (`leaving`, 0.49) under the empty state "Next customer soon… (2s)" that already renders above it. The sale gives no positive beat in the row, and a 0/8 with an active Sell 8 invites a dead tap. Cause: row re-renders with post-sale delivered=0 before the leave animation (`game/src/ui/order-list.ts:28,66`). Proposal: freeze the row at its sold state, swap the button for a disabled "Sold! +$9.44" chip (green #3D7F33, white), and hold the empty state until the row has left (≈240 ms).

No change list for engineers this run; both notes are new copy/spec decisions, so they go to Head of Art & UX first.
