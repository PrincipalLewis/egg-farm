# M5.0 Golden Egg: errata v1.3.3 for Pause · DRAFT (rev. 5, D-HOP-41 HoQA gaps; rev. 4 A-3 closed 20:45) · 2026-10-24 22:04 CEST · PM, Collection

> **DRAFT (paper only; no code until Vadim's go).** **G5-P PASSES with variant (ii): D-HOP-2026-10-24-40** (HoP 21:54: "G5-P PASSES with variant (ii); Pause stays in M5.0"), approved by the CEO as **D-CEO-20261024-09** (21:55: "Approves D-HOP-40, a paper change only, with no code until Vadim's go"; approved specs: this errata rev. 4 `569f26ff…` and pause errata rev. 3 `d4ab134c…`). Rev. 5 applies **D-HOP-2026-10-24-41** (22:01, HoQA TESTABLE WITH GAPS) items 1, 2, 3, 6 and 8 plus the non-blocking label-in-name note; the rules ruled by D-HOP-34 are unchanged in substance. Conditions before the Pause merge (D-CEO-20261024-09): HoQA's gate and AC-P14-CI on seeds 1–200, and HoQA's PGT tests proving no tap while frozen. HoE's telemetry fields and the shared freeze function were approved at 21:55/21:56 (H-1 closed).
> **rev. 2 follows D-HOP-2026-10-24-34 (19:14), which rules variant (ii) and answers QA `qa/m5/delta-pause-golden-timer.md` v0.1 Q1–Q7. rev. 3 applies Head of Art & UX 19:09 (frozen style and on-hold copy; closes A-1/A-2).** Rev. 4 closed A-3. Econ's (ii) re-run has passed and the CEO has approved (above). The status stays DRAFT until HoQA's gate clears.

- **Target spec:** `product/collection/m5-golden-egg-spec.md` v1.3.2, sha1 `f6b3a05e44e66df1baad53124abb4d4c707b8861` (frozen; **not edited**).
- **Companion spec (PM Workers owns it):** `product/workers/m5-worker-pause-spec.md` v1.3.5, sha1 `d3c1afb02702aa02791e0afaca2f465e42b3430e` (not edited here). PMW's part is in §4.
- **Trigger:** D-HOP-33. G5-P at lockout 45, seeds 1–200, on 8dc90e2b fails the D-HOP-28 band (4 of 10,800 checkpoints > +2.0%; worst +2.62%). Cause: golden-egg/Frenzy timing lands on stock banked while paused. With golden off, the (b) worst is +0.17%.
- **Ruled (D-HOP-34):** variant (ii), golden timers freeze during Pause, with the rules below. Variant (i) has moved to Appendix A, **not chosen (D-HOP-34)**.
- **Gate for Econ's re-run (D-HOP-34):** every §10 G5-P profile **including slow**, seeds **1–200**, on 8dc90e2b, lockout 45, with the AC-P14-CI bands unchanged.
- **Paper only.** No spec, CSV or code edits, and no messages sent.

## 0. What the fix targets (reading of spec v1.3.2)
Only **Frenzy ×2** reads stock: it multiplies every sale in its window, Basket stock included. The `cash`, `eggs` and `eggs_cash` rewards use live E × P (§4 #2–#3) and never read stock.

Under (ii) the leak is closed from the timing side:
- no egg can spawn, age or be collected while any worker is paused (a tap shows the on-hold bubble instead);
- a running Frenzy is suspended, so it pays no ×2 while paused (D-HOP-34 Q3/Q4).

The reward formulas and the integer money math are unchanged (GE-AC38).

---

## 1. Replacement text (paste into v1.3.3)

**Glossary: add after "Sim clock":**
> - **Golden freeze (v1.3.3; D-HOP-33, D-HOP-34 Q1/Q2):** `goldenFrozen()` is true while `m4.flags.pause` = 1, F ≥ `tc_pause_unlock_farm` (10) and **at least one hired worker**, of any role and including the Grader, has `paused: true` (Pause spec rule 1).
>   - It applies only to the golden spawn/first-spawn countdown (`nextSpawnRemainingS`), the on-screen egg's focus age, and `frenzyRemainingS` (with its ×2 effect).
>   - It is **not** a focus-clock condition: `focusClock`, the streak (value, hold, decay and the (1 + s) uplift), Broody accrual and ability timers are untouched.
>   - **One predicate:** the build and the G5-P sim driver must call the same `goldenFrozen()` function (QA §3; HoE to confirm).

**§3.2: insert new R5g after R5f:**
> - **R5g Golden freeze during Pause (v1.3.3; D-HOP-34).** While `goldenFrozen()` is true:
>   - (a) **Countdown frozen.** `nextSpawnRemainingS` doesn't advance. That covers the first spawn (R2), the gap (R3) and the R15 deferral re-check. No egg spawns.
>   - (b) **On-screen egg frozen, not collectable (Q3; Head of Art & UX 19:09).**
>     - The egg stays **visible** with its focus age frozen, so its state (idle, warning or urgent) doesn't change and it can't expire.
>     - **"Untappable" means no collect, not no hit target (D-HOP-2026-10-24-41 (1)).** The frozen golden egg **stays a tap target**: it stays focusable and keeps its 56×56 hit box, so it is **not** `pointer-events:none` or `inert` (this differs from R6). A tap shows the on-hold bubble and **collects nothing: no collect and no ×2**. In D-HOP-41 (1)'s words, it "collects nothing, rolls no reward, starts no Frenzy and emits no collectible_collected". So a pointer, touch or keyboard (Enter/Space, R20) activation while frozen:
>       - does **not** collect, roll a reward, start a Frenzy (so no ×2 starts), draw from `evRng`, or emit `collectible_collected`;
>       - shows the **on-hold bubble** (R5g i).
>     - **Frozen style (Head of Art & UX 19:09; distinct from the R6 menu freeze, which is not reused as-is):**
>       - the bob and sparkle stop;
>       - the egg renders at opacity **0.6**;
>       - an **18 px SVG pause badge** (2 bars, 2 px `#3E2C23` outline) sits at the egg's bottom-right. **Asset (rev. 4, A-3 closed): `art-ux/assets/badge-pause.svg`** (sha1 `683b29e0…`; 18×18 viewBox, two `#3E2C23` bars, 2 px `#3E2C23` stroke ring, `<title>Paused</title>`; studio-owned CC0, listed in `art-ux/assets/LICENSES.md` § badge-pause.svg);
>       - the timer ring stays **static** at its frozen state;
>       - the collect tap is off.
>       - **The state is never shown by colour alone:** the badge carries it.
>       - **Reduced motion:** identical (nothing in the frozen style animates).
>     - The warning sound (R21) doesn't fire while frozen.
>   - (c) **Frenzy suspended (Q4; supersedes Pause spec E14, golden wins).** `frenzyRemainingS` doesn't count down, and **×2 doesn't apply to any sale** (player, worker or Basket stock) while frozen. The timer and the effect are suspended together, otherwise pausing would extend a Frenzy.
>     - **Frenzy pill frozen style (Head of Art & UX 19:09):**
>       - a pause glyph replaces the "×2" / "2×" text, so the pill reads [pause] `0:20`;
>       - the remaining time is **static**;
>       - the pill renders at opacity **0.6**;
>       - reduced motion: identical.
>     - The gold `2×` chip badge on prices (customer card, Sell, Sell all; R26) is **hidden** while frozen.
>     - Tapping or keyboard-activating the frozen pill shows the on-hold bubble (R5g i).
>   - (d) **Lift.** The freeze lifts on the tick the **last** paused worker resumes, whether by Resume or by Manage (Pause rule 8). The countdown, the egg age and the Frenzy continue from their frozen values. **There is no catch-up, no re-draw and no extra wait** (see open item E-1).
>   - (e) **Tick order (Q5; D-HOP-41 (2); QA PGT-11/12/26/29/36).** Within one tick the order is fixed: **(1) the tick's Pause/Resume toggles apply first, (2) then the golden freeze state (`goldenFrozen()`) is evaluated, (3) then player input is applied.** So a tap on the egg or pill in the same tick as a pause is handled as frozen (on-hold bubble, no collect), and a tap in the same tick as the last resume is handled as unfrozen (normal collect). The golden update runs under the state from step 2. (This is the same order as pause errata rev. 4 rule 11(g), `product/workers/m5-worker-pause-errata-v1.3.6-DRAFT.md` sha1 `735cb28451883f7e7e9f0e0fd62b5677de7ca739`.) So:
>     - on the pause tick there is no spawn and no expiry;
>     - an egg whose age would reach 30.0 s on that tick stays at its pre-tick age, and no fade starts;
>     - a countdown that would reach 0 on the pause tick doesn't spawn, and the egg spawns on the first unfrozen tick that reaches 0 (R15 rules unchanged);
>     - on the last-resume tick, the golden timers advance on that tick, and a tap that tick collects normally;
>     - a sale on the pause tick is at ×1, and a sale on the last-resume tick is at ×2 if a Frenzy is running (it is unfrozen).
>   - (e2) **A fade already running when the freeze starts: R18 wins (D-HOP-2026-10-24-41 (3)).** The 300 ms fade **runs to the end** and `collectible_expired{reason:"timeout"}` fires once. The fading egg gets **no frozen style** (no 0.6 opacity, no pause badge), **no hint** (no on-hold `aria-describedby`), **no bubble** on activation, and **no collect** (R18: not tappable during the fade). "The freeze cannot save an egg that is already expiring." The next R3 gap is drawn as usual and is then frozen (R5g a).
>   - (f) **Layering.** The R6 menu freeze, R7 hidden < 60 s, R8 offline/reload, R9 negative delta and R10 guard rules still apply on top. A timer moves only when every freeze condition is clear.
>   - (g) **Reload and offline while paused (Q6; QA PGT-6/6b/6c/7/8).**
>     - The saved `paused` flags keep the freeze on after load. The countdown and `frenzyRemainingS` stay frozen **after the welcome-back modal closes**, until the last paused worker resumes. That overrides R8's "resumes … from when the welcome-back modal closes" while a worker is paused.
>     - **R8's reload/offline expiry is unchanged:** an on-screen egg is removed with `collectible_expired{reason:"offline"|"reload"}` and no reward. The fresh R3 gap is drawn as before, and then it is frozen.
>     - Wall-clock changes move nothing.
>   - (h) **Inert when off.** With `m4.flags.pause` = 0, F < 10, or no worker paused, R5g does nothing, so behaviour and traces are byte-identical to v1.3.2.
>   - (i) **On-hold bubble (A-2; Head of Art & UX 19:09).** There is no copy on the paused worker card and no banner.
>     - **Trigger:** a pointer, touch or keyboard (Enter/Space) activation of a frozen egg or of the frozen Frenzy pill.
>     - **Text:** exactly **"On hold while a worker is paused"**.
>     - **Anchor:** the bubble's bottom edge sits **8 px above** the top of the activated element's rect, horizontally centred on it. Edge clamping follows R25a: 8 px inside the viewport, never above HUD bottom + 8.
>     - **Timing:** visible for **1.6 s**, then a fade of **≤ 200 ms**. Another activation restarts the 1.6 s; only one bubble shows at a time.
>     - **Accessibility:** both the frozen egg and the frozen pill carry `aria-describedby` pointing to an element with that exact string. It is set while frozen and removed on lift.
>     - **What the bubble isn't:** it is not a menu (R6), so it doesn't freeze anything. It is not a toast, so it doesn't count as an R14 zone. It emits no telemetry event.

**R2 and R3: append:**
> Frozen while `goldenFrozen()` (R5g). The drawn gap is never re-drawn.

**R6: append to the frozen-egg bullet:**
> R5g (Pause) has its own style and stays focusable and hit-testable for the on-hold bubble (R5g b, i). The menu-freeze mechanics are not reused as-is.

**R18: append:**
> Focus age doesn't advance while `goldenFrozen()` (R5g b). A fade already in progress when the freeze starts completes: R18 wins, with no frozen style, no hint, no bubble and no collect (R5g e2; D-HOP-41 (3)).

**R23: amend the freeze list ("Under any D-HOP-04 #4 menu and while the tab is hidden …") to:**
> Under any D-HOP-04 #4 menu, while the tab is hidden, **and while `goldenFrozen()` (R5g c)** …

**R10a: add to the `nextSpawnRemainingS` / `frenzyRemainingS` bullets:**
> No new save field. The freeze is derived from the saved `workers.*.paused` flags. A save with `paused: true` loaded where the Pause flag is 0 or F < 10 is unpaused (Pause rule 1, E13), so it isn't frozen.

**X7: append:**
> While `goldenFrozen()`, frenzy counts as 1, but (1 + s) still applies (the streak is untouched by Pause, D-HOP-34 Q2).

**§6 Edge cases: add:**
> | E20 | Any hired worker paused, Grader included (F ≥ 10) | Golden countdown, egg age and Frenzy frozen; no ×2 (R5g) |
> | E21 | Egg on screen when a worker is paused | Visible in the frozen style; a tap shows the on-hold bubble and collects nothing; same age on resume (R5g b, i) |
> | E22 | Pause lands on the expiry, fade or spawn tick | R5g e |
> | E22b | Fade already running when a pause starts | R18 wins: the fade completes, `expired{timeout}` once; no frozen style, no hint, no bubble, no collect (R5g e2; D-HOP-41 (3)) |
> | E22c | Tap in the same tick as the pause, or as the last resume | Pause tick: frozen (bubble, no collect). Last-resume tick: unfrozen (normal collect) (R5g e; D-HOP-41 (2)) |
> | E23 | Forgotten pause (no auto-end in M5.0, D-HOP-06 (c)) | No golden eggs and no Frenzy progress while it lasts; a tap on the frozen egg or pill shows "On hold while a worker is paused" (R5g i) |
> | E24 | Two workers paused, one resumes | Still frozen until the last resumes |
> | E25 | Reload or offline while paused | Still frozen after the welcome-back modal; R8 expiry of an on-screen egg unchanged (R5g g) |

**GE-AC30 note: append:**
> The rate applies to never-pause sessions only. Pausing players spawn fewer eggs by design (QA §3).

**§8 Telemetry (Q7; HoE allowlist):**
> - `session_end` adds **`golden_frozen_s`**: the sum of focus-clock seconds during which `goldenFrozen()` was true in the session, to 0.1 s **[T-sub, pending HoE allowlist]**.
> - `worker_paused` (Pause spec §12, PMW's event) adds **`golden_on_screen`** (bool: an egg was visible at the pause tick) and **`frenzy_active`** (bool: `frenzyRemainingS` > 0 at the pause tick) **[T-sub, pending HoE allowlist]**.
> - Nothing else is added.
> - Existing fields: `interval_s` stays the drawn gap; `deferred_ms` excludes frozen time; `reaction_ms` is the focus age excluding frozen time.
> - No `collectible_expired` or `frenzy_ended` fires during a freeze, except a fade that was already in progress (R5g e2).
> - TEL-14: if Pause is cut, nothing is emitted and there are no allowlist entries.

**§12 row 8: replace** "Out of this spec (D-HOP-04 #9)" **with:**
> The golden freeze during Pause (R5g; D-HOP-33/34). The Pause rules themselves stay in the Pause spec.

## 2. Side effects
- **Player feel:**
  - It's readable: "golden eggs and Frenzy wait while anyone is on break". It matches R23's existing "no timed active effect runs while the player can't act" model, and no price is shown that isn't paid.
  - **Costs:**
    - Benching any worker, the Grader included, stops golden eggs and suspends a running Frenzy.
    - Hand-selling while the Market Hand is benched no longer gets ×2. That is the old E14 behaviour, removed by Q4.
    - A forgotten pause stops eggs silently.
  - **Mitigation (Head of Art & UX 19:09):**
    - the frozen egg and pill have a distinct style with a pause glyph;
    - a tap gives the "On hold while a worker is paused" bubble;
    - there is no card copy or banner.
  - **Residual:** a player paused *before* any egg spawns sees no egg and so has nothing to tap. The forgotten-pause KPI watches this (§5 note).
- **Telemetry:** `session_end.golden_frozen_s`, plus `worker_paused.golden_on_screen` and `frenzy_active`, all pending HoE allowlist. The live G5 KPI ("income with pause vs without ≤ +1%") can then be split by golden overlap.
- **Save field:** **none new.**
  - Downgrade then upgrade (Pause E9): a pre-Pause build ignores the `paused` flags and its golden timer runs (M4.1 has no golden). On re-upgrade, the re-paused worker re-freezes.
  - Flag off then on (E13): `paused` is cleared, so nothing is frozen.
- **G1 / AC7 harness:**
  - AC7 bots never pause, so AC7, AC-SC9 (L0–9), flag-off `f90d1678` and the AC-P1 pin stay byte-identical.
  - The never-pause M5-on stack is byte-identical (GE-AC44).
  - Econ re-ran G5-P on the D-HOP-34 config: **PASS (D-HOP-40)**; G1, the premium and the AC7 trace `19d4034d` are unchanged.
  - **Sim shortcut (D-HOP-41 (8); economy §12a A3):** Econ's runner pays a caught golden egg **at spawn**, so the no-tap-while-frozen rule and "no ×2 from a frozen tap" are **not simulated directly**. They are proven only by HoQA's build tests **PGT-26–37**, not by the sim (D-HOP-40: "HoQA's PGT tests must verify it in the build").
  - The G5-P pause arm now sees later egg times than the never-pause arm on the same seed, so the per-seed Δ includes golden-schedule variance. Econ lists every seed-checkpoint above +2.0% (QA §3).
- **Edge cases:** E20–E25 above. A 2 s pause (the debounce minimum) only shifts the schedule by 2 s; nothing is re-drawn and nothing is gained.

## 3. Acceptance criteria (add to §9; they replace rev. 1's GE-AC39–45)
Timings are focus-clock time at ±1 tick (100 ms), as in §9. The fixture is F ≥ 10 with `m4.flags.golden` = `m4.flags.pause` = 1 and sheets closed. QA PGT ids are given in brackets.

- **GE-AC37 (reward formulas unchanged after a freeze)**
  - Given E = 9.5 and P = $1.35, when an egg frozen for 600 s is tapped after the resume:
    - `cash` = exactly **57,713¢**;
    - at F = 20, `eggs_cash` = **76,950¢**;
    - at F = 19, `eggs` adds **570** to the Basket.
  - It makes no difference whether coop + Basket held 0 or 5,000 eggs.
- **GE-AC38 (money-math path independence)**
  - After a freeze and resume, the GE-AC9b values hold unchanged:
    - `baseScaled` 3,313,552,582,910 → cash **1,491,098,662,310¢**;
    - 20,015,998,343 → **9,007,199,254¢** (BigInt path);
    - 15,011,998,758 → eggs_cash **9,007,199,255¢**.
  - The BigInt spy fires exactly above the switch.
- **GE-AC39 (freeze scope, entry and lift) [PGT-1/2/3/13/14/15/16/19]**
  - **Basic freeze:** given no egg and `nextSpawnRemainingS` = 100.0, when the Market Hand is paused for 60 s:
    - the countdown reads 100.0 throughout, and no `collectible_spawned` fires;
    - over the same 60 s, `focusClock` advances 60.0 s, the streak hold and decay run as without Pause, and Broody accrual and ability timers advance.
  - **Lift:** on Resume, the spawn comes at +100.0 s.
  - **Every role freezes it:** repeat with the Coop Hand, the Hawker and the **Grader** paused; each freezes.
  - **Countdown near 0:** given 0.5 s left, a 30 min pause gives 0 spawns, and the egg spawns 0.5 s after Resume.
  - **Overlapping pauses:** pause W1, then W2, then resume W1 → still frozen; resume W2 → it lifts that tick.
  - **Manage:** a Manage on the last paused worker (`worker_resumed{cause:"manage"}`) lifts it on the same tick.
  - **Menu on top:** pause, open Settings, resume under the menu → still frozen until the menu closes.
  - **No drift:** given 200.0 s on the countdown and 10 pause/resume cycles (each ≥ 2 s) totalling 300 s paused and 150 s unpaused, then `nextSpawnRemainingS` = 50.0 (±1 tick in total, so 150.0 s of the countdown has elapsed), and the spawn comes 50.0 s into the next unpaused time.
  - **Below unlock:** at F = 8–9 (golden on, Pause locked), no freeze can occur.
- **GE-AC40 (egg age frozen; frozen style; tap does not collect) [PGT-4/10]**
  - **Mid-life pause:** given an egg at focus age 25.0 s, when a worker is paused for 10 min:
    - no `collectible_expired` fires;
    - the age stays 25.0 s, with `data-tc-state` = `warning`;
    - the timer ring is static (its `getAnimations()` are empty or paused).
  - **No collect:** a pointer tap, a touch tap and Enter/Space on the egg each:
    - collect **nothing**: coins, Basket, `frenzyRemainingS` and `evRngState` are unchanged;
    - fire 0 `collectible_collected` and 0 `frenzy_started`;
    - each show the on-hold bubble (GE-AC40b).
  - **Still a hit target:** while frozen the egg is still a hit target, with its hit box `getBoundingClientRect` 56×56; `pointer-events` is not `none`; it is focusable and not `inert`.
  - **Sound:** the warning sound doesn't fire.
  - **Frozen style (Head of Art & UX 19:09):**
    - computed `opacity` = 0.6;
    - no running bob or sparkle animation;
    - exactly one pause badge SVG, 18 ± 1 px, with 2 bars and a 2 px `#3E2C23` stroke, its bottom-right within ±2 px of the egg visual's bottom-right.
    - With `prefers-reduced-motion: reduce`, the computed style is identical.
    - Greyscale check: the badge is present, so the state isn't colour-only.
  - **After Resume:**
    - `urgent` at +2.0 s, `fade` at +5.0 s, then `expired{timeout}` once by +5.3 s;
    - opacity is back to 1, and there's no badge and no bubble trigger.
  - **Tap after Resume:** an egg frozen at age 5.0 s and tapped 3.0 s after Resume is collected exactly once, with `reaction_ms` = 8,000 ± 100. Taps made while frozen don't count toward R19's grace or R20's single grant.
- **GE-AC40b (on-hold bubble; A-2) [Head of Art & UX 19:09]**
  - **Pointer activation:** given a frozen egg, when it is tapped once at time t:
    - a bubble with exact text **"On hold while a worker is paused"** appears in the same frame;
    - its rect bottom = the egg hit box top − 8 ± 1 px, and it is horizontally centred on the egg ± 1 px (or clamped 8 px inside the viewport per R25a);
    - it is fully visible until t + 1.6 s ± 1 frame, fades out over ≤ 200 ms, and is gone by t + 1.8 s.
  - **The same for the frozen Frenzy pill**, anchored to the pill.
  - **Keyboard:** Enter or Space on the focused frozen egg or pill shows the same bubble with the same anchor and timing.
  - **Second tap** at t + 1.0 s: the bubble stays one element and is gone by t + 2.8 s.
  - **aria-describedby:** while frozen, both the egg and the pill have `aria-describedby` resolving to exactly "On hold while a worker is paused". After the lift, neither has it.
  - **Label in name (WCAG 2.5.3; D-HOP-41 non-blocking):** while frozen, the frozen pill's accessible name **begins with its visible label** (the visible remaining time, e.g. `0:20`, then any state text). The frozen egg's accessible name begins with its unfrozen v1.3.2 aria-label; any freeze wording comes after it, never before. The on-hold text stays in `aria-describedby`, not in the name.
  - **Not a menu:** the bubble doesn't freeze the focus clock, the streak or Broody (it isn't a menu). It adds no telemetry event.
  - **No copy elsewhere:** the paused worker card and the HUD show no on-hold copy or banner.
- **GE-AC41 (Frenzy frozen mid-run, resumes with its remaining time) [PGT-5]**
  - **Fixture:** a Frenzy with `frenzyRemainingS` = 20.0 and s = 0.28 (Grader 1.25 working).
  - **During the 60 s pause:**
    - `frenzyRemainingS` = 20.0 throughout;
    - a Hawker or manual sale of k = 10 at base 150¢ credits exactly `round(10 × 150 × 1.25 × 1.28)` = **2,400¢** (no ×2; streak kept). This uses a non-paused worker or the player; the Market Hand is the one paused;
    - those sales add 0 to `frenzy_extra_cents`;
    - the pill reads [pause glyph] `0:20` (no "2×" text), static, at computed opacity 0.6, identical under reduced motion;
    - no `2×` chip badge is on any price (customer card, Sell, Sell all);
    - tapping the pill shows the GE-AC40b bubble and changes nothing else;
    - no `frenzy_ended` fires.
  - **After Resume:** the same sale credits **4,800¢**, ×2 runs for 20.0 s, then `frenzy_ended{reason:"timeout"}` fires once. `extra_coins` = Σ over unfrozen sales only.
  - **Pause on the Frenzy start tick:** given the Frenzy is granted on tick n and a pause applies on tick n + 1, then `frenzyRemainingS` = 30.0 − 0.1 at the freeze.
- **GE-AC42 (tick order, Q5) [PGT-11/12]**
  - **Expiry tick:** an egg at age 29.9 s, with the pause applied on the tick its age would reach 30.0 → age stays 29.9, no fade, no expiry. After Resume, the fade starts at +0.1 s.
  - **Fade in progress (R18 wins, D-HOP-41 (3)) [PGT-28]:** an egg 100 ms into its fade when a pause applies → the fade completes, and `expired{timeout}` fires once within 200 ms. During the fade the egg has computed opacity per the R18 fade (not 0.6), **0** pause badge elements, **no** on-hold `aria-describedby`; a pointer tap and an Enter at +150 ms and +250 ms show **no** bubble, collect nothing (coins, Basket, `frenzyRemainingS`, `evRngState` unchanged) and fire 0 `collectible_collected`. After the fade the egg element is gone, and the next R3 gap is drawn and frozen.
  - **Same-tick input, pause tick (D-HOP-41 (2)) [PGT-26b/c]:** an egg at age 6.0 s; a pause and a pointer tap delivered in the **same tick** n → no collect, 0 `collectible_collected`, the bubble is shown, the egg is in the frozen style at age 6.0 s. A sale of k = 10 at base 150¢ on tick n during a running Frenzy credits ×1.
  - **Same-tick input, last-resume tick (D-HOP-41 (2)) [PGT-29]:** two workers paused; resume W1 → still frozen; resume W2 (the last) on tick m and tap the egg on tick m → collected exactly once on tick m with the normal reward and `collectible_collected` once; a sale on tick m during the resumed Frenzy credits ×2. Repeat with W2 lifted by Manage → same. "Resume W1 and pause W2 in the same tick" → still frozen (no unfrozen tick), the tap shows the bubble.
  - **Spawn tick:** the countdown would reach 0 on the pause tick → no spawn that tick. The spawn comes on the first unfrozen tick that reaches 0, i.e. 0.1 s after Resume.
  - **Resume tick:** given a countdown of 10.0 s and a Resume on tick m, then the countdown is 9.9 after tick m.
- **GE-AC43 (reload, offline, hidden, clock) [PGT-6/6b/6c/7/8/9/20]**
  - **Reload, no egg:** paused, no egg, countdown 80 → after reload the save has `paused: true` and `nextSpawnRemainingS` = 80, and it stays 80 for 120 s **after the welcome-back modal closes**. On Resume, the spawn comes at +80.0 s.
  - **Reload with an egg:** paused with an egg on screen → `collectible_expired{reason:"reload"}` fires once with no reward. The fresh gap g, the next `evRng` value per GE-AC33, is drawn and stays frozen at g until Resume.
  - **Reload during a Frenzy:** paused with Frenzy at 12 s → `frenzyRemainingS` = 12 after the modal closes and while still paused (1× prices). On Resume, ×2 runs for 12.0 s.
  - **Offline 2 h while paused:** no golden progress; the countdown and Frenzy are unchanged and still frozen after the modal closes; offline credit is never at Frenzy price (R24).
  - **Clock changes:** the wall clock +3 h and then −3 h while paused → the countdown, age and Frenzy are unchanged, with no catch-up on Resume.
  - **Hidden 40 s while paused:** unchanged, and still frozen on return.
  - **Flag off:** a save with `paused: true` loaded with `m4.flags.pause` = 0 is not frozen; the countdown drops 60.0 s in 60 s.
- **GE-AC44 (isolation and determinism) [PGT-13/17/18]**
  - Same seed with and without pauses → the gap/slot/reward sequence is identical (GE-AC33 reference); only the times shift. The customer sequence is byte-identical (GE-AC3).
  - With `m4.flags.pause` = 0, the traces equal the existing pins (GE-AC34 `f90d1678` for golden off; AC-P1 pin for pause off).
  - With the Pause flag at 1 and a never-pause bot → golden spawn times, slots and rewards, and the M5-on trace, are byte-identical to Pause flag 0.
  - The AC7 bots are byte-identical.
  - **One shared predicate (D-HOP-41 (8)/(9); HoE 21:55):** there is **one** pure `goldenFrozen(state)` function, and **every consumer** calls it: the build tick (countdown, egg age, Frenzy and ×2, tap handling, styles, bubble, telemetry) and the G5-P `pacing-x1-stack` driver, which imports the game's function. A unit test shows this, plus HoE's parity test on seeds 1–200.
  - **What the sim can't prove:** Econ's sim pays a caught egg at spawn (economy §12a A3), so the no-tap and no-×2-while-frozen behaviour is proven **only by PGT-26–37** in the build, not by the sim.
- **GE-AC45 (telemetry, Q7) [QA §2] [T-sub, pending HoE allowlist]**
  - **`golden_frozen_s`:** a session with two pauses of 30.0 s and 45.5 s (one of them overlapping a menu) gives `session_end.golden_frozen_s` = **75.5 ± 0.1**. A session with no pauses gives 0.
  - **`worker_paused` fields:** a pause with an egg visible and a Frenzy running gives `golden_on_screen` = true and `frenzy_active` = true; with neither, both are false.
  - **Unchanged fields:**
    - `interval_s` = the drawn gap;
    - `deferred_ms` excludes frozen time;
    - `reaction_ms` excludes frozen time (GE-AC40).
  - **Nothing fired while frozen:** 0 `collectible_expired` and 0 `frenzy_ended` events stamped inside a freeze, apart from the GE-AC42 fade case.
  - **No other new fields:** none of `pause_hold_ms`, `pause_floor_applied` or `golden_pause_hold_s` appears in the export.

## 4. Co-drafting items for PM Workers (Pause spec text; PMW's file, not edited here)
- **E14 rewrite (PMW's part; D-HOP-34 Q4, golden wins):** replace "Golden-egg Frenzy (×2 on all sales) is unaffected by Pause. It applies to manual sales while the Market Hand is benched" with:
  > While any hired worker is paused, the golden countdown, the on-screen egg age and the Frenzy are frozen (golden R5g). No ×2 applies, and the egg can't be collected: a tap shows the on-hold bubble (golden R5g i).

  The E14 Shout and lockout sub-bullets need re-reading under that: during a freeze, Frenzy is already ×1.
- **§10 / AC-P14:** record the D-HOP-33 fail and withdraw the "(f) accepted as documented variance (D-HOP-16)" text, since D-HOP-33 withdrew D-HOP-16(4). Set the gate to D-HOP-34's config: every profile **including slow**, seeds **1–200**, 8dc90e2b, lockout 45.
- **§12:** `worker_paused` adds `golden_on_screen` and `frenzy_active` (D-HOP-34 Q7).
- **§8:** note that the paused card carries **no** golden on-hold copy (Head of Art & UX 19:09). The on-hold bubble lives on the frozen egg and pill (golden R5g i).

## 5. Open items
| # | Owner | Item | Default until answered |
|---|---|---|---|
| ~~A-1~~ | Art | **CLOSED (Head of Art & UX 19:09):** distinct frozen style for the egg and the Frenzy pill (R5g b/c; GE-AC40, GE-AC41) | — |
| ~~A-2~~ | Art | **CLOSED (Head of Art & UX 19:09):** the on-hold bubble on tap or keyboard activation, plus `aria-describedby`; no card copy or banner (R5g i; GE-AC40b) | — |
| ~~A-3~~ | Art | **CLOSED (rev. 4, 20:45; Head of Art & UX 20:44; `art-ux/decisions.md` entry "A-3 asset badge-pause.svg delivered", stamped 20:46, ahead of the box clock at 20:45):** the asset is **`art-ux/assets/badge-pause.svg`** (18 px, CC0, in `LICENSES.md`; verified on disk, sha1 `683b29e030130af05e177acc36491f62d5ba2b89`). The bubble's colours and type weren't part of the delivery; they follow the studio tooltip tokens unless Art says otherwise | — |
| E-1 | Econ | **After-Resume wait (`tc_egg_pause_resume_floor_s`).** D-HOP-34 doesn't provide for one, so it is **removed** from the rules. QA Q9's residual remains: after Resume, a fresh spawn or the resumed Frenzy can still land on banked stock. Should a wait be added only if the (ii) re-run fails? | **None** (no wait, no column) |
| ~~E-2~~ | Econ | **CLOSED: PASS (D-HOP-2026-10-24-40, 21:54).** Econ FINAL, GPAUSE=2, 8dc90e2b, seeds 1–200, four profiles, lockout 45, resume wait 0: above +2.0% **0 of 14,400** seed-checkpoints and above +2.5% **0** (baseline 5 and 2); cross-check seeds 0–99 0 of 7,200, worst +1.35%; every gated mean ≤ 0.00%; premium Δ **0.0 pp on all 8 cells** (economy §12a: "The G1 active bots never pause and the idle comparator never pauses, so the freeze never triggers"); G1, premium and AC7 trace `19d4034d` unchanged. **Frenzy carried over after Resume** (R5g d, the frozen Frenzy continues) adds ≤ +0.43 pp, as D-HOP-40 records. Evidence of record: `product/research/v2-slices/economy.md` sha256 `fe24954d72074a218a66bd25659f4d26eae1be6e11ad3f4d3924eee505b934d9` (§12a/§13.2a), as cited by D-HOP-40 | — |
| ~~H-1~~ | HoE | **CLOSED (D-HOP-40 precondition 3, 21:56; D-HOP-41 (9)):** HoE approved the v0.6.2 allowlist (`session_end.golden_frozen_s`, focus-clock sim seconds rounded to 0.1 s; `worker_paused.golden_on_screen`, `frenzy_active`, sampled from the pre-pause state) and one pure `goldenFrozen(state)` shared by the build tick and the G5-P driver, with a parity test on seeds 1–200 | — |
| ~~P-1~~ | HoP / CEO | **CLOSED: approved as D-CEO-20261024-09 (21:55).** The M5.0 plan v0.3 is re-pinned on paper to both errata (replacing frozen 08b3af7a…). Appendix A and the cut are no longer needed. Merge conditions: HoQA's gate, AC-P14-CI on seeds 1–200, and the PGT tests | — |

## 6. Conflicts and inconsistencies
**Resolved by D-HOP-34:**
1. ~~Variant preference (PMW leaned (i); CEO preferred (ii))~~: **(ii) ruled.** Appendix A is not chosen.
2. ~~Trigger scope (PM rev. 1 excluded the Grader)~~: **any hired worker** (Q1). The rev. 1 "stock workers" set is withdrawn.
3. ~~Pause E14 vs R23 (×2 while benched)~~: **golden wins** (Q4), no ×2 while frozen. **The E14 rewrite is still PMW's part (§4), and open.**
4. ~~Tappable on-screen egg~~: untappable (Q3), read as **no collect** per Head of Art & UX 19:09 (a tap shows the on-hold bubble). **Confirmed by D-HOP-41 (1)** (still-open item 6, now closed).
5. ~~R8 "resumes when the welcome-back modal closes" vs a pause still active~~: it stays frozen (Q6); R8 expiry is unchanged.
6. ~~Seed and profile set for G5-P~~: seeds 1–200 and every profile including slow (D-HOP-34). The text update in Pause §10 and the QA plan's AC-P14-CI ("seeds 0–99") is PMW/HoQA's.
7. ~~rev. 1 resume floor and its clock mismatch with the sim-second lockout~~: the floor is removed (E-1), so the mismatch is moot.

**Still open:**
1. Pause spec §10 / AC-P14 still carry the withdrawn D-HOP-16(4) "(f) accepted variance" text and seeds 0–99 (PMW, §4).
2. Pause spec E14 rewrite (PMW, §4).
3. GE-AC29 / G1 states seeds 0–99. That is a separate gate (G1) from G5-P, so it's noted only: whether G1's re-run with Pause in the stack uses 1–200 is Econ's call (E-2).
4. E-1 residual risk (QA Q9). Art A-1 and A-2 are closed (19:09); A-3 is closed (rev. 4, `art-ux/assets/badge-pause.svg`).
5. **Departure from R6:** the frozen egg stays hit-testable and focusable (for the bubble), while R6's menu freeze is `pointer-events:none` and `inert`. This is intentional per Art 19:09, and R6 itself is unchanged.
6. ~~**D-HOP-34 Q3 wording vs Art 19:09.**~~ **CLOSED by D-HOP-2026-10-24-41 (1):** "'Can't be tapped' means the frozen egg stays a tap target and shows the on-hold bubble, but collects nothing, rolls no reward, starts no Frenzy and emits no collectible_collected. This matches Art's A-1/A-2." R5g (b) now says this directly.
7. **Economy slice hash moved after D-HOP-40.** On disk, `economy.md` now hashes sha256 `8137205c…` (mtime 22:00 CEST), not D-HOP-40's `fe24954d…`. That is probably Econ's D-HOP-41 item 10 (removing `tc_pause_golden_resume_wait_s` from §12a; that name no longer appears in the file), but I haven't confirmed it with Econ. This errata cites `fe24954d…` as the evidence of record.

## 7. PM note
D-HOP-34 settles the rules, so PM has no variant recommendation left to make. Rev. 1's recommendation of (ii) plus a 45 s floor is withdrawn for the floor part (E-1).

---

## Appendix A. Variant (i): Frenzy ×2 excludes stock banked during Pause. Not chosen (D-HOP-34)
Kept only as the CEO-logged fallback if (ii) fails G5-P (P-1). This is rev. 1 text, unchanged and not reviewed against D-HOP-34. Its AC numbers would need renumbering if it is ever used.
### A.1 Replacement text (paste into v1.3.3 instead of §1.1)

**Glossary: add:**
> - **Banked stock B (v1.3.3, D-HOP-33):** a count of eggs (an integer ≥ 0) that built up while a stock worker (Market Hand, Coop Hand, Hawker) was paused. Frenzy ×2 never applies to them (R24b).

**§3.5: insert new R24b after R24:**
> - **R24b Banked stock and Frenzy (v1.3.3, D-HOP-33).**
>   - (a) **Pause start:** when the first stock worker is paused (no stock worker was paused before), snapshot `pauseStockSnapshot` = coop + Basket eggs.
>   - (b) **While any stock worker is paused**, the live banked count is `B = max(0, stock − pauseStockSnapshot)`.
>     - A golden `eggs` reward granted during the pause, and eggs added by an offline settlement during the pause, raise the snapshot by the same amount. Workers do nothing offline, so that stock isn't banked by pausing.
>   - (c) **Pause end:** when the last stock worker resumes (Resume or Manage), freeze `pausedBankedEggs = B` and clear the snapshot. If another pause starts, take a new snapshot. At its end, add that pause's B to `pausedBankedEggs`.
>   - (d) **Every sale**, by player, worker or Basket stock, with or without Frenzy, sells banked eggs first. With k eggs sold and the banked count before the sale B′ (the live B during a pause, `pausedBankedEggs` after one), `k_b = min(k, B′)`. Afterwards `pausedBankedEggs −= k_b` (after a pause), or the live B falls with the stock (during one). So B drains at base price exactly like the G2 backlog.
>   - (e) **Frenzy credit (one rounding, X7 kept):** `sale_cents = round(base_cents × Π′ × (k + (tc_frenzy_price_mult − 1) × (k − k_b)))`, where Π′ = Π saleMultipliers **without** the Frenzy factor. With Frenzy off, or k_b = 0, this reduces to §4 #4 exactly.
>   - (f) `pausedBankedEggs` is capped at the current stock on every tick (stock can fall without a sale, e.g. a reset).
>   - (g) A hand-seller who sells as fast as stock arrives keeps B ≈ 0, so E14 (Frenzy on manual sales while benched) holds for them. Only the stockpile is excluded.
>   - (h) With `m4.flags.pause` = 0, B ≡ 0 and the snapshot is absent, so behaviour is byte-identical to v1.3.2.

**§4 #4: replace with:**
> `sale_cents = round(base_cents × Π′ × (k + (m − 1)(k − k_b)))`, with m = `tc_frenzy_price_mult` while a Frenzy is live (else 1), Π′ = [graderMult, (1 + s), ability factors], k_b per R24b.
>
> Check: k = 10, base 150¢, Grader 1.25, s = 0.28, k_b = 4 gives round(240 × 16) = **3,840¢**. With k_b = 0 it gives **4,800¢**, and with no Frenzy **2,400¢**.

**R22 / X7: append:** "except banked stock (R24b)".

**R26: append:**
> While a Frenzy is live and `pausedBankedEggs` > 0, the Sell / Sell all previews show the R24b value. The `2×` chip stays, and Art adds a "part at 1×" state (**Art to design and measure**). Otherwise the chip would show a price that isn't paid.

**R10a: add fields:**
> - `pauseStockSnapshot` (integer; present only while a stock worker is paused)
> - `pausedBankedEggs` (integer; present only when > 0)
>
> Both are optional with no SAVE_VERSION bump. Sanitiser: non-finite or negative → absent; floor to an integer; `pausedBankedEggs` capped at stock on load. **They must be saved, or a reload would clear B (an exploit).**

**§6: add E20–E23:**
> | E20 | Bank 800 eggs, resume, Frenzy | The first 800 eggs sold pay 1× |
> | E21 | Hand-selling during a Frenzy while benched with flat stock | Full ×2 (B ≈ 0) |
> | E22 | Golden `eggs` reward during a pause | Not banked (snapshot raised) |
> | E23 | Offline during a pause | Offline stock not banked |

**§8: `frenzy_ended` adds `banked_eggs_excluded` (count). `session_end` adds `frenzy_banked_excluded_cents` [T-sub, pending HoE sizing].** Proposed for the Pause spec (PMW): `worker_resumed` adds `banked_eggs`.

**§12 row 8:** as in (ii), but with R24b.

### A.2 Side effects (i)
- **Player feel:**
  - **The good:** Pause no longer costs golden eggs, honest hand-selling keeps its full ×2, and there's no farm-wide timer change. This answers PMW's objection.
  - **The cost:** the rule is invisible and hard to explain: "the first N eggs you sell after a break don't get Frenzy". The "2×" chip over-promises unless Art adds a new state (R26 amendment). A player who sees ×2 but gets less will read it as a bug.
  - It fails the "players can read it" test recorded for the CEO.
- **Telemetry:** `banked_eggs_excluded`, `frenzy_banked_excluded_cents`, and `worker_resumed.banked_eggs` (PMW). `frenzy_ended.extra_coins` becomes net of exclusions, and the KPI comparison with Economy's P1 curve shifts slightly.
- **Save field:** **two new optional fields** (`pauseStockSnapshot`, `pausedBankedEggs`).
  - Downgrade/upgrade: a pre-Pause build ignores them, and on re-upgrade they're capped at stock.
  - Flag off (E13): cleared on the next save.
- **G1 / AC7 harness:**
  - AC7 and the never-pause G1 stack stay byte-identical, as does flag-off `f90d1678`.
  - The sim needs per-sale banked accounting in `payout.ts` / `saleMultipliers()` plus `step()` stock tracking, which touches the hot sale path that every preview uses (HoE F1c). This is a bigger code change than (ii), so ask HoE to size it.
  - The G5-P driver must mirror it exactly. The egg schedule is unchanged between the arms, so the (b)/(f) comparisons stay paired by seed, which makes for cleaner variance than (ii).
- **Edge cases:**
  - Several stock workers paused at overlapping times (one snapshot per hold span).
  - Stock lost to a reset (cap, f).
  - The coop cap stops laying, so B stops growing.
  - A golden `eggs` reward arriving while B > 0 after the pause is not banked.
  - `fmtMoney` previews show a mixed price.
  - At huge values: `(2k − k_b)` adds no new overflow, because it is ≤ the existing ×2 factor. The sale path is float `round` today, so there's no BigInt rule to change.

### A.3 ACs (i) (rev. 1 numbering)
Shared ACs GE-AC37 and GE-AC38 (§3) are added as well.
- **GE-AC46 (banked count)**
  - Given F ≥ 10 and stock (coop + Basket) = 200, when the Market Hand is paused, the farm produces 900 eggs in 300 s and the player hand-sells 100, then at the resume `pausedBankedEggs` = 1000 − 200 = **800**.
  - Given a golden `eggs` reward of +570 during that pause, it is **230**.
  - A Grader-only pause leaves `pausedBankedEggs` absent.
- **GE-AC47 (Frenzy credit, exact integers)**
  - Given `pausedBankedEggs` = 4 and a live Frenzy, when a Market Hand sale of k = 10 (base 150¢, Grader 1.25, s = 0.28) is made, then it credits exactly **3,840¢**, `pausedBankedEggs` becomes absent (0), and that sale adds **1,440¢** to `frenzy_extra_cents`.
  - The next identical sale credits **4,800¢** (+2,400¢ extra).
  - With no Frenzy, a sale with k_b = 4 credits **2,400¢**, and `pausedBankedEggs` still drops by 4.
  - `frenzy_ended.banked_eggs_excluded` = 4.
- **GE-AC48 (during the pause, E14)**
  - Given the Market Hand paused, stock flat at the snapshot, and a Frenzy, when the player sells k = 10 by hand, then it credits **4,800¢** (k_b = 0).
  - Given stock 50 above the snapshot, a manual sale of k = 10 credits **2,400¢** (k_b = 10).
- **GE-AC49 (timer unchanged)**
  - Given the Market Hand paused for 600 s with `nextSpawnRemainingS` = 87, then the egg spawns at 87 ± 0.1 s of focus time (no hold).
  - An egg on screen at pause start behaves as in GE-AC5/6.
  - A gap drawn during the pause equals the GE-AC33 reference.
- **GE-AC50 (offline and reload)**
  - Given the Market Hand paused with the snapshot at 200 and stock 500 (B = 300), when the tab is hidden 600 s and the offline settlement adds 400 eggs, then B stays at 300 after the welcome-back modal closes (the snapshot is raised to 600).
  - A reload restores `pauseStockSnapshot` and `pausedBankedEggs` exactly.
  - Sanitiser: values of −1, NaN or 1e12 are handled per R10a (capped at stock).
  - With flag off: B ≡ 0, and the next save drops both fields.
- **GE-AC51 (isolation)**
  - With `m4.flags.pause` = 0, or with a never-pause bot, every sale credit and the M5-on golden trace are byte-identical to v1.3.2. AC7 and `f90d1678` are unchanged.
- **GE-AC52 (UI)**
  - Given a live Frenzy and `pausedBankedEggs` > 0, then the Sell all preview equals the R24b credit to the cent, and the chip shows Art's "part at 1×" state.

---


## Change log
- **2026-10-24 22:04 CEST, rev. 5 (D-HOP-41, HoQA TESTABLE WITH GAPS v0.3):**
  - (1) R5g (b): the frozen egg stays a tap target; a tap shows the bubble and collects nothing (no collect, no ×2). §6 still-open 6 closed by D-HOP-41 (1).
  - (2) R5g (e): the three-step tick order (toggles → `goldenFrozen()` → player input), worded like pause errata rev. 4 rule 11(g) (`735cb284…`). Pause tick = frozen, last-resume tick = unfrozen. New E22c; GE-AC42 adds both boundary ticks.
  - (3) New R5g (e2), R18 append, E22b, GE-AC42 fade clause: a fade already running when the freeze starts runs to the end, with no frozen style, no hint, no bubble and no collect.
  - (6) Header records D-HOP-40 PASS and D-CEO-20261024-09; E-2, H-1 and P-1 closed (Econ numbers as logged; Frenzy carry-over after Resume ≤ +0.43 pp).
  - (8) GE-AC44 and §2: one shared `goldenFrozen(state)` used by every consumer; the Econ sim pays a caught egg at spawn, so no-tap/no-×2 is proven only by PGT-26–37.
  - Non-blocking: label-in-name clause added to GE-AC40b.
  - §6 still-open 7 notes the economy slice hash drift. The frozen spec v1.3.2 `f6b3a05e…` is not edited. Status stays DRAFT.
- **2026-10-24 20:45 CEST, rev. 4 (A-3 closed):** the pause badge asset is `art-ux/assets/badge-pause.svg` (18 px, CC0, listed in `art-ux/assets/LICENSES.md`; verified on disk, sha1 `683b29e0…`). Cited in R5g (b) and the open-items table. No rule or AC changed. Still DRAFT pending Econ E-2 and the CEO change request.
- **2026-10-24 19:11 CEST, rev. 3 (Head of Art & UX 19:09):**
  - A-1 closed: frozen egg style (opacity 0.6, the 18 px pause badge, static ring, no bob or sparkle, reduced motion identical) and Frenzy pill (the pause glyph replaces ×2, static, opacity 0.6, `2×` chip badges hidden). The menu-freeze placeholder is removed.
  - A-2 closed: the on-hold bubble "On hold while a worker is paused" (8 px above, 1.6 s, fade ≤ 200 ms; keyboard too), plus `aria-describedby`; no card copy or banner.
  - "Untappable" now means no collect, not no hit target.
  - GE-AC40 rewritten, GE-AC40b added, GE-AC41 pill clauses updated; A-3 opened (non-blocking). Still DRAFT.
- **2026-10-24 19:08 CEST, rev. 2 (D-HOP-2026-10-24-34; QA delta v0.1):**
  - R5g rewritten. The freeze holds while **any** hired worker is paused (the Grader exclusion is dropped), and covers the countdown, the egg age and Frenzy. There is no ×2 while frozen, and the egg is untappable.
  - QA's tick order and reload/offline rules are adopted, and R8 expiry is unchanged.
  - Telemetry is cut to `session_end.golden_frozen_s` plus `worker_paused.golden_on_screen` and `frenzy_active`.
  - GE-AC37–45 rewritten, with QA PGT mapping.
  - The 45 s resume floor and `tc_egg_pause_resume_floor_s` are removed (open item E-1, default none).
  - Variant (i) moved to Appendix A, not chosen.
  - Art A-1 and A-2 opened; conflicts updated. Still DRAFT, not a new version.
- 2026-10-24 19:05 CEST, rev. 1: DRAFT created (PM Collection) per D-HOP-33, with both variants. Paper only; nothing sent.
