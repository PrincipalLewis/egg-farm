# Platform strategy: Google Play, App Store, Steam (draft, Product + Engineering)
Product draft, Oct 15. Engineering is reviewing the effort figures (§3) before this goes to the CEO on Fri Oct 16 at 14:00.

## Short answer
Yes, we should, but after M3, as M4. We aren't doing it yet because we're still proving the game is fun and that players come back. On the web we can ship builds to testers in minutes, with no store review, no fees and no Mac.

## 1. Why we're web-first today
- Iteration speed: a fix reaches playtesters as soon as it merges. A store update takes a review round, about 1–3 days.
- One codebase covers desktop, Android and iOS browsers. Our QA, telemetry and save work all target that one build.
- No accounts, spend or publishing are needed. Those need Vadim's sign-off, and so far we haven't needed them.
- M3's job is evidence on whether players stay (D1 retention, the FTUE funnel). Store presence doesn't help with that yet.

## 2. Options
| Option | What it is | Fit |
|---|---|---|
| **A. TWA (Android only)** | Our web build wrapped as a Play Store app that runs in Chrome | Cheapest Android path, no new code. iOS isn't covered. |
| **B. Capacitor (Android + iOS)** | The same web build inside a native shell, with access to native plugins: storage, notifications, store billing, ads | **Recommended.** One codebase, both stores. |
| **C. Native or engine rewrite** (Unity, Kotlin/Swift) | Rebuild the game from scratch | Best performance, but months of work. It isn't justified for a 2D idle game. |

## 3. Effort and timeline (estimates, Engineering to confirm)
- **A. TWA:** about 2–3 dev-days, plus the Play closed-testing period below.
- **B. Capacitor:** about 6–10 dev-days for both platforms. (Eng) Engineering estimate is 10–14 dev-days (Android ~4–5, iOS ~6–9 incl. signing, 4.2 polish and Mac CI), plus ~1 day per release ongoing. That covers native save storage, which also fixes the iOS 7-day eviction for good (Eng: only once saves move from WebView localStorage to Capacitor Preferences/a file, with a one-time migration that keeps install_id), the app icon and splash screen, and store builds in CI (Eng: iOS CI needs a macOS runner, e.g. GitHub Actions macOS or Codemagic; our Linux CI can only build Android). Add QA on real devices, plus store review.
- **C. Native:** 2–4 months.
- **Calendar for B:** start after M3 ships (late Oct; (Eng) not before rc1 on Tue Oct 27), have an internal Android build in about 1 week and be in store review in about 2–3 weeks. The Play testing rule below sets the real date.

## 4. Costs and requirements
- Google Play: a $25 one-time developer fee. A new personal account must run a closed test with at least 12 testers for 14 days before it can publish to production.
- Apple: $99 a year for the Developer Program. iOS builds need macOS and Xcode, so either a Mac or a cloud Mac build service (some have a free tier, otherwise roughly $0–100 a month). A real iPhone is strongly advised for testing.
- Both developer accounts would be in Vadim's name, so this is his decision.

## 5. Store review and policy
- **Privacy:** Apple privacy labels and the Google Play Data safety form must match our telemetry, which uses an anonymous install_id. We also need a hosted privacy policy URL.
- **Age rating:** questionnaires on both stores (IARC for Google). We expect Everyone / 4+.
- **Payments:** any purchase of digital goods (gems, boosts) must use Apple and Google in-app billing, with a 15% fee under $1M a year on the small-business programs ((Eng) Google is rolling out a new fee model in 2026 with a separate billing fee; re-check rates before M4). Rewarded ads are allowed, but they require consent prompts (the ATT prompt on iOS, GDPR consent in the EU).
- **Apple guideline 4.2 ("minimum functionality"):** Apple can reject thin web wrappers. Offline play, native storage and haptics lower that risk. (Eng) They help but don't guarantee approval; the app must feel native (no browser UI or external links, safe-area layout, offline start, working share sheet), and we should expect at least one rejection round.

## 5b. Steam
- **How it ships:** the same web build packaged as a desktop app. Tauri gives a small download; Electron is more proven with the Steamworks SDK (achievements, cloud saves). About 4–6 dev-days, including Steam Cloud saves and achievements. (Eng) Engineering estimate is 6–9 dev-days: Electron + steamworks.js recommended (Tauri needs the Rust steamworks crate and a different WebView per OS, which means more QA); saves must move to a file for Steam Auto-Cloud; Windows code signing and macOS notarization (needs the $99 Apple account and a Mac runner) are extra. Electron adds ~80–100 MB vs a few MB for Tauri, which doesn't matter much on Steam.
- **Fees and account:** $100 per app, paid back after the game earns $1,000. Steamworks onboarding takes identity and tax forms, and there is a 30-day wait after paying before the first release. The store page must be live as "Coming Soon" for at least 2 weeks, and Valve reviews both the build and the page.
- **Policy risk:** low. Valve's main bars are a working build, honest store assets and no ads that aren't part of the game.
- **Discovery and business model:** wishlists, the Idler/Incremental tag and festivals. Premium at about $3–5 plus optional DLC, with Valve taking 30%. Banner ads don't fit Steam, so it needs an ad-free design. Long-session desktop idle players are a real niche there.

## 6. Business case
Idle games earn mostly on mobile stores, from rewarded ads and in-app purchases, and mobile is also where they're discovered. Web portals (CrazyGames, Poki) are good for reach and testing but earn far less per player. Long term, the stores are where the revenue is, but only once retention proves the game is worth monetising.

## 6b. Effect on M3 dates
None of this goes into M3. If any platform work were pulled forward, it would take Engineering's rc0/rc1 days (6–7 days already committed) and push rc1 past Oct 29. (Eng) Correction: M3 dates are rc0 Thu Oct 22 and rc1 Tue Oct 27. Pulling work forward would move rc1; all native work starts after rc1, so neither date moves.

## 7. Recommendation
1. **Finish M3 on the web**, including the itch.io, CrazyGames and Poki listing prep, and read D1 retention and the funnel.
2. **M4, starting about Nov 2, if retention holds:** use Capacitor for Android and iOS. Do Android first, since it's cheaper and has no Mac requirement, and start the 14-day Play closed test early. iOS comes once a Mac or cloud build service is in place.
3. **Asks for Vadim at that point:** approval for the $25 Google Play and $99/yr Apple accounts, a Mac or cloud-build decision, and around 12 testers for the Play closed test.
4. **Steam: M5 (December or later), after mobile.** It needs an ad-free premium version and builds up wishlists slowly. Pay the $100 and put up the Coming Soon page early in M4 so the 30-day and 2-week clocks run in parallel.
5. Monetisation design (ads and IAP) gets its own M4 or M5 proposal. We won't ship to the stores with payments on day one.

## Final (Product + Engineering, Oct 15)
Product accepts Engineering's figures. The order for M4 and later is:
1. **Android via TWA:** 2–3 dev-days, plus the 14-day Play closed test.
2. **iOS via Capacitor:** 10–14 dev-days, plus about 1 day per release. It needs a macOS CI runner and a save migration that keeps install_id. Plan for at least one rejection under guideline 4.2.
3. **Steam via Electron and steamworks.js:** 6–9 dev-days.

All of this starts after rc1 on Oct 27, so the M3 dates don't change. Google's billing fee is changing in 2026, so recheck it before M4.
