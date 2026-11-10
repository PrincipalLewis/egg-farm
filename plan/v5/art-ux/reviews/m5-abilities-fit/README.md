# M5 abilities: call buttons (v0.1) and Shift sheet Boost slot (v0.2): fit, names, axe (Art & UX worker)
- v0.1 (13:15 CET): `fixture.html`, `run.cjs` → `results.json`, `fit2.cjs` → `fit2.json`, `shots2.cjs`. Card call buttons; names there used the old absolute `.sr` (F1, superseded).
- v0.2 (13:27–13:38 CET): `sheet-fixture.html` (Shift sheet per layout-spec §3.5 and signed refill-flows v1.0.1 rows; `.lbl` + inline `.sr-in` per `../m5-refill-axe/sr-markup.md`; options none / (a) line / (b) name-line chip).
  - `boost.cjs` → `boost.json`: fold test, rects, 8 states × 4 workers × every m:ss, layout shift, axe 4.14.0 full pass per state set, ariaSnapshot + Chromium CDP names; 3 engines × 360×640 / 390×844 / 1280×800 docked. Renders to `art-ux/wireframes/m5-boost-*`.
  - `boost2.cjs` → `boost2.json`: combo names (plain `Combo` word), combo window boundary model (0…10.2 s), contrast-incomplete detail. `boost2-run1-texttransform.json`: the rejected `text-transform` variant (CDP mismatch).
  - Card `Active m:ss` for 0:31–0:45 checked from Fredoka 700 glyph advances (fontTools): widest of 0:01–0:45 is still `0:22`, so v0.1 §9's 6.45 px holds.
- All browser runs via `ops/tools/lane-run.sh art -- timeout 600 node …`.
