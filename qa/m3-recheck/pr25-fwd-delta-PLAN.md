# PR #25 forward-merge delta — PLAN (prep 2026-10-17 10:12 CEST, Saves & Release QA)
Target: forward-merge of fix/hidden-tab-offline (pushed head 72078b5) onto main after #31 (d75d41f) merges. SHA comes from the Saves engineer (~11:00). Not merge-only: 7 resolved conflicts (HoE plan /workspace/scratch/pr25-fwd-merge-plan.md).
Lane 1 from ~11:00, HARD CAP 12:00 (drop call by 11:40). Baseline: pr25-hidden-tab-59cce62.md (FINAL PASS 07:35).
Runner: `bash qa/m3-scripts/pr25-fwd-delta.sh <sha> ["1 2 3 4 5 6 7"]` (DRY=1 skips browser steps). Evidence: qa/m3-recheck/pr25-fwd-<sha7>-evidence/. Worktree /tmp/qa-pr25fwd/<sha7>.
Ports 5862 globals / 5863 rc0 / 5864 hidden (never 4173). Every browser step: `flock .browser-test.lock timeout 600`, one engine at a time; reap() kills only servers whose cwd is my worktree.
Hidden script: qa/m3-scripts/pr25-fwd-hidden.mjs = qa-hidden-59cce62.mjs + DIST env + v2-copy row fixed (2h row now expects shipped v1 "2h+"; v2 "capped at 2h" is PR #16).

## Steps and budget (60 min)
| # | Step | Est. | Lock |
|---|------|------|------|
| 1 | ancestry (d75d41f, 72078b5, 8e6d53e contained), conflict-file diffs vs 59cce62/72078b5/d75d41f, resolution invariants (payout base = salePriceCents, no local saleValueCents in actions, no duplicate sellAllPreview import, save() hidden stamp + st param into persisted/quotaRetry/mirror, hiddenSimMaxSeconds + m4 block, format/styles unions) | 1 min | no |
| 2 | npm ci + build + build:qa + build:html, build-id (m3-rc1-pre+<sha7>, no +dirty), sync --check, vitest 2 workers (`--maxWorkers=2 --minWorkers=1`), dist-qa-m4 (m4.enabled=1, worktree file reverted) | 6–8 min (build 16 s + unit 139 s on 72078b5; merged suite ~843 tests ⇒ ~3–4 min) | no — run 10:55–11:00 before lane |
| 3 | WebKit rc0 full | 9–12 min (59cce62: 9 min/201 rows; #31 now 224 + #25 rows, box slow) | yes |
| 4 | hidden-tab ACs: webkit × {M4 off, on}, chromium × {off, on} (+firefox off if time) ; payout/parity unit subset | 4 × ~6 min = 24 min (+6 ff) ; unit 10 s | yes |
| 5 | save() unit subset (save*, idb-mirror, newer, bug6, hidden*, m4a-saveseq-carry) + save() body review | 1 min + 5 min review | no |
| 6 | loosened tests review (diff vs 72078b5, static counts, qa-rc1-bugs run) | 3 min | no |
| 7 | globals webkit (others if time) | 4 min | yes |
| — | report | 5 min | no |
Lock time: 3+4+7 ≈ 40–45 min; non-lock steps 1/2/5/6 run before 11:00 or in parallel. Fits ~60 min only if step 2 is done pre-lane.

**If rc0 webkit hits timeout 600 (exit 124):** rerun as chunks via `RC0_CHUNKS="tabs,qtag,pt1,b1,b2,b3,b6,b6b,b58,bug9,s2money,s23a,s2810,fastcollect newersave,newersaveidb,newerbak,newerfrac,newertwotab,newermainlive,savedatinvalid,bakrestore,resetbak recoveryRestored,recoveryFresh,recoveryBadBakOnly,recoveryStorage,recoveryCantSave,recoveryNone,sellallgrader,sellallgraderfit,hiddentab,hiddentabguard"` (section names from d75d41f + #25's hiddentab/hiddentabguard; re-list sections on the SHA first and confirm chunk row sum == full total; any m4/tracks section added by #31 must go in a chunk).

**Cut order if behind (decide at 11:30):** (a) firefox hidden off; (b) chromium hidden M4-on; (c) chromium hidden M4-off (keep webkit both — WebKit is the lane's purpose); (d) globals only webkit (already default). Never cut: rc0 webkit, webkit hidden M4 off+on, save()/payout unit, loosened-test review. If rc0 webkit isn't green by 11:40 → tell HoQA+HoE "drop" (via parent).

## What each check asserts
- Payout parity: preview == credited (coins delta) for single Sell, Sell-all, offline popup vs credit, flag off identical to 59cce62 numbers; flag on price = salePriceCents (trackPriceCents); order card unit via saleValueCents (per-order rounding, not salePrice×graderMult float).
- save(): while hidden, saved state = hidden.state stamped hidden.at (not now); N6 mirror resume after hide/show; quota-retry path receives the hidden base; mirror fallback serializes base with m4SaveSeq(st…) monotonic and carried; reload rank (rankCompare) picks the same save as before; m1 deactivate/refuseNewer while hidden → no save rewrite.
- Loosened tests: (1) ghost lifetime regex accepts `setTimeout(...,1500)` — OK only if 'wave leave' ghost still asserted and lifetime still 1500; (2) `/fmtMoneyShort\((?!trackPriceCents)/` — OK only if zero other fmtMoneyShort( calls remain in app.ts (Thanks card d.cents, qpop cents, floatText must be fmtMoneyExact).

## Not-run template (fill at report)
- [ ] Firefox: rc0 / hidden / globals (reason: lane cap)
- [ ] Chromium: rc0 / globals; hidden M4-on/off (cut? y/n)
- [ ] test:slow (CCR/eng)
- [ ] build:html release-asset in browser (file://) 
- [ ] Real OS tab backgrounding (visibility override + mocked clock used)
- [ ] m1 via real second tab TabLease steal (in-page Game.deactivate()/refuseNewer())
- [ ] Quota-retry in browser (unit-only: real QuotaExceeded not induced)
- [ ] M4-on rc0 (rc0 runs shipped flag-off)
- [ ] PR #16 × #25 merged C-AC36

## Add (HoQA 11:03): Player Sell-all repro
One Sell all sold 30 eggs while visible orders totalled 24. Screenshots are in /home/box/agent-data/agents/b665bd32-8248-4803-b738-c5e2dc7c0068/assets/ (1d3fbc98*, f34bb921*). Reproduce on the #25 forward-merge SHA, comparing against Latest acdbedc, and note whether the behaviour changes with the unified payout. UI QA classifies it on Latest.
