# Saves QA: #124 breeds drift D1–D6, exact-head bar @ baf410ff (hoqa/pr124-bar)

TASK hoqa/pr124-bar: one exact-head Saves QA bar for #124 (Saves breeds drift D1–D6) at `baf410fff30cb6a66e8565693f84ade2250719c2`.
Date: 2026-11-10 00:50 – 01:05 CET (Europe/Belgrade). Write scope: `qa/v5-saves/pr124-baf410ff.md`, evidence `qa/v5-saves/evidence/pr124-baf410ff/`, scratch `qa/scratch/pr124-baf410ff/` (HANDOFF.md). Nothing merged, pushed, or tagged. Evidence cites **baf410ff** only. Did **not** edit `m5-save-cases-DRAFT.md`.

## Recommendation: **OPEN** (local PASS; hosted one-shot still in_progress/queued). Saves QA gives **no merge GO**.

Local identity, events.ts save_migrated-only scope, tsc, full vitest, flag-0 goldens, build, and all 10 G2b cases **PASS** (graded against gate sha1 `e485f762`). Hosted ci / pacing / k10 were `in_progress` or `queued` at the mandatory one-shot read (no poll) → item 8 **OPEN**. Slotted right after #120 (QA-D-1110-PR124-SLOT / QA-D-1110-PR124-CRIT). Train **#111 → #118 → #120 → #124 → #117**; if barred before #120 merges, needs a clean merge-forward onto #120's merge tip (hosted only). #117 stays held. HoQA issues any settle / GO.

## Identity (evidence: identity.txt)

