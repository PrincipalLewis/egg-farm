# M41-7 recovery notice + IDB corrupt-copy interface (Saves → UI, PM, HoQA) · 2026-10-19 10:20 CEST
Spec: product/farm/corrupt-save-recovery-spec.md **v0.3.3 FROZEN** (final; includes v0.3.2 IDB1-1..8), sha256 verified: bca075fea10f7fb973f56dad941870229129738a52846fea72bf2146050bae9c. (Was v0.3.1 0771dac0…a1ad0.)
Copy: art-ux/copy/csr9-recovery-copy.md. Code base: main dd223f5, branch fix/saves-csr-loadsafe (/workspace/wt-m41-7).
Saves owns the loader and this contract. UI owns the strings and layout. Until UI swaps the copy, `recoveryCopy()` keeps today's AC14b strings (src/ui/save-recovery.ts:30-43), so existing browser tests keep passing. The one exception is M4, which has no legacy copy and therefore ships with the final Art & UX strings.

## 1. Loader output (src/save/save.ts, `Recovery`; additive, all existing fields unchanged)
```ts
type RecoverySource = 'bak' | 'idb' | 'v6_backup' | 'none' | 'deferred';
type TriedSource = 'bak' | 'idb' | 'v6_backup';
interface Tried { source: TriedSource; result: 'valid' | 'invalid' | 'absent' | 'unavailable'; reason?: string } // reason: CorruptReason | idb_blocked|idb_timeout|idb_read_error | no_global|security
interface Recovery {               // existing: case, reason, had_backup, restored_from_backup, copy_failed, raw, cantSave?, live?
  case: 'R' | 'F' | 'Q' | 'D';     // + 'D' = CSR-13 defer
  source?: RecoverySource;         // = save_corrupt.recovered_from
  store?: 'ls' | 'idb';            // where the triggering corrupt copy was found (§3.6)
  tried?: Tried[];                 // tier order actually walked
  prevLevel?: number;              // CSR-9a: strict int >= 0 from corrupt main bytes, else .bak bytes, else unset
  restoredLevel?: number;          // restored copy's farmLevel (as stored; may exceed maxLevel)
  restoredSavedAt?: number;        // restored copy's savedAt, only if validSavedAt(savedAt, now); else unset
  restored_version?: number; migrated?: boolean;
}
type RecoveryOutcome = 'restored' | 'fresh' | 'storage' | 'deferred' | null; // + 'deferred'
```

## 2. Notice selection (pure: `recoveryNotice(r, { storageBlocked, now })` in src/ui/save-recovery.ts)
| id | when | params | legacy copy shown until UI swaps |
|---|---|---|---|
| M1 | case R, source bak or idb | — | v2.1 'restored' ("Welcome back!") |
| M2 | case R, source v6_backup | `variant: 'level' \| 'age' \| 'fallback'`, `level` (= restoredLevel), `ageMs` (= now − restoredSavedAt) | v2.1 'restored' |
| M3 | case F, source none | — (Export link if `raw`) | v2.1 'fresh' |
| M4 | case D (CSR-13 defer) | — (Export "Export save file" if `raw`); button reloads | **final copy now** (title "Couldn't load your farm") |
| M5 | case R + storageBlocked (lease.storageBlocked \|\| g.storageFailed) | same as M1/M2, plus `live` export | v2.1 'restored' + held NO_STORAGE notice (decisions.md:52) |
| storage | case Q (fresh, corrupt copy failed) | — | v2.1 'storage' (unchanged, G2) |
| cantsave | no recovery + storageBlocked | — | v2.2 'cantsave' (unchanged, G2) |

M2 variant order (CSR-9a): `level` if prevLevel is set and differs from restoredLevel. Otherwise `age` if restoredSavedAt is set. Otherwise `fallback`.
{age} text is UI-owned (CSR-9b), formatted from `ageMs` (negative → "a few minutes").
Defaults G1–G3 apply:
- M5 keeps the Export secondary.
- M1/M2 show an Export link only when copy_failed.
- M3/M4 show the link when raw bytes are in memory.

## 3. Telemetry
- `save_corrupt` (once per recovering boot, flushed): `reason, had_backup, restored_from_backup, build, copy_failed?` + `recovered_from: RecoverySource`, `store: 'ls'|'idb'` (required), `tried`, `restored_version?`, `migrated`.
  - `restored_from_backup` = true for bak, idb and v6_backup.
  - `had_backup` = .bak present (unchanged).
