# M5.0 testability gaps: what Product must supply
**v0.4 · 2026-10-24 16:42 CEST · Head of QA · for Head of Product.** Adds abilities **v1.2.2** (3586f15, D-HOP-12) and pause **v1.2.1** (22dcc18); earlier inputs as in v0.3 (D-HOP-06/07/08/10; golden, streak, Broody v1.1). Applies D-HOP-2026-10-24-06/07/08/10, pause spec v1.2 (16:30) and the specs now on disk: golden egg, streak + tap coins and Broody **v1.1** (16:25), abilities **v1.1.1** (16:22), pause **v1.2** (16:30). Resolved gaps keep their IDs for traceability. "Owner" is who QA thinks answers it; HoP routes.

## Status per item
| Item | Spec | Testable? | Open gaps |
|---|---|---|---|
| Golden egg | v1.1 | **Yes, with conditions** | GE-8, X5 |
| Streak + A2 tiers + A1 tap coins | v1.1 | **Yes, with conditions** | ST-5, ST-10, TEL-13 (narrowed) |
| Abilities + Activate-all | v1.2.2 | **Yes, with conditions** | AB-2, AB-4, X7a, AB-10..AB-14 (spec text) |
| Broody Hen | v1.1 | **Yes, with conditions** | BH-b, BH-k, BH-m (BH-AC20), BH-n (Art assets), #69 |
| Pause/Resume | v1.2.1 | **Yes, with conditions** (AC-P16 deferred, AC-P18 guard) | P-12, AB-12 (shared string) |
| Telemetry names / pinned | v0.6.2 + X4 | **OK-with-conditions** | TEL-2, TEL-7, TEL-10, TEL-12, TEL-13 (narrowed) |

