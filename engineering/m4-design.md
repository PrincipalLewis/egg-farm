# M4 design and task split — Senior Software Architect · v0.2.4 (HoE-approved decisions 9.1–9.9; review m4-design-v0.2-ad10a08; Saves QA guard-prep answers §3a) · 2026-10-16

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

## 3. Save migration v6 → v7 (v0.2: dual-write by flag, ADR M4-4)
**Schema (v7 adds):** `hensLevel:int`, `eggValueLevel:int`, `celebratedMilestones:string[]`, `migrationRefundCents:int (default 0)`,
`seenTracksExplainer:boolean`. Nothing else changes; `collectionLevel` keeps paid levels.

**Interim (ADR M4-8, 9.8): `tracksV7` marker inside v6.** `m4/m4a-tracks-v2` @ `3351d6c` keeps `SAVE_VERSION = 6`. With M4 on, a save with no
`tracksV7` marker (v1..v6) is price-matched once through `migrateTracksV7` and gets marked `tracksV7: 1`; new M4 farms are marked at creation.
This is allowed **only in playtest and M4-flagged builds, never as a release default**. Flag-off builds must load a marked save normally
(ignore or keep the marker and track fields) and must **never strip them on write**. S-2 is unaffected because a marked save is still v6.
**At `3351d6c`, M4-on saves are v6 with `tracksV7: 1`; v7 plus the kept v6 `.bak` only arrive with S-4.** The v7/.bak text below describes S-4, not v2.
**Interim backup (9.9, ADR M4-10):** before the in-place price-match, the interim path's caller writes the raw v6 save to `v6_backup` once (write-once, same keys as S-3). Owner: Features 95daf662.

**Write version follows the flag (9.2):**
- `m4.enabled = 0` (all shipping builds until M4 reaches Latest): reads v6 and **writes v6 only**. A **v7 save is refused exactly like a newer save** (ADR M4-9, 9.7): the existing `.newer-save` dialog, S-2 zero-writes rules, never writes v6 over v7, never silently drops M4 progress. The v6 `.bak` stays as the escape hatch; export stays available.
- `m4.enabled = 1`: reads v6/v7, migrates v6 → v7 and **writes v7**. The v6 `.bak` / `eggfarm.save.v6_backup` is **kept, never rotated away, until M4 reaches Latest**.
- So `SAVE_VERSION` splits into `readMax(b) = writeVersion(b) = m4On(b) ? 7 : 6`. The newer-save check uses `readMax(b)`: flag-off refuses v7, M4-on reads v6/v7.

**Migration function** (S-4, the real bump) `migrations[6] = (d, b) => v7`, run only when `writeVersion(b) = 7`. Three inputs:
- **unmarked v6:** full migration (steps 1–5 below);
- **marked v6** (`tracksV7: 1`, track fields present): just bump the version. Keep the levels, no new price-match, no second refund, no explainer or `save_migrated` replay. Idempotent;
- **v7:** no-op.
Steps for the unmarked path, calling pure `migrateTracksV7(state, b, opts?)`:
1. `hensLevel = farmLevel`.
2. `eggValueLevel` = lowest V in 0..30 (no F+3 cap, B1) with v7 price ≥ v6 price in integer cents (one half-up rounding, M4A-5).
3. Clamp only above `maxLevel`; refund the removed levels at the CSV cost column into `coinsCents` + `migrationRefundCents` (0 with current data).
4. Seed `celebratedMilestones` silently.
5. Mark "migrated this session" (explainer + first offline grant ×1.0); emit `save_migrated` once.
The chain must receive `balance` (S-1).

**Load order:** read → version > readMax(b) ⇒ refuse (zero writes; flag-off + v7 included) → if M4 on and v6: write `v6_backup` once → migrate → validate →
offline grant (×1.0 on the first grant after migration) → commit at the next save point in `writeVersion(b)`.

**Backup-write failure (9.1):** no new UI. Show the existing v2.2 **"Can't save"** dialog **once per session**, then the persistent save-warning toast.
Never block play, never drop in-memory state. Keep playing on the migrated in-memory state, but **do not commit v7 to `main`** while the backup is missing.
Retry the backup at every save point; the first success commits v7.

