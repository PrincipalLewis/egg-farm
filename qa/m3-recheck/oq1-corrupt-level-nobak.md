# OQ-1: corrupt upgrade level with no .bak (for PM, Farm Upgrades)
Build: c11e3a0 (rc/m4-t3-capped, capped, M4 on), Chromium, release `dist` and QA `dist-qa`, 390x844. Checked 07:3x CEST on 19 Oct.

## Fixture
- `qa/m3-recheck/oq1/OQ1-farmLevel-abc-nobak.json`, sha256 `7dea4a432f643ad367a34b43428265131a67b7f3a924112156fd9711173416ed`
- Valid v6 save (version 6, correct checksum, tracksV7:1, v6BackupId 00112233aabbccdd), coins $77,777.77, Collection 12, Hens 18, Egg value 11. **Corrupt field: `state.farmLevel = "abc"`** (string). sanitizeLevel (7ab3d3d) rejects it as invalid_state. There is no `eggfarm.save.bak` and no v6_backup.

## Steps
1. Empty localStorage. Set `eggfarm.save` to the fixture (and `eggfarm.ui={"onboardingDone":true}`). No `.bak`.
2. Open the game and tap "Tap to start".
3. Script: `qa/m3-scripts/oq1-nobak.mjs <worktree> chromium 5964 <outdir> dist|dist-qa` (run from the worktree, under the browser lock).

## Observed (same in dist and dist-qa)
- **The save-recovery dialog (src/ui/save-recovery.ts) DID fire.** Verified in the DOM: `.recovery-layer` with `data-outcome="fresh"`, title "A fresh start", body "We couldn't open your farm. Your old save is kept safe.", button "Start farming", and an "Export old save" button. Screenshots: `oq1/oq1-chromium-{dist,dist-qa}-dialog.png`.
- After "Start farming": **fresh farm, 0 coins, all levels 0, onboarding runs again** (`oq1-*-after.png`).
- Corrupt bytes are kept in `eggfarm.save.corrupt.<ts>` (+ `eggfarm.save.corrupt.index`). Confirmed that the stored copy contains `"farmLevel":"abc"`. No page errors.
- Unit check (gate4-sanitize.qa.test.ts) agrees: no crash, recovery case F, outcome fresh.

## The PM question
One bad level field wipes the whole farm ($77.7K and 3 valid levels) when there is no .bak, even though the rest of the save is valid. The data is recoverable only through "Export old save" and manual support. Options: (a) keep as is (strict, safe), or (b) per-field salvage, e.g. clamp or zero only the invalid level and keep the rest. Option (b) is a product decision and a save-code change. QA takes no position on it.
