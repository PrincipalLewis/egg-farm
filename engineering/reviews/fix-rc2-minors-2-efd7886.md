# Review: fix-rc2-minors-2 @ efd7886 (recheck of 1827a27)

Range `9677d26..efd7886`, worktree `/workspace/review-efd7886`. Topic: recheck of `engineering/reviews/fix-rc2-minors-2-1827a27.md` (#1 N3 vitest guard and overlap precondition, #2 3.98M exact form, #3 pure `orderLineText`, #4 per-engine shot folders and a single fs import). I read the full `1827a27..efd7886` delta (`rc0-browser.mjs`, `order-list.ts`, `orders.ts`, `rc2-minors-2.test.ts`). I also read the surrounding `fill()` in `order-list.ts`, the N3 and §9 blocks of `rc0-browser.mjs`, the tail of `styles.css`, the HUD/farm template in `app.ts`, and spec §9/§9.1.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 2 |
| nit | 4 |

Verdict: nothing blocks merge. #1 and #3 are fixed in substance. #2 is fixed in the assertion, but the test name is wrong at three of five widths, and the spec is still not updated. #4's import half is fixed, but the per-engine half is only a usage convention that nothing enforces.

**Limits of this review.** Only my first Bash call (`git log`, `git diff`, `--stat`, and the old review) ran. Every later Bash call was denied by the permission layer ("don't ask mode"), the same as in the 1827a27 review. So I did **not** run `vitest` or `npx tsc --noEmit` at this SHA, and I cannot confirm that tests pass or that the code type-checks. The unit assertions below are traced by hand. Browsers were not run (per the brief), so layout at 360/390/1280 and the 3.98M fit come from code, CSS, the spec and the commit messages, not from measurement.

## Status of the 1827a27 findings

| # | Finding | Status | Evidence |
|---|---|---|---|
| 1 | N3 has no vitest guard; the rc0 overlap is not asserted | **Fixed.** A narrower gap remains (finding 3). | `rc2-minors-2.test.ts` `N3: hens stay below the HUD…` reads `styles.css` and matches `/\.scene\{z-index:0\}/` and `/\.hud,\.collectbar\{position:relative;z-index:1\}/`. Both match the literal text at `styles.css:603-604`. Both are top-level rules at end of file, not inside a media query or comment. rc0 now has a separate `N3 fixture still has hens overlapping the collect bar (precondition)` check, and `hensOverlap &&` is in the main check. |
| 2 | 3.98M accepts both forms at 360/375; spec stale | **Mostly fixed** (finding 1) | At 360/375, Chromium and Firefox must read exactly `Wants 3.98M · $9.94M`. WebKit alone may read the value alone. The spec table is not updated. |
| 3 | `vText` glue covered only by a source regex | **Fixed in substance** (finding 4) | `orderLineText(fe, val)` is pure and exported. The test pins both outputs. `vText` delegates to it. |
| 4 | Engines overwrite each other's PNGs; two `node:fs` imports | **Import fixed. Folder half is convention only** (finding 2) | `import { readFileSync, mkdirSync, appendFileSync } from 'node:fs'` is the only fs import. No change to how `MS` is computed. |
| 4b | SHOT_LOG `ls` text and full SHA | Not touched, not in the brief. | |
| 5–7 | Nits (`✓ Ready` collapse, stale labels and squash, font-ready cache key) | Not touched, not in the brief. | |

## Findings

### 1. [minor] The 3.98M check name is wrong at 320, 390 and 1280 and for every engine but WebKit, and the spec has no 3.98M row
`scripts/rc0-browser.mjs:1109` (the `ok(` name), `:1107` (dead `specFits360`), `art-ux/rc2-order-sell-preview.md:90-98`.

Evidence:
- The assertion logic is right. `want` is `valueOnly` only when `w < 360`, or when `ENGINE === 'webkit' && d === 3976000 && w <= 375`. Otherwise `want` is `Wants ${txt}` (or `full` when `m.t === full && w > 375`). So at 360 and 375, Chromium and Firefox need exactly `Wants 3.98M · $9.94M`, and the previous "accepts both" hole is closed. WebKit's exception is limited to 3.98M at ≤375. The 13 and 181B fixtures stay strict on WebKit.
- The name does not match the behaviour. It is `d === 3976000 ? 'Wants 3.98M · $9.94M (WebKit: value alone)' : want`. That string is used at **every** width and engine. At 320, every engine legitimately shows `$9.94M` (`w < 360`), so the log reads "Wants 3.98M · $9.94M" for a run that asserted and showed the value alone. At 390 and 1280 the expected form can be the `eggs` form. At 375 on Chromium the "(WebKit: value alone)" suffix is noise. Failure triage and any manifest built from these names will be misleading. The commit message's "stable test name" is true, but the name is stable and wrong.
- The spec was not updated. §9 still lists only 13 and 181B (159.0px, "worst case"). There is no 3.98M row and no sentence saying the zero line goes from `Wants N` to the value alone. The old review asked Art & UX for this, and it is still open. My estimate from the 181B row is that `Wants 3.98M · $9.94M` is about 168–170px against the 170px bar. That fits the "marginal" comment, and it means the Chromium/Firefox exact assertion sits within about a pixel of the threshold. I did not measure it.
- The comment on line 1108 now says both "WebKit's metrics drop it to the value alone" and "(measured fits on Chromium + Firefox)". `fcdda2c` and the old review recorded that this string did **not** fit at 360 on Chromium. The commit message does not say what changed. I could not check, so the Chromium/Firefox claim needs an rc0 log attached.

Impact: no code defect. The test is correct at 360 and 375. The labels are wrong elsewhere, and a ±1px engine or font change will flip a hard assertion that the spec does not describe.

Fix: name it from the expected string, for example `'${want}'` plus an engine-conditional suffix only when the WebKit exception applies (`ENGINE === 'webkit' && d === 3976000 && w <= 375 ? ' (WebKit: value alone also accepted)' : ''`). Attach the Chromium and Firefox rc0 output showing the 3.98M row at 360/375. Ask Art & UX to add the 3.98M row to §9 and one sentence to §9.1.

### 2. [minor] Per-engine shot folders are a convention, not enforced
`scripts/rc0-browser.mjs:14` (`shot`), `:1090` (`MS = process.env.MINOR2_SHOTS ?? ${SHOTS}/rc2-minors-2`), `:1003`, `:1071` (`MINOR_SHOTS`), `:256` (`TOAST_SHOTS`).

Evidence:
- The commit message gives `MINOR2_SHOTS=<set>/<engine>` as the usage, and the code does not change. With `SHOTS_ALL_ENGINES=1` and no `MINOR2_SHOTS`, three engine runs still write `order-wants-13-360.png`, `n3-hens-under-hud-goal-360x420.png` and the rest to one folder. The last engine wins, and `SHOT_LOG` records one `path` once per engine with different `engine` values. This is the same silent-overwrite risk as before.
- `MINOR2_SHOTS` is read only by `rc2minors2`. The `rc2minors` section (`MINOR_SHOTS`), the toast set (`TOAST_SHOTS`) and root `SHOTS` names without an engine suffix get no per-engine folder. Several `rc2minors2` names carry no `ENGINE` either (the `orderFit11` set does end in `-${ENGINE}.png`).
- `mkdirSync(MS, { recursive: true })` makes the nested `<set>/<engine>` path work, so the convention is usable.

Impact: a Firefox or WebKit manifest set can carry another engine's pixels if the operator forgets the env var. The old review offered a default folder as the fix. The author chose to document the usage instead.

Fix: when `process.env.SHOTS_ALL_ENGINES` is set and the engine is not chromium, default each shot dir to `${dir}/${ENGINE}` (or append `-${ENGINE}` to the names). Alternatively, make the script exit with an error if `SHOTS_ALL_ENGINES` is set and the dir variable is not. At minimum, state the convention at the top of the script.

### 3. [nit] The N3 precondition covers the collect bar only, and only by a vertical band
`scripts/rc0-browser.mjs:1161`, `:1157`.

Evidence: `hensOverlap` tests `h.bottom > g.top && h.top < g.bottom` against `.collectbar` alone. `.collectbar` holds `#meterText`, `#goal`, `#goal .goal-label` and `#collect` (`app.ts:83-88`), which is four of the six hit targets. `#coins` and `#basket` are in `.hud` (`app.ts:70-75`), and no precondition says a hen reaches the HUD. Also, a hen that overlaps the bar's band but not a hit point still satisfies the precondition. So the guard says "a hen is at the bar", not "a hen is over each tested centre". It is clearly better than before, and the author's proof run is cited, but the HUD half of the rule is covered only if the fixture happens to place a hen there.

Impact: low. The vitest guard on the two CSS rules covers a revert. The browser check could pass with the HUD rule removed if no hen reaches the HUD at 360x420.

Fix (optional): add `hensOverlapHud` against `.hud`, or require each hit point's hit-test to have a hen's rect under it, and assert it in the same precondition check.

### 4. [nit] `orderLineText` returns an unused `e`, and the glue is still pinned by a regex
`src/ui/orders.ts:109-110`, `src/ui/order-list.ts:34,43,47`, `tests/rc2-minors-2.test.ts:94-97`.

Evidence:
- `orderLineText` returns `{ e: fe, v }`, but `order-list.ts` uses only `.v`. The `E` write still uses `el.dataset.fitE` directly. The `e` field is a pass-through that the test asserts, so the test covers a field nobody reads.
- The test asserts both outputs (`{ e: '', v: '$20.8M' }` and `{ e: '1.23M', v: ' · $20.8M' }`). A broken `orderLineText` (always separator, or never) fails it. Good. A regression in `fitsL1` that stops writing `V` would still pass vitest (rc0 N2 would catch it). The wiring assertion pins the text of the `vText` line (`/const vText = \(eggs: string\) => orderLineText\(eggs, val\)\.v;/`), which fails on any reformat and does not test behaviour. That was my old finding 3, and it is addressed for the separator logic only.
- The `import { orderLineText }` sits mid-file after earlier `describe`s. `rc2-minors-2.test.ts` already does this at lines 17 and 29, so it matches the file's style.

Impact: negligible.

Fix (optional): return only the value string (`valueText(fe, val)`) or use `.e` for the `E` write too. Drop the regex or loosen it to `/orderLineText\(/`.

### 5. [nit] Dead variable and a contradictory comment in the §9 loop
`scripts/rc0-browser.mjs:1107-1108`.

Evidence: `specFits360 = d !== 3976000` is still defined, with the old comment "3.98M and anything at 320 may fall to the value alone", but nothing reads it since this commit. Line 1108 then carries three stacked comments: the WebKit exception, "every fixture, incl. 3.98M … must read exactly", and the `>375` eggs note. The first two partly contradict each other until read carefully.

Fix: delete `specFits360` and its comment, and reduce line 1108 to one comment per branch.

### 6. [nit] Hard-pinning a case that is ~1px from the threshold
`scripts/rc0-browser.mjs:1108-1109`.

Evidence: the spec records 159.0px for the 181B worst case, and the 3.98M string is estimated at 168–170px by my arithmetic (see finding 1). The assertion is exact for Chromium and Firefox. That was the request, and it is deterministic for a fixed font and engine build. But a Playwright browser upgrade can flip it. The failure message prints the measured JSON, which makes it easy to triage.

Fix: none needed now. If it flakes after a browser bump, update the expected form and the spec row together, not the assertion alone.

## Checked, no finding

- **`orderLineText` behaviour.** `orderLineText('', '$20.8M')` returns `v: '$20.8M'`. With a count it returns `' · $20.8M'`. The strings match what `fill()` wrote before the refactor (`eggs ? ' · ' + val : val`), so there is no render change.
- **N3 CSS guard.** Both regexes match `styles.css:603-604` exactly. A revert of either rule, or a change in rule order that drops the text, fails the test. The test does not verify that nothing later overrides the rules, but I read the whole file in the earlier review and found no such rule.
- **Imports.** The merged fs import in `rc0-browser.mjs` has no duplicate or missing names. `appendFileSync` is used at the `SHOT_LOG` wrapper (line 26), and `readFileSync`/`mkdirSync` are used throughout.
- **WebKit exception scope.** The `ENGINE === 'webkit'` clause is limited to 3.98M at ≤375. At 320 the earlier `w < 360` clause covers all engines. At 390 and 1280 the exception does not apply, so the 3.98M row at those widths stays strict (`Wants 3.98M · $9.94M`, or `full` when it matches).
- **Scope.** The delta is the four files named above. No stray changes and no changes under `src/sim` or data.
- **Layout at 360/390/1280.** No CSS change in this delta (the N3 rules are from earlier). The 360 behaviour depends on the 3.98M measurement in finding 1. At 390 and 1280 the only changes are test-side, so I expect no layout regression.

## What I ran

- Read: `git log 9677d26..efd7886`, `git diff --stat 9677d26..efd7886`, `git diff 1827a27..efd7886` (all four changed files), and the 1827a27 review.
- Read directly: `src/ui/order-list.ts:28-55`, `tests/rc2-minors-2.test.ts:1-30` plus the new block, `src/ui/styles.css:598-605`, `src/ui/app.ts:60-100`, `scripts/rc0-browser.mjs:1085-1112` and `1148-1167`, the `shot`/`SHOT_LOG`/`MS` definitions, and `art-ux/rc2-order-sell-preview.md:85-98`.
- **Not run:** `npx vitest run --pool=forks … <files>` and `npx tsc --noEmit`. Bash was denied after the first calls (don't ask mode). I did not try to get around the denial. So I cannot confirm that the tests pass or that the code type-checks at efd7886.
- **Not run:** browsers and `scripts/rc0-browser.mjs` (per the brief).
