# Saves QA: #126 prB commit 0 familyClamp/familyActiveBp, exact-head bar @ d4b5fdcd (hoqa/pr126-bar)

TASK hoqa/pr126-bar: one exact-head Saves QA bar for #126 (Saves prB commit 0: familyClamp/familyActiveBp getters and bc() keys) at `d4b5fdcd7e45a5c3b5d0062cf2a3a982bf9e74a9`.
Date: 2026-11-10 01:12 – 01:22 CET (Europe/Belgrade). Write scope: `qa/v5-saves/pr126-d4b5fdcd.md`, evidence `qa/v5-saves/evidence/pr126-d4b5fdcd/`, scratch `qa/scratch/pr126-d4b5fdcd/` (HANDOFF.md). Nothing merged, pushed, or tagged. Evidence cites **d4b5fdcd** only. Did **not** edit `m5-save-cases-DRAFT.md`.

## Recommendation: **OPEN** (local PASS with notes; hosted one-shot still in_progress). Saves QA gives **no merge GO**.

Local identity, scope (getters + bc keys), tsc, full vitest 0 failed, flag-0 goldens, build `m4.1+d4b5fdc`, gate e485f762 AC mapping (BR-AC18/E8/E9/§4.3 + G2b 10/10) **PASS**. Hosted ci / pacing / k10 were `in_progress` at the mandatory one-shot read (no poll) → item 8 **OPEN**. Train slot: **right after #124**. #117 stays held. HoQA issues any settle / GO.

## Identity (evidence: identity.txt)

