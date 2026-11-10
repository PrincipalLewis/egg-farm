Claude calls used: 1/15 (wrapper log lines: 2026-10-30T09:16:24+01:00, PASS_ID rcv5-vs-main-1a61b36, status ok)

```
223: 2026-10-30T09:16:24+01:00	rcv5-vs-main-1a61b36	code-review	claude-sonnet-5-5/high	ok	331	0	1
verify-claude-verdict.sh: Claude calls used: 1 (status ok) for PASS_ID rcv5-vs-main-1a61b36
```
Raw Claude output: `rcv5-vs-main-1a61b36-ccr-claude-raw.txt` (session 79d6b006).

# Combined review: rc/v5 @ 1a61b36091e634aef87ec6d02866323130a3a7cc vs main @ 22eac98c75b9e82944f34a1feb77830521f34aee

**Claude Code Reviewer (Claude, 1 call) FAIL — blocking/major/minor/nit = 0/1/3/1**

## Scope
- **Diff:** `git diff 22eac98c..1a61b36` (merge-base = main). It covers 29 src/scripts files, +595/−43, plus tests.
- **Included PRs:** #81 F2 406e455, #78 d3b5a53, #77 F1a b563c75, #79 F1b 2fa7318, #88 5e38d91, #80 F1c 6bcc194, #82 F3 1a61b36.
- **Method:** one combined pass, not PR by PR. This replaces the voided 0-call verdicts on #77/#78/#79/#80 for HoE's purposes.
- **rc/v5 head:** 1a61b36 when the review started, and still 1a61b36 at write-up (09:17 CET).
- **Focus:** sim determinism, save compatibility, offline/clock.
- **FAIL driver:** the only FAIL item is O-3 (tooling). Claude found **no sim, save or offline correctness problem with every m4.flags.* = 0**.

## Gates (reviewer-run at 1a61b36)
- npm ci OK and `npx tsc --noEmit` OK.
- `npm test`: 127 files, 1724 passed / 1 skipped, EXIT 0.
- `npm run test:slow`: 16 passed / 1 skipped, EXIT 0.
- `npm run build`: EXIT 0.
- `npm run check-globals`: EXIT 0, 3/3 PASS. Release globals are `["eggfarmExportTelemetry"]` only, and not-allowed is [].
- `npm run verify -- --hours 24 --seed 1 --no-shot`: trace **2c0d3ec37be1**, which equals the pinned 2c0d3ec37be16e…. Goldens flagOff ok (f90d1678) and m4On ok (a54c9cf9). The exit code was 1 only for "build-label: no screenshot: --no-shot", which is expected with --no-shot.

## Follow-ups for HoE triage (Claude findings)
**F-1 — MAJOR (Claude: "HoE may downgrade to minor if the guard can wait for the first feature PR") — O-3 guard missing. Owner: Architect (+ Economy for the bot)**
- **Location:** tests/bot-m5.ts:33-37,84,113,124 (`run`), scripts/verify/sim.ts:77,115-135 (`runM5xCasual`), scripts/bot-m5x.ts:11-15, tests/bot-m5.ts:167 (`windowGate`).
- **Problem:** `rg "flags|anyM5FlagOn|flagOn"` finds no flag check in bot-m5, its test or verify/sim.ts. `run()` drives the real `step()`/`apply()`. With a flag on, `stepTimers` runs while the bot also applies its own golden/streak/tap-coin/Broody/ability/pause effects (tests/bot-m5.ts:56-107).
- **What stops it today:** only an incidental check. `--flags` overrides exit 4 via `flagsDifferFromBuild`, with a generic message. `runVerify()`, `windowGate()` and `scripts/bot-m5x.ts` are unguarded.
- **When it bites:** once a release ships a flag at 1, `npm run verify -- --profile m5x-casual` and `bot-m5x` would run both models silently.
- **Why it's latent now:** the registries hold only `seedEvRng`, so the only visible effect is an extra `evRngState` key in the end state and trace. #87's streak SALE_EFFECTS entry makes it live for streak once #87 merges.
- **Repro:** `runVerify(withFlags(balance, {'m4.flags.golden': 1}), {hours: 0.25, seed: 1, profile: 'm5x-casual'})` returns with no error and `end.evRngState` set. CLI equivalent (reviewer-run at 48b6857, same tree as 1a61b36 for these files): `npm run verify -- --hours 1 --profile m5x-casual --flags m4.flags.golden=1 --no-shot` ran with trace f6f32274d9c0 and exited 4, but only for "--flags differ from the build's shipped flags".
- **Fix:** throw in `run()`/`runM5xCasual`/`windowGate` when `anyM5FlagOn(b)` and the bot's M5 model is on, with the message "bot-m5 models M5 itself; flags must be off". Add a test.