**Rollback:** flag-off builds never produce v7, so turning M4 off (shipping a flag-off build) is a real rollback for anyone who never ran an M4-on build.
M4-on players keep their v6 `.bak` until M4 is Latest. Older rc1 builds still refuse v7 with zero writes (S-2).

**Tests:**
- chain v1..v6 → v7 (M4 on); all 21 spec fixtures + the 961-save sweep; refund via the lowered-max table.
- idempotent reload; offline order (19800/24750, 9900/12375).
- **flag-off write test: load v6 → save → stored bytes are v6** (part of the flag-off golden).
- **M4-on write test: load v6 → save → `main` is v7, and the `.bak`/`v6_backup` holds the original v6 bytes after N autosaves.**
- **flag-off refuses v7: zero writes (LS, IDB, .bak, 2nd tab), `.bak` intact, export works.**
- marked v6 (interim): M4 on → v7 with identical levels, refund 0 added, no events; flag off → loads, and the marker + track fields are preserved byte-for-byte on write.
- backup failure: dialog once/session → toast; play continues; v7 not committed; succeeds on retry.
- `m4-v7-*` fixtures + SHA256SUMS; 3-engine test: rc1 build × v7 fixtures → storage byte-identical.

### 3a. Save facts for the M4 guard (Saves QA m4-guard-prep-notes; from code on main `a01faea` and v2 `3351d6c`)
"CODE" = what the code does today. "DECISION" = new rule set here (Architect, ADR M4-11), to be implemented by the owner named.
1. **Flag-off and v7:** REFUSE (ADR M4-9). No text in this doc says a flag-off build reads v7 and writes v6 any more.
   The v0.2 down-projection text was replaced in v0.2.2.
2. **Newer-save dialog**
   - CODE (`src/ui/save-recovery.ts` `showNewerSaveDialog`, identical on both SHAs):
     - layer `div.recovery-layer.newer-save[data-version="<n>"]`;
     - card `.recovery-card[role=alertdialog][aria-modal=true][aria-labelledby=nsT]`;
     - title `h2#nsT`, text exactly `This save is from a newer version of Egg Farm. Open the newer build to keep playing.` (`NEWER_SAVE_STRINGS.title`; body empty, no `#nsB`);
     - one button `button#nsRetry.btn.rc-primary`, text `Try again` (reloads).
   - **There is no export control on this layer today.** DECISION (S-2, Saves 3ba38cf3): add `button#nsExport`, label `Export save`, aria `Export save, downloads a copy of the saved farm`. It exports the raw `eggfarm.save` bytes via `exportOldSave`. Read-only, zero writes.
   - Guard selectors: `NEWER_SEL='.recovery-layer.newer-save [role=alertdialog]'`, `NEWER_TXT` = the title above, `EXPORT_SEL='#nsExport'`. ZW-2 stays expected-FAIL until S-2.
3. **Export format**
   - CODE: `exportOldSave(raw, name)` exports the **raw stored string, byte for byte**, with no wrapper. It wraps it in a `Blob` (`application/json`) and delivers it by download, the iOS share sheet, or the clipboard as a fallback.
   - The bytes are the save file `serialize()` writes: `{"version":<n>,"savedAt":<ms>,"sum":"<fnv>","state":{...}}`.
   - The "Can't save" variant exports `live()` = a fresh `serialize()` of the current farm.
   - DECISION: the newer-save export (item 2) uses the stored raw bytes, so ZW-2's "exact v7 bytes" is the right assertion.
4. **`tracksV7` marker at `3351d6c` (CODE)**
   - Shape: `state.tracksV7: 1`, the literal number `1`, optional (`tracksV7?: 1` in `GameState`). It sits **inside `state`**, next to `hensLevel`, `eggValueLevel` and `celebratedMilestones`. Top-level `version` stays `6`, and `sum` covers the state including the marker.
   - When it is set: in `migrate()`, when M4 is on and `!state.tracksV7` (after `migrateTracksV7`), and on a new M4 farm (`game.ts:52`). Absent means a pre-M4 farm.
   - `migrationRefundCents` is **not stored** in the state at 3351d6c (it is only returned by `migrateTracksV7`). S-4 adds it as a field.
   - Flag-off at main/3351d6c: `migrate()` builds the state as `{...initialState(b), ...d.state}` and `serialize` JSON-stringifies the whole state. So the marker and track fields survive a flag-off write (CODE), but no test covers this yet (F-0b).
