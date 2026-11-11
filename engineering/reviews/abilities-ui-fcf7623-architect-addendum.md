# #116 abilities UI: Architect browser-CI tooling review at fcf7623 (Draft)

Date: 2026-11-06 03:10 CET (Europe/Belgrade, UTC+1)  
Lane: architect · Prior content APPROVE: `abilities-ui-9ee76a0-architect-addendum.md` @ `9ee76a0` / tree `c914276…`  
Exact tip: `fcf76237dca81039b1f4fcf473b7a9090f9f45ed` · tree `ec0bf3bb819800d3123eb9db96c568ebd8e77633`  
Parent: `9ee76a0…` · Artifact: `/workspace/artifacts/v5-116-browser-ci-fcf7623/`  
Delta: **5 files +120/−1 tooling only** — `scripts/abilities-ui-browser.mjs`, `tests/fixtures/abilities-ui-browser-flag-on.json`, `package.json`, `.github/workflows/ci.yml`, `.gitignore`  
**No** `src/` / `product/` / `public/` / `balance.json` changes (`SRC_PRODUCT_PUBLIC_IDENTICAL=YES` vs content APPROVE).  
Writes: this addendum + `engineering/status.md` only. **No** code / PR post / Ready / push / merge / messages. **Not** publishing authority.  
**Did not** drive Chromium/Playwright this turn (per task); independent static/unit/release only + static review of script/CI + inspection of recorded author `browser-run.log`.

## Verdict: **APPROVE** (bounded tooling delta)

Content APPROVE at `9ee76a0` **carries** (product identity unchanged). Browser CI gate is architecturally sound: test-only in-page flag overlay, QA build separate from release, failure exits non-zero, existing gate steps preserved, Draft-skip policy unchanged.

## Product / overlay / QA globals

| Check | Result |
|---|---|
| Product tree vs `9ee76a0` | identical (`src/` `product/` `public/` empty diff) |
| Shipped `m4.flags.abilities` | **0** (verified on tip) |
| Overlay fixture | `{ m4.flags.abilities: 1 }` + `_comment` only; applied via `page.evaluate` merge onto **live** `window.eggfarm.balance` (`abilities-ui-browser.mjs:60–65`) — **never** writes `src/config/balance.json` / disk |
| Contexts | separate Playwright contexts for flag0 vs flag1 (no save/balance bleed between sections) |
| QA globals | script requires `window.eggfarm` / `eggfarmUi` on **`dist-qa`** only; CI runs `npm run build` + `check-globals -- chromium` on **release `dist/` first**, then `build:qa` + browser — release strip of QA hooks preserved |
| Release build (independent) | `npm run build` → **check-release-build ok** (`m4.1+fcf7623`; no `eggfarmUi`; globals allowlist) |

## Assertion coverage (static + recorded log — not independent browser)

**Flag 0 (shipped):** open / close / reopen / mid-close settle / switch to Market / reload / **no call buttons** (F0-0…F0-7). Real DOM via `#panel-layer` / `#p-upgrades`. Note: F0-4 mid-animation is weak for sync `openPanel(null)` hide (author NOTES honest); **not** a false pending-close claim — pending transform is asserted under flag-on (F1-2 / O1 / O2 use `translateY` matrix).

**Flag on (overlay):** Workers call buttons; **O1** real `setViewportSize(DOCKED)` mid-pending + sheet hidden + `activeS` countdown (attendance not frozen); late `transitionend` after dock; **O2** real reopen + synthetic late `transitionend` must not hide; close after reopen.

**Not in browser script (still covered by product vitest @ content APPROVE):** `ability_blocked` telemetry; harness `ui.sheetCloseComplete`; jsdom O1/O2 unit edges. Acceptable split for this tooling delta — do not widen without a real gap.

**INFO (not gated):** Workers tab @360 horizontal overflow under flag on (`scrollWidth 417 > 360`) — route UI QA / Art; correctly non-blocking.

Author recorded log claims **16 PASS / 0 FAIL / ALL PASS** — **not** treated as independent Architect browser evidence.

## CI / security / cleanup / gates preserved

- `process.exit(bad ? 1 : 0)` — failure propagates; upload `if: always()` pinned `actions/upload-artifact@ea165f8…` (v4.6.2).
- Gate `if: !draft` unchanged — Draft hosted checks **skip** (observed `42148213243` skipping); browser step runs when Ready / non-draft per existing diet.
- Order: unit → slow → **release build** → chrome → **release globals** → **QA build + abilities-ui-browser + upload** → build:html — existing release bar not replaced.
- `.gitignore artifacts/` — no prior tracked `artifacts/` on `9ee76a0`; shots stay out of tree.
- Cleanup: `ctx.close` per section; `br.close(); srv.stop()`; `serveForRun` SIGINT/SIGTERM. No try/finally on mid-script throw — **minor**, peer pattern; CI job teardown still kills processes.
- Chrome `--no-sandbox` — CI-typical; no new secrets.

## Independent gates (this review)

| Gate | Result |
|---|---|
| tsc / sync-economy | **0** |
| vitest `v5-abilities-ui` | **15/15** |
| `npm run build` (release) | **0** check-release-build ok |
| Hosted one-shot | Draft **skipping** — **not** SUCCESS |
| Playwright browser | **not run** (task forbid); need parent **computerUse** / Ready hosted Chromium if independent browser re-verify required |

Evidence: `engineering/reviews/evidence/abilities-ui-116-fcf7623/` · WT `/workspace/wt-review-116-fcf7623`

## Remaining

1. Hosted gate **SUCCESS** at exact tip after Ready (Draft skip expected today).  
2. HoQA GO (UI overflow INFO + browser plan).  
3. Optional: parent computerUse re-run `npm run build:qa && npm run abilities-ui-browser` for independent Chromium evidence.  
Stay Draft; content+tooling APPROVE ≠ merge/publication authority (D-HOE-52).