**F-2 — minor — UI previews ignore the attended ctx, and the attended probe is never wired. Owner: UI (F6/#85)**
- **Location:** src/ui/app.ts:607,613 and src/game.ts:394-402.
- **Problem:** `saleValueCents(s,k,b)` and `sellAllPreview(s,b)` default to `PLAYER_SALE`. `Game.dispatch` credits with `attendedNow()`, but the probe defaults to `() => false` and `rg setAttendedProbe src` finds only the definition.
- **Effect:** with any flag on, no focus ever accrues and player sales are credited suspended, while the previews show the uplift. Invisible today because the registries are empty.
- **Repro:** fixture SaleEffect as in tests/v5-f1c-effects.test.ts. Compare `saleValueCents` with the credit from `Game.dispatch({type:'sell'})`.
- **Fix:** pass `game.playerSaleCtx()` into both previews, call `setAttendedProbe`, and add a preview==credit test through Game.

**F-3 — minor — the Broody nest clamp vs the ×10000 scaled representation. Owner: Saves (+Architect)**
- **Location:** src/save/m5-fields.ts:25 (`BROODY_NEST_MAX_CENTS = 1e15`) and :62; src/sim/m5-state.ts:53-55 ("load sets it to broodyNestCents x 10000").
- **Problem:** at the clamp the scaled value is 1e19, above 2^53. Cents stay exact only up to about 9.007e11 cents.
- **Status:** not triggered, since nothing reads or sets `broodyNestScaled` yet.
- **Fix:** clamp at `Math.floor(Number.MAX_SAFE_INTEGER/1e4)` (900719925474), or store cents plus a fractional remainder. Add a boundary test with the Broody PR.

**F-4 — minor — `m5Load` doesn't sanitise pause or streak worker state. Owner: Saves**
- **Location:** src/save/m5-fields.ts:19,56; src/sim/workers.ts (`paused`, `callLockoutS`).
- **Problem:** `anyFlag` omits `pause`, so with only pause on, `m5Load` returns early. `callLockoutS` (NaN→null, negative, 1e308) is never validated.
- **Status:** no reader exists yet. `paused` is safe because `isPaused` needs `=== true`. On rollback, main loads `paused: true` as an ordinary worker and writes it back unchanged.
- **Fix:** sanitise both when the Pause PR lands.

**F-5 — nit — a missing tunable silently becomes 0 in the load clamps. Owner: Economy/Saves**
- **Location:** src/save/m5-fields.ts:20,59 and src/config/m5-rules.ts:12.
- **Problem:** `tc()` returns `?? 0`, and `M5_REQUIRED_TC` is empty.
- **Note:** #87 replaces this with a throwing `tcNum` plus M5_TC_KEYS (see pr87-22b6db4-ccr.md); fold it in there.

## Checked, no issue (Claude + reviewer gates)
**A. Determinism with flags off**
- `step`/`advance`/`apply` are byte-identical to main.
- `live=false` means no fx ctx and no stepTimers, and `layFactor` is an exact ×1.0. `saleMultipliers` returns `[g]`, so the old `m===1 ? k*base : round` path is unchanged.
- No state keys are added with flags off, and `initialState` is untouched.
- Goldens and the 24 h trace are unchanged (see gates).
- No Date.now, performance.now or Math.random in src/sim, src/save/m5-fields.ts or src/config.

**A. Determinism with flags on**
- evRng = mixSeed((rng^salt)>>>0) is seeded once, matching GE-AC33.
- evDraw/brDraw never touch state.rng, and brDraw never advances evRng. brRng is session-only and re-derives after a reload (D-C4).
- The focus clock caps at 1.0 s, and gaps of 60 s or more give 0.

**B. Save compatibility**
- SAVE_VERSION stays 6. `serialize` = `JSON.stringify(m5Persist(state))` gives the same object, so the same bytes, with no session key.
- Main loads a flags-on rc/v5 save without loss or rejection (spread migrate, no strict key check; tests/v5-f2-downgrade.test.ts covers LS, .bak and IDB). Claude did not run main itself.
- Session fields are stripped, and `m5Load` clamps NaN, negative, huge and wrong-type values. `readyAt` is clamped to [now, now+cd].

**C. Offline and clock**
- src/sim/offline.ts is untouched. With flags off, m5Load/m5Offline/m5ShortGap are identity, so offline coins are unchanged.
- With flags on, ≥60 s gaps take the offline path before advance/grantOffline. Negative gaps get focus 0, and future readyAt values are capped to one cooldown.
- Moving the device clock forward skips a wall-clock cooldown. That is by design (abilities E2b).

**D. Money:** cents stay integer and are rounded once. 1e15 < 2^53; the ×1e4 problem is F-3.

**E. Tooling**
- sync-economy --check passes, and keepFlags/keepZeroGain reject unknown or non-0/1 values.
- `verify --flags` rejects values other than 0/1.
- The #88 CSV-fixture parity pin passes.
- No new window globals.
