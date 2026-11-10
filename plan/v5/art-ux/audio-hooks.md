# Audio hooks v1 (2026-10-16), Audio & Juice Designer — current v1.5 (2026-10-30)
Status: v1.2 (can't-afford **signed off by Head of Art & UX 2026-10-16**), v1.1 **signed off by Head of Art & UX 2026-10-16**; ships to Engineering behind a feature flag; listening check in the first build that has it (Player + Game Critic). Files in `art-ux/assets/sfx/` (use `.ogg`, fall back to `.mp3` where `canPlayType('audio/ogg; codecs=vorbis')` is empty, i.e. Safari/iOS). Legacy M1 sounds in `art-ux/assets/audio/` stay mapped where noted.

## Engine rules (Web Audio API)
- **Unlock:** create/resume one `AudioContext` on the first user gesture ("Tap to start", layout-spec §3.1). Nothing plays before it; events before unlock are dropped, not queued.
- Decode all hook files into `AudioBuffer`s at load (total ≈77 KB both formats; ≈38 KB one format).
- **Mute / volume:** Settings **"Sound"** toggle (layout-spec §5 Settings; never labelled "SFX") = master gain 0/1, persisted in save (`settings.sfx`, default **on**). Optional "Sound" volume slider 0–100 % maps to gain `(v/100)^2`. Muted = no `start()` calls at all. Toggle = label "Sound" + speaker icon that changes shape (speaker with waves = on, speaker with slash = off) + visible text "On"/"Off"; never colour only; `aria-pressed`, accessible name "Sound".
- **Voices:** max **4 simultaneous voices per source/event** (matches number-pop-spec 4-pop cap); a 5th steals the oldest of that event (5 ms fade). Global cap 8 voices; priority decides who is stolen.
- **Cooldown:** a trigger inside the cooldown is skipped (the visual still fires).
- **Pitch:** pick variant round-robin, never the same file twice in a row; additionally apply `playbackRate` random in the stated range (cents).
- **Sound is never the only signal:** every hook below has a visual (juice-spec.md / number-pop-spec.md). With sound off the game is fully playable.
- Pause all (ctx.suspend) on `visibilitychange` hidden; resume on visible.

## Event map
| Event | Files | Volume (gain) | Pitch | Cooldown | Max voices | Priority | Visual pair |
|---|---|---|---|---|---|---|---|
| `egg.tap` | sfx-tap-01/02/03 | 0.55 | ±25 cents on top of variant (±1 st) | **60 ms** (= pop merge window) | 4 | 3 (low) | juice §1, pop tap |
| `egg.collect` | sfx-collect-01/02/03 | 0.8 | ±15 cents | 120 ms | 4 | 2 | juice §2, pop collect |
| `market.sell` | sfx-sell-01/02/03 | 0.8 | ±15 cents | 100 ms (Sell-all = one sound) | 4 | 2 | juice §3, pop sell |
| `market.sell` big sale (>10× median sale, number-pop-spec) | sfx-sell-0x **+2 dB** (gain 1.0) + optional sparkle layer `sfx-sell-sparkle-01` (550 ms, gain 0.6, starts with sell), total ≤600 ms | 1.0 | ±15 cents | shares sell cooldown | 4 | 1 | pop sell 1.25× + glow |
| `upgrade.buy` | sfx-upgrade-01/02/03 | 0.8 | ±15 cents | 150 ms | 2 | 1 | layout-spec §4.5 buy anim |
| `milestone` (coop tier L5/10/20, goal reached) | sfx-milestone-01 | 0.9 | 0 | 2 s, once per milestone | 1 | 0 (highest; never stolen) | "Coop upgraded!" toast |
| `order.complete` (customer fully served) | sfx-order-complete-01/02/03 | 0.7 | ±15 cents | 200 ms | 2 | 2 | 'Thanks! +$X' hold (decisions 12:38) |
| `cant_afford` | sfx-cant-afford-01/02/03 | **0.5** | ±15 cents | **400 ms per button** (keyed by button id; other buttons not blocked) | 1 | 3 (low) | shake 4px ×3 / 240 ms + disabled state + "Need $X more" text: **always plays, even when the sound is in cooldown** |

No placeholders remain (v1.1). Legacy `assets/audio/sfx-*.mp3`: retire to `assets/audio/_retired/` (move, not delete) **only after Engineering confirms the switch: PENDING**; old `sfx-cant-afford.mp3` mapping retired (v1.2), file stays in place until Engineering confirms.
Measurements (duration, attack, LUFS, dBTP, size): `assets/audio/LICENSES.md` § Juice SFX v1.

## v1.3 additions (2026-10-16), signed off by Head of Art & UX 2026-10-16
B-1 note: the coop "⚠ Full!" badge (B-1) hints 'hire or refill Coop Hand'. Following the hint plays the normal `worker.hire` / `worker.refill` sound; the badge itself and its clearing have **no extra sound**.
All rows: muted Sound toggle = nothing plays (visuals unchanged); variants round-robin as above. Visual pairs refer to juice-spec.md §7–§9 and the UI/Visual Designer's specs.

| Event | Files | Gain | Pitch | Cooldown | Max voices | Priority | Visual pair |
|---|---|---|---|---|---|---|---|
| `track.levelup` (Hens / Egg value / Farm level bought, M4-A) | sfx-track-levelup-01/02/03 | 0.8 | ±15 cents | 150 ms | 2 | 1 | juice §7.1; **replaces `upgrade.buy` for track buys (never both)** |
| `track.milestone` (M4A-12 per-track milestone toast) | sfx-milestone-01 | 0.9 | 0 | 2 s | 1 | 0.5 | toast `Hens L{n}: …` / `Egg value L{n}: …` |
| `balanced.step` (tier k reached, k=1..4) | sfx-balanced-step-0k (file = k) | 0.85 | 0 (pitch is the ladder) | once per tier per save | 1 | 0.7 | toast `Balanced farm {k}/5: +{x}% income` + strip segment |
| `balanced.complete` (5/5) | sfx-balanced-complete-01 (760 ms) | 0.9 | 0 | once per save | 1 | **0 (top)** | toast + strip `Balanced farm 5/5 · +30%` |
| `worker.hire` | sfx-worker-hire-01/02/03 | 0.8 | ±15 cents | 300 ms | 1 | 1 | m2-workers-layout §4.3 flip + pop-in |
| `worker.refill` (any Manage, incl. Coop Hand, and Refill tired (N)) | sfx-worker-refill-01/02/03 | 0.75 | ±15 cents | one sound per action (Refill tired (N) = 1 sound, not per worker); shared 30 s game cooldown makes spam impossible | 1 | 1 | energy fill + sparkle (§4.2/§4.4) |
| `offline.collect` (Welcome back "Collect", or close/scrim, which also grants) | sfx-welcome-collect-01 | 0.85 | 0 | once per absence | 1 | 0.5 | juice §9 count-up |
| `offline.countup.tick` | sfx-countup-tick-01/02/03 | 0.3 | ±30 cents rising with progress (0 → +200 cents over the count) | **90 ms min gap** (max ~11 ticks/s), max 12 ticks per count-up | 1 | 3 | count-up digits (§9); no ticks after skip |
| tap during cooldown on Manage/Refill | sfx-cant-afford-0x | 0.5 | ±15 cents | 400 ms per button | 1 | 3 | shake (M1 disabled rule), always shown |

### Priority + ducking (reward bus)
Priority numbers: lower = higher priority. Reward-bus order: `balanced.complete` (0) > `track.milestone` / `milestone` / `offline.collect` (0.5) > `balanced.step` (0.7) > `track.levelup` / `upgrade.buy` / `worker.hire` / `worker.refill` (1).
1. **Same-action bundle:** one purchase can fire several events in one tick (e.g. Hens buy → level-up + milestone + Balanced 3/5). Collect them for **1 frame (≤17 ms)** and play **only the highest**; the rest are suppressed (their toasts/visuals still show).
2. **Window rule:** if a reward-bus sound of higher or equal priority started **<300 ms** ago, a new lower one is **suppressed**; 300–800 ms ago, it plays **ducked −8 dB**. A new higher one plays at full gain and ducks the one already playing by **−8 dB** (20 ms ramp) for its remainder; never cut off.
3. **Core loop under rewards:** while any P0/P0.5 sound plays, `egg.tap`/`egg.collect`/`market.sell` are ducked **−6 dB** (30 ms down, 150 ms back up). Ticks pause during `offline.collect` first 300 ms.
4. Never more than 2 reward-bus voices at once.
5. Toast queue (UI) is independent: sound follows the first toast shown; later queued toasts that appear >800 ms later get no sound unless P0.

## MK-63 / MK-62 coin-pill spend pops (2026-10-19)
No sound. Purchases keep their existing purchase sound; the wage floater is silent. Pop timing: see decisions.md 2026-10-19 10:35.

## v1.4 additions: M5.0 (2026-10-24) — **NOT WIRED: BUILD HOLD**
Spec: art-ux/m5-sound-spec.md v0.3 (product m5-golden-egg-spec v1.1, m5-streak-tap-coins-spec v1.1, m5-broody-hen-spec v1.1). Files generated and measured (assets/audio/LICENSES.md § M5.0). Engineering must not wire until the hold lifts. Visual pairs: m4-timed-collectible.md, m5-broody-hen-art.md, m4-collect-streak.md / art-ux/m5-combo-tiers.md (not written yet). Sound On/Off + Sound volume are the only controls; muted = no `start()`; reduced motion does not change audio.

| Event | Files | Gain | Pitch | Cooldown / trigger | Max voices | Priority | Visual pair |
|---|---|---|---|---|---|---|---|
| `golden.spawn` | sfx-golden-spawn-01/02/03 | 0.6 | variants 0/+1/−1 st, ±15 cents | on the frame the egg becomes visible (after deferral); one egg at a time | 1 | 1 (attention: never suppressed, ducked only) | egg pop-in + bob |
| `golden.warn` | sfx-golden-warn-01 | 0.45 | 0 | once per egg at **focus age 27 s** (20 s visual warning is silent) | 1 | 1 (attention) | blink + time-left ring + "!" |
| golden expiry | — (silent) | | | | | | 300 ms fade |
| `golden.collect` (cash / eggs, eggs_cash uses cash) | sfx-golden-collect-cash-0x / -eggs-0x | 0.85 | ±15 cents | one grant per egg | 1 | 0.5 | reward pop-up + flyers |
| `frenzy.start` (golden roll = frenzy; replaces collect, same frame) | sfx-frenzy-start-01 | 0.9 | 0 | ≤1 per egg | 1 | 0.5 | `Frenzy! 2× price` + pill `2× 0:30` + 2× chips |
| `frenzy.end` | sfx-frenzy-end-01 | 0.5 | 0 | when focus-clock `frenzyRemainingS` hits 0 | 1 | 1 (attention) | pill fade + prices revert |
| `market.sell` during Frenzy | existing sfx-sell-0x | 0.8 | **+2 st** (rate ×1.122) ±15 cents | unchanged 100 ms | 4 | 2 | gold 2× chips/pops; **no sparkle layer** on normal sells; big-sale rule unchanged |
| `streak.counted_collect` (credited tap) | existing sfx-collect-01 | 0.8 (−3 dB after 60 s continuous at MAX) | **+tier st** (0–4), ±10 cents | 1/s max (credited-tap rate); uncounted taps play normal `egg.collect` | (shares egg.collect 4) | 2 | meter + `+N% price` + tap-coin pop |
| `streak.tier` k=1..3 | sfx-streak-tier-0k | 0.6 | 0 (the file is the ladder step) | on crossing up only; hysteresis (product §3.3) + ≥2 s apart; **replaces** that tap's collect | 1 (streak voices ≤1) | 0.8 | tier pop-up copy + tick lit |
| `streak.max` | sfx-streak-max-01 | 0.65 | 0 | once per climb; replaces that tap's collect | 1 | 0.8 | `MAX +28%!` + gold meter |
| `streak.cool` | sfx-streak-cool-01 | 0.35 | 0 | once when decay starts (focus clock), only if tier ≥2 reached; silent at 0, clamp, reload/offline | 1 | 3 | striped muted cooling meter |
| `broody.ready` | sfx-broody-ready-01 | 0.35 | 0 | once per ready episode (brooding → ready); never on `full`, never repeated, **not on load / `restored:true`**; skipped (no retry) if a rank ≤1 sound is playing | 1 | 1.5 | glow + live-region line + first-ready toast |
| `broody.collect` | sfx-broody-collect-01/02/03 | 0.75 | ±15 cents | one payout per episode | 1 | 1 | popup `+$X` + nest empties |
| `coop.flutter` (B2) | — **not in M5.0** (M5.1, broody spec R14c) | | | | | | |

| `ability.call` (= flows §7 `ability.fire`, per call on `ability_used`; `ability.fireAll` plays it **once**, not N times) — **NOT WIRED: BUILD HOLD** | sfx-ability-call-01 Rush / -02 Sweep / -03 Shout / -04 Inspect (fixed per call, no rotation; Activate-all uses the first fired card's file) | 0.6 | ±15 cents | one per activation | 1 | 1 (P1, like `upgrade.buy`); ducked under rank ≤0.5 | icon pop 1→1.15→1 / 200 ms + 6-dot sparkle (flows §7); never the only signal; muted = no `start()` |

### Priority ladder (v1.4; lower = higher)
`balanced.complete` 0 → `golden.collect` / `frenzy.start` / `milestone` / `track.milestone` / `offline.collect` 0.5 → `balanced.step` 0.7 → `streak.tier` / `streak.max` 0.8 → P1 (`track.levelup`, `upgrade.buy`, `worker.hire`, `worker.refill`, `broody.collect`, v1.5 `ability.call`) 1 → attention (`golden.spawn`, `golden.warn`, `frenzy.end`) 1, never suppressed, ducked −6 dB under rank ≤0.5 → `broody.ready` 1.5 → core loop (tap, collect incl. streak pitch, sell) 2–3 → `streak.cool` 3. v1.3 rules unchanged: same-frame bundle plays only the highest; lower suppressed <300 ms after a higher/equal one, ducked −8 dB at 300–800 ms; core loop −6 dB under rank ≤0.5; ≤2 reward-bus voices. No loops in M5.0.

### Pause / resume with the focus clock (v1.1 timers)
Streak hold/decay, Frenzy and ability timers (and the golden-egg age) **freeze while a menu (any `dialogOpen()` modal/sheet/explainer/coach mark) is open or the tab is hidden**, and resume together.
1. **Timer-scheduled cues follow the timer, not wall-clock:** `golden.warn` (focus age 27 s), `frenzy.end` (focus remaining 0), `streak.cool` (decay start after the 3 s focus hold), tier timing (s only changes on the focus clock). While frozen they **pause**; on resume they fire when the timer reaches their point, **shifted by the paused duration**; never restarted, never fired early, never fired twice, and never fired on the freeze itself.
2. **One-shots already playing finish naturally** (no cut, no pause of the buffer). Hidden tab: AudioContext suspend (v1.3) — a sound cut by the suspend is not replayed.
3. Cues that would land while frozen are not queued for wall-clock; they fire at the matching focus-clock moment after resume. Exception: `broody.ready` whose transition is only *marked* at resume (spec v1.1 R5 eligibility) plays once at that moment if not on load/`restored:true`.
4. Event-driven sounds triggered by player taps can't occur while frozen (menus block input). Worker sales during a freeze play nothing new (sell sounds are player-action only).
5. Engineering hook: schedule M5 timer cues from the game's focus-clock tick (e.g. check `age >= 27 && !warned`), not `setTimeout`.

## Changelog
- **v1.5 (2026-10-30), Audio & Juice Designer:** added `ability.call` (worker call activated: Rush, Sweep, Shout, Inspect) → `sfx-ability-call-01..04`, gain 0.6, ±15 cents, one per activation (Activate-all = once), 1 voice, P1 rank 1, ducked under rank ≤0.5, never the only signal, mute respected. **NOT WIRED: BUILD HOLD.** Ability timers already follow the focus-clock pause rules above; `ability.end` / `endEarly` / `ready` stay silent, `ability.blocked` reuses `cant_afford`, `abilities.unlocked` reuses `milestone` (flows §7). Measurements: assets/audio/LICENSES.md § M5 abilities. Awaiting Head of Art & UX sign-off.
- v1.4 (2026-10-24): M5.0 set (golden egg, Frenzy, streak, Broody Hen).
