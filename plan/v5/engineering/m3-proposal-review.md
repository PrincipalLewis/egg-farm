# Engineering review: product/m3-proposal.md (Head of Engineering, 2026-10-15 21:55 CEST)
For Head of Product, comments due Fri Oct 16 10:00. The proposal was not edited.

## 1. Measured: m2-rc1 (`bf1962a`)
Built in a detached git worktree (`npm run build`, vite 5.4.21). The main working tree and `post-rc1/polish` were not touched. The worktree was removed afterwards. Gzip is per file at level 9.

| Type | Files | Raw | Gzipped |
|---|---|---|---|
| JS (index + lazy panel chunk) | 2 | 54.9 KB | 19.2 KB |
| CSS | 1 | 20.6 KB | 5.2 KB |
| Images (SVG) | 20 | 12.0 KB | 5.2 KB |
| Audio (12 SFX mp3) | 12 | 62.9 KB | 54.5 KB |
| Fonts (4 woff2) | 4 | 64.7 KB | ~64 KB (already compressed) |
| HTML + licence texts | 4 | 11.0 KB | ~5 KB |
| **Total dist** | 43 | **226 KB** | **154 KB** |

That is about 10% of the 1.5 MB budget, with audio included.

**Load time.** Box Chrome against `vite preview` (no compression). Viewport 390×844, cache disabled, 4× CPU throttle on the throttled runs. 3 runs each, all within ±30 ms:

| Profile | FCP / DCL | `load` | Network idle | Transferred at load |
|---|---|---|---|---|
| Unthrottled | ~45 ms | ~55 ms | ~0.56 s | 72 KB |
| 4G (150 ms RTT, 9 Mbps) | ~0.42 s | ~1.03 s | ~1.70 s | 72 KB |
| Fast 3G (562 ms RTT, 1.6 Mbps) | ~1.51 s | ~3.79 s | ~4.88 s | 72 KB |

Audio is not fetched at initial load. Only about 72 KB goes over the wire. This was measured with a CDP script, not Lighthouse, so we don't have a Lighthouse Performance score yet. Production hosting with gzip/brotli would be faster than these numbers.

## 2. What I agree with
- The goal stops at "ready to publish". The cuts in §2 are right, especially: no backend, no accounts, no spend, nothing published.
- W-C gives Engineering the right scope and a single owner.
- AC1 matches what is already in progress on `post-rc1/polish`.
- AC14's list of save cases is the right one.
- Keeping AC2 (AC7) and the AC-W gates as regression gates is right.
- V1/V2 are correctly sent to Vadim through the CEO.

## 3. Proposed changes
1. **AC11 targets: keep them, tighten them, and pin down how we measure.** We are at 154 KB gzipped and about 1.0 s to `load` on 4G, so the targets pass with a big margin today.
   - Proposed budget: **≤500 KB gzipped total, ≤150 KB gzipped on the critical path.** This leaves room for listing art and new SFX while stopping bloat early.
   - Keep ≤3 s on 4G with a mid-range CPU (4×).
   - Define "interactive" as the first tappable egg, measured by a CDP script in CI plus one Lighthouse run. A score-only gate depends on the box Lighthouse install, which doesn't exist yet.
   - Don't gate on Fast 3G. It gives ≈3.8 s `load`, mostly round-trips. Report it for information only.
2. **Mon Oct 19 for `m3-pt1` is too aggressive with the proposed scope. Proposals:**
   - `m3-pt1` = AC1 post-rc1 fixes, the Workers intro (AC4), a player-facing **Export log** button in Settings, and a fix for telemetry retention (see risk R1). Target **Mon Oct 19 EOD** for that slim build only.
   - Save hardening (AC14: backup slot, quota/disabled, two-tab lock), a11y fixes (AC13) and perf/a11y CI go into `m3-rc1`, not pt1.
   - Capacity Fri to Mon, about 2.5 focused days: finishing post-rc1 0.5 d, Workers intro 0.5 d, Export button + telemetry retention 0.5 d, smoke harness 1–1.5 d. That leaves nothing for fixes before pt1. If the harness has to come before pt1, pt1 moves to **Tue Oct 20**.
   - My W-C estimate after pt1: AC14 1.5 d, AC13 fixes 1 d (depends on Art & UX findings), AC12 sampler/long-session 0.5 d, playtest fix pass 1 d, rc fixes for cross-browser/iOS 1 d+. That is ≈5 d. Fri Oct 23 for `m3-rc1` holds only if the iOS fixes are small and V1/V2 are decided by Mon.
   - **Realistic: `m3-rc1` Tue Oct 27, stretch Fri Oct 23.**
   - The "2–3 days at M2 pace" reasoning undercounts. M2 was mostly sim work with tests already modelled. M3 is cross-browser, device and save edge cases, where the unknowns are found by testing, not by building.
3. **AC14 two-tab and corrupt-save:** say "warn and make the second tab read-only". We'd use `storage` events / BroadcastChannel rather than locking, so we don't depend on the Web Locks API (Safari version). The backup is one rotating "last good" slot.
4. **AC12:** align with the smoke plan SM-9 (≤5% of frames over 20 ms over 60 s, plus a median fps). We can't measure on a real Android until V2 is decided. Until then it's emulated only and labelled that way.
5. **AC9 Edge:** Chromium coverage plus one real Windows Edge run if Vadim has a Windows machine. Otherwise accept the Chromium proxy. This needs a QA/CEO decision (smoke plan Q5).
6. **The workstream table should list the smoke harness explicitly under W-C** (`scripts/xbrowser-smoke.mjs`, 1–1.5 d) and the box install of the Playwright browsers. It's a real cost and it's currently implied.

## 4. Risks
- **R1 Telemetry ring buffer.** At m2-rc1, telemetry is a capped ring buffer, and Export only exists in the **debug panel**. Over 2+ days of play, early events (onboarding, first session) can be overwritten before a tester exports. That would break AC3, AC6 and AC8. It needs a larger cap or a separate summary/first-session store, plus a Settings export, in pt1.
- **R2 iOS Safari** (audio unlock, localStorage eviction/ITP after 7 days, bfcache/backgrounding). We have no device. Real coverage needs V2.
- **R3 Save hardening has no backup today.** At bf1962a no code handles a backup slot or quota. AC14 is net-new work, not a fix.
- **R4 Playtest data is small and late.** Only 1 day sits between the playtest ending (Oct 22) and rc (Oct 23), so any approved retune pushes rc.
- **R5 Shared box:** installing the Playwright browsers (~400 MB plus apt deps) affects every agent's box.

## 5. Needs CEO sign-off (external service or spend). None of it has been set up.
- **Hosting for playtesters and phones** (V1 / smoke-plan Q4): free static hosting (e.g. GitHub Pages) or a tunnel. Either one makes the build publicly reachable. The alternative with no external service is a zip of `dist/` plus a local `npx serve`, which is impractical for phone testers.
- **Real-device farm** (V2 / smoke-plan Q2): BrowserStack / Sauce Labs / LambdaTest are paid and need an account. The free alternative is Vadim's own or friends' devices.
- **Box installs** (smoke-plan Q1): free, no account, but they change the shared machine. Ops/CEO OK needed.
- Lighthouse via `npx lighthouse` is free and needs no account. It's an install on the box, covered by the same OK.