5. **Backup naming**
   - CODE: there is **no v6 backup in either SHA**. The only backup is the rotation copy `eggfarm.save.bak` (`BAK_KEY`), localStorage only.
   - The IndexedDB mirror is db `eggfarm`, store `save`, key `main` (`IDB_KEY`). There are no other IDB keys.
   - DECISION (ADR M4-11): one name everywhere: localStorage **`eggfarm.save.v6_backup`**, mirrored to IndexedDB db `eggfarm` / store `save` / key **`v6_backup`**.
   - Write-once: never overwritten, never rotated, not in `RESET_KEYS` until M4 reaches Latest. It holds the raw v6 bytes.
   - When it is written:
     - interim (F-0): once, before the in-place `tracksV7` price-match (localStorage first; IDB best effort);
     - S-4: before the first v7 write, and the v7 commit waits for the localStorage write to succeed (9.1);
     - an IDB failure alone doesn't block, but it is reported in `save_migrated.backup_ok`.
   - In this doc, "v6 `.bak`" means `v6_backup`. `eggfarm.save.bak` is the normal rotation copy and keeps its existing rules.


## 4. Feature-flag strategy
- Set at build time in `balance.json`: `m4.enabled` gates M4-A **and the save write version** (ADR M4-4). Later: `m4.features.*`, each requiring `m4.enabled`.
- Shipping default 0 until QA PASS. While the default is 0, TR-5 only reports (§6). QA/playtest builds turn the flag on via `build:qa` mode. The debug toggle exists in dev builds only.
  `check-release-build` asserts the committed default.
- Per-flag golden: the flag-off golden asserts the sim trace hash **and a v6 write**. Flag-off also refuses v7 saves (newer-save path, ADR M4-9).
- Removal (F-9): one release after M4 reaches Latest, delete the flag-off path, make v7 the only write version, and drop the v6 `.bak` retention rule.

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
3. **TR-5 pacing gate: report-only (9.3).** It becomes blocking after **5 consecutive green runs with no flake**; Head of Engineering flips it.
4. **rollback browser test** (rc1 build × v7 fixtures, 3 engines, storage byte-identical).
5. **telemetry schema test**.
6. **release-default check**: release build has `m4.enabled` = committed default and no debug toggles.
**Box-load rule (CEO, 2026-10-16 21:11):**
- every browser step (Playwright, rc0, check-globals) runs under `flock /workspace/egg-farm-studio/.browser-test.lock` (`BROWSER_TEST_LOCK` overrides the path), and gate-all logs each step's lock wait;
- vitest runs with `--maxWorkers=2` (`VITEST_WORKERS`);
- QA runs take priority;
- gate-all's `trap` cleanup kills only its own servers and browsers on exit, so nothing is left running idle.
gate-all also does a preflight check (`run npm ci`, exit 2), fails fast (`KEEP_GOING=1` for a full report), checks for a clean tree before the release build, and supports `RETRY_FLAKY=1` (a pass on retry is FLAKY, exit 3).
**CI runs locally on the box via `scripts/gate-all.sh` (9.6).** No hosted Actions minutes: that is spend and needs the CEO. A hosted-CI proposal with costs is optional, comes later, and goes via HoE.

## 7. Architecture risks
1. **Version confusion (v4/v5/v6/v7)** across docs → wrong migration target. Mitigation: ADR M4-1, fix proposal text.
2. **m4a-tracks is 19 commits behind main's save work** (based on `4aadcbf`, before save v4 + dialog); `merge-tree` shows a conflict in
   `src/ui/styles.css` and semantic overlap in save.ts/game.ts load path. Rebase (v2) must re-verify flag-off golden against *a01faea*, not 4aadcbf.
