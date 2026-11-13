# CCR delta review — PR #25 (fix/hidden-tab-offline) @ 72078b5 vs 59cce62

Verdict: **PASS** (no Blocker/Major). Read-only: detached worktrees /tmp/wt25 (72078b5) + /tmp/wtmain (origin/main 8e6d53e); scratch tests run then deleted (copies in /tmp/scratch25). 2026-10-17 ~09:40 UTC+2.

## Delta commits
e0c65c8 (merge main 97a57c1), 7519fb1 (merge main 68950c0 #28), 2340d61 (48px Play here + rc0 rows), b3e17fa (rc0 script only), 72078b5 (status.md only).

## 7519fb1 merge-tree
- `git merge-tree --write-tree e0c65c8 68950c0`: real conflicts in src/sim/actions.ts and src/ui/app.ts only; every other path auto-merged and equals 7519fb1.
- actions.ts: #28 side had local `saleValueCents(k, base, gm)` + `sellAllPreview` (eggPriceCents x graderMult, floor basket, per-order round). #25 side had sellTo crediting `payout.saleValueCents(s, k, b)`. Resolution keeps #25's sim/payout.ts, drops #28's duplicate bodies, re-exports `sellAllPreview` from payout. Logic identical (payout multiplier list = [graderMult] only; same `m===1 ? k*base : round(k*base*m)`; same walk incl. `left<1` break and `k<=0` skip). Nothing dropped functionally.
- app.ts: keeps `import { saleValueCents, sellAllPreview } from '../sim/payout'`; #28's unused graderMult/actions imports dropped; label line takes #28's comment.
- #28's tests/sellall-label-grader.test.ts and rc0 sellallgrader rows came in unchanged and pass.
- Also checked e0c65c8 (97a57c1 merge): conflicts in src/ui/format.ts, scripts/check-release-build.mjs, tests/release-build-id.test.ts, tests/rc2-fmt.test.ts resolved by taking main's FMT-1/2 + release-scan and re-adding #25's fmtMoneyShort `round:'floor'` option, fmtMoneyPreview, fmtMoneyExact and the eggfarm* ident allowlist (ALLOWED_GLOBALS now imported from release-scan.mjs). Sound; gates below green.

## Payout/label parity vs current main (scratch vitest, deleted)
- 52,920 states: farm 1/7/20/21/30 x collection 1/9/20 x Grader absent/working/tired/asleep/unpaid x every tier 0..5 (13 distinct mults incl. 1.075, 1.225, 1.45) x basket 0, 0.4, 0.999, 1, 1.5, 2.999, 3, 7, 13, 99, 101.7, 12345, 9.9e6, 1e9+0.5 x 6 order sets (none, single, partial-filled multi, 4x1-egg odd-cent rounding, 1e6/2e6 big, full-filled).
- Exact match required and met: payout.sellAllPreview == actions.sellAllPreview (re-export) == main's sellAllPreview; payout.saleValueCents(s,k) == main saleValueCents(k,base,gm) for k in 1..1e6; Sell-all label string == main's; sellAll action coin delta == main's and == preview cents.

## Callers
- Sale action (sellTo, used by 'sell', 'sellAll' and Market Hand auto-sell in tick.ts) -> payout.saleValueCents. UI: order-card unit price and Sell-all label -> payout. No other graderMult x price math in src.
- Offline grant and hidden-tab grant (game.grantOffline -> applyOffline) pay eggs into pendingOfflineEggs, not money, so no payout path; not a divergence.

## 2340d61 / b3e17fa
- `.tab-guard #tgPlay{min-height:48px}` matches art-ux/single-tab-guard spec.md (button full width, min-height 48) and dialog.html .btn; measured 48px at 360/390/1280 (rc0). Single declaration, scoped by id; no other layout change; full-width + card unchanged; tabs >=44x44 and Sell-all fit rows still pass.
- b3e17fa: scripts/rc0-browser.mjs only (WebKit storage-event settle loop) — test-only confirmed.

## Hidden-tab re-probe (scratch Game tests, deleted)
- 60.0 s hidden, no frames -> grant expOffline(60); 59.9 s -> 0; 59.9 s with 100 ms frames -> 0, period closed; 7200/7201/36000 s -> capped at 7200 s. All pass.

## Gates @ 72078b5
- tsc OK; full vitest (sync --check) 60 files / 681 passed.
- golden: no flag-off golden test on this branch (M4-only); n/a.
- build + build:html: all check-release-build lines ok (build id m3-rc1-pre+72078b5, eggfarm* idents allowlisted).
- check-globals PORT unset: free port 42707, Chromium 3/3 PASS.
- rc0 (Chromium, dist-qa) tabs, hiddentab, hiddentabguard, sellallgrader, sellallgraderfit: 26/26 PASS.
- Worktree status clean after gates.

## Findings
- None Blocker/Major/minor.
- n1 (info): actions.ts no longer exports #28's `saleValueCents(k, base, gm)`; no remaining importer in src/tests, so harmless, but external callers must use sim/payout.
- n2 (info): .rc-primary already declares min-height 48px (styles.css:266); the new rule is a belt-and-braces override, fine.
