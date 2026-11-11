# M5S-STK-* + M5S-VER-6 early-signal fixture probes at rc/v5 3f582db (2026-10-30 ~13:38 CET)
Cases: qa/v5-saves/m5-save-cases-DRAFT.md G1 (STK, 4) + G3 (VER-6), read only (not edited). Spec: streak v1.3.2 product/collection/m5-streak-tap-coins-spec.md sha1 acb4cdbb; SAVE_VERSION: D-HOE-20261030-19.
Probe: qa/v5-saves/probes/m5/stk-ver.probe.test.ts sha256 52ec2f539eca044ff23204a6cc88e4877034d90719f6e43b5214fe76644d5598 (copy here). Fixtures + Node only: no browser, no ports. npm ci + vitest via lane-run saves-qa, forks max 2.

| Case | Result | Tests |
|---|---|---|
| M5S-STK-NOKEY-SIM | PASS | 1/1: Game with streak+tapCoins ON, 6 credited collects (s>0, tapCreditCdS>0, streakRun) -> Game.save()/serialize()/save(): no streakBest/streak/tapCoins key at any depth, no SESS-2 key |
| M5S-STK-NOKEY-SRC | PASS | 1/1: no "streakBest" in src/ (case-insensitive); state.ts/m5-state.ts declare no streak/tapCoins/streakBest field |
| M5S-STK-HAND-ON | PASS | 4/4 fixture variants (numbers/objects, 'x', null, NaN-as-null) |
| M5S-STK-HAND-OFF | PASS | 5/5 (4 Game variants + direct m5Load) |
| M5S-VER-6 | PASS | 5/5 (6a static+v5->6, 6b written as version 6, 6c flag-off build not-newer + unknown keys byte-identical, 6d pre-M5 v6 validate/m5Load, 6e Game boot: no save_migrated, telemetry = M5-off build) |
Total 16/16 (run.log). Mutants: 5/5 killed (mutants.log).

## Scope notes
- STK covers GAME-WRITTEN saves only (cross-ref SESS-1..4 in m5-save.probe.test.ts for the 8 F1a session keys + streakRun).
- I_ref ring (irefRingCents/refWarmS) has no writer at 3f582db; NOKEY-SIM injects it into the live state so the scan still covers it.
- VER-6 breeds parts: breeds code is not in 3f582db. 6c only shows an opaque fixture `breeds` object round-trips byte-identical as an unknown key on a flag-off build; the real breeds sanitiser/round-trip stays "to run on the final RC".
- VER-6 fixtures are marked farms (tracksV7=1 + v6BackupId) so M4's own tracksV7_marker migration (a legitimate save_migrated) never runs; any save_migrated would be M5's.

## OQ-1 (MINOR) observed hand-added-key behaviour (recorded, not asserted as dropped)
KEPT and IGNORED, in all 8 Game variants (flags ON and streak+tapCoins OFF): the load is not corrupt (no recovery, no corrupt_preserve copy, not read-only),
state after load and after a tick + credited tap equals the control save without the keys (streakS starts at 0 / per_tap, coinsCents identical), telemetry identical (no event),
and Game.save() re-writes the keys unchanged as unknown keys, e.g. {"streakBest":12,"streak":{"s":9},"tapCoins":500}; NaN is stored as null by JSON. Matches the cases doc (save.ts:102 spread, not in SESSION_ONLY_KEYS m5-fields.ts:33).

## Probe fix
P1: first run 15/16, VER-6a failed on a probe bug (migrations block sliced at the first '};', which is inside migration 1). Fixed; see run1-probe-fix-P1.log.
    OBSERVED OQ-1 HAND-ON objects/numbers: KEPT (ignored, re-saved as unknown keys); re-saved values={"streakBest":12,"streak":{"s":9},"tapCoins":500}
    OBSERVED OQ-1 HAND-ON strings: KEPT (ignored, re-saved as unknown keys); re-saved values={"streakBest":"x","streak":"x","tapCoins":"x"}
    OBSERVED OQ-1 HAND-ON null: KEPT (ignored, re-saved as unknown keys); re-saved values={"streakBest":null,"streak":null,"tapCoins":null}
    OBSERVED OQ-1 HAND-ON NaN-as-null: KEPT (ignored, re-saved as unknown keys); re-saved values={"streakBest":null,"streak":{"s":null},"tapCoins":null}
    OBSERVED OQ-1 HAND-OFF objects/numbers: KEPT (ignored, re-saved as unknown keys); re-saved values={"streakBest":12,"streak":{"s":9},"tapCoins":500}
    OBSERVED OQ-1 HAND-OFF strings: KEPT (ignored, re-saved as unknown keys); re-saved values={"streakBest":"x","streak":"x","tapCoins":"x"}
    OBSERVED OQ-1 HAND-OFF null: KEPT (ignored, re-saved as unknown keys); re-saved values={"streakBest":null,"streak":null,"tapCoins":null}
    OBSERVED OQ-1 HAND-OFF NaN-as-null: KEPT (ignored, re-saved as unknown keys); re-saved values={"streakBest":null,"streak":{"s":null},"tapCoins":null}

## Cleanup (13:38 CET)
qa/scratch/wt-stkver-3f582db removed (rm -rf) plus temp logs/script (copied here first). lane saves-qa pids 3465637 3469187 3469617 3471520 3475689: all gone (exited on their own; no lane-kill needed); no process left in their groups.
