# Stack & Architecture (M1) — Head of Engineering, 2026-10-15
## Stack
- TypeScript (strict) + Vite; npm only, no backend, no accounts.
- UI: plain DOM + CSS (idle game = mostly panels/buttons/numbers). Optional single Canvas for farm scene later; no framework/engine in M1.
- Tests: Vitest (sim/economy unit tests, headless; `npm test`, plus `npm run test:slow` via vitest.slow.config.ts). Lint: **ESLint and Prettier are not configured yet** (planned in M1; no config and no CI lint step at 22eac98; tracked as LINT-1, parked). `tsc --noEmit` (strict) runs in every build.
- Saves: localStorage (versioned JSON + migrations) plus an IndexedDB mirror (`src/save/idb-mirror.ts`, M4-11/M4-19), export/import string for QA.
- Static build (`vite build` → `dist/`) → runs from any static host/local file server. Release asset: single-file `dist-html/egg-farm.html` (`npm run build:html`), checked by `scripts/check-release-build.mjs` (build id `m4.1+<short sha>`).

## Architecture
- `sim/` pure, deterministic, UI-free. `state + dt → state`. Fixed tick (10 Hz) via accumulator; same function powers offline progress.
- `src/config/balance.json` — all economy numbers (egg rates, prices, customer demand, upgrade costs/curves). Product owns; validated by a schema at load.
- `ui/` reads state, dispatches actions (`collect`, `sell`, `buyUpgrade`); never mutates state directly.
- `save/` serialize, version, migrate; autosave every 10s + on `visibilitychange`.
- Offline progress: on load, `elapsed = now - lastSaved`, capped (config, e.g. 8h), simulated in coarse steps; show "while you were away" summary.
- Numbers: JS `number` + formatter (K/M/B) in M1; revisit big-number lib if Product's curves exceed ~1e15.
- Debug panel (dev builds): time-skip, add coins, reset — for QA.

## Module boundaries (refreshed 2026-10-28 by Senior Software Architect, at main 22eac98)
- `src/sim/` pure and UI-free (tick, actions, workers, offline, tracks, `migrate-v7.ts`); `src/econ/` (income, best-buy) pure read-only derived economics, never imported by `sim/` (ADR M4-3). Note: ADR M4-3 says migrations live in `save/migrations/`; at 22eac98 there is no such dir: the v7 migration is `src/sim/migrate-v7.ts` and the save migrate path is in `src/save/save.ts`.
- `src/save/` (save/validate/migrate, autosave, IDB mirror, tab guard/lease), `src/ui/`, `src/telemetry/`, `src/debug/` (`?debug=1` chunk only), `src/platform/`.
- `tests/` bots (`bot.ts`, `bot-m2.ts`, `bot-m4.ts`) drive the real sim; AC7 and the GOLDEN1 hashes (`engineering/golden/*.test.ts`) are built on them.
- **`scripts/` is tooling only.** It may read `src/` and `tests/` but never writes `src/`. The verify tool (`scripts/verify.ts` + `scripts/verify/`) imports `src/config` (balance, formulas), `src/sim` (state, tick `advance()`/`step`, actions, offline, workers), `src/save/save.ts` (`save()` into an in-memory store, `validate()`) and the `tests/` bots (which in turn read `src/econ/best-buy.ts` and `src/ui/next-goal.ts`). It writes only `dist-html/` (through `build:html`), `<out>/verify.json` + `verify.png` (default `verify-out/<buildId>/`, git-ignored) and a temp dir. See ADR VER-1 in decisions.md.

## Tooling & CI (as in .github/workflows at main 22eac98)
- **Local gate commands:** `npm test` (sync-economy `--check` + vitest), `npm run test:slow` (vendor pins + slow suites), `npm run build` (sync-economy `--check`, `tsc --noEmit`, `vite build`, check-release-build on `dist`), `npm run build:html`, `npm run check-globals -- <engine>`. `scripts/gate-all.sh` (ADR M4-7) is not on main at 22eac98.
- **`npm run verify -- --hours N`** (VER-1, PRs #71-#76, D-CEO-20261027-02): builds the html from HEAD, runs N h of seeded fixed-step play, checks GOLDEN1 flagOff `f90d1678` / m4On `a54c9cf9` (enforced), reports the AC7 trace hash (24 h seed 1 `2c0d3ec3…`; **reported but not enforced**, pin = VER-1g, parked), round-trips the end-state save under the shipped balance, screenshots the build label, writes `verify.json` (schemaVersion 4). Exit 0 PASS, 1 check/throw, 2 usage, 3 build, 4 save round-trip or `--flags` differ from build (4 wins over 1). Details: `scripts/README.md`, ADR VER-1.
- **`ci.yml` (CI diet, D-CEO-20261024-02, PR #68):** triggers on push to `main` and `pull_request` opened/synchronize/reopened/ready_for_review; paths skip Markdown and `docs/` except `vendor/**`, `README.md`, `public/**`, `tests/**` (so a docs-only PR gets no CI run). Concurrency keyed on PR number, else the commit SHA; cancel-in-progress only on PRs.
  - One `gate` job (30 min), skipped for Draft PRs: `npm ci`, `npm test`, `npm run test:slow`, `npm run build`, check-globals chromium, `npm run build:html`, `check-release-build --build-id <prefix>+<short sha>`, upload `egg-farm-html` (14 days).
  - `release-globals` matrix (webkit, firefox; 20 min each) `needs: gate` and runs only on pushes to `main` or PRs whose head is `rc/*`. Draft PRs skip it because gate is skipped.
  - Actions pinned to SHAs (checkout v4.4.0, setup-node v4.4.0, upload-artifact v4.6.2), Node 20.
- **`verify-smoke.yml`:** `verify --hours 1` on the PR head only on `ready_for_review` or `workflow_dispatch`; uploads `verify-out` (14 days); non-required.
- **`release-asset.yml`:** on release published/edited or dispatch, downloads every attached `.html` and runs `check-release-build --build-id <prefix>+<tag commit>` on it; its action SHA pins and the Node 22 bump are parked until after M4.1 Latest.
- Branch protection: not available on this repo (API 403), so no check is required; "green CI" is enforced by process.
- Note: ADR M4-7 ("CI runs locally via scripts/gate-all.sh; no hosted Actions minutes without CEO approval") predates the hosted workflows above (CEO-approved CI diet D-CEO-20261024-02).

## Changelog
- 2026-10-28 07:55 CET · Senior Software Architect · ARCH-DOC-1: Stack lines corrected to the repo (no ESLint/Prettier config, IDB mirror, single-file html, `src/config` path); added Module boundaries and Tooling & CI sections (verify tool, ci.yml gate/matrix/draft rules, verify-smoke). M1 Architecture bullets above kept as written.
- 2026-10-28 08:10 CET · Senior Software Architect · Stack: ESLint/Prettier marked "not configured yet" (LINT-1, parked).
- 2026-10-28 08:10 CET · Senior Software Architect · Tooling & CI: the verify AC7 trace hash is labelled "reported but not enforced" (VER-1g, parked).
- 2026-10-28 08:10 CET · Senior Software Architect · Note: ADR M4-3 (migrations path) and ADR M4-7 (CI) are corrected in decisions.md (entry 2026-10-28 08:10 CET).
