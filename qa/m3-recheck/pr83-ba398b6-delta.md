# PR #83 (m41-p2) DELTA re-check on final head ba398b6 (UI QA)

- PR head (git ls-remote refs/pull/83/head, 12:24 CET): `ba398b6aeb0f00874ab83d93cf0c9a0670401a62`. Its parent is abe9cc6. The base build 76390f2 was used for the pre-existence checks.
- Written 2026-10-30, about 12:35 CET. Browser work ran 12:02–12:28 CET, well before the 13:50 CET lock cut-off (QA-D-1030-SAVES-RC-2). All browser locks are released.
- Evidence: `qa/m3-recheck/pr83-ba398b6-evidence/`. `SHA256SUMS` sits in that folder, and `sha256sum -c` is clean.
- Verdict input for HoQ:
  - Nothing in the #83 delta regressed. Every #83-specific check passes in all 3 engines and at all 8 sizes.
  - Two FAILs remain against the brief's strict criteria. Both are **pre-existing**: they reproduce on the 76390f2 base build, and they are outside #83's diff.
  - One focus-visibility **concern** is recorded (not a FAIL).
  - flags0-no-m5-ui: PASS.
  - CI on ba398b6: success.

## 1. FAILs (first)

| # | Check | Engines × sizes | Severity | Pre-existing? | Repro / evidence |
|---|---|---|---|---|---|
| F-A | LAYOUT 44px: Workers-tab Refill buttons must be 44<=h<46 | All 3 engines × all 8 sizes (24 cells). The bar `[data-act=manageAll]` and each card `[data-act=manage]` (market_hand, coop_hand, hawker) measure **h = 48**. scrollWidth clipping: none | Minor. It meets the ≥44 tap-target floor, but fails the brief's "not 46+" upper bound | **Yes.** 76390f2 also gives 48 on all 4 buttons (`runtime/preexist-76390f2-vs-ba398b6.json`, `logs/13-preexist-chromium.log`). The #83 diff does not touch these buttons | Open Upgrades → Workers tab and set farmLevel 20 plus tired workers. `getBoundingClientRect().height` = 48. Computed min-height is 44px, box-sizing border-box, border 2px/2px, padding 0/0. The base `.btn{min-height:48px}` is at styles.css:30, and the remaining 4px come from somewhere in the cascade (root cause not isolated). Logs: `logs/10-*-{phones,docked}.log` "LAYOUT 44px"; shots `runtime/shots/<eng>/*workers-tab-refills*` |
| F-B | axe-core 4.14.0, all rules, 0 violations on the cooldown scenes | All 3 engines × 1024x474 and 1280x720 (6 rows per engine, 18 in total). There is **1 violation**: `scrollable-region-focusable` (serious) on `#mRows` (app.ts:103, the Market order list, which is scrollable in the short docked layout and has no focusable content). The other sizes have 0 violations | Minor/Major for HoQ to grade (axe calls it serious) | **Yes.** 76390f2 shows the same `scrollable-region-focusable:#mRows` at 1024x474 and 1280x720. The 76390f2 base also had `label-content-name-mismatch` on `.nav-manage`, and **#83 fixes that** | Docked layout at 1024x474: Workers tab in cooldown, then run axe. Logs: `logs/10-*-docked.log` "AXE cooldown" |

Matrix rows that failed but turned out to be probe artifacts were rechecked. They are **not** FAILs:

- **Art-c2 C2 card cooldown, Firefox and WebKit at 1024x474, 3 RM modes (6 rows).**
  - Cause: the matrix probe used `force:true`. With the card under the sticky Refill bar, the click landed on the bar; the shot confirms this.
  - Recheck (`recheck/rc.mjs`): the card is scrolled to the centre, hit-tested with `elementFromPoint` to be the card button, then clicked with a real pointer at its centre.
  - Result: **18/18 PASS** (3 engines × 1024x474 and 1280x720 × full, emulated-rm and in-app-rm):
    - full gives the `shake` 0.24s animation;
    - both RM modes give `refusedFlash` 0.3s, no transform, and the inset ring `rgb(184,59,55) 0 0 0 2px`;
    - aria-disabled stays true and cd stays 20.
  - Evidence: `logs/14-recheck2-*.log`, `recheck/rc-*.json`, `recheck/rc-*-c2card-*.png`.
- **LAYOUT order, Firefox phones only (4 rows).**
  - What the matrix saw: the first order's partial-sell button ("Sell 5 +$5.00") measured 42.32–42.58 px at 4 sizes.
  - Rechecks in all 3 engines at 360x640 and 390x844, every button **44/44** (rectH/offsetHeight), no transforms on any ancestor:
    - settled Market (`logs/14-recheck2-*.log`);
    - the matrix's exact timing of 400 ms after the Market nav, plus a settled read at 2.9 s (`logs/16-order-*.log`);
    - a forced **partial** state with basket 5, so every order shows "Sell 5 +$5.00" (`logs/16-order-partial-*.log`, `recheck/partial/`).
  - Not reproduced, so this is INFO/unverified-transient rather than a FAIL. The matrix measurement was taken while the scene was live (frame running), so a mid-transition read is the likely cause, but I did not prove it.

