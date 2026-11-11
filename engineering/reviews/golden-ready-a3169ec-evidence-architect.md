# Architect evidence audit: Golden Ready ask, #111 a3169ec / #108 811c7da
Senior Software Architect, 2026-11-05 ~22:45 CET. Read-only audit of the Features evidence; no suite re-run; no git/PR/Ready change. No Claude review.
Evidence: artifacts/v5-golden-ready-a3169ec/EVIDENCE.md (sha256 b0309598f70b8267…), SHA256SUMS (sha256 d011a8ef6abad608…).

## What I verified
- **Sums:** `sha256sum -c SHA256SUMS` exit 0. 185 entries cover every file in the dir except itself; no uncovered file.
- **Tested SHA:** tested-sha.txt = head-after.txt = a3169eca3aaa224de337fb92205f6f8f47468cba. status-before and status-after are empty. The worktree /workspace/wt-v5-golden-ready-a3169ec is still at that SHA, clean. run.sh writes these files itself (not hand-written).
- **Exits and outputs:** all 14 .exit files are 0, matching results.tsv and runner.log START/END (window 22:25:08–22:35:23 CET). The logs confirm the counts:
  - vitest: 149 files, 2149 pass / 1 skip (serve-own).
  - slow: 4 files, 17/1. Vendor pins 4/4.
  - goldens: 2 files, 4/4. flagOff f90d1678… and m4On a54c9cf9… match their pins.
  - check-globals Chromium: 3/3 PASS.
  - check-release html: build id m4.1+a3169ec matches HEAD.
  - rc0: 394/394.
  - verify 24 h: PASS, trace 9c47b11e…, equal to 66b409b (trace-comparison.json).
- **Remote, read-only ls-remote (~22:45 CET):**
  - #111 head a3169ec; base feat/v5-golden-spawn = 811c7da, which is an ancestor of a3169ec.
  - #108 head 811c7da; base feat/v5-golden-rewards = a6d44c2, which is an ancestor of 811c7da.
  - 90fb447 (M1 fix) is an ancestor of 811c7da and of a3169ec.
  - a3169ec's tree equals 2261670's tree (`git diff` empty), consistent with the prior PASS (restack) addendum (06e17a10…) and the M1 note (b0d9d6c7…).

## Gaps (not fabricated as passes)
1. **Runtime differs from CI and the studio pin.** env.txt shows **node v24.22.1 / npm 11.21.1**. ci.yml uses node 20, and the studio pin is v20.19.2. The local evidence is real, but it is not on the CI runtime.
2. **Exact #108 head 811c7da was never tested on its own.** The evidence only shows it as an ancestor of a3169ec. a3169ec contains the Game commits as well, so the passes do not prove the 811c7da tree alone. EVIDENCE.md states this honestly.
3. vitest ran with maxForks 2 and without the engineering flock. That is lane practice and does not invalidate the results.
4. Chromium only for globals and rc0. That matches the Features-branch workflow; Firefox/WebKit are rc/main-only.
5. Hosted CI was skipped on both Drafts, so there is no hosted evidence yet.

## Recommendation (Ready ≠ merge; I have no authority to publish)
- **#111 a3169ec: Ready recommended.** There is exact-head local evidence, checksummed and consistent, plus the prior static PASS. Gap 1 is closed by the hosted gate (node 20) that runs after Ready.
- **#108 811c7da: Ready recommended with a condition.** The M1 fix 90fb447 is in, and the prior Architect static PASS stands. There is no exact-head local run (gap 2), so **hosted CI at exactly 811c7da is the exact-head evidence**. A re-run at 811c7da on node v20.19.2 would also close it.
- **Merge for both:** needs QA's verdict plus the hosted required checks green at the exact PR head (gate, with release-globals skip expected), on node 20. Merge #108 before #111, and #111 re-checked if #108's tip moves. Note that rc/v5 is now 844f8e15; the golden stack targets its feature bases, not rc/v5.
