# F17-V6B-REPAIR: CSR-17-8(g) "eligible repair beats a valid v6_backup"
Spec: product/farm/corrupt-save-recovery-spec.md **v0.3.1 FROZEN**, sha256 `0771dac08dc39f827629e4d1551fa7931ea7c8dc3c0c7a332f1b2aebcbba1ad0` (snapshot qa/csr/spec-v0.3.1-snapshot.md; identical to product/farm/frozen/…v0.3.1.md). Built 2026-10-19 ~10:20 CEST against main dd223f5.

**CSR-17-8(g), verbatim (spec line 131):** "(g) **eligible repair beats a valid v6_backup** (PM response to HoQA C5; v6_backup is an older pre-migration save, repair keeps coins and current progress): OQ-1 bytes + a committed valid v6_backup record → repair, `recovered_from:'repair'`, the v6_backup record byte-identical; v6_backup is used only when repair isn't eligible (e.g. F17-4BAD + valid v6_backup → v6_backup restored, M2)."

## Files (seed into localStorage exactly as-is; no .bak, no IDB copy)
| localStorage key | File | sha256 |
|---|---|---|
| `eggfarm.save` | F17-V6B-REPAIR.json (byte-identical to the OQ-1 fixture) | `7dea4a432f643ad367a34b43428265131a67b7f3a924112156fd9711173416ed` |
| `eggfarm.save.v6_backup` | F17-V6B-REPAIR.v6_backup.json | `9d8bb93f45547cbc4a46497339a875f1573039699328d4f16098129b3babef9c` |
| companion (8(g) second sentence): `eggfarm.save` | F17-4BAD-V6B.json (= F17-4BAD) | `4d8d588484f8a47c54d9adc6b091be8d029fad6111546a83c64990ff9c6cff40` |
| `eggfarm.save.v6_backup` | F17-4BAD-V6B.v6_backup.json (same record) | `9d8bb93f…abef9c` |

## How the record was built (real game code)
Built by `qa/csr/tmp-dd223f5/tests/csr17-8g.qa.test.ts`; results in `qa/csr/probe-8g-out.json`.
- **Starting farm:** an unmarked v6 save, the OQ-1 farm one day earlier: farmLevel 18, collectionLevel 12, coins 5,000,000, savedAt 1792292380000, saveSeq 3, no tracks fields.
- **Commit:** the farm is loaded with M4 on and Game's own `startTracksMigration()` runs (game.ts:195-236), with `opts.newId` = OQ-1's `v6BackupId` `00112233aabbccdd` and IDB `absent`. The result was `'committed'`.
- **Record:** the bytes the game wrote to `eggfarm.save.v6_backup` (`encodeBackup`, game.ts:202-204).
  - It is `{migrationId:"00112233aabbccdd", raw:<the unmarked v6 input, byte-identical>}`; raw sha256 `773483d5…`.
  - `isCommittedBackup(rec, "00112233aabbccdd")` = true; `decodeBackup` is ok; `validate(raw)` is ok.
  - So the record is committed for the OQ-1 main, whose `v6BackupId` is the same id.
- **Committed main the migration produced** (not shipped, reference only): F18 H18 V10, tracksV7 1. OQ-1's V11 is one Egg value buy later, consistent with OQ-1 being a later save.

## Expected outcome (v0.3.1)
- **F17-V6B-REPAIR → repair.**
  - farmLevel **15** (18 − capOverFarm 3), coins **7,777,777** kept.
  - `recovered_from:'repair'`, `save_repaired {fields:['farmLevel'], count:1, version:6}` plus one `save_corrupt`.
  - The CSR-17 notice "Your Farm level was reset. Your coins and everything else are safe."
  - The original bytes are kept in corrupt.*.
  - **`eggfarm.save.v6_backup` byte-identical (sha256 `9d8bb93f…`) after boot and after the load save. It is neither consumed nor restored, and the live save keeps `v6BackupId` `00112233aabbccdd`, so the record stays committed.**
- **F17-4BAD-V6B → not eligible → v6_backup restored (M2).** The normal migration then re-runs (CSR-4).

## Today at dd223f5 (EXPECTED TO FAIL)
- **Both files:** case **F**, `invalid_state`, a fresh farm with **0 coins** and **F0**. v6_backup is **not consulted** (loadSafe never reads it, save.ts:284-291). One corrupt.* copy.
- **The record stays byte-identical, but it is orphaned.** The fresh farm gets a new random v6BackupId (game.ts:75), so `isCommittedBackup` is false afterwards.
