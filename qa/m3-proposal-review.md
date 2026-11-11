# QA review: product/m3-proposal.md (Head of QA, 2026-10-15 21:55 CEST)
Scope: QA workstream, browser/device list, save-robustness ACs, playtest + D1 plan. References: engineering/m3-smoke-plan.md (draft), QA decisions on it. Code facts were checked on `m2-rc1` @ bf1962a. Product's file was not edited. Each item: **problem → concrete edit**. P1 = must fix before CEO approval, P2 = before kickoff, P3 = nice to have.

## P1 (must fix)
**1. The telemetry ring buffer will lose the first session, which breaks AC6, AC8 and part of AC3.**
`telemetry.ring_size` = 5000 with FIFO trim. Taps are batched to one event per second, and there are customer, sell, upgrade and worker_summary events on top. That's roughly 80–120 events per active minute, so the buffer holds about 45–60 min of play. Two sessions over 2 days with a ≥8 min first session can push session 1 (time-to-L10/L18, first upgrade, onboarding steps) out of the log before export.
→ Edit AC7/AC8: add "Engineering: the log keeps every `session_start/session_end`, `upgrade`, `onboarding_*`, `worker_hire`, `worker_manage*` event for the whole playtest. Only high-rate events (tap, customer_*, sell) are ring-trimmed. Or `ring_size` is raised to cover ≥4 h of play. QA verifies with a 4 h accelerated run: first-session milestone events are still present in the export."

**2. D1 isn't measurable as written.** The events carry no install/player id and no build version. `session_start` has no payload. A tester who clears storage or plays on two browsers produces two "players". There's no "Export log" button in the build today, only the debug path.
→ Edit AC6: "D1 = share of testers whose export contains ≥1 `session_start` with ts in [first_session_start + 20 h, + 48 h]. Computed by `product/m3-telemetry-review.md` script from exports. Owner Designer, QA verifies the script on 3 synthetic exports (D1 yes/no/edge at exactly 20 h and 48 h)." Add to W-C/AC7: "a random `install_id` (no personal data) + `build` on every `session_start`. A one-click Export log in Settings that works on iOS Safari (download or copy-to-clipboard fallback)."

**3. The sample size can't support a ±20% comparison or a 35% D1 gate.** 10 testers gives a 95% CI on D1 of about ±30 points (35% → 8–65%). AC3 at 80% of 10 swings 20 points per person. Time-to-L18 from ~10 human runs vs a Monte-Carlo median has huge spread, and casual testers may never reach L18.
→ Edit AC6/AC8: "Gate on medians with bootstrap 80% CI. A metric is 'off-sim' only if the whole CI lies outside ±20% of the sim's casual-model median. With n<10, or fewer than 5 testers reaching a milestone, the metric is reported as 'insufficient data', not pass/fail." State explicitly that AC3, AC4 and AC6 percentages are **directional, not release gates** (C2 already hints this; put it in the ACs). Compare against the **casual** model (AC-W1 Python, seeds 0–99), not seller15. Name which sim run is the reference.

**4. The device list doesn't match the smoke plan or QA's decisions.** AC9 lists macOS Safari, iOS Safari and Edge as equal "pass" targets with no source of devices. AC10's "1 desktop with each of 2 OSes" isn't defined.
→ Replace AC9/AC10 with the smoke-plan matrix:
- Must, automated on the box: Chrome (B1), Firefox (B2), WebKit as the Safari proxy (B4), emulated iPhone/Pixel (E1).
- Edge (B5) is covered by Chromium, plus **one real Edge-for-Linux run** (free).
- Must, real device: iOS Safari on a real iPhone (D1), macOS Safari on a real Mac (B3), mid-range Android Chrome (D2). These need Vadim's or friends' devices **or a paid device cloud**. The paid cloud and any **public hosting** (GitHub Pages or a tunnel) need **Vadim's approval via the CEO** (V2 and V1; add hosting explicitly to V1).
- If D1/B3 can't be covered, release is blocked unless the CEO accepts the risk in writing (smoke plan §5).
- WebKit results are labelled "proxy", never as Safari passes.

