# QA acceptance report: egg-farm m3-rc1-dialog @ a01faea

- **Build:** `egg-farm-m3-rc1-dialog-a01faea.html` (tag m3-rc1-dialog, PrincipalLewis/egg-farm). The in-app build string is `m3-rc1-pre+a01faea`.
- **Engines:** Chromium (Google Chrome via Playwright-core 1.64.1, headless), Firefox (Playwright firefox-1555, headless)
- **Date:** 2026-10-16
- **Method:** opened from `file://` in a fresh context. Every non-file/data/blob request was routed and aborted (offline). The driver is `run.js` in this folder, run under `flock /workspace/egg-farm-studio/.browser-test.lock`. One engine ran at a time and no HTTP server was used.
- **STATUS: PASS**

| # | Check | Chromium | Firefox | Evidence |
|---|---|---|---|---|
| 1 | Opens offline + build ID a01faea | PASS | PASS | 0 external requests attempted (`*/blocked.txt` is empty). Settings shows "Egg Farm m3-rc1-pre+a01faea" (`*/08-settings.png`) |
| 2 | Zero console errors | PASS | PASS | Chromium: 0 console messages, 0 pageerrors. Firefox: 0 errors, 0 pageerrors, 1 **warning** (preloaded data: font fredoka-latin-700 not used within a few seconds) (`*/console.log`) |
| 3 | Only eggfarm* global = eggfarmExportTelemetry | PASS | PASS | `["eggfarmExportTelemetry"]` at start and at end of run |
| 4 | Core loop, exact coin deltas | PASS | PASS | See below |
| 5 | Reload persists | PASS | PASS | Chromium before/after: $8.00, basket 3, Collect +10, Collection L2. Firefox: $0.00, basket 11, Collect +10, Collection L2 (`*/10-reloaded-started.png`) |

## Item 4 numbers
**Chromium**
- Sell 1 (tutorial Sell step). Card "8/8 eggs · $8.00 [Sell]". Coins $0.00 → $8.00 (+8.00), basket 8 → 0.
- Sell 2. Card "10/10 eggs · $10.00 [Sell]". Coins $8.00 → $18.00 (+10.00), basket 13 → 3.
- Buy. "Collect per tap 5 → 10, Level 0/30, price $10.00". Coins $18.00 → $8.00 (−10.00). Collect +5 → +10, goal L1 → L2.

**Firefox**
- Sell 1. Partial order card "8/10 eggs · $10.00 [Sell 8]". Coins $0.00 → $8.00 (+8.00, 8 eggs × $1.00), basket 8 → 0. Card then showed "8/10 eggs · $10.00 Need 2" (`firefox/04-after-sell-0.png`).
- Sell 2. Same order, now "10/10 eggs · $10.00 [Sell]". Coins $8.00 → $10.00 (+2.00), basket 13 → 11. Total paid for the order: $8 + $2 = $10.00, which equals the order total shown.
- Buy at $10.00. Coins $10.00 → $0.00 (−10.00). Collect +5 → +10.

**Observation (non-blocking UX note, not a defect against this checklist):** on a partially filled order, the card keeps showing the order total ($10.00). It does not show the remaining payout ($2.00) that the next Sell tap pays.

## Notes
- The build label reads `m3-rc1-pre+a01faea`. The hash matches, but the label says "pre", not "rc1".
- Screenshots and page-text dumps: `chromium/NN-*.png|txt` and `firefox/NN-*.png|txt`. Raw numbers are in `*/result.json`.

```yaml
status: PASS
sha: a01faea
engines: [chromium, firefox]
items:
  offline_build_id: {chromium: PASS, firefox: PASS}
  zero_console_errors: {chromium: PASS, firefox: PASS}
  globals: {chromium: PASS, firefox: PASS}
  core_loop: {chromium: PASS, firefox: PASS}
  reload_persists: {chromium: PASS, firefox: PASS}
```
