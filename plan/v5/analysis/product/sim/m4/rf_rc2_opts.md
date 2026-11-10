# Refill sweep (live risk=True, staggered start=True): F22-24, seeds 0-99, combo 45 s, single-row refills, ALL stack + abilities v0.3

| regen s | cap | thr | seller15 vs rc1 | casual vs rc1 | managed/unm min | optimal/idle worst (10 min) | actions/15 min (s15 med) | not-lowest share (s15 / casual) | dead zones (s15/casual, max s) | shortage share s15 / casual | RF5 | RF8 | supply<demand (>=20%) | ALL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 240 | 2 | 40% | -4.1% (worst -12.1%) | -5.8% (worst -14.9%) | 1.79 | P95 1.80 / worst 1.88 | 4.5 | 40% / 40% | 0/0 (15/20) | 75% / 75% | PASS | FAIL | PASS | FAIL |
| 150 | 1 | 40% | -0.4% (worst -4.3%) | -1.2% (worst -6.3%) | 1.89 | P95 1.79 / worst 1.88 | 6 | 5% / 5% | 0/0 (15/20) | 43% / 54% | FAIL | PASS | PASS | FAIL |
| 150 | 2 | 50% | -0.3% (worst -2.1%) | -0.2% (worst -2.8%) | 1.93 | P95 1.80 / worst 1.88 | 6.5 | 46% / 8% | 0/0 (15/20) | 68% / 66% | PASS | PASS | PASS | PASS |
