# AC-P13 (1) v1.3.7 — load→save with no sim step, real save entry point, rc/v5 a923206 (QA Saves, 2026-10-30 ~10:30 CET)
Spec: product/workers/m5-worker-pause-spec.md v1.3.7 sha1 ee9adae5f3738c96e90aee7ac2caeb310c785a1c (sha1sum OK), sha256 247950ba…b8c4.
Worktree: qa/scratch/wt-pause-a923206 (detached a923206b80f2c301341d100d9eaa34554e948fb9, read-only; probe copied in and removed; removed after).

**Verdict: NARROW TO THE TWO FIELDS.** `paused` and `callLockoutS` are present and unchanged in every case (flag 0 and 1, with/without .bak, LS-only and LS+IDB boot, gap 0/5 s/60 s). The saved file is never byte-identical to the input:
- `saveSeq` +1 on every save, even at gap 0 — src/save/save.ts:159 (m4SaveSeq) via :175.
- `savedAt` re-stamped to now — src/save/save.ts:147 (serialize), time from src/game.ts:276; the boot save is src/game.ts:105.
- `sum` + `state.pendingOfflineEggs` change when the gap is ≥ 60 s — offline grant src/game.ts:100.
- `.bak` gets the previous main on every save — src/save/save.ts:180 (bakAllowed defaults true, game.ts:45).
- IDB mirror gets each new main, never the input bytes — src/game.ts:278.
- Other keys written on boot: eggfarm.install_id (src/telemetry/telemetry.ts:7, new install) and eggfarm.telemetry (:68).
- Lease/tab keys: untouched by Game; main.ts writes the lease on every boot (src/main.ts:90 → src/save/tab-lease.ts:50, heartbeat :64), outside the save file.
- `state` is byte-identical to the input state at gaps < 60 s (probe rows dt 0 / 5000: main_boot.state = identical).
Proposed AC-P13 (1) text: "the save's `state` is byte-identical to the input's (reload gap < 60 s), `paused` and `callLockoutS` are present and unchanged; `savedAt`/`saveSeq` are re-stamped as on every save." Minimal alternative: assert only the two fields.

## What my #91 36-case check covered (and did not)
Covered: validate → m5Load → serialize(o, fixed NOW, **no saveSeq**) per fixture, compared base vs head (not output vs input); loadSafe read path for main, the .bak fallback (main absent) and the exp1 LS+IDB reconcile capture. All with an in-memory KV, no Game.
Not covered: save() (flagOffShape, m4SaveSeq, .bak rotation, newer-save guard), the Game boot sequence (m5Load inside Game, offline grant, boot save game.ts:105), Game.save() + mirror write, telemetry/install-id keys, lease/tab keys, and any input-vs-output byte comparison. This probe covers all of those except the lease (main.ts/DOM) and a stale-LS reconcile where IDB wins (save.ts:349; LS = IDB here).

## Files
probe-acp13-boot.test.ts (probe), run.sh, 10-boot-probe.jsonl/.log (final: committed M4 farm, tracksV7:1), 10a-boot-probe-unmarked-v6.* (first run, superseded: unmarked v6 farm went down the tracks-migration path, kept for the record), 20-file-line-evidence.txt.
