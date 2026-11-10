# CSR-AC-IDB1 fixtures: corrupt IndexedDB-only save (D-HOP-34)
Built 2026-10-19 ~10:15 CEST by HoQA (Saves & Release Verification) against main **dd223f5**. Generator: `make-idb1.mjs`. Probe: `qa/csr/tmp-dd223f5/tests/csr-idb1.qa.test.ts`, output in `qa/csr/probe-idb1-out.json`.

## Real storage names (dd223f5 `src/save/idb-mirror.ts`)
- **Database `eggfarm`, version 1.** Defined at :11 (`IDB_NAME`) and opened at :31/:46 as `open(IDB_NAME, 1)`.
- **Object store `save`.** Created at :32/:47 with `createObjectStore(IDB_STORE)`: no keyPath and no autoIncrement, so keys are out-of-line.
- **Key `main`** (`IDB_KEY`). The value is the raw save **string**, exactly the bytes localStorage `eggfarm.save` would hold.
  - `readStrict`/`read` (:60, :66) return `null` for any non-string value, so the game treats a non-string value as **no copy**.
- **No other IDB key is used at dd223f5.** M4-A never writes IDB `v6_backup` (spec §0, ADR M4-24).

## Fixture format (one `*.manifest.json` per case)
```json
{ "fixtureId": "...", "ac": "CSR-AC-IDB1 (D-HOP-34)", "builtAgainst": "dd223f5",
  "idb": { "db": "eggfarm", "version": 1, "store": "save", "keyPath": null, "autoIncrement": false, "key": "main",
           "records": [ { "key": "main", "valueType": "string" | "structured-clone-object", "value": <string or object> } ] },
  "localStorage": { "set": { "eggfarm.ui": "{\"onboardingDone\":true}" },
                    "mustBeAbsent": ["eggfarm.save", "eggfarm.save.bak", "eggfarm.save.v6_backup", "eggfarm.save.corrupt.index"] },
  "valueSha256": "<sha256 of the string value, or of JSON.stringify(object)>", "todayValidateReason": "...", "note": "..." }
```
- String values also exist as `*.idb-main.raw` (byte-exact) for hash checks.
- **Seeding in a browser.** Run this on the game's origin *before* the game boots, e.g. on a blank same-origin page, then navigate to the game:
```js
async function seed(m) {
  localStorage.clear(); for (const [k, v] of Object.entries(m.localStorage.set)) localStorage.setItem(k, v);
  await new Promise((res, rej) => indexedDB.deleteDatabase(m.idb.db).onsuccess = res);
  const db = await new Promise((res, rej) => { const r = indexedDB.open(m.idb.db, m.idb.version);
    r.onupgradeneeded = () => r.result.createObjectStore(m.idb.store); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  await new Promise((res, rej) => { const t = db.transaction(m.idb.store, 'readwrite', { durability: 'strict' });
    for (const rec of m.idb.records) t.objectStore(m.idb.store).put(rec.value, rec.key); t.oncomplete = res; t.onerror = () => rej(t.error); });
  db.close(); for (const k of m.localStorage.mustBeAbsent) if (localStorage.getItem(k) !== null) throw new Error(k);
}
```

## Cases
| Fixture | Value in `save/main` | validate() today | sha256 of value |
|---|---|---|---|
| IDB1-abc | OQ-1 payload, byte-identical (farmLevel "abc", coins $77,777.77, saveSeq 5) | `invalid_state` | `7dea4a432f643ad367a34b43428265131a67b7f3a924112156fd9711173416ed` |
| IDB1-truncated | OQ-1 payload cut at half its length | `parse` | `afc1d4798cbd72bcd1251fa82ab5ab723ae561b9543225fc554660be4c217b34` |
| IDB1-wrongtype-version-string | OQ-1 payload with `"version":"6"` | `wrong_type` | `2be567d229f9fba7689a0f39cdf2bf6b2ff4ea3562d22aa20934993815929c1d` |
| IDB1-nonstring-object (optional) | a **valid** save (P4-ls-valid-seq5) stored as an object, not a string | never read (readStrict → null) | sha256 of JSON.stringify: see manifest |

## Expected under CSR-AC-IDB1 (HoQ wording, D-HOP-34)
For every case except the optional one (see Q-IDB4):
1. **No silent new game.** `recoveryOutcome` is non-null.
2. **The raw bytes are preserved as corrupt.\* in IndexedDB (same database and store, `eggfarm`/`save`).** They must be byte-equal to `valueSha256`, and preserved **before** any write to `save/main`.
3. **The recovery dialog shows**, with an Export of the corrupt bytes. With nothing else valid, that is CSR-9 M3 "A fresh start" + "Export old save file".
4. **`save_corrupt {store:'idb', reason:<parse|wrong_type|invalid_state>, …}`** is emitted exactly once and flushed.
5. A fresh farm is allowed only after 1–4. localStorage gets no `eggfarm.save.corrupt.*` for these bytes unless the AC also asks for that.

## Today at dd223f5: EXPECTED TO FAIL (probe confirms it)
The probe ran the main.ts boot order without UI/lease (`openForBoot` → `reconcile` → `new Game(…, mirror, idbRaw)`) on the repo's own fake IDB (copied from tests/idb-mirror.test.ts), seeded from these manifests. vitest, 2 workers: 5/5 pass, and those tests assert today's failing behaviour.
- **All 4 cases.** reconcile returns `'ls'`, then loadSafe returns `recovery: null`. The result is **`isNewGame: true`, coins 0, no dialog, no `save_corrupt`**: only `session_start` is emitted. Nothing is preserved, in either localStorage or IDB.
- **truncated / wrongtype / nonstring.** The fresh farm's first save **overwrites `save/main`**, so the corrupt bytes are destroyed: `rankOf` gives them rank −1 (save.ts:41-44) and the put proceeds.
- **abc.** `save/main` survives for now, but only because its saveSeq 5 outranks the fresh farm (idb-mirror.ts:83 skips the put). It will be overwritten, still never preserved, once the fresh farm's saveSeq passes 5.

## Open wording points for the AC (raise via HoQ)
- **Q-IDB1:** the corrupt.\* key name inside the `save` store (`corrupt.<ts>`?), its index, and the cap. Does CORRUPT_KEEP=3 apply per store or jointly with localStorage?
- **Q-IDB2:** how `store:'idb'` coexists with CSR-10's `recovered_from`/`tried` fields.
- **Q-IDB3:** IDB status `unknown` with an LS main absent: is that CSR-13 defer, or IDB1?
- **Q-IDB4:** does a non-string value in `save/main` count as corrupt? Today it is invisible. I recommend treating it as `wrong_type`.
- **Q-IDB5:** IDB1-abc is not a CSR-17 repair target, because CSR-17 repairs the LS main only. Expect the chain (v6_backup → fresh/M3) unless HoP extends CSR-17.