3. **One-way door (reduced by 9.2):** only M4-on builds write v7, and those keep the v6 `.bak` until Latest. Remaining risks:
   - rc1 builds opening a v7 save must write nothing (S-2 ships on main first);
   - dual write versions add code paths, each covered by a write test;
   - **M4 progress is not reachable from a flag-off build** (refused, not lost): the v7 save stays intact, the v6 `.bak` is the escape hatch, export works.
4. **Backup storage quota:** the backup doubles the save footprint. On failure the player keeps playing in memory: the "Can't save" dialog shows once, then the toast, and the backup is retried at each save point (9.1). If it keeps failing, nothing is persisted.
5. **Migration needs balance** (price-matched search depends on economy.csv); a later CSV change silently changes migration output for not-yet-migrated players. Mitigation: freeze the v6→v7 price table as a fixture snapshot in the migration test.
6. **payout.ts base price** must come from `salePriceCents` (comment in tracks.ts) — fix/rc1-qa-bugs branches may reintroduce direct `eggPriceCents` calls. Add a grep/unit guard.
7. **UI churn in app.ts** (65-line diff, shared with rc2 UI work by e80556fd) → merge conflicts. Keep M4 UI in `tracks-ui.ts`, app.ts only wires.
8. **Watch: the WebKit 375px sideways-scroll flake** (rc0 Bug9 farm tab 375×812/375×600, 195/197 once on X-1, rerun 197/197). If it recurs, treat it as a real issue, not a flake.
9. **TR-5 known FAIL** could block ship; gate classified reporting until Economy decision.

## 8. Task breakdown (one area per PR)
Owners: **SAV** = Saves 3ba38cf3 · **UI** = e80556fd · **FE** = Features/Economy 95daf662 · **ARCH** = Architect (review/tooling).

| ID | Task (PR) | Owner | Depends on | Size |
|---|---|---|---|---|
| A-0 | Rebase m4/m4a-tracks onto origin/main a01faea → `m4/m4a-tracks-v2` (tonight); resolve styles.css; regenerate the flag-off golden; all gates; send the v2 SHA | **HoE** | — | M |
| U-0 | Turn /workspace/m4v2-tools/ (single.config.mjs, inline-public.mjs, smoke.mjs) into `npm run build:html` (single-file playtest HTML + smoke) | UI | A-0 | S |
| X-1 | `scripts/gate-all.sh` + telemetry schema test skeleton | ARCH | — | S |
| F-0 | On m4/m4a-tracks-v2: (a) interim path writes `eggfarm.save.v6_backup` (+ IDB `save/v6_backup`) once before the in-place price-match (ADR M4-10/M4-11); (b) test that a flag-off build saves a **marked** save without stripping `tracksV7`/`hensLevel`/`eggValueLevel`. Must land before playtest builds spread marked saves | FE (with SAV review) | A-0 | S |
| S-1 | Migration chain takes `balance`; move `migrate-v7.ts` → `save/migrations/v7.ts`; split `readMax(b)` / `writeVersion(b)` (still 6/6) | SAV | A-0 | S |
| S-2 | Add `#nsExport` (raw bytes) to the `.newer-save` layer (§3a.2); newer-save refusal = zero writes (autosave, pagehide, .bak, IDB mirror, 2nd tab) + 3-engine test, **on main**; also covers **a flag-off build opening a v7 save** (same refusal, .bak intact, export works) | SAV | — | M |
| S-3 | `v6_backup` write-once (LS + IDB). On failure: "Can't save" dialog once per session → toast, keep playing, don't commit v7, retry at save points; unit tests | SAV | S-1 | M |
| S-4 | Real v6→v7 bump (replaces the interim marker). Handles unmarked v6, marked v6 (idempotent: no re-migrate, no re-refund) and v7. Wire `migrations[6]`; readMax 7 with M4 on (flag-off refuses v7, ADR M4-9); write v7 only when M4 is on; keep the v6 `.bak` until Latest; validator; flag-off v6-write, flag-off-refuses-v7 and M4-on v7-write/.bak tests | SAV | S-1, S-3, S-2 | M |
| S-5 | Load order + first-offline-grant ×1.0 (M4A-30) tests | SAV | S-4 | S |
| S-6 | `m4-v7-*` fixture files + **marked-v6 (`tracksV7: 1`) fixtures** + SHA256SUMS; rc1-build × v7 rollback browser test (3 engines) | SAV | S-4 | M |
| F-1 | Merge O1/O3 CSV columns into economy.csv (with Economy); sync-economy --check | FE | A-0 | S |
| F-2 | Telemetry: `upgrade.track`, new events, session/worker fields, pinned list | FE | A-0, X-1 | S |
| F-3 | `save_migrated` emit | FE | S-4, F-2 | S |
| F-4 | TR-5 gate test (report-only in gate-all) + payout base-price guard | FE | F-1 | S |
| F-5 | Flag plumbing: `m4.features.*`, QA-mode override, release-default check | FE | A-0 | S |
| U-1 | Rebased 3-row Farm tab + highlight + bonus strip polish, scoped CSS, screenshots 360/1280 | UI | A-0 | M |
| U-2 | Milestone toast (once, never on migration) | UI | U-1 | S |
| U-3 | Tracks explainer coach mark (M4A-33: non-blocking, pass-through tap, reduced motion, a11y) | UI | S-4, U-1 | M |
| U-4 | `tracks_explainer` telemetry + rc0 cases (3 engines) | UI | U-3, F-2 | S |
| Q-1 | QA build flag-on + playtest; Code Reviewer pass; flip default only on PASS | FE (+QA) | all above | S |
| F-6.. | M4-C Pause/Resume → M4-D market → M4-B golden egg → M4-E abilities/streak, each: sim PR (FE), UI PR (UI), save field PR if any (SAV, v7→v8 only if needed) | FE/UI/SAV | Q-1 | — |
| F-9 | Remove the M4-A flag-off path **and the `tracksV7` marker path** one release after default-on | FE | Q-1 + 1 release | S |

