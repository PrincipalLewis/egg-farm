# PR #83 DELTA re-check @ abe9cc6 — INTERIM (NOT the verdict)

- **Status:** INTERIM. HoE's announced final TEST-ONLY commit (HoP accessibility-tree name check + m:ss test, due ~11:40 CET) had **not landed** at 11:48 CET (re-checked 11:49:55). The verdict goes on that final head; HoQ issues it. No runtime matrix was run (per brief: static-only interim when the final head is absent).
- **Head:** abe9cc620421779bda2be1dc2ce0be94f6c7670c (fix/m41-p2 → rc/v5, open, mergeable_state clean). `git ls-remote` refs/heads/fix/m41-p2 = refs/pull/83/head = abe9cc6; cursor-github PR commits: 29, last abe9cc6 (09:32 CET). Evidence: static/05-head-ci-1148.txt.
- **CI:** run 41036225674 `ci`, head_sha abe9cc6, completed **success**, 10:49–10:58 CET (static/04-ci-41036225674.json).
- **Reviewer:** UI QA executor (resume of the run interrupted ~11:15 CET), 11:44–11:50 CET. Read-only git/Read/sha256sum; no browser, server, vitest or npm run by me.
- **Prior verdict this re-checks:** qa/m3-recheck/pr83-4eb220f-static-prereview.md (F2/F3/F6; also F4 → Art-c2 every-Refill). Queue rows P2a/P2b (qa/queue.md L44–45).

## Cleanup (step 1)
Pidfile `.pids/uiqa-pr83-abe9cc6.pids`, 6 records, all current boot. Only 1696097 (python3 http.server 5307 on /tmp/qa-pr83-abe9cc6-20261030-105110/dist-qa) was alive, start time matching the record. `ops/tools/lane-kill.sh uiqa-pr83-abe9cc6 1696097` → `TERM 1696097 (group)` rc 0; confirmation pass → **`GONE 1696097` rc 0**, no group members remaining; 5307 free. Other 5 records already dead. No other lane touched. Log: logs/00-cleanup-1145.log.

## Results (static, abe9cc6 vs 4eb220f) — no FAIL found
| # | Check | Result | Sev if it fails | Basis (file:line @ abe9cc6) |
|---|---|---|---|---|
| F2 | Cooldown nav/docked Refill shows "Refill" next to the countdown; name "Refill, cooling down" starts with the visible text (D-HOP-2026-10-30-02 (b)) | **PASS (static)** — runtime pending | Major | workers-ui.ts:169,176 (label 'Refill', countdown ` 0:NN` / ` · 0:NN`); app.ts:629 (setText label + data-cd; .nav-lbl no longer aria-hidden); styles.css:600,603 (`::after{content:attr(data-cd)}`, docked min-width 2.65em). Dev shots firefox-cooldown-max-0-30-360 ("Refill 0:30") and webkit-cooldown-max-0-30-1280 ("Refill · 0:30") match. |
| F3 | Starts-with-visible check is no longer vacuous (non-empty visible text required) | **PASS (static)** | Major (evidence) | scripts/m41-p2-browser.mjs:150 (`v.length > 0 &&`), :207; tests/m41-p2-ui-dom.test.ts:100–102 (`v.trim().length > 0` + negative case with all-aria-hidden content). The cooldown axe row is now a gated `check` (was `info`), 0 violations required. |
| F6 | nav-upgrades shots frame the bottom nav with the sheet closed | **PASS (static, dev evidence)** | Minor | m41-p2-browser.mjs:169–177 frame assertion (sheet closed, nav on top, badge text) before the shot; opened chromium-nav-upgrades-n1-360 and webkit-nav-upgrades-n2-390: bottom nav, Upgrades badge 1/2 after the icon, no sheet. n0 shots added. |
| Art-c2 | refusedFlash under reduced motion on EVERY Refill surface (card, nav, docked header, Workers-tab bar) | **PASS (static)** — runtime pending | Major (per scope ruling Art 08:59) | styles.css:46,51–53: `.btn.manage.shake`, `.manage.nav-manage.shake`, `.btn.manage-all.shake[aria-disabled=true]` in full-motion, @media RM, `.reduced-motion` and `.rm`. Specificity: the (0,4,0) bar selector beats styles.css:231 `.btn.manage-all[aria-disabled=true]{animation:none}` (0,3,0); nav button has no `.btn`, so :39/:231 don't match it. Surfaces: app.ts:98 (nav/docked-header button, one element), :195 (refused → cantAfford → shake), :242 (card, unpaid); workers-ui.ts:81 (bar). Dev browser coverage: m41-p2-browser.mjs:259 (card, unpaid), :267 (nav), :269 (docked header), :270 (bar), RM via Playwright `reducedMotion` (:30). |
| Art (b) | Focused Refill clears the sticky Refill bar (own Major-on-fail row) | **COVERED by existing check; runtime NOT re-run by QA** | Major | m41-p2-browser.mjs:287 (every Tab/Shift+Tab stop fully visible, none under the bar) and :293 (first card Refill after Shift+Tab, top ≥ bar bottom), shot :294; mechanism styles.css:614 (`scroll-margin-top:var(--refill-bar-h)`). Dev logs: FF 360 top 460 ≥ bar 396, 390 471 ≥ 407, 1280 664 ≥ 600 (all ok, 3 engines). Shot firefox-focus-under-refill-bar-360 shows the focus ring on Market Hand Refill fully below the bar. No new probe code. |
| Δ src | f883dad..abe9cc6 is the rc/v5 458f74c merge; `git diff --stat f883dad abe9cc6 -- src/ui` is empty. Merge tree = merge-tree(f883dad,458f74c) (static/03). | INFO | — | |

