# Code review: save-recovery dialog v2.1 / v2.2 @ a01faea
Range reviewed: `git diff aaaa91a..a01faea` (branch m3/save-recovery-dialog-v4, 8 files, +280/-42), in worktree /workspace/review-a01faea (detached, clean).
Specs used: art-ux/save-recovery-dialog.md (v2.1 table, §2 layout, §4 behaviour, §5 focus, v2.2 note and "Can't save" case), art-ux/decisions.md (SD4-5 = "v2.1 copy final"), engineering/status.md (SD4-3 = main missing + bad .bak must show the 'fresh' dialog), my earlier review of aaaa91a (V4-2).

**Limit of this review:** I read the diff and the surrounding code and traced the logic by hand. **I did not run anything.** The shell denied `npx tsc`, `vitest` and the browser suite, so unit tests, typecheck and `rc0-browser` were not executed. Layout and focus-ring findings come from reading the CSS cascade and the test code, not from rendered pages.

## Summary
The v2.1 outcome mapping is correct. All four dialog variants carry the exact spec strings. SD4-3 is fixed on the path it targets. The card has no opacity animation, and the focus ring is 3px `#2B79A8`.
- No blocker and no critical.
- **R1 (major):** the new unscoped `.recovery-card` rules change the spacing of the single-tab guard dialog.
- **R2 (major):** the new "Saving is paused" modal still fires on a lease-write failure alone. That is the false-alarm risk I raised as V4-2 on aaaa91a. It is now a blocking dialog, so it is worse than the earlier toast.

## What I checked and found correct
- **SD4-3 (N5).** Main missing and `.bak` invalid now returns `{case: 'F'|'Q', reason: bv.reason, had_backup: true, raw: bakRaw}` (save.ts:174-176). `recoveryOutcome` maps that to 'fresh', or to 'storage' when the copy fails. Game then fires `save_corrupt`, sets `bakAllowed=false`, and the dialog opens through `g.recoveryOutcome && opts.recovery`. The bad bytes are preserved under `eggfarm.save.corrupt.<ts+1>`, and `raw` still allows Export when that copy fails. It can no longer become a silent fresh farm.
- **SD4-5 copy (v2.1 strings).** I compared `recoveryCopy` with the spec table and found no differences:
  - Restored: coop + ✓ (ok), "Welcome back!", the exact body, Keep farming, link.
  - Restored with copy_failed: export-now body, outlined button.
  - Fresh: chicken + ★ (focus), body with "kept safe", Start farming, link.
  - Storage: chicken + ! (wood-text), "Export it now to keep a copy", outlined "Export old save".
  - Titles are 4 words or fewer, with no corrupt/error/checksum/quota wording.
  - Restored with no raw bytes shows no Export control (the v2.2 note).
