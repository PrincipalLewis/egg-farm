# rc2 Market test plan: MK-40..51 (order sell-preview) + MK-52..59a (order chip + trickle)
Sources: product/market/feature-spec.md (MK-35 confirmed; MK-40..51 with 1000 ms live-region throttle and ±16 ms motion tolerances), art-ux/rc2-order-sell-preview.md v1.0 (signed off 2026-10-16 23:55), product/market/order-chip-and-trickle-proposal.md v0.3 (MK-52..59a; HoP MK-59 bar 08:21; Economy MK-59 PASS 08:22 at last_chance 1.0 s).
Draft, doc only, nothing run yet. AC rewrites from the prior draft are applied in v0.3 / feature-spec; this plan traces the new wording.

Common setup: build-id `m3-rc1-pre+<sha>` verified at runtime; own port (never :4173); one engine at a time; browsers under the lane lock.
Fixture "F-417": order 4/17 at $93.84, basket 8 (from the spec example); load it through the test-only seed/debug hook in non-release builds.
VP-ALL = 360x800, 375x667, 390x844, 430x932, 1280x800, 1024x474d, 1280x720d, 1366x768d. E3 = Chromium + Firefox + WebKit.
Frame checks: read DOM in the same requestAnimationFrame callback as the basket pill (MK-37 harness).
Strict visibility = rect > 0, offsetParent not null, opacity > 0, not visibility:hidden.

