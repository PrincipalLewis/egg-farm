# engineering decisions (repo copy; canonical log: egg-farm-studio/engineering/decisions.md)

## 2026-10-16 19:45 ADR M4-1..3 (Senior Software Architect, proposed — needs HoE ack)
- **M4-1 Save target is v6→v7.** "save v4" names the durability iteration; main has SAVE_VERSION 6. All M4 docs/tasks use v7.
- ~~**M4-2 Schema independent of flags.**~~ **SUPERSEDED by M4-4 (HoE 2026-10-16 19:29).** The v7 migration runs whenever the build has SAVE_VERSION 7; `balance.m4.enabled` gates behaviour only. Avoids two save formats per build. Consequence: the hardened newer-save refusal (task S-2) must ship before any SAVE_VERSION 7 build.
- **M4-3 Migrations live in `save/migrations/`, take `balance`, and are pure;** `econ/` is pure read-only derived economics that `sim/` never imports.

## 2026-10-16 19:29 ADR M4-4..7 (HoE decisions on m4-design v0.1 §9; recorded by Senior Software Architect)
- **M4-4 (supersedes M4-2) Write version follows the M4 flag.** Flag-off builds write v6; only M4-on builds write v7. The v6 .bak is kept until M4 reaches Latest. The v7 reader still accepts v6.
- **M4-5 Backup-write failure:** no new UI. The v2.2 "Can't save" dialog shows once per session, then the persistent toast. Never block play or drop in-memory state; v7 is not committed until the backup succeeds.
- **M4-6 TR-5 is report-only.** It becomes blocking after 5 consecutive green runs with no flake; HoE flips it.
- **M4-7 CI runs locally** via scripts/gate-all.sh. No hosted Actions minutes without CEO approval.
- Also: the A-0 rebase onto origin/main a01faea is owned by HoE (tonight). Features branches from the v2 SHA.

## 2026-10-16 20:28 ADR M4-8 Interim `tracksV7` marker in v6 (HoE decision; recorded by Senior Software Architect)
- m4/m4a-tracks-v2 @ 3351d6c price-matches pre-M4 saves inside the v6 format and marks them `tracksV7: 1` (SAVE_VERSION stays 6). **Kept as an interim step for playtest and M4-flagged builds only, never in a release default.**
- S-4 does the real v6→v7 bump and must accept unmarked v6 (migrate), marked v6 (idempotent: no re-migrate, no re-refund) and v7. S-6 adds marked-v6 fixtures. F-9 removes the marker path.
- Flag-off builds ignore or keep the marker fields on load and never strip them on write. S-2 (zero-writes refusal) is unaffected, because a marked save is still v6.
