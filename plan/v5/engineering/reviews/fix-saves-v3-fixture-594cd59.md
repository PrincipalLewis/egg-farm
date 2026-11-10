# PR #6 fix/saves-v3-fixture @ 594cd59: v3 original fixture + v3→v6 load test
Parent a01faea. Test-only: tests/save-v3-original.test.ts (39 lines), tests/fixtures/saves/v3-original-6fad7d9.json, README, SHA256SUMS. Read-only. Claude: 0 calls. Tests run in /tmp copy.

## Verdict: APPROVE with non-blocking changes. The fixture is authentic and the test passes and is deterministic. "Every field survives" is only proven for fields whose v3 value differs from the default, and several new-field defaults aren't asserted.

## Provenance (verified)
- 6fad7d9 (2026-10-15 19:30 UTC+2) is the only SAVE_VERSION=3 commit. Its save() = `JSON.stringify({version:3, savedAt, state})`, with no sum, no .bak, no IDB.
- Fixture state keys exactly match 6fad7d9 `initialState` order. Re-serializing yields the identical bytes. rng is a valid uint32. savedAt = 2026-10-16 21:28:39 UTC+2, matching the README.
- SHA256 56dd9f31… matches SHA256SUMS.
- Not regenerated: it was captured from ~4 min of real-time headless play, which isn't byte-reproducible. The shape and format are consistent with a genuine 6fad7d9 write.

## Runs
- 4/4 pass; 3 repeat runs identical (no Date.now or randomness in the asserts).
- Mutations to src/save/save.ts migrations in /tmp:
  - A: drop collectionLevel ⇒ FAIL (caught)
  - E: round coins to dollars ⇒ FAIL (caught)
  - B: coopFullS default 0→5 ⇒ pass (missed)
  - C: drop manageCdS default ⇒ pass (missed)
  - D: wipe customers + pendingOfflineEggs ⇒ pass (missed)

## Findings
- **MAJOR: the fixture can't detect loss of default-valued fields.** v3-original-6fad7d9.json: `customers: []`, `pendingOfflineEggs: 0`; test :16. Since migrate() fills `{...initialState, ...state}`, a migration that drops these fields still equals v3 (mutation D). The customer migrations (v2→v3 `filled`, later dwell fields) are never exercised. Fix: add a second fixture (or capture) with ≥1 queued customer and pendingOfflineEggs > 0 and assert per-customer deep equality, or keep this one and state its limit in the README.
- **MINOR: new-field defaults are only partly asserted.** test :18-19. manageCdS and coopFullS (v4→v5) aren't checked (mutations B and C survive), and nothing asserts that the only new keys are the migration-added ones. Fix: `expect(Object.keys(s.state).sort()).toEqual([...v3 keys, ...added].sort())` plus explicit values for all added fields.
- **MINOR: no checksum round trip.** After migration, `save(kv, s)` on the current build then `loadSafe` should validate `sum` and deep-equal the state; that's missing. It would catch a serializer or checksum change on old-origin data.
- **NIT: money/big-number not exercised.** 1870 cents is small; there's no precision edge. Acceptable for an authentic capture; covered elsewhere by v4/v5 fixtures.
- **NIT: offline/savedAt.** Offline sanity is good (0 under a minute, cap, coins untouched, integer eggs). loadSafe only at savedAt+1s; a future-savedAt case is left to bug6-savedat tests, which is fine.
