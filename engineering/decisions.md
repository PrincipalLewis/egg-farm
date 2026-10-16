# engineering decisions (repo copy; canonical log: egg-farm-studio/engineering/decisions.md)

## 2026-10-16 19:45 ADR M4-1..3 (Senior Software Architect, proposed — needs HoE ack)
- **M4-1 Save target is v6→v7.** "save v4" names the durability iteration; main has SAVE_VERSION 6. All M4 docs/tasks use v7.
- **M4-2 Schema independent of flags.** The v7 migration runs whenever the build has SAVE_VERSION 7; `balance.m4.enabled` gates behaviour only. Avoids two save formats per build. Consequence: the hardened newer-save refusal (task S-2) must ship before any SAVE_VERSION 7 build.
- **M4-3 Migrations live in `save/migrations/`, take `balance`, and are pure;** `econ/` is pure read-only derived economics that `sim/` never imports.
