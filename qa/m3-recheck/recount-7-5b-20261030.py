#!/usr/bin/env python3
# [UI QA group A, 2026-10-30 15:1x CET, HoQ 14:58 item 4] bottom-up Chromium/WebKit minutes for #7 abilities (Q-AB-N1..N19) and #5b sales-stopped
# (SS-37..SS-49 + SS-23f/SS-17 extras) from the measured rates in meas-20261030/RESULTS.md (3908dc28). Pure arithmetic; prints a markdown table.
CELL = {'cr': 0.730, 'wk': 0.878}           # measured median load+shot+check+axe per cell (RESULTS.md, UI1 proxy)
CELL_HIGH = 1.9 + 0.08                       # high: old measured r_load with DOM/rect checks (dryrun-m5-streak) + measured axe
RUNFOR = {'cr': 80.605 / 240, 'wk': 148.344 / 240}   # wall s per sim s (measured runFor(240000))
STEP = 0.1; INV = 2.0                        # A8 in-page state step 0.1 s (assumed); r_inv 2 s (measured, pause steps.tsv)
R7 = [('Q-AB-N1..N3 names/aria-label/DOM order (4 calls x ~8 states + 3 Activate-all, x 3 sizes)', 99, 0, 12, 0, 3),
      ('Q-AB-N4 fit set 0:30..0:01 (30 values x 4 roles x 4 configs)', 4, 480, 0, 0, 2),
      ('Q-AB-N5 disabled Activate-all (2 states x 3 widths, 1 s tick)', 6, 0, 3, 0, 1),
      ('Q-AB-N6 only timer (t 0/15/29 x 3 widths)', 9, 0, 87, 0, 1),
      ('Q-AB-N7 Shift sheet = menu (20 s x 3 widths; BLOCKED-ON-BUILD #86, planned)', 3, 0, 60, 0, 1),
      ('Q-AB-N8 Shift sheet closing (3 widths)', 3, 0, 0, 0, 0),
      ('Q-AB-N9 Boost flag gate (4 configs x 3 widths; 30 s call in (1,0)/(0,1))', 12, 0, 180, 0, 4),
      ('Q-AB-N10 Boost event + auto-close', 3, 0, 3, 0, 1),
      ('Q-AB-N11 combo paths (~5 paths x 3 widths, 45 s boost)', 15, 0, 675, 0, 1),
      ('Q-AB-N12 Boost name + focus (8 states x 3 widths)', 24, 0, 0, 0, 1),
      ('Q-AB-N13 combo boundary 9900/10000/10001/10050 ms x 3 widths (window + 30/45 s)', 12, 0, 660, 0, 1),
      ('Q-AB-N14 resting Paused slot', 6, 0, 30, 0, 1),
      ('Q-AB-N15 combo-eligible name + expiry', 6, 0, 30, 0, 1),
      ('Q-AB-N16 one sheetclosecomplete per close (5 sizes x 4 close kinds, 0.5 s animation)', 20, 0, 0, 10, 1),
      ('Q-AB-N17 auto refill no combo (3 deltas + control)', 4, 0, 150, 0, 1),
      ('Q-AB-N18 card call after manual refill (2 deltas + control, 2 widths)', 8, 0, 300, 0, 1),
      ('Q-AB-N19 AB-UI-15 row layout (3 widths x ~6 chip states)', 18, 0, 0, 0, 1)]
R5 = [('SS-37 golden-egg reach (6 vps x popover open/closed x flag on/off)', 24, 0, 0, 0, 2),
      ('SS-38a threshold DOM (6 heights x shown/hidden; 5 s hold)', 12, 0, 30, 0, 1),
      ('SS-38b breakpoint constant / rAF / rotate', 6, 0, 0, 0, 1),
      ('SS-38c resize mid-cue (4 legs x open-chip/open-Manage/closed)', 12, 0, 0, 18, 1),
      ('SS-38e viewport_h bucket (6 fresh sessions)', 6, 0, 0, 0, 1),
      ('SS-38f wide height-only (4 vps x popover closed/open + flag-off spots)', 12, 0, 0, 0, 1),
      ('SS-39 / SS-39a icon-only state + chip name', 12, 0, 0, 0, 1),
      ('SS-40a popover open (2 vps x 4 inputs)', 8, 0, 0, 0, 1),
      ('SS-40c dismissal (6 paths; idle 10 + 60 s fake clock, 10 s real)', 6, 0, 72, 10, 1),
      ('SS-40p1..p3 pass-through (golden x3 spots x2 inputs + control; buy; Sell all)', 20, 0, 0, 0, 3),
      ('SS-40d / SS-40e Manage + reduced motion', 4, 0, 0, 0, 1),
      ('SS-41 top bar (2 vps x shown/hidden)', 4, 0, 0, 0, 1),
      ('SS-42 / SS-42r variant taps (21 taps) + tap after resize (4 legs)', 25, 0, 0, 4, 2),
      ('SS-RATE / SS-TEL (6 fixtures; Rule 2 show/clear at 2 vps)', 8, 0, 14, 0, 2),
      ('SS-23f (a)(b)(c) slot rects (2 builds x 6 vps; 5 vps x 6 states; 3 vps x 6 states + flag-off)', 78, 0, 80, 0, 4),
      ('SS-17 extra shots (9 labels x 7 vps) + SS-17b (4 vps x 2)', 71, 0, 0, 0, 2),
      ('SS-47 / SS-48 / SS-49 stall-during-cue, Manage target, once per episode', 13, 0, 42, 0, 3)]
