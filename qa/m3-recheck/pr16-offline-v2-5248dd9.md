# PR #16 offline popup v2 @ 5248dd9 — SUPERSEDED by 0470045 (see pr16-offline-v2-0470045.md)
Note: the PR head has moved to 0470045 since this was requested; tested 5248dd9 as asked. Base fix/rc1-qa-bugs-v4 (7d52952).
Build: dist + dist-qa built OK; the bundle contains 5248dd9 (no build-id meta on this base, so the runtime check is the served-bundle == local check in s2-lib). Evidence: pr16-offline-v2-5248dd9-evidence/
## Results (appended per step)
- vitest (2 workers, locked, 05:38–05:40 CEST): 540 passed, 2 skipped, 0 failed (vitest-full.log)
- offline-clock Chromium (port 4650, served bundle index-BgV-aeng.js == local dist-qa): 6/6 PASS (1 h grant + modal, proportional to cap, 48 h clamped, clock back 1 h = no grant, 20 s = no grant, no page errors)
