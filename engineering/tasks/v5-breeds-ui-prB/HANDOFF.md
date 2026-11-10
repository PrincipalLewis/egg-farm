# Breeds UI PR-B — HANDOFF (Features)

Updated 2026-11-10 ~02:05 CET (Europe/Belgrade). Branch `feat/v5-breeds-ui-prB`, LOCAL ONLY (not pushed). Worktree `/workspace/wt-v5-breeds-ui-prB`.

## Tip and parents
- Code tip **4366720** (tree 7493fe88), parent **742e122**.
- 742e122 = merge commit (no rebase), parents **6675993** (previous PR-B tip) + **bd5b068a** (PR-A `v5/breeds-ui-a`, tree d767dfd4, merged forward onto rc/v5 d65391b). Clean, no conflicts.
- This HANDOFF is committed on top of 4366720 (docs only). The latest bundle and progress notes are in `/workspace/artifacts/v5-breeds-ui-prB-wip/` (`prB-<shortsha>.bundle`, `progress.md`).

## Done (4366720)
- `src/ui/breeds-ext-b.ts` registers `PRB_EXT` synchronously through the leaf `./breeds-ext-registry` (`registerBreedsExt`). The deferred-registration workaround and `prbRegistered` are removed. `breeds-hud` also registers through the leaf (idempotent via registry membership). No PR-B module imports breeds-mount, breeds-ui or app.
- The strip countdown rate is `ctx.rollingIncomeRate()` (the app's IncomeRate, same source as BB-5). Formatting still goes only through `fmtTimeToAfford` (keeps the '~').
- The adapter's PR-B block no longer has `FamilyClamp` / `familyClampOf`. The chip reads PR-A's `familyClampState('present', …)` via `presentClampView()`. While PR-A's stub returns undefined, it falls back to the TODO(Saves #126) stand-ins (familyRawBp / familyCapBp / clampFamilyBp). `familyActiveBp = clampFamilyBp(familyRawBp(...))`.
- Label-in-name: PR-B controls carry no aria-label, so the name starts with the visible text and extra info is in aria-describedby. No change was needed.
- No app.ts edit. src/config/balance.json untouched (golden flag stays 0). No magic numbers added.

## Test results (author evidence, local)
- Focused vitest: **213/213**: the prB hud, strip, yard, a11y, mount, sweep, caps and boot tests, plus the PR-A tests breeds-ui (glob naming + registry leaf), hatch, qa-seam and state.
- `tsc --noEmit`: 0 errors.
- Both earlier failures caused by PR-A e40db04 are gone: the Hatching label-in-name failure, and the zero-glob-match test (PR-A replaced it with a naming/leaf test).
- `tests/release-bundle.test.ts` 6/6, including PR-A's flag-0 "no TDZ on module evaluation" test.
- `npm run build:html` PASS, including check-release-build (single file, everything inlined).
- Flag-off #app hash parity (jsdom, boot + mount tests): PASS. With the extender live vs disabled the hash is identical and onSync fires 0 times.
- Logs: `/workspace/artifacts/v5-breeds-ui-prB-wip/run-bd5b068a/`.

## Open
1. ONE full gate run at the final tip (not run; budget rule).
2. Firefox and WebKit browser runs at 390 and 1280 (HoQA bar). The Chromium release-load was not rerun on this head either.
3. Push, then open a Draft PR on base `v5/breeds-ui-a` once `origin/v5/breeds-ui-a` exists. The parent handles the push.
4. Saves #126 in the stack: `capBc` becomes `bc()`, the presentClampView stand-in and familyActiveBp delegate to the sim (or PR-A's clamp-bind fills `familyClampState`), and Saves commit 1 `presentGateOpen` replaces STUB_PRESENT_GATE and the calm stand-ins.
5. #100 goal hook: one app.ts goal hook line (#100's), drop the #goal DOM rewrite and the `bbFallbackActive` stub.

Remaining estimate: **~7 h** (Features work plus waits on Saves #126, #100 and the PR-A origin branch).