**5. AC12 fps is untestable as worded and conflicts with SM-9.** "≥55 fps median" has no method. "No frame >100 ms during 15 min" fails on any GC hiccup or tab switch.
→ Replace with QA's SM-9 rule: "In-page rAF sampler; 10 s warm-up, then 60 s sample, 4 workers hired, tab foreground. Pass: p95 frame ≤20 ms, ≤5% of frames >20 ms, no frame >100 ms in the sample, sim 10 Hz ±1 tick/s (via `window.eggfarm`). Run on B1 and D2 (D1 if available), 3 samples spread over a 15 min session, all must pass. Owner: Engineering builds the sampler, QA runs it." Keep memory: "heap after 4 h accelerated ≤1.2× heap at 10 min (Chrome `performance.memory` / DevTools snapshot), B1 only".

## P2 (before kickoff)
**6. Save-robustness AC14 asks for things that don't exist yet, and has no pass lines.** Today `load()` returns `null` on parse error or an unknown version, so the game starts fresh. That is the "silent wipe" AC14 forbids. There is no backup slot, quota handling or multi-tab lock.
→ Split AC14 into testable lines, each with method and owner (Eng builds, QA verifies):
- 14a Real-save migration: saves exported from **m1-rc2 (v4)** and **m2-rc1 (v5)** builds after ≥10 min play, committed as fixtures (`game/tests/fixtures/saves/`), plus synthetic v1–v3. Each loads with coins, levels, workers, energy, cooldown and Unpaid equal field-by-field, in unit test + one manual reload per browser.
- 14b Corrupt/truncated: 5 fixtures (truncated JSON, wrong type, version 99, empty string, valid JSON missing `state`). Each loads the last good backup (`eggfarm.save.bak`, written on every successful save) and shows a notice. Never a fresh start without a notice. Automated.
- 14c Quota/private mode: `setItem` throws `QuotaExceededError` (stubbed) and Safari private mode (real/WebKit). The game keeps running and shows a "progress won't be saved" warning once. Automated + D1.
- 14d Two tabs: the second tab shows "open in another tab" and doesn't write (BroadcastChannel/`storage` event). Automated in Chromium + Firefox.
- 14e Clock tamper: clock back → 0 offline and no negative timers (existing AC11). Clock forward → capped at 2 h, and Worker energy/cooldown don't advance. Worker cooldown after a clock change is ≤30 s. Automated via saved timestamp shift.
- 14f Kill/background: real D1/D2 force-kill after a purchase → the purchase persists (save on `visibilitychange`/`pagehide`).

**7. QA effort and the date aren't realistic.** The smoke plan alone is 4–5 working days (Eng 1.5–2 d tooling, QA 2 d). On top of that: an M3 test plan, a11y audit, save-hardening verification, telemetry-script verification and rc sign-off. The proposal plans browser-matrix testing Oct 16–19, while browser installs still need approval (smoke plan §7.1) and devices depend on V1/V2.
→ Edit §7: a QA line "QA effort ≈ 4 days: test plan 0.5, automated matrix triage 0.5, save/perf/a11y 1, real devices 1, telemetry-script check 0.25, sign-off 0.5 (+ re-test of fixes)". Make `m3-rc1` Fri Oct 23 conditional on: browser install OK by Oct 16, V1/V2 by Oct 19, the `xbrowser-smoke.mjs` sampler by Oct 19. Otherwise slip day for day (already stated for V1/V2; extend it to these).

