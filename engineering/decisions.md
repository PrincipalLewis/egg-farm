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
