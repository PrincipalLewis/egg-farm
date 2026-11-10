# Architect review: Breeds UI PR-B at `origin/feat/v5-breeds-ui-prB` d66a726 (code 4c994a7)
**Reviewer:** Architect (PR-A owner, seams owner) · 2026-11-10 03:50 CET · read-only. A detached worktree (`worktrees/rev-prB-d66a726`) was used only for tsc and vitest. No push, no PR action.
**Heads:** `d66a72631c63` = `4c994a7bc65b` + a HANDOFF docs commit. **Delta reviewed:** `bd5b068a..4c994a7` (PR-B only), plus merge `742e122` (parents 6675993 + bd5b068a).
**Contract:** `engineering/design/breeds-ui-seams.md` sha256 `3d40e76e…`. Spec: `product/m5.1-breeds-spec.md` rev 3.8.9 (BR-R12b/c, BR-BB4, §4.3b, AC23b/c, AC33/34, AC52/52b/52c).

## Verdict: **APPROVE with conditions** (0 Blocker, 0 Critical, 1 Major, 5 Minor, 3 nit)
This approves it as a **Draft**. M1 is a hard Ready gate.

## Independent evidence (Node 20.19.2, flock .vitest-eng.lock, nice 10, at d66a726)
- `tsc --noEmit`: **0**.
- `vitest run tests/*breed*.test.ts tests/release-bundle.test.ts`: **14 files, 228/228 pass**. That covers prB a11y, boot, caps, hud, mount, strip, sweep and yard; PR-A ui, hatch, state and qa-seam; k10; and release-bundle 6/6, including flag-0 no-TDZ and ?qaBreeds DCE.
- Author artifacts in `/workspace/artifacts/v5-breeds-ui-prB-4c994a7/`:
  - `SHA256SUMS` checks out: 36/36 OK.
  - `gate-summary.txt` records HEAD `4c994a7bc65b…` and every step at rc 0. `gate-1-test.log` shows **167 files, 2439/2439**, check-globals passes on chromium, firefox and webkit, and the flag-0 release-load passes (appHash `8780ed47…`, errors []).
  - Browser: 6/6 runs ALL PASS, but see m4 on provenance.

## Seams / structure: PASS
- **No `app.ts`, `src/sim/*` or `balance.json` edit.** `git diff --name-status bd5b068a 4c994a7` shows only additions, plus 2 M files. Both are append-only: `breeds-adapter.ts` after L137 and `styles.css` after L724. Nothing of PR-A's is renamed or re-signed (seams §2).
- **Mount:** loaded only through PR-A's eager `breeds-ext-*` glob. `breeds-ext-b.ts` imports only the leaf `./breeds-ext-registry` plus `PRB_EXT`, and its graph doesn't reach breeds-mount, breeds-ui or app, so no cycle or TDZ. Registration is idempotent.
- **ctx:** the countdown uses `ctx.rollingIncomeRate()` and the Hatch tap uses `ctx.openFlock()`. Motion uses `ctx.reducedMotion`.
- **familyClampState:** the chip calls PR-A's `familyClampState('present', …)` first (`breeds-hud.ts:44-48`) and uses the stand-ins only when it returns `undefined`.
  - **Pin test:** not at the reviewed head. Features added it afterwards in **a942dc4** (`tests/v5-breeds-prB-clamp-stub.test.ts`, local in `/workspace/wt-v5-breeds-ui-prB`, not on origin, outside this review). The existing `caps.test.ts:47-50` already pins both branches.
- **Merge 742e122:** clean. `git show --cc` has no resolution hunks. `diff bd5b068a 742e122` is +1519/−0 and touches only PR-B files, so all of PR-A is intact.
- **Flag 0:** every mount returns `null` on `!breedsFlagOn` and mountBreeds never calls onSync. The release-load flag-0 `#app` hash and the boot/mount hash tests pass.
- **Sim boundary:** no sim writes; reads go through adapter getters. UI timers (pop cap, tooltip) use the presentation clock, as the spec intends (pop cap is wall time, spec L468).
- **Release:** PR-B adds no `window.*` handles. QA observability (`prbMounts`, `registerBreedsPrB(opts)`) is module-scoped and has no global. Release-bundle 6/6.
- **a11y:** the chip is `role=button`, tabbable, with no `aria-label`. Its name is the visible "+N%" plus a hidden " active"/" paused", the state goes in `aria-describedby="breeds-hud-state"`, and the tooltip is `aria-hidden`. It has a 44 px `::before` hit area and a 3 px focus-visible ring. Taps on the chip are swallowed so they never count (BR-R17b). The strip's aria is the full "Next goal: Hatch, …" sentence on `#goalDesc`. Yard sprites are decorative (`alt=""`), and `uniquifySvgIds` covers AC33.