**8. Several ACs lack a named method and owner.** Every AC should end with "Method: … · Owner: …".
→ Concretely:
- AC1 owner Eng/QA, method: rc report.
- AC2 is the AC7 bot.
- AC3 and AC4: Designer from exports, plus QA's functional check of show-once/skip/telemetry.
- AC5: define "useful upgrade" (= cheapest affordable or the nearest-in-time by income) and measure dead zones with the casual bot (all 100 seeds) and from exports (gaps between affordable states). "Visible countdown" counts.
- AC11: Lighthouse mobile preset, 3 runs, median, on `vite preview`. Size via `du` on gzip of dist.
- AC13: axe-core automated + manual keyboard pass on B1. Contrast per token list from Art & UX.
- AC15 (Ops/Product checklist).
- AC16 needs "Critical" defined. QA uses blocker/major/minor, so change it to "no open blocker; majors waived only by Product + CEO".

## P3
**9.** AC1: "`worker_yawn` once per Tired→yawn transition" is wrong. The yawn starts at ≤40%, while still Working. → "once per transition into the yawn range (energy crosses ≤40%, not Unpaid/Asleep); re-armed after Manage".
**10.** AC9 rotation "usable layout or rotate prompt": QA needs one choice. → Art & UX picks one before kickoff.
**11.** AC7 privacy: add "QA checks a sample export contains no free text, IP, UA string or device name beyond `install_id`/`build`".
**12.** Add the 210 unit/QA tests + `qa/rc2-scripts` as the B1 full regression to AC1 (matches the smoke plan exit criteria).

---
## Recheck: 2026-10-15 22:05 CEST (revised m3-proposal.md, rc1 Tue Oct 27, stretch Oct 23)
Compared against `engineering/m3-smoke-plan.md` **v1 (QA-reviewed)**. Box check: Playwright Chromium, Firefox and WebKit are installed (`~/.cache/ms-playwright`), which matches §6 "browser installs CEO-approved and underway".

### The 12 items
| # | Status | Evidence (quoted) / remaining gap |
|---|---|---|
| 1 Ring buffer | **Resolved** | AC7: "the log keeps every `session_start/session_end`, `upgrade`, `onboarding_*`, `worker_hire` and `worker_manage*` event for the whole playtest … Method: QA 4 h accelerated run shows first-session milestone events still in the export". It's in pt1 (§6). |
| 2 D1 measurable | **Resolved** | AC6: "≥1 `session_start` with a timestamp in [first `session_start` + 20 h, + 48 h] … QA verifies the script on 3 synthetic exports". AC7: "random `install_id` … and `build`", "Export log in Settings … copy-to-clipboard fallback". |
| 3 Sample size | **Resolved** | "AC3, AC4 and AC6 percentages are **directional, not release gates** … bootstrap 80% CIs … casual sim model (AC-W1 Python `run_m2`, seeds 0–99) … 'insufficient data'". |
| 4 Device list | **Partial** | AC9/AC10 now follow the matrix: "WebKit results are labelled 'proxy'", "one real Edge-for-Linux run", "A gap on iPhone or Mac blocks release unless the CEO accepts the risk in writing". **Gap (new N1):** AC9 says "The **full** smoke + M1/M2 AC checklist passes on" every target. The smoke plan says "S subset; full regression on B1". |
| 5 SM-9 fps | **Partial** | AC12 has the thresholds right ("p95 frame ≤20 ms, ≤5% of frames >20 ms, no frame >100 ms … 10 Hz ±1"). **But it contradicts smoke plan v1 SM-9 (new N2):** no F20+ save fixture or scripted loop, no "gate only on headed runs", no on-device overlay. The heap rule is "≤1.2× heap at 10 min" after 4 h, vs the smoke plan's "growth from min 5 to min 30 ≤ 10%". And "3 samples over a 15 min session" isn't in the smoke plan. |
| 6 Save AC14 | **Resolved** (two small gaps) | AC14a–f added, each with Method; "Owner for all: Engineering builds, QA verifies". Gaps: 14b doesn't say what happens when the **.bak is also corrupt** (needs a notice + fresh start). 14d is tested only "in Chromium + Firefox", so add WebKit, because Safari's `storage`-event behaviour is the risky one. |
| 7 QA effort/date | **Partial** | W-E: "Effort ≈4 d: test plan 0.5, automated matrix triage 0.5, save/perf/a11y 1, real devices 1, telemetry-script check 0.25, sign-off 0.5 (+ re-test of fixes)". This is still below smoke plan v1 (QA 2.5–3 d for the smoke work alone; real devices 1–1.5 d). The sequencing doesn't fit Oct 27 (see "Date fit" below). |
| 8 Method · Owner | **Resolved** (with exceptions) | "Each AC ends with **Method · Owner**"; "Useful upgrade = …"; AC16 "no open blocker, and majors only if Product + CEO waive them". Exceptions: AC8 "Method: review doc" has no QA check. AC5 has no QA functional check of "always visible" (hint strip present on every screen/state). |
| 9 worker_yawn | **Resolved** | AC1: "fires once per transition into the yawn range (energy crosses ≤40% while still Working, not Unpaid or Asleep), and re-arms after Manage". Note: a Tired worker (<30%) is also in the yawn range per E-1b. Say "while Working or Tired" or AC1 contradicts the shipped cue. |
| 10 Rotation | **Resolved** | AC9: "Phone landscape shows the 'Rotate for best view' prompt (not a usable layout)". |
| 11 Export privacy | **Resolved** | AC7: "QA checks a sample export has no free text, IP, UA string or device name beyond `install_id`/`build`". |
| 12 B1 regression | **Resolved** | AC1: "The full B1 regression passes (210 unit/QA tests + `qa/rc2-scripts`)". |

