# PR #12 (L30+ v2 + L30-19b hire nudge) @ 94dfc06, stacked on m4/m4a-tracks-v3
Diff vs stack base e38cf76. Commits: 6809f8e (L30+ D1/D2/D4/D8 clamps, carried from #9), 02930a2, 5559c3d, 94dfc06. Read-only. Claude: 0 calls (verified by hand). /tmp copy (git-initialised).

## Verdict: CHANGES REQUESTED (1 major, economy; needs an Economy ruling, not a code bug). Save field, determinism and globals are fine.

## Runs (/tmp)
- `tsc --noEmit` clean.
- `sync-economy --check` up to date.
- vitest 675 pass, 2 skipped, 1 fail. The failure is the /tmp artefact cost-segments.test.ts:35, which reads ../../product/economy.f1.csv; with product/ adjacent it is 678/678, matching the claim.
- `npm run build` + check-release-build OK.
- `check-globals` (Chromium): PASS. Release globals = [eggfarmExportTelemetry] only; refused-boot globals [].

## Findings
- **MAJOR: the "extra level" price is often BELOW the row cost, so buying above F+3 is cheaper than buying the same level in-cap later.** src/sim/tracks.ts:21 (`trackExtraCost(...) || trackCost(...)`), src/config/formulas.ts:116-121.
  - Not negative or zero: share is validated 0..1 (scripts/sync-economy.ts:185), mult ≥ 1 (:186), and a floor to 0 falls back to the row cost via `||`.
  - Without the max(), the replacement price is floor(share[F] × farmCost(F) × 1.1^(k-1)), independent of the track's own cost curve.
  - Polish CSV b59c4e0d: 7 of 44 extra cells are below the row cost. E.g. F40 Egg value L43 = 142,424 vs row 260,165, and Hens L43 = 142,424 vs 143,835.
  - Baseline 3e3d61fd: 22 of 44 below, every Egg value cell F40-50. E.g. F50 L54 = 758,736 vs 1,047,958.
  - Repro: at F40, buy Egg value to L43 (an extra level) for 142,424, against 260,165 for the same level once F41 puts it in cap. The tests pin this: tests/l30plus.test.ts:52-56 assert the floor formula, not ≥ row.
  - Live data is unaffected: balance.json has no hv_extra_cost_farm_share, so there's no runtime change until the L30+ CSV ships.
  - Fix or ruling: Economy confirms the intent. Otherwise restore `max(row, extra)` or use a per-track share, and add a test that the extra price ≥ the row cost for every F/k.
- **MINOR: "flag-off equals main" isn't strictly true.**
  - The nudge (src/game.ts:104-121, src/ui/app.ts renderHireNudge) is not gated by m4On, so a flag-off build shows it at F25 with 0 workers.
  - checkHireNudge writes `hireNudgeDone: 1` into any save that has a worker on the first dispatch/frame, so flag-off storage bytes differ from main for those players.
  - The behaviour is intended per l30plus-spec.md:176 and decisions 00:01, but the parity claim and any storage golden should list it as an approved delta.
- **MINOR: no load-path test for hireNudgeDone.** tests/hire-nudge.test.ts:39-61 cover set/save/dismiss in-session only. By reading:
  - **Older or newer build, same version:** the field survives because loaders spread `{...initialState, ...state}` and serialize keeps unknown state keys.
  - **Inside the checksum:** yes, since `sum` covers state.
  - **migrate-v7:** preserves it (src/sim/migrate-v7.ts:33 `{...s}`).
  - **Newer-save guard:** not involved (no version bump).
  - **Old saves:** default undefined ⇒ eligible only with 0 workers; saves with workers get 1 on first frame.
  - Add a test: load a v6/v7 fixture with and without the field, through loadSafe, migrateTracksV7 and the .bak/IDB roundtrip, plus an a01faea-shape file.
- **NIT:** validate() doesn't type-check `hireNudgeDone`; any truthy junk suppresses the nudge (src/save/save.ts:189 area). Harmless, but treat non-1 as absent.
- **NIT:** the floor of a float product (formulas.ts:120) can drop a cent-dollar at exact-integer boundaries (e.g. 0.29×100). None occur in either CSV today; Math.round(x×1e6)/1e6 before the floor would make it robust.

## Determinism
The hire-nudge state lives in Game (UI and telemetry), outside sim tick/apply. trackBuyCost and trackExtraCost are pure functions of state and balance. The new per-row tables (eggsPerSec, capOverFarmByFarm) are data. No Date/random in the sim path.
