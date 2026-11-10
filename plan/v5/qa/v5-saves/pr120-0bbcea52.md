# Saves QA: #120 breeds 3.8.9 re-cite, first exact-head bar @ 0bbcea52 (hoqa/pr120-firstbar)

TASK hoqa/pr120-firstbar: full exact-head Saves QA bar for #120 (breeds re-cite to rev 3.8.9 ea922eb8) at `0bbcea5277a7be7f8e8d4303b7aac49e0dc04a7e`.
Date: 2026-11-10 00:20 – 00:37 CET (Europe/Belgrade). Write scope: `qa/v5-saves/pr120-0bbcea52.md`, evidence `qa/v5-saves/evidence/pr120-0bbcea52/`, scratch `qa/scratch/pr120-0bbcea52/` (HANDOFF.md). Nothing merged, pushed, or tagged. Evidence cites **0bbcea52** only.

## Recommendation: **OPEN** (local PASS; hosted one-shot still in_progress). Saves QA gives **no merge GO**.

Local identity, cite-only src proof, tsc, full vitest, flag-0 goldens, build, and the breeds-state AC mapping all **PASS**. Hosted ci / pacing / k10 were all `in_progress` at the mandatory one-shot read (no poll loops) → item 7 **OPEN**. Train is **#111 → #118 → #120 → #117**; #120 will need a merge-forward after #118 with a re-check at that tip. HoQA issues any settle / GO.

## Identity (evidence: identity.txt)

- `git ls-remote origin refs/pull/120/head` = **0bbcea5277a7be7f8e8d4303b7aac49e0dc04a7e** (00:22 CET). GitHub pull #120 `head.sha` = same; base `rc/v5` @ `f20b91839fdf09ba0ed45a890281ccbf7bf2909d`; open, not draft, mergeable=true, mergeable_state `unstable` (hosted settling). Not merged. Title: "Saves: breeds re-cite to rev 3.8.9 ea922eb8 (HoE/breeds-recite-389)".
- Tip subject: `docs(breeds): re-cite spec to v0.2 rev 3.8.9 ea922eb8 + Q6/E10 tests`.
- **Single parent:** `f20b91839fdf09ba0ed45a890281ccbf7bf2909d` (= `origin/rc/v5` at the look; ls-remote confirmed still f20b9183).
- Tree tip = `9ad161ed2bf597fff013774839d933eb7021b828`; parent tree = `891f1f93f98dc786ac586487c91b795ad8cf8d4f`.
- Diff vs `origin/rc/v5` f20b9183: **3 files, +24/−5**, M only, no reverts:
  - `src/config/breeds.ts` (M, +2/−2)
  - `src/sim/breeds.ts` (M, +1/−1)
  - `tests/v5-breeds-state.test.ts` (M, +21/−2)
- Shipping data / golden pins empty vs rc/v5: `data/`, `public/`, `src/config/balance.json`, `src/config/flags.ts`, `engineering/golden/` (golden-pins-identity.txt). Shipping `m4.flags.breeds = 0` (all M5 flags 0).
- Worktree: `qa/scratch/pr120-0bbcea52/wt` (game object-store worktree, detached at tip, `git status` clean). `node_modules` symlink from QA donor `qa/scratch/goldens-111-cf55d44/wt/node_modules`. package-lock.json byte-identical: tip sha256 `56569550486f3450a31b435e94b807a7dc95d1e7ee7d3e9d5e09606e0ff6f75e` = donor.

## Cite-only proof (item 2) — **PASS**

Exact src hunks (src-hunks.diff): only comment / JSDoc lines changed in the two src files (3.8.6→3.8.9 / 13d5255e→ea922eb8; sanitise-event cite note). `git diff -w` still shows those comment lines (whitespace-insensitive does not erase them). Line class: **0 non-comment changed lines** (src-changed-line-class.txt).

TypeScript `transpileModule` with `removeComments: true` (cite-proof-summary.txt):
- `breeds.config`: removeComments JS byte-identical = **YES** (1418 B both)
- `breeds.sim`: removeComments JS byte-identical = **YES** (5492 B both)
- **VERDICT_SRC_CITE_ONLY=PASS** — no behaviour-bearing token change in either src file. (Test file changes are intentional new/renamed coverage, not part of the cite-only claim.)

## Bar results

| # | check | result | evidence |
|---|---|---|---|
| 1 | Identity (ls-remote + GitHub) + single parent rc/v5 f20b9183 + 3-file M diff, no reverts | **PASS** | identity.txt |
| 2 | Two src changes cite/comment-only (hunks + removeComments JS byte-identical) | **PASS** | src-hunks.diff, cite-proof-summary.txt, src-changed-line-class.txt |
| 3 | `tsc --noEmit` | **PASS** EXIT=0 | tsc.txt |
| 4 | Full default vitest (1 worker, flock, nice 10) | **PASS** 155 files; **2277 passed \| 1 skipped (2278)**, 0 failed; 309 s | vitest-full.txt |
| 5 | Flag-0 goldens/parity | **PASS 7/7** (4 files): GOLDEN1 flag-off `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544`, m4on `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5` (same as prior bars / rc/v5 f20b9183); m4a-flag-off 2/2; zg-flagoff-dom 1/1. All 4 test blobs + shipping balance/economy/flags identical to rc/v5 | vitest-flagoff-golden.txt, golden-pins-identity.txt |
| 6 | `npm run build` + check-release-build | **PASS** EXIT=0; **`check-release-build: m4.1+0bbcea5 ok`** (no +dirty); build-id match re-check ok; dist/index.html carries `m4.1+0bbcea5` | build.txt |
| 7 | Hosted runs at headSha 0bbcea52 (one-shot) | **OPEN** — ci 42719317192, pacing 42719317458, k10 42719317403 all `in_progress` / conclusion null at 00:22 CET one-shot; no poll | hosted-oneshot.txt |
| 8 | New/changed BR-AC26 / E10 / Q6 / E12 tests mapped to spec ea922eb8; breeds-state alone | **PASS** file 40/40; mapping below | vitest-breeds-state.txt, spec-identity.txt, breeds-ac-test-index.txt |

