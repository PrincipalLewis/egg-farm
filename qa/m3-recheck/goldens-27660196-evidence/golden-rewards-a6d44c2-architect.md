# Architect review · PR #107 golden slice 1 rewards+Frenzy · `a6d44c2` · 2026-11-05 22:48 CET (Europe/Belgrade)

**Requested exact:** `a6d44c250b043250b56885e289fd4210270ad988`  
**Live headOid:** `a6d44c250b043250b56885e289fd4210270ad988` — **MATCH (unchanged)**  
**Branch:** `feat/v5-golden-rewards`  
**Base (#106 tapCoins):** `e5b3d02b380e0dde1096d789d6a46301a2883f27` — ancestor OK (`06bf3cf` then GE-AC26 `a6d44c2`)  
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/107 (**Ready/undrafted**; not draft)  
**Spec of record:** `product/collection/m5-golden-egg-spec.md` **v1.3.2.3** sha1 **`d3934b4843f8f28a8b459e13b51044ae9f64a617`** (task string `3d3934b…` appears to be a leading-`3` typo; remainder matches). Contracts: `arch-golden-slice2-contracts-20261105.md` (Product ruling tc_frenzy_all_sales=1 only); D-HOP-2026-11-05-11; GE-AC7/8/9/9b/10/10b/26; R22/R23/X7; §3.5 / §4 #2–#3.  
**Prior Architect:** #105/#106 APPROVE; #108/#111 reviewed later on stack (M1 abilities keys closed on later tips — **out of this tip’s tree**).  
**Scope (PR — not invented):** sim-only reward math + Frenzy sale effect + focus countdown behind `m4.flags.golden`. **Not** spawn/lifetime/tap/UI/events (slice 2).  
**Writes:** reviews + status only. **No PR review post / Ready / merge / push / messages.**

## Verdict: **APPROVE** · Minors: **2 (gates provenance)** · Ready recommendation: **CONDITIONAL**

Slice-1 content matches pinned v1.3.2.3 + Product all-sales=1 ruling. Independent **Node v20.19.2**: tsc 0; `v5-golden-rewards` **21/21**; stacked income-ref **27/27** + tap-coins **22/22**. Hosted CI at tip still **pending** at review time — do not treat Ready as merge-cleared.

---

## Stack / isolation
| Commit | Role |
|---|---|
| `e5b3d02` #106 | tapCoins base |
| `06bf3cf` | slice 1 rewards+Frenzy |
| **`a6d44c2`** | GE-AC26 `frenzy_all_sales !== 1` reject |

Diff vs `e5b3d02`: 6 files, +204/−2 (`golden.ts`, effects/timers/formulas/m5-rules, rewards tests). No Game/UI/spawn.

---

## Claim matrix

| Claim | Result | Evidence |
|---|---|---|
| Reward table order cash→frenzy→eggs(/eggs_cash) | **PASS** | `rollReward`; GE-AC7 boundaries + 10k shares ±1.5 pp |
| `baseScaled` = round(E×P_cents×100); Grader in, streak/Frenzy **out** | **PASS** | `priceDollars` = salePrice×grader only; test equality with streakS/frenzy set |
| `rewardCents` half-up + BigInt above MAX_SAFE_INTEGER | **PASS** | GE-AC9b edges, switch points, spy, BigInt reference |
| `grantGolden` cash/eggs_cash/eggs/frenzy; flag-off identity | **PASS** | tests; frenzy resets to `tc_frenzy_s`, never stacks |
| Frenzy ×`tc_frenzy_price_mult` via `saleMultipliers` (all sales) | **PASS** | `SALE_EFFECTS` frenzy entry; player+MH; X7 with streak |
| Suspended sales 1× (D-C3 / R23) | **PASS** | GE-AC10b |
| Focus-only countdown; freeze unfocused; clear field at 0 | **PASS** | `frenzyTick` on TIMER_SYSTEMS; R23 step test |
| **GE-AC26** valid 1 / invalid 0 (and ≠1) | **PASS** | `m5-rules`: `frenzy_all_sales !== 1` → fail; unit rejects 0 (flag on/off) and 2; accepts shipped 1 |
| `tc_frenzy_all_sales` fixed contract, not tunable switch | **PASS** | Product ruling + validation; no player-only branch |
| Weights sum-to-1 mapping validation | **PASS** | existing `m5-rules` sum check; `M5_TC_KEYS.golden` lists reward/Frenzy keys |
| Flag-0 parity | **PASS** | `goldenOn`; grant/tick/factor identity; shipping `golden:0` |
| BigInt credit vs I_ref | **PASS (slice1)** | `grantGolden` mutates `coinsCents`/`basket`/`frenzyRemainingS` only — **no** `creditTap` / ring write. Lump cash therefore does not feed I_ref. Live Frenzy sales still flow through normal income→ring when tapCoins on (economy path; not a lump-grant leak). |
| Persist / events boundary | **PASS (scoped)** | `frenzyRemainingS` remains **saved** (R23 resume); no spawn/egg persist/events in this tip (slice 2). |
| Deterministic RNG (caller draws) | **PASS** | `rollReward(u,…)` pure; GE-AC7 uses `evDraw` |

---

## Architecture notes
- Module boundary: pure `src/sim/golden.ts` + one SALE_EFFECTS line + timer — matches slice1 contract; no invented fireAbility/spawn.
- `arch-golden-slice2-contracts`: reward order and all-sales=1 already satisfied here; UI slot injection / pagehide / collectible_id remain slice2+.
- Income-ref / tapCoins stack (#105/#106) unchanged and still green under focused re-run.

---

## Minors (gates — not content Fails)

| ID | Note |
|---|---|
| **m1** | Artifact `artifacts/v5-golden-rewards-a6d44c2/`: SUMS+bundle OK, but author **vitest was PENDING** (flock) at tip; recorded evidence = tsc0 + tsx GE-AC26 smoke on **Node v24.22.1**. Full **2095/1 + verify-24h** provenance is on parent **`06bf3cf`** artifact (also Node **v24** in that env record). Architect closed the tip gap with **Node v20.19.2** focused 21+27+22. |
| **m2** | Hosted checks at `a6d44c2` were **queued/pending** at review (gate, verify-smoke, pacing shards) — Ready undraft fired CI; **not yet SUCCESS**. HoQA exact-head not observed in-tree for this tip. |

No content Majors.

---

## Gates / QA (qualified)

| Gate | Status |
|---|---|
| Exact head / #106 ancestry | **MATCH** |
| Spec pin | v1.3.2.3 `d3934b…` (cite typo note above) |
| Artifact a6d44c2 SUMS/bundle | **OK**; vitest pending (m1) |
| Artifact 06bf3cf full suite | **2095/1**, slow 17/1, verify-24h flagOff/m4On PASS (parent) |
| Independent Node **20.19.2** | **tsc 0**; rewards **21/21**; income-ref **27/27**; tap-coins **22/22** (flock + nice 10) |
| Hosted CI | **pending** at review (m2) |
| Full suite re-run this tip | **Not** done (avoid redundant; delta is validate+1 test; focused covers AC) |
| HoQA | Queue order 105→106→107… — no #107 QA packet cited this turn |

Logs: `scratch/architect/review107-a6d44c2/` · WT `/workspace/wt-review-107-a6d44c2`

---

## Ready recommendation (no mutation)
**CONDITIONAL YES on Architect content (APPROVE).** Recommend merge only after: hosted **gate SUCCESS** at frozen `a6d44c2` + **HoQA** exact-head ACK in the 105→106→107 chain. This note does **not** approve the GitHub PR, flip Ready, or merge. Slice 2 / #108+ remain separate.
