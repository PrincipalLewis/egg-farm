# BUG DRAFT (to UI engineer e80556fd, cc HoE) — WebKit 375: keyboard focus can't be seen on (or kept on) "Got it" in the tracks explainer with refund over Upgrades > Farm
Status: draft, filed per HoQ QA-D-1030-PRERUN-TRIAGE (3). Severity: **Major** (a11y focus visible, WCAG 2.4.7; HoQ). **Fix requested for v5; re-verify on the RC SHA.**
Build: m4.1+76390f2 (SHA 76390f2834b98e981ef52a3e165436acd9170654), pre-run PROVISIONAL evidence.
Engine/size: WebKit (Playwright webkit-2370, WebKit 27.2 per WK-PREFLIGHT), 375x800. Case `exp-sheet-farm-refund`; 1 of 132 csr checks.

## Repro (harness csr-spot.mjs:69-91, artifacts/v5-ui/harness/csr/)
1. Load dist-qa with localStorage `eggfarm.ui = {"onboardingDone":true,"seenSlots":10,"workersIntroA":true,"workersIntroB":true,"sfx":false}`; tap "Tap to start".
2. Via the QA hook: close any modal; set `state = {...state, farmLevel:3, hensLevel:2, eggValueLevel:2, collectionLevel:1, seenTracksExplainer:true, customers:[], nextCustomerInS:1e9, coinsCents:5e7}`; `eggfarmUi.render()`.
3. Click bottom-nav **Upgrades**, then the **Farm** tab.
4. Show the explainer with a refund: `eggfarm.migrationRefundCents = 123450; state.seenTracksExplainer = false; eggfarm.onTracksCommitted()`. The card ("Upgrades got an upgrade!" + "We refunded +$1,234.50 for your old upgrades.") shows at `data-place=default`, rect 40,72-336,278; Got it gets programmatic focus (tracks-explainer.ts:187).
5. Keyboard: press Tab up to 8 times (120 ms apart), looking for focus inside `.tracks-exp`. (Harness fallback: `.tracks-exp-ok.focus()`, Shift+Tab, Tab.)

## What is measured
On `document.activeElement`: `:focus-visible`, computed outline (style/width/colour), box-shadow (csr-spot.mjs:46-47). Pass = focus lands on Got it with a visible ring.

## Expected
Focus moves to and stays reachable on "Got it" with a visible focus indicator (art-ux/m4-tracks-explainer.md:28: role=dialog aria-modal=false, "focus moves to Got it", Esc dismisses; `.btn:focus-visible{outline:3px solid var(--c-focus);outline-offset:2px}` styles.css:33). Same run, same engine: exp-main-plain/refund, exp-sheet-farm-plain, exp-sheet-collection-plain/refund all show `focusVisible:true, outline solid 3px rgb(43,121,168)`.

## Actual
- `focus: []` — no Tab step and not the fallback ever put focus on an element inside `.tracks-exp` (csr/csr-spot-webkit-375.jsonl line 12; log csr/logs/csr-webkit-375.log:12-13 "focus=").
- The focus screenshot shows **no explainer card at all**, and the Upgrades sheet has scrolled (Hens row now under the card's slot): `csr/shots/csr/webkit/exp-sheet-farm-refund-focus-w375.png` (before-Tab: `exp-sheet-farm-refund-w375.png`, card visible). Compare `exp-sheet-farm-plain-focus-w375.png` (card visible, blue ring).
- Not the 8 s auto-close: the whole case took ~4.3 s (jsonl t 09:33:06.395Z → 09:33:10.688Z), EXP_MS = 8000 (tracks-explainer.ts:8).

## Likely mechanism (hypothesis from code + shots; not browser-verified, no run allowed)
Tab moves focus from Got it into the sheet's Buy buttons and scrolls the sheet. Every scroll re-places the card (tracks-explainer.ts:168 → placeCard :86-93). The refund card is taller (206 px); with the sheet scrolled a Buy now sits under 72-278, so every candidate fails `clear()` and placeExplainer returns 'none' (:58) → `.tracks-exp[data-place=none]{visibility:hidden}` (styles.css:533). A visibility:hidden Got it can't take focus, so the keyboard user loses the card's only control (Esc still closes it, :183). Chromium 390x844 keeps the card visible in the same case (shot csr/shots/csr/chromium/exp-sheet-farm-refund-focus-w390.png: the $24.00 Buy stays just below the card); 375x800 geometry may be what matters, so this may not be WebKit-only. Please check Cr/FF 375x800 too.
Likely src: `src/ui/tracks-explainer.ts:44-58` (placeExplainer → 'none'), `:86-93` (placeCard), `:168` (scroll re-place), `:187` (initial focus); `src/ui/styles.css:533`.

## Related, for HoQ (not part of this bug yet)
Firefox 375 csr PASSED all 6 explainer focus checks, but every FF record has `focusVisible:false, outline "none 3px rgb(62,44,35)"` (csr/csr-spot-firefox-375.jsonl lines for section explainer), and `shots/csr/firefox/exp-*-focus-w375.png` show Got it without any ring. The pass comes from csr-spot.mjs:47 `visibleRing` accepting any box-shadow, which here is the button's resting drop shadow `rgba(62,44,35,.25) 0 4px 0`. So FF focus visibility on Got it is UNVERIFIED (likely also missing). harness/ is frozen; HoQ to decide whether FF goes into this bug and whether harness-rc's check is tightened (outline/ring only, not the resting shadow).

## Evidence (artifacts/v5-rc-ui/prerun-p2/csr/)
logs/csr-webkit-375.log; csr/csr-spot-webkit-375.jsonl (lines 11-12, 15); shots/csr/webkit/exp-sheet-farm-refund-w375.png, exp-sheet-farm-refund-focus-w375.png, exp-sheet-farm-plain-focus-w375.png; FF: csr/csr-spot-firefox-375.jsonl, shots/csr/firefox/exp-sheet-farm-refund-focus-w375.png, exp-main-plain-focus-w375.png.
