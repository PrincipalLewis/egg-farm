# M5.0 sound spec: golden egg, streak tiers, Broody Hen · v0.3 · 2026-10-24 · Audio & Juice Designer
**Status:** v0.3 (2026-10-24 16:49): M5.0 sound set is a **merge gate**; audio files are **generated** (§6, measured in assets/audio/LICENSES.md) but **not wired: build hold** (no game code). Numbers based on product **m5-broody-hen-spec v1.1** and **m5-streak-tap-coins-spec v1.1** / m5-golden-egg-spec v1.1 (focus clock: streak, Frenzy and ability timers freeze in menus and while hidden; audio pause/resume rule in audio-hooks v1.4). Streak visual ladder art-ux/m5-combo-tiers.md **does not exist yet**: not aligned, re-check when written. **Changelog v0.3 (2026-10-24 16:51):** attack targets set to the measured values (audio kept as is): all attacks < 16.7 ms (1 frame at 60 fps), so 'feedback starts within 1 frame' is met; softer starts on spawn, cool and tier stings are intended. v0.2 applied the 2026-10-24 rulings of Head of Art & UX (1–5) and Head of Product (6–7); see §9.
**Sources:** product/collection/m5-golden-egg-spec.md v1.1 (R6, R18, R21–R26), product/collection/m5-streak-tap-coins-spec.md v1.1 (R7, R10, R12, §3.3, R16) (§3.3 tiers, R16, ST-AC9/10), **product/collection/m5-broody-hen-spec.md v1.1**, art-ux/m5-broody-hen-art.md (§ sound, call 4), product/m5-interaction-plan.md #5, art-ux/m4-timed-collectible.md (§3 states, §4 reduced motion, §6 hooks), art-ux/m4-collect-streak.md (U-S1, U-S3), **art-ux/m5-combo-tiers.md (visual tier ladder, to come)**, audio-hooks.md v1.3, juice-spec.md v1.1, number-pop-spec.md v1.0. queue.md/decisions.md checked: relevant are the Head's 2026-10-24 16:12 golden-egg entry and the M4 streak/frenzy UI decisions (2026-10-16 13:03–13:11).
**Visuals** are owned by the UI/Visual Designer and Head of Art & UX; this file only pairs sound to them.

