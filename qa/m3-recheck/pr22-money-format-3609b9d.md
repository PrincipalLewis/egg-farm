# PR #22 money format — QA verdict @ 3609b9d

**Verdict: PASS** (no PR #22 regressions; the visible rounding change is flagged for awareness; known clips pre-exist)

Tested on a local merge of 3609b9d + origin/main dfd53b9 (local commit, not pushed; runtime build m3-rc1-pre+1978b82). Also merges cleanly with main 2700804. Diff: src/ui/format.ts, src/ui/orders.ts (eggs band), tests/rc2-fmt.test.ts, tests/s2-3a.test.ts.

| Check | Result |
|---|---|
| unit (vitest, 2 workers) | PASS 485 passed, 1 skipped (economy-copy runIf, environmental) |
| tsc / sync --check / build + check-release-build | PASS |
| check-globals chromium | PASS |
| rc0 chromium | PASS 197/197 |
| Formatter edge cases (fmt-edges.log, 28 hard cases) | PASS 28/28. fmtMoneyShort $3.45M→"$3.5M" (half-up), $3,449,999.99→"$3.4M"; fmtCount 999,950→"1M", 999,949→"999.9K", 999,999→"1M"; $999.95K→"$1M"; 9,995,000→"10M"; 1e15→"1,000T" (also $ variants); 999.95B→"1,000T"; 181.2B→"181.2B"; 0→"0"/"$0.00"; NaN/±Infinity→"—"; fmtMoney $9,999.996→"$10K" |
| Same cases on main (fmt-edges-main.log) | 16 differ: main gave "1000K", "$1000K", "9.99M", "1000000B", "$NaN", "$NaNK", "$InfinityB", "$3.4M" (floor). So all of these are fixes in PR #22 |
| Order card labels at 360 (+390), 3 engines | No new clipping vs main (see below) |

**Negatives (Nit, pre-existing):** fmtMoney(-150) gives "$-1.50" and fmtMoney(-2,000,000) gives "$-20,000.00" (no compaction). fmtCount(-12,345) gives "-12,345". This is identical on main. It matters only if a net rate can go negative (e.g. '+$/s with wages'). Suggest a spec decision ("−$1.50").

**Visible rounding change, for Economy / Art & UX awareness:** compact money now rounds half-up instead of flooring ($3.45M shows $3.5M, previously $3.4M; $999.95K shows $1M). Tiers roll up ($999,999 shows "$1M", not "$1000K"), the T tier is added, and NaN/Infinity show "—". Players will see numbers up to 0.05 unit higher on cards/pops than before.

**Order-card layout at 360/390 (seeded farm 20, 4 orders incl. 1.8M and 181.2B eggs; harness batch-0218/qa-layout-pr22.mjs):**
- In this branch's UI the Sell button reads "Sell"/"Need N". The "Sell 181.2B · +$1T" two-line label belongs to the rc1-qa-bugs-v4 branch, not main, so it isn't testable here. (The harness's "not two lines"/aria expectations come from that branch; ignore them.)
- Clips at PR #22 in all 3 engines: row3 " · $1T" (360 cw12, 390 cw34). **Known, tracked under Cut A v3 / order-line rule v1.1, not a PR #22 failure.** Row2 " · $9.94M" (360 sw69>cw45, 390 sw69>cw67) and "Need 1.8M"/"Need 181.2B" button text (360 cw76, 390 cw84; WebKit sw94) are also clipped.
- Main dfd53b9 baseline, same harness (Chromium): all of the above clip there too, and worse: row3 " · $1000.2B" (sw85) also clips in the need state, where PR #22 fits "$1T". **No new clip from PR #22; it removes one.** Row2 $9.94M and Need-button clips → add to the Cut A v3 / order-line v1.1 list.

**Sell all $666.8B vs order 3 $1T (UI/Visual Designer question): expected per Economy.** Economy says orders pay 1.5× unit price (product/market/customer-type-roadmap.md:24) and Sell all excludes orders. PR #22 doesn't change it: same values on main, only the format differs. QA note for Economy, not traced further as instructed: in this build, the 1.5× in the test scenario matches the Grader tier-1 multiplier (save has graderTier 1). src/ui/app.ts:505-507 builds the Sell all total from `S.eggPriceCents(...)` without `graderMult`, while orders (app.ts:500 `unit = … * graderMult`) and the actual sale (src/sim/actions.ts:14-16 `round(k × base × gm)`) include it. Please confirm the roadmap's bulk-buyer premium is the intended source here.

Not run: Firefox/WebKit rc0 and check-globals (Chromium only, as asked).
Evidence: pr22-evidence/ (unit, tsc, sync, build, check-globals-chromium, rc0-chromium, fmt-edges.log, fmt-edges-main.log, layout-{chromium,firefox,webkit}.log, layout-chromium-main-dfd53b9.log, shots/, shots-main/).
