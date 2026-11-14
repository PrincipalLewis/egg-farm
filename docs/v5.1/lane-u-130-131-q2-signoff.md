# Art interim sign-off: lane U #130 @595783f8 / #131 @c6dbde55 (fatigueCue), Q2 360 re-shoot
Evidence: engineering/tasks/v5-ui-ss-fatigue/shots-q2/ (SHA256SUMS verified OK, 6 PNGs FF/Cr/WK at 360x739 + 360x640, manifest.json, measured-rects.json).
Verdict: **ART PASS** (Q2 was the only open condition from the Nov 10 rulings). No Claude review (rule 22, N=0).
- Settings 44x44 at (304,5) on all 6; the rate isn't clipped (hudScrollW = clientW = 360); worst-case $9,999.99 / 9,999 / −$999.9K/s fits; spacer-only flex, pill padding stays 12. Meets ruling 2.
- Rule 3 banner x8 y64 w344 h48 is present on all 6.
Non-blocking minors (v5.1 backlog, NOT GO conditions):
- Q2-m1: the open popover (y62 h52) covers the Rule 3 banner text. It opens on the player's tap and can be dismissed, so it's acceptable for v5. v5.1: anchor the popover below the banner (y >= banner bottom + 4) when the banner is shown.
- Q2-m2: the negative HUD rate `−$999.9K/s` renders in the positive (green) colour. v5.1: use the neutral or danger ink for rate < 0; the sign already carries the meaning, so this isn't a colour-only failure.
Signed: Head of Art & UX, 2026-11-14 19:3x Saigon.
