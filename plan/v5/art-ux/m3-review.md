# Art & UX review of product/m3-proposal.md · 2026-10-15 · Head of Art & UX
Overall: supportive. Scope is right-sized for Art & UX. Main issue: **our current palette fails AA in 9 text/UI pairs**, so AC13 is a real work item, not a check. Fixes are token swaps (cheap) if done before polish screenshots.

## 1. Contrast audit (WCAG 2.x relative luminance, computed)
| Pair (where used) | Ratio | AA? | Fix |
|---|---|---|---|
| Soil text #3E2C23 on cream / white / yolk / meadow / yolk-dark / gold / sky / disabled | 12.3 / 13.2 / 8.6 / 5.8 / 6.1 / 6.7 / 8.1 / 7.8 | ✅ | — |
| Muted #8A7B6E on cream (hints, sub-lines, time-to-afford) | 3.81 | ❌ 4.5 | `--c-muted:#6B5D52` (5.91 cream / 6.34 white) |
| Muted on white (cards) | 4.09 | ❌ | same |
| White on meadow #6BBF59 (Buy, Manage, Manage all labels) | 2.28 | ❌ even large | Button text → Soil #3E2C23 (5.80), or bg `#3D7F33` (white 4.90) |
| White on barn #D9534F ("Full!" badge 12px, Danger, close ✕) | 3.96 | ❌ normal (✅ large/UI) | `--c-barn:#B83B37` (white 5.65) for text badges |
| Wood #A86B3C text on cream ("Limited by coop", next-tier label) | 4.05 | ❌ | `#8A5528` (5.74) |
| Meadow #6BBF59 as text/arrow on white/cream ("→" in effects) | 2.28 / 2.12 | ❌ | `#3D7F33` (4.90 / 4.57) |
| Yolk-dark #F29E1F "+k" floater on white | 2.17 | ❌ (decorative, duplicated by counter) | fill Soil + yolk stroke, or mark `aria-hidden` and exempt |
| Focus ring sky #8FD3F4 on white (layout-spec §4.1) | 1.64 | ❌ 3:1 UI | `--c-focus:#2B79A8` (4.77) |
| Muted on disabled (disabled buttons) | 2.42 | exempt (inactive) — but AC13 also wants non-colour cue: we have text ("MAX", countdown, "Need $X"), OK | keep; add `aria-disabled` |
| Disabled outline on cream (empty queue slot) | 1.57 | ❌ 3:1 UI (1.4.11) if it conveys state | darken dashed outline to `#8A7B6E` |

## 2. Comments on the proposal
1. **AC13 wording:** say "WCAG 2.2 AA: text 4.5:1, large text (≥24px or 18.66px bold) 3:1, **non-text UI/state indicators 3:1 (1.4.11)**". As written, it misses the 3:1 non-text rule that our energy bars, rings and focus ring need. Add "decorative/duplicated floaters exempt".
2. **§2 In-1 post-rc1:** Workers tab icon is already delivered (`assets/icon-hire.svg`, m2-workers-layout §3); Engineering just needs to wire it. Manage all greyed during cooldown is specced (§4.4 + `ring-cooldown.svg`). I'll fix the stale v1.0 drain line once given the v1.1 value (my doc says 10 min / −1% per 6 s; please confirm the v1.1 figure).
3. **AC4 Workers intro:** one tip can't explain energy/Manage before anything is hired. Suggest 2 beats: (a) at first unlock (Market Hand, F3): "New helper! Hire a Market Hand to sell for you." → opens the Workers tab; (b) after first hire: the existing coach bubble "Workers get tired. Tap Manage to perk them up!". Keep the Coop Hand full-coop tip separate (already adopted). Log both steps.
4. **AC3 FTUE:** overlay is specced (layout-spec §3.7). Add a step-4 "you're on your own" toast pointing at the next-goal hint, so AC5 is introduced. Hand pointer asset still CSS-only; I'll deliver `ui-pointer-hand.svg`.
5. **AC5 next-goal hint:** this is new UI with no Art & UX spec yet. Needs placement (proposal: a 32px strip above Collect, "Next: Farm L5 — new coop · ~1 min 5 s", reusing the time-to-afford format). Please add it to W-D explicitly.
6. **AC9 landscape phone:** our specs don't cover <960px landscape. I'll spec a "Rotate for best view" prompt (portrait layout is usable down to 640 tall, so phone landscape at ~390 tall needs the prompt).
7. **§2 In-4 reference 390px:** fine; our primary remains 360×640 minimum (it's stricter). Please keep 360 as the fit gate.
8. **AC11 1.5 MB:** Art/audio is small (12 sfx ≈ 65 KB, SVGs < 30 KB total); fonts are the main cost. Self-host subset Latin woff2 (Fredoka + Nunito, 2 weights each ≈ 120 KB). Fine.
9. **AC15 credits:** add font licences (SIL OFL 1.1 for Fredoka and Nunito) to the licence list, not just audio.
10. **AC13 mute:** we have an SFX toggle only (music is out). "Mute/volume" → "SFX on/off persists" unless you want a slider (+0.25 d).

## 3. Art & UX effort (W-D), in studio-days
| Item | Est. |
|---|---|
| Contrast token fixes + focus ring + non-colour state audit | 0.5 |
| Next-goal hint design (AC5) | 0.5 |
| FTUE final + Workers intro beats + pointer asset | 0.5 |
| Landscape-phone rotate prompt, desktop parity pass at 390/360/768/1280 | 0.5 |
| Polish pass (fixed list in m3-polish.md at kickoff: icon polish, coop scene, celebrations, card spacing) | 1.0 |
| Listing: 512 icon 0.5, ≥5 portrait + 3 desktop screenshots 0.5, ≤30 s GIF 0.5 | 1.5 |
| m3-polish.md + review loops with Eng/QA | 0.5 |
| **Total** | **≈5.0** |

## 4. Risks / scope concerns
- **Dates:** contrast + AC5 + FTUE must land before `m3-pt1` (Mon Oct 19), or playtest data reflects UI we'll change. Fits if started Oct 16.
- **Screenshots/GIF depend on the final rc** (Oct 23, same day as the listing package). Plan a draft set from `m3-pt1` and a re-shoot on rc; the risk is a same-day crunch.
- **GIF/trailer:** I can render via headless Chrome + ffmpeg in the box (no tools or accounts to buy). Real-device captures depend on V2.
- **Palette change ripples** to existing mocks/SVG text pills; low effort, but QA should re-baseline any screenshot comparisons after the token swap.
- **Polish creep:** agree with the fixed-list rule; I'll freeze m3-polish.md at kickoff.
