# Screenshot check 2026-10-17 03:54 CEST (routine run)
Reviewer: UI/Visual Designer. New since the 03:23 run (by folder/file name).

## Verdict
- **M4-A 'Sold out!' bubbles @ c108440: geometry PASS (DOM), capture INCOMPLETE → M4-A sign-off still held.**
- M4-A 'Sold out!' @ aa89076: FAIL (superseded by c108440, closed).
- PR #16 offline popup v2 @ 5248dd9 (QA rerun, same SHA): still FAIL on 03:00 item 1 (Major, ⏱ emoji). New: 1 Minor, 1 Nit.
- hidden-tab-offline b3341bd (QA functional run, v1 popup): no visual blockers; 1 Nit.
- M4-A aa89076 regression re-renders (qtag 9of9, save-recovery v4, m3-rc0): PASS, no change.

## 1. M4-A 'Sold out!' timeout bubbles (spec: m4-tracks-copy.md v1.1; HoA&UX 03:25 condition: ≥4 timing out at 360 + 1280 docked, bubbles ≤56px chip width, no overlap, no clip at x=0)
| # | Check | aa89076 (engineering/screenshots/m4a-aa89076/) | c108440 (engineering/screenshots/m4a-c108440/) |
|---|---|---|---|
| 1 | ≥4 timing out | 5 at 360 and 1280 docked | 5 at 360 and 1280 docked |
| 2 | Bubble width ≤ chip (56) | 56 / 56 | 56 / 56 |
| 3 | No overlap | 0 | 0 |
| 4 | No clip at x=0 / stays in strip | **FAIL**: lefts −72, −8, 56, 120, 184 (360); −68 … (docked). Cause: styles.css:65-66 `.ghost.leave` slides the whole ghost −80px, bubble included, so it leaves the strip and passes x=0 | **PASS**: lefts 8, 72, 136, 200, 264 = chip lefts (strip left 8); docked 12 … 268 (strip left 12). c108440 styles.css:+494-498 animates only the img; bubble holds with `fadeout 800ms` |
| 5 | Bubble visible in the PNG (look, wrap, contrast) | **Not shown**: sold-out-bubbles-{360,1280-docked}.png show empty chips, no bubble | **Not shown**: same; both PNGs show 5 empty dashed chips and no bubble |

Cause of #5 (both SHAs): /tmp/m4a-new/sm/soldout.mjs waits 350 ms after `.bubble.soldout` attaches, then calls `page.screenshot`; the shot lands after the 800 ms `fadeout` (forwards, opacity 0), while the DOM dump is taken after it, so measurements are real but the frame is blank.
Fix for the capture: right after the bubble attaches, wait ~250 ms (inside the 15–75% opaque window of `fadeout`), run `document.getAnimations().forEach(a => a.pause())`, then screenshot; add a strip crop. Also check the wrapped bubble ("Sold / out!" at 56px, line-height 13px) stays inside the strip's top edge (bubble top 67/69 vs strip clip box).
UI/Visual Designer has queued its own paused-animation verify render (art-ux/reviews/evidence/m4a-c108440/, behind QA on the browser lock); either that or a Features re-shoot closes #5. On a visible PASS: M4-A SIGNED OFF.

## 2. PR #16 offline popup v2 @ 5248dd9, QA rerun (qa/m3-recheck/pr16-offline-v2-5248dd9/shots/)
Shots: {chromium,firefox}-func-cac{27,28,30,31,32-7199,32-7200,34,35-59,35-neg,37}.png (20); {chromium,firefox}-{360x640,375x700,390x844,430x932,1024x474,1280x720,1280x800,1366x768}-capped-1234567.png (16). Same SHA as the 03:00 review, so 03:00 items stand.
| # | Item | Result | Sev | Evidence | Fix |
|---|---|---|---|---|---|
| 1 | 03:00 #1 cap line ⏱ emoji, not SVG | still FAIL | Major | all capped shots | as 03:00 (inline 16px SVG clock, currentColor #8A5528) |
| 2 | 03:00 #2 build label visible | still not visible | Minor | QA reads the ID from the bundle (summary.txt 03:10) | as 03:00 |
| 3 | 03:00 #3 Collect at 360x420 | not re-shot | – | – | re-shoot on next SHA |
| 4 | Title "Welcome back!" on one line next to the icon (spec layout, offline-popup-v2-spec.md:29) | **FAIL (new)** | Minor | wraps to "Welcome / back!" in every capped and func shot, incl. 1024x474 and 1366x768 | Cause: styles.css:459 `.wb-head{padding-inline:32px}` + 48px icon + gap leaves ~180–200px for a 28px Fredoka title; styles.css:458 `overflow-wrap:anywhere` lets it break. Fix: `.wb-head h2{white-space:nowrap;font-size:clamp(22px,6.4vw,28px)}`, icon 40px under 400px wide; keep the × clear with right padding only if it overlaps (it is absolutely placed). |
| 5 | Money line wrap | Nit | Nit | 360x640 and 1024x474: "Worth up to $3,197,528 when / sold" leaves "sold" alone | `text-wrap:balance` on `.wb-worth`, or a no-break space in "when sold". |
| 6 | Hero, line A, sub-line, money values, rate line, Collect ≥48px, × 44px, contrast | PASS | – | all shots | – |
QA-owned (not visual): no focus on open, no focus trap (summary.txt 03:42).

## 3. hidden-tab-offline b3341bd (qa/m3-recheck/hidden-tab-offline-b3341bd/shots/chromium-{hide,reload}-{61s,671s,10800s}.png, 6)
Functional run on the v1 popup (branch predates v2); layout fits at 390, Collect ≥48px, numbers full digits. Nit: chromium-reload-671s shows the "Coop upgraded! +1 customer slot" toast drawn above the modal scrim while Welcome back is open (toast z above sheets since aa89076). Suggest queueing toasts until the modal closes. Not blocking.

## 4. M4-A aa89076 re-renders
engineering/screenshots/m4a-aa89076/{rc1-s2-6-qtag-9of9-{375,390},save-recovery-v4-{fresh,restored,storage,cantsave}-{360,1280},m3-rc0-bug9-375-market,m3-rc0-desktop-1280}.png (12): match 14ba6e9 PASS; no change.
