# #111 golden-game: Architect browser-CI tooling review at 96ac430 (Ready, unmerged)

Date: 2026-11-06 04:01 CET (Europe/Belgrade, UTC+1)  
Lane: architect · PR: https://github.com/PrincipalLewis/egg-farm/pull/111 · **Ready** (not Draft), unmerged  
Exact tip: `96ac430e7c93307081093a3181ad54a09ce17568` · tree `4110ba5185598c5d3a1fcf64d068d063a1d0ca66`  
Parent (PRIOR product PASS inherit tip): `9ee57c0346dc594dabe4ee00845dccb7acbaa588` · tree `2ce96970c4006202ecaa32e3a5145cd8c995e36a`  
Artifact: `/workspace/artifacts/v5-111-browser-ci-96ac430/`  
Delta: **5 files +117** tooling only — `scripts/golden-game-browser.mjs`, `tests/fixtures/golden-game-browser-flag-on.json`, `package.json`, `.github/workflows/ci.yml`, `.gitignore`  
**No** `src/` / `product/` / `public/` / `balance.json` changes (`SRC_PRODUCT_PUBLIC_IDENTICAL=YES`).  
Pattern peer: #116 `abilities-ui-fcf7623-architect-addendum.md` (same CI shape; this gate hard-fails FINAL A / debug-absent rather than leaving critical contracts as INFO).  
Writes: this note + `engineering/status.md` only. **No** source / PR post / Ready / push / merge / messages. **Not** publication or merge clearance.  
**Did not** drive Playwright; author ALL PASS ≠ independent Chromium.

## Verdict: **APPROVE** (bounded tooling) — product PRIOR PASS **carries** (D-HOE-51)

Product content at parent tree `2ce96970` inherits prior Architect PASS (status 2026-11-06: #111 @ `9ee57c0` / `213a182` / `ddc59e7` PRIOR PASS INHERITS; lineage from `a3169ec` restack PASS / FINAL A reviews). This tip adds hosted Chromium GOLDBAR only. Tooling is sound: in-page `golden=1` overlay, QA vs release separation, FINAL A unload order asserted hard, no `?debug=1` panel check under flag 0, failure exit, existing gates preserved.

## Identity

| Check | Result |
|---|---|
| Live / PR head | `96ac430…` **MATCH** |
| Tree | `4110ba51…` **MATCH** |
| Parent | `9ee57c0…` linear; prior tree `2ce96970…` **MATCH** claimed |
| PR | Ready, MERGEABLE, mergeStateStatus **UNSTABLE** (checks in flight) |
| Base | `feat/v5-golden-spawn` `f46544e…` (unchanged by this commit) |
| Product vs parent | empty diff `src/` `product/` `public/` |
| Shipped `m4.flags.golden` | **0** |

## Overlay / QA globals / release

- Fixture `{ m4.flags.golden: 1 }` + `_comment` only; merge onto **live** `window.eggfarm.balance` in `page.evaluate` (`golden-game-browser.mjs:47–53`) — never writes `balance.json`.
- Separate contexts flag0 / flag1.
- Requires `window.eggfarm` / `eggfarmUi` on **`dist-qa`**; CI order: release `build` → `check-globals` on release dist → `build:qa` → browser → upload → `build:html` (same as #116).
- Independent `npm run build` → **check-release-build ok** (`m4.1+96ac430`; no `eggfarmUi`; globals allowlist only `eggfarmExportTelemetry`).

## Browser assertions (static review — not independently executed)

| Assert | Mechanism | Contract fit |
|---|---|---|
| F0-0 | shipped `golden===0` + HEAD build-id | OK |
| F0-1 | no `state.goldenEgg` | OK |
| F0-2 | no `details.dbg` / `#dbgInfo` without `?debug=1` | OK (release strip still `check-release-build`) |
| F1-0 | overlay `golden===1` | OK |
| F1-1 | seed live `goldenEgg` (test-only; not UI spawn) | Sufficient for unload; not a spawn/R14 layout gate |
| F1-2 | `endSession()` → egg gone | Matches `game.ts` `goldenEnd('reload')` |
| F1-3 | `collectible_expired{golden_egg,reload}` **before** `session_end` (+ export JSON cross-check) | Matches FINAL A compose `endSession` L326–330: streakPeak → goldenEnd → session_end → save |

**Not claimed / not covered here:** natural spawn, attendance freeze, R15 layout — out of this GOLDBAR scope; product vitest `v5-golden-game` still owns unit FINAL A (21/21 this turn).

Author NOTES: local ALL PASS F0-0…F1-3 — **not** independent Architect browser evidence.

## CI / cleanup / vs #116

- `process.exit(bad ? 1 : 0)`; upload `if: always()` pinned `actions/upload-artifact@ea165f8…`.
- Gate Draft-skip unchanged; PR is Ready so gate **runs** (observed `42153584911` **in_progress** at exact SHA — **not** SUCCESS this turn).
- `.gitignore artifacts/` — same as #116; no prior tracked `artifacts/` on parent.
- Cleanup: `ctx.close` per section; `br.close(); srv.stop()`; `serveForRun` signals. No try/finally on throw — minor, peer pattern (#116 same).
- Avoids #116 early soft-INFO trap on a hard product contract: FINAL A / debug-absent are **ok()** hard fails.

## Independent gates (this review)

| Gate | Result |
|---|---|
| tsc / sync-economy | **0** |
| vitest `v5-golden-game` | **21/21** |
| `npm run build` (release) | **0** |
| Playwright | **not run** |
| Hosted `42153584911` | exact `96ac430` · status **in_progress** · conclusion empty — **do not cite SUCCESS** |

Evidence: `engineering/reviews/evidence/golden-111-browser-96ac430/` · WT `/workspace/wt-review-111-96ac430`

## Remaining

1. Hosted gate **SUCCESS** at exact `96ac430` (re-read when complete).  
2. HoQA GOLDBAR / browser GO.  
3. Merge clearance is HoE+HoQA after stack HOLD — **this APPROVE is architecture tooling advice only**.
