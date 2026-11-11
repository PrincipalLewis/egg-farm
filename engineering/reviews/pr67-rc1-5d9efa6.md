# CCR merge-resolution review: PR #67 (`rc/m4.1-rc1` @ `5d9efa61c5e6ee31ca9ebdec20ee70167d31d463`)
- **Reviewer:** Claude Code Reviewer (read-only)
- **Date:** 2026-10-23 06:38 CEST (`Europe/Belgrade`, UTC+2)
- **Worktree:** `/workspace/review-pr65-7779088` (detached at `5d9efa61c5e6ee31ca9ebdec20ee70167d31d463`)
- **Base:** `main` @ `dd223f510e9acabf9b1915b56e39da8b88dcac63`
- **Constituent PR heads:** `#60` (`5789805`), `#61` (`33f1538`), `#62` (`09cee47`), `#63` (`3c86720`), `#64` (`3110e88`), `#65` (`c877f69`), `#66` (`8c568b0`)
- **Claude calls:** 0

**Verdict: PASS — 0 Blocking / 0 Major / 0 Minor / 0 Nits.**
All 116 files changed across the 7 approved PRs are accounted for in `5d9efa6` with zero extra or omitted files. All **112 single-PR files** match their approved PR head blobs byte-for-byte, and all **4 multi-PR files** (`scripts/rc0-browser.mjs`, `src/ui/app.ts`, `src/ui/styles.css`, `src/ui/tracks-explainer.ts`) preserve every PR's logic and rulings without regression.

---

## 1. Git Tree & File-by-File Merge Verification (`dd223f5..5d9efa6`)

| Constituent PR | Approved Head SHA | Scope | Files Changed vs. `dd223f5` |
|---|---|---|---|
| **#60** (`M41-11`) | `5789805911ad7f96c23fdf42d06a1854a936c0c3` | Data-driven unlock Farm level (`trackUnlockFarm`) & `Max for this farm` pill | 6 |
| **#61** (`M41-10`) | `33f153884606b4a72c60a8760463264745d21962` | Release build-id prefix constant `BUILD_PREFIX = 'm4.1'` | 51 |
| **#62** (`M41-8`) | `09cee47cab5465a7f7103f72497832776165f14c` | F3/F4 next-goal label (`★`, `+X% income`, `aria-describedby` for WCAG 2.5.3) & UX-M4 `★ Best buy` chip | 9 |
| **#63** (`M41-6/7`) | `3c867204c94aabf7f65c41e3ebfd0b9544a792aa` | `save({ mirrorOnFail })`, `loadSafe` CSR v0.2.3 + IDB mirror + CSR-8 8b race + D-HOP-2026-10-23-01 AC3/AC4 | 32 |
| **#64** (`M41-9`) | `3110e88226a5ee7e01c46f7bab4bd9f0d96208d3` | QA4-1/2/3 big-number suffixes `Qa–Dc`, `fmtSci` (`>=1e36`), NBSP units, order-card step-down + `fit3` wrap | 16 |
| **#65** (`M41-9`) | `c877f69a407ec844a4d10612030584be42e34bdf` | UX-M1/M2/M3/M5 focus ring, `--toast-safe-b`, clear-checked explainer placement (`place: 'none'` fallback), close fade & refund coin pop | 10 |
| **#66** (`rc0`) | `8c568b0788ffd1371930c6db202b9e96e2655919` | `serveOwn` / `serveForRun` free-port preview, `expectHeadBuild` dirty/untracked guard, SIGTERM cleanup | 4 |

- **Total unique files across `#60`–`#66`:** **116**
- **Total files in `5d9efa6` vs. `dd223f5`:** **116** (0 extra files, 0 missing files; `package-lock.json` unchanged)
- **Single-PR files:** **112 / 112 byte-for-byte identical** to their respective PR head blobs (`/tmp/p67-check/verify-merge.mjs`).
- **Multi-PR files (4 total):**

