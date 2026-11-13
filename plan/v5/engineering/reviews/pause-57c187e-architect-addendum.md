# #115 Pause/Resume sim: Architect A1-close addendum at 57c187e

Date: 2026-11-06 00:15 CET (Europe/Belgrade, UTC+1)  
Lane: architect · **Fresh A1 close only — no approval inheritance** from `a73804d` / `409fa6a` / earlier #115 notes  
Prior HOLD (context only): `engineering/reviews/pause-a73804d-architect-addendum.md` (Major A1 offlineAccrualFrozen)  
Ruling: **D-HOP-2026-11-06-01 option (a)** — Pause **v1.3.15** sha1 `4c081f6443a9ecfef4a622bf6018263e845a7bf1` governs (`product/decisions.md` L2337–2342)  
Requested exact: `57c187e5e2c2b031206497091bff6a89a87e286e` · parent `a73804d45519c758a5bcb8310461643f04e9788f`  
Writes: this addendum + `engineering/status.md` (+ optional `engineering/reviews/evidence/pause-57c187e/`). **No** source edits / PR post / Ready / push / merge / messages. **Not** publishing authority.

## Verdict: **A1 CLOSED · content PASS** at exact `57c187e` (flag-on Pause offline eggs)

`offlineAccrualFrozen` removed; hen offline grant restored per spec §3 L88 / AC-P13 L330 and D-HOP option (a) parity predicate. Online pause freezes (wages / recovery / MH lockout / hidden≥60) preserved. Tests replaced zero-egg asserts with **strong parity** (all-paused / mixed / none-hired / flag0 / under-min / over-cap + hide/show grant). **Does not** inherit prior APPROVE/PASS for the full #115 stack; merge still needs #114→rc integration + hosted SUCCESS + HoQA offline bar.

---

## Identity

| Check | Result |
|---|---|
| Live headOid | `57c187e5e2c2b031206497091bff6a89a87e286e` **MATCH** |
| Parent | `a73804d45519c758a5bcb8310461643f04e9788f` **MATCH** |
| Subject | `fix(saves): offline egg grant ignores pause (D-HOP-2026-11-06-01 a)` |
| PR #115 base | `fix/saves-endcalls-durs` @ `98e1af5…` (#114 tip); open, not Draft, MERGEABLE, **UNSTABLE** |
| Diff vs parent | **exactly 2 files**: `src/sim/offline.ts` (−17/+3 net), `tests/v5-pause-sim.test.ts` (+47/−… rewrite of 2 AC-P13 cases) |

WT: `/workspace/wt-review-115-57c187e` · Evidence: `engineering/reviews/evidence/pause-57c187e/`

## Ruling / spec verification

- **D-HOP-2026-11-06-01 (a)** (`product/decisions.md` L2337+): existing Pause **v1.3.15** governs; remove pause-keyed offline-egg suppression; keep worker freeze semantics; parity across all-paused / mixed / unpaused / none hired; flag-off unchanged; **no** approval inheritance from `a73804d`.
- Spec: §3 L88 “Not changed: … and offline (workers already do nothing offline)”; AC-P13 L330 “+0 (state at the hide **plus the offline grant**)”.
- Tip comment in `offline.ts:21–22` cites the ruling; `applyOffline` again computes eggs from hens/gap/cap only (`offline.ts:23–25`) — **no** `isPaused` / WORKERS import.

## Source delta (A1)

- Removed `offlineAccrualFrozen` and the ternary that zeroed eggs when every hired worker was paused.
- Body of `applyOffline` egg formula **matches** pre-suppression tips (`409fa6a` / `2465b366`): only additive comment lines vs those SHAs.
- Unchanged vs parent (byte-identical): `pause.ts`, `tick.ts`, `workers.ts`, `income.ts`, fixture `m5-pause-committed-hired.json`.

## Tests: strong, not mere deletion

Rewritten (not deleted) AC-P13 cases:

1. **Parity grant:** `applyOffline(…, GAP).eggs` equal for open / all-paused / mixed / none-hired; flag-off (`OFF`) equal to flag-on grant; under-min and over-cap gaps equal paused↔open; hide/show returns `grant` into `pendingOfflineEggs` while coins/basket unchanged; online wages still freeze while paused (`wagesPerSec=0`, no wage events, recovery still on energy while paused).
2. **No double-pay:** after paused hide/show grant, resume does not inflate coins/energy for the gap; subsequent `step` wages/energy match an open twin’s step, not a full-gap drain.

Preserved elsewhere in suite: lockout countdown; `[offline][hidden>=60]` freeze of lockout+recovery; fixture boot/round-trip (**m1 CLOSED** remains).  
**m2 still OPEN (live):** `tests/v5-pause-sim.test.ts` L145 `expect(LOCK).toBe(45)` — unpinned live balance literal (D-HOE-05); non-blocking Minor carried from prior note.

## Contract preservation (spot-checked)

| Concern | Status |
|---|---|
| Online pause: wages off / no collect while paused | **PASS** (rewritten test + unchanged pause/tick) |
| Recovery while paused (online) | **PASS** (energy + RECOVER path asserted) |
| MH lockout freeze hidden≥60 / m5Offline | **PASS** (existing test retained; pause.ts unchanged) |
| No double-pay on resume after paused gap | **PASS** (rewritten test) |
| Flag 0 | **PASS** (parity OFF↔P grant; shipping flags pause=0) |
| Fixture m1 | **CLOSED** (unchanged fixture) |

## Independent evidence (Node **v20.19.2**, flock `.vitest-eng.lock`, nice 10, architect lane)

| Gate | Result |
|---|---|
| `tsc --noEmit` | **0** |
| Focused vitest | **95/95**: v5-pause-sim 21 + offline 6 + v5-f2-m5-fields 37 + v5-abilities-sim 29 + m4a-flag-off 2 |
| `--maxWorkers=1` | omitted (tinypool; flock lane) |

Author 117/117 not used as verdict basis. Full suite / build not re-run (bounded A1).

## Hosted / QA (read-only; **no SUCCESS cited**)

Exact `57c187e` at observation ~00:14 CET: ci **42127874273** **in_progress**/pending; pacing **42127874257** pending; k10 queued — **conclusion null**. Formal QA `pause-57c187e*.md` **absent**. HoQA offline bar is **after** this Architect PASS (HoE). **No** inheritance of any prior hosted/QA result.

## Remaining gates (not closed by A1)

1. Hosted gate **SUCCESS** at exact `57c187e` (42127874273).  
2. HoQA offline parity/regression bar + Saves QA report at this tip.  
3. **#114** merge (or stack resolution) then **#115** retarget/merge-forward onto then-current `rc/v5` + exact-head recheck if tip moves.  
4. Full merge bar (flag-0 parity, full vitest, build, pacing policy) at the integration head.  
5. Optional: close **m2** LOCK=45 pin.  
6. HoE/HoQA merge go — Architect A1 PASS ≠ merge/publication authority.

No Ready / push / merge / PR post / messages / source edits by Architect.
