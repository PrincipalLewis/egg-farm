# Self-review: PR #77 v5 F1a (M5 fields, SimEvent members, m4.flags plumbing) at ea6b6db
Senior Software Architect, 2026-10-29 CET. Base rc/v5 22eac98. Rule: D-CEO-20261028-02 (CCR re-review only after Blocker/Critical/Major findings).
Diff: 7 files, +171 / −4 (src/config/flags.ts, src/config/formulas.ts, src/sim/events.ts, src/sim/m5-state.ts, src/sim/state.ts, src/sim/workers.ts, tests/v5-f1a-fields.test.ts).

## Checked
- **No runtime change.** Only types, two constant lists and `flagOn()`/`evRngFlagOn()`. No caller reads a flag yet. `initialState` is unchanged, so no M5 key exists in a new state (a test checks this, plus 10 min of play).
- **Byte-identical goldens** at ea6b6db: flag-off f90d1678 and M4-on a54c9cf9 match, and the 24 h trace is 2c0d3ec3… (verify PASS).
- **Field names vs specs:** golden R10a (`nextSpawnRemainingS`, `frenzyRemainingS`, `evRngState`), Broody §3.6 (`broodyNestCents`, `broodyHenIdx`; D-C5 camelCase), abilities E2/rule 1 (`abilities.{id}.readyAt/activeS`, `abilitiesUnlocked`, `abilitiesCoachSeen`), pause (`paused`, `callLockoutS` per sizing B5). Session fields carry names I chose where the specs give none (`streakS`, `streakHoldS`, `tapCreditCdS`, `irefRingCents`, `goldenEgg`, `broodyNestScaled`). They aren't saved, so renaming them later costs nothing.
- **Event fields** come from the spec telemetry tables (golden §8, streak §8, broody §8, abilities §9). The UI-only fields (`collectible_id`, `layout`) are left to Game. That's deliberate: the sim doesn't know the layout, and the id is a per-session counter.
- **Flag names** are the spec names (see the PR body for the deviations from HoE's examples).

## Findings
| # | Severity | Finding | Action |
|---|---|---|---|
| 1 | Minor | `abilities.{id}.readyAt` is declared in its save form (epoch ms). Sizing §9.1 prefers sim-seconds remaining inside the sim, converted at save time. Which one the sim holds is #4's call (Features). | Open question for #4/F2; not changed here |
| 2 | Nit | `streak_peak.reason` is typed `string`. The streak spec lists offline/reload and inherits the rest from v0.3, which isn't on disk. | Tighten in #2 sim (Saves) |
| 3 | Nit | `brRngState` (session) is added in F1b, not here. | Accepted; F1b adds it to `M5_SESSION_FIELDS` |
| 4 | Minor | F2 has to strip `M5_SESSION_FIELDS` before serialising, because serialize writes the whole state. While the flags are off nothing writes them, so there's no risk today. | Dependency noted for Saves (F2) |

No Blocker, Critical or Major findings. Ships on self-review plus green CI.