## 2. Per-check summary on ba398b6 (matrix, 2604 assertion rows; 8 sizes: 360x640, 375x667, 390x844, 430x932, 1280x800, 1024x474, 1280x720, 1366x768)

| Check | Chromium | Firefox | WebKit | Notes |
|---|---|---|---|---|
| A11Y-TREE: nav and header Refill name is exactly "Refill, cooling down", with no digits | 48/48 PASS | 48/48 | 48/48 | Chromium: CDP `getFullAXTree` name comes from attribute:aria-label, and the subtree is `StaticText:Refill` only (countdown absent). FF/WK: `ariaSnapshot`. Scenes n0-cd20, n1-cd1/20/30/65, n2-cd7. Constant at workers-ui.ts:167 |
| A11Y-TREE: card and bar names carry no countdown | 16/16 | 16/16 | 16/16 | Bar "Refill 2 tired workers" (the count is AC-R9 copy), card "Refill Market Hand". The countdown is only in the description ("Ready in 20s") |
| .nav-cd aria-hidden="true" and text-free | 48/48 | 48/48 | 48/48 | app.ts:98 |
| m:ss: visible text "Refill" plus ::after countdown | 48/48 | 48/48 | 48/48 | " · 0:01/0:07/0:20/0:30/1:05". workers-ui.ts:169, styles.css:601 |
| Header/nav Refill visible during cooldown | 48/48 | 48/48 | 48/48 | |
| F3 dev starts-with (m41-p2-browser.mjs:144-150 logic) | 48/48 | 48/48 | 48/48 | |
| F1/F3 Upgrades name | 12/12 | 12/12 | 12/12 | |
| F6 frame | 12/12 | 12/12 | 12/12 | |
| Not actionable: aria-disabled, and click/Enter/Space change nothing | 48/48 | 48/48 | 48/48 | |
| LAYOUT refill: one line, no scrollWidth overflow, 44<=h<46 | 48/48 | 48/48 | 48/48 | Docked pill 136.4x44.0 |
| axe label-content-name-mismatch | 16/16, 0 hits | 16/16 | 16/16 | Fixed by #83; the base 76390f2 had a hit |
| axe all rules on the cooldown scenes | 18 PASS / **6 FAIL** | 18 / **6** | 18 / **6** | F-B (pre-existing) |
| C1 no-jump measured on .nav-cd | 8/8 | 8/8 | 8/8 | 6 or more real ticks plus a 30..1 sweep. Countdown box width spread 0px, "Refill" x spread 0, button w/h spread 0/0 |
| Art(b) focus: card under the bar, nav, header | 16/16 | 16/16 | 16/16 | See the concern in §5 |
| Art-c2 refused feedback on every Refill surface (bar, card incl. **C2**, docked header, unpaid card) × full, emulated-rm and in-app-rm | 96/96 | 93 + 3 artifacts, recheck 6/6 | 93 + 3 artifacts, recheck 6/6 | §1 |
| Art-c2 RM mode applied | 24/24 | 24/24 | 24/24 | in-app RM sets html.reduced-motion via app.ts:60-62 |
| LAYOUT 44px on Workers-tab Refill buttons | **8 FAIL** | **8 FAIL** | **8 FAIL** | F-A (pre-existing, h = 48) |
| LAYOUT Market order .l1 and Sell buttons | 8/8 | 4 + 4 not reproduced | 8/8 | §1 |
| build-id m4.1+ba398b6 at runtime (meta and #app) | 32/32 | 32/32 | 32/32 | 96 in total |
| Page errors | 0 | 0 | 0 | |
| assert-view (active tab checked before each measurement and before each shot) | 244/244 | 244/244 | 244/244 | Every shot was taken right after its own measurement. 617 files in runtime/shots, sample opened and checked |

Pixels unchanged, abe9cc6 vs ba398b6 (Chromium, Refill clip, cooldown 30 and 7, at 360 and 1280): **0 differing pixels and identical sha** in all 4 pairs (`pixel/px-compare.txt`).

vitest at ba398b6 (`--minWorkers=1 --maxWorkers=2`): m41-p2-ui-dom, m41-p2-ui-minors, m41-p2-unpaid and m41-p1-asleep-signal. **4 files, 87/87 passed, rc 0**, 11:54 CET (`logs/02-vitest-ui-ba398b6.log`).

CI on ba398b6: run 41043968329 "ci" is **completed / success** on head_sha ba398b6. It ran 11:52:46 → 12:09:03 CET (`static/20-ci-run-41043968329.json`).

## 3. Static diff abe9cc6..ba398b6 (static/01-diff-abe9cc6-ba398b6.patch, static/02-file-lines-ba398b6.txt)

There is one commit: ba398b6 "#83 fix+tests: D-HOP-2026-10-30-02 cooldown countdown out of the a11y tree (SRC FIX) + a11y-tree, m:ss, Art-b focus rows". It touches 8 files, +71/-20.

Source changes:
- `src/ui/app.ts:98`: the nav Refill label is now `<span class="nav-lbl num"><span class="nav-txt">Refill</span><span class="nav-cd" aria-hidden="true"></span></span>`.
- `src/ui/app.ts:629`: setText(.nav-txt, label), and the countdown is written to `.nav-cd` `data-cd` (it is not text).
- `src/ui/styles.css:598-601`: `.nav-cd[data-cd]::after{content:attr(data-cd);white-space:pre;font-variant-numeric:tabular-nums}`.
- `src/ui/styles.css:604`: the docked `min-width:2.65em` no-jump rule moved onto `.nav-cd ::after`.
- `src/ui/workers-ui.ts:169`: fmtCooldown m:ss. Line :174 is a comment only.

Tests and scripts: scripts/m41-p2-browser.mjs (+49, a new a11y-tree row and an Art-b focus row), scripts/rc0-browser.mjs, and tests/m41-p1-asleep-signal, m41-p2-ui-dom and m41-p2-ui-minors (a new m:ss suite).

## 4. Pre-existence (base 76390f2, node20 build `logs/03-build-76390f2-node20.log`, served on :5303)

`runtime/preexist-76390f2-vs-ba398b6.json`, Chromium, Workers tab, cooldown:
- 76390f2 heights: all 4 Refill buttons = 48.
- 76390f2 axe:
  - `label-content-name-mismatch:.nav-manage` at 360x640, 1024x474, 1280x720 and 1280x800;
  - plus `scrollable-region-focusable:#mRows` at 1024x474 and 1280x720.
- ba398b6 heights: still 48.
- ba398b6 axe: only `scrollable-region-focusable:#mRows` at 1024x474 and 1280x720.

So #83 removes one violation and adds none.

## 5. Concern (not a FAIL): the docked header Refill focus ring

- The docked header Refill (`#p-upgrades header [data-act=manageAll]`) has no styled focus ring. It relies on the UA `outline:auto`:
  - Chromium: auto 1px rgb(16,16,16);
  - Firefox: auto 1px;
  - WebKit: auto 3px.
- Focused vs unfocused pixel diff (`focus-pair/fp-compare.txt`), counting pixels that differ by >24/255:
  - Chromium: 742–746 px;
  - Firefox: 934 px;
  - WebKit: 729 px.
- So the ring is visible in every engine, but in Chromium it is a thin dark ring that merges with the pill's dark border. Firefox draws a clear blue ring.
- The phone nav Refill uses the styled solid 3px rgb(43,121,168) ring at -3px offset.
- This is unchanged by #83 (pixel compare §2). It is a suggestion for Art/UI.

## 6. Cross-check against UI's evidence, artifacts/m41-p2/results-ba398b6

- `SHA256SUMS` has 152 entries, and `sha256sum -c` gives rc 0.
- `summary.tsv`: 17/17 steps rc 0 @ ba398b6, including tsc, vitest-full, goldens, builds, rc0 in all 3 engines, and m41-p2-browser in all 3 engines with 0 "fail" lines.
- Agreement: the a11y-name, m:ss, label-content-name-mismatch = 0 and abe9cc6→ba398b6 pixdiff 0 results all match mine.
- Why UI did not see F-A and F-B: their axe runs only the `label-content-name-mismatch` rule, and their tap-target check is `>= 44x44` with no upper bound. So the two FAILs fall outside their coverage; this is not a contradiction.
- UI's NOTE.md discloses that their browsers ran at a 5-min load of ≤ 11. Mine ran at a 1-min load under 8 (logged at each START).

## 7. flags0-no-m5-ui (D-CEO-20261030-06: v5 ships with all m4.flags = 0): **PASS, 12/12**

Committed config:
- `balance.json` at ba398b6 has all 14 `m4.flags` = 0.
- sha256 `883d1b0dbc29c44af2f032ee81529aa0d138bf6fe44c41e5f517202aa605dc18`.

Flag-gated code at ba398b6 is **sim/save only**, and there is **no flagOn in src/ui**:
- `src/sim/flags.ts:8-11` M5_FLAGS
- `:15` flagOn
- `:17` evRngFlagOn
- `:19` zeroGainConfirmOn
- `effects.ts:33,39`
- `pause.ts:10`
- `timers.ts:19,23`
- `m5-fields.ts:21`

Selectors:
- Because no UI is flag-gated, I could not derive DOM selectors from UI code. I used a negative name/text scan built from the flag names instead.
- `NAME_RX` on class/id/data-*/aria: `/golden|streak|tap-?coins?|abilit|broody|\bpaused?\b|is-paused|rc2-?refill|auto-?refill|zero-?gain|fatigue-?cue|clock-?wage|breeds?\b|best-?buy-?v2|\bm5-|data-m5/i`
- `TEXT_RX` on visible text: `/golden egg|streak|tap coin|abilit(y|ies)|broody|\bpaused\b|auto-?refill|zero[- ]gain|clock wage|\bbreeds?\b/i`
- The "Sales stopped" copy is the M4.1 Market Hand banner (workers-ui.ts:105), not M5.

Cells and results:
- 3 engines × 360x640 and 1280x800 × {fresh-default, midgame-workers-tab}.
- Every cell has build m4.1+ba398b6, runtime m4.enabled 1, and all flags 0.
- Every cell has **0 DOM name hits and 0 text hits**.
- The base nav Refill is present in the midgame cell, and there are 0 page errors.
- Each cell has a screenshot taken right after its assert: `flags0/f0-<eng>-<scene>-<WxH>.png`, `flags0/f0-<eng>.json`, `logs/15-flags0-*.log`.

## 8. Toolchain

- Fresh worktree `/tmp/qa-pr83-ba398b6-20261030-115401` at ba398b6, tree clean.
- Build: node **v20.19.2** (`/workspace/tools/node-v20.19.2-linux-x64/bin` first on PATH).
- npm: **/usr/local/bin/npm 11.21.1 running on node v20.19.2**. Disclosure: the toolchain's own npm link is broken.
- `npm ci` rc 0. package-lock sha256 `56569550486f3450a31b435e94b807a7dc95d1e7ee7d3e9d5e09606e0ff6f75e`.
- `build:qa` rc 0 (sync-economy --check, tsc --noEmit, vite build --mode qa → dist-qa). Runtime build-id `m4.1+ba398b6`.
- Browsers:
  - playwright-core from the worktree's node_modules;
  - Chromium = /usr/bin/google-chrome; Firefox and WebKit are playwright's own builds;
  - axe-core 4.14.0 (`artifacts/v5-ui/tools/axe-core-4.14.0/axe.min.js`);
  - probe scripts on node v20.19.2.
- Servers: python http.server on 127.0.0.1 ports 5301 (ba398b6), 5302 (abe9cc6) and 5303 (76390f2). Never :4173.
- Lock discipline: one engine per hold, each hold under `flock .browser-test-3.lock` with timeout 600 and the 1-min load gated under 8; the lock was released between engines.
- Lanes:
  - `uiqa-pr83-ba398b6` (15 records) and `uiqa-pr83-abe9cc6-rt` (2 records). Every process was started via lane-run.
  - Servers were stopped via lane-kill. The first call printed TERM; the confirmation re-run printed exactly `GONE <pid>` with rc 0, for 2493992, 2557147, 2494003 and 2885104 (`logs/20-cleanup.log`).
  - Every recorded PID is now dead, and ports 5301-5319 are free.

## 9. Not run / disclosures

- The pixel-unchanged compare was run in Chromium only (360 and 1280 at cd 30 and 7). UI's pixdiff (their NOTE.md) also reports 0.
- The pre-existence check on 76390f2 was Chromium only, at 4 sizes. It covers F-A at 4 sizes and F-B at 1024x474 and 1280x720.
- The card/bar a11y rule is "no countdown" rather than "no digits", because the bar name legitimately carries the AC-R9 worker count. The strict no-digits rule was applied to nav and header.
- flags0 "1280" uses 1280x800.
- The F-A root cause (48 = min 44 + 4 px from the cascade) was not isolated, and no source was modified.
- `/workspace/qa-pr83-rt/` holds QA probe code only (rt.mjs, rc.mjs, ord.mjs, f0.mjs, px.mjs, fp.mjs and their chains). Nothing in the repo or harness was changed. No push and no external actions.
- `smoke/` there is a non-evidence smoke run.
- Superseded work: `qa/m3-recheck/pr83-abe9cc6-runtime-evidence/SUPERSEDED-ba398b6.md`. No matrix was ever run on abe9cc6.
- Interim abe9cc6 static report `qa/m3-recheck/pr83-abe9cc6-delta.md`, sha256 `7f2ac18bd983096f2bd3d2341775b1a7b3368cc78e70e9e7734135f764f2908c` (unchanged).
