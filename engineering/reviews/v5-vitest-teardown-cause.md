# v5 vitest teardown errors (HoE/v5-vitest-teardown): cause and fix

Senior Software Architect, 2026-11-10 01:58 CET. Branch `v5/vitest-teardown-fix` off rc/v5 d65391b.
Fix commit **a733304822edc9f809df93e478967a0cd8223e35**, tree **e6a62d70a8243607f1ba6e3adeca79cef25ac4dd**.
Bundle `scratch/bundles/v5-vitest-teardown-fix-a733304.bundle` (verify okay; sha256 1e77c2a2…5dfe). **Not pushed. Push and PR wait on Vadim.**

## Root cause
`mountApp` (src/ui/app.ts:52) adds listeners to `document` and `window` for the lifetime of the page, and it has no unmount. In particular, the Escape handler at **app.ts:381** calls `openPanel(null)`, which writes `$('#p-market').hidden` at **app.ts:192**. HoQA runs locally with `--pool=forks --poolOptions.forks.singleFork=true`, and in that mode vitest 2.1.9 shares one jsdom across all jsdom files. Every app mounted by an earlier file therefore stays subscribed to `document`.

`tests/m41-9-ux-minors.test.ts:125` dispatches a second Escape after the explainer has closed. With the card closed, its capture-phase `stopPropagation` no longer swallows the key, so the event reaches every stale app that still has a panel open. The body has already been cleared, so each one throws `TypeError: Cannot set properties of null (setting 'hidden')`. That gives 134 uncaught errors, exit 1 and 0 failed tests. m41-9 is the victim, not the leaker.

The 134 stale listeners come from four files: zg-ui 102, m41-8-best-chip 22, m41-p2-ui-dom 9 and m4-exp1-explainer 1. I measured this pairwise with each file plus m41-9 in single-fork mode, and the counts sum to 134. m41-6-explainer-storage contributes 0.

Hosted CI passes because `npm test` uses the default forks pool, where each file gets its own process and its own jsdom. Node version, reporter and `dangerouslyIgnoreUnhandledErrors` play no part. Locally, m41-9 alone exits 0, and so do the 7 files in the default pool.

The bug is **not** in #125, #126 or #127. Their deltas don't touch app.ts, these test files or the vitest config, and it reproduces on rc/v5 d65391b itself. A run that orders or partitions files differently (the reported "0 on #124") can miss it.

## Fix (test infra only, no src change)
- `tests/setup/global-listeners.ts` (new) is registered in `vite.config.ts` `test.setupFiles`, and the slow and k10 configs inherit it. It records every listener added to `document` and `window` in a file, and in `afterAll` it removes them and restores `addEventListener`. Each file now ends the way a fresh jsdom would start. This is the same isolation hosted CI already gets.
- Guard: `tests/global-listeners-guard.test.ts` (2 tests). One checks that the tracker removes capture and bubble listeners on both targets and restores `addEventListener`. The other checks that the setup is actually installed for jsdom files. If the setup is dropped from the config, the guard fails.

## Evidence (Node 20.19.2, vitest 2.1.9, flock + nice 10)
| Run | Exit | Uncaught errors | Tests |
|---|---|---|---|
| rc/v5 d65391b, m41-9 alone (default pool) | 0 | 0 | 18 passed |
| rc/v5 d65391b, 6 files, single-fork (before) | 1 | 134 | 137 passed |
| a733304, same 6 files + guard, single-fork (after) | 0 | 0 | 139 passed |
| a733304, same 7 files, default pool | 0 | 0 | 139 passed |
| #127 04add42, 6 files, single-fork (before) | 1 | 134 | 137 passed |
| #127 04add42 + fix cherry-picked (clean, ebe4284), single-fork (after) | 0 | 0 | 139 passed |
| **a733304 full `vitest run`, single-fork (HoQA's mode)** | **0** | **0** | **157 files; 2295 passed, 1 skipped** |
- `tsc --noEmit` exit 0 at a733304.
- HoQA's previous full runs had 134 errors each: #125 (2319 passed), #126 (2298 passed) and #127 (2320 passed, `qa/v5-saves/evidence/pr127-04add420/vitest-full.txt`).
- Logs are in `scratch/vitest-teardown/`.

## PRs #125, #126, #127
- They need no change. The fix applies cleanly on top of each one, because none of them touches `vite.config.ts` or `tests/setup/`. Once it lands on rc/v5 and they are rebased or merged, their local single-fork runs come out clean.
- Their 134 errors are pre-existing on the base, so they should not block a GO.
- Hosted CI is unaffected.

## Hours
- Spent: about 0.4 h (01:40–01:58 CET).
- Engineering remaining: 0 h.
- What's left after the push: hosted CI on the PR and one focused review (about 0.25 h for the Generalist or HoQA).
