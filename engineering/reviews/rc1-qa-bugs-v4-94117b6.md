# Code review: fix/rc1-qa-bugs-v4 @ 94117b6 (vs main a01faea)

Scope: diff `a01faea..94117b6` (12 commits, 14 files, +638/-73). This is MK-24-1 (QA-passed at 8932a01 on old main 737c2cf) rebased onto new main (save durability v4 + save-recovery dialog), plus QA M-1 (`ca9fe86`) and QA M-2 (`94117b6`).

**Limits of this review: static only.** I could not run `vitest`, `tsc`, `vite build` or the Playwright scripts. Bash was restricted to read-only git/grep, and the review worktree has no `node_modules`. One `npx vitest run` attempt pulled an unpinned vitest@5.0.5 into the npx cache and then died loading `vite.config.ts` (no `vite`). It ran no tests. Every finding below comes from reading the code, and F1 comes from comparing two files. Re-run `npm test`, `npm run build` and `scripts/mk24-1-overflow.mjs` before merge.

## Counts

| Blocker | Critical | Major | Minor | Nit |
|---|---|---|---|---|
| 1 | 0 | 0 | 2 | 3 |

## Rebase integrity (nothing dropped or regressed)

- Main is an ancestor of the branch (`git rev-list 94117b6..a01faea` is 0), so `a01faea..94117b6` contains only branch-side changes.
- **Main's side is intact.**
  - `src/main.ts` and `scripts/check-release-build.mjs` do not appear in the diff. They are identical to main, including `ALLOWED_GLOBALS=['eggfarmExportTelemetry']`, the `snapshotJSON` export and the `IOS_FLAG_ENABLED`-gated `eggfarm`/`eggfarmUi`.
  - The `src/ui/app.ts` diff against main contains only MK-24-1 hunks (payout, `fmtMoneyExact`, `expire()`, `eggfarmOrderList` in app.ts, order-card call sites).
  - None of main's other `app.ts` changes are removed. These include `recoveryOpen = !!(g.recoveryOutcome && opts.recovery)`, `keepPrefsOnly(...) && opts.newGame`, `void g.clearMirror().then(() => location.reload())` on reset, and the `eggfarmQaRecovery`/`eggfarmOnb` gates.
  - Main's recovery-dialog CSS (v2.1/v2.2, tab-guard) is untouched.
- **The MK-24-1 side is intact.** `git diff 8932a01 94117b6` (QA-passed vs now) is limited to main's changes plus M-1:
  - `app.ts` differs by 5 hunks, all main's. `styles.css` differs by main's recovery/tab-guard CSS plus the M-1 line. `qa-rc1-bugs.test.ts` differs by 1 line (M-1).
  - `order-list.ts`, `orders.ts`, `format.ts`, `payout.ts`, `actions.ts`, `orders.test.ts`, `art-ux-rc0.test.ts` and `scripts/mk24-1-overflow.mjs` are byte-identical to the QA-passed commit.
- **`tests/release-build-id.test.ts` agrees with main's checker.** Traced by hand against `check-release-build.mjs`:
  - A clean id with `window.eggfarmExportTelemetry=` passes.
  - `+dirty` exits 1.
  - `window.eggfarmOrderList=` is caught by the globals allowlist and the message names it.
  - `window.eggfarm=` is caught by the `/\.eggfarm\s*=/` hook check.
- **Sale path.** `sellTo` credits `saleValueCents`, and the `sell` event carries `value`. `income.add(e.value)` and the popup use the same number. `sellAllPreview` walks customers like the `sellAll` action. Behaviour matches the pre-rebase design. The one stale piece is a test, F1.

## Findings

### Blocker

