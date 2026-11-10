# roundA RESULT (D-HOP-2026-11-10-11 add.3; INFORMAL, ac_claim NONE)
Cells: envelope (a) tunables + W4 tier-5 w4_tier_cost rows 24-30 only; collection_cost byte-identical to a8c4; economy-config 1e7148b2 unchanged (collectionCostFromCsv OFF).
pl.ts flags-off CFG none, seeds 1-200, T 4000, 3 profiles; metrics: PYTHONDONTWRITEBYTECODE=1 python3 tools/metrics.py <cand>/run ; control = control/run/metrics.json ae491312 (not re-run).

## A1-c06-w4min: PL-AC1 FAIL · PL-AC2 FAIL · PL-AC3 FAIL · ALL3 NO
- note: c06 + W4 tier5 33519 (-35%) only; w4_tier5 33519; csv sha256 3a42d6aefaafc081e3792b7a7eb8cb2d98e981f264f3f8edca59ce39cbc8c1e1; metrics sha256 3b17f3c86c1353408a7849be5827b8043db75ad164a12825433983c6fc2c0c4c
- optimal: AC1 fails ['L21 x3.174', 'L27 x2.089'] · AC2 fails ['L17 218.2s', 'L27 221.5s', 'L28 197.1s'] · tot 1901.6 ['-0.1013', False]
- seller15: AC1 fails [] · AC2 fails ['L17 189.8s', 'L18 199.1s', 'L26 199.6s', 'L27 234.2s'] · tot 1880.3 ['-0.1047', False]
- casual: AC1 fails ['L15 x2.431', 'L18 x2.129'] · AC2 fails ['L18 198.7s', 'L26 223.8s', 'L27 239.6s'] · tot 1830.8 ['-0.1032', False]

## A2-c06-fix-w4min: PL-AC1 FAIL · PL-AC2 FAIL · PL-AC3 FAIL · ALL3 NO
- note: c06 + L14/15/17/18/20-24 de-phase fixes (rows 16-26), rows 27-29 as c06, W4 33519; w4_tier5 33519; csv sha256 8a12c0006d37564a5b713ac342a5304833dda0073eea968f460717d79bdc2cd9; metrics sha256 c1126f849f02c018cf01d31bc4fdc3d0be53240b953113b24b51ebc6538ab4ab
- optimal: AC1 fails ['L27 x2.088'] · AC2 fails ['L27 221.1s', 'L28 196.1s'] · tot 1832.4 ['-0.1340', False]
- seller15: AC1 fails ['L21 x2.309'] · AC2 fails ['L26 205.1s', 'L27 231.9s'] · tot 1811.1 ['-0.1377', False]
- casual: AC1 fails ['L17 x2.084', 'L21 x3.054', 'L24 x2.959'] · AC2 fails ['L26 233.2s', 'L27 245.5s', 'L29 184.2s'] · tot 1769.2 ['-0.1334', False]

## A3-c06-fix-late-w4min: PL-AC1 FAIL · PL-AC2 FAIL · PL-AC3 FAIL · ALL3 NO
- note: A2 + rows 27-29 partially relieved (H 55000/55500/56000, V 95000/96000/97000), W4 33519; w4_tier5 33519; csv sha256 d9c426009378b65e9acf6214a4ea4ce22877b9fbe84f4fab47f692eb4011a221; metrics sha256 50f6d39d4ec9f028198ac13e00a8a003567fa71581072ed1ea075e7c6fd0ba82
- optimal: AC1 fails [] · AC2 fails ['L27 185.4s'] · tot 1783.2 ['-0.1573', False]
- seller15: AC1 fails ['L21 x2.309'] · AC2 fails ['L26 200.1s', 'L27 180.4s'] · tot 1758.4 ['-0.1627', False]
- casual: AC1 fails ['L17 x2.084', 'L21 x3.054', 'L24 x2.959'] · AC2 fails ['L26 205.7s', 'L27 185.6s'] · tot 1722.2 ['-0.1564', False]

