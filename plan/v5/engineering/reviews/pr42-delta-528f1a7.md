# CCR delta review — PR #42 (rc/m4-on-tests-2) 06171c7 -> 528f1a7, base rc/m4-default-on 90a9c84

Verdict: **PASS**. Blocker 0 · Major 0 · Minor 0 · Nit 4. Release caveat (not this diff): 3 unit pacing tests still red on M4-on (retune input).
Read-only: detached worktree /tmp/w42b; mutations restored, tree clean. ~01:40 UTC+2.

## Scope
- 06171c7..528f1a7 = 11 commits (the 7 listed + c163fb9 D-HOP-01 bot, e79d50d/99ad822 docs). `git diff -M --stat -- src data`: empty; no symlinks/renames.
- Files: tests/bot.ts, bot-m2.ts, new bot-m4.ts, new ac7-first-purchase.test.ts, seller-variance.slow.test.ts, m1/m2/m3/n1 test files, m4on golden pin, docs.
- Thresholds: pacing.test, pacing-acw1, pacing-m2/m2b, p4, ac7-worst-seed, data/pacing-targets.json untouched; seller-variance diff changes only which balance each run uses (ac7BandCheck constants, REL_EPS, spread/target bounds unchanged); bot cadence (taps 1 s, sellEvery 15 s, variance params) unchanged. No assertion loosened.
- bestPaybackAmong / candidates are existing src (src/econ/best-buy.ts, src/ui/next-goal.ts) imported read-only by test-only tests/bot-m4.ts; src unchanged.

## Bot vs D-HOP-02 (product/decisions.md:216)
- Ruling: bots buy whatever the game's highlightPick/bestPaybackAmong picks across every purchasable, no bot ROI, wait on unaffordable pick, cadence/seeds unchanged. pickM4All does exactly that (affordable offered keys, else all offered; buy only if the pick is affordable). Workers in runM2 go through the same pick (only those the scenario uses). Variance cheap-first Collection is suppressed on M4 seller15 (would buy outside the pick; consistent with the wait rule). Cheapest bot = D-HOP-03 cheapest affordable incl. tracks.
- Flag off: pickBuy returns the old Farm/Collection rule (maxLevel -> Infinity cost, same semantics); flag-off golden f90d1678 unchanged confirms.
- Not gaming: it's the in-game hint policy, a reasonable player model; 3 pacing gates still fail with it (L10 8-12 min, acw1, p4), so it isn't tuned to pass.

## 32ebe43 (parity forced off)
- Python-parity cases (traces, per-seed, quantiles) run on M4-off because the Python fixtures model the pre-M4 bot; ruled by D-HOP-04 (legacy check, M4 Python ref on backlog). The AC7 band now runs on shipped M4-on (RUN_ON) instead of the parity cache, so the M4-on AC7 band stays a real gate (passes). Doesn't hide an M4-on parity issue: there's no M4-on Python reference to compare against.

## 969d7a9 first purchase <= 30 s
- Real per-seed assertion (seeds 1-200, deterministic seller15, shipped M4-on): max 15 s observed. Variance-bot part is report-only (asserts only finiteness; 40/200 > 30 s, max 57.8 s, attributed to bot check-in cadence) — n2.

## Fix mutations (src broken locally, restored)
- m1: price -> flag-off formula: tick AC4, workers Grader, sellall pin, MK-12 fail (4); price +1 c: 3 fail. Literal 100 c is correct (trackPriceCents V0 = 100).
- m2: MK-12 now F4/H5/V5 -> F5: independent trackPriceCents 220 -> 242 c (matches test). Price lagging one farm level -> MK-12 fails.
- m3: removing `this.state.tracksV7 === 1 ||` at src/game.ts:232 -> new N2 refusal test fails.
- n1: offline-modal g2 now expOfflineV6(120): correct.

## Golden
- m4on golden regenerated twice from src: trace 723b91ab311be9bf… both runs; storage pins unchanged; flag-off f90d1678 unchanged both runs.

## Gates @ 528f1a7
- tsc OK.
- vitest: 854/858; fails = pacing L10 8-12 min, pacing-acw1, p4 (triage "6 still fail" set, unit part) + release-bundle D3/D4 (load flake: 4/4 on isolated rerun; untouched test).
- test:slow: 14/14 (was 7/14); vendor pins OK. So of the 16: 13 green, 3 unit still red.
- golden 4/4 x2.
- build + build:html: check-release-build ok.
- check-globals PORT unset: Chromium 3/3.
- rc0 Chromium (dist-qa): 249/249.

## Findings
- R (release, not this PR): pacing.test "Farm L10 within 8-12 min", pacing-acw1, p4 still fail on M4-on with the D-HOP-02 bot -> HoP 03:30 retune; don't tag before.
- n1: three commits beyond the listed seven (c163fb9, e79d50d, 99ad822); test code in c163fb9 is superseded by 8308417, docs only otherwise.
- n2: tests/ac7-first-purchase.test.ts:17-21 variance part is non-gating (finiteness only); fine as report, label it so in CI output.
- n3: triage doc says "6 still fail"; observed slow now 14/14 and unit 3 pacing — doc should be refreshed (counts after 32ebe43).
- n4: tests/release-bundle.test.ts D3/D4 flaked once under full-suite load (pre-existing; passes alone).
