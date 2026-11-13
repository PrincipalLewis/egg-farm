# Session 2 UI triage (Art & UX) — m3-rc0 @ 16176a3
2026-10-16 02:30 · Sources: playtest/player-notes/2026-10-17-session2.md, playtest/triage/2026-10-16-session2.md (Product), game working copy at tag m3-rc0 (`src/ui/app.ts`, `src/sim/state.ts`), art-ux/assets, layout-spec §3.3/§4.3/§4.7, m3-customer-queue-spec v1.1.

## (a) "8–9 slots, only 5 drawn" (Product S2-3b)
- **Did Player see the chip? Yes.** The notes say "a '+3/+4' chip" early on. So the chip itself is found. The real confusion: the Farm row promises "+1 customer slot (8 → 9)", and the strip *looks* the same (it shows 5 tiles: 4 customers + "+N"), so nothing visible changes. After the offline break the queue was empty (S2-3a), so the chip wasn't there at all.
- **Fix (rc1, agreed with PM Farm Upgrades 2026-10-16; layout-spec §4.6b, queue spec v1.2 §6):**
  1. Farm row preview at F4→5 / F9→10 / F14→15 / F19→20: **"+1 customer (max N)"**, e.g. "+1 customer (max 9)" (Product ruling; replaces "+1 customer slot (a → b)").
  2. On landing, the "+N waiting" chip pulses **once**: scale 1→1.12→1, 600ms; reduced motion = color flash (brown → Yolk → brown). No chip animation otherwise (anti-churn holds).
  3. No chip when ≤4 customers wait (unchanged).
  - Optional later (needs PM): a "5/9 in line" caption, only if session 3 still shows confusion.