## 0. Shared rules (all M5 sounds)
- **Pipeline:** `art-ux/tools/gen_juice_sfx.py` → `tools/measure_sfx.py`, CC0 in-house, logged in `assets/audio/LICENSES.md` + `licenses/CC0-sfx-juice-v1.md`; files in `assets/sfx/` as `.ogg` + `.mp3`.
- **Limits:** every sound ≤600 ms (no loops, no exceptions in M5.0), ≈−16 LUFS (10× loop method), ≤−1 dBTP, <30 KB per file. Gains are hook gains on top of the −16 LUFS master.
- **Controls:** the existing Settings **Sound** On/Off toggle and Sound volume are the **only** controls (no extra setting). Muted = no `start()`.
- **Engine:** as audio-hooks v1.3 (first-tap unlock, decoded buffers, per-event cooldown, voice caps, round-robin + small random cents).
- **Never sound-only:** each sound pairs with a visual and/or text listed in its row.
- **Reduced motion does not change audio**; it changes visuals only (answers m5-streak R16's open line).

## 1. Golden egg (spawn, warning, collect) and Frenzy
| Hook | Purpose | Character / timbre | Length | Attack | Variants / pitch | Gain | Cooldown / voices | Ladder rank | Paired visual / text |
|---|---|---|---|---|---|---|---|---|---|
| `golden.spawn` → `sfx-golden-spawn-01..03` | "Something shiny landed" | soft glassy two-note glint (E6→B6), bell partials, airy tail | 400 ms | 4.6–11.0 ms (soft start, intended) | 3 (0 / +1 / −1 st) | 0.6 | one egg at a time (R4); 1 voice; plays on the frame the egg becomes **visible** (after any R15 deferral), never under a scrim | 1 (attention; never suppressed, ducked −6 dB under rank ≤0.5) | pop-in + idle bob (m4-timed-collectible §3); keyboard focusable |
| (20 s warning state) | — | **silent** (confirmed ruling 5) | — | — | — | — | — | — | faster bob + "!" badge + pulse ring (reduced motion: dashed ring + "!") |
| `golden.warn` → `sfx-golden-warn-01` | "Last 3 s" (R21) | gentle falling two-note (B5→G5), muted | 300 ms | 4.1–4.3 ms | 1, no rotation | 0.45 | **once per egg at 27 s**; 1 voice | 1 | urgent: blink + depleting time-left ring + "!" (reduced motion: thin outline + "!") |
| expiry | — | **silent** (R21, m4 §6) | — | — | — | — | — | — | 300 ms fade |
| `golden.collect` → `sfx-golden-collect-{cash,eggs}-01..03` | reward grab; tail tells the type | 0–80 ms bright pop + tail: **cash** = coin ding pair; **eggs** = two bubbly bloops; **frenzy** = no collect, `frenzy.start` plays instead | cash 540 / eggs 520 ms | cash 2.0–4.9 ms / eggs 2.0–2.9 ms | 3 per tail (0 / +1 / −1 st) | 0.85 | one grant per egg (R20); 1 voice | **0.5** | pop-up `+$812.40!` / `+25 free eggs!` / `Frenzy! 2× price` (R25, Art §5) + flyers |
| `frenzy.start` → `sfx-frenzy-start-01` | Frenzy begins | rising 3-note rounded stab (G5–C6–E6, low-passed) + short glitter | 600 ms | 2.2–6.0 ms | 1 | 0.9 | ≤1 per golden egg; 1 voice | **0.5** | pop-up + HUD pill `2× 0:30` + gold 2× chips (Art §5, R26) |
| `frenzy.end` → `sfx-frenzy-end-01` | Frenzy over | soft two-note fall (E6→C6) | 330 ms | 4.3–5.1 ms | 1 | 0.5 | once per Frenzy; 1 voice | 1 | pill fades 200 ms; prices + chips revert within 1 tick |

**No Frenzy background loop in M5.0** (ruling 3): the 30 s is carried visually by the frenzy pill countdown and the 2× price chips.

**During Frenzy (core loop):**
- `market.sell`: same files at **+2 semitones** (playbackRate ×1.122), confirmed (ruling 6). **No extra sparkle layer on normal sells** (my call: it would be a stacked layer on the most frequent sound, against "no stacking"; the +2 st plus the gold 2× chips/pops are enough). The existing v1.3 big-sale rule is unchanged (big sale = +2 dB + `sfx-sell-sparkle-01` at 0.6; one sparkle max), so a big sale during Frenzy still sparkles once.
- `egg.tap`, `egg.collect`: unchanged by Frenzy (streak pitch §2 still applies).

**Focus clock (v1.1):** Frenzy runs on the focus clock (golden R23), so `frenzy.end` fires when the focus-clock remaining hits 0, never by wall-clock; the 27 s `golden.warn` is at focus age 27 s. See audio-hooks v1.4 pause/resume rule.

**Golden egg vs the v1.3 ladder:** golden collect and `frenzy.start` = rank **0.5** (milestone class). `balanced.complete` (0) beats them; versus milestone/track.milestone/offline.collect (equal rank) first come wins, later one suppressed <300 ms or ducked −8 dB at 300–800 ms. They beat `balanced.step` (0.7), streak stings (0.8) and P1 sounds. Core loop ducks −6 dB under them. **Bundle rule:** a golden tap that rolls Frenzy plays `frenzy.start` only, same frame.

## 2. Streak tier sound ladder (calm by default)
**Visual ladder:** art-ux/m5-combo-tiers.md (Head of Art & UX, to come). **Approved 1:1 mapping (ruling 1)** to product §3.3 tiers, thresholds `T_k = cap × k/4`:
| Tier | Threshold (cap 0.28) | Pop-up copy (product) | Counted-tap collect pitch | Tier-up sting |
|---|---|---|---|---|
| 0 | s < 7% | (meter only) | 0 st | — |
| 1 | +7% | `Warm streak! +7% price` | **+1 st** | `sfx-streak-tier-01` |
| 2 | +14% | `Hot streak! +14% price` | **+2 st** | `sfx-streak-tier-02` |
| 3 | +21% | `On fire! +21% price` | **+3 st** | `sfx-streak-tier-03` |
| 4 (MAX) | +28% | `MAX +28%!` | **+4 st (cap)** | `sfx-streak-max-01` (cap chime, U-S3) |

- **Calm by default (ruling 2):** soft timbre, rising pitch only, **no layers**. The only per-tap sound is the normal `egg.collect` (soft bloop, gain 0.8, 120 ms cooldown).
- **Pitch = the tap-coin tick (ruling 7):** on **counted taps only**, `egg.collect` plays at `playbackRate = 2^(tier/12)`; this pitched collect is the audible tap-coin/streak cue (no separate coin-tick file or hook). Uncounted taps (inside the 1 s window) play collect at base pitch. While s > 0 the ±1 st variant rotation is replaced by variant 01 ±10 cents so the climb reads clearly. Pitch follows the **current** tier (drops back silently as s decays below thresholds), never above +4 st.
- **Tier-up stings** (tiers 1–3): soft rising two-note glints on a pentatonic ladder (C6→D6, D6→E6, E6→G6), sine + light bell partial, 350 ms, 4.7–5.9 ms attack (soft start, intended), gain 0.6, 1 file each. **Cap chime** (tier 4): soft G6+C7 bell chord, 500 ms, 3.9–4.0 ms attack, gain 0.65. Rank **0.8** (below `balanced.step` 0.7, above P1 1). When a sting plays, the collect sound of that same tap is skipped (one sound per tap, never both).
- **Cool / break (soft, not punishing):** `sfx-streak-cool-01`: soft falling sine + breath (320 ms, 8.9 ms attack (soft start, intended), gain 0.35), once when decay starts, only if tier ≥ 2 was reached. Silent at 0, on clamp (K18) and on offline/reload reset (R11). Visual: striped muted cooling meter (U-S1).
- **Anti-fatigue (reworked for no layers):**
  1. Counted taps max 1/s, so the pitched collect is ≤1/s; uncounted collects keep base pitch and their 120 ms cooldown.
  2. One sound per tap: sting **replaces** that tap's collect; never collect + sting together; streak voices ≤1.
  3. Stings only on **crossing up**, once per tier per climb (product hysteresis) and ≥2 s apart; cap chime once per climb. Decay crossings are silent.
  4. Pitch ceiling +4 st; ±10 cents jitter so repeated taps at one tier don't sound identical.
  5. After **60 s continuously at MAX**, counted-tap collect gain −3 dB (pitch stays +4 st) until the streak breaks.
  6. Under rank ≤0.5 sounds (golden collect, Frenzy start, milestone) stings are suppressed/ducked per the v1.3 window rule; collect ducks −6 dB with the core loop.
  7. No loops anywhere in the streak.

## 3. Mute path and reduced motion
- **Mute (Sound Off) / volume 0:** no streak, golden, Frenzy or Broody sounds. All info stays visual + text: golden states (bob → "!" + ring → blink + time-left ring; reduced motion solid → dashed → thin + "!"), reward pop-up copy, Frenzy pill `2× m:ss` + 2× chips, streak meter + tier ticks + tier pop-up copy (m5-combo-tiers.md) + `+N% price` label + "MAX" + cooling stripes, tap-coin floaters, Broody glow. QA: run ST-AC9 and golden ACs with Sound Off; every state identifiable on screen and in aria-labels.
- **Reduced motion:** audio identical; visuals per m4-timed-collectible §4, m4-collect-streak U-S1 / m5-combo-tiers.md reduced motion, juice-spec §0. The tier copy, lit tick and "MAX" text carry the tier, so sound never becomes the only cue.
- (v0.1 "Calm sounds" reduced-audio setting removed, ruling 2.)

## 4. Broody Hen (final for M5.0, per product m5-broody-hen-spec v1.1 + art-ux/m5-broody-hen-art.md)
Behaviour (spec v1.1): unlocks at the first Coop Hand hire (R1); one broody hen at a time (R3); nest fills on the focus clock; `ready` at ≥ 50% of cap (≈75 focus s), `full` at cap; one tap pays (R12, `stopPropagation`, never a credited Collect tap); feedback = popup `+$61.88` + "soft cluck + coin" (R14); first-ready toast once per session (R14a).
| Hook | Character | Length | Attack | Gain | Cooldown / voices | Rank | Visual / text pair |
|---|---|---|---|---|---|---|---|
| glow (`ready`/`full`) | silent (ruling 4) | — | — | — | — | — | glow + wobble; reduced motion solid/double ring (art §3) |
| `broody.ready` → `sfx-broody-ready-01` | low warm "coo-cluck" (two soft formant chirps ~350/440 Hz, low-passed), no bell | **320 ms** (≤350) | 8.4 ms | **0.35** (golden spawn 0.6) | **once per ready episode** (brooding → ready transition), never repeated while she waits, not on `full`, **not on load/`restored:true`** (art call 4); if a rank ≤1 sound is playing, skip (no retry); also skipped if the transition happens while frozen (menu/hidden) and plays on resume only if still the same episode and <2 s late, else skip; 1 voice | 1.5 | glow starts + polite live-region "Broody hen ready, $X" (R11) + first-ready toast (R14a) |
| `broody.collect` → `sfx-broody-collect-01..03` | happy two-cluck + small coin ding | 450 ms | 2.9–4.3 ms | 0.75 | one payout per ready episode (R13); 1 voice; 3 variants 0/+1/−1 st | 1 (P1) | popup `+$X` (fmtMoneyShort) + nest empties + feather puff on full (art) |
| ~~`coop.flutter` (B2)~~ | **not in M5.0**: spec v1.1 R14c / out-of-scope list puts B2 in M5.1 (cosmetic, outside ACs). No file made. | | | | | | |
Never a credited tap, so a Broody tap never plays the streak-pitched collect.

## 5. Updated priority ladder (proposal for audio-hooks v1.4)
Lower = higher: `balanced.complete` 0 → golden collect / `frenzy.start` / milestone / track.milestone / offline.collect 0.5 → `balanced.step` 0.7 → streak sting / cap chime 0.8 → P1 (`track.levelup`, `upgrade.buy`, `worker.hire`, `worker.refill`, `broody.collect`) 1 → golden spawn / warn, `frenzy.end` 1 (attention: never suppressed, ducked only) → `broody.ready` 1.5 → core loop (tap, collect incl. streak pitch, sell) 2–3. (`coop.flutter` out of M5.0.) v1.3 rules otherwise unchanged.

## 6. File list (generated 2026-10-24, v0.3) and size
`sfx-golden-spawn-01..03`, `sfx-golden-warn-01`, `sfx-golden-collect-cash-01..03`, `sfx-golden-collect-eggs-01..03`, `sfx-frenzy-start-01`, `sfx-frenzy-end-01`, `sfx-streak-tier-01..03` (01/02/03 = tier 1/2/3 ladder, not pitch variants), `sfx-streak-max-01`, `sfx-streak-cool-01`, `sfx-broody-ready-01`, `sfx-broody-collect-01..03`. **21 sounds × 2 formats = 42 files, 201.6 KB total** (≈7 KB max per file). Dropped vs v0.2: `sfx-coop-flutter-01..03` (B2 is M5.1). Streak per-tier pitch uses the existing `sfx-collect-01` with playbackRate (no new file). Measurements: assets/audio/LICENSES.md § M5.0.

## 7. Size estimate (Audio & Juice Designer days)
| Work | Days |
|---|---|
| Synthesis: golden + Frenzy one-shots (0.6), streak stings + cap + cool (0.25), Broody ready/collect/flutter provisional (0.3) | 1.15 |
| Measurement + LICENSES/CC0 logging | 0.25 |
| Hooks: audio-hooks v1.4 + juice-spec section | 0.5 |
| Review: Head of Art & UX pass + one revision; listening notes on first M5 build | 0.5 |
| **Total** | **≈2.4 (range 2.25–2.75)**, was ≈2.75 in v0.1 (loop −0.25, layers −0.15, Broody ready cue +0.05). v0.3: synthesis + measurement done (≈1.2 d used); flutter dropped (−0.1). **Remaining ≈1 d**: hooks wiring review + listening notes when the hold lifts. |
Engineering effort (ducking, pitch per tier) not included.

## 8. Open questions
1. art-ux/m5-combo-tiers.md not written yet: check tier copy / reduced-motion visuals vs §2–§3 when it lands.
2. Streak spec v1.1 R16 still says "a light coin tick sound" per paying credited tap; per HoP ruling 7 the cue is the per-tier pitched collect (no coin-tick file). PM Collection to align R16 wording.

## 9. Resolved (2026-10-24)
| v0.1 Q | Ruling | By |
|---|---|---|
| 1 Streak 1:1 tiers, +1 st/tier cap +4 | Approved; visual ladder in art-ux/m5-combo-tiers.md | Head of Art & UX |
| 2 Calm sounds setting | No setting; streak calm by default (soft, pitch only, no layers); Sound volume + mute are the only controls | Head of Art & UX |
| 3 Frenzy bed | Dropped for M5.0; no 600 ms exception; pill + 2× chips carry it | Head of Art & UX |
| 4 Broody ready | Silent glow stays + one soft one-shot ready cue, once, quieter than golden spawn (§4: ≤350 ms, gain 0.35) | Head of Art & UX |
| 5 Golden warn timing | 20 s visual warning + single chime at 27 s | Head of Art & UX |
| 6 Frenzy sell pitch | +2 st confirmed; sparkle layer on normal sells **dropped** (no stacking); big-sale sparkle unchanged | Head of Product (+ my call on sparkle) |
| 7 Tap-coin tick | Folded in: the per-tier pitch on counted-tap collect is the cue; no separate hook | Head of Product |
| v0.2 Q1 Broody numbers / B2 | Final per broody spec v1.1: ready cue 320 ms gain 0.35 once per episode, not on load; collect 450 ms gain 0.75; B2 flutter out (M5.1, R14c) | spec v1.1 + art call 4 |
