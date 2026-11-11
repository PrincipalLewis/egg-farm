# RC1 #67 `rc/m4.1-rc1` @ 5d9efa61c5e6ee31ca9ebdec20ee70167d31d463 — UI lane

Status: FINAL (2026-10-24 17:21 CEST). Worktrees removed; no QA servers left running.

**Recommendation: PASS (with 1 new Minor, m-RC1-1, non-blocking for the RC; HoQA makes the call).** 0 Blocker, 0 Major, 1 new Minor, 3 known pre-existing Minors (not counted), 3 Info.

| Area | Result | Key counts |
|---|---|---|
| 1a p65-tap (scrolled sheets, rect, none-contract) | PASS with Minor m-RC1-1 | 588/588 first-tap BUY (294 mouse + 294 touch), 0 dismiss-only, 0 nothing; none-contract records 18/18, dismissAllOk 18/18; rect: 4/396 states with a 0.13–0.27px transient intersection (m-RC1-1) |
| 1b committed scroll-sweep | PASS | 552/552 BUY, 360 states + 1,542 fine positions, 0 overlaps |
| 2 #64 R-a / wrap / big numbers / Sell aria | PASS | 270 R-a cards clean (74/75 eggs · $1,682.25 in full, no clip/ellipsis, ≥12px, ≥44px); only known Minors |
| 2b formatter | PASS | 142/142 boundaries, 26/26 claims, 0/88,448 half-up misses |
| 3 #62 #goal label-in-name + ★/chip | PASS | 133/133 states, 49 timing runs 0 bad samples, axe 0 violations (63 scans, negative control live), lin-sweep 0 #goal |
| 4 UX-M1/M2/M3/M5 (p65.mjs) | PASS | 15/15 runs complete; 3 probe FAILs = stale 375 expectation (see Area 4), 0 product fails |
| 5 Gates | PASS | vitest 1402/1402 (+1 skip), rc0 358/358, check-globals 3/3, release builds clean |
| 6 FF/WK explainer + recovery dialog | PASS | 528/528 checks |