| File | Touched By | Clean 3-Way `git merge-file`? | Resolution Verification |
|---|---|---|---|
| `scripts/rc0-browser.mjs` | `#62`, `#63`, `#65`, `#66` | **Yes** (100% identical to RC blob) | Disjoint sections (`serveForRun` top header from `#66`, `B3` `descMatchesTarget` + non-F4 targets from `#62`, `RC` CSR-9 M1/M3 copy from `#63`, `G5` `scrollTop = 0` refund-card check from `#65`). |
| `src/ui/app.ts` | `#60`, `#62`, `#63`, `#64`, `#65` | **Yes** (100% identical to RC blob) | Disjoint hunks across imports, `#goalDesc`, `trackToastSafe(collectBtn)`, `\u00a0eggs` / `\u00a0hens`, `renderGoal()` before upgrades render, `bestChip`, `trackUnlockFarm` / `TRACK_FARM_MAX_TEXT`, `fmtCountFloor` / `fmtMoneyFloor`, `liveText`, and CSR M1–M5 `showRecoveryDialog` wiring. |
| `src/ui/styles.css` | `#60`, `#62`, `#63`, `#64`, `#65` | Adjacent-EOF conflict (`#62` vs `#65`) | Both `#62` (`.goal-label.ng*`, `.best-chip`) and `#65` (`.tracks-exp-out`, `.exp-pop`, `.exp-coin`, `.reduced-motion`, `.kbd-focus`, `nav.actions` inset ring) appended cleanly after `.tracks-exp[data-place=none]{visibility:hidden}` alongside `#60` (`.maxed.farm-max`), `#63` (`.recovery-layer[data-outcome]` hit areas), and `#64` (`.order .l1.fit1/fit2/fit3`). |
| `src/ui/tracks-explainer.ts` | `#63`, `#65` | Overlapping `close()` signature (`#63` vs `#65`) | Manual merge at `5d9efa6` preserves 100% of `#63` and `#65` semantics (detailed below). |

---

## 2. Deep-Dive Verification of Multi-PR Files

### `src/ui/tracks-explainer.ts` (`#63` × `#65`)
- **Preserved from `#63` (`3c86720`):**
  - `type G` (`:9`) includes `save(o?: Parameters<Game['save']>[0]): void` and `recoveryOutcome?: Game['recoveryOutcome']`.
  - `modalOpen` (`:18`) checks `#modal-layer.open, .recovery-layer` so the explainer waits behind all CSR/tab-guard/newer-save recovery dialogs.
  - `restoreBoot` (`:22`) keys off `g.recoveryOutcome === 'restored'`.
  - `onDismiss = restoreBoot(g)` (`:137`), `if (onDismiss && explainerOpen(doc)) return null;` (`:138`), `markSeen()` (`:139-149`, calling `g.save({ mirrorOnFail: false })` and rolling back to `seenTracksExplainer: false` + `g.save()` if `storageBlocked()`), and `if (!onDismiss && !markSeen()) return null;` (`:150`).
- **Preserved from `#65` (`c877f69`):**
  - `placeExplainer` (`:44-59`), `buyRects` (`:65-76`), `collectRect` (`:78-82`), `blockRects` (`:84`), `placeCard` (`:86-94`), `refundPop` (`:99-109`), `fadeOut` (`:112-117`, skipping when `place === 'none'`), `markKbdFocus` (`:120-124`), and coalesced event-driven `replace` (`:158-165`).
- **Cross-PR bridge (`close(how)` at `:166-173`):**
  - `#63`'s `if (onDismiss && !timedOut) markSeen()` is bridged into `#65`'s `close(how: 'key' | 'ok' | 'card' | 'timeout' = 'timeout')` as `if (onDismiss && how !== 'timeout') markSeen();` (`:170`).
  - All user-initiated close paths pass `'key'`, `'ok'`, or `'card'`, so `how !== 'timeout'` is true and `markSeen()` persists `seenTracksExplainer: true` on restore boots.
  - The 8 s timer (`:180`) calls `close('timeout')`, which leaves `seenTracksExplainer` unset on restore boots (per `D-HOP-2026-10-22-07` AC) while still cleaning up listeners (`off()`), running `fadeOut` (unless `place === 'none'`), and dispatching `EXP_CLOSED`. On the subsequent normal reload (`g.tracksMigratedWithBackup === true`), `g.migrationRefundCents` is `0` (`src/game.ts:160`), so no duplicate refund pop can occur even on a synthetic refund save.

