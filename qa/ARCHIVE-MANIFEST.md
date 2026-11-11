# QA archive manifest

Archived 2026-11-11 (Europe/Belgrade) by Head of QA (TASK HoQA/QA-ARCHIVE), approved by Vadim Korshunov.

Source: `/workspace/egg-farm-studio/qa/` on the studio box. Files are copied byte-for-byte under `qa/` with the same relative paths (`qa/.gitattributes` disables EOL conversion). This is a docs-only archive: no product code changes.

## Totals

| | Files | Size |
|---|---:|---:|
| Included | 4708 | 37.28 MB |
| Excluded (listed in `ARCHIVE-EXCLUDED.tsv`) | 98675 | 1811.44 MB |
| Source total | 103383 | 1848.71 MB |

## What is included

Test plans, checklists, bug reports, reports, `decisions.md`, status/queue/handoff notes and other `.md`/`.txt` docs; QA scripts and probes (`.py .sh .ts .js .mjs .cjs`); small fixtures and data (`.json .csv .tsv .yaml .toml .html .diff .patch`, text only). Data files over 300 KB and any file over 1 MB are excluded.

## Exclusion rules (first match wins; reason column in the TSV)

| Reason | Rule |
|---|---|
| scratch | anything under a `scratch/` directory |
| repo-checkout(worktree) | `wt-*` dirs: git worktrees of the game repo (code already in git) |
| repo-checkout(copy) | full checkouts/copies of the game repo inside evidence dirs (have `.git` or `package.json`+`src/`), plus `csr/src-dd223f5` |
| raw-evidence-dir | `v5-saves/dryrun/*/results/` raw gate-run output (dry-run READMEs/scripts are kept) |
| junk/cache | `node_modules`, `.git`, `__pycache__`, `.cache`, `.tmp`/`tmp`, test-results, etc. |
| build-output/vendor | `dist`, `dist-html`, `build(s)`, `vendor`, `.serve`, git `merge-objects` |
| backup(.bak) | any `*.bak*` file (e.g. `decisions.md.bak-*`) |
| media | png jpg jpeg gif webp webm mp4 mp3 wav ogg ico svg fonts pdf |
| log | `*.log`, and anything under `logs/`, `log/`, `*-logs/` dirs |
| bundle / archive | `*.bundle`; zip tar gz tgz bz2 xz 7z zst |
| too-large(>1MB) | any remaining file over 1 MB |
| large-raw-data(>300KB) | json/txt/csv/tsv/html/diff/patch over 300 KB (raw run dumps) |
| build-artifact(game html) | `.html` over 100 KB (single-file game builds) |
| raw-run-output | `*.jsonl`, `*.out`, and `vitest-full*`/`dump-*` transcripts over 100 KB |
| third-party-lib | vendored minified libraries (`*.min.js`, `axe-core-*`) |
| other-type(.ext) | extensions outside the include list |
| binary / symlink | files containing NUL bytes; symlinks |

Secret check: the include set was scanned for `ghp_`, `github_pat_`, `xox[bp]-`, `sk-`, `AKIA`, `BEGIN ... PRIVATE KEY`, `password=`, `api_key`, `token=`. 6 files matched, all false positives (`sk-` inside screenshot names like `desk-04-0m12-…` and a path `analyze-disk-8f6e…`); none were excluded and no secrets were found.

Hashes: `sha256` for every excluded file is in `ARCHIVE-EXCLUDED.tsv` (columns relative_path, bytes, sha256, reason; 29 entries are broken `node_modules` symlinks with no hash).

Note: about 50 archived QA probe files are named `*.test.ts`. Vitest's default include would pick them up if this branch were merged; merging would need `qa/**` added to the vitest exclude in `vite.config.ts`. Do not merge without Vadim/HoE OK.

## Per top-level directory