R9 = [('#9 BB-N8 BBv2 rows at 2 zero-gain states x 3 sizes (inside zg-on loads)', 6, 0, 0, 0, 3),
      ('#9 NEW HoQ 14:58: flagoff snapshots on zg-on + zg-on-bb0 (A9: ~12 fixtures x 3 sizes x 2 variants, 2 tabs each)', 72, 144, 0, 0, 6)]
R12 = [('#12 BB-B1 (a) $37,300 first frame', 1, 0, 0, 0, 1),
       ('#12 BB-B1 (b) $3,000 runFor(240000), RC dist + build:qa', 2, 0, 480, 0, 2),
       ('#12 BB-B2 FX-TIE', 1, 0, 0, 0, 1),
       ('#12 BB-B3 dead zone (frame 0, HoQ 14:20: no runFor)', 1, 0, 0, 0, 1),
       ('#12 BB-B4 B1-10 / F4-19 re-runs flag-on', 26, 0, 0, 0, 1),
       ('#12 BB-B5 BBV2-UI1 Cr share 15 shots (+1 star-move state each; L17-3000 Hens star at sim 10.1 s x 3 sizes)', 30, 0, 30, 0, 3)]
def mins(r, eng, high=False):
    _, cells, steps, sim, real, inv = r; c = CELL_HIGH if high else CELL[eng]
    return (cells * c + steps * STEP + sim * RUNFOR[eng] + real + inv * INV) / 60
def runfor_share(r, eng): return r[3] * RUNFOR[eng] / 60
# WK high: cells at CELL_HIGH x 1.2 (measured WK/Cr per cell) - reported in the doc, not computed per row
out = []
G = {'cr': 0, 'wk': 0, 'hi': 0}
for card, rows, hoqa in [('#7 abilities', R7, 27), ('#5b salesStopped', R5, 30), ('#9 BBv2 runs', R9, 3), ('#12 BBv2', R12, 18)]:
    out.append(f'\n### {card} (HoQA v2/v3: +{hoqa} Cr min)\n| row | cells | in-page steps | sim s (runFor) | real s | probe inv | Cr min | WK min |\n|---|---|---|---|---|---|---|---|')
    tc = tw = th = rf = 0
    for r in rows:
        c, w, h = mins(r, 'cr'), mins(r, 'wk'), mins(r, 'cr', True); tc += c; tw += w; th += h; rf += runfor_share(r, 'cr')
        out.append(f'| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} | {c:.2f} | {w:.2f} |')
    out.append(f'| **{card} total** | | | | | | **{tc:.1f}** (high {th:.1f}) | **{tw:.1f}** |')
    out.append(f'\nrunFor share of the Cr total: {rf:.1f} min ({100 * rf / tc:.0f} %). WK/Cr on this card: {tw / tc:.2f}x.')
    G['cr'] += tc; G['wk'] += tw; G['hi'] += th
    print(f'TOTAL {card} cr={tc:.2f} high={th:.2f} wk={tw:.2f} runfor_cr={rf:.2f}')
out.append(f"\n**All v2 additions (#7 + #5b + #9 + #12): Cr {G['cr']:.1f} min (high {G['hi']:.1f}), WK {G['wk']:.1f} min, lane B Cr+WK {G['cr'] + G['wk']:.1f} min = {(G['cr'] + G['wk']) / 60:.2f} h** (HoQA v3: Cr 63.1 + WK 77.6 = 140.7 min).")
print('GRAND', {k: round(v, 1) for k, v in G.items()})
open('recount-7-5b-20261030.table.md', 'w').write('\n'.join(out) + '\n')
