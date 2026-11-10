# HoQA review — PR #99 "v5: zero-gain follow-up (review Minors 1-2, nits)" @ c4a1a76f

- Decision: **QA-D-1105-PR99** — reviewed 5 Nov 2026, ~20:55 CET
- **Verdict: MERGE-WITH-NOTES** (none of the notes blocks the merge; HoE can merge now)
- Reviewer: Head of QA. This is a QA verdict, separate from the Architect's PASS (engineering/reviews/v5-zg-followup-c4a1a76-architect-rereview.md, sha256 9c585fdd…, which I verified locally). It does not replace that review.
- Out of scope: #100 d654afda, K10 and acw1. None of them is attributed to #99.

## 1. Identity
| item | value | how checked |
|---|---|---|
| PR head | c4a1a76f470e9478f9f622da0a46e62b885411a4 (branch v5-zg-followup) | `gh pr view 99` headRefOid == local HEAD |
| PR base | rc/v5 = 518de304fbe9f4c8f3dd04b8fffe38ee7698b94f (#98) | baseRefOid == `origin/rc/v5` |
| merge-base | **0ad018de** (#97). The branch was not rebased onto #98 | `git merge-base` |
| CI tested | merge ref 67eb45a ("Merge c4a1a76f into 518de304"), per the shard checkout logs | shard logs |
| local merge | c4a1a76f + 518de304 merges cleanly. **No file overlap** between 0ad018d..518de304 and 0ad018d..c4a1a76f | `comm` on the name lists |
| state | MERGEABLE / UNSTABLE (UNSTABLE is caused only by the non-required pacing-x1-stack aggregator), not draft | gh |

Commits (3): 787b5c1 (Minor 1, test only), 234bfba (Minor 2 focus guard), c4a1a76 (nits N1–N3).

Diffstat (518de304...c4a1a76f): 4 files, +132 / −13
- src/ui/app.ts +23/−12 (only source file)
- tests/zg-followup.test.ts +81 (new)
- tests/zg-telemetry-annotate.test.ts +25 (new)
- tests/m41-p2-ui-minors.test.ts +3/−1 (m10 source-regex check updated to accept glowCls)

## 2. Diff review: correctness, scope, flag-0, magic numbers
- **Scope:** the diff matches the PR description. There are no unrelated changes, and nothing under data/, src/config/balance.json, src/sim, CSV, workflows or flags.
- **Minor 1:** test only. annotateLast at base already tags the newest match. The new 2-event test pins that and checks the dirty flag (one write).
- **Minor 2 (focus guard):** see §4.
- **N1:** removes the dead duplicate `return true`. No behaviour change.
- **N2:** the strip's keydown and capture-pointerdown listeners now take `{ signal: zgAC.signal }`. The new `dispose()` on the mountApp return value is additive. Both listeners are still registered only inside `if (ZGC)`.
- **N3:** `glowCls(can, zg) = can && !zg ? 'affordable' : ''` replaces the string replace. When not ZG, the result is exactly `can ? 'affordable' : ''`, so flag-off bytes are unchanged. When ZG it yields `class="btn buy "`, the same as the old replace output.
- **Flag-0 behaviour:** no change. zgFocusKey and zgApply run only when `ZGC` is set (m4.zeroGain.confirm = 1). The listener changes sit inside `if (ZGC)`. glowCls is byte-identical when not ZG, and with zeroGainUi = 0 no row is ZG. My local flag-off DOM and golden suites pass (§5). CI shards confirm balance.json sha 9a73bd8a with every m4 flag at 0.
- **Magic numbers:** none added. The only constant involved is the existing ZG_GUARD_MS = 350 (UI spec, unchanged), and it does not belong in balance.json.

## 3. CI for #99 (runs from 30 Oct, 16:00–16:43 CET)
| check | result | required? |
|---|---|---|
| gate (ci.yml run 41076666874) | **SUCCESS** | yes |
| k10-breeds-offset (KNOWN-RED monitor) | SUCCESS | no |
| pacing-x1-stack shard optimal / seller15 / casual | **SUCCESS** ×3 | no |
| pacing-x1-stack (aggregator/verdict) | **FAILURE** | **no** (workflow header: "Not a required check") |
| release-globals | SKIPPED: expected, it runs only for main or `rc/*` head branches (ci.yml L62) | yes, on rc PRs |

### pacing-x1-stack diagnosis: harness reporting/wiring, **not a pacing regression**
Source: the summary job log (job 124157627182), the three shard logs and the x1-verdict artifact. HoE's saved copy /workspace/gates-v5/x1-summary-99.log (sha256 e5193036…) matches the live log on the verdict, rows and FAIL lines.
1. Each shard did its job (`shard <p>: shipped-tree, seeds 1-200 -> x1-out/shard-<p>.json`), uploaded its artifact and exited 0. The aggregator downloaded all 3 artifacts with matching digests.
2. Verdict rows: **45 PASS, 0 FAIL**, 1 WARN, 20 INFO, 3 N/A, 12 NOT-WIRED (3 blocking), 24 EXCLUDED. The only FAIL lines are `blocking row 904 {optimal,seller15,casual} NOT-WIRED`. Row 904 is "AC7 2x active/idle gate on the tree's data/economy.csv (CSV-RECORD captured)". Its reason text says: "not run in CI (RC-only): AC7 runs only inside the recorded RC run (scripts/pacing-x1-run.sh writes ac7.json; verdict --require-ac7); blocking, so the verdict is FAIL here".
3. The workflow calls `verdict` without `--require-ac7` and never writes ac7.json. Its own comment (pacing-x1-stack.yml L54-56) says this check is "honestly red until AC7 is wired in CI" and that the RC X1 gate is the recorded run on the final RC SHA. The script exits 1 on any blocking NOT-WIRED row (`process.exit(v === 'PASS' ? 0 : 1)`).
4. **The failure is pre-existing and identical on the base.** The #98 run (41069337408, which merged as rc/v5 518de304) and the #97 run (41064387687) fail with the same row counts and the same three row-904 lines. Every pacing-x1-stack PR run since the check landed is red the same way.
5. **The measured pacing is identical to the base.** I diffed #99's verdict.json against #98's: 105/105 rows have the same measured value and status. All three shard JSONs are byte-identical once runtime and head are excluded, and the balance sha is the same. That fits the diff, which touches only src/ui/app.ts. The pacing harness runs bot-m5 headless and never imports the UI.
6. The single WARN (L897 optimal N/H worst 191 > 180 s) is the known L0–30 dead zone. It is non-blocking and present on #98 too.
7. Cosmetic: the console print truncates the header at 9 lines, so the casual row-904 line appears only in the trailing FAIL list. The step summary and artifact list all three.

**I agree with HoE's triage.** It is reporting-only (NOT-WIRED row 904, AC7 RC-mode CSV record). Plain CI has no `--require-ac7`, the check is non-required, and it is **not a merge hold for #99**.
**When HoE should fix it: after the merge, not before.** It is red on rc/v5 itself, so fixing it on #99 would only widen this PR. It must be fixed before the complete-RC handoff (Wed 11 Nov 14:00 CET), or the RC gate must use the recorded `pacing-x1-run.sh … --require-ac7` run as already designed. Otherwise a permanently red check hides real regressions. Suggested fix: in non-RC mode, report row 904 as RC-ONLY/N-A (non-failing) and keep it blocking under `--require-ac7`.

## 4. Focus guard (Minor 2): **confirmed present and adequate**
- Commit 234bfba is in the PR (`git log 518de304..c4a1a76f`). It changes src/ui/app.ts (+13/−4) and tests/zg-followup.test.ts (+70).
- The original bug (Architect 546de85 Minor 2) was that `uRow.innerHTML = html` destroyed the focused strip button, after which zgApply auto-focused `[data-zg=confirm]`. In other words, an unrelated re-render could move focus from Cancel to "Buy anyway".
- The fix: `zgFocusKey()` captures the focused uRow control (`zg:confirm|cancel` or `kind:<row>`) before the swap. `zgApply(zf)` re-opens the strip and focuses the same control. Only `zgOpenStrip` ever focuses "Buy anyway". `zgOpen.at` (the 350 ms guard start) is deliberately kept at the opening time.
- The 4 targeted tests all pass locally on the merge:
  1. Cancel is focused, then a forced markup swap: focus stays on Cancel, and activating it gives one cancel and no buy.
  2. "Buy anyway" is focused and the re-render lands at open+100 ms: focus stays, the **mid-guard click is ignored** (no event, level unchanged), and a click at +500 ms **buys exactly once** (`['confirm']`, hens 5→6).
  3. The row Buy is focused: focus returns to the row Buy, not "Buy anyway".
  4. Focus is outside the rows: focus is not pulled into the strip.
- **Mutation check (mine):** I restored the base app.ts with the new tests in place. Tests 1, 3 and 4 fail, and so does the N2 dispose test. **Test 2 passes on the base as well.** It is therefore a regression guard for guard-timing preservation, not evidence of the fix, which tests 1, 3 and 4 provide. This is acceptable, but the PR's "tests fail on 0ad018d" holds for 3 of the 4.
- **What this unblocks:** ZG-AC10 confirm=1 changes from BLOCKED-FIX to **ready to run, not yet PASS**. A browser run still needs an intentionally cut confirm=1 build, which per D-HOE-38 is held for the SIM-only flag-list PR (ETA Sat 02:00 CET). UIQA runs it on that build on 3 engines. Unit-level confirmation is not a ZG-AC10 pass.

## 5. What I ran (box, lane hoqa-pr99, pid 877158, exited by itself, no kill needed)
Scratch worktree at a local merge of c4a1a76f + 518de304 (mirrors CI's 67eb45a). Worktrees are removed now.
| command | result |
|---|---|
| `npx tsc --noEmit` | EXIT 0 |
| `npx vitest run tests/zg-followup.test.ts tests/zg-telemetry-annotate.test.ts tests/m41-p2-ui-minors.test.ts` | 3 files, **40/40 pass** |
| `npx vitest run tests/zg-*.test.ts tests/telemetry*.test.ts tests/m41-p2*.test.ts tests/m4a-flag-off*.test.ts` | 14 files, **162/162 pass** |
| `npx vitest run` (full default suite, on the merge) | **145 files, 2034 pass / 1 skipped, EXIT 0** |
| mutation: base src/ui/app.ts + new tests/zg-followup.test.ts | 4 fail / 2 pass, as expected (see §4) |
| verdict.json diff #99 vs #98, shard JSON diff | 0 row differences; shards identical |

Not run: `npm test`'s `sync-economy --check` prefix (no CSV or balance changes in the diff), `test:slow`, `test:k10` (out of scope), browser and Playwright runs (flag-0 UI unchanged, and confirm=1 needs a dedicated build), release-globals Firefox/WebKit (CI runs them on the rc PR), and the full pacing sim (CI shards already ran it on the merge ref).

## 6. Notes (non-blocking)
- N-1: pacing-x1-stack is red from row 904 NOT-WIRED, which is pre-existing on rc/v5. HoE should fix it after the merge and before the complete-RC handoff (§3).
- N-2: the branch's merge-base is 0ad018d, not 518de304. CI tested the merge ref, the local merge is clean with no file overlap, and the full suite passes on it. A normal merge is fine and no rebase is needed.
- N-3: Minor 2 test 2 does not discriminate (§4). Optional: add a variant where Cancel is focused, a re-render lands mid-guard, Buy anyway is clicked, and nothing is bought.
- N-4: ZG-AC10 confirm=1 is unblocked to run, not passed (§4).
- Flags stay at ship values (zeroGainUi 0, confirm 0). This PR must not flip them (D-HOE-38).

Evidence: qa/m5/review-pr99-evidence/ (summary and shard logs, local test outputs, verdict.json for #99 and #98). Checksums are in SHA256SUMS.