| Directory | Included files | Included size | Excluded files | Excluded size |
|---|---:|---:|---:|---:|
| `(root files)` | 29 | 0.61 MB | 14 | 0.80 MB |
| `archive` | 4 | 0.01 MB | 0 | 0.00 MB |
| `bugs` | 5 | 0.02 MB | 3 | 0.08 MB |
| `claude-gamer` | 30 | 0.32 MB | 256 | 14.66 MB |
| `claude-qa` | 28 | 0.20 MB | 293 | 9.72 MB |
| `csr` | 78 | 0.26 MB | 328 | 2.39 MB |
| `engineering` | 0 | 0.00 MB | 17 | 0.85 MB |
| `handoffs` | 2 | 0.00 MB | 0 | 0.00 MB |
| `hiring` | 1 | 0.00 MB | 0 | 0.00 MB |
| `m2-scripts` | 4 | 0.02 MB | 0 | 0.00 MB |
| `m2-shots` | 0 | 0.00 MB | 22 | 2.16 MB |
| `m3-fixtures` | 21 | 0.01 MB | 0 | 0.00 MB |
| `m3-pt1` | 13 | 0.02 MB | 17 | 1.82 MB |
| `m3-rc0` | 41 | 0.10 MB | 40 | 2.54 MB |
| `m3-recheck` | 2383 | 14.11 MB | 14777 | 493.95 MB |
| `m3-scripts` | 137 | 0.91 MB | 12 | 0.31 MB |
| `m3-shots` | 0 | 0.00 MB | 148 | 8.98 MB |
| `m3-webkit` | 29 | 0.11 MB | 160 | 24.12 MB |
| `m41` | 749 | 10.66 MB | 8856 | 467.99 MB |
| `m4a-v3-delta` | 56 | 0.36 MB | 9 | 0.14 MB |
| `m4bot-snapshot-2026-10-19` | 4 | 0.01 MB | 0 | 0.00 MB |
| `m5` | 204 | 2.49 MB | 3441 | 29.98 MB |
| `rc2-scripts` | 6 | 0.01 MB | 0 | 0.00 MB |
| `reports` | 10 | 0.02 MB | 0 | 0.00 MB |
| `reviews` | 212 | 3.02 MB | 216 | 19.86 MB |
| `scratch` | 0 | 0.00 MB | 59079 | 565.05 MB |
| `trial-qa-bot` | 26 | 0.02 MB | 22 | 1.48 MB |
| `v5-econ` | 3 | 0.04 MB | 0 | 0.00 MB |
| `v5-saves` | 633 | 3.95 MB | 1711 | 94.73 MB |
| `wt-ac7-8e6d53e` | 0 | 0.00 MB | 268 | 1.87 MB |
| `wt-ac7-pr42-528f1a7` | 0 | 0.00 MB | 305 | 2.17 MB |
| `wt-acw1-l30plus` | 0 | 0.00 MB | 315 | 2.23 MB |
| `wt-csr-base-dd223f5` | 0 | 0.00 MB | 366 | 2.61 MB |
| `wt-identity-cb57f17` | 0 | 0.00 MB | 307 | 2.20 MB |
| `wt-l30fix-C2` | 0 | 0.00 MB | 268 | 1.87 MB |
| `wt-l30plus-729565e9` | 0 | 0.00 MB | 320 | 2.31 MB |
| `wt-m41-10-33f1538` | 0 | 0.00 MB | 365 | 3.09 MB |
| `wt-m41-5-b901e84` | 0 | 0.00 MB | 368 | 3.11 MB |
| `wt-m41-7-3c86720` | 0 | 0.00 MB | 334 | 2.45 MB |
| `wt-m41-7-8694222` | 0 | 0.00 MB | 437 | 3.63 MB |
| `wt-m41-7-8694222-acs` | 0 | 0.00 MB | 386 | 2.79 MB |
| `wt-m41-7-9cce82d` | 0 | 0.00 MB | 329 | 2.39 MB |
| `wt-m41-7-9cce82d-acs` | 0 | 0.00 MB | 381 | 2.73 MB |
| `wt-m41-7-b986cd3` | 0 | 0.00 MB | 334 | 2.44 MB |
| `wt-m41-7-dfdf49c` | 0 | 0.00 MB | 435 | 3.59 MB |
| `wt-m41-7-dfdf49c-acs` | 0 | 0.00 MB | 384 | 2.76 MB |
| `wt-m41-7-dfdf49c-base-dd223f5` | 0 | 0.00 MB | 315 | 2.28 MB |
| `wt-m41-7-dfdf49c-qel` | 0 | 0.00 MB | 333 | 2.41 MB |
| `wt-pr53-4e1252d` | 0 | 0.00 MB | 417 | 3.43 MB |
| `wt-pr58-66680eb` | 0 | 0.00 MB | 316 | 2.30 MB |
| `wt-pr66-8c568b0` | 0 | 0.00 MB | 366 | 2.63 MB |
| `wt-precheck-pr44` | 0 | 0.00 MB | 361 | 2.54 MB |
| `wt-qe-late-e-1682a0c` | 0 | 0.00 MB | 421 | 3.46 MB |
| `wt-qe-late-e-base-dd223f5` | 0 | 0.00 MB | 367 | 2.61 MB |
| `wt-rc1-5d9efa6` | 0 | 0.00 MB | 456 | 3.93 MB |

## Excluded by reason

| Reason | Files | Size |
|---|---:|---:|
| media | 18507 | 920.19 MB |
| scratch | 59972 | 572.11 MB |
| repo-checkout(worktree) | 9254 | 69.82 MB |
| build-output/vendor | 284 | 42.95 MB |
| raw-evidence-dir | 791 | 37.92 MB |
| too-large(>1MB) | 18 | 35.60 MB |
| repo-checkout(copy) | 4167 | 33.05 MB |
| log | 3653 | 27.58 MB |
| large-raw-data(>300KB) | 50 | 23.73 MB |
| raw-run-output(dump) | 11 | 17.79 MB |
| raw-run-output | 697 | 17.70 MB |
| junk/cache | 914 | 7.92 MB |
| backup(.bak) | 101 | 3.39 MB |
| other-type | 251 | 0.80 MB |
| third-party-lib | 1 | 0.62 MB |
| archive | 4 | 0.27 MB |