### Concerns for the runtime run (not findings)
- **C1 (evidence weakness, Minor):** the dev "fit / no jump" check measures `.nav-lbl` getBoundingClientRect width (m41-p2-browser.mjs:234). Phone width is identical at 360 and 390 (57.39 px) and constant 0:01..0:30 even though the comment at styles.css:601–602 says Fredoka has no tabular digits and only the docked pill reserves width. The constancy may come from the box, not the glyph run. Our run should measure the `::after` / text run (Range rects) on phone widths.
- **C2 (coverage gap):** the in-app `.rm`/`.reduced-motion` hook for Art-c2 is asserted only as CSS strings (tests/m41-p2-ui-minors.test.ts); the browser checks use only emulated `prefers-reduced-motion`. Card Refill refused **in cooldown** (not unpaid) under RM has no browser row. Both belong in our matrix.
- **C3:** dev SIZES are 360x800/390x844/1280x800 only (m41-p2-browser.mjs:57); 375, 430, 1024x474, 1280x720, 1366x768 remain QA-only (pre-review F7).

## NOT RUN (all runtime)
- 3-engine matrix (Chromium → Firefox → WebKit) on the final head: F2/F3 runtime names + axe label-content-name-mismatch, F6 frame, Art-c2 on every Refill surface (full motion + emulated RM + in-app `.rm`), Art (b) focus-under-bar with own shots, Firefox focus (:focus-visible + outline/ring differing from unfocused computed style), build-id at runtime, 44px heights, widths 375/430 and docked 1024x474/1280x720/1366x768.
- Static delta abe9cc6 → final (commit not landed).
- vitest on the final head.
- Not reused as evidence: the previous worker's build (logs/01-build-abe9cc6.log, build on **ambient node v24.22.1**, check-release-build `m4.1+abe9cc6` ok) and its probe dry runs in /workspace/qa-pr83-probe/dryrun-abe9cc6/ (self-labelled "not evidence"; run 3: 616 pass, 0 fail, 4 UNVERIFIED Market order-row layout at docked sizes; runtime build-id `m4.1+abe9cc6`). They are INFO only. That probe (delta.mjs) is new probe code written by the previous worker.

## Disclosures
- Developer evidence (artifacts/m41-p2/results-abe9cc6, SHA256SUMS 143 entries, -c rc 0; 281/281 checks per engine on node v20.19.2) is HoE's, not QA's. Its first WebKit run (run1-load22) had 2 timing FAILs under load ~22, superseded by a re-run at load 8.86.
- The previous worker's static/01–04 were re-validated: 02 patch sha256 3a2cbc9e… equals a fresh `git diff 4eb220f f883dad`; refs re-fetched.
- PR body artifacts/m41-p2/pr-body-abe9cc6.md sha256 12ca2db0…72f8 (read only).

## Next (when the final head lands)
Static delta abe9cc6 → final (expect tests/scripts only); then the matrix per brief on ports 5301–5319, `.browser-test-3.lock` (600 s cap), load < 8, one engine at a time; report qa/m3-recheck/pr83-<final7>-delta.md.

## Evidence
qa/m3-recheck/pr83-abe9cc6-evidence/ (logs/, static/, SHA256SUMS; shots/ empty — no QA shots taken in this interim).
