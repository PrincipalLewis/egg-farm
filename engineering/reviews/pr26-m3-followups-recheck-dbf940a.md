# PR #26 light re-check at dbf940a (merge d892131 of main 4608a4f, plus dbf940a on top of f0bac9b)
Reviewer: Claude Code Reviewer (read-only). Detached worktree /workspace/wt-pr26d, node_modules symlinked. Claude calls: 0.

## Verdict: PASS. OK to merge. m1, n1 and n2 from f0bac9b are fixed. No blocking or major findings. 1 minor and 1 nit, neither needs another round.

## Merge check
`git merge-tree --write-tree f0bac9b 4608a4f` conflicts only in .gitignore. The auto-merged tree (59d44e55) differs from d892131's tree only by the three conflict-marker lines in .gitignore, resolved as a union (__pycache__/ + dist-html). Nothing else is hidden. ✔

## Gates (re-run)
tsc OK · npm test (sync --check + vitest) 564/564 on two full runs, no idb-mirror flake · test:slow pins OK, then 12 passed / 2 skipped · build OK (release checks incl. globals) · check-economy-copy --strict on the real product/: exit 0, byte-for-byte 57d964d5 · check-globals (PORT=5941, chromium): only eggfarmExportTelemetry. PASS
.gitattributes: `*.csv text eol=lf`. `git ls-files --eol` shows all 3 CSVs as i/lf w/lf.

## Tamper runs
| Case | Result |
|---|---|
| --strict, CRLF product/economy.csv | exit 1 (b294762e ≠ 57d964d5) ✔ |
| --strict, BOM | exit 1 (23725634) ✔ |
| non-strict CRLF / BOM | exit 0, normalised warn mode as designed ✔ |
| pins: unlisted sim/extra.py | exit 1 ✔ |
| pins: nested sim/README.md | exit 1 (the ignore list is root-only) ✔ |
| pins: sim/__pycache__/*.pyc | exit 0 (ignored as designed) |
| pins: a .py file inside __pycache__/ | exit 0 (ignored; see n1) |
| pins: unlisted **symlink** sim/link.py | **exit 0, not flagged** (m1) |
| pins: ECONOMY_VENDOR_DIR without VITEST | warning, real dir checked, exit 0 ✔ |
| pins: SHA256SUMS missing | "ERROR … not found", exit 1 ✔ |

## Findings
- **m1 (minor): unlisted symlinks escape the unlisted-file check.** scripts/check-vendor-pins.mjs:32 (`if (!e.isFile()) continue`).
  Repro: `ln -s /any/file vendor/economy-sim/sim/link.py && node scripts/check-vendor-pins.mjs` exits 0. The sim could then import the symlinked file.
  Fix: treat `e.isSymbolicLink()` (and any other non-directory) as unlisted, or lstat each entry. Listed files are still hashed, so pinned content can't be swapped this way.
- **n1 (nit): `__pycache__` is ignored by path segment, so any file under it is skipped, including .py and crafted .pyc.** check-vendor-pins.mjs:34.
  The TS suites don't execute Python; only fixture regeneration does. Suggested tightening: ignore only `*.pyc` inside `__pycache__/`, or run fixture generation with `PYTHONDONTWRITEBYTECODE=1 python3 -B`.
