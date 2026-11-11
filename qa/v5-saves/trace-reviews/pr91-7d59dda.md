# V5SCAP trace check — PR #91 (CCR F-4: m5Load sanitises `paused` / `callLockoutS`) @ 7d59dda

**Verdict: PASS** (no Blocker/Major; 1 Minor + 2 Nits, non-blocking, listed below)
**Head:** `7d59ddac8f1e5b610ddef4db9c1b62de9799da5a` · Ready (not Draft) · base `rc/v5` · OPEN · mergeable MERGEABLE / CLEAN (10:12 CET)
**CI:** run 41029765991 (`ci`, pull_request, started 09:55 CET) — **completed / success** on headSha 7d59dda (gate success; release-globals skipped)
**Reviewer:** QA Engineer, Saves & Release Verification · 2026-10-30 ~10:15 CET · evidence `pr91-7d59dda/` (SHA256SUMS)

## rc/v5 moved: #90 merged → d52f35b — no re-merge needed (confirmed)
- `origin/rc/v5` = `d52f35ba6dbfbc6c748e760888bc3abd250772d4` (#90, 10:01 CET), parent 458f74c.
- `git merge-tree --write-tree origin/rc/v5 7d59dda` → exit 0, no conflicts, tree `dd38ede7…`. Files touched by both sides since 458f74c: **none** (#90 = tests/bot-m5.ts, tests/bot-m5.test.ts). (07-merge-tree-rcv5.txt)
- Extra: checked out tree dd38ede in the scratch worktree: `tsc --noEmit` 0; bot-m5 + sanitize + is-paused + streak-sim 4 files 51/51 (08-trial-merge-tsc.txt). HoE's claim holds.
- Note: CI 41029765991 started before #90 landed, so it ran against 458f74c, not d52f35b; with zero file overlap and the trial above this is not a gap that needs a re-run.

## Diff (458f74c..7d59dda) — matches claims
7 files, +109/−4; `SAVE_VERSION` lines in diff 0; `src/config/balance.json` diff 0. Commits: fb4015d (fix) → a202ed1 (merge rc/v5 458f74c; one conflict in m5-fields.ts header, both import sets kept, `const tc = tcNum` kept) → 7d59dda (tests/comments only).
Production: `src/save/m5-fields.ts` (anyFlag + pause, `pauseLoad`), `src/sim/pause.ts` (`sanitizePausedOnLoad`), `src/config/m5-rules.ts` (`M5_REQUIRED_TC.pause`). Nothing unexplained. `sync-economy --check` exit 0.

## (1) Flags-off save untouched byte for byte — PASS
QA probe (probe-saves.test.ts, untracked copy, removed after) at base 458f74c and head 7d59dda: every committed fixture in tests/fixtures/saves/ + v5-f2/m5-save.json through validate → m5Load → serialize, plus loadSafe main / `.bak` fallback / exp1 LS+IDB reconcile, under shipped balance and a pause-on balance; sha256 of bytes per case.
- Shipped balance: 36 rows, **identical** base vs head (output hashes, outcomes, recovery reasons); m5Load returns the same object (`same:true`), 0 events.
- Pause on: output bytes identical base vs head for all fixtures (none carries pause fields); only `same` flips true→false (expected: anyFlag now true, m5Load builds a new object).
- Covers v4 (m1-rc2-v4), v5 (m2-rc1-*), M4.1-era v6 (m4-pre-v7-F30-C30), the exp1 committed-unseen reconcile capture, the .bak path, and corrupt-* fixtures (same reasons at base and head). Goldens flagoff-a01faea + m4on-90a9c84: 4/4.

## (2) Tampered-save tests + mutants — PASS (1 Nit)
Real tests cover: NaN, ±Infinity, negative, null, string, object, boolean lockout → absent; 1e308 / MAX_VALUE / cap+0.001 → cap 45; 0 → absent; non-boolean paused (1, 0, 'true', null, NaN, {}, []) → absent; below unlock (F9 cleared, F10 kept); lockout on non-Market-Hand dropped; missing fields stay missing, other fields untouched, no events; serialize→validate→m5Load round trip; tampered JSON after validate; flag off and M4.1-shape preserved.
Mutants (mutate.py; 6 targeted files; each reverted, tree clean, tsc 0 for all):
| Mutant | Result |
|---|---|
| P1 anyFlag omits pause (original F-4) | killed (5) |
| P2 sanitise even when pause off | killed (26) |
| P3 lockout keeps non-finite | killed (1) |
| P4 no cap clamp | killed (2) |
| P5 lockout on any worker | killed (1) |
| P6 lockout kept below unlock | killed (1) |
| P7 paused kept below unlock | killed (1) |
| P8 non-boolean paused kept | killed (2) |
| P9 lockout 0 kept | killed (1) |
| P10 drop M5_REQUIRED_TC.pause | killed (1, [F-5] test) |
| P11 unlock off-by-one (`>`) | killed (1, F10 kept) |
| P13 negative lockout kept | killed (1) |
| **P12 mutate `workers` in place (drop the 3 copy-on-write guards)** | **survived** → Nit N1 |
- Unknown worker ids (probe 17): `workers.ghost` with garbage passes validate and m5Load untouched, in both balances. Pre-existing pass-through (E9 "unknown fields preserved"); no reader iterates beyond WORKERS, so inert. No test pins this — Nit N2 (info).

## (3) #82 paused-read allowlist — new unlisted read caught; allowlist not file-scoped (Minor M1)
- A1 new `w.paused === 1` read in m5-fields.ts → **killed** by `[row-8 isPaused][QA-10] …`.
- A3 extra read appended to the allowlisted line in pause.ts → grep misses it (line exempt); killed only by the E9 behaviour test.
- **A2: a one-line `export const sanitizePausedOnLoad = (w) => w.paused === 1;` added in src/sim/streak.ts → survived (107/107).** The exemption regex `export const (?:isPaused|sanitizePausedOnLoad) = ` is matched per line with no file check, though the title says "outside sim/pause.ts". Pre-existing shape from #82 (`isPaused` had the same hole); #91 extends it to a second name. Fix (test-only, 1 line): also require `f.endsWith('sim/pause.ts')` for the exemption. **Minor, non-blocking** (owner Architect/HoE as #82 owners, or Saves in a follow-up).

## (4) No SAVE_VERSION bump — correct
No schema change: both fields are optional and already defined by the Pause spec E9 ("No SAVE_VERSION bump", tracksV7 pattern); #91 only adds a load-time sanitiser behind `m4.flags.pause` (default 0) and a validateBalance requirement. migrate/validate unchanged (diff). Old-save path: v4, v5, v6 fixtures load identically at base and head; .bak fallback and exp1 LS+IDB reconcile outcomes identical (probe). save.ts / loader untouched.

## (5) M1 from pr87-694468e — fixed
V3 (drop `'streak_cap'` from M5_TC_KEYS in src/config/formulas.ts) → **killed** by `ST-AC18 [QA pr87-694468e M1]: the 7 streak tc keys are pinned here …`.

## (6) Trace / rule 22 / Post-CCR delta — PASS
All 12 trace rows resolve to existing tests in the run log; every title carries its ids (CCR-F4 plus B5/E2/E2b/E9/E12/AC-P1/AC-P2/AC-P13/F-5, QA pr87-694468e M1, row-8 QA-10). Body and self-review: "per D-CEO-20261030-01, CCR post-merge if Claude is available, otherwise recorded as 'no Claude review'" — fine under rule 22. No CCR pass on this PR, so no Post-CCR delta is needed.
Open (info, not this PR): spec **E13** (flag off with saves already paused → fields cleared on next save) is not done; PR keeps flags-off loads byte-identical (AC-P1/F2) and defers E13 to the Pause PR; logged open in engineering/status.md L1101. Needs a HoE ruling before the Pause PR, since E13 and the AC-P1 byte-identical rule pull opposite ways.

## (7) Manifest — PASS
`artifacts/v5-m5load-sanitize-7d59dda/results/SHA256SUMS` sha256 `7ae964d4e4237f6970155f0ddaf65f08f5c5b00ba257850a55a36e40df35be43` (matches claim), 45 entries, `sha256sum -c` all OK; its diff.patch equals `git diff 458f74c 7d59dda`.

## (8) tsc / tests (maxWorkers=2)
- tsc --noEmit: 0 (head; and trial merge tree).
- Targeted: author's 15 files + 11 save suites = 26 files **469/469** (author claimed 15 files 266/266; their subset included).
- Goldens: 2 files 4/4.
- Full suite: 129 files, **1756 passed, 1 skipped**, exit 0.

## Findings
- **Minor M1** — QA-10 paused-read allowlist is name+line based, not file based (A2 survives). Repro: apply mutant A2 (`python3 pr91-7d59dda/mutate.py A2-allowlisted-name-in-other-file`), run tests/v5-f3-is-paused.test.ts → passes. Non-blocking; pre-existing #82 shape.
- **Nit N1** — no test that m5Load leaves its input `workers` object unmutated (P12 survives). Not observable today (input is a freshly parsed save).
- **Nit N2** — unknown worker ids pass through unsanitised; no test pins it. Info.
- **Info** — E13 flag-off clearing still open for the Pause PR (HoE call).

## Not run
Builds, check-globals, rc0 on 3 engines, the browser/DOM part of AC-P1 (360/1280 DOM scan), real IDB (reconcile tested via the exp1 capture with an in-memory KV). Full CI on d52f35b + #91 (covered by the no-overlap merge-tree + local tsc/targeted on the merged tree).