- **v2.2 "Can't save".** The copy matches the spec text exactly, and the label is "Export save" with the aria text "Export save, downloads a copy of your current farm" (it starts with the visible label, so it satisfies WCAG 2.5.3). Export calls `r.live()`, which is `serialize(g.state, Date.now())` at click time, so it exports the current farm and not the boot copy. The file is named `eggfarm-save-…`. `copy_failed` is false, so the Settings "Export old save" button and `sessionOldSave` are not polluted. A real Storage case keeps its v2.1 copy because `cantSave` is a separate flag.
- **Toast held until the dialog closes.** `holdNotices` is set before `saveNotice(NO_STORAGE_TEXT)` runs. The mountApp dialog gate (`g.recoveryOutcome && opts.recovery`) is the same predicate. The RECOVERY_CLOSED listener is registered at module load and is dispatched before the promise resolves. I found no path where the hold is set but no dialog opens, so the toast cannot be lost.
- **Pop-in without opacity.** `@keyframes rcPop` is scale-only and `.reduced-motion .recovery-card{animation:none}`. No ancestor adds opacity. `prefers-reduced-motion` reaches the `.reduced-motion` class through `applyRM`.
- **Keyboard focus ring.** `.recovery-card :focus-visible` and `.recovery-layer.kbd .recovery-card button:focus` give a 3px solid `--c-focus` (#2B79A8) with offset 3. By my calculation that is about 4.8:1 on the white card (the spec says 4.9:1), above the 3:1 minimum. It covers the primary, the outlined Export button and the Export link, since all three are `<button>`. The ring sits inside the 24px card padding, so the `overflow:auto` short-viewport card does not clip it. The rc0 test checks style, width ≥2 and contrast ≥3 on each control.
- **keepPrefsOnly narrowing.** `&& opts.newGame` is right. Can't-save has a loaded farm, so FTUE and Workers-tip flags are kept. F and Q always have no file, so their behaviour is unchanged.

## Findings

### R1 · Major · The new unscoped `.recovery-card` rules re-space the tab-guard and newer-save dialogs
`src/ui/styles.css:409-418`, affecting the markup at `src/ui/save-recovery.ts:113-116` and `:139-142`.
The v2.1 block sets `.recovery-card{gap:0}`, `h2{margin-top:8px}`, `.rc-primary{margin-top:16px}` and `p#rcB{margin-top:8px}`. The tab-guard dialog and the newer-save dialog use the same `.recovery-card` class, but they have no `.rc-icon` wrapper. Their body paragraph is `p#tgB`, not `p#rcB`.
- Before: all children were spaced by `gap:12px`.
- After: the icon-to-title gap is 8px, and the title-to-body gap is **0** (`p{margin:0}` and `gap:0`). Only the button gets 16px. The "Game open in another tab" title and its body text now touch.
- No test covers these dialogs' spacing; the new rc0 checks cover only `.recovery-layer` created by `showRecoveryDialog`.
- **Fix:** scope the new rules to the v2.1 dialog (for example `.recovery-layer[data-outcome] .recovery-card`), or give `p#tgB` an 8px top margin and keep the old spacing. Add a 360px check on the tab-guard card.
- *Not rendered; derived from the cascade. Please confirm with a screenshot.*

### R2 · Major · "Saving is paused" is shown on a lease-write failure alone, so it can be false
`src/main.ts:94`, with the dialog gate in `src/ui/app.ts:632`.
`storageBlocked` means only that the lease key could not be written and read back. It is not proof that saving is paused. This is V4-2 from the aaaa91a review, which this diff did not resolve.
- A quota error on a brand-new key (the lease) can occur while replacing the existing, similarly sized save key still fits. A stale lease that the browser silently keeps (the read-back-mismatch branch) is another case where saves work.
- The Game constructor has already run its first `save()`, so `g.storageFailed` is known at line 94 and `onStorageFail` has not been wired yet.
- Result: a healthy player gets a modal alertdialog that says "your browser won't let us save right now" and offers an Export, plus the `NO_STORAGE_TEXT` toast after it. It blocks play until acknowledged, where before it was only a toast.
- A brand-new first-run player with `storageBlocked` also gets "Your farm is fine… Export a copy" for an empty farm, before onboarding.
- **Fix:** open the Can't-save variant only when `lease.storageBlocked && g.storageFailed` (or when the lease failure is followed by a real save failure, via `onStorageFail`), and for a lease-only failure keep the toast alone. If QA f6 requires the dialog on lease failure alone, record that decision and skip the empty-farm case with `!g.isNewGame`.

### R3 · Minor · After dismissal there is no way to export the current farm while saving is still paused
`src/ui/save-recovery.ts:94-98`, `src/ui/app.ts:243`.
The Can't-save variant leaves only the toast. The toast carries no action, and Settings offers "Export old save" only when `sessionOldSave` is set, which Can't-save never sets. A player who taps "Keep farming" and later wants the export has no entry point, and the farm keeps changing. Add a Settings "Export save" that reuses `r.live`, or keep the dialog reachable. A product call for Art & UX.

### R4 · Minor · Telemetry conflates Can't-save with the real Storage case
`src/ui/app.ts:634`, `src/main.ts:94`.
`save_recovery_export` reports `case: opts.recovery.case`, which is 'Q' for Can't-save as well as for the real Storage case. `save_corrupt` is not emitted for Can't-save (correctly, nothing is corrupt), but nothing else records that the dialog was shown. Analytics cannot separate the two, so add a `variant`/`cant_save` property to the export event and a dialog-shown event.

### R5 · Minor · Test coverage: the new wiring is source-regex checked, and the SD4-3 'Q' branch has no test
`tests/save-recovery-v21.test.ts:63-67` and `:87-95`.
- The checks that main.ts sets `g.recovery`, holds the toast and assigns `live` are `readFileSync` regexes on `main.ts` (the same weakness as V4-4 on aaaa91a). They pass if the code is commented out or in a dead branch. The behaviour is covered only by `rc0-browser.mjs`, which I did not run. The CSS rules are checked the same way.
- The new SD4-3 branch where `preserveCorrupt` fails (bad .bak, no main, quota) maps to outcome 'storage' with `copy_failed` and `raw = bakRaw`. No unit test covers it. The v2.1 'storage' test covers only a corrupt main.
- **Fix:** a loader unit test for bad .bak with the quota kv. For main.ts, extract the holdNotices/RECOVERY_CLOSED logic into a small function and test it directly.

### R6 · Minor · The keyboard ring appears only after the first Tab
`src/ui/save-recovery.ts:69,82`.
The `.kbd` class is added in the Tab branch only. The initial focus is programmatic (`go.focus()`), and Firefox and WebKit do not match `:focus-visible` for it. A keyboard-only user who opens the dialog and presses Enter or Space on the lone primary button never sees a ring. The rc0 test sends a Tab first and notes that "the initial focus is programmatic", so it does not exercise this. Add `kbd` on any non-modifier keydown in the layer, and have the test assert the ring before any Tab. The spec says the ring is keyboard-only, which this keeps.

### R7 · Nit · Held toast keeps only the first message, and it can be stale
`src/main.ts:37-41`. `heldNotice ??= text` drops any second, different notice raised during the dialog. The held `NO_STORAGE_TEXT` also shows after the dialog even if `beat()` has since cleared `storageBlocked` and saves work. Re-check `g.storageFailed || lease.storageBlocked` before showing it.

### R8 · Nit · Duplicated CSS
`styles.css:264-268` and `:409-420` both define `.recovery-card h2`, `.rc-primary`, `:focus-visible`, and the export-q rule, once with hex values and once with tokens. The later block wins, which makes the cascade harder to read. Fold the hex rules into the token block.

### R9 · Nit · Spec text is stale against the build
art-ux/save-recovery-dialog.md §4 still says reduced motion gets a 150ms fade, and the v2.2 note says "barn" icon. The build uses `animation:none` (right, per v2.2 "fully opaque") and `icon-coop.svg` (no barn asset exists in public/assets). Art & UX should update the spec or confirm the coop icon.

### R10 · Nit · Small cleanups
- `storageBlockedRecovery` reads the main bytes into `raw`, which is never used for export (`live` wins), and `live` is assigned after the object is built (`main.ts:94`). Take `live` as an argument.
- `opts.newGame` in the keepPrefsOnly check, and `g.recoveryOutcome &&` in `recoveryOpen`, are redundant with each other (F/Q always mean a new game, and `opts.recovery` is set only with an outcome). Harmless.

### R11 · Nit · Focus trap with an unknown active element
`src/ui/save-recovery.ts:69`. If `document.activeElement` is not one of the dialog's buttons (index -1), Shift+Tab goes to `f[n-2]`, not the last button. The `focusin`/`focusout` handlers keep focus inside, so it is unlikely to be reached.

## Counts
- Blocker 0
- Critical 0
- Major 2 (R1, R2)
- Minor 4 (R3, R4, R5, R6)
- Nit 5 (R7, R8, R9, R10, R11)

Carried over from aaaa91a and not addressed here: V4-1 (dual owners without BroadcastChannel, minor), V4-3 (a displaced future-dated copy is not preserved, minor), and the older N1, N4, N6 (minor). V4-2 is now R2.

VERDICT: no blockers
