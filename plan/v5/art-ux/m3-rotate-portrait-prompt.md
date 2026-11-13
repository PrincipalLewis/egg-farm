# M3 Rotate-to-portrait prompt — v1.0
Owner: Art & UX · 2026-10-16 · Asset: assets/icon-rotate-phone.svg (64 viewBox, currentColor stroke 3) · Preview: mockbuild/icon-rotate-phone-96.png

## 1. When
Show it only on phones held in landscape:
```css
@media (orientation:landscape) and (pointer:coarse) and (max-height:499px){ #rotate-prompt{display:flex} }
```
- **No overlay** on desktop (fine pointer), tablets (landscape height ≥500px, e.g. an iPad at 1024×768 or 1180×820, uses the normal desktop/tablet layout), or a phone in portrait.
- The game keeps running underneath (the idle sim continues and nothing is paused or lost). Input to the game is blocked while the overlay shows (`inert` on #app).
- No dismiss button: it goes away by itself when the phone is rotated. Don't use the Screen Orientation lock API (unsupported in iOS Safari).
- Never show it during the save-recovery alertdialog; that dialog takes priority. Hide the iOS home-screen tip while the overlay shows.

## 2. Layout
A full-viewport fixed overlay, `z-index` above everything, background Eggshell Cream #FFF6E5 (opaque, so there's no half-visible game). Centred column, gap 12px:
1. The icon, 64px, Soil Brown #3E2C23, with a 300ms wobble (rotate −15°→0) played twice on show. Reduced motion: static.
2. Title, Fredoka 700 24px #3E2C23: **"Turn your phone"**
3. Body, Nunito 600 16px #6B5D52: **"Egg Farm plays best in portrait."**
At a 640×360 landscape phone the block is ≈ 64+12+30+12+22 = 140px tall ✔. It respects safe-area insets (`padding:env(safe-area-inset-*)`).

## 3. Contrast
| element | fg / bg | ratio |
|---|---|---|
| Title | #3E2C23 / #FFF6E5 | 12.31:1 ✔ |
| Body | #6B5D52 / #FFF6E5 | 5.91:1 ✔ |
| Icon (UI graphic) | #3E2C23 / #FFF6E5 | 12.31:1 ✔ (≥3:1) |

## 4. a11y
`<div id="rotate-prompt" role="alertdialog" aria-modal="true" aria-labelledby="rp-t" aria-describedby="rp-b" hidden>`. The icon is `aria-hidden="true"`. When shown, focus moves to the dialog (`tabindex="-1"`) and #app gets `inert`; when hidden, focus returns to the last focused element. Not dismissible with Esc (there's nothing to dismiss).
WCAG 1.3.4 Orientation: the content is restricted to portrait on phones because the 640×360 landscape viewport can't fit the layout. That's an essential exception, documented here; tablets and desktop aren't restricted.

## 5. CSS
```css
#rotate-prompt{display:none;position:fixed;inset:0;z-index:1000;background:#FFF6E5;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
#rotate-prompt img{width:64px;height:64px;animation:rp-wobble .3s ease-in-out 2}
#rotate-prompt h2{margin:0;font:700 24px var(--f-display);color:#3E2C23}
#rotate-prompt p{margin:0;font:600 16px var(--f-body);color:#6B5D52}
@media (orientation:landscape) and (pointer:coarse) and (max-height:499px){#rotate-prompt{display:flex}}
@keyframes rp-wobble{0%{transform:rotate(-15deg)}100%{transform:rotate(0)}}
@media (prefers-reduced-motion:reduce){#rotate-prompt img{animation:none}}
```
Toggle `inert` on #app from a `matchMedia` listener on the same query.

## 6. QA
1. Android Chrome phone and iOS Safari: rotating to landscape shows the overlay within 300ms; rotating back hides it, and the game state, coins and eggs keep counting.
2. DevTools 640×360 touch emulation → overlay; 1024×768 and 1180×820 touch (tablet) → no overlay; 1280×720 mouse → no overlay; 844×390 mouse → no overlay (fine pointer).
3. Taps on the overlay never reach the game (Collect isn't triggered).
4. Screen reader announces "Turn your phone, Egg Farm plays best in portrait."
5. Reduced motion: no wobble.
6. Save-recovery dialog open + rotation: the dialog stays on top / the prompt waits.
7. Contrast per §3; the icon is crisp at 64px.
