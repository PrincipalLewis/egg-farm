# HANDOFF — PMC/MRINTERP2-errata · 2026-11-05 22:37 CET

**TASK PMC/MRINTERP2-errata:** amend Collection V-2d (1) to definition (a) only.

## Restart guard (standing rule 23)
- Task line owner = PMC; write scope = `product/collection/` errata/spec history + PMC own status.
- No pre-existing PMC-owned HANDOFF for this task id. Matching stream HANDOFF read: `product/scratch/mrinterp2-log/HANDOFF.md` (HoP; decision D-HOP-12 logged; next = this errata). No owner/scope mismatch vs task line.
- Do not touch: streak held/cap rewrite, golden, BR-R5, `product/decisions.md`, harness/CSV/code/build, activation/re-screen/publication, messages.

## Done
- Sources verified:
  - QA-D-1105-MRINTERP2 `qa/m5/interp-mr-accounting-v2.md` sha256 `2a5211029a63d64b5ace5391544702b55640a92fd82eea1f82e2f499be631a68` (§2 / §2.2)
  - D-HOP-2026-11-05-12 in `product/decisions.md` (read-only)
  - D-ECON-20261105-MRINTERP2 `scratch/post-l10/cycle-MR-accounting-audit/D-ECON-20261105-MRINTERP2.md` sha256 `36c01a4b33121a6f7e415d7b57c4a85defe87b40942a8a27c8bf276265e83df1`
- Errata rev. 14 landed:
  - live `product/collection/telemetry-spec-errata-v5.md`
  - frozen `product/collection/telemetry-spec-errata-v5.aa9e80fa.md`
  - predecessor frozen preserved `product/collection/telemetry-spec-errata-v5.a0e8f6d7.md`
- Status line appended in `product/status.md`.
- Diff archive: `product/collection/scratch/mrinterp2-errata/rev14.diff`

## Pins
| Version | sha1 | sha256 | file |
|---|---|---|---|
| predecessor rev. 13 | `a0e8f6d7085939756021856c25429a55d8a8d847` | `bc5d9ba1dd60b4f599af8ef95ac3227afc915e9343de4c02a6855b06422bcebe` | `telemetry-spec-errata-v5.a0e8f6d7.md` |
| new rev. 14 | `aa9e80faa7428b782a3a4df8d451e20946aca8b8` | `d836f1184153fccb50c49fa0fabd3d998a01f73c5a7ffc343df54ea39406ed2f` | live + `telemetry-spec-errata-v5.aa9e80fa.md` |

## Remaining (not this task)
1. HoQA exact before/after diff review + pins.
2. Economy harness amendment in `scratch/post-l10/cand/tools` implementing QA v2 §2.1.
3. HoQA harness-diff review.
4. Official re-screen of unchanged R04 `d1cff5ac…` (200×3 flags-off, then flags-on G4).
