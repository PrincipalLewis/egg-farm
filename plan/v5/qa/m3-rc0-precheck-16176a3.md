# QA rc0 pre-check: `game` m3/rc0 @ 16176a3 (2026-10-16 ~01:37–01:43 CEST)
**Verdict: PASS. OK to tag `m3-rc0` = 16176a3e2bd7.** One Low defect (D1) goes to rc1. It doesn't block the tag.

Method as in `qa/m3-rc0-precheck-2fae4c4.md`. I killed stale `vite preview` processes before starting. I used fresh detached worktrees `/tmp/qa161/{rc,guard}` with `../product` copied next to them and node_modules symlinked (ignored, so the tree stayed clean). Each script ran on its own port. The only local edit: `rc0-browser.mjs` reads its port from `PORT`, applied *after* the builds and reverted afterwards. Nothing was committed, pushed or tagged. Worktrees removed. Logs: `qa/m3-recheck/precheck-16176a3/`.

| Run | Result |
|---|---|
| `npm test` (sync-economy check + vitest) | **339/339**, 35/35 files |
| `npm run build` (release) | built id `m3-rc0+16176a3`, `check-release-build: ... ok`. `build:qa` id is `m3-rc0+16176a3`. **No `+dirty`** |
| `+dirty` guard (guard worktree, untracked `dirty-probe.txt`) | `npm run build` **exit 1**: "build id m3-rc0+16176a3+dirty - commit or stash..." The guard works |
| `rc0-browser.mjs` | **40/40 Chromium** (port 4311), **40/40 WebKit** (`ENGINE=webkit`, port 4312) |
| `scripts/ac14-browser.mjs` | **17/17 Chromium, 17/17 WebKit, 17/17 Firefox** |
| `qa/m3-scripts/webkit-safari.mjs` | **all PASS**: iphone-15, iphone-se, ipad 10/10 each; mac-webkit 9/9 → `qa/m3-webkit/precheck-16176a3/` |
| R1 independent probe (`r1r2-probe.mjs`, new save with FTUE running, 360×640 / 390×844 / 1280×800, Chromium + WebKit) | **6/6 PASS**: with Settings open, the `.onb` bubble and Skip are hidden, a 20px hit-test grid over the dialog finds 0 onboarding hits, and the title is hittable. After Esc the bubble is back on the same step ("Your hens are laying eggs…") |
| R2 independent probe (same 6 configs) | link box **44.0px** tall in every config (inline, 14px vertical padding). The bottom ~1.2px is hit-tested as the Reset button, see D1 |

Harness note: I ran rc0-browser WebKit first with a CLI arg, which the script ignores. It needs `ENGINE=webkit`, so I reran it that way (result above). That's harness only.

## Defects
**D1 (Low, rc1): the licence link's tap area overlaps the "Reset save" button by about 1.2px. The effective tap height is about 42.8px, not 44.**
Repro: build 16176a3, open at 360×640 (also 390×844 and 1280×800, both engines), finish or skip the FTUE, open Settings, scroll to "SIL Open Font License 1.1". The link rect is 386.9–430.9 (44px). `#sReset` top = 429.7. `elementFromPoint` at link bottom-1px returns `BUTTON#sReset`. The inline padding (`.font-credits a{padding:14px 0}`) doesn't reserve layout space, so it bleeds into the next row. Impact: a tap on the link's bottom edge opens the Reset confirm instead of the licence. Reset still needs a second confirm, so no data loss. Fix: give `.font-credits` about 14px bottom margin (or padding), or make the link `inline-block` with `min-height:44px`. Art & UX's `artux-shots` R2 assertion only measures the rect height, so it can't catch this. Suggest adding a hit test.

Not covered (unchanged from the 2fae4c4 pre-check): `recovery-v11-browser.mjs` checks 6–8 and AC14f force-kill go in Sunday's full run. R3 icon crop moved to rc1 (CEO).
Environment note: other agents' `vite preview` processes (ports 4181, 5140, 5141, 5210) started during or after my kill. I left them running. Leftover worktrees `/tmp/qa16/{game,dirty}` @16176a3 (the earlier aborted QA run) are not removed.
