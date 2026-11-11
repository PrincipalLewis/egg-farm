# PR #25 fix/hidden-tab-offline @ 59cce62 — QA verify (Saves & Release)
2026-10-17 CEST. origin/fix/hidden-tab-offline = 59cce624b6d3600abad2939fa6ef2c907714b7f6 ✔. Fresh clone /tmp/qa-x/pr25; npm ci, `npm run build`, `build:qa` rc=0.
Runtime build id: **m3-rc1-pre+59cce62** (read from the loaded bundle in each engine; script exits 2 on mismatch). Ports 4361 (hidden), 4362+ (globals/rc0). One engine at a time under the lock.
Method: reused `hidden-tab-offline-b3341bd/qa-hidden.mjs` (visibility override + frozen Date.now), extended → `pr25-hidden-tab-59cce62/qa-hidden-59cce62.mjs`: +120 s case (C-AC36), +coins over-credit check, +m1 (deactivate / refuseNewer while hidden), 60 s popup expectation fixed to v1 copy.
Evidence: `pr25-hidden-tab-59cce62/`.

## Verdict: PASS (FINAL 07:35 CEST)

## Gates
- build + build:qa (tsc, sync-economy --check, check-release-build): PASS
- vitest: 52 files, 561 passed / 1 skipped (562) — PASS (first attempt with `--poolOptions.forks.maxForks=2` errored on pool config; rerun with defaults)

## Hidden-tab ACs — Chromium (06:17): 31/32, the 1 FAIL is a script expectation, not a product bug
- (1) 61/120/671/10800 s hides: N = 244/480/2,684/28,800 exact; equal to close+reload (basket/coins/customers equal) — PASS
- **120 s (C-AC36):** grant 480, nextCustomerId unchanged → 0 customers during the hide — EXPECTED, PASS
- **Over-credit (OC):** coins after hide == coins before hide == close+reload for 61/120/671/10800 s; arrivals 0 — PASS. Short hides 30/59/59.999 s: no grant, no popup, played online — PASS. 60 s: grant 240 + popup — PASS. Double hidden/visible: exactly one grant; second hide: one more; 5×10 s: none — PASS
- (4b) same-ms re-hide (old H-1 Major): now PASS (fixed)
- **m1** hide → `deactivate()` and hide → `refuseNewer(99)`: period closed at freeze (isHidden false), 671 s later show → 0 grant, no popup, save not rewritten — PASS both
- FAIL row "10800 s popup incl. 2h cap": script expects v2 copy "capped at 2h"; branch ships v1 popup `Welcome back! | You were away 2h+ | +28.8K eggs | Collect`, identical to close+reload. Not a regression (same as b3341bd).

## Hidden-tab ACs — Firefox (06:22): 31/32 — identical to Chromium (all ACs incl. 120 s C-AC36, over-credit, 4b, m1 deactivate/refuseNewer PASS; only the v2-copy script expectation row FAILs)

## Hidden-tab ACs — WebKit (06:32): 31/32 — identical to Chromium/Firefox (same single v2-copy script-expectation row)

## Popup wording (verbatim, all 3 engines identical, hide == close+reload)
61 s/120 s/671 s/3 h → `Welcome back! | You were away 1m|2m|11m|2h+ | +244|+480|+2,684|+28.8K eggs | Collect`. Matches the shipped v1 welcome copy (same as main/b3341bd). v2 spec copy ("Away 11m 11s", "capped at 2h", full numbers) belongs to PR #16, not this fix — informational, not a fail.

## Final gates (07:34)
- globals: chromium, firefox and webkit all PASS (eggfarmExportTelemetry only, refused-newer boot [])
- rc0 smoke: chromium 201/201, firefox 201/201, webkit 201/201, all PASS
- Known, not a fail: the v2 popup-copy script expectation row (v1 copy ships, same as main; v2 belongs to PR #16)

## Globals (check-globals, PORT 4362)
Chromium 06:41 / Firefox 06:54 / WebKit 07:01: PASS — only `eggfarmExportTelemetry` (allowed); refused-newer boot window: none; `'eggfarm' in window` = false.

## rc0 (full suite, PORT 4363)
Chromium 07:13: 201/201 · Firefox 07:25: 201/201 · WebKit 07:34: 201/201 — incl. "S2 hidden tab" row (671 s → grant 2,684, coins as at hide, popup). Axe section passed, so no axe-core check needed.

## Findings
None new. b3341bd H-1 (same-ms re-hide, Major) is FIXED in all 3 engines. Informational: popup is still v1 copy ("2h+", "+28.8K"); v2 copy comes with PR #16.

## Not run
- Real OS tab backgrounding (visibility override + mocked clock used).
- m1 through the real main.ts TabLease steal / second tab (exercised by calling Game.deactivate()/refuseNewer() in the page; matches CCR n1).
- C-AC36 on a PR #16 × #25 merged build.
- test:slow (CCR ran it, 11/11).