**F1. Stale S2-REL-1 assertion makes `npm test` (and so CI `unit`) fail**
`tests/qa-rc1-bugs.test.ts:166`:
```ts
expect(app).toMatch(/if \(import\.meta\.env\.DEV\) \(window as any\)\.eggfarmOrderList/);
```
- Conflict resolution kept main's `src/ui/app.ts:103`, which is `if (IOS_FLAG_ENABLED) (window as any).eggfarmOrderList = orderList;`.
- The MK-24-1 test still encodes the old `import.meta.env.DEV` gate, so it can never match. The test is `S2-REL-1 / exact money wiring › eggfarmOrderList is DEV-only; eggfarm is IOS_FLAG-only`.
- `.github/workflows/ci.yml` runs `npm test` in the `unit` job, so this branch cannot go green.
- It is also evidence that the resolved conflict was not validated by the test suite after the rebase.
- The code is right (main's gate is the intended one, and `check-release-build` enforces it). The test is wrong.
- Fix: change the regex to `/if \(IOS_FLAG_ENABLED\) \(window as any\)\.eggfarmOrderList/`, and rename the `it(...)` to "eggfarmOrderList and eggfarm are IOS_FLAG-only". The second assertion, `not.toMatch(/^\s*\(window as any\)\.eggfarmOrderList/m)`, still holds.
- Confidence: high on the mismatch, since both lines are quoted above. Not confirmed by a test run.

### Minor

**F2. QA M-2 weakens the Bug9 NBSP signal** (`scripts/rc0-browser.mjs:167`)
- `innerText.replace(/\s+/g, ' ').trim()` fixes the real problem. Span markup (`.n`/`.egg`/`.v` are flex items) puts newlines in `innerText`.
- But JS `\s` also matches U+00A0, and an absent NBSP would also surface as a newline-turned-space. So the following assertion, `/^\d[\d.K]*\/\d[\d.K]* eggs\s*·\s*\$/`, can no longer fail on a missing NBSP between count and `eggs`.
- That regression is still covered by `tests/orders.test.ts` ("NBSP between count and eggs") and the `nbsp` checks in `mk24-1-overflow.mjs`. Bug9 now checks only layout (inside the card, ≤2 lines, count/eggs/$ shape).
- Suggested: replace `\s+` with `[ \t\r\n]+` so only newlines and spaces collapse and NBSP survives. Then relax the regex to `eggs` preceded by `[  ]`.

**F3. Shared-width cap and CSS cap disagree** (`src/ui/order-list.ts` `syncSellWidth` vs `styles.css` `.order .btn.sell`). Pre-existing from MK-24-1 v3 and not changed by M-1.
- JS caps at `order.clientWidth * 0.45`, which includes the card's 12px side padding.
- CSS caps at `max-width:45cqw`. Container-query units resolve against the container's content box, which is about 24px narrower, so the CSS cap is about 11px smaller.
- `scrollWidth` is a padding-box measure, and `--sell-w` is applied as a border-box `width`. The 2×2px border is never added, so the content box is always about 4px narrower than the label.
- Today this is harmless. All buttons clamp to the same width, so the shared width holds. The text is `overflow:visible` and lands in the 10px side padding.
- It would show up, as a label overrunning the pill edge, only when the cap binds (a very long label on a narrow card). `mk24-1-overflow.mjs` covers 360-430px but its fixture's longest label is short, so it would not catch this.
- Suggested: cap with `order.clientWidth - 24` (or read the computed content box) times 0.45, and add `+ borders` when computing `w`.
- Unverified without a browser.

### Nit

**F4. M-1 leaves a dead and misleading rule.** `.order .sell{...padding:0 12px}` (about `styles.css:347`) is fully overridden by `.order .btn.sell{padding:4px 10px;padding-inline:10px}`. It now contradicts the 10px intent. The same `.order .btn.sell` rule also carries redundant `padding:4px 10px; padding-inline:10px` and `font-size:14px; font:800 14px`. Delete the dead `padding`/`max-width` in `.order .sell`.

**F5. Stale test title.** `qa-rc1-bugs.test.ts` test `2: shared --sell-w, min 88, max 45cqw, pad 12, no ellipsis on button` now asserts `padding-inline:10px`. Retitle it to "pad 10".

**F6. `fmtCount(NaN)` regressed.** The old code returned `"NaN"` through `toLocaleString`. The new tier loop skips `n < 1e4` for NaN and returns `"NaNT"`. Not reachable in current call sites that I saw (counts are floored finite numbers), but a one-line `if (!Number.isFinite(n))` guard, as `fmtMoneyExact` has, would be cheap.

## Reviewed and fine

- **M-1 (`ca9fe86`).** The padding change is `padding:4px 10px; padding-inline:10px` in the one winning rule. The test assertion is updated in the same commit, and `--sell-w` and the 88px min are untouched, as stated.
- **M-2 (`94117b6`).** The edit is limited to the Bug9 `text` field. The `inside`/`lines` checks are unchanged. F2 is the only concern.
- **No orphans after the `fmtMoneyShort` removal.** `app.ts` no longer imports `fmtMoneyShort`. Its remaining user is `fmtMoneyPreview` and `tests/s2-3a.test.ts`, whose expected values are consistent with the floor default.
- **`graderMult`.** It is no longer imported by `actions.ts` or `app.ts`, and is still exported and used by `payout.ts` and the worker tests.

VERDICT: BLOCKERS
