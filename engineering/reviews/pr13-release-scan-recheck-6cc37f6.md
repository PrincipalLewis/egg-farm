# Re-check: PR #13 release-scan — 6cc37f6 (vs 3d76861)

Read-only re-check. Worktree: /workspace/review-6cc37f6 (detached). Runs: /tmp/r13b, a local clone with git history.
Claude calls: 0. Each claim was checked directly with probes and runs, so a cross-check wasn't needed.

## Verdict: PASS (approve). Every earlier finding is closed or listed as an accepted gap. Two new minors are advisory and don't block.

## Real build, both modes
- `npm run build:html`: exit 0. It produced `dist-html/egg-farm.html` (467,914 bytes) and the check printed `m3-rc1-pre+6cc37f6 matches HEAD ok`. All scans passed.
- `vite build` followed by `check-release-build dist`: exit 0, with no new false positives.
- `git status --porcelain` is empty after the build, because `dist-html` was added to `.gitignore`. The build id therefore won't become `+dirty` in CI.
- The release tests pass 32/32 (`release-html.test.ts` and `release-build-id.test.ts`).

## CI (M1)
The new `release-html` job runs `npm ci` and then `npm run build:html`. That script is an `&&` chain: copy check → sync check → tsc → `build-html.mjs` → check on the html. `build-html.mjs` throws if anything is left un-inlined or if there's no inline module, and the check exits 1 on every failure. The job therefore fails closed. CI was not executed (no hosted runner); the chain was run locally.

## Earlier findings
| ID | Status | Evidence |
|---|---|---|
| M1 | closed | see above |
| M2 | closed | `@import url(https://x.y/z)` appended to dist CSS → `external references: css url() …, @import …`, exit 1 |
| M3 | closed / accepted gap | Probe: nested bracket, `\|\|=`, Reflect.set, defineProperty on an alias, top/parent/frames, `(0,window)`, `window . x`, typeof ternary and `Function("return this")()` are all now CAUGHT. Still missed, and documented in ci-gates.md and the release-scan.mjs header: alias with a non-eggfarm or variable key (`alias comma` was caught before and is now missed; that's the intended m3 narrowing), window passed as a parameter, bare `var x` at top level. The runtime `check-globals` remains the gate. |
| m1 | closed / accepted gap | srcset, ws/wss, XHR, object data, meta refresh, inline and external sourceMappingURL, `.map` files and `fetch("https://"+h)` are all CAUGHT. `const u=…; fetch(u)` is missed and documented. |
| m2 | closed | 17 new fixtures covering unknown and multiple build ids, defineProperty, assign, CSS url/@import, srcset, eggfarmUi, QA hook, script-close and more |
| m3 | closed | `pass-assign-allowed` fixture; local `self` handling. The real bundle has no local `self`, so `self` is still checked as a root there. |
| n1 | closed | a missing value for `--build-id` fails; `--build-id=` works; unknown options fail |
| n2 | closed | missing `index.html` fails; unbalanced or nested `<script>` fails closed (`extractScripts`) |

## New findings (bracket matcher `close()`, scripts/release-scan.mjs:23-31)
### N1 (minor) — the matcher skips string literals but not regex literals or comments, and an unbalanced result silently skips that one write
`window[/]/.test(s)?"eggfarmA":"b"]=1`, `window[k /* ] */]=1` and `window[k // ]\n]=1` are all MISSED. A `]` inside a regex or comment ends the key early, the text after it isn't an assignment, and the write is skipped (`:70` `if (j < 0) continue`, plus the assignment test at `:71`). A stray unbalanced regex before a real write does not hide that write (probe: caught). Minifiers strip comments, so in practice the exposure is a regex inside a computed key. Fix: on `j<0`, or when the key contains `/`, flag the write as `[unparsed]` for root bases (fail closed). Repro: `node engineering/reviews/pr13-release-scan-recheck-6cc37f6.adv.mjs` (fix the `/tmp/r13b` import path first).

### N2 (minor) — the 4000-character scan cap fails open
`:25`: a computed key longer than 4000 characters (`window[f(1,1,…)]=1`) returns -1 and is skipped. Same fix as N1. Treat it as unparsed and flag it for root bases.

### Performance (no hang)
- 20k-deep nesting: 0.4 s.
- 200k `window[` openings: 0.12 s.
- 50k unterminated strings: 0.5 s.

Work is bounded by the 4000-character window per match, so there's no catastrophic backtracking.
