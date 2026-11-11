# v5 streak / tapCoins: browser Art & UX check (2026-11-10, 04:07–04:18 CET, UTC+1)
**Build:** throwaway trial = origin/feat/v5-f6-rebuild **da38e3f** (F6 API v1.0) + v5/ui-streak-tapcoins **c8d75e2** + `f6-swap.diff`. `m4.flags.streak = tapCoins = 1` in the trial tree only (hence `+dirty`, ALLOW_DIRTY=1). Built with `vite build --mode qa`.
**Harness:** `streak-browser.mjs` (this folder): 13 checks per viewport + 1 reduced-motion check. Viewports 360×640, 390×844, 1280×800 (docked). One engine at a time via lane-run, load < 11.
**Result:** **chromium 40/40 · firefox 40/40 · webkit 40/40 · no page errors.** Per-engine logs are in `shots/<engine>-result.txt`.

| Check (ref) | 360 | 390 | 1280 |
|---|---|---|---|
| Collect 48 px at the §9.1 rect (≥ 44 px target); the row band is reserved at s = 0 | ✓ | ✓ | ✓ |
| Bar + label column at the §9.1 rect; `+7% price` | ✓ | ✓ | ✓ |
| Tier-1 pill `Warm streak! +7% price`, 8 px above #meter, inside 8 px edges (combo-tiers §2) | ✓ | ✓ | ✓ |
| Pill and +$ coin pop don't cover Collect / goal / meter or each other (CT-AC8); pop text `+$0.05` | ✓ | ✓ | ✓ |
| Tier 2 `Hot streak! +14% price`, 2 ticks · MAX `MAX +28%` / `MAX +28%!`, gold (#E8B020), 4 lit tabs at 4×16 px (§0/§1) | ✓ | ✓ | ✓ |
| Cooling: stripes, label back to `+N% price`, aria `…, cooling` (§1 MAX row, §3, §6) | ✓ | ✓ | ✓ |
| Market chips: meadow `+14%` on order-card lines + Sell all, 14 px tall (S-AC19) | ✓ | ✓ | ✓ (docked) |
| Reduced motion: no sparks, pill `.rm` fade (CT-AC14) | – | ✓ | – |

**Shots** (`shots/<engine>-<vp>-<state>.png`, states s0 / tier1 / tier2 / max / cooling / market-chips, plus `390x844-rm-tier1`): 19 per engine, 57 total.

## Found and fixed in this pass
- **Lit tick rendered 36×36 instead of 4×16** (all engines). The tier-up class `up` collided with rc/v5's global `.up` (the upgrade card: grid + 16 px padding). Renamed to `streak-up` (c8d75e2), plus a jsdom guard: no styles.css rule may match a streak node (allowlist: `.collectbar>*`, `.num`, `.sr`). The rect checks hadn't caught it; the harness now asserts 4×16 at MAX.
- Harness timing: the pill is now measured in its still phase (≥ 200 ms after the tap, §2), not during its entrance.

## Open (for Art / HoE)
- S-AC19 lists "Sell value" too. The order-card **Sell button** value (`+$45.60`) has no chip. Adding one widens the shared Sell width (MK-24-1 v3, Art-owned). Needs an Art call: in the button, or the line chip covers it.
- The Sell all chip sits on its own line above the full-width button. Art should confirm the placement.
- Sound (f316147, `streak-audio.mjs`, 390×844, sfx on, read from F6 v1.0 `eggfarmQa.audio.log`): Chromium 6/6 and Firefox 6/6 PASS. Tier-up taps log only `streakTier1`/`streakTier2`/`streakMax` with no `collect` (§1); later taps log `collect` at semi +1/+2/+4 (R16, cap +4). WebKit: **not assessed, a known environment limit, not a fail.** This WebKit build can't decode mp3 (QA-D-1030-WKDEPS), so it logs no sound for any hook, built-in `collect` included. The script exits non-zero there only because it found nothing to compare. Results in `shots/<engine>-audio-result.txt`.
- Not covered by this harness: 2×/2×+ Frenzy chips in a real browser (jsdom-tested only), and the CT-AC10 pops interplay with golden UI.
