# DRAFT, not applied: card #T TEL-AC10 / TEL-AC11 amendment for the BBv2 telemetry rows
PM Market, 2026-10-30 14:14 CET. **Not applied to the gate.** Paper only.

**Status (14:16 CET): HoQA OK in principle, QA-D-1030-TELAC-AMD** (`qa/decisions.md` L765, 14:15; verified on disk).
- R1–R3 are **agreed as an AC change**, keyed to the errata rev HoQA passes and HoE pins.
- This is subject to **HoQA re-checking the filled-in counts before apply**.
- The apply conditions at the end are unchanged.
- R6 below was added at HoQA's request, and R3 now has the size-test rate placeholder. Pre-OK draft: `6ab8ae26`.

**Keyed to:** *the errata rev that HoQA passes and HoE pins* in `engineering/v5-rc-manifest.md`.

**Why not "rev 9":**
- Rev 9 `49b76d62` (D-COL-2026-10-30-25) is likely blocked: `dead_zone` at 30 s vs the 180 s P95 bar (HoQA steer, 14:14).
- PMC is writing rev 10 with PMFU's G-15 rulings.

**Placeholders**, filled from the passed rev when it lands:
- `{REV}` / `{SHA}`: the passed and pinned errata rev and its sha1.
- `{BB_GATED}`: the BBv2 rows whose flag column is `bestBuyV2`.
- `{BB_PINNED}` / `{BB_RING}`: the subset of `{BB_GATED}` + `{BB_UNGATED}` that is pinned / ring.
- `{BB_UNGATED}`: the Best-buy rows that are **not** gated on bestBuyV2 (they need `m4.enabled` only).
- `{N_NEW}`, `{N_PIN}`, `{N_RING}`, `{N_ISPINNED}`: the counts from the passed rev's V-3 (new v5 types, pinned, ring, `isPinned` additions).
- `{DZ_RATE}`: `dead_zone`'s worst-case emission rate per the passed rev (e.g. once per stretch at stretch end, as PMC proposes; rev 9 says 1 per 30 s). It is used in the R3 size test.

**Fixed split (HoQA steer; holds whatever the rev):**
- Rows gated on `bestBuyV2` go in TEL-AC10's flag-off list.
- `best_buy_suppressed_zero_gain` (stopgap SG-8) is gated on `m4.enabled` only. It is **never** in the bestBuyV2 flag-off list.

**Gate state when drafted:**
- Gate `9d5c0638`: TEL-AC10 at ~L756, TEL-AC11 at ~L763.
- Errata on disk: rev 9 `49b76d62` (live file).
- Pin of record: rev 7 `fd7d5921` (manifest L121), which has no BBv2 rows. While rev 7 is the pin, **no change is needed**.

---

## EXAMPLE ONLY: rev 9 `49b76d62` values (not for the gate; verified on disk at 14:14)
- **Rows** (errata rev 9 L77–81):

  | # | Event | Flag column | Pin status |
  |---|---|---|---|
  | 19 | `best_buy_shown` | bestBuyV2 | ring |
  | 20 | `best_buy_followed` | bestBuyV2 | ring |
  | 21 | `zero_gain_purchase` | bestBuyV2 | pinned (proposed) |
  | 22 | `dead_zone` | bestBuyV2 | pinned (proposed) |
  | 23 | `best_buy_suppressed_zero_gain` | **no BBv2 flag** (`m4.enabled` + stopgap #5c build) | ring |

- **Counts (V-3 L128):**
  - 23 new types: 18 pinned, 5 ring.
  - The 5 ring types are `breed_revealed`, `breed_slotted`, `best_buy_shown`, `best_buy_followed` and `best_buy_suppressed_zero_gain`.
  - `isPinned` gets **21 additions**: the 18 pinned new types, plus `worker_paused`, `milestone_reached` and `balanced_tier`.
  - Checked: rev 9's `isPinned` block (L118–127) lists 20 type names plus the `tip_shown{clock_wage}` predicate, which makes 21.
- So, for rev 9:

  | Placeholder | Rev 9 value |
  |---|---|
  | `{N_NEW}` | 23 |
  | `{N_PIN}` | 18 |
  | `{N_RING}` | 5 |
  | `{N_ISPINNED}` | 21 |
  | `{BB_GATED}` | `best_buy_shown`, `best_buy_followed`, `zero_gain_purchase`, `dead_zone` |
  | `{BB_PINNED}` | `zero_gain_purchase`, `dead_zone` |
  | `{BB_RING}` | `best_buy_shown`, `best_buy_followed`, `best_buy_suppressed_zero_gain` |
  | `{BB_UNGATED}` | `best_buy_suppressed_zero_gain` |

- **Open in rev 9:**
  - G-15: HoE allowlist and pin calls; `farm_eta_s|null`, `ms_since_shown`, `level`, `dead_zone.s` / `reason`.
  - G-17: the 5/60/30 s thresholds aren't in `economy.csv` / `balance.json`.

---

## Replacement text (exact; fill the placeholders from the passed rev)

### R1. TEL-AC10, first sub-bullet ("zero events of any M5-only type…")
**Find:**
> `flock_complete`, `zero_gain_confirm`, `tip_shown{clock_wage}`, `collectible_*` / `frenzy_*` / `streak_*`);

