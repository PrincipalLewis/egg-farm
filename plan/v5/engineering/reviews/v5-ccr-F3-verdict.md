# CCR F-3 verdict (rcv5-vs-main-1a61b36-ccr.md F-3: BROODY_NEST_MAX_CENTS 1e15 x 10000 > 2^53)
Senior Engineer, Saves & Persistence · 2026-10-30 · D-HOE-20261030-08 · traced on origin/rc/v5 1a61b36091e634aef87ec6d02866323130a3a7cc

**Verdict: reaches flags-off path: NO, because with every v5 flag off `m5Load`/`m5Offline` return their input before any Broody code runs, and nothing in src ever computes `broodyNestCents × 10000` (`broodyNestScaled` is declared but never written or read), so no flags-off path (load, migration, export/import, offline settle) does that arithmetic.**

## Evidence (rc/v5 1a61b36; `git grep broodyNest\|BROODY_NEST\|10000 origin/rc/v5 -- src`)
- The only code touching `broodyNestCents` is `src/save/m5-fields.ts:62` (`num('broodyNestCents', BROODY_NEST_MAX_CENTS)` + `Math.floor`). It runs inside
  `if (m5Flag(b, 'broody'))` and after `if (!anyFlag(b)) return s;` (:56). Shipping balance.json has `m4.flags.broody: 0` (all flags 0), so it never runs.
  The clamp is a min/max on a double ≤ 1e15 (< 2^53), so it is exact even with Broody on. The ×1e4 only exists in a comment.
- `broodyNestScaled` (the ×10000 value, "load sets it to broodyNestCents x 10000"): only `src/sim/m5-state.ts:55` (type) and :67 (`M5_SESSION_FIELDS`).
  No assignment or read exists anywhere in src. It is a session field, so `m5Persist` (save.ts:146 `serialize`) strips it from every save.
- Load / migration: `validate()` (save.ts:214) → `migrate()` (:99) spreads `d.state` into `initialState` and only number-checks
  `NUM_FIELDS = ['coinsCents','coop','basket']` (:202). A tampered or legacy save's `broodyNestCents` (even 1e300) is carried through as an opaque
  value with no arithmetic. `Game` calls `m5Load` only after that (game.ts:93), and it returns early with flags off.
- Offline settle: `m5Offline` (m5-fields.ts:79-80) returns early with flags off. `sim/offline.ts` and `grantOffline` never reference any Broody field.
  `m5ShortGap` is streak-only.
- Export/import and backups: export (`ui/save-recovery.ts` exportOldSave/exportBytes) and backups (.bak, v6_backup, IDB mirror) copy raw save text or
  `serialize(state)` bytes, with no numeric use of M5 keys. There is no import path: a re-imported file is just another load (see above). No UI module reads `broodyNest*`
  (no `fmtMoneyExact` call on it).
- With the flag on (not shipping), it is still unreachable on rc/v5: no Broody sim exists yet (sim/timers.ts lists Broody #5 as a future TimerSystem).
  The CCR fix (clamp at `Math.floor(Number.MAX_SAFE_INTEGER / 1e4)` = 900719925474, or cents + remainder) plus its boundary test belong with the
  Broody PR (row 20), which is the first code that multiplies.
