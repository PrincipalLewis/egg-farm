# PR #39 (supersedes #25) fix/hidden-tab-offline-fwd @ 6dc2f5a — delta QA (Saves & Release)
2026-10-17 CEST. 6dc2f5abded7 = merge of 72078b5 + main acdbedc (contains #31 d75d41f, 8e6d53e). Worktree /tmp/qa-pr25fwd/6dc2f5a. Ports 5862-5864. Lane 1, flock + timeout 600.
Runner qa/m3-scripts/pr25-fwd-delta.sh; evidence pr25-fwd-6dc2f5a-evidence/ (summary.txt = timeline).

## Verdict: PASS (11:33 CEST) — no Blocker/Critical/Major

## Results (QA-run)
- Ancestry: contains 72078b5, d75d41f, 8e6d53e; parents 72078b5 + acdbedc. Resolution checks per HoE plan all hold: payout.ts base = salePriceCents (no eggPriceCents left); no local saleValueCents in actions, single `export { sellAllPreview } from './payout'`; app order unit via saleValueCents(s,k,b); save() stamps hidden.at, state param through persisted/saveWithQuotaRetry, N6 kept; hiddenSimMaxSeconds + m4 block; format/styles unions.
- Build + build:qa + build:html + release check rc=0; build-id m3-rc1-pre+6dc2f5a (no +dirty) in dist, dist-qa, dist-html; sync-economy --check rc=0.
- vitest (2 workers): **849/849** (141 s).
- **WebKit rc0: 234/234 PASS** (11:07–11:16, 563 s, single run, no chunking).
- Hidden-tab ACs, M4 off: **WebKit 32/32, Chromium 32/32** (incl. the fixed 2h row: v1 "2h+" copy). 61/120/671/10800 s, over-credit, short hides, 60 s grant, double hide, 4b same-ms re-hide, m1 deactivate/refuseNewer all PASS.
- Hidden-tab ACs, M4 on (QA-only build, m4.enabled=1, id +dirty by design): WebKit 20/32, Chromium 20/32. All 12 FAIL rows are hard-coded flag-off rate expectations (4 eggs/s → 244/480/2,684/28,800). Real invariants hold: hide == close+reload (23/23, 45/45, 254/255 within load slop, 2700/2700), coins unchanged, popup text == reload, one grant per hide period, 4b OK. The M4 offline rate (~0.375 eggs/s at this fixture) comes from #31's track/hensOfflineMult model, not from this PR. Not a fail.
- Payout/parity unit subset 142/142; save() subset 173/173; globals WebKit PASS (only eggfarmExportTelemetry).

## Saves' claims verified
- fmtMoneyExact on Thanks card (d.cents), coin pop and floatText; fmtMoneyShort in app.ts = 2 uses, both `fmtMoneyShort(trackPriceCents(` (Farm-tab Egg price row). Sell-path short count = 0 ✔.
- Loosened qa-rc1-bugs tests (diff vs 72078b5): (1) the ghost lifetime regex adds the #31 form `live.splice(i, 1); }, 1500)`. The 'wave leave' ghost assert and the 1500 ms lifetime are still there. OK. (2) The exemption is `(?!trackPriceCents)` only, and `fmtMoneyExact(d.cents)` / `fmtMoneyExact(e.value)` are still required. OK, so neither loosening hides a regression. 45/45.
- tests/hidden-save-paths.test.ts exists, 4/4: the snapshot (savedAt = hide time, hide-time coins, not the live basket) is asserted on first-try LS + mirror, on the N2 quota retry (the thrown write is counted, the v6 backup is removed, so the retry really ran), on the mirror fallback (LS unchanged, IDB = snapshot) and on a control after show. Meaningful.
- tests/payout-parity.test.ts exists, 2/2: (a) M4 off == pre-merge eggPriceCents values over a grid; (b) M4 on, sellAll preview cents/eggs == credited, actions re-export == payout, per-card sell == orderView sellCents, plus a non-vacuity guard (differsFromOld > 0). Meaningful.
- m4a-saveseq-carry 2/2 (in the save subset).

## Player repro: one Sell all sold 30 eggs while the visible orders totalled 24 — not a bug (by design), unchanged by the payout unification
- Screenshots 1d3fbc98* / f34bb921*: not found under /home/box/agent-data/agents/b665bd32-…/ or /workspace (full recursive find).
- Code: the 'sellAll' action walks **all s.customers** (the whole queue, front to back), giving each min(basket, demand − filled). The strip draws at most 5 chips plus a "+N waiting" chip, and the Market list shows `visibleOrders(...)` rows unless expanded. So eggs going to queued customers that aren't drawn are expected. Spec core-loop-spec.md §2: "Sell all = YES, serves queue front-to-back". It never sells beyond total queued demand.
- The label `Sell all (N eggs · $X)` comes from sellAllPreview, the same walk, so the label showed 30 before the tap (preview == credited, covered by payout-parity).
- Change history: the sellAll walk is byte-identical at 59cce62, acdbedc and 6dc2f5a. The unification only changed the per-egg price source (salePriceCents), not how many eggs are sold. Browser repro not run (cap). Possible UX follow-up (Minor, Art & UX): make the "+N waiting" orders more visible near Sell all.

## Not run
- Firefox: rc0 / hidden-tab / globals (lane cap). Engineer-run per Saves (rc0 hiddentab/hiddentabguard 7/7 chromium+firefox, globals 3 engines), not QA-rerun.
- Chromium rc0, Chromium globals: engineer-run, not QA-rerun.
- test:slow (Saves claims 14/14; not QA-rerun).
- M4-on rc0 (rc0 runs shipped flag-off); M4-on hidden ACs only to the invariants above (the script's absolute counts are flag-off).
- Real OS tab backgrounding (visibility override + mocked clock); m1 via a real second tab; real QuotaExceeded in a browser (unit only).
- Browser repro of the 30-vs-24 Sell all (code answer instead).
- PR #16 × #39 C-AC36.

## Notes / script follow-ups (QA)
- The first hidden-tab attempt (11:17) failed to launch: qa/ resolved an older playwright-core (webkit-2272 missing). Reran from the worktree, results above. Fix: the runner copies the hidden script into the worktree.
- The M4-on bundle is +dirty by design; EXPECT_BUILD must be +dirty for dist-qa-m4.
