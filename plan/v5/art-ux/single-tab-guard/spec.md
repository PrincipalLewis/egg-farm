# Single-tab guard notice — UI spec v1.0 (Head of Art & UX, 2026-10-16)
Source: product/single-tab-guard.md v1.0. Style reused from save-recovery-ac14b/ (tokens, Fredoka/Nunito, alertdialog). Mock: dialog.html. Renders: tab-guard-360.png (360x640), tab-guard-1280.png (1280x800, card 440px).

## Copy (final)
- Title: **Game open in another tab**
- Body: **Your farm is running in another tab. Play here to continue from your latest save.**
- Button: **Play here** (pressed state: "Loading…", disabled)
- No close button, no secondary action.

## Layout & tokens
- Full-screen scrim rgba(62,44,35,.55) over the game; card centered, width min(440px, 100vw − 48px), padding 24, radius 16, border 3px rgba(62,44,35,.8), shadow 0 4px 0 rgba(62,44,35,.3).
- Icon icon-coop.svg 72px, decorative (alt="").
- Title Fredoka 600 24px #3E2C23; body Nunito 16/1.4 #3E2C23.
- Button full width, min-height 48px (≥44 target), pill, bg #3D7F33, text #fff Fredoka 600 18px; focus ring 3px #2B79A8, offset 3px.
- Game behind: frozen (sim stopped, no money ticking, no particles/idle animations), saturate(.6) + scrim; marked inert + aria-hidden.

## Behaviour
- role="alertdialog", aria-modal="true", aria-labelledby=title, aria-describedby=body.
- Shown within 1 s of losing ownership (TG-1). Initial focus on "Play here"; focus trapped (Tab/Shift+Tab stay on the button).
- Tap outside, Esc, browser/Android Back: do nothing (Back may be consumed with history.pushState; never closes the notice or resumes the sim).
- "Play here" → disable + "Loading…" → reload from latest save → claim ownership. Never writes the save from the inactive tab.
- Motion: card fades/scales 0.96→1 in 200ms; prefers-reduced-motion: no animation (instant show).
- Audio: game sounds/music muted while shown.

## WCAG AA
- Body #3E2C23 on #fff ≈ 13:1; button #fff on #3D7F33 ≈ 5.1:1; focus ring #2B79A8 vs white ≈ 4.6:1 (≥3:1). Text reflows at 200% zoom / 320px width; title wraps to 2 lines at 360.
- Screen reader announces title + body on open.

## QA checks
- TG-UI-1 Notice appears in old tab ≤1 s after opening a new tab; money counter frozen for 30 s.
- TG-UI-2 role=alertdialog, aria-modal, label/description read by NVDA/VoiceOver.
- TG-UI-3 Focus on "Play here" on open; Tab cycles only to it; visible focus ring.
- TG-UI-4 Esc, tap/click on scrim, Back button: notice stays, game stays frozen, no save write (tab_guard_blocked_write not exceeded by user input).
- TG-UI-5 Button hit area ≥44x44 at 360 and 1280; card 440px at 1280, 312px at 360.
- TG-UI-6 "Play here" reloads and shows exactly the other tab's money (with TG-2); other tab then shows the notice.
- TG-UI-7 Reduced motion: no scale/fade. 200% zoom: no clipping.
- TG-UI-8 Contrast values as above (axe clean).

## Engineering handoff
- Build from dialog.html; reuse the AC14b dialog component (same tokens) with a single-action variant; no close affordance.
- On ownership loss: stop sim tick + render loop animations, mute audio, set game root `inert`, mount dialog, focus button.
- Keydown Escape → preventDefault; popstate → re-push state; scrim pointer events swallowed.
- Button: disable on press, then location.reload(); ownership claim happens on load (per product spec), fire tab_guard_takeover{reason:play_here}.
- Strings keys: tabguard.title / tabguard.body / tabguard.play / tabguard.loading.
