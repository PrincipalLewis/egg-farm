# clockWage flag-on Art evidence (failure-cost v0.3.24)
Code: `wip/hire2/v5-clockwage` @ **e8f42b0** (`git archive`), copied to a throwaway dir with only `m4.flags.clockWage = 1` (nothing committed with the flag on).
Dev build (QA handles `window.eggfarm` / `eggfarmUi`). Shot 2026-11-10 04:33–04:40 CET; box load ≤ 10 throughout.
Engines chromium (system Chrome) / firefox / webkit × 360, 390, 1280 = 54 PNGs, `{engine}-{width}-{n}-{scene}.png`:
1. `1-caption-tip`: MH yawning (energy 50) → AC-FC11 tip "Sleeping workers still get paid. Refill to wake them." (9/9);
   CH Asleep → AC-FC8/10 caption "Still paid $6.00/min" (Farm 12).
2. `2-toast-{role}`: AC-FC9 fall-asleep toasts, all four roles, exact Art strings, routed through the app toast queue (`queueToasts`), one at a time
   (the script waits for the queue to go idle first, so boot milestone toasts never overlap). Placement: toast top 64 px, HUD bottom 56 px →
   under the HUD at every width. B-1: all 36 toasts 2 lines, 320×52, no clip.
3. `3-welcome-back`: AC-FC12 from the **saved** `clockWageWindow`: 120 s of play with MH + CH Asleep (window = MH 120000 ms / 600 ¢, CH 120000 ms / 1200 ¢),
   then `debugBackdateSave(600000)` (the game's own QA handle: save back-dated 10 min, blocks the pagehide write) and a real **page reload**.
   The boot path grants offline eggs ("You were away 10m") and the modal reads the window from the loaded save:
   "Market Hand slept 2:00 and was paid $6.00" / "Coop Hand slept 2:00 and was paid $12.00": 9/9, modal shown 9/9.
   Coop is emptied before the save so the 10-min absence always grants eggs (the modal needs eggs > 0). No $6.05 drift in this run.
`probe.log` = per-shot DOM metrics, 0 page errors in all 9 runs (chromium + webkit from run 12; firefox from run 13 = same script, the welcome probe
switched to Playwright locators because firefox's post-reload `evaluate` read the DOM empty while the screenshot showed both lines). `cwshot.mjs` = the script.
Not pixel goldens. Note: the 1280 caption shot also shows a boot "Coop upgraded!" milestone toast (seeded save at Farm 12; not clockWage).
