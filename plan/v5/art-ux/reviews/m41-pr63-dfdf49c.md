# UI check: PR #63 (M41-7 CSR, incl. #58/#59) @ dfdf49cd904398c7e302eec16161f8fb63b10a8d
UI/Visual Designer · 2026-10-22 21:02 (UTC+2) · lean pass · baseline: reviews/m41-pr63-9cce82d.md · Head of Art & UX makes the final call

## Verdict: FAIL, 0 Blocker / 0 Critical / **1 Major** / 0 Minor / 1 Nit
Everything you asked me to check passes in renders on all 3 engines: P1 fixed, P2 fixed, tap-target floors met exactly, copy verbatim, no clipping, no red, and focus/aria as spec'd. The one Major is new and wasn't in the baseline. On the migrated M1/M2 restores, the tracks explainer opens at the same time as the recovery dialog instead of queueing behind it (copy file :33, spec CSR-9c). If you rule CSR-9c out of scope for M4.1 (spec :74 still labels it "post-freeze M4 work, NOT part of B"), this becomes PASS with 1 Nit.

## Setup
- Spec of record `product/farm/corrupt-save-recovery-spec.m41-final.md` sha256 = **`cc6b7e23f9a0d879…8b08817c`** (matches cc6b7e23). The old 6131c290 version is now `frozen/corrupt-save-recovery-spec.v0.2.3-m41-final.md`. The only diff is the Status block (APPROVED + D-HOP-2026-10-22-03 test-oracle rulings). CSR-9/9a/9b/9c are byte-identical. Copy source `art-ux/copy/csr9-recovery-copy.md` hasn't changed.
- Clean worktree `art-ux/scratch/pr63-dfdf49c` (from `game/`, no fetch). `npm ci` + `npm run build:qa` gives `m3-rc1-pre+dfdf49c`. vitest `m41-7-csr-copy`, `m41-7-ui-fixes`, `m41-7-hop-rulings`: 68/68.
- Renders: `art-ux/scratch/m41-pr63-dfdf49c-shots.mjs` (Playwright 1.64.1) under `flock /workspace/egg-farm-studio/.browser-test.lock`. One local static server, stopped at the end (none left). 39 shots + `manifest.json` (full SHA, engine, size, state, sha256, DOM metrics, focus sequence, Playwright aria snapshot, Chromium CDP AX names) in `art-ux/shots/m41-pr63-dfdf49c/`. 0 page errors.
- States came from real boots, triggered with seeded localStorage. Corrupt main = the v5 12-min fixture with `farmLevel 17` and `coinsCents:"bad"`. Valid = the fixture itself (Farm L10).
  - **M1**: corrupt main + valid .bak.
  - **M1cf**: M1, plus `setItem` throws QuotaExceededError on `eggfarm.save.corrupt.*`.
  - **M2**: corrupt main + valid v6_backup record (level variant).
  - **M2cf**: M2 + copy fail.
  - **M3**: corrupt main only.
  - **M4**: corrupt main, `IDBFactory.open` throws (IDB unknown, CSR-13 defer).
  - **M5**: M1 + lease write refused (storageBlocked).
- Matrix: all 7 states at 360×640 on Chromium/Firefox/WebKit (21). Plus the two longest-copy states, M3 and M5, at 375/390/1280 (docked) on all 3 engines (18).
- The M2 age/fallback variants and the {age} units were checked by unit test only (`tests/m41-7-csr-copy.test.ts`), not rendered.

