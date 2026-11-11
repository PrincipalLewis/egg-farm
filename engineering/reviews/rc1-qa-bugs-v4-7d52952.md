# Code review: fix/rc1-qa-bugs-v4 @ 7d52952 (vs main a01faea), re-check

Scope: the two new commits, `git diff 9601303..7d52952` (7 files, +25/-3), plus whole-branch counts for `a01faea..7d52952`. Earlier reports: `rc1-qa-bugs-v4-94117b6.md` and `rc1-qa-bugs-v4-9601303.md`.

**Limits: static only. Nothing was executed.** I read `git diff 9601303..7d52952` once, which worked. After that the sandbox denied every Bash call (don't-ask mode), so the rest is from the Read tool. I did not run `npm test`, `npm run build`, `tsc` or `npm run check-globals`. I also could not grep the tree, so the checks below that need a search of all of `src/` are marked unverified. The verdict assumes the commands listed under "Before merge" pass.

## Counts

**Whole branch, still open at 7d52952** (`a01faea..7d52952`, 16 commits: the 12 reviewed at 94117b6 plus 25afd4e, 9601303, 45e4e8d and 7d52952, taken from the log, not re-counted; diffstat not recomputed):

| Blocker | Critical | Major | Minor | Nit |
|---|---|---|---|---|
| 0 | 0 | 0 | 2 | 3 |

- Minor: F3 (carried, deferred) and H1 (new).
- Nit: F6 (carried, deferred), G3 (carried) and H2 (new).

**Found over the life of the branch, now fixed:**
- F1, the Blocker, fixed by 25afd4e.
- F2 (Minor) and F4/F5 (Nits), also fixed by 25afd4e.
- G1 (Minor), fixed by 45e4e8d.
- The repeat-tap half of G2, also fixed by 45e4e8d.

**This increment only (`9601303..7d52952`):** 0 Blocker, 0 Critical, 0 Major, 1 Minor (H1), 1 Nit (H2).

## Verification of the 9601303 findings

| # | Was | Status | Evidence |
|---|---|---|---|
| G1 | Minor: docked highlight wiped by `OrderList.fill` | **Fixed** | See below. |
| G2 | Nit: repeat taps, and "+N" tap | **Half fixed** | Repeat taps are fixed. The "+N" tap still highlights the first visible row, which was acceptable and stays that way. |
| G3 | Nit: source-regex unit tests | Open | Still regex-on-source (`/row\.dataset\.hl = '1'/`). The rc0 `tut1docked` section remains the behavioural guard. |

### G1 fix (45e4e8d)

- **Root cause removed.** `OrderList.fill` (`order-list.ts:28`) resets `className` whenever it differs from `order <state>`. That ran about once per frame and stripped `goal-hl`. The highlight is now `data-hl`, an attribute. `fill` never touches it, and `className` resets leave it alone. This is the right fix, and it does not touch `order-list.ts`.
- **Restart and re-arm** (`app.ts:204`):
  - `delete row.dataset.hl; void row.offsetWidth; row.dataset.hl = '1'` forces a style flush, so the CSS animation restarts on a repeat tap.
  - `clearTimeout(Number(row.dataset.hlT))` cancels the previous timer, so tap 1's timer can no longer clear tap 2's highlight early.
  - A new 1200 ms timer is stored in `data-hl-t`. In the browser `setTimeout` returns a number, so `String` then `Number` round-trips. A stale `data-hl-t` attribute is left on the row, which is harmless.
- **CSS** (`styles.css:349`): `.order[data-hl]{outline:3px solid var(--c-focus);outline-offset:2px;animation:hlpulse 600ms 2}`.
  - `--c-focus` exists (`#2B79A8`) and `@keyframes hlpulse` exists (line 237).
  - Precedence against `.order.enter` and `.order.leaving` (lines 364-365) is equal specificity, and the later rule wins. So the 240 ms enter and leave animations take priority, which is right.
  - `.order` has `contain: layout paint; overflow: hidden` (line 359). Those clip contents, not the element's own outline or box-shadow. The nearest scroller is `.sheet .body` (16px padding), which covers the 5px outline. I could not render it, so this is not confirmed.
- **Test.** The first TUT-1 regex still matches the unchanged `if (docked.matches && c) {…\.order[data-row=` line. The second regex matches `row.dataset.hl = '1'`. `retrigger` is still used (`app.ts:415`, `520`), so there is no unused-import or unused-local error.
- **Not covered by any test.** The G1 behaviour itself (the highlight surviving a render) is still in no test. That is the same gap as before.

## Review of 7d52952 (QA B-4)

### What changed

1. `frame-sampler.ts`: `mountPerfOverlay` returns first thing unless `IOS_FLAG_ENABLED`. This adds an import of `../ui/ios-tip` to the lazy chunk.
2. `check-release-build.mjs`: a new scan fails the build on any `\beggfarm[A-Za-z_$][\w$]*` identifier in `dist/assets/*.js` that is not on `ALLOWED_IDENTS` (`eggfarmExportTelemetry`, `eggfarmRecovery`, `eggfarmTabGuard`).
3. `release-globals-browser.mjs`: with `?debug=1&perf=1&ios=1` it requires the eggfarm-prefixed window keys to be exactly `['eggfarmExportTelemetry']`, own plus enumerable, and no `.perf-ov` element. It now exits non-zero if that fails.
4. `release-build-id.test.ts`: one new test for the scan.

### What is right

- **The new identifier scan** is strictly stronger than the old assignment regex. It catches aliased writes (`const w=window; w.eggfarmX=…`), bracket writes (`x["eggfarmSecret"]=…`), `defineProperty` with a literal name, and strings.
  - It does not match `eggfarm.save`, `eggfarm.lease`, `eggfarm-save` or `eggfarm-recovery-closed`. The character after `eggfarm` must be a letter, `_` or `$`, so keys with `.` or `-` pass.
  - I confirmed `eggfarmRecovery` is a `history.pushState` state key in `save-recovery.ts:72-73`.
  - It stays after the old checks, so it only adds failures.
- **The browser check.**
  - It runs after about 3.5 s of play, which is longer than the lazy chunk would take to load and assign.
  - It also looks at `for...in`, so an inherited or non-own key is caught.
  - The exit expression `bad.length || !perfOk ? 1 : 0` parses as `(bad.length || !perfOk) ? 1 : 0`, which is right.
- **The unit test traced by hand against the checker.** `base` has a 7-hex build id, a legal `window.eggfarmExportTelemetry=`, and the two history keys. It exits 0 because:
  - none of the hook strings appear;
  - the assignment regex only sees the allowlisted global;
  - all three identifiers are allowed.
  - The `eggfarmSecret` case (`x["eggfarmSecret"]=1`) is not matched by the `window|globalThis|self.name=` regex. It is on no hook list either, so only the new scan can fail it, and it exits 1 naming `eggfarmSecret`.

### Findings

#### Minor

**H1. The `frame-sampler.ts` guard does not change any build's behaviour, and the commit does not say how B-4 reproduced** (`src/debug/frame-sampler.ts:33`, with `src/main.ts:111-115`)
- `main.ts` is byte-identical to main. It already wraps both `import('./debug/panel')` and `import('./debug/frame-sampler')` in `if (IOS_FLAG_ENABLED)`. `check-release-build.mjs:20-21` already fails on a `frame-sampler-*.js` chunk, on `eggfarmPerf`, on `perf-ov` and on `get("perf")`.
- So in a production build the new guard can never be reached, because the chunk is never emitted. In `--mode qa` or dev, `IOS_FLAG_ENABLED` is true, so the guard passes and nothing changes.
- Consequence: if QA's B-4 repro came from `build:qa` / `dist-qa`, or from a dev server, it still reproduces after this commit. In `qa` mode that is the designed behaviour, but then the finding is a misunderstanding rather than a leak. If it came from `dist/`, then the DCE of `IOS_FLAG_ENABLED` in `main.ts` failed, and this commit fixes the wrong layer. The old chunk and string checks would have failed that build, so that is unlikely unless the check was bypassed or a stale `dist` was served.
- The real value of this commit is the new scan and the browser assertion, not the guard. That is fine as defence in depth.
- Suggested fix: record the repro in the commit or QA note (URL, build mode, which `dist` served). Then run the new `check-globals` against a clean `npm run build`; that is the evidence B-4 is closed. Keep or drop the guard as you prefer.
- Confidence: high that the guard is a no-op. The repro is unknown.

#### Nit

**H2. The B-4 unit test overclaims for its headline case** (`tests/release-build-id.test.ts:29-36`)
- The title says an aliased `eggfarmPerf` write fails. The `perf` assertion would pass without the new scan. `'eggfarmPerf'` is already in the `hooks` list (`check-release-build.mjs:21`), so line 22 exits 1 first with `debug/QA code in release bundle: eggfarmPerf`, and `/eggfarmPerf/` matches that message.
- Only the `eggfarmSecret` assertion exercises the new code.
- Suggested fix: retitle or split it, for example: the aliased `eggfarmPerf` write is caught by the hook list, and an unknown `eggfarm*` identifier is caught by the allowlist scan. Alternatively, use an identifier that is on no hook list for the aliased-write case, such as `const w=window; w.eggfarmFoo=1`.

## Not verified

- **Build-breaking risk of the new scan.** The scan runs over the whole release bundle and exits 1 on any `eggfarm[A-Za-z_$]…` identifier that is not allowlisted.
  - I confirmed `eggfarmRecovery` in `save-recovery.ts`. I could not confirm `eggfarmTabGuard`, because it should be in the tab-guard dialog code.
  - I could not enumerate every `eggfarm…` identifier in `src/`, because I had no grep.
  - If one exists that is neither gated nor listed, `npm run build` now fails at its last step. That would be a loud failure, not a silent one.
  - The author claims the allowlist was derived from a real build, and that is plausible. It needs one `npm run build` to confirm.
- **Rendering and timing.** The outline and pulse in the docked highlight, the 1.2 s duration and the repeat-tap restart are all unverified in a browser.

## Before merge

1. `npm test`. This includes `release-build-id.test.ts` and the updated `qa-rc1-bugs.test.ts`.
2. `npm run build`. This runs `tsc --noEmit`, `vite build` and the full `check-release-build`, so it proves the allowlist matches the real bundle.
3. `npm run check-globals chromium` (and firefox/webkit if available) against that `dist/`. The new "B-4 release ?perf=1" line must print PASS.
4. rc0 `tut1docked` at 1024x474, 1280x720 and 1366x768.
5. Optionally, tap a customer card in a docked layout and check that the order row's outline lasts about 1.2 s. This would be the first test of G1.

## Rebase integrity re-check

- `src/main.ts` is still absent from `a01faea..7d52952`. It was identical to main at 94117b6 and 9601303, and neither new commit touches it.
- `scripts/check-release-build.mjs` is now modified relative to main (an additive scan appended after the last line). Main's `ALLOWED_GLOBALS=['eggfarmExportTelemetry']`, the `eggfarmUi` check and the hook list are untouched.
- Nothing in these two commits touches the sale path, payout, save or recovery code.

## Summary

- G1 is fixed correctly. `data-hl` is out of `fill`'s reach, repeat taps re-arm cleanly, and the CSS and keyframes exist.
- B-4 is a hardening commit. The new identifier allowlist and the browser assertion are sound. The `frame-sampler.ts` guard is a runtime no-op (H1), so what actually closed the QA finding has to come from the build and `check-globals` runs, not from reading the diff.
- The branch has no open Blocker, Critical or Major. Open: 2 Minor and 3 Nit, none of which stops a merge.
- This is static review only. The "Before merge" list is the condition on the verdict.

VERDICT: no blockers