## Cross-cutting (D-HOP-07)
| ID | Status | Resolution / open question | Owner |
|---|---|---|---|
| X1 | **Resolved** | ±20 % relative of Economy's G3 prediction per feature | – |
| X2 | **Resolved** | RC1 kept: < 60 s live, ≥ 60 s offline; M5 timers/decay freeze while hidden or a menu is open; streak resets after offline; I_ref steady-state after reload/offline (ST-2b closed, D-HOP-10 #1) | – |
| X3 | **Resolved** | Seeds 0–99, ±1 tick, ±1¢, ~3σ bands; golden rate against the zero-catch 15/h baseline, catch variants separate (GE-AC30) | – |
| X4 | **Resolved (scope)** | M5 slice only; full v0.6.2 separate. Follow-ups TEL-2/13/14 (TEL-4 resolved, D-HOP-10 #4) | – |
| X5 | **Open** | Debug hooks under `?debug=1` for golden (now, visibility/menu schedule, evRng seed, force slot/reward, age), streak (s, hold, I_ref ring), Broody (nest, hen idx) and the abilities/pause setters | HoE |
| X6 | **Resolved** | "Never stack" = M4-B boost only | – |
| X7 | **Resolved** | One unrounded chain, rounded once; tap coins and Broody separate | – |
| X7a | **Open** | Rush/Shout/Inspect in the X7 chain. With every factor unrounded the order doesn't change the value, but Economy must confirm in G3 that no factor (e.g. Inspect inside `graderMult`) is rounded on its own | Economy (G3) |

## Golden egg
Resolved by v1.1 §13: GE-1 (evRng + `evRngState`), GE-2 (freeze list), GE-3 (pagehide), GE-4 (countdown restored), GE-5 (1.0 s jump clamp, GE-AC31), GE-6 (`balance.m4.tc.golden_enabled`), GE-7 (takeover, GE-AC32), GE-9, GE-10, GE-11 (`hidden_end` removed), GE-12 (`reaction_ms`), GE-13 (Frenzy freezes, `frenzyRemainingS`), GE-14 (960 docking; 1024×474 is a test viewport only; QA adds 959/960).
| ID | Open question | Owner |
|---|---|---|
| GE-8 | CSV columns `tc_first_spawn_s`, `tc_warn_at_s`, `tc_urgent_at_s`, `tc_spawn_grace_ms` and the P1 weights land in Economy's single M5 CSV PR: when? | Economy (G3) |
| GE-15 | Spec §14 A3: the R5e jump clamp is a PM addition HoE hasn't confirmed | HoE |

## Streak + A2 tiers + A1 tap coins
Resolved by v1.1: ST-1 (sim time), ST-3 (menu freeze → 0.28), ST-4 (hidden 5 s → 0.28, ST-AC12a), ST-6 (ST-AC24–27), ST-7 (ST-AC30), ST-8 (pagehide), ST-9 (`credited`). ST-2: the definition (base chain, gross, sim clock, hidden < 60 s included) is resolved. **ST-2b closed (D-HOP-10 #1):** X2 wins; after a reload or offline return I_ref = steady-state passive rate until 60 s of sim accrue, no empty ramp; hidden < 60 s sales count (D-HOP-09 c). PM Collection aligning §4.1 / ST-AC16b / Broody R8 (text alignment, not a test blocker).
| ID | Open question | Owner |
|---|---|---|
| ST-5 | Cap 0.28 vs CSV 0.40 until G3; QA runs both (ST-AC28) | Economy (G3) |
| ST-10 | HoE §10.1 rename `taps_counted` → `credited_taps` (spec §14 C3) | HoE |

## Abilities (v1.2.2)
Resolved: AB-3, AB-6 (now `m4.flags.abilities` + `balance.m4.enabled`), AB-8, AB-9 (rule 10, D-HOP-10). **v1.2.1/v1.2.2:** AB-1 (≥ 60 s gap ends the call at the hide, provisional sim discarded; "first 60 s simulated" obsolete), AB-5 (left slot = RC1 Manage all; c231c02 citations removed), AB-7 (once per save via `abilitiesUnlocked`, again on fresh start, AC-M5A-19), Q10 (D-HOP-12: sheet tap closes the sheet, call starts at once, AC-M5A-22).
| ID | Open question | Owner |
|---|---|---|
| AB-2 | Sweep-L or Sweep-P at F20+ (§4a); build assumes Sweep-L | Economy (G3), then HoP |
| AB-4 | `tc_ability_unlock_farm`, `tc_ability_energy_cost` (+ `tc_ability_w2_price_mult` if Sweep-P) in the M5 CSV PR | Economy |
| AB-10 | **Contradiction:** §8 E1 still says "Under 60 s hidden: simulated live, and the call continues", but rule 10 and AC-M5A-11 say the call is **suspended** (no multiplier, time frozen) during a hide < 60 s. QA tests rule 10; please reword E1 | PM Workers |
| AB-11 | **Contradiction:** AC-M5A-18 ends "The blocked captions render outside the 44 px box", and AC-M5A-4 says "the caption", but §5.2 / Art Q7e put the blocked reason **inside** the button with no outside caption. QA tests inside; please fix both AC texts | PM Workers |
| AB-12 | **String mismatch:** lockout `aria-describedby` is "Ready in 0:ss after a break" (abilities rule 4, §5.2) vs "Ready in 0:ss, after a break" (pause rule 7, AC-P9). Which exact string? | PM Workers (Art copy) |
| AB-13 | AC-M5A-21: which DOM nodes count as "FX elements" toward `m4.fx.maxActive` (call sparkles, the 30 s rings, Frenzy burst particles?), and is "oldest" by insertion time? Needs a selector/class for the oracle | PM Workers / HoE |
| AB-14 | AC-M5A-22 / rule 10: (i) the auto-close applies "at every viewport where the tab is a sheet", but the AC names only 360 and 1280; QA adds 959×600 (sheet, `in_sheet:true`) and 960×600 (docked, `in_sheet:false`) per D-HOP-08 #5; please confirm 960 is the boundary. (ii) Start time: rule 10 says the call "counts from the tap's tick", AC-M5A-22 says `focusClock` advances "from the next frame" after "the frame plus the close animation", and E14 (a) starts a call tapped mid-close "at close completion". Does the close animation count as an open menu (focus stopped) for a normal tap? QA asserts start ≤ close completion + 1 frame and 30.0 ± 0.5 s | PM Workers / HoE |

## Broody Hen (v1.1)
Resolved: BH-a, BH-c, BH-d, BH-e (documented values; schema condition TEL-12), BH-f, BH-g (toast, BH-AC24), BH-h (BH-AC22), BH-i (BH-AC23), **BH-j (= ST-2b, D-HOP-10 #1)**, **BH-l (D-HOP-10 #3: floor to the cent is the single X7 rounding)**.
| ID | Open question | Owner |
|---|---|---|
| BH-b | 0.05 / 150 / 0.5 are [P1-PENDING]; land with G3 | Economy |
| BH-k | BH-AC13's matrix and Art's checks still list 1024×474 only; QA adds 959×600/960×600. Art to confirm ≥ 1 eligible slot at 960 | Art & UX |
| BH-m | BH-AC20 release check (refuse the flag without #69) must be built | HoE |
| BH-n | Hen states/assets not delivered; they block the UI PR | Art & UX |

## Pause/Resume (v1.2.1)
Resolved: P-1..P-4, P-6..P-9, P-5 (structural). **v1.2.1:** P-10/TEL-11 (AC-P16 deferred until the coop-full hint ships; guard AC-P18: no coop-full Pause behaviour, 0 `coop_full_start`, 0 `coop_hand_state`), P-11 (`rest_recovery_mult` everywhere), **P-13 (changed: lockout in saved sim seconds, keeps counting under menus and hides < 60 s because RC1 `Game.frame()` runs the sim and MH sales there; frozen offline / gap ≥ 60 s / reload; AC-P9 menu case → 10 s left, sales at base)**, P-14 (Art accepted; saturate/chip N/A in rc1, pill + sub-line carry the state), TEL-14.
| ID | Open question | Owner |
|---|---|---|
| P-12 | AC-P1 compares against an **abilities-only golden** that doesn't exist yet: who pins it, at which SHA? | HoE |

## Telemetry (see telemetry-review.md v0.4)
Resolved: TEL-1, TEL-6 (leftover rename = ST-10), **TEL-8 (golden/streak; abilities closed on HoE's final causes expired/paused/offline/asleep/unpaid)**, **TEL-9 (1.0 sim s + `count`)**, **TEL-14 (in the subset if Pause ships)**, **TEL-4 (D-HOP-10 #4: `session_end` incl. ST-AC20 fields in the M5.0 subset)**, **TEL-11 closed for M5.0 (AC-P16 N/A)**. Deferred to v0.6.2: TEL-3, TEL-5.
| ID | Open question | Owner |
|---|---|---|
| TEL-2 | Does F4 create `schema.ts` for the M5 slice? | HoE |
| TEL-7 | Re-point T-AC12 to the M5 v1.1 specs (minor) | PM Collection |
| TEL-10 | `worker`/`farm` vs `farm_level` naming (minor) | PM Collection |
| TEL-12 | Schema/allowlist accepts the Broody `collectible_*` values | HoE |
| TEL-13 | Narrowed: only `tap.empty`/`tap.full_at_start` stay [T-full]; confirm ST-AC20's swap flag doesn't need them | HoE |

## Change log
- v0.4 (16:42): abilities v1.2.2 + pause v1.2.1: closed AB-1, AB-5, AB-7, Q10 (D-HOP-12), P-10/TEL-11, P-11, P-13 (changed: lockout counts under menus), P-14, TEL-8 (abilities), TEL-9, TEL-14; new AB-10..AB-14 (PM Workers spec text).
- v0.3 (16:34): applied D-HOP-2026-10-24-10 and pause spec v1.2: closed ST-2b, BH-j, AB-9, BH-l, TEL-4, P-10 and TEL-11 (M5.0); also P-11 and P-13 (v1.2); TEL-14 conditional; TEL-13 narrowed; telemetry section added.
- v0.2 (16:30): applied D-HOP-06/07/08 and spec v1.1/v1.1.1; resolved gaps listed per section, open gaps with owners; new ST-2b, ST-10, GE-15, AB-9, BH-j…n, P-10…14.
- v0.1 (16:16): first list.

## v0.5 delta · 2026-10-24 16:54 CEST · Head of QA (appended; supersedes the status rows above where they differ)
Inputs: golden/streak/Broody as on disk 16:38–16:41 (still labelled v1.1: Art v1.1, D-HOP-10, **D-HOP-13** #1/#2); HoE `engineering/m5.0-sizing.md` **§13** (answers to v0.3) and **§14** (Sales Stopped buildable); abilities **v1.2.4** (a1bfa74) → **v1.3 final** (16:51) and pause **v1.2.3** (512736c) → **v1.3 final** (16:51, D-HOP-16: lockout 45 s); new item **Sales Stopped chip + fatigue Rules 2–4** (`product/market/sales-stopped-spec.md` v1.1, D-HOP-11 (b) / D-HOP-13 #3) → `qa/m5/test-plan-sales-stopped.md` v0.1.

### Status per item (v0.5)
| Item | Spec | Testable? | Open gaps |
|---|---|---|---|
| Golden egg | v1.1 (+Art v1.1) | **Yes, with conditions** | GE-8, GE-16, GE-17, ST-12 (X4 text) |
| Streak + tiers + tap coins | v1.1 (+D-HOP-13) | **Yes, with conditions** | ST-5, **ST-11**, ST-12, X8 |
| Abilities + Activate-all | v1.3 final | **Yes** (G3 numbers pending harness re-measure) | AB-4 |
| Broody Hen | v1.1 (+Art v0.1) | **Yes, with conditions** | BH-b, BH-k, BH-n, **BH-o**, **BH-p**, X8 |
| Pause/Resume | v1.3 final | **Yes** (AC-P16 deferred, AC-P18 guard; G5-P pending re-measure) | – |
| **Sales Stopped + Rules 2–4 (new)** | v1.1 | **Yes, with conditions** | SS-G1…SS-G18 (`test-plan-sales-stopped.md` §4), X8 |
| Telemetry | v0.6.2 + X4 | **OK-with-conditions** | TEL-10, TEL-15, TEL-16 (telemetry-review v0.5) |

### Closed in v0.5
| ID | Closed by | Resolution |
|---|---|---|
| X5 | HoE §13 | Hooks on `window.eggfarmQa`, compiled in only in dev and `build:qa` (`IOS_FLAG_ENABLED`); release build dead-code-eliminates them and `check-release-build.mjs` fails if `eggfarmQa` leaks (**added to QA's release gate**). Clock (`frame`, `focus.advance`, `hide`/`show`, `menu`), golden (`state`, `seed`, `spawnNow`, `forceReward`, `setAge`), streak/I_ref (`streak.set`, `iref.state`/`override`), Broody (`setNest`, `setHen`), workers/abilities (`worker.set`, `ability.set`/`fire`), stall (`stall.state()`). Vitest uses sim fixtures only |
| GE-15 | HoE §13 | focusDt = min(frame dt, 1.0 s); frame/hidden gap ≥ 60 s = offline (focusDt 0). **D-C3:** sim ticks after the first 1.0 s of a long frame run with Frenzy, streak and calls suspended → new cases in golden GE-AC31, streak and abilities edge rows, Broody edge row |
| ST-10 | HoE §13 | `session_end.credited_taps` everywhere, no `taps_counted` alias |
| TEL-13 | HoE §13 | ST-AC20 swap computable from `session_end` alone; no `tap.empty`/`full_at_start`. `empty_credited` counts only while a Coop Hand is hired at tap time (fallback counter `taps_swap_eligible`) → new case: session spanning the first Coop Hand hire (streak plan ST-AC20). PM text still to adopt it (ST-12) |
| TEL-6 | streak spec §8/§8.1 + HoE §13 | `credited_taps` is the only name |
| TEL-7 | telemetry-spec T-AC12 (line 154) | points to GE-AC27, ST-AC19/20, BH-AC19 |
| TEL-2 | HoE §13 | the §10.1 subset creates `src/telemetry/schema.ts` (allowlist + enums, T-AC9-style test) |
| TEL-12 | HoE §13 | schema accepts `skin` golden_egg/broody_hen, `broody_cash`, offline/reload/takeover/reset; (`docked-compact` layout value: see BH-o) |
| TEL-14 | HoE §13 | spam cap = `ability_blocked` coalescer: ≤ 1 per worker per state per 1 s sim, with `count` |
| AB-1 | HoE §13 | call ends at the **start** of a ≥ 60 s gap; `activeS` clamped to [0, `tc_ability_s`] |
| AB-2, X7a | abilities v1.3 (D-HOP-16) | Sweep = A (lay ×1.15, no level scaling); B rejected |
| AB-10 | abilities v1.2.4 | E1 matches rule 10 |
| AB-11 | abilities v1.2.4 | blocked reason inside the 44 px button ('Asleep', 'Unpaid', 'Paused', [bolt] '0:ss', [pause] '0:ss'); full sentence in `aria-describedby`; AC-M5A-4/-18 assert nothing renders outside |
| AB-12 | abilities v1.2.4 / pause v1.2.3 | exactly `Ready in 0:ss after a break` (no comma) |
| AB-13 | abilities v1.2.4, **HoE-confirmed in v1.3** | only `#fx-layer > [data-fx]` count toward `maxActive` = 8; oldest = insertion order; tap flyers carry no `data-fx` and keep the 30-node cap. (Steering said closed-pending-HoE; v1.3 on disk records HoE's confirmation, so closed) |
| AB-14 | abilities v1.2.4 / v1.3 | docked = `(min-width:960px) and (orientation:landscape)`; portrait ≥ 960 stays a sheet (case: 1024×1366 auto-closes, `in_sheet:true`); a closing sheet = open menu until `sheetCloseComplete`; the call counts from close-complete. Portrait case also added to golden, streak, Broody, pause and Sales Stopped plans |
| BH-m | HoE §13 | CI `bh-ac20-release.test.ts` (gate job) fails with the Broody flag on and #69/m1 absent |
| P-12 | HoE §13 | input save pinned at `5d9efa6`; expected output generated from M5.0 code with Pause off (`engineering/golden/m5-abilities-only.<sha>.test.ts`); owner Architect |

### New / updated open gaps
| ID | Open question | Owner |
|---|---|---|
| GE-16 | No Art expected centres/counts for **959×600** (`phone-375`), **960×600** (`docked-compact`) or **portrait ≥ 960** (1024×1366; R12 keys on vw only, but the app docks only in landscape, AB-14). QA asserts formula + ≥ 2 floor until Art adds rows; PM Collection to state the orientation rule in R12 | Art & UX / PM Collection |
| GE-17 | Golden R14 and Broody R4 zone lists don't include the **Sales Stopped chip**; no rule for an egg/hen already under a newly shown chip; docked-compact counts may drop (= SS-G5) | PM Collection + Art & UX |
| ST-11 | Tap coins `round_half_up(0.03 × I_ref × 100)` in IEEE doubles gives **232¢ at F30** (0.03 × 7750 = 232.4999…) vs the spec's $2.33. Specify exact arithmetic (e.g. integer `round_half_up(3 × Σbase_cents / 6000)`); QA's oracle uses exact rationals | PM Collection + HoE |
| ST-12 | Spec text leftovers vs D-HOP-10 #4 / HoE §13: streak §14 A4 still says the swap needs `tap.empty`; §12 row 11 lists `taps_effective` as emitted (it's dashboard-only); golden §3.7 X4 lists `taps_total`/`taps_moved_eggs` as M5.0.1; HoE's `empty_credited` gating (or `taps_swap_eligible`) not yet in §8.1 | PM Collection |
| BH-k | narrowed: Art §2 has no 959×600/960×600/portrait rows; QA runs R4 and asserts ≥ 1 eligible | Art & UX |
| BH-o | Broody §8 `layout` lists phone-360/phone-375/docked; missing `docked-compact` (golden has it; 1024×474 and 960×600 are docked-compact) | PM Collection (schema: HoE) |
| BH-p | minor: BH-AC7 "$61.88" vs the exact 6,187.5¢ threshold (floor payout at that instant $61.87); BH-AC28 "after 10 focus seconds" needs "welcome-back dismissed at load" (sim time runs under the modal) | PM Collection |
| X8 | cross-spec: Market §4.2 zeroes live `incomePerSec` while the Market Hand is Asleep/Unpaid; Collection I_ss = live `incomePerSec + wagesPerSec` → during a warm-up tap coins and Broody fill drop to 0 (HoE §14 lists M5 I_ss as a consumer). Confirm intended and modelled in G3 | HoP (PM Collection + PM Market) |
| SS-G1…G18 | Sales Stopped: off-state for SS-21 (G1), C6 view-leave timers (G2), SS-12 HUD-chip return rule (G3), chip tap propagation into `#scene` (G4), chip missing from spawn zones (G5), placement at 960–1279/portrait (G6), telemetry pairing on unload/clock/budget (G7), `cause:other` fault hook (G8), Rush-lane selector seam (G9), §4.2 in patch (a) moves SS-15/SS-20 (G10), `fatigue_cue_*` columns don't sync (G11), string table (G12), nav badge vs SS-12 (G13), SS-26 coop-full deferred (G14), cooldown format / AC-R8 % (G15), `window.eggfarm` → `eggfarmQa` (G16), missing basket/queue/coins/`manageCdS` setters (G18). Details and owners: `test-plan-sales-stopped.md` §4 | PM Market, HoE, Art & UX, Economy, PM Workers, HoP |
Still open from v0.4: GE-8, ST-5, AB-4, BH-b, BH-n (Economy G3 / CSV PR; Art assets).

- v0.5 (16:54): appended. Closed X5, GE-15, ST-10, TEL-2/6/7/12/13/14, AB-1/2/10–14, X7a, BH-m, P-12. New GE-16, GE-17, ST-11, ST-12, BH-o, BH-p, X8; Sales Stopped item added (SS-G1…G18).

## v0.5.1 delta · 2026-10-24 16:59 CEST · Head of QA (appended): Sales Stopped re-planned on spec v1.3.2
`test-plan-sales-stopped.md` **v0.2** now plans `sales-stopped-spec.md` **v1.3.2** (SS-1…SS-34, E1–E15), split into a **patch lane** (SS-15/20/27/28 on `fix/m41-patch1`, same D-CEO-07 UI pass as AC-R1–R9 + P1 hen AC; added to qa/queue.md P1) and the **M5.0 lane** (rest + SS-15/27/28 regression; SS-21/SS-27 hard merge gates on the AC7 harness). Status row: **Sales Stopped v1.3.2 — Yes, with conditions.**
| ID | Status | Note | Owner |
|---|---|---|---|
| SS-G2, G10, G11, G12, G13, G14, G16 | **Closed** by v1.3–v1.3.2 | view-leave rule; §4.2 in patch; `tc_fatigue_cue_*` rename approved; rc2 §6 single source; badges allowed by §5; coop-full "if built"; `eggfarmQa` in §11 | – |
| SS-G1 / G5 / G7 / G15 | **Narrowed** | Rules 2–4 still have no off state for SS-21; chip rect ⊆ `#goal` zone to confirm (GE-17 narrows to the same check); deferred resolved at unload + `session_s`; AC-R8 50 % | PM Market + HoE / Art / PM Market / PM Workers |
| **SS-G19** | **New** | CH parts of SS-20/SS-33: rc2 row 85 on disk = "Coop Hand asleep: collecting stopped", aria "… Auto-collecting has stopped." (Art 16:57/17:00), but spec chip describedby says "Collecting has stopped." and SS-33's "collecting slowed to 15%" isn't an rc2 string | **Art & UX** (+ PM Market text) |
| **SS-G20** | **New, blocking oracle** | spec v1.3.2 min-show default 3 s / range 1–10 / C4 held vs **D-HOP-19 (16:56)** default 0, C1/C4 always immediate (Art 16:57 rejected the 3 s hold); also E4 vs §4.5, SS-16 vs held clears. QA plans both oracles | **PM Market** (spec v1.3.3) |
| **SS-G21** | **New** | SS-34(b) not constructible: Refill at +0.5 s → MH sells ≤ 1.1 s later, before the energy-0 step at +2.0 s | PM Market + HoE |
| SS-G3, G4, G6, G8, G9, G18, X8 | Open (unchanged) | see plan §4 | as listed |
Also noted: pause spec **v1.3.1** (D-HOP-18) adds AC-P19 (`mh_paused` chip) → covered by SS-30; pause plan cross-ref only.
- v0.5.1 (16:59): Sales Stopped re-planned on v1.3.2; closed SS-G2/10/11/12/13/14/16; new SS-G19 (Art), SS-G20, SS-G21.

## v0.5.2 delta · 2026-10-24 17:02 CEST · Head of QA (appended): Sales Stopped on spec v1.3.3 FINAL
`test-plan-sales-stopped.md` **v0.3** plans `sales-stopped-spec.md` **v1.3.3** (final for build; supersedes v1.3.2; D-HOP-19/-20). Status row: **Sales Stopped v1.3.3 — Yes, with conditions.** Lanes unchanged (patch lane SS-15/20/27/28 on `fix/m41-patch1`; M5.0 lane rest; SS-21/SS-27 hard gates).
| ID | Status | Note | Owner |
|---|---|---|---|
| SS-G19 | **Closed** (v1.3.3) | CH chip describedby = rc2 §6 "Coop Hand is asleep/unpaid. Auto-collecting has stopped." (Art 16:57/17:00, rc1-asleep v1.0.6) | – |
| SS-G20 | **Closed** (v1.3.3, D-HOP-19/-20) | no min-show: every clear ≤ 100 ms; `tc_stall_min_show_s` dropped (9 columns); min-show cases removed | – |
| SS-G21 | **Closed** (v1.3.3) | SS-34(b) uses re-arm + hold only; QA re-sleeps before the first MH serve | – |
| SS-G7 | Narrowed | resolved emitted at the hide; open: `session_s` clock, pinned-pair cap | PM Market (+ HoE) |
| **SS-G22** | **New** | 360 role drop: spec §4.8 "role drops first" at 360 vs rc1-asleep v1.0.5/6 + Art 16:53 "only if the full string doesn't fit"; QA asserts fit-based | PM Market (text) + Art & UX |
| **SS-G23** | **New, minor** | share > 0 Coop Hand fallback strings ("collecting slowed" banner + aria) no longer written in rc2 §6 (rows replaced); SS-33's 0.15 case needs the exact text | Art & UX |
Still open: SS-G1 (Rules 2–4 off state for SS-21), G3, G4, G5 (⊆ `#goal` check), G6, G8, G9, G15, G18, X8.
- v0.5.2 (17:02): Sales Stopped on v1.3.3; closed SS-G19/G20/G21; new SS-G22, SS-G23. Supersedes the v0.5.1 SS-G19…G21 rows.

- v0.5.3 (2026-10-24 17:04): X8 CLOSED per HoP (D-HOP-13): with a hired Market Hand Asleep or Unpaid, I_ss = I_ref = 0, so tap coins and Broody fill pay 0. Tested as an edge case (ST-AC16e, BH-AC29), not a gate. Economy is confirming that the measure:l30plus re-measure models it.

- v0.5.4 (2026-10-24 17:04): HoE accepted the sales-stopped asks (about +0.15 dd). CLOSED: SS-G1/SS-21 (m4.flags.salesStopped gates the chip and Rules 2–4; flag off equals the patch1 baseline, so SS-21 compares the flag on vs off), SS-14 (an injected pure lane selector with non-queue lane fixtures), SS-19 (a vitest fault fixture, with pins deduped by (role, cause)), the setters (eggfarmQa.set.{basket,queue,coopEggs,coins,manageCdS}, dev and build:qa only), ST-11 (integer bp rounding: floor((cents×bp+5000)/10000); F30 7750×300 gives 233¢; PM Collection to update the spec text), and SS-2/3/4/6 (stopPropagation on pointerdown and click, plus a test that a chip tap credits no Collect). Patch lane adds a check that the patch1 banner and Refill taps credit no #scene Collect. Still open: SS-20/25 at 360, SS-33 at 0.15, SS-12, SS-16/17 rects, the SS-19 session_s clock name, AC-R8.

## v0.5.5 delta · 2026-10-24 17:08 CEST · Head of QA (appended): Sales Stopped on spec v1.3.4 FINAL
`test-plan-sales-stopped.md` **v0.4** plans `sales-stopped-spec.md` **v1.3.4** (SS-1…SS-35, E1–E15; resolves QA v0.3 findings, §14e). Status row: **Sales Stopped v1.3.4 — Yes** (pending inputs below). HoE acceptances from v0.5.4 applied in the plan: SS-14 lane-selector seam, SS-19 vitest fault fixture, `eggfarmQa.set.{basket,queue,coopEggs,coins,manageCdS}` replace save fixtures; new SS-35 chip taps (mouse + touch, 3 engines); patch lane P-7 (banner/Refill taps credit no `#scene` Collect).
| ID | Status | Note | Owner |
|---|---|---|---|
| SS-G1 | **Closed** | SS-21 = `m4.flags.salesStopped` on vs off, off = exactly the `fix/m41-patch1` baseline; SS-23(b): CSV hold 0 turns off the chip only, Rules 2–4 stay on | – |
| SS-G22 | **Closed** | role drops only when the full string doesn't fit (`bannerFit`); tested at 360 with the widest string | – |
| SS-G23 | **Closed (out of scope)** | SS-33 share > 0 (0.15) case N/A for M5.0 | – |
| SS-G3 (SS-12) | **Closed, pending PM Workers' confirmation** | HUD chip returns by Rule 2 state; new case: after a C4 Refill with share < 0.12 it does not return (state force-cleared) | PM Workers (confirm) |
| SS-G7 (SS-19) | **Closed** | `session_s` = focus-clock seconds; pins deduped by (role, cause), no cap; sheet-toggle spam case asserts one pin per key | – |
| SS-G6 (SS-16/17) x | **Closed** | chip = `#goal` box: docked 960×600 x 12–548, 1280 x 160–720, 959×600 and portrait full farm-column width | – |
| SS-G4, G8, G9, G18 | **Closed** (v1.3.4 / HoE v0.5.4) | SS-35; fault fixture; seam; setters | – |
| **SS-G6 y/height** | **Open** | y and height of the chip at 959/960/portrait (phone `.goal` is 40 px, chip ≥ 44) | **Art & UX** |
| **SS-G15 (AC-R8)** | **Open** | AC-R8 'below 40%' vs `manage_prompt_threshold` 0.5 on RC1 data; patch lane | **PM Workers** |
| SS-G24 | New, text only | SS-20 still says 'At 360 the role drops' and SS-25 'incl. the 360 role drop' while §4.8 has the fit rule; QA tests the fit rule | PM Market |
- v0.5.5 (17:08): Sales Stopped on v1.3.4; closed SS-G1, G22, G23 (out of scope), G3 (pending PM Workers), G7/SS-19, G6 x; open SS-G6 y/height (Art), SS-G15 AC-R8 (PM Workers); new SS-G24 (text).

- v0.5.6 (2026-10-24 17:09): AC-R8 CLOSED (rc1-asleep v1.0.7 8f2435d: T = manage_prompt_threshold×100, read from balance and never hard-coded; test on origin/main or patch1 only, because local main and the old fix/rc1-* branches still carry 0.4). SS-12 CLOSED (PM Workers confirmed the state-based restore with the C4 Refill exception, so case (d) stands). Art confirmed the fit rule and the 44 px hit area (an overflow-visible pseudo-element; #goal height unchanged). Still open: SS-16/17 y and height (Art measuring on 5d9efa6), SS-G24 wording (PM Market), and telemetry-review.md sync for session_s and pin dedupe.

## v0.5.7 delta · 2026-10-24 17:15 CEST · Head of QA (appended): Collection v0.6 plans (specs on disk 17:11–17:13, still v1.1)
Golden, streak and Broody plans → **v0.6**. All money expected values re-verified with integer/BigInt scratch scripts (`/tmp/m5int/check.py`, `big.mjs`, `ge2.mjs`).
| ID | Status | Note | Owner |
|---|---|---|---|
| ST-11 | **Closed in spec**, HoE confirming the §4.1b wording | `tapBp = Math.round(rate×10000)`; `refCents` once per tick (warm-up `Math.round(I_ss×100)`, else `floor((Σring+30)/60)`); `floor((refCents×bp+5000)/10000)`; new ST-AC2b (38/50/233¢, Σ 465,029/465,030 → 7750/7751, 16/17 → 0/1¢), ST-AC2c (BigInt) | HoE (confirm) |
| ST-12, BH-o, BH-p | **Closed** | text leftovers fixed; `docked-compact` in Broody §8; $61.87 + BH-AC28 "welcome-back dismissed at load" | – |
| GE-16 | **Closed** | R12: dock only at `(min-width:960px) and (orientation:landscape)`; portrait ≥ 960 = phone; docked with vh < 700 or FW < 880 = docked-compact; GE-AC15 adds 959×600, 960×600, 960×1280 portrait | – |
| **GE-16b** | **Open** | valid-spot counts for those 3 viewports; ≥ 2 floor binds now | **UI/Visual (Art & UX)** |
| GE-17 | **Closed** | chip capped to `#goal`, short label, no wrap (golden R14, Broody R4) | – |
| X8 | **Closed** (HoP) | ST-AC17b (0¢ tap: no floater; collect, sound, streak feedback stay) + BH-AC29 ($0 nest never ready) | – |
| GE-18 | **Closed by HoE money-math ruling 2, pending HoE** | `baseScaled = Math.round(E×P_cents×100)` (1/100 ¢); `floor((baseScaled×bp+500000)/1e6)`; new GE-AC9b; ruling-1 values superseded | HoE (confirm) |
| **BigInt switch location** | **Provisional, pending HoE** | ST-AC2c, BH-AC3b, GE-AC9b spies assert the boundary HoE confirms | HoE |
| **BH-AC3b(c) wording** | **New, minor** | spec says refCents 18,014,398,509,472 is "just above the 500 bp safe boundary" with `nestScaled` on the BigInt path; `nestScaled` (9,007,199,254,736,000) is actually 4,991 **below** MAX_SAFE; only the intermediate `refCents×bp×dtMs` overflows (product boundary for a 1,000 ms frame: refCents 18,014,398,509). Pay value 900,719,925,473¢ is correct | PM Collection (text) + HoE |
Still open: GE-8, ST-5, BH-b (Economy G3); BH-k, BH-n (Art).
**Plan values fixed (were wrong in v0.5):** Broody F10 ready payout $61.88 → **$61.87**, F30 $290.63 → **$290.62**, BH-AC16 6,188 → **6,187**¢. All spec values match.
- v0.5.7 (17:15): Collection plans v0.6; closed ST-11 (in spec), ST-12, BH-o, BH-p, GE-16, GE-17, X8, GE-18 (pending HoE); open GE-16b counts (UI/Visual), BigInt switch location (HoE), BH-AC3b(c) wording (minor).

## v0.5.8 delta · 2026-10-24 17:22 CEST · Head of QA (appended): Sales Stopped plan v0.5 on spec v1.3.8 FINAL (sha1 cda4b2a89aec07aff284957f586e7177f67be466)
| ID | Status | Note | Owner |
|---|---|---|---|
| SS-21 | **Ruled** (D-HOP-2026-10-24-23, Option B) | two hard gates: (1) flag off ≡ patch1 golden (sim/economy traces, farm DOM 360/1280, 0 new events); (2) flag on vs off same build, sim/economy byte-identical, telemetry/DOM out of scope. CSV clause = this feature's 9 `tc_*` only + L0–30 unchanged vs c7bb783f | – |
| SS-G6 x (v0.5.5 row) | **Corrected** | 960×600 `#goal` x is **24–536** (Art m2), not 12–548; chip pill max-width 560 centred, hit area = pill | – |
| SS-G6 y/height | **Closed** (Art rects signed, v1.0) | 959×600 12–923/412–456; 960×600 24–536/472–516; 1024×1366 12–1012/1178–1222; 1280×800 160–720/672–716; all 44 tall | – |
| **SS-G6 residual** | **Open** | derived pill x at 959×600 (188–748) and 1024×1366 (232–792) not measured by Art; 360 pill height (40 + 2 px `::before`) | **Art & UX** |
| SS-17 | **Closed** | Fredoka 700 (600 doesn't ship); single-line check per label (9) × viewport (7) × engine (3) | – |
| SS-G3 | **Closed** | PM Workers confirmed SS-12 C4 exception (17:07) | – |
| SS-G15 (AC-R8) | **Closed** | per v0.5.6 (50 % from balance; patch from origin/main); plan P-5 updated | – |
| SS-G24 | **Closed** (v1.3.7) | fit rule, 360 example width only | – |
| **SS-G25** | **New, text only** | SS-17 still says ≈ 295 px (Art: 242); SS-35(d) says "`#goal` < 44" where it means the 40 px pill | PM Market |
- v0.5.8 (17:22): Sales Stopped plan v0.5 on v1.3.8; SS-21 Option B ruled; closed SS-G3, G6 y/height, G15, G24, SS-17 font; corrected G6 x (24–536); open SS-G6 residual (Art); new SS-G25 (text).

## v0.5.9 delta · 2026-10-24 17:23 CEST · Head of QA (appended): Sales Stopped plan v0.5 re-pointed to spec v1.3.9 FINAL (sha1 2609ba88e787ed3782f8d13f249a2062796b782c; supersedes v1.3.8)
| ID | Status | Note | Owner |
|---|---|---|---|
| SS-G6 residual (v0.5.8) | **Closed** (Art 17:21) | pill x signed: 959×600 188–748, 1024×1366 232–792; hit area = chip button at `#goal`'s full 44 px height; visible pill 40 px / 2 px inset phone (360×640 y 458–498), 44 / 0 docked; no pseudo-element, 0 shift. Plan's `::before` +2 px checks dropped | – |
| SS-G25 | **Revised, text only** | (a) SS-17 ≈ 295 px still in spec (Art 242); (b) SS-16 table header calls `#goal` x the "chip button (hit area) x" while the button x is max-560 centred (959: 188–748 vs 12–923). SS-35(d) nit gone | PM Market |
- v0.5.9 (17:23): SS plan v0.5 now on v1.3.9; all Art items for SS closed; Option B unchanged; SS-G25 revised (text).

## v0.6.0 delta · 2026-10-24 17:27 CEST · Head of QA (appended): Collection plans v0.7 (golden/Broody spec v1.3 17:22; streak v1.3.1 errata 17:25 sha1 895ca903700fe63280e659fdc625bbd2416118ab)
Draft CSV of record: `scratch/v2-econ/economy.m50-draft.csv` sha256 8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b (QA `sha256sum` matches; D-HOP-2026-10-24-24).
| ID | Status | Note | Owner |
|---|---|---|---|
| GE-16b | **Closed** | GE-AC15/R13: 959×600 6/6/≥4, 960×600 5/4/≥2, 960×1280 + 1024×1366 (added) 8/8/≥6; R12 phone = NOT (≥960 AND landscape) | – |
| GE-17 | **Closed** | spec: chip rect = `#goal` everywhere (R14/R4 hold); text mismatch M1 below | – |
| GE-18 | **Closed** | ruling 2 confirmed (HoE 17:18); GE-AC9b disagreeing cash value 3,313,552,582,910 → 1,491,098,662,310¢ (BigInt ✓; Number …309) | – |
| BigInt switch location (ST-AC2c, BH-AC3b, GE-AC9b) | **Closed** | BigInt iff an operand or product > MAX_SAFE (spy) | – |
| ST-11 / §4.1b float rule | **Closed** | `Math.round(I_ss×100)`; 1.005 → 100 | – |
| BH-AC3b(c) wording | **Closed** | guard on the intermediate; boundary refCents 18,014,398,509 per 1,000 ms (QA ✓); disagreeing value 7,474,818,205,800 → 373,740,910,290¢ (BigInt ✓; Number …289) | – |
| BH-k | **Closed** | new BH-AC13b: 959×600 exactly {Y0,Y5} both pill states; 960×600/960×1280/1024×1366 8 hidden / 7 shown; Y0 at 5 hens | – |
| **D-COL-2026-10-24-01** (min 1 slot) | **Provisional, pending HoP** | QA asserts ≥ 1 but marks it provisional | **HoP** |
| BH-n | **Closed** | CSS states; assets on disk (`art-ux/assets/overlay-broody-nest.svg`/`@2x.png`, `mocks/m5-broody-nest-360.png`, `assets/sfx/sfx-broody-*`) | – |
| ST-AC26b | **New, planned** | band ≤ nav/viewport bottom, 12 px bar ≥ 4 px clear, 0 px gap ≤ 390 px, Collect 48 px Fredoka 18/700, `.btn.xl` 18 px; 7 viewports × 3 engines; layout spec wins | – |
| **TEL-16** | **New** | `docked-compact` `layout` schema value | **HoE** |
| **M1 (text)** | **New, minor** | Collection v1.3 "chip rect = `#goal` everywhere" vs SS v1.3.9 chip max-560 centred (narrower at 959/1024×1366); chip ⊆ `#goal`, no test risk | PM Collection |
| **M2 (text)** | **New, minor** | layout-spec §3.3a labels 1024×474 "docked"; golden R12 (vh < 700) makes it docked-compact; its v1.5 changelog is stamped 17:45 (future) | Art & UX |
| **M3 (text)** | **New, minor** | Broody BH-AC13 viewport list lacks 1024×1366 (in BH-AC13b); v1.3 changelog still says "BH-n stays open" while §13 says closed 17:24 | PM Collection |
Still open (Collection): **GE-8, ST-5, BH-b** (Economy, G3 re-measure); TEL-16 (HoE); D-COL ratification (HoP).
- v0.6.0 (17:27): Collection plans v0.7; closed GE-16b, GE-17, GE-18, BigInt switch, ST-11 float, BH-AC3b(c), BH-k, BH-n; new ST-AC26b, TEL-16, M1–M3 (text); D-COL provisional.

## v0.7 · 2026-10-24 17:55 CEST · Head of QA · M5.0 FREEZE: consolidated verdict (appended; supersedes every status row above)
**Verdict: NOT YET BUILDABLE/TESTABLE: 2 blockers, both in the Economy merge-gate text (economy slice §13.2a AC-X1), none in a feature spec.** The 7 feature specs are TESTABLE as written; wording items ride as errata. Once B-X1a and B-X1b are fixed, the set is BUILDABLE/TESTABLE. B-X1b blocks only the Pause PR merge, and Pause is the first item cut.

### Hashes (QA `sha1sum`/`sha256sum`, 17:45–17:50)
| Item | Expected | On disk | Result |
|---|---|---|---|
| Golden egg v1.3.2 errata | f6b3a05e… (steering 17:48; HoP freeze said v1.3 + pending errata) | f6b3a05e44e66df1baad53124abb4d4c707b8861 | match |
| Broody v1.3.2 errata | f180c3ff… | f180c3ff2535088e7d748fff4947fe9de56e70ee | match |
| Streak v1.3.1 | 895ca903… | 895ca903700fe63280e659fdc625bbd2416118ab | match |
| Sales-stopped v1.3.9 | 2609ba88… | 2609ba88e787ed3782f8d13f249a2062796b782c | match |
| Abilities v1.3.2 | 91df292… | 91df292f5b0f433c6bd8713fb1a22d484b802e95 | match |
| Pause v1.3.3 | 6ea8ec8… | 6ea8ec8a23615cdce58d4b0540629aba5148c63d | match |
| bb-stopgap v1.2.1 | 11d98516a6f2e8b89dd0fca1b748c3c995b8dc4a | same | match |
| CSV draft (`scratch/v2-econ/economy.m50-draft.csv`) | sha256 8dc90e2b… | 8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b (32 lines = header + 31 rows) | match |
| T3 gate CSV (`scratch/v2-econ/t3-draft.csv`, §13.2a) | sha256 dd301dfd…0eac | dd301dfd3eb46a1659e34212f3cbb6498454cc5ebfe7511eeed297e092760eac (57 lines) | match |
Note: "economy.md §13.2a" is in `product/research/v2-slices/economy.md` (sha256 3d0ec95a…; 17:43). `product/economy.md` has no §13.

### BLOCKERS
| ID | Gap (no enforceable oracle/threshold/owner) | Owner | Exact fix |
|---|---|---|---|
| **B-X1a** | AC-X1 doesn't name the CSV/lineage the CI harness runs on. Every prediction in the §13.2a table comes from the **T3 lineage** (`t3-draft.csv` dd301dfd, 56 rows, L31–50 spliced), while the build ships `product/economy.csv` = c7bb783f + 8dc90e2b (**31 rows, L0–30**). A CI run on the shipping CSV has no matching prediction for windows past L30 or for the L30+ step rows, so "±20 % of the prediction" can't be computed. The table also mixes rows that block with rows marked "known risk" (L30+ step: absolute gate "after the reshape") and "—" | **Economy** (table), **HoP** (ruling), HoE (CI wiring) | Add to §13.2a AC-X1: (1) "CI runs `measure:l30plus` on `t3-draft.csv` sha256 dd301dfd… committed as a test fixture" **or** republish the table on the shipping 8dc90e2b CSV; (2) add a column **Blocks merge? Y/N** per row: window-ratio rows and workers L10 = Y (band + absolute); L30+ step rows = band on the delta only, absolute N/A until the L30+ reshape; median and L30 median = report; (3) name the CI job/check (e.g. `ci:ac-x1`) and its owner (HoE) |
| **B-X1b** | G5-P on AC-X1: the §13.2a row has no ±20 % band. The (f) full-coop outlier is "accepted" (D-HOP-16 (4)) and to be "revisited if it persists", with no numeric bound. §13.2 says the harness needs a pause-pattern driver and a managed-income metric, but AC-X1's harness scope (profiles, call policies, window metric) doesn't include them and names no owner | **HoP** ((f) bound), **Economy** (row), **HoE** (driver) | Add a G5-P row to AC-X1: "patterns (a), (b), (e), (g): managed income ≤ never-pause +1.0 % mean and ≤ +2.0 % worst seed per profile × F10/F18/F24 checkpoint; (d) ≤ never-pause; (c) reported; (f) mean ≤ +1.0 % and worst ≤ +2.5 % on at most 1 seed-checkpoint, otherwise block; seeds 0–99 (or 1–200, stated); blocks the Pause PR merge". Add "pause-pattern driver + managed-income metric" to the reviewed harness commit, owned by HoE |

### ERRATA (wording only; QA tests per the reading given)
| ID | Text | Owner | QA reading |
|---|---|---|---|
| E-1 | Pause AC-P9: the hide 20 s and Settings 20 s cases say "10 ± 0.5 s left" (a leftover from the 30 s lockout) | PM Workers | 45 − 20 = **25 ± 0.5 s** (config-relative) |
| E-2 | Pause: AC-P19 sits under §15 "Build size", not §13. The §10 G5-P table lists (a)–(d) only, while §12 has (e)–(g) | PM Workers | AC-P19 tested as SS-30; G5-P per B-X1b |
| E-3 | AC-M5A-15 / AC-P14 "recorded" G1 numbers are the 100-seed checkpoint (1.77 / 1.84) | PM Workers | oracle = §13.2a seeds 1–200 (worst 1.936) |
| E-4 | GE-AC34 / ST-AC29 pin flag-off hash `f90d1678…` (RC1). The M5.0 base is post-patch1 (D-HOP-23 gate 1 = patch1 golden) | PM Collection (+HoE) | QA asserts the patch1 flag-off golden. If patch1 left f90d1678 unchanged, it's the same value |
| E-5 | `tc_margin_px` (16) is cited in golden R14 and Broody R4 but isn't a CSV column | PM Collection | UI constant, 16 px |
| E-6 | X1 per feature (D-HOP-07) vs the stack-level §13.2a table (D-HOP-24) | Economy (confirm) | per-feature uplift/share is reported; the gate is the stack table |
| E-7 = SS-G25 | sales-stopped §4 still says "≈ 295 px" (Art: 242); the SS-16 header calls the `#goal` x the "chip button x" | PM Market | Art rects + max-560 centred pill |
| E-8 = TEL-10 | `worker`/`farm` vs `farm_level` naming | PM Collection | as emitted, schema-validated |

### CLOSED in v0.7
| ID | Closed by |
|---|---|
| GE-8 | first-spawn/warn/urgent/grace columns + `tc_egg_w_*` weights in 8dc90e2b (D-HOP-24); land with the CSV PR on Vadim's go |
| ST-5 | `tc_streak_cap` 0.28 in 8dc90e2b; ST-AC28 dual run retired |
| AB-4 | `tc_ability_unlock_farm` 10, `tc_ability_energy_cost` 0, `tc_ability_w2_mode` 0 in 8dc90e2b; no price-mult column (Sweep A) |
| BH-b (G3 re-measure) | values in 8dc90e2b; paper G3 passes on the harness definition (§13.2a, seeds 1–200, worst 1.936 ≤ 2.25); the harness-of-record re-measure is AC-X1 (enforceable once B-X1a is fixed) |
| D-COL-2026-10-24-01 | approved by HoP 17:23; BH-AC13b ≥ 1 slot is binding |
| M1 / GE-17 wording, M3 (BH-AC13 1024×1366, BH-n changelog) | Collection v1.3.2 (17:43) |
| M2 | Art layout-spec: 1024×474 = docked-compact (stamp 17:23) |
| TEL-15 | = SS-G7, closed in v0.5.8 (`session_s` = focus clock, pins deduped by (role, cause)) |
| TEL-16 | the Broody §8 enum includes `docked-compact`; schema.ts follows the specs (T-AC9 export validation is the test) |
| bb-stopgap G1–G9 | v1.2/v1.2.1 (D-HOP-25 log 17:45/17:50); plan `test-plan-bb-stopgap.md` v0.1 |
| Pause/abilities re-point | abilities v1.3.1/v1.3.2 and pause v1.3.2/v1.3.3 have no rule or AC changes; AC-P19 (v1.3.1) was already mapped. No new cases |

### Status per item (v0.7)
| Item | Spec (frozen) | Plan | Testable? |
|---|---|---|---|
| Golden egg | v1.3.2 f6b3a05e | v0.8 | Yes (errata E-4/E-5) |
| Streak + tap coins | v1.3.1 895ca903 | v0.8 | Yes (E-4) |
| Broody Hen | v1.3.2 f180c3ff | v0.8 | Yes (E-5) |
| Abilities | v1.3.2 91df292 | v0.6 | Yes; Economy values gate on AC-X1 (B-X1a) |
| Pause | v1.3.3 6ea8ec8 | v0.6 | ACs yes; **merge gate blocked (B-X1b)**; E-1/E-2 |
| Sales stopped | v1.3.9 2609ba88 | v0.5 (unchanged) | Yes (E-7) |
| bb-stopgap | v1.2.1 11d98516 | v0.1 (new) | Yes |
| Economy gate AC-X1 | economy slice §13.2a | – | **Blocked (B-X1a, B-X1b)** |
- v0.7 (17:55): M5.0 freeze verdict. Two blockers (B-X1a lineage/blocking rows, B-X1b G5-P bound and owner), eight errata, and the open Economy items closed (GE-8, ST-5, AB-4, BH-b).

## v0.7.1 · 2026-10-24 18:02 CEST · Head of QA (appended): Workers errata applied
Specs of record (QA `sha1sum` matches): Pause **v1.3.5** `d3c1afb02702aa02791e0afaca2f465e42b3430e` (D-HOP-28 addendum 18:00; v1.3.4 9f1b999a superseded); abilities **v1.3.3** `06f98b49c6831206ab8ef64db1b6e791c8afc5f1`. Plans: pause **v0.7**, abilities **v0.7**.
| ID | Status | Note | Owner |
|---|---|---|---|
| E-1 | **Closed** (v1.3.4) | AC-P9: hide 20 s and Settings 20 s → 25 ± 0.5 s; reload after 10 s stays 35 s | – |
| E-2 | **Closed** (v1.3.4) | AC-P19 is in §13; the §10 G5-P table has (a)–(g) | – |
| E-3 | **Closed** (pause v1.3.4, abilities v1.3.3) | AC-P14 and AC-M5A-15 cite §13.2a | – |
| B-X1b bands | **Closed** (D-HOP-27, D-HOP-28 (2), spec v1.3.5 §10) | (a)(b)(e)(g) ≤ +1.0 % mean / ≤ +2.0 % worst; (d) ≤ never-pause; (f) mean ≤ +1.0 %, at most 1 seed-checkpoint in (+2.0, +2.5]. Anything else blocks the Pause merge. Plan case AC-P14-CI | – |
| B-X1b driver owner | **Closed** | spec §10 names it ("HoE owns the pause-pattern harness driver", D-HOP-27); D-HOP-28 (1): check `pacing-x1-stack` owned by HoE, driver built by the Features seat | – |
| B-X1a | **Ruled, still open** (D-HOP-27) | the gate runs on the shipping CSV 8dc90e2b; L30+ step rows are non-blocking on the t3 fixture; check name `pacing-x1-stack` (HoE). Open: Economy has to republish the §13.2a table on 8dc90e2b with prediction/band/blocks-merge/check/owner columns. QA re-checks it then | **Economy** |
| E-4 | Open (D-HOP-28 (4)) | until `fix/m41-patch1` is cut | HoE / PM Collection |
Remaining blocker: **B-X1a** (Economy table republish). Errata still open: E-4…E-8.
- v0.7.1 (18:02): closed E-1, E-2, E-3 and B-X1b (bands + owner). B-X1a ruled, waiting on the Economy table.

## v0.7.2 · 2026-10-24 19:10 CEST · Head of QA (appended): G5-P lockout-45 FAIL, Pause merge BLOCKED (D-HOP-2026-10-24-33)
Economy slice `product/research/v2-slices/economy.md` **sha256 `1e3931c97ddbe44a65d79b167ecda42d9d780b78829c0a4817575b8d37562b4e`** (supersedes 1cf6da7c…069e; only the G5-P rows/notes changed vs the pre-image, QA `diff`). Raw: `scratch/v2-econ/out/g5p45/` (summary.md, B-*.log/json; Econ's cited path `scratch/v2-econ/h/out/g5p45/` does not exist).
| ID | Status | Note | Owner |
|---|---|---|---|
| **B-X1c** (new) | **OPEN, BLOCKS the Pause merge** | G5-P at lockout 45, CSV 8dc90e2b, seeds 1–200, (a)–(g): **4 of 10,800 gated seed-checkpoints > +2.0 %, 2 > +2.5 %** ((b) seller15 s47 F10 +2.62, s31 F18 +2.37; (f) optimal s19 F10 +2.52, casual s169 F10 +2.36); all means ≤ 0.00 %; (d) passes. QA recount from runner EXCEED lines matches Econ. Ruling D-HOP-33: band unchanged; variant (ii) golden timer paused during Pause, fallback (i); neither passes → Pause cut. Plan delta `qa/m5/delta-pause-golden-timer.md` (open spec questions Q1–Q9 there) | **Economy** (re-run), **PM Workers + PM Collection** (spec text), **HoE** (driver) |
| B-X1b (f) edge | **Re-opened then superseded by B-X1c** | QA's earlier acceptance of (f) "+2.5 %" on the inclusive edge ([QA-D-1024-G5PF], [QA-D-1024-M5FINAL]) is void: raw value +2.52 % | – |
| CI seed set | **Open** | AC-P14-CI now seeds 1–200 on 8dc90e2b (D-HOP-33); the Econ run has no `slow` profile, which spec §10 still lists | HoE / Economy |
| Whole stack | Unaffected | §13.2a whole-stack Y rows (G1, step L11–30, G4, G5 workers, SS-21, AC7, per-flag) are byte-unchanged vs 1cf6da7c and still PASS (source `out/x30/`, `out/x30s/`); g5p45 covers G5-P only, not re-run. Other M5.0 flags unaffected. Re-check whole stack after the Pause mechanic change | Economy |
- v0.7.2 (19:10): new blocker B-X1c (G5-P FAIL); (f) edge acceptance void; seed set → 1–200.

## v0.7.3 · 2026-10-24 21:58 CEST · Head of QA (appended): golden errata rev. 4 × pause errata rev. 3, G5-P (ii) PASS ([QA-D-1024-GOLD4PAUSE3])
Inputs (QA hashes match): golden errata v1.3.3-DRAFT rev. 4 sha1 `569f26ffd1538e599ba8ea2697c1ae54c869aeb9`; pause errata v1.3.6-DRAFT rev. 3 sha1 `d4ab134c44fd6b9705bc092effd0d6220fda5f4e`; economy slice sha256 `fe24954d72074a218a66bd25659f4d26eae1be6e11ad3f4d3924eee505b934d9` (§12a/§13.2a). Rulings D-HOP-34, D-HOP-40, D-CEO-20261024-09. Verdict **TESTABLE WITH GAPS**; detail and new cases PGT-26…PGT-37 in `qa/m5/delta-pause-golden-timer.md` v0.3 §1a/§6.
| ID | Status | Note | Owner |
|---|---|---|---|
| **B-X1c** | **Closed on paper** | G5-P (ii) GPAUSE=2, CSV 8dc90e2b, seeds 1–200, lockout 45, optimal/seller15/casual/slow: QA recount of `scratch/v2-econ/out/g5p45/d34/g2-g5p-*.json` = 14,400 gated seed-checkpoints, 0 > +2.0 %, 0 > +2.5 %, worst +1.35 %, all gated means ≤ 0.00 %. Final close needs `pacing-x1-stack` on the Pause PR SHA (G4P-8) | HoE |
| CI seed set | **Closed** | AC-P14-CI fixed: seeds 1–200 on 8dc90e2b, lockout 45, every §10 profile incl. slow, 14,400 gated (delta v0.3 §3; plan v0.9) | – |
| G4P-1 | Open | HoP to confirm "untappable = no collect; hit target + bubble" (golden §6 still-open 6) | HoP |
| G4P-2 | Open | Same-tick order of player input (tap/sale) vs Pause/Resume toggles unstated (R5g e; pause 11(g)) | PM Collection + PM Workers |
| G4P-3 | Open | Fade-in-progress egg under freeze: R18 (not tappable) vs R5g b/i (frozen style, bubble) | PM Collection + Art |
| G4P-4 | Open (record) | Pause rev. 3 cites golden rev. 3 ba2c7ca4, not rev. 4 569f26ff | PM Workers |
| G4P-5 | Open (record) | Pause rev. 3 §3.3/§3.4 still [PENDING ECON], "of 10,800"; baseline with slow is 5/14,400 | PM Workers |
| G4P-6 | Open (record) | Golden rev. 4 header/E-2/P-1 don't record D-HOP-40 + CEO approval | PM Collection |
| G4P-7 | Open | CI band wording: pause §3.2 "exactly one" vs economy §12a "strict" vs QA "at most one (f)" | HoP |
| G4P-8 | Open, **blocks CI lane** | Shared `goldenFrozen()` in build + `pacing-x1-stack` driver; spec silent on sim approximation A3 (caught egg paid at spawn) | HoE (H-1), PM Collection |
| G4P-9 | Open, **blocks telemetry lane** | No HoE allowlist entry on disk for `golden_frozen_s`, `golden_on_screen`, `frenzy_active` | HoE |
| G4P-10 | Open (minor) | Economy names `tc_pause_golden_resume_wait_s` = 0; specs say no such column | Economy |
| Whole stack | Unchanged | G1, premium and AC7 trace 19d4034d unchanged per Econ/D-HOP-40 (re-verified by QA at 22:00 (AC7 traceSha 19d4034d re-run; G1/premium identical to d33; see test-plan-pause-resume.md G5P-D34 section)) | Economy |
- v0.7.3 (21:58): golden rev. 4 + pause rev. 3 reviewed, TESTABLE WITH GAPS (G4P-1…10); B-X1c closed on paper; CI seed set closed.

## v0.7.4 · 2026-10-24 22:14 CEST · Head of QA (appended): golden rev. 5 × pause rev. 4 → TESTABLE ([QA-D-1024-GOLD5PAUSE4])
Inputs (QA hashes match): golden errata rev. 5 sha1 `8439752d62fc34fc0fe814a75321975738b2acf2`; pause errata rev. 4 sha1 `9245d27ca60212d989f6af953727c3ea6f5a1621` (supersedes 735cb284, which QA never had on disk); economy sha256 `8137205cb5d5836287c07c8c136db531c553060f3ad3cac883e77773d6c2edc5`; M5.0 plan sha256 `1abbd586593cb23cc513f9cf2fcaf8ab6b22aed4b44f155deb5b28b2e1a603ee` pins all three (re-pin 22:09, D-HOP-2026-10-24-41/-42).
| ID | Status | Note | Owner |
|---|---|---|---|
| G4P-1…G4P-7, G4P-10 | **Closed** | D-HOP-41 rulings applied in golden rev. 5 / pause rev. 4 / economy 8137205c (detail: delta v0.4 §6a) | – |
| G4P-8 | **Closed on paper** | HoE 21:58 shared pure `goldenFrozen(state)` + parity test; proof = `pacing-x1-stack` on the PR SHA | HoE |
| G4P-9 | **Closed on paper** | HoE 21:58 allowlist approval for telemetry v0.6.2; not yet in telemetry-spec.md | HoE / PM Collection |
| R-1…R-4 | Open, record-only | stale "re-point when it lands" (pause L154); golden cites superseded pause sha 735cb284; golden still-open 7 economy drift; economy "strict band" wording vs D-HOP-41 (7) | PMW / PMC / Economy |
| B-X1c | Closed on paper (unchanged) | final close on `pacing-x1-stack` PR-SHA run | HoE |
- v0.7.4 (22:14): TESTABLE on golden rev. 5 + pause rev. 4; G4P gaps closed; R-1…R-4 record-only; new PGT-38.

## v0.7.5 · 2026-10-25 01:50 CEST · Head of QA (appended): M5.1 breeds rev. 3.8.2 (fd5235bf) → NEEDS FIX, 2 text-only ACs ([QA-D-1025-BREEDS381])
| ID | Status | Note | Owner |
|---|---|---|---|
| BR-F1 | Open, **blocks TESTABLE** | BR-AC52c Hatch starts-with can't be judged (name has fmtMoneyAria); state the prefix "Hatch · " (UI-BR-23) and the engines | PM Collection |
| BR-F2 | Open, **blocks TESTABLE** | BR-AC53 "Both are integers" vs §8 0.1 s number for present_active_s; telemetry-spec 381b3e80 L226 also stale (record) | PM Collection |
| R-B1…R-B5 | Open, recommended | E22b clock name; pop-cap boundary + controlled clock; K10 mechanical trigger (HoE/Econ); BR-AC31e test-hook fallback; pin m51 draft CSV ad27fe73 | PMC / HoE / Econ |
| T1–T7, N1–N3 | **Closed** | verified in rev. 3.8.2 | – |
- v0.7.5 (01:50): breeds review; see qa/m5/review-m51-breeds.md.
- v0.7.6 (01:58): breeds rev. 3.8.4 2eb03046 TESTABLE (superseded by v0.7.7) ([QA-D-1025-BREEDS384]). BR-F1 and BR-F2 closed; R-B1, R-B2 and R-B4 closed in text. Open (non-blocking): BR-31e hook name (HoE), bc_* CSV sha256 (Econ), K10 CI wiring (HoE/Econ).
- v0.7.7 (01:59): breeds rev. 3.8.5 5dde4b62 **TESTABLE, final** ([QA-D-1025-BREEDS385]). Open (non-blocking): BR-AC31e hook name (HoE); Econ to log its own ad27fe73 confirmation (PMC-reported, artifacts corroborate); K10 CI wiring (HoE/Econ).

## v0.7.8 · 2026-10-25 08:30 CET · Head of QA (appended): M5.1 Workers required test-time check (HoP instruction)
| ID | Status | Note | Owner |
|---|---|---|---|
| TG-LR10-G | **Required at test time** | At M5.1 test time, on the o1a baseline (`scratch/f27-verify/csv/o1a.csv` sha256 a8c4e268…eb07f, or the baseline of record then), alongside the o1a TS-bot gate run, QA computes the AC-LR10 per-seed window guard: 600 s windows from the manual run's 300 s snapshots, F10 → max, guard = P95 of auto/man, **≤ 1.02** on **s148 (seller15, casual) and s116 (casual)**. Same method as re-check 7 (Econ's `m5sx.ts` driver config g1-at30, or its TS-bot port). The current figures 1.000 / 1.003 / 1.005 are pre-o1a (8dc90e2b). Any guard > 1.02 returns to HoP. Recorded in [QA-D-1025-M51FC10]. | HoQA |
- v0.7.8: TG-LR10-G added per HoP.

- 07:55 Oct 28: SS-G25 CLOSED on sales-stopped-spec v1.3.10 (sha1 2c2c323b…, text only; SS-17 242 px, SS-16 #goal vs 560 px chip button split). Test unchanged.