## Checks
| # | Check | Result |
|---|---|---|
| 1 | **P1** M5 = coop icon + "!" warn, no ✓ on M4/M5 | **PASS (render)**. M4 and M5 on every engine and width: `icon-coop.svg`, badge `!`, class `rc-badge warn`, bg `rgb(138,85,40)` (#8A5528). No ✓ on either. Code: `save-recovery.ts:122` `warn`, `:133` M5 spreads it after `restored`. M1/M2 keep ✓ ok (#3D7F33) and M3 keeps ★ new (#2B79A8), as intended. |
| 2 | **P2** accessible name starts with the visible label | **PASS (render)**. Computed names from Playwright's accessible-name computation (all 3 engines) and Chromium CDP `Accessibility.getFullAXTree`: M1cf/M2cf/M4 = `Export save file, downloads a copy of your old save file` (exact); M5 = `Export save file, downloads a copy of your current farm` (exact). That matches `csr9-recovery-copy.md:46`. Code: `save-recovery.ts:72` `csr.aria.file`, used at `:121` (M1/M2) and `:130` (M4). M3 = `Export old save file, downloads a copy of your old save file`, which also starts with its visible label `Export old save file`. |
| 3 | Tap-target floors at 360 (strict) | **PASS**. `getBoundingClientRect().height`: primary `#rcGo` = **48.000** and Export `#rcExport` = **44.000** on Chromium, Firefox and WebKit, in every state and at every width (no sub-pixel shortfall; QA's earlier 47.69/43.71 is gone). Fix: `styles.css:428–430` (`flex:none; box-sizing:border-box; inline-flex`; min-height 48/44, scoped to `.recovery-layer[data-outcome]`). Export widths: 258 (secondary, 360) / 144.6 (M3 link) / 121 (M4 link). |
| 4 | Copy verbatim vs cc6b7e23 (+ copy file) | **PASS**. Rendered title / body / button / link for every state match spec :60–64 and copy :4–31 word for word. M1 `Your farm is back!` / `We fixed a hiccup and restored your latest save.` / `Continue` (M1cf + `Export save file`). M2 level `We restored an earlier save, from Farm level 10.` (prevLevel 17 ≠ restored 10, CSR-9a) / `Continue` (M2cf + `Export save file`). M3 `A fresh start` / `We couldn't recover your save, so we started a new farm for you.` / `Start farming` / `Export old save file`. M4 `Couldn't load your farm` / `Your save is safe. Let's try that again.` / `Try again` / `Export save file`. M5 `Your farm is back!` / `Saving is paused on this device right now, so progress may not be kept.` / `Continue` / `Export save file`. Age/fallback by unit test. |
| 5 | Fit 360/375/390/1280, no clipping | **PASS**. No text element with scrollWidth/Height > client size, and the card is inside the viewport in all 39 renders. M4's title wraps to 2 lines at 360. M5's body is 3 lines at 360 and 2 lines from 375 up (see n1). |
| 6a | Warn badge contrast, no red | **PASS**. White `!` on #8A5528 = **6.16:1**, and the badge vs the white card = 6.16:1. ✓ badge 4.9:1, ★ badge 4.77:1. No computed colour/background/border in the recovery layer is red-ish (r>140 and r−g, r−b > 70), and `--c-danger` isn't defined (empty). `--c-barn` isn't used in the dialog. The M5 Export is the outlined secondary (white, 2px #8A5528, wood text, `styles.css:426`), not primary. |
| 6b | Focus / aria | **PASS** (all 3 engines, 360). `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby="rcT"`, `aria-describedby="rcB rcMsg"` (or `rcB` with no Export) (`save-recovery.ts:163` region). Initial focus `#rcGo`. Tab goes to `#rcExport`, Tab wraps to `#rcGo`, Shift+Tab goes to `#rcExport`. With no Export (M1/M2), focus stays on `#rcGo`. Esc leaves the dialog open and focus unchanged. This matches `art-ux/save-recovery-dialog.md:40–46`. |

## Findings
| ID | Sev | Finding | Cause / fix |
|---|---|---|---|
| M-1 | **Major** (unless CSR-9c is ruled out of M4.1) | **The tracks explainer opens alongside the recovery dialog on M1/M2 restores of a pre-M4 save** instead of queueing behind it. The card `Upgrades got an upgrade!` sits at the top, dimmed under the scrim, partly behind the dialog. See `pr63-chromium-360x640-M1cf.png` and `pr63-firefox-360x640-M2.png`. The copy file :33 and spec CSR-9c (:74) say it "queues behind the recovery dialog (same rule as Welcome back)". It isn't inert: Chromium's AX tree exposes its `Got it` button next to the alertdialog (M1cf/M2cf). It also sets `seenTracksExplainer=true` on show and auto-closes after 8 s (`tracks-explainer.ts:54`), so a player still reading the dialog can lose the explainer for good. M2 (v6_backup restore) is exactly the case CSR-9c describes, and this PR makes it reachable. It doesn't show on M3/M4, and correctly not on M5 (storage blocked). | `src/ui/tracks-explainer.ts:17` `modalOpen` checks only `#modal-layer.open`, so the retry gate at `:26` ignores the recovery dialog (`.recovery-layer`, appended to body). It's triggered by `app.ts:708–709`. The recovery dialog's inert list (`app.ts:698` `[root, modal, toast]`) doesn't cover the body-level card. Fix: make `modalOpen` also match `.recovery-layer` (or wait for `RECOVERY_CLOSED`), so the existing 1 s retry shows the card after Continue. |
| n1 | Nit | M5 body wraps to 3 lines at 360 on all engines (`Saving is paused on this device right now, so progress may not be kept.`). No clipping, and the copy file doesn't set a line cap. The older AC14b note (`save-recovery-dialog.md:2`, bodies ≤ 2 lines at 360) would flag it. | Accept as-is (copy is final). If wanted: let the card body use the full card width at ≤ 360 (card `min(440px, 100vw−48px)`, `styles.css:263–264`). Art's call. |

Baseline items: P1 closed, P2 closed.

## Evidence
`shots/m41-pr63-dfdf49c/pr63-<engine>-<WxH>-<M1|M1cf|M2|M2cf|M3|M4|M5>.png` + `manifest.json`.
