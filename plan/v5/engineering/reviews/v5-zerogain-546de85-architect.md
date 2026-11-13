# Architect review: PR #97 zeroGainUi (Generalist lane H) @ 546de85

- Reviewer: Senior Software Architect · 2026-10-30 ~14:50 CET (Europe/Belgrade)
- Head: 546de85fa5f32161178c36f102a61025c08ec9d0 (origin), base rc/v5 65a7443
- Spec: product/collection/m5.1-zero-gain-purchase-ui.md v0.3.7, sha1 f86de04e0638e3019f81b1e829321c65ff8f4f98 (matches the cite in code). Errata v0.3.8 sha1 4cfe68953995749b442504dd32e1ea6f5765ddb9.
- Decisions: D-COL-2026-10-30-29 (a)/(b) (product/decisions.md:2108), D-HOE-35 (engineering/decisions.md)
- No Claude review was used.

## Verdict: PASS with Minors

Mergeable at shipped values (zeroGainUi 0, confirm 0). The Minors are cheap, and none blocks the merge. One **ruling is needed from HoE before the 9/n flag flip** (anyM5FlagOn, below). That decision is outside this PR's diff.

## Gates I re-ran (worktree, node 20.19.2, flock + nice, 1 worker)

| Gate | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| Targeted vitest: zg-* (6 files), telemetry, telemetry-m3, m41-p2-ui-dom, m4a-flag-off, ac7-first-purchase, engineering/golden flagoff-golden.a01faea + m4on-golden.90a9c84 | 13 files / 118 tests pass |
| Flag-off goldens f90d1678 / a54c9cf9 | pass (golden files above) |
| Flag-off DOM sha 9c4b6439 (zg-flagoff-dom) | pass |
| `npm run build` + check-release-build | exit 0. Release allowlist: eggfarmRecovery, eggfarmTabGuard, eggfarmExportTelemetry only. 0 zg/QA hook hits in dist. |

I did not re-run the full suite (HANDOFF: 1964 pass / 1 skip). The targeted set covers the touched surface.

## Architecture checks

- **Shared openPanel one-liner (src/ui/app.ts:187):** `if (open === 'upgrades' && ZGC) zgHidden();`
  - Gated by ZGC (zeroGainUi && confirm===1, read once at boot), so it is dead at the shipped config and with the flag off.
  - It sits after the docked early return, so docked desktop never hides the panel and logs no cancel. D-HOE-35 accepts this.
  - zgHidden is a no-op when no strip is open, so other panels are unaffected.
  - Mutant Y2 (gate removed) survives, which is expected: it is an equivalent mutant.
- **UI stays out of the sim:**
  - src/ui/zero-gain.ts is a pure verdict that reads econ best-buy and income read-only.
  - No sim file changed except the telemetry helper.
- **Flag default and flag-off parity:**
  - balance.json:178 has `"zeroGainUi": 0`.
  - The picker, nav dot, row attrs and noGlow all branch on ZG/ZGC. With the flag off they return the old strings, confirmed by the DOM sha and the goldens.
- **Telemetry:**
  - `upgrade.zero_gain` is set after dispatch on the pre-buy verdict (app.ts:263), only with the flag on, only for collection/hens/eggValue. Spec L466.
  - `zero_gain_confirm {upgrade_id, outcome}` is not pinned, so it is ring-trimmed. Spec L467.
  - The pinned schema for 'upgrade' is unchanged apart from the optional field.
- **Exactly one cancel (D-COL-29a):**
  - Verified by code and by mutants across re-tap, tab switch, hiding re-render, panel close, Esc and outside tap.
  - zgClose nulls zgOpen before logging, and zgRevealT is cleared on every close path.
- **Unaffordable row (D-COL-29b):** zgClick opens only when the row has aria-describedby, a ZG kind and `wouldApply`. Otherwise it falls through to the disabled buyRow path, with no strip and no event.
- **CSS:** +13 lines, all scoped under `.up.zg`, `.zg-chip` or `.zg-confirm`. It includes the `zgIn` keyframes and a prefers-reduced-motion override. Nothing global.
- **2×2 matrix (bestBuyV2 × confirm):** the tests are meaningful. Y6 and Y7 are killed by matrix/AC tests, not only by snapshot tests.
- **Spec E16 (L378):** "Buy anyway" with coins < cost logs confirm and makes no upgrade. This is spec-intended, not a bug.

## Mutation spot-check (10 mutants, src restored after each, tree clean)

