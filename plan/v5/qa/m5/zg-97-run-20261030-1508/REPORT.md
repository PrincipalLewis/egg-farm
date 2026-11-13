# REPORT — TASK HoQA/zg-97-run (resume 2026-11-05)

**Task:** Run #97 ZG cases (ZG-AC10, ZG-AC14, ZG-AC19, ZGU-UI1) on rc/v5 `0ad018de` at flags 0; report PASS/FAIL/BLOCKED/UNVERIFIED with evidence sha.
**Owner:** UI/Layout QA (UIQA). **Issued by:** Head of QA. **Resume:** D-CEO-20261105-01.
**Folder:** `qa/m5/zg-97-run-20261030-1508/`
**Timezone:** Europe/Belgrade (CET, UTC+1).

## HANDOFF check
HANDOFF.md TASK line matches this TASK (owner, scope, sha, flags 0, lane uiqa-zg97, D-HOE-38 conditions). No mismatch — proceeded.

## Build verification (read-only)
| Check | Value |
|---|---|
| Clone HEAD | `0ad018ded37c2b3b3cfc3b213601d7a53cef5be7` |
| Commit | `0ad018d M5.1 zeroGainUi: zero-gain purchase UI (#97)` |
| Runtime build-id (dist-qa meta + data-build-id) | `m4.1+0ad018d` |
| Shipped flags (balance.json) | `zeroGainUi=0`, `bestBuyV2=0`, `confirm=0`, `m4.enabled=1` |
| Prior unit precheck | kept: `evidence/unit/zg-unit-0ad018de.json` — 74 pass / 0 fail / 1 unverified (FX-F27 trace hook) |

State on resume was valid (build + harness + unit evidence present; no browser evidence yet; no REPORT). No rebuild required.

## Case verdicts (flag-off only)

### ZG-AC10 — Confirm strip
| Slice | Verdict | Evidence |
|---|---|---|
| confirm=0 (shipped / zg-off) | **PASS** (3 engines × 360×640 / 390×844 / 1280×800) | No `.zg-confirm` in DOM; Buy has no `aria-expanded` / `aria-controls`. jsonl below. |
| confirm=1 (zg-confirm) | **BLOCKED-FIX** | HoE D-HOE-38: no confirm=1 until focus-guard fix (Minor 2). Not run. |

Per-engine confirm+flagoff (each 18 pass / 0 fail / 0 unverified, loadsOk, build_id `m4.1+0ad018d`):

| Engine | 360×640 | 390×844 | 1280×800 |
|---|---|---|---|
| Chromium | PASS `912a74f9…` | PASS `fdfd5715…` | PASS `35b6b8c3…` |
| WebKit | PASS `219a8faa…` | PASS `177ea62b…` | PASS `ec61e0a3…` |
| Firefox | PASS `83ef82e2…` | PASS `124aa678…` | PASS `d17bde10…` |

Full sha256 of each jsonl is in `evidence/SHA256SUMS`. Paths: `evidence/zg/zg-zg-off-<engine>-<WxH>-confirm_flagoff.jsonl`.

### ZG-AC14 — a11y / layout (chip contrast, intersection, axe, live-region parity)
| Slice | Verdict | Reason |
|---|---|---|
| Flag-on layout/axe on FX-L30 / FX-F27(s) | **BLOCKED** | Needs `zeroGainUi=1`. Flag-on UI waits for Architect SIM-only flag-list PR (D-HOE-38 / TASK condition 3). Probe `zg.mjs` `layout` section no-ops when flag off. |
| P8 docked / docked-compact golden spots (960×600, 1024×474, 1280×720) + QA hooks | **UNVERIFIED** | Until UI `p8-qa-hooks` (TASK HoE/p8-qa-hooks). |
| Flag-off | N/A for chip criteria (no `.zg-chip`); covered indirectly by ZG-AC12/19 no-ZG-marks. |

### ZG-AC19 — Flag-off labels (no-regression)
| Slice | Verdict | Evidence |
|---|---|---|
| Vitest set (m41-8-f4-label, m41-8-best-chip, m4a-max-label, d5-goal-pill, next-goal, flagoff-golden, m4on-golden) | **PASS** 7 files / 73 tests | `evidence/ac19/vitest.log` sha256 `83679dc9…` |
| `tests/zg-flagoff-dom.test.ts` (ZG-AC12/19 DOM hash vs 65a7443) | **PASS** hash `9c4b6439016e5d5b6a779b34643f70793fda5df8d44728f9bcc32844c662ee35` | `evidence/ac19/flagoff-dom.log` `ec74200e…` |
| `scripts/m41-8-f4-14a.mjs` × 3 engines | **PASS** 219/219 each | Cr `4220c43c…`, WK `08b0cfed…`, FF `ff7ff061…` |
| Browser zg-off flagoff marks (no `.zg` / chip / aria-controls) | **PASS** (rolled into the 9 jsonl cells above; 14× ZG-AC12 checks per cell) | same jsonl |