### `src/ui/styles.css` (`#60` × `#62` × `#63` × `#64` × `#65`)
- Verified all 5 PRs' rules in `src/ui/styles.css:347-553`:
  - `#64`: `.order .l1 .egg` (`flex:0 0 auto;text-overflow:clip`), `.order .l1.fit1`, `.order .l1.fit2`, `.order .l1.fit3`, `.order:has(.l1.fit3)`.
  - `#65`: `.save-warn` (`bottom:var(--toast-safe-b,calc(var(--nav-h) + 8px))`), `.tracks-exp,.tracks-exp-out`, `.tracks-exp[data-place=none]{visibility:hidden}`, `.tracks-exp-out`, `.exp-pop`, `.exp-coin`, `.reduced-motion` & `@media (prefers-reduced-motion:reduce)` rules, `.kbd-focus`, and `nav.actions button:focus-visible,nav.actions button.kbd-focus{outline-offset:-3px}` (placed after the general `+2px` rule so the `-3px` cascade wins on bottom-nav buttons).
  - `#63`: `.recovery-layer[data-outcome] .recovery-card .rc-primary` (`min-height:48px`) and `.rc-link, .rc-export-q` (`min-height:44px`).
  - `#60`: `.maxed.farm-max`.
  - `#62`: `.goal-label.ng`, `.ng-star`, `.ng-name`, `.best-chip`.

### `src/ui/app.ts` (`#60` × `#62` × `#63` × `#64` × `#65`)
- Verified `renderGoal()` runs before the Upgrades sheet render (`:586`), keeping `hintPick`, `.best-chip`, row highlight, and the `#goal` strip `★` synchronized in the same frame.
- Verified `#goal` uses `aria-describedby="goalDesc"` without `aria-label` (`:419`), satisfying WCAG 2.5.3 label-in-name across all targets.
- Verified CSR recovery modal flow (`:708-725`) precedes `onTracksCommitted` / `tracksMigratedWithBackup` explainer scheduling, and `modalOpen` holds the explainer until `.recovery-layer` is removed.

---

## 3. Independent Gate & Artifact Verification at `5d9efa6`

- **`npx tsc --noEmit`:** PASS (0 errors).
- **`npx vitest run`:** PASS — **107/107** test files, **1,403/1,403** tests green (including `flagoff-golden.a01faea.test.ts` `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544` and `m4on-golden.90a9c84.test.ts` `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5`).
- **`npm run build` & `node scripts/check-release-build.mjs`:** PASS (`m4.1+5d9efa6`, release prefix `m4.1`, only `eggfarmExportTelemetry` on `window`).
- **`npm run build:html`:** PASS — single-file `dist-html/egg-farm.html` (`537,157` bytes, sha256 `ccb87daa60b5b8f722504642561f8a6061c8335555fd669a16872add2e88d5e1`, matching `/workspace/wt-ui-shots/gates-m41-rc1-5d9efa6/dist-html-sha256.txt` byte-for-byte).
- **`npm run build:qa` & `npm run check-globals`:** PASS (`3/3` Chromium release global checks on `m4.1+5d9efa6`).
- **`node scripts/rc0-browser.mjs chromium` (`AXE_PATH=/tmp/ccr-axe/node_modules/axe-core/axe.min.js`):** PASS — **358/358** checks (including PT1 axe `[]`, B3 WCAG 2.5.3 across all targets, AC14b CSR-9 M1/M3 copy, and G5 explainer + storage/quota checks).
- **Cross-checked RC gate logs (`/workspace/wt-ui-shots/gates-m41-rc1-5d9efa6/`):**
  - `rc0-firefox.log`: `358/358 passed` (`exit 0`)
  - `rc0-webkit.log`: `358/358 passed` (`exit 0`)
  - `test-slow.log`: `3/3` files (`16 passed | 1 skipped`, `exit 0`)
  - `sweep-summary.md` (`m41-9-scroll-sweep.mjs` @ `5d9efa6`): `PASS: 0 overlaps, 0 dismiss-only, 0 nothing` across Chromium/Firefox/WebKit × `360`/`375`/`390` (`552/552` first-tap buys, `1,542` 4 px fine-sweep positions with `0` overlaps).