## (b) Unlabelled worker nav button (Product S2-5)
> **Update 2026-10-16 08:47 (supersedes the label text below; matches workers spec v1.3):** the visible label is "Refill" plus a badge showing N tired workers. The aria-label is "Refill N tired workers", or "Refill available in N seconds" during cooldown. The docked label is "Refill tired (N)". The button shows once 3 or more workers are hired and N≥1, and stays visible during the cooldown.
**Found:** at m3-rc0 `src/ui/app.ts:78` the nav has `<button class="btn manage farm-manage-all" data-act="manageAll" hidden aria-label="Manage all">`. It's icon-only (`icon-manage-all.svg`, plus a cooldown ring), and `placeFarmMA()` (l.159) moves it into the mobile nav between Upgrades and Farm when not docked. So it isn't a duplicate (B8 already merged them); it's the intended Manage-all control with **no visible label**, and it fails our rule.
**Spec (rc1):**
- Same anatomy as the other nav buttons: flex column, icon 28px + label 12px Nunito 700, **height 64px, min-width 64px** (≥44 ✔). The nav goes from 3 to 4 equal buttons when it's shown (360/4 = 90px each ✔). It is shown only while ≥1 worker is at or under the threshold, or while it's on cooldown.
- **Visible label:** "Manage" (keep the 12px fit: 90px column ✔). A count badge in the top-right is the 16px Barn UI #B83B37 pill with white 11px bold (5.65:1): N = tired workers. During cooldown the label becomes the timer "0:28" (tabular nums) with the ring, and the button is `aria-disabled="true"` (not `disabled`, so it stays focusable).
- **aria-label:** ready: "Manage tired workers, N tired"; cooldown: "Manage tired workers, available in 28 seconds" (update the aria-label at most every 5s, not per second).
- Colors: like the other nav items (text #3E2C23 on the nav bg). Remove the green fill that made it look like a different control type; the icon stays in Meadow Strong #3D7F33 (4.9:1).
- Copy matches S2-2a: the panel's big button is "Manage tired (N)", not "Manage all". PM Workers signs off.
- Docked desktop (in the Upgrades header): same label "Manage tired (N)", 44px tall.

## (c) No coop visual change at L5 (Product S2-1)
- **Specced and delivered:** layout-spec §4.3 maps the sprites L0–4 `coop-l1`, L5–9 `coop-l5`, L10–19 `coop-l10`, L20–30 `coop-l20`; §4.7 covers the celebration. All 4 SVGs are in art-ux/assets and game/public/assets, and the code swaps on `coopTier()` (app.ts:409–414). Side by side: mockbuild/coop-tiers-l1-l5-l10-l20.png.
- **Gap 1 (art, mine):** **l1 → l5 is too subtle.** It's the same brown body and red roof; l5 only adds two windows and a fence and is a bit wider. At 46% width on a phone it reads as the same coop. l10 (white body, gold trim) is clearly different.
- **Gap 2 (build, to confirm):** Player says there was no change through L14, but l10 is very different, so the swap itself is in doubt. The toast is probably hidden behind the open Upgrades sheet (S2-7), and the celebration fires while the sheet covers the coop, so the change is never *seen* at the moment of buying.
- **Ruling (Product, 2026-10-16):** tiers L5/L10/L20 must be told apart at a glance by **silhouette and color**, not detail. The "Coop upgraded!" toast shows above any open sheet, or right after it closes. The L5 preview line "New coop look" stays.
- **Delivered now (2026-10-16 02:45, own SVGs, 96 viewBox, same ground line y=86, 2px #3E2C23 outline):** `assets/coop-l5.svg` red barn (gambrel dark-brown roof, white X door, loft window) · `assets/coop-l10.svg` two-storey cream coop, blue roof #2B79A8 + grey silo (tall + asymmetric) · `assets/coop-l20.svg` golden Yolk coop with a centre tower, flag and two red-roofed wings (widest). `coop-l1.svg` unchanged. Previews `mockbuild/coop-l{1,5,10,20}-{64,96}.png`, strip `mockbuild/coop-tiers-v2.png` (old: coop-tiers-l1-l5-l10-l20.png). Each step changes the silhouette plus the dominant color (brown → red → cream/blue → gold).
- **Engineering:** copy the 3 SVGs to game/public/assets (same filenames, no code change); toast z-index above `#panel-layer`, or queue it until the sheet closes; play the bounce/sparkle when the coop is visible; verify the swap at F4→5, F9→10, F19→20.

## (d) Other UI / readability items
| # | item | proposal | owner |
|---|---|---|---|
| d1 | **S2-6 review:** at rc0 `.qtag{position:absolute;right:8px;top:4px}` (styles.css:53) puts the tag *inside* the 72px strip, on top of the rightmost tile ("+N" or the 4th/5th customer), which is the overlap Player saw at 375 | Fix: `.qtag{top:-9px;right:8px;height:18px;line-height:16px;z-index:1;pointer-events:none}` so it straddles the strip's top outline (there's ≥8px between the HUD and the strip); "Full" below 380px; 6.3:1 contrast. QA: at 360/375/390 the tag's rect doesn't intersect any chip rect. (layout-spec §3.3) | Eng |
| d2 | Market looks dead with stock (S2-3a) | UI half: when an order is filled instantly, the card still shows for **1.2s** in its "Ready → sold" state (green outline, coin burst), then collapses per §1.4. Same anti-churn rules, max 1 collapse per 240ms. The rule is PM Market's ruling. | PM Market, Eng |
| d3 | Manage greyed at 44% with no reason (S2-2b) | Under the disabled button, 12px #6B5D52: "Manage at 40% or less" (or "Rested enough"), plus an aria-describedby link to that text. | PM Workers rule, Art & UX copy final |
| d4 | Offline popup "+2,278 eggs" vs Basket 1,939 (S2-4c) | If the sale is instant, add a second line to the welcome-back card: "Sold 339 while you were away · +$1,279", Nunito 14 #6B5D52, so the numbers add up. | Eng confirms AC11, PM Collection copy |
| d5 | Upgrades sheet tab memory inconsistent | Rule: the sheet opens on the last tab used in this session; on a new session it opens on Farm. | Eng (≤small) |
| d6 | "N/N eggs" reads as full when the stock covers the order | This is correct per P2 (have = eggs available for it), but the "Sell" + green outline state was perhaps not noticed. No change; recheck in session 3. | QA/Player |
| d7 | Stale money in the open Upgrades sheet and money drop (S2-4a/b) | Not UI design: code bugs, but they hit readability. Support the rc1 gate. | Eng |
| d8 | S2-7 re-checks: toast behind the sheet (see c.2), customer sprite poking out of the queue (clip the strip `overflow:hidden` on the y-axis; the avatar ring stays inside 40px), Market X missed (close must be 44×44 with no overlap from the header title), Collect label vs ready count (ftue §2.2: label = per-tap value, "N ready" = coop stock; that's by design, keep) | QA repro first | QA, Eng |

## Asks
**Engineering:** (1) app.ts nav Manage button: visible "Manage" label + badge + aria-label per (b); (2) drop in the new coop-l5/l10/l20.svg; "Coop upgraded!" toast above any sheet (or right after close); verify the swap; (3) "Queue full" badge inside the strip at 375; (4) per layout-spec §4.6b/§4.7 rc1: "+1 customer (max N)" preview, one-time chip pulse (reduced-motion color flash); (5) d5 tab memory; (6) confirm S2-3a/S2-4c causes so the d2/d4 UI can follow.
**Product:** (1) Product: done ("+1 customer (max N)", chip pulse, tiers by silhouette+color, toast above sheets); (2) PM Workers: approve "Manage tired (N)" / nav "Manage", and the d3 disabled reason; (3) PM Market: rule on a minimum 1.2s card dwell for instant sales (d2); (4) PM Collection: welcome-back sold line (d4); (5) optional "5/9 in line" caption, only if session 3 still shows confusion.
**Art & UX (me):** coop tiers delivered (Oct 16 02:45); queue spec v1.2 + layout-spec §4.6b/§3.3/§4.7 done; review Engineering's rc1 screenshots of the tiers/toast/qtag/nav within 4h of receipt; m2 workers "Manage tired (N)" label after the PM Workers sign-off (same day).
