# M4 design and task split — Senior Software Architect · v0.2.9 (Code Reviewer recheck 2f46403 N1–N8, m2, m4; HoQA f1869c4 M-6/M4-15/M4-16 + nits; HoE M4-16 timeout ruling; Code Reviewer arch-m4-design-ab8f366: ADR M4-14..17, m1–m5, N1–N3; HoQA recheck 2e86a6e M-5, M-6, R-1, R-3, N-1, N-4, N-5; HoQA review pr1-m4-design-review-96e895b M-1..M-7, N-2, N-3; HoE-approved decisions 9.1–9.10; review m4-design-v0.2-ad10a08; Saves QA guard-prep answers §3a) · 2026-10-16

Base: `origin/main` @ `a01faea` (save v4 `aaaa91a` + save-recovery dialog). M4-A baseline: `m4/m4a-tracks` @ `04e2709`
(19 commits on merge-base `4aadcbf`; `m4/m4a-tracks-v2` not pushed yet). Inputs: engineering/stack-and-architecture.md,
sim-rules.md, decisions.md, status.md; product/farm/m4a-spec.md v1.5; product/m4-manage-proposal.md; product/m4-monetisation-proposal.md.

> **Version numbering, read first.** "save v4" in branch/tag names (`m3-rc1-save-v4`) is the *4th iteration of the
> save-durability work*, not the schema. Main ships **`SAVE_VERSION = 6`** (src/save/save.ts). The M4 migration is
> therefore **v6 → v7**, exactly as m4a-spec §10 says. (manage-proposal §9/§10 still say "v5→v6"; that text is stale.) See ADR M4-1.

## 1. Goals and scope
**Goal:** ship M4 "Manage" in thin, independently mergeable slices behind flags, with main always releasable and flag-off
**behaviour-identical** to rc1 (same sim and same save semantics; flag-off saves may carry the inert M4 default fields, §4).

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
**Schema (v7 adds):** `hensLevel:int`, `eggValueLevel:int`, `celebratedMilestones:string[]`, `migrationRefundCents:int (default 0, ≥ 0)`, `v6BackupId:string (16 hex, set at commit, ADR M4-15)`,
`seenTracksExplainer:boolean`. Nothing else changes; `collectionLevel` keeps paid levels.

**Interim (ADR M4-8, 9.8): `tracksV7` marker inside v6.** `m4/m4a-tracks-v2` @ `3351d6c` keeps `SAVE_VERSION = 6`. With M4 on, a save with no
`tracksV7` marker (v1..v6) is price-matched once through `migrateTracksV7` and gets marked `tracksV7: 1`; new M4 farms are marked at creation.
This is allowed **only in playtest and M4-flagged builds, never as a release default**. Flag-off builds must load a marked save normally
(ignore or keep the marker and track fields) and must **never strip them on write**. S-2 is unaffected because a marked save is still v6.
**At `3351d6c`, M4-on saves are v6 with `tracksV7: 1`; v7 plus the kept `v6_backup` only arrive with S-4.** The v7/`v6_backup` text below describes S-4, not v2.
**Interim backup (9.9, ADR M4-10):** before the in-place price-match, the interim path's caller writes the original validated raw v6 bytes to `v6_backup` (same keys and protocol as S-3, §3c; write-once only once committed, ADR M4-15). The interim path **never refunds**: `migrateTracksV7` returns a refund (0 with current data) that F-0 must not apply; S-4 computes and records it in `migrationRefundCents` (m5). Owner: Features 95daf662.

