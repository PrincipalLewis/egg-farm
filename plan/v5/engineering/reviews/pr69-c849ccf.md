# CCR review: PR #69 `fix/yard-hens-from-track` @ c849ccf (M4.1-P1, yard hens)

- **Reviewer:** Claude Code Reviewer (independent, read-only)
- **Date:** 2026-10-24 15:40 CEST (Europe/Budapest)
- **Head:** `c849ccfec1631144868214f7ae98919f2f35c8e9` · **Base:** `main` @ `dd223f510e9acabf9b1915b56e39da8b88dcac63` · PR: https://github.com/PrincipalLewis/egg-farm/pull/69 (Draft)
- **Integration target checked:** `rc/m4.1-rc1` @ `5d9efa61c5e6ee31ca9ebdec20ee70167d31d463` (#67)
- **Worktrees (own, detached, removed after):** `/workspace/review-pr69-c849ccf` (gates), `/workspace/review-pr69-mut` (mutations), `/workspace/review-pr69-on-rc1` (apply on #67). No other worktree touched; no prune.
- **Claude calls:** 0 / 15 (own analysis).
- **Requested by:** Head of Engineering.

## Verdict: **PASS** — 0 Blocking · 0 Major · 1 Minor · 3 Nits

The fix is correct against the AC on main. The one Minor is integration only: when this lands after #67, the `#henpill` line conflicts and two test expectations have to change for #64's NBSP. The resolution is in `pr69-c849ccf-on-rc1-resolution.patch`. With it, every gate passes on rc1.

## Spec (quoted)

`product/queue.md` sha256 `887e38c1fd4d66f8dcf4f9ebee176b30049ac4352953d7338f0372e2ca7a76e5`, line 44:

> | M4.1-P1 | Yard hen pill + sprites from hensLevel (Vadim playtest bug, app.ts:544/:550) | HoE build, HoQA verify | AC: with M4 on, at any F≠H: sprites = min(hens[H], 12); pill shown only when hens[H] > 12 and shows hens[H]; a Hens buy updates both in the same tick, a Farm buy does not; M4 off keeps the legacy S.hens(F). (Amended 15:07 per Art.) Bug fix, allowed under the M4.2 hold. |

**HoE summary vs AC:** they match in substance. Two harmless differences: (a) the summary leaves out the AC's scope "at any F≠H" (when F = H both formulas give the same value, so nothing changes); (b) the summary writes "a Farm buy changes neither" where the AC says "a Farm buy does not". The code meets the stricter reading, since a Farm buy with M4 on changes neither sprites nor pill (test (3)). With M4 off a Farm buy still changes both, which is legacy behaviour and allowed by the AC.

## Scope (`dd223f5..c849ccf`)

`src/ui/app.ts` +4/−3 (render `// hens` block, :528–536) and the new `tests/m41-p1-yard-hens.test.ts` (+113). There are **no** changes to `src/sim`, `src/econ`, `src/save`, `src/config`, `data/`, or `engineering/golden` (`git diff --quiet` confirms). The change is render-only, so determinism, saves, and money math are unaffected. Goldens are unchanged: flag-off `f90d1678…49544`, M4-on `a54c9cf9…39fda5` (both printed by the golden tests at c849ccf).

## AC vs evidence

| AC clause | Code (c849ccf) | Evidence |
|---|---|---|
| M4 on: sprites = min(hens[H],12) | `app.ts:529` `hensN = m4On(b) ? S.hens(s.hensLevel, b) : S.hens(F, b)`; `:530` `hn = Math.min(hensN, 12)` | Tests (1) F5/H7 → 12, (1b) F5/H1 → 10 (legacy would be 12), (3b) H0 → 5; `S.hens(L)` equals the CSV `hens` column at all 31 rows (vite-node check, 0 mismatches) |
| pill shown only when hens[H] > 12, shows hens[H] | `:536` `setHidden(hp, hensN <= 12); setText(hp, \`×${fmtCount(hensN)} hens\`)` | (1) ×40 not ×30; (2) H13 ×70; (1b)/(3b) hidden. The boundary at exactly 12 is unreachable with the shipped CSV (see n1) |
| Hens buy updates both in same tick | Buy click → `act()` (`app.ts:191`) → `dirty = true; render()` runs synchronously; the sprite dirty check `hn !== henCount` (:531) rebuilds the yard | (3) H1→H2: sprites 10→12 and pill hidden→×15, with no timers or frames advanced |
| Farm buy does not (M4 on) | `hensN` ignores F when M4 is on | (3) F5→F6 leaves sprites and pill identical |
| M4 off keeps S.hens(F) | ternary else branch | (4) F5/H7 → ×30 with 12 sprites; F1/H7 → 10 sprites, pill hidden |

**Edge cases checked:**
- H is `GameState.hensLevel`, the Hens track level. `S.hens` = `hensBase + hensPerLevel·clampL(L)`, clamped to `[0, maxLevel=30]`, so the pill tops out at ×155. That means big-number formatting never applies (still `fmtCount`, the studio formatter).
- H above maxLevel is clamped (H=31/99/1e6 all give 155).
- `hensLevel` missing from a save is filled with 0 (`save.ts:101`, `{...initialState(b), ...d.state}`). Invalid values are rejected by `sanitizeLevels` (corrupt path). So NaN cannot be reached.
- Pre-M4 saves migrate with `hensLevel = farmLevel` (`migrate-v7.ts:4`), so the yard looks the same right after migration.
- Boot and offline: the first `render()` on mount uses the loaded state (`henCount = -1` forces the build). Offline grants don't touch hensLevel.
- Accessibility: `#yard` and `#henpill` sit inside `#scene[aria-hidden="true"]`, so they are decorative and already unexposed. There is no aria/visible mismatch to fix.

## Findings

### m1 (Minor): conflicts with #67 on the `#henpill` line, and two test expectations break after resolution
- **Where:** `src/ui/app.ts:536` (c849ccf) vs rc1 `src/ui/app.ts:550`, which #64 changed to `\u00a0hens` (commit `1eca759`, QA4-3 NBSP units). Also `tests/m41-9-big-number.test.ts:122` (rc1) and `tests/m41-p1-yard-hens.test.ts:61,62,78,79,89,107,108`.
- **Repro:** in a worktree at `5d9efa6`, run `git cherry-pick --no-commit c849ccf`. The result is `CONFLICT (content): Merge conflict in src/ui/app.ts`, a single hunk: HEAD `setText(hp, \`×${fmtCount(S.hens(F, b))}\u00a0hens\`)` vs P1 `setText(hp, \`×${fmtCount(hensN)} hens\`)`. The `hensN`/`hn` lines above it merge cleanly.
- **Resolution (verified):**
  1. `app.ts`: `setHidden(hp, hensN <= 12); setText(hp, \`×${fmtCount(hensN)}\u00a0hens\`);`. This keeps #64's NBSP. Taking P1's side would bring back a plain space, and #64's source assertion would fail on it.
  2. `tests/m41-9-big-number.test.ts:122`: change the source-string assertion from `` '`×${fmtCount(S.hens(F, b))}\\u00a0hens`' `` to `` '`×${fmtCount(hensN)}\\u00a0hens`' ``.
  3. `tests/m41-p1-yard-hens.test.ts`: the 4 pill-text tests ((1), (2), (3), (4)) expect a plain space. They need `\u00a0` (`×40\u00a0hens` etc.). Without that, 4/7 fail on rc1.
  - Full diff: `engineering/reviews/pr69-c849ccf-on-rc1-resolution.patch` (sha256 `aa551631…`). It was applied only in my worktree, never committed.
- Also, the PR body says it "does not touch #67". That is true at the file level, but the PR does conflict textually. Whoever rebases P1 after #67 merges should apply the three changes above.

### n1 (Nit): the pill-threshold survivor (`<= 12` → `< 12`) is equivalent on shipped data, but the AC boundary itself is untested
- **Where:** `app.ts:536`. The test file doesn't check hens[H] = 12 or 13.
- CSV hens = 5 + 5·L (5, 10, 15, …, 155), so hens[H] is never 11–14. That makes thresholds `< 12`, `<= 11`, `<= 13`, and `<= 14` all equivalent with today's data. They are not equivalent against the AC: if Economy retunes `hensBase`/`hensPerLevel` so a level lands on 12, `< 12` would show "×12 hens" while only 12 sprites are drawn, which breaks "shown only when > 12".
- **Killing test (verified, kills M13–M16):** use a synthetic balance `{ ...balance, farm: { ...balance.farm, hensBase: 12, hensPerLevel: 1 }, m4: { ...balance.m4!, enabled: 1 } }`. Mount F5/H0: hens[0] = 12 gives 12 sprites, pill hidden. Mount F5/H1: hens[1] = 13 gives 12 sprites, pill `×13 hens`. Mount F1/H0: Farm row 13, Hens row 12, pill hidden. Full file: `engineering/reviews/pr69-c849ccf-proposed-boundary.test.ts.txt` (on rc1, use `\u00a0hens`).

### n2 (Nit): `Math.min(hensN, 12)` cap mutations are equivalent
- **Where:** `app.ts:530`. The yard always renders 12 slots, and the `order.indexOf(i) < hn` / pop checks only compare against indices 0–11. So `min(…,13)` and the uncapped `hn = hensN` give identical DOM. Keeping the cap is fine (it documents the AC). No action needed.

### n3 (Nit): HoE summary wording vs AC
See "Spec" above. The summary omits "at any F≠H" and words the Farm-buy clause as "changes neither". The code meets both, so no action is needed beyond quoting the AC itself in HoQA's verify notes.

## Mutation results (`app.ts:529–536`, one mutant at a time)

25 real mutants (M26 in the log was a no-op control, excluded). Full log: `pr69-c849ccf-mutants.log`.

| Suite | Killed | Survived |
|---|---|---|
| `tests/m41-p1-yard-hens.test.ts` only | **19/25** | M09 cap 13, M12 uncapped (equivalent, n2); M13 `< 12`, M14 `<= 11`, M15 `<= 13`, M16 `<= 14` (equivalent on CSV data, n1) |
| + proposed boundary test | **23/25** | M09, M12 only (truly equivalent) |

Killed by the shipped test: swapped tracks, always-H, always-F (revert), negated flag, H±1, max(H,F), cap 11, min→max, sprites from F, pill threshold 9, pill always/never shown, inverted pill, pill text/hidden from F, pill text/hidden from `hn`, and a stale sprite dirty check (catches the missing same-tick re-render).

**"pill<12" survivor (the one the PR names):** this is `setHidden(hp, hensN <= 12)` → `hensN < 12`. It is equivalent on today's CSV (no level has exactly 12 hens) and is a real gap only against the AC text or a future retune. The n1 test kills it.

## Gates @ c849ccf (clean tree, `git status --porcelain` empty after)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm test` (sync-economy --check + vitest) | PASS, 87 files, **987/987** (incl. both goldens) |
| `npm run test:slow` | PASS, 16 passed / 1 skipped |
| `npm run build` (+ check-release-build dist) | PASS, build id `m3-rc1-pre+c849ccf` matches HEAD (main predates #61/#66's id bump, as expected) |
| `npm run build:html` | PASS, `dist-html/egg-farm.html` 511,020 B, sha256 `b225f415147b7879c5505de26eb9710697e3de33e401248b81b3a7cc6d2b1e4b` |
| `npm run build:qa` | PASS |
| `npm run check-globals` (chromium) | PASS 3/3 |
| `rc0-browser.mjs chromium` (AXE_PATH=/tmp/axe/…/axe.min.js; /tmp/ccr-axe no longer exists) | PASS **348/348** |
| `test:flagoff` | not present in package.json at this base |

## Apply on #67 (`rc/m4.1-rc1` @ 5d9efa6)

- **Conflict:** 1 hunk in `src/ui/app.ts` (the `#henpill` line, rc1:550). `tests/m41-p1-yard-hens.test.ts` adds cleanly. Resolution as described under m1.
- **After resolution (own worktree, dirty, uncommitted):**
  - `tsc` PASS.
  - Full vitest: **108 files, 1,409 passed / 1 skipped**. That is rc1's 1,403 plus the 7 new tests. The skip is `serve-own.test.ts`'s environment-gated case.
  - The new test and `m41-9-big-number` pass 42/42 once their expectations are updated.
  - `check-globals` (chromium, ALLOW_DIRTY=1) PASS 3/3.
  - `rc0-browser chromium` (ALLOW_DIRTY=1) PASS **358/358**.
  - `npm run build` fails only at check-release-build's dirty-tree refusal (`m4.1+5d9efa6+dirty`), which is expected for an uncommitted resolution.
- **Behaviour after #67:**
  - The pill keeps #64's NBSP and uses `fmtCount` (round-to-nearest). Values are integers ≤ 155, so the `fmtCountFloor` question doesn't apply and the output matches #64's rules.
  - None of #63's recovery flow, #65's explainer placement (`blockRects`/`buyRects`/`collectRect` don't reference `#yard`/`#henpill`), renderGoal, trackUnlockFarm, or the best-chip read the yard count.
  - No rc0 or harness script asserts `#henpill` or yard sprite counts (grep of `scripts/*.mjs` and `tracks-explainer.ts`).
  - The only rc1 assertion about the old line is `m41-9-big-number.test.ts:122` (m1).

## Not verified
- Firefox/WebKit rc0 legs and the scroll sweep, which are out of scope for a render-only line change. Only Chromium was run.
- A visual check in a real browser of the pill and sprites at F≠H (covered by the jsdom tests through the real `mountApp`).
- Offline-return rendering in a browser (covered by code reading only).
- check-release-build on a committed rc1+P1 tree. That needs the actual rebased commit.
