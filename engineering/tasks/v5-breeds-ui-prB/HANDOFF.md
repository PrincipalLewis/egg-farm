# Breeds UI PR-B — HANDOFF (Features)

Updated 2026-11-10 ~03:50 CET (Europe/Belgrade). Branch `feat/v5-breeds-ui-prB` (ON ORIGIN), worktree `/workspace/wt-v5-breeds-ui-prB`.
**Status: Draft-ready (PR NOT opened; base `v5/breeds-ui-a` @ bd5b068a not on origin yet).**

## Architect PR-B review (v5-breeds-ui-prB-4c994a7-architect.md, sha256 97119b64): APPROVE w/ conditions. Minors closed (03:50 CET)
- **m1** `breeds-strip.ts`: 'ready' = the UNROUNDED `s.coinsCents >= cost`, the same compare `startHatch` makes. The countdown gap keeps BB-5's `Math.round(coinsCents)` (PMC ruling, unchanged). Test: cost − 0.4¢ → `startHatch` refuses and the strip says `waiting`; exactly cost → both go.
- **m2** `hatchPriceNowCents` is pinned to `startHatch` (no Saves price export on rc/v5): for the free and paid hatch, `coinsCents − startHatch(s).coinsCents === hatchPriceNowCents(s)` (strip.test).
- **m3** `PresentGateSource.open(s, b)`: `nowMs` dropped (BR-R12b is sim focus seconds, the Saves gate owns its clock). The reference gates (tests `RefGate`, harness gate) take an injected FOCUS clock and expose only `open(s, b)`. Note: rc/v5 GameState has no focus accumulator, so the reference clock stays injected until Saves #126 commit 1 `presentGateOpen`; in the harness, page.clock is paused so performance.now() advances only by attended `runFor` time.
- **m4** `scripts/breeds-ui-prB-browser.mjs` prints `HEAD <sha>` + `git status --porcelain` first; new versioned runner `scripts/breeds-ui-prB-browser-matrix.sh` writes both into browser-summary.txt. **No browser rerun now; rerun at the Ready head.**
- **m5** the `#goal` capture-phase click listener is KEPT and marked **Draft-only** (comment in breeds-strip.ts): it goes when the #100 goal hook lands.
- **Nits** yard.test reads the `const order = [...]` literal from `src/ui/app.ts` and compares it to `YARD_FILL_ORDER`; `PRB_STUB_TUNABLES` moved out of src into `tests/fixtures/breeds-prB/setup.ts` (caps.test now asserts the adapter no longer exports it).
- Focused 222/222 (14 files), tsc 0. No full gate rerun (4c994a7 stays the gate of record; next full gate at the Ready head).

## READY GATE (Architect M1): NOT now, must happen before Draft → Ready
- Before Ready, Saves **#126** and **clamp-bind (29edfc8)** go into the stack. Then DELETE `PRB_CAP_STANDINS`, `capBc`, `familyCapBp`, `clampFamilyBp` and `familyActiveBp` (and the `presentClampView` fallback with its stub test).
- **If #126 slips:** the fallback shows the RAW family bp with `atCap: false` (no stand-in cap shown). Then rerun the full gate + browser matrix at the Ready head.

## Architect ruling on the clamp fallback (03:2x CET), applied
- The TODO(Saves #126) fallback in `presentClampView()` is KEPT. (a) It is reached ONLY when `familyClampState` returns `undefined`: the guard is now `bound !== undefined`. (b) The flag-0 path is untouched: `breedsOf()` returns null when the flag is off, so the function returns before `familyClampState` or the fallback runs. (c) The pin is `tests/v5-breeds-prB-clamp-stub.test.ts`, which mocks `familyClampState` to return undefined and checks for the stand-in `{1125, 700, atCap}` and the chip "+7%".
- **The fallback is removed when clamp-bind (29edfc8) lands after Saves #126 commit 1.**
- Focused: 220/220 (the PR-B and PR-A breeds tests plus release-bundle). tsc 0. The full gate at 4c994a7 stays the gate of record for everything except this test (not rerun, per the ruling).

## Latest (LEAN run, 03:00–03:35 CET)
- Code tip **4c994a7** (tree d52cf988) = 54f6b95 + harness-only commit: `scripts/breeds-ui-prB-browser.mjs` takes `chromium|firefox|webkit` and `VW`/`VH` (FF/WK AX via Playwright accname + aria-describedby). No src/ change. This HANDOFF commit sits on top (docs only).
- **Full gate @ 4c994a7: GREEN.** npm test 2439/2439 (167 files) incl. sync-economy --check; test:slow 17 + 1 skip; build (tsc + vite + check-release-build); check-globals chromium/firefox/webkit; build:qa; golden-game-browser; build:html; release-load flag 0 (0 errors, #app 8780ed47…). Logs: `/workspace/artifacts/v5-breeds-ui-prB-4c994a7/gate-*.log`, `gate-summary.txt`.
- **Browser harness 3 engines × 390×844 / 1280×800: 6/6 runs ALL PASS (17/17 each)** incl. F0-1 flag-off #app hash parity. `browser/<engine>-<vp>/`, 36 shots in `SHA256SUMS`.
- First gate attempt at 54f6b95 was invalid (+dirty build id from the uncommitted harness edit); rerun at 4c994a7 is the gate of record.
- Box note: Playwright Firefox/WebKit were missing after a restore; reinstalled with `npx playwright-core install firefox webkit` and the 6 WebKit host libs from `scratch/webkit-debs` (dpkg, per ops/webkit-fix-20261030.md; no optional deps added, QA-D-1030-WKDEPS respected).
- PR body: `/workspace/artifacts/v5-breeds-ui-prB-4c994a7/pr-body.md` (cites base v5/breeds-ui-a @ bd5b068a).
- familyClampState fallback: Architect ruling applied (see above).

## Remaining (~4.5 h): Saves #126 (capBc → bc(), clamp delegate) + commit 1 presentGateOpen; #100 goal hook line + drop #goal DOM rewrite/bbFallbackActive; open Draft once origin/v5/breeds-ui-a exists.

---
## Previous HANDOFF (02:05 CET)

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
