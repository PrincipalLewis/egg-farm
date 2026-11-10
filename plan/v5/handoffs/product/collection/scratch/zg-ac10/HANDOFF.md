# HANDOFF — HoP/PMC-rev15-ZG item (2) ZG-AC10 · 2026-11-09 23:56 CET

**TASK HoP/PMC-rev15-ZG item (2):** ZG-AC10 tab-switch cancel wording. Paper only.

## Restart guard (standing rule 23)
- Owner = PMC; write scope = `product/collection/` + PMC status line in `product/status.md`.
- Place of record: **live spec revision to v0.3.8** (not the flag-namespace errata). Errata v0.3.8 header already said the next spec rev absorbs it as v0.3.8; D-COL-29 said "Fold into the next spec rev as a ZG-AC10 tab-switch case." Errata scope is naming-only, so AC behaviour does not belong there.
- Do not touch: `product/m5-gate-acs.md` (report cite drift only), `product/decisions.md`, code/CSV/harness, messages, telemetry, streak hold.

## Sources (settled — no invented semantics)
- **D-COL-2026-10-30-29** (`product/decisions.md` L2108–2111): (a) tab switch / hiding re-render = outside tap → one `cancel`; every open ends in one confirm or one cancel; (b) unaffordable = no strip/no event (already §6/E11). "Fold into the next spec rev as a ZG-AC10 tab-switch case."
- **D-HOE-35** (`engineering/decisions.md` L532): adopts D-COL-29; re-tap / tab switch / hiding re-render / panel closing → one cancel.
- Status TODO 14:24 CET: "add tab-switch case to ZG-AC10."
- Errata `m5.1-zero-gain-purchase-ui-errata-v0.3.8.md` rev. 2 `4cfe6895`: absorb as v0.3.8 (E-1/E-2/E-3 paths).

## Done
- Frozen predecessor v0.3.7: `m5.1-zero-gain-purchase-ui.f86de04e.md`
- Live + frozen v0.3.8: `m5.1-zero-gain-purchase-ui.md` / `m5.1-zero-gain-purchase-ui.8fd4f610.md`
- Diff: `product/collection/scratch/zg-ac10/zg-ac10.diff`
- Errata file left at `4cfe6895` (historical for the v0.3.7+errata build set; not stacked on v0.3.8)
- Status line appended

## Pins
| Version | sha1 | sha256 | file |
|---|---|---|---|
| pred v0.3.7 | `f86de04e0638e3019f81b1e829321c65ff8f4f98` | (unchanged frozen) | `…ui.f86de04e.md` |
| new v0.3.8 | `8fd4f6108bd8d5331f1f5ed36b7e6fa7170fe9ee` | `5ff471233415a7053f50a888974a4607002e4f4087567d00f5677fb48d14ca8b` | live + `…ui.8fd4f610.md` |
| errata rev.2 (unchanged) | `4cfe68953995749b442504dd32e1ea6f5765ddb9` | — | live + `.4cfe6895.md` |

## Gate-card (OUT OF SCOPE — report only)
`product/m5-gate-acs.md` still cites spec v0.3.7 `f86de04e` + errata rev. 2 `4cfe6895` (e.g. L224–226, L246) and ZGU-AC6 → ZG-AC10. Needs HoP/owner re-cite to v0.3.8 `8fd4f610` (errata absorbed; tab-switch now in ZG-AC10). **Not edited here.**

## Remaining
1. HoQA re-check of v0.3.8 / ZG-AC10.
2. HoE manifest / gate re-pin when ready.
3. Item (1) telemetry rev.15 already landed separately.
