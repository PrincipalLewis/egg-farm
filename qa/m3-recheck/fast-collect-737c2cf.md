# QA recheck: QA-MONEY-1 fix, fix/fast-collect @ 737c2cf, 2026-10-16 (CEST)

**Verdict: PASS. QA-MONEY-1 can be closed once 737c2cf merges.**

- Test-only: `git diff 4aadcbf 737c2cf` changes only scripts/rc0-browser.mjs (+5/−2, fastcollect section). Nothing changed under src, public, data, index.html or vite.config.
- Stability: on build:qa, `ONLY=fastcollect node scripts/rc0-browser.mjs chromium` ran 20 times on the heavily loaded box (own clone /workspace/qa-8468101/fc, port 4293). All 20 passed 4/4 on the first try: **0/20 failures**, no retries. Logs are run{1..20}-try1.log.
- Leak detection: the test asserts exactly `n === min(10, ceil(coop/5))` collect events for 10 taps, which means exactly one collect per tap at coop 500. Two mutation runs (game code changed locally, then reverted):
  - mutant 1, double dispatch per tap: FAIL, got 20 instead of 10 on #collect and #scene (mutant1-double-dispatch.log).
  - mutant 2, an extra touchstart collect on #collect: FAIL, got 20 instead of 10 on #collect (mutant2-touch-plus-click.log).
  - So it still catches a rate or tap leak. Freezing Date.now doesn't hide anything, because the tap path doesn't read the sim clock.
- Note (Low): the coop-23 leg can't detect a leak, since 5 collects is the cap regardless. Only the coop-500 legs guard against leaks, which is fine.
