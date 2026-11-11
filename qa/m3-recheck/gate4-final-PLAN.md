# GATE 4 final: two candidate SHAs (HoE names the winner at 06:00 CEST, 19 Oct)
Prep 04:31–04:50 CEST. Runner `qa/m3-scripts/gate4-run.sh` now has `PROFILE` and a `marker` step (marker/migrate-once/rollback/F50/flag-off + explainer cases when `src/ui/tracks-explainer.ts` exists; it also logs whether a399d27 and e43bc00 are ancestors, maxLevel and the CSV sha).
Rules: own `npm ci` in /tmp/qa-rc/<sha7>; ports 5961–5964; one engine at a time under `flock .browser-test.lock timeout 600`; vitest ≤ 2 workers; never push, merge or tag.

## Commands
```
# (A) Full L30+ (#45 + #46 + #47)
PROFILE=full    bash qa/m3-scripts/gate4-run.sh <full-sha-A> "pre unit saves marker release browser"
# (B) Capped rc/m4-t3-capped (#44@1d10311 + loader #47 + explainer F1, CSV b48be8a4, farm max 30)
PROFILE=capped  bash qa/m3-scripts/gate4-run.sh <full-sha-B> "pre unit saves marker release browser"
# fast partial first (≈5 min, no lock): "pre unit saves marker release"; browser steps after
```
Preflight to check by hand in summary.txt: a399d27 (#47) = YES for both; e43bc00 (explainer) = YES for both; (B) maxLevel 30 and csv b48be8a4; (A) maxLevel 50 and the L30+ CSV. Any NO → stop and report.

## Cases per profile
| Case | (A) full | (B) capped | Balance-sensitive |
|---|---|---|---|
| Build-id, check-release-build, check-globals, html-open ×3 | run | run | no |
| unit + slow (+ M4-off-assumption vs save-bug split) | run | run | yes |
| R1–R5 save risks, M1 L18 dd52bfd → M4 on, F1–F5 acdbedc | run | run | grant values only |
| 1 marker tracksV7:1 + v6BackupId, migrate exactly once, no double refund | run | run | no |
| 2 interrupted load stays pending → migrates once | run | run | no |
| EXP-a shows once at commit (existing save) · EXP-b never on a fresh farm · EXP-c pending→commit once · EXP1 fixture reload shows once · strip-flag lookalike = fresh | run | run | no |
| 4 rollback with M4 off: committed F30 + **L31+-shaped F40/C35/H40/V32** loads without reset (loader #47) | run | run | no |
| 5 farm 50 / tracks 55 (pre-v7 F50 migrates; marked F50 H55 V55 round-trips) | run | **N/A BY RULING (D-CEO-09: farm max 30)**, reported as N/A, not skipped | yes (track max) |
| 6 flag off: byte-identical to a dd52bfd save | run | run | no |
| Hidden-tab M4 ×3, offline/clock/reload ×3 | run | run | **yes** |
| Browser old-save load F1–F5 + M1 ×3 | run | run | no |
| (A) only: L30+ suite (tests/l30plus*.test.ts) loads (Saves review M4: needs costTable + staging CSV) | run (in unit) | — | yes |

## Dry runs on refs that exist (fetched only), marker step (`qa/m3-recheck/gate4-final-dryrun/`)
| Ref | What it is | Profile | Result |
|---|---|---|---|
| 3dfa0de origin/fix/m4-gate5-explainer | l30plus + explainer F1/F2, **no #47** | full | 13/16: **explainer 5/5 PASS**; 3 FAIL = M-1 (L31+ rollback → .bak reset; F50 → fresh farm), as expected without a399d27 |
| 002d8a4 origin/fix/saves-level-tolerance | 4ccb9fd + a399d27 (#47) | full | 11/11 PASS (explainer absent) |
| 002d8a4 | same | capped | 9/9 PASS + 2 N/A BY RULING |
| 1d10311 origin/rc/m4-retune-t3 (#44 head) | no #47, no explainer | capped | 8 PASS, 1 FAIL (L31+ rollback, M-1), 2 N/A |
**Takeaway:** each piece passes on its own branch: explainer on 3dfa0de, loader on 002d8a4. Neither (A) nor (B) exists yet as one SHA (rc/m4-t3-capped is not on origin at 04:50). Both final SHAs **must contain a399d27**, or case 4 L31+ (and in (A) case 5) fail with data loss.

## Time estimate per final SHA
npm ci 1 min · pre/build 1 · unit ~16 (box load avg 15; 2.5 when idle) · slow ~11 (1.5 idle) · saves + marker < 1 · per engine ~6–9 min (rc0 4–7) × 3 · **≈ 50–60 min at current box load (≈ 35 min when idle)**. Fast partial (no browser) ≈ 20–30 min. Rerun after a CSV-only change: balance-sensitive rows only, ≈ 25 min.

## Not-run template
| Item | Reason | Risk |
|---|---|---|
| Farm 50 / tracks 55 in (B) | N/A BY RULING D-CEO-09 | none for capped |
| Explainer in a real browser (visual) | Art & UX gate 5; gate 4 covers logic and persistence | low |
| IDB-injected browser fixtures | unit coverage only | low |
| Published-asset check | only after release | — |