## A4-c06-fix-w4max: PL-AC1 FAIL · PL-AC2 FAIL · PL-AC3 FAIL · ALL3 NO
- note: A2 with W4 56723 (+10%); w4_tier5 56723; csv sha256 197055e5e896a059d25aba2a452f96649190c923c459ea90b152c8e7f077c3be; metrics sha256 d13e6343b08feea46ad0d4b515f2832f9c1374def172f71fe99baf408238a4a6
- optimal: AC1 fails ['L27 x2.086'] · AC2 fails ['L27 221.5s', 'L28 196.6s'] · tot 1862.3 ['-0.1199', False]
- seller15: AC1 fails ['L21 x2.309', 'L24 x2.271'] · AC2 fails ['L26 203.4s', 'L27 234.4s'] · tot 1836.7 ['-0.1255', False]
- casual: AC1 fails ['L17 x2.084', 'L21 x3.054', 'L24 x2.372'] · AC2 fails ['L26 228.8s', 'L27 236.2s'] · tot 1799.0 ['-0.1188', False]

## A5-A3-maxadd-w4max: PL-AC1 FAIL · PL-AC2 FAIL · PL-AC3 FAIL · ALL3 NO
- note: A3 + time added at cool levels L16/L19/L20/L22/L23 (H18-26, V20-24) + W4 56723 (max-total test); w4_tier5 56723; csv sha256 3b88cbac2be6765a7d3ce83abf679d26abcc7a80995b63a32e5ecfc106aee3c3; metrics sha256 4b69a96f27773e90e3935e57181d469d9f3be495e1f3734eaf707f162c26157f
- optimal: AC1 fails [] · AC2 fails ['L21 204.7s', 'L27 186.5s'] · tot 1891.4 ['-0.1061', False]
- seller15: AC1 fails ['L21 x2.353', 'L24 x2.072'] · AC2 fails ['L17 184.8s', 'L24 227.0s', 'L26 200.2s', 'L27 185.7s'] · tot 1861.4 ['-0.1137', False]
- casual: AC1 fails ['L17 x2.247', 'L21 x3.452', 'L24 x3.966'] · AC2 fails ['L21 181.6s', 'L24 257.2s', 'L26 206.7s', 'L27 194.5s'] · tot 1819.7 ['-0.1086', False]

## A6-A5-latelow: PL-AC1 FAIL · PL-AC2 FAIL · PL-AC3 FAIL · ALL3 NO
- note: A5 with rows 27-29 relieved further (H 50000/50500/51000, V 85000/86000/87000); w4_tier5 56723; csv sha256 ea9be9631ffa3bf2dfe0e703af13c46903a20f465b172ff58fc2883a8999984f; metrics sha256 beae43e16750e6efc47b69624a5df24383263ed9271119d68c017b1dc4232482
- optimal: AC1 fails ['L26 x2.039'] · AC2 fails ['L21 204.7s'] · tot 1873.1 ['-0.1148', False]
- seller15: AC1 fails ['L21 x2.353', 'L24 x2.072'] · AC2 fails ['L17 184.8s', 'L24 227.0s', 'L26 186.9s'] · tot 1842.5 ['-0.1227', False]
- casual: AC1 fails ['L17 x2.247', 'L21 x3.452', 'L24 x3.966'] · AC2 fails ['L21 181.6s', 'L24 257.2s', 'L26 184.3s'] · tot 1803.4 ['-0.1166', False]

## VERDICT: INFEASIBLE under D-HOP-2026-11-10-11 add.3 (INFORMAL; 6 of 8 candidates, 6 candidate runs, control not re-run)
None of A1–A6 passes PL-AC1, PL-AC2 and PL-AC3 together.
- Moving time toward the AC2 bars (A3) drops totals to −15.6% / −16.3%.
- Putting the total back (A5) re-creates AC2 fails at L21 and L24 and still leaves totals at −10.6% to −11.4%.
- The W4 tier-5 range (−35%..+10%) is worth only ≈ ±30 s of total.
Best candidate on PL-AC3 = A1 (c06 + W4 33519), exact misses: see the A1 block above.
