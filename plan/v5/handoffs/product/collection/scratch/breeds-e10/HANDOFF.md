# HANDOFF — HoP breeds E10/Q6/Q7 fold · 2026-11-10 00:02 CET

**TASK:** next breeds spec rev covering E10/Q6/Q7 (+ queued save_migrated / strings / hatch wording). Paper only.

## Restart guard (standing rule 23)
- Owner = **PM, Collection** (header of `product/m5.1-breeds-spec.md`); write scope = that live file + its frozen copy under `product/`, scratch under `product/collection/scratch/breeds-e10/`, PMC status line in `product/status.md`.
- Matching context re-read: D-COL-2026-10-30-11/16/17/18; D-HOE-19/-21/-25; `product/collection/v5-save-shapes.md` FINAL; PMC status 13:10/13:22; sibling HANDOFFs `scratch/rev15/HANDOFF.md`, `scratch/zg-ac10/HANDOFF.md` (no owner/scope conflict). No mismatch — proceeded.
- Do not touch: **BR-R5** (D-HOP-2026-11-05-13; left byte-identical), `product/m5-gate-acs.md` (report cite drift only), `product/decisions.md`, code/CSV/harness, messages, other specs.

## Settled sources applied
| Item | Ruling | Where folded |
|---|---|---|
| E10 runtime-null + keep-raw + roundtrip | D-COL-11; SHAPES L15; PMC 13:22 E10-only no event; D-COL-16 OQ-6 E12-over-E10 locked | E10 row; BR-AC26 |
| Q6 remainingMs non-finite → 60000 | D-COL-11; SHAPES L16 | E12 |
| Q7 freeHatchUsed / pity / rng (+ hatches→0) | D-COL-11; D-COL-18/D-HOE-21 (missing→0, present-invalid→1); SHAPES L18–21; PMC 13:22 | E12 |
| OQ-4/5/8 owned/slots/costCents | D-COL-17; SHAPES | E12 |
| save_migrated reason + extras | D-HOE-21/-25 N-5/OQ-13; errata supersedes "no reason key" | §8; BR-AC26; E12 |
| Creation = first flag-on tick | D-HOE-19 / D-HOE-14 Q2; SHAPES | §6 Migration |
| hatchEstimate incomes $/s | PMC status 13:22 | BR-AC31e |
| breed_id / rarity enum strings | telemetry errata row #15 / open "listed in breeds next rev"; values from §4.3 | §8 `hatch_started` |
| Stale `game.ts:246` → `:255` | SHAPES L40; D-COL-17 | BR-AC26; §8 |

## Done
- Frozen predecessor rev. 3.8.8: `product/m5.1-breeds-spec.254acea3.md`
- Live + frozen rev. 3.8.9: `product/m5.1-breeds-spec.md` / `product/m5.1-breeds-spec.ea922eb8.md` (byte-identical)
- Scratch pre copy: `product/collection/scratch/breeds-e10/m5.1-breeds-spec.pre-e10.md` (= pred)
- Diff: `product/collection/scratch/breeds-e10/breeds-e10.diff`
- Status line appended

## Pins
| Version | sha1 | sha256 | file |
|---|---|---|---|
| pred rev. 3.8.8 | `254acea385a64ad6fc1ba14a1d37dc15df1a1151` | `b648a2570fc91eec3664fe5204fe0766bb55da38bd2ed65854eba3d56eef7e9d` | `m5.1-breeds-spec.254acea3.md` |
| new rev. 3.8.9 | `ea922eb8574740f15c1998cf534689d1259c12a7` | `ec8fb0206d18432a4a78f15a911528f5ef528ea8cc043ecb153c9ba0360ae8e1` | live + `m5.1-breeds-spec.ea922eb8.md` |

## BR-R5
**Unchanged** (verified byte-identical to pred). planRef = `Math.round(incomePerSec(neutral(s), b, {assumeWorking:true}) × 100)` stands; D-HOP-2026-11-05-13 cited in changelog/sources only — no body edit.

## Open / not invented
1. None for E10/Q6/Q7/D-COL-16..18/D-HOE-21/-25 paper fold — all applied from written rulings.
2. Saves code-header cite still saying rev 3.8.6 (SHAPES catch-up) — **owner Saves** (code comment; out of paper scope).
3. hatchEstimate "lands in PR B" — build status, not a spec open.

## Gate-card (OUT OF SCOPE — report only)
`product/m5-gate-acs.md` still cites breeds v0.2 rev. 3.8.8 sha1 `254acea3…` (e.g. L122 Spec pin; L659 §8 L687–698). Needs HoP/owner re-cite to rev. 3.8.9 `ea922eb8` (and §8 line numbers shifted). **Not edited here.**

## Remaining
1. HoQA re-check of rev. 3.8.9 / BR-AC26 / E10–E12 / §8.
2. Gate-acs + any manifest re-pin when HoP routes.
3. Saves follows paper in #95 follow-up / code comments.
