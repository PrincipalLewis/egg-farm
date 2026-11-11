# Unit-suite trace review: 62 author-owned unit rows (QA-D-1029-V5SCAP + QA-D-1029-V5E-SCOPE)

Each PR author ships a unit suite traced to these AC ids (PR DoD). Saves QA reviews the trace table **before merge** (rc/v5 merges wait for a checked trace table): every AC id maps to at least one named test that exists at the PR head SHA and asserts the plan oracle. Saves QA then re-runs the suite **once on the RC SHA**. Evidence = PR CI log + RC re-run log + trace-reviews/pr<N>-<sha7>.md.
QA-D-1029-V5E-SCOPE added 6 rows (marked +): AC-M5A-17, GE-AC7, GE-AC8, SS-1, SS-26, E7. SS-1 and SS-26 are typed "U, B": the unit part is author-owned; any browser part stays in the Saves driver binding.

Legend: trace OK = Y/N; gaps = missing AC, weaker oracle, wrong fixture; RC re-run = PASS/FAIL + log path.

## test-plan-abilities.md (39cce659): 11 rows; spec product/workers/m5-worker-abilities-spec.md v1.3.3 sha1 06f98b49; PR: ____

| row id | line | type | author test (file::name) | trace OK | gaps flagged | RC re-run result |
|---|---|---|---|---|---|---|
| AC-M5A-5 | L41 | U |  |  |  |  |
| AC-M5A-17 (+) | L53 | U |  |  |  |  |
| Long frame (D-C3) | L64 | U |  |  |  |  |
| Menus | L65 | U |  |  |  |  |
| Menus × types | L66 | U |  |  |  |  |
| Menus × Sweep | L67 | U |  |  |  |  |
| Menus × lockout | L68 | U |  |  |  |  |
| Freeze × Frenzy | L69 | U |  |  |  |  |
| Multi-tab | L80 | B |  |  |  |  |
| Streak/Frenzy | L83 | U |  |  |  |  |
| Manage | L84 | U |  |  |  |  |

## test-plan-broody-hen.md (54bcb8a1): 13 rows; spec product/collection/m5-broody-hen-spec.md v1.3.2 sha1 f180c3ff; PR: ____

| row id | line | type | author test (file::name) | trace OK | gaps flagged | RC re-run result |
|---|---|---|---|---|---|---|
| BH-AC1 | L32 | U, B |  |  |  |  |
| BH-AC3 | L34 | U |  |  |  |  |
| BH-AC4 | L36 | U, B |  |  |  |  |
| BH-AC10 | L42 | U |  |  |  |  |
| BH-AC11 | L43 | U |  |  |  |  |
| BH-AC12 | L44 | U |  |  |  |  |
| BH-AC18 | L51 | U + grep |  |  |  |  |
| BH-AC26 | L58 | U |  |  |  |  |
| BH-AC27 (new, R12) | L59 | U, B |  |  |  |  |
| Long frame (D-C3) | L70 | U |  |  |  |  |
| Big numbers | L77 | U |  |  |  |  |
| Two tabs | L78 | B |  |  |  |  |
| Pause | L83 | U |  |  |  |  |

## test-plan-golden-egg.md (21ee5feb): 10 rows; spec product/collection/m5-golden-egg-spec.md sha1 f6b3a05e; PR: ____

| row id | line | type | author test (file::name) | trace OK | gaps flagged | RC re-run result |
|---|---|---|---|---|---|---|
| GE-AC7 (+) | L60 | U |  |  |  |  |
| GE-AC8 (+) | L61 | U |  |  |  |  |
| GE-AC9 | L62 | U |  |  |  |  |
| GE-AC9b (ruling 2, confirmed; GE-18 clos | L63 | U |  |  |  |  |
| GE-AC12 | L67 | U |  |  |  |  |
| GE-AC26 | L82 | U + grep |  |  |  |  |
| GE-AC30 | L87 | S |  |  |  |  |
| GE-AC35 (new, R25b) | L92 | U, B |  |  |  |  |
| Big numbers | L107 | U |  |  |  |  |
| Abilities × Frenzy | L113 | U |  |  |  |  |

## test-plan-sales-stopped.md (8626c650): 23 rows; spec product/market/sales-stopped-spec.md v1.3.10 sha1 2c2c323b; PR: ____

| row id | line | type | author test (file::name) | trace OK | gaps flagged | RC re-run result |
|---|---|---|---|---|---|---|
| SS-1 (+) | L50 | U, B |  |  |  |  |
| SS-4 | L53 | U, B |  |  |  |  |
| SS-9 | L58 | U |  |  |  |  |
| SS-10 | L59 | U, B |  |  |  |  |
| SS-15 (R) | L64 | U, B |  |  |  |  |
| SS-22 | L71 | U |  |  |  |  |
| SS-23 | L72 | U, B |  |  |  |  |
| SS-24 | L73 | U, B |  |  |  |  |
| SS-26 (+) | L75 | U, B |  |  |  |  |
| SS-33 | L82 | U, B |  |  |  |  |
| E1 | L100 | U |  |  |  |  |
| E2 | L101 | U |  |  |  |  |
| E3 | L102 | U, B |  |  |  |  |
| E5 | L104 | U |  |  |  |  |
| E7 (+) | L106 | U |  |  |  |  |
| E12 | L111 | U, B |  |  |  |  |
| E13 | L112 | U, B |  |  |  |  |
| E14 | L113 | U |  |  |  |  |
| QA-4 | L118 | U |  |  |  |  |
| QA-5 | L119 | B |  |  |  |  |
| QA-7 | L121 | U |  |  |  |  |
| QA-9 | L123 | T |  |  |  |  |
| QA-10 | L124 | U |  |  |  |  |

## test-plan-streak-tap-coins.md (5fb68dc9): 5 rows; spec product/collection/m5-streak-tap-coins-spec.md v1.3.1 sha1 895ca903; PR: ____

| row id | line | type | author test (file::name) | trace OK | gaps flagged | RC re-run result |
|---|---|---|---|---|---|---|
| Long frame (D-C3, HoE §13) | L88 | U |  |  |  |  |
| Big numbers | L90 | U |  |  |  |  |
| Streak vs abilities | L95 | U |  |  |  |  |
| Streak vs Pause | L96 | U |  |  |  |  |
| Broody | L97 | U |  |  |  |  |
