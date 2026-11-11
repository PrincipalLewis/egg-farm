# Code review: 4fbd0b9 — QA B-2 first-hire coach tip vs Upgrades tabs

- Branch: `fix/rc2-b2-tired-tip-tabs` (PR #4), range `a01faea..4fbd0b9`
- Files: `src/ui/app.ts` (+2/-1, in `coach()`), `tests/rc2-b2-coach-tabs.test.ts` (new, 10 lines)
- Spec: the "Workers get tired over time." tip must not cover the Upgrades tabs at 1280. `coach()` should flip below its target when the above placement would overlap a `[role=tablist]`.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 1 |
| minor | 2 |
| nit | 3 |

**Verdict: the fix logic is correct on reading, but the unit test is not adequate, and I did not verify the fix in a browser.** I'd approve the app.ts change. I'd ask for a behavioral test, or a browser case, before calling B-2 closed.

## Is the B-2 fix correct?

Yes, by static reading. I did not confirm it in a browser (see "What I ran and did not run").

- Above placement puts the tip in the vertical band `[r.top - 12 - eh, r.top - 12]`. The `bottom:${innerHeight - r.top + 12}px` style puts the tip's bottom edge 12px above the target.
- The new predicate `t.bottom > r.top - 12 - eh && t.top < r.top - 12` is the standard interval-overlap test against that band, so it is right.
- `.filter(t => t.width)` drops the tablists of hidden panels. Below 960px the hidden sheet is `display:none`, so its width is 0. That matches the existing `!r.width` convention in the same function.
- Docked at 1280, `.sheet[hidden]{display:flex!important}`, so the Upgrades tablist is measured. The Workers tab's first row's `.ebar` sits right under the tab bar. A tip of about 60–70px above it overlaps the tabs, so it now flips below. That is the reported case.
- `above` is recomputed on every 250ms `place()` tick, so the result follows layout changes such as resize or the tab render.
- The `.below` class and the hand SVG toggle already existed, so the flip needs no extra CSS.
- Only one expression changed (`const above = …`). The non-tablist behavior (`r.top >= 120`) is unchanged.

## Findings

### F1 — major — `tests/rc2-b2-coach-tabs.test.ts:5-8` — the test greps source text and exercises no behavior

**Evidence.** The test reads `app.ts` as a string and asserts two things:
1. the slice contains the literal `[role=tablist]`;
2. the slice matches `/const above = r\.top >= 120 && !tl\.some/`.

It passes at this SHA (command and output below). It would pass equally if the overlap predicate were broken. For example:

```
const above = r.top >= 120 && !tl.some(t => false)
```

matches the regex. The same goes for an inverted comparison, or for `tl` being built from the wrong selector as long as the string `[role=tablist]` stays in the slice. I reasoned this out from the regex. I could not run a mutant, because Bash was denied late in the session.

Other weaknesses of this test:
- It breaks on any harmless refactor, such as renaming `tl` or reformatting.
- It slices from `const coach =` to the `classList.toggle('below'…)` call, so it is coupled to statement order.
- It never checks the flip, the hand image, or the `below` class.

**Impact.** Nothing here would catch a regression of B-2 itself, so the "Unit test" in the commit message gives false assurance.

**Fix.** Pick one:
1. **Preferred, and cheap.** Extract the decision into a pure function, for example `export function coachPlacement(r, tablists, eh, minTop = 120): 'above'|'below'` in a small UI-logic module. `ui-logic.test.ts` already tests pure helpers, so this fits. Unit-test it with rects: an overlapping tablist gives `below`, a tablist well above gives `above`, `r.top < 120` gives `below`, and zero-width tablists are ignored. The overlap boundary can be covered exactly, e.g. `t.bottom === r.top - 12 - eh`.
2. Add a browser case to `scripts/rc0-browser.mjs` at 1280×720. Hire a worker, wait for the tip, and assert that the `.coach` rect and the `[role=tablist]` rect do not intersect. This is the real regression check for B-2 because jsdom has no layout.

Keep the source-grep test only as a complement, if at all.

### F2 — minor — `src/ui/app.ts:533` — the new below placement is never checked against the viewport

**Evidence.** The `below` branch is `top:${r.bottom + 12}px` with no bound on the tip's bottom edge. Before this change, `below` was only reached when `r.top < 120`, so the target was near the top and there was plenty of room underneath. The new predicate sends targets that are low on screen below as well. In the docked layout the Upgrades sheet is the lower grid row (`grid-template-rows:1fr 1fr`). A worker row's `.ebar` near the bottom of the viewport at 1280×720 can end up with `r.bottom + 12 + eh > innerHeight`, so the tip gets clipped. I did not measure this in a browser, so treat it as plausible, not confirmed.

**Impact.** A fix for "tip covers tabs" could produce "tip falls off-screen", with the same copy still unreadable. The tip auto-closes after 3s and is purely informational, so the severity is minor.

**Fix.** Make the flip conditional on there being room below. Otherwise keep `above`, or clamp the top:

```ts
const fitsBelow = r.bottom + 12 + eh <= innerHeight - 8;
const hitsTabs = tl.some(...);
const above = r.top >= 120 && !(hitsTabs && fitsBelow);   // prefer tabs-overlap flip only when below fits
```

Also verify with the F1 browser case at 1280×720 and a shorter height such as 1280×600.

### F3 — minor — `src/ui/app.ts:532` — the fix changes placement for every `coach()` caller, not just the tired tip

**Evidence.** The check is global (`document.querySelectorAll('[role=tablist]')`). It applies to:
- the Market Hand tip "Hire them for … They work while you play." (`app.ts` ~line 561, targeting the row's hire button);
- the "Your next goal is always shown here." tip (`showGoalIntro`).

The Market Hand tip points at the first worker row, which sits directly under the tab bar. It will now also flip below the hire button instead of sitting over the tabs. That is probably good, but it is an unverified behavior change beyond the QA ticket. The hand pointer also changes direction, so on narrow phones the tip now covers the row's own description.

**Fix.** Either note in the PR that this is intended and add the Market Hand tip to the F1 browser case, or limit the check to the `.tabs` of the panel that contains `at`. Containment is the more principled scoping: `at.closest('.sheet')?.querySelector('[role=tablist]')`.

### F4 — nit — `src/ui/app.ts:532` — `eh` is measured from the unplaced element on the first `place()`

On the first call `el` has no `left`/`top` and no `transform` yet. A `position:fixed; width:max-content` element with `left:auto` is laid out with a different available width than after `left:${cx}px` is set. With `max-width:280px/320px` and `cx` clamped to ≥156, wrapping can differ near the right edge. The first measurement of `offsetHeight` can therefore be a line off. The 250ms tick corrects it, but there can be a one-frame wrong choice, and flip-flopping if the height changes between the two layouts. It is cosmetic. If it ever shows up, set a provisional `left` before measuring.

### F5 — nit — `src/ui/app.ts:532` — layout reads every 250ms, and clipped tablists can produce false overlaps

- Each tick now runs `querySelectorAll` plus a `getBoundingClientRect` per tablist, in addition to the existing one. That is negligible for a 3–8s tip.
- A tablist that has scrolled out of its scroll container (`.body` is a scroller) still reports a rect and can falsely trigger the flip while visually clipped. That is rare, and the failure mode is a harmless flip.

### F6 — nit — `src/ui/app.ts:532-533` — readability

The inline `/* B-2: … */` comment is fine, but `12` is now repeated three times in the expression (`r.top - 12 - eh`, `r.top - 12`, and the later `+ 12` in the style strings). Name it, e.g. `const GAP = 12;`, so the overlap band and the style offsets cannot drift apart. The one-liner density matches the surrounding file.

## What I ran and did not run

- `git diff a01faea..4fbd0b9` — read in full.
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --maxWorkers=2 tests/rc2-b2-coach-tabs.test.ts tests/onboarding.test.ts` — **the prescribed flags fail on this repo's vitest 2.1.9.** Output: `RangeError: options.minThreads and options.maxThreads must not conflict` (Tinypool), and no tests ran. This is an environment/tooling issue, unrelated to the commit.
- Re-run with `--poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc2-b2-coach-tabs.test.ts tests/onboarding.test.ts`:
  ```
  ✓ tests/rc2-b2-coach-tabs.test.ts (1 test) 3ms
  ✓ tests/onboarding.test.ts (13 tests) 17ms
  Test Files  2 passed (2)   Tests  14 passed (14)
  ```
- Load average at the time was about 14 (below the 30 cutoff), so a browser run was allowed. My Bash access was denied partway through, so I did **not** run any of the following:
  - `npx tsc --noEmit`
  - `scripts/rc0-browser.mjs`
  - the mutant check for F1
  - a 1280×720 screenshot of the flip

  The correctness verdict above rests on reading the code. The F2 and F3 behaviors are unverified. Please run the 1280×720 browser check under `flock /workspace/egg-farm-studio/.browser-test.lock` before merging.
- The full vitest suite was not run. The diff touches one expression in `coach()`, and only `onboarding.test.ts` references `coach`.
