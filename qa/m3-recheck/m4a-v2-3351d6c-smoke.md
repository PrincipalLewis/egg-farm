# M4-A v2 smoke — m4/m4a-tracks-v2 @ 3351d6c (eggfarm-m4a-3351d6c.html, sha256 74db99cd…afe)
Status: **INCOMPLETE / NO VERDICT** — browser runs blocked by box load (21:08 CEST)

## Why blocked
- Load avg was 18 at 20:28 CEST, then 150–254 from 20:45 to 21:08 on 8 cores, and RAM hit 15/15 GB at 21:03. The load came from other agents' jobs: several vitest/tinypool runs in /workspace/wt-html, rc0-browser firefox, a 35-minute WebKit MiniBrowser and multiple Firefox instances. I did not touch them.
- The rule is to wait above ~50. I waited about 12 minutes in total. My one-engine Chromium run (mkv6.mjs) hung with no output and was killed at 300 s. The box tool connection also dropped once.
- Runs at this load would be unreliable, and the WebKit flake check would be meaningless, so none of checks 1–6 has a browser result yet.

## Done (no browser needed, or one light probe at load ~18)
- Port 4493 (python http.server; now stopped). Chromium uses /usr/bin/google-chrome. Firefox-1555 and webkit-2370 are cached for playwright-core 1.64.1 in game/node_modules (no npm ci needed).
- Chromium probe at 20:29 (load ~18): the fresh game loads with **0 console errors/warnings**. The tutorial runs Collect → "A customer! Tap them…" → the customer card "10/10 eggs · $10.00" with "Tap Sell to earn coins.". The Sell click was not completed before the load spike. This is not a check result.
- Expected migration values, from migrateTracksV7 at 3351d6c with M4 on (smoke folder: expected-migration.json):
  | fixture | F/C | coins (cents) | expected H | expected V | refund | price v6→v7 (cents) |
  |---|---|---|---|---|---|---|
  | m1-rc2-v4-12min (v4) | 10/11 | 141585 | 10 | 9 | 0 | 348→365 |
  | m2-rc1-v5-12min (v5) | 10/11 | 15061 | 10 | 9 | 0 | 348→365 |
  | m2-rc1-v5-40min (v5, mid-game) | 19/17 | 1291591 | 19 | 13 | 0 | 593→607 |
  The v6 fixture is to be made by loading v5-40min into a01faea (mkv6.mjs).
- **Check 4 (static, source at 3351d6c), matching Engineering's steer:**
  - `SAVE_VERSION = 6` (src/save/save.ts:6). `serialize` always writes `"version":6`.
  - The marker is `state.tracksV7 = 1`, set in `migrate()` (save.ts:40) and for new M4 farms (game.ts:52).
  - No code writes a v7 save or adds a migration-specific .bak.
  - The only .bak is the existing `eggfarm.save.bak` rotation (save.ts:62/88), which also exists on main. It copies the previous main save, so after migration it holds a v6 save that may be the pre-migration one. The runtime check still needs to confirm this.
  - **Doc mismatch (Minor, docs):** src/sim/state.ts:19 and :23 still say "Saved since v7" and "v7 migration", which contradicts SAVE_VERSION 6. The Architect's "v7 + v6 .bak" description does not match the code.
- **Downgrade (static, a01faea source):**
  - `migrate()` returns `{...initialState, ...d.state}`, so unknown fields (hensLevel, eggValueLevel, celebratedMilestones, tracksV7) pass through.
  - `validate` does not reject extra fields, and the checksum is over the full state JSON.
  - So main should load the marked save and write the markers back unchanged. This is expected only; it needs a runtime check with the a01faea HTML.

## Ready to run (all scripts are in /workspace/scratch-m4a; HTML copied to srv/index.html, a01faea asset copied to srv/main.html)
```
cd /workspace/scratch-m4a/srv && setsid python3 -m http.server 4493 --bind 127.0.0.1 &
cd .. && node mkv6.mjs mkv6                                            # v6 fixture via a01faea
ENGINE=chromium node smoke.mjs && ENGINE=firefox node smoke.mjs && ENGINE=webkit node smoke.mjs
node mkv6.mjs downgrade                                                # migrated save -> a01faea, M4 off
```
smoke.mjs covers all of checks 1–6:
- build ID from Settings, console messages and eggfarm* globals
- tutorial collect/Sell/customer card, then Farm, Hens and Egg value buys with the saved coins difference
- `.up.best` highlight transitions sampled every 200 ms for 12 s
- v4/v5/v6 load, reload and second reload, with all localStorage keys, the .bak version and a scan for any v7 key
- WebKit at 375: scrollWidth vs clientWidth, 5 runs

Results land in this folder.

## UPDATE 21:25 CEST: browser runs completed after load dropped (superseded by 677317d)
- All 3 engines: build ID m3-rc1-pre+3351d6c+m4on.
- Checks 2–6 and the downgrade: PASS.
- Migration matches expected-migration.json exactly.
- Every save is written as version 6 with tracksV7=1. No v7 save and no migration .bak beyond the existing rotation.
- Check 1: FAIL (Minor) in Firefox only, on a fredoka-700 font-preload warning.
- Full detail is in m4a-v3-677317d-smoke.md, which is now the verdict SHA.
