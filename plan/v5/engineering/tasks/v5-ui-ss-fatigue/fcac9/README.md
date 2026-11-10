# FC-AC9 on the real #11 build (lane U, 2026-11-10 04:20 CET)
- Build: ui/v5-fatigue-cue df12422 `dist-qa` (build-id m4.1+df12422). Flags patched in the served bundle only (salesStopped=1, fatigueCue=1); shipped flags 0.
- Method: `measure-ui.mjs` mirrors art-ux/scratch/fcac9/measure2.mjs (same state; Full!, ×155 pill and toast forced; `#rate` −$999.9K/s) but measures the shipped .fchip/.fslot/#fpop. Counts by Art's `analyse2.py` (v11 rules, read-only, unchanged).
- Engines: Chromium 156.0.8078.47, Firefox 157.0, WebKit 27.2. Viewports 360x640, 375x667, 360x739 (icon chip) and 360x740, 390x844 (sub-line). Modes off / on-tired / on-asleep / on-open.
- **Result (`ui-df12422.json`, `analyse-df12422.out`): 60/60 rows 8/7/4** (hidden / shown / worst+Broody), all 3 engines identical, Broody-eligible 0,5,8,9,10,11 = flag off. Below 740: scene and queue rects = flag off, #settings 44 px, #rate unclipped.
- Rects at 360x640 (3 engines, ±0): chip 215.6,5–259.6,49 (Art §5: 216.4,5–260.4,49); popover 34.8,62–259.6,114 (224.8×52; Art 234.3×52), right edge = chip right; Manage 171.6,66–253.6,110 (82×44 = Art).
- Risk (run 1, `ui-4b70e17.json`, basket not pinned): as the basket count and coins grew, Firefox 360x739 squeezed #settings to 42.7 px and clipped #rate. Not an FC-AC9 spot failure; HUD width budget question for Art (79.6 px room assumed).
