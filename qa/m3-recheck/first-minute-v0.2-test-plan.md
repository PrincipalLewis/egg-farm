> **Superseded** by `qa/m3-recheck/first-minute-v0.3.2-test-plan.md` (v0.3.2, pin `9980ec22410b…`, alt-C dropped, FM-AC1/AC3 BLOCKED). Kept for history only.

# First-minute v0.2 — test plan rows (draft)
Common setup: fresh save (new context, cleared storage), build-id `m3-rc1-pre+<sha>` verified at runtime, own port (not :4173), one engine at a time.
VP-ALL = 360x800, 375x667, 390x844, 430x932, 1280x800, 1024x474d, 1280x720d, 1366x768d. Engines E3 = Chromium, Firefox, WebKit.

| ID | AC | Setup | Steps | Expected / tolerance | Viewports | Engines |
|---|---|---|---|---|---|---|
| FM-T01 | AC1 | fresh, START_COOP=10 | load; read coop at t0; tap Collect at t0+1 s | coop 10 at t0; Collect enabled and pulsing; after tap coop 5±1, `collect.eggs=5` | 390, 1280x720d | E3 |
| FM-T01C | AC1 (alt C) | fresh, coop 0 | load; tap at 1 s and again at 3.5 s | 1 s tap gives 0 eggs (`tap.empty`); first eggs once floor(coop)≥5 at 3.3±0.2 s | 390 | Chromium |
| FM-T02 | AC2 | fresh | bot taps at 1 s (or on the prompt); read event log | first `tap` with eggs>0 has fgMs ≤ 5,000 | 390 | E3 |
| FM-T03 | AC3 | sim, CSV 86f0e80e3593 | seller15 and cheapest, seeds 1–30 | p50 ≤ 30 s, p75 ≤ 45 s; min reported (info only, not a gate) | n/a | node |
| FM-T04 | AC4 | fresh | walk steps 1–3; capture caption textContent and rects | exact strings; wrapping OK; no ellipsis; scrollWidth ≤ clientWidth; inside viewport; pointer target per layout | VP-ALL | E3 |
| FM-T05 | AC5 | after the first sale, coins < cost | read hint; measure hit rect; tap | '$N to go · Upgrades ›', N live (≤250 ms); ≥44×44; Upgrades tab active (<1024) or card ≥90% in view in ≤600 ms (docked); target Buy pulses 1 cycle exactly | VP-ALL | E3 |
| FM-T06 | AC6 | coins ≥ cost | read hint; tap | 'Ready! Tap to buy.' ≤250 ms; same open/scroll and single pulse | 390, 1024x474d, 1366x768d | E3 |
| FM-T07 | AC7 | fresh | sample Collect transform every 50 ms for 3 s; tap; keep sampling | peak scale 1.06±0.01; period 1,200±50 ms; stops ≤100 ms after tap and doesn't return | 390, 1280x720d | E3 |
| FM-T07RM | AC7 | fresh, reducedMotion: reduce | load; inspect Collect | animation-name none; identity transform; 3 px outline | 390, 1280x720d | E3 |
| FM-T08 | AC8 | fresh | sample every 100 ms through the FTUE and to 120 s, counting pulsing elements | count ≤ 1 at every sample | 390, 1024x474d | E3 |
| FM-T09a | AC9 | fresh | no input; sample pointer and pulse every 50 ms for 0–6 s | pulse ≤100 ms after t0; pointer visible at 3,000±150 ms; pulse gone ≤50 ms after that; never both | 360, 390, 1280x720d | E3 |
| FM-T09b | AC9 | fresh | tap Collect at 1 s | no step-1 pointer through 6 s | 390, 1280x720d | E3 |
| FM-T10 | AC10 | after the FTUE (onboarding complete) | wait for the next-goal hint; repeat T05 and T06 | as T05/T06 for the named card | 390, 1366x768d | E3 |
| FM-A11Y1 | AC4/5/6 | fresh | axe scan at each step; hint has role=button or is a link with an accessible name containing the text; keyboard Enter/Space activates it; focus is visible | 0 serious/critical axe issues; operable by keyboard | 390, 1280x720d | Chromium (axe), Firefox/WebKit keyboard |
| FM-A11Y2 | AC4 | fresh | caption is in a live region (polite) and announces on step change | aria-live=polite and text updates | 390 | Chromium |
| FM-RM2 | AC5/9 | reducedMotion: reduce | trigger the Buy pulse and the pointer | Buy shows a static outline, no scale; pointer shows without motion | 390 | E3 |