## Notes
- **MK-35 (0-eggs button reads "No eggs") is ACTIVE.** Confirmed by the UI/Visual Designer 2026-10-17 (feature-spec.md; rc2-order-sell-preview.md updated). Rows MK-T44b and MK-T52 assert "No eggs".
- **B2 closure:** the "Waiting for customers" chip (MK-54, PR #30) closes B2 from qa/m3-recheck/claude-gamer-triage-7d52952.md ("No eggs to sell" shown with eggs in the basket) **when it lands on main**. Verify with MK-T54 and mark B2 closed in the triage file, citing the SHA.
- **MK-59a MUST-CHECK** uses the node harness in `qa/m3-recheck/mk59a-harness/` (shipped `src/sim` + seller15). HoP ruling 08:43 CEST: non-inferiority at L20 (lower 95% bound of mean served-% diff ≥ −2.0 pts). HoP 08:45 CEST: per-level guard with 1,600-seed confirmation — **LOCKED**. Base side = Features' merged min_wait build. No absolute match to 68.33.

## Rows
| ID | AC | Setup | Steps | Expected / tolerance | Viewports | Engines |
|---|---|---|---|---|---|---|
| MK-T40a | MK-40 | F-417 | read progressbar aria-label, aria-valuenow | exactly "4 of 17 eggs delivered. Selling adds 8. Order worth $93.84."; valuenow=4 | 390, 1280x720d | E3 |
| MK-T40b | MK-40 | 4/17, basket ≥ 13 | read aria-label | "...Selling adds 13 and completes the order. Order worth $93.84." | 390 | E3 |
| MK-T40c | MK-40 | 4/17, basket 0 | read aria-label | "4 of 17 eggs delivered. No eggs to sell. Order worth $93.84." | 390 | E3 |
| MK-T40d | MK-40 | order 1.8M demand; force ≥2 aria updates within <1000 ms (e.g. Collect then Sell) | read aria-label; timestamp live-region announcements | numbers in words via the formatter ("1.8 million"); announcements spaced ≥ **1000 ms** apart (feature-spec: `t - lastLive > 1000` at 7d52952 src/ui/app.ts:527–528) | 390 | Chromium |
| MK-T41 | MK-41 | F-417 | measure track inner, fill, preview widths | 360: 170/40/80 px ±0.5; 1280 docked: 178/41.9/83.8 ±0.5; preview k = Sell button count in the same frame; preview starts at the fill's right edge ±0.5 px | VP-ALL | E3 |
| MK-T42 | MK-42 | 3 orders remaining 5/7/9, basket 10 | read previews | 5/5/0 in queue order (front to back); sum ≤ floor(basket); a card with allocation 0 has no preview node/visible segment | 390, 1280x720d, 1366x768d | E3 |
| MK-T43 | MK-43 | 4/17, basket 13 | measure | fill+preview = track ±0.5 px; `.order.ready` with outline #3D7F33; no hint text; card height 60 px ±0.5; with basket 12, fill+preview < track by ≥ 1 px | VP-ALL | E3 |
| MK-T44a | MK-44 | basket 0 | inspect | no preview (strict visibility false) | 390, 1280x720d | E3 |
| MK-T44b | MK-44/MK-35 | basket 0 | read button; tap | exactly **"No eggs"**, aria-disabled, greyed, no "+$" / Sell count; tap shakes, no sell event, coins unchanged; card still shows filled/N | 390 | E3 |
| MK-T44c | MK-44/36 | card timing out | sample every frame during `.leaving` | no preview; fill width constant ±0.1 px; button disabled; tap is a no-op | 390 | E3 |
| MK-T45 | MK-45 | 1.8M demand, basket 2,400 | measure | preview ≥ 4.0 px; fill+preview ≤ track; bar scrollWidth ≤ clientWidth; fill may be 0 | 360, 390, 1280x720d | E3 |
| MK-T46 | MK-46 | F-417 | screenshot; sample pixels; greyscale | hatch #2F6B27 over #3D7F33@40%; 1px #FFFFFF divider; luminance contrast hatch vs track ≥ 3:1 and divider vs fill ≥ 3:1, also in greyscale | 390, 1280x720d | E3 |
| MK-T47 | MK-47 | values $93.84 and $1,242.00; large F/N | read row text; check value-span clipping | full text "4/17 eggs · $93.84" when it fits; otherwise "4/17 · $93.84"; the value span never ellipsised or clipped (scrollWidth ≤ clientWidth) while " eggs" shows | VP-ALL (incl. ≥960) | E3 |
| MK-T48 | MK-48 | MK-T41..47 fixtures | rerun T41–T47 | all pass; card 60 px; preview inside the 170 px track; no row text cut | **360x800, 375x667** | **E3 (required)** |
| MK-T49 | MK-49 | F-417 | Collect, Coop Hand, Market Hand, Sell, Sell all; rAF probe | preview width + aria-label + pill + Sell label all consistent in the same frame; width transition 120 ms ±16 ms using --ease-out; no frame where the width jumps > 50% of the delta outside the transition | 390, 1280x720d | E3 |
| MK-T50 | MK-50 | F-417 | Sell; sample every frame | fill tween 200 ms ±16 ms, cubic-bezier(.22,1,.36,1); preview → 0 and removed at 200 ±16 ms; starts in the same frame as the number pop (±1 frame); no 240 ms transition left in the computed style | 390, 1280x720d | E3 |
| MK-T51 | MK-51 | reducedMotion: reduce (+ `.rm`) | Sell, Collect | computed width transition is none; widths swap within 1 frame; preview opacity fade ≤ 120 ms or none | 390, 1280x720d (+360) | **E3 (required)** |
| MK-T52 | MK-52 | new order filled 0, N=13, $15.34; also basket 0 | read row at each width; read button | exactly "Wants 13 eggs · $15.34", or "Wants 13 · $15.34" only when scrollWidth > clientWidth on the full form; never "0/13" or "Need 13"; 3-sigfig K/M only after " eggs" dropped and still overflowing; with basket 0 the button reads **"No eggs"** (MK-35) | **360, 390, 1280x720d** + VP-ALL | E3 |
| MK-T53a | MK-53 | 4/17 $93.84, basket < 13 so filled + preview < N | read row | "4/17 · $93.84" at every width (no verb); never "✓ Ready" | 360, 390, 1280x720d | E3 |
| MK-T53b | MK-53 | filled == N (delivered complete; dwelling card) | read row | exactly "✓ Ready · $V" with `.order.ready`; **"✓ Ready" shows only when delivered (filled) == N** | 360, 390, 1280x720d | E3 |
| MK-T53c | MK-53 | 1,240/1,840 $1,242.00 | read row at 360 | short form only on overflow (scrollWidth > clientWidth): drop " eggs" first, then "1.24K/1.84K · $1,242.00" if still overflowing; $ value never cut or ellipsised | 360, 375, 390, 1280x720d | E3 |
| MK-T53d | MK-53 / MK-43 | 4/17, basket 13 (filled + preview = N; filled < N) | read row text; measure preview / outline | row keeps numeric **"4/17 · $93.84"** (never "✓ Ready"); only the preview segment + `.order.ready` meadow outline (#3D7F33) mark completeness; fill+preview = track ±0.5 px; no hint text; card height 60 px ±0.5 | 360, 390, 1280x720d | E3 |
| MK-T54 | MK-54 | (i) basket 20, no open demand; (ii) basket 0 | read Sell all | (i) exactly "Waiting for customers", disabled; (ii) "No eggs to sell". **Closes B2 when it lands.** | 360, 390, 1280x720d | E3 |
| MK-T55a | MK-55 | filled 0 N=13 $15.34, basket 8 | read aria | card: "Customer wants 13 eggs, order worth $15.34"; bar: "Customer wants 13 eggs. Selling adds 8. Order worth $15.34."; with basket 13: "...Selling adds 13 and completes the order..."; with basket 0: "...No eggs to sell..."; MK-40 unchanged for filled > 0 | 390, 1280x720d | E3 |
| MK-T55b | MK-55 | worst-case rows "Wants 138 eggs · $1,242.00", "1.24K/1.84K · $1,242.00", "✓ Ready · $1,242.00" | measure in build fonts | scrollWidth ≤ clientWidth, no ellipsis | 360x800, 375x667 | E3 |
| MK-T55c | a11y | each state | axe scan + VoiceOver/NVDA spot check (manual) | 0 serious/critical; role=progressbar with valuemin/max/now | 390 | Chromium (axe) |
| MK-T56a | MK-56 | test hook: Farm level with eggs_per_sec r, Market Hand Working, front remaining R > 5r | log Market Hand actions and basket each tick | no Market Hand sale while floor(basket) < min(R, ceil(5·r)); first sale at the first action with floor(basket) ≥ min(R, ceil(5r)) (±1 action interval, 1 s); holding counts as work, not idle | n/a (sim/unit + 1 browser smoke at 390) | Chromium (smoke) |
| MK-T56b | MK-56 | R < ceil(5r) | same | sells once basket ≥ R | n/a | unit |
| MK-T56c | MK-56 | 10 min Market Hand | compare wage/min and energy drain vs a build without hold | wage/min unchanged ±0.01 $/min; energy drain 1%/9 s unchanged; held actions charged; cost per egg sold reported, not gated | n/a | unit/sim |
| MK-T57 | MK-57 | front customer patience about to expire, basket below the hold threshold | log ticks at 0.1 s | market_hand_last_chance_s = **1.0 s**; sells min(basket, remaining) to the front customer when time-left is in **[0.9, 1.0] s**; **never after timeout** | n/a + smoke 390 | Chromium |
| MK-T58 | MK-58 | hold passes; bulk-buyer present | log | serves front to back; bulk-buyer hold-back and MK-34 limits apply; manual Sell and Sell all work at any basket size (never gated) | 390 | E3 (manual sell part) |
| MK-T59 | MK-59 (revised bar) | Economy sim | read t2_lc1.json | wage/min unchanged; income/min within ±0.5%; worst progression served % ≥ −0.5 pts; median F2 Market Hand sale ≥ 8; cost per egg is info only | n/a | python |
| **MK-T59a** | **MK-59a MUST-CHECK** | harness qa/m3-recheck/mk59a-harness on shipped code, game RNG; **paired** base vs hold, same seeds 1–400; base = Features' merged min_wait build | seller15/VAR_DEFAULT, 0.1 s, 3,600 s; served % per arrival level, pooled; paired 95% CI (linearised ratio estimator) | Always: wage/min unchanged, income/min within ±0.5%, F2 median Market Hand sale ≥ 8. **Served-% verdict (HoP 08:43, non-inferiority) — LOCKED:** PASS if lower 95% bound of L20 mean served-% diff ≥ −2.0 pts (equiv. measured mean ≥ −1.29 at SE 0.36). L20 mean diff is info only. **Per-level guard (HoP 08:45 CEST) — LOCKED:** if any level L3–L25 has a 400-seed mean served-% diff < −2.0 pts, rerun that level at 1,600 paired seeds; it FAILS only if the rerun mean is still < −2.0. Applies to every level L3–L25 (not only L9–L13). Screen false-fail at 400 seeds was ~9.7% (true 0) / ~9.3% (Economy t2_lc1); confirmation cuts that. Options A, B and A′ superseded. No match to 68.33. Re-measure paired SDs on the real hold build; report to HoP if they differ materially | n/a | node |

## MK-59a method (node harness `qa/m3-recheck/mk59a-harness/`)
- Harness: `harness.ts` drives shipped `src/sim` (tick/actions/state/workers) with Economy's seller15 player (from `scratch/mh-hold/svs_mh.py` `run_m2`, VAR_DEFAULT poisson). Aggregate with `aggregate.py`.
- Policy 'seller15' (sells every 15 s, tap 1/s), dt = 1/tickHz (0.1 s at tickHz 10), T = 3600 s.
- Variants: **base** = Features' merged min_wait build (min_wait 2 s, no hold) vs **hold** (hold feature on), with last_chance=1.0 for both. Same game RNG, same seeds.
- **Seeds 1..400**; seed drives the demand RNG; tap variance uses `PyRandom(1_000_003*(seed+1)+17)` (Python `random.Random` port in `pyrandom.ts`).
- Progression: served % per level L = 100 × filled ÷ spawned for customers spawned while at L, pooled across seeds (not a mean of per-seed ratios). **L20 is the non-inferiority gate** (lower 95% bound ≥ −2.0). L3–L25 use the HoP 08:45 confirmation guard (see verdict rule).
- **No absolute match to Economy's 68.33** (dropped; RNG stream differs). Validate harness with base-vs-base on identical seeds → mean diff 0 before trusting a hold run.
- **Re-check:** measure paired SD on the real hold build; if it differs materially from the stand-in SE 0.36, report to HoP before locking the verdict.

## Changelog
- 2026-10-17 ~08:45 (Europe/Belgrade): HoP final guard ruling LOCKED into MK-T59a: if any L3–L25 400-seed mean diff < −2.0, rerun that level at 1,600 paired seeds; FAIL only if rerun mean still < −2.0. Applies to every level. Keep re-measure SDs on the real hold build.
- 2026-10-17 ~08:50 (Europe/Belgrade): Added HoP per-level guard to MK-T59a (FAIL if any L3–L25 mean diff < −2.0; L20 mean info only). Guard false-fail 9.7% (true 0) / 9.3% (Economy effects); full served gate PASS 89.4% under Economy effects; driven by L9–L12 (SE ≈1.0). Flagged to PM/HoP: not "rare".
- 2026-10-17 ~08:44 (Europe/Belgrade): MK-T59a locked to HoP 08:43 non-inferiority ruling. PASS if lower 95% bound of L20 mean served-% diff ≥ −2.0 pts (equiv. mean ≥ −1.29 at SE 0.36). Mean + L3–25 info only. Always: wage/min unchanged, income/min ±0.5%, F2 median ≥ 8. Seeds 1–400, seller15, 3600 s, 0.1 s ticks; base = Features' merged min_wait build. Options A, B and A′ superseded. Power at SE 0.36 noted; re-check SD on real hold build.
- 2026-10-17 (Europe/Belgrade): Retraced to order-chip-and-trickle-proposal.md v0.3 and updated feature-spec.md. Removed the "ACs not testable / rewrite needed" section (all seven rewrites + MK-35 applied). MK-57 → last_chance 1.0 s with sale in [0.9, 1.0] s, never after timeout. MK-40 → live-region throttle 1000 ms. MK-52/53 → "✓ Ready" only when delivered == N; added MK-T53d for preview-reaches-N keeping "F/N · $X" + preview segment only. MK-35 activated (No eggs). MK-59a MUST-CHECK pointed at `qa/m3-recheck/mk59a-harness/`.

## MK-59a verdict rule (HoP 08:43 + 08:45 CEST): non-inferiority — LOCKED
Options A, B and A′ are **superseded**. Method and bar (see MK-T59a):
- Paired base vs hold on shipped code, game RNG, seeds 1–400, seller15, 3,600 s, 0.1 s ticks. Base = Features' merged min_wait build.
- **PASS (L20 non-inferiority, HoP 08:43):** if the lower 95% bound of the L20 mean served-% diff is ≥ −2.0 pts (equivalently, measured mean ≥ −1.29 with SE 0.36). L20 mean diff: info only.
- **Per-level guard (HoP 08:45 CEST) — LOCKED:** if any level L3–L25 has a 400-seed mean served-% diff < −2.0 pts, rerun that level at **1,600 paired seeds**; it **FAILS only if the rerun mean is still < −2.0**. Applies to **every** level L3–L25 (one rule, not L9–L13 only).
- Screen-stage power at 400 seeds (guard.py, stand-in noise; before confirmation): P(screen trip) **0.097** (all true 0) / **0.093** (Economy t2_lc1 effects). P(L20 LB ≥ −2) 0.985 under Economy effects. Worst-level share of screen trips: L10 27%, L12 24%, L9 21%, L11 17%, L13 5%. Per-level SE: L3 0.12, L20 0.36, max L10 1.03 (L9–L12 ≈ 0.95–1.03). Confirmation at 1,600 seeds cuts false fails.
- Always required: wage/min unchanged, income/min ±0.5%, F2 median ≥ 8.
- Power at SE 0.36 (stand-in noise): true 0 → 1.00; −0.48 → 0.988; −1.0 → 0.79; −1.5 → 0.28; −2.0 → 0.025.
- Re-measure paired SDs on the real hold build; report to HoP if they differ materially. Details: mk59a-harness-report.md.
- 2026-10-17 09:03 (Europe/Belgrade): HoP approved MK-21 wording (game-state visible fraction, 100 ms from t=0; >=0.40 at L10/L12/L14 with 1.5 s dwell over 60 s; no-dwell L12 120 s in [0.40, 0.90]). Re-measured SDs on c05c83a (L20 6.57, max L9 17.8) give an estimated guard false-fail of ~4.3%, accepted with the rerun-on-trip rule above. Held Market Hand turns must charge the wage.
