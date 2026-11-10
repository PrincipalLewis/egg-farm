# v5 CCR-F4 m5Load Pause sanitiser self-review: fix/saves-v5-m5load-pause-sanitize @ fb4015d831d9211877f4cd0c0bb95240ce044105
Senior Engineer, Saves & Persistence · 2026-10-30 · D-HOE-20261030-08 · base origin/rc/v5 1a61b36 · one commit, no push.
Review rule: D-CEO-20261030-01: CCR post-merge if Claude is available, otherwise recorded as 'no Claude review'.

## Choices
- Gate: only `m4.flags.pause` (the brief says "behind the existing pause flag"). With it off, `m5Load` returns its input (same object), so flags-off
  bytes don't change. That is why E13 (clear on load/save with the flag off) is NOT implemented here; it is listed as open for the Pause PR/HoE.
- Bounds come from the spec, not invented: `paused` is boolean only; `callLockoutS` is in (0, tc_pause_call_lockout_s] (B5 sanitiser: non-finite/negative → 0,
  cap at the tunable; "absent when 0"). It is sim seconds, not epoch ms, so the readyAt-style [now, now + cd] clamp doesn't apply.
  Below `tc_pause_unlock_farm` both are cleared (rule 1 / E12).
- `callLockoutS` on a non-MH worker is dropped: the spec defines it only as `workers.market_hand.callLockoutS`.
- The new tc reads use the file's existing `tc()` (`?? 0`). To avoid a silent 0 (F-5), the two keys are added to F3's `M5_REQUIRED_TC.pause`, so
  a balance with Pause on must carry them (designed use: "the feature PR that reads a key adds it"). On #87's head `tc` = `tcNum`, which throws.
- The row-8 grep test forbids `.paused` outside `isPaused`. Instead of a key-string workaround, the drop-the-key helper lives in sim/pause.ts as
  `sanitizePausedOnLoad`, and the grep allowlist names it explicitly. This is a 1-line change to #82's test; flag it for Architect/HoE.
- Copy-on-write: unchanged workers keep their object, and `workers` is only re-created when something changed.

## Checks (fb4015d; lane-run, flock + nice, maxWorkers=1; load 6.80 at start on 8 cores)
- TDD red first: 10 tests, 6 failed / 4 passed against unmodified rc/v5 src (results/tdd-red-vitest.log). The 4 passing ones are guards
  (flags-off identity ×2, missing fields, valid round trip).
- sync-economy --check 0; tsc 0; targeted 10 files 146/146 (results/vitest-targeted.log, verbose).
- #87 trial merge: 1 conflict (m5-fields.ts header). Resolved in scratch: tsc 0, 102/102 across 5 files. Discarded (results/x87/).
- Not run: full suite, golden, builds, check-globals, rc0 (load caps).
- Process note: the very first red run was started directly (not via lane-run) and died at once (no node_modules in the new worktree); every later run used lane-run.

## Risks / open
- When #87 and this PR both land, whoever merges second resolves the m5-fields.ts header (recipe in the PR body).
- E13 flag-off clearing and the rc2 `rest` mapping are open for the Pause PR.
- Size 105 lines; no SAVE_VERSION change; balance.json unchanged.
Manifest: artifacts/v5-m5load-sanitize-fb4015d/results/SHA256SUMS (13 files) sha256 533db9997dd999c1564298200631238b47c9fa559c2fb680a9a4c193bff55c09.
Bundle: scratch/bundles/fix-saves-v5-m5load-pause-sanitize-fb4015d.bundle (verify okay; requires 1a61b36).