**Write version follows the flag (9.2):**
- `m4.enabled = 0` (all shipping builds until M4 reaches Latest): reads v6 and **writes v6 only**. A **v7 save is refused exactly like a newer save** (ADR M4-9, 9.7): the existing `.newer-save` dialog, S-2 zero-writes rules, never writes v6 over v7, never silently drops M4 progress. `v6_backup` stays as the escape hatch; export stays available.
- `m4.enabled = 1`: reads v6/v7, migrates v6 → v7 and **writes v7**. `eggfarm.save.v6_backup` (once committed, ADR M4-15) is **kept until M4 reaches Latest**; it is cleared only by Settings > Reset (m2).
- So `SAVE_VERSION` splits by a **runtime gate (ADR M4-14, N4): `m4Active = m4On(b) && committed`**, held in `Game` (session state, not storage). `committed` is true when the loaded save is v7 or a marked v6 with a `v6BackupId`, or once this session's migration commits (§3c); it never goes back to true after an abort in the same session.
  - `readMax(b) = m4On(b) ? 7 : 6` uses the **build flag** (an M4-on build can always read a v7; flag-off refuses v7).
  - `writeVersion = m4Active ? 7 : 6`, and on the interim path the `tracksV7` marker is written only when `m4Active`. M4 formulas (`m4On` call sites in sim/econ), the tracks UI and track purchases gate on `m4Active`. So a pending or aborted session serializes plain v6 and plays v6 rules (test: aborted session's stored bytes are v6, no marker, no track fields changed).

**Migration function** (S-4, the real bump) `migrations[6] = (d, b) => v7`, run only when `writeVersion(b) = 7`. Three inputs:
- **unmarked v6:** full migration (steps 1–5 below);
- **marked v6** (`tracksV7: 1`, track fields present): just bump the version. Keep the levels, no new price-match; record the refund the interim path did not apply (recompute it from the frozen price table into `migrationRefundCents` + `coinsCents`; 0 with current data), so it is never dropped; no explainer or `save_migrated` replay. Idempotent;
- **v7:** no-op.
Steps for the unmarked path, calling pure `migrateTracksV7(state, b, opts?)`:
1. `hensLevel = farmLevel`.
2. `eggValueLevel` = lowest V in 0..30 (no F+3 cap, B1) with v7 price ≥ v6 price in integer cents (one half-up rounding, M4A-5). **If no V reaches it, V = the track max level** (m5).
3. Clamp only above `maxLevel`; refund the removed levels at the CSV cost column into `coinsCents` + `migrationRefundCents` (0 with current data). **Money rule (m5):** each level's cost is integer cents (`Math.round` once per level, as `formulas.ts` does for costs); the refund is a non-negative integer; `coinsCents + refund` is clamped to `Number.MAX_SAFE_INTEGER`; the validator rejects non-integer or negative `migrationRefundCents`.
4. Seed `celebratedMilestones` silently.
5. Mark "migrated this session" (explainer unlock); emit `save_migrated` once (interim F-0: `{from: 6, to: 6, migration: 'tracksV7_marker'}`; S-4: `{from: 6, to: 7}`). **Offline grant with the in-session commit (m4/N5, ADR M4-16):** the offline grant runs at boot, before any migration, under flag-off rules (`m4Active` false ⇒ Hens offline mult ×1.0, v6 egg rate). That *is* the M4A-30 "first grant after migration ×1.0": it is satisfied by construction, so no `firstGrantDone` field is stored. The next load after commit grants with the M4 Hens mult. Effect on M4A-30's order: "migrate → grant ×1.0" becomes "grant ×1.0 (v6 rules) → migrate in-session"; S-5 re-derives its expected values (19800 at the boot grant, 24750 on the following load) and HoP notes it in the spec. An abort leaves the save untouched and the retry's boot grant is again ×1.0. Pending offline eggs from the v6 save are settled before migration (game.ts:54 order kept). Float order is the code's, pinned: `Math.floor(Math.min(awayS, cap) * offlineRateMultiplier * eps)` (src/sim/offline.ts `offlineEggs`, a01faea), with ` * mult` appended last on the M4 branch (3351d6c offline.ts:9); left to right; tests use 1.35-type multipliers. **Payouts:** every multiplied payout (milestone × balanced × grader) is computed in integer cents and clamped to `Number.MAX_SAFE_INTEGER` (nit).
The chain must receive `balance` (S-1).

**Load order (ADR M4-17):** read the copy that wins reconcile/recovery → version > readMax(b) ⇒ refuse (zero writes; flag-off + v7 included) → **parse → version → checksum → ranges** (pure validation, split out of `validate()` so it no longer runs `migrate()` first). Corrupt or out-of-range ⇒ the existing corrupt-recovery path; **never migrated, never backed up** → the game boots and runs this v6 **synchronously under flag-off rules** (§3c) → if M4 on and the save is an **unmarked** v6: the async backup + migration protocol of §3c (a marked v6 or a v7 save writes no new backup).
The bytes backed up are the **original raw validated bytes of the copy actually loaded** (LS main, or the `.bak`/IDB copy that recovery chose).

**Backup-write failure = ABORT the migration (ADR M4-12; spec M4A-31(a)/(f)1 governs; supersedes the 9.1 "keep playing migrated" rule and M4-10/M4-11 "IDB best effort"). IDB *definitely absent* is not a failure; an IDB timeout or read error defers the migration (ADR M4-16, §3c).**
If the v6 backup write fails in localStorage, the LS read-back does not match, or IndexedDB is present but its open times out, its read or write fails, or the write does not complete within 1.5 s:
- do not migrate; keep the v6 state in memory and keep **flag-off rules for the rest of the session** (`m4Active` false, ADR M4-14);
- save v6 normally (main, `.bak` rotation, IDB mirror) with **no `tracksV7` marker** and no v7;
- show the v2.2 "Can't save" notice (once per session, then the toast) **only if that normal v6 save also fails**;
- retry the migration on the next load.
The same rule applies to the interim marker path (F-0) and the S-4 v7 path: the backup must be confirmed (LS required; IDB too when available) before the migration commits.
**Partial backup (ADR M4-13, made robust by M4-15):** if one store's backup write succeeds and the other fails, the aborted attempt tries to remove **only the backup records it wrote** (matching its `migrationId`). The cleanup is best effort (removeItem can throw, the IDB delete may not finish before pagehide); correctness never depends on it, because an unreferenced backup is leftover by definition (§3c) and is deleted or overwritten on the next load.
Emit `save_migration_aborted {store, reason, path}` (§5; the one field set used everywhere).

### 3c. Backup + migration protocol (ADR M4-14..17)
- **Aborted / pending session = flag-off rules (M4-14).** From boot until the migration commits, and for the rest of the session after an abort, the game runs the v6 state with flag-off rules: M4 formulas off, Farm-tab tracks UI, best-buy and track purchases hidden/disabled, the save stays plain v6 (no marker, no track levels written). So no track purchase can exist that the next migration would overwrite.
- **Commit marker (M4-15).** Each attempt draws a random `migrationId` (16 hex chars) **in `save/`** (`crypto.getRandomValues`, fallback `Math.random`) and injects it as `opts.migrationId`, so `migrateTracksV7` stays pure; tests, fixtures, the 961-save sweep and the storage golden pass a fixed id. The backup record is `{"migrationId":"<id>","raw":"<original v6 bytes>"}` in LS `eggfarm.save.v6_backup` and IDB `eggfarm/save/v6_backup` (QA unwraps `raw` for byte compares). The committed save stores the same id in `state.v6BackupId`: **S-4 in the v7 save, and F-0 in the marked v6 save** (so the interim backup can be committed, N3). A backup is **committed** only if its id equals the live save's `v6BackupId`; otherwise it is an **orphan**: not restored, not write-once-protected. Saves already marked at 3351d6c (playtest only) have no backup and no id; they are documented as uncovered and S-4 treats them as marked v6.
- **Orphan handling (N2, HoE-approved, final).** An orphan is deleted or overwritten **only inside the unmarked-v6 migration path, at the moment that path writes a fresh backup**. Never on a plain load, a refused load (§3b zero writes), a corrupt-recovery load, a `.bak` restore or a fresh farm, and never a record whose id is referenced by main, `.bak` or IDB main. The IDB put is conditional inside its transaction: it does not replace a record whose id is referenced by a committed save (a late write from an older attempt cannot clobber a committed record).
- **IndexedDB (M4-16, HoE-approved, final; supersedes the 2000 ms rulings).** The LS backup is **required**. IDB is *definitely absent* only when there is **no `indexedDB` global, or `open` throws / rejects synchronously or with a private-mode or `SecurityError`**. Then the attempt proceeds on LS alone and emits `save_backup_idb_unavailable {reason: 'absent'|'security', path}` (§5). Any other outcome is *unknown* and **defers** the migration: open not answered within **1.5 s** (the existing mirror timeout; one budget for open, read and write) ⇒ `save_migration_aborted {store: 'idb', reason: 'idb_timeout', path}`; any other open or read error ⇒ `reason: 'idb_read_error'`. Deferred = stay v6 under flag-off rules, retry next load. Once open, a backup write that fails or does not complete within 1.5 s aborts (`reason: 'quota'|'error'|'idb_timeout'`). Why: an IDB read that times out may hide a newer IDB-only save (old B1 class); migrating the LS copy would overwrite it. The 2000 ms open/write timeout (HoE ruling 21:58 and spec v1.6 (g)/(h)) is **superseded**; the spec (g) "timeout ⇒ LS-only" and the `blocked` reason need a HoP amendment (`IdbMirror.open` has no `onblocked` handler today).
- **LS read-back (M4-16, HoQA bar).** After the LS `setItem`, `save/` reads `eggfarm.save.v6_backup` back and parses it; its `migrationId` must equal the pending `state.v6BackupId`. Mismatch, parse failure or a throwing `getItem` ⇒ abort under M4-12: stay v6, no marker, `save_migration_aborted {store: 'ls', reason: 'readback_mismatch', path}`.
- **Async, in-session commit (M4-16).** Boot is unchanged and synchronous (v6, flag-off rules, `m4Active` false). After boot `save/` writes the backup and commits in this order, all through `Game.save`'s lease and newer-save guards (review 677317d m1):
  1. LS backup record (sync) → LS read-back check;
  2. IDB backup record (awaited with a keyed success result added to `IdbMirror`; the current fire-and-forget `write` is not enough), skipped only if IDB is definitely absent;
  3. at the next tick boundary: migrate the live v6 state, set `v6BackupId`, write main (v7, or marked v6 on F-0) with `rotate`; then the IDB main mirror;
  4. set `m4Active = true`; the M4 UI unlocks in this session and the M4A-33 explainer shows now (the "first load after migration" becomes "the moment the migration commits"; HoP spec note).
  **Commit-write failure (N6):** if the main write in step 3 fails (quota is likeliest, the backup roughly doubles the footprint), keep the old main untouched, revert memory to the pre-migration v6 state, `m4Active` stays false, emit `save_migration_aborted {store: 'ls', reason: 'commit_write_failed', path}`; the backup is an orphan and is replaced at the next attempt. **Close between writes:** the backup is durable first (LS `setItem` is synchronous and precedes main), so a kill at any point leaves either old v6 main + orphan backup (retry next load) or committed main + committed backup; never a v7/marked main without an LS backup. Residual risk: a browser that lazily flushes LS could persist main before the backup; with IDB absent there is then no second copy. Accepted, noted in §7.
- **Order (M4-17).** Validate before backup (load order above). **Restore source** for rollback/support: LS `v6_backup`, else IDB `v6_backup`, else none; only a committed record whose `raw` passes the v6 `sum` checksum and range validation is restored (the record itself has no integrity field; `raw`'s `sum` is it).
- **Reset (m2).** Settings > Reset clears `eggfarm.save.v6_backup` (added to `RESET_KEYS`) and deletes IDB `save/v6_backup` **explicitly** (a keyed delete added next to `clearMirror`; `IdbMirror.clear()` deletes only `main`), so a new farm never inherits the old farm's backup.

### 3b. Zero-writes rule (HoQA ruling; QA guard ZW-3..6; applies to S-2, ZW-2, flag-off v7 refusal)
Key names from code on main `a01faea`. During a refused load (newer save, or flag-off + v7), through autosave, `pagehide`, Export and a second tab:
- **Must stay byte-identical (or stay absent):** `eggfarm.save` (`SAVE_KEY`), `eggfarm.save.bak` (`BAK_KEY`), `eggfarm.save.v6_backup` (once it exists), every `eggfarm.save.corrupt.*` key and `eggfarm.save.corrupt.index`, `eggfarm.ui` (`UI_KEY`), and IndexedDB `eggfarm`/`save` keys `main` and `v6_backup`.
- **May be written:** only these localStorage keys, exactly (grep of `setItem` in src/ @ `a01faea`; no wildcards): `eggfarm.lease` (`LEASE_KEY`, tab-lease.ts), `eggfarm.tab` (`TAB_KEY`, tab-guard.ts), `eggfarm.telemetry` (`TELEMETRY_KEY`, telemetry.ts; the only telemetry key). **Telemetry has no IndexedDB store:** the only IndexedDB database the code opens is `eggfarm` (`IDB_NAME`) with the single object store `save` (`IDB_STORE`), keys `main` (and `v6_backup` from S-3), all in the byte-identical list. Any other IDB database, store or key appearing is a FAIL. (`eggfarm-recovery-closed` is a DOM event name and `eggfarm-save` / `eggfarm-tabs` are BroadcastChannel names, not storage.)
- **No serialized save in an allowed key.** A *serialized save object* is any JSON object (at any depth, or any string that parses to one) that has **all three** of `version`, `savedAt` and a `state` object, i.e. the `serialize()` shape `{"version","savedAt","sum","state"}`; a raw copy of `eggfarm.save`/`.bak`/`v6_backup` bytes also counts. **Telemetry event snapshot fields are allowed**: scalar fields such as `farm_level`, `hens_level`, `egg_value_level`, `collection_level`, `coinsBefore`, `newLevel`, `cost`, `refund_cents` (§5) are not a save copy, as long as no event carries a `state` block next to `version` and `savedAt`.
- `eggfarm.install_id` (`INSTALL_ID_KEY`) may only be **created if absent**; an existing value must stay byte-identical.
- sessionStorage `eggfarm.playHere` (main.ts tab-takeover flag) is outside localStorage and not a save; it is not asserted.
- Any other key appearing is a FAIL. S-2's own test must assert exactly this list, so S-2 cannot pass while failing QA's guard.

**Rollback:** flag-off builds never produce v7, so turning M4 off (shipping a flag-off build) is a real rollback for anyone who never ran an M4-on build.
M4-on players keep their committed `v6_backup` until M4 is Latest. Older rc1 builds still refuse v7 with zero writes (S-2).

**Tests:**
- [S-4] chain v1..v6 → v7 (M4 on); all 21 spec fixtures + the 961-save sweep; refund via the lowered-max table.
- [S-4/S-5] idempotent reload; offline order (19800/24750, 9900/12375).
- [A-0, S-4] **flag-off write test: load v6 → save → stored bytes are v6** (part of the flag-off golden).
- [S-4; PENDING-S4 before it, at 3351d6c expect v6 + `tracksV7:1`] **M4-on write test: load v6 → save → `main` is v7 with `v6BackupId`, and the committed `v6_backup` record holds the original v6 bytes after N autosaves** (`.bak` rotates and is not asserted).
- [S-2] **flag-off refuses v7: zero writes per §3b (the QA zero-writes rule), `.bak` intact, export works.**
- [F-0b flag-off half; S-4 M4-on half] marked v6 (interim): M4 on → v7 with identical levels, refund 0 added, no events; flag off → loads, and the marker + track fields are preserved byte-for-byte on write.
- **backup failure (ADR M4-12..16; S-3, F-0; run once per store: `ls`, then `idb`, each with an injected quota failure in that store only):**
  1. stored `eggfarm.save` stays `version: 6` with **no `tracksV7` marker** and no `v6BackupId` (and no v7 anywhere);
  2. `save_migration_aborted {store, reason, path}` fires once with the failing store;
  2a. the tracks UI and track purchases stay hidden/disabled for the rest of the session (M4-14);
  3. **no dialog and no toast** while the normal v6 save succeeds ("Can't save" appears only if the v6 save itself also fails);
  4. a purchase made after load survives a page close (reload shows it, still v6);
  5. no *committed* `v6_backup` exists: any record left is an orphan, and only the next migration attempt overwrites it (M4-15, N2; also test with the cleanup forced to throw);
  6. the next load (failure removed) retries: backup written fresh with a new `migrationId` from the unmarked v6 (replacing any orphan), migration commits in-session; that load's boot grant is ×1.0 (v6 rules).
- [S-3] IDB definitely absent (no `indexedDB` global; open throws `SecurityError`/private mode): migration commits on LS alone, `save_backup_idb_unavailable {reason: 'absent'|'security'}` fires.
- [S-3] IDB open not answered in 1.5 s (fake clock) / open or read error: no migration this session, `save_migration_aborted {store: 'idb', reason: 'idb_timeout'|'idb_read_error'}`, stays v6 under flag-off rules; next load (IDB healthy) migrates.
- [S-3] **newer save only in IDB + slow open:** LS holds an older v6, IDB main holds a newer v6 (and a variant with a committed v7); open exceeds 1.5 s ⇒ no migration, and LS main, `.bak`, `v6_backup` and IDB main/`v6_backup` all stay byte-identical.
- [S-3] IDB write fails / hangs past 1.5 s after a good open: abort `{store: 'idb', reason: 'quota'|'error'|'idb_timeout'}`.
- [S-3] LS read-back **pass**: record `migrationId` = pending `v6BackupId` ⇒ commit. **Fail**: injected mismatch (or `getItem` throws) ⇒ abort, stays v6, no marker, `save_migration_aborted {store: 'ls', reason: 'readback_mismatch'}`.
- [S-3/S-4] **orphan id:** (a) record id ≠ live `v6BackupId`; (b) live save has no `v6BackupId`. Each: not restored by the restore path, not write-once-protected, and replaced by the fresh backup on the next unmarked-v6 migration (new id), untouched by any other load.
- [S-3] **corrupt v7 main → recovery** (fresh farm or `.bak`): the existing `v6_backup` record stays byte-identical.
- [S-3] **`.bak` restore** of a pre-commit v6 (no id): `v6_backup` stays byte-identical (no deletion outside the migration path).
- [S-3] commit-write failure (quota on main at step 3): old main byte-identical, memory back to v6, flag-off rules, `reason: 'commit_write_failed'`.
- [S-3] aborted session serializes plain v6 (`m4Active` false): stored bytes v6, no marker, track fields unchanged.
- [S-3] corrupt or out-of-range v6: corrupt-recovery path, no backup, no migration (M4-17); backup bytes = the loaded copy's bytes when recovery used `.bak`/IDB.
- [S-3] Reset with a committed **and** with an orphan record in both stores, then **reload**: no `v6_backup` in LS or IDB after the reload (catches an async IDB delete that did not finish).
- [S-4] money: refund integer, ≥ 0, `coinsCents` clamped at `Number.MAX_SAFE_INTEGER`; no-V-reaches-price ⇒ max level; marked v6 records the interim refund.
- [S-6] `m4-v7-*` fixtures + SHA256SUMS; 3-engine test: rc1 build × v7 fixtures → storage byte-identical.

### 3a. Save facts for the M4 guard (Saves QA m4-guard-prep-notes; from code on main `a01faea` and v2 `3351d6c`)
"CODE" = what the code does today. "DECISION" = new rule set here (Architect, ADR M4-11), to be implemented by the owner named.
1. **Flag-off and v7:** REFUSE (ADR M4-9). No text in this doc says a flag-off build reads v7 and writes v6 any more.
   The v0.2 down-projection text was replaced in v0.2.2.
2. **Newer-save dialog**
   - CODE (`src/ui/save-recovery.ts` `showNewerSaveDialog`, identical on both SHAs):
     - layer `div.recovery-layer.newer-save[data-version="<n>"]`, where `<n>` = the **highest** newer version across LS main, `.bak` and IDB main (`newerStoredVersion`);
     - card `.recovery-card[role=alertdialog][aria-modal=true][aria-labelledby=nsT]`;
     - title `h2#nsT`, text exactly `This save is from a newer version of Egg Farm. Open the newer build to keep playing.` (`NEWER_SAVE_STRINGS.title`; body empty, no `#nsB`);
     - one button `button#nsRetry.btn.rc-primary`, text `Try again` (reloads).
   - **There is no export control on this layer today.** DECISION (HoE 21:18; HoQA ruling M-2: ships in **ZW-2, its own Saves PR merged before S-2**, Saves 3ba38cf3): the newer-save dialog gets an **`Export save`** button, **`[data-testid=newer-save-export]`**.
     - It exports the raw stored save string (`eggfarm.save`) exactly as stored: no wrapper, no migration, **zero storage writes**.
     - `Try again` (`#nsRetry`) stays.
   - Guard selectors: `NEWER_SEL='.recovery-layer.newer-save [role=alertdialog]'`, `NEWER_TXT` = the title above, `EXPORT_SEL='[data-testid=newer-save-export]'`. ZW-2 stays expected-FAIL until the **ZW-2 PR**; QA flips ZW-2 to PASS on that PR's SHA (not S-2's).
3. **Export format (answer to QA question 3)**
   - DECISION (HoE 21:18): the newer-save export is the **raw stored save string, exactly as stored**: no wrapper, no migration, zero storage writes. ZW-2's "exact v7 bytes" is the right assertion. **Which copy (N-4, DECISION):** export the stored copy that carries that highest newer version (the `data-version` one); within that version the copy with the **newest valid `savedAt`** wins (validity per `validSavedAt`/`savedAtRank`), and LS `eggfarm.save` > `.bak` > IDB main only breaks exact ties. So a newer save found only in `.bak` or IDB is still exported, never an older `eggfarm.save`.
   - CODE today: the existing exports (`exportOldSave`) already export raw strings as a `Blob` (`application/json`), delivered by download, the iOS share sheet, or the clipboard as a fallback.
   - The bytes are the save file `serialize()` writes: `{"version":<n>,"savedAt":<ms>,"sum":"<fnv>","state":{...}}`.
   - The "Can't save" variant exports a fresh `serialize()` of the live farm, which is a different case.
4. **`tracksV7` marker at `3351d6c` (CODE)**
   - Shape: `state.tracksV7: 1`, the literal number `1`, optional (`tracksV7?: 1` in `GameState`). It sits **inside `state`**, next to `hensLevel`, `eggValueLevel` and `celebratedMilestones`. Top-level `version` stays `6`, and `sum` covers the state including the marker.
   - When it is set: in `migrate()`, when M4 is on and `!state.tracksV7` (after `migrateTracksV7`), and on a new M4 farm (`game.ts:52`). Absent means a pre-M4 farm.
   - `migrationRefundCents` is **not stored** in the state at 3351d6c (it is only returned by `migrateTracksV7`). S-4 adds it as a field.
   - Flag-off at main/3351d6c: `migrate()` builds the state as `{...initialState(b), ...d.state}` and `serialize` JSON-stringifies the whole state. So the marker and track fields survive a flag-off write (CODE), but no test covers this yet (F-0b).
5. **Backup naming**
   - CODE: there is **no v6 backup in either SHA**. The only backup is the rotation copy `eggfarm.save.bak` (`BAK_KEY`), localStorage only.
   - The IndexedDB mirror is db `eggfarm`, store `save`, key `main` (`IDB_KEY`). There are no other IDB keys.
   - DECISION (ADR M4-11): one name everywhere: localStorage **`eggfarm.save.v6_backup`**, mirrored to IndexedDB db `eggfarm` / store `save` / key **`v6_backup`**.
   - Write-once **only once committed** (its `migrationId` = live `v6BackupId`, ADR M4-15); leftover records are deleted or overwritten. Never rotated; cleared by Reset (in `RESET_KEYS` + IDB clear). Holds `{migrationId, raw}` with the original validated v6 bytes.
   - When it is written:
     - interim (F-0): once, before the in-place `tracksV7` price-match; S-4: before the first v7 write;
     - **LS must succeed, and IDB too when available; a failure aborts and the session stays v6 under flag-off rules (ADR M4-12/14/16). IDB unavailable ⇒ LS alone + telemetry (M4-16).**
   - This doc no longer uses "v6 `.bak`"; the v6 copy is always `v6_backup`. `eggfarm.save.bak` is the normal rotation copy and keeps its existing rules.


## 4. Feature-flag strategy
- Set at build time in `balance.json`: `m4.enabled` gates M4-A **and the save write version** (ADR M4-4). Later: `m4.features.*`, each requiring `m4.enabled`.
- Shipping default 0 until QA PASS. While the default is 0, TR-5 only reports (§6). QA/playtest builds turn the flag on via `build:qa` mode. **The QA-mode override is build-time only** (a `define` like `__IOS_FLAG__`), never a URL or storage override; M4 adds no window globals beyond `eggfarmExportTelemetry`. The debug toggle exists in dev builds only.
  `check-release-build` asserts the committed default, and **`check-release-build` + `check-globals` also run on the U-0 `build:html` single-file artifact**.
- Per-flag golden ("flag-off matches main", testable form): **not** a build-artifact hash (the code differs, so it cannot match). It is two checks:
  1. **Sim trace hash** (`tests/m4a-flag-off.test.ts`): sha256 hex of `JSON.stringify(out)`, where `out` = bot pacing for models `seller15` and `cheapest` × seeds 1..6 × 1800 s (farm/upgrades sampled every 60 s), plus a 10 Hz scripted trace of **6000 ticks** (dt 0.1 s, seed 7, every action type, events included) with M4 fields `hensLevel/eggValueLevel/celebratedMilestones` stripped, plus `applyOffline` over 5 400 000 ms. Economy = `tests/rc1-balance` with `m4.enabled = 0`. The golden is **re-pinned to main `a01faea`** (computed there with the same harness; the current `GOLDEN_MAIN_4AADCBF` constant is replaced in A-0 and renamed `GOLDEN_MAIN_A01FAEA`).
  2. **Storage bytes (deterministic Node harness, no browser):** `engineering/golden/flagoff-golden.a01faea.test.ts`. For each fixture in `tests/fixtures/saves` (SHA256SUMS-checked; all `savedAt: 1792087200000`): `loadSafe(kv, balance, now)` with **`now` = the fixture's own `savedAt`** (so no offline grant) → exactly **600 fixed `step(s, 0.1, balance)` calls** (no rAF, no timers) → `save(kv, s, now, balance)` (the real `serialize` path) → sha256 of the stored `eggfarm.save` string. Pins at **`a01faea`**:

     | Fixture | sha256 of stored `eggfarm.save` @ a01faea |
     |---|---|
     | `m1-rc2-v4-12min` | `b69c5783ba5b54dd663b56b898e2595cca59c6e03fc692b515af993634224ee9` |
     | `m2-rc1-v5-12min` | `2ac7070d0c5e7ea2d8fcdd1642732cf44871fe9c5b126d1b5873fcd8244f3a00` |
     | `m2-rc1-v5-40min` | `4fd4675956da96efa92f5eb48d979f132ad628c1e76e616076eb041ae311b431` |
     | `m2-rc1-v5-40min-edge` | `652d1b266de55a11ecc4faef9816eca0cfb803da3c7a7c14af85f88e4bb9f0bb` |

     Command (from a checkout of a01faea with the file copied to `golden/`): `npx vitest run golden/flagoff-golden.test.ts --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1`. Stable: identical over 2 consecutive runs (2026-10-16 21:58), no code changes to a01faea.
     On the M4 branch with the flag off, the stored state additionally carries the intended defaults `hensLevel: 0, eggValueLevel: 0, celebratedMilestones: []` (no `tracksV7`), because `migrate()` spreads `initialState` (state.ts:22-33). The M4-branch check is: remove exactly those three keys from `state`, recompute `sum`, sha256 equals the pin. Browser runs are not a golden (QA probe: run-to-run differences in Chromium).
     Golden 1 (sim trace) pin at `a01faea`, same harness file, same command: **`50a87ddbf89c44751ef33a008541022e146c48c0fed8e16d5114e6d787809de0`** (stable over 2 runs). It equals the existing `GOLDEN_MAIN_4AADCBF`, so the sim trace did not change between 4aadcbf and a01faea; A-0 renames the constant `GOLDEN_MAIN_A01FAEA` with the same value. Plus "a v6 write". Flag-off also refuses v7 saves (newer-save path, ADR M4-9).
- Removal (F-9): one release after M4 reaches Latest, delete the flag-off path, make v7 the only write version, and drop the `v6_backup` retention rule.

## 5. Telemetry fields (M4A-34 + proposal §8)
| Event | Fields | Pinned |
|---|---|---|
| `upgrade` (changed) | + `track: farm\|hens\|egg_value\|collection`; keeps `newLevel, cost, coinsBefore`; `upgrade` alias kept 1 release | yes |
| `milestone_reached` (new) | `track, level, mult` | yes |
| `balanced_tier` (new) | `tier, min_level` | yes |
| `save_migrated` (new) | interim F-0: `{from: 6, to: 6, migration: 'tracksV7_marker'}`; S-4: `{from: 6, to: 7}`; both + `refund_cents, farm_level, backup_stores: 'ls'\|'both'` | yes, once |
| `save_migration_aborted` (new) | exactly `{store: 'ls'\|'idb', reason: 'quota'\|'error'\|'idb_timeout'\|'idb_read_error'\|'readback_mismatch'\|'commit_write_failed', path: 'interim'\|'v7'}` (same set in §3, tests, spec note) | yes, once per load |
| `save_backup_idb_unavailable` (new, M4-16) | `{reason: 'absent'\|'security', path}` (no `timeout`/`blocked`: a timeout defers, §3c) | yes, once per load |
| `tracks_explainer` (new) | `action: shown\|dismissed` (+ `via: button\|tap\|esc\|timeout`, proposed) | yes |
| `worker_hire`, `worker_yawn` | + `hens_level, egg_value_level` | as today |
| `session_start/end` | + `farm_level, hens_level, egg_value_level, collection_level`, + `m4_flags` (proposed: bitmask of enabled flags so playtest data is attributable) | yes |
| later slices | `worker_paused/resumed`, `collectible_*`, `frenzy_*`, `ability_activated`, `streak_peak`, `order_completed_bonus`, `market_mode_changed` | per spec |
Rule: new events only emitted with their flag on; a telemetry schema test pins event names + field types.

## 6. CI gates
Existing (must stay green on every PR): `vitest run` (464 on main), `tsc --noEmit`, `check-economy-copy`, `sync-economy --check`,
`vite build` + `check-release-build`, `check-globals`, QA build, rc0 browser suite on Chromium/Firefox/WebKit.
New for M4:
1. **flag-off golden** (`m4a-flag-off.test`) — required; trace hash + storage-bytes golden pinned to main `a01faea` (§4).
2. **migration fixture suite** + SHA256SUMS check of `tests/fixtures/saves`.
3. **TR-5 pacing gate: report-only (9.3).** It becomes blocking after **5 consecutive green runs with no flake**; Head of Engineering flips it.
4. **rollback browser test** (rc1 build × v7 fixtures, 3 engines, storage byte-identical).
5. **telemetry schema test**.
6. **release-default check**: release build has `m4.enabled` = committed default and no debug toggles.
**Box-load rule (CEO, 2026-10-16 21:11):**
- every browser step (Playwright, rc0, check-globals) runs under `flock /workspace/egg-farm-studio/.browser-test.lock` (`BROWSER_TEST_LOCK` overrides the path), and gate-all logs each step's lock wait;
- vitest runs with 2 forks: `--poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1` (`VITEST_WORKERS`; vitest 2.1.9 rejects `--maxWorkers=2` alone);
- QA runs take priority;
- gate-all's `trap` cleanup kills only its own servers and browsers on exit, so nothing is left running idle.
gate-all also does a preflight check (`run npm ci`, exit 2), fails fast (`KEEP_GOING=1` for a full report), checks for a clean tree before the release build, and supports `RETRY_FLAKY=1` (a pass on retry is FLAKY, exit 3).
**CI runs locally on the box via `scripts/gate-all.sh` (9.6).** No hosted Actions minutes: that is spend and needs the CEO. A hosted-CI proposal with costs is optional, comes later, and goes via HoE.

### 6a. AC → test map
| AC / decision | Test | Slice / owner |
|---|---|---|
| M4A-27 `readMax`/`writeVersion` = 7 **only with M4 on** (flag-off stays 6, v7 written only with M4 on), chain to v7 | chain v1..v6 → v7, 21 spec fixtures + 961-save sweep, validator ranges | S-4 · SAV |
| M4A-28 price-matched start | `migrateTracksV7` unit tests, frozen price table, C ≥ F+5 fixtures; marked v6 idempotent | S-1/S-4 · SAV (F-0 interim · FE) |
| M4A-29 cap-and-refund | lowered-max refund table; refund 0 on current data | S-4 · SAV |
| M4A-30 order on load | boot grant ×1.0 under v6 rules, then in-session migrate; re-derived 19800 (boot) / 24750 (next load); abort-then-retry case | S-5 · SAV |
| M4A-31 downgrade/rollback | flag-off v6 write; flag-off refuses v7 (§3b); rc1 build × v7 fixtures byte-identical (3 engines) | S-2, S-4, S-6 · SAV; QA guard |
| M4A-31(a)/(f)1, ADR M4-12/13 | backup-failure test per store (§3 Tests) | S-3 · SAV, F-0 · FE |
| ADR M4-14 flag-off rules after abort | tracks UI/purchases disabled after abort; save stays plain v6 | S-3 · SAV, U-1 · UI |
| ADR M4-15 commit marker + orphans | `v6BackupId` = backup `migrationId`; orphan (mismatch / no id) not restored, not protected, replaced only by the next migration; corrupt-v7 recovery and `.bak` restore keep `v6_backup` | S-3/S-4 · SAV |
| ADR M4-16 IDB absent vs deferred / read-back / async commit | absent ⇒ LS-only; timeout/read error ⇒ deferred; newer-only-in-IDB + slow open byte-identical; read-back pass/fail; commit-write failure; in-session unlock |  S-3 · SAV |
| ADR M4-17 validate before backup | corrupt ⇒ no backup; restore order LS → IDB with checksum | S-3 · SAV |
| M4A-32 tests/fixtures | `m4-v7-*` + marked-v6 fixtures, SHA256SUMS | S-6 · SAV |
| M4A-33 explainer | rc0 cases: once after migration, non-blocking, reduced motion, a11y | U-3/U-4 · UI |
| M4A-34 telemetry | schema test (§5 incl. `save_migration_aborted`) | X-1, F-2, F-3 · FE |
| ADR M4-9 / 9.7 flag-off refuses v7 | zero writes per §3b, export works | S-2 · SAV; QA ZW-1..6 |
| ZW-2 export in newer-save dialog | raw bytes equal stored `eggfarm.save`, zero writes | ZW-2 · SAV |
| ADR M4-8 interim marker | flag-off keeps marker + track fields byte-for-byte | F-0b · FE |
| flag-off = main (§4) | trace hash + storage-bytes golden @ a01faea | A-0 · HoE, gate-all |

**QA method for browser tests (binding for S-2, ZW-2, S-3, S-6, U-4 and the QA guard):** Chromium, Firefox and WebKit run **one at a time** under `flock /workspace/egg-farm-studio/.browser-test.lock`; each run serves the build on **its own port (never :4173)**; before any assertion the test reads the runtime build ID (`BUILD_ID`, src/build-id.ts, shown by the app) and checks it matches the SHA under test (`m3-rc1-pre+<sha>`, no `+dirty`), otherwise the run is invalid.

## 7. Architecture risks
1. **Version confusion (v4/v5/v6/v7)** across docs → wrong migration target. Mitigation: ADR M4-1, fix proposal text.
2. **m4a-tracks is 19 commits behind main's save work** (based on `4aadcbf`, before save v4 + dialog); `merge-tree` shows a conflict in
   `src/ui/styles.css` and semantic overlap in save.ts/game.ts load path. Rebase (v2) must re-verify flag-off golden against *a01faea*, not 4aadcbf.
3. **One-way door (reduced by 9.2):** only M4-on builds write v7, and those keep the committed `v6_backup` until Latest. Remaining risks:
   - rc1 builds opening a v7 save must write nothing (S-2 ships on main first);
   - dual write versions add code paths, each covered by a write test;
   - **M4 progress is not reachable from a flag-off build** (refused, not lost): the v7 save stays intact, `v6_backup` is the escape hatch, export works.
4. **Backup storage quota:** the backup doubles the save footprint. On failure the migration aborts and the player stays on a normally saved v6, retried next load (ADR M4-12). Risk: a player near quota never migrates. Watch `save_migration_aborted` in playtest telemetry.
5. **Migration needs balance** (price-matched search depends on economy.csv); a later CSV change silently changes migration output for not-yet-migrated players. Mitigation: freeze the v6→v7 price table as a fixture snapshot in the migration test.
6. **payout.ts base price** must come from `salePriceCents` (comment in tracks.ts) — fix/rc1-qa-bugs branches may reintroduce direct `eggPriceCents` calls. Add a grep/unit guard.
7. **UI churn in app.ts** (65-line diff, shared with rc2 UI work by e80556fd) → merge conflicts. Keep M4 UI in `tracks-ui.ts`, app.ts only wires.
8. **Watch: the WebKit 375px sideways-scroll flake** (rc0 Bug9 farm tab 375×812/375×600, 195/197 once on X-1, rerun 197/197). If it recurs, treat it as a real issue, not a flake.
9. **TR-5 known FAIL** could block ship; gate classified reporting until Economy decision.
10. **`?marketSeed` honoured in release builds** (src/main.ts:83 on main): out of scope for M4; owner Features 95daf662 to gate it to dev/QA builds.
11. **LS lazy flush at commit:** a browser that persists main before the backup, with IDB absent, could leave a committed main with no backup (§3c N6). Accepted; watch `save_migrated.backup_stores`.

## 8. Task breakdown (one area per PR)
Owners: **SAV** = Saves 3ba38cf3 · **UI** = e80556fd · **FE** = Features/Economy 95daf662 · **ARCH** = Architect (review/tooling).

| ID | Task (PR) | Owner | Depends on | Size |
|---|---|---|---|---|
| A-0 | Rebase m4/m4a-tracks onto origin/main a01faea → `m4/m4a-tracks-v2` (tonight); resolve styles.css; regenerate the flag-off golden; all gates; send the v2 SHA | **HoE** | — | M |
| U-0 | Turn /workspace/m4v2-tools/ (single.config.mjs, inline-public.mjs, smoke.mjs) into `npm run build:html` (single-file playtest HTML + smoke) | UI | A-0 | S |
| X-1 | `scripts/gate-all.sh` + telemetry schema test skeleton | ARCH | — | S |
| F-0 | On m4/m4a-tracks-v2: (a) interim path writes `eggfarm.save.v6_backup` (+ IDB `save/v6_backup`) once before the in-place price-match, and aborts to plain v6 if either write fails (ADR M4-12; fixes v3 review M1); (b) test that a flag-off build saves a **marked** save without stripping `tracksV7`/`hensLevel`/`eggValueLevel`. Must land before playtest builds spread marked saves | FE (with SAV review) | A-0 | S |
| S-1 | Migration chain takes `balance`; move `migrate-v7.ts` → `save/migrations/v7.ts`; split `readMax(b)` / `writeVersion(b)` (still 6/6) | SAV | A-0 | S |
| ZW-2 | **Separate Saves PR, before S-2:** `Export save` `[data-testid=newer-save-export]` on the `.newer-save` layer (raw stored string, no wrapper or migration, zero writes; `Try again` stays; §3a.2) | SAV | — | S |
| S-2 | **ETA Sat 22:00.** Newer-save refusal = zero writes per §3b (autosave, pagehide, .bak, IDB mirror, 2nd tab) + 3-engine test, **on main**; also covers **a flag-off build opening a v7 save** (same refusal, .bak intact, export works) | SAV | **ZW-2** | M |
| S-3 | `v6_backup` protocol §3c (LS required + IDB when available, `migrationId`/`v6BackupId` commit marker, write-once only once committed, validate before backup, async in-session commit, flag-off rules until commit, Reset clears it). On failure: abort, keep v6 under flag-off rules, save v6 normally (no marker), "Can't save" only if the v6 save also fails, retry next load (ADR M4-12..17); quota-injection tests per store (v6 kept, no loss across page close) | SAV | S-1 | M |
| S-4 | Real v6→v7 bump (replaces the interim marker). Handles unmarked v6, marked v6 (idempotent: no re-migrate; records the unapplied interim refund in `migrationRefundCents`) and v7. Wire `migrations[6]`; readMax 7 with M4 on (flag-off refuses v7, ADR M4-9); write v7 only when M4 is on; keep the committed `v6_backup` until Latest; validator; flag-off v6-write, flag-off-refuses-v7 and M4-on v7-write + committed-`v6_backup` tests (`.bak` rotates, not asserted) | SAV | S-1, S-3, S-2, **ZW-2** | M |
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

**Ordering:** start now: A-0 (HoE, tonight), ZW-2 then S-2 (Saves, ship on main first), X-1 (ARCH). Features (95daf662) branches from the v2 SHA once HoE sends it; every FE/UI M4-A task waits for it. Then S-1→S-3→S-4→S-5/S-6 (critical path, ~2–3 days);
F-1/F-2/F-5/U-1 in parallel after A-0; U-3 after S-4; Q-1 last. Merge order into main: ZW-2, S-2, X-1, A-0 (flag off), S-1, F-*, U-1/U-2, S-3, S-4+F-3 together, S-5, S-6, U-3/U-4, Q-1.

## 9. Decisions (HoE, 2026-10-16 19:29) and remaining open questions
1. **Backup write fails → decided, then SUPERSEDED for the backup case by 9.10 / ADR M4-12** (the dialog applies only if the normal v6 save also fails): Reuse the v2.2 "Can't save" dialog once per session, then the persistent toast. Never block play; never drop in-memory state (ADR M4-5).
2. **Flag-off writes → decided:** flag-off builds keep writing v6; v7 is written only with M4 on. The v6 copy (`v6_backup`) is kept until M4 reaches Latest, and the v7 reader accepts v6 (ADR M4-4, **supersedes M4-2**).
3. **TR-5 → decided:** report-only. It becomes blocking after 5 green runs in a row with no flake; HoE flips it (ADR M4-6).
4. **v2 base → decided:** origin/main `a01faea`. HoE owns the A-0 rebase tonight; Features branches from the v2 SHA.
5. **QA guard → decided:** QA Saves (33ec1b55) owns the M4 guard, a new file `qa/m3-scripts/rc1-guard-save-qa-m4.mjs`.
6. **CI → decided:** no hosted minutes (spend, needs CEO). Gates run locally via `gate-all.sh`. A hosted-CI proposal with costs is optional and comes later via HoE (ADR M4-7).
7. **Flag-off opens v7 → decided: REFUSE** (ADR M4-9). Same as a newer save: newer-save dialog, zero writes, never v6 over v7, `.bak` escape hatch, export available.
8. **Interim marker → decided (HoE, 20:28):** v2 `3351d6c` migrates inside v6 via `tracksV7`. Kept for playtest and M4-flagged builds only, never in a release default. S-4 does the real bump; F-9 removes the marker (ADR M4-8).
9. **Interim backup → decided (HoE review, 20:31):** the interim marked path writes a v6 backup once, before the in-place change. Owner: Features 95daf662 (task F-0, ADR M4-10).
10. **Backup failure aborts → decided (HoE 21:24; review m4-m4a-tracks-v3-677317d M1):** spec M4A-31(a)/(f)1 governs; see ADR M4-12. Supersedes the "keep playing migrated" part of 9.1.
11. **Partial backup → decided (Architect, HoQA M-4):** an aborted attempt removes any backup it wrote; the retry writes fresh from the unmarked v6 (ADR M4-13). Also adopted: QA zero-writes rule (§3b), ZW-2 before S-2 with ZW-2 PASS on its own SHA, flag-off golden pinned to a01faea (§4).
12. **Abort/retry protocol → decided (Architect, Code Reviewer ab8f366 Majors 1–4):** flag-off rules after abort (M4-14); `migrationId`/`v6BackupId` commit marker (M4-15); LS required, async in-session commit (M4-16; its IDB-unavailable and 2000 ms parts are SUPERSEDED by item 13); validate before backup, restore LS → IDB with checksum (M4-17). Reset clears `v6_backup`.
13. **IDB absent vs deferred, orphans, commit order → decided (HoE-approved N1/N2, 2026-10-16 ~22:00):** LS-only only when IDB is definitely absent; 1.5 s timeout or read error defers; read-back check; orphans touched only by the migration path; runtime gate `m4Active`; commit-write failure keeps old main (ADR M4-16 rev, M4-15 rev, M4-18). 2000 ms rulings superseded. HoP spec note needed for M4A-30, M4A-31(a)/(f)1, M4A-33 and v1.6 (g)/(h).
