# PR #31 re-check @ 18e5057 (B1 fix 459c1de) — Claude Code Reviewer (read-only), 2026-10-17 07:xx UTC+2
Zero Claude calls. Detached worktree /workspace/rv31b. Changes since 7621153: src/save/save.ts (m4SaveSeq hadSeq, doc comments), tests/m4a-saveseq-carry.test.ts, engineering/status.md.

## Verdict: PASS on B1 (fixed). One new MAJOR (release-build, not data loss), M1 below: release builds from this branch fail until it is fixed (one-line renormalize). Also one minor and one nit.

## Verification
- Original scratch repro on 18e5057: the flag-off save after an M4-build-off seq-5 save now writes saveSeq 6. rankCompare(stale, new) = -1 and pickNewest = 'ls'.
- The new tests/m4a-saveseq-carry.test.ts copied onto 7621153 fails 1 of 2: the B1 case fails, and the no-prior-seq case passes, as it should.
- Flag-off byte parity when there was never a seq: save() output === main c197465's serialize format (no saveSeq key), byte-identical.

## Edge probes (scratch vitest)
- "Previous copy" means the localStorage main copy only (save.ts `prev = kv.getItem(SAVE_KEY)`). IndexedDB and .bak are not consulted.
- Boot from an IndexedDB copy with seq (LS missing, or LS corrupt/unparseable): reconcile picks idb and writes it into LS, and the next flag-off save carries seq 6. OK.
- Seq on .bak only (main missing): a flag-off save writes no seq. This is harmless, because .bak is only used when main is invalid or missing and is not ranked against main.
- Corrupt-but-parseable main with a seq: the seq is carried (+1). Harmless.
- Bad input: string, NaN, negative and unsafe values all read as 0. No NaN is ever written.

## Gates @ 18e5057
- tsc: OK. sync --check: OK.
- vitest full x2: 745/745, 745/745.
- golden f90d1678: sim trace + storage bytes, 2/2.
- test:slow: vendor pins OK + 14/14.
- vite build: OK. check-release-build FAILS 'dirty', even on a fresh clone (see M1).
- check-globals, PORT unset: PASS for flag-off and for the M4 build (m4.enabled=1 scratch). The only global is eggfarmExportTelemetry. The Fredoka 700 preload is absent from the M4 build.
- rc0: not re-run (the diff is save.ts plus tests only). The last run on 7621153 was 207/209, with the 2 known #17 B5 failures.

## Findings
- m3 (minor): src/save/idb-mirror.ts:100 (rankCompare ranks saveSeq above savedAt). A copy written by main c197465 never has a seq: main's serialize strips it. If an M4/PR-build player runs main, and every one of main's IndexedDB mirror writes in that session fails, then the PR build's next boot ranks the stale IDB copy (seq N) above main's newer LS copy (seq 0) and restores it.
  - Probe: pickNewest(mainLs no-seq newer, idb seq 5) = 'idb'.
  - Reachability is low, because a single successful main IDB write overwrites the mirror without a seq.
  - Suggested fix: when exactly one side has a seq, fall back to savedAt. Or document the case under ADR M4-19.
- n2 (nit): save.ts saveSeqOf/m4SaveSeq. At Number.MAX_SAFE_INTEGER the next save writes 2^53, which reads back as 0 and resets the rank. This needs ~9e15 saves, so it is unreachable in practice; clamping would make it explicit.
- m1 / n1 from the first pass: fixed. The doc comments are reattached at save.ts:38-41 and :146-166, and the PR body is claimed to have full paths (not re-read).
- M1 (major, release): data/economy.f1.csv is committed with CRLF line endings (from #17: `git ls-files --eol` shows i/crlf), but main's .gitattributes (#26) sets `*.csv text eol=lf`. On 18e5057 every clean checkout therefore shows ` M data/economy.f1.csv`, and check-release-build refuses with 'dirty'. Verified on a fresh `git clone` + `checkout 18e5057`; cf50663 alone is clean. Fix: `git add --renormalize data/economy.f1.csv` on this branch (or on #17 after it catches up with main). This corrects first-pass m2: tests do not rewrite the file; the dirt is line-ending normalisation.
