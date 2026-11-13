# M1 SVG assets (Art & UX, 2026-10-15)
Spec: 48×48 viewBox, no raster, palette from ../style-direction.md, 2px Soil Brown (#3E2C23) outline. First-pass placeholders, final polish to follow.
| File | Use |
|---|---|
| icon-egg.svg | egg counter, collect "+N" particles |
| icon-coin.svg | coin counter, sell particles, costs |
| char-chicken.svg | farm view chicken (character) |
| icon-coop.svg | coop / Farm upgrades tab |
| icon-nest.svg | empty nest (no eggs): base layer, Collection tab/row icon |
| nest-eggs.svg | eggs overlay for the nest, same viewBox; stack on icon-nest.svg, show when coop > 0 |
| icon-upgrade.svg | Upgrades button, affordable badge |
| icon-market.svg | Market (sell) button / stall |
| icon-customer.svg | customer cards in Market |
| icon-settings.svg | settings gear |
| icon-close.svg | panel/modal close |
| icon-offline-earnings.svg | Offline Earnings modal |
| char-market-hand.svg / char-coop-hand.svg / char-hawker.svg / char-egg-grader.svg | M2 workers (64×64 viewBox) |
| overlay-tired.svg / overlay-asleep.svg | M2 worker state overlays, stack on any char-* worker |
| icon-energy.svg / icon-manage.svg / icon-hire.svg | M2 energy label, Manage button, Hire/Workers tab |
| overlay-yawn.svg | M2 yawn overlay (≤40% energy) |
| ring-cooldown.svg | M2 Manage cooldown ring (inline; drive `.ring-progress` stroke-dashoffset 0→100) |
| icon-manage-all.svg | M2 Farm View Manage-all button |
| audio/sfx-worker-yawn.mp3 | M2 yawn cue (see m2-workers-layout §4.6 throttle) |
| icon-goal.svg | M3 next-goal strip icon (m3-next-goal-spec) |
| ui-pointer-hand.svg | M3 FTUE coach-mark pointer, index points up; anchor = fingertip at top-centre (24,0). v2: redrawn (index + curled fingers + thumb across) |
| ui-pointer-hand-down.svg | Downward variant (true rotation, not a mirror); anchor = fingertip at bottom-centre (24,48) |
M3 AA: icon-upgrade/manage/manage-all/hire now use Meadow Strong #3D7F33 behind white marks; icon-close uses Barn UI #B83B37.
| icon-share-ios.svg | iOS-style Share glyph (box + up arrow), currentColor stroke, 24 viewBox; used in AC14g tip |
| icon-rotate-phone.svg | Phone landscape→portrait with arrow, currentColor stroke, viewBox cropped to "2.75 0.25 52.5 52.5" (square, ~2px padding at 64, stroke not clipped; previews mockbuild/icon-rotate-phone-{64,96}.png); rotate prompt (m3-rotate-portrait-prompt.md) |