- `save_recovery_notice_shown` / `save_recovery_notice_dismissed`: `{ notice: 'M1'|'M2'|'M3'|'M4'|'M5'|'storage'|'cantsave', source: RecoverySource | null, variant?: 'level'|'age'|'fallback' }`.
- `save_restore {source:'idb'}`: unchanged name. It fires only for the silent non-corrupt stale-LS restore (G7, D-HOP-35), now emitted from Game after the single-owner loadSafe, with a unit test.

## 4. IndexedDB corrupt copies (CSR-AC-IDB1)
Verified against src/save/idb-mirror.ts and the LS scheme in src/save/save.ts:130-133, :241-250.
1. **DB/store.** `eggfarm` v1, store `save`, out-of-line string keys (idb-mirror.ts:11, :31, :46-47). The main copy is key `main`. **No schema bump**: new keys in the same store need no `onupgradeneeded` change.
2. **Key.** `corrupt.<ts>`, with the **same collision suffix as LS**: `corrupt.<ts>-<n>`, n = 1, 2, … (LS: `eggfarm.save.corrupt.<ts>` / `-n`, save.ts:244). ts = the loader's `now` (ms epoch, Date.now()); the LS .bak copy uses now+1 (save.ts:281, :290). Keys can collide within a millisecond (and LS main and an IDB copy share `now`), so the suffix is required. The LS and IDB namespaces are separate, so equal ts across the two stores is fine.
3. **No index key.** IDB enumerates by prefix: `IDBKeyRange.bound('corrupt.', 'corrupt.\uffff')` with getAllKeys / openKeyCursor, all 3 engines. LS needs `eggfarm.save.corrupt.index` only because KV can't enumerate (save.ts:131-132).
   - **Order by parsed (ts, n), not raw key order.** Lexical order breaks for n ≥ 10.
   - Cap **3 per store, separate from LS** (`CORRUPT_KEEP`, save.ts:133). Oldest evicted (save.ts:247 semantics). Evict in the **same readwrite transaction** as the put.
4. **Dedupe.** Strings: skip if `===` to any existing corrupt.* value (per boot and across boots, G6). Non-strings: compare a fingerprint, `typeof` + `JSON.stringify(value)` inside try. If it can't be stringified (cyclic, BigInt, Blob), skip dedupe; the cap still bounds the copies.
5. **Non-string at `save/main`** = corrupt, reason `wrong_type`, stored structured-cloned as is (the value just came out of IDB, so it is cloneable). **Today it is invisible**: readStrict/read return null for non-strings (idb-mirror.ts:60, :66), so it reads as "absent", and write() puts over it because its rank guard only applies to strings (:83). The boot read must return the raw value plus a kind (`'string'|'nonstring'|'none'`).
6. **Failure.** A synchronous `DataCloneError` from put(), or a `QuotaExceededError` / abort on the transaction → `copy_failed: true` (store idb). It never blocks the chain or the notice (as in CSR-13). **The mirror then stays OFF for the session** (`mirror = null`), so save/main is never overwritten while its bytes are unkept.
7. **Ordering (Saves QA critical).** Today a new farm's first save (game.ts:87 → mirror.write, idb-mirror.ts:83) overwrites save/main and destroys the corrupt bytes. The IDB copy is therefore written **and awaited (transaction complete)** in boot after `lease.claim` + `owns()` (main.ts:90-94, CSR-8) and **before `new Game`** (main.ts:95). Only after it completes is the mirror handed to Game. Copy failed → mirror null (item 6).
8. **Untouched by existing paths.** reconcile/pickNewest read only the passed main raw (idb-mirror.ts:95-116). write() and clear() touch only key `main` (:83, :89). Game.clearMirror (Reset, game.ts:302) deletes only `main`, so IDB corrupt.* survive Reset, as LS corrupt.* do (RESET_KEYS, save.ts:112).
9. **`store` rule.** `'ls'` when the LS main (or, with no main, the .bak) was the corrupt trigger. `'idb'` only when LS had no main and no .bak, and the IDB main was invalid (CSR-AC-IDB1 case i). Case (ii) with a corrupt LS main → `'ls'`, with `tried` showing idb invalid. An LS-side and an IDB-side copy can both exist, and `store` names the trigger.
10. **IDB unknown → CSR-13 defer.** CSR-17 repair stays LS-only.
