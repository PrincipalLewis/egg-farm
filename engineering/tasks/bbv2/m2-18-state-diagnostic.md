# M2 diagnostic: ship affordable null-★ (pre-fix picker)

**Cite:** Architect b6dec409 §M2; D-HOP-2026-11-05-14; spec v1.0.4 `4ea3841a`; Card #12 `9f900304`.

## How generated
```
cd /workspace/wt-gen-bbv2-m12
# lane H:
./node_modules/.bin/vite-node scripts/m2-18-state-diagnostic.ts
```
Pre-fix ship picker = `DualPicker(zgFiltered(scorerUsingRankableEmptyToAll))`
(seeds 1–200 × runBot seller15 3600 s + runM2 workers 7200 s, VAR_DEFAULT;
`STATE_TRACE` @ 1 Hz; record when `hint.affordable && bbv2Mark===null`).

JSON: `engineering/tasks/bbv2/m2-18-state-diagnostic.json`.

## Counts
| metric | value |
|---|---|
| states traced | 2160000 |
| suppressedAffordable (all Farms) | 960329 |
| suppressedAffordableBelow30 | 0 |
| per bot | `{"runM2": 960329}` |
| rows in JSON (first chronological) | 40 |

Architect b6dec409 reported CONFIRMATORY `suppressedAffordable=18` on the then tip; this
reconstruction with an explicit empty→all scorer sees the same **defect shape** at high
volume (capacity-only HENS, empty meaningful, all F≥30). Post-fix CONFIRMATORY
(`rankable` ship empty→`[]`) unit AC14 seeds 1–3: `suppressedAffordable===0`.

## Defect shape (every dumped row)
- Farm ≥ L30, `meaningfulKeys` empty
- selected **HENS** affordable, `bbv2Mark===null`
- HENS: gain≤0, dCap>0, `isZeroGain===false` (income-zero capacity)
- COLL offered but ZG-filtered

selected keys: {'HENS': 40}

## Fix (M2 commit)
Ship `rankable`: empty BBv2 set → `[]` → no-pick strip / BR-BB4 (v1.0.4 §2.7/§4.1; D-HOP-14).
DECISIVE zg-off keeps empty→all. CONFIRMATORY asserts `suppressedAffordable===0`.

## Sample rows (selected / gains / meaningful)
### 1. runM2 seed 1 t=2441 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 7456982

### 2. runM2 seed 1 t=2442 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 7726080

### 3. runM2 seed 1 t=2443 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 7941395

### 4. runM2 seed 1 t=2444 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 8237409

### 5. runM2 seed 1 t=2445 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 8506556

### 6. runM2 seed 1 t=2446 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 8775654

### 7. runM2 seed 1 t=2447 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 9044801

### 8. runM2 seed 1 t=2448 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 9313899

### 9. runM2 seed 1 t=2449 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 9583046

### 10. runM2 seed 1 t=2450 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 9879060

### 11. runM2 seed 1 t=2451 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 10094375

### 12. runM2 seed 1 t=2452 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 10390389

### 13. runM2 seed 1 t=2453 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 10578788

### 14. runM2 seed 1 t=2454 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 10928634

### 15. runM2 seed 1 t=2455 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 11332361

### 16. runM2 seed 1 t=2456 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 11574543

### 17. runM2 seed 1 t=2457 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 11789858

### 18. runM2 seed 1 t=2458 F30 H29 V30 C11
- selected: **HENS** affordable mark=null
- offered: HENS, COLL
- meaningful: (empty)
- gains: `{"HENS": 0, "COLL": 0}`
- dCap: `{"HENS": 775, "VALUE": null, "COLL": 0}`  zg: `{"HENS": false, "VALUE": null, "COLL": true}`
- coinsCents: 12032040

