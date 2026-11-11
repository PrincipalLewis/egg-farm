# CCR delta review — PR #39 (fix/hidden-tab-offline-fwd, supersedes #25) @ 6dc2f5a

6dc2f5a = merge of #25 tip 72078b5 + main acdbedc (incl. #31 M4-A d75d41f). Verdict: **PASS** (no Blocker/Major).
Read-only: detached worktrees /tmp/wtf (6dc2f5a), /tmp/wtm (acdbedc), /tmp/wtf4 (6dc2f5a with m4.enabled=1, for the M4 build only). Scratch tests run then deleted (copies /tmp/scratch25). 2026-10-17 ~11:20 UTC+2.

## (4) Merge-tree / plan
- `git merge-tree --write-tree 72078b5 acdbedc`: conflicts in status.md, balance.json, formulas.ts, game.ts, actions.ts, app.ts, format.ts, styles.css; matches pr25-fwd-merge-plan.md step 2 (+ status.md).
- Diff (auto tree vs 6dc2f5a) outside conflict hunks: only src/sim/payout.ts (planned eggPriceCents -> salePriceCents), 2 new tests (payout-parity, hidden-save-paths), and qa-rc1-bugs.test.ts (2 planned loosenings). No hidden resolutions.
- balance.json: #31 m4 block + offline.hiddenSimMaxSeconds 60; formulas.ts: both fields; format.ts / styles.css: union (#25 fmtMoneyPreview/fmtMoneyExact + #31 fmtAffordableIn; 48px Play-here + M4 tracks/ghost CSS). sync --check green.

## (1) Payout unification
- One function: sim/payout.ts saleValueCents(s,k,b) = salePriceCents x [graderMult], exact when m=1 else round per order; sellAllPreview walks like sellAll. #31's local saleValueCents/sellAllPreview dropped; actions.ts re-exports sellAllPreview; sellTo uses price=salePriceCents, value=payout.saleValueCents.
- Callers: sell, sellAll, Market Hand (tick.ts -> sellTo), order card (`unit = k => saleValueCents(s,k,b)`), Sell-all label (sellAllPreview) all go through payout. Track Egg price row uses trackPriceCents (unit price display, same source salePriceCents uses when M4 on). econ/income.ts uses salePriceCents*graderMult as a float rate estimate (not money credited) — not a payout path.
- Scratch grid, M4 OFF vs main acdbedc: 45,360 states (farm 1/7/20/21/30, col 1/9/20, Grader none/working/tired/asleep/unpaid x tiers 0-5, 14 baskets incl. 0.999/2.999/101.7/1e9+0.5, 6 order sets incl. odd-cent 1-egg and 1e6/2e6). Exact match: preview, actions re-export, label string, sellAll coins credited, single-sell coins for k 1/3/33/12345.
- Scratch grid, M4 ON vs #31's own pre-merge acdbedc functions: 777,600 states (+ hens 0/1/5/12/25, eggValue 0/1/3/9/20/30; 219 distinct unit prices). Exact equality of preview, label, sellAll credit and single-sell credit vs #31's saleValue/sellAllPreview/apply. m4 params identical in both trees.
- Their tests/payout-parity.test.ts is non-vacuous: mutating payout to per-egg rounding -> 1 fails; reverting payout to eggPriceCents -> 2 fail (differsFromOld guard). Note it only proves M4-on preview==credited; the exact-vs-#31 check above covers the gap.
- Order card with M4 on now rounds per order (was #31's per-egg float unit). Display now equals credit; behaviour fix, intended per plan.

## (2) game.ts save()
- Order: t/base (hide snapshot) chosen first -> N6 mirror resume -> saveWithQuotaRetry(t, base) -> lastMainRaw -> mirror.write(raw). Mirror resume only swaps the mirror object; the written raw is from the snapshot. Fallback: persisted(base) + m4SaveSeq(st,b,current main).
- saveSeq is computed inside save.ts from the previous main; a QuotaExceeded retry throws before setItem, so the retry reads the same prev and doesn't re-increment. Probe (M4 on): two hidden saves -> savedAt = hide, hide-time coins, seq +1 per write (2 -> 4), no skip.
- N2 retry guard reads live this.state (tracksV7/v6BackupId) rather than base; same values in practice (migration doesn't commit while hidden); info only.
- tests/hidden-save-paths 4/4, m4a-saveseq-carry (B1) 2/2, hidden-tab 20/20, hidden-time 18/18 (incl. periodId / never-stuck-hidden). Scratch: 60.0 s pays, 59.9 s 0 (no frames), 59.9 s with frames 0, 2 h cap at 7200/7201/36000 s: pass.

## (3) qa-rc1-bugs loosening
- `not.toMatch(/fmtMoneyShort\((?!trackPriceCents)/)`: negative lookahead exempts only a direct `fmtMoneyShort(trackPriceCents(` call; grep of src: only app.ts:488 Egg price row. Any other fmtMoneyShort( on a sell path still fails. Not broad.
- Leave check alternative `live\.splice\(i, 1\); \}, 1500\)` matches the single ghost() helper (app.ts:296) that all leave/turned-away ghosts go through; the 'wave leave' class + CSS 300+240 ms checks remain. A shortened lifetime would fail; n1: it's an app-wide text match, not tied to the leave call site.

## Gates @ 6dc2f5a
- tsc OK; full vitest 77 files 849/849; test:slow 14/14 (vendor pins 4 files match).
- golden m4a-flag-off 2/2 (flag-off trace == main, m4.enabled ships 0); storage/save pins within suite pass.
- build + build:html: all check-release-build ok (m3-rc1-pre+6dc2f5a).
- check-globals PORT unset: flag-off PASS 3/3 (port 43001); M4 build (enabled=1, local only) PASS 3/3 (port 37863), Fredoka 700 preload dropped. check-release-build refuses the M4 build as dirty tree (expected for a local flag flip).
- rc0 Chromium full (dist-qa): 234/234 PASS.
- Author's 849/849, slow 14/14, tsc, release check: reproduced.

## Findings
- None Blocker/Major/minor.
- n1: qa-rc1-bugs leave regex is text-wide, not bound to the leave call site (acceptable; single helper).
- n2: app.ts still imports graderMult (unused after resolution); lint only.
- n3: payout-parity (b) is preview==credited only; exact parity with #31 verified here by scratch grid, consider adding a pinned M4-on reference.
