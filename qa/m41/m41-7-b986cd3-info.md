# M41-7 PR #63 @ b986cd3: INFO ONLY (gate STOPPED per D-HOP-2026-10-22-07) · Saves & Release QA · 2026-10-22 22:25 CEST
SHA `b986cd3b9c58c8278437d7e130de0e085348501c` (fix/saves-csr-loadsafe, fast-forward from dfdf49c; 70e9f84 explainer, 11684c2 CSR-8 8b, b986cd3 G5).
**Status: STOPPED by HoQA, no verdict.** HoP ruled D-HOP-2026-10-22-07: seen-on-dismiss is for M1/M2 restore boots ONLY. On every other path m4a §17 / EXP-B1 stay as built, and the 5 m4-exp1 tests stay unchanged. So b986cd3 needs a fix, and HoE will push a new SHA. Nothing here is gate evidence. The single full gate runs on the next SHA (see `csr-m41-7-plan.md` §1 -07).

## 1. What ran on b986cd3 (our runs, before the stop)
| Part | Evidence | What happened |
|---|---|---|
| CSR ACs (`csr-m41-7-acs.sh`) | `m41-7-b986cd3/csr/summary.txt`, `runner.out` | 22:11:31 CEST: **refused at the spec guard** (spec on disk was already 073fafd3, the runner wanted cc6b7e23). **Zero tests ran**: no worktree, build, vitest or browser. |
| Gates | `m41-7-b986cd3/gates/head-ancestry.txt`, `npm-ci.log` | 22:11:15: fetch, then head check: origin/fix/saves-csr-loadsafe = refs/pull/63/head = b986cd3. dd223f5, 1682a0c, 66680eb, 9cce82d, 4c94704, c61ed2b and dfdf49c are all ancestors. 3 commits, 12 files (+320/−56). Clean worktree `qa/wt-m41-7-b986cd3` (porcelain 0) and `npm ci` exit 0. **Nothing else ran**: no tsc, vitest, builds or browser. |
| Reports | — | `m41-7-b986cd3-csr.md` / `-gates.md` were **never written**, and the stopped run wrote **no reset_at test scripts**. |

Saves' own logs at `/workspace/m41-7-gates/b986cd3…/` are **not QA evidence** (per HoQA). For reference only, their summary says tsc, sync, golden, unit 1189/1189, test:slow 16 (+1 skipped), builds, check-globals and rc0 Chromium 352/352 all exit 0.

## 2. Smoke runs after the stop (allowed by the prep task, used ONCE to test the new test code; INFO, not a verdict)
Evidence: `m41-7-b986cd3/smoke-info/`.
### 2.1 -07 m4-exp1 byte-identity (`m41-7-testdiff.sh`): **CHANGED on b986cd3** (expected, since HoQA flagged it)
`git diff dfdf49c..b986cd3 -- tests/m4-exp1-explainer.test.ts` is not empty. It's +24/−17, 41 changed lines, blob 15b43290 → b6ef2b95. Line list: `smoke-info/testdiff/m4-exp1.changed-lines.txt`. Every change encodes seen-on-dismiss on NON-restore paths, which -07 overturns:
- EXP1 AC(1) L43–46: "persisted when shown" (`seen === true` at show) → `toBeUndefined()` at show, true only after a click.
- EXP1 AC(2) L55–57: seen at show → undefined until a click.
- auto-hide L100–104: now asserts `seen === false` after EXP_MS. That is the opposite of -07, where the auto-hide counts.
- Saves m1 L113–117 and hidden tab L124–129: `saved == [true]` at show → `[]` until a click.
- HoE #49 control L226–232: the at-show seen assert was removed.
- #49b L232–243 and the Saves/HoQA Major L246–260: "no card when the flag write fails" (`toBeNull()`) → the card is shown and the click write fails. That's a weakened storage-failure guard.
- Q2 L278–300: "card shown **exactly once overall**" (`=== 1`) → `[1,false,1,true,0]`, so the card shows again.