### New problems in the revision
- **N1 (P2) AC9 "full" vs the smoke plan's subset.** → Edit: "SM-1…SM-10 smoke subset on every Must target; full M1/M2 regression on B1 only (smoke plan §5)".
- **N2 (P1) AC12 contradicts smoke plan v1 SM-9.** QA approved v1, so the proposal must match it. → Edit AC12: "Scenario: F20+ save fixture, all 4 workers, scripted collect/sell/Manage loop (test-hook build). Gate only on headed box runs (B1) and on devices via the on-screen overlay; headless is informational. Heap (B1, CDP): growth from min 5 to min 30 ≤10%." Drop the "4 h ≤1.2×" rule or label it informational. Keep the 4 h accelerated run for overflow/formatting only.
- **N3 (P1) Real-device perf has no route.** AC12 says "D2 is emulated-only … until V2 is decided". An emulator can't give a frame-time pass, and AC10 says D2 is a real-device must. W-C also leaves out the smoke plan's "on-screen debug overlay for real devices (0.5 d)" and "hosting a build reachable from phones (0.5 d)". → Edit: add both to W-C. AC12: "emulated D2 numbers are informational; the D2 gate needs the real device (V2) or a CEO risk waiver, same as iPhone/Mac".
- **N4 (P2) AC16 "all ACs pass"** includes directional AC3/AC4/AC6, which have no pass/fail. → "all gating ACs pass; AC3/AC4/AC6 are reported; AC10 gaps follow C4".
- **N5 (P2) Effort totals disagree with smoke plan v1.** W-C budgets the harness at 1–1.5 d plus a 0.5 d sampler. Smoke plan v1 says Eng 3–4 d (harness 1–1.5, sampler/fixture/heap 0.5–1, overlay 0.5, hosting 0.5, Edge run). → Edit: align W-C with smoke plan §6, and re-check that pt1's "≈2.5 d, no slack" still holds.
- **N6 (P3) AC11.** The "≤500 KB gzipped total" doesn't say whether audio is included (mp3s don't gzip). → "total transfer incl. audio and fonts".
- **N7 (P3) AC4.** Beat (b) "energy/Manage coach bubble" has no trigger rule (immediately after hire? at first yawn?) and no telemetry event name. → Name the event(s), e.g. `ftue_workers{beat:a|b}`.
- **N8 (P3)** The smoke plan §7.1 still asks for install approval. The proposal says it's done. Engineering should close §7.1 so the two docs agree.