### ZGU-UI1 — Flag-on screenshots (FX-L30 / FX-F27 / FX-FLIP × 360/390/1280 × 3E)
| Slice | Verdict | Reason |
|---|---|---|
| Flag-on Art shots vs zero-gain-ui v1.4 `14ec8850` | **BLOCKED** | Flag-on UI waits for Architect flag-list PR. `zgui.mjs` records `blocked` when `zeroGainUi != 1`. |
| P8-dependent shot rows | **UNVERIFIED** | Until `p8-qa-hooks`. |

## Not-run list
1. **zg-confirm / confirm=1** — BLOCKED-FIX (focus-guard).
2. **zg-on / zeroGainUi=1** browser sections (display, flip, star, nav, buy, layout, tele, ZGU-UI1, ZGU-AC4/AC7) — BLOCKED pending Architect flag-list PR.
3. **P8 docked golden spots + telemetry.events() in build:qa + test-ids** — UNVERIFIED pending UI p8-qa-hooks.
4. **FX-F27 from AC7 trace** — UNVERIFIED (no observe hook); FX-F27s layout substitute only (unit precheck).
5. **Firefox/WebKit/Chromium layout sizes 959×600 / 960×600** — not applicable at flags 0 (layout section gated on flag on).

## Lane / process discipline
- Lane: `uiqa-zg97`. Ports: 5291–5303 (never :4173).
- Locks: `.browser-test.lock` for all completed browser cells (`.browser-test-2.lock` was held by a non-pidfile deadlock from a nested-flock mis-start at ~20:17 CET; not signalled; self-cleared by ~20:32 CET). Chromium f4-14a used `-2` once free.
- `lane-run.sh` after 20:17 CET requires real session leadership; invocation used `bash -c 'set +m; lane-run …'` so setsid records cleanly.
- Exact `lane-kill.sh` success lines observed:
  - `GONE 507377` (chromium 390 first cell)
  - `GONE 533462` `GONE 559063` `GONE 592703` `GONE 624569` `GONE 657174` `GONE 676599` `GONE 694383` `GONE 708776` (batch)
  - `GONE 726757` `GONE 756917` `GONE 783017` (f4-14a × 3)
- **Survivors:** none at report time. Transient non-pidfile deadlock (478674/478678/478679/478680) was reported, never signalled, and later cleared on its own. `/proc` checks only.
- No Claude Code / Claude bots touched. No push/merge/tag. No GITHUB_TOKEN printed.

## /tmp scratch (listed per scope rule)
`/tmp/zg97-20261105/` — logs, lane pids, batch-results, run-one.sh, survivors note, lane-run debug helpers. Copied logs also under `evidence/browser/` and `evidence/ac19/`.

## Evidence index
- `evidence/SHA256SUMS` — sha256 `d29e8f032bad6c5b9e21ee1b12344066adaf2da0d846c4d1ae6d1d9a5b9b2f50` (regenerated at report write)
- Unit: `evidence/unit/zg-unit-0ad018de.json` (`dfdbb24c…`)
- Browser jsonl: `evidence/zg/*.jsonl` (9 files)
- AC19: `evidence/ac19/{vitest,flagoff-dom,f4-14a-*}.{log,sha256}`
- Harness pins: `harness/COPIED-FROM-harness-rc-next.sha256` (+ resume copies of `zg/zg.mjs`, axe)
- Resume note: `RESUME.md`

## Gate lines (for HoQA)
| Case | Verdict | Evidence sha (abbrev) |
|---|---|---|
| ZG-AC10 (confirm=0) | PASS | jsonl set / SHA256SUMS |
| ZG-AC10 (confirm=1) | BLOCKED-FIX | — |
| ZG-AC14 | BLOCKED (flag-on) / UNVERIFIED (P8) | — |
| ZG-AC19 | PASS | vitest `83679dc9…` + flagoff-dom `9c4b6439…` + f4-14a 219/219 ×3 + 9× jsonl |
| ZGU-UI1 | BLOCKED (flag-on) / UNVERIFIED (P8) | — |
