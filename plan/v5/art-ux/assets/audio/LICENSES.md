# M1 SFX — sources & licenses (Art & UX, 2026-10-15)
All files were **procedurally synthesized in-house** with `art-ux/tools/gen_sfx.py` (numpy sine/square/noise + envelopes → ffmpeg libmp3lame, 96 kbps, 44.1 kHz mono, metadata stripped). No third-party samples, recordings or presets used; no money spent.
License: original work of Egg Farm Studio; dedicated **CC0 1.0** (public domain). No attribution required. Regenerate any file by running the script.

| File | Source | License |
|---|---|---|
| sfx-tap-start.mp3 | gen_sfx.py (C-E-G arpeggio) | CC0 1.0, in-house |
| sfx-collect-pop.mp3 | gen_sfx.py (rising pop + noise click) | CC0 1.0, in-house |
| sfx-coop-full.mp3 | gen_sfx.py (double beep) | CC0 1.0, in-house |
| sfx-sell-coin.mp3 | gen_sfx.py (two-tone coin) | CC0 1.0, in-house |
| sfx-customer-arrive.mp3 | gen_sfx.py (up chirp) | CC0 1.0, in-house |
| sfx-customer-leave.mp3 | gen_sfx.py (falling glide) | CC0 1.0, in-house |
| sfx-upgrade.mp3 | gen_sfx.py (arpeggio to high C) | CC0 1.0, in-house |
| sfx-cant-afford.mp3 | gen_sfx.py (low square bonk) | CC0 1.0, in-house |
| sfx-ui-open.mp3 | gen_sfx.py (up swoosh) | CC0 1.0, in-house |
| sfx-ui-close.mp3 | gen_sfx.py (down swoosh) | CC0 1.0, in-house |
| sfx-welcome-back.mp3 | gen_sfx.py (D-F#-A chime) | CC0 1.0, in-house |
| sfx-worker-yawn.mp3 | gen_sfx.py (rise-fall glide + vibrato + breath noise), added 2026-10-15 | CC0 1.0, in-house |

# Juice SFX v1 — assets/sfx/ (Audio & Juice Designer, 2026-10-16)
Files `art-ux/assets/sfx/sfx-{tap,collect,sell}-{01,02,03}.{ogg,mp3}` were **procedurally synthesized in-house** with `art-ux/tools/gen_juice_sfx.py` (numpy sines, inharmonic bell partials, filtered noise transients, exponential envelopes → static gain → ffmpeg libvorbis q3 / libmp3lame 64 kbps, 44.1 kHz mono, metadata stripped). No third-party samples, recordings, presets or paid tools. Licence: original work, **CC0 1.0**; proof/dedication: `art-ux/licenses/CC0-sfx-juice-v1.md`. Variants: 01 = base, 02 = +1 semitone, 03 = −1 semitone.
Edits: none beyond synthesis; static gain to ≈−16 LUFS (measured on 10× back-to-back loop because single files <400 ms read −inf integrated), true-peak ceiling −1.5 dBTP; no compression/limiting. Note: earlier files `assets/sfx/{tap,collect,sell}.{mp3,ogg}` (unknown source, unlogged) were already gone when I went to quarantine them at 19:32; not used.
Measurements (`python3 art-ux/tools/measure_sfx.py art-ux/assets/sfx/*`; "Container ms" for mp3 includes encoder padding, gapless decode = "Decoded ms"):

| File | Container ms | Decoded ms | Attack ms | LUFS (10x loop) | True peak dBTP | Size B |
|---|---|---|---|---|---|---|
| sfx-collect-01.mp3 | 496 | 450 | 3.5 | -16.4 | -4.3 | 4222 |
| sfx-collect-01.ogg | 450 | 447 | 4.0 | -15.9 | -3.8 | 5203 |
| sfx-collect-02.mp3 | 496 | 450 | 3.3 | -16.4 | -4.2 | 4222 |
| sfx-collect-02.ogg | 450 | 447 | 3.2 | -15.8 | -3.3 | 5206 |
| sfx-collect-03.mp3 | 496 | 450 | 2.9 | -16.4 | -4.0 | 4222 |
| sfx-collect-03.ogg | 450 | 447 | 3.8 | -15.9 | -3.3 | 5217 |
| sfx-sell-01.mp3 | 549 | 500 | 2.3 | -16.4 | -3.1 | 4640 |
| sfx-sell-01.ogg | 500 | 497 | 2.3 | -15.9 | -3.2 | 5751 |
| sfx-sell-02.mp3 | 549 | 500 | 2.1 | -16.4 | -3.4 | 4640 |
| sfx-sell-02.ogg | 500 | 497 | 5.4 | -16.0 | -3.2 | 5806 |
| sfx-sell-03.mp3 | 549 | 500 | 2.4 | -16.4 | -3.7 | 4640 |
| sfx-sell-03.ogg | 500 | 497 | 2.4 | -15.9 | -3.2 | 5734 |
| sfx-tap-01.mp3 | 157 | 120 | 2.1 | -16.5 | -2.9 | 1505 |
| sfx-tap-01.ogg | 120 | 117 | 2.1 | -15.8 | -1.9 | 4206 |
| sfx-tap-02.mp3 | 157 | 120 | 1.9 | -16.3 | -2.2 | 1505 |
| sfx-tap-02.ogg | 120 | 117 | 3.2 | -15.9 | -2.1 | 4245 |
| sfx-tap-03.mp3 | 157 | 120 | 2.2 | -16.4 | -2.5 | 1505 |
| sfx-tap-03.ogg | 120 | 117 | 2.7 | -15.9 | -1.7 | 4174 |

## Juice SFX v1.1 additions (2026-10-16, Audio & Juice Designer)
Same pipeline/licence as above (`gen_juice_sfx.py`, CC0 1.0, in-house, proof `art-ux/licenses/CC0-sfx-juice-v1.md`): `sfx-upgrade-{01..03}` (C-E-G-C arpeggio, 0/+1/−1 st), `sfx-order-complete-{01..03}` (E5→A5 two-note, 0/+1/−1 st), `sfx-milestone-01` (bell chord chime), `sfx-sell-sparkle-01` (7-ping glitter layer for big sale). Limits: ≤600 ms, ≈−16 LUFS, ≤−1 dBTP. All met. (milestone shortened 600→570 ms because vorbis decoded at 623 ms.)

| File | Container ms | Decoded ms | Attack ms | LUFS (10x loop) | True peak dBTP | Size B |
|---|---|---|---|---|---|---|
| sfx-milestone-01.mp3 | 601 | 570 | 5.3 | -16.5 | -4.3 | 5058 |
| sfx-milestone-01.ogg | 570 | 567 | 5.4 | -16.1 | -3.4 | 6803 |
| sfx-order-complete-01.mp3 | 444 | 400 | 2.7 | -16.4 | -4.7 | 3804 |
| sfx-order-complete-01.ogg | 400 | 397 | 2.7 | -15.9 | -3.9 | 5051 |
| sfx-order-complete-02.mp3 | 444 | 400 | 2.5 | -16.4 | -4.4 | 3804 |
| sfx-order-complete-02.ogg | 400 | 397 | 3.1 | -15.9 | -4.1 | 5085 |
| sfx-order-complete-03.mp3 | 444 | 400 | 3.4 | -16.4 | -4.4 | 3804 |
| sfx-order-complete-03.ogg | 400 | 397 | 2.9 | -15.9 | -4.0 | 5070 |
| sfx-sell-sparkle-01.mp3 | 601 | 550 | 2.2 | -16.4 | -6.5 | 5058 |
| sfx-sell-sparkle-01.ogg | 550 | 547 | 6.9 | -16.0 | -6.3 | 6326 |
| sfx-upgrade-01.mp3 | 601 | 550 | 3.4 | -16.5 | -5.0 | 5058 |
| sfx-upgrade-01.ogg | 550 | 547 | 4.1 | -16.0 | -4.3 | 5758 |
| sfx-upgrade-02.mp3 | 601 | 550 | 3.2 | -16.4 | -4.8 | 5058 |
| sfx-upgrade-02.ogg | 550 | 547 | 3.8 | -15.9 | -4.0 | 5795 |
| sfx-upgrade-03.mp3 | 601 | 550 | 3.6 | -16.4 | -4.5 | 5058 |
| sfx-upgrade-03.ogg | 550 | 547 | 3.7 | -15.9 | -4.1 | 5740 |

## Juice SFX v1.2: can't afford (2026-10-16, Audio & Juice Designer)
`sfx-cant-afford-{01..03}.{ogg,mp3}`: same pipeline/licence (`gen_juice_sfx.py` → `cant`, CC0 1.0 in-house, proof `art-ux/licenses/CC0-sfx-juice-v1.md`). Soft muted wood tock, gentle two-note dip A4→E4 (2nd note at 60 ms), 4 ms attack, 180 ms; variants 0/+1/−1 st. Limits ≤200 ms, ≈−16 LUFS, ≤−1 dBTP: met. Replaces M1 `assets/audio/sfx-cant-afford.mp3` mapping (old file not moved).

| File | Container ms | Decoded ms | Attack ms | LUFS (10x loop) | True peak dBTP | Size B |
|---|---|---|---|---|---|---|
| sfx-cant-afford-01.mp3 | 209 | 180 | 3.9 | -16.5 | -5.0 | 1923 |
| sfx-cant-afford-01.ogg | 180 | 177 | 3.9 | -15.9 | -4.5 | 4136 |
| sfx-cant-afford-02.mp3 | 209 | 180 | 4.6 | -16.4 | -5.0 | 1923 |
| sfx-cant-afford-02.ogg | 180 | 177 | 3.8 | -15.9 | -4.5 | 4089 |
| sfx-cant-afford-03.mp3 | 209 | 180 | 4.2 | -16.5 | -5.0 | 1923 |
| sfx-cant-afford-03.ogg | 180 | 177 | 4.2 | -15.9 | -4.5 | 4113 |

## Juice SFX v1.3: M4-A tracks, workers, welcome back (2026-10-16, Audio & Juice Designer)
Same pipeline/licence (`gen_juice_sfx.py`, CC0 1.0 in-house, proof `art-ux/licenses/CC0-sfx-juice-v1.md`). New: `sfx-track-levelup-01..03` (D-A-D rise, 0/+1/−1 st), `sfx-balanced-step-01..05` (root→fifth tick-up; file NN = step N/5 on a C-D-E-G-A ladder, so each step is one notch higher), `sfx-balanced-complete-01` (5/5 +30% celebration, 760 ms: uses the ≤800 ms celebration allowance because it is a once-per-save top-tier moment that plays with a 2.5 s toast), `sfx-worker-hire-01..03`, `sfx-worker-refill-01..03` (rising whoosh + sparkle; ~17 ms swell attack by design), `sfx-welcome-collect-01` (chord swell + bell, 570 ms; soft 10 ms swell attack by design; cut from 600 ms because vorbis decoded at 623 ms), `sfx-countup-tick-01..03` (45 ms). All ≤600 ms (except the 760 ms celebration), ≈−16 LUFS, ≤−1.4 dBTP, ≤7 KB.

| File | Container ms | Decoded ms | Attack ms | LUFS (10x loop) | True peak dBTP | Size B |
|---|---|---|---|---|---|---|
| sfx-balanced-complete-01.mp3 | 810 | 760 | 3.3 | -16.9 | -1.9 | 6730 |
| sfx-balanced-complete-01.ogg | 760 | 757 | 4.1 | -16.4 | -1.4 | 6952 |
| sfx-balanced-step-01.mp3 | 522 | 480 | 3.2 | -16.4 | -2.7 | 4431 |
| sfx-balanced-step-01.ogg | 480 | 477 | 4.3 | -15.9 | -2.4 | 5461 |
| sfx-balanced-step-02.mp3 | 522 | 480 | 2.8 | -16.4 | -3.6 | 4431 |
| sfx-balanced-step-02.ogg | 480 | 477 | 3.7 | -15.9 | -3.3 | 5407 |
| sfx-balanced-step-03.mp3 | 522 | 480 | 2.5 | -16.4 | -3.2 | 4431 |
| sfx-balanced-step-03.ogg | 480 | 477 | 2.5 | -15.9 | -3.0 | 5553 |
| sfx-balanced-step-04.mp3 | 522 | 480 | 2.1 | -16.4 | -3.5 | 4431 |
| sfx-balanced-step-04.ogg | 480 | 477 | 2.8 | -15.9 | -2.9 | 5358 |
| sfx-balanced-step-05.mp3 | 522 | 480 | 2.0 | -16.5 | -4.2 | 4431 |
| sfx-balanced-step-05.ogg | 480 | 477 | 2.5 | -16.0 | -3.9 | 5337 |
| sfx-countup-tick-01.mp3 | 78 | 45 | 1.0 | -16.3 | -4.4 | 878 |
| sfx-countup-tick-01.ogg | 45 | 42 | 1.2 | -15.7 | -4.5 | 3818 |
| sfx-countup-tick-02.mp3 | 78 | 45 | 1.1 | -16.5 | -5.3 | 878 |
| sfx-countup-tick-02.ogg | 45 | 42 | 1.5 | -15.7 | -5.2 | 3821 |
| sfx-countup-tick-03.mp3 | 78 | 45 | 1.3 | -16.3 | -4.7 | 878 |
| sfx-countup-tick-03.ogg | 45 | 42 | 1.0 | -15.6 | -4.1 | 3843 |
| sfx-track-levelup-01.mp3 | 470 | 420 | 1.9 | -16.5 | -4.3 | 4013 |
| sfx-track-levelup-01.ogg | 420 | 443 | 3.1 | -16.2 | -3.4 | 5421 |
| sfx-track-levelup-02.mp3 | 470 | 420 | 2.9 | -16.4 | -4.4 | 4013 |
| sfx-track-levelup-02.ogg | 420 | 417 | 1.9 | -15.9 | -3.3 | 5458 |
| sfx-track-levelup-03.mp3 | 470 | 420 | 2.0 | -16.4 | -4.1 | 4013 |
| sfx-track-levelup-03.ogg | 420 | 443 | 2.1 | -16.2 | -3.8 | 5487 |
| sfx-welcome-collect-01.mp3 | 601 | 570 | 10.5 | -16.5 | -2.6 | 5058 |
| sfx-welcome-collect-01.ogg | 570 | 567 | 10.5 | -16.0 | -2.3 | 5635 |
| sfx-worker-hire-01.mp3 | 549 | 500 | 3.7 | -16.4 | -4.2 | 4640 |
| sfx-worker-hire-01.ogg | 500 | 497 | 3.7 | -16.0 | -4.1 | 5163 |
| sfx-worker-hire-02.mp3 | 549 | 500 | 3.5 | -16.4 | -4.5 | 4640 |
| sfx-worker-hire-02.ogg | 500 | 497 | 3.5 | -16.1 | -4.1 | 5257 |
| sfx-worker-hire-03.mp3 | 549 | 500 | 3.9 | -16.4 | -4.0 | 4640 |
| sfx-worker-hire-03.ogg | 500 | 497 | 3.9 | -16.0 | -3.3 | 5361 |
| sfx-worker-refill-01.mp3 | 496 | 450 | 18.5 | -16.7 | -5.8 | 4222 |
| sfx-worker-refill-01.ogg | 450 | 447 | 18.3 | -16.2 | -5.4 | 6934 |
| sfx-worker-refill-02.mp3 | 496 | 450 | 19.2 | -16.6 | -5.6 | 4222 |
| sfx-worker-refill-02.ogg | 450 | 447 | 15.9 | -16.1 | -4.8 | 6776 |
| sfx-worker-refill-03.mp3 | 496 | 450 | 16.6 | -16.7 | -5.5 | 4222 |
| sfx-worker-refill-03.ogg | 450 | 447 | 18.5 | -16.2 | -5.0 | 6783 |

## M5.0 sound set (2026-10-24, Audio & Juice Designer), per art-ux/m5-sound-spec.md v0.3
Same pipeline and licence: **procedurally synthesized in-house** with `art-ux/tools/gen_juice_sfx.py` (numpy sines, bell partials, formant-ish chirps, filtered noise, envelopes → static gain → libvorbis q3 / libmp3lame 64 kbps, 44.1 kHz mono, metadata stripped). No samples, recordings, presets or paid tools. **CC0 1.0**, proof `art-ux/licenses/CC0-sfx-juice-v1.md`. Files: `sfx-golden-spawn-01..03`, `sfx-golden-warn-01`, `sfx-golden-collect-cash-01..03`, `sfx-golden-collect-eggs-01..03`, `sfx-frenzy-start-01`, `sfx-frenzy-end-01`, `sfx-streak-tier-01..03` (tier ladder 1–3), `sfx-streak-max-01`, `sfx-streak-cool-01`, `sfx-broody-ready-01`, `sfx-broody-collect-01..03` (.ogg + .mp3; variants 01/02/03 = 0/+1/−1 st unless noted). Edits: static gain to ≈−16 LUFS (10× loop), TP ceiling −1.5 dBTP; broody-ready shortened 340→320 ms and frenzy-end 350→330 ms because vorbis decoded long. **Not wired: build hold.**

| File | Container ms | Decoded ms | Attack ms | LUFS (10x loop) | True peak dBTP | Size B |
|---|---|---|---|---|---|---|
| sfx-broody-collect-01.mp3 | 496 | 450 | 3.0 | -16.5 | -4.3 | 4222 |
| sfx-broody-collect-01.ogg | 450 | 447 | 4.1 | -16.0 | -4.0 | 5439 |
| sfx-broody-collect-02.mp3 | 496 | 450 | 2.9 | -16.5 | -4.2 | 4222 |
| sfx-broody-collect-02.ogg | 450 | 447 | 4.3 | -16.0 | -3.8 | 5445 |
| sfx-broody-collect-03.mp3 | 496 | 450 | 3.2 | -16.5 | -4.2 | 4222 |
| sfx-broody-collect-03.ogg | 450 | 447 | 3.2 | -16.0 | -3.4 | 5441 |
| sfx-broody-ready-01.mp3 | 366 | 320 | 8.4 | -16.5 | -4.6 | 3177 |
| sfx-broody-ready-01.ogg | 320 | 317 | 8.4 | -16.0 | -3.9 | 4503 |
| sfx-frenzy-end-01.mp3 | 366 | 330 | 4.3 | -16.5 | -6.2 | 3177 |
| sfx-frenzy-end-01.ogg | 330 | 327 | 5.1 | -15.9 | -5.3 | 4824 |
| sfx-frenzy-start-01.mp3 | 627 | 600 | 2.2 | -16.4 | -6.9 | 5267 |
| sfx-frenzy-start-01.ogg | 600 | 597 | 6.0 | -15.9 | -5.7 | 6130 |
| sfx-golden-collect-cash-01.mp3 | 575 | 540 | 2.2 | -16.4 | -5.1 | 4849 |
| sfx-golden-collect-cash-01.ogg | 540 | 537 | 2.1 | -16.0 | -4.5 | 6020 |
| sfx-golden-collect-cash-02.mp3 | 575 | 540 | 2.0 | -16.5 | -5.9 | 4849 |
| sfx-golden-collect-cash-02.ogg | 540 | 537 | 4.9 | -16.0 | -5.7 | 6089 |
| sfx-golden-collect-cash-03.mp3 | 575 | 540 | 2.2 | -16.4 | -4.8 | 4849 |
| sfx-golden-collect-cash-03.ogg | 540 | 537 | 2.3 | -16.0 | -3.2 | 5904 |
| sfx-golden-collect-eggs-01.mp3 | 549 | 520 | 2.2 | -16.4 | -4.4 | 4640 |
| sfx-golden-collect-eggs-01.ogg | 520 | 517 | 2.2 | -16.0 | -4.1 | 5266 |
| sfx-golden-collect-eggs-02.mp3 | 549 | 520 | 2.0 | -16.4 | -4.2 | 4640 |
| sfx-golden-collect-eggs-02.ogg | 520 | 517 | 2.9 | -16.0 | -4.0 | 5260 |
| sfx-golden-collect-eggs-03.mp3 | 549 | 520 | 2.3 | -16.4 | -4.0 | 4640 |
| sfx-golden-collect-eggs-03.ogg | 520 | 517 | 2.4 | -16.1 | -3.6 | 5156 |
| sfx-golden-spawn-01.mp3 | 444 | 400 | 7.8 | -16.5 | -5.5 | 3804 |
| sfx-golden-spawn-01.ogg | 400 | 397 | 5.1 | -16.0 | -4.7 | 6922 |
| sfx-golden-spawn-02.mp3 | 444 | 400 | 4.8 | -16.4 | -5.9 | 3804 |
| sfx-golden-spawn-02.ogg | 400 | 397 | 7.3 | -16.0 | -5.8 | 6938 |
| sfx-golden-spawn-03.mp3 | 444 | 400 | 4.6 | -16.5 | -5.5 | 3804 |
| sfx-golden-spawn-03.ogg | 400 | 397 | 11.0 | -16.0 | -5.2 | 6994 |
| sfx-golden-warn-01.mp3 | 340 | 300 | 4.1 | -16.5 | -6.0 | 2968 |
| sfx-golden-warn-01.ogg | 300 | 297 | 4.3 | -16.0 | -5.5 | 4459 |
| sfx-streak-cool-01.mp3 | 366 | 320 | 8.9 | -16.4 | -2.3 | 3177 |
| sfx-streak-cool-01.ogg | 320 | 317 | 8.9 | -15.9 | -1.8 | 6189 |
| sfx-streak-max-01.mp3 | 549 | 500 | 3.9 | -16.4 | -5.7 | 4640 |
| sfx-streak-max-01.ogg | 500 | 497 | 4.0 | -16.0 | -5.0 | 5493 |
| sfx-streak-tier-01.mp3 | 392 | 350 | 5.9 | -16.5 | -5.5 | 3386 |
| sfx-streak-tier-01.ogg | 350 | 347 | 5.4 | -15.9 | -4.9 | 4538 |
| sfx-streak-tier-02.mp3 | 392 | 350 | 5.2 | -16.4 | -5.7 | 3386 |
| sfx-streak-tier-02.ogg | 350 | 347 | 5.2 | -15.9 | -5.3 | 4580 |
| sfx-streak-tier-03.mp3 | 392 | 350 | 4.7 | -16.5 | -6.3 | 3386 |
| sfx-streak-tier-03.ogg | 350 | 347 | 5.5 | -15.9 | -5.3 | 4852 |


## M5 abilities: worker call (2026-10-30, Audio & Juice Designer), per art-ux/m5-abilities-flows.md §7 (`ability.fire` / `ability.fireAll`)
Same pipeline and licence: **procedurally synthesized in-house** with `art-ux/tools/gen_ability_call_sfx.py` (imports `t/env/fade/note/wav/enc` from `art-ux/tools/gen_juice_sfx.py`; numpy sines with the milestone bell partials 1 / 2.76 / 5.4, one pitch glide, a tiny seeded noise click on -03 → static gain → libvorbis q3 / libmp3lame 64 kbps, 44.1 kHz mono, metadata stripped). No samples, recordings, presets or paid tools. **CC0 1.0**, proof `art-ux/licenses/CC0-sfx-juice-v1.md`. Author: Audio & Juice Designer (self-made). Source URL: n/a (generated in repo).
Files (.ogg + .mp3 fallback): `sfx-ability-call-01` Rush (quick upward G5-C6-E6, 35 ms steps, 340 ms), `-02` Sweep (bell glide C6→G6 over 90 ms + C7 tick + G6 glint, 360 ms), `-03` Shout (C6+E6 dyad struck together + C5 thump + click, 300 ms), `-04` Inspect (soft rising E6→G6 query, muted partials, 380 ms). Family = sfx-milestone-01 palette and partials, lighter: 1-3 notes, no C5 bed (except a 25 ms thump on -03), tails 340-380 ms vs 570 ms.
Edits: static gain to ≈−16 LUFS (10× loop), TP ceiling −1.5 dBTP; no compression/limiting. -03 sits at −16.4/−16.7 LUFS because the TP ceiling wins; its vorbis decodes 321 ms (container 300 ms), still ≤400 ms. **Not wired: build hold.**

| File | Container ms | Decoded ms | Attack ms | LUFS (10x loop) | True peak dBTP | Size B |
|---|---|---|---|---|---|---|
| sfx-ability-call-01.mp3 | 392 | 341 | 2.8 | -16.4 | -4.7 | 3386 |
| sfx-ability-call-01.ogg | 340 | 337 | 2.8 | -15.9 | -3.2 | 5113 |
| sfx-ability-call-02.mp3 | 392 | 360 | 4.9 | -16.4 | -3.8 | 3386 |
| sfx-ability-call-02.ogg | 360 | 357 | 2.1 | -16.0 | -3.8 | 4796 |
| sfx-ability-call-03.mp3 | 340 | 300 | 3.9 | -16.7 | -1.9 | 2968 |
| sfx-ability-call-03.ogg | 300 | 321 | 3.9 | -16.4 | -1.9 | 4949 |
| sfx-ability-call-04.mp3 | 418 | 380 | 4.6 | -16.5 | -6.4 | 3595 |
| sfx-ability-call-04.ogg | 380 | 377 | 5.0 | -16.0 | -6.0 | 4949 |

sha256:
```
3389ef4e97d4905f5f53c6ed8b88ba338f36beb19cacc11a26bc084de63f9046  assets/sfx/sfx-ability-call-01.mp3
c032ede8874dd8b64880c48e8cf0276d520805bc60b1a3b04fb43cb68022a9c2  assets/sfx/sfx-ability-call-01.ogg
cb9008df5b5ad03883e80451e88f8f153dcf89ca8d1db4484ab8d4804a9b6a46  assets/sfx/sfx-ability-call-02.mp3
d89bc67ab8fa3c64fe4177c6628ac1dbf233785b960e351043d5463f1e92eb5b  assets/sfx/sfx-ability-call-02.ogg
ef2f13848c77483be4cae3482e4ad19adf91db987832681ab175790a8c5cc5ee  assets/sfx/sfx-ability-call-03.mp3
394ffedbf9f180895f86ac5b824e1c9e0d55eb20662a68154dd100c340d6aac3  assets/sfx/sfx-ability-call-03.ogg
40d619121e585231bab8944889eba8c92e2c1e1871064308f0488cf8be2d5e6b  assets/sfx/sfx-ability-call-04.mp3
3d4c40a358a3af2925c634fc211554b114a9313d71c791f2b7fc46b7f44ac2d7  assets/sfx/sfx-ability-call-04.ogg
bbe3e3585bd9b992eb1e5b2c1dbb1121c7f9205dfb45ad916b491866562712fd  tools/gen_ability_call_sfx.py
```