- `git ls-remote origin refs/pull/126/head` = **d4b5fdcd7e45a5c3b5d0062cf2a3a982bf9e74a9** (01:12 CET). GitHub pull #126 `head.sha` = same; base `rc/v5` @ `f20b91839fdf09ba0ed45a890281ccbf7bf2909d`; open, not draft, mergeable=true, mergeable_state `unstable` (hosted settling). Not merged. Title: "feat(breeds): familyClamp + familyActiveBp (prB commit 0)".
- Tip subject: `WIP: feat(breeds): familyClamp + familyActiveBp (prB commit 0)`.
- **Single parent:** `baf410fff30cb6a66e8565693f84ade2250719c2` (#124 tip).
- Stack: **NOT** based directly on current `origin/rc/v5` (parent ≠ f20b9183). **Stacked on #124** `baf410ff` (which itself stacks on #120 `0bbcea52`). Ancestry contains **baf410ff**: YES; **0bbcea52**: YES.
- `origin/rc/v5` now: **f20b91839fdf09ba0ed45a890281ccbf7bf2909d**.
- Tree tip = `f6ea41375a918dc1090d9fc51688a20894de6042`.
- Diff vs `baf410ff` (#126-only delta): **4 files, +166/−0**, A/M only, no reverts:
  - `engineering/status.md` (M, +5 — eng diary)
  - `src/config/breeds.ts` (M, +8 — BC_SPEC_DEFAULTS clamp keys)
  - `src/sim/breeds-family.ts` (A, +57 — familyClamp/familyActiveBp)
  - `tests/v5-breeds-family-caps.test.ts` (A, +96)
- Diff vs `origin/rc/v5` f20b9183: **10 files, +325/−28** (includes #120+#124 deltas). Log vs baf410ff: `d4b5fdc` only. No revert commits.
- Shipping flags / golden pins vs baf410ff: `src/config/flags.ts`, `src/config/balance.json` **identical**. Shipping `m4.flags.breeds = 0`. Golden test blobs unchanged vs baf410ff.
- Worktree: `qa/scratch/pr126-d4b5fdcd/wt` (game object-store worktree, detached at tip). `node_modules` symlink from QA donor `qa/scratch/pr124-baf410ff/wt/node_modules`. package-lock.json byte-identical: tip sha256 `56569550486f3450a31b435e94b807a7dc95d1e7ee7d3e9d5e09606e0ff6f75e` = donor.

## Scope (item 2) — **PASS**

Exact hunks vs baf410ff (scope-hunks.diff / scope-verdict.txt):
- `src/config/breeds.ts`: adds `lay_cap_bp_lt18:700`, `lay_cap_bp:1500`, `lay_cap_farm:18`, `away_cap_bp:3000`, `broody_cap_bp:2000` to `BC_SPEC_DEFAULTS` (bc() keys; CSV TODO RC-PIN).
- `src/sim/breeds-family.ts` **new**: `familyCapBp`, `clampFamilyBp`, `familyRawBp`, `familyActiveBp`, `familyClamp` → `{rawBp,clampedBp,atCap}`.
- `tests/v5-breeds-family-caps.test.ts` **new**: BR-AC18 / E8 / E9 / §4.3 coverage.
- `engineering/status.md`: eng log only — **not** a product behaviour change.
- **No unrelated product/sim/UI behaviour change** vs baf410ff. **VERDICT_SCOPE=PASS**.

## Gate e485f762 identity

- File: `product/m5-gate-acs.md`
- sha1: **`e485f7624b9760a0b8a54b2472dd2b955b20077e`** (sha1sum match YES).
- Cases draft: `qa/v5-saves/m5-save-cases-DRAFT.md` sha256 **`12fe292400eaf18b27d5010c86d7175fdd316a7b879cdcb5d8aa3d9e949f55a5`** (prefix 12fe2924 verified; not edited this bar).

## Bar results

| # | check | result | evidence |
|---|---|---|---|
| 1 | Identity (ls-remote + GitHub) + parent baf410ff + ancestry 0bbcea52 + stack on #124 (not direct rc/v5) + 4-file M/A diff, no reverts | **PASS** | identity.txt |
| 2 | Scope = familyClamp/familyActiveBp getters + bc() keys (status.md eng-only) | **PASS** | scope-hunks.diff, scope-verdict.txt |
| 3 | `tsc --noEmit` | **PASS** EXIT=0 | tsc.txt |
| 4 | Full default vitest (1 worker, flock, nice 10) | **PASS** 0 failed; 156 files; **2298 passed \| 1 skipped (2299)**; process EXIT=1 due to **134 uncaught** post-test TypeErrors in `tests/m41-9-ux-minors.test.ts` (`openPanel` `#p-market` null) — **not in #126 delta** vs baf410ff; #124 parent bar had 0 Errors. ~257 s | vitest-full.txt, vitest-verdict.txt |
| 5 | Flag-0 goldens/parity | **PASS** GOLDEN1 flag-off `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544`, m4on `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5`; m4a-flag-off + zg-flagoff-dom focused EXIT=0; flags/balance.json identical to baf410ff | vitest-flagoff-golden.txt, golden-verdict.txt, golden-pins-identity.txt |
| 6 | `npm run build` + check-release-build | **PASS** build EXIT=0; embedded `check-release-build: m4.1+d4b5fdc ok` (no +dirty); dist meta/`data-build-id`/`yo` = `m4.1+d4b5fdc` | build.txt, build-verdict.txt |
| 7 | Gate e485f762 ACs + G2b (head contains #124) | **PASS** (table below) | gate-ac-mapping.txt, ac-results.txt, vitest-family-and-d1d6.txt |
| 8 | Hosted runs at headSha d4b5fdcd (one-shot) | **OPEN** — pacing 42726279381 in_progress (all 3 shards in_progress, aggregate not started); ci 42726279282 in_progress; k10 42726279060 in_progress (known-red non-blocking); no poll | hosted-oneshot.txt |

## Gate AC / G2b results (item 7)

Gate Card #3 pins breeds spec **ea922eb8**. Named BRD-ACs do not list familyClamp by name; coverage is via the pinned spec AC/examples + BRD-AC1 goldens. Head parent = baf410ff → **G2b cases apply** (not skipped).

Focused tip suites: `telemetry-schema` 51 + `v5-breeds-state` 53 + `v5-breeds-family-caps` 7 = **111 passed**, EXIT=0.

| ID | severity/source | result | evidence |
|---|---|---|---|
| BR-AC18 | spec ea922eb8 (gate Card #3 pin) | **PASS** | family-caps `[BR-AC18]*` |
| E8 | spec example | **PASS** | family-caps `[E8]` / atCap |
| E9 | spec example | **PASS** | family-caps `[E9]` F17→700 / F18→1500 |
| §4.3 L365–368 bc keys | spec | **PASS** | `bc(lay_cap_bp_lt18)=700`, `lay_cap_bp=1500`, `away_cap_bp=3000`, `broody_cap_bp=2000`, `lay_cap_farm=18` |
| BRD-AC1 | gate Card #3 | **PASS** | item 5 goldens |
| M5S-BR-D1-TEL-VALIDATE | G2b MAJOR | **PASS** | tip `[D1 / BR-AC26]` |
| M5S-BR-D2-ROOT-NULL | G2b CRITICAL | **PASS** | tip D2 it.each |
| M5S-BR-D2-ROOT-ARRAY | G2b CRITICAL | **PASS** | tip D2 |
| M5S-BR-D2-ROOT-NUMBER | G2b CRITICAL | **PASS** | tip D2 |
| M5S-BR-D2-ROOT-STRING | G2b CRITICAL | **PASS** | tip D2 |
| M5S-BR-D2-TICK-NOTHROW | G2b CRITICAL | **PASS** | tip `one step does not throw` |
| M5S-BR-D3-SHAPE-REPAIRS | G2b MINOR | **PASS** | tip D3 |
| M5S-BR-D4-LOCKED-NORAW | G2b MINOR | **PASS** | tip D4 (in v5-breeds-state) |
| M5S-BR-D5-TICKHZ-MOD | G2b MINOR | **PASS** | tip D5 / balance.ts guard retained from #124 |
| M5S-BR-D6-RARITY-ENUM | G2b MINOR | **PASS** | tip telemetry-schema D6 |

## Hosted runs (exact tip d4b5fdcd) — one-shot ~01:12 CET

| workflow | run id | status @ one-shot | conclusion | notes |
|---|---|---|---|---|
| ci (gate) | [42726279282](https://github.com/PrincipalLewis/egg-farm/actions/runs/42726279282) | **in_progress** | null | **OPEN** |
| pacing-x1-stack | [42726279381](https://github.com/PrincipalLewis/egg-farm/actions/runs/42726279381) | **in_progress** | null | casual+optimal+seller15 all in_progress; aggregate not started. TASK expected shards SUCCESS + aggregate FAIL only row 904 — not yet. **OPEN** |
| k10-breeds-offset | [42726279060](https://github.com/PrincipalLewis/egg-farm/actions/runs/42726279060) | **in_progress** | null | KNOWN-RED monitor, non-required. Report conclusion on settle; do not reinterpret. **OPEN** |
| verify-smoke | 42726278976 | completed | **success** | informational |

No second look in this bar (TASK: one-shot, no poll).

## Not run / limits

- Hosted settle not taken here (OPEN). A later one-shot can close item 8.
- No browser serve (ports 5961–5964 unused).
- Vitest process EXIT=1 from unrelated uncaught UI teardown errors noted above; assertion failures = 0. No re-run (USAGE CAP).
- Wrapper also attempted `npm run check-release-build` as a separate script (missing); the real check already ran inside `npm run build` and printed `m4.1+d4b5fdc ok`.
- #117 still held until after #124/#126 train. Saves QA issues **no merge GO**.

## Suggested text for Head of QA

> #126 @ d4b5fdcd Saves QA bar: local **PASS** (notes below); hosted **OPEN** (one-shot). Stacked on #124 baf410ff (not direct rc/v5 f20b9183). Scope = familyClamp/familyActiveBp + bc() clamp keys (+ eng status.md only). Gate e485f762: BR-AC18/E8/E9/§4.3 + G2b 10/10 **PASS** (head contains #124). tsc 0; vitest **2298 passed / 0 failed** (EXIT=1 from 134 uncaught m41-9-ux-minors teardown errors, not in #126 delta); goldens flag-off f90d1678 / m4on a54c9cf9; build `m4.1+d4b5fdc` no dirty. Hosted: pacing 42726279381 / ci 42726279282 / k10 42726279060 all in_progress at one-shot. Report `qa/v5-saves/pr126-d4b5fdcd.md`. No merge GO from Saves QA. Train slot right after #124; #117 stays held.

## Hosted settle (TASK HoQA/TRAIN-RESUME-S step 1) — 2026-11-10 03:01 CET

One-shot final read of **pacing only** (the named run; ci/k10 not re-read). Evidence: `qa/v5-saves/evidence/train-resume-hosted/`.

| workflow | run id | status | conclusion | verdict |
|---|---|---|---|---|
| pacing-x1-stack | [42726279381](https://github.com/PrincipalLewis/egg-farm/actions/runs/42726279381) @ d4b5fdcd7e45a5c3b5d0062cf2a3a982bf9e74a9 | completed | failure | **SUCCESS** — shards seller15/casual/optimal all success; aggregate (job 129552240482) FAIL only row 904 NOT-WIRED (optimal+seller15+casual). WARN L897 only (non-FAIL). Finished 01:56:27 CET. |

ci 42726279282 and k10 42726279060 were not part of this read. Saves QA still issues **no merge GO**.