**Ordering:** start now: A-0 (HoE, tonight), S-2 (Saves, ships on main first), X-1 (ARCH). Features (95daf662) branches from the v2 SHA once HoE sends it; every FE/UI M4-A task waits for it. Then S-1→S-3→S-4→S-5/S-6 (critical path, ~2–3 days);
F-1/F-2/F-5/U-1 in parallel after A-0; U-3 after S-4; Q-1 last. Merge order into main: S-2, X-1, A-0 (flag off), S-1, F-*, U-1/U-2, S-3, S-4+F-3 together, S-5, S-6, U-3/U-4, Q-1.

## 9. Decisions (HoE, 2026-10-16 19:29) and remaining open questions
1. **Backup write fails → decided:** no new UI. Reuse the v2.2 "Can't save" dialog once per session, then the persistent toast. Never block play; never drop in-memory state (ADR M4-5).
2. **Flag-off writes → decided:** flag-off builds keep writing v6; v7 is written only with M4 on. The v6 `.bak` is kept until M4 reaches Latest, and the v7 reader accepts v6 (ADR M4-4, **supersedes M4-2**).
3. **TR-5 → decided:** report-only. It becomes blocking after 5 green runs in a row with no flake; HoE flips it (ADR M4-6).
4. **v2 base → decided:** origin/main `a01faea`. HoE owns the A-0 rebase tonight; Features branches from the v2 SHA.
5. **QA guard → decided:** QA Saves (33ec1b55) owns the M4 guard, a new file `qa/m3-scripts/rc1-guard-save-qa-m4.mjs`.
6. **CI → decided:** no hosted minutes (spend, needs CEO). Gates run locally via `gate-all.sh`. A hosted-CI proposal with costs is optional and comes later via HoE (ADR M4-7).
7. **Flag-off opens v7 → decided: REFUSE** (ADR M4-9). Same as a newer save: newer-save dialog, zero writes, never v6 over v7, `.bak` escape hatch, export available.
8. **Interim marker → decided (HoE, 20:28):** v2 `3351d6c` migrates inside v6 via `tracksV7`. Kept for playtest and M4-flagged builds only, never in a release default. S-4 does the real bump; F-9 removes the marker (ADR M4-8).
9. **Interim backup → decided (HoE review, 20:31):** the interim marked path writes a v6 backup once, before the in-place change. Owner: Features 95daf662 (task F-0, ADR M4-10).

