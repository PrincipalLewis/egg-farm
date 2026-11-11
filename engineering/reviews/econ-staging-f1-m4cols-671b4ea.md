# PR #8 econ/staging-f1-m4cols @ 671b4ea (base main): staged Economy CSV 70009738
One commit: data/staging/economy.f1-m4cols.csv (32 lines), tests/staging-f1-m4cols.test.ts (28 lines). Read-only. Claude: 0 calls. Tests and build run in a /tmp copy.

## Verdict: APPROVE (data-only, safe). Two non-blocking test gaps to address before the runtime reads this file.

## Verified
- **Not imported by the runtime:** no reference to data/staging or *.csv imports in src/, vite.config, or check-release-build. The /tmp `vite build` bundle (JS 102.36 kB, unchanged footprint) contains none of the new column names (w2_asleep_collect_share, leave_attended_window_s, tc_egg_gap*). No new window globals. Only the test reads it, via node:fs.
- **Provenance:** sha256 70009738d2d176f6… is byte-identical to product/economy.f1-m4cols.csv.
- **Integrity:** LF only, no CR, no quotes. Header 125 columns with no duplicates; all 31 data rows (L0–L30) are 125 wide; 0 empty cells. Every cell matches `-?\d+(\.\d+)?`: no scientific notation, no locale commas, no NaN. Max magnitude far below 2^53 (largest farm_cost L30 = 624316). Units: all time columns use the _s suffix with plausible values (leave_attended_window_s 30, charge_regen_s 150, nudge_coopfull_window_s 300). No _ms columns.
- **Superset of main:** the first 46 columns equal live data/economy.csv in name and order. 79 new columns.
- **Tests:** 3/3 pass and are deterministic. Full suite: 463 pass; 2 failures are /tmp artefacts (BUILD_ID needs .git: telemetry-m3, check-release-build "no build id"), not caused by this PR.

## Mutations (on the CSV, in /tmp)
| Mutation | Result |
|---|---|
| Row truncated to 60 cells | caught (parser throws) |
| Empty cell | caught |
| L30 dropped + L0 duplicated | caught |
| `farm_cost` ↔ `hens_cost` headers swapped | **passes** |
| farm_cost L9 = `1e3` | **passes** |

## Findings
- **MINOR: the test pins 16 constant scalars + shape but no per-level columns.** tests/staging-f1-m4cols.test.ts:12-26. A swapped header pair, a mis-ordered cost curve, or a value edited inside a row passes. Since the file is meant to be byte-identical to product, the strongest cheap guard is to assert sha256 = 70009738d2d1… (the hash is already in the comment at :4), or a per-row checksum.
- **MINOR: no numeric-format guard.** "1e3" passes the test (parseEconomyCsv accepts it). Add one loop asserting every cell matches `/^-?\d+(\.\d+)?$/` and Number.isSafeInteger for cost columns, so later CSV re-exports can't sneak in scientific notation or locale commas.
- **NOTE (merge-time, not this PR): shared columns differ from live main data/economy.csv in 69 cells.**
  - yawn_at_pct 40→50 on all 31 rows; farm_cost L6–L30 (e.g. 605→560, L30 812854→624316); w4_tier_cost L18–L30.
  - These match the product F1/MK-33a changelog (balance-changelog.md farm_cost ×0.70/×0.90; w4 L20 9100).
  - yawn_at_pct=50 contradicts product/economy.md:80 and playtest1-resim P4 (Manage enabled at ≤ 40) unless the rc2 refill spec supersedes them. Product should confirm that before the runtime switches to this file. The test's "match the spec" (:16) pins yawn_at_pct 50 without citing which spec.
