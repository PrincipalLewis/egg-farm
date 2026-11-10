# PR #26 light re-check at c6c4458 (on dbf940a)
Reviewer: Claude Code Reviewer (read-only). Detached worktree /workspace/wt-pr26e, node_modules symlinked. Commit was already local, so no fetch or credentials were needed. Claude calls: 0.
Diff dbf940a..c6c4458: .gitattributes +2 (comment + `vendor/economy-sim/** -text`), plus one-line doc edits in ci-gates.md, decisions.md and status.md. No code changed.

## Verdict: PASS. OK to merge. No blocking or major findings.

## Attribute precedence (git check-attr / ls-files --eol)
- vendor/economy-sim/economy.f1-m4cols.csv: text **unset** (the later line wins). eol: lf is still reported, but git ignores eol when text is unset; the autocrlf clone confirms no conversion. ✔
- vendor/economy-sim/sim/economy_sim.py: text unset. ✔
- data/economy.csv and data/staging/economy.f1-m4cols.csv: text set, eol=lf. ✔ (`*.csv eol=lf` still applies outside vendor)
- Renormalize: all 7 vendor files and both data CSVs are i/lf. Nothing to renormalize.

## core.autocrlf=true clone (/tmp/crlf26, fresh checkout of c6c4458)
- Vendor files: all w/lf (no conversion). check-vendor-pins exit 0, 4/4 match. ✔
- data/economy.csv w/lf, sha256 57d964d5. ✔
- Other source files (.ts/.mjs, no attribute) check out as w/crlf, as expected under autocrlf. Out of scope, but see n1.

## Gates (re-run on the restored box)
tsc OK · npm test (sync --check + vitest) run 1 564/564, **run 2 563/564** (idb-mirror "Reset save clears the mirror" failed again, see m2) · test:slow pins OK, then 12 passed / 2 skipped · build OK (5/5 release checks ok) · check-economy-copy --strict on the real product/: exit 0, byte-for-byte 57d964d5 · check-globals (PORT unset, chromium): only eggfarmExportTelemetry. PASS

## Findings
- **m1 (minor, carried from dbf940a, unchanged):** check-vendor-pins.mjs:32 still skips unlisted symlinks. c6c4458 didn't touch the script, so it's still open (follow-up is fine).
- **m2 (minor, existing, not this PR):** tests/idb-mirror.test.ts "Reset save clears the mirror (awaited)" is still flaky under full-suite load. It failed in 1 of 2 runs here and 2 of 2 at f0bac9b; dbf940a passed 2 of 2 by chance. The "564/564" gate claim isn't reliable. Hand it to Saves.
- **n1 (nit):** there is no `* text=auto eol=lf` default, so an autocrlf checkout gets CRLF .ts/.mjs files. That's harmless for the pins and CSVs. Optional.
