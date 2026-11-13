# Platform tech analysis: Play, App Store, Steam (Engineering, Oct 15 2026)
Input to `product/platform-strategy.md`. Analysis only; no accounts or builds created. Baseline: TS strict + Vite + plain DOM, ~160 KB gz, localStorage save v5 + `install_id`, tap-unlocked audio, Export log (download / iOS share sheet).

## 1. Wrapper options
- **Android: TWA (Bubblewrap) vs Capacitor.** TWA = our hosted PWA in Chrome, needs manifest + service worker + Digital Asset Links; zero app code, updates ship with the web. Storage stays Chrome web storage (fine on Android). Capacitor bundles assets offline and gives native plugins (Preferences, haptics, billing, ads). **Rec:** TWA for first Play presence; move to Capacitor only if we need native billing/ads or want one shell shared with iOS.
- **iOS: Capacitor** (WKWebView). Main risk is **App Store guideline 4.2 (minimum functionality)**: thin web wrappers get rejected. Mitigate with bundled offline assets, no browser chrome or external links, safe-area layout, haptics, native share sheet for Export, native storage. Plan for ≥1 rejection round.
- **Steam: Electron vs Tauri.** Electron + `steamworks.js` is the proven path for achievements, overlay and cloud; ships Chromium (~80–100 MB) but one rendering engine on all OSes. Tauri is a few MB, but Steamworks goes through the Rust `steamworks` crate and rendering varies (WebView2 / WKWebView / WebKitGTK), so more QA. **Rec:** Electron; size doesn't matter on Steam.

## 2. Effort (engineering days)
| Platform | First build | Per release |
|---|---|---|
| Android TWA | 2–3 | ~0.25 (web deploy; store update only for manifest/version changes) |
| Android Capacitor | 4–5 | ~0.5–1 |
| iOS Capacitor | 6–9 (signing, Mac CI, 4.2 polish, storage migration) | ~1 + review wait |
| Steam Electron | 6–9 (Steamworks, Auto-Cloud file saves, signing/notarization) | ~0.5–1 |
Native rewrite: 2–4 months; not recommended.

## 3. Build and signing
- **Android:** upload keystore kept off-repo in CI secrets; enroll in Play App Signing (Google holds the app key). Play fee $25 one-time. New personal accounts must run a closed test (≥12 testers, 14 days) before production.
- **iOS:** requires macOS + Xcode; we only have Linux. Apple Developer Program $99/yr; distribution certificate + provisioning profiles (fastlane match or Xcode-managed). Cloud Mac CI: GitHub Actions macOS runners, Codemagic, Bitrise, Xcode Cloud.
- **Steam:** Steam Direct $100/app (recoupable after $1,000 AGR). Windows: Authenticode cert (optional for Steam but avoids SmartScreen). macOS: Developer ID signing + notarization, so the $99 Apple account and a Mac runner are needed here too.

## 4. Saves and storage
- iOS Safari can evict script-writable storage after 7 days without a visit. A Capacitor app avoids this only if saves go to **native storage** (Capacitor Preferences → UserDefaults/SharedPreferences, or a Filesystem file), not WebView localStorage.
- **Migration:** on first native launch, read localStorage v5 → write to native store → verify → mark migrated (don't delete for one release). Web and app origins differ, so a browser save can't be read automatically; offer Export/Import of the save code for moving across.
- **Steam Cloud:** write the save as a file in the user data dir and use Steam Auto-Cloud (no code) or ISteamRemoteStorage; handle conflicts by newest `savedAt`.
- **install_id:** migrate the existing value with the save; generate only if absent; store natively; never regenerate on reinstall-from-cloud. Telemetry should tag `platform` so IDs stay comparable.

## 5. CI and QA impact
- Build matrix grows from 1 web build to web + Android (Linux runner) + iOS (macOS runner) + Steam Win/macOS/Linux. Store builds only on tags, not every PR.
- Device testing: real Android + real iPhone become mandatory (WebKit-on-Linux isn't enough); Steam Deck/Windows check.
- Store review: Apple ~1–2 days per update and possible rejections; Play review hours–days plus the 14-day closed test; Steam build + store page review, "Coming Soon" ≥2 weeks and a 30-day wait after paying the fee. Hotfixes are no longer instant outside TWA.

## 6. Costs (account/service fees only)
- Google Play: $25 one-time — https://support.google.com/googleplay/android-developer/answer/6112435
- Apple Developer Program: $99/yr — https://developer.apple.com/programs/
- Steam Direct: $100 per app, recoupable after $1,000 — https://partner.steamgames.com/doc/gettingstarted/appfee
- Store revenue share (if we monetise): Google service fees are changing in 2026 — https://support.google.com/paymentscenter/answer/112622

## Recommended order
All after M3 rc1 (Tue Oct 27), so rc0 (Oct 22) and rc1 don't move.
1. **Android TWA** (cheapest, no Mac; start the 14-day closed test right away).
2. **iOS Capacitor** once a Mac or cloud Mac CI is chosen; native storage first.
3. **Steam Electron** later; pay the fee and open Coming Soon early so the 30-day/2-week clocks run in parallel.
