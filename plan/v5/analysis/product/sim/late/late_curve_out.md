# L30-50 candidate curves v7 (H/V rows to L55, HoP (a)) on v6 hand-tuned L41-50 (milestones x1.10/x1.15/x1.10/x1.15, H/V cap F+5 from L40, HoP P95 standard, final eval 100 seeds) (late_curve.py), 30 seeds, greedy buyer: g1 1.0438 (L30-40), g2 1.2906 (L41-50), +8% persistent step from buying L36/L41/L46, H/V beyond F+3 cost 0.15 x farm_cost[F] x (1 + 0.1 x (extra-1))

| level | farm_cost | hens_cost | egg_value_cost | farm_ms | min to reach (workers) | per-level min (workers) | min (no workers) | min (casual+workers) |
|---|---|---|---|---|---|---|---|---|
| 28 | 239792 | 55810 | 98670 | 1.0 | 37.5 | 2.2 | 70.0 | 41.3 |
| 29 | 323719 | 72553 | 131231 | 1.0 | 40.0 | 2.5 | 80.5 | 44.0 |
| 30 | 323720 | 75727 | 136972 | 1.0 | 42.8 | 2.8 | 92.0 | 46.7 |
| 31 | 323721 | 79040 | 142964 | 1.0 | 45.2 | 2.5 | 102.8 | 49.0 |
| 32 | 323722 | 82498 | 149219 | 1.0 | 47.8 | 2.5 | 113.0 | 51.7 |
| 33 | 329020 | 86107 | 155747 | 1.0 | 50.0 | 2.2 | 123.0 | 54.0 |
| 34 | 578827 | 89874 | 162561 | 1.0 | 51.5 | 1.5 | 130.0 | 55.7 |
| 35 | 578828 | 101311 | 183247 | 1.1 | 53.8 | 2.2 | 139.2 | 57.7 |
| 36 | 578829 | 105743 | 191265 | 1.1 | 57.5 | 3.8 | 155.8 | 61.7 |
| 37 | 656096 | 110369 | 199632 | 1.1 | 60.0 | 2.5 | 165.2 | 63.7 |
| 38 | 656097 | 115198 | 208366 | 1.1 | 62.2 | 2.2 | 175.2 | 66.3 |
| 39 | 956615 | 120238 | 217482 | 1.1 | 64.8 | 2.5 | 185.2 | 68.3 |
| 40 | 956616 | 135538 | 245157 | 1.265 | 66.8 | 2.0 | 195.2 | 71.0 |
| 41 | 1601169 | 135539 | 245158 | 1.265 | 70.5 | 3.8 | — | 74.3 |
| 42 | 1845042 | 135540 | 245159 | 1.265 | 73.5 | 3.0 | — | 77.3 |
| 43 | 1845043 | 135541 | 245160 | 1.265 | 76.8 | 3.2 | — | 81.0 |
| 44 | 2270406 | 152654 | 276116 | 1.265 | 80.0 | 3.2 | — | 84.0 |
| 45 | 2532864 | 170301 | 308035 | 1.3915 | 83.8 | 3.8 | — | 87.7 |
| 46 | 2817174 | 189417 | 342612 | 1.3915 | 87.2 | 3.5 | — | 91.3 |
| 47 | 2817175 | 189418 | 342613 | 1.3915 | 91.0 | 3.8 | — | 95.0 |
| 48 | 3299086 | 221819 | 401220 | 1.3915 | 94.8 | 3.8 | — | 98.7 |
| 49 | 3930251 | 264256 | 477979 | 1.3915 | 98.5 | 3.8 | — | 102.7 |
| 50 | 4598405 | 309181 | 559237 | 1.6002 | 102.5 | 4.0 | — | 106.7 |
| 51 | 5380147 | 361742 | 654309 | 1.6002 | — | — | — | — |
| 52 | 6294788 | 423240 | 765543 | 1.6002 | — | — | — | — |
| 53 | 7364921 | 495192 | 895688 | 1.6002 | — | — | — | — |
| 54 | 8616980 | 579376 | 1047958 | 1.6002 | — | — | — | — |
| 55 | 10081892 | 677872 | 1226114 | 1.6002 | — | — | — | — |

workers: worst per-seed clear-time ratio L31-50 (prev level >= 1 min only) = 1.88 at L41; seeds-level pairs > 2x: 0/2000
workers: HoP standard: clear-time ratio P95 1.88 (<=2.0) worst 1.88 (<=2.25); gap P95 3.50 (<=3) worst 3.50 (<=4) -> FAIL
workers: (c) diagnostic, all-purchase gap ratio from L30: P95 7.00 worst 7.00
workers: worst per-level time ratio L19+ = 1.88 at L41; worst purchase gap 3.50 min; worst wait until anything affordable 15 s; reached L50 100/30

no workers: worst per-seed clear-time ratio L31-50 (prev level >= 1 min only) = 1.78 at L36; seeds-level pairs > 2x: 0/1000
no workers: HoP standard: clear-time ratio P95 1.78 (<=2.0) worst 1.78 (<=2.25); gap P95 9.50 (<=3) worst 9.50 (<=4) -> FAIL
no workers: (c) diagnostic, all-purchase gap ratio from L30: P95 7.00 worst 7.00
no workers: worst per-level time ratio L19+ = 1.78 at L36; worst purchase gap 9.50 min; worst wait until anything affordable 15 s; reached L50 0/30

casual+workers: worst per-seed clear-time ratio L31-50 (prev level >= 1 min only) = 2.60 at L36; seeds-level pairs > 2x: 27/2000
casual+workers: HoP standard: clear-time ratio P95 2.40 (<=2.0) worst 2.60 (<=2.25); gap P95 3.67 (<=3) worst 3.67 (<=4) -> FAIL
casual+workers: (c) diagnostic, all-purchase gap ratio from L30: P95 7.33 worst 7.33
casual+workers: worst per-level time ratio L19+ = 2.00 at L36; worst purchase gap 3.67 min; worst wait until anything affordable 40 s; reached L50 100/30

POLISH +$1 cost steps (row L -> L+1): 16: farm@30, farm@31, farm@34, farm@35, farm@37, farm@39, farm@42, farm@46, hens@40, hens@41, hens@42, hens@46, egg@40, egg@41, egg@42, egg@46

monotonic (strictly rising L0-55, all three track costs): True

## Active / idle / offline at H=V=F (10-min window, 30 seeds)
| F | price/egg | active $/s | in-tab idle $/s | active/idle mean | worst seed | offline 2 h $/s | active/offline |
|---|---|---|---|---|---|---|---|
| 30 | 22.43 | 5202 | 3156 | 1.65 | 1.80 | 348 | 15.0 |
| 40 | 47.21 | 14996 | 9138 | 1.64 | 1.79 | 968 | 15.5 |
| 50 | 84.09 | 34723 | 20246 | 1.72 | 1.79 | 2144 | 16.2 |

F+5 cap check 40 (H=V=45): active/idle mean 1.64, P95 1.77, worst 1.80

F+5 cap check 44 (H=V=49): active/idle mean 1.64, P95 1.76, worst 1.79

F+5 cap check 50 (H=V=55): active/idle mean 1.64, P95 1.76, worst 1.79
