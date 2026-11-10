# rc0 review @ 2fae4c4: F1–F5, rotate prompt, font credits, save recovery v1.1
Reviewer: Art & UX · 2026-10-16 01:35 · Sources: engineering/screenshots/rc0-artux/*, rc0-recovery-v11/* (Chromium, WebKit, Firefox). Baseline: reviews/rc0-pt1-13-queue-review.md, m3-rotate-portrait-prompt.md, font-credits.md, m3-save-recovery-dialog.md v1.1.
**Verdict: PASS with 2 fixes (R1, R2) + 2 minor (R3, R4). Nothing blocks QA on Thu Oct 22.**

## F1–F5 (from rc0-pt1-13-queue-review)
| item | result | notes |
|---|---|---|
| F1 slot toast below the strip, copy only on a real slot gain | PASS | queue-farm-390: "Coop upgraded!" (no slot claim) sits below the strip; the "Queue full" badge and the "+6" chip aren't covered. toast-below-strip-360 shows no toast in frame (it was taken after it faded); the 390 shot is the evidence. |
| F2 no "$0.00" | PASS | The disabled footer reads "No eggs to sell". The cards read "0/50 eggs · $374.00". |
| F3 390×844 screenshots, 5 cards | PASS | queue-market-390: 5 cards + "+5 waiting", Chromium = WebKit. |
| F4 " · " separator | PASS | "0/52 eggs · $388.96". |
| F5 shared count | PASS | Strip shows 4 chips + "+6" and Market shows 5 cards + "+5" with 10 in the queue. Each label means "not shown here", and each adds up within its own view (4+6, 5+5), so it reads consistently. Because the Market sheet covers the strip, the two never compete. Keep the accessible names view-specific ("6 more customers waiting" / "5 more customers waiting, show all"). |

## Rotate-to-portrait prompt
| item | result | notes |
|---|---|---|
| Copy, colors, centring at 640×360 | PASS | "Turn your phone" / "Egg Farm plays best in portrait." on cream, opaque; Chromium = WebKit. |
| Icon size 64px | **FAIL (minor) → R3** | It renders at about 40px. Set `width/height:64px` on the img. |
| No overlay on desktop/tablet, inert, focus, reduced motion | NOT VERIFIED | There are no screenshots for those. Please run QA §6 checks 2–5 (1024×768 / 1180×820 touch, 1280×720 mouse, taps not reaching Collect). |

## Font credits (Settings)
| item | result | notes |
|---|---|---|
| Copy | PASS | "Fonts: Fredoka © 2016 The Fredoka Project Authors; Nunito © 2014 The Nunito Project Authors. SIL Open Font License 1.1." |
| Layout | **FAIL (minor) → R4** | The text is split into two blocks with a gap, so "Authors." sits alone on the second block ("…The Nunito Project / Authors. SIL Open…"). Make it one `<p>` with a normal line flow. |
| Link tap target ≥44px | **FAIL → R2** | The "SIL Open Font License 1.1" link is inline text about 16px tall. Give it `display:inline-block;min-height:44px;line-height:44px` (or the 44px row from spec). |
| Bundled OFL.txt | NOT VERIFIED | Confirm that `public/fonts/OFL.txt` ships and that the link opens it. |
| Build string "m3-rc0+1e783a6+dirty" | note | Fine for rc0 but must not show "+dirty" in rc1/release builds. |

## Save recovery v1.1 (storage-full)
| item | result | notes |
|---|---|---|
| Q copy + note | PASS | Exact copy in Chromium, WebKit and Firefox. |
| Export as a secondary outlined button ≥44px | PASS | Full width under "Start farming"; it matches mockbuild/m3-save-recovery-q-360/960.png. |
| 960: centred in the full window | PASS | Centred over the game + docked panel, not inside the panel. |
| Settings "Export old save" after Start farming + "Saved a copy." | PASS | Present in all 3 browsers. |
| FTUE over Settings | **FAIL → R1** | On settings-export-old-save-360 the onboarding bubble "Your hens are laying eggs…" + Skip sits on top of the Settings modal and covers its title. The FTUE must pause/hide while any modal (Settings, recovery, rotate) is open and resume after (m3-ftue-spec: it never covers dialogs). |
| alertdialog / not dismissable | NOT VERIFIED (screens) | Visually there's no close control ✔. Confirm AC 2, 3, 8 in the a11y tree. |

## Remaining fixes
- **R1 (required):** hide/pause the FTUE bubble and its Skip while Settings or any modal is open; z-index below modals.
- **R2 (required):** the OFL link's tap target must be ≥44px tall.
- **R3 (minor):** the rotate icon is 64px.
- **R4 (minor):** the font credit is one paragraph, with no break before "Authors.".

## Re-check @ 16176a3 (2026-10-16 01:40, rc0-artux/* 01:32–01:33, Chromium + WebKit)
| fix | result | notes |
|---|---|---|
| R1 FTUE bubble over Settings | PASS | r1-settings-over-ftue-360: Settings is open with no onboarding bubble or Skip on top; the title is clear in both engines. Still to check in QA: onboarding resumes after Settings closes. |
| R2 OFL link ≥44px | PASS (visual) | The link sits inline in the paragraph; the commit says it has 44px vertical padding, and the artux-shots assertion covers it. I can't measure the hit box from a PNG. |
| R3 rotate icon 64px | PASS | The icon box is 64×64 (the drawing measures 44×42px inside the old 64 viewBox). Art & UX has since cropped the viewBox (`2.75 0.25 52.5 52.5`) so the drawing fills about 60px; copied to game/public/assets/icon-rotate-phone.svg, not committed. Needs a re-shoot after commit. |
| R4 credit one paragraph | PASS | It flows as one paragraph: "Fonts: Fredoka © 2016 The Fredoka Project Authors; Nunito © 2014 The Nunito Project Authors. SIL Open Font License 1.1." |
| Build string | PASS | Now "m3-rc0+16176a3" (no "+dirty"). |
**Verdict @16176a3: PASS. R1–R4 closed.**
