# Self-review: #83 fix/m41-p2 @ 4eb220f (on 1befa17) — UI eng, 2026-10-30 CET (D-CEO-20261028-02)
Scope: HoE final rulings 2026-10-30 00:19/00:20 (Art-c1 conditions 1-3), HoP addendum to D-HOP-2026-10-29-10 (00:22), Art-c2 kept.
Commits: 166bc34 (code + tests + browser checks), 65bf759 (nav-compare script; cooldown axe result as INFO), 4eb220f (badge anchor fix).
A first full chain ran on 65bf759 (all PASS, results-65bf759/); its nav-compare showed a 0.5 px WebKit offset, fixed in 4eb220f and re-gated.

Findings: no Blocker / Critical / Major. CCR re-review not required by the rule, but the Art-c1 DOM reorder is a structural change; HoE may ask for one.

Minor
- m1: Badge position: flex static position (top:auto) + margin-bottom for vertical, calc(50% - 20px) right; inputs pinned by a CSS test
  (.nav-ic 28px, 2px gap, .nav-lbl 12px/1.2). Browser check: icon top-right +6/-6 ±0.5 px in 3 engines; pixel-compared to a 1befa17 build
  (results-4eb220f/nav-compare/compare.json). A 50%-of-padding-box calc (65bf759) was 0.5 px low in WebKit (UA padding 2px/3px).
- m2: Full-motion refused shake was dead on aria-disabled buttons (.btn[aria-disabled=true]{animation:none} beats .shake). Fixed only
  for .btn.manage (Art-c2). Buy / Collect refused taps have the same dead shake; flagged, not changed (outside scope).
- m3: D-HOP-10 addendum cooldown: axe label-content-name-mismatch flags "Refill, cooling down" because the aria-hidden "0:NN" countdown
  counts as visible text for axe. Behaviour unchanged per HoP; recorded as INFO, escalated for a ruling.
Nits
- n1: jsdom visible-text helper now skips aria-hidden subtrees (matches the a11y tree); a separate domText keeps them.
- n2: P2a count-0 browser check: docked 1280 has no displayed bottom nav, so it checks the header Refill copy there (1befa17 failed it).
- n3: Art-c2 full-motion browser check now passes (it failed in all 3 engines on 1befa17 for the m2 reason).
