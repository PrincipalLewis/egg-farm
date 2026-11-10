# Gate 5 re-verify: c9d7523 (storage-blocked explainer fix) — PASS, 0 Major

- SHA: c9d752340841ffcee772babe5caeacb5ef82aace (fix/m4-gate5-v115-on-capped = rc/m4-t3-capped = origin, committed 07:21 CEST), parent 51351f0.
- Evidence: my own run at the full SHA (no QA/eng c9d7523 shots posted yet). build:qa, then rc0-browser ONLY=g5 on chromium/firefox/webkit under the lock. 99 shots + manifest.json with full SHA and sha256s in art-ux/shots/g5-c9d7523/.

## Checks
1. Diff 51351f0..c9d7523: src/main.ts (passes lease.storageBlocked into mountApp), src/ui/app.ts (threads it to showTracksExplainer), src/ui/tracks-explainer.ts (early return null when storageBlocked()), scripts/rc0-browser.mjs (new g5 storage-blocked case), tests/m4-exp1-explainer.test.ts (+25 lines). No save-format, schema, migration or balance change. PASS.
2. Storage really blocked (Storage.prototype.setItem throws, 12–13 throws counted), migrated v5 save, 360x800, 3 engines: no card on load, no card after reload, seen flag stays unset, no page errors. Only the existing "Saving is paused" dialog shows. PASS (6/6 + precondition on each engine).
3. Writable storage: card shows once after Collect (focus on Got it, seen=true, non-modal) and isn't shown after reload, at 360/375/390 on 3 engines. PASS.
4. 1280 docked: Escape/Enter/card close return focus to the active Upgrades tab; focus-after-gotit-1280 activeElement = BUTTON[data-tab=collection].active on all 3 engines; tabs pill 36 / hit 44. PASS.
- Unit: tests/m4-exp1-explainer.test.ts at c9d7523 22/22 pass, including the new describe "HoE Major #49: storage blocked (localStorage.setItem throws)" with a real TabLease.
- rc0 g5 totals: chromium 96/96, firefox 96/96, webkit 96/96.

## Not held (backlog Minors, unchanged)
- No visible focus ring at 360 after Esc; card over the sheet's tab row at 360.
- Outside-tap buy is correct per v1.15.

Verdict: PASS, 0 Blocker/Critical/Major. Gate 5 visual/UX sign-off can go final at c9d7523 (HoAUX to log).
