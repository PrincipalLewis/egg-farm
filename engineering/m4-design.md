# M4 design and task split — Senior Software Architect · draft v0.1 · 2026-10-16

Base: `origin/main` @ `a01faea` (save v4 `aaaa91a` + save-recovery dialog). M4-A baseline: `m4/m4a-tracks` @ `04e2709`
(19 commits on merge-base `4aadcbf`; `m4/m4a-tracks-v2` not pushed yet). Inputs: engineering/stack-and-architecture.md,
sim-rules.md, decisions.md, status.md; product/farm/m4a-spec.md v1.5; product/m4-manage-proposal.md; product/m4-monetisation-proposal.md.

> **Version numbering, read first.** "save v4" in branch/tag names (`m3-rc1-save-v4`) is the *4th iteration of the
> save-durability work*, not the schema. Main ships **`SAVE_VERSION = 6`** (src/save/save.ts). The M4 migration is
> therefore **v6 → v7**, exactly as m4a-spec §10 says. (manage-proposal §9/§10 still say "v5→v6"; that text is stale.) See ADR M4-1.

## 1. Goals and scope
**Goal:** ship M4 "Manage" in thin, independently mergeable slices behind flags, with main always releasable and flag-off
bit-identical to rc1 behaviour.

| Slice | Content | Spec status |
|---|---|---|
| **M4-A** (first) | Farm/Hens/Egg value tracks, caps, milestones, Balanced bonus, +12% move, Grader stacking, 3-row Farm tab, best-buy highlight, next-goal, v6→v7 migration + refund guard + backup, explainer, telemetry, TR-5 gate | spec v1.5, approved |
| M4-B | Golden egg + Frenzy (×2 price 30 s) | proposal §2.3, spec pending |
| M4-C | Per-worker Pause/Resume | spec approved (workers §3) |
| M4-D | Market completion bonus + Focus/Bulk; queue-leave penalty (MK-27..33) | proposal §2.7, §12 |
| M4-E | Cooldown ability + Activate-all; collect streak (last, full-stack ratio check) | proposal §2.4–2.5 |
| M4-M | Monetisation: rewarded 2× offline, timed boost, stubbed IAP | monetisation proposal, CEO open Qs |

Out of scope: prestige, achievements, VIP orders, offline-rate changes (m4a-spec §1). M4-B..M only start after M4-A merges.

## 2. Module boundaries
Rule (unchanged from M1): `sim/` pure and deterministic; `config/` is generated from economy.csv; `ui/` reads state and
dispatches actions; `save/` owns versions, migrations and storage; `telemetry/` only observes events.
New in M4: **`econ/`** (added by M4-A: `best-buy.ts`, `income.ts`) = pure read-only derived economics (income/s, payback,
best buy) used by UI and bots; it may import `config/` and `sim/` types but never mutates state and `sim/` never imports it.

| Module | Today | M4 touches | Boundary rules |
|---|---|---|---|
| `config/` (balance.json, balance.ts, formulas.ts) | CSV → JSON via sync-economy | `balance.m4.*` (tracks, caps, milestones, grades, balanced, `enabled`); later `m4.features.*` for B..E | All numbers from economy.csv; `sync-economy --check` must stay clean. Formulas are pure `(level, b) → number`. Validator rejects bad m4 config at load. |
| `sim/` | state, tick, actions, offline, workers, events | `tracks.ts` (dispatch flag on/off), new state fields, `buyTrack` action, milestone events, offline mult (with first-grant ×1.0, M4A-30) | Every M4 helper returns the pre-M4 value when the flag is off (`m4a-flag-off.test` golden). No DOM, no clock, no storage. |
| `econ/` | (new) | best-buy, income, payback | Pure, read-only; shared by UI highlight (M4A-18) and test bots. |
| `save/` | save.ts chain v1..v6, autosave, idb-mirror, tab-lease, tab-guard | v7 migration wired, validator ranges, `v6_backup` write, newer-save refusal hardening, `seenTracksExplainer` | **Migrations live in `save/migrations/`**; the price-matched search is a pure function imported from `sim/migrate-v7.ts` (moved to `save/migrations/v7.ts` in S-1). Only `save/` knows storage keys. |
| `ui/` | app.ts, next-goal, workers-ui, save-recovery… | `tracks-ui.ts`, `pick-hysteresis.ts`, bonus strip, milestone toast, explainer coach mark | No economics in UI: uses `econ/` + `sim/tracks.ts`. Copy strings only from Art & UX docs / economy copy check. Scope CSS (`.tracks-*`, avoid repeating R1 unscoped `.recovery-card`). |
| `telemetry/` | ring + pinned events, JSON export | new events + fields (§5) | Only reads events/state snapshots; pinned list updated; schema test. |

