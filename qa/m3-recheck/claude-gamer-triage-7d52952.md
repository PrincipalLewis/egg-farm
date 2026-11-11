# Claude Gamer triage — fix/rc1-qa-bugs-v4 @ 7d52952
Source: qa/claude-gamer/rc1-qa-bugs-v4-7d52952.md (+ screenshots). QA Engineer UI/Layout, 2026-10-17 CEST.
Build: fresh worktree /tmp/qa-cg-7d52952 @ 7d52952, `npm run build:qa`; runtime build ID **m3-rc1-pre+7d52952** read from the loaded bundle (no meta tag on this branch, as the Gamer's B1 says). Ports 4321/4322. 390x844 (mobile, touch) and 1280x800 (docked). Chromium on lane 2 (load<12); Firefox/WebKit on main lock.
Script: `claude-gamer-triage-7d52952/qa-cg.mjs` (seeded saves, onboarding done). Evidence: `claude-gamer-triage-7d52952/` (shots/, result-<engine>.json, run-*.log, summary.txt).

## Results and proposed severities
| # | Item | Repro | Engines | Proposed severity |
|---|---|---|---|---|
| B2 | "No eggs to sell" while holding eggs | **Yes.** Basket pill 8, no customers waiting → Sell all reads "No eggs to sell" (390 + 1280). Cause: `sellAllLabel` shows that copy whenever the sellable preview is 0, and the preview is 0 when there's no open demand (orders.ts:84-86, payout.ts:16). Copy should say "No customers yet" / "Waiting for customers" when basket > 0. With basket 0 the copy is correct. | CR/FF/WK ✔ | **Minor** (misleading copy; core loop unaffected) |
| B3a | Card stays "0/8 · Sell 8" after a sale | **Yes, transient.** On a full sale the served card gets `.leaving` and fades out over ~0.5 s with its **pre-sale** text "0/8 eggs · $9.44 · Sell 8 +$9.44" (sampled at 80 ms and 300 ms; gone by 700 ms). It reads as an unsold, unaffordable order while fading. | CR/FF/WK ✔ | **Minor / polish** (freeze the card in a "Sold ✓ +$X" state while leaving) |
| B3b | New orders read "0/6" | **Yes, by design.** New order: "0/13 eggs · $15.34 · Need 13". "x/N" = delivered so far, which first-time players read as "0 available". | CR/FF/WK ✔ | **UX note** for Art & UX (not a bug): consider "Wants 13" / progress only after the first delivery |
| B4 | Stray ↑ over the upgrade price after buying | **Transient only.** The green ↑ purchase flourish rises over the button and covers the new price at ~100 ms (shots/*-B4-after-buy-100ms.png); gone by 400 ms, button reads "$104.00" cleanly. No persistent overlap at ≥400 ms. | CR/FF/WK ✔ | **Cosmetic** (optionally start the flourish above the price) |
| Full coop | Collect bright "Collect +N", no coop-full message | **Yes.** Coop 100/100, "Full!" tag shown, Collect stays yellow rgb(255,201,60), enabled, "Collect +10"; no "Coop full"/"Collect or hire Coop Hand" text; goal ETA "—". | CR/FF/WK ✔ | **Expected at 7d52952 — B-1 not in this build** (rc1-b1-coop-full-spec AC-B1/B4/B6 cover the message). Note: AC-CF3 is the attended/penalty rule, not this UI; the relevant ACs are B-1 AC-B1, AC-B4, AC-B6. Track under B-1; Minor if B-1 slips. |
| +2 | Stray "+2" over an empty Market | **Not a game bug (bot artifact).** It's the Collect floater, anchored to #collect. At 390 the open Market sheet covers Collect (real click blocked: element under the point is `.order-list`); only a scripted `.click()` fires it, then "+N" floats over the sheet. A human can't tap Collect there. At 1280 Collect is not covered and the floater is placed correctly. | CR/FF/WK ✔ | **Not a bug** (bot clicked a covered button) |
| +$/s | "+$/s with wages", mid-game | **No "+$/s" text in the 7d52952 UI** (no visible "/s" string in HUD/panels). Checked the rate the UI uses (`eggfarmUi.rates()`) at Farm L5, Market Hand working, 6 samples / 12 s: net = income − wages exactly (e.g. 280.58 − 2.08 = 278.50 c/s; wage 2.083 c/s = $1.25/min = csv w1_wage_per_min at L5). Coins dip by the wage between sales. | CR/FF/WK ✔ | **Cannot reproduce at 7d52952** (the net-rate display is B-1/AC-B3 scope). Recheck when B-1 lands. |

## Engine results (390 and 1280 each)
| Check | Chromium | Firefox | WebKit |
|---|---|---|---|
| B2 basket 8, no customers → "No eggs to sell" | repro | repro | repro |
| B3a leaving card keeps "0/8 · Sell 8 +$9.44" at 300 ms, gone by 700 ms | repro | repro | repro |
| B3b new order "0/N · Need N" | 0/13 | 0/8 | 0/12 (random demand) |
| B4 price clean at ≥400 ms ("$104.00") | yes | yes | yes |
| Full coop: "Collect +10", rgb(255,201,60), Full! tag, no message | repro | repro | repro |
| +2: Collect covered by sheet at 390 (real click blocked); not covered at 1280 | yes | yes | yes |
| net = income − wages (rates()), no visible "/s" text | yes | yes | yes |
No page errors in any run.

## Feel notes (from the Gamer report, for HoP and Art & UX — not rechecked as bugs)
- First ~12 s are passive (no "tap Collect" prompt, then an 8 s customer wait).
- Tutorial copy differs: 390 "A customer! Tap them to sell eggs." vs desktop "Tap Sell to earn coins.".
- "Sell a few more eggs to afford it · $2 to go" doesn't point to Upgrades.
- After the tutorial, selling is a stream of 2–3-egg partial sales with no big satisfying sale.

## Not run
- Real long play sessions (seeded states instead); tutorial flow not replayed.
- B1 (build-id meta) not retriaged: confirmed absent in the page, present in the bundle.
