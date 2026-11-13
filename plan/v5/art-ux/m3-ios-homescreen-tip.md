# M3 AC14g — iOS "Add to Home Screen" tip — Art & UX · v1.0 · 2026-10-15 (due Tue Oct 20)

**Why:** iOS Safari can delete a site's storage after 7 days without a visit, which wipes the farm. Installed Home Screen web apps aren't affected by this rule. Ruling by Head of Product (AC14g): one-time tip plus a permanent line in Settings. No periodic export nudge in M3.

## 1. When it shows (logic for Engineering)
- **Platform:** iOS/iPadOS Safari only, meaning iPhone, iPad, or iPadOS desktop UA (`MacIntel` + `maxTouchPoints>1`). Skip in-app browsers and Chrome/Firefox on iOS (CriOS/FxiOS/EdgiOS), because they can't Add to Home Screen the same way.
- **Not standalone:** hide when `navigator.standalone === true` or `matchMedia('(display-mode: standalone)').matches`.
- **Timing:** start of the **2nd session** (`session_count == 2`, after Tap to start). Show it **after** the welcome-back / save-recovery modal is dismissed and **never** while the FTUE (steps 1–5) is active. If FTUE is still running in session 2, defer to the first session after FTUE completes.
- **Once:** set `tips.ios_home_shown=true` (in the save) when it's shown. Dismissing with ✕ or "Got it" closes it permanently. If it's auto-hidden by a modal, it returns after the modal closes during the same session only.
- Never shown again after it's been dismissed. The Settings line (§4) stays permanently.

## 2. Format: top banner (decision)
A **non-modal top banner** directly under the HUD, overlaying the top of the farm scene. It has no scrim and doesn't block input.
Why not a bottom sheet: the bottom of the screen already holds the next-goal strip, Collect, the nav, and the FTUE pointer targets. A bottom sheet would cover the core loop and collide with AC5 "always visible". Also, Safari's toolbar (with the Share button) sits at the bottom, so a banner up top doesn't hide the thing it points to. The top of the farm scene is decorative, so covering about 120px of it costs nothing, and the queue strip sits under it at most briefly.

## 3. Layout at 360px portrait (ref 390)
- `aside.ios-tip[role=status][aria-live=polite]`, `position:absolute; top:calc(var(--hud-h) + var(--s-2)); left:max(var(--s-3), env(safe-area-inset-left)); right:max(var(--s-3), env(safe-area-inset-right))`, so it's 336px wide at 360. The HUD already sits under `env(safe-area-inset-top)`, so the banner inherits the notch clearance. In landscape, the left/right insets handle the notch.
- Box: bg `--c-white` #FFFFFF, 3px border Sky/info **Focus #2B79A8**, `--r-md` (12px), `--shadow`, padding 12px, so 12px + 44px close button. Grid `32px 1fr 44px`, gap 8px. Height is about 120px at 360 (3 title lines + 2 how-to lines), about 116px at 390.
- Icon: `icon-coop.svg` 32px (home = farm).
- Title, Nunito 700, 16px/22px, Soil Brown #3E2C23 on white (12.9:1 AA ✔): **"Add Egg Farm to your Home Screen so your farm is never cleared."**
- How-to, Nunito 600, 14px/20px, Hay Gray #6B5D52 on white (6.0:1 AA ✔): **"Tap Share [share-icon], then Add to Home Screen."** The share icon is an inline 16px iOS-style glyph (square + up arrow), stroke Focus #2B79A8 (4.9:1 for UI ✔ ≥3:1), with `aria-label="Share"`. Engineering: draw it with inline SVG (no new asset file needed; I can supply `assets/icon-share-ios.svg` if preferred).
- Close: `button[aria-label="Dismiss tip"]`, a **44×44px** hit area, with `icon-close.svg` at 24px in Soil Brown, top-right of the grid. No "Got it" button (✕ is enough, which keeps it compact).
- Motion: slide down 8px + fade, `--t-med`. Reduced motion: fade only. Optional auto-dismiss: **none**, because it should stay until dismissed. It doesn't block taps on anything that isn't under it.
- **Collisions:** the next-goal strip, Collect, and the nav are at the bottom, so there's no overlap. FTUE never runs at the same time (§1). If a sheet (Market/Upgrades, 75dvh) opens, the banner stays above it; the sheet top is at 25dvh ≈ 160px at 640 tall, and the banner bottom is at 56+8+120 = 184px, which would overlap. To be safe, **hide the banner while any sheet or modal is open** and reshow it when it closes (same session). Tier-change celebration toasts are centred in the scene, so there is no conflict.
- iPad / ≥600px: same banner, `max-width:480px`, centred under the HUD. ≥960 desktop (iPadOS landscape): over the left farm column, `max-width:560px`.

## 4. Settings permanent line
In the Settings modal, in the save section **directly below the Export button**: a 14px Hay Gray line with the 16px share glyph: "Add Egg Farm to your Home Screen so your farm is never cleared. Tap Share, then Add to Home Screen." It's not tappable, and it's shown only on iOS Safari when not standalone. When standalone, show "Installed on Home Screen ✔" in Meadow Strong #3D7F33 (4.9:1 ✔), or nothing (Engineering's call; I'd prefer the ✔ line).

## 5. Telemetry (optional, Engineering)
`ios_home_tip_shown`, `ios_home_tip_dismissed`. Standalone launch is already detectable as `display_mode` on session_start.

## 6. ACs for QA
1. iPhone Safari, not installed: session 1, no tip. Session 2 (after Tap to start, after any welcome-back modal), the tip appears under the HUD with the exact copy and the Share how-to.
2. Dismiss ✕ (≥44×44 hit area); the tip doesn't return in sessions 3+ or after reload.
3. Launched from the Home Screen (standalone): the tip never shows; Settings shows the installed line (or no line).
4. Chrome/Firefox on iOS, Android, desktop: the tip never shows, and there's no Settings line.
5. Non-blocking: while the tip is shown, Collect, the goal strip, the nav and the HUD all work; there's no scrim.
6. At 360×640 and 390×844 (notch), the banner is fully visible, below the HUD and status bar, within the left/right safe area, and doesn't overlap the next-goal strip, Collect, the nav, or the queue strip's text.
7. Never shown together with an FTUE step, the welcome-back modal or the save-recovery modal. It's hidden while a sheet or Settings is open and returns after.
8. Contrast: title ≥4.5:1, how-to ≥4.5:1, icon/border ≥3:1 (values in §3).
9. Settings: on iOS Safari (not standalone), the tip line sits directly below Export.
10. VoiceOver reads the tip once (role=status) and the close button as "Dismiss tip".
If the tip doesn't show on a real iPhone, it's a **major** (per Product).

Mock: `mockbuild/m3-ios-homescreen-tip.png` (360×640 session-2 farm with the banner, 390×844 notch with safe area, and Settings with the line under Export).

## Scope update (Head of Product ruling, Oct 15 22:59)
- Show the tip on ALL iOS browsers (they all run on Safari's engine). It stays hidden only when the game is running from the Home Screen (standalone). Android gets no tip.
- How-to line, by browser:
  - iOS Safari (including iPad): "Tap Share [icon-share-ios], then Add to Home Screen."
  - Chrome, Firefox, Edge and other iOS browsers: "Tap Share [icon-share-ios] in the address bar, then Add to Home Screen."
- Layout, copy title, timing and dismiss rules are unchanged. The Settings line uses the same browser-specific how-to.
- QA/Engineering: the detection test expects Chrome on iOS to show the tip with the address-bar line.
