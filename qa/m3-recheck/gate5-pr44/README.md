# Gate 5 shot + probe scripts (PR #44 copy of gate5-pr41, updated 2026-10-19) · QA Engineer UI/Layout
Implements art-ux/reviews/m4-on-checklist.md §A, with behaviour probes for §B. Parameterised by SHA.
## Run
1. Clean worktree at the SHA, run `npm ci` in the worktree (own node_modules) and `npm run build`, then serve `dist/` on your own port (never 4173).
2. `STATES=fresh,L10,migrated-acdbedc ./run.sh <sha40> http://127.0.0.1:<port>/ <outdir> chromium firefox webkit`. Every hold uses lane 1 (`.browser-test.lock`, timeout 600), one engine at a time. Leave STATES empty to include L30 once the L30+ pack is merged.
3. Check the Settings shots against the label, then run `SHA=… PUSHED=1 LABEL_EYEBALLED=1 BRANCH=… NOT_RUN='…;…' node manifest.mjs <outdir>`.
   - It programmatically verifies every entry: the file exists, the PNG size equals the viewport, the required fields are present, an asserted_tab exists for every Upgrades shot, and the docked flag is right.
   - It also reports missing and orphaned files.
## Files
- `lib.mjs`: fixtures. fresh; L10 (re-tuned: F10 C9, Hens 13 = capped at F+3, Egg value 9, Hens L10 milestone uncelebrated, 2 workers at 45% energy so W2 sleeps in ~405 s); L30 (all 30, $1.5T); pl1 (probe only, $50K); migrated-acdbedc (`fixtures/acdbedc-v6rich.json`, a real acdbedc v6 save).
- `shoot.mjs`: screens farm, market, upgrades-{collection,farm,workers}, upgrades-farm-tracks (M4 rows), settings (label asserted), plus 2 explainer frames when the explainer exists. The tab and its card are asserted, then measured, then shot. Missing screens are listed in `skipped-<engine>.txt`.
- `probes.mjs` (Chromium). Each part writes `<outdir>/probes/<part>.jsonl`.
  - `pl1`: Esc=0, Enter=1, Space=1, Enter held 2 s=1, Space held 2 s=1 (trusted repeat keydowns), at 390 and 1280, with focus before and after each press.
  - `g3`: explainer once, plus toasts after a reload.
  - `m1`: M4-A hint vs the Farm-tab highlight, 12 samples × 500 ms.
  - `milestones`: H6/V2/B1 toasts from real buys.
  - `w2`: a worker falls asleep under the natural clock. Capped at 540 s because of the lock's 600 s timeout. If it doesn't happen in time, it logs "W2 waived per Art & UX". The manifest type is `w2-asleep`.
- `manifest.mjs`: see Run step 3.
