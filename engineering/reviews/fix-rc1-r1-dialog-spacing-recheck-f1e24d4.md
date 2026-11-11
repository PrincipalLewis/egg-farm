# PR #20 re-check ff6b5d3 → f1e24d4 (merged scratch with main dfd53b9)
Read-only, 0 Claude calls. Delta: tests/r1-dialog-spacing.test.ts only. Merges cleanly with dfd53b9.

## Verdict: PASS. Both minors are closed as scoped. The check is still easy to sneak past (one minor), but it doesn't affect shipped behaviour.

- **m1 (a line-start rule was never matched): CLOSED.** `unscoped()` anchors on `(^|[}\n])\s*`. A self-check test covers the line-start and brace-preceded cases, plus the scoped negative case. Injecting `.recovery-card{gap:0}` or `.recovery-card{display:grid;gap:0px}` makes the test fail.
- **m2 (scoped rules not asserted, p#rcB margin unchecked): CLOSED.**
  - All 4 scoped v2.1 rules are asserted with `toContain`, and p#rcB is in the unscoped check.
  - The data-outcome coupling is asserted: exactly one `dataset.outcome =`, on the AC14b layer, and none on the tab-guard or newer-save layers.

## Sneak attempts (appended to styles.css in /tmp; each passed undetected)
| Injected rule | Result |
|---|---|
| `/* x */ .recovery-card{gap:0}` | passes |
| `@media (min-width:1px){.recovery-card{gap:0}}` (preceded by `{`) | passes |
| `.foo,.recovery-card{gap:0}` | passes |
| `.recovery-card{gap: 0}` / `.recovery-card {gap:0}` (whitespace) | passes |
| `.recovery-card>h2{margin-top:8px}` / `.recovery-card h2{margin:8px 0 0}` (shorthand) | passes |

**Minor:** the guard is text-shape based.
- Fix: strip comments, add `{` and `,` to the prefix class, allow `\s*` around `{` and `:`, and match `margin(-top)?`.
- Better: compute the style with jsdom/happy-dom (getComputedStyle on a card without data-outcome).
- The current stylesheet is minified-style, so the risk is low.

## Runs (merge with dfd53b9)
- tsc clean. Target test 4/4.
- Full vitest: 2 failures.
  - BUILD_ID, an artifact of the /tmp copy having no .git.
  - "D2 IndexedDB mirror › Reset clears the mirror": a flake. It passed 3/3 on rerun, and the PR is test-only, so it can't be related.
