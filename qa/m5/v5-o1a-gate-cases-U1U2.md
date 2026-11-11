# v5 o1a gate: U1/U2 clock-wage cases (D-HOP-2026-10-29-02; QA-D-1029-O1ATS)
Source: product/decisions.md L1306-1311; classification.md sha1 b3497a76. Errata to FC v0.3.14 393e69f6 / LR v0.8.8 08d12ac7 (pins unchanged). AC text pending PMW; re-trace when it lands. Flag m4.flags.clockWage ON; flag-off 2x and goldens must stay unchanged.

| Case | Rule | Setup | Expect | Lane |
|---|---|---|---|---|
| U1-a | cdS continuity Working→Asleep | worker Working, cdS=k mid-interval, energy hits 0 | Asleep keeps decrementing the same cdS; no reset | unit (src) + bot-m5 parity |
| U1-b | Asleep→Working on refill | Asleep with cdS remaining r>0, refill | resumes with cdS=r; no fresh interval | unit + parity |
| U1-c | Tired↔Asleep | Tired with cdS=k, falls asleep, refilled | cdS phase continuous across both transitions | unit |
| U1-d | No wage dodge | toggle Asleep/Working repeatedly over N wage intervals | total wages charged = continuous-clock count (±0) | unit + property test |
| U2-a | Reserve ignores Asleep | 2 workers, one energy 0 | auto-resume reserve counts only energy>0 workers | unit |
| U2-b | Resume sets cdS=0 | Asleep worker resumed | cdS=0; charged on the next tick | unit (tick-exact) |
| U2-c | Charge can re-Unpaid | resumed worker, coins < wage | next tick: Unpaid; coins never < 0 | unit + invariant |
| U2-d | Toggle bound D6 | broke-trickle scenario, 30 min | Asleep↔Unpaid toggles ≤ 12 per 30 min, per seed, all profiles | bot-m5 run (seeds as o1a) |
| U2-e | worker_state:'unpaid' on every flip (D-HOP-2026-10-29-04 20:18 addendum) | clockWage on; (i) Asleep worker clock charge > coins; (ii) Working/Tired charge > coins | exactly one worker_state{state:'unpaid'} per flip in both paths; HARD (PASS/FAIL). o1a parity compares economy outputs only; any event-stream hash excludes this event | unit (src) + Saves telemetry T-AC9 |
| PAR-U | Parity | bot-m5 vs o1a reference src, same CSV a8c4e268 + seeds | per-seed traces/headlines identical; first diverging tick reported if not | artifacts/m5-o1a-ts/results/ |
