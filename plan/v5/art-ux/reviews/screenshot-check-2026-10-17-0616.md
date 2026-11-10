# Screenshot spec check — 2026-10-17 06:16 CEST

**Verdict: FAIL (1 Minor).** New Chromium set for PR #25 hidden-tab offline @ 59cce62. Welcome-back (v1) and refuseNewer dialogs are fine; the live single-tab guard "Play here" button is 4px short of the signed-off design height.

## Checked
1. **PR #25 fix/hidden-tab-offline @ 59cce62**: `qa/m3-recheck/pr25-hidden-tab-59cce62/shots/chromium-{hide,reload}-{61s,120s,671s,10800s}.png` (8) + `chromium-m1-{deactivate,refuseNewer}.png` (2). Build `m3-rc1-pre+59cce62`, viewport 390×844. Specs: Welcome-back v1 (parity with b3341bd review 03:54); `art-ux/single-tab-guard/spec.md` v1.0 for m1-deactivate.

| # | Item | Result | Sev | Evidence | Fix |
|---|---|---|---|---|---|
| 1 | Single-tab "Play here" min-height 48px (`art-ux/single-tab-guard/spec.md` Layout; mock `tab-guard-360.png` measures 48px green fill) | **FAIL** | Minor | `chromium-m1-deactivate.png`: green fill y=485–528 = **44px** (meets ≥44 tap floor, misses design 48) | Set `.tab-guard` / Play-here button `min-height: 48px` (and keep full-width pill). Match `art-ux/single-tab-guard/dialog.html`. |
| 2 | Single-tab copy + layout (title, body, no close, scrim, coop icon, green primary) | PASS | – | `chromium-m1-deactivate.png` matches spec copy verbatim | – |
| 3 | Welcome-back v1: fits 390, title, away line, Collect, × close | PASS | – | hide/reload 61/120/671/10800 | – |
| 4 | Welcome-back amounts under 10K full digits with comma | PASS | – | 61s `+244`, 120s `+480`, 671s `+2,684` / `+2,685` | – |
| 5 | Cap case `You were away 2h+` / `+28.8K eggs` | PASS (parity) | – | hide/reload 10800s; same K as b3341bd (full digits is PR #16 v2 / C-AC29, not this branch) | – |
| 6 | Collect tap ≥44px | PASS | – | modal Collect yellow fill 44px (same as b3341bd) | – |
| 7 | refuseNewer dialog readable, Try again ≥44 | PASS | – | `chromium-m1-refuseNewer.png` | – |
| 8 | Contrast (modal body, Collect, Play here, Try again) | PASS | – | dark brown on cream; white on green | – |

**Nit (pre-existing, not blocking):** `chromium-reload-671s.png` and `chromium-reload-10800s.png` draw the "Coop upgraded! +1 customer slot" toast above the Welcome-back scrim (same as 03:54 Nit on b3341bd). Prefer queueing toasts until the modal closes.

**Out of scope / not landed:** Firefox/WebKit for PR #25 (chromium only so far; `run-firefox.log` present, no firefox PNGs). `toast-pr5-ac4ec56/` still has no PNGs. No new M4-A Sold out!, B-1, B-3, v1.6.1, or PR #16 0470045 shots.

## Still waiting on
PR #5 toast mid-fade re-shoot; PR #4 Manage-tip fix; PR #16 0470045 shots; visible paused 'Sold out!' frame; B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card + v1.6.1 goal label (Cut A v4); Refill nav fix (Market Hand only asleep); PR #25 Firefox/WebKit + Play-here height fix re-shoot.