## 3. Save migration v6 → v7
**Schema (v7 adds):** `hensLevel:int`, `eggValueLevel:int`, `celebratedMilestones:string[]`, `migrationRefundCents:int (default 0)`,
`seenTracksExplainer:boolean` (UI pref, stored with the save so it can't desync). Nothing else changes; `collectionLevel` keeps paid levels.

**Migration function** `migrations[6] = (d, b) => v7` in the existing chain (save.ts), calling pure `migrateTracksV7(state, b, opts?)`
already on m4a-tracks (`src/sim/migrate-v7.ts`):
1. `hensLevel = farmLevel`.
2. `eggValueLevel` = lowest V in 0..30 (no F+3 cap, B1) with integer-cents v7 price ≥ v6 price (one half-up rounding, M4A-5).
3. Clamp above `maxLevel` only; refund removed levels at the CSV cost column into `coinsCents` and `migrationRefundCents` (0 with current data).
4. Seed `celebratedMilestones = reachedMilestones(...)` silently.
5. Mark load as "migrated this session" (drives explainer + first offline grant ×1.0); emit `save_migrated` once.
Note: the chain must pass `balance` into migrations (today `migrations[n](d)` takes no balance) — small signature change, S-1.
The migration runs **regardless of `m4.enabled`** (state schema is flag-independent; flag gates behaviour only), see ADR M4-2.

**Load order (M4A-30):** read → newer-version check → `v6_backup` write → migrate → validate → offline grant (×1.0 on the first
grant) → commit v7 at next save point.

**Rollback (M4A-31):**
- Backup: raw v6 bytes to `eggfarm.save.v6_backup` (localStorage) + IDB `eggfarm/save/v6_backup`, write-once; v7 committed only
  after backup succeeds; if backup fails → abort migration, keep playing on v6 in memory, show the existing "Saving is paused" path? **(open Q3)**.
- Older builds: rc1 already refuses `version > SAVE_VERSION` (`newerSaveVersion`, `.newer-save` layer). Gap: spec requires *zero writes*
  while refused (no autosave, pagehide, .bak rotation, IDB mirror, second tab). Needs an audit + browser test on main **before** v7 ships.
- Server-side rollback is impossible (no backend), so the flag cannot roll back a schema; rollback = ship a build whose v7 loader
  ignores track fields when the flag is off (already true), never a build with SAVE_VERSION 6 again.

**Tests:** chain v1..v6 → v7; all 21 spec fixtures + 961-save sweep (exists); refund via lowered-max table (exists); idempotent reload
(refund once, explainer once, milestones not replayed); offline order (19800/24750, 9900/12375); backup write-once + backup-failure abort;
validator ranges; `m4-v7-*-F{f}-C{c}` fixture files + `SHA256SUMS.txt`; 3-engine browser test: rc1 build opens v7 fixtures → storage byte-identical.

## 4. Feature-flag strategy
- **Mechanism:** build-time config in `balance.json` (from `data/economy-config.json`), not runtime remote flags (no backend).
  `m4.enabled` (0/1) gates all M4-A behaviour; later slices get `m4.features.{goldenEgg, pauseResume, marketBonus, abilities, streak, ads}`
  each 0/1, all requiring `m4.enabled`.
- **Defaults:** shipping default 0 until QA PASS + TR-5 PASS; QA/playtest builds flip via `build:qa` mode (`--mode qa` reads an override), never by
  editing the CSV on main. Debug panel may toggle in dev builds only; `check-release-build` must assert release builds carry the committed default.
- **Invariant tests:** per flag, a flag-off golden hash test like `m4a-flag-off.test.ts`; regenerate golden only with a reviewer-approved commit.
- **Removal:** once a slice ships default-on for one release with no rollback, delete the off path and the golden (task F-9).

## 5. Telemetry fields (M4A-34 + proposal §8)
| Event | Fields | Pinned |
|---|---|---|
| `upgrade` (changed) | + `track: farm\|hens\|egg_value\|collection`; keeps `newLevel, cost, coinsBefore`; `upgrade` alias kept 1 release | yes |
| `milestone_reached` (new) | `track, level, mult` | yes |
| `balanced_tier` (new) | `tier, min_level` | yes |
| `save_migrated` (new) | `from:6, to:7, refund_cents, farm_level` (+ `backup_ok`, proposed) | yes, once |
| `tracks_explainer` (new) | `action: shown\|dismissed` (+ `via: button\|tap\|esc\|timeout`, proposed) | yes |
| `worker_hire`, `worker_yawn` | + `hens_level, egg_value_level` | as today |
| `session_start/end` | + `farm_level, hens_level, egg_value_level, collection_level`, + `m4_flags` (proposed: bitmask of enabled flags so playtest data is attributable) | yes |
| later slices | `worker_paused/resumed`, `collectible_*`, `frenzy_*`, `ability_activated`, `streak_peak`, `order_completed_bonus`, `market_mode_changed` | per spec |
Rule: new events only emitted with their flag on; a telemetry schema test pins event names + field types.

## 6. CI gates
Existing (must stay green on every PR): `vitest run` (464 on main), `tsc --noEmit`, `check-economy-copy`, `sync-economy --check`,
`vite build` + `check-release-build`, `check-globals`, QA build, rc0 browser suite on Chromium/Firefox/WebKit.
New for M4:
1. **flag-off golden** (`m4a-flag-off.test`) — required; golden is pinned to main's trace.
2. **migration fixture suite** + SHA256SUMS check of `tests/fixtures/saves`.
3. **TR-5 pacing gate** (bot 30 seeds, L@30 band; known FAIL at F25 for 60-min variant → run as *reporting* until Economy's L24–29 fix, then blocking).
4. **rollback browser test** (rc1 build × v7 fixtures, 3 engines, storage byte-identical).
5. **telemetry schema test**.
6. **release-default check**: release build has `m4.enabled` = committed default and no debug toggles.
No CI service is configured in-repo today (gates run locally by the merging engineer and recorded in status.md); proposing a
`scripts/gate-all.sh` so everyone runs the identical list (task X-1).

## 7. Architecture risks
1. **Version confusion (v4/v5/v6/v7)** across docs → wrong migration target. Mitigation: ADR M4-1, fix proposal text.
2. **m4a-tracks is 19 commits behind main's save work** (based on `4aadcbf`, before save v4 + dialog); `merge-tree` shows a conflict in
   `src/ui/styles.css` and semantic overlap in save.ts/game.ts load path. Rebase (v2) must re-verify flag-off golden against *a01faea*, not 4aadcbf.
3. **One-way door:** once a player's save is v7, rc1 cannot write it; any bug in the refusal "no writes" rule loses data. Must harden + test on main first (S-2 before S-3).
4. **Backup storage quota**: doubles save footprint in localStorage; on quota failure the migration aborts → player stuck on v6 forever. Need retry policy.
5. **Migration needs balance** (price-matched search depends on economy.csv); a later CSV change silently changes migration output for not-yet-migrated players. Mitigation: freeze the v6→v7 price table as a fixture snapshot in the migration test.
6. **payout.ts base price** must come from `salePriceCents` (comment in tracks.ts) — fix/rc1-qa-bugs branches may reintroduce direct `eggPriceCents` calls. Add a grep/unit guard.
7. **UI churn in app.ts** (65-line diff, shared with rc2 UI work by e80556fd) → merge conflicts. Keep M4 UI in `tracks-ui.ts`, app.ts only wires.
8. **TR-5 known FAIL** could block ship; gate classified reporting until Economy decision.

## 8. Task breakdown (one area per PR)
Owners: **SAV** = Saves 3ba38cf3 · **UI** = e80556fd · **FE** = Features/Economy 95daf662 · **ARCH** = Architect (review/tooling).

| ID | Task (PR) | Owner | Depends on | Size |
|---|---|---|---|---|
| A-0 | Rebase m4/m4a-tracks onto a01faea → `m4/m4a-tracks-v2`; resolve styles.css; regenerate flag-off golden vs a01faea; all gates | FE | — | M |
| X-1 | `scripts/gate-all.sh` + telemetry schema test skeleton | ARCH | — | S |
| S-1 | Migration chain takes `balance`; move `migrate-v7.ts` → `save/migrations/v7.ts`; still not wired (SAVE_VERSION 6) | SAV | A-0 | S |
| S-2 | Newer-save refusal = zero writes (autosave, pagehide, .bak, IDB mirror, 2nd tab) + 3-engine test, **on main** | SAV | — | M |
| S-3 | `v6_backup` write-once (LS + IDB), abort-on-failure, unit tests | SAV | S-1 | M |
| S-4 | Wire `migrations[6]`, SAVE_VERSION 7, validator ranges, `migrationRefundCents`, `seenTracksExplainer`; chain + idempotence tests | SAV | S-1, S-3, S-2 | M |
| S-5 | Load order + first-offline-grant ×1.0 (M4A-30) tests | SAV | S-4 | S |
| S-6 | `m4-v7-*` fixture files + SHA256SUMS; rc1-build × v7 rollback browser test (3 engines) | SAV | S-4 | M |
| F-1 | Merge O1/O3 CSV columns into economy.csv (with Economy); sync-economy --check | FE | A-0 | S |
| F-2 | Telemetry: `upgrade.track`, new events, session/worker fields, pinned list | FE | A-0, X-1 | S |
| F-3 | `save_migrated` emit | FE | S-4, F-2 | S |
| F-4 | TR-5 gate test (reporting) + payout base-price guard | FE | F-1 | S |
| F-5 | Flag plumbing: `m4.features.*`, QA-mode override, release-default check | FE | A-0 | S |
| U-1 | Rebased 3-row Farm tab + highlight + bonus strip polish, scoped CSS, screenshots 360/1280 | UI | A-0 | M |
| U-2 | Milestone toast (once, never on migration) | UI | U-1 | S |
| U-3 | Tracks explainer coach mark (M4A-33: non-blocking, pass-through tap, reduced motion, a11y) | UI | S-4, U-1 | M |
| U-4 | `tracks_explainer` telemetry + rc0 cases (3 engines) | UI | U-3, F-2 | S |
| Q-1 | QA build flag-on + playtest; Code Reviewer pass; flip default only on PASS | FE (+QA) | all above | S |
| F-6.. | M4-C Pause/Resume → M4-D market → M4-B golden egg → M4-E abilities/streak, each: sim PR (FE), UI PR (UI), save field PR if any (SAV, v7→v8 only if needed) | FE/UI/SAV | Q-1 | — |
| F-9 | Remove M4-A flag-off path one release after default-on | FE | Q-1 + 1 release | S |

**Ordering:** parallel start: A-0 (FE), S-2 (SAV on main), X-1 (ARCH). Then S-1→S-3→S-4→S-5/S-6 (critical path, ~2–3 days);
F-1/F-2/F-5/U-1 in parallel after A-0; U-3 after S-4; Q-1 last. Merge order into main: S-2, X-1, A-0 (flag off), S-1, F-*, U-1/U-2, S-3, S-4+F-3 together, S-5, S-6, U-3/U-4, Q-1.

## 9. Open questions
1. Backup-write failure: keep the session on v6 silently, or show the "Saving is paused" dialog? Retry each load? (HoE/Saves)
2. Does `migrateTracksV7` run with flag off (my ADR says yes)? Confirms that a flag-off release still writes v7 — Product/HoE sign-off needed because it makes the rc1 → M4 build a one-way door even with the flag off. Alternative: gate the SAVE_VERSION bump with the flag (two save versions per build; I recommend against).
3. TR-5 blocking vs reporting until the L24–29 ×0.70 fix lands. (QA/Economy)
4. Is `m4/m4a-tracks-v2` rebased onto a01faea or aaaa91a? Golden must be regenerated on the final base.
5. `rc1-guard-save-qa.mjs` lives in qa/m3-scripts outside the repo; needs v6→v7 bump owner (QA).
6. Should CI move to a hosted runner (GitHub Actions) — no spend implied for public minutes, but private repo minutes may cost.