## Major
- **M1. While the clamp stub is live, the chip misstates pay (Ready gate).**
  - rc/v5 has **no family clamp in the sim**: `git grep 'lay_cap|cap_bp|clampFamily' -- src` finds only `src/ui/breeds-adapter.ts`.
  - So with PR-A's `familyClampState` stub, the fallback (`breeds-hud.ts:44-48`, `PRB_CAP_STANDINS` `breeds-adapter.ts:165`) shows `clampedBp`. Example: Farm 17 with Leghorn + Ayam Cemani at 2★ shows **+7% while income pays +11.25%** (`caps.test.ts:53`, rawBp 1125 / clampedBp 700).
  - It also disagrees with PR-A's own Present slot card, which shows no max label and raw values while the stub is live (`breeds-ui.ts:118-119`).
  - I keep the fallback as ruled for the Draft. **Condition:** PR-B cannot go Ready or merge while `familyClampState` is the stub. Saves #126 (the sim clamp) and PR-A's clamp-bind must be in the stack first. The fallback, `PRB_CAP_STANDINS`/`capBc`/`familyCapBp`/`clampFamilyBp`/`familyActiveBp` and their tests are then deleted, so the UI keeps no clamp math (one math path, Saves' `clampFamilyBp`).
  - If #126 slips past PR-B's merge window, change the fallback to what the sim pays today, `{rawBp, clampedBp: rawBp, atCap: false}`. That matches PR-A's "undefined ⇒ no max label".

## Minor
- **m1** `breeds-strip.ts:30`: `coins = Math.round(s.coinsCents)` vs the sim's `s.coinsCents < cost` (`sim/breeds-hatch.ts:64`). Coins of 99.6¢ against a 100¢ cost show "Ready" while `startHatch` refuses. Compare unrounded, exactly as the sim does.
- **m2** `breeds-adapter.ts:223` `hatchPriceNowCents` re-derives the price rule from `startHatch` (`breeds-hatch.ts:63-64`, free ? 0 : hatchCostCents). Ask Saves to export `hatchPriceCents(s,b)` and use it in `startHatch`. Until then, add a test that the strip's price equals the `coinsCents` delta from `startHatch`.
- **m3** `breeds-adapter.ts:198` `PresentGateSource.open(s, b, nowMs)` passes a presentation clock into a gate the spec defines on **focus seconds in the sim** (BR-R12b; Saves' planned `presentGateOpen(s, b)`). Drop `nowMs` from the interface so the sim gate fits as is, and make the harness reference gate run on sim state too. The stub ignores it today, so there is no production effect.
- **m4 Browser evidence provenance.**
  - The 6 browser `run.log` files are stamped 03:04–03:08 CET. Commit 4c994a7 is **03:12:42 CET**, and its only change vs 54f6b95 is `scripts/breeds-ui-prB-browser.mjs` itself.
  - `browser.sh` records no HEAD or tree state, so those runs were on an uncommitted tree. src was very likely identical to 4366720/4c994a7, but that is unproven.
  - Make `browser.sh` log `git rev-parse HEAD` and `git status --porcelain`, and rerun at the Ready head. The gate run itself recorded HEAD 4c994a7 and is fine.
- **m5** `breeds-strip.ts:79`: the capture `click` listener on `#goal` itself depends on target-phase ordering against `app.ts:561`'s listener. It is acceptable only because the `#goal` DOM rewrite is Draft-only and is replaced by #100's single goal hook (per the PR body). It is not shippable as is.

## nit
- `breeds-yard.ts` `YARD_FILL_ORDER` copies the local `order` in `app.ts:681`. `yard.test.ts:16` pins the literal, not app.ts, so drift isn't caught. Assert against the app source text, or export the order.
- `breeds-adapter.ts:149` `PRB_STUB_TUNABLES` is production-exported but used only by tests and the harness. Move it to the test fixtures, or delete it with m3.
- FYI (PR-A design, not PR-B's): the eager glob evaluates `breeds-ext-b.ts` and registers `PRB_EXT` even with the flag at 0. It is inert (no DOM, no onSync; flag-0 TDZ test green), but PR-B code ships in the release bundle. The PR body already states this.

## Ready checklist (Architect)
M1 (Saves #126 + clamp-bind in the stack, stand-ins deleted), m1, m3, m4 rerun at the Ready head, m5 (#100 hook replaces the DOM rewrite), then one full gate at the Ready head. Content PASS is separate from hosted CI and the HoQA bar.