| # | Mutant | Result |
|---|---|---|
| Y1 | drop the openPanel zgHidden line | KILLED (D-COL-29a panel close) |
| Y2 | openPanel gate made unconditional | SURVIVED, equivalent (no-op when no strip is open) |
| Y3 | zgClose doesn't null zgOpen | KILLED (ZG-AC10 one cancel each) |
| Y4 | zgApply drops the cancel log on a hiding re-render | KILLED (D-COL-29a tab switch) |
| Y5 | remove the re-tap-closes branch | KILLED (re-tap within 350 ms) |
| Y6 | remove the wouldApply check | KILLED (D-COL-29b) |
| Y7 | zero_gain computed post-buy | KILLED (ZG-AC9/AC15) |
| Y8 | double cancel on panel close | KILLED (D-COL-29a) |
| Y9 | 350 ms guard set to 0 | KILLED (UI-ZG-11 +80 ms ignore) |
| Y10 | annotateLast scans oldest-first | **SURVIVED**: zg-* plus telemetry*.test.ts, 91 tests all pass |

Score: 8 of 9 non-equivalent mutants killed.

## Findings

### Minor 1: annotateLast has no direct test, and its newest-match contract is unpinned (src/telemetry/telemetry.ts:73, src/ui/app.ts:263)

Y10 shows that no test separates the newest matching event from the oldest.

The code is correct today for two reasons:
- The 'upgrade' event is emitted synchronously inside act() (actions.ts:35,42).
- 'upgrade' is pinned, so it is never trimmed.

It is fragile, though. If a successful act ever stops emitting 'upgrade', or emits it asynchronously, the zero_gain field silently lands on an older upgrade record.

Fix:
1. Add a telemetry unit test with two 'upgrade' events, asserting that only the newest is annotated and the file is marked dirty.
2. Optionally have buyRow assert that the newest 'upgrade' event matches the level just bought (DEV-only), or pass zero_gain through the event payload instead of mutating it after emit.

### Minor 2: an unrelated re-render can move focus from Cancel to "Buy anyway" (confirm=1 only) (src/ui/app.ts:272-273, :732)

How it happens:
1. `uRow.innerHTML = html` (:732) destroys the focused strip button, so activeElement becomes body.
2. zgApply then focuses `[data-zg=confirm]`.
3. The 350 ms guard (`zgOpen.at`) is not re-armed.

The trigger can be something as small as an ETA or cost text change while the strip is open. A keyboard user resting on Cancel who presses Enter would then buy.

I found this by reading the code; I did not reproduce it in a test.

Exposure is zero at ship (confirm 0). Fix before any confirm=1 experiment:
- Remember which `data-zg` button had focus before the innerHTML swap and restore that one.
- Or only auto-focus on the opening render (zgOpenStrip), not in zgApply.

Add a test: open the strip, focus Cancel, force a re-render, then check that the focus is still on Cancel.

### Nits

- N1, src/ui/app.ts:305-306: dead duplicate `return true;`.
- N2, src/ui/app.ts:311, :316: the uRow keydown and document capture pointerdown listeners are never removed. This is acceptable for mountApp's lifetime. Add a comment, or use an AbortController if mountApp ever remounts (tests).
- N3, src/ui/app.ts:584: noGlow depends on an exact string replace of `class="btn buy affordable"`. Any attribute reorder breaks it silently. Prefer passing a `glow` boolean into the template. The flag-off DOM sha test only guards the off path.

## Ruling needed from HoE before the 9/n flip (not blocking at flag 0)

`anyM5FlagOn` (src/sim/timers.ts:27, using M5_FLAGS in src/config/flags.ts:8-10) includes the **UI-only** flags zeroGainUi and bestBuyV2. Turning on either flag therefore turns on:
- sim F1c fx suspension (src/sim/tick.ts:28)
- the attended probe (src/game.ts:405)

That is why the HANDOFF's 9/n flip breaks 12 tests, including f1b "probe never read".

Architect recommendation: split the list.
- Add a `SIM_M5_FLAGS` list (the M5 flags that change the sim) that excludes UI-only flags.
- Use it in anyM5FlagOn.
- Do this in its own small PR, with the m4on/flag-off goldens re-run, before zeroGainUi flips.

Flipping as-is would couple a UI flag to sim behaviour and would also move the m4On golden.

## Must-fix before merge

None.

## Before any confirm=1 / flag flip

- Minor 2.
- The anyM5FlagOn split.
- Minor 1 is recommended before the flip.
