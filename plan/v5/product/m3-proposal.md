# M3 Proposal: Public-Release Readiness (Head of Product, draft for CEO, 2026-10-15)

Baseline: M1 signed off at `m1-rc2` (f485987). M2 Workers v1.1 is tagged `m2-rc1` (bf1962a) and QA signed it off. Workers numbers are frozen at v1.1. Telemetry is a local event log with JSON export.
Rule for this doc: every number marked **(proposed target)** is a target we are proposing. None of them has been measured.

## 1. Goal
Get the current game (M1 loop + Workers) to a state where it **could** go public on the web: polished, understandable in the first minutes, playable in mobile portrait and on desktop, tested on real browsers and devices, tuned against real playtest telemetry, and with a listing package ready. **M3 ends at "ready to publish". Nothing is published.** Publishing is a separate CEO → Vadim decision.

## 2. Scope
**In**
1. Post-rc1 items: Workers tab icon, Manage all greyed out during cooldown (m-1), `worker_yawn` event (m-2), the stale v1.0 drain line in m2-workers-layout.md.
2. FTUE: the existing 3-step onboarding (collect → sell → upgrade), plus a two-part Workers intro (AC4).
3. Retention basics already in the design: the welcome-back/offline modal, a clear next goal on screen, and save that you can trust.
4. Mobile portrait (390 px reference) and desktop layout parity. Touch targets ≥44 px.
5. Cross-browser and real-device test pass. This was waived for internal builds and is now required.
6. Closed playtest with the existing local event log + JSON export, then a telemetry review against the sim.
7. Performance, load time, accessibility and save-robustness fixes.
8. Listing prep in the repo only: copy, screenshots, icon, short trailer/GIF, privacy note, credits/licences.

**Out (cut)**
- New features: prestige, new workers, events, monetization/ads/IAP, cloud save, accounts, leaderboards, localization, native app builds.
- Economy retunes other than fixes justified by playtest data, and those go through a change request (Designer → Head of Product).
- A remote analytics backend. Playtest data comes back as JSON exports.
- Creating any store, portal, hosting, analytics or social account. Publishing, spend.