**Replace with:**
> `flock_complete`, `zero_gain_confirm`, `tip_shown{clock_wage}`, `collectible_*` / `frenzy_*` / `streak_*`, **and the bestBuyV2-gated Best-buy rows {BB_GATED}** (errata {REV} `{SHA}` V-2). **`{BB_UNGATED}` is not in this list:** it isn't gated by bestBuyV2. It needs only `m4.enabled` and the stopgap build, and it is expected 0 in this config (flags-0 has no BBv2 ★, and SG-8 fires only for a ★ suppressed by zero gain).

*(Open point for HoQA: whether TEL-AC10 should also assert 0 `{BB_UNGATED}` in flags-0 as an expected-zero check, separate from the flag-off rule. Draft keeps it out of the flag-off list per the steer.)*

### R2. TEL-AC10, "Per feature" sub-bullet. Append after "(D-HOP-2026-10-30-36; errata rev 2 G-5)."
> With **`bestBuyV2` = 0** (all else at ship values, ship-set `product/v5-ship-set.md` L19), {BB_GATED} are not emitted, and no BBv2-only field appears (errata {REV} V-2). `{BB_UNGATED}` may still emit under `m4.enabled` and is checked only against its own spec (bb-stopgap SG-8), not by this rule.

### R3. TEL-AC11, "The pinned set in code (`isPinned`) equals the union of:" block
**Replace the bullet starting** "**16 pinned of the 18 new v5 types**" **with:**
> **{N_PIN} pinned of the {N_NEW} new v5 types** (errata {REV} `{SHA}` V-2 #1–{N_NEW}, V-3): the 16 already listed (`sales_stall` … `flock_complete`, unchanged, incl. `ability_blocked` capped at 50 + `{capped:true, events:50}` and `ability_ended`), **plus {BB_PINNED}** (Best buy, gated on bestBuyV2);

**Replace the bullet starting** "**2 ring of the 18:**" **with:**
> **{N_RING} ring of the {N_NEW}:** `breed_revealed` and `breed_slotted` (breeds §8 L693–694), plus {BB_RING} (Best buy; `{BB_UNGATED}` on `m4.enabled`);

**Keep** the "plus 3 already-allowlisted types…" bullet unchanged, and **add after it:**
> Total `isPinned` additions = **{N_ISPINNED}** ({N_PIN} + 3), event-based `isPinned(e: TEvent)` (D-HOE-19 F-10). Saves re-sizes the 200 KB pinned budget for {N_ISPINNED} entries with the worst-case-session test. **The test uses `dead_zone`'s emission rate from the passed rev, `{DZ_RATE}`**, not rev 9's 1 per 30 s (PMC proposes emitting once at stretch end; QA-D-1030-TELAC-AMD). It also covers any other rate-bound pinned Best-buy row at its worst case from the passed rev.

**Replace the bullet starting** "**errata rev 6 `83424120` matches:** 16 pinned / 2 ring." **with:**
> **errata {REV} `{SHA}` matches:** {N_PIN} pinned / {N_RING} ring, {N_ISPINNED} `isPinned` additions. *(rest of the bullet unchanged from "`ability_ended` is pinned, …")*

### R6. TEL-AC10, separate expected-zero check for `best_buy_suppressed_zero_gain` in flags-0 (outside the flag-off list)
**Decision: RECORD-ONLY** (count logged, not graded).

**Source:** `product/farm/bb-stopgap-spec.md` v1.2.6, sha1 `fdc1c199f9b520fd55969aecc7a63173ba54b7dd`.
- L27 (SG-7): "- **SG-7 Flag-off.** With the `m4.enabled: 0` balance from `tests/m4a-flag-off.test.ts`, goldens are unchanged and no SG-8 event fires. A flag change means a reload."
- L28 (SG-8): "- **SG-8 Telemetry.** New event `best_buy_suppressed_zero_gain {key, farm, level}`, registered in the M5 schema. `farm` is `s.farmLevel`, and `level` is that row's current level. It's edge-triggered per **(key, level)**:"
- L29: "- **Fires:** on the first suppressed render after load; on A→B→A (2 events); and when the held row levels up (e.g. a Collection level-up while it stays suppressed)."
- L72 (§6): "- **bestBuyV2 = 0:** SG-1, SG-2 and SG-4..SG-12 apply unchanged; SG-3 applies as written (flag 0, zeroGainUi 0)."

**Why:**
- flags-0 = "final RC with all M5 flags at 0" (`product/v5-ship-set.md` L32), so `bestBuyV2` = 0 and `zeroGainUi` = 0, but `m4.enabled` stays 1 (telemetry is always-on).
- SG-7 (L27) silences SG-8 only with `m4.enabled: 0`, which flags-0 doesn't set.
- With `bestBuyV2` = 0, §6 L72 keeps the stopgap active and SG-3 "applies as written (flag 0, zeroGainUi 0)". SG-3 (L23) is a state where the pick is a zero-gain row, so the ★ is suppressed.
- SG-8 (L29) fires on the first such suppressed render, and SG-9 (b) (L35) expects that census to be non-zero in the seeds 1–200 run.
- So nothing in SG-8 makes suppression impossible with all M5 flags at 0. A zero-gain ★ can be suppressed there.

**Replacement text (append to TEL-AC10, after the "No-nudge check" bullet):**
> **SG-8 census in flags-0 (RECORD-ONLY; QA-D-1030-TELAC-AMD):**
> - In the flags-0 config, the run logs the count of `best_buy_suppressed_zero_gain` events per key (seeds 1–200 plus the scripted UI session).
> - It is **not graded**, and it is not part of the flag-off rule above. SG-8 is gated on `m4.enabled` only (bb-stopgap v1.2.6 `fdc1c199` SG-7 L27, §6 L72), so it may legitimately fire there (SG-3 L23, SG-9 (b) L35).
> - It applies only once the stopgap (#5c) is built; until then the count is 0 by construction, and that is recorded as such.
> - A non-zero count is reported to HoQA and PMFU next to the SG-9 census, not as a TEL-AC10 failure.

*(Ship config, for reference: §6 L71 says SG-8 = 0 with zeroGainUi = 1 and bestBuyV2 = 1. That is a BBv2 check (BB-AC14), not this one.)*

### R4. #T L618 (Spec line), only when HoE pins the passed rev
> Pinned now: **{REV} `{SHA}`** (manifest {time}, HoQA {QA-D id}).

### R5. Dated errata note on #T
> **Errata note, 2026-10-xx hh:mm CET:** TEL-AC10 and TEL-AC11 amended for the Best-buy rows of errata {REV} `{SHA}`, as HoQA passed and HoE pinned it; ship-set bestBuyV2 = 1 (D-CEO-20261030-11, D-HOP-47).

---
**Apply conditions:**
1. HoQA passes an errata rev with the Best-buy rows.
2. HoE pins it in the manifest.
3. PM Market fills the placeholders from that rev's V-2/V-3 and re-checks the counts on disk.
4. HoQA agrees R1–R3 as an AC change. They are AC changes, not citation-only.
