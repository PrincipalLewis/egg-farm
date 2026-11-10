# Gate 5 final review: B @ 51351f0 (v1.15, capped L30) | 2026-10-19 07:15 (UTC+2)

Set: /workspace/wt-ui-shots/m4-gate5-final-51351f0/ (93 PNG, manifest sha 51351f0826ec053d3c256324ca0fab79e0c0ba3b, check logs 92/92 on chromium/firefox/webkit).

## SHA relationship (git, local refs in /workspace/wt-t3-capped)
- 51351f0 is a direct child of c11e3a0 (c11e3a0 is an ancestor), on fix/m4-gate5-v115-on-capped (also on origin).
- Local origin/rc/m4-t3-capped still reads c11e3a0 (not re-fetched; no external action). HoAUX says 51351f0 is now the B head. Manifest says branch rc/m4-t3-capped, source fix/m4-gate5-v115-on-capped.
- Diff c11e3a0..51351f0 is scripts/rc0-browser.mjs only (+28/-2: shot additions, activeElement). No src/ change, so the shipped UI is identical to c11e3a0.

## Verdict: PASS, 0 Major. The sign-off conditions are met.
1. Full SHA in the manifest: yes.
2. Flag-off: no shot. The manifest says "skipped: the QA build has no M4 flag switch". Per the HoAUX 07:10 ruling it closes on the unit test. No standalone e80556fd log file was found on the box, so I re-ran it myself at src = 51351f0: tests/m4-exp1-explainer.test.ts "M4 off: never shown..." (cards 0; showTracksExplainer returns null) plus seen-tracks-explainer-save, 32/32 pass at 07:10. SATISFIED.
3. C5b: unit "committed but reloaded before it showed -> shown on load, once" (card 1 after reload, flag persisted, 0 on the next reload) and "Saves m1: read-only/inactive/held no card; once writable shows and saves" both pass. Browser: after-reload shots on 3 engines × 4 widths show no re-show, with PASS "G5 EXP1 not shown again after reload" ×4 per engine. Sampled firefox-after-reload-390: no card. SATISFIED, but in the browser it's shown only as "gone after reload". The once-after-reload part is proven by the unit test.

## Checks (sampled shots plus manifest)
- Focus B-M1: 360/375/390 → BUTTON[data-nav=upgrades]; 1280 docked → active [data-tab]. Matches. Esc/Enter/card-tap at 360.
- v1.15: an outside Buy tap buys 1 and the card stays; the card rect is clear of Buy and Collect. Correct.
- New save: no card on any engine. Refund line at opacity 1. Cap L30.

## Minors (new)
- m1: webkit-focus-after-gotit-360 shows no visible focus indicator on the Upgrades nav after Got it (it's like the backlogged Esc ring item; may be :focus-visible after pointer). Log only.
- The card over the open sheet's tab row: Minor per HoAUX 07:10, backlog.
