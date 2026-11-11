# M4-A v3 smoke: m4/m4a-tracks-v3 @ 677317d (verdict SHA)
Build: engineering/builds/eggfarm-m4a-677317d.html (sha256 3e5ca89a…6b1c). Served on 127.0.0.1:4493. Playwright-core 1.64.1. Engines run one at a time: Chromium (system google-chrome), then Firefox 1555, then WebKit 2370.
Run 21:22–21:25 CEST. Box load 5–7 throughout; I waited for load to stay under 50 before starting. Evidence: m4a-v3-677317d-smoke/. Scripts: /workspace/scratch-m4a/smoke3.mjs and mkv6-3.mjs.

## Verdict: FAIL (Minor only), 1 bug
- Nothing blocks a playtest.
- Every functional, save and migration check passes in all 3 engines.
- Check 1 fails only on its strict "zero warnings" rule: Firefox logs one console warning.

### BUG M4A-S1: Firefox font-preload warning (Minor; console hygiene, new vs main)
- **Repro:**
  1. Open eggfarm-m4a-677317d.html in Firefox.
  2. Tap to start.
  3. Wait about 5 s.
- **Result:** `JavaScript Warning: "The resource at "data:font/woff2;base64,…#fonts/fredoka-latin-700-normal.woff2" preloaded with link preload was not used within a few seconds…"`
- Also present on 3351d6c.
- Not present on a01faea (m3-rc1-dialog asset; 8 s in Firefox, 0 messages).
- Chromium and WebKit are clean.
- **Likely fix:** drop the Fredoka 700 `<link rel=preload>` from the M4 single-file build, or use the 700 weight on first paint.

## Results (build ID shown in Settings at runtime: m3-rc1-pre+677317d+m4on in all 3 engines)
| # | Check | Chromium | Firefox | WebKit |
|---|---|---|---|---|
| 1 | Console clean; only eggfarm* global is eggfarmExportTelemetry | PASS (0 msgs) | **FAIL (Minor)**: 1 font-preload warning; globals OK | PASS (0 msgs) |
| 2 | Core loop | PASS | PASS | PASS |
| 3 | v4/v5/v6 migration | PASS | PASS | PASS |
| 4 | Save version / backups | PASS | PASS | PASS |
| 5 | Best-payback highlight | PASS | PASS | PASS |
| 6 | No horizontal scroll at 375 on Farm | n/a | n/a | PASS 5/5 (scrollWidth = clientWidth = 375, scrollX 0) |
| D | Downgrade to a01faea | PASS (byte-identical) | | |

### 2. Core loop
- **Tutorial:** Collect → "A customer! Tap them to sell eggs." → customer card (e.g. "8/8 eggs · $8.00", "Tap Sell to earn coins.") → Sell.
- **Coins after the sale:** $0.00 → card price exactly in every engine ($6 Chromium, $9 Firefox, $8 WebKit; demand is random). "Thanks! +$x" then shows, and the tutorial moves to its next step.
- **Purchases:** run on the mid-game save (v5-40min, coins set to $50,000). Each buy raises its level by exactly 1 and charges the table cost:

| Upgrade | Cost | Coins, Chromium/WebKit | Firefox |
|---|---|---|---|
| Farm 19→20 | $18,201 | $50.3K → $32.5K | (see note) |
| Hens 19→20 | $5,262 | $32.5K → $27.3K | debit exactly 526,200 cents |
| Egg value 13→14 | $1,955 | debit exactly 195,500 cents | $27.3K → $25.3K |

- **Note:** saved-coin differences that are smaller than the cost include income earned between the two snapshots.

### 3. Migration vs expected-migration.json (identical in all 3 engines)
| Save | Before: F / C / coins | After load (v6) | After 2nd reload |
|---|---|---|---|
| v4 m1-rc2-12min | 10 / 11 / 141585 | F10 C11 **H10 V9** tracksV7=1, coins 141585 | unchanged |
| v5 m2-rc1-40min (mid-game) | 19 / 17 / 1291591 | F19 C17 **H19 V13** tracksV7=1, workers + grader 2 kept | unchanged |
| v6 (v5-40min saved by a01faea) | 19 / 17 / 1317637 | F19 C17 **H19 V13** tracksV7=1 | unchanged |

- Hens and Egg value match expected exactly. Refund is 0, as expected.
- Coin differences after the load are live income only.

### 4. Save version and backups
- Every written save is `"version":6`. There is no v7 key and no v7 value anywhere in localStorage.
- **New `eggfarm.save.v6_backup`:**
  - present after the first load, in every engine and for every save;
  - byte-identical to the injected pre-migration save (version 4/5/6, no tracksV7);
  - unchanged after the 2nd reload, so it is written once only.
- `eggfarm.save.bak` (the existing rotation) holds a v6 save.
- IndexedDB `eggfarm` v1 mirror is present.
- This matches Engineering's description: SAVE_VERSION 6, in-place marker, one-time v6 backup. It does not match the Architect's "written as v7".
- **Doc nit (carried over from v2):** src/sim/state.ts comments still mention "v7". Partly edited in 677317d; not rechecked.

### 5. Best-payback highlight
- **UI:** sampled `.up.best` every 200 ms for 12 s after the buys, in all engines. Egg value stayed the highlighted pick (pending, then affordable): no flicker and no premature switch.
- A natural ≥10% challenger did not occur in that window, so the 2 s / 0.9× switch itself was verified by unit tests: m4a-pick-hysteresis + m4a-save-migrate, 26/26 pass (run on 3351d6c; hysteresis code unchanged in 677317d).
- Engineering's gate40_hyst also passes.

### D. Downgrade to a01faea (M4 off)
- Input: the Chromium-migrated v5-40min save, F19 C17 H19 V13 tracksV7=1, milestones [hens:10, grade:5, grade:10, balanced:1, balanced:2].
- Loaded in a01faea (build ID m3-rc1-pre+a01faea). The only dialog was the normal "Welcome back! +590 eggs" offline popup. 0 console errors.
- F, C, workers and coins are all kept (coins only grew).
- After a01faea re-saved twice (load, then reload + save), the JSON of hensLevel, eggValueLevel, celebratedMilestones and tracksV7 is **byte-identical** to the input. No keys were added or dropped.

## Earlier run on 3351d6c (superseded): m4a-v2-3351d6c-smoke.md
Same results on all checks, except that 3351d6c has no v6_backup key. Its downgrade was also lossless. It has the same Firefox warning.
