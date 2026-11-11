# Architect re-review: PR #99 v5-zg-followup @ c4a1a76

- Reviewer: Senior Software Architect · 2026-11-05 ~20:44 CET (Europe/Belgrade)
- Head: `c4a1a76f470e9478f9f622da0a46e62b885411a4` (origin/v5-zg-followup)
- Base requested: rc/v5 `518de304fbe9f4c8f3dd04b8fffe38ee7698b94f`
- Merge-base with rc/v5: `0ad018ded37c2b3b3cfc3b213601d7a53cef5be7` (#97 merge)
- Ancestry: PR = 0ad018d + 787b5c1 + 234bfba + c4a1a76. rc/v5 is one commit ahead (518de30 #98 K10 only). Changed files are disjoint from K10; mergeable onto 518de304 with no expected content conflict.
- Prior review: engineering/reviews/v5-zerogain-546de85-architect.md (sha256 `1f8c03376d93715a…`, PASS with Minors)
- Spec / decisions: D-COL-2026-10-30-29 (a)/(b), D-HOE-35, D-HOE-38 (flip held). zeroGainUi HANDOFF engineering/tasks/zeroGainUi/HANDOFF.md
- HANDOFF check: engineering/tasks/v5-resume/HANDOFF.md item 1 matches this task. No mismatch.
- No Claude review was used.
- QA verdict: none found for #99; Architect review is not substituted by QA.

## Verdict: PASS

All three #97 follow-ups (Minor 1, Minor 2, N1–N3) are fixed with targeted tests. No new Majors or Minors. Flags remain at ship values (zeroGainUi 0, confirm 0). Mergeable onto current rc/v5 after a normal update/merge of #98; do not flip flags in this PR (D-HOE-38).

## Old findings — verified

### Minor 1 (annotateLast newest-match) — FIXED

- Prior: Y10 oldest-first mutant survived; no direct newest-match test (`telemetry.ts:73`, `app.ts:263`).
- Now: `tests/zg-telemetry-annotate.test.ts` asserts two `upgrade` events → only the newest gets `zero_gain`, buffer marked dirty / flushed; no-match is a no-op.
- Mutant re-check this review: oldest-first scan → **FAIL** (EXIT 1). Newest-first code restored; tree clean.
- Optional #97 suggestion (DEV assert that newest upgrade matches the just-bought level) not done; acceptable; not required for PASS.

### Minor 2 (re-render steals focus to "Buy anyway"; guard not re-armed) — FIXED

- Prior bug (`app.ts` zgApply): after `uRow.innerHTML` destroyed the focused control, `activeElement === body` caused auto-focus onto `[data-zg=confirm]` without changing `zgOpen.at`.
- Fix (`234bfba`): capture `zgFocusKey()` before the swap; `zgApply(focusKey)` restores Cancel / Buy anyway / row Buy; only `zgOpenStrip` focuses confirm; **`zgOpen.at` keeps the opening time** (intentionally not reset).
- Clarification vs the resume task wording "guard is re-armed": the Architect #97 fix options were (a) restore prior focus or (b) only auto-focus on open. This PR does (a)+(b). Preserving `at` is the correct guard behaviour across an unrelated re-render: mid-guard activations stay ignored; a fresh re-arm would incorrectly extend the window. Tests prove boundary timing and no unintended purchase.
- `tests/zg-followup.test.ts` (confirm=1):
  1. Cancel focused + forced markup swap → focus stays Cancel; click cancels; no buy.
  2. Buy anyway focused + re-render at open+100ms → focus stays; click ignored; after +400ms confirm buys once.
  3. Row Buy focused + re-render → focus returns to row Buy, not Buy anyway.
  4. Focus outside rows + re-render → focus not moved into the strip.

### Nits — FIXED

| Nit | Fix |
|---|---|
| N1 duplicate `return true` in zgClick | removed (`c4a1a76`) |
| N2 uRow keydown + document pointerdown never removed | `AbortController` + `ui.dispose()`; tested |
| N3 `noGlow` string replace of `class="btn buy affordable"` | `glowCls(can, zg)` in template; m10 source check accepts it; flag-off DOM sha unchanged |

## Architecture / regression checks

- **openPanel** (`app.ts:183–187`): still `if (open === 'upgrades' && ZGC) zgHidden();` after the docked early return. Unchanged in this diff. D-HOE-35 docked behaviour preserved.
- **Confirm-strip gating**: still behind `ZGC` (zeroGainUi && confirm===1). Listeners only registered when ZGC. Flag-off path unchanged.
- **Focus / a11y**: restore uses `preventScroll: true`; Esc / outside-cancel / re-tap paths unchanged aside from AbortController wiring.
- **UI stays out of sim**: no sim/timer/flags source changes in the PR.
- **Flag-off parity**: zg-flagoff-dom sha `9c4b6439…` still matches; goldens `f90d1678` / `a54c9cf9` observed in the full suite log.

## New findings

None that block merge.

Optional post-RC nit (not blocking): `dispose()` aborts listener signals but does not `clearTimeout(zgRevealT)` / null `zgOpen`. Only relevant if a test remounts without clearing the old mount’s DOM before the 350 ms scroll timeout; production mounts once.

## Gates (worktree `/workspace/wt-v5-review99`, node v20.19.2, flock + nice, `--maxWorkers=1 --minWorkers=1`)

| Gate | Result |
|---|---|
| `tsc --noEmit` | EXIT 0 |
| `sync-economy --check` | EXIT 0 |
| Targeted: zg-telemetry-annotate + zg-followup + m41-p2-ui-minors | 40/40 PASS |
| ZG-related suite (zg-* + telemetry* + m41-p2 + m4a-flag-off) | 111/111 PASS; DOM 9c4b6439 |
| Mutant Y10 (oldest-first annotateLast) | KILLED (annotate test FAIL) |
| Full unit suite (clean porcelain) | **144 files, 2025 passed / 1 skipped, EXIT 0** |
| `npm run build` + check-release-build | EXIT 0 (`m4.1+c4a1a76`) |
| `check-globals` chromium | EXIT 0 (eggfarmExportTelemetry only) |
| CI (`gh pr checks 99`) | **gate PASS**; release-globals skipping; pacing-x1-stack shards PASS, aggregator FAIL on pre-existing row 904 NOT-WIRED (same on #98/rc); k10 monitor PASS on this head |

Note: an earlier full-suite attempt failed only `telemetry-m3` BUILD_ID `+dirty` while untracked review artifacts dirtied the tree; re-run with artifacts outside/ignored → PASS. Not a PR defect.

## Must-fix before merge

None for this PR at flag 0.

## Open RC items (outside this PR)

- **D-HOE-38 / TASK HoE/sim-flag-list**: SIM-only `anyM5FlagOn` list excluding zeroGainUi and bestBuyV2 — prerequisite for both UI flag flips.
- zeroGainUi / bestBuyV2 flip commits remain HELD.
- Minor 2 no longer blocks confirm=1 experiments once the SIM-only list lands and a confirm=1 build is intentionally cut.

## Artifacts

- Worktree path: `/workspace/wt-v5-review99/artifacts/review99-c4a1a76` → `/workspace/egg-farm-studio/scratch/architect/review99-c4a1a76`
- Contains: full.diff, ancestry, targeted/zg-suite/full-unit2/build/check-globals/mutant-Y10 logs, ci-notes, SUMS.sha256
