# Review: fix-rc1-r1-dialog-spacing (a01faea..ff6b5d3)

Reviewer: Code Reviewer. Worktree: /workspace/review-ff6b5d3 (branch fix-rc1-r1-dialog-spacing).
Topic: scope the AC14b v2.1 `.recovery-card` spacing to `.recovery-layer[data-outcome]` so the tab-guard and newer-save dialogs keep `gap:12px`.
Files changed: `src/ui/styles.css` (+5/-3), `tests/r1-dialog-spacing.test.ts` (new, 11 lines).

## Summary

| Severity | Count |
|----------|-------|
| critical | 0 |
| blocker  | 0 |
| major    | 0 |
| minor    | 2 |
| nit      | 1 |

**Verdict: the CSS fix is correct and in scope. The new test is weaker than it looks (finding 1). I recommend merging after tightening it. Neither minor finding affects shipped behaviour.**

## Correctness of the fix (no findings)

- `showRecoveryDialog` is the only code that sets `data-outcome` (`src/ui/save-recovery.ts:53`). It always sets it, because a null outcome returns before the layer is created. `showTabGuardDialog` (`:112`) and `showNewerSaveDialog` (`:138`) create `recovery-layer tab-guard` and `recovery-layer newer-save` without it. The scope selector therefore splits the three dialogs correctly.
- Specificity is fine:
  - `.recovery-layer[data-outcome] .recovery-card{gap:0}` (0,3,0) beats the base `.recovery-card{gap:12px}` at `styles.css:261`.
  - The scoped `h2`, `p#rcB` and `.rc-primary` margins beat any `.btn` rule. `.btn` has no margin (`styles.css:29`).
- Tab-guard and newer-save now get the original spacing back:
  - `h2` has `margin:0` from the base rule at `styles.css:264`.
  - `.rc-primary` has no `margin-top`.
  - `gap:12px` applies between the 72px `<img>`, the `h2`, the `p` and the button.
  - This matches the pre-AC14b layout. Before this fix, title→body was 0px.
- The remaining unscoped rules (`.rc-link`, `.rc-export-q`, `.rc-msg`, `.rc-icon`, `.rc-badge`) only match elements that `showRecoveryDialog` emits. The other two dialogs never render them, so leaving them unscoped is harmless.
- Layout at 360, 390 and 1280: the change is vertical spacing only. Card width (`min(440px, 100vw-48px)`, plus the ≤360px rule) and padding are untouched, so there is no width or overflow effect. At 360 and 390 the long newer-save title wraps inside the same 264–294px content box as before. At 1280 the card is fixed at 440px. `max-height`/`overflow:auto` for short viewports (`:263`) is unchanged. I could not render this (no browsers, per the brief), so this is by reading the CSS.
- Scope: the diff touches only the spacing rules and one test file, with no unrelated edits.

## Findings

### 1. Minor: assertion 2 of the new test can never match a rule that starts a line
`tests/r1-dialog-spacing.test.ts:7`

```ts
expect(css).not.toMatch(/(^|\})\.recovery-card h2\{[^}]*margin-top/);
```

Evidence:
- The regex has no `m` flag, so `^` only matches the start of the whole file. The only other alternative is a preceding `}` with nothing in between.
- The offending rule in a01faea was `.recovery-card h2{margin-top:8px;…` at the start of its own line (a01faea `styles.css:414`), preceded by `\n`. It matches neither alternative, so this assertion passes against the unfixed code.
- Assertions 1 and 3 use `(^|\n)` and do catch the old code, so the whole test still fails on a01faea. The one case that goes unchecked is the h2 rule, which regresses on its own if someone re-adds an unscoped `.recovery-card h2{margin-top:…}` at the start of a line.
- I reasoned this out from the regex and the diff. I could not execute a mutation check, because Bash `node -e` was denied in this session.

Impact: a future unscoped `h2` margin would put tab-guard and newer-save titles at 12px + 8px = 20px from the icon, and the test would stay green.

Fix: use `(^|\n|\})` or the `m` flag with `\s*`, for example `/(^|[}\n])\s*\.recovery-card h2\{[^}]*margin-top/`.

### 2. Minor: the test never checks the scoped rules exist, and it never checks the `p#rcB` margin
`tests/r1-dialog-spacing.test.ts:5-10`

Evidence:
- The only positive assertion is for the `gap:0` rule (`:9`).
- Nothing asserts that these rules still exist:
  - `.recovery-layer[data-outcome] .recovery-card h2{margin-top:8px}`
  - `.recovery-layer[data-outcome] .recovery-card p#rcB{margin-top:8px}`
  - `.recovery-layer[data-outcome] .recovery-card .rc-primary{margin-top:16px}`
- There is no negative assertion for an unscoped `.recovery-card p#rcB{margin-top…}`.
- Deleting the three scoped rules, or making `p#rcB` unscoped, leaves the test green. The AC14b v2.1 dialog would then lose its 8/8/16px spacing, or tab-guard and newer-save would gain extra `p` margin.
- The test also never asserts the markup coupling the fix depends on, which is that tab-guard and newer-save layers have no `data-outcome` and the AC14b layer does. Today that is covered only by reading `save-recovery.ts`. Adding `data-outcome` to either of those layers would silently bring back the regression.

Impact: this is test adequacy only. The shipped CSS is correct today, but both directions of this regression can come back unnoticed.

Fix: add `toContain` checks for the three scoped rules and an unscoped-`p#rcB` negative. Add source assertions in the style of `tests/save-recovery-v21.test.ts:56`: `data-outcome` appears only on the `showRecoveryDialog` layer, and the `tab-guard` and `newer-save` `className` strings are not followed by `dataset.outcome`. A jsdom/happy-dom render that checks `layer.dataset.outcome` for all three dialogs would be stronger if the environment allows it. Existing tests note "no document in node".

### 3. Nit: v2.1 `h2` line-height and colour still apply to all three dialogs
`src/ui/styles.css:416`

`.recovery-card h2{line-height:1.2;color:var(--c-text)}` is deliberately left unscoped. It already applied to tab-guard and newer-save in a01faea, so this commit does not change it. It is a small inconsistency: the comment at `:411` says the v2.1 spacing is scoped, but the v2.1 typography is not. If this is intended (a shared heading style), a one-line note would stop the next reviewer from asking. If not, scope it too. The long newer-save title is the only place it is visible.

## What I ran

- `git log` and `git diff a01faea..ff6b5d3` (stat and full diff), plus `grep` of `src/` and `tests/` for `recovery-layer`, `recovery-card`, `data-outcome` and the dialog builders.
- Read `src/ui/save-recovery.ts` (all three dialog builders), `src/ui/styles.css` (259–271, 405–422, 440–451) and `tests/save-recovery-v21.test.ts` (45–99).
- Tests and typecheck did not run:
  - `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/r1-dialog-spacing.test.ts tests/save-recovery-v21.test.ts` failed immediately with `CACError: Unknown option --poolOptions`. `npx` resolved to a vitest in the `~/.npm/_npx` cache whose CLI does not accept that flag, so no tests executed.
  - `npx tsc --noEmit`, a `node_modules` check and a `node -e` regex check were all denied by the permission mode, so they did not execute.
  - Findings 1 and 2 therefore come from reading the regexes and the CSS, not from running mutations. The 360/390/1280 layout statements come from the CSS, with no rendering.
- No files in the worktree were modified.

COUNTS critical=0 blocker=0 major=0 minor=2 nit=1