## 3. Workstreams (one owner each)
| # | Workstream | Owner | Output |
|---|---|---|---|
| W-A | M3 spec, FTUE/retention ACs, playtest plan + tester script, listing copy | Product/PMs (Head of Product; PM Workers for the Workers FTUE step) | this doc, `product/m3-playtest-plan.md`, `product/listing/copy.md` |
| W-B | Telemetry-vs-sim review, D1/session funnel analysis, any change request | Economy/Balance Designer | `product/m3-telemetry-review.md` |
| W-C | Post-rc1 fixes; Workers intro; player-facing Export log in Settings (works on iOS Safari) + `install_id`/`build` on `session_start` + telemetry retention fix; smoke-plan work aligned with `engineering/m3-smoke-plan.md` §6, ≈3–4 d in total: harness `scripts/xbrowser-smoke.mjs` (1–1.5 d), SM-9 sampler + F20+ fixture + heap check (0.5–1 d), on-screen sampler overlay for real devices (0.5 d), phone-reachable hosting (0.5 d, needs Vadim's approval via V1), one Edge-for-Linux run; load-time script; save hardening (≈1.5 d); a11y fixes; `m3-pt1`, `m3-rc0` and `m3-rc1` tags. Effort ≈2.5 d before pt1, ≈5 d after (smoke-plan items counted within these) | Engineering | `m3-pt1`, `m3-rc1` builds + notes |
| W-D | Polish pass (fixed list, frozen at kickoff); the nine contrast token swaps from `art-ux/m3-review.md` §1 (muted, button label, barn, wood, meadow-as-text, floater, focus ring, disabled cue, empty-slot outline); next-goal hint strip above Collect (AC5, new UI); FTUE final + Workers intro beats + pointer asset; phone-landscape rotate prompt; portrait/desktop parity; a11y review (contrast, focus, reduced motion); listing art (icon, screenshots, GIF). Effort ≈5 studio-days | Art & UX | `art-ux/m3-polish.md`, `product/listing/` assets |
| W-E | M3 test plan, smoke-plan matrix runs, save/perf/a11y checks, D1-script verification on synthetic exports, export privacy check, rc sign-off report. Effort ≈4 d: test plan 0.5, automated matrix triage 0.5, save/perf/a11y 1, real devices 1, telemetry-script check 0.25, sign-off 0.5 (+ re-test of fixes) | QA | `qa/m3-test-plan.md`, `qa/m3-rc-report.md` |
| W-F | Playtest logistics (tester list, collecting the JSON exports, schedule), watchdog, release-readiness checklist | Ops | `ops/m3-playtest-log.md`, `ops/release-checklist.md` |

## 4. Acceptance criteria
Each AC ends with **Method · Owner**. "Useful upgrade" = an upgrade the player can afford now that raises income or capacity. Bug severity follows QA's blocker/major/minor scale. Builds: **`m3-pt1`** (playtest) carries AC1, AC4, AC7's export/telemetry items, the contrast token swaps and the AC5 hint. **`m3-rc0`** (Thu Oct 22) adds save hardening (AC14) and the SM-9 sampler/overlay. **`m3-rc1`** adds the rest of accessibility (AC13) and the playtest and cross-browser fixes.

**Carry-over**
- **M3-AC1** Post-rc1 items done: Workers tab icon wired (`icon-hire.svg`). Manage all greyed and `aria-disabled` for the whole 30 s cooldown. `worker_yawn` fires once per transition into the yawn range (energy crosses ≤40% while Working or Tired, not Unpaid or Asleep), and re-arms after Manage. All M1/M2 ACs pass. The full B1 regression passes (210 unit/QA tests + `qa/rc2-scripts`). The sim/pacing suite is unchanged (AC7, AC-W1, AC-W4, AC-W4b). *Method: automated suite + rc report · Owner: Engineering builds, QA verifies.*

**FTUE and retention.** AC3, AC4 and AC6 percentages are **directional, not release gates**. Medians are compared, with bootstrap 80% CIs, against the **casual sim model (AC-W1 Python `run_m2`, seeds 0–99)**. A metric is "off-sim" only if its whole CI lies outside ±20% of the casual median. With n<10, or fewer than 5 testers reaching a milestone, the metric is reported as "insufficient data", not pass/fail.
- **M3-AC2** First upgrade ≤30 s for seller15. *Already met in M1 (AC7). It's kept as a regression gate.* *Method: AC7 bot · Owner: Economy/Balance Designer, QA runs.*
- **M3-AC3** Onboarding: a new save shows the 3-step overlay once. It can be skipped. Telemetry logs each step plus skip. Directional: ≥80% of testers finish or skip it within 90 s **(proposed target)**. *Method: QA functional check (show-once/skip/telemetry) + Designer from exports · Owner: Product spec, Engineering builds.*
- **M3-AC4** Workers intro in two one-time beats, each logged as telemetry: (a) at the F3 unlock, a "Hire a Market Hand" tip that opens the Workers tab; (b) triggered when the first hire completes, the energy/Manage coach bubble. Events follow the existing naming: `onboarding_step {step, name:'workers_hire_tip'}` for (a) and `onboarding_step {step, name:'workers_coach'}` for (b). Directional: ≥70% of playtesters who reach the unlock hire a worker within 5 min of it **(proposed target)**. *Method: QA functional check + Designer from exports · Owner: PM Workers spec, Engineering builds.*
- **M3-AC5** A "next goal" hint (the cheapest useful upgrade or the next unlock) is always visible, in a strip above Collect. This is new UI, designed in W-D. It ships in `m3-pt1` on Mon Oct 19 as long as Art & UX deliver the final spec and assets by Fri Oct 16 18:00. Otherwise pt1 moves to Tue Oct 20. No dead zone longer than 2 min without a useful upgrade affordable or a visible countdown **(proposed target)**. *Method: casual bot over all 100 seeds + gaps between affordable states in exports · Owner: Economy/Balance Designer; Art & UX designs, Engineering builds.*
- **M3-AC6** D1 = share of testers whose export contains ≥1 `session_start` with a timestamp in [first `session_start` + 20 h, + 48 h], computed by the Designer's script in `product/m3-telemetry-review.md`. Directional: ≥35% **(proposed target)**. Median first session ≥8 min **(proposed target)**. *Method: script on exports; QA verifies the script on 3 synthetic exports (D1 yes, no, and edges at exactly 20 h and 48 h) · Owner: Economy/Balance Designer.*

**Playtest and telemetry**
- **M3-AC7** Playtest executed: ≥10 testers **(proposed target)**, each plays ≥2 sessions over ≥2 days and sends the JSON export via the one-click **Export log** in Settings. It works on iOS Safari (download, or copy-to-clipboard fallback). Every `session_start` carries a random `install_id` (no personal data) and `build`. Retention: the log keeps every `session_start/session_end`, `upgrade`, `onboarding_*`, `worker_hire` and `worker_manage*` event for the whole playtest, and only high-rate events (tap, customer_*, sell) are ring-trimmed. Or the log is sized to hold ≥4 h of play. Ops logs who sent what. Testers are briefed that the export is local and that they choose to send it. *Method: QA 4 h accelerated run shows first-session milestone events still in the export; QA checks a sample export has no free text, IP, UA string or device name beyond `install_id`/`build` · Owner: Engineering builds, Ops runs the playtest, QA verifies.*
- **M3-AC8** Telemetry review filed. It shows time-to-L10/L18, first-upgrade time, worker hire/Manage rates and drop-off points vs the casual sim, with CIs and the "insufficient data" rule above. Any retune is a change request. Workers stay at v1.1 unless one is approved. *Method: review doc · Owner: Economy/Balance Designer.*

**Platform coverage (per `engineering/m3-smoke-plan.md` matrix)**
- **M3-AC9** The SM-1…SM-10 smoke subset passes on every Must target below. The full M1/M2 regression runs on desktop Chrome (B1) only (smoke plan §5).
  - Automated on the box (must): Chrome (B1), Firefox (B2), WebKit as the Safari proxy (B4), emulated iPhone/Pixel (E1). WebKit results are labelled "proxy", never as Safari passes.
  - Edge (B5): covered by Chromium plus one real Edge-for-Linux run.
  - Viewports: 390×844, 360×640 (the fit gate), 768 px and 1280×800. Phone landscape shows the "Rotate for best view" prompt (not a usable layout).
  *Method: `scripts/xbrowser-smoke.mjs` · Owner: Engineering harness, QA runs and triages.*
- **M3-AC10** Real devices (must): iOS Safari on a real iPhone (D1), macOS Safari on a real Mac (B3), mid-range Android Chrome (D2), reached via phone-reachable hosting (V1). Each gets a 15-min session, a background/return test and a force-kill test. Results go in the QA matrix with device and OS versions. Sourcing depends on V2. **A gap on iPhone, Mac or real Android blocks release unless the CEO accepts the risk in writing.** *Method: manual checklist · Owner: QA.*

**Performance and load**
- **M3-AC11** Time to interactive (first tappable egg) ≤3 s on 4G (150 ms RTT, 9 Mbps) with 4× CPU throttling, 390×844. Fast 3G is reported but doesn't gate. Size budget: ≤500 KB gzipped total transfer including audio and fonts, ≤150 KB gzipped first load (critical path). Lighthouse mobile Performance ≥85 **(proposed targets)**. For reference, m2-rc1 was measured at 154 KB gzipped total, 72 KB transferred at load and about 1.0 s to `load` on 4G (Engineering review §1). *Method: CDP load script in CI (3 runs, median) on `vite preview` + one Lighthouse mobile run; size via gzip of `dist` · Owner: Engineering, QA verifies.*
- **M3-AC12** SM-9 Performance (verbatim from `engineering/m3-smoke-plan.md` v1): **Sampler:** in-page rAF sampler exposed behind the existing test-hook gate (off in prod). **Scenario:** F20+ save fixture, all 4 workers hired, scripted collect/sell/Manage loop; 10 s warm-up, then 60 s sample. **Pass:** p95 frame time ≤ 20 ms, ≤ 5% of frames > 20 ms, no frame > 100 ms, sim 10 Hz ±1 tick/s. **Box:** gate only on headed runs on `:9`; headless numbers are informational. **Real devices:** the sampler writes its result to an on-screen debug overlay. **Heap (B1):** measured via CDP; growth from min 5 to min 30 ≤ 10%. Emulated frame times are informational only. The D1/D2 gate needs the real devices (V2) or a written CEO waiver (C4). A separate 4 h accelerated run checks only for number overflow and large-value formatting. *Method: SM-9 headed box runs + device overlay screenshots · Owner: Engineering builds the sampler and overlay, QA runs it.*

**Accessibility (in `m3-rc1`; the contrast token swaps land in `m3-pt1`)**
- **M3-AC13** WCAG 2.2 AA contrast: text ≥4.5:1, large text (≥24 px, or ≥18.66 px bold) ≥3:1, non-text UI and state indicators (energy bars, rings, focus ring, outlines) ≥3:1 under 1.4.11. Decorative or duplicated effects are exempt. All controls ≥44 px and reachable and usable by keyboard on desktop, with visible focus. Disabled states use more than colour alone. `prefers-reduced-motion` respected. SFX toggle persists. Lighthouse Accessibility ≥90 **(proposed target)**. *Method: axe-core automated + manual keyboard pass on B1, contrast per Art & UX's token list (`art-ux/m3-review.md` §1) · Owner: Art & UX tokens, Engineering fixes, QA verifies.*

**Save robustness (in `m3-rc1`, ≈1.5 d Engineering)** *Owner for all: Engineering builds, QA verifies.*
- **M3-AC14a** Real-save migration: saves from m1-rc2 (v4) and m2-rc1 (v5) after ≥10 min of play are committed as fixtures (`game/tests/fixtures/saves/`), plus synthetic v1–v3. Each loads with coins, levels, workers, energy, cooldown and Unpaid matching field by field. *Method: unit test + one manual reload per browser.*
- **M3-AC14b** Corrupt or truncated save: 5 fixtures (truncated JSON, wrong type, version 99, empty string, valid JSON missing `state`). Each loads the one rotating last-good backup (`eggfarm.save.bak`, written on every successful save) and shows a notice. If the backup is also corrupt, the game shows a notice and starts fresh. Never a fresh start without a notice. *Method: automated.*
- **M3-AC14c** Quota or private mode: `setItem` throws `QuotaExceededError` (stubbed), plus Safari private mode. The game keeps running and shows a "progress won't be saved" warning once. *Method: automated + D1.*
- **M3-AC14d** Two tabs: the second tab shows a warning ("open in another tab") and goes read-only, never writing the save. Uses `storage` events/BroadcastChannel, not Web Locks. *Method: automated in Chromium, Firefox and WebKit.*
- **M3-AC14e** Clock tamper: clock set back → 0 offline and no negative timers (AC11 kept). Clock set forward → capped at 2 h, and worker energy and cooldown don't advance. Worker cooldown after a clock change is ≤30 s. *Method: automated via saved-timestamp shift.*
- **M3-AC14f** Kill or background: a real D1/D2 force-kill right after a purchase keeps the purchase (save on `visibilitychange`/`pagehide`). *Method: manual on devices.*

**Listing prep (nothing published)**
- **M3-AC15** `product/listing/` contains a title, short (≤80 chars) and long description, feature bullets, genre/tags, an age-rating questionnaire draft, a privacy note (local-only data), credits and the licence list: audio/assets (from `art-ux/assets/audio/LICENSES.md`) plus SIL OFL 1.1 for the Fredoka and Nunito fonts, a 512×512 icon, ≥5 portrait and 3 desktop screenshots, and a ≤30 s GIF/trailer. A one-page comparison of candidate portals and store requirements is included, for the CEO to decide on. **No account is created, nothing is uploaded or submitted.** *Method: Ops/Product checklist · Owner: Product/PMs (copy), Art & UX (art).*

**Release gate**
- **M3-AC16** QA signs off `m3-rc1`: all gating ACs pass (AC3, AC4 and AC6 are directional and only reported; AC10 gaps follow C4), no open blocker, and majors only if Product + CEO waive them. Report filed. The Ops release checklist is complete. The CEO receives a go/no-go package for Vadim. *Method: rc report + checklist · Owner: QA, Ops.*

## 5. Risks and mitigations
| Risk | Mitigation |
|---|---|
| No real testers or devices: the studio is bots | V1/V2 below. Fallback: Vadim plus a few people he picks run the playtest and device checks. Emulators and WebKit cover the rest, labelled "proxy". An iPhone, Mac or real Android gap blocks release unless the CEO accepts the risk in writing. |
| The telemetry ring buffer (5000, FIFO) drops session 1 before export | Retention fix + Settings export in `m3-pt1` (AC7); QA's 4 h accelerated run. |
| D1 sample too small to mean much | Directional only, with CIs and "insufficient data" (§4). Gate on funnel and drop-off findings. Plan a second wave if borderline. |
| Testers don't send their exports | One-click Export log, a tester script with a deadline, and Ops chases on day 2. |
| Safari/iOS issues with audio unlock, localStorage eviction, or bfcache | QA tests iOS first once V2 is decided. Engineering timeboxes fixes (≈1 d in plan). Otherwise a documented limitation with CEO approval. |
| Save hardening is net-new (no backup, quota or tab handling today) | Moved to rc with ≈1.5 d budgeted. Split into the six testable checks in AC14. |
| Contrast fixes, the AC5 hint or FTUE land after `m3-pt1`, so playtest data reflects UI that later changes | All three must land before `m3-pt1`. Art & UX starts Oct 16. |
| Engineering's pt1 capacity (≈2.5 d) has no slack | Slim pt1 scope. If the smoke harness must land first, or the AC5 spec/assets miss Fri 18:00, pt1 moves to Tue Oct 20. |
| Full rc arrives too late for QA to verify save hardening and perf | `m3-rc0` drop Thu Oct 22 with AC14 + sampler/overlay. QA verifies them Oct 22–23. Without rc0, rc1 moves to Thu Oct 29. |
| Store screenshots/GIF depend on the final rc | Draft set shot on `m3-pt1`, re-shot on `m3-rc1`. |
| The palette swap breaks screenshot comparisons | QA re-baselines all screenshot baselines after the token swap. |
| Playwright installs (~400 MB) change the shared box | CEO-approved. Ops notes it in ops-log.md. |
| Polish creep | Art & UX polish list is fixed at kickoff. Anything new goes to M4. |
| Playtest pushes for retunes, so pacing churns | Change requests only, sim proof first, and the AC7/AC-W gates rerun. A retune moves the rc. |
| Pressure to publish early | Nothing is hosted publicly or published without CEO → Vadim sign-off (AC15/16). |

## 6. Dependencies and decisions needed
**Dependencies:** AC1, the contrast swaps, the AC5 hint, the Workers intro, the Export log and the telemetry retention fix go into `m3-pt1`. The playtest needs `m3-pt1` **and a way to reach testers (V1)**. The Designer's D1 script, verified by QA, is needed before the review. The playtest has to run ≥2 calendar days (48 h D1 window) before the telemetry review. The review comes before any retune and before `m3-rc1`. The smoke harness and SM-9 sampler are needed before matrix testing. Real-device runs need V1/V2 (Oct 19) and the phone-reachable hosting. Listing screenshots are drafted on pt1 and final on rc. Browser installs are already CEO-approved and underway, so they're no longer a dependency.

**For the CEO:**
- C1 Approve scope and cuts (§2) and the proposed targets (AC3–AC7, AC11–AC13).
- C2 Confirm AC3/AC4/AC6 as directional (not release gates), with the CI and "insufficient data" rule.
- C3 Which portals or stores to prepare for in the comparison (e.g. a web portal vs an itch.io-style page vs an app-store wrapper later).
- C4 Standing rule: a missing real iPhone, Mac or Android result blocks release unless you accept the risk in writing.

**For Vadim, via the CEO (accounts, spend, legal, publishing).** Nothing is publicly hosted until he answers.
- V1 Playtesters and hosting: who the testers are, and how the build reaches them. Free static hosting (e.g. GitHub Pages) or a tunnel makes the build publicly reachable. The no-external-service option is a `dist/` zip + local serve, which is impractical on phones. **Needed by Mon Oct 19.**
- V2 Real devices (iPhone, Mac, mid-range Android): Vadim's own or friends' devices, or a paid device cloud (account + spend). **Needed by Mon Oct 19.**
- V3 Legal: privacy note wording, game name/trademark check, and the age rating.
- V4 Later, after M3: the go/no-go for publishing and creating store/portal accounts.

**Still unresolved**
- The Lighthouse Performance ≥85 and Accessibility ≥90 scores are kept as proposed targets from one run. Engineering preferred script-based gating, so the CEO should confirm whether the scores gate or are just reported.
- The v1.1 energy-drain figure still needs to be sent to Art & UX so they can fix `m2-workers-layout.md`.

## 7. Proposed date
**Proposed:**
- `m3-pt1` (playtest): Mon Oct 19 EOD. It moves to Tue Oct 20 if the smoke harness must land first or the AC5 spec/assets miss Fri Oct 16 18:00.
- `m3-rc0` (save hardening + SM-9 sampler/overlay): Thu Oct 22.
- `m3-rc1` + listing package, QA sign-off: **Tue Oct 27, 2026**, conditional on rc0 landing Oct 22. Without rc0, Thu Oct 29.
- Fri Oct 23: build-only stretch for rc1, with no sign-off that day.

**Reasoning:** Engineering estimated M2 at ≈12.5 dev-days for Fri Oct 30, and it was signed off on Oct 15, about two weeks early. M3 doesn't compress the same way. M2 was mostly sim work with tests already modelled. M3's unknowns (cross-browser, iOS, save edge cases) only show up in testing. Budget: ≈2.5 Engineering days before pt1 with no slack, ≈5 after (smoke-plan work ≈3–4 d in total), QA ≈5–5.5 d, and Art & UX ≈5 d starting Oct 16. The constraint is sequencing, not total effort. Without rc0, the full rc only arrives Mon Oct 26, which leaves QA one day for save/perf verification and the device re-run.

**Dependency chain:**
1. Art & UX AC5 spec/assets by Fri Oct 16 18:00.
2. `m3-pt1` Oct 19 (or 20). V1/V2 decided by Oct 19, then hosting.
3. Playtest ≥48 h, Oct 19/20 → Oct 22.
4. `m3-rc0` Oct 22. QA verifies AC14 + SM-9 headed runs and starts device runs Oct 22–23.
5. Telemetry review Oct 22–23. Any approved retune moves rc1.
6. Fixes Oct 23–25. `m3-rc1` build Mon Oct 26.
7. QA delta + device re-run, then sign-off Tue Oct 27.

**If V1/V2 slip past Oct 19, every later date slips day for day.** Internal work (AC1, AC9 automated, AC11, AC13, AC14) continues regardless.

> **Engineering total effort (Head of Engineering, Oct 15):** about 6–7 days from now to m3-rc1. That's the pt1 items (about 2 days), rc0 (save hardening and sampler/overlay, about 2 days), the smoke harness (about 1 day) and fixes from cross-browser and playtest testing (about 1–2 days). The 3–4 day figure covers only the smoke-harness workstream. Hosting isn't counted until Vadim decides. rc0 assumes the harness finishes before pt1 and that no pt1 fixes carry over.

> **QA sign-off (Head of QA, Oct 15):** ready for the CEO. QA's realistic effort is 5–5.5 days, which still fits with rc0. N8 (smoke plan §7.1) is closed by Engineering.

> **CEO decisions (Oct 15):**
> - C1: approved (scope, targets, dates).
> - C2: AC3, AC4 and AC6 (including D1) are directional, with bootstrap CIs and the 'insufficient data' rule.
> - C3: prepare listing packages for itch.io, CrazyGames and Poki. Prep only, with no accounts or submissions.
> - C4: a missing real iPhone, Mac or Android result blocks release unless the CEO accepts it in writing.
> - Lighthouse: Accessibility ≥90 gates; Performance ≥85 is reported only.
> - V1 and V2 are with Vadim.
>
> **Status: APPROVED. Proceed.**

> **AC5 and FTUE clarification (Head of Product, Oct 15):** the next-goal strip is "always visible once onboarding step 3 completes or is skipped", and it's hidden during steps 1–3. I've confirmed all five Art & UX assumptions in art-ux/m3-ftue-spec.md §5: the Workers tip shows once per save; it triggers when Workers are unlocked and the player can afford a hire; players who skip onboarding still get it; and the overlay keeps its pre-bubble and closing toast.

> **AC14g, iOS storage eviction (Head of Product, Oct 15):** iOS Safari can clear a site's stored data after 7 days without a visit, which would wipe the save. On iOS Safari only, and only when the game isn't running from the Home Screen, show a one-time dismissible "Add to Home Screen" tip at the start of session 2. Settings also gets a permanent line with the same tip next to Export. Art & UX writes the copy by Oct 20, Engineering builds it in rc0 or rc1, and QA verifies it on a real device. Not showing on a real iPhone counts as a major. A periodic export nudge is out of M3 scope. Method: real-device pass · Owner: QA.

> **AC10, waived for rc1 (Oct 15, 22:56):** Vadim accepted the risk, and it's logged in decisions.md. For rc1 the coverage is WebKit and emulated iOS only. AC14g stays in. QA verifies it in emulated iOS WebKit, and the rc1 report lists "not checked on a real device" as a known gap. The real-device major criterion in AC14g is deferred until a real-device pass happens.

> **AC14g scope (Oct 15):** The tip shows on all iOS browsers whenever the game isn't launched from the Home Screen. Safari shows the "Tap Share" line. Chrome, Firefox and other iOS browsers show the "Tap Share in the address bar" line. Android doesn't show the tip.
