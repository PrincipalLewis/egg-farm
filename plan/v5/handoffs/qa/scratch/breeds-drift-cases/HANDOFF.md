# HANDOFF — hoqa/breeds-drift-cases (Saves QA)

- **When:** 2026-11-10 ~00:17 CET (Europe/Belgrade)
- **Task:** HoQA `hoqa/breeds-drift-cases` — add PMC drift-audit D1–D6 to Saves QA breeds save cases.
- **Audit:** `product/collection/drift-audit-rc-v5-f20b9183-20261110.md`
  - sha1 **e328cef1598c39cb9c62ae5af0c8664e8667a53c** (verified; matches HoQA `e328cef1…`)
  - Tip: f20b91839fdf09ba0ed45a890281ccbf7bf2909d
- **Write scope used:** `qa/v5-saves/m5-save-cases-DRAFT.md` (append G2b only) + this HANDOFF. No src/, tests/, product/, push, merge, or tag.
- **breeds-hatch.ts:21 @ f20b9183:** CONFIRMED via `git cat-file -e` + `git show` in `/workspace/wt-review-106-dc58705`.
  - L21: `if (x.settleMs.some(v => v > 0)) x = { ...x, settleMs: x.settleMs.map(...) }`

## Case IDs added (G2b)

| Audit | Severity (HoQA) | Case ID(s) | Notes |
|---|---|---|---|
| D1 | MAJOR | M5S-BR-D1-TEL-VALIDATE | validateEvent on full save_migrated shape; overlaps M5S-BR-TEL-SHAPE |
| D2 | CRITICAL | M5S-BR-D2-ROOT-NULL | null root + tick no-throw |
| D2 | CRITICAL | M5S-BR-D2-ROOT-ARRAY | [] / [1] / ["leghorn"] + tick no-throw |
| D2 | CRITICAL | M5S-BR-D2-ROOT-NUMBER | 5 (+ 0 falsy sibling note) + tick no-throw |
| D2 | CRITICAL | M5S-BR-D2-ROOT-STRING | "x" (+ "" falsy sibling note) + tick no-throw |
| D2 | CRITICAL | M5S-BR-D2-TICK-NOTHROW | explicit one-tick no-throw across the four roots; cites breeds-hatch.ts:21 |
| D3 | MINOR | M5S-BR-D3-SHAPE-REPAIRS | owned/slots/costCents/freeHatchUsed; overlaps OWNED-ROOT, SLOTS-SHAPE, INC-COST, FREE-DEF |
| D4 | MINOR | M5S-BR-D4-LOCKED-NORAW | locked-slot raw id; overlaps SLOTS-LOCKED |
| D5 | MINOR | M5S-BR-D5-TICKHZ-MOD | balance `1000 % tickHz === 0` guard |
| D6 | MINOR | M5S-BR-D6-RARITY-ENUM | schema rarity Common\|Rare\|Epic\|Legendary |

All marked **expected FAIL at f20b9183 until #95 follow-up**, same family as OQ-2/3/7.

## Files

| File | Role | sha256 (post-write) |
|---|---|---|
| qa/v5-saves/m5-save-cases-DRAFT.md | case file (G2b appended) | (see sibling SHA256.txt / report) |
| qa/scratch/breeds-drift-cases/m5-save-cases-DRAFT.md.pre-drift | pre-edit backup | — |
| qa/scratch/breeds-drift-cases/HANDOFF.md | this file | — |

## Could not turn into a stronger save-bytes case

- **D5** is a balance-validate guard, not a save-field sanitise. Filed anyway per HoQA scope (D1–D6 into breeds cases); runnable as validateBalance / static grep.
- **D6** has no emitter at f20b9183 (hatch_started / breed_revealed NOT-FOUND). Case is schema-literal + validateEvent against synthetic rarity values; full wire round-trip waits on the breeds telemetry emitters.
- No audit item was dropped.

## Not done / next

- No probes run (write-only pass).
- #117 first bar still queued until Engineering merge-forward tip after #118.
- Report case IDs + sha256 to HoQA.
