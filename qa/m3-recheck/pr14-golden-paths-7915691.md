# PR #14 review: golden relative paths @ 7915691
QA, 2026-10-17 00:25 to 00:53 CEST. This is a read-only review. The PR was fetched via `gh auth git-credential` into the scratch worktree /tmp/qa-x/pr14 (base main 7944010). Nothing was pushed, merged or commented. Evidence: `pr14-golden-paths-7915691/` (pr14.diff, vitest.log, tsc.log).

## Verdict: APPROVE

| # | Check | Result |
|---|---|---|
| 1 | Diff touches only the test file | PASS. 1 file, `engineering/golden/flagoff-golden.a01faea.test.ts`, +8/−8, no src/ or game code. |
| 2 | Golden assertions unchanged, only paths | PASS. All 8 changed lines are import specifiers or the fixture URL, changed from `../` to `../../`. PINS, FIX, the loop counts and every expect are untouched. A grep of the +/- lines with path lines excluded comes back empty. |
| 3 | vitest, max 2 workers, under `flock .browser-test.lock timeout 600` | PASS. 49/49 files; 471 tests = 469 passed + 2 skipped (pre-existing skips: economy-copy because product/ is absent, plus 1 in economy.test.ts). The golden suite runs and passes: storage bytes + sim trace, 2/2. |
| 4 | tsc --noEmit | PASS (exit 0) |

Diff, quoted:
```
-import { balance } from '../src/config/balance';
-import { loadSafe, save, SAVE_KEY, type KV } from '../src/save/save';
-import { step } from '../src/sim/tick';
-import { initialState } from '../src/sim/state';
-import { apply } from '../src/sim/actions';
-import { applyOffline } from '../src/sim/offline';
-import { runBot } from '../tests/bot';
+import { balance } from '../../src/config/balance';
+import { loadSafe, save, SAVE_KEY, type KV } from '../../src/save/save';
+import { step } from '../../src/sim/tick';
+import { initialState } from '../../src/sim/state';
+import { apply } from '../../src/sim/actions';
+import { applyOffline } from '../../src/sim/offline';
+import { runBot } from '../../tests/bot';
@@ storage bytes
-      const raw = readFileSync(new URL(`../tests/fixtures/saves/${f}.json`, import.meta.url), 'utf8');
+      const raw = readFileSync(new URL(`../../tests/fixtures/saves/${f}.json`, import.meta.url), 'utf8');
```
"471/471" means 471 collected with 0 failures; 2 of them are skipped. That matches the PR body ("471 tests pass").

Not run: browser suites (no game code changed). The golden suite was run once; the PR #13 run reuses it, see pr13-release-check-6cc37f6.md.