## Spec identity (item 8)

- Frozen `product/m5.1-breeds-spec.ea922eb8.md` sha1 = **`ea922eb8574740f15c1998cf534689d1259c12a7`** (= live `product/m5.1-breeds-spec.md`).
- Status line: **v0.2 rev. 3.8.9**. Changelog §0 records the E10 / Q6 / E12 / BR-AC26 fold (2026-11-10 00:02 CET).

### New/changed tests → acceptance criteria

| test name (tip) | maps to | quoted AC / clause (ea922eb8) |
|---|---|---|
| `[BR-AC26 E10] F14 unknown slot id: null at runtime, save-roundtrip keeps raw "silkie", no save_migrated` *(renamed from PMC Q5 title)* | BR-AC26 E10 save-roundtrip + E10 | BR-AC26: "Given F14 (`bc_slot2_farm`) with `slots: ["leghorn","silkie",null]` … runtime `slots[1]` is null … save-roundtrip keeps `slots[1]` = `"silkie"`, and **no** `save_migrated`". E10: unlocked unknown slot null at runtime; raw written back; E10-only → no event. |
| `[BR-AC26 E10] owned-only unknown id (clean slots): kept ignored, no save_migrated` *(new)* | E10 owned + E10-only no event | E10: "**Owned:** kept in the save untouched and ignored"; "An **E10-only** load … logs **no** `save_migrated`". |
| `[BR-AC26 Q6] remainingMs %s -> 60,000 (non-number), one save_migrated` *(new; cases undefined / object)* | Q6 / E12 incubator | E12/Q6: "`remainingMs` NaN / ±Inf / null / **non-number** → **60,000**"; exactly one `save_migrated`. |
| `[BR-AC26 Q6] finite fractional remainingMs is rounded then clamped` *(new)* | Q6 finite path | E12/Q6: "finite → clamp to [0, `bc_hatch_time_s`×1000] and **round to int**". |
| `[BR-AC26 E12 OQ-4] non-string slot entry becomes null, one save_migrated` *(new)* | E12 OQ-4 slots | E12: "Slots: … **non-string / non-null entries → null** (OQ-4)"; one sanitise event. |

Pre-existing BR-AC26 / E12 / Q6 coverage in the same file (unchanged body; still pass under the re-cite) includes the stars/dup/silkie BR-AC26 case, E12 duplicate / incubator / locked-slot repairs, E10 overwrite (PMC Q5), and the `it.each` non-finite Q6 cases. Alone: **40 passed / 0 failed**.

## Hosted runs (exact tip 0bbcea52) — one-shot 00:22 CET

| workflow | run id | status @ one-shot | conclusion | notes |
|---|---|---|---|---|
| ci (gate) | [42719317192](https://github.com/PrincipalLewis/egg-farm/actions/runs/42719317192) | **in_progress** | null | gate job 129508923300 in_progress (Unit tests step); Chromium release-globals pending. **OPEN** |
| pacing-x1-stack | [42719317458](https://github.com/PrincipalLewis/egg-farm/actions/runs/42719317458) | **in_progress** | null | shards optimal/seller15/casual all in_progress; aggregate not yet on page. **OPEN** |
| k10-breeds-offset | [42719317403](https://github.com/PrincipalLewis/egg-farm/actions/runs/42719317403) | **in_progress** | null | job 129508922143 in_progress (KNOWN-RED monitor, non-required, D-HOP-2026-10-30-52/53). Report actual conclusion on settle; do not reinterpret. **OPEN** |

No second look in this bar (TASK: one-shot, no poll).

## Not run / limits

- Hosted settle not taken here (OPEN). A later one-shot can close item 7.
- No browser serve (ports 5961–5964 unused).
- #117 still queued until its merge-forward tip after #120.
- Saves QA issues **no merge GO**. Train note: #120 needs mergefwd after #118 + re-check at that tip.

## Hosted settle (TASK HoQA/TRAIN-RESUME-S step 1) — 2026-11-10 03:01 CET

One-shot final read (no poll, no re-run). Head still **0bbcea5277a7be7f8e8d4303b7aac49e0dc04a7e**. Evidence: `qa/v5-saves/evidence/train-resume-hosted/`.

| workflow | run id | status | conclusion | verdict |
|---|---|---|---|---|
| ci (gate) | [42719317192](https://github.com/PrincipalLewis/egg-farm/actions/runs/42719317192) | completed | success | **SUCCESS** (gate success; release-globals skipped) |
| pacing-x1-stack | [42719317458](https://github.com/PrincipalLewis/egg-farm/actions/runs/42719317458) | completed | failure | **SUCCESS** — shards seller15/casual/optimal all success; aggregate FAIL only row 904 NOT-WIRED (optimal+seller15+casual). WARN L897 only (non-FAIL). |
| k10-breeds-offset | [42719317403](https://github.com/PrincipalLewis/egg-farm/actions/runs/42719317403) | completed | failure | known-red, non-blocking (job 129508922143 failed at K10 trigger + 200-seed offset test) |

Item 7 hosted is now **SUCCESS** (k10 does not block). Saves QA still issues **no merge GO**.
