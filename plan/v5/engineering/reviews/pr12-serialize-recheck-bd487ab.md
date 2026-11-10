# PR #12 serialize re-check 3bf2705 → bd487ab
Read-only. 0 Claude calls (the claims were directly testable). Focus is bd487ab (src/save/save.ts, src/game.ts). The rest of the 3bf2705..bd487ab range is the merge of main dfd53b9 plus earlier UI/comment commits.

## Verdict: BLOCKER (1)

### B1. Flag-off legacy bytes drop saveSeq, so a stale saveSeq-bearing IndexedDB copy outranks newer flag-off progress and overwrites it (silent rollback)
- **Code:**
  - save.ts:142-149: with `legacy` set, `saveSeq = undefined`.
  - Ranking is version → committed → **saveSeq** → savedAt (save.ts:47-50, `rankOf`).
  - IdbMirror.write never puts over a higher-ranked copy (idb-mirror.ts:80).
  - pickNewest/reconcile (idb-mirror.ts:92-112) copies the IDB winner into localStorage without preserving the valid LS copy.
- **Effect:** once any unmarked copy with `saveSeq` > 0 sits in IndexedDB, a genuine flag-off build can never update the mirror. Its legacy write ranks 0 < k, so the put is skipped every autosave. On the next boot the stale IDB copy wins and replaces the newer LS save.
- **Where such a copy comes from:**
  - an M4-on build's deferred or aborted session (tracksOff balance ⇒ `M4_BUILD_SESSION_OFF` ⇒ saveSeq kept);
  - any earlier build of this branch (≤3bf2705 always wrote saveSeq).
  - A flag flip on→off (staged rollout or rollback) hits it directly.
- **Design conflict:** this contradicts m4-design.md:193-194 (SQ-1), which assumes the older/flag-off build *preserves* `saveSeq` unchanged.
- **Repro (unit, /tmp/p12d, with balance m4On=false):**
  1. `m4copy = serialize(s{coins 1000}, T0, 5, tracksOff(bOn))` gives a copy with saveSeq 5, written to LS + IDB.
  2. The flag-off build plays an hour: `off = serialize(s{coins 999999}, T0+1h, 6, bOff)` gives a copy with no saveSeq.
  3. `rankCompare(m4copy, off)` = 5 > 0 ⇒ the mirror put is skipped.
  4. `pickNewest(off, m4copy)` = 'idb'. `reconcile(kv{save: off}, m4copy)` = 'idb'. LS coins become **1000**, and no `.corrupt` or other copy of the newer save is left. One hour of progress is lost.
- **Fix options (any one):**
  - Legacy keeps a present saveSeq (preserve `saveSeqOf(prev)`, don't strip). The golden pins only cover unmarked saves without saveSeq, so main's bytes still come out byte-equal for main-origin saves.
  - Or legacy strips saveSeq on both stores atomically and treats seq=0 vs seq>0 by savedAt.
  - Add a test: IDB {unmarked, saveSeq 5, older}, flag-off session autosaves, reboot ⇒ the LS progress survives.

## Claims
| Claim | Status |
|---|---|
| Flag-off + unmarked writes main's exact bytes | ✅ The storage golden (engineering/golden/flagoff-golden.a01faea) passes all of main's pins. |
| tracksV7 save keeps its fields with M4 off | ✅ `legacy` requires `tracksV7 !== 1`, so a marked save keeps hensLevel/eggValueLevel/celebratedMilestones and saveSeq byte-for-byte. No downgrade strip of v7 fields. hireNudgeDone is never stripped. |
| M4-on migrate path still writes saveSeq | ✅ commitWrite/save pass the M4-on `b` (m4On ⇒ not legacy). headroomNeed uses the same serializer. Deferred sessions are covered by the WeakSet. |
| Determinism | ✅ Pure function of (state, now, seq, b). The WeakSet only tags Balance identity; no clock or random. |
| check-globals | ✅ PASS (chromium, PORT=5231; the default port clashed in /tmp): only eggfarmExportTelemetry. |

## Ranking-by-savedAt questions
- **Future savedAt / clock skew:** unchanged. savedAtRank (BUG-6) still puts an invalid or future savedAt last.
- **main vs .bak vs IDB, mixed seq / no-seq:** with saveSeq stripped, seq dominates savedAt, so an *older* seq copy beats a *newer* no-seq copy. That is B1.
- **Newer-save guard:** unaffected (the version is checked first; tracksV7 v6 isn't "newer").
- **Can it overwrite the only copy of a newer M4-on save?**
  - No in the downgrade direction: a marked save isn't rewritten as legacy.
  - In the reverse direction yes, as B1: newer flag-off progress is overwritten by an older M4-era copy.
- **Minor:** main.ts:96 `serialize(g.state, Date.now())` (storage-blocked recovery export) passes no `b`, so the export carries the M4 format. It's export only and harmless, but inconsistent.

## Runs (/tmp/p12d, git-initialised copy)
- tsc clean.
- vitest: **678 passed, 1 failed, 1 skipped (679)**. The only real failure is `golden > sim trace` (the F1 pricing, known; HoE ruled re-verify after #17).
  - cost-segments failed only until ../../product/economy.f1.csv was provided (a /tmp path artifact); then 8/8.
- Golden file: storage ✓, sim trace × (as above).