- `git ls-remote origin refs/pull/124/head` = **baf410fff30cb6a66e8565693f84ade2250719c2** (00:51 CET). GitHub pull #124 `head.sha` = same; base `rc/v5` @ `f20b91839fdf09ba0ed45a890281ccbf7bf2909d`; open, not draft, mergeable=true, mergeable_state `unstable` (hosted settling). Not merged. Title: "Saves: breeds drift D2–D6 (HoE/breeds-drift-d1-d6; stacks on #120)".
- Tip subject: `fix(breeds): D1 full save_migrated shape (events.ts + schema-validated)`.
- **Single parent:** `3354fc7d6316d14af517ec046846ca104028ea96` (claimed; verified).
- Stack: `3354fc7` parent = `0bbcea5277a7be7f8e8d4303b7aac49e0dc04a7e` (#120). Ancestry contains **0bbcea52**: YES.
- Tree tip = `66f69ef648a0c8ace81a93205c11cb29844ba279`.
- Diff vs `0bbcea52` (#124-only delta): **7 files, +137/−25**, M only, no reverts:
  - `src/config/balance.ts` (M, +1)
  - `src/config/breeds.ts` (M)
  - `src/sim/breeds.ts` (M)
  - `src/sim/events.ts` (M, +1/−1 — save_migrated line only)
  - `src/telemetry/schema.ts` (M, +1/−1 — RARITY enum)
  - `tests/telemetry-schema.test.ts` (M)
  - `tests/v5-breeds-state.test.ts` (M)
- Diff vs `origin/rc/v5` f20b9183: **7 files, +159/−28** (includes #120 recite delta). Log vs 0bbcea52: `baf410f` then `3354fc7`. No revert commits.
- Shipping flags / golden pins vs 0bbcea52: `src/config/flags.ts`, `src/config/balance.json`, golden test blobs (`tests/m4a-flag-off.test.ts`, `tests/zg-flagoff-dom.test.ts`, golden persist/rewards/spawn) **identical**. Shipping `m4.flags.breeds = 0` (all M5 flags 0). `src/config/balance.ts` **changed** (D5 `1000 % tickHz` guard only — not a shipping flag flip).
- Worktree: `qa/scratch/pr124-baf410ff/wt` (game object-store worktree, detached at tip, `git status` clean for bar runs). `node_modules` symlink from QA donor `qa/scratch/goldens-111-cf55d44/wt/node_modules`. package-lock.json byte-identical: tip sha256 see evidence/report.sha256see evidence/report.sha256 see evidence/report.sha256= donor.

## events.ts scope (item 2) — **PASS**

Exact hunk vs 0bbcea52 (events-ts-hunk.diff): **one line** in `src/sim/events.ts` — the `save_migrated` SimEvent union arm widened with `reason: 'invalid_root' | 'invalid_values'; refund_cents: number; farm_level: number; backup_stores: []` (+ D1 cite in comment). Neighbouring arms untouched. **VERDICT_EVENTS_TS_SAVE_MIGRATED_ONLY=PASS** (Saves' claim verified).

## Gate e485f762 identity

- File: `product/m5-gate-acs.md`
- sha1: **`e485f7624b9760a0b8a54b2472dd2b955b20077e`** (sha1sum match YES; D-HOP-2026-11-10-09 / QA decisions pin of record).
- Cases draft: `qa/v5-saves/m5-save-cases-DRAFT.md` sha256 see evidence/report.sha256see evidence/report.sha256 see evidence/report.sha256(prefix 12fe2924 verified; not edited this bar).

## Bar results

| # | check | result | evidence |
|---|---|---|---|
| 1 | Identity (ls-remote + GitHub) + parent 3354fc7 + ancestry 0bbcea52 + 7-file M diff, no reverts | **PASS** | identity.txt |
| 2 | events.ts change limited to save_migrated line | **PASS** | events-ts-hunk.diff, events-ts-verdict.txt |
| 3 | `tsc --noEmit` | **PASS** EXIT=0 | tsc.txt |
| 4 | Full default vitest (1 worker, flock, nice 10) | **PASS** 155 files; **2291 passed \| 1 skipped (2292)**, 0 failed; ~261 s | vitest-full.txt |
| 5 | Flag-0 goldens/parity | **PASS 7/7** (4 files): GOLDEN1 flag-off `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544`, m4on `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5` (same as #120 / rc/v5); m4a-flag-off + zg-flagoff-dom included. Golden test blobs + shipping balance.json/flags identical to 0bbcea52 | vitest-flagoff-golden.txt, golden-pins-identity.txt |
| 6 | `npm run build` + check-release-build | **PASS** EXIT=0; **`check-release-build: m4.1+baf410f ok`** (no +dirty); build-id match re-check ok; dist/index.html carries `m4.1+baf410f` | build.txt |
| 7 | G2b cases (10 IDs) vs gate e485f762 | **PASS** all 10 (table below) | vitest-g2b-probe.txt, vitest-d1d6-tip.txt, static-d5-d6-and-stack.txt, contamination-note.txt |
| 8 | Hosted runs at headSha baf410ff (one-shot) | **OPEN** — ci 42723343775 in_progress; pacing 42723343747 in_progress/queued; k10 42723343855 in_progress; no poll | hosted-oneshot.txt |

## G2b case results (expected PASS at baf410ff; were expected-FAIL at f20b9183)

Throwaway probe: `qa/scratch/pr124-baf410ff/_qa_g2b_pr124_probe.test.ts` (never committed; breeds flag=1). Tip D1–D6 suites also run (`vitest-d1d6-tip.txt`: **14 passed**). Probe D6 breed_revealed fixture used wrong fields (`duplicate`/`missing offline`) → probe EXIT=1 on that one assertion only; product D6 covered by tip `telemetry-schema` D6 test (PASS). Contaminated first full/build with probe in-tree noted in contamination-note.txt; clean re-run of vitest-full + build only after probe removed.

| case ID | severity | result | evidence |
|---|---|---|---|
| M5S-BR-D1-TEL-VALIDATE | MAJOR | **PASS** | probe + tip `[D1 / BR-AC26] … schema-validates` |
| M5S-BR-D2-ROOT-NULL | CRITICAL | **PASS** | probe it.each null; tip D2 root null |
| M5S-BR-D2-ROOT-ARRAY | CRITICAL | **PASS** | probe it.each []; tip D2 |
| M5S-BR-D2-ROOT-NUMBER | CRITICAL | **PASS** | probe it.each 5; tip D2 |
| M5S-BR-D2-ROOT-STRING | CRITICAL | **PASS** | probe it.each "x"; tip D2 |
| M5S-BR-D2-TICK-NOTHROW | CRITICAL | **PASS** | probe explicit tick after sanitize for all 4 roots; tip `one step does not throw` |
| M5S-BR-D3-SHAPE-REPAIRS | MINOR | **PASS** | probe owned/slots/costCents/freeHatchUsed; tip D3×4 |
| M5S-BR-D4-LOCKED-NORAW | MINOR | **PASS** | probe sanitize slots; tip D4 boot+save drops raw |
| M5S-BR-D5-TICKHZ-MOD | MINOR | **PASS** | probe validateBalance tickHz 3 throws / 10 passes; static `balance.ts:31` `1000 % b.tickHz` |
| M5S-BR-D6-RARITY-ENUM | MINOR | **PASS** | tip `[D6 / BR §8] rarity accepts Common\|Rare\|Epic\|Legendary and rejects C/R/E/L`; schema hunk RARITY = E('Common',…) |

## Hosted runs (exact tip baf410ff) — one-shot ~00:51 CET

| workflow | run id | status @ one-shot | conclusion | notes |
|---|---|---|---|---|
| ci (gate) | [42723343775](https://github.com/PrincipalLewis/egg-farm/actions/runs/42723343775) | **in_progress** | null | gate job 129522695341 in_progress (Unit tests); Chromium release-globals pending. **OPEN** |
| pacing-x1-stack | [42723343747](https://github.com/PrincipalLewis/egg-farm/actions/runs/42723343747) | **queued/in_progress** | null | casual+seller15 in_progress, optimal queued; aggregate not yet. **OPEN** |
| k10-breeds-offset | [42723343855](https://github.com/PrincipalLewis/egg-farm/actions/runs/42723343855) | **in_progress** | null | KNOWN-RED monitor, non-required. Report conclusion on settle; do not reinterpret. **OPEN** |

No second look in this bar (TASK: one-shot, no poll).

## Not run / limits

- Hosted settle not taken here (OPEN). A later one-shot can close item 8.
- No browser serve (ports 5961–5964 unused).
- Did not redo #120 cite-only proof / BR-AC26/E10/Q6/E12 mapping (#120 local bar accepted QA-D-1110-PR120-BAR1).
- #117 still held until after #124 / its merge-forward tip.
- Saves QA issues **no merge GO**. May need mergefwd onto #120 merge tip + re-check (hosted only) if #120 lands first.

## Suggested text for Head of QA

> #124 @ baf410ff Saves QA bar: local **PASS**; hosted **OPEN** (one-shot). events.ts = save_migrated line only (PASS). G2b D1–D6 all **PASS** at tip (gate e485f762; cases draft 12fe2924…). tsc 0; vitest 2291 passed / 0 failed; goldens flag-off f90d1678 / m4on a54c9cf9; build `m4.1+baf410f` no dirty. Report `qa/v5-saves/pr124-baf410ff.md`. No merge GO from Saves QA. #117 stays held.

## Hosted settle (TASK HoQA/TRAIN-RESUME-S step 1) — 2026-11-10 03:01 CET

One-shot final read of **pacing only** (the named run; ci/k10 not re-read). Evidence: `qa/v5-saves/evidence/train-resume-hosted/`.

| workflow | run id | status | conclusion | verdict |
|---|---|---|---|---|
| pacing-x1-stack | [42723343747](https://github.com/PrincipalLewis/egg-farm/actions/runs/42723343747) @ baf410fff30cb6a66e8565693f84ade2250719c2 | completed | failure | **SUCCESS** — shards seller15/casual/optimal all success; aggregate (job 129543789051) FAIL only row 904 NOT-WIRED (optimal+seller15+casual). WARN L897 only (non-FAIL). Finished 01:38:01 CET. |

ci 42723343775 and k10 42723343855 were not part of this read. Saves QA still issues **no merge GO**.