### Date fit (QA effort vs Oct 27)
A realistic QA estimate is ≈5–5.5 d: test plan 0.5, triage 0.5, devices 1.5, save/perf/a11y 1, telemetry script + privacy + 4 h run 0.5, sign-off 0.5, re-tests ≈1. That's within the 8 working days Oct 16–27. **The sequencing is what fails.** The post-pt1 Engineering work (≈5 d, save hardening 1.5 d, a11y 1 d) runs Oct 20–26, so the full rc build arrives Mon Oct 26 at the earliest. That leaves QA one day for AC13/AC14 verification, the device re-run on rc and sign-off, with no re-test slack. Real-device work can't start before V1/V2 (Oct 19) plus hosting. → Edit §7: add a **`m3-rc0` drop on Thu Oct 22** with save hardening (AC14) and the sampler/overlay. QA verifies AC14 and the SM-9 runs on rc0 Oct 22–23, then on `m3-rc1` (Mon Oct 26) does a delta + device re-run, with sign-off Tue Oct 27. Without rc0, rc1 realistically moves to Thu Oct 29. Oct 23 is not achievable for QA, so mark it "build-only stretch, no sign-off".

### Verdict
**Not ready for the CEO yet.** Nine items are resolved and three are partial (4, 5, 7). Before it goes to the CEO, these need fixing: N2 (AC12 vs SM-9), N3 (no real-device perf route, overlay and hosting missing from W-C) and the date sequencing (rc0 drop or Oct 29). The rest are P2/P3 text edits.

---
## Final recheck: 2026-10-15 22:10 CEST
| Check | Status | Evidence |
|---|---|---|
| AC12 = SM-9 verbatim incl. heap | **Resolved** | `diff` of the Sampler…heap text vs smoke plan v1: identical ("growth from min 5 to min 30 ≤ 10%") |
| Emulated = informational; overlay + hosting in W-C | **Resolved** | AC12 "Emulated frame times are informational only"; W-C "on-screen sampler overlay for real devices (0.5 d), phone-reachable hosting (0.5 d, needs Vadim's approval via V1)" |
| Real Android gap needs a CEO waiver | **Resolved** | AC10 "A gap on iPhone, Mac or real Android blocks release unless the CEO accepts the risk in writing"; §5 risks table matches |
| rc0 Oct 22 → rc1 Oct 27, else Oct 29 | **Resolved** | §7 "`m3-rc0` (save hardening + SM-9 sampler/overlay): Thu Oct 22"; "Tue Oct 27 … conditional on rc0 landing Oct 22. Without rc0, Thu Oct 29"; "Fri Oct 23: build-only stretch … no sign-off" |
| N1 AC9 subset | Resolved | "SM-1…SM-10 smoke subset … full M1/M2 regression runs on desktop Chrome (B1) only" |
| N2/N3 | Resolved | see the first two rows |
| N4 AC16 | Resolved | "all gating ACs pass (AC3, AC4 and AC6 are directional and only reported; AC10 gaps follow C4)" |
| N5 Eng effort | Resolved | W-C "aligned with … §6, ≈3–4 d" |
| N6 AC11 | Resolved | "≤500 KB gzipped total transfer including audio and fonts" |
| N7 AC4 | Resolved | "(b) triggered when the first hire completes … `onboarding_step {name:'workers_coach'}`" |
| N8 | Engineering closing §7.1 | not checked (Engineering's doc) |
| P2 14b backup corrupt / 14d WebKit | Resolved | "If the backup is also corrupt, the game shows a notice and starts fresh"; "automated in Chromium, Firefox and WebKit" |
| P3 AC1 yawn | Resolved | "while Working or Tired" |
| Leftover, non-blocking | Open (P3) | W-E still says QA "≈4 d … real devices 1", where smoke plan v1 says 1–1.5 d and the QA estimate is ≈5–5.5 d. With rc0 the dates still fit. AC5 and AC8 have no QA verification step (AC5: hint strip visible in every state; AC8: QA spot-checks 2 metrics against raw exports). QA will cover both in `qa/m3-test-plan.md`. No proposal edit is required. |

**SIGN-OFF (Head of QA): m3-proposal.md is ready for the CEO.**