### 2.2 Review diffs vs dfdf49c (`smoke-info/testdiff/review-*.diff`)
| File | Δ | Assessment |
|---|---|---|
| tests/m41-6-explainer-storage.test.ts | +12 −6 | **Weakened for -07.** `boot()` now clicks every card. EXP-SB-QE-LATE "card seen **exactly once overall**" (`toBe(1)`) → `[false,false,1,0]` (re-shown on reload). Mirror variants "no card while quota fails" (`shown 0`) + "exactly once overall" → `[1,false,1,0]`. Must return to the dfdf49c oracle on non-restore paths. |
| tests/m41-6-save-mirror-canpersist.test.ts | +6 −3 | **Weakened for -07.** `showTracksExplainer(...)` `toBeNull()` on a failing flag write → card shown, click; the retry-path check now clicks before asserting seen. |
| tests/m41-7-hop-rulings.test.ts | +1 −1 | **OK.** The regex follows the new `bootPreserveIdb(…, () => lease.owns())` argument (CSR-8 8b). It still pins the call and `idbCopy === 'failed' ? null : mirror`. Not weakened. |
| scripts/rc0-browser.mjs (G5) | +7 −3 | **Inverted for -07.** The G5 card check went `c.seen === true` → `c.seen !== true` at show, plus a new "seen set on Got it". G5 quota-after-load went "QuotaExceededError on the flag write, **no card**" → "card shown, failure at Got it, seen reverted". On the normal path -07 needs seen at show, so this must go back to dfdf49c. |
Other test/script files changed vs dfdf49c (new, for 8b and the explainer): tests/fake-idb.ts, tests/m41-7-csr8b-race.test.ts, tests/m41-7-explainer-recovery.test.ts.

### 2.3 -07(b) reset_at vitest block (`csr-m41-7.qa.test.ts -t RESET_AT`): 24/24 it() passed on b986cd3 (`smoke-info/vitest-resetat.log`, `vitest-resetat-b986cd3.json`)
Facts (real `SV.preserveCorrupt`, `IdbMirror.preserveCorrupt`, `resetProgress`, clearMirror delete, then main.ts boot order):
- Reset writes `eggfarm.save.reset_at = String(now)` and keeps the LS and IDB corrupt.* copies.
- Pre-reset copies (LS+IDB, IDB only, LS only; each also with the tab dying before the first save): no dialog and no save_corrupt in 3/3 boots. Bytes kept, reset_at unchanged.
- Post-reset chain:
  - LS main corrupt + valid .bak → R/bak/M1.
  - .bak invalid + IDB valid → R/idb/M1 F17.
  - Nothing valid → F/M3 store ls.
  - IDB main corrupt → F/M3 store idb.
  - Post-reset 8b orphan copy → F/M3 store idb.
  - In all five, the pre-reset bytes are kept.
- Quota-blocked reset_at write: M3 **exactly once** over 3 boots (store idb), all bytes kept. That also holds with the tab dying before the first save, and with quota persisting on every boot (both INFO).
- reset_at is unchanged over 3 boots × 3 saves. Export of M3 bytes (450 B) leaves every LS key unchanged.
- Static check: the only writer is `src/save/save.ts:127` (resetProgress). There's no removeItem, it isn't in RESET_KEYS, and nothing sweeps keys. **There is no import path in this build**, so "import doesn't touch reset_at" is N/A.
- **INFO edges:**
  - `abc`, `''` and `-5` count as 0, so a pre-reset copy shows M3 once (fail-safe, nothing lost).
  - `T_reset+0.5` works normally.
  - **Future reset_at (+1 y, device clock ahead at the reset):** a genuine *post-reset* 8b orphan copy is ignored. The boot is silent: no dialog and no Export, though the bytes stay in IDB. It's rare (needs clock skew plus the 8b race). Raise it to HoE/HoQA as Info, and consider clamping reset_at to ≤ now at read time.
- Discrimination: the malformed-value edges show the same seeded pre-reset copy *does* reach M3 when reset_at is unusable, so RA1 would fail without the reset_at feature.

Browser reset_at (`csr-m41-7-resetat.mjs`) and the -07(a) explainer asserts (`csr9c-explainer-queue.mjs`) were **not** run on b986cd3. They're checked by syntax and dry-run only.

## 3. Housekeeping
- I killed no processes. None of ours were running at the stop. The browser lock and other ports were held by other agents' jobs (Art `m41-pr63-b986cd3-shots.mjs`, wt-m41-9ux rc0), so I left them alone. :5961 is free.
- Pre-edit copies of the changed scripts: `m41-7-b986cd3/*.pre07.bak`. Dry-run logs: `m41-7-b986cd3/smoke-info/dry/`.