| Field | Value |
|---|---|
| Intake | `git merge-base --is-ancestor` OK for #60 5789805, #61 33f1538, #62 09cee47, #63 3c86720 (code 8694222), #64 3110e88, #65 c877f69, #66 8c568b0; merge-base with main = dd223f5 = origin/main. |
| Worktree | `/tmp/qa-rc1-5d9efa6` clean detached (porcelain 0 before/after every phase). |
| Build-id | `m4.1+5d9efa6` (prefix changed from m3-rc1-pre by #61), 0 `+dirty`; probes take `QA_BID` and assert it in-page on every load (no hard-coded prefix). |
| Lock/ports | Every browser command `flock .browser-test.lock timeout 600`, one engine at a time; rc0 :4975, check-globals :4976, p62/axe/lin :4981, probes OS-assigned. Never :4173. |

## Area 5 — Gates: PASS
npm ci 0, sync --check 0, tsc 0, vitest (--minWorkers=1 --maxWorkers=2) **107 files, 1402 passed / 1 skipped**, build 0, build:html 0, build:qa 0, check-release-build dist 0 + html 0 (all three `m4.1+5d9efa6`), **rc0-browser Chromium 358/358** (0 FAIL), **check-globals 3/3** (`'eggfarm' in window === false`).
- rc0 count note: 358 ≠ expected 352. 358 = 348 base + 6 (#62 B3 non-F4 targets FARM/FARM ready/W1/W3/worker/done) + 4 (#65 G5 `place !== 'none'` × 4 widths); 09cee47 was 354, c877f69 352. Diff vs c877f69 (`review/rc0-browser-vs-c877f69.diff`): removed lines are only the old spawn server and the old B3 aria-label assert/legacy copy, replaced by stricter checks; 0 weakened.

## Area 2b — Formatter spot-check: PASS
`fmt/m41-9-fmt.qa.test.ts` (from 3110e88) on RC vs dd223f5: 8/8 tests, 142/142 boundaries, 26/26 author claims (1e36→1.00e36, 9.995e36→1.00e37, +$1.2Qa, $999.9Dc), half-up 0 misses / 88,448, K–T identity 700×8 0 diffs.

## Area 6 — WebKit/Firefox explainer + recovery dialog spot check: PASS
`csr/csr-spot.mjs` (seeding from Saves QA csr-m41-7-ui.mjs + csr-fixtures) FF+WK × 360/390: **528/528 checks, 0 fails**. 8 dialogs (M1, M1cf, M2, M3, M4, M5, LEGACY-Q, LEGACY-cantsave): 0 off-screen, 0 clipped, 0 outside card, primary 48px, Export 44px, Tab focus ring visible on every control. Explainer (main / sheet Farm / sheet Collection × plain/refund): 0 off-screen/clipped, Got it 48px, focus visible.

## Area 1a — p65-tap (QA probe): see findings
9 runs (Cr/FF/WK × 360/375/390), all COMPLETE, 0 page errors. **588/588 first taps BUY** (294 mouse + 294 touch), 0 DISMISS-ONLY, 0 NOTHING, efpIsBuy 588/588. none-contract records 18/18 present, dismissAllOk 18/18.
- Count vs c877f69 (772 incl. 412/430 Chromium; 652 at 360–390): Farm list is 32px taller on RC (maxScroll 391 vs 359 at 360), so the 5px Egg-value sliver at scroll 0 is no longer visible → 2 fewer taps per run at 360/375.
- At 375 scroll 200 + refund card the card now places `band` (visible) instead of `none` (taller list moved the Buys).
- **Rect gate: 4 sub-pixel intersections (FF 375, WK 375; mouse+touch)** — see Finding m-RC1-1.

## Area 1b — committed scroll-sweep (copy with output dir redirected to evidence; `review/scroll-sweep-copy.diff` = 2 lines: import path + OUT): PASS
Cr/FF/WK × 360/375/390: 360 states, **0 card over Buy/Collect**, 4px fine sweep 1,542 positions / 0 over a Buy, **552/552 BUY**, 0 dismiss-only, 0 nothing, 0 page errors; `none` at 360 Farm refund scroll 200 in all 3 engines (mouse+touch). (c877f69: 576 taps; fewer visible Buys at scroll 0 because the RC Farm list is 32px taller.)

## Area 2 — #64 R-a / order-card wrap / big numbers / Sell aria (p64.mjs): PASS (known Minors only)
Chromium 360/375/390 (ra,huge,aria,axe), Chromium 320/1280 + FF/WK 360/390 (ra,huge). 270 R-a card measurements: level-cap line `74/75 eggs · $1,682.25` in full, 0 ellipsis, `.l1` scrollWidth ≤ clientWidth, font ≥ 12px, Sell/Need ≥ 44px, wraps to 2 rows at 320. m3 Sell aria count = visible count: 0 fails. Chromium/WebKit: 0 non-axe fails. Only FAILs logged are the known pre-existing Minors: Sell label-in-name (rounded vs exact money), `.chip.arrive[aria-label="Customer"]`, and m-FF1 (Firefox Sell content 1–2px wider than its box at huge numbers: sw/cw 85/84, 86/84, 89/87, 94/92; visible overflow, nothing cut off).

## Area 3 — #62 F3/F4 `#goal` label-in-name + ★/chip (p62 v1.25, axe62, lin-sweep; axe-core 4.14.0 sha256 20c09fe1…c46e878, `label-content-name-mismatch` enabled explicitly): PASS
- p62: Chromium 360/390/430, Firefox + WebKit 360/390 → 7 runs × 19 states (F4 with/without ★, value 26/27-char, FARM ready/waiting, W1–W4 incl. grader tier, done, no-income ×3) = **133/133 states**: 0 aria-label on `#goal`, describedby=goalDesc 133/133, name = visible text + status, description = B3 sentence, CCR M1 % hidden at 0 income, chip/★ agree. F4-13a timing: 7 cases × 7 runs = 49, **0 bad samples** (★, "best buy," and chip appear/leave in the same sample; affordability flip without purchase included).
- The only probe FAIL (3 of 49 timing runs: Cr 360, FF 390, WK 360) is `flip-income-tick: at +60ms strip "Hens L2" chip null` — the game's own income tick had not fired 60ms after setup (status still `~1 s`); ★/description/chip then turned on together in one sample (fs=fd=fc) at the first affordable render, and are on at +1360ms. Probe timing artefact, not star-chip lag (same assertion tripped on 09cee47). Info, not counted.
- axe62 (Chromium 360/390/430 × 21 states): **0 label-in-name violations**, negative control flagged at all 3 widths (rule live).
- lin-sweep (Chromium, 31 scenes per width, every visible target): **0 `#goal` violations / name flags**; only hits are the known `.chip.arrive[aria-label="Customer"]` (4 per width).


## Area 4 — UX-M1/M2/M3/M5 via p65.mjs: PASS
Chromium (blocking) + Firefox + WebKit × 360/375/390/430/1280 = 15/15 runs complete (`browser/entries-*.jsonl`, `browser/summarize.txt`), 0 page errors.
- UX-M1: focus restore order (active tab → bottom-nav Upgrades → #collect), `.kbd-focus` 3px #2B79A8 ring on Escape/Enter/Space, none on pointer Got it, cleared on pointerdown/blur — all 15 runs.
- UX-M2: `.save-warn` above #collect at ≤390 (`--toast-safe-b` 144px; 9/9 hit points land on #collect, Collect works 0→5); clears #goal and #collect at 430 (196px) and 1280 (136px).
- UX-M3: placement + re-placement on scroll/resize/click; 0 Buy covered while up; dismiss via Got it and 8s timeout.
- UX-M5: 150ms `expout` inert copy, `+$1.2K` 800ms pop + 3 coins on dismiss only, none for the plain card, none under reduced motion (system and flag).
- Regression sweep: 45/45 scenes 0 tap targets <44px, 0 clipped labels, 0 overflow-x.
- The 3 FAILs (`UX-M3 dynamic @375: Farm scroll=200 refund sets data-place="none"`, Cr/FF/WK) are a stale probe expectation from c877f69: on the RC the Farm list is 32px taller (#62 `★ Best buy` chip), so at 375 scroll 200 a clear `band` slot exists and the card correctly shows there (settled 0.75px clear of the Hens Buy). `none` still happens where no slot exists (360 scroll 200, all engines). Not a product fail; the transient overshoot in this exact state is m-RC1-1.

## Findings
### m-RC1-1 (Minor, new on the RC, all engines; non-blocking) — explainer entry animation overshoots ≤0.27px onto the Hens Buy for ~35ms
- **Where:** 375×667, Upgrades sheet → Farm tab, scrollTop 200, refund-line card (`migrationRefundCents=123450`), `data-place="band"` (style top 64px, offsetHeight 206).
- **Rects:** settled card 64.0–270.0, Hens Buy (clipped) top 270.75 → 0.75px clear. During `expin` (.2s, `--ease-pop: cubic-bezier(.34,1.56,.64,1)`, scale .9→1 overshoots ≈1.009) the card grows to ≈207.8px: p65-tap caught FF card 63.08–270.92 / WK 63.00–271.00 vs Buy 270.75–318.75 (l 102–341; card l 38–337) → overlap 0.17px (FF) / 0.25px (WK), mouse+touch = the 4 states. Per-frame sampler (`mrc1/mrc1.mjs`): max overlap 0.267px FF (frames 106–141ms), 0.245px WK (108–132ms), 0.255px Chromium (139–173ms; p65-tap just missed it on Chromium).
- **Hittable?** Yes, briefly: `elementFromPoint` in the overlap strip returns the card (`efp: card`) in every overlap frame. Settled: no overlap.
- **Tap:** the Buy still bought on the first tap in all 4 states (`BUY(card stays)`, efpIsBuy true at the Buy centre), and in the repro (`tapAtButtonCentre.bought: true`).
- **Severity:** Minor. Art ruling (L195) says the card must never be over a visible Buy; this breaks it literally, but only by a ≤0.27px sliver at the Buy's top border for ~35ms during the entry animation. It can't plausibly swallow a real tap. The committed scroll-sweep didn't flag it (it samples after the animation).
- **c877f69:** the same state doesn't arise there: at 375 scroll 200 c877f69 places `none` (hidden), since its list is 32px shorter. Root cause (`placeExplainer` clear-checks the settled layout box with 0 margin; the `expin` overshoot isn't accounted for) is in #65 code, but it's only reachable now because of #62's taller rows.
- **Suggested fix (UI):** clear-check with ≥2px margin (≥ h×overshoot/2), or `transform-origin`/non-overshooting easing for `expin`.
- **Repro:** `flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node qa/m41/rc1-5d9efa6-ui/mrc1/mrc1.mjs firefox rc` (or webkit/chromium; `c877` for the comparison build). Shots: `shots/firefox/tap-after-{mouse,touch}-farm-refund-s200-hens-pre-w375.png`, `shots/webkit/…-w375.png`.

### Known pre-existing Minors (not counted, per scope)
- `.chip.arrive[aria-label="Customer"]` label-in-name (p64 axe, lin-sweep 4/width).
- Sell label-in-name: visible rounded money vs exact money in aria (e.g. "Sell 75 +$1.6K" / "Sell 75 · +$1,682.25").
- m-FF1: Firefox Sell content 1–2px wider than its box at huge numbers (visible overflow, nothing cut).

### Info
- I-1 rc0 is 358/358, not 352: +6 from #62's B3 targets merged with #65's +4; 0 weakened assertions.
- I-2 p62 `flip-income-tick` +60ms assertion tripped in 3/49 timing runs (game tick not yet fired; ★/desc/chip still flipped together, 0 bad samples).
- I-3 Tap totals are lower than c877f69 (588 vs 652 at 360–390; sweep 552 vs 576): the `★ Best buy` chip makes the Farm list 32px taller, so a 5px Egg-value Buy sliver at scroll 0 is no longer visible/tappable. `inside` placement now appears at scroll 0 at all widths (0 overlaps).

## Not run / scope notes
- p62 Firefox/WebKit at 430 (Chromium 430 + axe/lin 430 ran); p65-tap 412/430 spot widths (in scope only 360–390).
- p64 sections aria/axe on FF/WK (ra,huge only there, as on 3110e88).
- Real iOS/Android devices; Playwright WebKit/Firefox/Chrome on Linux only.
- Committed scroll-sweep was run as a 2-line copy (import path + output dir to the evidence folder, `review/scroll-sweep-copy.diff`) so nothing was written to /workspace/wt-ui-shots; its build-id check is the committed bundle check, while every QA probe checked `meta[name=build-id]` in-page.
- No BEFORE (dd223f5) browser baseline on the RC gate (by design; prior per-PR reports hold it).

## Evidence index (`qa/m41/rc1-5d9efa6-ui/`, `manifest.json` = 2,148 files with sha256, 1,935 PNGs)
- `gates/` run-gates.sh, summary.txt, npm-ci/sync-check/tsc/vitest/build*/check-release-*/rc0-chromium/check-globals logs, rc0-shots/
- `browser/` p65-tap.mjs, p65.mjs, scroll-sweep-rc1.mjs, tap-*.jsonl (9), entries-*.jsonl (15), run-*.log, tapsum.txt, summarize.txt, scroll-sweep-*.log, scroll-sweep-summary.txt, sweep-out/
- `p64/` p64.mjs, p64-head-*.jsonl (9), run-*.out · `fmt/` test, results, log
- `p62/` p62.mjs, entries-*.jsonl (7), timing/, run-*.out · `axe/` axe62.mjs, axe-results.json · `lin/` lin-sweep.mjs, lin-5d9efa6-{360,390,430}.jsonl/.out · `harness/` browser-cases.json
- `csr/` csr-spot.mjs, csr-spot-{firefox,webkit}-{360,390}.jsonl, logs · `mrc1/` mrc1.mjs, mrc1-{rc,c877}-{engine}.json, logs
- `review/` rc0-browser-vs-{c877f69,dd223f5}.diff, scroll-sweep-copy.diff · `shots/` chromium/firefox/webkit (p65), p62/, p64/, axe/, lin/, csr/, mrc1/
- Driver: `run-chain.sh`, `run-chain.out`, `serve.mjs`.
- Shots opened during the run: Farm s0 `inside` (Cr 360), refund s200 band (WK 375, m-RC1-1), none-contract hidden (Cr 360), M4 dialog focus (WK 360).
